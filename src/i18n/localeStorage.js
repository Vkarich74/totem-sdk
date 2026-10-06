const STORAGE_KEY = "TOTEM_UI_LOCALE_V2";
const LEGACY_KEY = "TOTEM_UI_LOCALE_V1";

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function localeScope(userId, marketCode) {
  return userId == null ? "anonymous:" + marketCode : "user:" + userId + ":" + marketCode;
}

export function readLocaleChoice(userId, context, storage = browserStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
    const entry = parsed?.version === 2 ? parsed.entries?.[localeScope(userId, context.market_code)] : null;
    if (entry?.market_code === context.market_code && entry?.user_id === (userId ?? null) &&
        context.supported_locales.includes(entry.locale)) return entry.locale;
    if (userId == null) {
      const legacy = storage?.getItem(LEGACY_KEY);
      const candidate = legacy === "ru" ? "ru-KG" : legacy === "en" ? "en-KG" : null;
      if (context.supported_locales.includes(candidate)) return candidate;
    }
  } catch { /* unavailable or invalid storage is not a bootstrap failure */ }
  return null;
}

export function writeLocaleChoice(userId, context, locale, storage = browserStorage()) {
  if (!context.supported_locales.includes(locale)) return false;
  try {
    if (!storage) return false;
    let existing = null;
    try { existing = JSON.parse(storage.getItem(STORAGE_KEY) || "null"); } catch { /* repair invalid cache */ }
    const entries = existing?.version === 2 && existing.entries &&
      typeof existing.entries === "object" && !Array.isArray(existing.entries) ? { ...existing.entries } : {};
    const scope = localeScope(userId, context.market_code);
    entries[scope] = { user_id: userId ?? null, market_code: context.market_code, locale };
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, entries }));
    return true;
  } catch { return false; }
}

export function chooseUiLocale(context, preference, cached) {
  const allowed = context.supported_locales;
  if (allowed.includes(preference)) return { locale: preference, source: "user" };
  if (allowed.includes(cached)) return { locale: cached, source: "local" };
  if (allowed.includes(context.locale)) return { locale: context.locale, source: "market_context" };
  throw new Error("MARKET_LOCALE_UNRESOLVED");
}

const SALON_SECTIONS = new Set(["dashboard", "calendar", "masters", "clients", "bookings", "services",
  "money", "finance", "contracts", "salon-money", "transactions", "settlements", "payouts", "settings", "template"]);
const MASTER_SECTIONS = new Set(["dashboard", "bookings", "clients", "schedule", "services",
  "finance", "money", "transactions", "settlements", "payouts", "settings", "template"]);

export function resolveLocaleOwner({ pathname = "", search = "", publicPath = "", publicSearch = "",
  salonSlug = null, masterSlug = null } = {}) {
  const parse = (path, query) => {
    const parts = path.split("/").filter(Boolean);
    const type = parts[0];
    if (!["salon", "master"].includes(type)) return null;
    const reserved = type === "salon" ? SALON_SECTIONS : MASTER_SECTIONS;
    const pathSlug = parts[1] && !reserved.has(parts[1]) ? parts[1] : null;
    let slug = pathSlug || new URLSearchParams(query).get("slug");
    if (!slug) slug = type === "salon" ? salonSlug : masterSlug;
    try { if (pathSlug) slug = decodeURIComponent(pathSlug); } catch { return null; }
    return slug ? { type, slug } : null;
  };
  // Auth and admin routes never inherit an old salon/master from the URL shell.
  if (/^\/(auth|admin)(\/|$)/.test(pathname)) {
    if (pathname.startsWith("/auth")) {
      const query = new URLSearchParams(search);
      const role = query.get("role");
      const slug = query.get("slug");
      const type = role === "salon" || role === "salon_admin" ? "salon" : role === "master" ? "master" : null;
      return type && slug ? { type, slug } : null;
    }
    return null;
  }
  return parse(pathname, search) || parse(publicPath, publicSearch);
}

// API functions are injectable for deterministic local checks without HTTP.
function endpointUnavailable(error) {
  return [405, 501].includes(error.status) ||
    (error.status === 404 && error.code === "LOCALE_ENDPOINT_UNAVAILABLE");
}

export async function loadUiLocaleContext({ owner, token, api, storage, signal }) {
  const session = token ? await api.resolveSession() : null;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (token && !session?.ok) throw new Error("LOCALE_SESSION_UNAVAILABLE");
  const userId = session?.authenticated &&
    ["master", "salon_admin"].includes(session?.auth?.role) ? Number(session.auth.user_id) : null;
  if (userId != null && (!Number.isSafeInteger(userId) || userId <= 0)) throw new Error("LOCALE_SESSION_INVALID");
  let response;
  let preferenceAvailable = false;
  if (userId && owner) {
    try {
      response = await api.getOwnerContext(owner, { signal, token });
      preferenceAvailable = true;
    } catch (error) {
      if (!endpointUnavailable(error)) throw error;
    }
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (!response) {
    const context = await api.getPublicContext(owner?.type === "salon" ? owner.slug : null, { signal });
    response = { market_context: context, business_context_status: "unknown", context_source: "legacy_public" };
    if (userId && !owner) {
      try {
        const preference = await api.getPreference(context.market_code, { signal, token });
        response.ui_locale = preference.locale;
        preferenceAvailable = true;
      } catch (error) {
        if (!endpointUnavailable(error)) throw error;
      }
    }
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const context = response.market_context;
  if (!context || !Array.isArray(context.supported_locales) || !context.market_code) {
    throw new Error("MARKET_CONTEXT_INVALID");
  }
  const cached = readLocaleChoice(userId, context, storage);
  // ui_locale from owner context may be a tenant default. Only a user preference
  // overrides the personal cache; defaults keep the documented fallback order.
  const serverLocale = preferenceAvailable &&
    (response.preference_source === "user" || !owner) ? response.ui_locale : null;
  const chosen = chooseUiLocale(context, serverLocale, cached);
  return {
    status: "ready", context, locale: chosen.locale, preference_source: chosen.source,
    userId, preferenceAvailable,
    context_source: response.context_source,
    business_context_status: response.business_context_status,
    saveStatus: "idle", errorKey: null,
  };
}
