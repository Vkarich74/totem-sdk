const API = "https://api.totemv.com"

let masterCache = null

async function getMaster(slug) {

  if (masterCache) return masterCache

  const r = await fetch(API + "/internal/masters/" + slug)
  const j = await r.json()

  masterCache = j.master

  return masterCache

}

function normalize(arr) {

  if (!arr) return []

  if (Array.isArray(arr)) return arr

  if (Array.isArray(arr.bookings)) return arr.bookings

  if (Array.isArray(arr.clients)) return arr.clients

  if (Array.isArray(arr.data)) return arr.data

  return []

}

export async function getMasterMetrics(slug) {

  const r = await fetch(API + "/internal/masters/" + slug + "/metrics")
  const j = await r.json()

  return j.metrics || j

}

export async function getMasterBookings(slug) {

  const master = await getMaster(slug)

  const r = await fetch(
    API + "/internal/salons/" + window.SALON_SLUG + "/bookings"
  )

  const j = await r.json()

  const bookings = normalize(j)

  return bookings.filter(b => b.master_name === master.name)

}

export async function getMasterClients(slug) {

  const master = await getMaster(slug)

  const r = await fetch(
    API + "/internal/salons/" + window.SALON_SLUG + "/clients"
  )

  const j = await r.json()

  const clients = normalize(j)

  return clients

}