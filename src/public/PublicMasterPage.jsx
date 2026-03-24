export default function PublicMasterPage({ slug }) {
  const masterName = "Алина";
  const profession = "Мастер красоты";
  const city = "Бишкек";

  const metrics = [
    { value: "4.9", label: "средняя оценка клиентов" },
    { value: "500+", label: "записей через удобный онлайн-формат" },
    { value: "3+", label: "года стабильной практики" },
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
      title: "Повторные визиты",
      text: "Ко мне возвращаются за стабильным качеством, комфортом и предсказуемым уровнем сервиса.",
    },
  ];

  const featuredServices = [
    {
      title: "Женская стрижка",
      price: "от 1 500 KGS",
      time: "60–90 мин",
      note: "Форма, уход и укладка в одном визите.",
    },
    {
      title: "Окрашивание волос",
      price: "от 3 500 KGS",
      time: "2–4 часа",
      note: "От мягкого обновления оттенка до полного образа.",
    },
    {
      title: "Укладка / образ",
      price: "от 1 200 KGS",
      time: "45–60 мин",
      note: "На каждый день, съёмку, встречу или событие.",
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
    "Онлайн-запись",
    "Популярные услуги",
    "Проверенный мастер",
    "Удобный формат записи",
  ];

  const sectionTitleStyle = {
    fontSize: "clamp(28px, 4vw, 42px)",
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#1f1722",
    margin: 0,
  };

  const sectionTextStyle = {
    fontSize: "16px",
    lineHeight: 1.7,
    color: "#6d5d69",
    margin: 0,
  };

  const shellStyle = {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #fffaf7 0%, #fff6f1 28%, #fffaf8 56%, #ffffff 100%)",
    color: "#241b25",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const containerStyle = {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    paddingLeft: "20px",
    paddingRight: "20px",
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(119, 74, 103, 0.10)",
    borderRadius: "24px",
    boxShadow: "0 18px 45px rgba(77, 43, 67, 0.08)",
    backdropFilter: "blur(8px)",
  };

  const softCardStyle = {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(119, 74, 103, 0.08)",
    borderRadius: "22px",
    boxShadow: "0 10px 28px rgba(77, 43, 67, 0.06)",
  };

  const primaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "54px",
    padding: "0 22px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #d88ea8 0%, #c77992 100%)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "15px",
    boxShadow: "0 12px 24px rgba(199, 121, 146, 0.28)",
  };

  const secondaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "54px",
    padding: "0 22px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.92)",
    color: "#382733",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "15px",
    border: "1px solid rgba(119, 74, 103, 0.12)",
  };

  return (
    <div style={shellStyle}>
      <div style={containerStyle}>
        <section
          style={{
            paddingTop: "24px",
            paddingBottom: "28px",
          }}
        >
          <div
            style={{
              ...softCardStyle,
              padding: "14px 16px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #f6d6df 0%, #efc0cf 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#6d3550",
                  flexShrink: 0,
                }}
              >
                {masterName.slice(0, 1)}
              </div>

              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#241b25",
                  }}
                >
                  {masterName} — {profession}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#7b6876",
                    marginTop: "2px",
                  }}
                >
                  {city} • Персональная страница мастера
                </div>
              </div>
            </div>

            <a href="#booking" style={primaryButtonStyle}>
              Записаться онлайн
            </a>
          </div>
        </section>

        <section
          style={{
            paddingTop: "12px",
            paddingBottom: "52px",
          }}
        >
          <div
            style={{
              ...cardStyle,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "radial-gradient(circle at top right, rgba(216,142,168,0.18), transparent 32%), radial-gradient(circle at bottom left, rgba(247,214,223,0.55), transparent 28%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "28px",
                padding: "clamp(24px, 5vw, 52px)",
              }}
            >
              <div style={{ display: "grid", gap: "20px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    width: "fit-content",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.78)",
                    border: "1px solid rgba(119, 74, 103, 0.10)",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#6a4a58",
                  }}
                >
                  ⭐ 4.9 • 120+ отзывов • {slug || "master-slug"}
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  <h1
                    style={{
                      fontSize: "clamp(36px, 6vw, 66px)",
                      lineHeight: 0.98,
                      letterSpacing: "-0.05em",
                      fontWeight: 900,
                      color: "#1f1722",
                      margin: 0,
                      maxWidth: "700px",
                    }}
                  >
                    Мастер, к которому возвращаются
                    <span style={{ color: "#c77992" }}> за результатом </span>
                    и комфортом
                  </h1>

                  <p
                    style={{
                      fontSize: "18px",
                      lineHeight: 1.75,
                      color: "#6c5d67",
                      margin: 0,
                      maxWidth: "640px",
                    }}
                  >
                    Персональный формат обслуживания, понятная онлайн-запись,
                    аккуратная работа и услуги, которые подбираются не по
                    шаблону, а под человека. Здесь важен не поток, а качество
                    результата и ваш комфорт на каждом визите.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    paddingTop: "4px",
                  }}
                >
                  <a href="#booking" style={primaryButtonStyle}>
                    Выбрать услугу и время
                  </a>
                  <a href="#services" style={secondaryButtonStyle}>
                    Посмотреть услуги
                  </a>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    paddingTop: "4px",
                  }}
                >
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: "38px",
                        padding: "0 14px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.76)",
                        border: "1px solid rgba(119, 74, 103, 0.10)",
                        color: "#5d4955",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  alignContent: "start",
                }}
              >
                <div
                  style={{
                    ...softCardStyle,
                    padding: "18px",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,248,250,0.96))",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#7d5b69",
                      marginBottom: "12px",
                    }}
                  >
                    Бысткое доверие
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    {metrics.map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: "12px",
                          paddingBottom: "12px",
                          borderBottom:
                            "1px solid rgba(119, 74, 103, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "28px",
                            fontWeight: 800,
                            color: "#241b25",
                            letterSpacing: "-0.04em",
                          }}
                        >
                          {item.value}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            lineHeight: 1.5,
                            color: "#6d5d69",
                            textAlign: "right",
                            maxWidth: "190px",
                          }}
                        >
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    ...softCardStyle,
                    padding: "18px",
                    background:
                      "linear-gradient(135deg, rgba(245, 226, 233, 0.72), rgba(255,255,255,0.94))",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#6d3550",
                      marginBottom: "8px",
                    }}
                  >
                    Для тех, кто ценит предсказуемый сервис
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "#5f4b57",
                    }}
                  >
                    Без хаоса в переписках, без непонятных цен и без ощущения
                    “как получится”. Услуги, время и формат записи понятны
                    заранее.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            paddingBottom: "52px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            <h2 style={sectionTitleStyle}>Почему выбирают этого мастера</h2>
            <p style={{ ...sectionTextStyle, maxWidth: "760px" }}>
              Здесь сочетаются личный подход, аккуратная техника и комфортный
              клиентский опыт. Не просто услуга, а понятный и качественный
              сервис вокруг вашего результата.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {benefits.map((item) => (
              <div
                key={item.title}
                style={{
                  ...softCardStyle,
                  padding: "22px",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    background:
                      "linear-gradient(135deg, rgba(245,214,223,0.95), rgba(239,192,207,0.9))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  ✦
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    lineHeight: 1.2,
                    fontWeight: 800,
                    color: "#241b25",
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    lineHeight: 1.75,
                    color: "#6d5d69",
                  }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            paddingBottom: "52px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            <h2 style={sectionTitleStyle}>Популярные услуги</h2>
            <p style={{ ...sectionTextStyle, maxWidth: "760px" }}>
              Услуги, с которых чаще всего начинается знакомство. Понятная
              ценность, удобный формат и хороший первый опыт для новых клиентов.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {featuredServices.map((service) => (
              <div
                key={service.title}
                style={{
                  ...cardStyle,
                  padding: "24px",
                  display: "grid",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "22px",
                      lineHeight: 1.15,
                      fontWeight: 800,
                      color: "#241b25",
                    }}
                  >
                    {service.title}
                  </h3>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: "34px",
                      padding: "0 12px",
                      borderRadius: "999px",
                      background: "rgba(245, 226, 233, 0.9)",
                      color: "#744a67",
                      fontSize: "12px",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {service.time}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    color: "#c77992",
                  }}
                >
                  {service.price}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    lineHeight: 1.7,
                    color: "#6d5d69",
                  }}
                >
                  {service.note}
                </p>

                <a href="#booking" style={primaryButtonStyle}>
                  Записаться
                </a>
              </div>
            ))}
          </div>
        </section>

        <section
          id="services"
          style={{
            paddingBottom: "52px",
          }}
        >
          <div
            style={{
              ...cardStyle,
              padding: "clamp(20px, 4vw, 34px)",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: "18px",
                marginBottom: "24px",
              }}
            >
              <h2 style={sectionTitleStyle}>Каталог услуг</h2>
              <p style={{ ...sectionTextStyle, maxWidth: "760px" }}>
                Прозрачный список услуг с ориентиром по стоимости и времени.
                Финальная рекомендация может уточняться под ваш запрос, длину,
                объём или желаемый образ.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {serviceCatalog.map((service) => (
                <div
                  key={service.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)",
                    gap: "12px",
                    alignItems: "center",
                    padding: "16px 18px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.78)",
                    border: "1px solid rgba(119, 74, 103, 0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#241b25",
                    }}
                  >
                    {service.name}
                  </div>

                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#c77992",
                    }}
                  >
                    {service.price}
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      color: "#6d5d69",
                      textAlign: "right",
                    }}
                  >
                    {service.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            paddingBottom: "52px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            <h2 style={sectionTitleStyle}>Отзывы клиентов</h2>
            <p style={{ ...sectionTextStyle, maxWidth: "760px" }}>
              Настоящее доверие строится не на обещаниях, а на повторных визитах
              и ощущении, что вас услышали. Именно это чаще всего отмечают
              клиенты.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {reviews.map((review) => (
              <div
                key={review.name}
                style={{
                  ...softCardStyle,
                  padding: "22px",
                  display: "grid",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    lineHeight: 1.6,
                    color: "#3b2d37",
                  }}
                >
                  “{review.text}”
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#241b25",
                    }}
                  >
                    {review.name}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#c77992",
                      fontWeight: 800,
                    }}
                  >
                    ★★★★★
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            paddingBottom: "52px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            <div
              style={{
                ...cardStyle,
                padding: "clamp(22px, 4vw, 34px)",
                display: "grid",
                gap: "16px",
              }}
            >
              <h2 style={sectionTitleStyle}>О мастере</h2>

              <p style={sectionTextStyle}>
                Я работаю с клиентами, которым важны не только техника и
                визуальный результат, но и общее ощущение от сервиса. Для меня
                сильная работа — это когда человек чувствует себя спокойно,
                понимает, за что платит, и уходит с результатом, который ему
                подходит.
              </p>

              <p style={sectionTextStyle}>
                В основе подхода — внимание к деталям, честные рекомендации и
                удобный формат записи. Без перегруза, без лишних обещаний, с
                уважением к вашему времени и ожиданиям.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                  paddingTop: "8px",
                }}
              >
                <div
                  style={{
                    ...softCardStyle,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: "#241b25",
                    }}
                  >
                    3+
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6d5d69",
                      marginTop: "4px",
                    }}
                  >
                    года практики
                  </div>
                </div>

                <div
                  style={{
                    ...softCardStyle,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: "#241b25",
                    }}
                  >
                    4.9
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6d5d69",
                      marginTop: "4px",
                    }}
                  >
                    рейтинг клиентов
                  </div>
                </div>

                <div
                  style={{
                    ...softCardStyle,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: "#241b25",
                    }}
                  >
                    500+
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6d5d69",
                      marginTop: "4px",
                    }}
                  >
                    записей
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                padding: "0",
                overflow: "hidden",
                minHeight: "420px",
                display: "grid",
              }}
            >
              <iframe
                title="Локация мастера"
                src="https://www.google.com/maps?q=Bishkek&z=13&output=embed"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "420px",
                  border: 0,
                }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        <section
          id="booking"
          style={{
            paddingBottom: "110px",
          }}
        >
          <div
            style={{
              ...cardStyle,
              padding: "clamp(24px, 5vw, 38px)",
              background:
                "linear-gradient(135deg, rgba(255,248,250,0.98), rgba(245,226,233,0.90))",
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
              <div style={{ display: "grid", gap: "14px" }}>
                <h2 style={sectionTitleStyle}>
                  Готовы выбрать услугу и удобное время?
                </h2>
                <p style={sectionTextStyle}>
                  Онлайн-запись помогает быстро выбрать формат услуги и перейти к
                  удобному времени без лишних сообщений и ожидания ответа.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  justifyContent: "flex-start",
                }}
              >
                <a href="#booking" style={primaryButtonStyle}>
                  Перейти к записи
                </a>
                <a href="#services" style={secondaryButtonStyle}>
                  Сначала посмотреть услуги
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

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
            border: "1px solid rgba(119, 74, 103, 0.10)",
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
          <div style={{ minWidth: "0" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#241b25",
              }}
            >
              {masterName} • {profession}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#6d5d69",
                marginTop: "2px",
              }}
            >
              Онлайн-запись • Популярные услуги • Удобный формат
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