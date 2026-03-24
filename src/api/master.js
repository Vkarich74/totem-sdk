const API = "https://api.totemv.com"

function normalize(res) {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.bookings)) return res.bookings
  if (Array.isArray(res.clients)) return res.clients
  if (Array.isArray(res.data)) return res.data
  return []
}

async function handleResponse(r) {
  const j = await r.json()

  if (!r.ok) {
    throw new Error(j?.error || j?.message || "API_ERROR")
  }

  return j
}

// ======================
// METRICS
// ======================

export async function getMasterMetrics(slug) {
  const r = await fetch(API + "/internal/masters/" + slug + "/metrics")
  const j = await handleResponse(r)
  return j.metrics || j
}

// ======================
// BOOKINGS
// ======================

export async function getMasterBookings(slug) {
  const r = await fetch(
    API + "/internal/masters/" + slug + "/bookings"
  )
  const j = await handleResponse(r)
  return normalize(j)
}

// ======================
// CLIENTS
// ======================

export async function getMasterClients(slug) {
  const r = await fetch(
    API + "/internal/masters/" + slug + "/clients"
  )
  const j = await handleResponse(r)
  return normalize(j)
}

// ======================
// SERVICES
// ======================

export async function getMasterServices(slug) {
  const r = await fetch(
    API + "/internal/masters/" + slug + "/services"
  )
  return handleResponse(r)
}

export async function createMasterService(slug, payload) {
  const r = await fetch(
    API + "/internal/masters/" + slug + "/services",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  return handleResponse(r)
}

export async function updateMasterService(slug, id, payload) {
  const r = await fetch(
    API + "/internal/masters/" + slug + "/services/" + id,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  return handleResponse(r)
}

export async function deleteMasterService(slug, id) {
  const r = await fetch(
    API + "/internal/masters/" + slug + "/services/" + id,
    {
      method: "DELETE",
    }
  )
  return handleResponse(r)
}