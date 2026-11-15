// Staging-only transition contract from canonical public paths to HashRouter booking.
// Pure functions. No I/O, database, or global environment reads.
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function shouldUseStageBookingHash(pathParts, hashParts, strict = false) {
  if (!strict || hashParts?.[0] !== "booking") return false;
  if (!Array.isArray(pathParts) || !["salon", "master"].includes(pathParts[0])) return false;
  return VALID_SLUG.test(String(pathParts[1] || ""));
}

export function buildStageSalonBookingRoute(bookingUrl, salonSlug, policy) {
  if (!policy?.strict) return "";
  const slug = String(salonSlug || "").trim().toLowerCase();
  if (!VALID_SLUG.test(slug)) return "";
  const approved = policy.safe(bookingUrl, "booking");
  if (!approved) return "";

  let parsed;
  try { parsed = new URL(approved, policy.appOrigin + "/"); }
  catch { return ""; }

  // Keep valid booking filters, but explicitly bind the salon being viewed.
  // Public-path routing must never fall back to a different salon or tenant.
  const selected = parsed.hash.startsWith("#/booking")
    ? parsed.hash.slice(1)
    : parsed.pathname + parsed.search;
  const route = selected.startsWith("/m/booking")
    ? selected.slice(2)
    : selected;
  if (!/^\/booking(?:\?|$)/.test(route)) return "";

  const question = route.indexOf("?");
  const params = new URLSearchParams(question >= 0 ? route.slice(question + 1) : "");
  params.set("salon", slug);
  return "/booking?" + params.toString();
}
