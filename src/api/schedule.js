// src/api/schedule.js
// Schedule Data Layer v1 (Busy Timeline)

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://api.totemv.com";

async function fetchByStatus(masterId, status) {
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
    throw new Error(`SCHEDULE_HTTP_ERROR_${res.status}`);
  }

  const data = await res.json();

  if (!data.ok) {
    throw new Error("SCHEDULE_INVALID_RESPONSE");
  }

  return data.bookings || [];
}

export async function loadSchedule(masterId) {
  if (!masterId) {
    throw new Error("MASTER_ID_REQUIRED");
  }

  const [confirmed, completed] = await Promise.all([
    fetchByStatus(masterId, "confirmed"),
    fetchByStatus(masterId, "completed"),
  ]);

  const merged = [...confirmed, ...completed]
    .map((b) => ({
      id: b.id,
      start: b.datetime_start,
      end: b.datetime_end,
      status: b.status,
      client_name: b.client_name,
      service_name: b.service_name,
      price: b.price,
    }))
    .sort(
      (a, b) =>
        new Date(a.start).getTime() -
        new Date(b.start).getTime()
    );

  return merged;
}