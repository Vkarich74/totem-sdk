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
      for(const key of AUTH_TOKEN_STORAGE_KEYS){
        window.localStorage.removeItem(key);
      }
      window.TOTEM_AUTH_TOKEN = "";
      window.TOTEM_ACCESS_TOKEN = "";
      window.TOTEM_INTERNAL_TOKEN = "";
    }
  }catch(e){
    try{
      if(normalized){
        window.TOTEM_AUTH_TOKEN = normalized;
        window.TOTEM_ACCESS_TOKEN = normalized;
      }else{
        window.TOTEM_AUTH_TOKEN = "";
        window.TOTEM_ACCESS_TOKEN = "";
        window.TOTEM_INTERNAL_TOKEN = "";
      }
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

function buildAuthHeaders(extraHeaders = {}){
  const headers = {
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

async function safeInternalRequest(path, opts = {}){
  const method = String(opts.method || "GET").toUpperCase();
  const headers = buildAuthHeaders(opts.headers || {});
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    method,
    headers
  });

  const ct = (r.headers.get("content-type") || "").toLowerCase();
  const text = await r.text().catch(()=> "");
  let json = null;

  if(ct.includes("application/json") && text){
    try{
      json = JSON.parse(text);
    }catch(e){
      json = null;
    }
  }

  return {
    ok:r.ok,
    status:r.status,
    ct,
    text,
    json
  };
}

function buildQuery(params = {}){
  const searchParams = new URLSearchParams();

  for(const [key, value] of Object.entries(params || {})){
    if(value === null || typeof value === "undefined" || value === ""){
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
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
  const accessToken = String(j.access_token || j.token || "").trim();
  if(!accessToken){
    return { ok:false, error:"AUTH_LOGIN_NO_TOKEN", detail:j };
  }

  if(accessToken){
    setAuthAccessToken(accessToken);
  }else{
    clearAuthAccessToken();
  }

  return {
    ok:true,
    access_token:accessToken,
    token_type:j.token_type || "Bearer",
    auth:j.auth || null,
    auth_context:j.auth_context || null
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
  const accessToken = String(j.access_token || j.token || "").trim();
  if(!accessToken){
    return { ok:false, error:"AUTH_LOGIN_NO_TOKEN", detail:j };
  }

  if(accessToken){
    setAuthAccessToken(accessToken);
  }else{
    clearAuthAccessToken();
  }

  return {
    ok:true,
    access_token:accessToken,
    token_type:j.token_type || "Bearer",
    auth:j.auth || null,
    auth_context:j.auth_context || null
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

  const accessToken = String(j.access_token || j.token || "").trim();
  if(accessToken){
    setAuthAccessToken(accessToken);
  }else{
    clearAuthAccessToken();
  }

  return {
    ok:true,
    access_token:accessToken,
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

export async function getAdminNotifications(options = {}){
  const suffix = buildQuery({
    target_type: options.target_type,
    target_id: options.target_id,
    owner_type: options.owner_type,
    owner_id: options.owner_id,
    channel: options.channel,
    status: options.status,
    priority: options.priority,
    limit: options.limit,
    offset: options.offset
  });

  const r = await safeInternalJson(`/admin/notifications${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_NOTIFICATIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_NOTIFICATIONS_API_NOT_OK", detail:j };
  return j;
}

export async function getAdminNotificationDeliveries(options = {}){
  const suffix = buildQuery({
    notification_id: options.notification_id,
    channel: options.channel,
    status: options.status,
    provider: options.provider,
    limit: options.limit,
    offset: options.offset
  });

  const r = await safeInternalJson(`/admin/notifications/deliveries${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_NOTIFICATION_DELIVERIES_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_NOTIFICATION_DELIVERIES_API_NOT_OK", detail:j };
  return j;
}

export async function retryAdminNotificationDelivery(deliveryId){
  const id = Number.parseInt(String(deliveryId ?? ""), 10);
  const r = await safeInternalJson(`/admin/notifications/deliveries/${id}/retry`, { method: "POST" });
  if(!r.ok) return { ok:false, error:"ADMIN_NOTIFICATION_DELIVERY_RETRY_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_NOTIFICATION_DELIVERY_RETRY_API_NOT_OK", detail:j };
  return j;
}

export async function getAdminPushSubscriptions(options = {}){
  const suffix = buildQuery({
    user_type: options.user_type,
    user_id: options.user_id,
    platform: options.platform,
    enabled: options.enabled,
    limit: options.limit,
    offset: options.offset
  });

  const r = await safeInternalJson(`/admin/notifications/push-subscriptions${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_PUSH_SUBSCRIPTIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_PUSH_SUBSCRIPTIONS_API_NOT_OK", detail:j };
  return j;
}

export async function getAdminWithdrawRequestsSummary(){
  const r = await safeInternalJson(`/money-core/admin/withdraw-requests-summary`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_WITHDRAW_REQUESTS_SUMMARY_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_WITHDRAW_REQUESTS_SUMMARY_API_NOT_OK", detail:j };
  return {
    ok:true,
    summary:j.summary || {},
    by_status:Array.isArray(j.by_status) ? j.by_status : [],
    generated_at:j.generated_at || null,
    result:j
  };
}

export async function getAdminWithdrawRequests(options = {}){
  const suffix = buildQuery({
    limit: options.limit,
    offset: options.offset,
    status: options.status,
    owner_type: options.owner_type,
    owner_id: options.owner_id,
    provider_code: options.provider_code,
  });

  const r = await safeInternalJson(`/money-core/admin/withdraw-requests${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_WITHDRAW_REQUESTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_WITHDRAW_REQUESTS_API_NOT_OK", detail:j };
  return {
    ok:true,
    requests:Array.isArray(j.data) ? j.data : Array.isArray(j.requests) ? j.requests : [],
    meta:j.meta || {},
    result:j
  };
}

export async function getAdminWithdrawRequestById(id){
  const safeId = encodeURIComponent(String(id || "").trim());
  const r = await safeInternalJson(`/money-core/admin/withdraw-requests/${safeId}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"ADMIN_WITHDRAW_REQUEST_GET_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"ADMIN_WITHDRAW_REQUEST_GET_API_NOT_OK", detail:j };
  return {
    ok:true,
    request:j.data || j.request || null,
    meta:j.meta || {},
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

export async function getSalonCalendar(salonSlug = getSalonSlug(), date){
  const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
  const suffix = buildQuery({
    date: String(date || "").trim()
  });

  const r = await safeInternalJson(`/salons/${safeSlug}/calendar${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_CALENDAR_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_CALENDAR_API_NOT_OK", detail:j };

  return {
    ok:true,
    salon: j.salon || null,
    date: j.date || null,
    masters: j.masters || [],
    working_hours: j.working_hours || [],
    events: j.events || [],
    summary: j.summary || {}
  };
}

export async function getOwnerQrPaymentOptions(bookingId){
  const safeBookingId = Number(bookingId);
  const r = await safeInternalJson(`/payments/owner-qr/options?booking_id=${encodeURIComponent(String(Number.isInteger(safeBookingId) && safeBookingId > 0 ? safeBookingId : ""))}`, {
    method: "GET"
  });
  if(!r.ok) return { ok:false, error:"OWNER_QR_PAYMENT_OPTIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"OWNER_QR_PAYMENT_OPTIONS_API_NOT_OK", detail:j };
  return {
    ok:true,
    booking_id: j.booking_id ?? safeBookingId ?? null,
    destinations: j.destinations || []
  };
}

async function getOwnerQrDestinationsRequest(path){
  const r = await safeInternalJson(path, { method: "GET" });
  if(!r.ok) return { ok:false, error:"OWNER_QR_DESTINATIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"OWNER_QR_DESTINATIONS_API_NOT_OK", detail:j };
  return { ok:true, destination: j.destination || null, destinations: j.destinations || [] };
}

async function mutateOwnerQrDestinationRequest(path, payload = {}){
  const r = await safeInternalJson(path, {
    method: "PATCH",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"OWNER_QR_DESTINATION_MUTATION_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"OWNER_QR_DESTINATION_API_NOT_OK", detail:j };
  return { ok:true, destination: j.destination || null };
}

async function uploadOwnerQrDestinationImageRequest(path, file){
  const formData = new FormData();
  if(file){
    formData.append("image", file);
  }

  const r = await safeInternalRequest(path, {
    method: "POST",
    body: formData
  });
  if(!r.ok){
    return {
      ok:false,
      error:r.json?.error || "OWNER_QR_IMAGE_UPLOAD_FETCH_FAILED",
      detail:r
    };
  }
  const j = r.json;
  if(!j || !j.ok){
    return { ok:false, error:"OWNER_QR_IMAGE_UPLOAD_API_NOT_OK", detail:j || r };
  }
  return { ok:true, destination: j.destination || null };
}

async function deleteOwnerQrDestinationImageRequest(path){
  const r = await safeInternalRequest(path, {
    method: "DELETE"
  });
  if(!r.ok){
    return {
      ok:false,
      error:r.json?.error || "OWNER_QR_IMAGE_DELETE_FETCH_FAILED",
      detail:r
    };
  }
  const j = r.json;
  if(!j || !j.ok){
    return { ok:false, error:"OWNER_QR_IMAGE_DELETE_API_NOT_OK", detail:j || r };
  }
  return { ok:true, destination: j.destination || null };
}

export async function getSalonOwnerQrDestinations(salonSlug = getSalonSlug()){
  return getOwnerQrDestinationsRequest(`/salons/${salonSlug}/money-core/owner-qr-destinations`);
}

export async function getSalonActiveOwnerQrDestination(salonSlug = getSalonSlug()){
  return getOwnerQrDestinationsRequest(`/salons/${salonSlug}/money-core/owner-qr-destinations/active`);
}

export async function createSalonOwnerQrDestination(salonSlug = getSalonSlug(), payload = {}){
  const r = await safeInternalJson(`/salons/${salonSlug}/money-core/owner-qr-destinations`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"SALON_OWNER_QR_DESTINATION_CREATE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_OWNER_QR_DESTINATION_CREATE_API_NOT_OK", detail:j };
  return { ok:true, destination: j.destination || null };
}

export async function updateSalonOwnerQrDestination(salonSlug = getSalonSlug(), destinationId, payload = {}){
  return mutateOwnerQrDestinationRequest(`/salons/${salonSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}`, payload);
}

export async function deactivateSalonOwnerQrDestination(salonSlug = getSalonSlug(), destinationId){
  return mutateOwnerQrDestinationRequest(`/salons/${salonSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}/deactivate`, {});
}

export async function uploadSalonOwnerQrDestinationImage(salonSlug = getSalonSlug(), destinationId, file){
  return uploadOwnerQrDestinationImageRequest(`/salons/${salonSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}/image`, file);
}

export async function deleteSalonOwnerQrDestinationImage(salonSlug = getSalonSlug(), destinationId){
  return deleteOwnerQrDestinationImageRequest(`/salons/${salonSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}/image`);
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

export async function getSalonRentObligations(salonSlug = getSalonSlug(), params = {}){
  const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
  const suffix = buildQuery({
    status: params?.status,
    from: params?.from,
    to: params?.to
  });
  const r = await safeInternalJson(`/salons/${safeSlug}/rent-obligations${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_RENT_OBLIGATIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_RENT_OBLIGATIONS_API_NOT_OK", detail:j };
  return {
    ok:true,
    obligations: j.obligations || [],
    summary: j.summary || null
  };
}

export async function getSalonSalaryObligations(salonSlug = getSalonSlug(), params = {}){
  const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
  const suffix = buildQuery({
    status: params?.status,
    from: params?.from,
    to: params?.to
  });
  const r = await safeInternalJson(`/salons/${safeSlug}/salary-obligations${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_SALARY_OBLIGATIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_SALARY_OBLIGATIONS_API_NOT_OK", detail:j };
  return {
    ok:true,
    obligations: j.obligations || [],
    summary: j.summary || null
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

export async function getMasterPendingCashBookings(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/pending-cash-bookings`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_PENDING_CASH_BOOKINGS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_PENDING_CASH_BOOKINGS_API_NOT_OK", detail:j };
  return {
    ok:true,
    bookings: j.bookings || [],
    count: Number(j.count || 0),
    amount: j.amount || 0
  };
}

export async function getMasterOwnerQrDestinations(masterSlug = getMasterSlug()){
  return getOwnerQrDestinationsRequest(`/masters/${masterSlug}/money-core/owner-qr-destinations`);
}

export async function getMasterActiveOwnerQrDestination(masterSlug = getMasterSlug()){
  return getOwnerQrDestinationsRequest(`/masters/${masterSlug}/money-core/owner-qr-destinations/active`);
}

export async function createMasterOwnerQrDestination(masterSlug = getMasterSlug(), payload = {}){
  const r = await safeInternalJson(`/masters/${masterSlug}/money-core/owner-qr-destinations`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"MASTER_OWNER_QR_DESTINATION_CREATE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_OWNER_QR_DESTINATION_CREATE_API_NOT_OK", detail:j };
  return { ok:true, destination: j.destination || null };
}

export async function updateMasterOwnerQrDestination(masterSlug = getMasterSlug(), destinationId, payload = {}){
  return mutateOwnerQrDestinationRequest(`/masters/${masterSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}`, payload);
}

export async function deactivateMasterOwnerQrDestination(masterSlug = getMasterSlug(), destinationId){
  return mutateOwnerQrDestinationRequest(`/masters/${masterSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}/deactivate`, {});
}

export async function uploadMasterOwnerQrDestinationImage(masterSlug = getMasterSlug(), destinationId, file){
  return uploadOwnerQrDestinationImageRequest(`/masters/${masterSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}/image`, file);
}

export async function deleteMasterOwnerQrDestinationImage(masterSlug = getMasterSlug(), destinationId){
  return deleteOwnerQrDestinationImageRequest(`/masters/${masterSlug}/money-core/owner-qr-destinations/${encodeURIComponent(String(destinationId || "").trim())}/image`);
}

export async function createPendingOwnerQrPayment(payload = {}){
  const r = await safeInternalJson(`/payments/owner-qr/pending`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"OWNER_QR_PENDING_PAYMENT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"OWNER_QR_PENDING_PAYMENT_API_NOT_OK", detail:j };
  return { ok:true, payment: j.payment || null, qr_destination: j.qr_destination || null };
}

export async function confirmOwnerQrPayment(paymentId){
  const safePaymentId = Number(paymentId);
  const r = await safeInternalJson(`/payments/owner-qr/${encodeURIComponent(String(Number.isInteger(safePaymentId) && safePaymentId > 0 ? safePaymentId : ""))}/confirm`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if(!r.ok) return { ok:false, error:"OWNER_QR_CONFIRM_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"OWNER_QR_CONFIRM_API_NOT_OK", detail:j };
  return { ok:true, payment: j.payment || null, obligations: j.obligations || [] };
}

export async function rejectOwnerQrPayment(paymentId, rejectionReason){
  const safePaymentId = Number(paymentId);
  const r = await safeInternalJson(`/payments/owner-qr/${encodeURIComponent(String(Number.isInteger(safePaymentId) && safePaymentId > 0 ? safePaymentId : ""))}/reject`, {
    method: "POST",
    body: JSON.stringify({
      rejection_reason: String(rejectionReason || "").trim()
    })
  });
  if(!r.ok) return { ok:false, error:"OWNER_QR_REJECT_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"OWNER_QR_REJECT_API_NOT_OK", detail:j };
  return { ok:true, payment: j.payment || null, obligations: j.obligations || [] };
}

export async function getSalonOwnerQrPayments(salonSlug = getSalonSlug()){
  const r = await safeInternalJson(`/salons/${salonSlug}/owner-qr-payments`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"SALON_OWNER_QR_PAYMENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_OWNER_QR_PAYMENTS_API_NOT_OK", detail:j };
  return { ok:true, payments: j.payments || [] };
}

export async function getMasterOwnerQrPayments(masterSlug = getMasterSlug()){
  const r = await safeInternalJson(`/masters/${masterSlug}/owner-qr-payments`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_OWNER_QR_PAYMENTS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_OWNER_QR_PAYMENTS_API_NOT_OK", detail:j };
  return { ok:true, payments: j.payments || [] };
}

export async function getOwnerQrObligations(ownerType, ownerId){
  const safeOwnerType = encodeURIComponent(String(ownerType || "").trim());
  const safeOwnerId = encodeURIComponent(String(Number.isInteger(Number(ownerId)) && Number(ownerId) > 0 ? Number(ownerId) : ""));
  const r = await safeInternalJson(`/money-core/owners/${safeOwnerType}/${safeOwnerId}/owner-obligations`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"OWNER_QR_OBLIGATIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"OWNER_QR_OBLIGATIONS_API_NOT_OK", detail:j };
  return {
    ok:true,
    owner_type: j.owner_type || null,
    owner_id: j.owner_id || null,
    outgoing_open_total: j.outgoing_open_total || 0,
    incoming_open_total: j.incoming_open_total || 0,
    rows: j.rows || []
  };
}

export async function postMasterPushSubscription(masterSlug = getMasterSlug(), payload = {}){
  const safeSlug = encodeURIComponent(String(masterSlug || "").trim());
  const r = await safeInternalJson(`/masters/${safeSlug}/push-subscriptions`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"MASTER_PUSH_SUBSCRIPTION_SAVE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_PUSH_SUBSCRIPTION_SAVE_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function deleteMasterPushSubscription(masterSlug = getMasterSlug(), deviceId){
  const safeSlug = encodeURIComponent(String(masterSlug || "").trim());
  const safeDeviceId = encodeURIComponent(String(deviceId || "").trim());
  const r = await safeInternalJson(`/masters/${safeSlug}/push-subscriptions/${safeDeviceId}`, {
    method: "DELETE"
  });
  if(!r.ok) return { ok:false, error:"MASTER_PUSH_SUBSCRIPTION_REVOKE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_PUSH_SUBSCRIPTION_REVOKE_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function confirmSalonCashPayment(payload = {}){
  const r = await safeInternalJson(`/payments/direct/salon/confirm-cash`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"SALON_CASH_CONFIRM_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_CASH_CONFIRM_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function confirmSalonRentPayment(salonSlug = getSalonSlug(), payload = {}){
  const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
  const r = await safeInternalJson(`/salons/${safeSlug}/rent-payments/confirm`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"SALON_RENT_PAYMENT_CONFIRM_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_RENT_PAYMENT_CONFIRM_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function confirmSalonSalaryObligation(salonSlug = getSalonSlug(), payload = {}){
  const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
  const r = await safeInternalJson(`/salons/${safeSlug}/salary-obligations/confirm`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"SALON_SALARY_OBLIGATION_CONFIRM_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_SALARY_OBLIGATION_CONFIRM_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function confirmMasterCashPayment(payload = {}){
  const r = await safeInternalJson(`/payments/direct/master/confirm-cash`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"MASTER_CASH_CONFIRM_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_CASH_CONFIRM_API_NOT_OK", detail:j };
  return { ok:true, result: j };
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

export async function postSalonPushSubscription(salonSlug = getSalonSlug(), payload = {}){
  const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
  const r = await safeInternalJson(`/salons/${safeSlug}/push-subscriptions`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
  if(!r.ok) return { ok:false, error:"SALON_PUSH_SUBSCRIPTION_SAVE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_PUSH_SUBSCRIPTION_SAVE_API_NOT_OK", detail:j };
  return { ok:true, result: j };
}

export async function deleteSalonPushSubscription(salonSlug = getSalonSlug(), deviceId){
  const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
  const safeDeviceId = encodeURIComponent(String(deviceId || "").trim());
  const r = await safeInternalJson(`/salons/${safeSlug}/push-subscriptions/${safeDeviceId}`, {
    method: "DELETE"
  });
  if(!r.ok) return { ok:false, error:"SALON_PUSH_SUBSCRIPTION_REVOKE_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"SALON_PUSH_SUBSCRIPTION_REVOKE_API_NOT_OK", detail:j };
  return { ok:true, result: j };
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

export async function getMasterRentObligations(masterSlug = getMasterSlug(), params = {}){
  const safeSlug = encodeURIComponent(String(masterSlug || "").trim());
  const suffix = buildQuery({
    status: params?.status,
    from: params?.from,
    to: params?.to
  });
  const r = await safeInternalJson(`/masters/${safeSlug}/rent-obligations${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_RENT_OBLIGATIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_RENT_OBLIGATIONS_API_NOT_OK", detail:j };
  return {
    ok:true,
    obligations: j.obligations || [],
    summary: j.summary || null
  };
}

export async function getMasterSalaryObligations(masterSlug = getMasterSlug(), params = {}){
  const safeSlug = encodeURIComponent(String(masterSlug || "").trim());
  const suffix = buildQuery({
    status: params?.status,
    from: params?.from,
    to: params?.to
  });
  const r = await safeInternalJson(`/masters/${safeSlug}/salary-obligations${suffix}`, { method: "GET" });
  if(!r.ok) return { ok:false, error:"MASTER_SALARY_OBLIGATIONS_FETCH_FAILED", detail:r };
  const j = r.json;
  if(!j || !j.ok) return { ok:false, error:"MASTER_SALARY_OBLIGATIONS_API_NOT_OK", detail:j };
  return {
    ok:true,
    obligations: j.obligations || [],
    summary: j.summary || null
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

export async function getMoneyCoreFlags(){
  try{
    const r = await safeInternalJson(`/money-core/flags`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MONEY_CORE_FLAGS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MONEY_CORE_FLAGS_API_NOT_OK", detail:j };
    return { ok:true, flags: j.flags || j.data || j };
  }catch(e){
    return { ok:false, error:"MONEY_CORE_FLAGS_FETCH_FAILED", detail:e };
  }
}

function buildMoneyCoreSplitAllocationsQuery(params = {}){
  const query = new URLSearchParams();
  const allowed = [
    "provider_settlement_id",
    "payment_id",
    "booking_id",
    "owner_type",
    "owner_id",
    "status",
    "limit",
    "offset"
  ];

  allowed.forEach((key) => {
    const value = params?.[key];
    if(value !== undefined && value !== null && String(value).trim() !== ""){
      query.set(key, String(value).trim());
    }
  });

  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function getSalonSplitAllocations(salonSlug = getSalonSlug(), params = {}){
  try{
    const safeSlug = String(salonSlug || "").trim();
    if(!safeSlug){
      return { ok:false, error:"SALON_SLUG_REQUIRED" };
    }

    const ownerId = params?.owner_id ?? params?.ownerId;
    if(ownerId === undefined || ownerId === null || String(ownerId).trim() === ""){
      return { ok:false, error:"SALON_OWNER_ID_REQUIRED" };
    }

    const query = buildMoneyCoreSplitAllocationsQuery({
      ...params,
      owner_type: "salon",
      owner_id: ownerId
    });
    const r = await safeInternalJson(`/money-core/split-allocations${query}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"SALON_SPLIT_ALLOCATIONS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_SPLIT_ALLOCATIONS_API_NOT_OK", detail:j };
    return { ok:true, allocations: Array.isArray(j.allocations) ? j.allocations : [] };
  }catch(e){
    return { ok:false, error:"SALON_SPLIT_ALLOCATIONS_FETCH_FAILED", detail:e };
  }
}

export async function getMasterSplitAllocations(masterSlug = getMasterSlug(), params = {}){
  try{
    const safeSlug = String(masterSlug || "").trim();
    if(!safeSlug){
      return { ok:false, error:"MASTER_SLUG_REQUIRED" };
    }

    const ownerId = params?.owner_id ?? params?.ownerId;
    if(ownerId === undefined || ownerId === null || String(ownerId).trim() === ""){
      return { ok:false, error:"MASTER_OWNER_ID_REQUIRED" };
    }

    const query = buildMoneyCoreSplitAllocationsQuery({
      ...params,
      owner_type: "master",
      owner_id: ownerId
    });
    const r = await safeInternalJson(`/money-core/split-allocations${query}`, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MASTER_SPLIT_ALLOCATIONS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_SPLIT_ALLOCATIONS_API_NOT_OK", detail:j };
    return { ok:true, allocations: Array.isArray(j.allocations) ? j.allocations : [] };
  }catch(e){
    return { ok:false, error:"MASTER_SPLIT_ALLOCATIONS_FETCH_FAILED", detail:e };
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


function buildPaymentProjectionQuery(filters = {}){
  const params = new URLSearchParams();
  const allowed = ['master_id', 'status', 'from', 'to'];

  allowed.forEach((key) => {
    const value = filters && filters[key];
    if(value !== undefined && value !== null && String(value).trim() !== ''){
      params.set(key, String(value).trim());
    }
  });

  const qs = params.toString();
  return qs ? '?' + qs : '';
}

export async function getSalonPaymentProjections(salonSlug = getSalonSlug(), filters = {}){
  try{
    const query = buildPaymentProjectionQuery(filters);
    const r = await safeInternalJson('/salons/' + salonSlug + '/payments/projection' + query, { method: 'GET' });
    if(!r.ok) return { ok:false, error:'SALON_PAYMENT_PROJECTIONS_FETCH_FAILED', detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:'SALON_PAYMENT_PROJECTIONS_API_NOT_OK', detail:j };
    return j;
  }catch(e){
    return { ok:false, error:'SALON_PAYMENT_PROJECTIONS_ERROR', message:e?.message || String(e) };
  }
}

export async function getMasterPaymentProjections(masterSlug = getMasterSlug(), filters = {}){
  try{
    const query = buildPaymentProjectionQuery(filters);
    const r = await safeInternalJson('/masters/' + masterSlug + '/payments/projection' + query, { method: 'GET' });
    if(!r.ok) return { ok:false, error:'MASTER_PAYMENT_PROJECTIONS_FETCH_FAILED', detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:'MASTER_PAYMENT_PROJECTIONS_API_NOT_OK', detail:j };
    return j;
  }catch(e){
    return { ok:false, error:'MASTER_PAYMENT_PROJECTIONS_ERROR', message:e?.message || String(e) };
  }
}

function buildLostProfitQuery(params = {}, allowed = ["from", "to", "master_id", "master_slug", "limit"]){
  const query = new URLSearchParams();

  allowed.forEach((key) => {
    const value = params && params[key];
    if(value !== undefined && value !== null && String(value).trim() !== ""){
      query.set(key, String(value).trim());
    }
  });

  const qs = query.toString();
  return qs ? "?" + qs : "";
}

export async function getSalonLostProfit(salonSlug = getSalonSlug(), params = {}){
  try{
    const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
    const query = buildLostProfitQuery(params, ["from", "to", "master_id", "master_slug", "limit"]);
    const r = await safeInternalJson("/salons/" + safeSlug + "/lost-profit" + query, { method: "GET" });
    if(!r.ok) return { ok:false, error:"SALON_LOST_PROFIT_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_LOST_PROFIT_API_NOT_OK", detail:j };
    return { ok:true, result:j };
  }catch(e){
    return { ok:false, error:"SALON_LOST_PROFIT_FETCH_FAILED", message:e?.message || String(e) };
  }
}

export async function getMasterLostProfit(masterSlug = getMasterSlug(), params = {}){
  try{
    const safeSlug = encodeURIComponent(String(masterSlug || "").trim());
    const query = buildLostProfitQuery(params, ["from", "to", "limit"]);
    const r = await safeInternalJson("/masters/" + safeSlug + "/lost-profit" + query, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MASTER_LOST_PROFIT_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_LOST_PROFIT_API_NOT_OK", detail:j };
    return { ok:true, result:j };
  }catch(e){
    return { ok:false, error:"MASTER_LOST_PROFIT_FETCH_FAILED", message:e?.message || String(e) };
  }
}

export async function getSalonCollectionAnchors(salonSlug = getSalonSlug(), params = {}){
  try{
    const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
    const query = buildQuery({
      from: params?.from,
      to: params?.to,
      master_id: params?.master_id,
      master_slug: params?.master_slug,
      limit: params?.limit
    });
    const r = await safeInternalJson("/salons/" + safeSlug + "/collection-anchors" + query, { method: "GET" });
    if(!r.ok) return { ok:false, error:"SALON_COLLECTION_ANCHORS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_COLLECTION_ANCHORS_API_NOT_OK", detail:j };
    return {
      ok:true,
      scope: j.scope || null,
      filters: j.filters || null,
      summary: j.summary || null,
      rows: Array.isArray(j.rows) ? j.rows : [],
      by_master: Array.isArray(j.by_master) ? j.by_master : [],
      monthly: Array.isArray(j.monthly) ? j.monthly : [],
      close_actions_available: Boolean(j.close_actions_available)
    };
  }catch(e){
    return { ok:false, error:"SALON_COLLECTION_ANCHORS_FETCH_FAILED", message:e?.message || String(e) };
  }
}

export async function getMasterCollectionAnchors(masterSlug = getMasterSlug(), params = {}){
  try{
    const safeSlug = encodeURIComponent(String(masterSlug || "").trim());
    const query = buildQuery({
      from: params?.from,
      to: params?.to,
      limit: params?.limit
    });
    const r = await safeInternalJson("/masters/" + safeSlug + "/collection-anchors" + query, { method: "GET" });
    if(!r.ok) return { ok:false, error:"MASTER_COLLECTION_ANCHORS_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"MASTER_COLLECTION_ANCHORS_API_NOT_OK", detail:j };
    return {
      ok:true,
      scope: j.scope || null,
      filters: j.filters || null,
      summary: j.summary || null,
      rows: Array.isArray(j.rows) ? j.rows : [],
      monthly: Array.isArray(j.monthly) ? j.monthly : [],
      close_actions_available: Boolean(j.close_actions_available)
    };
  }catch(e){
    return { ok:false, error:"MASTER_COLLECTION_ANCHORS_FETCH_FAILED", message:e?.message || String(e) };
  }
}

export async function closeSalonCollectionAnchors(salonSlug = getSalonSlug(), payload = {}){
  try{
    const safeSlug = encodeURIComponent(String(salonSlug || "").trim());
    const r = await safeInternalJson("/salons/" + safeSlug + "/collection-anchors/close", {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if(!r.ok) return { ok:false, error:"SALON_COLLECTION_ANCHORS_CLOSE_FETCH_FAILED", detail:r };
    const j = r.json;
    if(!j || !j.ok) return { ok:false, error:"SALON_COLLECTION_ANCHORS_CLOSE_API_NOT_OK", detail:j };
    return {
      ok:true,
      anchor: j.anchor || j.row || j.data || null,
      summary: j.summary || null
    };
  }catch(e){
    return { ok:false, error:"SALON_COLLECTION_ANCHORS_CLOSE_FETCH_FAILED", message:e?.message || String(e) };
  }
}
