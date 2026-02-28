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

function App() {
  const [salon, setSalon] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slug = getSlug();

    if (!slug) {
      setError("Slug not found in URL");
      return;
    }

    fetch(`${API_BASE}/public/salons/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error("Salon not found");
        return res.json();
      })
      .then(data => {
        if (!data.ok) throw new Error("Invalid response");
        setSalon(data.salon);
      })
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={styles.center}>
        <h2>Error</h2>
        <div>{error}</div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div style={styles.center}>
        <h2>Loading salon...</h2>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* HERO */}
      <div style={styles.hero}>
        <h1 style={styles.title}>{salon.name}</h1>
        <div style={styles.meta}>
          <span>Status: {salon.status}</span>
          <span>•</span>
          <span>{salon.enabled ? "Open for booking" : "Disabled"}</span>
        </div>
        <button style={styles.cta}>
          Записаться
        </button>
      </div>

      {/* DESCRIPTION PLACEHOLDER */}
      <div style={styles.section}>
        <h2>О салоне</h2>
        <p style={{ opacity: 0.7 }}>
          Описание салона будет отображаться здесь.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "system-ui",
    padding: "40px",
    maxWidth: "900px",
    margin: "0 auto"
  },
  center: {
    fontFamily: "system-ui",
    padding: "40px",
    textAlign: "center"
  },
  hero: {
    marginBottom: "40px"
  },
  title: {
    fontSize: "36px",
    marginBottom: "10px"
  },
  meta: {
    opacity: 0.7,
    marginBottom: "20px",
    display: "flex",
    gap: "8px"
  },
  cta: {
    padding: "12px 24px",
    fontSize: "16px",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    cursor: "pointer"
  },
  section: {
    marginTop: "40px"
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);