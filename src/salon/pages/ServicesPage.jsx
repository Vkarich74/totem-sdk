import { useEffect, useMemo, useState } from "react";

import PageSection from "../../cabinet/PageSection";
import StatGrid from "../../cabinet/StatGrid";
import EmptyState from "../../cabinet/EmptyState";
import { useSalonSlug } from "../SalonContext";

const API_BASE = import.meta.env.VITE_API_BASE;

function buttonStyle(kind = "default", disabled = false) {
  const base = {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#111827",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "13px",
    fontWeight: 600,
    opacity: disabled ? 0.6 : 1,
    transition: "all 0.15s ease"
  };

  if (kind === "primary") {
    return {
      ...base,
      border: "1px solid #111827",
      background: "#111827",
      color: "#ffffff"
    };
  }

  if (kind === "danger") {
    return {
      ...base,
      border: "1px solid #f04438",
      background: "#fff5f5",
      color: "#b42318"
    };
  }

  return base;
}

function cardStyle() {
  return {
    border: "1px solid #e7e7e7",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  };
}

function sectionTitleStyle() {
  return {
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
    margin: 0
  };
}

function labelStyle() {
  return {
    fontSize: "13px",
    color: "#667085",
    marginBottom: "6px"
  };
}

function inputStyle() {
  return {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #d0d5dd",
    borderRadius: "10px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "14px",
    background: "#ffffff",
    color: "#111827"
  };
}

function badgeStyle(active) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: active ? "#ecfdf3" : "#f2f4f7",
    color: active ? "#067647" : "#667085",
    border: active ? "1px solid #abefc6" : "1px solid #d0d5dd",
    fontWeight: 600
  };
}

function formatMoney(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return `${numberValue.toLocaleString("ru-RU")} сом`;
}

function formatDuration(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "—";
  }

  return `${numberValue} мин`;
}

export default function ServicesPage() {
  const slug = useSalonSlug();

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
      if (!res.ok) throw new Error(`LOAD_FAILED_${res.status}`);

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
      if (!salonMastersRes.ok) throw new Error(`SALON_MASTERS_LOAD_FAILED_${salonMastersRes.status}`);

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

      setMaster(null);
    } catch (e) {
      console.error("LOAD_MASTER_ERROR", e);
      setMaster(null);
      setSalonMasters([]);
    }
  }

  async function loadMasterServices() {
    try {
      const salonMastersRes = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
      if (!salonMastersRes.ok) throw new Error(`SALON_MASTERS_LOAD_FAILED_${salonMastersRes.status}`);

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
              throw new Error(`MASTER_SERVICES_LOAD_FAILED_${currentMaster.slug}_${res.status}`);
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

      setMasterServices([]);
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

    const targetMasterId = selected.master_id || master?.id;

    if (!targetMasterId) {
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
          master_id: Number(targetMasterId),
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
      const masterId = item.master_id || master?.id;
      if (!masterId) return false;
      return !existingKeys.has(`${masterId}:${item.service_pk}`);
    });
  }, [masterServices, services]);

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.active).length;
    return { total, active };
  }, [services]);

  return (
    <PageSection title="Услуги салона">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <div
            style={{
              color: "#667085",
              marginTop: "-8px",
              fontSize: "14px",
              lineHeight: 1.5
            }}
          >
            Управляй витриной услуг салона: подключай услуги мастеров, меняй цену и длительность,
            включай и отключай продажу без выхода из кабинета.
          </div>
        </div>

        <StatGrid
          items={[
            { label: "Всего услуг", value: stats.total },
            { label: "Активные", value: stats.active }
          ]}
        />

        <div style={cardStyle()}>
          <h3 style={sectionTitleStyle()}>Подключить услугу мастера</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
              alignItems: "end"
            }}
          >
            <div>
              <div style={labelStyle()}>Доступные услуги</div>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                style={inputStyle()}
                disabled={attachLoading || availableMasterServices.length === 0}
              >
                <option value="">Выбери услугу</option>

                {availableMasterServices.map((s) => (
                  <option key={`${s.master_id || "master"}-${s.id}`} value={s.id}>
                    {s.master_name ? `${s.master_name} — ` : ""}
                    {s.name} — {s.price} сом — {s.duration_min} мин
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap"
              }}
            >
              <button
                onClick={attachService}
                disabled={attachLoading || availableMasterServices.length === 0}
                style={buttonStyle("primary", attachLoading || availableMasterServices.length === 0)}
              >
                {attachLoading ? "Подключаем..." : "Добавить"}
              </button>

              <button
                onClick={loadServices}
                disabled={loading || attachLoading || processingId !== null}
                style={buttonStyle("default", loading || attachLoading || processingId !== null)}
              >
                {loading ? "Обновляем..." : "Обновить"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap"
            }}
          >
            <div style={badgeStyle(salonMasters.length > 0)}>
              Активных мастеров: {salonMasters.length}
            </div>

            <div style={badgeStyle(availableMasterServices.length > 0)}>
              Доступно для подключения: {availableMasterServices.length}
            </div>
          </div>

          {salonMasters.length === 0 && (
            <div
              style={{
                fontSize: "13px",
                color: "#667085"
              }}
            >
              В салоне нет активных мастеров.
            </div>
          )}

          {salonMasters.length > 0 && availableMasterServices.length === 0 && (
            <div
              style={{
                fontSize: "13px",
                color: "#667085"
              }}
            >
              Нет доступных услуг мастеров для подключения.
            </div>
          )}
        </div>

        {loading && (
          <div style={cardStyle()}>
            <div style={{ color: "#667085", fontSize: "14px" }}>Загрузка услуг...</div>
          </div>
        )}

        {!loading && services.length === 0 && (
          <EmptyState
            title="Услуг пока нет"
            text="Подключите услуги мастеров и начните управлять витриной салона"
          />
        )}

        {!loading && services.length > 0 && (
          <div style={cardStyle()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap"
              }}
            >
              <h3 style={sectionTitleStyle()}>Подключённые услуги</h3>

              <div
                style={{
                  fontSize: "13px",
                  color: "#667085"
                }}
              >
                Все изменения применяются сразу после действия.
              </div>
            </div>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid #eaecf0",
                borderRadius: "12px",
                background: "#ffffff"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "840px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "12px", color: "#667085" }}>ID</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "12px", color: "#667085" }}>Мастер</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "12px", color: "#667085" }}>Услуга</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "12px", color: "#667085" }}>Цена</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "12px", color: "#667085" }}>Длительность</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "12px", color: "#667085" }}>Статус</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "12px", color: "#667085" }}>Действия</th>
                  </tr>
                </thead>

                <tbody>
                  {services.map((s, index) => {
                    const isProcessing = processingId === s.id;

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderTop: index === 0 ? "none" : "1px solid #eaecf0"
                        }}
                      >
                        <td style={{ padding: "16px 12px", color: "#111827", fontSize: "14px", fontWeight: 600 }}>{s.id}</td>
                        <td style={{ padding: "16px 12px", color: "#111827", fontSize: "14px" }}>{s.master_name || "—"}</td>
                        <td style={{ padding: "16px 12px", color: "#111827", fontSize: "14px", fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: "16px 12px", color: "#111827", fontSize: "14px" }}>{formatMoney(s.price)}</td>
                        <td style={{ padding: "16px 12px", color: "#111827", fontSize: "14px" }}>{formatDuration(s.duration_min)}</td>
                        <td style={{ padding: "16px 12px" }}>
                          <span style={badgeStyle(!!s.active)}>
                            {s.active ? "Активна" : "Отключена"}
                          </span>
                        </td>
                        <td style={{ padding: "16px 12px" }}>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              onClick={() => toggleActive(s)}
                              disabled={isProcessing || attachLoading}
                              style={buttonStyle("default", isProcessing || attachLoading)}
                            >
                              {s.active ? "Выключить" : "Включить"}
                            </button>

                            <button
                              onClick={() => updatePrice(s)}
                              disabled={isProcessing || attachLoading}
                              style={buttonStyle("default", isProcessing || attachLoading)}
                            >
                              Цена
                            </button>

                            <button
                              onClick={() => updateDuration(s)}
                              disabled={isProcessing || attachLoading}
                              style={buttonStyle("default", isProcessing || attachLoading)}
                            >
                              Длительность
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageSection>
  );
}
