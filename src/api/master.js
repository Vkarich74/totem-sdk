// Backward-compatible master API facade.
// Every request delegates to the existing canonical src/api/internal.js transport.
// Preserve the original exports, URLs, methods, bodies and response shapes.
import { masterCabinetLegacyJson } from "./internal.js";

function normalize(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.bookings)) return res.bookings;
  if (Array.isArray(res.clients)) return res.clients;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

// METRICS — legacy callers expect a metrics object, not an SDK envelope.
export async function getMasterMetrics(slug) {
  const j = await masterCabinetLegacyJson("/masters/" + slug + "/metrics");
  return j.metrics || j;
}

export async function getMasterNotifications(slug, options = {}) {
  const qs = new URLSearchParams();
  if (typeof options.limit !== "undefined" && options.limit !== null && options.limit !== "") {
    qs.set("limit", String(options.limit));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return masterCabinetLegacyJson(
    "/masters/" + encodeURIComponent(String(slug || "").trim()) + "/notifications" + suffix
  );
}

export async function markMasterNotificationRead(slug, notificationUid) {
  return masterCabinetLegacyJson(
    "/masters/" + encodeURIComponent(String(slug || "").trim()) +
      "/notifications/" + encodeURIComponent(String(notificationUid || "").trim()) + "/read",
    { method: "POST", body: {} }
  );
}

// BOOKINGS / CLIENTS — preserve the legacy array return value.
export async function getMasterBookings(slug) {
  const j = await masterCabinetLegacyJson("/masters/" + slug + "/bookings");
  return normalize(j);
}

export async function getMasterClients(slug) {
  const j = await masterCabinetLegacyJson("/masters/" + slug + "/clients");
  return normalize(j);
}

// SERVICES — preserve the exact backend response, including metadata/errors.
export async function getMasterServices(slug) {
  return masterCabinetLegacyJson("/masters/" + slug + "/services");
}

export async function createMasterService(slug, payload) {
  return masterCabinetLegacyJson("/masters/" + slug + "/services",
    { method: "POST", body: payload });
}

export async function updateMasterService(slug, id, payload) {
  return masterCabinetLegacyJson("/masters/" + slug + "/services/" + id,
    { method: "PATCH", body: payload });
}

export async function deleteMasterService(slug, id) {
  return masterCabinetLegacyJson("/masters/" + slug + "/services/" + id,
    { method: "DELETE" });
}
