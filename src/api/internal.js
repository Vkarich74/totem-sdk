import { safeJson } from "../utils/apiSafe";
import { getSalonSlug, getMasterSlug } from "../utils/slug";

const API_BASE = "https://api.totemv.com/internal";

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

/* ===============================
   WITHDRAWS (FIXED)
================================ */

export async function createSalonWithdraw(amount, billingAccess, salonSlug = getSalonSlug()){

  if (!canWithdrawByBilling(billingAccess)) {
    return { ok:false, error:"WITHDRAW_BLOCKED_BY_BILLING" };
  }

  const r = await safeJson(
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

  const r = await safeJson(
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
   TEMPLATE SYSTEM (SALON)
================================ */

function getInternalTemplateToken(){
  try{
    return (
      window.localStorage.getItem("TOTEM_INTERNAL_TOKEN") ||
      window.TOTEM_INTERNAL_TOKEN ||
      ""
    );
  }catch(e){
    return window.TOTEM_INTERNAL_TOKEN || "";
  }
}

export function hasInternalTemplateToken(){
  return Boolean(getInternalTemplateToken());
}

async function safeTemplateJson(path, opts = {}){
  const token = getInternalTemplateToken();
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {})
  };

  if(token){
    headers.Authorization = `Bearer ${token}`;
  }

  const r = await safeJson(`${API_BASE}${path}`, {
    ...opts,
    headers
  });

  return r;
}

export async function getSalonTemplateDocument(salonSlug = getSalonSlug()){
  const r = await safeTemplateJson(`/templates/salon/${salonSlug}`);
  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_DOCUMENT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_DOCUMENT_API_NOT_OK", detail:j };
  return { ok:true, document: j.document || null };
}

export async function saveSalonTemplateDraft(draft, salonSlug = getSalonSlug()){
  const r = await safeTemplateJson(`/templates/salon/${salonSlug}/draft`, {
    method: "PUT",
    body: JSON.stringify({
      template_version: "v1",
      draft
    })
  });
  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_DRAFT_SAVE_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_DRAFT_SAVE_API_NOT_OK", detail:j };
  return { ok:true, document: j.document || null };
}

export async function getSalonTemplatePublished(salonSlug = getSalonSlug()){
  const r = await safeJson(`${API_BASE}/templates-public/salon/${salonSlug}/published?version=v1`);
  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_PUBLISHED_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_PUBLISHED_API_NOT_OK", detail:j };
  return {
    ok:true,
    payload: j.payload || null,
    meta: j.meta || null,
    published_exists: Boolean(j.published_exists)
  };
}

export async function getSalonTemplatePreview(salonSlug = getSalonSlug()){
  const r = await safeTemplateJson(`/templates/salon/${salonSlug}/preview?version=v1`);
  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_PREVIEW_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_PREVIEW_API_NOT_OK", detail:j };
  return {
    ok:true,
    payload: j.payload || null,
    validation: j.validation || null,
    is_ready_for_preview: Boolean(j.is_ready_for_preview)
  };
}

export async function publishSalonTemplate(salonSlug = getSalonSlug(), publishedBy = "system:1"){
  const r = await safeTemplateJson(`/templates/salon/${salonSlug}/publish`, {
    method: "POST",
    body: JSON.stringify({
      template_version: "v1",
      published_by: publishedBy
    })
  });
  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_PUBLISH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_PUBLISH_API_NOT_OK", detail:j };
  return { ok:true, published: Boolean(j.published), document: j.document || null };
}
