import { getAuthAccessToken } from "../api/internal.js";
import { assertUsPriceIdentity } from "./usOwnerPriceModel.js";

function fail(code, status = 0) {
  return Object.assign(new Error(code), { code, status });
}

function apiBase() {
  return String(
    import.meta.env.VITE_API_BASE ||
    (typeof window !== "undefined" ? window.TOTEM_API_BASE : "") ||
    "https://api.totemv.com"
  ).replace(/\/$/, "");
}

async function requestUsOwnerPrice(ownerType, ownerSlug, serviceLinkId,
                                   { method = "GET", body, signal } = {}) {
  const target = assertUsPriceIdentity(ownerType, ownerSlug, serviceLinkId);
  const token = getAuthAccessToken();
  if (!token) throw fail("US_PRICE_OWNER_SESSION_REQUIRED", 401);

  const path = "/internal/us-service-prices/" +
    encodeURIComponent(target.ownerType) + "/" +
    encodeURIComponent(target.ownerSlug) + "/" +
    encodeURIComponent(String(target.serviceLinkId));

  const response = await fetch(apiBase() + path, {
    method,
    signal,
    credentials: "omit",
    cache: "no-store",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/json",
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("application/json")) {
    throw fail("US_PRICE_RESPONSE_NOT_JSON", response.status);
  }
  const data = await response.json();
  if (!response.ok || !data || data.ok !== true) {
    throw fail(String(data?.error || "US_PRICE_REQUEST_FAILED"), response.status);
  }
  return data;
}

export function getUsOwnerPrice(ownerType, ownerSlug, serviceLinkId, {signal} = {}) {
  return requestUsOwnerPrice(ownerType, ownerSlug, serviceLinkId, {
    method: "GET", signal,
  });
}

export function putUsOwnerPrice(ownerType, ownerSlug, serviceLinkId,
                                amountMinor, expectedVersion, {signal} = {}) {
  if (!Number.isSafeInteger(amountMinor) ||
      !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw fail("US_PRICE_AMOUNT_OR_VERSION_INVALID", 400);
  }
  return requestUsOwnerPrice(ownerType, ownerSlug, serviceLinkId, {
    method: "PUT",
    body: {amount_minor: amountMinor, expected_version: expectedVersion},
    signal,
  });
}
