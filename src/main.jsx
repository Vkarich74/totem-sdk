import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

const API_BASE = import.meta.env.VITE_API_BASE;

function getSlug() {
  if (window.SALON_SLUG) return window.SALON_SLUG;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "salon") return parts[1];
  return null;
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function App() {
  const [salon, setSalon] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const slug = getSlug();
    if (!slug) return;

    fetch(`${API_BASE}/public/salons/${slug}`)
      .then(r => r.json())
      .then(d => d.ok && setSalon(d.salon));

    fetch(`${API_BASE}/public/salons/${slug}/metrics`)
      .then(r => r.json())
      .then(d => d.ok && setMetrics(d.metrics));
  }, []);

  if (!salon) return <div style={styles.center}>Loading...</div>;

  return (
    <div style={styles.page}>
      <h1>{salon.name}</h1>
      {salon.slogan && <div style={styles.slogan}>{salon.slogan}</div>}

      <div style={styles.meta}>
        {salon.status} • {salon.city} • {salon.phone}
      </div>

      {metrics && (
        <div style={styles.metricsRow}>
          <MetricCard label="Bookings" value={metrics.bookings_count} />
          <MetricCard label="Revenue (All)" value={formatMoney(metrics.revenue_total)} />
          <MetricCard label="Revenue (30d)" value={formatMoney(metrics.revenue_30d)} />
          <MetricCard label="Avg Check" value={formatMoney(metrics.avg_check)} />
        </div>
      )}

      <div style={styles.section}>
        <h2>About</h2>
        <p>{salon.description}</p>
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
    maxWidth: 1000,
    margin: "0 auto"
  },
  center: {
    padding: 40,
    textAlign: "center"
  },
  slogan: {
    opacity: 0.7,
    marginBottom: 10
  },
  meta: {
    marginBottom: 30,
    opacity: 0.8
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginBottom: 40
  },
  card: {
    padding: 20,
    border: "1px solid #eee",
    borderRadius: 12,
    textAlign: "center",
    background: "#fafafa"
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 600
  },
  cardLabel: {
    opacity: 0.6,
    marginTop: 6
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