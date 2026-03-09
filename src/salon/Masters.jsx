// src/salon/Masters.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchSalonMasters } from "../api/salonMasters";

import PageSection from "../cabinet/ui/PageSection";
import StatGrid from "../cabinet/ui/StatGrid";
import TableSection from "../cabinet/ui/TableSection";
import EmptyState from "../cabinet/ui/EmptyState";

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
    <PageSection title="Мастера салона">
      <StatGrid
        items={[
          { label: "Всего мастеров", value: stats.total },
          { label: "Активные", value: stats.active },
          { label: "Неактивные", value: stats.inactive },
        ]}
      />

      {loading ? (
        <TableSection title="Список мастеров">
          <div style={styles.message}>Загрузка...</div>
        </TableSection>
      ) : error ? (
        <TableSection title="Список мастеров">
          <div style={styles.error}>{error}</div>
        </TableSection>
      ) : masters.length === 0 ? (
        <EmptyState
          title="Мастеров пока нет"
          text="Когда мастера появятся в системе, они будут показаны здесь."
        />
      ) : (
        <TableSection title="Список мастеров">
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Имя мастера</th>
                  <th style={styles.th}>Slug</th>
                  <th style={styles.th}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {masters.map((master) => (
                  <tr key={master.id}>
                    <td style={styles.td}>{master.name || "Без имени"}</td>
                    <td style={styles.td}>{master.slug || "—"}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: master.active ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {master.active ? "Активен" : "Не активен"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TableSection>
      )}
    </PageSection>
  );
}

const styles = {
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
    color: "#6b7280",
    padding: "12px 14px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "14px",
    color: "#111827",
    verticalAlign: "middle",
  },
  badge: {
    display: "inline-block",
    color: "#ffffff",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  message: {
    fontSize: "14px",
    color: "#374151",
    padding: "4px 0",
  },
  error: {
    fontSize: "14px",
    color: "#dc2626",
    padding: "4px 0",
  },
};