const API_BASE = "https://api.totemv.com";

/**
 * Release-1 safeguard:
 * - ограничиваем выдачу бронирований, чтобы UI не падал на больших объёмах
 * - работаем только через public API
 */
export async function getSalonBookings(salonSlug, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? opts.limit : 50;
  const safeLimit = Math.max(1, Math.min(200, limit)); // hard cap

  const url = new URL(`${API_BASE}/public/salons/${salonSlug}/bookings`);
  // Если backend не поддерживает limit, он просто проигнорирует — это ок.
  url.searchParams.set("limit", String(safeLimit));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  return res.json();
}

export default {
  getSalonBookings,
};