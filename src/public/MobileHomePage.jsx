import { useEffect, useMemo, useState } from "react";
import { getMobileCityHome, getMobileLocations } from "../api/publicApi";

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
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });

  useEffect(() => {
    let active = true;

    async function run() {
      setState({ loading: true, error: "", data: null });

      try {
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
  }, [route.mode, route.countryCode, route.citySlug]);

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
          <SectionTitle subtitle="Доступные салоны в этом городе.">Салоны</SectionTitle>
          {salons.length ? (
            <div style={gridStyle}>
              {salons.map((salon) => (
                <Card key={`salon-${salon.id}`} style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
                    {formatLabel(salon.name)}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
                    @{formatLabel(salon.slug)} · {formatLabel(salon.city, "город не указан")}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <EntityBadge>enabled: {String(Boolean(salon.enabled))}</EntityBadge>
                    {salon.status ? <EntityBadge>{formatLabel(salon.status)}</EntityBadge> : null}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <a
                      href={buildAbsoluteOwnerUrl(`/salon/${encodeURIComponent(String(salon.slug || "").trim())}`)}
                      style={secondaryLinkStyle}
                    >
                      Открыть салон
                    </a>
                    <a
                      href={buildHashPath(`/booking?salon=${encodeURIComponent(String(salon.slug || "").trim())}`)}
                      style={primaryLinkStyle}
                    >
                      Записаться
                    </a>
                  </div>
                </Card>
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
                      href={buildAbsoluteOwnerUrl(`/master?slug=${encodeURIComponent(String(master.slug || "").trim())}`)}
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
