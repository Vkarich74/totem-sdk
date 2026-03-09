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
    const active = masters.filter((m) => m.active).length;
    const inactive = total - active;

    return { total, active, inactive };
  }, [masters]);

  const rows = masters.map((master) => ({
    id: master.id,
    name: master.name || "Без имени",
    slug: master.slug || "—",
    status: master.active ? "Активен" : "Не активен",
  }));

  return (
    <PageSection title="Мастера салона">

      <StatGrid
        items={[
          { label: "Всего мастеров", value: stats.total },
          { label: "Активные", value: stats.active },
          { label: "Неактивные", value: stats.inactive },
        ]}
      />

      {loading && (
        <div style={styles.message}>Загрузка...</div>
      )}

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {!loading && !error && masters.length === 0 && (
        <EmptyState
          title="Мастеров пока нет"
          text="Когда мастера появятся в системе, они будут показаны здесь."
        />
      )}

      {!loading && !error && masters.length > 0 && (
        <TableSection
          title="Список мастеров"
          columns={[
            { key: "name", label: "Имя мастера" },
            { key: "slug", label: "Slug" },
            { key: "status", label: "Статус" },
          ]}
          rows={rows}
        />
      )}

    </PageSection>
  );
}

const styles = {
  message: {
    fontSize: "14px",
    color: "#374151",
    marginBottom: "10px",
  },
  error: {
    fontSize: "14px",
    color: "#dc2626",
    marginBottom: "10px",
  },
};