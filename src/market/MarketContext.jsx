import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getAuthAccessToken, resolveSession, getLocaleOwnerContext, getLocalePreference,
  saveLocalePreference, getPublicMarketContext,
} from "../api/internal.js";
import { loadUiLocaleContext, resolveLocaleOwner, writeLocaleChoice } from "../i18n/localeStorage.js";
import { translate } from "../i18n/messages.js";

const MarketContext = createContext(null);
const API = {
  resolveSession, getOwnerContext: getLocaleOwnerContext,
  getPreference: getLocalePreference, getPublicContext: getPublicMarketContext,
};
const AUTH_KEYS = new Set(["TOTEM_AUTH_TOKEN", "TOTEM_ACCESS_TOKEN", "TOTEM_INTERNAL_TOKEN"]);

function unavailableState() {
  return { status: "loading", context: null, locale: null, saveStatus: "idle", errorKey: null };
}

export function MarketContextProvider({ children }) {
  const location = useLocation();
  const [token, setToken] = useState(getAuthAccessToken);
  const owner = resolveLocaleOwner({
    pathname: location.pathname, search: location.search,
    publicPath: window.location.pathname, publicSearch: window.location.search,
    salonSlug: window.SALON_SLUG, masterSlug: window.MASTER_SLUG,
  });
  const ownerType = owner?.type ?? null;
  const ownerSlug = owner?.slug ?? null;
  const admin = /^\/admin(\/|$)/.test(location.pathname);
  const requestKey = JSON.stringify([token, ownerType, ownerSlug, admin]);
  const currentKey = useRef(requestKey);
  currentKey.current = requestKey;
  const [stored, setStored] = useState(unavailableState);
  const state = stored.requestKey === requestKey ? stored : unavailableState();
  const saving = useRef(false);
  const saveAbort = useRef(null);

  useEffect(() => {
    const sync = () => setToken(getAuthAccessToken());
    const external = event => {
      if (event.key !== null && !AUTH_KEYS.has(event.key)) return;
      // Window token fallbacks must not resurrect an account logged out in
      // another tab. The actual token remains in the existing auth store.
      for (const key of AUTH_KEYS) window[key] = "";
      window.__TOTEM_UI_LOCALE__ = null;
      sync();
    };
    window.addEventListener("totem:auth-changed", sync);
    window.addEventListener("storage", external);
    return () => {
      window.removeEventListener("totem:auth-changed", sync);
      window.removeEventListener("storage", external);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    saving.current = false;
    saveAbort.current?.abort();
    window.__TOTEM_MARKET_CONTEXT__ = null;
    window.__TOTEM_UI_LOCALE__ = null;
    document.documentElement.lang = "";
    loadUiLocaleContext({
      owner: ownerType ? { type: ownerType, slug: ownerSlug } : null,
      token: admin ? "" : token, api: API, signal: abort.signal,
    }).then(next => {
      if (!active || currentKey.current !== requestKey) return;
      setStored({ ...next, requestKey });
    }).catch(error => {
      if (!active || currentKey.current !== requestKey || error.name === "AbortError") return;
      setStored({ ...unavailableState(), requestKey, status: "error", errorKey: "contextUnavailable" });
    });
    return () => { active = false; abort.abort(); saveAbort.current?.abort(); };
  }, [requestKey, token, ownerType, ownerSlug, admin]);

  useEffect(() => {
    if (state.status !== "ready") return;
    window.__TOTEM_MARKET_CONTEXT__ = state.context;
    window.__TOTEM_UI_LOCALE__ = state.locale;
    document.documentElement.lang = state.locale;
  }, [state.status, state.context, state.locale]);

  const setLocale = useCallback(async locale => {
    if (state.status !== "ready" || !state.context.supported_locales.includes(locale) ||
        currentKey.current !== requestKey || saving.current) return false;
    const cached = writeLocaleChoice(state.userId, state.context, locale);
    setStored(previous => ({ ...previous, locale, saveStatus: "local", errorKey: cached ? null : "languageStorageFailed" }));
    // Change labels immediately without remounting children or any forms.
    window.__TOTEM_UI_LOCALE__ = locale;
    document.documentElement.lang = locale;
    if (!state.userId) return true;
    if (!state.preferenceAvailable) {
      setStored(previous => ({ ...previous, errorKey: "languageServerUnavailable" }));
      return false;
    }
    saving.current = true;
    const abort = new AbortController();
    saveAbort.current = abort;
    setStored(previous => ({ ...previous, saveStatus: "saving", errorKey: null }));
    try {
      const result = await saveLocalePreference(state.context.market_code, locale, { signal: abort.signal, token });
      if (currentKey.current !== requestKey || abort.signal.aborted) return false;
      if (result.locale !== locale) throw new Error("LOCALE_SAVE_MISMATCH");
      setStored(previous => ({ ...previous, saveStatus: "saved", errorKey: cached ? null : "languageStorageFailed" }));
      return true;
    } catch {
      if (currentKey.current === requestKey && !abort.signal.aborted) {
        setStored(previous => ({ ...previous, saveStatus: "error", errorKey: "languageSaveFailed" }));
      }
      return false;
    } finally {
      if (saveAbort.current === abort) {
        saving.current = false;
        saveAbort.current = null;
      }
    }
  }, [state, requestKey, token]);

  const value = useMemo(() => {
    const context = state.context;
    const locale = state.locale;
    return {
      ...state, setLocale,
      t: (key, params) => translate(locale, key, params),
      formatMoney(amount, currency = context?.currency_code) {
        if (amount == null || amount === "" || !Number.isFinite(Number(amount))) return String(amount ?? "");
        if (!locale || !currency) return String(amount);
        return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
      },
      formatNumber(number) {
        if (number == null || number === "" || !Number.isFinite(Number(number))) return String(number ?? "");
        return locale ? new Intl.NumberFormat(locale).format(Number(number)) : String(number);
      },
      formatDateTime(input, options = {}) {
        if (!input || !locale || !context?.timezone) return String(input ?? "");
        const dateOnly = typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input);
        const date = new Date(dateOnly ? input + "T12:00:00Z" : input);
        if (!Number.isFinite(date.getTime())) return String(input);
        if (dateOnly && date.toISOString().slice(0, 10) !== input) return input;
        return new Intl.DateTimeFormat(locale, {
          ...options, timeZone: dateOnly ? "UTC" : context.timezone,
        }).format(date);
      },
      phone: {
        countryCode: context?.phone_country_code ?? null,
        defaultRegion: context?.default_phone_region ?? null,
        placeholder: context?.phone_country_code ? context.phone_country_code + " …" : "",
      },
    };
  }, [state, setLocale]);
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarketContext() {
  const value = useContext(MarketContext);
  if (!value) throw new Error("MarketContextProvider is required");
  return value;
}
