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

function buildFallbackPayload() {
  return {
    identity: {
      master_name: "Алина",
      profession: "Мастер красоты",
      city: "Бишкек",
      hero_badge: "Премиальный мастер в TOTEM",
      subtitle: "Персональный подход, аккуратная техника и понятный premium-сервис без хаоса и лишней переписки.",
      description: "Персональная страница мастера в едином стиле TOTEM: сильный первый экран, понятные услуги, доверие через реальные метрики и удобная онлайн-запись.",
    },
    location: {
      address: "Киевская улица, 148",
      district: "Первомайский район",
      city: "Бишкек",
      schedule_text: "Ежедневно, 10:00–20:00",
      phone: "+996 700 123 456",
      whatsapp: "+996 700 123 456",
      instagram: "",
      telegram: "",
      map_url: "https://www.google.com/maps?q=" + encodeURIComponent("Киевская улица, 148, Первомайский район, Бишкек"),
    },
    trust: {
      rating_value: "4.9",
      review_count: "120+ отзывов",
      trust_note: "Здесь продаёт не место, а личность мастера, результат и ощущение качества уже с первого экрана.",
      sticky_subline: "Онлайн-запись • Популярные услуги • Персональный premium-сервис",
    },
    metrics: [
      { id: "metric-1", value: "4.9", label: "средняя оценка клиентов" },
      { id: "metric-2", value: "500+", label: "записей через удобный онлайн-формат" },
      { id: "metric-3", value: "3+", label: "года стабильной практики" },
      { id: "metric-4", value: "120+", label: "повторных визитов и лояльных клиентов" },
    ],
    cta: {
      booking_label: "Записаться к мастеру",
      booking_url: "#booking",
      services_label: "Смотреть услуги",
      services_anchor: "#services",
      contact_map_label: "Открыть на карте",
      sticky_label: "Записаться",
    },
    sections: {
      badges: [
        { id: "badge-1", text: "Онлайн-запись 24/7", is_active: true },
        { id: "badge-2", text: "Популярные услуги", is_active: true },
        { id: "badge-3", text: "Проверенный мастер", is_active: true },
        { id: "badge-4", text: "Комфортный premium-сервис", is_active: true },
      ],
      benefits: [
        {
          id: "benefit-1",
          title: "Личный подход",
          text: "Каждая услуга подбирается под ваш запрос, образ жизни и желаемый результат без шаблонных решений.",
          is_active: true,
        },
        {
          id: "benefit-2",
          title: "Аккуратная работа",
          text: "Внимание к деталям, чистая техника, спокойный процесс и понятный результат без лишнего стресса.",
          is_active: true,
        },
        {
          id: "benefit-3",
          title: "Удобная запись",
          text: "Понятная онлайн-запись, прозрачный выбор услуг и экономия времени без бесконечных переписок.",
          is_active: true,
        },
        {
          id: "benefit-4",
          title: "Предсказуемый сервис",
          text: "Ко мне возвращаются за стабильным качеством, комфортом и понятным уровнем сервиса.",
          is_active: true,
        },
      ],
      featured_services: [
        {
          id: "featured-1",
          title: "Женская стрижка",
          price: "от 1 500 KGS",
          time: "60–90 мин",
          note: "Форма, уход и аккуратная укладка в одном визите.",
          is_active: true,
        },
        {
          id: "featured-2",
          title: "Окрашивание волос",
          price: "от 3 500 KGS",
          time: "2–4 часа",
          note: "От мягкого обновления оттенка до полного изменения образа с понятной консультацией.",
          is_active: true,
        },
        {
          id: "featured-3",
          title: "Укладка / образ",
          price: "от 1 200 KGS",
          time: "45–60 мин",
          note: "На каждый день, съёмку, встречу или событие — без перегруза и с чистой формой.",
          is_active: true,
        },
      ],
      service_catalog: [
        { id: "catalog-1", name: "Женская стрижка", price: "от 1 500 KGS", duration: "60–90 мин", is_active: true, description: "" },
        { id: "catalog-2", name: "Мужская стрижка", price: "от 1 000 KGS", duration: "40–60 мин", is_active: true, description: "" },
        { id: "catalog-3", name: "Укладка", price: "от 1 200 KGS", duration: "45–60 мин", is_active: true, description: "" },
        { id: "catalog-4", name: "Окрашивание корней", price: "от 2 800 KGS", duration: "1.5–2 часа", is_active: true, description: "" },
        { id: "catalog-5", name: "Полное окрашивание", price: "от 3 500 KGS", duration: "2–4 часа", is_active: true, description: "" },
        { id: "catalog-6", name: "Уход / восстановление", price: "от 1 800 KGS", duration: "45–60 мин", is_active: true, description: "" },
      ],
      reviews: [
        {
          id: "review-1",
          name: "Айпери",
          text: "Очень понравился подход: спокойно, аккуратно и без навязывания. Результат получился именно таким, как я хотела.",
          rating: "5",
          is_active: true,
        },
        {
          id: "review-2",
          name: "Диана",
          text: "Записалась онлайн без лишних сообщений, пришла в своё время и получила отличный сервис. Очень комфортный мастер.",
          rating: "5",
          is_active: true,
        },
        {
          id: "review-3",
          name: "Алина",
          text: "Ценю стабильность. Уже не первый раз прихожу и каждый визит на хорошем уровне — и по качеству, и по атмосфере.",
          rating: "5",
          is_active: true,
        },
      ],
      about_paragraphs: [
        {
          id: "about-1",
          text: "Я работаю с клиентами, которым важны не только техника и визуальный результат, но и общее ощущение от сервиса. Для меня сильная работа — это когда человек чувствует себя спокойно, понимает, за что платит, и уходит с результатом, который ему действительно подходит.",
          is_active: true,
        },
        {
          id: "about-2",
          text: "В основе подхода — внимание к деталям, честные рекомендации и удобный формат записи. Без перегруза, без лишних обещаний, с уважением к вашему времени и ожиданиям.",
          is_active: true,
        },
      ],
      portfolio: [
        {
          id: "portfolio-1",
          alt: "Work 1",
          secure_url: "",
          is_active: true,
        },
      ],
      booking_band: {
        title: "Готовы выбрать услугу и удобное время?",
        text: "Онлайн-запись помогает быстро выбрать формат услуги и перейти к удобному времени без лишних сообщений и ожидания ответа.",
        booking_cta_label: "Перейти к записи",
        booking_cta_url: "#booking",
        services_cta_label: "Сначала посмотреть услуги",
        services_anchor: "#services",
      },
    },
    images: {
      hero: {
        image_asset_id: "cld:master-3_u6pois",
        secure_url: "https://res.cloudinary.com/dgcec21nz/image/upload/f_auto,q_auto,w_1200/v1774516005/master-3_u6pois.png",
        image_url: "https://res.cloudinary.com/dgcec21nz/image/upload/f_auto,q_auto,w_1200/v1774516005/master-3_u6pois.png",
        alt: "Алина — портрет мастера",
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
      title: "Алина — Мастер красоты в Бишкеке",
      description: "Персональная страница мастера красоты в Бишкеке: услуги, отзывы, онлайн-запись и premium-сервис.",
      canonical_url: "https://www.totemv.com/master/totem-demo-master",
    },
    stats: {
      years: "3+",
      rating: "4.9",
      bookings: "500+",
    },
  };
}

function normalizePayload(payload) {
  const source = isObject(payload) ? payload : {};
  const fallback = buildFallbackPayload();

  return {
    identity: {
      master_name: asString(source.identity?.master_name, fallback.identity.master_name),
      profession: asString(source.identity?.profession, fallback.identity.profession),
      city: asString(source.identity?.city || source.location?.city, fallback.identity.city),
      hero_badge: asString(source.identity?.hero_badge, fallback.identity.hero_badge),
      subtitle: asString(source.identity?.subtitle, fallback.identity.subtitle),
      description: asString(source.identity?.description, fallback.identity.description),
    },
    location: {
      address: asString(source.location?.address, fallback.location.address),
      district: asString(source.location?.district, fallback.location.district),
      city: asString(source.location?.city, fallback.location.city),
      schedule_text: asString(source.location?.schedule_text, fallback.location.schedule_text),
      phone: asString(source.location?.phone, fallback.location.phone),
      whatsapp: asString(source.location?.whatsapp, fallback.location.whatsapp),
      instagram: asString(source.location?.instagram, fallback.location.instagram),
      telegram: asString(source.location?.telegram, fallback.location.telegram),
      map_url: asString(source.location?.map_url, fallback.location.map_url),
    },
    trust: {
      rating_value: asString(source.trust?.rating_value, fallback.trust.rating_value),
      review_count: asString(source.trust?.review_count, fallback.trust.review_count),
      trust_note: asString(source.trust?.trust_note, fallback.trust.trust_note),
      sticky_subline: asString(source.trust?.sticky_subline, fallback.trust.sticky_subline),
    },
    metrics: getActiveItems(source.metrics).length ? getActiveItems(source.metrics) : fallback.metrics,
    cta: {
      booking_label: asString(source.cta?.booking_label, fallback.cta.booking_label),
      booking_url: asString(source.cta?.booking_url, fallback.cta.booking_url),
      services_label: asString(source.cta?.services_label, fallback.cta.services_label),
      services_anchor: asString(source.cta?.services_anchor, fallback.cta.services_anchor),
      sticky_label: asString(source.cta?.sticky_label, fallback.cta.sticky_label),
      contact_map_label: asString(source.cta?.contact_map_label, fallback.cta.contact_map_label),
    },
    sections: {
      badges: getActiveItems(source.sections?.badges).length ? getActiveItems(source.sections?.badges) : fallback.sections.badges,
      benefits: getActiveItems(source.sections?.benefits).length ? getActiveItems(source.sections?.benefits) : fallback.sections.benefits,
      featured_services: getActiveItems(source.sections?.featured_services).length ? getActiveItems(source.sections?.featured_services) : fallback.sections.featured_services,
      service_catalog: getActiveItems(source.sections?.service_catalog).length ? getActiveItems(source.sections?.service_catalog) : fallback.sections.service_catalog,
      reviews: getActiveItems(source.sections?.reviews).length ? getActiveItems(source.sections?.reviews) : fallback.sections.reviews,
      about_paragraphs: getActiveItems(source.sections?.about_paragraphs).length ? getActiveItems(source.sections?.about_paragraphs) : fallback.sections.about_paragraphs,
      portfolio: getActiveItems(source.sections?.portfolio).length ? getActiveItems(source.sections?.portfolio) : fallback.sections.portfolio,
      booking_band: isObject(source.sections?.booking_band) ? { ...fallback.sections.booking_band, ...source.sections.booking_band } : fallback.sections.booking_band,
    },
    images: {
      hero: {
        image_asset_id: source.images?.hero?.image_asset_id ?? fallback.images.hero.image_asset_id,
        secure_url: asString(source.images?.hero?.secure_url, fallback.images.hero.secure_url),
        image_url: asString(source.images?.hero?.image_url, fallback.images.hero.image_url),
        alt: asString(source.images?.hero?.alt, fallback.images.hero.alt),
      },
      avatar: {
        image_asset_id: source.images?.avatar?.image_asset_id ?? fallback.images.avatar.image_asset_id,
        secure_url: asString(source.images?.avatar?.secure_url, fallback.images.avatar.secure_url),
        image_url: asString(source.images?.avatar?.image_url, fallback.images.avatar.image_url),
        alt: asString(source.images?.avatar?.alt, fallback.images.avatar.alt),
      },
      assets: isObject(source.images?.assets) ? source.images.assets : fallback.images.assets,
    },
    seo: {
      title: asString(source.seo?.title, fallback.seo.title),
      description: asString(source.seo?.description, fallback.seo.description),
      canonical_url: asString(source.seo?.canonical_url, fallback.seo.canonical_url),
    },
    stats: {
      years: asString(source.stats?.years, fallback.stats.years),
      rating: asString(source.stats?.rating, fallback.stats.rating),
      bookings: asString(source.stats?.bookings, fallback.stats.bookings),
    },
  };
}

function mapPayloadToViewModel(payload) {
  const normalized = normalizePayload(payload);
  const badges = normalized.sections.badges.map((item) => asString(item.text)).filter(Boolean);
  const benefits = normalized.sections.benefits.map((item) => ({
    title: asString(item.title),
    text: asString(item.text),
  })).filter((item) => item.title || item.text);
  const metrics = normalized.metrics.map((item) => ({
    value: asString(item.value),
    label: asString(item.label),
  })).filter((item) => item.value || item.label);
  const featuredServices = normalized.sections.featured_services.map((item) => ({
    title: asString(item.title),
    price: asString(item.price),
    time: asString(item.time),
    note: asString(item.note),
  })).filter((item) => item.title || item.price || item.time || item.note);
  const serviceCatalog = normalized.sections.service_catalog.map((item) => ({
    name: asString(item.name),
    price: asString(item.price),
    duration: asString(item.duration),
    description: asString(item.description),
  })).filter((item) => item.name || item.price || item.duration);
  const reviews = normalized.sections.reviews.map((item) => ({
    name: asString(item.name),
    text: asString(item.text),
    rating: asString(item.rating, "5"),
  })).filter((item) => item.name || item.text);
  const aboutParagraphs = normalized.sections.about_paragraphs.map((item) => asString(item.text)).filter(Boolean);
  const heroImage = asString(normalized.images.hero.secure_url || normalized.images.hero.image_url, buildFallbackPayload().images.hero.secure_url);

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
    heroAlt: normalized.images.hero.alt || `${normalized.identity.master_name} — портрет мастера`,
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

        if (!response.ok || !json?.ok) {
          setRemoteState({ loading: false, ok: false, payload: null });
          return;
        }

        setRemoteState({
          loading: false,
          ok: Boolean(json.published_exists),
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
    paddingBottom: "110px",
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

  return (
    <div style={shellStyle}>
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
                {masterName.slice(0, 1)}
              </div>

              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: palette.textMain }}>
                  {masterName} — {profession}
                </div>
                <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "2px" }}>
                  {city} • Персональная страница мастера
                </div>
              </div>
            </div>

            <a href={bookingUrl} style={primaryButtonStyle}>
              Записаться онлайн
            </a>
          </div>
        </div>
      </section>

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

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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

                  <div
                    style={{
                      fontSize: "18px",
                      lineHeight: 1.45,
                      color: palette.textMain,
                      fontWeight: 500,
                    }}
                  >
                    {profession}. {subtitle}
                  </div>

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
                </div>

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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    width: "100%",
                  }}
                >
                  <div style={{ ...cardStyle, padding: "14px", background: palette.card }}>
                    <div style={{ fontSize: "12px", color: palette.textSecondary }}>Локация</div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "14px",
                        lineHeight: 1.55,
                        fontWeight: 600,
                        color: palette.textMain,
                      }}
                    >
                      {address}, {district}
                    </div>
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
                  </div>

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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontSize: "20px", fontWeight: 700, color: palette.textMain }}>{ratingValue}</div>
                      <div style={{ fontSize: "15px", color: palette.star, letterSpacing: "1px" }}>★★★★★</div>
                      <div style={{ fontSize: "13px", color: palette.textSecondary }}>{reviewCount}</div>
                    </div>
                    <div style={{ fontSize: "13px", color: palette.textSecondary, lineHeight: 1.5 }}>
                      {trustNote}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", width: "100%" }}>
                  <a href={bookingUrl} style={primaryButtonStyle}>
                    {bookingLabel}
                  </a>
                  <a href={servicesAnchor} style={secondaryButtonStyle}>
                    {servicesLabel}
                  </a>
                </div>
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

      <section style={{ paddingBottom: "44px" }}>
        <div style={containerStyle}>
          <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
            <h2 style={sectionTitleStyle}>Почему выбирают этого мастера</h2>
            <p style={sectionTextStyle}>
              Здесь сочетаются личный подход, аккуратная техника и комфортный клиентский опыт. Не просто услуга, а понятный и качественный сервис вокруг вашего результата.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
            }}
          >
            {benefits.map((item) => (
              <div key={item.title} style={{ ...cardStyle, padding: "14px", background: palette.card }}>
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
                <div style={{ fontSize: "15px", lineHeight: 1.35, fontWeight: 600, color: palette.textMain }}>
                  {item.title}
                </div>
                <div style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "44px" }}>
        <div style={containerStyle}>
          <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
            <h2 style={sectionTitleStyle}>Быстрое доверие</h2>
            <p style={sectionTextStyle}>
              У мастера доверие строится не на обещаниях, а на понятных цифрах, повторных визитах и спокойной предсказуемости сервиса.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
            }}
          >
            {metrics.map((item) => (
              <div key={item.label} style={{ ...cardStyle, padding: "16px", background: palette.card }}>
                <div style={{ fontSize: "28px", fontWeight: 700, color: palette.textMain, letterSpacing: "-0.04em" }}>
                  {item.value}
                </div>
                <div style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "44px" }}>
        <div style={containerStyle}>
          <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
            <h2 style={sectionTitleStyle}>Популярные услуги</h2>
            <p style={sectionTextStyle}>
              Услуги, с которых чаще всего начинается знакомство. Понятная ценность, удобный формат и хороший первый опыт для новых клиентов.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "10px",
            }}
          >
            {featuredServices.map((service) => (
              <div key={service.title} style={{ ...cardStyle, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
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
                    <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                      {service.note}
                    </p>
                  </div>

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
                </div>

                <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>
                  {service.price}
                </div>

                <a href={bookingUrl} style={secondaryButtonStyle}>
                  Записаться
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" style={{ paddingBottom: "44px" }}>
        <div style={containerStyle}>
          <div style={{ ...cardStyle, padding: "16px" }}>
            <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
              <h2 style={sectionTitleStyle}>Каталог услуг</h2>
              <p style={sectionTextStyle}>
                Прозрачный список услуг с ориентиром по стоимости и времени. Финальная рекомендация может уточняться под ваш запрос, длину, объём или желаемый образ.
              </p>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {serviceCatalog.map((service) => (
                <div
                  key={service.name}
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

      <section style={{ paddingBottom: "44px" }}>
        <div style={containerStyle}>
          <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
            <h2 style={sectionTitleStyle}>Отзывы клиентов</h2>
            <p style={sectionTextStyle}>
              Настоящее доверие строится не на обещаниях, а на повторных визитах и ощущении, что вас услышали. Именно это чаще всего отмечают клиенты.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "10px",
            }}
          >
            {reviews.map((review) => (
              <div key={review.name} style={{ ...cardStyle, padding: "14px", background: palette.card }}>
                <div style={{ fontSize: "14px", color: palette.star, letterSpacing: "1px" }}>★★★★★</div>
                <div style={{ marginTop: "8px", fontSize: "13px", lineHeight: 1.6, color: palette.textSecondary }}>
                  {review.text}
                </div>
                <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: 1.4, color: palette.textMain, fontWeight: 600 }}>
                  {review.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            <div style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h2 style={sectionTitleStyle}>О мастере</h2>

              {aboutParagraphs.map((paragraph, index) => (
                <p key={`about_${index}`} style={sectionTextStyle}>
                  {paragraph}
                </p>
              ))}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  marginTop: "4px",
                }}
              >
                <div style={{ ...cardStyle, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>{stats.years}</div>
                  <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "4px" }}>года практики</div>
                </div>

                <div style={{ ...cardStyle, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>{stats.rating}</div>
                  <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "4px" }}>рейтинг клиентов</div>
                </div>

                <div style={{ ...cardStyle, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>{stats.bookings}</div>
                  <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "4px" }}>записей</div>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", gap: "12px", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h2 style={sectionTitleStyle}>Контакты и локация</h2>
                <p style={sectionTextStyle}>
                  Для master page карта в iframe не нужна: адрес должен быть понятным, но внимание должно оставаться на личности мастера и записи.
                </p>
              </div>

              <div>
                <div style={{ fontSize: "12px", lineHeight: 1.4, color: palette.textSecondary }}>Адрес</div>
                <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.6, fontWeight: 600, color: palette.textMain }}>
                  {address}
                </div>
                <div style={{ marginTop: "2px", fontSize: "13px", lineHeight: 1.55, color: palette.textSecondary }}>
                  {district}, {city}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", lineHeight: 1.4, color: palette.textSecondary }}>График</div>
                <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.6, fontWeight: 600, color: palette.textMain }}>
                  {schedule}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", lineHeight: 1.4, color: palette.textSecondary }}>Телефон</div>
                <div style={{ marginTop: "4px", fontSize: "14px", lineHeight: 1.6, fontWeight: 600, color: palette.textMain }}>
                  {phone}
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <a href={mapUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
                  {mapLabel}
                </a>
                <a href={bookingUrl} style={primaryButtonStyle}>
                  {bookingLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="booking" style={{ paddingBottom: "110px" }}>
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
                <h2 style={sectionTitleStyle}>{bookingBand.title}</h2>
                <p style={sectionTextStyle}>
                  {bookingBand.text}
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "flex-start" }}>
                <a href={bookingBand.booking_cta_url || bookingUrl} style={primaryButtonStyle}>
                  {bookingBand.booking_cta_label || bookingLabel}
                </a>
                <a href={bookingBand.services_anchor || servicesAnchor} style={secondaryButtonStyle}>
                  {bookingBand.services_cta_label || servicesLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <div style={{ fontSize: "14px", fontWeight: 700, color: palette.textMain }}>
              {masterName} • {profession}
            </div>
            <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "2px" }}>
              {stickySubline}
            </div>
          </div>

          <a href={bookingUrl} style={primaryButtonStyle}>
            {stickyLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
