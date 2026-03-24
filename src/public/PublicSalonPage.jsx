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
    .slice(0, 3);
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

function createMapEmbedUrl(addressValue) {
  const query = encodeURIComponent(addressValue);
  return `https://www.google.com/maps?q=${query}&z=16&output=embed`;
}

function createMapLink(addressValue) {
  const query = encodeURIComponent(addressValue);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getInitials(name) {
  const safe = normalizeText(name);
  if (!safe) return "M";
  return safe
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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

  const salonName = pickFirstString(salon.name) || "TOTEM Salon";
  const subtitle =
    pickFirstString(salon.subtitle, salon.tagline, salon.short_description) ||
    "Салон красоты с удобной онлайн записью в Бишкеке.";
  const district =
    pickFirstString(salon.district, salon.area, salon.region) ||
    "Первомайский район, Бишкек";
  const address =
    pickFirstString(salon.address, salon.location, salon.full_address) ||
    "Киевская улица, 148";
  const phone =
    pickFirstString(salon.phone, salon.phone_number, salon.contact_phone) ||
    "+996 700 123 456";
  const scheduleText =
    pickFirstString(salon.schedule_text, salon.working_hours, salon.hours) ||
    "Ежедневно, 10:00–20:00";

  const defaultMapAddress = `${address}, ${district}`;
  const mapEmbedUrl =
    pickFirstString(
      salon.map_embed_url,
      salon.google_map_embed_url,
      salon.map_url,
    ) || createMapEmbedUrl(defaultMapAddress);

  const mapLink =
    pickFirstString(
      salon.map_link,
      salon.google_maps_url,
      salon.location_url,
    ) || createMapLink(defaultMapAddress);

  const aboutParagraphs = splitParagraphs(
    pickFirstString(
      salon.about,
      salon.description,
      "Современный салон красоты в Бишкеке с удобной онлайн записью.",
      "Услуги для повседневного ухода и аккуратного обновления образа.",
      "Выберите мастера и удобное время без звонков и ожидания.",
    ),
  );

  const visibleMasters = Array.isArray(masters)
    ? masters.filter((master) => !!pickFirstString(master?.name)).slice(0, 6)
    : [];

  const servicesForView = services.slice(0, isMobile ? 6 : 8);
  const completedBookings = pickFirstNumber(
    metrics?.completed,
    metrics?.completed_bookings,
    metrics?.bookings_completed,
  );

  const palette = {
    bg: "#F8F5F1",
    card: "#FFFFFF",
    textMain: "#23201C",
    textSecondary: "#706860",
    border: "#EAE2D8",
    accent: "#C8A97E",
    accentSoft: "#F3E8DA",
    accentHover: "#B89668",
    button: "#3C342E",
    buttonText: "#FFFFFF",
    avatarBg: "#EFE7DE",
  };

  const pagePaddingBottom = isMobile ? 88 : 32;

  const container = {
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto",
    padding: isMobile ? "0 16px" : "0 24px",
    boxSizing: "border-box",
  };

  const sectionTitle = {
    margin: 0,
    fontSize: isMobile ? 20 : 28,
    lineHeight: 1.2,
    fontWeight: 600,
    letterSpacing: "-0.2px",
    color: palette.textMain,
  };

  const sectionText = {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: palette.textSecondary,
  };

  const primaryButton = {
    width: isMobile ? "100%" : "auto",
    minHeight: 46,
    padding: isMobile ? "13px 18px" : "13px 20px",
    borderRadius: 12,
    border: "none",
    background: palette.button,
    color: palette.buttonText,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };

  const secondaryButton = {
    width: isMobile ? "100%" : "auto",
    minHeight: 46,
    padding: isMobile ? "13px 18px" : "13px 20px",
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
    boxShadow: "0 2px 8px rgba(35,32,28,0.04)",
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
    return (
      pickFirstString(
        master?.role,
        master?.specialization,
        master?.title,
        master?.position,
      ) || "Мастер салона"
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
          padding: isMobile ? "18px 0 14px" : "36px 0 18px",
        }}
      >
        <div style={container}>
          <div
            style={{
              ...cardStyle,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,245,239,0.98) 100%)",
              padding: isMobile ? 18 : 28,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: isMobile ? 14 : 16,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "7px 11px",
                  borderRadius: 999,
                  background: palette.accentSoft,
                  color: palette.textMain,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Онлайн запись в салон
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: isMobile ? 24 : 38,
                    lineHeight: 1.12,
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
                    maxWidth: 700,
                    fontSize: isMobile ? 14 : 15,
                    lineHeight: 1.55,
                    color: palette.textSecondary,
                  }}
                >
                  {subtitle}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  width: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: palette.textMain,
                    fontWeight: 500,
                  }}
                >
                  {address}, {district}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: palette.textSecondary,
                  }}
                >
                  {scheduleText}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: palette.textSecondary,
                  }}
                >
                  {completedBookings > 0
                    ? `${completedBookings} завершённых записей`
                    : "Быстрая запись без звонков и ожидания"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 10,
                  width: "100%",
                }}
              >
                <button onClick={goToBooking} style={primaryButton}>
                  Записаться
                </button>

                <button
                  onClick={() => scrollToSection("public-salon-services")}
                  style={secondaryButton}
                >
                  Услуги
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {servicesForView.length > 0 && (
        <section
          id="public-salon-services"
          style={{ padding: isMobile ? "10px 0 8px" : "18px 0 12px" }}
        >
          <div style={container}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <h2 style={sectionTitle}>Услуги</h2>
              <p style={sectionText}>
                Выберите услугу и запишитесь на удобное время онлайн.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {servicesForView.map((service) => (
                <div
                  key={service.id}
                  style={{
                    ...cardStyle,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 15,
                          lineHeight: 1.4,
                          fontWeight: 600,
                          color: palette.textMain,
                        }}
                      >
                        {service.name}
                      </h3>

                      {service.description && (
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: 13,
                            lineHeight: 1.5,
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
                        padding: "6px 9px",
                        borderRadius: 10,
                        background: palette.accentSoft,
                        fontSize: 12,
                        fontWeight: 600,
                        color: palette.textMain,
                        whiteSpace: "nowrap",
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
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: palette.textSecondary,
                      }}
                    >
                      {service.durationMin > 0
                        ? formatDuration(service.durationMin)
                        : "Длительность уточняется"}
                    </div>

                    <button
                      onClick={goToBooking}
                      style={{
                        ...secondaryButton,
                        width: "auto",
                        minHeight: 38,
                        padding: "9px 14px",
                        fontSize: 13,
                      }}
                    >
                      Выбрать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {visibleMasters.length > 0 && (
        <section style={{ padding: isMobile ? "12px 0 8px" : "20px 0 12px" }}>
          <div style={container}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <h2 style={sectionTitle}>Мастера</h2>
              <p style={sectionText}>
                Выберите мастера и удобный формат записи.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 10,
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
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: palette.avatarBg,
                          color: palette.textMain,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(master.name)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 15,
                            lineHeight: 1.4,
                            fontWeight: 600,
                            color: palette.textMain,
                          }}
                        >
                          {master.name}
                        </h3>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: palette.textSecondary,
                          }}
                        >
                          {masterSubtitle}
                        </div>

                        {masterBio && (
                          <p
                            style={{
                              margin: "6px 0 0",
                              fontSize: 13,
                              lineHeight: 1.5,
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
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={goToBooking}
                        style={{
                          ...secondaryButton,
                          width: isMobile ? "100%" : "auto",
                          minHeight: 38,
                          padding: "9px 14px",
                          fontSize: 13,
                        }}
                      >
                        Записаться
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
        <section style={{ padding: isMobile ? "12px 0 8px" : "20px 0 12px" }}>
          <div style={container}>
            <div
              style={{
                ...cardStyle,
                padding: isMobile ? 16 : 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <h2 style={sectionTitle}>О салоне</h2>
                <p style={sectionText}>
                  Коротко о формате, атмосфере и удобстве записи.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {aboutParagraphs.map((paragraph, index) => (
                  <p
                    key={`about-${index}`}
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: palette.textSecondary,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <button onClick={goToBooking} style={primaryButton}>
                  Записаться онлайн
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: isMobile ? "12px 0 20px" : "20px 0 32px" }}>
        <div style={container}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "0.92fr 1.08fr",
              gap: 10,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                ...cardStyle,
                padding: isMobile ? 16 : 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <h2 style={sectionTitle}>Контакты</h2>
                <p style={sectionText}>
                  Адрес, график и встроенная карта для быстрого ориентирования.
                </p>
              </div>

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
                  {address}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: palette.textSecondary,
                  }}
                >
                  {district}
                </div>
              </div>

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

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 10,
                }}
              >
                <button onClick={goToBooking} style={primaryButton}>
                  Записаться
                </button>

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
                  Маршрут
                </a>
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                overflow: "hidden",
                minHeight: isMobile ? 240 : 100,
              }}
            >
              <iframe
                title={`${salonName} map`}
                src={mapEmbedUrl}
                width="100%"
                height={isMobile ? "240" : "100%"}
                style={{
                  border: "none",
                  display: "block",
                  minHeight: isMobile ? 240 : 100,
                }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {isMobile && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            padding: 12,
            background: "rgba(248,245,241,0.96)",
            backdropFilter: "blur(10px)",
            borderTop: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <button
              onClick={goToBooking}
              style={{
                ...primaryButton,
                width: "100%",
                boxShadow: "0 -2px 10px rgba(35,32,28,0.06)",
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
