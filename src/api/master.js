
const API="https://api.totemv.com"

export async function getMasterMetrics(slug){

const r=await fetch(API+"/internal/masters/"+slug+"/metrics")
return r.json()

}

export async function getMasterBookings(slug){

const r=await fetch(API+"/internal/salons/"+window.SALON_SLUG+"/bookings")
const j=await r.json()

return j.bookings.filter(b=>b.master_name===window.MASTER_NAME||true)

}

export async function getMasterClients(slug){

const r=await fetch(API+"/internal/salons/"+window.SALON_SLUG+"/clients")
return r.json()

}
