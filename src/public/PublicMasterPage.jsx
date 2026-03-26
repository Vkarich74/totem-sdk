export default function PublicMasterPage({ slug }) {
  const masterName = "Алина";
  const profession = "Мастер красоты";
  const city = "Бишкек";
  const district = "Первомайский район";
  const address = "Киевская улица, 148";
  const schedule = "Ежедневно, 10:00–20:00";
  const phone = "+996 700 123 456";
  const mapUrl = "https://www.google.com/maps?q=" + encodeURIComponent(`${address}, ${district}, ${city}`);
  const heroImage = "https://res.cloudinary.com/dgcec21nz/image/upload/f_auto,q_auto,w_1200/v1774516005/master-3_u6pois.png";

  const metrics = [
    { value: "4.9", label: "средняя оценка клиентов" },
    { value: "500+", label: "записей через удобный онлайн-формат" },
    { value: "3+", label: "года стабильной практики" },
    { value: "120+", label: "повторных визитов и лояльных клиентов" },
  ];

  const benefits = [
    {
      title: "Личный подход",
      text: "Каждая услуга подбирается под ваш запрос, образ жизни и желаемый результат без шаблонных решений.",
    },
    {
      title: "Аккуратная работа",
      text: "Внимание к деталям, чистая техника, спокойный процесс и понятный результат без лишнего стресса.",
    },
    {
      title: "Удобная запись",
      text: "Понятная онлайн-запись, прозрачный выбор услуг и экономия времени без бесконечных переписок.",
    },
    {
      title: "Предсказуемый сервис",
      text: "Ко мне возвращаются за стабильным качеством, комфортом и понятным уровнем сервиса.",
    },
  ];

  const featuredServices = [
    {
      title: "Женская стрижка",
      price: "от 1 500 KGS",
      time: "60–90 мин",
      note: "Форма, уход и аккуратная укладка в одном визите.",
    },
    {
      title: "Окрашивание волос",
      price: "от 3 500 KGS",
      time: "2–4 часа",
      note: "От мягкого обновления оттенка до полного изменения образа с понятной консультацией.",
    },
    {
      title: "Укладка / образ",
      price: "от 1 200 KGS",
      time: "45–60 мин",
      note: "На каждый день, съёмку, встречу или событие — без перегруза и с чистой формой.",
    },
  ];

  const serviceCatalog = [
    { name: "Женская стрижка", price: "от 1 500 KGS", duration: "60–90 мин" },
    { name: "Мужская стрижка", price: "от 1 000 KGS", duration: "40–60 мин" },
    { name: "Укладка", price: "от 1 200 KGS", duration: "45–60 мин" },
    { name: "Окрашивание корней", price: "от 2 800 KGS", duration: "1.5–2 часа" },
    { name: "Полное окрашивание", price: "от 3 500 KGS", duration: "2–4 часа" },
    { name: "Уход / восстановление", price: "от 1 800 KGS", duration: "45–60 мин" },
  ];

  const reviews = [
    {
      name: "Айпери",
      text: "Очень понравился подход: спокойно, аккуратно и без навязывания. Результат получился именно таким, как я хотела.",
    },
    {
      name: "Диана",
      text: "Записалась онлайн без лишних сообщений, пришла в своё время и получила отличный сервис. Очень комфортный мастер.",
    },
    {
      name: "Алина",
      text: "Ценю стабильность. Уже не первый раз прихожу и каждый визит на хорошем уровне — и по качеству, и по атмосфере.",
    },
  ];

  const badges = [
    "Онлайн-запись 24/7",
    "Популярные услуги",
    "Проверенный мастер",
    "Комфортный premium-сервис",
  ];

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

            <a href="#booking" style={primaryButtonStyle}>
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
                  Премиальный мастер в TOTEM
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
                    {profession}. Персональный подход, аккуратная техника и понятный premium-сервис без хаоса и лишней переписки.
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
                    Персональная страница мастера в едином стиле TOTEM: сильный первый экран, понятные услуги, доверие через реальные метрики и удобная онлайн-запись.
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
                      <div style={{ fontSize: "20px", fontWeight: 700, color: palette.textMain }}>4.9</div>
                      <div style={{ fontSize: "15px", color: palette.star, letterSpacing: "1px" }}>★★★★★</div>
                      <div style={{ fontSize: "13px", color: palette.textSecondary }}>120+ отзывов</div>
                    </div>
                    <div style={{ fontSize: "13px", color: palette.textSecondary, lineHeight: 1.5 }}>
                      Здесь продаёт не место, а личность мастера, результат и ощущение качества уже с первого экрана.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", width: "100%" }}>
                  <a href="#booking" style={primaryButtonStyle}>
                    Записаться к мастеру
                  </a>
                  <a href="#services" style={secondaryButtonStyle}>
                    Смотреть услуги
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
                  alt={`${masterName} — портрет мастера`}
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

                <a href="#booking" style={secondaryButtonStyle}>
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

              <p style={sectionTextStyle}>
                Я работаю с клиентами, которым важны не только техника и визуальный результат, но и общее ощущение от сервиса. Для меня сильная работа — это когда человек чувствует себя спокойно, понимает, за что платит, и уходит с результатом, который ему действительно подходит.
              </p>

              <p style={sectionTextStyle}>
                В основе подхода — внимание к деталям, честные рекомендации и удобный формат записи. Без перегруза, без лишних обещаний, с уважением к вашему времени и ожиданиям.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  marginTop: "4px",
                }}
              >
                <div style={{ ...cardStyle, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>3+</div>
                  <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "4px" }}>года практики</div>
                </div>

                <div style={{ ...cardStyle, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>4.9</div>
                  <div style={{ fontSize: "13px", color: palette.textSecondary, marginTop: "4px" }}>рейтинг клиентов</div>
                </div>

                <div style={{ ...cardStyle, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: palette.textMain }}>500+</div>
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
                  Открыть на карте
                </a>
                <a href="#booking" style={primaryButtonStyle}>
                  Записаться
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
                <h2 style={sectionTitleStyle}>Готовы выбрать услугу и удобное время?</h2>
                <p style={sectionTextStyle}>
                  Онлайн-запись помогает быстро выбрать формат услуги и перейти к удобному времени без лишних сообщений и ожидания ответа.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "flex-start" }}>
                <a href="#booking" style={primaryButtonStyle}>
                  Перейти к записи
                </a>
                <a href="#services" style={secondaryButtonStyle}>
                  Сначала посмотреть услуги
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
              Онлайн-запись • Популярные услуги • Персональный premium-сервис
            </div>
          </div>

          <a href="#booking" style={primaryButtonStyle}>
            Записаться
          </a>
        </div>
      </div>
    </div>
  );
}
