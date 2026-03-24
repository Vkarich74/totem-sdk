import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { getSalon, getMasters, getMetrics } from "../api/publicApi";
import { setMeta, setCanonical, setJSONLD } from "../api/seo";
import Skeleton from "../layout/Skeleton";

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}

function formatPrice(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "По запросу";
  return `${Math.round(amount).toLocaleString("ru-RU")} KGS`;
}

function formatDuration(value) {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  return `${Math.round(minutes)} мин`;
}

function normalizeText(text) {
  if (typeof text !== "string") return "";
  return text.replace(/\s+/g, " ").trim();
}

function splitParagraphs(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function extractServices(salon) {
  const raw =
    salon?.services ||
    salon?.service_list ||
    salon?.service_items ||
    salon?.public_services ||
    salon?.items ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((service, index) => {
      const id = service?.id ?? service?.sms_id ?? service?.service_id ?? index;
      const name = pickFirstString(service?.name, service?.title);
      const description = normalizeText(
        pickFirstString(
          service?.description,
          service?.short_description,
          service?.details,
        ),
      );

      const price = pickFirstNumber(
        service?.price,
        service?.service_price,
        service?.price_kgs,
        service?.price_amount,
      );

      const durationMin = pickFirstNumber(
        service?.duration_min,
        service?.duration,
        service?.duration_minutes,
      );

      const active =
        service?.is_active !== false &&
        service?.active !== false &&
        service?.status !== "inactive";

      return {
        id,
        name,
        description,
        price,
        durationMin,
        active,
      };
    })
    .filter((service) => service.name && service.active);
}

export default function PublicSalonPage({ slug }) {
  const navigate = useNavigate();

  const [salon, setSalon] = useState(null);
  const [masters, setMasters] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : true,
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      setNotFound(false);

      try {
        const salonData = await getSalon(slug);

        if (!salonData) {
          setNotFound(true);
          return;
        }

        const mastersData = await getMasters(slug);
        const metricsData = await getMetrics(slug);

        setSalon(salonData);
        setMasters(Array.isArray(mastersData) ? mastersData : []);
        setMetrics(metricsData || null);

        const description =
          pickFirstString(
            salonData.description,
            salonData.about,
            salonData.subtitle,
          ) || "Профессиональные услуги красоты. Онлайн запись без звонков.";

        document.title = `${salonData.name} | Онлайн запись`;

        setMeta("description", description);
        setMeta("og:title", salonData.name, true);
        setMeta("og:description", description, true);
        setMeta("og:type", "website", true);
        setCanonical(window.location.href);

        setJSONLD({
          "@context": "https://schema.org",
          "@type": "BeautySalon",
          name: salonData.name,
          description,
          url: window.location.href,
          telephone: pickFirstString(salonData.phone, salonData.phone_number),
          address: pickFirstString(
            salonData.address,
            salonData.location,
            salonData.district,
          ),
        });
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  const services = useMemo(() => extractServices(salon), [salon]);

  if (loading) return <Skeleton />;

  if (notFound || !salon) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <h1>404</h1>
        <p>Салон не найден</p>
      </div>
    );
  }

  const salonName = pickFirstString(salon.name) || "Салон";
  const subtitle =
    pickFirstString(salon.subtitle, salon.tagline, salon.short_description) ||
    "Услуги салона с удобной онлайн записью без звонков и ожидания.";
  const description =
    pickFirstString(salon.description, salon.about) ||
    "Профессиональные услуги красоты. Онлайн запись без звонков.";
  const district = pickFirstString(salon.district, salon.area, salon.region);
  const address = pickFirstString(
    salon.address,
    salon.location,
    salon.full_address,
  );
  const phone = pickFirstString(
    salon.phone,
    salon.phone_number,
    salon.contact_phone,
  );
  const scheduleText = pickFirstString(
    salon.schedule_text,
    salon.working_hours,
    salon.hours,
  );
  const mapEmbedUrl = pickFirstString(
    salon.map_embed_url,
    salon.google_map_embed_url,
    salon.map_url,
  );
  const mapLink = pickFirstString(
    salon.map_link,
    salon.google_maps_url,
    salon.location_url,
  );

  const aboutParagraphs = splitParagraphs(
    pickFirstString(salon.about, salon.description),
  );

  const visibleMasters = Array.isArray(masters)
    ? masters.filter((master) => !!pickFirstString(master?.name))
    : [];

  const completedBookings = pickFirstNumber(
    metrics?.completed,
    metrics?.completed_bookings,
    metrics?.bookings_completed,
  );

  const trustItems = [
    services.length > 0
      ? { label: "Услуги", value: `${services.length}` }
      : null,
    visibleMasters.length > 0
      ? { label: "Мастера", value: `${visibleMasters.length}` }
      : null,
    completedBookings > 0
      ? { label: "Записи", value: `${completedBookings}` }
      : null,
    scheduleText ? { label: "График", value: scheduleText } : null,
    { label: "Формат", value: "Онлайн запись" },
  ]
    .filter(Boolean)
    .slice(0, 4);

  const showTrustStrip = trustItems.length >= 2;

  const palette = {
    bg: "#F7F5F2",
    card: "#FFFFFF",
    textMain: "#1A1A1A",
    textSecondary: "#6B6B6B",
    primary: "#C8A97E",
    primaryHover: "#B89668",
    border: "#E8E5E1",
    cta: "#111111",
    ctaText: "#FFFFFF",
    soft: "#F1ECE6",
  };

  const pagePaddingBottom = isMobile ? 96 : 32;

  const container = {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: isMobile ? "0 16px" : "0 24px",
    boxSizing: "border-box",
  };

  const sectionTitle = {
    margin: 0,
    fontSize: isMobile ? 20 : 28,
    lineHeight: 1.25,
    fontWeight: 600,
    letterSpacing: "-0.2px",
    color: palette.textMain,
  };

  const sectionText = {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: palette.textSecondary,
  };

  const primaryButton = {
    width: isMobile ? "100%" : "auto",
    minHeight: 48,
    padding: "14px 20px",
    borderRadius: 12,
    border: "none",
    background: palette.cta,
    color: palette.ctaText,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };

  const secondaryButton = {
    width: isMobile ? "100%" : "auto",
    minHeight: 48,
    padding: "14px 20px",
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    background: palette.card,
    color: palette.textMain,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };

  const cardStyle = {
    background: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: 16,
    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
    boxSizing: "border-box",
  };

  function goToBooking() {
    navigate("/booking");
  }

  function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    goToBooking();
  }

  function renderMasterSubtitle(master) {
    return pickFirstString(
      master?.role,
      master?.specialization,
      master?.title,
      master?.position,
    );
  }

  function renderMasterBio(master) {
    return normalizeText(
      pickFirstString(
        master?.short_bio,
        master?.bio,
        master?.description,
        master?.about,
      ),
    );
  }

  return (
    <div
      style={{
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: palette.bg,
        color: palette.textMain,
        paddingBottom: pagePaddingBottom,
      }}
    >
      <section
        style={{
          padding: isMobile ? "24px 0 20px" : "48px 0 32px",
        }}
      >
        <div style={container}>
          <div
            style={{
              ...cardStyle,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,236,230,0.92) 100%)",
              padding: isMobile ? 20 : 36,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: palette.soft,
                  color: palette.textMain,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Онлайн запись в салон
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: isMobile ? 24 : 42,
                    lineHeight: 1.15,
                    fontWeight: 600,
                    letterSpacing: "-0.2px",
                    color: palette.textMain,
                  }}
                >
                  {salonName}
                </h1>

                <p
                  style={{
                    margin: 0,
                    maxWidth: 720,
                    fontSize: isMobile ? 14 : 16,
                    lineHeight: 1.6,
                    color: palette.textSecondary,
                  }}
                >
                  {subtitle}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  width: "100%",
                }}
              >
                {(district || address) && (
                  <div
                    style={{
                      ...cardStyle,
                      padding: 14,
                      background: "rgba(255,255,255,0.78)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: palette.textSecondary }}>
                      Локация
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      {district || address}
                    </div>
                    {district && address && district !== address && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: palette.textSecondary,
                        }}
                      >
                        {address}
                      </div>
                    )}
                  </div>
                )}

                {scheduleText && (
                  <div
                    style={{
                      ...cardStyle,
                      padding: 14,
                      background: "rgba(255,255,255,0.78)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: palette.textSecondary }}>
                      График
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      {scheduleText}
                    </div>
                  </div>
                )}

                {phone && (
                  <div
                    style={{
                      ...cardStyle,
                      padding: 14,
                      background: "rgba(255,255,255,0.78)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: palette.textSecondary }}>
                      Контакты
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      {phone}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 12,
                  width: "100%",
                }}
              >
                <button onClick={goToBooking} style={primaryButton}>
                  Записаться онлайн
                </button>

                <button
                  onClick={() => scrollToSection("public-salon-services")}
                  style={secondaryButton}
                >
                  Смотреть услуги
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showTrustStrip && (
        <section style={{ padding: "0 0 12px" }}>
          <div style={container}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, minmax(0, 1fr))"
                  : `repeat(${trustItems.length}, minmax(0, 1fr))`,
                gap: 12,
              }}
            >
              {trustItems.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  style={{
                    ...cardStyle,
                    padding: 14,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: palette.textSecondary,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: item.label === "График" ? 14 : 18,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: palette.textMain,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section
          id="public-salon-services"
          style={{ padding: isMobile ? "20px 0 12px" : "28px 0 20px" }}
        >
          <div style={container}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <h2 style={sectionTitle}>Услуги</h2>
              <p style={sectionText}>
                Выберите подходящую услугу и запишитесь онлайн в удобное время.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {services.map((service) => (
                <div
                  key={service.id}
                  style={{
                    ...cardStyle,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 16,
                          lineHeight: 1.45,
                          fontWeight: 600,
                          color: palette.textMain,
                        }}
                      >
                        {service.name}
                      </h3>

                      {service.description && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: 14,
                            lineHeight: 1.55,
                            color: palette.textSecondary,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        flexShrink: 0,
                        padding: "8px 10px",
                        borderRadius: 12,
                        background: palette.soft,
                        fontSize: 13,
                        fontWeight: 600,
                        color: palette.textMain,
                      }}
                    >
                      {formatPrice(service.price)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: palette.textSecondary,
                      }}
                    >
                      {service.durationMin > 0
                        ? `Длительность: ${formatDuration(service.durationMin)}`
                        : "Уточните длительность при записи"}
                    </div>

                    <button onClick={goToBooking} style={secondaryButton}>
                      Записаться
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {visibleMasters.length > 0 && (
        <section style={{ padding: isMobile ? "20px 0 12px" : "28px 0 20px" }}>
          <div style={container}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <h2 style={sectionTitle}>Мастера</h2>
              <p style={sectionText}>
                Познакомьтесь с мастерами салона и выберите удобный формат записи.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {visibleMasters.map((master) => {
                const masterSubtitle = renderMasterSubtitle(master);
                const masterBio = renderMasterBio(master);

                return (
                  <div
                    key={master.id || master.slug || master.name}
                    style={{
                      ...cardStyle,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 16,
                          lineHeight: 1.45,
                          fontWeight: 600,
                          color: palette.textMain,
                        }}
                      >
                        {master.name}
                      </h3>

                      {masterSubtitle && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: palette.textSecondary,
                          }}
                        >
                          {masterSubtitle}
                        </div>
                      )}
                    </div>

                    {masterBio && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: palette.textSecondary,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {masterBio}
                      </p>
                    )}

                    <div>
                      <button onClick={goToBooking} style={secondaryButton}>
                        Выбрать мастера
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {aboutParagraphs.length > 0 && (
        <section style={{ padding: isMobile ? "20px 0 12px" : "28px 0 20px" }}>
          <div style={container}>
            <div
              style={{
                ...cardStyle,
                padding: isMobile ? 18 : 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <h2 style={sectionTitle}>О салоне</h2>
                <p style={sectionText}>
                  Коротко о подходе, атмосфере и формате работы салона.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {aboutParagraphs.map((paragraph, index) => (
                  <p
                    key={`about-${index}`}
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: palette.textSecondary,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: isMobile ? "20px 0 12px" : "28px 0 20px" }}>
        <div style={container}>
          <div
            style={{
              ...cardStyle,
              padding: isMobile ? 18 : 28,
              background: palette.textMain,
              color: palette.ctaText,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: isMobile ? 20 : 28,
                  lineHeight: 1.25,
                  fontWeight: 600,
                  letterSpacing: "-0.2px",
                  color: palette.ctaText,
                }}
              >
                Запишитесь в салон онлайн
              </h2>

              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.82)",
                  maxWidth: 680,
                }}
              >
                Выберите услугу и удобное время без звонков и ожидания. Вся запись
                проходит быстро и понятно с мобильного телефона.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 12,
                }}
              >
                <button
                  onClick={goToBooking}
                  style={{
                    ...primaryButton,
                    background: palette.card,
                    color: palette.textMain,
                  }}
                >
                  Записаться онлайн
                </button>

                {services.length > 0 && (
                  <button
                    onClick={() => scrollToSection("public-salon-services")}
                    style={{
                      ...secondaryButton,
                      background: "transparent",
                      color: palette.ctaText,
                      border: "1px solid rgba(255,255,255,0.24)",
                    }}
                  >
                    Смотреть услуги
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {(address || district || phone || scheduleText || mapEmbedUrl || mapLink) && (
        <section style={{ padding: isMobile ? "20px 0 20px" : "28px 0 32px" }}>
          <div style={container}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1.1fr",
                gap: 12,
              }}
            >
              <div
                style={{
                  ...cardStyle,
                  padding: isMobile ? 18 : 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <h2 style={sectionTitle}>Контакты</h2>
                  <p style={sectionText}>
                    Вся основная информация для визита и связи с салоном.
                  </p>
                </div>

                {(district || address) && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.4,
                        color: palette.textSecondary,
                      }}
                    >
                      Адрес
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        lineHeight: 1.6,
                        fontWeight: 600,
                        color: palette.textMain,
                      }}
                    >
                      {district || address}
                    </div>
                    {district && address && district !== address && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: palette.textSecondary,
                        }}
                      >
                        {address}
                      </div>
                    )}
                  </div>
                )}

                {scheduleText && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.4,
                        color: palette.textSecondary,
                      }}
                    >
                      График
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        lineHeight: 1.6,
                        fontWeight: 600,
                        color: palette.textMain,
                      }}
                    >
                      {scheduleText}
                    </div>
                  </div>
                )}

                {phone && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.4,
                        color: palette.textSecondary,
                      }}
                    >
                      Телефон
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        lineHeight: 1.6,
                        fontWeight: 600,
                        color: palette.textMain,
                      }}
                    >
                      {phone}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: 12,
                  }}
                >
                  <button onClick={goToBooking} style={primaryButton}>
                    Записаться
                  </button>

                  {mapLink && (
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...secondaryButton,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      Открыть карту
                    </a>
                  )}
                </div>
              </div>

              {mapEmbedUrl && (
                <div
                  style={{
                    ...cardStyle,
                    overflow: "hidden",
                    minHeight: isMobile ? 220 : 100,
                  }}
                >
                  <iframe
                    title={`${salonName} map`}
                    src={mapEmbedUrl}
                    width="100%"
                    height={isMobile ? "220" : "100%"}
                    style={{
                      border: "none",
                      display: "block",
                      minHeight: isMobile ? 220 : 100,
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {isMobile && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            padding: 12,
            background: "rgba(247,245,242,0.96)",
            backdropFilter: "blur(10px)",
            borderTop: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <button
              onClick={goToBooking}
              style={{
                ...primaryButton,
                width: "100%",
                boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
              }}
            >
              Записаться онлайн
            </button>
          </div>
        </div>
      )}
    </div>
  );
}