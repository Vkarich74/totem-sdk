// src/salon/Masters.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchSalonMasters } from "../api/salonMasters";

const SALON_SLUG = "totem-demo-salon";

export default function SalonMasters() {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSalonMasters(SALON_SLUG);
      setMasters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("SALON_MASTERS_LOAD_ERROR", err);
      setError("Ошибка загрузки мастеров");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = masters.length;
    const active = masters.filter((master) => master.active).length;
    const inactive = total - active;

    return { total, active, inactive };
  }, [masters]);

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <h2 style={styles.title}>Мастера салона</h2>
        <p style={styles.description}>
          Список мастеров, привязанных к салону.
        </p>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Всего" value={stats.total} />
        <StatCard label="Активные" value={stats.active} />
        <StatCard label="Неактивные" value={stats.inactive} />
      </div>

      {loading && <p style={styles.infoText}>Загрузка...</p>}

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {!loading && !error && masters.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>Мастеров пока нет</div>
          <div style={styles.emptyText}>
            Когда мастера появятся в системе, они будут показаны здесь.
          </div>
        </div>
      )}

      {!loading && !error && masters.length > 0 && (
        <div style={styles.list}>
          {masters.map((master) => (
            <MasterCard key={master.id} master={master} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function MasterCard({ master }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTopRow}>
        <div>
          <div style={styles.masterName}>{master.name || "Без имени"}</div>
          <div style={styles.slug}>Slug: {master.slug || "—"}</div>
        </div>

        <span
          style={{
            ...styles.status,
            backgroundColor: master.active ? "#16a34a" : "#dc2626",
          }}
        >
          {master.active ? "Активен" : "Не активен"}
        </span>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  headerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
  statCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px",
    backgroundColor: "#ffffff",
  },
  statLabel: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "6px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
  },
  infoText: {
    margin: 0,
    fontSize: "14px",
    color: "#374151",
  },
  errorBox: {
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
  },
  emptyState: {
    border: "1px dashed #d1d5db",
    borderRadius: "12px",
    padding: "20px",
    backgroundColor: "#f9fafb",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "6px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#6b7280",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px",
    backgroundColor: "#ffffff",
  },
  cardTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  masterName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "4px",
  },
  status: {
    color: "#ffffff",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  slug: {
    fontSize: "13px",
    color: "#6b7280",
  },
};