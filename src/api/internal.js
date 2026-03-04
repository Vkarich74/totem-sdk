import { safeJson } from "../utils/apiSafe";
import { getSalonSlug } from "../utils/salon";

const API_BASE = "https://api.totemv.com";

export async function getMetrics(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/internal/salons/${salonSlug}/metrics`);
  if(!r.ok) return { ok:false, error:"METRICS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"METRICS_API_NOT_OK", detail:j };
  return { ok:true, metrics: j.metrics || {} };
}

export async function getBookings(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/internal/salons/${salonSlug}/bookings`);
  if(!r.ok) return { ok:false, error:"BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"BOOKINGS_API_NOT_OK", detail:j };
  return { ok:true, bookings: j.bookings || [] };
}

export async function getMasters(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/internal/salons/${salonSlug}/masters`);
  if(!r.ok) return { ok:false, error:"MASTERS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTERS_API_NOT_OK", detail:j };
  return { ok:true, masters: j.masters || [] };
}

export async function bookingAction(id, action){
  const r = await safeJson(`${API_BASE}/internal/bookings/${id}/${action}`, { method:"PATCH" });
  if(!r.ok) return { ok:false, error:"BOOKING_ACTION_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"BOOKING_ACTION_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

/* ===============================
   CREATE BOOKING
================================ */

export async function createBooking(payload){

  const r = await safeJson(
    `${API_BASE}/internal/bookings/create`,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if(!r.ok) return { ok:false, error:"CREATE_BOOKING_FETCH_FAILED", detail:r };

  const j = r.json;

  if(!j || !j.ok) return { ok:false, error:"CREATE_BOOKING_API_NOT_OK", detail:j };

  return { ok:true, booking:j.booking };

}

/* ===============================
   MOVE BOOKING
================================ */

export async function moveBooking(id,start_at){

  const r = await safeJson(
    `${API_BASE}/internal/bookings/${id}/move`,
    {
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        start_at
      })
    }
  );

  if(!r.ok) return { ok:false, error:"MOVE_BOOKING_FETCH_FAILED", detail:r };

  const j = r.json;

  if(!j || !j.ok) return { ok:false, error:"MOVE_BOOKING_API_NOT_OK", detail:j };

  return { ok:true, booking:j.booking };

}