const API = "https://api.totemv.com"

function normalize(res) {

  if (!res) return []

  if (Array.isArray(res)) return res

  if (Array.isArray(res.bookings)) return res.bookings

  if (Array.isArray(res.clients)) return res.clients

  if (Array.isArray(res.data)) return res.data

  return []

}

export async function getMasterMetrics(slug) {

  const r = await fetch(API + "/internal/masters/" + slug + "/metrics")
  const j = await r.json()

  return j.metrics || j

}

export async function getMasterBookings(slug) {

  const r = await fetch(
    API + "/internal/masters/" + slug + "/bookings"
  )

  const j = await r.json()

  return normalize(j)

}

export async function getMasterClients(slug) {

  const r = await fetch(
    API + "/internal/masters/" + slug + "/clients"
  )

  const j = await r.json()

  return normalize(j)

}