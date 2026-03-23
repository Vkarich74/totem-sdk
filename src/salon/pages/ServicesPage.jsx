import { useEffect, useMemo, useState } from "react";

import PageSection from "../../cabinet/PageSection";
import StatGrid from "../../cabinet/StatGrid";
import EmptyState from "../../cabinet/EmptyState";

const API_BASE = import.meta.env.VITE_API_BASE;
const MASTER_SLUG = window.MASTER_SLUG || "demo-master";

function resolveSlugFromHash() {
  const hash = window.location.hash || "";
  const clean = hash.replace(/^#\/?/, "");
  const parts = clean.split("/");
  return parts[1] || window.SALON_SLUG || "totem-demo-salon";
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

export default function ServicesPage(props) {
  const slug = props?.slug || resolveSlugFromHash();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [master, setMaster] = useState(null);
  const [masterServices, setMasterServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [attachLoading, setAttachLoading] = useState(false);
  const [salonMasters, setSalonMasters] = useState([]);

  async function loadServices() {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/internal/salons/${slug}/services`);
      if (!res.ok) throw new Error("LOAD_FAILED");

      const data = await res.json();

      if (data?.services) {
        setServices(data.services);
      } else {
        setServices([]);
      }
    } catch (e) {
      console.error("LOAD_SERVICES_ERROR", e);
      alert("Ошибка загрузки услуг");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMaster() {
    try {
      const salonMastersRes = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
      if (!salonMastersRes.ok) throw new Error("SALON_MASTERS_LOAD_FAILED");

      const salonMastersData = await salonMastersRes.json();
      const activeSalonMasters = (salonMastersData?.masters || []).filter(
        (item) => item.status === "active"
      );

      setSalonMasters(activeSalonMasters);

      if (activeSalonMasters.length > 0) {
        setMaster({
          id: activeSalonMasters[0].id,
          slug: activeSalonMasters[0].slug,
          name: activeSalonMasters[0].name
        });
        return;
      }

      const res = await fetch(`${API_BASE}/internal/masters/${MASTER_SLUG}`);
      if (!res.ok) throw new Error("MASTER_LOAD_FAILED");

      const data = await res.json();
      setMaster(data?.master || null);
    } catch (e) {
      console.error("LOAD_MASTER_ERROR", e);
      setMaster(null);
      setSalonMasters([]);
    }
  }

  async function loadMasterServices() {
    try {
      const salonMastersRes = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
      if (!salonMastersRes.ok) throw new Error("SALON_MASTERS_LOAD_FAILED");

      const salonMastersData = await salonMastersRes.json();
      const activeSalonMasters = (salonMastersData?.masters || []).filter(
        (item) => item.status === "active"
      );

      setSalonMasters(activeSalonMasters);

      if (activeSalonMasters.length > 0) {
        const responses = await Promise.all(
          activeSalonMasters.map(async (currentMaster) => {
            const res = await fetch(`${API_BASE}/internal/masters/${currentMaster.slug}/services`);
            if (!res.ok) {
              throw new Error(`MASTER_SERVICES_LOAD_FAILED_${currentMaster.slug}`);
            }

            const data = await res.json();
            const list = data?.services || [];

            return list.map((item) => ({
              ...item,
              master_id: currentMaster.id,
              master_slug: currentMaster.slug,
              master_name: currentMaster.name
            }));
          })
        );

        setMasterServices(responses.flat());
        return;
      }

      const res = await fetch(`${API_BASE}/internal/masters/${MASTER_SLUG}/services`);
      if (!res.ok) throw new Error("MASTER_SERVICES_LOAD_FAILED");

      const data = await res.json();
      const fallbackServices = (data?.services || []).map((item) => ({
        ...item,
        master_id: master?.id || null,
        master_slug: MASTER_SLUG,
        master_name: master?.name || "Мастер"
      }));
      setMasterServices(fallbackServices);
    } catch (e) {
      console.error("LOAD_MASTER_SERVICES_ERROR", e);
      setMasterServices([]);
    }
  }

  useEffect(() => {
    loadServices();
    loadMaster();
    loadMasterServices();
  }, [slug]);

  async function toggleActive(service) {
    try {
      setProcessingId(service.id);

      const res = await fetch(`${API_BASE}/internal/salon-services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: !service.active
        })
      });

      if (!res.ok) throw new Error("TOGGLE_FAILED");

      await loadServices();
    } catch (e) {
      console.error("TOGGLE_ERROR", e);
      alert("Ошибка изменения статуса");
    } finally {
      setProcessingId(null);
    }
  }

  async function updatePrice(service) {
    const input = window.prompt("Новая цена", String(service.price));
    if (input === null) return;

    const price = Number(input);

    if (Number.isNaN(price) || price < 0) {
      alert("Некорректная цена");
      return;
    }

    try {
      setProcessingId(service.id);

      const res = await fetch(`${API_BASE}/internal/salon-services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price
        })
      });

      if (!res.ok) throw new Error("UPDATE_PRICE_FAILED");

      await loadServices();
    } catch (e) {
      console.error("UPDATE_PRICE_ERROR", e);
      alert("Ошибка обновления цены");
    } finally {
      setProcessingId(null);
    }
  }

  async function updateDuration(service) {
    const input = window.prompt("Новая длительность в минутах", String(service.duration_min));
    if (input === null) return;

    const durationMin = Number(input);

    if (
      Number.isNaN(durationMin) ||
      durationMin <= 0 ||
      !Number.isInteger(durationMin)
    ) {
      alert("Некорректная длительность");
      return;
    }

    try {
      setProcessingId(service.id);

      const res = await fetch(`${API_BASE}/internal/salon-services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_min: durationMin
        })
      });

      if (!res.ok) throw new Error("UPDATE_DURATION_FAILED");

      await loadServices();
    } catch (e) {
      console.error("UPDATE_DURATION_ERROR", e);
      alert("Ошибка обновления длительности");
    } finally {
      setProcessingId(null);
    }
  }

  async function attachService() {
    if (!selectedServiceId) {
      alert("Выбери услугу");
      return;
    }

    const selected = masterServices.find((item) => String(item.id) === String(selectedServiceId));

    if (!selected) {
      alert("Услуга мастера не найдена");
      return;
    }

    if (!selected?.master_id && !master?.id) {
      alert("Не удалось определить мастера");
      return;
    }

    try {
      setAttachLoading(true);

      const res = await fetch(`${API_BASE}/internal/salons/${slug}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          master_id: Number(selected.master_id || master.id),
          service_pk: Number(selected.service_pk),
          price: Number(selected.price),
          duration_min: Number(selected.duration_min),
          active: true
        })
      });

      if (!res.ok) {
        let message = "ATTACH_FAILED";

        try {
          const errorData = await res.json();
          message = errorData?.error || message;
        } catch (parseError) {
          console.error("ATTACH_ERROR_PARSE_FAILED", parseError);
        }

        throw new Error(message);
      }

      await loadServices();
      await loadMasterServices();
      setSelectedServiceId("");
      alert("Услуга подключена");
    } catch (e) {
      console.error("ATTACH_ERROR", e);
      alert(`Ошибка подключения услуги: ${e.message}`);
    } finally {
      setAttachLoading(false);
    }
  }

  const availableMasterServices = useMemo(() => {
    const existingKeys = new Set(
      services.map((item) => `${item.master_id}:${item.service_pk}`)
    );

    return masterServices.filter((item) => {
      const currentMasterId = item.master_id || master?.id;
      if (!currentMasterId) return true;
      return !existingKeys.has(`${currentMasterId}:${item.service_pk}`);
    });
  }, [master, masterServices, services]);

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.active).length;
    return { total, active };
  }, [services]);

  return (
    <PageSection title="Услуги салона">
      <StatGrid
        items={[
          { label: "Всего услуг", value: stats.total },
          { label: "Активные", value: stats.active }
        ]}
      />

      <div style={{ marginBottom: 20 }}>
        <h3>Добавить услугу мастера</h3>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
          >
            <option value="">Выбери услугу</option>

            {availableMasterServices.map((s) => (
              <option key={`${s.master_id || "master"}-${s.id}`} value={s.id}>
                {(s.master_name ? `${s.master_name} — ` : "") + `${s.name} — ${s.price} сом — ${s.duration_min} мин`}
              </option>
            ))}
          </select>

          <button
            onClick={attachService}
            disabled={attachLoading || (!master?.id && salonMasters.length === 0) || availableMasterServices.length === 0}
            style={buttonStyle()}
          >
            Добавить
          </button>
        </div>

        {availableMasterServices.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
            Нет доступных услуг мастера для подключения
          </div>
        )}
      </div>

      {loading && <div>Загрузка...</div>}

      {!loading && services.length === 0 && (
        <EmptyState
          title="Услуг пока нет"
          text="Подключите услуги мастеров"
        />
      )}

      {!loading && services.length > 0 && (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            background: "#ffffff"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 12 }}>ID</th>
                <th style={{ padding: 12 }}>Мастер</th>
                <th style={{ padding: 12 }}>Услуга</th>
                <th style={{ padding: 12 }}>Цена</th>
                <th style={{ padding: 12 }}>Длительность</th>
                <th style={{ padding: 12 }}>Статус</th>
                <th style={{ padding: 12 }}>Действия</th>
              </tr>
            </thead>

            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: 12 }}>{s.id}</td>
                  <td style={{ padding: 12 }}>{s.master_name}</td>
                  <td style={{ padding: 12 }}>{s.name}</td>
                  <td style={{ padding: 12 }}>{s.price}</td>
                  <td style={{ padding: 12 }}>{s.duration_min} мин</td>
                  <td style={{ padding: 12 }}>
                    {s.active ? "Активна" : "Отключена"}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={processingId === s.id}
                        style={buttonStyle()}
                      >
                        {s.active ? "Выключить" : "Включить"}
                      </button>

                      <button
                        onClick={() => updatePrice(s)}
                        disabled={processingId === s.id}
                        style={buttonStyle()}
                      >
                        Цена
                      </button>

                      <button
                        onClick={() => updateDuration(s)}
                        disabled={processingId === s.id}
                        style={buttonStyle()}
                      >
                        Длительность
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  );
}
