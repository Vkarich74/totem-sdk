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

function parseMobileRoute() {
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
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        padding: 16,
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
      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", lineHeight: 1.15 }}>
        {children}
      </div>
      {subtitle ? (
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
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
        padding: "6px 10px",
        borderRadius: 999,
        background: "#f3f4f6",
        color: "#374151",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
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
      <div style={shellStyle}>
        <Card>
          <SectionTitle subtitle="Мобильная витрина загружается.">Мобильная витрина</SectionTitle>
          <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
            Загрузка мобильной витрины…
          </div>
        </Card>
      </div>
    );
  }

  if (config.error) {
    return (
      <div style={shellStyle}>
        <Card>
          <SectionTitle subtitle="Не удалось загрузить конфигурацию мобильной витрины.">
            Мобильная витрина
          </SectionTitle>
          <div style={{ fontSize: 14, color: "#991b1b", lineHeight: 1.55 }}>
            Мобильная витрина временно недоступна.
          </div>
        </Card>
      </div>
    );
  }

  if (!mobileV1Enabled) {
    return (
      <div style={shellStyle}>
        <Card>
          <SectionTitle subtitle="Раздел открыт только для внутренней проверки.">Мобильная витрина</SectionTitle>
          <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
            Мобильная витрина скоро появится.
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
            Сейчас раздел открыт только для внутренней проверки.
          </div>
        </Card>
      </div>
    );
  }

  if (route.mode === "city" && !mobileCityHomeEnabled) {
    return (
      <div style={shellStyle}>
        <Card>
          <SectionTitle subtitle="Раздел открыт только для внутренней проверки.">Мобильная витрина</SectionTitle>
          <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
            Городская витрина скоро появится.
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
            Сейчас городская витрина открыта только для внутренней проверки.
          </div>
        </Card>
      </div>
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
      <div style={shellStyle}>
        <div style={loaderStyle}>Загрузка мобильного раздела…</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={shellStyle}>
        <Card>
          <SectionTitle subtitle="Не удалось загрузить данные мобильного раздела.">
            Ошибка загрузки
          </SectionTitle>
          <div style={{ color: "#991b1b", fontSize: 14, lineHeight: 1.5 }}>
            {state.error}
          </div>
        </Card>
      </div>
    );
  }

  if (route.mode === "city") {
    const home = state.data;

    if (home?.empty) {
      return (
        <div style={shellStyle}>
          <Card>
            <SectionTitle subtitle="Город не найден или пока не подключён к мобильной витрине.">
              Город не найден
            </SectionTitle>
            <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Проверьте ссылку или вернитесь в мобильный список городов.
            </div>
            <a href="#/mobile" style={primaryLinkStyle}>
              Вернуться к списку
            </a>
          </Card>
        </div>
      );
    }

    const salons = Array.isArray(home?.salons) ? home.salons : [];
    const masters = Array.isArray(home?.masters) ? home.masters : [];

    return (
      <div style={shellStyle}>
        <div style={heroStyle}>
          <EntityBadge>
            {formatLabel(home?.country?.code || route.countryCode)} · {formatLabel(home?.city?.slug || route.citySlug)}
          </EntityBadge>
          <h1 style={heroTitleStyle}>
            {formatLabel(home?.city?.name_ru || home?.city?.name_en || "Город")}
          </h1>
          <div style={heroTextStyle}>
            {formatLabel(home?.country?.name_ru || home?.country?.name_en || "Страна")} ·{" "}
            {formatLabel(home?.city?.timezone || home?.country?.timezone || "Без часового пояса")}
          </div>
        </div>

        <Card>
          <SectionTitle subtitle="Запись начинается с выбора салона. Мастер и услуга выбираются уже на экране записи.">
            Быстрая запись
          </SectionTitle>
          <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
            Выберите салон ниже и нажмите "Записаться в салон". На следующем экране можно выбрать мастера, услугу и удобное время.
          </div>
        </Card>

        <AnnouncementsBlock
          announcements={announcements}
          onMarkRead={handleNotificationMarkRead}
          markingUid={notificationMarkingUid}
        />

        <ReferralBlock referral={referral} />

        <HelpBlock countryCode={route.countryCode} citySlug={route.citySlug} />

        <PwaPromptBlock
          mobilePwaEnabled={mobilePwaEnabled}
          installPromptVisible={installPromptVisible}
          pwaUpdateAvailable={pwaUpdateAvailable}
          pwaStatusMessage={pwaStatusMessage}
          onInstall={handleInstallApp}
          onUpdate={handleReloadForUpdate}
          onDismiss={handleDismissPwaPrompt}
        />

        <Card>
          <SectionTitle subtitle="Доступные салоны в этом городе.">Салоны</SectionTitle>
          {salons.length ? (
            <div style={gridStyle}>
              {salons.map((salon) => (
                <SalonCard
                  key={`salon-${salon.id}`}
                  salon={salon}
                  catalogState={catalogBySlug[String(salon.slug || "").trim()] || null}
                  onToggleCatalog={toggleSalonCatalog}
                  countryCode={route.countryCode}
                  citySlug={route.citySlug}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="В этом городе пока нет активных салонов." />
          )}
        </Card>

        <Card>
          <SectionTitle subtitle="Доступные мастера в этом городе.">Мастера</SectionTitle>
          {masters.length ? (
            <div style={gridStyle}>
              {masters.map((master) => (
                <Card key={`master-${master.id}`} style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
                    {formatLabel(master.name)}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
                    @{formatLabel(master.slug)}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <EntityBadge>active: {String(Boolean(master.active))}</EntityBadge>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <a
                      href={buildAbsoluteOwnerUrl(`/master/${encodeURIComponent(String(master.slug || "").trim())}`)}
                      onClick={() => trackMobileEvent({
                        event_type: "master_card_open",
                        target_type: "master",
                        owner_type: "master",
                        owner_slug: String(master.slug || "").trim(),
                        country_code: route.countryCode,
                        city_slug: route.citySlug,
                        route: `/master/${encodeURIComponent(String(master.slug || "").trim())}`,
                        session_key: getMobileAnalyticsSessionKey(),
                        payload_json: {
                          entry: "mobile_city_master_card",
                        },
                      })}
                      style={secondaryLinkStyle}
                    >
                      Открыть мастера
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState text="В этом городе пока нет активных мастеров." />
          )}
        </Card>
      </div>
    );
  }

  const countries = sortedCountries;
  const cities = activeCities;
  const bishkekLink = "#/mobile/city/KG/bishkek";

  return (
      <div style={shellStyle}>
        <div style={heroStyle}>
          <EntityBadge>Мобильная витрина</EntityBadge>
          <h1 style={heroTitleStyle}>Выберите страну и город</h1>
          <div style={heroTextStyle}>
            Это мобильный вход в каталог. Сейчас доступны только read-only данные по странам и городам.
          </div>
        </div>

        <Card style={{ borderColor: "#dbeafe", background: "#f8fbff" }}>
          <SectionTitle subtitle="Выберите, как хотите войти в TOTEM.">Кто вы?</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <a
              href="#/mobile/city/KG/bishkek"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 96,
                padding: 16,
                borderRadius: 16,
                border: "1px solid #dbeafe",
                background: "#fff",
                color: "#111827",
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>Клиент</div>
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.45 }}>Найти салон и записаться</div>
            </a>

            <a
              href="#/auth/login?role=master"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 96,
                padding: 16,
                borderRadius: 16,
                border: "1px solid #dcfce7",
                background: "#f0fdf4",
                color: "#111827",
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>Мастер</div>
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.45 }}>Войти в кабинет мастера</div>
            </a>

            <a
              href="#/auth/login?role=salon_admin"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 96,
                padding: 16,
                borderRadius: 16,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                color: "#111827",
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>Салон</div>
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.45 }}>Войти в кабинет салона</div>
            </a>
          </div>
        </Card>

        <Card>
          <SectionTitle subtitle="Запись начинается с выбора салона. Мастер и услуга выбираются уже на экране записи.">
            Быстрая запись
          </SectionTitle>
        <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.55 }}>
          Сначала откройте нужный салон. После перехода на экран записи можно выбрать мастера, услугу и удобное время.
        </div>
      </Card>

      <AnnouncementsBlock
        announcements={announcements}
        onMarkRead={handleNotificationMarkRead}
        markingUid={notificationMarkingUid}
      />

      <ReferralBlock referral={referral} />

      <HelpBlock countryCode={route.countryCode} citySlug={route.citySlug} />

      <PwaPromptBlock
        mobilePwaEnabled={mobilePwaEnabled}
        installPromptVisible={installPromptVisible}
        pwaUpdateAvailable={pwaUpdateAvailable}
        pwaStatusMessage={pwaStatusMessage}
        onInstall={handleInstallApp}
        onUpdate={handleReloadForUpdate}
        onDismiss={handleDismissPwaPrompt}
      />

      <Card>
        <SectionTitle subtitle="Активные страны для мобильной витрины.">Страны</SectionTitle>
        {countries.length ? (
          <div style={stackStyle}>
            {countries.map((country) => {
              const countryCode = String(country?.code || "").trim().toUpperCase();
              const countryCities = homeCitiesByCountry.get(countryCode) || [];

              return (
                <Card key={`country-${countryCode}`} style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
                        {formatLabel(country?.name_ru || country?.name_en || countryCode)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
                        {countryCode} · {formatLabel(country?.currency_code, "валюта не указана")}
                      </div>
                    </div>
                    <EntityBadge>{countryCities.length} городов</EntityBadge>
                  </div>

                  {countryCode === "KG" ? (
                    <a href={bishkekLink} style={primaryLinkStyle}>
                      Открыть Бишкек
                    </a>
                  ) : null}

                  {countryCities.length ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                      {countryCities.map((city) => {
                        const citySlug = String(city?.slug || "").trim().toLowerCase();

                        return (
                          <a
                            key={`city-${countryCode}-${citySlug}`}
                            href={`#/mobile/city/${encodeURIComponent(countryCode)}/${encodeURIComponent(citySlug)}`}
                            style={cityLinkStyle}
                          >
                            <div style={{ fontWeight: 700, color: "#111827" }}>
                              {formatLabel(city?.name_ru || city?.name_en || citySlug)}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                              {citySlug} · {formatLabel(city?.timezone, "timezone не указан")}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
                      В этой стране пока нет активных городов.
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState text="Активные страны пока не найдены." />
        )}
      </Card>

      <Card>
        <SectionTitle subtitle="Активные города для мобильной витрины.">Города</SectionTitle>
        {cities.length ? (
          <div style={stackStyle}>
            {cities.map((city) => {
              const countryCode = String(city?.country_code || "").trim().toUpperCase();
              const citySlug = String(city?.slug || "").trim().toLowerCase();

              return (
                <a
                  key={`city-card-${countryCode}-${citySlug}`}
                  href={`#/mobile/city/${encodeURIComponent(countryCode)}/${encodeURIComponent(citySlug)}`}
                  style={cityLinkStyle}
                >
                  <div style={{ fontWeight: 800, color: "#111827" }}>
                    {formatLabel(city?.name_ru || city?.name_en || citySlug)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                    {countryCode} · {citySlug}
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <EmptyState text="Активные города пока не найдены." />
        )}
      </Card>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: "#f9fafb",
        border: "1px dashed #d1d5db",
        color: "#6b7280",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  );
}

function AnnouncementsBlock({ announcements, onMarkRead, markingUid }) {
  const items = Array.isArray(announcements?.items) ? announcements.items : [];
  const loading = Boolean(announcements?.loading);
  const error = String(announcements?.error || "").trim();
  const disabled = Boolean(announcements?.disabled);
  const unreadCount = items.reduce((count, item) => count + (item?.is_read === true ? 0 : 1), 0);

  return (
    <Card>
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
        <div style={emptyNoteStyle}>Уведомления скоро появятся.</div>
      ) : loading ? (
        <div style={emptyNoteStyle}>Загрузка уведомлений…</div>
      ) : error ? (
        <div style={emptyNoteStyle}>Уведомления временно недоступны.</div>
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
        <div style={emptyNoteStyle}>Уведомлений пока нет.</div>
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
    <Card>
      <SectionTitle subtitle="Персональная ссылка для приглашения друзей.">Реферальная программа</SectionTitle>

      {loading ? (
        <div style={emptyNoteStyle}>Загрузка реферальной программы…</div>
      ) : error ? (
        <div style={emptyNoteStyle}>Реферальная программа скоро появится.</div>
      ) : !enabled ? (
        <div style={emptyNoteStyle}>Реферальная программа скоро появится.</div>
      ) : !available ? (
        <div style={emptyNoteStyle}>Сейчас нет активной реферальной ссылки.</div>
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
    <Card>
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
          <div style={helpItemTextStyle}>Документ будет доступен перед публичным запуском.</div>
        </div>

        <div style={helpItemStyle}>
          <div style={helpItemTitleStyle}>Условия использования</div>
          <div style={helpItemTextStyle}>Документ будет доступен перед публичным запуском.</div>
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
                placeholder="Опишите запрос по данным"
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
    <Card style={{ borderColor: "#dbeafe", background: "#f8fbff" }}>
      <SectionTitle subtitle="Установка и обновление мобильной витрины.">Приложение TOTEM</SectionTitle>

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
    </Card>
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
          href={buildHashPath(`/booking?salon=${encodeURIComponent(slug)}`)}
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
        <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>Загрузка каталога…</div>
      ) : null}

      {catalogOpen && catalogError ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#991b1b" }}>
          Каталог временно недоступен.
        </div>
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
              <div style={catalogEmptyStyle}>Услуги пока не опубликованы.</div>
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
              <div style={catalogEmptyStyle}>Мастера пока не опубликованы.</div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

const shellStyle = {
  width: "100%",
  maxWidth: 480,
  margin: "0 auto",
  padding: "20px 16px 32px",
  display: "grid",
  gap: 16,
  boxSizing: "border-box",
};

const heroStyle = {
  padding: "8px 2px 2px",
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
  color: "#4b5563",
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
  borderRadius: 14,
  background: "#111827",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
};

const cityLinkStyle = {
  display: "block",
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  textDecoration: "none",
  color: "#111827",
};

const secondaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 14,
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  color: "#111827",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
};

const catalogButtonStyle = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #d1d5db",
  color: "#111827",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const catalogSectionTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 8,
};

const catalogItemStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
};

const catalogEmptyStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px dashed #d1d5db",
  color: "#6b7280",
  fontSize: 14,
  lineHeight: 1.5,
};

const emptyNoteStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px dashed #d1d5db",
  color: "#6b7280",
  fontSize: 14,
  lineHeight: 1.5,
};

const announcementItemStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
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
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
};

const referralUrlBoxStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
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
  borderRadius: 14,
  background: "#111827",
  color: "#fff",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const helpGridStyle = {
  display: "grid",
  gap: 10,
};

const helpItemStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
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
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
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
  border: "1px solid #d1d5db",
  borderRadius: 12,
  fontSize: 14,
  fontFamily: "inherit",
  resize: "vertical",
};

const helpInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  fontSize: 14,
  fontFamily: "inherit",
};

const helpSubmitButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const helpStatusStyle = {
  fontSize: 13,
  color: "#4b5563",
  lineHeight: 1.45,
};
