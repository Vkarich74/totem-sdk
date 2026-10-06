import { UiValue, uiMessage, uiTemplate, uiError } from "../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import PageSection from "../cabinet/PageSection"
import { getPublicPushConfig } from "../api/publicApi"
import {
  deleteMasterPushSubscription,
  deleteSalonPushSubscription,
  postMasterPushSubscription,
  postSalonPushSubscription
} from "../api/internal"

function isPushApiSupported() {
  return Boolean(
    typeof window !== "undefined" &&
    window.Notification &&
    window.PushManager &&
    navigator?.serviceWorker
  )
}

function getOwnerPushDeviceId(ownerType, slug) {
  const safeOwnerType = String(ownerType || "").trim().toLowerCase()
  const safeSlug = String(slug || "").trim().toLowerCase()
  const storageKey = uiTemplate(["TOTEM_OWNER_PUSH_DEVICE:",":",""], [safeOwnerType, safeSlug])

  try {
    const existing = window.localStorage.getItem(storageKey)
    if (existing) {
      return existing
    }

    const nextValue = uiTemplate(["owner-push-","-","-","-",""], [safeOwnerType, safeSlug, Date.now(), Math.random().toString(36).slice(2, 10)])
    window.localStorage.setItem(storageKey, nextValue)
    return nextValue
  } catch {
    return uiTemplate(["owner-push-","-","-","-",""], [safeOwnerType, safeSlug, Date.now(), Math.random().toString(36).slice(2, 10)])
  }
}

function decodeBase64UrlToUint8Array(value) {
  const raw = String(value || "").trim()
  if (!raw) {
    return null
  }

  try {
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
    const binary = window.atob(padded)
    const output = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      output[index] = binary.charCodeAt(index)
    }

    return output
  } catch {
    return null
  }
}

function getOwnerPushLabel(ownerType) {
  return String(ownerType || "").trim().toLowerCase() === "master" ? uiMessage("salon.s1212") : uiMessage("salon.s1213")
}

function getOwnerPushOps(ownerType) {
  const normalized = String(ownerType || "").trim().toLowerCase()

  if (normalized === "master") {
    return {
      save: postMasterPushSubscription,
      revoke: deleteMasterPushSubscription
    }
  }

  return {
    save: postSalonPushSubscription,
    revoke: deleteSalonPushSubscription
  }
}

async function ensureOwnerServiceWorkerReady() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    throw new Error("SERVICE_WORKER_UNAVAILABLE")
  }

  let registration = null

  try {
    registration = await navigator.serviceWorker.getRegistration("/")
  } catch {
    registration = null
  }

  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js")
  }

  const timeoutPromise = new Promise((_, reject) => {
    window.setTimeout(() => {
      reject(new Error("SERVICE_WORKER_NOT_READY"))
    }, 15000)
  })

  await Promise.race([navigator.serviceWorker.ready, timeoutPromise])

  return registration
}

export default function OwnerPushOptInCard({ ownerType, slug, title, subtitle }) {
  const normalizedOwnerType = useMemo(() => String(ownerType || "").trim().toLowerCase(), [ownerType])
  const ownerSlug = useMemo(() => String(slug || "").trim(), [slug])
  const pushOps = useMemo(() => getOwnerPushOps(normalizedOwnerType), [normalizedOwnerType])
  const [pushConfig, setPushConfig] = useState({ loading: true, error: "", data: null })
  const [pushState, setPushState] = useState({
    kind: "idle",
    message: "",
    permission: typeof window !== "undefined" && window.Notification ? window.Notification.permission : "default",
    supported: isPushApiSupported(),
    enabled: false,
    busy: false,
    synced: false
  })

  useEffect(() => {
    let active = true

    async function loadPushState() {
      if (!normalizedOwnerType || !ownerSlug) {
        if (active) {
          setPushConfig({ loading: false, error: "OWNER_PUSH_CONTEXT_MISSING", data: null })
          setPushState((current) => ({
            ...current,
            kind: "failed",
            message: uiMessage("salon.s1214"),
            supported: isPushApiSupported(),
            busy: false
          }))
        }
        return
      }

      if (!isPushApiSupported()) {
        if (active) {
          setPushConfig({ loading: false, error: "", data: null })
          setPushState((current) => ({
            ...current,
            kind: "unsupported",
            message: uiMessage("salon.s1215"),
            permission: typeof window !== "undefined" && window.Notification ? window.Notification.permission : "default",
            supported: false,
            enabled: false,
            busy: false
          }))
        }
        return
      }

      if (active) {
        setPushConfig({ loading: true, error: "", data: null })
        setPushState((current) => ({
          ...current,
          supported: true,
          busy: false
        }))
      }

      try {
        const config = await getPublicPushConfig()

        if (!active) {
          return
        }

        setPushConfig({
          loading: false,
          error: "",
          data: config || null
        })

        if (!config?.ok || !config?.push_enabled || !config?.vapid_public_key) {
          setPushState((current) => ({
            ...current,
            kind: "failed",
            message: uiMessage("salon.s1216"),
            permission: window.Notification?.permission || "default",
            supported: true,
            enabled: false,
            busy: false
          }))
          return
        }

        const registration = await ensureOwnerServiceWorkerReady()
        let subscription = await registration.pushManager.getSubscription()

        if (!active) {
          return
        }

        if (subscription) {
          const deviceId = getOwnerPushDeviceId(normalizedOwnerType, ownerSlug)
          const saveResult = await pushOps.save(ownerSlug, {
            device_id: deviceId,
            platform: "web",
            subscription: subscription.toJSON ? subscription.toJSON() : subscription,
            user_agent: navigator.userAgent
          })

          if (!active) {
            return
          }

          if (saveResult?.ok) {
            setPushState((current) => ({
              ...current,
              kind: "enabled",
              message: uiMessage("salon.s1217", {p0: getOwnerPushLabel(normalizedOwnerType)}),
              permission: window.Notification?.permission || "granted",
              supported: true,
              enabled: true,
              busy: false,
              synced: true
            }))
            return
          }

          setPushState((current) => ({
            ...current,
            kind: "failed",
            message: uiError(saveResult?.error || uiMessage("salon.s1218")),
            permission: window.Notification?.permission || "default",
            supported: true,
            enabled: false,
            busy: false
          }))
          return
        }

        setPushState((current) => ({
          ...current,
          kind: window.Notification?.permission === "denied" ? "permission_denied" : "ready",
          message:
            window.Notification?.permission === "denied"
              ? uiMessage("salon.s1219")
              : uiMessage("salon.s1220", {p0: getOwnerPushLabel(normalizedOwnerType)}),
          permission: window.Notification?.permission || "default",
          supported: true,
          enabled: false,
          busy: false,
          synced: false
        }))
      } catch (error) {
        if (!active) {
          return
        }

        setPushConfig({
          loading: false,
          error: error?.message || "PUSH_CONFIG_LOAD_FAILED",
          data: null
        })
        setPushState((current) => ({
          ...current,
          kind: "failed",
          message:
            error?.message === "SERVICE_WORKER_NOT_READY"
              ? uiMessage("salon.s1221")
              : uiError(error?.message, uiMessage("salon.s1222")),
          permission: typeof window !== "undefined" && window.Notification ? window.Notification.permission : "default",
          supported: true,
          enabled: false,
          busy: false
        }))
      }
    }

    loadPushState()

    return () => {
      active = false
    }
  }, [normalizedOwnerType, ownerSlug, pushOps])

  async function handleEnable() {
    if (pushState.busy) {
      return
    }

    if (!isPushApiSupported()) {
      setPushState((current) => ({
        ...current,
        kind: "unsupported",
        message: uiMessage("salon.s1215"),
        supported: false,
        enabled: false,
        busy: false
      }))
      return
    }

    if (!normalizedOwnerType || !ownerSlug) {
      setPushState((current) => ({
        ...current,
        kind: "failed",
        message: uiMessage("salon.s1214"),
        supported: true,
        enabled: false,
        busy: false
      }))
      return
    }

    setPushState((current) => ({
      ...current,
      busy: true,
      message: ""
    }))

    try {
      const configResult = pushConfig.data?.ok ? pushConfig.data : await getPublicPushConfig()

      if (!configResult?.ok || !configResult?.push_enabled || !configResult?.vapid_public_key) {
        setPushConfig({
          loading: false,
          error: configResult?.error || "PUBLIC_PUSH_CONFIG_DISABLED",
          data: configResult || null
        })
        setPushState((current) => ({
          ...current,
          kind: "failed",
          message: uiMessage("salon.s1216"),
          supported: true,
          enabled: false,
          busy: false
        }))
        return
      }

      setPushConfig({
        loading: false,
        error: "",
        data: configResult
      })

      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setPushState((current) => ({
          ...current,
          kind: "permission_denied",
          message: uiMessage("salon.s1219"),
          permission,
          supported: true,
          enabled: false,
          busy: false
        }))
        return
      }

      const registration = await ensureOwnerServiceWorkerReady()
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        const applicationServerKey = decodeBase64UrlToUint8Array(configResult.vapid_public_key)

        if (!applicationServerKey) {
          throw new Error("PUSH_APPLICATION_SERVER_KEY_INVALID")
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        })
      }

      const deviceId = getOwnerPushDeviceId(normalizedOwnerType, ownerSlug)
      const saveResult = await pushOps.save(ownerSlug, {
        device_id: deviceId,
        platform: "web",
        subscription: subscription.toJSON ? subscription.toJSON() : subscription,
        user_agent: navigator.userAgent
      })

      if (!saveResult?.ok) {
        setPushState((current) => ({
          ...current,
          kind: "failed",
          message: uiError(saveResult?.error || uiMessage("salon.s1218")),
          permission,
          supported: true,
          enabled: false,
          busy: false
        }))
        return
      }

      setPushState((current) => ({
        ...current,
        kind: "enabled",
        message: uiMessage("salon.s1217", {p0: getOwnerPushLabel(normalizedOwnerType)}),
        permission,
        supported: true,
        enabled: true,
        busy: false,
        synced: true
      }))
    } catch (error) {
      setPushState((current) => ({
        ...current,
        kind: "failed",
        message:
          error?.message === "SERVICE_WORKER_NOT_READY"
            ? uiMessage("salon.s1221")
            : uiError(error?.message, uiMessage("salon.s1223")),
        permission: typeof window !== "undefined" && window.Notification ? window.Notification.permission : "default",
        supported: true,
        enabled: false,
        busy: false
      }))
    }
  }

  async function handleDisable() {
    if (pushState.busy || !pushState.enabled) {
      return
    }

    if (!isPushApiSupported()) {
      setPushState((current) => ({
        ...current,
        kind: "unsupported",
        message: uiMessage("salon.s1215"),
        supported: false,
        enabled: false,
        busy: false
      }))
      return
    }

    setPushState((current) => ({
      ...current,
      busy: true
    }))

    try {
      const registration = await ensureOwnerServiceWorkerReady()
      const subscription = await registration.pushManager.getSubscription()
      const deviceId = getOwnerPushDeviceId(normalizedOwnerType, ownerSlug)

      if (subscription) {
        await pushOps.revoke(ownerSlug, deviceId)
        try {
          await subscription.unsubscribe()
        } catch {
          /* no-op */
        }
      }

      setPushState((current) => ({
        ...current,
        kind: "ready",
        message: uiMessage("salon.s1224", {p0: getOwnerPushLabel(normalizedOwnerType)}),
        permission: typeof window !== "undefined" && window.Notification ? window.Notification.permission : "default",
        supported: true,
        enabled: false,
        busy: false,
        synced: false
      }))
    } catch (error) {
      setPushState((current) => ({
        ...current,
        kind: "failed",
        message:
          error?.message === "SERVICE_WORKER_NOT_READY"
            ? uiMessage("salon.s1221")
            : uiError(error?.message, uiMessage("salon.s1225")),
        supported: true,
        enabled: true,
        busy: false
      }))
    }
  }

  if (!normalizedOwnerType || !ownerSlug) {
    return null
  }

  const kind = String(pushState.kind || "idle")
  const message =
    pushState.message ||
    (kind === "enabled"
      ? uiMessage("salon.s1217", {p0: getOwnerPushLabel(normalizedOwnerType)})
      : kind === "permission_denied"
        ? uiMessage("salon.s1219")
        : kind === "unsupported"
          ? uiMessage("salon.s1215")
          : uiMessage("salon.s1226"))

  const statusTone =
    kind === "enabled"
      ? "success"
      : kind === "permission_denied"
        ? "warning"
        : kind === "unsupported"
          ? "neutral"
          : "accent"

  const buttonLabel = pushState.busy
    ? uiMessage("salon.s0519")
    : pushState.enabled
      ? uiMessage("salon.s1227")
      : uiMessage("salon.s1228")

  return (
    <PageSection title={uiMessage("salon.s0367")}>
      <div style={{
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        background: "#fff",
        padding: "16px",
        display: "grid",
        gap: "12px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}><UiValue value={title || uiMessage("salon.s0367")} /></div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}>
              <UiValue value={subtitle || uiMessage("salon.s1229", {p0: getOwnerPushLabel(normalizedOwnerType)})} />
            </div>
          </div>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: "28px",
            padding: "0 12px",
            borderRadius: "999px",
            background: statusTone === "success"
              ? "#ecfdf3"
              : statusTone === "warning"
                ? "#fffbeb"
                : statusTone === "neutral"
                  ? "#f3f4f6"
                  : "#eff6ff",
            color: statusTone === "success"
              ? "#027a48"
              : statusTone === "warning"
                ? "#b45309"
                : statusTone === "neutral"
                  ? "#374151"
                  : "#1d4ed8",
            fontSize: "12px",
            fontWeight: 800
          }}>
            <UiValue value={kind === "enabled"
              ? uiMessage("salon.s1230")
              : kind === "permission_denied"
                ? uiMessage("salon.s1231")
                : kind === "unsupported"
                  ? uiMessage("salon.s1232")
                  : kind === "failed"
                    ? uiMessage("salon.s0506")
                    : uiMessage("salon.s0507")} />
          </span>
        </div>

        <div style={{ fontSize: "13px", lineHeight: 1.55, color: "#4b5563" }}>
          <UiValue value={pushConfig.loading
            ? uiMessage("salon.s1233")
            : message} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <button
            type="button"
            onClick={pushState.enabled ? handleDisable : handleEnable}
            disabled={Boolean(pushState.busy) || kind === "unsupported" || pushConfig.loading}
            style={{
              minHeight: "40px",
              padding: "0 14px",
              borderRadius: "10px",
              border: pushState.enabled ? "1px solid #b91c1c" : "1px solid #1d4ed8",
              background: pushState.enabled ? "#fff1f2" : "#1d4ed8",
              color: pushState.enabled ? "#b91c1c" : "#fff",
              fontSize: "14px",
              fontWeight: 800,
              cursor: pushState.busy || kind === "unsupported" || pushConfig.loading ? "default" : "pointer"
            }}
          >
            <UiValue value={buttonLabel} />
          </button>
          {pushState.enabled ? (
            <div style={{ fontSize: "13px", color: "#6b7280", alignSelf: "center" }}><UiValue value={uiMessage("salon.s1234")} /></div>
          ) : null}
        </div>
      </div>
    </PageSection>
  )
}
