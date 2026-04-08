
import { useEffect, useMemo, useState } from "react";

const PUBLIC_API_BASE =
  String(import.meta.env.VITE_PUBLIC_API_BASE || "https://api.totemv.com/public").trim() ||
  "https://api.totemv.com/public";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getActiveItems(items) {
  return asArray(items).filter((item) => {
    if (!isObject(item)) return false;
    if (item.is_active === false) return false;
    return true;
  });
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

function createEmptyPayload() {
  return {
    identity: {
      master_name: "",
      profession: "",
      city: "",
      hero_badge: "",
      subtitle: "",
      description: "",
    },
    location: {
      address: "",
      district: "",
      city: "",
      schedule_text: "",
      phone: "",
      whatsapp: "",
      instagram: "",
      telegram: "",
      map_url: "",
    },
    trust: {
      rating_value: "",
      review_count: "",
      trust_note: "",
      sticky_subline: "",
    },
    metrics: [],
    cta: {
      booking_label: "",
      booking_url: "",
      services_label: "",
      services_anchor: "",
      contact_map_label: "",
      sticky_label: "",
    },
    sections: {
      badges: [],
      benefits: [],
      featured_services: [],
      service_catalog: [],
      reviews: [],
      about_paragraphs: [],
      portfolio: [],
      booking_band: {
        title: "",
        text: "",
        booking_cta_label: "",
        booking_cta_url: "",
        services_cta_label: "",
        services_anchor: "",
      },
    },
    images: {
      hero: {
        image_asset_id: null,
        secure_url: "",
        image_url: "",
        alt: "",
      },
      avatar: {
        image_asset_id: "",
        secure_url: "",
        image_url: "",
        alt: "",
      },
      assets: {},
    },
    seo: {
      title: "",
      description: "",
      canonical_url: "",
    },
    stats: {
      years: "",
      rating: "",
      bookings: "",
    },
  };
}

function normalizePayload(payload) {
  const source = isObject(payload) ? payload : {};
  const empty = createEmptyPayload();

  return {
    identity: {
      master_name: asString(source.identity?.master_name, empty.identity.master_name),
      profession: asString(source.identity?.profession, empty.identity.profession),
      city: asString(source.identity?.city || source.location?.city, empty.identity.city),
      hero_badge: asString(source.identity?.hero_badge, empty.identity.hero_badge),
      subtitle: asString(source.identity?.subtitle, empty.identity.subtitle),
      description: asString(source.identity?.description, empty.identity.description),
    },
    location: {
      address: asString(source.location?.address, empty.location.address),
      district: asString(source.location?.district, empty.location.district),
      city: asString(source.location?.city, empty.location.city),
      schedule_text: asString(source.location?.schedule_text, empty.location.schedule_text),
      phone: asString(source.location?.phone, empty.location.phone),
      whatsapp: asString(source.location?.whatsapp, empty.location.whatsapp),
      instagram: asString(source.location?.instagram, empty.location.instagram),
      telegram: asString(source.location?.telegram, empty.location.telegram),
      map_url: asString(source.location?.map_url, empty.location.map_url),
    },
    trust: {
      rating_value: asString(source.trust?.rating_value, empty.trust.rating_value),
      review_count: asString(source.trust?.review_count, empty.trust.review_count),
      trust_note: asString(source.trust?.trust_note, empty.trust.trust_note),
      sticky_subline: asString(source.trust?.sticky_subline, empty.trust.sticky_subline),
    },
    metrics: getActiveItems(source.metrics),
    cta: {
      booking_label: asString(source.cta?.booking_label, empty.cta.booking_label),
      booking_url: asString(source.cta?.booking_url, empty.cta.booking_url),
      services_label: asString(source.cta?.services_label, empty.cta.services_label),
      services_anchor: asString(source.cta?.services_anchor, empty.cta.services_anchor),
      sticky_label: asString(source.cta?.sticky_label, empty.cta.sticky_label),
      contact_map_label: asString(source.cta?.contact_map_label, empty.cta.contact_map_label),
    },
    sections: {
      badges: getActiveItems(source.sections?.badges),
      benefits: getActiveItems(source.sections?.benefits),
      featured_services: getActiveItems(source.sections?.featured_services),
      service_catalog: getActiveItems(source.sections?.service_catalog),
      reviews: getActiveItems(source.sections?.reviews),
      about_paragraphs: getActiveItems(source.sections?.about_paragraphs),
      portfolio: getActiveItems(source.sections?.portfolio),
      booking_band: isObject(source.sections?.booking_band)
        ? { ...empty.sections.booking_band, ...source.sections.booking_band }
        : empty.sections.booking_band,
    },
    images: {
      hero: {
        image_asset_id: source.images?.hero?.image_asset_id ?? empty.images.hero.image_asset_id,
        secure_url: asString(source.images?.hero?.secure_url, empty.images.hero.secure_url),
        image_url: asString(source.images?.hero?.image_url, empty.images.hero.image_url),
        alt: asString(source.images?.hero?.alt, empty.images.hero.alt),
      },
      avatar: {
        image_asset_id: source.images?.avatar?.image_asset_id ?? empty.images.avatar.image_asset_id,
        secure_url: asString(source.images?.avatar?.secure_url, empty.images.avatar.secure_url),
        image_url: asString(source.images?.avatar?.image_url, empty.images.avatar.image_url),
        alt: asString(source.images?.avatar?.alt, empty.images.avatar.alt),
      },
      assets: isObject(source.images?.assets) ? source.images.assets : empty.images.assets,
    },
    seo: {
      title: asString(source.seo?.title, empty.seo.title),
      description: asString(source.seo?.description, empty.seo.description),
      canonical_url: asString(source.seo?.canonical_url, empty.seo.canonical_url),
    },
    stats: {
      years: asString(source.stats?.years, empty.stats.years),
      rating: asString(source.stats?.rating, empty.stats.rating),
      bookings: asString(source.stats?.bookings, empty.stats.bookings),
    },
  };
}

function mapPayloadToViewModel(payload) {
  const normalized = normalizePayload(payload);
  const badges = normalized.sections.badges
    .map((item) => asString(item.text))
    .filter(Boolean);
  const benefits = normalized.sections.benefits
    .map((item) => ({
      title: asString(item.title),
      text: asString(item.text),
    }))
    .filter((item) => item.title || item.text);
  const metrics = normalized.metrics
    .map((item) => ({
      value: asString(item.value),
      label: asString(item.label),
    }))
    .filter((item) => item.value || item.label);
  const featuredServices = normalized.sections.featured_services
    .map((item) => ({
      title: asString(item.title),
      price: asString(item.price),
      time: asString(item.time),
      note: asString(item.note),
    }))
    .filter((item) => item.title || item.price || item.time || item.note);
  const serviceCatalog = normalized.sections.service_catalog
    .map((item) => ({
      name: asString(item.name),
      price: asString(item.price),
      duration: asString(item.duration),
      description: asString(item.description),
    }))
    .filter((item) => item.name || item.price || item.duration || item.description);
  const reviews = normalized.sections.reviews
    .map((item) => ({
      name: asString(item.name),
      text: asString(item.text),
      rating: asString(item.rating),
    }))
    .filter((item) => item.name || item.text || item.rating);
  const aboutParagraphs = normalized.sections.about_paragraphs
    .map((item) => asString(item.text))
    .filter(Boolean);
  const heroImage = asString(normalized.images.hero.secure_url || normalized.images.hero.image_url);

  return {
    masterName: normalized.identity.master_name,
    profession: normalized.identity.profession,
    city: normalized.identity.city || normalized.location.city,
    district: normalized.location.district,
    address: normalized.location.address,
    schedule: normalized.location.schedule_text,
    phone: normalized.location.phone || normalized.location.whatsapp,
    mapUrl: normalized.location.map_url,
    heroImage,
    heroAlt: normalized.images.hero.alt || normalized.identity.master_name,
    heroBadge: normalized.identity.hero_badge,
    subtitle: normalized.identity.subtitle,
    description: normalized.identity.description,
    ratingValue: normalized.trust.rating_value,
    reviewCount: normalized.trust.review_count,
    trustNote: normalized.trust.trust_note,
    badges,
    benefits,
    metrics,
    featuredServices,
    serviceCatalog,
    reviews,
    aboutParagraphs,
    stats: normalized.stats,
    bookingBand: normalized.sections.booking_band,
    bookingLabel: normalized.cta.booking_label,
    bookingUrl: normalized.cta.booking_url,
    servicesLabel: normalized.cta.services_label,
    servicesAnchor: normalized.cta.services_anchor,
    mapLabel: normalized.cta.contact_map_label,
    stickyLabel: normalized.cta.sticky_label,
    stickySubline: normalized.trust.sticky_subline,
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
  const [remoteState, setRemoteState] = useState({
    loading: true,
    ok: false,
    payload: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPublicPayload() {
      if (!slug) {
        setRemoteState({ loading: false, ok: false, payload: null });
        return;
      }

      try {
        const response = await fetch(`${PUBLIC_API_BASE}/masters/${slug}`);
        const json = await response.json();

        if (cancelled) return;

        if (!response.ok || !json?.ok || !json?.published_exists) {
          setRemoteState({ loading: false, ok: false, payload: null });
          return;
        }

        setRemoteState({
          loading: false,
          ok: true,
          payload: json.payload || null,
        });
      } catch (error) {
        if (cancelled) return;
        setRemoteState({ loading: false, ok: false, payload: null });
      }
    }

    loadPublicPayload();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const view = useMemo(() => mapPayloadToViewModel(remoteState.payload), [remoteState.payload]);

  const masterName = view.masterName;
  const profession = view.profession;
  const city = view.city;
  const district = view.district;
  const address = view.address;
  const schedule = view.schedule;
  const phone = view.phone;
  const mapUrl = view.mapUrl;
  const heroImage = view.heroImage;
  const heroAlt = view.heroAlt;
  const heroBadge = view.heroBadge;
  const subtitle = view.subtitle;
  const description = view.description;
  const metrics = view.metrics;
  const benefits = view.benefits;
  const featuredServices = view.featuredServices;
  const serviceCatalog = view.serviceCatalog;
  const reviews = view.reviews;
  const badges = view.badges;
  const aboutParagraphs = view.aboutParagraphs;
  const stats = view.stats;
  const bookingBand = view.bookingBand;
  const bookingUrl = view.bookingUrl;
  const bookingLabel = view.bookingLabel;
  const servicesLabel = view.servicesLabel;
  const servicesAnchor = view.servicesAnchor;
  const mapLabel = view.mapLabel;
  const stickyLabel = view.stickyLabel;
  const stickySubline = view.stickySubline;
  const ratingValue = view.ratingValue;
  const reviewCount = view.reviewCount;
  const trustNote = view.trustNote;

  const locationLine = joinText([address, district], ", ");
  const cityLine = joinText([district, city], ", ");
  const titleLine = joinText([masterName, profession], " — ");
  const topMetaLine = joinText([city, hasText(city) ? "Персональная страница мастера" : ""], " • ");
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
    { value: stats.years, label: "года практики" },
    { value: stats.rating, label: "рейтинг клиентов" },
    { value: stats.bookings, label: "записей" },
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
  const hasStickyBlock = hasAnyText([masterName, profession, stickySubline, stickyLabel, bookingUrl]);

  const palette = {
    bg: "#F8F5F1",
    card: "#FFFFFF",
    textMain: "#23201C",
    textSecondary: "#706860",
    border: "#EAE2D8",
    accent: "#C8A97E",
    accentSoft: "#F6EBDD",
    button: "#4A4038",
    buttonText: "#FFFFFF",
    star: "#D39B36",
    review: "#FFFDF9",
    heroOverlay: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(35,32,28,0.05) 100%)",
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
    fontWeight: 600,
    letterSpacing: "-0.2px",
    color: palette.textMain,
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
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(35,32,28,0.04)",
    boxSizing: "border-box",
  };

  const primaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "46px",
    padding: "13px 20px",
    borderRadius: "12px",
    background: palette.button,
    color: palette.buttonText,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
    border: "none",
  };

  const secondaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "46px",
    padding: "13px 20px",
    borderRadius: "12px",
    background: palette.card,
    color: palette.textMain,
    textDecoration: "none",
    fontWeight: 600,
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
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,245,239,0.98) 100%)",
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
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,245,239,0.98) 100%)",
                padding: "30px",
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
                        fontWeight: 600,
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
                          fontWeight: 600,
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
                          fontWeight: 500,
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
                            fontWeight: 500,
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
                          <div style={{ fontSize: "12px", color: palette.textSecondary }}>Локация</div>
                          {hasText(locationLine) ? (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "14px",
                                lineHeight: 1.55,
                                fontWeight: 600,
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
                          <div style={{ fontSize: "12px", color: palette.textSecondary }}>Доверие и отзывы</div>
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
                                <div style={{ fontSize: "20px", fontWeight: 700, color: palette.textMain }}>
                                  {ratingValue}
                                </div>
                              ) : null}
                              <div style={{ fontSize: "15px", color: palette.star, letterSpacing: "1px" }}>★★★★★</div>
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
                    borderRadius: "20px",
                    overflow: "hidden",
                    background: "#ECE4DB",
                  }}
                >
                  {heroVisual}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: palette.heroOverlay,
                    }}
                  />
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
              <h2 style={sectionTitleStyle}>Почему выбирают этого мастера</h2>
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
                    ✦
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
              <h2 style={sectionTitleStyle}>Быстрое доверие</h2>
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
              <h2 style={sectionTitleStyle}>Популярные услуги</h2>
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
                <h2 style={sectionTitleStyle}>Каталог услуг</h2>
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
              <h2 style={sectionTitleStyle}>Отзывы клиентов</h2>
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
                  <div style={{ fontSize: "14px", color: palette.star, letterSpacing: "1px" }}>
                    {hasText(review.rating) ? review.rating : "★★★★★"}
                  </div>
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
                  <h2 style={sectionTitleStyle}>О мастере</h2>

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
                    <h2 style={sectionTitleStyle}>Контакты и локация</h2>
                  </div>

                  {hasText(address) ? (
                    <div>
                      <div style={{ fontSize: "12px", lineHeight: 1.4, color: palette.textSecondary }}>Адрес</div>
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
                      <div style={{ fontSize: "12px", lineHeight: 1.4, color: palette.textSecondary }}>График</div>
                      <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.6, fontWeight: 600, color: palette.textMain }}>
                        {schedule}
                      </div>
                    </div>
                  ) : null}

                  {hasText(phone) ? (
                    <div>
                      <div style={{ fontSize: "12px", lineHeight: 1.4, color: palette.textSecondary }}>Телефон</div>
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

      {hasStickyBlock ? (
        <div
          style={{
            position: "fixed",
            left: "16px",
            right: "16px",
            bottom: "16px",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              maxWidth: "860px",
              margin: "0 auto",
              pointerEvents: "auto",
              background: "rgba(255,255,255,0.92)",
              border: `1px solid ${palette.border}`,
              boxShadow: "0 16px 38px rgba(53, 29, 45, 0.14)",
              backdropFilter: "blur(12px)",
              borderRadius: "24px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              {hasText(titleLine) ? (
                <div style={{ fontSize: "14px", fontWeight: 700, color: palette.textMain }}>
                  {titleLine.replace(" — ", " • ")}
                </div>
              ) : null}
              {hasText(stickySubline) ? (
                <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "2px" }}>
                  {stickySubline}
                </div>
              ) : null}
            </div>

            <ActionLink href={bookingUrl} style={primaryButtonStyle}>
              {stickyLabel}
            </ActionLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
