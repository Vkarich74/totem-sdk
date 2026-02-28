import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

const API_BASE = import.meta.env.VITE_API_BASE;

function getSlug() {
  // 1️⃣ Приоритет — slug переданный из Odoo
  if (window.SALON_SLUG) {
    return window.SALON_SLUG;
  }

  // 2️⃣ Fallback — парсинг pathname
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);

  // ожидаем /salon/<slug>
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
        if (!res.ok) {
          throw new Error("Salon not found");
        }
        return res.json();
      })
      .then(data => {
        if (!data.ok) {
          throw new Error("Invalid response");
        }
        setSalon(data.salon);
      })
      .catch(err => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: "40px", fontFamily: "system-ui" }}>
        <h2>Error</h2>
        <div>{error}</div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div style={{ padding: "40px", fontFamily: "system-ui" }}>
        <h2>Loading salon...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", fontFamily: "system-ui" }}>
      <h1>{salon.name}</h1>
      <div style={{ opacity: 0.7, marginBottom: "10px" }}>
        Slug: {salon.slug}
      </div>
      <div>Status: {salon.status}</div>
      <div>Enabled: {salon.enabled ? "Yes" : "No"}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);