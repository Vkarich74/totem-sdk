// src/api/bookings.js
// Bookings Data Layer v1
// Strictly read-layer. No business logic here.

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://api.totemv.com";

/**
 * Fetch bookings by status
 * @param {number} masterId
 * @param {"confirmed" | "completed"} status
 */
export async function fetchBookings(masterId, status) {
  if (!masterId) {
    throw new Error("MASTER_ID_REQUIRED");
  }

  if (!["confirmed", "completed"].includes(status)) {
    throw new Error("INVALID_STATUS");
  }

  const res = await fetch(
    `${API_BASE}/public/masters/${masterId}/bookings?status=${status}`,
    {
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`BOOKINGS_HTTP_ERROR_${res.status}`);
  }

  const data = await res.json();

  if (!data.ok) {
    throw new Error("BOOKINGS_INVALID_RESPONSE");
  }

  return data.bookings || [];
}