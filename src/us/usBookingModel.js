// TOTEM US-04 — pure US booking UI model, no network and no legacy KG/KZ writes.
// USPS 50 states and Washington DC; API US-02 is the runtime source of names.
export const US_STATE_CODES = Object.freeze([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

const STATES = new Set(US_STATE_CODES);

export function validateUsLocationCatalog(payload) {
  if (!payload || payload.ok !== true ||
      payload.market_code !== "US" || payload.currency_code !== "USD" ||
      payload.locale !== "en-US" || payload.phone_country_code !== "+1" ||
      !Array.isArray(payload.states) || !Array.isArray(payload.locations)) {
    throw new Error("US_CATALOG_CONTRACT_INVALID");
  }
  if (payload.states.length !== 51 ||
      new Set(payload.states.map(x => x.code)).size !== 51 ||
      payload.states.some(x => !STATES.has(x.code) ||
        typeof x.name_en !== "string" || !x.name_en.trim()) ||
      payload.states.filter(x => x.kind === "state").length !== 50 ||
      payload.states.filter(x => x.kind === "federal_district").length !== 1) {
    throw new Error("US_STATES_CATALOG_MISMATCH");
  }
  const locations = [];
  const codes = new Set();
  for (const raw of payload.locations) {
    const code = String(raw?.location_code || "").trim();
    const state = String(raw?.state_code || "").trim();
    const zone = String(raw?.timezone || "").trim();
    const zip = String(raw?.postal_code || "").trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code) ||
        codes.has(code) || !STATES.has(state) ||
        !/^\d{5}(?:-\d{4})?$/.test(zip) ||
        !String(raw?.city_name || "").trim() ||
        !String(raw?.street_line1 || "").trim() ||
        !zone || zone === "Etc/UTC" || zone === "UTC") {
      throw new Error("US_LOCATION_CATALOG_INVALID");
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    } catch {
      throw new Error("US_LOCATION_TIMEZONE_INVALID");
    }
    codes.add(code);
    locations.push(Object.freeze({
      location_code: code,
      state_code: state,
      city_name: String(raw.city_name).trim(),
      street_line1: String(raw.street_line1).trim(),
      street_line2: String(raw.street_line2 || "").trim(),
      postal_code: zip,
      timezone: zone,
      is_primary: raw.is_primary === true,
    }));
  }
  return Object.freeze({
    states: Object.freeze(payload.states.map(x => Object.freeze({
      code: x.code, name: x.name_en.trim(),
    })).sort((a, b) => a.name.localeCompare(b.name, "en-US"))),
    locations: Object.freeze(locations),
  });
}

export function usLocationsForState(locations, state) {
  return state && STATES.has(state)
    ? (Array.isArray(locations) ? locations : []).filter(x => x.state_code === state)
    : [];
}

export function normalizeUsPhoneDraft(input) {
  const raw = String(input || "").trim();
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  const domestic = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1) : digits.length === 10 ? digits : "";
  // Syntax only. API verifies actual US ownership; +1 also covers Canada.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(domestic)) return null;
  return "+1" + domestic;
}

export function getUsBusinessDate(now, timezone) {
  const parts = Object.create(null);
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now instanceof Date ? now : new Date(now))) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  if (!parts.year || !parts.month || !parts.day) {
    throw new Error("US_BUSINESS_DATE_UNAVAILABLE");
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Read-only US salon calendar uses the existing owner location registry.
// Disabled drafts and market-wide Etc/UTC are never treated as real branches.
export function getUsCalendarLocations(payload) {
  if (!payload || payload.ok !== true || payload.market_code !== "US" ||
      payload.currency_code !== "USD" || !Array.isArray(payload.locations)) {
    throw new Error("US_CALENDAR_LOCATION_REGISTRY_INVALID");
  }
  const seen = new Set();
  const enabled = [];
  for (const item of payload.locations) {
    if (item?.enabled !== true) continue;
    const code = String(item.location_code || "");
    const timezone = String(item.timezone_name || "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code) || seen.has(code) ||
        !timezone || timezone === "UTC" || timezone === "Etc/UTC") {
      throw new Error("US_CALENDAR_LOCATION_INVALID");
    }
    try {
      new Intl.DateTimeFormat("en-US", {timeZone: timezone}).format(new Date());
    } catch {
      throw new Error("US_CALENDAR_LOCATION_INVALID");
    }
    seen.add(code);
    enabled.push(Object.freeze({
      location_code:code,
      timezone,
      city_name:String(item.city_name || ""),
      state_code:String(item.state_code || ""),
      is_primary:item.is_primary === true,
    }));
  }
  return Object.freeze(enabled.sort((a,b)=>
    Number(b.is_primary)-Number(a.is_primary) ||
    a.location_code.localeCompare(b.location_code)
  ));
}

export function verifyUsCalendarLocationResponse(payload, selectedLocation) {
  const code = String(selectedLocation?.location_code || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code) ||
      !payload || payload.ok !== true || payload.market_code !== "US" ||
      payload.date?.location_code !== code ||
      payload.location?.location_code !== code ||
      payload.date?.timezone !== selectedLocation.timezone ||
      payload.location?.timezone !== selectedLocation.timezone ||
      typeof payload.date?.requested_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(payload.date.requested_date) ||
      !Array.isArray(payload.masters) || !Array.isArray(payload.working_hours) ||
      !Array.isArray(payload.events)) {
    throw new Error("US_CALENDAR_LOCATION_READBACK_MISMATCH");
  }
  return payload;
}

export function formatUsPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(n);
}

export function formatUsLocationAddress(location) {
  if (!location) return "";
  return [location.street_line1, location.street_line2,
    `${location.city_name}, ${location.state_code} ${location.postal_code}`]
    .map(x => String(x || "").trim()).filter(Boolean).join(" · ");
}

export function isValidUsSlot(slot, locationCode) {
  if (!slot || slot.location_code !== locationCode ||
      typeof slot.local_time !== "string" ||
      !/^\d{2}:\d{2}$/.test(slot.local_time) ||
      typeof slot.start_at !== "string" ||
      !/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(slot.start_at) ||
      typeof slot.end_at !== "string") {
    return false;
  }
  const begin = new Date(slot.start_at).getTime();
  const end = new Date(slot.end_at).getTime();
  return Number.isFinite(begin) && Number.isFinite(end) && end > begin;
}

export function createUsBookingRequest({
  masterId, serviceId, location, date, slot, clientName, clientPhone,
}) {
  const phone = normalizeUsPhoneDraft(clientPhone);
  const name = String(clientName || "").trim();
  if (!location?.location_code || !STATES.has(location.state_code) ||
      !Number.isSafeInteger(Number(masterId)) || Number(masterId) < 1 ||
      !Number.isSafeInteger(Number(serviceId)) || Number(serviceId) < 1 ||
      !/^20\d{2}-\d{2}-\d{2}$/.test(String(date || "")) ||
      !isValidUsSlot(slot, location.location_code) ||
      name.length < 2 || !phone) {
    throw new Error("US_BOOKING_FIELDS_INVALID");
  }
  return Object.freeze({
    master_id: Number(masterId),
    service_id: Number(serviceId),
    location_code: location.location_code,
    date,
    time: slot.local_time,
    start_at: slot.start_at,
    client_payload: { name, phone },
  });
}
