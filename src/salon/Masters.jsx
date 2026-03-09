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

  const rows = masters.map((m) => ({
    id: m.id,
    name: m.name || "Без имени",
    slug: m.slug || "—",
    status: m.active ? "Активен" : "Не активен",
  }));

  return (
    <PageSection title="Мастера салона">

      <StatGrid
        items={[
          { label: "Всего мастеров", value: stats.total },
          { label: "Активные", value: stats.active },
          { label: "Не активные", value: stats.inactive },
        ]}
      />

      {loading && <p>Загрузка...</p>}

      {error && (
        <div style={{ color: "red" }}>
          {error}
        </div>
      )}

      {!loading && !error && masters.length === 0 && (
        <EmptyState
          title="Мастеров пока нет"
          text="Когда мастера появятся в системе, они будут отображаться здесь."
        />
      )}

      {!loading && !error && masters.length > 0 && (
        <TableSection
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