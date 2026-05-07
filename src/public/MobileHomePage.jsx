import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMobileConfig,
  getMobileCityHome,
  getMobileLocations,
  getMobileNotifications,
  getMobileReferral,
  getMobileSalonCatalog,
  postMobileDataRequest,
  postMobileEvent,
  postMobileNotificationRead,
  postMobileFeedback
} from "../api/publicApi";
import {
  MobileShell,
  MobileTopBar,
  MobileHero,
  MobileSection,
  MobileCard,
  MobileButton,
  MobileBadge,
  MobilePill,
  MobileEmptyState,
  MobileBottomNav,
  MobileStatCard,
  TotemAppFrame,
  TotemHeader,
  TotemHeroBanner,
  TotemSearchBar,
  TotemCategoryRail,
  TotemTrustStrip,
  TotemBottomTabs,
  TotemCategoryChip,
} from "../mobile/MobileUi.jsx";

function parseMobileRoute() {
  const pathname = String(window.location.pathname || "").replace(/\/+$/, "");
  const pathParts = pathname.split("/").filter(Boolean);

  if (pathParts[0] === "m" && pathParts[1] === "city" && pathParts[2] && pathParts[3]) {
    return {
      mode: "city",
      countryCode: pathParts[2],
      citySlug: pathParts[3],
    };
  }

  const hash = String(window.location.hash || "").replace(/^#\/?/, "");
  const parts = hash.split("?")[0].split("/").filter(Boolean);

  if (parts[0] !== "mobile") {
    return { mode: "home" };
  }

  if (parts[1] === "city" && parts[2] && parts[3]) {
    return {
      mode: "city",
      countryCode: parts[2],
      citySlug: parts[3],
    };
  }

  return { mode: "home" };
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isActiveEntity(entity) {
  const status = normalizeStatus(entity?.status);
  if (!status) {
    return true;
  }

  return status === "active" || status === "enabled" || status === "published";
}

function isEnabledFlag(flag) {
  if (!flag) {
    return false;
  }

  const status = normalizeStatus(flag.status);
  return flag.enabled === true && (status === "active" || status === "enabled");
}

function formatLabel(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function buildHashPath(path) {
  return `#${path}`;
}

function buildAbsoluteOwnerUrl(path) {
  return `https://www.totemv.com${path}`;
}

function buildPublicBookingUrl(salonSlug) {
  return `https://app.totemv.com/#/booking?salon=${encodeURIComponent(String(salonSlug || "").trim())}`;
}

function isNormalMobilePath() {
  if (typeof window === "undefined") {
    return false;
  }

  const pathname = String(window.location.pathname || "").replace(/\/+$/, "");
  return pathname === "/m" || pathname.startsWith("/m/");
}

function buildMobileCityHref(countryCode, citySlug) {
  const normalizedCountryCode = encodeURIComponent(String(countryCode || "").trim().toUpperCase());
  const normalizedCitySlug = encodeURIComponent(String(citySlug || "").trim().toLowerCase());

  if (isNormalMobilePath()) {
    return `/m/city/${normalizedCountryCode}/${normalizedCitySlug}`;
  }

  return `#/mobile/city/${normalizedCountryCode}/${normalizedCitySlug}`;
}

function buildMobileBookingHref(salonSlug) {
  const encodedSlug = encodeURIComponent(String(salonSlug || "").trim());

  if (isNormalMobilePath()) {
    return `/m/booking?salon=${encodedSlug}`;
  }

  return buildHashPath(`/booking?salon=${encodedSlug}`);
}

function getMobileAnalyticsSessionKey() {
  const storageKey = "TOTEM_MOBILE_ANALYTICS_SESSION";

  try {
    const existing = window.sessionStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    const nextValue = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(storageKey, nextValue);
    return nextValue;
  } catch {
    return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function trackMobileEvent(payload) {
  const eventPayload = {
    ...(payload || {}),
    source: String(payload?.source || "mobile").trim() || "mobile",
    session_key: String(payload?.session_key || getMobileAnalyticsSessionKey()).trim(),
  };

  void postMobileEvent(eventPayload).catch((error) => {
    try {
      console.warn("MOBILE_EVENT_TRACK_FAILED", String(error?.message || error || ""));
    } catch {
      /* no-op */
    }
  });
}

function getMobileNotificationReaderId() {
  const storageKey = "TOTEM_MOBILE_NOTIFICATION_READER";

  try {
    const existing = window.sessionStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    const nextValue = `mobile-reader-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(storageKey, nextValue);
    return nextValue;
  } catch {
    return `mobile-reader-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function Card({ children, style }) {
  return (
    <div
      style={{
        border: "1px solid rgba(226,232,240,0.88)",
        borderRadius: 26,
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)",
        boxShadow: "0 18px 46px rgba(15,23,42,0.08)",
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", lineHeight: 1.12, letterSpacing: "-0.03em" }}>
        {children}
      </div>
      {subtitle ? (
        <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function EntityBadge({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 11px",
        borderRadius: 999,
        background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
        color: "#1d4ed8",
        border: "1px solid rgba(59,130,246,0.16)",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: "0 8px 18px rgba(29,78,216,0.08)",
      }}
    >
      {children}
    </span>
  );
}

const appPageStyle = {
  background:
    "radial-gradient(circle at top, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.02) 30%, rgba(255,255,255,0) 62%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 52%, #ffffff 100%)",
};

const appStackStyle = {
  width: "100%",
  maxWidth: 480,
  margin: "0 auto",
  padding: "14px 0 28px",
  display: "grid",
  gap: 14,
  boxSizing: "border-box",
};

const cityStackStyle = {
  ...appStackStyle,
  maxWidth: 560,
};

const premiumHeroStyle = {
  padding: 20,
  borderRadius: 30,
  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 46%, #0ea5e9 100%)",
  boxShadow: "0 26px 60px rgba(29,78,216,0.20)",
  overflow: "hidden",
};

const premiumSectionStyle = {
  marginTop: 0,
  padding: 18,
  borderRadius: 24,
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(226,232,240,0.92)",
  boxShadow: "0 16px 40px rgba(15,23,42,0.07)",
};

const premiumCardStyle = {
  padding: 16,
  borderRadius: 22,
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
  border: "1px solid rgba(226,232,240,0.94)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
};

const premiumStatStyle = {
  padding: 16,
  borderRadius: 22,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.94)",
  boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
};

const premiumPanelStyle = {
  padding: 16,
  borderRadius: 24,
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(226,232,240,0.92)",
  boxShadow: "0 16px 40px rgba(15,23,42,0.07)",
};

const topChromeStyle = {
  padding: 14,
  borderRadius: 24,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.92)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
  backdropFilter: "blur(16px)",
};

function PremiumSection({ style, ...props }) {
  return <MobileSection style={{ ...premiumSectionStyle, ...style }} {...props} />;
}

function PremiumCard({ style, ...props }) {
  return <MobileCard style={{ ...premiumCardStyle, ...style }} {...props} />;
}

function PremiumStatCard({ style, ...props }) {
  return <MobileStatCard style={{ ...premiumStatStyle, ...style }} {...props} />;
}

export default function MobileHomePage() {
  const route = useMemo(() => parseMobileRoute(), []);
  const [config, setConfig] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [announcements, setAnnouncements] = useState({
    loading: true,
    error: "",
    items: [],
  });
  const [referral, setReferral] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [catalogBySlug, setCatalogBySlug] = useState({});
  const [notificationMarkingUid, setNotificationMarkingUid] = useState("");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [installPromptVisible, setInstallPromptVisible] = useState(false);
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = useState(false);
  const [pwaStatusMessage, setPwaStatusMessage] = useState("");
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState(null);
  const mobileAnalyticsTrackedRef = useRef(new Set());

  useEffect(() => {
    let active = true;

    async function run() {
      setConfig({
        loading: true,
        error: "",
        data: null,
      });

      try {
        const result = await getMobileConfig();

        if (!active) {
          return;
        }

        if (!result) {
          setConfig({
            loading: false,
            error: "PUBLIC_MOBILE_CONFIG_FAILED",
            data: null,
          });
          return;
        }

        setConfig({
          loading: false,
          error: "",
          data: result,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setConfig({
          loading: false,
          error: error?.message || "PUBLIC_MOBILE_CONFIG_FAILED",
          data: null,
        });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [route.mode, route.countryCode, route.citySlug]);

  const mobileV1Flag = useMemo(() => {
    const flags = Array.isArray(config.data?.feature_flags) ? config.data.feature_flags : [];
    return flags.find((flag) => String(flag?.flag_key || "") === "mobile_v1_enabled") || null;
  }, [config.data]);

  const mobileV1Enabled = isEnabledFlag(mobileV1Flag);
  const mobileCityHomeFlag = useMemo(() => {
    const flags = Array.isArray(config.data?.feature_flags) ? config.data.feature_flags : [];
    return flags.find((flag) => String(flag?.flag_key || "") === "mobile_city_home_enabled") || null;
  }, [config.data]);
  const mobileNotificationsFlag = useMemo(() => {
    const flags = Array.isArray(config.data?.feature_flags) ? config.data.feature_flags : [];
    return flags.find((flag) => String(flag?.flag_key || "") === "mobile_notifications_enabled") || null;
  }, [config.data]);
  const mobileReferralFlag = useMemo(() => {
    const flags = Array.isArray(config.data?.feature_flags) ? config.data.feature_flags : [];
    return flags.find((flag) => String(flag?.flag_key || "") === "mobile_referral_enabled") || null;
  }, [config.data]);
  const mobilePwaFlag = useMemo(() => {
    const flags = Array.isArray(config.data?.feature_flags) ? config.data.feature_flags : [];
    return flags.find((flag) => String(flag?.flag_key || "") === "mobile_pwa_enabled") || null;
  }, [config.data]);
  const mobileCityHomeEnabled = isEnabledFlag(mobileCityHomeFlag);
  const mobileNotificationsEnabled = isEnabledFlag(mobileNotificationsFlag);
  const mobileReferralEnabled = isEnabledFlag(mobileReferralFlag);
  const mobilePwaEnabled = isEnabledFlag(mobilePwaFlag);

  useEffect(() => {
    if (mobilePwaEnabled) {
      return;
    }

    setDeferredInstallPrompt(null);
    setInstallPromptVisible(false);
    setPwaUpdateAvailable(false);
    setPwaStatusMessage("");
    setServiceWorkerRegistration(null);
  }, [mobilePwaEnabled]);

  useEffect(() => {
    if (!mobileV1Enabled || config.loading || state.loading || state.error) {
      return;
    }

    if (route.mode === "city" && !mobileCityHomeEnabled) {
      return;
    }

    const routeKey =
      route.mode === "city"
        ? `city:${String(route.countryCode || "").trim().toUpperCase()}:${String(route.citySlug || "").trim().toLowerCase()}`
        : "mobile:home";

    if (mobileAnalyticsTrackedRef.current.has(routeKey)) {
      return;
    }

    mobileAnalyticsTrackedRef.current.add(routeKey);

    if (route.mode === "city") {
      trackMobileEvent({
        event_type: "city_open",
        target_type: "city",
        country_code: route.countryCode,
        city_slug: route.citySlug,
        route: `#/mobile/city/${route.countryCode}/${route.citySlug}`,
        session_key: getMobileAnalyticsSessionKey(),
        payload_json: {
          ui: "mobile_city",
        },
      });
      return;
    }

    trackMobileEvent({
      event_type: "mobile_open",
      target_type: "mobile",
      route: "#/mobile",
      session_key: getMobileAnalyticsSessionKey(),
      payload_json: {
        ui: "mobile_home",
      },
    });
  }, [config.loading, mobileV1Enabled, mobileCityHomeEnabled, route.citySlug, route.countryCode, route.mode, state.error, state.loading]);

  useEffect(() => {
    if (config.loading || config.error || !mobileV1Enabled) {
      return;
    }

    let active = true;

    async function run() {
      setState({ loading: true, error: "", data: null });

      try {
        if (route.mode === "city" && !mobileCityHomeEnabled) {
          setState({
            loading: false,
            error: "",
            data: { disabled: true },
          });
          return;
        }

        if (route.mode === "city") {
          const data = await getMobileCityHome(route.countryCode, route.citySlug);

          if (!active) {
            return;
          }

          if (!data) {
            setState({
              loading: false,
              error: "",
              data: { empty: true },
            });
            return;
          }

          setState({
            loading: false,
            error: "",
            data,
          });
          return;
        }

        const locations = await getMobileLocations();

        if (!active) {
          return;
        }

        if (!locations) {
          setState({
            loading: false,
            error: "",
            data: { empty: true },
          });
          return;
        }

        setState({
          loading: false,
          error: "",
          data: locations,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: error?.message || "MOBILE_PAGE_FAILED",
          data: null,
        });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [route.mode, route.countryCode, route.citySlug, config.loading, config.error, mobileV1Enabled, mobileCityHomeEnabled]);

  useEffect(() => {
    if (config.loading || config.error || !mobileV1Enabled) {
      return;
    }

    if (!mobileReferralEnabled) {
      setReferral({
        loading: false,
        error: "",
        data: {
          enabled: false,
          available: false,
          reason: "FEATURE_DISABLED",
        },
      });
      return;
    }

    let active = true;

    async function run() {
      setReferral({
        loading: true,
        error: "",
        data: null,
      });

      try {
        const result =
          route.mode === "city"
            ? await getMobileReferral({
                country: route.countryCode,
                city: route.citySlug,
              })
            : await getMobileReferral({
                country: "KG",
              });

        if (!active) {
          return;
        }

        setReferral({
          loading: false,
          error: "",
          data: result?.referral || null,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setReferral({
          loading: false,
          error: error?.message || "PUBLIC_MOBILE_REFERRAL_REQUEST_FAILED",
          data: null,
        });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [route.mode, route.countryCode, route.citySlug, config.loading, config.error, mobileV1Enabled, mobileReferralEnabled]);

  useEffect(() => {
    if (config.loading || config.error || !mobileV1Enabled) {
      return;
    }

    if (!mobileNotificationsEnabled) {
      setAnnouncements({
        loading: false,
        error: "",
        items: [],
        disabled: true,
      });
      return;
    }

    let active = true;

    async function run() {
      setAnnouncements({
        loading: true,
        error: "",
        items: [],
      });

      try {
        const options = {
          reader_type: "client",
          reader_id: getMobileNotificationReaderId(),
          limit: 20,
        };

        if (route.mode === "city") {
          options.country = route.countryCode;
          options.city = route.citySlug;
        }

        const result = await getMobileNotifications(options);

        if (!active) {
          return;
        }

        if (!result?.ok) {
          setAnnouncements({
            loading: false,
            error: result?.error || "PUBLIC_MOBILE_NOTIFICATIONS_REQUEST_FAILED",
            items: [],
          });
          return;
        }

        setAnnouncements({
          loading: false,
          error: "",
          items: Array.isArray(result.notifications) ? result.notifications : [],
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setAnnouncements({
          loading: false,
          error: error?.message || "PUBLIC_MOBILE_NOTIFICATIONS_REQUEST_FAILED",
          items: [],
        });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [route.mode, route.countryCode, route.citySlug, config.loading, config.error, mobileV1Enabled, mobileNotificationsEnabled]);

  async function handleNotificationMarkRead(notification) {
    const notificationUid = String(notification?.notification_uid || "").trim();

    if (!notificationUid || notificationMarkingUid === notificationUid) {
      return;
    }

    const readerId = getMobileNotificationReaderId();

    setNotificationMarkingUid(notificationUid);

    try {
      const result = await postMobileNotificationRead(notificationUid, {
        reader_type: "client",
        reader_id: readerId,
      });

      if (result?.ok === false) {
        return;
      }

      const readAt = result?.read?.read_at || null;

      setAnnouncements((current) => ({
        ...current,
        items: Array.isArray(current?.items)
          ? current.items.map((item) =>
              String(item?.notification_uid || "") === notificationUid
                ? {
                    ...item,
                    is_read: true,
                    read_at: readAt,
                  }
                : item,
            )
          : [],
      }));
    } catch {
      /* no-op */
    } finally {
      setNotificationMarkingUid("");
    }
  }

  useEffect(() => {
    if (!mobileV1Enabled || !mobilePwaEnabled) {
      return;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let active = true;
    const cleanupHandlers = [];

    async function run() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        if (!active) {
          return;
        }

        setServiceWorkerRegistration(registration);

        const onUpdateFound = () => {
          const installingWorker = registration.installing;

          if (!installingWorker) {
            return;
          }

          const onStateChange = () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setPwaUpdateAvailable(true);
              setPwaStatusMessage("Доступно обновление мобильной витрины.");
            }
          };

          installingWorker.addEventListener("statechange", onStateChange);

          cleanupHandlers.push(() => {
            installingWorker.removeEventListener("statechange", onStateChange);
          });
        };

        registration.addEventListener("updatefound", onUpdateFound);
        cleanupHandlers.push(() => {
          registration.removeEventListener("updatefound", onUpdateFound);
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          setPwaUpdateAvailable(true);
          setPwaStatusMessage("Доступно обновление мобильной витрины.");
        }
      } catch {
        /* no-op */
      }
    }

    run();

    return () => {
      active = false;

      while (cleanupHandlers.length) {
        const cleanup = cleanupHandlers.pop();
        try {
          cleanup();
        } catch {
          /* no-op */
        }
      }
    };
  }, [mobileV1Enabled, mobilePwaEnabled]);

  useEffect(() => {
    if (!mobileV1Enabled || !mobilePwaEnabled) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setInstallPromptVisible(true);
      setPwaStatusMessage("");
    };

    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setInstallPromptVisible(false);
      setPwaUpdateAvailable(false);
      setPwaStatusMessage("Приложение установлено.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [mobileV1Enabled, mobilePwaEnabled]);

  function handleInstallApp() {
    if (!deferredInstallPrompt) {
      return;
    }

    const promptEvent = deferredInstallPrompt;
    setInstallPromptVisible(false);
    setPwaStatusMessage("");

    try {
      promptEvent.prompt();
    } catch {
      setDeferredInstallPrompt(null);
      return;
    }

    Promise.resolve(promptEvent.userChoice)
      .then((choice) => {
        if (choice?.outcome === "accepted") {
          setPwaStatusMessage("Приложение установлено.");
        }
      })
      .finally(() => {
        setDeferredInstallPrompt(null);
        setInstallPromptVisible(false);
      });
  }

  function handleReloadForUpdate() {
    if (serviceWorkerRegistration?.waiting || serviceWorkerRegistration?.installing || serviceWorkerRegistration?.active) {
      window.location.reload();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  function handleDismissPwaPrompt() {
    setDeferredInstallPrompt(null);
    setInstallPromptVisible(false);
    setPwaUpdateAvailable(false);
    setPwaStatusMessage("");
  }

  const activeCountries = useMemo(() => {
    if (route.mode !== "home") {
      return [];
    }

    const countries = Array.isArray(state.data?.countries) ? state.data.countries : [];
    return countries.filter(isActiveEntity);
  }, [route.mode, state.data]);

  const activeCities = useMemo(() => {
    if (route.mode !== "home") {
      return [];
    }

    const cities = Array.isArray(state.data?.cities) ? state.data.cities : [];
    return cities.filter(isActiveEntity);
  }, [route.mode, state.data]);

  const homeCitiesByCountry = useMemo(() => {
    const map = new Map();

    for (const city of activeCities) {
      const key = String(city?.country_code || city?.countryCode || "").trim().toUpperCase();
      if (!key) {
        continue;
      }

      const list = map.get(key) || [];
      list.push(city);
      map.set(key, list);
    }

    return map;
  }, [activeCities]);

  const sortedCountries = useMemo(() => {
    return [...activeCountries].sort((a, b) =>
      String(a?.name_ru || a?.name_en || a?.code || "").localeCompare(
        String(b?.name_ru || b?.name_en || b?.code || ""),
        "ru"
      )
    );
  }, [activeCountries]);

  if (config.loading) {
    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar title="TOTEM" subtitle="Мобильная витрина" right={<MobileBadge tone="neutral">загрузка</MobileBadge>} />
          <MobileHero
            eyebrow="TOTEM Mobile"
            title="Мобильная витрина загружается"
            subtitle="Подтягиваем данные стран, городов и доступных разделов."
          />
          <MobileEmptyState
            title="Скоро всё откроется"
            description="Пожалуйста, подождите несколько секунд, пока TOTEM готовит мобильную витрину."
          />
        </div>
      </MobileShell>
    );
  }

  if (config.error) {
    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar title="TOTEM" subtitle="Мобильная витрина" right={<MobileBadge tone="danger">ошибка</MobileBadge>} />
          <MobileHero
            eyebrow="TOTEM Mobile"
            title="Не удалось загрузить мобильную витрину"
            subtitle="Проверьте соединение и попробуйте снова."
          />
          <MobileEmptyState
            title="Мобильная витрина временно недоступна"
            description="Обновите страницу, чтобы попробовать ещё раз."
            action={<MobileButton onClick={() => window.location.reload()}>Обновить</MobileButton>}
          />
        </div>
      </MobileShell>
    );
  }

  if (!mobileV1Enabled) {
    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar title="TOTEM" subtitle="Мобильная витрина" right={<MobileBadge tone="neutral">закрыто</MobileBadge>} />
          <MobileHero
            eyebrow="TOTEM Mobile"
            title="Мобильная витрина скоро появится"
            subtitle="Сейчас раздел открыт только для внутренней проверки."
          />
          <MobileEmptyState
            title="Раздел открыт только для внутренней проверки"
            description="Мы готовим мобильную витрину к запуску. Возвращайтесь чуть позже."
            action={<MobileButton onClick={() => window.location.reload()}>Обновить</MobileButton>}
          />
        </div>
      </MobileShell>
    );
  }

  if (route.mode === "city" && !mobileCityHomeEnabled) {
    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar title="TOTEM" subtitle="Городская витрина" right={<MobileBadge tone="neutral">закрыто</MobileBadge>} />
          <MobileHero
            eyebrow="TOTEM City"
            title="Городская витрина скоро появится"
            subtitle="Сейчас этот город открыт только для внутренней проверки."
          />
          <MobileEmptyState
            title="Городская витрина пока недоступна"
            description="Обновите страницу или вернитесь на главную витрину."
            action={<MobileButton href="#/mobile">На главную</MobileButton>}
          />
        </div>
      </MobileShell>
    );
  }

  async function toggleSalonCatalog(salonSlug) {
    const slug = String(salonSlug || "").trim();
    if (!slug) {
      return;
    }

    const current = catalogBySlug[slug] || {
      expanded: false,
      loading: false,
      error: "",
      data: null,
    };

    if (current.expanded) {
      setCatalogBySlug((prev) => ({
        ...prev,
        [slug]: {
          ...current,
          expanded: false,
        },
      }));
      return;
    }

    if (current.loading) {
      setCatalogBySlug((prev) => ({
        ...prev,
        [slug]: {
          ...current,
          expanded: true,
        },
      }));
      return;
    }

    if (current.data) {
      setCatalogBySlug((prev) => ({
        ...prev,
        [slug]: {
          ...current,
          expanded: true,
          error: "",
        },
      }));
      return;
    }

    setCatalogBySlug((prev) => ({
      ...prev,
      [slug]: {
        ...current,
        expanded: true,
        loading: true,
        error: "",
      },
    }));

    try {
      const catalog = await getMobileSalonCatalog(slug);

      setCatalogBySlug((prev) => {
        const latest = prev[slug] || current;
        return {
          ...prev,
          [slug]: {
            ...latest,
            expanded: Boolean(latest.expanded),
            loading: false,
            error: catalog ? "" : "Каталог временно недоступен.",
            data: catalog,
          },
        };
      });
    } catch (error) {
      setCatalogBySlug((prev) => {
        const latest = prev[slug] || current;
        return {
          ...prev,
          [slug]: {
            ...latest,
            loading: false,
            error: "Каталог временно недоступен.",
          },
        };
      });
    }
  }

  if (state.loading) {
    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar title="TOTEM" subtitle="Мобильный раздел" right={<MobileBadge tone="neutral">загрузка</MobileBadge>} />
          <MobileHero
            eyebrow="TOTEM Mobile"
            title="Загрузка мобильного раздела"
            subtitle="Собираем данные страны и города."
          />
          <MobileEmptyState
            title="Идёт загрузка"
            description="Секундочку, мы уже подгружаем данные мобильного раздела."
          />
        </div>
      </MobileShell>
    );
  }

  if (state.error) {
    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar title="TOTEM" subtitle="Мобильный раздел" right={<MobileBadge tone="danger">ошибка</MobileBadge>} />
          <MobileHero
            eyebrow="TOTEM Mobile"
            title="Не удалось загрузить данные"
            subtitle="Проверьте соединение и попробуйте обновить страницу."
          />
          <MobileEmptyState
            title="Ошибка загрузки"
            description={state.error}
            action={<MobileButton onClick={() => window.location.reload()}>Обновить</MobileButton>}
          />
        </div>
      </MobileShell>
    );
  }

  if (route.mode === "city") {
    const home = state.data;

    if (home?.empty) {
      return (
        <MobileShell>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
            <MobileTopBar title="TOTEM" subtitle="Городская витрина" right={<MobileBadge tone="warning">город не найден</MobileBadge>} />
            <MobileHero
              eyebrow="TOTEM City"
              title="Город не найден"
              subtitle="Проверьте ссылку или вернитесь к списку городов."
            />
            <MobileEmptyState
              title="Город пока не подключён"
              description="Вернитесь на главную витрину и выберите другой город."
              action={<MobileButton href="#/mobile">На главную</MobileButton>}
            />
          </div>
        </MobileShell>
      );
    }

    const salons = Array.isArray(home?.salons) ? home.salons : [];
    const masters = Array.isArray(home?.masters) ? home.masters : [];

    return (
      <CitySurface
        home={home}
        salons={salons}
        masters={masters}
        announcements={announcements}
        onMarkRead={handleNotificationMarkRead}
        markingUid={notificationMarkingUid}
        referral={referral}
        mobilePwaEnabled={mobilePwaEnabled}
        installPromptVisible={installPromptVisible}
        pwaUpdateAvailable={pwaUpdateAvailable}
        pwaStatusMessage={pwaStatusMessage}
        onInstall={handleInstallApp}
        onUpdate={handleReloadForUpdate}
        onDismiss={handleDismissPwaPrompt}
        routeCountryCode={route.countryCode}
        routeCitySlug={route.citySlug}
        catalogBySlug={catalogBySlug}
        onToggleCatalog={toggleSalonCatalog}
      />
    );
  }

  return (
    <HomeSurface
      countries={sortedCountries}
      cities={activeCities}
      homeCitiesByCountry={homeCitiesByCountry}
      announcements={announcements}
      onMarkRead={handleNotificationMarkRead}
      markingUid={notificationMarkingUid}
      referral={referral}
      mobilePwaEnabled={mobilePwaEnabled}
      installPromptVisible={installPromptVisible}
      pwaUpdateAvailable={pwaUpdateAvailable}
      pwaStatusMessage={pwaStatusMessage}
      onInstall={handleInstallApp}
      onUpdate={handleReloadForUpdate}
      onDismiss={handleDismissPwaPrompt}
      helpCountryCode={route.countryCode}
      helpCitySlug={route.citySlug}
    />
  );
}

function EmptyState({ text }) {
  return <MobileEmptyState title={text} description="" style={{ textAlign: "left" }} />;
}

function AnnouncementsBlock({ announcements, onMarkRead, markingUid }) {
  const items = Array.isArray(announcements?.items) ? announcements.items : [];
  const loading = Boolean(announcements?.loading);
  const error = String(announcements?.error || "").trim();
  const disabled = Boolean(announcements?.disabled);
  const unreadCount = items.reduce((count, item) => count + (item?.is_read === true ? 0 : 1), 0);

  return (
    <Card style={premiumPanelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionTitle subtitle="Актуальные сообщения и акционные объявления.">Уведомления</SectionTitle>
        {unreadCount > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 999,
              background: "#ecfdf3",
              color: "#027a48",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Новых: {unreadCount}
          </span>
        ) : null}
      </div>

      {disabled ? (
        <MobileEmptyState
          title="Уведомления скоро появятся"
          description="Сейчас этот блок готовится к запуску."
          style={{ textAlign: "left" }}
        />
      ) : loading ? (
        <MobileEmptyState
          title="Загрузка уведомлений"
          description="Подтягиваем свежие сообщения и объявления."
          style={{ textAlign: "left" }}
        />
      ) : error ? (
        <MobileEmptyState
          title="Не удалось загрузить уведомления"
          description="Обновите страницу и попробуйте ещё раз."
          action={
            <MobileButton onClick={() => window.location.reload()} tone="secondary">
              Обновить
            </MobileButton>
          }
          style={{ textAlign: "left" }}
        />
      ) : items.length ? (
        <div style={gridStyle}>
          {items.map((item) => (
            <AnnouncementItem
              key={item?.notification_uid || item?.id}
              item={item}
              onMarkRead={onMarkRead}
              marking={markingUid === String(item?.notification_uid || "").trim()}
            />
          ))}
        </div>
      ) : (
        <MobileEmptyState
          title="Уведомлений пока нет"
          description="Когда появятся новые сообщения или акции, они сразу отобразятся здесь."
          style={{ textAlign: "left" }}
        />
      )}
    </Card>
  );
}

function ReferralBlock({ referral }) {
  const loading = Boolean(referral?.loading);
  const error = String(referral?.error || "").trim();
  const data = referral?.data || null;
  const enabled = Boolean(data?.enabled);
  const available = Boolean(data?.available);
  const shareUrl = String(data?.share_url || "").trim();
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (!copyStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyStatus("");
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyStatus]);

  async function copyReferralLink() {
    if (!shareUrl || !window.navigator?.clipboard?.writeText) {
      setCopyStatus("Не удалось скопировать ссылку");
      return;
    }

    try {
      await window.navigator.clipboard.writeText(shareUrl);
      setCopyStatus("Ссылка скопирована");
    } catch {
      setCopyStatus("Не удалось скопировать ссылку");
    }
  }

  return (
    <Card style={premiumPanelStyle}>
      <SectionTitle subtitle="Персональная ссылка для приглашения друзей.">Реферальная программа</SectionTitle>

      {loading ? (
        <MobileEmptyState
          title="Загрузка реферальной программы"
          description="Подготавливаем персональную ссылку."
          style={{ textAlign: "left" }}
        />
      ) : error ? (
        <MobileEmptyState
          title="Реферальная программа недоступна"
          description="Скоро здесь появится персональная ссылка."
          style={{ textAlign: "left" }}
        />
      ) : !enabled ? (
        <MobileEmptyState
          title="Реферальная программа недоступна"
          description="Скоро здесь появится персональная ссылка."
          style={{ textAlign: "left" }}
        />
      ) : !available ? (
        <MobileEmptyState
          title="Ссылка пока недоступна"
          description="Проверьте позже, когда программа станет активной."
          style={{ textAlign: "left" }}
        />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
            Скопируйте персональную ссылку и поделитесь ей с друзьями.
          </div>

          <div style={referralUrlBoxStyle}>{shareUrl}</div>

          <button type="button" onClick={copyReferralLink} style={referralCopyButtonStyle}>
            Скопировать реферальную ссылку
          </button>

          {copyStatus ? (
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
              {copyStatus}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function HelpBlock({ countryCode, citySlug }) {
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [dataContactEmail, setDataContactEmail] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [dataStatus, setDataStatus] = useState("");
  const [dataLoading, setDataLoading] = useState(false);

  async function handleFeedbackSubmit(event) {
    event.preventDefault();

    if (feedbackLoading) {
      return;
    }

    setFeedbackLoading(true);
    setFeedbackStatus("");

    trackMobileEvent({
      event_type: "feedback_submit",
      target_type: "feedback",
      country_code: countryCode,
      city_slug: citySlug,
      route: "#/mobile/help",
      session_key: getMobileAnalyticsSessionKey(),
      payload_json: {
        ui: "help_block",
      },
    });

    try {
      const result = await postMobileFeedback({
        message: feedbackMessage,
        country: countryCode,
        city: citySlug,
        source: "mobile",
        payload_json: {
          source: "mobile_help_block",
        },
      });

      if (result?.ok === false) {
        setFeedbackStatus(result?.error ? `Ошибка: ${result.error}` : "Ошибка отправки.");
        return;
      }

      setFeedbackMessage("");
      setFeedbackStatus("Спасибо, обращение отправлено.");
    } catch (error) {
      const errorCode = String(error?.message || "").trim();
      setFeedbackStatus(errorCode ? `Ошибка: ${errorCode}` : "Ошибка отправки.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function handleDataRequestSubmit(event) {
    event.preventDefault();

    if (dataLoading) {
      return;
    }

    setDataLoading(true);
    setDataStatus("");

    trackMobileEvent({
      event_type: "data_request_submit",
      target_type: "data_request",
      country_code: countryCode,
      city_slug: citySlug,
      route: "#/mobile/help",
      session_key: getMobileAnalyticsSessionKey(),
      payload_json: {
        ui: "help_block",
      },
    });

    try {
      const result = await postMobileDataRequest({
        request_type: "data_access",
        contact_email: dataContactEmail,
        message: dataMessage,
        country: countryCode,
        city: citySlug,
        source: "mobile",
        payload_json: {
          source: "mobile_help_block",
        },
      });

      if (result?.ok === false) {
        setDataStatus(result?.error ? `Ошибка: ${result.error}` : "Ошибка отправки.");
        return;
      }

      setDataContactEmail("");
      setDataMessage("");
      setDataStatus("Запрос отправлен.");
    } catch (error) {
      const errorCode = String(error?.message || "").trim();
      setDataStatus(errorCode ? `Ошибка: ${errorCode}` : "Ошибка отправки.");
    } finally {
      setDataLoading(false);
    }
  }

  return (
    <Card style={premiumPanelStyle}>
      <SectionTitle subtitle="Дополнительные способы связи, версии и юридической информации.">Помощь, версия и документы</SectionTitle>

      <div style={helpGridStyle}>
        <div style={helpItemStyle}>
          <div style={helpItemTitleStyle}>Поддержка</div>
          <div style={helpItemTextStyle}>Напишите нам: kantotemus@gmail.com</div>
        </div>

        <div style={helpItemStyle}>
          <div style={helpItemTitleStyle}>Как записаться</div>
          <div style={helpItemTextStyle}>Выберите город, салон и нажмите "Записаться в салон".</div>
        </div>

        <div style={helpItemStyle}>
          <div style={helpItemTitleStyle}>О приложении</div>
          <div style={helpItemTextStyle}>TOTEM Mobile V1, версия 1.0.0.</div>
        </div>

          <div style={helpItemStyle}>
            <div style={helpItemTitleStyle}>Политика конфиденциальности</div>
            <div style={helpItemTextStyle}>
              Мы используем данные, которые вы вводите в TOTEM, для записи к салонам и мастерам, работы
              уведомлений, обратной связи и обработки запросов по данным. Не публикуйте в сообщениях лишние
              персональные данные.
            </div>
          </div>

          <div style={helpItemStyle}>
            <div style={helpItemTitleStyle}>Условия использования</div>
            <div style={helpItemTextStyle}>
              Используя TOTEM Mobile, вы соглашаетесь указывать корректные данные для записи и не использовать
              сервис для спама, ложных заявок или действий, нарушающих работу салонов, мастеров и платформы.
            </div>
          </div>

        <div style={helpFormCardStyle}>
          <div style={helpFormTitleStyle}>Обратная связь</div>
          <form onSubmit={handleFeedbackSubmit} style={helpFormGridStyle}>
            <label style={helpFieldStyle}>
              <span style={helpLabelStyle}>Сообщение</span>
              <textarea
                name="feedback_message"
                aria-label="Сообщение для обратной связи"
                value={feedbackMessage}
                onChange={(event) => setFeedbackMessage(event.target.value)}
                disabled={feedbackLoading}
                rows={4}
                required
                style={helpTextareaStyle}
                placeholder="Напишите, что важно исправить или улучшить"
              />
            </label>

            <button type="submit" disabled={feedbackLoading} style={helpSubmitButtonStyle}>
              {feedbackLoading ? "Отправляем…" : "Отправить обращение"}
            </button>

            {feedbackStatus ? <div style={helpStatusStyle}>{feedbackStatus}</div> : null}
          </form>
        </div>

        <div style={helpFormCardStyle}>
          <div style={helpFormTitleStyle}>Запрос по данным</div>
          <div style={{ marginBottom: 12, fontSize: 14, lineHeight: 1.5, color: "#4b5563" }}>
            Через эту форму можно запросить доступ, исправление или удаление данных, связанных с вашими
            обращениями и записями.
          </div>
          <form onSubmit={handleDataRequestSubmit} style={helpFormGridStyle}>
            <label style={helpFieldStyle}>
              <span style={helpLabelStyle}>Email для ответа</span>
              <input
                type="email"
                name="data_contact_email"
                aria-label="Email для ответа"
                value={dataContactEmail}
                onChange={(event) => setDataContactEmail(event.target.value)}
                disabled={dataLoading}
                required
                style={helpInputStyle}
                placeholder="email@example.com"
              />
            </label>

            <label style={helpFieldStyle}>
              <span style={helpLabelStyle}>Сообщение</span>
              <textarea
                name="data_request_message"
                aria-label="Сообщение для запроса по данным"
                value={dataMessage}
                onChange={(event) => setDataMessage(event.target.value)}
                disabled={dataLoading}
                rows={4}
                required
                style={helpTextareaStyle}
                placeholder="Например: прошу удалить мои данные или прислать информацию, связанную с моими обращениями."
              />
            </label>

            <button type="submit" disabled={dataLoading} style={helpSubmitButtonStyle}>
              {dataLoading ? "Отправляем…" : "Отправить запрос"}
            </button>

            {dataStatus ? <div style={helpStatusStyle}>{dataStatus}</div> : null}
          </form>
        </div>
      </div>
    </Card>
  );
}

function PwaPromptBlock({
  mobilePwaEnabled,
  installPromptVisible,
  pwaUpdateAvailable,
  pwaStatusMessage,
  onInstall,
  onUpdate,
  onDismiss,
}) {
  if (
    !mobilePwaEnabled ||
    (!installPromptVisible && !pwaUpdateAvailable && !pwaStatusMessage)
  ) {
    return null;
  }

  return (
    <PremiumCard
      title="Приложение TOTEM"
      subtitle="Установка и обновление мобильной витрины."
      style={{
        borderColor: "rgba(191,219,254,0.95)",
        background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
        boxShadow: "0 16px 40px rgba(15,23,42,0.07)",
      }}
    >

      <div style={{ display: "grid", gap: 12 }}>
        {installPromptVisible ? (
          <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
            Можно добавить TOTEM на главный экран и открывать как приложение.
          </div>
        ) : null}

        {pwaUpdateAvailable ? (
          <div style={{ fontSize: 14, color: "#1d4ed8", lineHeight: 1.55 }}>
            Доступно обновление мобильной витрины.
          </div>
        ) : null}

        {pwaStatusMessage ? (
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
            {pwaStatusMessage}
          </div>
        ) : null}

        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
          Уведомления через браузер пока недоступны.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {installPromptVisible ? (
            <button
              type="button"
              onClick={onInstall}
              style={{
                border: "none",
                borderRadius: 12,
                background: "#111827",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Установить приложение
            </button>
          ) : null}

          {pwaUpdateAvailable ? (
            <button
              type="button"
              onClick={onUpdate}
              style={{
                border: "1px solid #1d4ed8",
                borderRadius: 12,
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 14,
                fontWeight: 800,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Обновить приложение
            </button>
          ) : null}

          <button
            type="button"
            onClick={onDismiss}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 12,
              background: "#fff",
              color: "#374151",
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Скрыть
          </button>
        </div>
      </div>
    </PremiumCard>
  );
}

function AnnouncementItem({ item, onMarkRead, marking }) {
  const actionUrl = String(item?.action_url || "").trim();
  const actionType = String(item?.action_type || "").trim();
  const isRead = Boolean(item?.is_read);
  const readAt = String(item?.read_at || "").trim();
  const hasAction = Boolean(actionUrl);
  const isExternal = /^https?:\/\//i.test(actionUrl);
  const notificationUid = String(item?.notification_uid || "").trim();

  return (
    <div style={announcementItemStyle}>
      <div style={announcementTitleStyle}>{formatLabel(item?.title_ru || item?.title_en, "Уведомление")}</div>
      <div style={announcementBodyStyle}>{formatLabel(item?.body_ru || item?.body_en, "")}</div>
      <div style={announcementMetaStyle}>
        <span>Приоритет: {formatLabel(item?.priority, "—")}</span>
        {actionType ? <span>Тип: {formatLabel(actionType)}</span> : null}
        {isRead ? <span>Прочитано</span> : <span>Не прочитано</span>}
        {readAt ? <span>Прочитано: {formatLabel(readAt)}</span> : null}
        {item?.created_at ? <span>Опубликовано: {formatLabel(item?.created_at)}</span> : null}
      </div>
      {hasAction ? (
        <div style={{ marginTop: 10 }}>
          <a
            href={actionUrl}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            style={announcementActionStyle}
          >
            Подробнее
          </a>
        </div>
      ) : null}
      {!isRead && notificationUid && typeof onMarkRead === "function" ? (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => onMarkRead(item)}
            disabled={marking}
            style={{
              ...secondaryLinkStyle,
              appearance: "none",
              cursor: "pointer",
            }}
          >
            {marking ? "Отмечаем…" : "Отметить прочитанным"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SalonCard({ salon, catalogState, onToggleCatalog, countryCode, citySlug }) {
  const slug = String(salon?.slug || "").trim();
  const bookingUrl = slug ? buildPublicBookingUrl(slug) : "";
  const catalogOpen = Boolean(catalogState?.expanded);
  const catalogLoading = Boolean(catalogState?.loading);
  const catalogError = String(catalogState?.error || "").trim();
  const catalogData = catalogState?.data || null;
  const masters = Array.isArray(catalogData?.masters) ? catalogData.masters : [];
  const services = Array.isArray(catalogData?.services) ? catalogData.services : [];
  const [bookingStatus, setBookingStatus] = useState("");

  useEffect(() => {
    if (!bookingStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBookingStatus("");
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bookingStatus]);

  async function copyBookingLink() {
    if (!bookingUrl || !window.navigator?.clipboard?.writeText) {
      setBookingStatus("Не удалось скопировать ссылку");
      return;
    }

    try {
      await window.navigator.clipboard.writeText(bookingUrl);
      setBookingStatus("Ссылка скопирована");
    } catch {
      setBookingStatus("Не удалось скопировать ссылку");
    }
  }

  async function shareBookingLink() {
    if (!bookingUrl) {
      setBookingStatus("Ссылка недоступна");
      return;
    }

    if (window.navigator?.share) {
      try {
        await window.navigator.share({
          title: formatLabel(salon?.name, "Запись в салон"),
          text: "Запись в салон",
          url: bookingUrl,
        });
        setBookingStatus("Ссылка отправлена");
        return;
      } catch {
        setBookingStatus("Не удалось поделиться ссылкой");
        return;
      }
    }

    await copyBookingLink();
  }

  return (
    <Card style={{ padding: 14, borderRadius: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
        {formatLabel(salon?.name)}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
        @{formatLabel(slug)} · {formatLabel(salon?.city, "город не указан")}
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <EntityBadge>enabled: {String(Boolean(salon?.enabled))}</EntityBadge>
        {salon?.status ? <EntityBadge>{formatLabel(salon.status)}</EntityBadge> : null}
      </div>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a
          href={buildAbsoluteOwnerUrl(`/salon/${encodeURIComponent(slug)}`)}
          style={secondaryLinkStyle}
        >
          Открыть салон
        </a>
          <a
            href={buildMobileBookingHref(slug)}
            onClick={() => trackMobileEvent({
              event_type: "booking_entry_open",
              target_type: "booking",
            owner_type: "salon",
            owner_slug: slug,
            country_code: countryCode,
            city_slug: citySlug,
            route: "#/booking",
            session_key: getMobileAnalyticsSessionKey(),
            payload_json: {
              entry: "salon_card",
            },
          })}
          style={primaryLinkStyle}
        >
          Записаться в салон
        </a>
      </div>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={() => onToggleCatalog(slug)} style={catalogButtonStyle}>
          {catalogOpen ? "Скрыть каталог" : "Показать каталог"}
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={copyBookingLink} style={{ ...secondaryLinkStyle, cursor: "pointer", appearance: "none" }}>
          Скопировать ссылку записи
        </button>
        <button type="button" onClick={shareBookingLink} style={{ ...secondaryLinkStyle, cursor: "pointer", appearance: "none" }}>
          Поделиться
        </button>
      </div>

      {bookingStatus ? (
        <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
          {bookingStatus}
        </div>
      ) : null}

      {catalogOpen && catalogLoading ? (
        <MobileEmptyState
          title="Загрузка каталога"
          description="Подтягиваем услуги и мастеров этого салона."
          style={{ marginTop: 12, textAlign: "left" }}
        />
      ) : null}

      {catalogOpen && catalogError ? (
        <MobileEmptyState
          title="Каталог временно недоступен"
          description="Попробуйте открыть каталог ещё раз чуть позже."
          style={{ marginTop: 12, textAlign: "left" }}
        />
      ) : null}

      {catalogOpen && catalogData ? (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div>
            <div style={catalogSectionTitleStyle}>Услуги</div>
            {services.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {services.map((service, index) => (
                  <div key={`service-${slug}-${service.service_pk || index}`} style={catalogItemStyle}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>
                      {formatLabel(service?.name, "Услуга")}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563", lineHeight: 1.45 }}>
                      Цена: {formatLabel(service?.price, "—")} · Длительность:{" "}
                      {formatLabel(service?.duration_min, "—")} мин · Активна:{" "}
                      {String(Boolean(service?.active))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MobileEmptyState
                title="Услуги пока не опубликованы"
                description="Когда салон добавит услуги, они появятся здесь."
                style={{ marginTop: 8, textAlign: "left" }}
              />
            )}
          </div>

          <div>
            <div style={catalogSectionTitleStyle}>Мастера</div>
            {masters.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {masters.map((master) => (
                  <div key={`master-${slug}-${master.id}`} style={catalogItemStyle}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>
                      {formatLabel(master?.name, "Мастер")}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563", lineHeight: 1.45 }}>
                      @{formatLabel(master?.slug, "slug не указан")} · Активен:{" "}
                      {String(Boolean(master?.active))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MobileEmptyState
                title="Мастера пока не опубликованы"
                description="Когда появятся доступные мастера, они отобразятся здесь."
                style={{ marginTop: 8, textAlign: "left" }}
              />
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function HomeSurface({
  countries,
  cities,
  homeCitiesByCountry,
  announcements,
  onMarkRead,
  markingUid,
  referral,
  mobilePwaEnabled,
  installPromptVisible,
  pwaUpdateAvailable,
  pwaStatusMessage,
  onInstall,
  onUpdate,
  onDismiss,
  helpCountryCode,
  helpCitySlug,
}) {
  const featuredLocation = useMemo(() => {
    for (const country of countries) {
      const countryCode = String(country?.code || "").trim().toUpperCase();
      if (!countryCode) {
        continue;
      }

      const countryCities = homeCitiesByCountry.get(countryCode) || [];

      if (countryCities.length) {
        return {
          country,
          city: countryCities[0],
        };
      }
    }

    if (countries.length && cities.length) {
      return {
        country: countries[0],
        city: cities[0],
      };
    }

    return null;
  }, [cities, countries, homeCitiesByCountry]);

  const featuredCountryCode = String(featuredLocation?.country?.code || "").trim().toUpperCase();
  const featuredCitySlug = String(featuredLocation?.city?.slug || "").trim().toLowerCase();
  const featuredCountryName = formatLabel(
    featuredLocation?.country?.name_ru || featuredLocation?.country?.name_en || featuredCountryCode
  );
  const featuredCityName = formatLabel(
    featuredLocation?.city?.name_ru || featuredLocation?.city?.name_en || featuredCitySlug
  );
  const featuredLocationLabel = featuredLocation
    ? `${featuredCountryName} · ${featuredCityName}`
    : "Выберите город и начните запись";
  const featuredCityHref = featuredLocation?.city
    ? buildMobileCityHref(featuredCountryCode, featuredCitySlug)
    : "#cities";
  const totalAnnouncements = Array.isArray(announcements?.items) ? announcements.items.length : 0;
  const unreadAnnouncements = Array.isArray(announcements?.items)
    ? announcements.items.reduce((count, item) => count + (item?.is_read === true ? 0 : 1), 0)
    : 0;
  const cityNavHref = featuredLocation?.city ? featuredCityHref : "#cities";
  const homeCategoryItems = [
    { key: "all", label: "Все" },
    { key: "hair", label: "Волосы" },
    { key: "nails", label: "Ногти" },
    { key: "brows", label: "Брови" },
    { key: "makeup", label: "Макияж" },
    { key: "spa", label: "SPA" },
  ];
  const ownerEntryHref = "#owner-entry";
  const masterLoginHref = "https://app.totemv.com/#/auth/login?role=master";
  const salonLoginHref = "https://app.totemv.com/#/auth/login?role=salon_admin";
  const totalNotifications = totalAnnouncements;
  const pwaStatusLabel = mobilePwaEnabled
    ? pwaUpdateAvailable
      ? "Есть обновление"
      : installPromptVisible
      ? "Готова к установке"
      : "Готово"
    : "Веб-режим";
  const pwaStatusNote = pwaStatusMessage || "Мобильная витрина";
  const quickActions = [
    {
      key: "find-salon",
      title: "Найти салон",
      subtitle: "Подключённые салоны рядом",
      href: cityNavHref,
      accent: "S",
    },
    {
      key: "find-master",
      title: "Найти мастера",
      subtitle: "Специалисты в вашем городе",
      href: cityNavHref,
      accent: "M",
    },
    {
      key: "choose-service",
      title: "Выбрать услугу",
      subtitle: "Быстро открыть каталог",
      href: cityNavHref,
      accent: "U",
    },
    {
      key: "my-bookings",
      title: "Мои записи",
      subtitle: "Открыть раздел записей",
      href: "#booking",
      accent: "B",
    },
  ];

  return (
    <TotemAppFrame style={appPageStyle}>
      <div style={appStackStyle}>
        <TotemHeader
          title="TOTEM"
          location={featuredLocation ? `${featuredCityName} / ${featuredCountryCode}` : "Выберите город"}
          status="мобильная витрина"
          style={topChromeStyle}
          right={
            <MobileButton tone="secondary" href="#notifications">
              Уведомления
            </MobileButton>
          }
        />

        <TotemHeroBanner
          eyebrow="TOTEM Mobile"
          title="TOTEM — запись и управление beauty-сервисами"
          subtitle="Клиенты находят салон и бронируют время. Мастера и салоны управляют записями, календарём и финансами."
          style={premiumHeroStyle}
          highlights={
            <>
              <MobileBadge tone="primary">Клиентам</MobileBadge>
              <MobileBadge tone="accent">Мастерам</MobileBadge>
              <MobileBadge tone="success">Салонам</MobileBadge>
            </>
          }
          actions={
            <>
              <MobileButton href={cityNavHref}>Записаться сейчас</MobileButton>
              <MobileButton tone="secondary" href={ownerEntryHref}>
                Я мастер или салон
              </MobileButton>
            </>
          }
        />

        <PremiumSection title="Кому подходит TOTEM" subtitle="Одна мобильная витрина для клиентов, мастеров и салонов.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <PremiumCard
              title="Клиентам"
              subtitle="Поиск, запись, уведомления и история визитов."
              actions={
                <>
                  <MobileBadge tone="primary">Запись</MobileBadge>
                  <MobileBadge tone="success">Напоминания</MobileBadge>
                </>
              }
            />
            <PremiumCard
              title="Мастерам"
              subtitle="Календарь, записи, доход и быстрый вывод средств."
              actions={
                <>
                  <MobileBadge tone="accent">Календарь</MobileBadge>
                  <MobileBadge tone="warning">Доход</MobileBadge>
                </>
              }
            />
            <PremiumCard
              title="Салонам"
              subtitle="Команда, расписание, финансы и отчёты без лишней навигации."
              actions={
                <>
                  <MobileBadge tone="neutral">Команда</MobileBadge>
                  <MobileBadge tone="primary">Отчёты</MobileBadge>
                </>
              }
            />
          </div>
        </PremiumSection>

        <div id="search">
          <PremiumSection title="Найти" subtitle="Салон, мастер или услуга.">
            <TotemSearchBar
              placeholder="Салон, мастер или услуга"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            />
          </PremiumSection>
        </div>

        <div id="categories">
          <PremiumSection
            title="Категории"
            subtitle="Быстрый вход в популярные категории без фильтрации данных."
            action={<MobilePill tone="neutral">{homeCategoryItems.length} категорий</MobilePill>}
          >
            <TotemCategoryRail items={homeCategoryItems} activeKey="all" />
          </PremiumSection>
        </div>

        <div id="quick-actions">
          <PremiumSection title="Быстрые действия" subtitle="Главные переходы в один тап.">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {quickActions.map((item) => (
                <PremiumCard
                  key={item.key}
                  title={item.title}
                  subtitle={item.subtitle}
                  footer={<MobileButton href={item.href}>Открыть</MobileButton>}
                  actions={
                    <MobileBadge tone="primary" style={{ width: 32, height: 32, padding: 0, justifyContent: "center" }}>
                      {item.accent}
                    </MobileBadge>
                  }
                />
              ))}
            </div>
          </PremiumSection>
        </div>

        <PremiumSection title="Свободные окна сегодня" subtitle="Быстрый взгляд на доступность и переход к записи.">
          <PremiumCard
            title="Посмотреть ближайшие окна"
            subtitle="Откройте городскую витрину и выберите удобное время."
            actions={
              <>
                <MobileBadge tone="success">Сегодня</MobileBadge>
                <MobileBadge tone="accent">Подключённые города</MobileBadge>
              </>
            }
            footer={
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <MobileButton href={cityNavHref}>Смотреть рядом</MobileButton>
                <MobileButton tone="secondary" href="#booking">
                  К записи
                </MobileButton>
              </div>
            }
          />
        </PremiumSection>

        <PremiumSection title="Сегодня в TOTEM" subtitle="Короткий обзор доступного прямо сейчас.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <PremiumStatCard label="Страны" value={countries.length} note="Активные направления" tone="primary" />
            <PremiumStatCard label="Города" value={cities.length} note="Готовы к записи" tone="success" />
            <PremiumStatCard label="Сообщения" value={totalNotifications} note={unreadAnnouncements > 0 ? `Новых: ${unreadAnnouncements}` : "Все прочитано"} tone="warning" />
            <PremiumStatCard label="Витрина" value={pwaStatusLabel} note={pwaStatusNote} tone="accent" />
          </div>
        </PremiumSection>

        <PremiumSection
          title="Навигация в приложении"
          subtitle="Preview клиентского и owner-потока без смены маршрутов."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <PremiumCard
              title="Клиентский nav"
              subtitle="Главная → Поиск → Записи → Профиль"
              actions={
                <>
                  <MobilePill tone="primary">Главная</MobilePill>
                  <MobilePill tone="neutral">Поиск</MobilePill>
                  <MobilePill tone="neutral">Записи</MobilePill>
                  <MobilePill tone="neutral">Профиль</MobilePill>
                </>
              }
            />
            <PremiumCard
              title="Owner nav"
              subtitle="Главная → Календарь → Записи → Финансы → Ещё"
              actions={
                <>
                  <MobilePill tone="primary">Главная</MobilePill>
                  <MobilePill tone="neutral">Календарь</MobilePill>
                  <MobilePill tone="neutral">Записи</MobilePill>
                  <MobilePill tone="neutral">Финансы</MobilePill>
                  <MobilePill tone="neutral">Ещё</MobilePill>
                </>
              }
            />
          </div>
        </PremiumSection>

        <div id="owner-entry">
          <PremiumSection title="Для мастеров и салонов" subtitle="Календарь, записи, финансы и отчёты в одном месте.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <PremiumCard title="Календарь" subtitle="Планирование визитов и слотов" footer={<MobileButton href={ownerEntryHref}>Открыть кабинет</MobileButton>} />
            <PremiumCard title="Записи" subtitle="Список и статусы записей" footer={<MobileButton href={ownerEntryHref}>Открыть кабинет</MobileButton>} />
            <PremiumCard title="Финансы" subtitle="Деньги и выплаты" footer={<MobileButton href={ownerEntryHref}>Открыть кабинет</MobileButton>} />
            <PremiumCard title="Отчёты" subtitle="Динамика и статистика" footer={<MobileButton href={ownerEntryHref}>Открыть кабинет</MobileButton>} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
            <MobileButton href={masterLoginHref}>Войти как мастер</MobileButton>
            <MobileButton tone="secondary" href={salonLoginHref}>
              Войти как салон
            </MobileButton>
          </div>
          </PremiumSection>
        </div>

        <PremiumSection title="Доверие и удобство" subtitle="Онлайн-запись, календарь, финансы и уведомления.">
          <TotemTrustStrip
            items={[
              { label: "Онлайн-запись", tone: "primary" },
              { label: "Календарь", tone: "accent" },
              { label: "Финансы", tone: "success" },
              { label: "Уведомления", tone: "warning" },
            ]}
          />
        </PremiumSection>

        <div id="cities">
          <PremiumSection
            title="Популярное рядом"
            subtitle="Города и направления, которые уже подключены к TOTEM."
            action={<MobilePill tone="primary">{cities.length} городов</MobilePill>}
          >
            {cities.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {cities.map((city) => {
                const countryCode = String(city?.country_code || "").trim().toUpperCase();
                const citySlug = String(city?.slug || "").trim().toLowerCase();
                const cityName = formatLabel(city?.name_ru || city?.name_en || citySlug);
                const cityHref = buildMobileCityHref(countryCode, citySlug);
                const initials = String(cityName || citySlug || countryCode || "C")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase();

                return (
                  <PremiumCard
                    key={`home-city-${countryCode}-${citySlug}`}
                    eyebrow="Город"
                    title={cityName}
                    subtitle={`${countryCode} · ${formatLabel(city?.timezone, "timezone не указан")}`}
                    actions={
                      <>
                        <MobileBadge tone="primary">{initials || "TO"}</MobileBadge>
                        <MobileBadge tone="neutral">{countryCode}</MobileBadge>
                        <MobileBadge tone="success">{formatLabel(city?.timezone, "timezone не указан")}</MobileBadge>
                      </>
                    }
                    footer={
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.55, color: "#64748B" }}>
                          Откройте городскую витрину, чтобы посмотреть салоны и мастеров рядом.
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                          <MobileButton href={cityHref}>Открыть город</MobileButton>
                          <MobileButton tone="secondary" href={cityHref}>
                            Открыть каталог
                          </MobileButton>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <MobileEmptyState
              title="Города пока не загружены"
              description="После подключения данных здесь появятся активные города для записи."
            />
          )}
          </PremiumSection>
        </div>

        <PremiumSection
          title="Активные страны"
          subtitle="Выберите страну, чтобы открыть доступные города и запись."
          action={<MobilePill tone="primary">{countries.length} стран</MobilePill>}
        >
            {countries.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {countries.map((country) => {
                  const countryCode = String(country?.code || "").trim().toUpperCase();
                  const countryName = formatLabel(country?.name_ru || country?.name_en || countryCode);
                  const countryCities = homeCitiesByCountry.get(countryCode) || [];
                  const firstCity = countryCities[0] || null;
                  const firstCitySlug = String(firstCity?.slug || "").trim().toLowerCase();
                  const countryCityHref = firstCity
                    ? buildMobileCityHref(countryCode, firstCitySlug)
                    : "#cities";

                  return (
                    <PremiumCard
                      key={`home-country-${countryCode}`}
                      title={countryName}
                      subtitle={`${countryCode} · ${countryCities.length} городов`}
                      footer={
                        <div style={{ display: "grid", gap: 12 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <MobilePill tone="primary">{countryCode}</MobilePill>
                            <MobilePill tone="neutral">{countryCities.length} городов</MobilePill>
                          </div>
                          {countryCities.length ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {countryCities.slice(0, 4).map((city) => {
                                const citySlug = String(city?.slug || "").trim().toLowerCase();
                                const cityName = formatLabel(city?.name_ru || city?.name_en || citySlug);
                                return (
                                  <MobilePill key={`home-country-city-${countryCode}-${citySlug}`} tone="neutral">
                                    {cityName}
                                  </MobilePill>
                                );
                              })}
                            </div>
                          ) : (
                            <MobileEmptyState
                              title="Города пока не подключены"
                              description="Когда данные появятся, они сразу отобразятся в этом блоке."
                              style={{ textAlign: "left", padding: 14 }}
                            />
                          )}
                          {firstCity ? (
                            <MobileButton tone="secondary" href={countryCityHref}>
                              Открыть город
                            </MobileButton>
                          ) : null}
                        </div>
                      }
                    />
                  );
                })}
              </div>
            ) : (
                <MobileEmptyState
                  title="Страны пока не загружены"
                  description="Как только мобильная витрина получит данные, здесь появятся активные страны и города."
                />
            )}
        </PremiumSection>

        <div id="booking">
          <PremiumSection
            title="Быстрая запись"
            subtitle="Если хотите сразу открыть запись, используйте публичный маршрут."
          >
            <PremiumCard
              title="Открыть запись"
              subtitle="Переход в публичную запись TOTEM для быстрого старта."
              footer={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <MobileButton href={cityNavHref}>Открыть запись</MobileButton>
                  <MobileButton tone="secondary" href={cityNavHref}>
                    Сначала выбрать город
                  </MobileButton>
                </div>
              }
            >
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
                Откройте запись в пару касаний. Сначала можно выбрать город, а затем перейти к публичной записи салона.
              </div>
            </PremiumCard>
          </PremiumSection>
        </div>

        <div id="notifications">
          <AnnouncementsBlock announcements={announcements} onMarkRead={onMarkRead} markingUid={markingUid} />
        </div>

        <ReferralBlock referral={referral} />

        <div id="help">
          <HelpBlock countryCode={helpCountryCode} citySlug={helpCitySlug} />
        </div>

        <PwaPromptBlock
          mobilePwaEnabled={mobilePwaEnabled}
          installPromptVisible={installPromptVisible}
          pwaUpdateAvailable={pwaUpdateAvailable}
          pwaStatusMessage={pwaStatusMessage}
          onInstall={onInstall}
          onUpdate={onUpdate}
          onDismiss={onDismiss}
        />

        <TotemBottomTabs
          style={{ marginTop: 2 }}
          items={[
            { key: "home", label: "Главная", href: "#/mobile" },
            { key: "search", label: "Поиск", href: "#search" },
            { key: "booking", label: "Записи", href: "#booking" },
            { key: "profile", label: "Профиль", href: "#help" },
          ]}
          activeKey="home"
        />
      </div>
    </TotemAppFrame>
  );
}

function CitySurface({
  home,
  salons,
  masters,
  announcements,
  onMarkRead,
  markingUid,
  referral,
  mobilePwaEnabled,
  installPromptVisible,
  pwaUpdateAvailable,
  pwaStatusMessage,
  onInstall,
  onUpdate,
  onDismiss,
  routeCountryCode,
  routeCitySlug,
  catalogBySlug,
  onToggleCatalog,
}) {
  const countryCode = String(home?.country?.code || routeCountryCode || "").trim().toUpperCase();
  const citySlug = String(home?.city?.slug || routeCitySlug || "").trim().toLowerCase();
  const cityName = formatLabel(home?.city?.name_ru || home?.city?.name_en || "Город");
  const countryName = formatLabel(home?.country?.name_ru || home?.country?.name_en || "Страна");
  const cityHref = buildMobileCityHref(countryCode, citySlug);
  const cityBookingHref = (slug) => buildMobileBookingHref(slug);
  const cityFilterItems = [
    { key: "all", label: "Все" },
    { key: "salons", label: "Салоны" },
    { key: "masters", label: "Мастера" },
    { key: "services", label: "Услуги" },
  ];

  return (
    <MobileShell style={appPageStyle}>
      <div style={cityStackStyle}>
        <MobileTopBar
          title="TOTEM"
          subtitle={`${cityName} / ${countryCode}`}
          style={topChromeStyle}
          right={<MobileBadge tone="primary">городская витрина</MobileBadge>}
        />

        <MobileHero
          eyebrow="TOTEM City"
          title={`${cityName} — выберите салон, мастера или услугу`}
          subtitle={`${countryName} · ${formatLabel(home?.city?.timezone || home?.country?.timezone || "Без часового пояса")}`}
          style={premiumHeroStyle}
          actions={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <MobileButton href="#salons">Найти салон</MobileButton>
              <MobileButton tone="secondary" href="#/mobile">
                На главную
              </MobileButton>
            </div>
          }
        />

        <div id="search">
          <PremiumSection title="Поиск" subtitle="Салон, мастер или услуга.">
            <TotemSearchBar
              placeholder="Салон, мастер или услуга"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            />
          </PremiumSection>
        </div>

        <PremiumSection title="Фильтры" subtitle="Быстрый вход в каталог без новой логики.">
          <TotemCategoryRail items={cityFilterItems} activeKey="all" />
        </PremiumSection>

        <PremiumSection title="В городе доступно" subtitle="Короткая сводка по текущей городской витрине.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            <PremiumStatCard label="Салоны" value={salons.length} note="Готовы к записи" tone="primary" />
            <PremiumStatCard label="Мастера" value={masters.length} note="Доступные специалисты" tone="success" />
            <PremiumStatCard
              label="Регион"
              value={countryCode || "—"}
              note={formatLabel(home?.city?.timezone || home?.country?.timezone || "timezone не указан")}
              tone="warning"
            />
          </div>
        </PremiumSection>

        <div id="booking-entry">
          <PremiumSection title="Быстрый путь к записи" subtitle="Один короткий шаг до записи.">
            <PremiumCard title="Выберите карточку и нажмите «Записаться»." subtitle="После этого откроется публичная запись выбранного салона." />
          </PremiumSection>
        </div>

        <div id="salons">
          <PremiumSection title="Салоны" subtitle="Выберите салон и перейдите к записи.">
            {salons.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {salons.map((salon) => {
                  const slug = String(salon?.slug || "").trim();
                  const salonCatalogState = catalogBySlug[slug] || null;
                  const openSalonHref = buildAbsoluteOwnerUrl(`/salon/${encodeURIComponent(slug)}`);
                  const bookingLinkHref = cityBookingHref(slug);

                  return (
                    <PremiumCard
                      key={`city-salon-${salon.id}`}
                      eyebrow="Салон"
                      title={formatLabel(salon?.name, "Салон")}
                      subtitle={formatLabel(salon?.city, cityName)}
                      footer={
                        <div style={{ display: "grid", gap: 10 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <MobilePill tone="primary">{formatLabel(salon?.city, cityName)}</MobilePill>
                            <MobileBadge tone={salon?.enabled ? "success" : "neutral"}>
                              {salon?.enabled ? "Активен" : "Неактивен"}
                            </MobileBadge>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            <MobileButton
                              href={bookingLinkHref}
                              onClick={() => {
                                trackMobileEvent({
                                  event_type: "booking_entry_open",
                                  target_type: "booking",
                                  owner_type: "salon",
                                  owner_slug: slug,
                                  country_code: routeCountryCode,
                                  city_slug: routeCitySlug,
                                  route: "#/booking",
                                  session_key: getMobileAnalyticsSessionKey(),
                                  payload_json: {
                                    entry: "salon_card",
                                  },
                                });
                                window.location.hash = bookingLinkHref;
                              }}
                            >
                              Записаться
                            </MobileButton>
                            <MobileButton tone="secondary" href={openSalonHref}>
                              Открыть салон
                            </MobileButton>
                            <MobileButton tone="soft" onClick={() => onToggleCatalog(slug)}>
                              Каталог
                            </MobileButton>
                            <MobileButton
                              tone="secondary"
                              onClick={async () => {
                                const bookingUrl = buildPublicBookingUrl(slug);
                                try {
                                  if (window.navigator?.clipboard?.writeText) {
                                    await window.navigator.clipboard.writeText(bookingUrl);
                                  }
                                } catch {
                                  /* no-op */
                                }
                              }}
                            >
                              Скопировать ссылку
                            </MobileButton>
                          </div>
                        </div>
                      }
                    >
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <MobilePill tone="neutral">город: {cityName}</MobilePill>
                        </div>
                        <SalonCard
                          salon={salon}
                          catalogState={salonCatalogState}
                          onToggleCatalog={onToggleCatalog}
                          countryCode={routeCountryCode}
                          citySlug={routeCitySlug}
                        />
                      </div>
                    </PremiumCard>
                  );
                })}
              </div>
            ) : (
              <MobileEmptyState
                title="Салоны пока не загружены"
                description="Когда данные появятся, здесь будут красивые карточки салонов с записью и каталогом."
              />
            )}
          </PremiumSection>
        </div>

        <PremiumSection title="Мастера" subtitle="Дружелюбные карточки специалистов в этом городе.">
          {masters.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {masters.map((master) => (
                <PremiumCard
                  key={`city-master-${master.id}`}
                  eyebrow="Мастер"
                  title={formatLabel(master.name)}
                  subtitle={cityName}
                  footer={
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <MobileButton
                        href={buildAbsoluteOwnerUrl(`/master/${encodeURIComponent(String(master.slug || "").trim())}`)}
                      >
                        Открыть мастера
                      </MobileButton>
                      <MobileButton tone="secondary" href="#salons">
                        К салонам
                      </MobileButton>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <MobileEmptyState
              title="Мастера пока не загружены"
              description="Когда в городе появятся активные мастера, они будут показаны здесь."
            />
          )}
        </PremiumSection>

        <AnnouncementsBlock
          announcements={announcements}
          onMarkRead={onMarkRead}
          markingUid={markingUid}
        />

        <ReferralBlock referral={referral} />

        <HelpBlock countryCode={routeCountryCode} citySlug={routeCitySlug} />

        <PwaPromptBlock
          mobilePwaEnabled={mobilePwaEnabled}
          installPromptVisible={installPromptVisible}
          pwaUpdateAvailable={pwaUpdateAvailable}
          pwaStatusMessage={pwaStatusMessage}
          onInstall={onInstall}
          onUpdate={onUpdate}
          onDismiss={onDismiss}
        />

        <MobileBottomNav
          style={{ marginTop: 2 }}
          items={[
            { key: "home", label: "Главная", href: "#/mobile" },
            { key: "search", label: "Поиск", href: "#search" },
            { key: "booking", label: "Записи", href: "#booking-entry" },
            { key: "profile", label: "Профиль", href: "#help" },
          ]}
          activeKey="search"
        />
      </div>
    </MobileShell>
  );
}

const shellStyle = {
  width: "100%",
  maxWidth: 480,
  margin: "0 auto",
  padding: "16px 16px 32px",
  display: "grid",
  gap: 16,
  boxSizing: "border-box",
};

const heroStyle = {
  padding: "6px 2px 2px",
};

const heroTitleStyle = {
  margin: "10px 0 0",
  fontSize: 28,
  lineHeight: 1.06,
  letterSpacing: "-0.03em",
  color: "#111827",
};

const heroTextStyle = {
  marginTop: 10,
  color: "#475569",
  fontSize: 14,
  lineHeight: 1.5,
};

const loaderStyle = {
  minHeight: "70vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#111827",
  fontSize: 16,
  fontWeight: 700,
};

const gridStyle = {
  display: "grid",
  gap: 10,
};

const stackStyle = {
  display: "grid",
  gap: 10,
};

const primaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 16,
  background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
  boxShadow: "0 14px 26px rgba(29,78,216,0.22)",
};

const cityLinkStyle = {
  display: "block",
  padding: "12px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.92)",
  textDecoration: "none",
  color: "#111827",
  boxShadow: "0 12px 26px rgba(15,23,42,0.06)",
};

const secondaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.94)",
  color: "#111827",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
  boxShadow: "0 12px 24px rgba(15,23,42,0.05)",
};

const catalogButtonStyle = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.96)",
  color: "#111827",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(15,23,42,0.05)",
};

const catalogSectionTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 8,
};

const catalogItemStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.92)",
};

const announcementItemStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.92)",
};

const announcementTitleStyle = {
  fontSize: 16,
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.3,
};

const announcementBodyStyle = {
  marginTop: 6,
  fontSize: 14,
  color: "#4b5563",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
};

const announcementMetaStyle = {
  marginTop: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  fontSize: 12,
  color: "#6b7280",
};

const announcementActionStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #111827 0%, #1d4ed8 100%)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
  boxShadow: "0 12px 22px rgba(15,23,42,0.18)",
};

const referralUrlBoxStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.92)",
  color: "#111827",
  fontSize: 13,
  lineHeight: 1.5,
  wordBreak: "break-all",
};

const referralCopyButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 16,
  background: "linear-gradient(135deg, #111827 0%, #1d4ed8 100%)",
  color: "#fff",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
};

const helpGridStyle = {
  display: "grid",
  gap: 10,
};

const helpItemStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.92)",
};

const helpItemTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 6,
};

const helpItemTextStyle = {
  fontSize: 14,
  lineHeight: 1.55,
  color: "#6b7280",
};

const helpFormCardStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid rgba(226,232,240,0.92)",
};

const helpFormTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 10,
};

const helpFormGridStyle = {
  display: "grid",
  gap: 12,
};

const helpFieldStyle = {
  display: "grid",
  gap: 6,
};

const helpLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const helpTextareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 104,
  padding: "12px 13px",
  border: "1px solid rgba(203,213,225,0.98)",
  borderRadius: 14,
  fontSize: 14,
  fontFamily: "inherit",
  resize: "vertical",
  background: "#fff",
};

const helpInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid rgba(203,213,225,0.98)",
  borderRadius: 14,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
};

const helpSubmitButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #111827 0%, #1d4ed8 100%)",
  color: "#fff",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
};

const helpStatusStyle = {
  fontSize: 13,
  color: "#475569",
  lineHeight: 1.45,
};
