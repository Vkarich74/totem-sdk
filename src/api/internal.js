import { safeJson } from "../utils/apiSafe";
import { getSalonSlug, getMasterSlug } from "../utils/slug";

const API_BASE = "https://api.totemv.com/internal";

/* ===============================
   SALON (OWNER) API
================================ */

export async function getSalon(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/salons/${salonSlug}`);
  if(!r.ok) return { ok:false, error:"SALON_FETCH_FAILED", detail:r };

  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_API_NOT_OK", detail:j };

  return {
    ok:true,
    salon: j.salon,
    billing_access: j.billing_access || null
  };
}

export async function getMetrics(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/salons/${salonSlug}/metrics`);
  if(!r.ok) return { ok:false, error:"METRICS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"METRICS_API_NOT_OK", detail:j };
  return { ok:true, metrics: j.metrics || {} };
}

export async function getBookings(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/salons/${salonSlug}/bookings`);
  if(!r.ok) return { ok:false, error:"BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"BOOKINGS_API_NOT_OK", detail:j };
  return { ok:true, bookings: j.bookings || [] };
}

export async function getMasters(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/salons/${salonSlug}/masters`);
  if(!r.ok) return { ok:false, error:"MASTERS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTERS_API_NOT_OK", detail:j };
  return { ok:true, masters: j.masters || [] };
}

export async function getClients(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/salons/${salonSlug}/clients`);
  if(!r.ok) return { ok:false, error:"CLIENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"CLIENTS_API_NOT_OK", detail:j };
  return { ok:true, clients: j.clients || [] };
}

/* ===============================
   MASTER API
================================ */

export async function getMaster(masterSlug = getMasterSlug()){
  const r = await safeJson(`${API_BASE}/masters/${masterSlug}`);
  if(!r.ok) return { ok:false, error:"MASTER_FETCH_FAILED", detail:r };

  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_API_NOT_OK", detail:j };

  return {
    ok:true,
    master: j.master,
    billing_access: j.billing_access || null
  };
}

export async function getMasterMetrics(masterSlug = getMasterSlug()){
  const r = await safeJson(`${API_BASE}/masters/${masterSlug}/metrics`);
  if(!r.ok) return { ok:false, error:"MASTER_METRICS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_METRICS_API_NOT_OK", detail:j };
  return { ok:true, metrics: j.metrics || {} };
}

export async function getMasterBookings(masterSlug = getMasterSlug()){
  const r = await safeJson(`${API_BASE}/masters/${masterSlug}/bookings`);
  if(!r.ok) return { ok:false, error:"MASTER_BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_BOOKINGS_API_NOT_OK", detail:j };
  return { ok:true, bookings: j.bookings || [] };
}

export async function getMasterClients(masterSlug = getMasterSlug()){
  const r = await safeJson(`${API_BASE}/masters/${masterSlug}/clients`);
  if(!r.ok) return { ok:false, error:"MASTER_CLIENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_CLIENTS_API_NOT_OK", detail:j };
  return { ok:true, clients: j.clients || [] };
}

/* ===============================
   BOOKING ACTIONS
================================ */

export async function bookingAction(id, action){
  const r = await safeJson(`${API_BASE}/bookings/${id}/${action}`, { method:"PATCH" });
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
    `${API_BASE}/bookings/create`,
    {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
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
    `${API_BASE}/bookings/${id}/move`,
    {
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ start_at })
    }
  );

  if(!r.ok) return { ok:false, error:"MOVE_BOOKING_FETCH_FAILED", detail:r };

  const j = r.json;

  if(!j || !j.ok) return { ok:false, error:"MOVE_BOOKING_API_NOT_OK", detail:j };

  return { ok:true, booking:j.booking };

}