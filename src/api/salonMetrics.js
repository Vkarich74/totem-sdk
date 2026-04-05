// src/api/salonMetrics.js
// Salon Metrics API v1

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://api.totemv.com";

export async function fetchSalonMetrics(slug) {
  if (!slug) {
    throw new Error("SALON_SLUG_REQUIRED");
  }

  const res = await fetch(
    `${API_BASE}/public/salons/${slug}/metrics`,
    {
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `SALON_METRICS_HTTP_ERROR_${res.status}`
    );
  }

  const data = await res.json();

  if (!data.ok) {
    throw new Error("SALON_METRICS_INVALID_RESPONSE");
  }

  return data.metrics;
}