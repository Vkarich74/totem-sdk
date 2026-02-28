import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

const API_BASE = import.meta.env.VITE_API_BASE;

function getSlug() {
  if (window.SALON_SLUG) return window.SALON_SLUG;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "salon") return parts[1];
  return null;
}

function safe(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function App() {
  const [salon, setSalon] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slug = getSlug();
    if (!slug) {
      setError("Slug not found");
      return;
    }

    // salon
    fetch(`${API_BASE}/public/salons/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (!data.ok) throw new Error();
        setSalon(data.salon);
      })
      .catch(() => setError("Salon load error"));

    // metrics
    fetch(`${API_BASE}/public/salons/${slug}/metrics`)
      .then(r => r.json())
      .then(data => {
        if (!data.ok) throw new Error();
        setMetrics(data.metrics);
      })
      .catch(() => {});
  }, []);

  if (error) return <div style={styles.center}>{error}</div>;
  if (!salon) return <div style={styles.center}>Loading…</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>{salon.name}</h1>
      {salon.slogan && <div style={styles.slogan}>{salon.slogan}</div>}

      <div style={styles.meta}>
        <span>Status: {salon.status}</span>
        {salon.city && <> • {salon.city}</>}
        {salon.phone && <> • {salon.phone}</>}
      </div>

      <button style={styles.cta}>Book now</button>

      {/* METRICS */}
      {metrics && (
        <div style={styles.metricsRow}>
          <MetricCard label="Bookings" value={metrics.bookings_count} />
          <MetricCard label="Revenue" value={metrics.revenue_total} />
          <MetricCard label="Avg check" value={metrics.avg_check} />
        </div>
      )}

      <div style={styles.section}>
        <h2>About salon</h2>
        <p>{salon.description || "Description will appear here."}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardValue}>{value}</div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "system-ui",
    padding: 40,
    maxWidth: 900,
    margin: "0 auto"
  },
  center: {
    padding: 40,
    textAlign: "center"
  },
  title: {
    fontSize: 36,
    marginBottom: 6
  },
  slogan: {
    fontSize: 18,
    opacity: 0.7,
    marginBottom: 10
  },
  meta: {
    opacity: 0.8,
    marginBottom: 20
  },
  cta: {
    padding: "12px 24px",
    background: "#000",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    marginBottom: 30
  },
  metricsRow: {
    display: "flex",
    gap: 20,
    marginBottom: 40
  },
  card: {
    flex: 1,
    padding: 20,
    border: "1px solid #eee",
    borderRadius: 12,
    textAlign: "center"
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 600
  },
  cardLabel: {
    opacity: 0.6
  },
  section: {
    marginTop: 30
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);