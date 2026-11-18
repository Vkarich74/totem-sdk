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

// Existing US master bookings feed, opt-in to canonical location metadata.
// Calendar dates and times are derived from each booking's immutable
// US booking→location link. Never use browser TZ or country-wide UTC.
// Existing US-03 master/branch hours. Read-only model and closed PUT
// allowlist; the Backend is the sole authority for validation and storage.
const US_HOURS_REVISION = /^[a-f0-9]{64}$/;
const US_HOURS_CLOCK = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const US_HOURS_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;
const US_HOURS_LOCATION = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validUsMasterBranch(raw) {
  const id=Number(raw?.location_id);
  const salonId=Number(raw?.salon_id);
  const tz=String(raw?.timezone||"");
  if (!Number.isSafeInteger(id) || id<1 ||
      !Number.isSafeInteger(salonId) || salonId<1 ||
      !US_HOURS_SLUG.test(String(raw?.salon_slug||"")) ||
      !US_HOURS_LOCATION.test(String(raw?.location_code||"")) ||
      !tz || tz==="UTC" || tz==="Etc/UTC") {
    throw new Error("US_MASTER_HOURS_LOCATION_INVALID");
  }
  try { new Intl.DateTimeFormat("en-US",{timeZone:tz}).format(new Date()); }
  catch { throw new Error("US_MASTER_HOURS_LOCATION_INVALID"); }
  return {
    location_id:id,salon_id:salonId,salon_slug:raw.salon_slug,
    salon_name:String(raw.salon_name||""),
    location_code:raw.location_code,
    city_name:String(raw.city_name||""),
    state_code:String(raw.state_code||""),
    timezone:tz,is_primary:raw.is_primary===true,
  };
}

export function normalizeUsMasterHoursLocations(payload, masterSlug) {
  if(!payload || payload.ok!==true || payload.market_code!=="US" ||
     payload.owner_type!=="master" || payload.owner_slug!==masterSlug ||
     !Array.isArray(payload.locations) || payload.locations.length>100) {
    throw new Error("US_MASTER_HOURS_LOCATIONS_CONTRACT_INVALID");
  }
  const keys=new Set();
  const locations=payload.locations.map(raw=>{
    const row=validUsMasterBranch(raw);
    const key=row.salon_slug+"/"+row.location_code;
    if(keys.has(key))throw new Error("US_MASTER_HOURS_LOCATIONS_CONTRACT_INVALID");
    keys.add(key);
    return Object.freeze(row);
  });
  return Object.freeze(locations);
}

function canonicalUsHourRows(hours) {
  if(!Array.isArray(hours)||hours.length>7)
    throw new Error("US_MASTER_HOURS_INPUT_INVALID");
  const days=new Set();
  return hours.map(raw=>{
    const weekday=raw?.weekday;
    if(!Number.isInteger(weekday)||weekday<0||weekday>6||
       days.has(weekday)||!US_HOURS_CLOCK.test(String(raw?.start_time||""))||
       !US_HOURS_CLOCK.test(String(raw?.end_time||""))) {
      throw new Error("US_MASTER_HOURS_INPUT_INVALID");
    }
    days.add(weekday);
    const toMinutes=v=>Number(v.slice(0,2))*60+Number(v.slice(3,5));
    const start=toMinutes(raw.start_time),end=toMinutes(raw.end_time);
    const breakStart=raw.break_start??null,breakEnd=raw.break_end??null;
    if(start>=end ||
       (breakStart===null)!==(breakEnd===null) ||
       (breakStart!==null &&
         (!US_HOURS_CLOCK.test(breakStart)||!US_HOURS_CLOCK.test(breakEnd)||
          toMinutes(breakStart)<start||toMinutes(breakEnd)>end||
          toMinutes(breakStart)>=toMinutes(breakEnd)))) {
      throw new Error("US_MASTER_HOURS_INPUT_INVALID");
    }
    return {
      weekday,start_time:raw.start_time,end_time:raw.end_time,
      break_start:breakStart,break_end:breakEnd,
    };
  }).sort((a,b)=>a.weekday-b.weekday);
}

export function normalizeUsMasterHoursDetail(payload, masterSlug, location) {
  const scope=validUsMasterBranch(location);
  if(!payload || payload.ok!==true || payload.market_code!=="US" ||
     payload.owner_type!=="master" || payload.owner_slug!==masterSlug ||
     payload.location?.salon_slug!==scope.salon_slug ||
     payload.location?.location_code!==scope.location_code ||
     payload.location?.timezone!==scope.timezone ||
     !US_HOURS_REVISION.test(String(payload.revision||"")) ||
     !Array.isArray(payload.week)||payload.week.length!==7 ||
     typeof payload.saved!=="boolean") {
    throw new Error("US_MASTER_HOURS_READBACK_INVALID");
  }
  const hours=canonicalUsHourRows(payload.hours);
  const seen=new Set();
  for(const day of payload.week) {
    if(!Number.isInteger(day?.weekday) || day.weekday<0 ||
       day.weekday>6 || seen.has(day.weekday) ||
       typeof day.configured!=="boolean") {
      throw new Error("US_MASTER_HOURS_READBACK_INVALID");
    }
    seen.add(day.weekday);
    if(day.configured !== hours.some(row=>row.weekday===day.weekday)) {
      throw new Error("US_MASTER_HOURS_READBACK_INVALID");
    }
  }
  return Object.freeze({
    location:scope,hours,revision:payload.revision,
    saved:payload.saved,
    week:Object.freeze(payload.week.map(day=>Object.freeze({...day}))),
  });
}

export function prepareUsMasterHoursPut(record, days) {
  if(!record || !US_HOURS_REVISION.test(String(record.revision||"")) ||
     !Array.isArray(days)||days.length!==7) {
    throw new Error("US_MASTER_HOURS_INPUT_INVALID");
  }
  const rows=days.filter(d=>d?.configured===true).map(day=>({
    weekday:day.weekday,start_time:String(day.start_time||""),
    end_time:String(day.end_time||""),
    break_start:day.has_break ? String(day.break_start||"") : null,
    break_end:day.has_break ? String(day.break_end||"") : null,
  }));
  return {revision:record.revision,hours:canonicalUsHourRows(rows)};
}

export function verifyUsMasterHoursSaved(before,written,fresh,desiredHours) {
  if(!before||!written||!fresh||written.saved!==true||
     fresh.saved!==false ||
     written.revision!==fresh.revision ||
     before.location.salon_slug!==fresh.location.salon_slug ||
     before.location.location_code!==fresh.location.location_code ||
     before.location.timezone!==fresh.location.timezone ||
     JSON.stringify(written.hours)!==JSON.stringify(fresh.hours) ||
     JSON.stringify(fresh.hours)!==
       JSON.stringify(canonicalUsHourRows(desiredHours))) {
    throw new Error("US_MASTER_HOURS_SAVE_NOT_CONFIRMED");
  }
  return fresh;
}

export function normalizeUsMasterScheduleFeed(payload) {
  if (!payload || payload.ok !== true ||
      payload.market_code !== "US" ||
      payload.calendar_scope !== "us_location" ||
      !Array.isArray(payload.bookings)) {
    throw new Error("US_MASTER_SCHEDULE_FEED_INVALID");
  }
  const ids = new Set();
  const rows = payload.bookings.map(raw => {
    const id = Number(raw?.id);
    const salonId = Number(raw?.salon_id);
    const salonSlug = String(raw?.salon_slug || "");
    const locationCode = String(raw?.location_code || "");
    const timezone = String(raw?.location_timezone || "");
    // Require explicit UTC/offset instants. "2026-11-18 10:00" must
    // never be interpreted by the client's own operating-system timezone.
    const absolute = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/;
    const validStart = typeof raw?.start_at === "string" &&
      absolute.test(raw.start_at);
    const validEnd = raw?.end_at == null ||
      (typeof raw.end_at === "string" && absolute.test(raw.end_at));
    const start = validStart ? new Date(raw.start_at) : new Date(NaN);
    const end = validEnd && raw?.end_at != null ? new Date(raw.end_at) : null;
    if (!Number.isSafeInteger(id) || id < 1 || ids.has(id) ||
        !Number.isSafeInteger(salonId) || salonId < 1 ||
        !/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/.test(salonSlug) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationCode) ||
        !timezone || timezone === "Etc/UTC" || timezone === "UTC" ||
        !validEnd || !Number.isFinite(start.getTime()) ||
        (end && (!Number.isFinite(end.getTime()) || end <= start))) {
      throw new Error("US_MASTER_BOOKING_LOCATION_INVALID");
    }
    try {
      const localDate = getUsBusinessDate(start,timezone);
      const timeFormatter = new Intl.DateTimeFormat("en-US",{
        timeZone:timezone,hour:"2-digit",minute:"2-digit",hourCycle:"h23",
      });
      const localTime = timeFormatter.format(start);
      const localEndTime = end ? timeFormatter.format(end) : null;
      // UTC offset disambiguates the repeated 01:30 on autumn DST folds.
      const offsetFormatter = new Intl.DateTimeFormat("en-US",{
        timeZone:timezone,timeZoneName:"shortOffset",
      });
      const offsetAt = date => offsetFormatter.formatToParts(date)
        .find(part=>part.type === "timeZoneName")?.value || null;
      const utcOffset = offsetAt(start);
      const endUtcOffset = end ? offsetAt(end) : null;
      const localEndDate = end ? getUsBusinessDate(end,timezone) : null;
      if (!utcOffset || (end && !endUtcOffset)) {
        throw new Error("US_MASTER_BOOKING_OFFSET_UNRESOLVED");
      }
      ids.add(id);
      return Object.freeze({
        ...raw,id,salon_id:salonId,salon_slug:salonSlug,
        location_code:locationCode,location_timezone:timezone,
        local_date:localDate,local_time:localTime,
        utc_offset:utcOffset,
        local_end_date:localEndDate,
        local_end_time:localEndTime,
        local_end_offset:endUtcOffset,
        starts_ms:start.getTime(),
      });
    } catch {
      throw new Error("US_MASTER_BOOKING_LOCATION_INVALID");
    }
  });
  return Object.freeze(rows.sort((a,b)=>a.starts_ms-b.starts_ms));
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
