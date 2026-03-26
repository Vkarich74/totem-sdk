import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { getSalon, getMasters, getMetrics } from "../api/publicApi";
import { setMeta, setCanonical, setJSONLD } from "../api/seo";
import Skeleton from "../layout/Skeleton";


const DEMO_SLUG = "totem-demo-salon";

const DEMO_VISUALS = {
  hero:
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774513655/hero_bx77pj.png",
  services: {
    haircut:
      "https://res.cloudinary.com/dgcec21nz/image/upload/v1774514323/haircut_lbikyy.png",
    color:
      "https://res.cloudinary.com/dgcec21nz/image/upload/v1774514662/color_ca67ww.png",
    care:
      "https://res.cloudinary.com/dgcec21nz/image/upload/v1774514966/care_jijbdw.png",
  },
  masters: [
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774515325/master-1_ooxsvg.png",
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774515610/master-2_c8xyxp.png",
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774516005/master-3_u6pois.png",
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774516063/master-4_vikzad.png",
  ],
  gallery: [
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774516334/interior-1_cyhcpd.png",
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774516574/work-1_zrzkau.png",
    "https://res.cloudinary.com/dgcec21nz/image/upload/v1774516827/result-1_sb8uki.png",
  ],
};

const DEMO_MASTER_FALLBACKS = [
  {
    id: "demo-master-1",
    name: "Алексей",
    role: "Старший стилист",
    bio: "Точные стрижки, мужские и женские формы, аккуратная работа с текстурой и укладкой.",
  },
  {
    id: "demo-master-2",
    name: "Алина",
    role: "Колорист",
    bio: "Сложные окрашивания, мягкие переходы оттенков и работа с дорогим светлым блондом.",
  },
  {
    id: "demo-master-3",
    name: "Мадина",
    role: "Топ-мастер",
    bio: "Собирает образ целиком: укладка, финальная подача и премиальный клиентский сервис.",
  },
  {
    id: "demo-master-4",
    name: "Елена",
    role: "Стилист по уходу",
    bio: "Уходовые процедуры, восстановление волос и комфортный салонный ритуал для клиента.",
  },
];

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

function createMapEmbedUrl(addressValue) {
  const query = encodeURIComponent(addressValue);
  return `https://www.google.com/maps?q=${query}&z=16&output=embed`;
}

function getInitials(name) {
  const safe = normalizeText(name);
  if (!safe) return "MS";
  return safe
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getReviewData() {
  return [
    {
      id: 1,
      name: "Айгерим",
      text: "Очень удобно, что можно посмотреть услуги, акции и сразу записаться с телефона. Всё понятно и без лишних звонков.",
      rating: 5,
    },
    {
      id: 2,
      name: "Мария",
      text: "Понравилась атмосфера и сервис. Запись заняла пару минут, а в салоне всё было спокойно и аккуратно.",
      rating: 5,
    },
    {
      id: 3,
      name: "Асель",
      text: "Хороший формат страницы: видны услуги, акции и контакты. Удобно выбрать подходящий вариант заранее.",
      rating: 5,
    },
  ];
}

function getPromoData() {
  return [
    {
      id: 1,
      title: "Новый клиент — скидка 10%",
      text: "Приятный старт для первого визита в салон. Подходит на популярные услуги и комплексные процедуры.",
      badge: "Для новых клиентов",
    },
    {
      id: 2,
      title: "10 посещение бесплатно",
      text: "Программа лояльности для постоянных гостей салона с заметной выгодой на регулярных визитах.",
      badge: "Бонусная программа",
    },
    {
      id: 3,
      title: "Подарочный абонемент",
      text: "Красивый и удобный формат подарка: уходовые процедуры, бьюти-сервисы и персональные предложения.",
      badge: "Подарок",
    },
    {
      id: 4,
      title: "Абонементы на курс услуг",
      text: "Выгодные пакеты на несколько посещений для тех, кто хочет планировать уход заранее.",
      badge: "Выгодно",
    },
  ];
}

function getBenefitsData() {
  return [
    {
      id: 1,
      title: "Онлайн запись 24/7",
      text: "Клиент может выбрать услугу и удобное время без звонков и ожидания.",
    },
    {
      id: 2,
      title: "Понятные цены и услуги",
      text: "Вся информация о стоимости, длительности и предложениях собрана на одной странице.",
    },
    {
      id: 3,
      title: "Акции и бонусы",
      text: "Скидки, абонементы и подарочные предложения помогают возвращать клиентов снова.",
    },
    {
      id: 4,
      title: "Удобно с телефона",
      text: "Страница адаптирована под мобильный сценарий, где приходит большая часть клиентов.",
    },
  ];
}

function getServiceCatalogData(services) {
  if (services.length > 0) {
    return services.slice(0, 12);
  }

  return [
    { id: "demo-1", name: "Женская стрижка", price: 1200, durationMin: 60, description: "Стрижка и лёгкая укладка." },
    { id: "demo-2", name: "Окрашивание волос", price: 3500, durationMin: 150, description: "Подбор оттенка и окрашивание." },
    { id: "demo-3", name: "Маникюр", price: 1000, durationMin: 60, description: "Уход и аккуратное покрытие." },
    { id: "demo-4", name: "Педикюр", price: 1400, durationMin: 75, description: "Комфортный уход для ногтей и стоп." },
    { id: "demo-5", name: "Укладка", price: 900, durationMin: 45, description: "Быстрая укладка для повседневного образа." },
    { id: "demo-6", name: "Уход за волосами", price: 1800, durationMin: 60, description: "Восстановление и питание волос." },
    { id: "demo-7", name: "Оформление бровей", price: 700, durationMin: 30, description: "Форма и аккуратная коррекция." },
    { id: "demo-8", name: "Вечерний макияж", price: 2200, durationMin: 75, description: "Под мероприятие или фотосессию." },
  ];
}


function pickDemoServiceImage(service, index) {
  const name = normalizeText(service?.name).toLowerCase();
  const description = normalizeText(service?.description).toLowerCase();
  const combined = `${name} ${description}`;

  if (
    combined.includes("окраш") ||
    combined.includes("блонд") ||
    combined.includes("color")
  ) {
    return DEMO_VISUALS.services.color;
  }

  if (
    combined.includes("уход") ||
    combined.includes("восстанов") ||
    combined.includes("маск") ||
    combined.includes("spa")
  ) {
    return DEMO_VISUALS.services.care;
  }

  if (
    combined.includes("стриж") ||
    combined.includes("уклад") ||
    combined.includes("hair")
  ) {
    return DEMO_VISUALS.services.haircut;
  }

  return [
    DEMO_VISUALS.services.haircut,
    DEMO_VISUALS.services.color,
    DEMO_VISUALS.services.care,
  ][index % 3];
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
  const [teamOpen, setTeamOpen] = useState(false);

  const isDemoSalon = slug === DEMO_SLUG;

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

        const title = isDemoSalon
          ? "TOTEM Демо Салон"
          : pickFirstString(salonData?.name, "Салон");
        const description = isDemoSalon
          ? "TOTEM Демо Салон: премиальная витрина салона с услугами, командой, галереей, картой и удобной онлайн записью."
          : "Публичная страница салона в TOTEM: услуги, команда, контакты и удобная онлайн запись.";

        document.title = `${title} | Онлайн запись`;

        setMeta("description", description);
        setMeta("og:title", title, true);
        setMeta("og:description", description, true);
        setMeta("og:type", "website", true);
        setCanonical(window.location.href);

        setJSONLD({
          "@context": "https://schema.org",
          "@type": "BeautySalon",
          name: title,
          description,
          url: window.location.href,
          telephone: "+996 700 123 456",
          address: "Киевская улица, 148, Первомайский район, Бишкек",
          image: isDemoSalon ? DEMO_VISUALS.hero : undefined,
        });
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug, isDemoSalon]);

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

  const salonName = isDemoSalon ? "TOTEM Демо Салон" : pickFirstString(salon?.name, "Салон");
  const slogan = isDemoSalon
    ? "Премиальная витрина салона с живым визуалом и онлайн-записью"
    : "Красота, сервис и онлайн-запись в одном месте";
  const subtitle = isDemoSalon
    ? "Современная публичная страница салона в TOTEM: услуги, команда, галерея, акции, отзывы и понятный путь от первого впечатления до записи."
    : "Современная витрина салона в TOTEM: услуги, акции, отзывы, абонементы и удобная запись с телефона.";
  const district = "Первомайский район, Бишкек";
  const address = "Киевская улица, 148";
  const phone = "+996 700 123 456";
  const scheduleText = "Ежедневно, 10:00–20:00";
  const ratingValue = "4.9";
  const reviewCount = "127+";

  const defaultMapAddress = `${address}, ${district}`;
  const mapEmbedUrl =
    pickFirstString(
      salon.map_embed_url,
      salon.google_map_embed_url,
      salon.map_url,
    ) || createMapEmbedUrl(defaultMapAddress);

  const aboutParagraphs = splitParagraphs(
    pickFirstString(
      salon.about,
      salon.description,
      "TOTEM Демо Салон — это эталон современной витрины салона: премиальный визуальный образ, понятная подача услуг, команда, отзывы и быстрый переход к записи.",
      "Такая страница работает не как обычная визитка, а как полноценная продуктовая витрина, которая помогает салону вызывать доверие и продавать услуги с мобильного телефона.",
      "Клиент видит атмосферу, процесс, результат и понятную структуру услуг, а владелец получает красивую публичную страницу, которую не стыдно показывать и использовать как рабочий продукт.",
    ),
  );

  const visibleMasters = (() => {
    const apiMasters = Array.isArray(masters)
      ? masters.filter((master) => !!pickFirstString(master?.name)).slice(0, 4)
      : [];

    if (apiMasters.length > 0) {
      return apiMasters.map((master, index) => ({
        ...master,
        imageUrl: isDemoSalon ? DEMO_VISUALS.masters[index] || "" : "",
      }));
    }

    if (isDemoSalon) {
      return DEMO_MASTER_FALLBACKS.map((master, index) => ({
        ...master,
        imageUrl: DEMO_VISUALS.masters[index] || "",
      }));
    }

    return [];
  })();

  const popularServices = getServiceCatalogData(services).slice(0, isMobile ? 4 : 6);
  const fullServiceList = getServiceCatalogData(services);
  const reviews = getReviewData();
  const promos = getPromoData();
  const benefits = getBenefitsData();
  const galleryImages = isDemoSalon ? DEMO_VISUALS.gallery : [];

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
    accentSoft: "#F6EBDD",
    button: "#4A4038",
    buttonText: "#FFFFFF",
    avatarBg: "#EFE7DE",
    star: "#D39B36",
    promo: "#FFF6EB",
    review: "#FFFDF9",
    heroOverlay: "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(35,32,28,0.04) 100%)",
  };

  const pagePaddingBottom = isMobile ? 88 : 32;

  const container = {
    width: "100%",
    maxWidth: 1140,
    margin: "0 auto",
    padding: isMobile ? "0 16px" : "0 24px",
    boxSizing: "border-box",
  };

  const sectionTitle = {
    margin: 0,
    fontSize: isMobile ? 21 : 30,
    lineHeight: 1.18,
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

  function renderStars(count = 5) {
    return "★".repeat(count);
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
      <section style={{ padding: isMobile ? "18px 0 12px" : "34px 0 16px" }}>
        <div style={container}>
          <div
            style={{
              ...cardStyle,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,245,239,0.98) 100%)",
              padding: isMobile ? 18 : 30,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
                gap: isMobile ? 16 : 22,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  alignItems: "flex-start",
                  justifyContent: "space-between",
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
                  Витрина салона в TOTEM
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: isMobile ? 28 : 42,
                      lineHeight: 1.08,
                      fontWeight: 600,
                      letterSpacing: "-0.25px",
                      color: palette.textMain,
                    }}
                  >
                    {salonName}
                  </h1>

                  <div
                    style={{
                      fontSize: isMobile ? 16 : 18,
                      lineHeight: 1.45,
                      color: palette.textMain,
                      fontWeight: 500,
                    }}
                  >
                    {slogan}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      maxWidth: 760,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: palette.textSecondary,
                    }}
                  >
                    {subtitle}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {[
                    "Онлайн запись 24/7",
                    "Акции и абонементы",
                    "Удобно с телефона",
                    isDemoSalon ? "Премиальная витрина услуг" : "Современная витрина услуг",
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        padding: "8px 11px",
                        borderRadius: 999,
                        background: palette.card,
                        border: `1px solid ${palette.border}`,
                        fontSize: 12,
                        color: palette.textMain,
                        fontWeight: 500,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1.15fr 1fr",
                    gap: 12,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      ...cardStyle,
                      padding: 14,
                      background: palette.card,
                    }}
                  >
                    <div style={{ fontSize: 12, color: palette.textSecondary }}>
                      Адрес
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        lineHeight: 1.55,
                        fontWeight: 600,
                        color: palette.textMain,
                      }}
                    >
                      {address}, {district}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: palette.textSecondary,
                      }}
                    >
                      {scheduleText}
                    </div>
                  </div>

                  <div
                    style={{
                      ...cardStyle,
                      padding: 14,
                      background: palette.review,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: palette.textSecondary }}>
                      Рейтинг и отзывы
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: palette.textMain,
                        }}
                      >
                        {ratingValue}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          color: palette.star,
                          letterSpacing: "1px",
                        }}
                      >
                        {renderStars(5)}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: palette.textSecondary,
                        }}
                      >
                        {reviewCount} отзывов
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: palette.textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      {completedBookings > 0
                        ? `${completedBookings}+ завершённых записей через платформу`
                        : isDemoSalon
                          ? "Клиент сразу видит атмосферу, процесс и результат — не только описание услуг"
                          : "Клиент сразу видит услуги, акции и удобный путь до записи"}
                    </div>
                  </div>
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
                    onClick={() => scrollToSection("popular-services")}
                    style={secondaryButton}
                  >
                    Смотреть услуги
                  </button>
                </div>
              </div>

              {isDemoSalon ? (
                <div
                  style={{
                    position: "relative",
                    minHeight: isMobile ? 280 : 560,
                    borderRadius: 20,
                    overflow: "hidden",
                    background: "#ECE4DB",
                  }}
                >
                  <img
                    src={DEMO_VISUALS.hero}
                    alt={`${salonName} — интерьер`}
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
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "10px 0 8px" : "16px 0 12px" }}>
        <div style={container}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <h2 style={sectionTitle}>Почему выбирают этот салон</h2>
            <p style={sectionText}>
              Страница показывает не просто услуги, а готовый формат привлечения клиентов для современного салона.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {benefits.map((item) => (
              <div
                key={item.id}
                style={{
                  ...cardStyle,
                  padding: 14,
                  background: palette.card,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.35,
                    fontWeight: 600,
                    color: palette.textMain,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: palette.textSecondary,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="popular-services"
        style={{ padding: isMobile ? "12px 0 8px" : "18px 0 12px" }}
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
            <h2 style={sectionTitle}>Популярные услуги</h2>
            <p style={sectionText}>
              Самые востребованные процедуры, которые клиенты выбирают чаще всего.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {popularServices.map((service, index) => {
              const serviceImage = isDemoSalon ? pickDemoServiceImage(service, index) : "";

              return (
                <div
                  key={service.id}
                  style={{
                    ...cardStyle,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  {serviceImage && (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "4 / 3",
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "#EEE7DE",
                      }}
                    >
                      <img
                        src={serviceImage}
                        alt={service.name}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "block",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}

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
                          fontSize: 16,
                          lineHeight: 1.35,
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
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "12px 0 8px" : "18px 0 12px" }}>
        <div style={container}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <h2 style={sectionTitle}>Полный перечень услуг</h2>
            <p style={sectionText}>
              Полная витрина услуг салона для клиента и владельца салона, который оценивает возможности страницы.
            </p>
          </div>

          <div style={{ ...cardStyle, padding: isMobile ? 14 : 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {fullServiceList.map((service) => (
                <div
                  key={`catalog-${service.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: `1px solid ${palette.border}`,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.45,
                        color: palette.textMain,
                        fontWeight: 600,
                      }}
                    >
                      {service.name}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: palette.textSecondary,
                      }}
                    >
                      {service.durationMin > 0
                        ? formatDuration(service.durationMin)
                        : "Длительность уточняется"}
                    </div>
                  </div>

                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: 13,
                      lineHeight: 1.4,
                      color: palette.textMain,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatPrice(service.price)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "12px 0 8px" : "18px 0 12px" }}>
        <div style={container}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <h2 style={sectionTitle}>Акции и предложения</h2>
            <p style={sectionText}>
              Промо-механики, которые помогают владельцу салона продавать больше, а клиенту — быстрее принять решение.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {promos.map((promo) => (
              <div
                key={promo.id}
                style={{
                  ...cardStyle,
                  background: palette.promo,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    padding: "6px 9px",
                    borderRadius: 999,
                    background: palette.card,
                    border: `1px solid ${palette.border}`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: palette.textMain,
                  }}
                >
                  {promo.badge}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 16,
                    lineHeight: 1.35,
                    color: palette.textMain,
                    fontWeight: 600,
                  }}
                >
                  {promo.title}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: palette.textSecondary,
                  }}
                >
                  {promo.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isDemoSalon && galleryImages.length > 0 && (
        <section style={{ padding: isMobile ? "12px 0 8px" : "18px 0 12px" }}>
          <div style={container}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <h2 style={sectionTitle}>Галерея салона</h2>
              <p style={sectionText}>
                Интерьер, процесс и результат в одной секции — именно так витрина начинает продавать глазами.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
                gap: 10,
              }}
            >
              <div
                style={{
                  ...cardStyle,
                  overflow: "hidden",
                  minHeight: isMobile ? 240 : 420,
                }}
              >
                <img
                  src={galleryImages[0]}
                  alt={`${salonName} — интерьер салона`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "cover",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {galleryImages.slice(1).map((image, index) => (
                  <div
                    key={image}
                    style={{
                      ...cardStyle,
                      overflow: "hidden",
                      minHeight: isMobile ? 220 : 205,
                    }}
                  >
                    <img
                      src={image}
                      alt={
                        index === 0
                          ? `${salonName} — процесс работы`
                          : `${salonName} — результат услуги`
                      }
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: isMobile ? "12px 0 8px" : "18px 0 12px" }}>
        <div style={container}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <h2 style={sectionTitle}>Отзывы клиентов</h2>
            <p style={sectionText}>
              Короткие отзывы усиливают доверие и показывают, как страница работает как инструмент продаж.
            </p>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: isMobile ? 14 : 16,
              background: palette.review,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 30,
                    lineHeight: 1,
                    fontWeight: 700,
                    color: palette.textMain,
                  }}
                >
                  {ratingValue}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 16,
                    color: palette.star,
                    letterSpacing: "1px",
                  }}
                >
                  {renderStars(5)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: palette.textSecondary,
                  maxWidth: 520,
                }}
              >
                Реалистичный блок отзывов делает страницу убедительнее и помогает владельцу салона представить, как его витрина будет выглядеть для клиентов.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  ...cardStyle,
                  padding: 14,
                  background: palette.card,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: palette.star,
                    letterSpacing: "1px",
                  }}
                >
                  {renderStars(review.rating)}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: palette.textSecondary,
                  }}
                >
                  {review.text}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: palette.textMain,
                    fontWeight: 600,
                  }}
                >
                  {review.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {aboutParagraphs.length > 0 && (
        <section style={{ padding: isMobile ? "12px 0 8px" : "18px 0 12px" }}>
          <div style={container}>
            <div style={{ ...cardStyle, padding: isMobile ? 16 : 20 }}>
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
                  Блок, который показывает владельцу салона готовую продающую историю, а клиенту — понятное позиционирование.
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

      <section style={{ padding: isMobile ? "12px 0 8px" : "18px 0 12px" }}>
        <div style={container}>
          <div style={{ ...cardStyle, padding: isMobile ? 14 : 16 }}>
            <button
              onClick={() => setTeamOpen((prev) => !prev)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: 0,
                textAlign: "left",
                cursor: "pointer",
                color: palette.textMain,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionTitle}>Команда салона</div>
                  <p style={{ ...sectionText, marginTop: 6 }}>
                    Компактный раскрывающийся блок вместо тяжёлой отдельной секции с мастерами.
                  </p>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: palette.accentSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: palette.textMain,
                    fontWeight: 600,
                  }}
                >
                  {teamOpen ? "−" : "+"}
                </div>
              </div>
            </button>

            {teamOpen && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {visibleMasters.length > 0 ? (
                  visibleMasters.map((master, index) => {
                    const masterSubtitle = renderMasterSubtitle(master);
                    const masterBio = renderMasterBio(master);
                    const masterImage =
                      pickFirstString(master?.imageUrl, master?.image_url) ||
                      (isDemoSalon ? DEMO_VISUALS.masters[index] || "" : "");

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
                          {masterImage ? (
                            <img
                              src={masterImage}
                              alt={master.name}
                              loading="lazy"
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 16,
                                objectFit: "cover",
                                display: "block",
                                flexShrink: 0,
                                background: palette.avatarBg,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 16,
                                background: palette.avatarBg,
                                color: palette.textMain,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(master.name)}
                            </div>
                          )}

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
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {masterBio}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: palette.textSecondary,
                    }}
                  >
                    Команда салона может отображаться здесь в компактном формате, чтобы не перегружать страницу в верхней части.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "12px 0 20px" : "18px 0 32px" }}>
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
                <h2 style={sectionTitle}>Контакты и локация</h2>
                <p style={sectionText}>
                  Встроенная карта, адрес и контакты должны быть видны сразу, без лишних переходов.
                </p>
              </div>

              <div>
                <div style={{ fontSize: 12, lineHeight: 1.4, color: palette.textSecondary }}>
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
                <div style={{ fontSize: 12, lineHeight: 1.4, color: palette.textSecondary }}>
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
                <div style={{ fontSize: 12, lineHeight: 1.4, color: palette.textSecondary }}>
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

              <div>
                <button onClick={goToBooking} style={primaryButton}>
                  Записаться
                </button>
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                overflow: "hidden",
                minHeight: isMobile ? 260 : 100,
              }}
            >
              <iframe
                title={`${salonName} map`}
                src={mapEmbedUrl}
                width="100%"
                height={isMobile ? "260" : "100%"}
                style={{
                  border: "none",
                  display: "block",
                  minHeight: isMobile ? 260 : 100,
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
          <div style={{ maxWidth: 1140, margin: "0 auto" }}>
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
