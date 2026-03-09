import { useEffect, useState, useMemo } from "react";

import PageSection from "../../cabinet/ui/PageSection";
import StatGrid from "../../cabinet/ui/StatGrid";
import TableSection from "../../cabinet/ui/TableSection";
import EmptyState from "../../cabinet/ui/EmptyState";

const API_BASE = "https://api.totemv.com";

function resolveSlug() {

  if (window.SALON_SLUG) return window.SALON_SLUG;

  const parts = window.location.pathname.split("/");
  return parts[2] || "totem-demo-salon";

}

export default function OwnerMastersPage() {

  const slug = resolveSlug();

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadMasters() {

    try {

      setLoading(true);

      const r = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
      const data = await r.json();

      if (Array.isArray(data)) {
        setMasters(data);
      }
      else if (data && Array.isArray(data.masters)) {
        setMasters(data.masters);
      }
      else {
        setMasters([]);
      }

    } catch (e) {

      console.error("LOAD_MASTERS_ERROR", e);
      setMasters([]);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    loadMasters();

  }, []);

  async function fire(id) {

    await fetch(`${API_BASE}/internal/masters/fire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        master_id: id,
        salon_slug: slug
      })
    });

    loadMasters();

  }

  async function activate(id) {

    await fetch(`${API_BASE}/internal/masters/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        master_id: id,
        salon_slug: slug
      })
    });

    loadMasters();

  }

  async function createMaster() {

    const name = prompt("Имя мастера");

    if (!name) return;

    await fetch(`${API_BASE}/internal/masters/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        salon_slug: slug
      })
    });

    loadMasters();

  }

  const stats = useMemo(() => {

    const total = masters.length;
    const active = masters.filter(m => m.status === "active").length;
    const pending = masters.filter(m => m.status === "pending").length;

    return { total, active, pending };

  }, [masters]);

  const rows = masters.map(m => ({

    id: m.id,
    name: m.name,
    status: m.status,

    actions: (

      <>
        {m.status === "pending" && (
          <button onClick={() => activate(m.id)}>Активировать</button>
        )}

        {m.status === "active" && (
          <button onClick={() => fire(m.id)}>Уволить</button>
        )}

        {m.status === "fired" && (
          <button onClick={() => activate(m.id)}>Вернуть</button>
        )}
      </>

    )

  }));

  return (

    <PageSection title="Мастера салона">

      <StatGrid
        items={[
          { label: "Всего мастеров", value: stats.total },
          { label: "Активные", value: stats.active },
          { label: "Ожидают", value: stats.pending }
        ]}
      />

      <button
        style={{ marginBottom: 20 }}
        onClick={createMaster}
      >
        Пригласить мастера
      </button>

      {loading && <div>Загрузка...</div>}

      {!loading && masters.length === 0 && (

        <EmptyState
          title="Мастеров пока нет"
          text="Пригласите первого мастера."
        />

      )}

      {!loading && masters.length > 0 && (

        <TableSection
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Имя" },
            { key: "status", label: "Статус" },
            { key: "actions", label: "Действия" }
          ]}
          rows={rows}
        />

      )}

    </PageSection>

  );

}