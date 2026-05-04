const API_BASE = "https://api.totemv.com"

export async function apiGet(url) {

  const res = await fetch(API_BASE + url)

  if (!res.ok) {
    throw new Error("API_ERROR")
  }

  return res.json()
}

async function handleJsonResponse(res, fallbackError = "API_ERROR") {
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error || json?.message || fallbackError)
  }
  return json
}

export async function getClientNotifications(clientId, token, options = {}) {
  const safeClientId = String(clientId || "").trim()
  const safeToken = String(token || "").trim()

  if (!safeClientId) {
    throw new Error("CLIENT_ID_REQUIRED")
  }

  if (!safeToken) {
    throw new Error("CLIENT_TOKEN_REQUIRED")
  }

  const qs = new URLSearchParams()
  if (typeof options.limit !== "undefined" && options.limit !== null && options.limit !== "") {
    qs.set("limit", String(options.limit))
  }

  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  const res = await fetch(
    `${API_BASE}/public/clients/${encodeURIComponent(safeClientId)}/${encodeURIComponent(safeToken)}/notifications${suffix}`
  )

  return handleJsonResponse(res)
}

export async function markClientNotificationRead(clientId, token, notificationUid) {
  const safeClientId = String(clientId || "").trim()
  const safeToken = String(token || "").trim()
  const safeNotificationUid = String(notificationUid || "").trim()

  if (!safeClientId) {
    throw new Error("CLIENT_ID_REQUIRED")
  }

  if (!safeToken) {
    throw new Error("CLIENT_TOKEN_REQUIRED")
  }

  if (!safeNotificationUid) {
    throw new Error("NOTIFICATION_UID_REQUIRED")
  }

  const res = await fetch(
    `${API_BASE}/public/clients/${encodeURIComponent(safeClientId)}/${encodeURIComponent(safeToken)}/notifications/${encodeURIComponent(safeNotificationUid)}/read`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  )

  return handleJsonResponse(res)
}
