import { safeJson } from "../utils/apiSafe";
import { getSalonSlug, getMasterSlug } from "../utils/slug";


const API_BASE = "https://api.totemv.com/internal";

function getInternalToken(){
  if (typeof window === "undefined") return null

  const direct =
    window.TOTEM_INTERNAL_TOKEN ||
    window.__TOTEM_INTERNAL_TOKEN ||
    null

  if (direct) return String(direct)

  try{
    const stored = window.localStorage?.getItem("TOTEM_INTERNAL_TOKEN")
    if (stored) return String(stored)
  }catch(_err){}

  return null
}

function buildInternalHeaders(headers = {}){
  const token = getInternalToken()
  if (!token) return headers

  return {
    ...headers,
    Authorization: `Bearer ${token}`
  }
}


async function internalJson(url, opts = {}){
  return safeJson(url, {
    ...opts,
    headers: buildInternalHeaders(opts.headers || {})
  })
}

/* ===============================
   BILLING GUARDS
================================ */

export function canWriteByBilling(billingAccess){
  if (!billingAccess) return true;
  if (billingAccess.exists === false) return true;
  return billingAccess.can_write !== false;
}

export function canWithdrawByBilling(billingAccess){
  if (!billingAccess) return true;
  if (billingAccess.exists === false) return true;
  return billingAccess.can_withdraw !== false;
}

export function getBillingBlockReason(billingAccess){
  if (!billingAccess) return null;

  if (billingAccess.access_state === "blocked") {
    return "BILLING_BLOCKED";
  }

  if (billingAccess.can_withdraw === false && billingAccess.access_state === "grace") {
    return "WITHDRAW_DISABLED_IN_GRACE";
  }

  if (billingAccess.can_write === false) {
    return "WRITE_DISABLED_BY_BILLING";
  }

  if (billingAccess.can_withdraw === false) {
    return "WITHDRAW_DISABLED_BY_BILLING";
  }

  return null;
}

/* ===============================
   SALON (OWNER) API
================================ */

export async function getSalon(salonSlug = getSalonSlug()){
  const r = await internalJson(`${API_BASE}/salons/${salonSlug}`);
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
  const r = await internalJson(`${API_BASE}/salons/${salonSlug}/metrics`);
  if(!r.ok) return { ok:false, error:"METRICS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"METRICS_API_NOT_OK", detail:j };
  return { ok:true, metrics: j.metrics || {} };
}

export async function getBookings(salonSlug = getSalonSlug()){
  const r = await internalJson(`${API_BASE}/salons/${salonSlug}/bookings`);
  if(!r.ok) return { ok:false, error:"BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"BOOKINGS_API_NOT_OK", detail:j };
  return { ok:true, bookings: j.bookings || [] };
}

export async function getMasters(salonSlug = getSalonSlug()){
  const r = await internalJson(`${API_BASE}/salons/${salonSlug}/masters`);
  if(!r.ok) return { ok:false, error:"MASTERS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTERS_API_NOT_OK", detail:j };
  return { ok:true, masters: j.masters || [] };
}

export async function getClients(salonSlug = getSalonSlug()){
  const r = await internalJson(`${API_BASE}/salons/${salonSlug}/clients`);
  if(!r.ok) return { ok:false, error:"CLIENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"CLIENTS_API_NOT_OK", detail:j };
  return { ok:true, clients: j.clients || [] };
}

/* ===============================
   MASTER API
================================ */

export async function getMaster(masterSlug = getMasterSlug()){
  const r = await internalJson(`${API_BASE}/masters/${masterSlug}`);
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
  const r = await internalJson(`${API_BASE}/masters/${masterSlug}/metrics`);
  if(!r.ok) return { ok:false, error:"MASTER_METRICS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_METRICS_API_NOT_OK", detail:j };
  return { ok:true, metrics: j.metrics || {} };
}

export async function getMasterBookings(masterSlug = getMasterSlug()){
  const r = await internalJson(`${API_BASE}/masters/${masterSlug}/bookings`);
  if(!r.ok) return { ok:false, error:"MASTER_BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_BOOKINGS_API_NOT_OK", detail:j };
  return { ok:true, bookings: j.bookings || [] };
}

export async function getMasterClients(masterSlug = getMasterSlug()){
  const r = await internalJson(`${API_BASE}/masters/${masterSlug}/clients`);
  if(!r.ok) return { ok:false, error:"MASTER_CLIENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_CLIENTS_API_NOT_OK", detail:j };
  return { ok:true, clients: j.clients || [] };
}

/* ===============================
   BOOKING ACTIONS
================================ */

export async function bookingAction(id, action){
  const r = await internalJson(`${API_BASE}/bookings/${id}/${action}`, { method:"PATCH" });
  if(!r.ok) return { ok:false, error:"BOOKING_ACTION_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"BOOKING_ACTION_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

/* ===============================
   CREATE BOOKING
================================ */

export async function createBooking(payload){

  const r = await internalJson(
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

  const r = await internalJson(
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

/* ===============================
   WITHDRAWS (FIXED)
================================ */

export async function createSalonWithdraw(amount, billingAccess, salonSlug = getSalonSlug()){

  if (!canWithdrawByBilling(billingAccess)) {
    return { ok:false, error:"WITHDRAW_BLOCKED_BY_BILLING" };
  }

  const r = await internalJson(
    `${API_BASE}/salons/${salonSlug}/withdraw`,
    {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ amount })
    }
  );

  if(!r.ok) return { ok:false, error:"SALON_WITHDRAW_FETCH_FAILED", detail:r };

  const j = r.json;

  if(!j || !j.ok) return { ok:false, error:"SALON_WITHDRAW_API_NOT_OK", detail:j };

  return {
    ok:true,
    withdraw_id: j.withdraw_id || null,
    amount: j.amount,
    status: j.status || null,
    billing_access: j.billing_access || null,
    result: j
  };
}

export async function createMasterWithdraw(amount, billingAccess, masterSlug = getMasterSlug()){

  if (!canWithdrawByBilling(billingAccess)) {
    return { ok:false, error:"WITHDRAW_BLOCKED_BY_BILLING" };
  }

  const r = await internalJson(
    `${API_BASE}/masters/${masterSlug}/withdraw`,
    {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ amount })
    }
  );

  if(!r.ok) return { ok:false, error:"MASTER_WITHDRAW_FETCH_FAILED", detail:r };

  const j = r.json;

  if(!j || !j.ok) return { ok:false, error:"MASTER_WITHDRAW_API_NOT_OK", detail:j };

  return {
    ok:true,
    withdraw_id: j.withdraw_id || null,
    amount: j.amount,
    status: j.status || null,
    billing_access: j.billing_access || null,
    result: j
  };
}

/* ===============================
   TEMPLATE API
================================ */

export function hasInternalTemplateToken(){
  return Boolean(getInternalToken())
}

export async function getSalonTemplateDocument(salonSlug = getSalonSlug()){
  const r = await internalJson(`${API_BASE}/templates/salon/${salonSlug}`, {
    headers: buildInternalHeaders()
  })

  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_DOCUMENT_FETCH_FAILED", detail:r }

  const j = r.json
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_DOCUMENT_API_NOT_OK", detail:j }

  return { ok:true, document: j.document || null }
}

export async function saveSalonTemplateDraft(draft, salonSlug = getSalonSlug()){
  const r = await internalJson(`${API_BASE}/templates/salon/${salonSlug}/draft`, {
    method: "PUT",
    headers: buildInternalHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      template_version: "v1",
      draft
    })
  })

  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_DRAFT_SAVE_FAILED", detail:r }

  const j = r.json
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_DRAFT_API_NOT_OK", detail:j }

  return { ok:true, document: j.document || null }
}
