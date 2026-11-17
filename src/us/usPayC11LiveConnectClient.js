// US-PAY-C11 LIVE seller connection: authenticated owner only, US market.
// Existing sellers authorize through Stripe Connect OAuth; new sellers may
// separately choose Stripe Standard hosted onboarding. Never accept acct_*
// IDs from browser or store ephemeral OAuth/account-link URLs.
import { getAuthAccessToken } from "../api/internal.js";

const API_BASE = String(
  import.meta.env.VITE_API_BASE ||
  (typeof window !== "undefined" ? window.TOTEM_API_BASE : "") ||
  "https://api.totemv.com"
).replace(/\/$/, "");

const OAUTH_CALLBACK =
  "https://api.totemv.com/stripe/connect/us-pay-c11/live/oauth/callback";

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

  const response = await fetch(
    API_BASE + params(ownerType,ownerId) + suffix, {
      method,signal,cache:"no-store",credentials:"omit",
      headers:{
        Authorization:`Bearer ${token}`,Accept:"application/json",
        ...(data!==undefined?{"Content-Type":"application/json"}:{}),
      },
      ...(data!==undefined?{body:JSON.stringify(data)}:{}),
    }
  );
  const payload=await response.json().catch(()=>null);
  if(!response.ok || payload?.ok!==true) {
    const error=new Error(String(payload?.error||"US_CONNECT_UNAVAILABLE"));
    error.status=response.status;
    throw error;
  }
  if(payload.contract_version!=="US-PAY-C11-live-connect-v1" ||
     payload.stripe_mode!=="LIVE" || payload.market_code!=="US" ||
     payload.account_type!=="standard" || payload.payment_ready!==false ||
     payload.owner_type!==ownerType ||
     Number(payload.owner_id)!==Number(ownerId)) {
    throw new Error("US_CONNECT_RESPONSE_CONTRACT_MISMATCH");
  }
  return payload;
}

export function readLiveSellerConnect(ownerType,ownerId,signal) {
  return request(ownerType,ownerId,"","GET",undefined,signal);
}

export function startLiveSellerConnect(ownerType,ownerId,consent) {
  if(consent!==true)throw new Error("US_CONNECT_CONSENT_REQUIRED");
  return request(ownerType,ownerId,"/start","POST",{consent:true});
}

export function startExistingLiveSellerConnect(ownerType,ownerId,consent) {
  if(consent!==true)throw new Error("US_CONNECT_CONSENT_REQUIRED");
  return request(ownerType,ownerId,"/oauth/start","POST",{consent:true});
}

export function refreshLiveSellerConnect(ownerType,ownerId) {
  return request(ownerType,ownerId,"/refresh","POST");
}

export function requireTrustedStripeOnboardingUrl(url) {
  const parsed=new URL(String(url||""));
  if(parsed.protocol!=="https:" ||
     parsed.hostname!=="connect.stripe.com" ||
     !parsed.pathname.startsWith("/setup/")) {
    throw new Error("US_CONNECT_STRIPE_ONBOARDING_URL_UNTRUSTED");
  }
  return parsed.href;
}

export function requireTrustedStripeOAuthUrl(url) {
  const parsed=new URL(String(url||""));
  if(parsed.protocol!=="https:" ||
     parsed.hostname!=="connect.stripe.com" ||
     parsed.pathname!=="/oauth/authorize" ||
     !/^ca_[A-Za-z0-9]{8,}$/.test(parsed.searchParams.get("client_id")||"") ||
     parsed.searchParams.get("response_type")!=="code" ||
     parsed.searchParams.get("scope")!=="read_write" ||
     parsed.searchParams.get("redirect_uri")!==OAUTH_CALLBACK ||
     !/^[A-Za-z0-9_-]{43}$/.test(parsed.searchParams.get("state")||"")) {
    throw new Error("US_CONNECT_STRIPE_OAUTH_URL_UNTRUSTED");
  }
  return parsed.href;
}
