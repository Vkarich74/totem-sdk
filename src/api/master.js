const API="https://api.totemv.com"

function normalizeBookings(j){

if(Array.isArray(j)) return j
if(Array.isArray(j.bookings)) return j.bookings
if(Array.isArray(j.data)) return j.data

return []

}

function normalizeClients(j){

if(Array.isArray(j)) return j
if(Array.isArray(j.clients)) return j.clients
if(Array.isArray(j.data)) return j.data

return []

}

export async function getMasterMetrics(slug){

const r=await fetch(API+"/internal/masters/"+slug+"/metrics")
const j=await r.json()

return j.metrics || j

}

export async function getMasterBookings(slug){

const r=await fetch(API+"/internal/salons/"+window.SALON_SLUG+"/bookings")
const j=await r.json()

const bookings=normalizeBookings(j)

return bookings.filter(b=>b.master_name===window.MASTER_NAME || true)

}

export async function getMasterClients(slug){

const r=await fetch(API+"/internal/salons/"+window.SALON_SLUG+"/clients")
const j=await r.json()

return normalizeClients(j)

}