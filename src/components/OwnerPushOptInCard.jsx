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
  const storageKey = `TOTEM_OWNER_PUSH_DEVICE:${safeOwnerType}:${safeSlug}`

  try {
    const existing = window.localStorage.getItem(storageKey)
    if (existing) {
      return existing
    }

    const nextValue = `owner-push-${safeOwnerType}-${safeSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(storageKey, nextValue)
    return nextValue
  } catch {
    return `owner-push-${safeOwnerType}-${safeSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
  return String(ownerType || "").trim().toLowerCase() === "master" ? "мастера" : "салона"
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
            message: "Не удалось определить кабинет для push-уведомлений.",
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
            message: "Push недоступен в этом браузере, уведомления останутся внутри кабинета.",
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
            message: "Push-уведомления пока не настроены.",
            permission: window.Notification?.permission || "default",
            supported: true,
            enabled: false,
            busy: false
          }))
          return
        }

        const registration = await navigator.serviceWorker.ready
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
              message: `Push-уведомления для ${getOwnerPushLabel(normalizedOwnerType)} включены.`,
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
            message: saveResult?.error || "Не удалось сохранить push-подписку кабинета.",
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
              ? "Разрешение на push отклонено."
              : `Нажмите кнопку, чтобы включить push-уведомления для ${getOwnerPushLabel(normalizedOwnerType)}.`,
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
          message: error?.message || "Не удалось загрузить push-настройки.",
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
        message: "Push недоступен в этом браузере, уведомления останутся внутри кабинета.",
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
        message: "Не удалось определить кабинет для push-уведомлений.",
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
          message: "Push-уведомления пока не настроены.",
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
          message: "Разрешение на push отклонено.",
          permission,
          supported: true,
          enabled: false,
          busy: false
        }))
        return
      }

      const registration = await navigator.serviceWorker.ready
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
          message: saveResult?.error || "Не удалось сохранить push-подписку кабинета.",
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
        message: `Push-уведомления для ${getOwnerPushLabel(normalizedOwnerType)} включены.`,
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
        message: error?.message || "Не удалось включить push-уведомления.",
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
        message: "Push недоступен в этом браузере, уведомления останутся внутри кабинета.",
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
      const registration = await navigator.serviceWorker.ready
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
        message: `Push-уведомления для ${getOwnerPushLabel(normalizedOwnerType)} отключены.`,
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
        message: error?.message || "Не удалось отключить push-уведомления.",
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
    String(pushState.message || "").trim() ||
    (kind === "enabled"
      ? `Push-уведомления для ${getOwnerPushLabel(normalizedOwnerType)} включены.`
      : kind === "permission_denied"
        ? "Разрешение на push отклонено."
        : kind === "unsupported"
          ? "Push недоступен в этом браузере, уведомления останутся внутри кабинета."
          : "Нажмите кнопку, чтобы включить push-уведомления.")

  const statusTone =
    kind === "enabled"
      ? "success"
      : kind === "permission_denied"
        ? "warning"
        : kind === "unsupported"
          ? "neutral"
          : "accent"

  const buttonLabel = pushState.busy
    ? "Сохраняем…"
    : pushState.enabled
      ? "Отключить уведомления"
      : "Включить уведомления"

  return (
    <PageSection title="Push-уведомления">
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
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>{title || "Push-уведомления"}</div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}>
              {subtitle || `Браузерные уведомления для ${getOwnerPushLabel(normalizedOwnerType)}.`}
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
            {kind === "enabled"
              ? "Включено"
              : kind === "permission_denied"
                ? "Доступ запрещён"
                : kind === "unsupported"
                  ? "Недоступно"
                  : kind === "failed"
                    ? "Ошибка"
                    : "Готово"}
          </span>
        </div>

        <div style={{ fontSize: "13px", lineHeight: 1.55, color: "#4b5563" }}>
          {pushConfig.loading
            ? "Проверяем доступность push-настроек…"
            : message}
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
            {buttonLabel}
          </button>
          {pushState.enabled ? (
            <div style={{ fontSize: "13px", color: "#6b7280", alignSelf: "center" }}>
              Подписка закреплена за этим кабинетом и этим устройством.
            </div>
          ) : null}
        </div>
      </div>
    </PageSection>
  )
}
