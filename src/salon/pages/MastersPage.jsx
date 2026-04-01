import { useEffect, useMemo, useState } from "react";

import PageSection from "../../cabinet/PageSection";
import StatGrid from "../../cabinet/StatGrid";
import EmptyState from "../../cabinet/EmptyState";
import { useSalonSlug } from "../SalonContext";

const API_BASE = import.meta.env.VITE_API_BASE;

function statusLabel(status) {
  if (status === "active") return "Активен";
  if (status === "pending") return "Ожидает";
  if (status === "fired") return "Уволен";
  return status || "-";
}

function buttonStyle(kind = "default") {
  const base = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600
  };

  if (kind === "danger") {
    return {
      ...base,
      border: "1px solid #dc2626",
      background: "#dc2626",
      color: "#ffffff"
    };
  }

  return base;
}

export default function MastersPage() {
  const slug = useSalonSlug();

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);

  async function loadMasters() {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setMasters(data);
      } else if (data && Array.isArray(data.masters)) {
        setMasters(data.masters);
      } else {
        setMasters([]);
      }
    } catch (error) {
      console.error("LOAD_MASTERS_ERROR", error);
      setMasters([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMasters();
  }, [slug]);

  async function terminate(masterId) {
    const confirmed = window.confirm(
      "Прекратить сотрудничество с мастером?\n\nЭто действие:\n- архивирует активные и ожидающие контракты\n- отключит услуги мастера\n- уберёт мастера из активного списка салона"
    );

    if (!confirmed) return;

    try {
      setProcessingId(masterId);

      const response = await fetch(
        `${API_BASE}/internal/salons/${slug}/masters/${masterId}/terminate`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        alert(data?.error || "Ошибка при прекращении сотрудничества");
        return;
      }

      await loadMasters();
    } catch (error) {
      console.error("TERMINATE_ERROR", error);
      alert("Ошибка сети");
    } finally {
      setProcessingId(null);
    }
  }

  async function activate(id) {
    try {
      setProcessingId(id);

      await fetch(`${API_BASE}/internal/masters/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id: id,
          salon_slug: slug
        })
      });

      await loadMasters();
    } catch (error) {
      console.error("ACTIVATE_MASTER_ERROR", error);
      alert("Ошибка активации мастера");
    } finally {
      setProcessingId(null);
    }
  }

  async function createMaster() {
    const name = window.prompt("Имя мастера");
    if (!name) return;

    try {
      await fetch(`${API_BASE}/internal/masters/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          salon_slug: slug
        })
      });

      await loadMasters();
    } catch (error) {
      console.error("CREATE_MASTER_ERROR", error);
      alert("Ошибка создания мастера");
    }
  }

  const stats = useMemo(() => {
    const total = masters.length;
    const active = masters.filter((master) => master.status === "active").length;
    const pending = masters.filter((master) => master.status === "pending").length;
    return { total, active, pending };
  }, [masters]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return masters;

    return masters.filter((master) => {
      const haystack = `${master.id ?? ""} ${master.name ?? ""} ${master.slug ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [masters, search]);

  return (
    <PageSection title="Мастера салона">
      <StatGrid
        items={[
          { label: "Всего мастеров", value: stats.total },
          { label: "Активные", value: stats.active },
          { label: "Ожидают", value: stats.pending }
        ]}
      />

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <input
          placeholder="Поиск мастера..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            padding: "10px",
            width: "280px",
            border: "1px solid #ddd",
            borderRadius: "6px"
          }}
        />
      </div>

      <button
        style={{ marginBottom: 20 }}
        onClick={createMaster}
      >
        Пригласить мастера
      </button>

      {loading && <div>Загрузка...</div>}

      {!loading && filtered.length === 0 && (
        <EmptyState
          title="Мастеров пока нет"
          text="Пригласите первого мастера."
        />
      )}

      {!loading && filtered.length > 0 && (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            background: "#ffffff"
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "760px"
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  ID
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  Имя
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  Slug
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  Статус
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  Действия
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((master, index) => {
                const isLast = index === filtered.length - 1;

                return (
                  <tr key={master.id}>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: "14px",
                        color: "#111827",
                        borderBottom: isLast ? "none" : "1px solid #eef2f7"
                      }}
                    >
                      {master.id}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: "14px",
                        color: "#111827",
                        borderBottom: isLast ? "none" : "1px solid #eef2f7"
                      }}
                    >
                      {master.name || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: "14px",
                        color: "#111827",
                        borderBottom: isLast ? "none" : "1px solid #eef2f7"
                      }}
                    >
                      {master.slug || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: "14px",
                        color: "#111827",
                        borderBottom: isLast ? "none" : "1px solid #eef2f7"
                      }}
                    >
                      {statusLabel(master.status)}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: "14px",
                        color: "#111827",
                        borderBottom: isLast ? "none" : "1px solid #eef2f7"
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {master.status === "pending" && (
                          <button
                            onClick={() => activate(master.id)}
                            disabled={processingId === master.id}
                            style={buttonStyle()}
                          >
                            {processingId === master.id ? "..." : "Активировать"}
                          </button>
                        )}

                        {master.status === "active" && (
                          <button
                            onClick={() => terminate(master.id)}
                            disabled={processingId === master.id}
                            style={buttonStyle("danger")}
                          >
                            {processingId === master.id ? "..." : "Прекратить"}
                          </button>
                        )}

                        {master.status === "fired" && (
                          <button
                            onClick={() => activate(master.id)}
                            disabled={processingId === master.id}
                            style={buttonStyle()}
                          >
                            {processingId === master.id ? "..." : "Вернуть"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  );
}
