import { safeJson } from "../utils/apiSafe";
import { getSalonSlug, getMasterSlug } from "../utils/slug";

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com") + "/internal";
const TEMPLATE_VERSION = "v1";
const AUTH_TOKEN_STORAGE_KEYS = [
  "TOTEM_AUTH_TOKEN",
  "TOTEM_ACCESS_TOKEN",
  "TOTEM_INTERNAL_TOKEN"
];

/* ===============================
   AUTH TOKEN / TRANSPORT
================================ */

function getStoredWindowValue(key){
  try{
    return window[key] || "";
  }catch(e){
    return "";
  }
}

function getStoredLocalValue(key){
  try{
    return window.localStorage.getItem(key) || "";
  }catch(e){
    return "";
  }
}

export function getAuthAccessToken(){
  for(const key of AUTH_TOKEN_STORAGE_KEYS){
    const localValue = getStoredLocalValue(key);
    if(localValue) return localValue;

    const windowValue = getStoredWindowValue(key);
    if(windowValue) return windowValue;
  }

  return "";
}

export function setAuthAccessToken(token){
  const normalized = String(token || "").trim();

  try{
    if(normalized){
      window.localStorage.setItem("TOTEM_AUTH_TOKEN", normalized);
      window.localStorage.setItem("TOTEM_ACCESS_TOKEN", normalized);
      window.TOTEM_AUTH_TOKEN = normalized;
      window.TOTEM_ACCESS_TOKEN = normalized;
    }else{
      window.localStorage.removeItem("TOTEM_AUTH_TOKEN");
      window.localStorage.removeItem("TOTEM_ACCESS_TOKEN");
      window.TOTEM_AUTH_TOKEN = "";
      window.TOTEM_ACCESS_TOKEN = "";
    }
  }catch(e){
    try{
      window.TOTEM_AUTH_TOKEN = normalized;
      window.TOTEM_ACCESS_TOKEN = normalized;
    }catch(innerError){
      /* no-op */
    }
  }

  return normalized;
}

export function clearAuthAccessToken(){
  return setAuthAccessToken("");
}

export function hasAuthAccessToken(){
  return Boolean(getAuthAccessToken());
}

function buildJsonHeaders(extraHeaders = {}, includeContentType = true){
  const headers = {
    ...(includeContentType ? { "Content-Type": "application/json" } : {}),
    ...(extraHeaders || {})
  };

  const token = getAuthAccessToken();
  if(token && !headers.Authorization){
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function safeInternalJson(path, opts = {}){
  const method = String(opts.method || "GET").toUpperCase();
  const headers = buildJsonHeaders(opts.headers || {}, method !== "GET");

  return safeJson(`${API_BASE}${path}`, {
    ...opts,
    method,
    headers
  });
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
   AUTH API
================================ */

export async function resolveSession(){
  const r = await safeInternalJson(`/auth/session/resolve`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"AUTH_SESSION_RESOLVE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_SESSION_RESOLVE_API_NOT_OK", detail:j };
  return {
    ok:true,
    authenticated:Boolean(j.authenticated),
    role:j.role || "public",
    reason:j.reason || null,
    auth:j.auth || null,
    identity:j.identity || null
  };
}

export async function loginWithPassword({ email = "", phone = "", password = "" } = {}){
  const body = {};
  if(String(email || "").trim()) body.email = String(email).trim();
  if(String(phone || "").trim()) body.phone = String(phone).trim();
  body.password = String(password || "");

  const r = await safeInternalJson(`/auth/login`, {
    method: "POST",
    body: JSON.stringify(body)
  });

  if(!r.ok) return { ok:false, error:"AUTH_LOGIN_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_LOGIN_API_NOT_OK", detail:j };
  if(!j.access_token){
    return { ok:false, error:"AUTH_LOGIN_NO_TOKEN", detail:j };
  }

  if(j.access_token){
    setAuthAccessToken(j.access_token);
  }else{
    clearAuthAccessToken();
  }

  return {
    ok:true,
    access_token:j.access_token,
    token_type:j.token_type || "Bearer",
    auth:j.auth || null
  };
}

export async function authLogin({ login = "", password = "", role = "", slug = "" } = {}){
  const normalizedLogin = String(login || "").trim();
  const normalizedPassword = String(password || "");
  const body = {
    password: normalizedPassword
  };

  if(normalizedLogin.includes("@")){
    body.email = normalizedLogin;
  }else{
    body.phone = normalizedLogin;
  }

  if(String(role || "").trim()){
    body.role = String(role).trim();
  }

  if(String(slug || "").trim()){
    body.slug = String(slug).trim();
  }

  const r = await safeInternalJson(`/auth/login`, {
    method: "POST",
    body: JSON.stringify(body)
  });

  if(!r.ok) return { ok:false, error:"AUTH_LOGIN_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_LOGIN_API_NOT_OK", detail:j };
  if(!j.access_token){
    return { ok:false, error:"AUTH_LOGIN_NO_TOKEN", detail:j };
  }

  if(j.access_token){
    setAuthAccessToken(j.access_token);
  }else{
    clearAuthAccessToken();
  }

  return {
    ok:true,
    access_token:j.access_token,
    token_type:j.token_type || "Bearer",
    auth:j.auth || null
  };
}

export async function logoutCurrentSession(){
  const r = await safeInternalJson(`/auth/logout`, { method: "POST" });
  if(!r.ok) return { ok:false, error:"AUTH_LOGOUT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_LOGOUT_API_NOT_OK", detail:j };
  clearAuthAccessToken();
  return { ok:true };
}

export async function logoutAllSessions(){
  const r = await safeInternalJson(`/auth/logout-all`, { method: "POST" });
  if(!r.ok) return { ok:false, error:"AUTH_LOGOUT_ALL_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_LOGOUT_ALL_API_NOT_OK", detail:j };
  clearAuthAccessToken();
  return { ok:true };
}

export async function startAuth(payload){
  const r = await safeInternalJson(`/auth/start`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"AUTH_START_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_START_API_NOT_OK", detail:j };
  return { ok:true, result:j };
}

export async function authStart({ login = "", purpose = "", role = "", slug = "" } = {}){
  const normalizedLogin = String(login || "").trim();
  const payload = {
    login: normalizedLogin,
    purpose: String(purpose || "").trim() || "login"
  };

  if(String(role || "").trim()){
    payload.role = String(role).trim();
  }

  if(String(slug || "").trim()){
    payload.slug = String(slug).trim();
  }

  return startAuth(payload);
}

export async function verifyAuth(payload){
  const r = await safeInternalJson(`/auth/verify`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"AUTH_VERIFY_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_VERIFY_API_NOT_OK", detail:j };

  if(j.access_token){
    setAuthAccessToken(j.access_token);
  }else{
    clearAuthAccessToken();
  }

  return {
    ok:true,
    access_token:j.access_token || "",
    token_type:j.token_type || "Bearer",
    auth:j.auth || null
  };
}

export async function setPassword(payload){
  const r = await safeInternalJson(`/auth/set-password`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"AUTH_SET_PASSWORD_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_SET_PASSWORD_API_NOT_OK", detail:j };
  return { ok:true, result:j };
}

export async function startPasswordReset(payload){
  const r = await safeInternalJson(`/auth/password/reset/start`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"AUTH_PASSWORD_RESET_START_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_PASSWORD_RESET_START_API_NOT_OK", detail:j };
  return { ok:true, result:j };
}

export async function finishPasswordReset(payload){
  const r = await safeInternalJson(`/auth/password/reset/finish`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"AUTH_PASSWORD_RESET_FINISH_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"AUTH_PASSWORD_RESET_FINISH_API_NOT_OK", detail:j };
  return { ok:true, result:j };
}

/* ===============================
   ADMIN OPEN OWNER API
================================ */

export async function getAdminOpenOwnerStats(){
  const r = await safeInternalJson(`/admin/open-owner/stats`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_STATS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_STATS_API_NOT_OK", detail:j };
  return {
    ok:true,
    stats:j
  };
}

export async function precheckAdminOpenOwner(payload = {}){
  const r = await safeInternalJson(`/admin/open-owner/precheck`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_PRECHECK_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_PRECHECK_API_NOT_OK", detail:j };
  return {
    ok:true,
    valid:Boolean(j.valid),
    errors:j.errors || [],
    normalized:j.normalized || null,
    checks:j.checks || [],
    result:j
  };
}

export async function createAdminOpenOwnerRequest(payload = {}){
  const r = await safeInternalJson(`/admin/open-owner/requests`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_CREATE_REQUEST_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_CREATE_REQUEST_API_NOT_OK", detail:j };
  return {
    ok:true,
    request:j.request || null,
    moderation_case_id:j.moderation_case_id || null,
    audit_event_id:j.audit_event_id || null,
    result:j
  };
}

export async function listAdminOpenOwnerRequests({ limit = 100 } = {}){
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 100;
  const r = await safeInternalJson(`/admin/open-owner/requests?limit=${encodeURIComponent(String(safeLimit))}`, {
    method: "GET"
  });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_LIST_REQUESTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_LIST_REQUESTS_API_NOT_OK", detail:j };
  return {
    ok:true,
    requests:j.requests || [],
    result:j
  };
}

export async function getAdminOpenOwnerRequest(requestId){
  const id = encodeURIComponent(String(requestId || "").trim());
  const r = await safeInternalJson(`/admin/open-owner/requests/${id}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_GET_REQUEST_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_GET_REQUEST_API_NOT_OK", detail:j };
  return {
    ok:true,
    request:j.request || null,
    result:j
  };
}

export async function approveAdminOpenOwnerRequest(requestId){
  const id = encodeURIComponent(String(requestId || "").trim());
  const r = await safeInternalJson(`/admin/open-owner/requests/${id}/approve`, {
    method: "POST"
  });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_APPROVE_REQUEST_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_APPROVE_REQUEST_API_NOT_OK", detail:j };
  return {
    ok:true,
    request:j.request || null,
    audit_event_id:j.audit_event_id || null,
    idempotent:Boolean(j.idempotent),
    result:j
  };
}

export async function provisionAdminOpenOwnerRequest(requestId){
  const id = encodeURIComponent(String(requestId || "").trim());
  const r = await safeInternalJson(`/admin/open-owner/requests/${id}/provision`, {
    method: "POST"
  });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_PROVISION_REQUEST_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_PROVISION_REQUEST_API_NOT_OK", detail:j };
  return {
    ok:true,
    request:j.request || null,
    provision_result:j.provision_result || null,
    bind_result:j.bind_result || null,
    links:j.links || null,
    audit_event_id:j.audit_event_id || null,
    idempotent:Boolean(j.idempotent),
    result:j
  };
}

export async function previewAdminOpenOwnerEmail(requestId){
  const id = encodeURIComponent(String(requestId || "").trim());
  const r = await safeInternalJson(`/admin/open-owner/requests/${id}/email-preview`, {
    method: "POST"
  });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_EMAIL_PREVIEW_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_EMAIL_PREVIEW_API_NOT_OK", detail:j };
  return {
    ok:true,
    request:j.request || null,
    preview:j.preview || null,
    audit_event_id:j.audit_event_id || null,
    result:j
  };
}

export async function sendAdminOpenOwnerEmail(requestId){
  const id = encodeURIComponent(String(requestId || "").trim());
  let response = null;
  let text = "";

  try{
    response = await fetch(API_BASE + "/admin/open-owner/requests/" + id + "/send-email", {
      method: "POST",
      headers: buildJsonHeaders({}, true)
    });
    text = await response.text();
  }catch(e){
    return { ok:false, error:"ADMIN_OPEN_OWNER_SEND_EMAIL_FETCH_FAILED", detail:e };
  }

  let j = null;
  try{
    j = text ? JSON.parse(text) : null;
  }catch(e){
    j = null;
  }

  if(!response.ok){
    return {
      ok:false,
      error:j?.error || ("HTTP_" + response.status),
      status:response.status || null,
      request:j?.request || null,
      message_id:j?.message_id || null,
      gmail_message_id:j?.gmail_message_id || null,
      audit_event_id:j?.audit_event_id || null,
      result:j || null,
      raw:text || "",
      detail:{ ok:false, status:response.status || null, json:j, text }
    };
  }

  if(!j || !j.ok) return { ok:false, error:j?.error || "ADMIN_OPEN_OWNER_SEND_EMAIL_API_NOT_OK", detail:j, result:j || null };
  return {
    ok:true,
    request:j.request || null,
    message_id:j.message_id || null,
    gmail_message_id:j.gmail_message_id || null,
    audit_event_id:j.audit_event_id || null,
    result:j
  };
}

export async function resendAdminOpenOwnerEmail(requestId){
  const id = encodeURIComponent(String(requestId || "").trim());
  let response = null;
  let text = "";

  try{
    response = await fetch(API_BASE + "/admin/open-owner/requests/" + id + "/resend-email", {
      method: "POST",
      headers: buildJsonHeaders({}, true)
    });
    text = await response.text();
  }catch(e){
    return { ok:false, error:"ADMIN_OPEN_OWNER_RESEND_EMAIL_FETCH_FAILED", detail:e };
  }

  let j = null;
  try{
    j = text ? JSON.parse(text) : null;
  }catch(e){
    j = null;
  }

  if(!response.ok){
    return {
      ok:false,
      error:j?.error || ("HTTP_" + response.status),
      status:response.status || null,
      request:j?.request || null,
      message_id:j?.message_id || null,
      gmail_message_id:j?.gmail_message_id || null,
      audit_event_id:j?.audit_event_id || null,
      result:j || null,
      raw:text || "",
      detail:{ ok:false, status:response.status || null, json:j, text }
    };
  }

  if(!j || !j.ok) return { ok:false, error:j?.error || "ADMIN_OPEN_OWNER_RESEND_EMAIL_API_NOT_OK", detail:j, result:j || null };
  return {
    ok:true,
    request:j.request || null,
    message_id:j.message_id || null,
    gmail_message_id:j.gmail_message_id || null,
    audit_event_id:j.audit_event_id || null,
    result:j
  };
}

export async function getAdminOpenOwnerAudit(requestId){
  const id = encodeURIComponent(String(requestId || "").trim());
  const r = await safeInternalJson(`/admin/open-owner/requests/${id}/audit`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_AUDIT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_OPEN_OWNER_AUDIT_API_NOT_OK", detail:j };
  return {
    ok:true,
    request_id:j.request_id || null,
    audit_events:j.audit_events || [],
    messages:j.messages || [],
    traces:j.traces || [],
    result:j
  };
}

/* ===============================
   SALON (OWNER) API
================================ */

export async function getSalon(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}`, { method: "GET" });
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
  const r = await safeInternalJson(`/salons/${salonSlug}/metrics`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"METRICS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"METRICS_API_NOT_OK", detail:j };
  return { ok:true, metrics: j.metrics || {} };
}

export async function getBookings(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/bookings`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"BOOKINGS_API_NOT_OK", detail:j };
  return { ok:true, bookings: j.bookings || [] };
}

export async function getMasters(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/masters`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTERS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(Array.isArray(j)) return { ok:true, masters: j };
  if(!j || j.ok === false) return { ok:false, error:"MASTERS_API_NOT_OK", detail:j };
  return { ok:true, masters: j.masters || j.items || j.data?.masters || [] };
}

export async function getClients(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/clients`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"CLIENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"CLIENTS_API_NOT_OK", detail:j };
  return { ok:true, clients: j.clients || [] };
}

export async function getSalonMetrics(salonSlug = getSalonSlug()){
  return getMetrics(salonSlug);
}

export async function getSalonMasters(salonSlug = getSalonSlug()){
  return getMasters(salonSlug);
}

export async function getSalonWalletBalance(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/wallet-balance`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_WALLET_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_WALLET_API_NOT_OK", detail:j };
  return { ok:true, wallet: j.wallet || j.data?.wallet || j.data || j };
}

export async function getSalonSettlements(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/settlements`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_SETTLEMENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_SETTLEMENTS_API_NOT_OK", detail:j };
  return {
    ok:true,
    settlements: j.settlements || j.periods || j.items || j.data?.settlements || []
  };
}

export async function getSalonPayouts(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/payouts`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_PAYOUTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_PAYOUTS_API_NOT_OK", detail:j };
  return {
    ok:true,
    payouts: j.payouts || j.items || j.data?.payouts || []
  };
}

export async function getSalonLedger(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/ledger`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_LEDGER_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_LEDGER_API_NOT_OK", detail:j };
  return {
    ok:true,
    ledger: j.ledger || j.entries || j.items || j.data?.ledger || []
  };
}

export async function getSalonContracts(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/contracts`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_CONTRACTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_CONTRACTS_API_NOT_OK", detail:j };
  return {
    ok:true,
    contracts: j.contracts || j.items || j.data?.contracts || []
  };
}

export async function createSalonContract(salonSlug = getSalonSlug(), payload = {}){
  const r = await safeInternalJson(`/salons/${salonSlug}/contracts`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if(!r.ok) return { ok:false, error:"SALON_CONTRACT_CREATE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_CONTRACT_CREATE_API_NOT_OK", detail:j };
  return { ok:true, contract: j.contract || j.data || j };
}

export async function acceptContract(contractId){
  const r = await safeInternalJson(`/contracts/${contractId}/accept`, { method: "POST" });
  if(!r.ok) return { ok:false, error:"CONTRACT_ACCEPT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"CONTRACT_ACCEPT_API_NOT_OK", detail:j };
  return { ok:true, contract: j.contract || j.data || j };
}

export async function archiveContract(contractId){
  const r = await safeInternalJson(`/contracts/${contractId}/archive`, { method: "POST" });
  if(!r.ok) return { ok:false, error:"CONTRACT_ARCHIVE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"CONTRACT_ARCHIVE_API_NOT_OK", detail:j };
  return { ok:true, contract: j.contract || j.data || j };
}

export async function getSalonServices(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/services`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_SERVICES_FETCH_FAILED", detail:r };
  const j = r.json;
  if(Array.isArray(j)) return { ok:true, services: j };
  if(!j || j.ok === false) return { ok:false, error:"SALON_SERVICES_API_NOT_OK", detail:j };
  return { ok:true, services: j.services || j.items || j.data?.services || [] };
}

export async function terminateSalonMaster(salonSlug = getSalonSlug(), masterId){
  const r = await safeInternalJson(`/salons/${salonSlug}/masters/${masterId}/terminate`, {
    method: "POST"
  });
  if(!r.ok) return { ok:false, error:"SALON_MASTER_TERMINATE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || j.ok === false) return { ok:false, error:"SALON_MASTER_TERMINATE_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function activateSalonMaster(salonSlug = getSalonSlug(), masterId){
  const r = await safeInternalJson(`/salons/${salonSlug}/masters/${masterId}/activate`, {
    method: "POST"
  });
  if(!r.ok) return { ok:false, error:"SALON_MASTER_ACTIVATE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || j.ok === false) return { ok:false, error:"SALON_MASTER_ACTIVATE_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function provisionMaster(payload = {}){
  const r = await safeInternalJson(`/provision/masters`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if(!r.ok) return { ok:false, error:"PROVISION_MASTER_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || j.ok === false) return { ok:false, error:"PROVISION_MASTER_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

/* ===============================
   MASTER API
================================ */

export async function getMaster(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}`, { method: "GET" });
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
  const r = await safeInternalJson(`/masters/${masterSlug}/metrics`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_METRICS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_METRICS_API_NOT_OK", detail:j };
  return { ok:true, metrics: j.metrics || {} };
}

export async function getMasterBookings(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/bookings`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_BOOKINGS_API_NOT_OK", detail:j };
  return { ok:true, bookings: j.bookings || [] };
}

export async function getMasterClients(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/clients`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_CLIENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_CLIENTS_API_NOT_OK", detail:j };
  return { ok:true, clients: j.clients || [] };
}

export async function getMasterServices(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/services`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_SERVICES_FETCH_FAILED", detail:r };
  const j = r.json;
  if(Array.isArray(j)) return { ok:true, services: j };
  if(!j || j.ok === false) return { ok:false, error:"MASTER_SERVICES_API_NOT_OK", detail:j };
  return { ok:true, services: j.services || j.items || j.data?.services || [] };
}

export async function updateMasterService(masterSlug = getMasterSlug(), serviceId, payload = {}){
  const r = await safeInternalJson(`/masters/${masterSlug}/services/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if(!r.ok) return { ok:false, error:"MASTER_SERVICE_UPDATE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_SERVICE_UPDATE_API_NOT_OK", detail:j };
  return { ok:true, service: j.service || j.item || j.data || j };
}

export async function attachSalonService(salonSlug = getSalonSlug(), payload = {}){
  const r = await safeInternalJson(`/salons/${salonSlug}/services`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if(!r.ok) return { ok:false, error:"SALON_SERVICE_ATTACH_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_SERVICE_ATTACH_API_NOT_OK", detail:j };
  return { ok:true, service: j.service || j.item || j.data || j };
}

export async function getMasterWalletBalance(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/wallet-balance`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_WALLET_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_WALLET_API_NOT_OK", detail:j };
  return { ok:true, wallet: j.wallet || j.data?.wallet || j.data || j };
}

export async function getMasterSettlements(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/settlements`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_SETTLEMENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_SETTLEMENTS_API_NOT_OK", detail:j };
  return {
    ok:true,
    settlements: j.settlements || j.periods || j.items || j.data?.settlements || []
  };
}

export async function getMasterPayouts(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/payouts`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_PAYOUTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_PAYOUTS_API_NOT_OK", detail:j };
  return {
    ok:true,
    payouts: j.payouts || j.items || j.data?.payouts || []
  };
}

export async function getMasterLedger(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/ledger`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_LEDGER_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_LEDGER_API_NOT_OK", detail:j };
  return {
    ok:true,
    ledger: j.ledger || j.entries || j.items || j.data?.ledger || []
  };
}

export async function getMasterActiveContract(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/contracts/master/${masterSlug}/active`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_ACTIVE_CONTRACT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_ACTIVE_CONTRACT_API_NOT_OK", detail:j };
  return {
    ok:true,
    contract: j.contract || j.active_contract || j.data || null
  };
}

export async function getMasterContractHistory(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/contracts/master/${masterSlug}/history`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_CONTRACT_HISTORY_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_CONTRACT_HISTORY_API_NOT_OK", detail:j };
  return {
    ok:true,
    history: j.history || j.contracts || j.items || []
  };
}

/* ===============================
   BOOKING ACTIONS
================================ */

export async function bookingAction(id, action){
  const normalizedAction = String(action || "").trim().toLowerCase();

  if(normalizedAction === "complete" || normalizedAction === "cancel"){
    const salonSlug = getSalonSlug();

    if(!salonSlug){
      return { ok:false, error:"SALON_SLUG_MISSING" };
    }

    const publicApiBase = window.TOTEM_API_BASE || "https://api.totemv.com";
    const r = await safeJson(
      `${publicApiBase}/public/salons/${encodeURIComponent(salonSlug)}/bookings/${id}/lifecycle`,
      {
        method: "POST",
        headers: buildJsonHeaders(),
        body: JSON.stringify({ action: normalizedAction })
      }
    );

    if(!r.ok) return { ok:false, error:"BOOKING_ACTION_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"BOOKING_ACTION_API_NOT_OK", detail:j };
    return { ok:true, result: j };
  }

  const r = await safeInternalJson(`/bookings/${id}/${action}`, { method:"PATCH" });
  if(!r.ok) return { ok:false, error:"BOOKING_ACTION_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"BOOKING_ACTION_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

/* ===============================
   CREATE BOOKING
================================ */

export async function createBooking(payload){
  const r = await safeInternalJson(
    `/bookings/create`,
    {
      method:"POST",
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
  const r = await safeInternalJson(
    `/bookings/${id}/move`,
    {
      method:"PATCH",
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

export async function getSalonMoneyCoreSummary(salonSlug = getSalonSlug()){
  try{
    const r = await safeInternalJson(`/salons/${salonSlug}/money-core/summary`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"SALON_MONEY_CORE_SUMMARY_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_MONEY_CORE_SUMMARY_API_NOT_OK", detail:j };
    return { ok:true, summary:j.summary || j.data || j };
  }catch(e){
    return { ok:false, error:"SALON_MONEY_CORE_SUMMARY_FETCH_FAILED", detail:e };
  }
}

export async function getMasterMoneyCoreSummary(masterSlug = getMasterSlug()){
  try{
    const r = await safeInternalJson(`/masters/${masterSlug}/money-core/summary`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MASTER_MONEY_CORE_SUMMARY_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_MONEY_CORE_SUMMARY_API_NOT_OK", detail:j };
    return { ok:true, summary:j.summary || j.data || j };
  }catch(e){
    return { ok:false, error:"MASTER_MONEY_CORE_SUMMARY_FETCH_FAILED", detail:e };
  }
}

function normalizeOwnerBookingType(ownerType){
  const value = String(ownerType || "").trim().toLowerCase();
  if(value === "salon" || value === "master") return value;
  return "";
}

async function safeInternalBlob(path, opts = {}){
  const method = String(opts.method || "GET").toUpperCase();
  const headers = buildJsonHeaders(opts.headers || {}, false);
  const response = await fetch(`${API_BASE}${path}`, {
    ...opts,
    method,
    headers
  });

  if(!response.ok){
    let detail = null;

    try{
      const text = await response.text();
      detail = text ? JSON.parse(text) : null;
    }catch(e){
      detail = null;
    }

    return {
      ok: false,
      error: `HTTP_${response.status}`,
      detail: {
        status: response.status,
        body: detail
      }
    };
  }

  const blob = await response.blob();
  return { ok:true, blob, response };
}

export async function getOwnerBookingQrPayload(ownerType, slug){
  try{
    const safeOwnerType = normalizeOwnerBookingType(ownerType);
    const safeSlug = String(slug || "").trim();

    if(!safeOwnerType){
      return { ok:false, error:"OWNER_TYPE_INVALID" };
    }

    if(!safeSlug){
      return { ok:false, error:"OWNER_SLUG_REQUIRED" };
    }

    const r = await safeInternalJson(`/entry/${encodeURIComponent(safeOwnerType)}/${encodeURIComponent(safeSlug)}/qr-payload?target=booking`, {
      method: "GET"
    });

    if(!r.ok) return { ok:false, error:"OWNER_BOOKING_QR_PAYLOAD_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"OWNER_BOOKING_QR_PAYLOAD_API_NOT_OK", detail:j };
    return { ok:true, payload: j };
  }catch(e){
    return { ok:false, error:"OWNER_BOOKING_QR_PAYLOAD_FETCH_FAILED", detail:e };
  }
}

export async function getOwnerBookingQrPngBlob(ownerType, slug){
  try{
    const safeOwnerType = normalizeOwnerBookingType(ownerType);
    const safeSlug = String(slug || "").trim();

    if(!safeOwnerType){
      return { ok:false, error:"OWNER_TYPE_INVALID" };
    }

    if(!safeSlug){
      return { ok:false, error:"OWNER_SLUG_REQUIRED" };
    }

    const r = await safeInternalBlob(`/entry/${encodeURIComponent(safeOwnerType)}/${encodeURIComponent(safeSlug)}/qr.png?target=booking`, {
      method: "GET",
      headers: {
        Accept: "image/png"
      }
    });

    if(!r.ok) return { ok:false, error:"OWNER_BOOKING_QR_PNG_FETCH_FAILED", detail:r };
    return { ok:true, blob: r.blob };
  }catch(e){
    return { ok:false, error:"OWNER_BOOKING_QR_PNG_FETCH_FAILED", detail:e };
  }
}

export async function getInternalMobileConfig(){
  return safeInternalJson(`/mobile/config`, { method: "GET" });
}

export async function getInternalMobileLocations(){
  return safeInternalJson(`/mobile/locations`, { method: "GET" });
}

export async function getMoneyCoreDestinationProviders(filters = {}){
  try{
    const qs = new URLSearchParams();
    if(filters.method) qs.set("method", String(filters.method));
    if(typeof filters.enabled !== "undefined" && filters.enabled !== null && filters.enabled !== ""){
      qs.set("enabled", String(filters.enabled));
    }
    if(filters.country) qs.set("country", String(filters.country));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const r = await safeInternalJson(`/money-core/destination-providers${suffix}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_DESTINATION_PROVIDERS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_DESTINATION_PROVIDERS_API_NOT_OK", detail:j };
    return { ok:true, providers:j.providers || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_DESTINATION_PROVIDERS_FETCH_FAILED", detail:e };
  }
}

export async function getMoneyCoreOwnerWithdrawDestinations(ownerType, ownerId, filters = {}){
  try{
    const qs = new URLSearchParams();
    if(filters.method) qs.set("method", String(filters.method));
    if(filters.status) qs.set("status", String(filters.status));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const r = await safeInternalJson(`/money-core/owners/${encodeURIComponent(ownerType)}/${encodeURIComponent(ownerId)}/withdraw-destinations${suffix}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_DESTINATIONS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_DESTINATIONS_API_NOT_OK", detail:j };
    return { ok:true, destinations:j.destinations || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_DESTINATIONS_FETCH_FAILED", detail:e };
  }
}

export async function createMoneyCoreOwnerWithdrawDestination(ownerType, ownerId, payload = {}){
  try{
    const r = await safeInternalJson(`/money-core/owners/${encodeURIComponent(ownerType)}/${encodeURIComponent(ownerId)}/withdraw-destinations`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_DESTINATION_CREATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_DESTINATION_CREATE_API_NOT_OK", detail:j };
    return { ok:true, destination:j.destination || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_DESTINATION_CREATE_FETCH_FAILED", detail:e };
  }
}

export async function updateMoneyCoreWithdrawDestination(destinationId, payload = {}){
  try{
    const r = await safeInternalJson(`/money-core/withdraw-destinations/${encodeURIComponent(destinationId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_WITHDRAW_DESTINATION_UPDATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_WITHDRAW_DESTINATION_UPDATE_API_NOT_OK", detail:j };
    return { ok:true, destination:j.destination || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_WITHDRAW_DESTINATION_UPDATE_FETCH_FAILED", detail:e };
  }
}

export async function archiveMoneyCoreWithdrawDestination(destinationId){
  try{
    const r = await safeInternalJson(`/money-core/withdraw-destinations/${encodeURIComponent(destinationId)}/archive`, { method: "POST" });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_WITHDRAW_DESTINATION_ARCHIVE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_WITHDRAW_DESTINATION_ARCHIVE_API_NOT_OK", detail:j };
    return { ok:true, destination:j.destination || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_WITHDRAW_DESTINATION_ARCHIVE_FETCH_FAILED", detail:e };
  }
}

export async function getMoneyCoreOwnerWithdrawSettings(ownerType, ownerId){
  try{
    const r = await safeInternalJson(`/money-core/owners/${encodeURIComponent(ownerType)}/${encodeURIComponent(ownerId)}/withdraw-settings`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_SETTINGS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_SETTINGS_API_NOT_OK", detail:j };
    return { ok:true, settings:j.settings || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_SETTINGS_FETCH_FAILED", detail:e };
  }
}

export async function updateMoneyCoreOwnerWithdrawSettings(ownerType, ownerId, payload = {}){
  try{
    const r = await safeInternalJson(`/money-core/owners/${encodeURIComponent(ownerType)}/${encodeURIComponent(ownerId)}/withdraw-settings`, {
      method: "PATCH",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_SETTINGS_UPDATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_SETTINGS_UPDATE_API_NOT_OK", detail:j };
    return { ok:true, settings:j.settings || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_SETTINGS_UPDATE_FETCH_FAILED", detail:e };
  }
}

export async function getMoneyCoreOwnerWithdrawRequests(ownerType, ownerId, filters = {}){
  try{
    const qs = new URLSearchParams();
    if(filters.status) qs.set("status", String(filters.status));
    if(typeof filters.destination_id !== "undefined" && filters.destination_id !== null && filters.destination_id !== "") qs.set("destination_id", String(filters.destination_id));
    if(typeof filters.limit !== "undefined" && filters.limit !== null && filters.limit !== "") qs.set("limit", String(filters.limit));
    if(typeof filters.offset !== "undefined" && filters.offset !== null && filters.offset !== "") qs.set("offset", String(filters.offset));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const r = await safeInternalJson(`/money-core/owners/${encodeURIComponent(ownerType)}/${encodeURIComponent(ownerId)}/withdraw-requests${suffix}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_REQUESTS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_REQUESTS_API_NOT_OK", detail:j };
    return { ok:true, requests:j.requests || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_REQUESTS_FETCH_FAILED", detail:e };
  }
}

export async function createMoneyCoreOwnerWithdrawRequest(ownerType, ownerId, payload = {}){
  try{
    const r = await safeInternalJson(`/money-core/owners/${encodeURIComponent(ownerType)}/${encodeURIComponent(ownerId)}/withdraw-requests`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_REQUEST_CREATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_REQUEST_CREATE_API_NOT_OK", detail:j };
    return { ok:true, request:j.request || j.data || j, ledger:j.ledger || null };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_OWNER_WITHDRAW_REQUEST_CREATE_FETCH_FAILED", detail:e };
  }
}

export async function getSalonWithdrawDestinations(salonSlug, filters = {}){
  try{
    const qs = new URLSearchParams();
    if(filters.method) qs.set("method", String(filters.method));
    if(filters.status) qs.set("status", String(filters.status));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const r = await safeInternalJson(`/salons/${encodeURIComponent(String(salonSlug || "").trim())}/money-core/withdraw-destinations${suffix}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"SALON_WITHDRAW_DESTINATIONS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_WITHDRAW_DESTINATIONS_API_NOT_OK", detail:j };
    return { ok:true, destinations:j.destinations || j.data || j };
  }catch(e){
    return { ok:false, error:"SALON_WITHDRAW_DESTINATIONS_FETCH_FAILED", detail:e };
  }
}

export async function createSalonWithdrawDestination(salonSlug, payload = {}){
  try{
    const r = await safeInternalJson(`/salons/${encodeURIComponent(String(salonSlug || "").trim())}/money-core/withdraw-destinations`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"SALON_WITHDRAW_DESTINATION_CREATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_WITHDRAW_DESTINATION_CREATE_API_NOT_OK", detail:j };
    return { ok:true, destination:j.destination || j.data || j };
  }catch(e){
    return { ok:false, error:"SALON_WITHDRAW_DESTINATION_CREATE_FETCH_FAILED", detail:e };
  }
}

export async function getSalonWithdrawSettings(salonSlug){
  try{
    const r = await safeInternalJson(`/salons/${encodeURIComponent(String(salonSlug || "").trim())}/money-core/withdraw-settings`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"SALON_WITHDRAW_SETTINGS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_WITHDRAW_SETTINGS_API_NOT_OK", detail:j };
    return { ok:true, settings:j.settings || j.data || j };
  }catch(e){
    return { ok:false, error:"SALON_WITHDRAW_SETTINGS_FETCH_FAILED", detail:e };
  }
}

export async function updateSalonWithdrawSettings(salonSlug, payload = {}){
  try{
    const r = await safeInternalJson(`/salons/${encodeURIComponent(String(salonSlug || "").trim())}/money-core/withdraw-settings`, {
      method: "PATCH",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"SALON_WITHDRAW_SETTINGS_UPDATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_WITHDRAW_SETTINGS_UPDATE_API_NOT_OK", detail:j };
    return { ok:true, settings:j.settings || j.data || j };
  }catch(e){
    return { ok:false, error:"SALON_WITHDRAW_SETTINGS_UPDATE_FETCH_FAILED", detail:e };
  }
}

export async function getSalonWithdrawRequests(salonSlug, filters = {}){
  try{
    const qs = new URLSearchParams();
    if(filters.status) qs.set("status", String(filters.status));
    if(typeof filters.destination_id !== "undefined" && filters.destination_id !== null && filters.destination_id !== "") qs.set("destination_id", String(filters.destination_id));
    if(typeof filters.limit !== "undefined" && filters.limit !== null && filters.limit !== "") qs.set("limit", String(filters.limit));
    if(typeof filters.offset !== "undefined" && filters.offset !== null && filters.offset !== "") qs.set("offset", String(filters.offset));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const r = await safeInternalJson(`/salons/${encodeURIComponent(String(salonSlug || "").trim())}/money-core/withdraw-requests${suffix}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"SALON_WITHDRAW_REQUESTS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_WITHDRAW_REQUESTS_API_NOT_OK", detail:j };
    return { ok:true, requests:j.requests || j.data || j };
  }catch(e){
    return { ok:false, error:"SALON_WITHDRAW_REQUESTS_FETCH_FAILED", detail:e };
  }
}

export async function createSalonWithdrawRequest(salonSlug, payload = {}){
  try{
    const r = await safeInternalJson(`/salons/${encodeURIComponent(String(salonSlug || "").trim())}/money-core/withdraw-requests`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"SALON_WITHDRAW_REQUEST_CREATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_WITHDRAW_REQUEST_CREATE_API_NOT_OK", detail:j };
    return { ok:true, request:j.request || j.data || j, ledger:j.ledger || null };
  }catch(e){
    return { ok:false, error:"SALON_WITHDRAW_REQUEST_CREATE_FETCH_FAILED", detail:e };
  }
}

export async function getMasterWithdrawDestinations(masterSlug, filters = {}){
  try{
    const qs = new URLSearchParams();
    if(filters.method) qs.set("method", String(filters.method));
    if(filters.status) qs.set("status", String(filters.status));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const r = await safeInternalJson(`/masters/${encodeURIComponent(String(masterSlug || "").trim())}/money-core/withdraw-destinations${suffix}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MASTER_WITHDRAW_DESTINATIONS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_WITHDRAW_DESTINATIONS_API_NOT_OK", detail:j };
    return { ok:true, destinations:j.destinations || j.data || j };
  }catch(e){
    return { ok:false, error:"MASTER_WITHDRAW_DESTINATIONS_FETCH_FAILED", detail:e };
  }
}

export async function createMasterWithdrawDestination(masterSlug, payload = {}){
  try{
    const r = await safeInternalJson(`/masters/${encodeURIComponent(String(masterSlug || "").trim())}/money-core/withdraw-destinations`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"MASTER_WITHDRAW_DESTINATION_CREATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_WITHDRAW_DESTINATION_CREATE_API_NOT_OK", detail:j };
    return { ok:true, destination:j.destination || j.data || j };
  }catch(e){
    return { ok:false, error:"MASTER_WITHDRAW_DESTINATION_CREATE_FETCH_FAILED", detail:e };
  }
}

export async function getMasterWithdrawSettings(masterSlug){
  try{
    const r = await safeInternalJson(`/masters/${encodeURIComponent(String(masterSlug || "").trim())}/money-core/withdraw-settings`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MASTER_WITHDRAW_SETTINGS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_WITHDRAW_SETTINGS_API_NOT_OK", detail:j };
    return { ok:true, settings:j.settings || j.data || j };
  }catch(e){
    return { ok:false, error:"MASTER_WITHDRAW_SETTINGS_FETCH_FAILED", detail:e };
  }
}

export async function updateMasterWithdrawSettings(masterSlug, payload = {}){
  try{
    const r = await safeInternalJson(`/masters/${encodeURIComponent(String(masterSlug || "").trim())}/money-core/withdraw-settings`, {
      method: "PATCH",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"MASTER_WITHDRAW_SETTINGS_UPDATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_WITHDRAW_SETTINGS_UPDATE_API_NOT_OK", detail:j };
    return { ok:true, settings:j.settings || j.data || j };
  }catch(e){
    return { ok:false, error:"MASTER_WITHDRAW_SETTINGS_UPDATE_FETCH_FAILED", detail:e };
  }
}

export async function getMasterWithdrawRequests(masterSlug, filters = {}){
  try{
    const qs = new URLSearchParams();
    if(filters.status) qs.set("status", String(filters.status));
    if(typeof filters.destination_id !== "undefined" && filters.destination_id !== null && filters.destination_id !== "") qs.set("destination_id", String(filters.destination_id));
    if(typeof filters.limit !== "undefined" && filters.limit !== null && filters.limit !== "") qs.set("limit", String(filters.limit));
    if(typeof filters.offset !== "undefined" && filters.offset !== null && filters.offset !== "") qs.set("offset", String(filters.offset));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const r = await safeInternalJson(`/masters/${encodeURIComponent(String(masterSlug || "").trim())}/money-core/withdraw-requests${suffix}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MASTER_WITHDRAW_REQUESTS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_WITHDRAW_REQUESTS_API_NOT_OK", detail:j };
    return { ok:true, requests:j.requests || j.data || j };
  }catch(e){
    return { ok:false, error:"MASTER_WITHDRAW_REQUESTS_FETCH_FAILED", detail:e };
  }
}

export async function createMasterWithdrawRequest(masterSlug, payload = {}){
  try{
    const r = await safeInternalJson(`/masters/${encodeURIComponent(String(masterSlug || "").trim())}/money-core/withdraw-requests`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"MASTER_WITHDRAW_REQUEST_CREATE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_WITHDRAW_REQUEST_CREATE_API_NOT_OK", detail:j };
    return { ok:true, request:j.request || j.data || j, ledger:j.ledger || null };
  }catch(e){
    return { ok:false, error:"MASTER_WITHDRAW_REQUEST_CREATE_FETCH_FAILED", detail:e };
  }
}

export async function createSalonWithdraw(amount, billingAccess, salonSlug = getSalonSlug()){
    if (!canWithdrawByBilling(billingAccess)) {
      return { ok:false, error:"WITHDRAW_BLOCKED_BY_BILLING" };
    }

  const r = await safeInternalJson(
    `/salons/${salonSlug}/withdraw`,
    {
      method:"POST",
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

  const r = await safeInternalJson(
    `/masters/${masterSlug}/withdraw`,
    {
      method:"POST",
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
   TEMPLATE SYSTEM SHARED
================================ */

function getInternalTemplateToken(){
  const authToken = getAuthAccessToken();
  if(authToken){
    return authToken;
  }

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

function buildTemplatePublicPath(ownerType, ownerSlug){
  return `${API_BASE}/templates-public/${ownerType}/${ownerSlug}/published?version=${TEMPLATE_VERSION}`;
}

function buildTemplateDraftBody(draft){
  return JSON.stringify({
    template_version: TEMPLATE_VERSION,
    draft
  });
}

function buildTemplatePublishBody(publishedBy){
  return JSON.stringify({
    template_version: TEMPLATE_VERSION,
    published_by: publishedBy
  });
}

/* ===============================
   TEMPLATE SYSTEM (SALON)
================================ */

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
    body: buildTemplateDraftBody(draft)
  });
  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_DRAFT_SAVE_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_DRAFT_SAVE_API_NOT_OK", detail:j };
  return { ok:true, document: j.document || null };
}

export async function getSalonTemplatePublished(salonSlug = getSalonSlug()){
  const r = await safeJson(buildTemplatePublicPath("salon", salonSlug));
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
  const r = await safeTemplateJson(`/templates/salon/${salonSlug}/preview?version=${TEMPLATE_VERSION}`);
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
    body: buildTemplatePublishBody(publishedBy)
  });
  if(!r.ok) return { ok:false, error:"SALON_TEMPLATE_PUBLISH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_TEMPLATE_PUBLISH_API_NOT_OK", detail:j };
  return { ok:true, published: Boolean(j.published), document: j.document || null };
}

/* ===============================
   TEMPLATE SYSTEM (MASTER)
================================ */

export async function getMasterTemplateDocument(masterSlug = getMasterSlug()){
  const r = await safeTemplateJson(`/templates/master/${masterSlug}`);
  if(!r.ok) return { ok:false, error:"MASTER_TEMPLATE_DOCUMENT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_TEMPLATE_DOCUMENT_API_NOT_OK", detail:j };
  return { ok:true, document: j.document || null };
}

export async function saveMasterTemplateDraft(draft, masterSlug = getMasterSlug()){
  const r = await safeTemplateJson(`/templates/master/${masterSlug}/draft`, {
    method: "PUT",
    body: buildTemplateDraftBody(draft)
  });
  if(!r.ok) return { ok:false, error:"MASTER_TEMPLATE_DRAFT_SAVE_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_TEMPLATE_DRAFT_SAVE_API_NOT_OK", detail:j };
  return { ok:true, document: j.document || null };
}

export async function getMasterTemplatePublished(masterSlug = getMasterSlug()){
  const r = await safeJson(buildTemplatePublicPath("master", masterSlug));
  if(!r.ok) return { ok:false, error:"MASTER_TEMPLATE_PUBLISHED_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_TEMPLATE_PUBLISHED_API_NOT_OK", detail:j };
  return {
    ok:true,
    payload: j.payload || null,
    meta: j.meta || null,
    published_exists: Boolean(j.published_exists)
  };
}

export async function getMasterTemplatePreview(masterSlug = getMasterSlug()){
  const r = await safeTemplateJson(`/templates/master/${masterSlug}/preview?version=${TEMPLATE_VERSION}`);
  if(!r.ok) return { ok:false, error:"MASTER_TEMPLATE_PREVIEW_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_TEMPLATE_PREVIEW_API_NOT_OK", detail:j };
  return {
    ok:true,
    payload: j.payload || null,
    validation: j.validation || null,
    is_ready_for_preview: Boolean(j.is_ready_for_preview)
  };
}

export async function publishMasterTemplate(masterSlug = getMasterSlug(), publishedBy = "system:1"){
  const r = await safeTemplateJson(`/templates/master/${masterSlug}/publish`, {
    method: "POST",
    body: buildTemplatePublishBody(publishedBy)
  });
  if(!r.ok) return { ok:false, error:"MASTER_TEMPLATE_PUBLISH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_TEMPLATE_PUBLISH_API_NOT_OK", detail:j };
  return { ok:true, published: Boolean(j.published), document: j.document || null };
}
