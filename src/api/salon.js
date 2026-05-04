import { apiGet } from "./client.js"
import { getAuthAccessToken } from "./internal.js"

const API = "https://api.totemv.com"

async function handleResponse(r) {
  const j = await r.json()
  if (!r.ok) throw new Error(j?.error || j?.message || "API_ERROR")
  return j
}

function buildAuthHeaders(extraHeaders = {}) {
  const headers = { ...(extraHeaders || {}) }
  const token = getAuthAccessToken()
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export function getSalonBookings(slug) {
  return apiGet(`/internal/salons/${slug}/bookings`)
}

export function getSalonClients(slug) {
  return apiGet(`/internal/salons/${slug}/clients`)
}

export function getSalonMetrics(slug) {
  return apiGet(`/internal/salons/${slug}/metrics`)
}

export async function getSalonNotifications(slug, options = {}) {
  const qs = new URLSearchParams()
  if (typeof options.limit !== "undefined" && options.limit !== null && options.limit !== "") {
    qs.set("limit", String(options.limit))
  }

  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  const r = await fetch(
    API + "/internal/salons/" + encodeURIComponent(String(slug || "").trim()) + "/notifications" + suffix,
    {
      headers: buildAuthHeaders()
    }
  )
  return handleResponse(r)
}

export async function markSalonNotificationRead(slug, notificationUid) {
  const r = await fetch(
    API + "/internal/salons/" + encodeURIComponent(String(slug || "").trim()) + "/notifications/" + encodeURIComponent(String(notificationUid || "").trim()) + "/read",
    {
      method: "POST",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({})
    }
  )
  return handleResponse(r)
}
