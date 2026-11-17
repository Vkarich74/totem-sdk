// US-PAY-C11 LIVE Connect: authenticated seller only. No payment execution.
// Every mutation requires an actual owner/master session and server consent.
// Never put onboarding links into localStorage, logs, analytics, emails or SMS.
import { getAuthAccessToken } from "../api/internal.js";

const API_BASE = String(
  import.meta.env.VITE_API_BASE ||
  (typeof window !== "undefined" ? window.TOTEM_API_BASE : "") ||
  "https://api.totemv.com"
).replace(/\/$/, "");

function params(ownerType, ownerId) {
  const raw = String(ownerId ?? "");
  const id = Number(raw);
  if (!["salon","master"].includes(ownerType) ||
      !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(id)) {
    throw new Error("US_CONNECT_SELLER_ID_INVALID");
  }
  return `/internal/us-pay-c11/live-connect/${ownerType}/${id}`;
}

async function request(ownerType, ownerId, suffix, method, data, signal) {
  const token = getAuthAccessToken();
  if (!token) throw new Error("US_CONNECT_LOGIN_REQUIRED");
  const path = params(ownerType, ownerId);

  const response = await fetch(API_BASE + path + suffix, {
    method, signal, cache:"no-store", credentials:"omit",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:"application/json",
      ...(data !== undefined ? {"Content-Type":"application/json"} : {}),
    },
    ...(data !== undefined ? {body:JSON.stringify(data)} : {}),
  });
  const payload = await response.json().catch(()=>null);
  if (!response.ok || payload?.ok !== true) {
    const error=new Error(String(payload?.error || "US_CONNECT_UNAVAILABLE"));
    error.status=response.status;
    throw error;
  }
  if (payload.contract_version!=="US-PAY-C11-live-connect-v1" ||
      payload.stripe_mode!=="LIVE" || payload.market_code!=="US" ||
      payload.account_type!=="standard" || payload.payment_ready!==false ||
      payload.owner_type!==ownerType || Number(payload.owner_id)!==Number(ownerId)) {
    throw new Error("US_CONNECT_RESPONSE_CONTRACT_MISMATCH");
  }
  return payload;
}

export function readLiveSellerConnect(ownerType, ownerId, signal) {
  return request(ownerType,ownerId,"","GET",undefined,signal);
}

export function startLiveSellerConnect(ownerType, ownerId, consent) {
  if(consent!==true) throw new Error("US_CONNECT_CONSENT_REQUIRED");
  return request(ownerType,ownerId,"/start","POST",{consent:true});
}

export function refreshLiveSellerConnect(ownerType, ownerId) {
  return request(ownerType,ownerId,"/refresh","POST");
}

export function requireTrustedStripeOnboardingUrl(url) {
  const parsed=new URL(String(url||""));
  if(parsed.protocol!=="https:" || parsed.hostname!=="connect.stripe.com") {
    throw new Error("US_CONNECT_STRIPE_REDIRECT_NOT_TRUSTED");
  }
  return parsed.href;
}
