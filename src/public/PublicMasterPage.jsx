import { useEffect, useMemo, useState } from "react";
import { normalizeMasterTemplatePayload } from "../utils/normalizeTemplate.js";
import { buildMasterTemplateViewModel } from "../utils/buildViewModel.js";

const PUBLIC_API_BASE =
  String(import.meta.env.VITE_PUBLIC_API_BASE || "https://api.totemv.com/public").trim() ||
  "https://api.totemv.com/public";

const UI_TEXT = {
  benefitsTitle: "Почему выбирают этого мастера",
  metricsTitle: "Быстрое доверие",
  featuredServicesTitle: "Популярные услуги",
  serviceCatalogTitle: "Каталог услуг",
  reviewsTitle: "Отзывы клиентов",
  aboutTitle: "О мастере",
  contactsTitle: "Контакты и локация",
  locationCardTitle: "Локация",
  trustCardTitle: "Доверие и отзывы",
  addressLabel: "Адрес",
  scheduleLabel: "График",
  phoneLabel: "Телефон",
  statsYearsLabel: "года практики",
  statsRatingLabel: "рейтинг клиентов",
  statsBookingsLabel: "записей",
  benefitIcon: "✦",
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function joinText(parts, separator = ", ") {
  return parts.map((part) => asString(part)).filter(Boolean).join(separator);
}

function hasAnyText(values) {
  return values.some((value) => hasText(value));
}

function resolvePublicSlug(slug) {
  const pathParts = String(window.location.pathname || "").split("/").filter(Boolean);
  if (typeof slug === "string" && slug.trim()) {
    return slug.trim();
  }

  if (pathParts[0] === "master" && pathParts[1]) {
    return pathParts[1];
  }

  const params = new URLSearchParams(window.location.search || "");
  return String(params.get("slug") || "").trim();
}


function normalizeMetrics(items) {
  return asArray(items)
    .map((item) => ({
      value: isObject(item) ? asString(item.value) : asString(item),
      label: isObject(item) ? asString(item.label) : "",
    }))
    .filter((item) => item.value || item.label);
}

function normalizeBenefits(items) {
  return asArray(items)
    .map((item) => ({
      title: isObject(item) ? asString(item.title) : "",
      text: isObject(item) ? asString(item.text) : asString(item),
    }))
    .filter((item) => item.title || item.text);
}

function normalizeFeaturedServices(items) {
  return asArray(items)
    .map((item) => ({
      title: isObject(item) ? asString(item.title) : "",
      price: isObject(item) ? asString(item.price) : "",
      time: isObject(item) ? asString(item.time) : "",
      note: isObject(item) ? asString(item.note) : "",
    }))
    .filter((item) => item.title || item.price || item.time || item.note);
}

function normalizeServiceCatalog(items) {
  return asArray(items)
    .map((item) => ({
      name: isObject(item) ? asString(item.name) : asString(item),
      price: isObject(item) ? asString(item.price) : "",
      duration: isObject(item) ? asString(item.duration) : "",
      description: isObject(item) ? asString(item.description) : "",
    }))
    .filter((item) => item.name || item.price || item.duration || item.description);
}

function normalizeReviews(items) {
  return asArray(items)
    .map((item) => ({
      name: isObject(item) ? asString(item.name) : "",
      text: isObject(item) ? asString(item.text) : asString(item),
      rating: isObject(item) ? asString(item.rating) : "",
    }))
    .filter((item) => item.name || item.text || item.rating);
}

function normalizeBadges(items) {
  return asArray(items)
    .map((badge) => (isObject(badge) ? asString(badge.text) : asString(badge)))
    .filter(Boolean);
}

function normalizeAboutParagraphs(items) {
  return asArray(items)
    .map((item) => (isObject(item) ? asString(item.text) : asString(item)))
    .filter(Boolean);
}

function normalizeStats(stats) {
  if (!isObject(stats)) {
    return { years: "", rating: "", bookings: "" };
  }

  return {
    years: asString(stats.years),
    rating: asString(stats.rating),
    bookings: asString(stats.bookings),
  };
}

function normalizeBookingBand(band) {
  if (!isObject(band)) {
    return {
      title: "",
      text: "",
      booking_cta_label: "",
      booking_cta_url: "",
      services_cta_label: "",
      services_anchor: "",
    };
  }

  return {
    title: asString(band.title),
    text: asString(band.text),
    booking_cta_label: asString(band.booking_cta_label),
    booking_cta_url: asString(band.booking_cta_url),
    services_cta_label: asString(band.services_cta_label),
    services_anchor: asString(band.services_anchor),
  };
}

function ActionLink({ href, children, style, ...rest }) {
  if (!hasText(href) || !children) {
    return null;
  }

  return (
    <a href={href} style={style} {...rest}>
      {children}
    </a>
  );
}

export default function PublicMasterPage({ slug }) {
  const resolvedSlug = resolvePublicSlug(slug);
  const [remoteState, setRemoteState] = useState({
    loading: true,
    ok: false,
    payload: null,
    errorCode: "",
    statusCode: 0,
    raw: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPublicPayload() {
      if (!resolvedSlug) {
        setRemoteState({
          loading: false,
          ok: false,
          payload: null,
          errorCode: "MASTER_PUBLIC_SLUG_MISSING",
          statusCode: 0,
        });
        return;
      }

      try {
        const response = await fetch(`${PUBLIC_API_BASE}/masters/${resolvedSlug}`);
        const json = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          console.error("PublicMasterPage: public master fetch failed", {
            slug: resolvedSlug,
            status: response.status,
          });
          setRemoteState({
            loading: false,
            ok: false,
            payload: null,
            errorCode: "MASTER_PUBLIC_FETCH_NOT_OK",
            statusCode: response.status || 0,
          });
          return;
        }

        if (!json?.ok) {
          console.error("PublicMasterPage: public master payload api not ok", {
            slug: resolvedSlug,
            status: response.status,
            json,
          });
          setRemoteState({
            loading: false,
            ok: false,
            payload: null,
            errorCode: "MASTER_PUBLIC_API_NOT_OK",
            statusCode: response.status || 0,
          });
          return;
        }

        const payload = json.payload || null;
        if (payload?.identity && !payload.identity.master_name && json?.master?.name) {
          payload.identity = { ...payload.identity, master_name: json.master.name };
        }

        setRemoteState({
          loading: false,
          ok: true,
          payload,
          raw: json,
          errorCode: "",
          statusCode: response.status || 200,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("PublicMasterPage: public master fetch crashed", {
          slug,
          error,
        });
        setRemoteState({
          loading: false,
          ok: false,
          payload: null,
          errorCode: "MASTER_PUBLIC_FETCH_FAILED",
          statusCode: 0,
        });
      }
    }

    loadPublicPayload();

    return () => {
      cancelled = true;
    };
  }, [resolvedSlug]);

  const view = useMemo(() => {
    const normalized = normalizeMasterTemplatePayload
      ? normalizeMasterTemplatePayload(remoteState.payload)
      : remoteState.payload;
    return buildMasterTemplateViewModel(normalized);
  }, [remoteState.payload]);

  const rawMaster = useMemo(() => {
    const raw = isObject(remoteState.raw) ? remoteState.raw : {};
    if (isObject(raw.master)) return raw.master;
    if (isObject(raw.data)) return raw.data;
    if (isObject(raw.owner)) return raw.owner;
    if (isObject(raw.payload?.master)) return raw.payload.master;
    if (isObject(raw.payload?.identity)) return raw.payload.identity;
    return {};
  }, [remoteState.raw]);

  const masterName = pickFirstString(
    view.masterName,
    rawMaster.master_name,
    rawMaster.name,
    rawMaster.title,
    rawMaster.display_name,
    resolvedSlug,
  );
  const profession = pickFirstString(
    view.profession,
    rawMaster.profession,
    rawMaster.specialization,
    rawMaster.role,
    rawMaster.position,
    "Мастер",
  );
  const city = pickFirstString(view.city, rawMaster.city);
  const district = pickFirstString(view.district, rawMaster.district);
  const address = pickFirstString(view.address, rawMaster.address, rawMaster.full_address);
  const schedule = pickFirstString(view.schedule, rawMaster.schedule, rawMaster.schedule_text);
  const phone = pickFirstString(view.phone, rawMaster.phone, rawMaster.whatsapp);
  const mapUrl = pickFirstString(view.mapUrl, rawMaster.map_url, rawMaster.mapUrl);
  const heroImage = view.heroImage;
  const heroAlt = view.heroAlt;
  const heroBadge = view.heroBadge;
  const subtitle = pickFirstString(view.subtitle, rawMaster.subtitle, rawMaster.short_bio);
  const description = pickFirstString(view.description, rawMaster.description, rawMaster.bio, rawMaster.about);
  const metrics = normalizeMetrics(view.metrics);
  const benefits = normalizeBenefits(view.benefits);
  const featuredServices = normalizeFeaturedServices(view.featuredServices);
  const serviceCatalog = normalizeServiceCatalog(view.serviceCatalog);
  const reviews = normalizeReviews(view.reviews);
  const badges = normalizeBadges(view.badges);
  const aboutParagraphs = normalizeAboutParagraphs(view.aboutParagraphs);
  const stats = normalizeStats(view.stats);
  const bookingBand = normalizeBookingBand(view.bookingBand);
  const bookingUrl = pickFirstString(
    view.bookingUrl,
    rawMaster.booking_url,
    rawMaster.bookingUrl,
    resolvedSlug ? `https://app.totemv.com/#/booking?master=${encodeURIComponent(resolvedSlug)}` : "",
  );
  const bookingLabel = pickFirstString(view.bookingLabel, "Записаться к мастеру");
  const servicesLabel = pickFirstString(view.servicesLabel, "Смотреть услуги");
  const servicesAnchor = view.servicesAnchor;
  const mapLabel = view.mapLabel;
  const ratingValue = view.ratingValue;
  const reviewCount = view.reviewCount;
  const trustNote = view.trustNote;

  const locationLine = joinText([address, district], ", ");
  const cityLine = joinText([district, city], ", ");
  const titleLine = joinText([masterName, profession], " — ");
  const topMetaLine = city;
  const professionLine = joinText([profession, subtitle], ". ");
  const hasTopIdentity = hasAnyText([masterName, profession, city, bookingLabel, bookingUrl]);
  const hasHeroInfo = hasAnyText([heroBadge, masterName, profession, subtitle, description, heroImage]);
  const hasLocationCard = hasAnyText([address, district, schedule]);
  const hasTrustCard = hasAnyText([ratingValue, reviewCount, trustNote]);
  const hasHeroActions = (hasText(bookingLabel) && hasText(bookingUrl)) || (hasText(servicesLabel) && hasText(servicesAnchor));
  const hasBenefits = benefits.length > 0;
  const hasMetrics = metrics.length > 0;
  const hasFeaturedServices = featuredServices.length > 0;
  const hasServiceCatalog = serviceCatalog.length > 0;
  const hasReviews = reviews.length > 0;
  const hasAbout = aboutParagraphs.length > 0;
  const statsItems = [
    { value: stats.years, label: UI_TEXT.statsYearsLabel },
    { value: stats.rating, label: UI_TEXT.statsRatingLabel },
    { value: stats.bookings, label: UI_TEXT.statsBookingsLabel },
  ].filter((item) => hasText(item.value));
  const hasStats = statsItems.length > 0;
  const hasAboutBlock = hasAbout || hasStats;
  const hasContactsBlock =
    hasAnyText([address, district, city, schedule, phone]) ||
    (hasText(mapLabel) && hasText(mapUrl)) ||
    (hasText(bookingLabel) && hasText(bookingUrl));
  const hasBookingBand =
    hasAnyText([
      bookingBand.title,
      bookingBand.text,
      bookingBand.booking_cta_label,
      bookingBand.booking_cta_url,
      bookingBand.services_cta_label,
      bookingBand.services_anchor,
    ]);

  const palette = {
    bg: "#F4F7FB",
    card: "#FFFFFF",
    textMain: "#101828",
    textSecondary: "#667085",
    border: "#E4E7EC",
    accent: "#4F46E5",
    accentSoft: "#EEF2FF",
    button: "linear-gradient(135deg, #111827 0%, #1D4ED8 55%, #7C3AED 100%)",
    buttonText: "#FFFFFF",
    star: "#D39B36",
    review: "#FDFDFF",
    heroOverlay:
      "linear-gradient(180deg, rgba(17,24,39,0.02) 0%, rgba(79,70,229,0.08) 48%, rgba(124,58,237,0.08) 100%)",
  };

  const shellStyle = {
    minHeight: "100vh",
    background: palette.bg,
    color: palette.textMain,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: hasStickyBlock ? "110px" : "32px",
  };

  const containerStyle = {
    width: "100%",
    maxWidth: "1140px",
    margin: "0 auto",
    paddingLeft: "24px",
    paddingRight: "24px",
    boxSizing: "border-box",
  };

  const sectionTitleStyle = {
    margin: 0,
    fontSize: "clamp(22px, 3.2vw, 30px)",
    lineHeight: 1.18,
    fontWeight: 700,
    letterSpacing: "-0.2px",
    color: palette.textMain,
  };

  const cardSectionTitleStyle = {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.4,
    fontWeight: 400,
    color: palette.textSecondary,
  };

  const sectionTextStyle = {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: palette.textSecondary,
  };

  const cardStyle = {
    background: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: "20px",
    boxShadow: "0 12px 36px rgba(15,23,42,0.06)",
    boxSizing: "border-box",
  };

  const primaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50px",
    padding: "13px 20px",
    borderRadius: "14px",
    background: palette.button,
    color: palette.buttonText,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
    border: "none",
    boxShadow: "0 12px 28px rgba(17,24,39,0.18)",
  };

  const secondaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50px",
    padding: "13px 20px",
    borderRadius: "14px",
    background: palette.card,
    color: palette.textMain,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
    border: `1px solid ${palette.border}`,
  };

  const heroVisual = heroImage ? (
    <img
      src={heroImage}
      alt={heroAlt}
      loading="eager"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
      }}
    />
  ) : null;

  return (
    <div style={shellStyle}>
      {hasTopIdentity ? (
        <section style={{ padding: "18px 0 12px" }}>
          <div style={containerStyle}>
            <div
              style={{
                ...cardStyle,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,255,0.98) 100%)",
                padding: "18px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: palette.accentSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: palette.textMain,
                    flexShrink: 0,
                  }}
                >
                  {(masterName || "•").slice(0, 1)}
                </div>

                <div>
                  {hasText(titleLine) ? (
                    <div style={{ fontSize: "15px", fontWeight: 700, color: palette.textMain }}>
                      {titleLine}
                    </div>
                  ) : null}
                  {hasText(topMetaLine) ? (
                    <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "2px" }}>
                      {topMetaLine}
                    </div>
                  ) : null}
                </div>
              </div>

              <ActionLink href={bookingUrl} style={primaryButtonStyle}>
                {bookingLabel}
              </ActionLink>
            </div>
          </div>
        </section>
      ) : null}

      {hasHeroInfo ? (
        <section style={{ padding: "12px 0 12px" }}>
          <div style={containerStyle}>
            <div
              style={{
                ...cardStyle,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,255,0.98) 100%)",
                padding: "32px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "22px",
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  {hasText(heroBadge) ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "7px 11px",
                        borderRadius: "999px",
                        background: palette.accentSoft,
                        color: palette.textMain,
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {heroBadge}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {hasText(masterName) ? (
                      <h1
                        style={{
                          margin: 0,
                          fontSize: "clamp(34px, 5vw, 48px)",
                          lineHeight: 1.04,
                          fontWeight: 700,
                          letterSpacing: "-0.25px",
                          color: palette.textMain,
                        }}
                      >
                        {masterName}
                      </h1>
                    ) : null}

                    {hasText(professionLine) ? (
                      <div
                        style={{
                          fontSize: "18px",
                          lineHeight: 1.45,
                          color: palette.textMain,
                          fontWeight: 600,
                        }}
                      >
                        {professionLine}
                      </div>
                    ) : null}

                    {hasText(description) ? (
                      <p
                        style={{
                          margin: 0,
                          maxWidth: "760px",
                          fontSize: "14px",
                          lineHeight: 1.6,
                          color: palette.textSecondary,
                        }}
                      >
                        {description}
                      </p>
                    ) : null}
                  </div>

                  {badges.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "8px 11px",
                            borderRadius: "999px",
                            background: palette.card,
                            border: `1px solid ${palette.border}`,
                            color: palette.textMain,
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {hasLocationCard || hasTrustCard ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                        width: "100%",
                      }}
                    >
                      {hasLocationCard ? (
                        <div style={{ ...cardStyle, padding: "14px", background: palette.card }}>
                          <div style={cardSectionTitleStyle}>{UI_TEXT.locationCardTitle}</div>
                          {hasText(locationLine) ? (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "14px",
                                lineHeight: 1.55,
                                fontWeight: 700,
                                color: palette.textMain,
                              }}
                            >
                              {locationLine}
                            </div>
                          ) : null}
                          {hasText(schedule) ? (
                            <div
                              style={{
                                marginTop: "6px",
                                fontSize: "13px",
                                lineHeight: 1.5,
                                color: palette.textSecondary,
                              }}
                            >
                              {schedule}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {hasTrustCard ? (
                        <div
                          style={{
                            ...cardStyle,
                            padding: "14px",
                            background: palette.review,
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            justifyContent: "center",
                          }}
                        >
                          <div style={cardSectionTitleStyle}>{UI_TEXT.trustCardTitle}</div>
                          {hasAnyText([ratingValue, reviewCount]) ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              {hasText(ratingValue) ? (
                                <div style={{ fontSize: "20px", fontWeight: 800, color: palette.textMain }}>
                                  {ratingValue}
                                </div>
                              ) : null}
                              {hasText(reviewCount) ? (
                                <div style={{ fontSize: "13px", color: palette.textSecondary }}>{reviewCount}</div>
                              ) : null}
                            </div>
                          ) : null}
                          {hasText(trustNote) ? (
                            <div style={{ fontSize: "13px", color: palette.textSecondary, lineHeight: 1.5 }}>
                              {trustNote}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {hasHeroActions ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", width: "100%" }}>
                      <ActionLink href={bookingUrl} style={primaryButtonStyle}>
                        {bookingLabel}
                      </ActionLink>
                      <ActionLink href={servicesAnchor} style={secondaryButtonStyle}>
                        {servicesLabel}
                      </ActionLink>
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    position: "relative",
                    minHeight: "560px",
                    borderRadius: "24px",
                    overflow: "hidden",
                    background: heroImage ? "#EEF2FF" : "transparent",
                  }}
                >
                  {heroVisual}
                  {heroImage ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: palette.heroOverlay,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasBenefits ? (
        <section style={{ paddingBottom: "44px" }}>
          <div style={containerStyle}>
            <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
              <h2 style={sectionTitleStyle}>{UI_TEXT.benefitsTitle}</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              {benefits.map((item) => (
                <div key={`${item.title}_${item.text}`} style={{ ...cardStyle, padding: "14px", background: palette.card }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: palette.accentSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      marginBottom: "10px",
                    }}
                  >
                    {UI_TEXT.benefitIcon}
                  </div>
                  {hasText(item.title) ? (
                    <div style={{ fontSize: "15px", lineHeight: 1.35, fontWeight: 600, color: palette.textMain }}>
                      {item.title}
                    </div>
                  ) : null}
                  {hasText(item.text) ? (
                    <div style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                      {item.text}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {hasMetrics ? (
        <section style={{ paddingBottom: "44px" }}>
          <div style={containerStyle}>
            <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
              <h2 style={sectionTitleStyle}>{UI_TEXT.metricsTitle}</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "10px",
              }}
            >
              {metrics.map((item) => (
                <div key={`${item.label}_${item.value}`} style={{ ...cardStyle, padding: "16px", background: palette.card }}>
                  {hasText(item.value) ? (
                    <div style={{ fontSize: "28px", fontWeight: 700, color: palette.textMain, letterSpacing: "-0.04em" }}>
                      {item.value}
                    </div>
                  ) : null}
                  {hasText(item.label) ? (
                    <div style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                      {item.label}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {hasFeaturedServices ? (
        <section style={{ paddingBottom: "44px" }}>
          <div style={containerStyle}>
            <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
              <h2 style={sectionTitleStyle}>{UI_TEXT.featuredServicesTitle}</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "10px",
              }}
            >
              {featuredServices.map((service) => (
                <div key={`${service.title}_${service.price}_${service.time}`} style={{ ...cardStyle, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      {hasText(service.title) ? (
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "18px",
                            lineHeight: 1.3,
                            fontWeight: 600,
                            color: palette.textMain,
                          }}
                        >
                          {service.title}
                        </h3>
                      ) : null}
                      {hasText(service.note) ? (
                        <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                          {service.note}
                        </p>
                      ) : null}
                    </div>

                    {hasText(service.time) ? (
                      <div
                        style={{
                          flexShrink: 0,
                          padding: "6px 9px",
                          borderRadius: "10px",
                          background: palette.accentSoft,
                          fontSize: "12px",
                          fontWeight: 600,
                          color: palette.textMain,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {service.time}
                      </div>
                    ) : null}
                  </div>

                  {hasText(service.price) ? (
                    <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>
                      {service.price}
                    </div>
                  ) : null}

                  <ActionLink href={bookingUrl} style={secondaryButtonStyle}>
                    {bookingLabel}
                  </ActionLink>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {hasServiceCatalog ? (
        <section id="services" style={{ paddingBottom: "44px" }}>
          <div style={containerStyle}>
            <div style={{ ...cardStyle, padding: "16px" }}>
              <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
                <h2 style={sectionTitleStyle}>{UI_TEXT.serviceCatalogTitle}</h2>
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {serviceCatalog.map((service) => (
                  <div
                    key={`${service.name}_${service.price}_${service.duration}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)",
                      gap: "12px",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.78)",
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 600, color: palette.textMain }}>
                      {service.name}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: palette.textMain }}>
                      {service.price}
                    </div>
                    <div style={{ fontSize: "13px", color: palette.textSecondary, textAlign: "right" }}>
                      {service.duration}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasReviews ? (
        <section style={{ paddingBottom: "44px" }}>
          <div style={containerStyle}>
            <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
              <h2 style={sectionTitleStyle}>{UI_TEXT.reviewsTitle}</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "10px",
              }}
            >
              {reviews.map((review) => (
                <div key={`${review.name}_${review.text}_${review.rating}`} style={{ ...cardStyle, padding: "14px", background: palette.card }}>
                  {hasText(review.rating) ? (
                    <div style={{ fontSize: "14px", color: palette.star, letterSpacing: "1px" }}>
                      {review.rating}
                    </div>
                  ) : null}
                  {hasText(review.text) ? (
                    <div style={{ marginTop: "8px", fontSize: "13px", lineHeight: 1.6, color: palette.textSecondary }}>
                      {review.text}
                    </div>
                  ) : null}
                  {hasText(review.name) ? (
                    <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: 1.4, color: palette.textMain, fontWeight: 600 }}>
                      {review.name}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {hasAboutBlock || hasContactsBlock ? (
        <section style={{ paddingBottom: "44px" }}>
          <div style={containerStyle}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "10px",
                alignItems: "stretch",
              }}
            >
              {hasAboutBlock ? (
                <div style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h2 style={sectionTitleStyle}>{UI_TEXT.aboutTitle}</h2>

                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={`about_${index}`} style={sectionTextStyle}>
                      {paragraph}
                    </p>
                  ))}

                  {hasStats ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: "10px",
                        marginTop: "4px",
                      }}
                    >
                      {statsItems.map((item) => (
                        <div key={item.label} style={{ ...cardStyle, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>{item.value}</div>
                          <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "4px" }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasContactsBlock ? (
                <div style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", gap: "12px", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <h2 style={sectionTitleStyle}>{UI_TEXT.contactsTitle}</h2>
                  </div>

                  {hasText(address) ? (
                    <div>
                      <div style={cardSectionTitleStyle}>{UI_TEXT.addressLabel}</div>
                      <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.6, fontWeight: 600, color: palette.textMain }}>
                        {address}
                      </div>
                      {hasText(cityLine) ? (
                        <div style={{ marginTop: "2px", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                          {cityLine}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {hasText(schedule) ? (
                    <div>
                      <div style={cardSectionTitleStyle}>{UI_TEXT.scheduleLabel}</div>
                      <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.6, fontWeight: 600, color: palette.textMain }}>
                        {schedule}
                      </div>
                    </div>
                  ) : null}

                  {hasText(phone) ? (
                    <div>
                      <div style={cardSectionTitleStyle}>{UI_TEXT.phoneLabel}</div>
                      <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.6, fontWeight: 600, color: palette.textMain }}>
                        {phone}
                      </div>
                    </div>
                  ) : null}

                  {(hasText(mapLabel) && hasText(mapUrl)) || (hasText(bookingLabel) && hasText(bookingUrl)) ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      <ActionLink href={mapUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
                        {mapLabel}
                      </ActionLink>
                      <ActionLink href={bookingUrl} style={primaryButtonStyle}>
                        {bookingLabel}
                      </ActionLink>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {hasBookingBand ? (
        <section id="booking" style={{ paddingBottom: hasStickyBlock ? "110px" : "44px" }}>
          <div style={containerStyle}>
            <div
              style={{
                ...cardStyle,
                padding: "20px",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(246,235,221,0.92))",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {hasText(bookingBand.title) ? <h2 style={sectionTitleStyle}>{bookingBand.title}</h2> : null}
                  {hasText(bookingBand.text) ? <p style={sectionTextStyle}>{bookingBand.text}</p> : null}
                </div>

                {(hasText(bookingBand.booking_cta_label) && hasText(bookingBand.booking_cta_url)) ||
                (hasText(bookingBand.services_cta_label) && hasText(bookingBand.services_anchor)) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "flex-start" }}>
                    <ActionLink href={bookingBand.booking_cta_url} style={primaryButtonStyle}>
                      {bookingBand.booking_cta_label}
                    </ActionLink>
                    <ActionLink href={bookingBand.services_anchor} style={secondaryButtonStyle}>
                      {bookingBand.services_cta_label}
                    </ActionLink>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}
