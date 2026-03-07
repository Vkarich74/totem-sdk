// src/salon/Reports.jsx
import { useEffect, useState } from "react";
import { fetchSalonMetrics } from "../api/salonMetrics";

const SALON_SLUG = "totem-demo-salon";

export default function Reports() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSalonMetrics(SALON_SLUG);
      setMetrics(data);
    } catch (err) {
      console.error("METRICS_LOAD_ERROR", err);
      setError("Ошибка загрузки метрик");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Отчёты</h2>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && metrics && (
        <div style={styles.grid}>
          <MetricCard
            title="Всего записей"
            value={metrics.bookings_count}
          />
          <MetricCard
            title="Общий доход"
            value={formatKGS(metrics.revenue_total)}
          />
          <MetricCard
            title="Средний чек"
            value={formatKGS(metrics.avg_check)}
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.title}>{title}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

function formatKGS(amount) {
  const value = Number(amount) || 0;
  return (
    new Intl.NumberFormat("ru-RU").format(value) + " сом"
  );
}

const styles = {
  grid: {
    display: "grid",
    gap: "16px",
  },
  card: {
    border: "1px solid #eee",
    padding: "16px",
    borderRadius: "8px",
  },
  title: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "6px",
  },
  value: {
    fontSize: "20px",
    fontWeight: "bold",
  },
};