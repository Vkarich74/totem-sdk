import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

const API_BASE = import.meta.env.VITE_API_BASE;

function getSlug() {
  if (window.SALON_SLUG) return window.SALON_SLUG;

  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 2 && parts[0] === "salon") {
    return parts[1];
  }

  return null;
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function App() {
  const [salon, setSalon] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slug = getSlug();

    if (!slug) {
      setError("Slug не найден в URL");
      return;
    }

    fetch(`${API_BASE}/public/salons/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Салон не найден");
        return res.json();
      })
      .then((data) => {
        if (!data.ok) throw new Error("Неверный ответ API");
        setSalon(data.salon);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={styles.center}>
        <h2>Ошибка</h2>
        <div>{error}</div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div style={styles.center}>
        <h2>Загрузка салона…</h2>
      </div>
    );
  }

  const slogan = safeText(salon.slogan);
  const description = safeText(salon.description);
  const city = safeText(salon.city);
  const phone = safeText(salon.phone);
  const logoUrl = safeText(salon.logo_url);
  const coverUrl = safeText(salon.cover_url);

  return (
    <div style={styles.page}>
      <div
        style={{
          ...styles.hero,
          ...(coverUrl
            ? {
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                padding: "48px",
                borderRadius: "16px",
              }
            : {}),
        }}
      >
        <div style={styles.heroTopRow}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="logo"
              style={styles.logo}
              loading="lazy"
            />
          ) : null}

          <div style={{ flex: 1 }}>
            <h1 style={styles.title}>{salon.name}</h1>

            {slogan && (
              <div style={styles.slogan}>
                {slogan}
              </div>
            )}

            <div style={styles.meta}>
              <span>Статус: {salon.status}</span>
              <span>•</span>
              <span>{salon.enabled ? "Открыт для записи" : "Отключён"}</span>
              {city && (
                <>
                  <span>•</span>
                  <span>{city}</span>
                </>
              )}
              {phone && (
                <>
                  <span>•</span>
                  <a style={styles.phoneLink} href={`tel:${phone}`}>
                    {phone}
                  </a>
                </>
              )}
            </div>

            <button style={styles.cta}>Записаться</button>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2>О салоне</h2>
        {description ? (
          <p style={styles.description}>{description}</p>
        ) : (
          <p style={{ opacity: 0.7 }}>
            Описание салона будет отображаться здесь.
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "system-ui",
    padding: "40px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  center: {
    fontFamily: "system-ui",
    padding: "40px",
    textAlign: "center",
  },
  hero: {
    marginBottom: "40px",
  },
  heroTopRow: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  },
  logo: {
    width: "72px",
    height: "72px",
    borderRadius: "16px",
    objectFit: "cover",
  },
  title: {
    fontSize: "36px",
    marginBottom: "6px",
  },
  slogan: {
    fontSize: "18px",
    opacity: 0.7,
    marginBottom: "12px",
  },
  meta: {
    opacity: 0.8,
    marginBottom: "20px",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
  },
  phoneLink: {
    color: "inherit",
    textDecoration: "underline",
  },
  cta: {
    padding: "12px 24px",
    fontSize: "16px",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  section: {
    marginTop: "40px",
  },
  description: {
    lineHeight: 1.6,
    marginTop: "8px",
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);