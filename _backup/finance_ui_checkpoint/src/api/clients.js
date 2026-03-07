// src/api/clients.js
// Clients Data Layer v1 (Mini CRM)

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://api.totemv.com";

/**
 * Fetch clients for master
 * @param {number} masterId
 */
export async function fetchClients(masterId) {
  if (!masterId) {
    throw new Error("MASTER_ID_REQUIRED");
  }

  const res = await fetch(
    `${API_BASE}/public/masters/${masterId}/clients`,
    {
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`CLIENTS_HTTP_ERROR_${res.status}`);
  }

  const data = await res.json();

  if (!data.ok) {
    throw new Error("CLIENTS_INVALID_RESPONSE");
  }

  return data.clients || [];
}