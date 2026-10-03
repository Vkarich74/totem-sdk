import { createContext, useContext, useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.totemv.com";
const MarketContext = createContext(null);

const RU_KG = Object.freeze({
  contextLoading: "Загрузка…",
  contextUnavailable: "Контекст рынка временно недоступен",
});

function getMessages(locale) {
  if (locale === "ru-KG") return RU_KG;
  return RU_KG;
}

export function MarketContextProvider({ salonSlug = null, children }) {
  const [state, setState] = useState({ status: "loading", context: null, error: null });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (salonSlug) params.set("salon_slug", salonSlug);
    const query = params.toString();
    const url = query ? `${API_BASE}/public/market-context?${query}` : `${API_BASE}/public/market-context`;
    fetch(url, { method: "GET", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.ok !== true || !payload?.market_context) {
          throw new Error(payload?.error || `MARKET_CONTEXT_HTTP_${response.status}`);
        }
        return payload.market_context;
      })
      .then((context) => {
        if (!active) return;
        window.__TOTEM_MARKET_CONTEXT__ = context;
        document.documentElement.lang = context.locale || "";
        setState({ status: "ready", context, error: null });
      })
      .catch((error) => {
        if (!active) return;
        console.error("TOTEM MarketContext bootstrap failed", error);
        setState({ status: "error", context: null, error });
      });

    return () => {
      active = false;
    };
  }, [salonSlug]);
  const value = useMemo(() => {
    const context = state.context;
    const locale = context?.locale || null;
    const timezone = context?.timezone || null;
    const currencyCode = context?.currency_code || null;
    const messages = getMessages(locale);

    return {
      ...state,
      t(key) {
        return messages[key] || key;
      },
      formatMoney(amount, currency = currencyCode) {
        if (!locale || !currency) return String(amount ?? "");
        return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount) || 0);
      },
      formatNumber(value) {
        if (!locale) return String(value ?? "");
        return new Intl.NumberFormat(locale).format(Number(value) || 0);
      },
      formatDateTime(value, options = {}) {
        if (!locale || !timezone || !value) return value ? String(value) : "";
        return new Intl.DateTimeFormat(locale, { timeZone: timezone, ...options }).format(new Date(value));
      },
      phone: Object.freeze({
        countryCode: context?.phone_country_code || null,
        defaultRegion: context?.default_phone_region || null,
        placeholder: context?.phone_country_code ? `${context.phone_country_code} …` : "",
      }),
    };
  }, [state]);

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarketContext() {
  const value = useContext(MarketContext);
  if (!value) {
    throw new Error("MarketContextProvider is required");
  }
  return value;
}
