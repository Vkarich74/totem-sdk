// US-PAY-C11-SDK: read-only client route adapter, no checkout, no legacy price.
// Only US bookings are requested; every response is validated against its ID.
import { isUsPayC11Booking, normalizeUsPayC11Response } from "./usPayC11Model.js";

const CONCURRENCY = 4;

export async function fetchUsPayC11Details({
  apiBase, clientId, token, bookings, fetchImpl = globalThis.fetch, signal,
} = {}) {
  const base = String(apiBase || "").replace(/\/$/, "");
  const client = String(clientId ?? "").trim();
  const accessToken = String(token ?? "").trim();

  if (!/^\d+$/.test(client) || !Number.isSafeInteger(Number(client)) ||
      Number(client) <= 0 || !accessToken || !/^https?:\/\//.test(base) ||
      typeof fetchImpl !== "function" || !Array.isArray(bookings)) {
    throw new Error("US_PAY_C11_READ_ARGUMENTS_INVALID");
  }

  const usBookings = bookings.filter(booking =>
    isUsPayC11Booking(booking) && Number.isSafeInteger(Number(booking.id)) &&
    Number(booking.id) > 0
  );

  // A null result is an explicit unavailable state, not a default to old money.
  const details = Object.create(null);
  let next = 0;

  async function worker() {
    while (next < usBookings.length && !signal?.aborted) {
      const booking = usBookings[next++];
      const key = String(booking.id);
      const url = `${base}/public/clients/${encodeURIComponent(client)}` +
        `/${encodeURIComponent(accessToken)}/us-pay-c11/${encodeURIComponent(key)}`;
      try {
        const response = await fetchImpl(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "omit",
          signal,
        });
        if (!response.ok) {
          details[key] = null;
          continue;
        }
        const payload = await response.json().catch(() => null);
        details[key] = normalizeUsPayC11Response(payload, booking.id);
      } catch (error) {
        if (signal?.aborted) break;
        details[key] = null;
      }
    }
  }

  await Promise.all(Array.from(
    { length: Math.min(CONCURRENCY, usBookings.length) }, () => worker()
  ));
  return details;
}
