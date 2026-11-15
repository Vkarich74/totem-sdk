// US CountryPack booking navigation on the shared TOTEM SDK.
// Pure function. No external navigation or independent US deployment.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BOOKING_PATH = /^\/(?:m\/)?booking\/?$/i;
export function buildUsSalonBookingUrl({ salonSlug, bookingUrl = "/booking" } = {}) {
  const slug = String(salonSlug || "").trim().toLowerCase();
  if (!SLUG.test(slug)) return "";
  const raw = String(bookingUrl || "").trim();
  if (!raw || /[\u0000-\u001f\u007f\\]/.test(raw) ||
      raw.startsWith("//") || /%(?:0a|0d|2f|5c)/i.test(raw)) return "";
  let url;
  try { url = new URL(raw, "https://internal-booking.local/"); }
  catch { return ""; }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
  const hashRoute = url.hash.startsWith("#/booking") ? url.hash.slice(1) : "";
  const route = hashRoute || (BOOKING_PATH.test(url.pathname) ? url.pathname + url.search : "");
  if (!route || !BOOKING_PATH.test(route.split("?")[0])) return "";
  const params = new URLSearchParams(route.includes("?") ? route.split("?").slice(1).join("?") : "");
  const master = String(params.get("master") || "").trim();
  if (master && !/^[1-9]\d*$/.test(master)) return "";
  const query = new URLSearchParams({ salon: slug });
  if (master) query.set("master", master);
  return "/#/booking?" + query.toString();
}
