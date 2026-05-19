import { useEffect, useMemo, useState } from "react";
import {
  deleteClientPushSubscription,
  getClientPushSubscriptionStatus,
  postClientPushSubscription,
} from "../api/client.js";
import { getPublicPushConfig } from "../api/publicApi.js";

function getStorageKey(clientId) {
  return `TOTEM_CLIENT_PUSH_DEVICE:${String(clientId || "").trim()}`;
}

function readStoredDeviceId(clientId) {
  try {
    return String(window.localStorage.getItem(getStorageKey(clientId)) || "").trim();
  } catch {
    return "";
  }
}

function writeStoredDeviceId(clientId, deviceId) {
  try {
    window.localStorage.setItem(getStorageKey(clientId), String(deviceId || "").trim());
  } catch {
    // best-effort only
  }
}

function generateDeviceId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  const suffix = Math.random().toString(36).slice(2, 12);
  return `client-${Date.now()}-${suffix}`;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getBrowserSupportReason() {
  if (!window.isSecureContext) {
    return "NOT_SECURE_CONTEXT";
  }

  if (!navigator.serviceWorker) {
    return "SERVICE_WORKER_UNSUPPORTED";
  }

  if (!window.PushManager) {
    return "PUSH_MANAGER_UNSUPPORTED";
  }

  if (!window.Notification) {
    return "NOTIFICATION_API_UNSUPPORTED";
  }

  return "";
}

function getStatusLabel(mode, permission, isEnabled) {
  if (mode === "unsupported") return "Недоступно";
  if (mode === "disabled") return "Недоступно";
  if (permission === "denied") return "Отключено в браузере";
  if (isEnabled) return "Включены";
  return "Выключены";
}

function getPushEnabledText(pushEnabled, mode, permission) {
  if (mode === "unsupported") {
    return "Push недоступны в этом браузере, уведомления останутся внутри приложения.";
  }

  if (!pushEnabled) {
    return "Push сейчас недоступны. In-app уведомления продолжают работать.";
  }

  if (permission === "denied") {
    return "Браузер запретил push. Разрешите уведомления в настройках браузера, если хотите включить push.";
  }

  return "Push-уведомления будут приходить в браузер, если устройство поддерживает их и подписка активна.";
}

export default function ClientPushOptInCard({ clientId, token }) {
  const safeClientId = useMemo(() => String(clientId || "").trim(), [clientId]);
  const safeToken = useMemo(() => String(token || "").trim(), [token]);

  const [config, setConfig] = useState(null);
  const [supportReason, setSupportReason] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState(() => window.Notification?.permission || "default");

  const mode = useMemo(() => {
    if (!safeClientId || !safeToken) {
      return "disabled";
    }

    if (supportReason) {
      return "unsupported";
    }

    if (!config) {
      return "loading";
    }

    if (!config.push_enabled || !config.vapid_public_key) {
      return "disabled";
    }

    return "ready";
  }, [config, safeClientId, safeToken, supportReason]);

  const activeSubscription = useMemo(
    () => subscriptions.find((item) => item?.active) || subscriptions[0] || null,
    [subscriptions]
  );

  const isEnabled = Boolean(activeSubscription?.active);
  const statusLabel = getStatusLabel(mode, permission, isEnabled);
  const fallbackText = getPushEnabledText(Boolean(config?.push_enabled && config?.vapid_public_key), mode, permission);

  async function loadStatus(nextDeviceId) {
    if (!safeClientId || !safeToken) {
      return;
    }

    try {
      const payload = await getClientPushSubscriptionStatus(safeClientId, safeToken, {
        device_id: nextDeviceId || deviceId || undefined,
      });

      const items = Array.isArray(payload?.status?.subscriptions)
        ? payload.status.subscriptions
        : Array.isArray(payload?.subscriptions)
          ? payload.subscriptions
          : [];
      setSubscriptions(items);

      const matched = items.find((item) => String(item?.device_id || "") === String(nextDeviceId || deviceId || ""));
      if (matched?.device_id) {
        setDeviceId(String(matched.device_id));
        writeStoredDeviceId(safeClientId, matched.device_id);
      } else if (nextDeviceId) {
        setDeviceId(nextDeviceId);
      }
    } catch (err) {
      setError(err?.message || "CLIENT_PUSH_STATUS_FAILED");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError("");
      setMessage("");

      const support = getBrowserSupportReason();
      setSupportReason(support);

      if (!safeClientId || !safeToken) {
        setLoading(false);
        return;
      }

      if (support) {
        setLoading(false);
        return;
      }

      try {
        const pushConfig = await getPublicPushConfig();
        if (cancelled) return;
        setConfig(pushConfig || null);

        const storedDeviceId = readStoredDeviceId(safeClientId);
        const nextDeviceId = storedDeviceId || generateDeviceId();
        setDeviceId(nextDeviceId);

        if (!storedDeviceId) {
          writeStoredDeviceId(safeClientId, nextDeviceId);
        }

        if (pushConfig?.push_enabled && pushConfig?.vapid_public_key) {
          await loadStatus(nextDeviceId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "PUBLIC_PUSH_CONFIG_REQUEST_FAILED");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [safeClientId, safeToken]);

  async function ensureServiceWorkerRegistration() {
    const existingRegistration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existingRegistration) {
      return existingRegistration;
    }

    return navigator.serviceWorker.register("/sw.js");
  }

  async function handleEnable() {
    if (saving || mode !== "ready") {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (window.Notification.permission === "denied") {
        setError("Push отключены в настройках браузера.");
        return;
      }

      let permissionValue = window.Notification.permission;
      if (permissionValue !== "granted") {
        permissionValue = await window.Notification.requestPermission();
      }

      setPermission(permissionValue);

      if (permissionValue !== "granted") {
        setError("Нужно разрешить push-уведомления в браузере.");
        return;
      }

      const registration = await ensureServiceWorkerRegistration();
      const vapidPublicKey = String(config?.vapid_public_key || "").trim();
      if (!vapidPublicKey) {
        setError("Push сейчас недоступны.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const nextDeviceId = deviceId || generateDeviceId();
      setDeviceId(nextDeviceId);
      writeStoredDeviceId(safeClientId, nextDeviceId);

      const payload = await postClientPushSubscription(safeClientId, safeToken, {
        device_id: nextDeviceId,
        platform: "web",
        subscription: subscription.toJSON(),
        user_agent: window.navigator.userAgent,
      });

      const items = Array.isArray(payload?.status?.subscriptions)
        ? payload.status.subscriptions
        : Array.isArray(payload?.subscription?.subscriptions)
          ? payload.subscription.subscriptions
          : null;

      if (items) {
        setSubscriptions(items);
      } else {
        await loadStatus(nextDeviceId);
      }

      setMessage("Push-уведомления включены");
    } catch (err) {
      setError(err?.message || "CLIENT_PUSH_SUBSCRIPTION_SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (saving || mode !== "ready") {
      return;
    }

    const nextDeviceId = deviceId || activeSubscription?.device_id || readStoredDeviceId(safeClientId);
    if (!nextDeviceId) {
      setError("Не удалось найти устройство для отключения.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const currentSubscription = await registration?.pushManager?.getSubscription?.();
      if (currentSubscription) {
        await currentSubscription.unsubscribe();
      }

      await deleteClientPushSubscription(safeClientId, safeToken, nextDeviceId);
      await loadStatus(nextDeviceId);
      setMessage("Push-уведомления отключены");
    } catch (err) {
      setError(err?.message || "CLIENT_PUSH_SUBSCRIPTION_REVOKE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section style={cardStyle}>
        <h2 style={titleStyle}>Push-уведомления</h2>
        <p style={mutedStyle}>Проверяем поддержку push…</p>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Push-уведомления</h2>
          <p style={mutedStyle}>
            {fallbackText}
          </p>
        </div>
        <span style={statusPillStyle(mode, permission, isEnabled)}>{statusLabel}</span>
      </div>

      {!safeClientId || !safeToken ? (
        <p style={warningStyle}>Кабинет открыт не полностью, push недоступны.</p>
      ) : null}

      {error ? <p style={errorStyle}>{error}</p> : null}
      {message ? <p style={successStyle}>{message}</p> : null}

      {deviceId ? (
        <p style={hintStyle}>Устройство: {deviceId}</p>
      ) : null}

      {mode === "unsupported" ? (
        <p style={hintStyle}>Push недоступны в этом браузере, уведомления останутся внутри приложения.</p>
      ) : null}

      {mode === "disabled" && config ? (
        <p style={hintStyle}>Push сейчас выключены на сервере, но in-app уведомления продолжают работать.</p>
      ) : null}

      {mode === "ready" ? (
        <div style={actionsStyle}>
          <button
            type="button"
            onClick={isEnabled ? handleDisable : handleEnable}
            disabled={saving}
            style={buttonStyle}
          >
            {saving ? "Сохраняем…" : isEnabled ? "Отключить" : "Включить"}
          </button>
        </div>
      ) : (
        <div style={actionsStyle}>
          <button type="button" disabled style={buttonDisabledStyle}>
            Недоступно
          </button>
        </div>
      )}
    </section>
  );
}

const cardStyle = {
  padding: "20px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
  display: "grid",
  gap: "12px",
};

const titleStyle = {
  margin: 0,
  fontSize: "20px",
};

const mutedStyle = {
  margin: 0,
  color: "#6b7280",
  lineHeight: 1.5,
};

const hintStyle = {
  margin: 0,
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.5,
};

const errorStyle = {
  margin: 0,
  color: "#b91c1c",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "10px 12px",
};

const warningStyle = {
  margin: 0,
  color: "#92400e",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "12px",
  padding: "10px 12px",
};

const successStyle = {
  margin: 0,
  color: "#166534",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "12px",
  padding: "10px 12px",
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const actionsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const buttonStyle = {
  appearance: "none",
  border: "none",
  background: "#111827",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const buttonDisabledStyle = {
  ...buttonStyle,
  opacity: 0.55,
  cursor: "not-allowed",
};

function statusPillStyle(mode, permission, isEnabled) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  if (mode === "unsupported" || mode === "disabled" || permission === "denied") {
    return {
      ...base,
      color: "#92400e",
      background: "#fffbeb",
      border: "1px solid #fde68a",
    };
  }

  if (isEnabled) {
    return {
      ...base,
      color: "#166534",
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
    };
  }

  return {
    ...base,
    color: "#1d4ed8",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
  };
}
