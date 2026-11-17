// US-PAY-C11: salon-owner choice. Owner ID is never accepted from browser.
// Uses the established authenticated /internal API; no payments/checkout.
import { getAuthAccessToken } from "../api/internal.js";

const API_BASE = String(
  import.meta.env.VITE_API_BASE ||
  (typeof window !== "undefined" ? window.TOTEM_API_BASE : "") ||
  "https://api.totemv.com"
).replace(/\/$/, "");

function bookingId(value) {
  const raw = String(value ?? "");
  const num = Number(raw);
  return /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(num) ? num : null;
}

async function ownerRequest(id, method, body, signal) {
  const number = bookingId(id);
  const token = getAuthAccessToken();
  if (!number || !token) throw new Error("US_OWNER_LOGIN_REQUIRED");

  const response = await fetch(
    `${API_BASE}/internal/us-pay-c11/bookings/${number}/collector`, {
      method,
      cache: "no-store",
      credentials: "omit",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true) {
    const error = new Error(payload?.error || "US_OWNER_COLLECTOR_UNAVAILABLE");
    error.status = response.status;
    throw error;
  }
  if (payload?.contract_version !== "US-PAY-C11-payee-selection-v1" ||
      payload?.market_code !== "US" ||
      payload?.payment_ready !== false ||
      Number(payload.booking_id) !== number) {
    throw new Error("US_OWNER_COLLECTOR_CONTRACT_INVALID");
  }
  return payload;
}

export function getUsOwnerCollector(id, options = {}) {
  return ownerRequest(id, "GET", undefined, options.signal);
}

export function chooseUsOwnerCollector(id, ownerType, expectedRevision, options = {}) {
  if (!["salon", "master"].includes(ownerType) ||
      !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error("US_OWNER_COLLECTOR_SELECTION_INVALID");
  }
  // No owner_id, verification_status, merchant IDs, bank details or client values.
  return ownerRequest(id, "PUT", {
    collector_owner_type: ownerType,
    expected_revision: expectedRevision,
  }, options.signal);
}
