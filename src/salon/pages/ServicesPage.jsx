import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveSalonSlug } from "../SalonContext";

import PageSection from "../../cabinet/PageSection";
import StatGrid from "../../cabinet/StatGrid";
import EmptyState from "../../cabinet/EmptyState";

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

function normalizeServicesResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.services)) return data.services;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getAttachOptionLabel(service) {
  const parts = [];
  if (service?.master_name) parts.push(service.master_name);
  if (service?.name) parts.push(service.name);

  const tail = [];
  if (Number.isFinite(Number(service?.price))) {
    tail.push(`${Number(service.price).toLocaleString("ru-RU")} сом`);
  }
  if (Number.isFinite(Number(service?.duration_min))) {
    tail.push(`${service.duration_min} мин`);
  }

  return [parts.join(" — "), tail.join(" — ")].filter(Boolean).join(" — ");
}

export default function ServicesPage() {
  const { slug: routeSlug } = useParams();
  const slug = resolveSalonSlug(routeSlug);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [masterServices, setMasterServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [attachLoading, setAttachLoading] = useState(false);
  const [salonMasters, setSalonMasters] = useState([]);

  async function fetchSalonMasters() {
    const response = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
    if (!response.ok) {
      throw new Error(`SALON_MASTERS_LOAD_FAILED_${response.status}`);
    }

    const payload = await response.json();
    const list = Array.isArray(payload?.masters) ? payload.masters : [];
    return list.filter((item) => item?.status === "active");
  }

  async function loadServices(showLoader = true) {
    if (!slug) {
      setServices([]);
      setLoading(false);
      setError("Не найден slug салона");
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setError("");

      const [servicesResponse, activeMasters] = await Promise.all([
        fetch(`${API_BASE}/internal/salons/${slug}/services`),
        fetchSalonMasters()
      ]);

      if (!servicesResponse.ok) {
        throw new Error(`LOAD_FAILED_${servicesResponse.status}`);
      }

      const payload = await servicesResponse.json();
      const normalizedServices = normalizeServicesResponse(payload);

      setServices(normalizedServices);
      setSalonMasters(activeMasters);
      setSuccess("");
    } catch (e) {
      console.error("LOAD_SERVICES_ERROR", e);
      setServices([]);
      setSalonMasters([]);
      setError("Не удалось загрузить услуги салона");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadMasterServices(showLoader = false) {
    if (!slug) {
      setMasterServices([]);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setError("");

      const activeMasters = await fetchSalonMasters();
      setSalonMasters(activeMasters);

      if (activeMasters.length === 0) {
        setMasterServices([]);
        return;
      }

      const responses = await Promise.all(
        activeMasters.map(async (currentMaster) => {
          const response = await fetch(`${API_BASE}/internal/masters/${currentMaster.slug}/services`);
          if (!response.ok) {
            throw new Error(`MASTER_SERVICES_LOAD_FAILED_${currentMaster.slug}_${response.status}`);
          }

          const payload = await response.json();
          const list = normalizeServicesResponse(payload);

          return list.map((item) => ({
            ...item,
            master_id: currentMaster.id,
            master_slug: currentMaster.slug,
            master_name: currentMaster.name
          }));
        })
      );

      setMasterServices(responses.flat());
    } catch (e) {
      console.error("LOAD_MASTER_SERVICES_ERROR", e);
      setMasterServices([]);
      setError("Не удалось загрузить услуги мастеров");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadServices(true);
    loadMasterServices(false);
  }, [slug]);

  async function toggleActive(service) {
    try {
      setProcessingId(service.id);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE}/internal/salon-services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !service.active })
      });

      if (!response.ok) throw new Error("TOGGLE_FAILED");

      await loadServices(false);
      setSuccess(service.active ? "Услуга выключена" : "Услуга включена");
    } catch (e) {
      console.error("TOGGLE_ERROR", e);
      setError("Ошибка изменения статуса услуги");
    } finally {
      setProcessingId(null);
    }
  }

  async function updatePrice(service) {
    const input = window.prompt("Новая цена", String(service.price ?? ""));
    if (input === null) return;

    const price = Number(input);

    if (!Number.isFinite(price) || price < 0) {
      setError("Некорректная цена");
      return;
    }

    try {
      setProcessingId(service.id);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE}/internal/salon-services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price })
      });

      if (!response.ok) throw new Error("UPDATE_PRICE_FAILED");

      await loadServices(false);
      setSuccess("Цена услуги обновлена");
    } catch (e) {
      console.error("UPDATE_PRICE_ERROR", e);
      setError("Ошибка обновления цены");
    } finally {
      setProcessingId(null);
    }
  }

  async function updateDuration(service) {
    const input = window.prompt("Новая длительность в минутах", String(service.duration_min ?? ""));
    if (input === null) return;

    const durationMin = Number(input);

    if (!Number.isFinite(durationMin) || durationMin <= 0 || !Number.isInteger(durationMin)) {
      setError("Некорректная длительность");
      return;
    }

    try {
      setProcessingId(service.id);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE}/internal/salon-services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_min: durationMin })
      });

      if (!response.ok) throw new Error("UPDATE_DURATION_FAILED");

      await loadServices(false);
      setSuccess("Длительность услуги обновлена");
    } catch (e) {
      console.error("UPDATE_DURATION_ERROR", e);
      setError("Ошибка обновления длительности");
    } finally {
      setProcessingId(null);
    }
  }

  async function attachService() {
    if (!selectedServiceId) {
      setError("Выбери услугу мастера");
      return;
    }

    const selected = masterServices.find((item) => String(item.id) === String(selectedServiceId));

    if (!selected) {
      setError("Услуга мастера не найдена");
      return;
    }

    const targetMasterId = selected.master_id;
    if (!targetMasterId) {
      setError("Не удалось определить мастера для услуги");
      return;
    }

    try {
      setAttachLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE}/internal/salons/${slug}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id: Number(targetMasterId),
          service_pk: Number(selected.service_pk),
          price: Number(selected.price),
          duration_min: Number(selected.duration_min),
          active: true
        })
      });

      if (!response.ok) {
        let message = "Ошибка подключения услуги";
        try {
          const payload = await response.json();
          message = payload?.error || message;
        } catch (parseError) {
          console.error("ATTACH_ERROR_PARSE_FAILED", parseError);
        }
        throw new Error(message);
      }

      await loadServices(false);
      await loadMasterServices(false);
      setSelectedServiceId("");
      setSuccess("Услуга подключена в салон");
    } catch (e) {
      console.error("ATTACH_ERROR", e);
      setError(e?.message || "Ошибка подключения услуги");
    } finally {
      setAttachLoading(false);
    }
  }

  const availableMasterServices = useMemo(() => {
    const existingKeys = new Set(services.map((item) => `${item.master_id}:${item.service_pk}`));

    return masterServices.filter((item) => {
      const masterId = item?.master_id;
      if (!masterId) return false;
      return !existingKeys.has(`${masterId}:${item.service_pk}`);
    });
  }, [masterServices, services]);

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((item) => item?.active).length;
    const masters = new Set(services.map((item) => item?.master_id).filter(Boolean)).size;
    return { total, active, masters };
  }, [services]);

  const isBusy = loading || attachLoading || processingId !== null;

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
            { label: "Активные", value: stats.active },
            { label: "Мастеров в витрине", value: stats.masters }
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
                onChange={(event) => setSelectedServiceId(event.target.value)}
                style={inputStyle()}
                disabled={attachLoading || availableMasterServices.length === 0}
              >
                <option value="">Выбери услугу</option>
                {availableMasterServices.map((service) => (
                  <option key={`${service.master_id || "master"}-${service.id}`} value={service.id}>
                    {getAttachOptionLabel(service)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={attachService}
                disabled={attachLoading || availableMasterServices.length === 0}
                style={buttonStyle("primary", attachLoading || availableMasterServices.length === 0)}
              >
                {attachLoading ? "Подключаем..." : "Добавить"}
              </button>

              <button
                onClick={() => {
                  loadServices(true);
                  loadMasterServices(false);
                }}
                disabled={isBusy}
                style={buttonStyle("default", isBusy)}
              >
                {loading ? "Обновляем..." : "Обновить"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={badgeStyle(salonMasters.length > 0)}>Активных мастеров: {salonMasters.length}</div>
            <div style={badgeStyle(availableMasterServices.length > 0)}>
              Доступно для подключения: {availableMasterServices.length}
            </div>
          </div>

          {salonMasters.length === 0 && (
            <div style={{ fontSize: "13px", color: "#667085" }}>В салоне нет активных мастеров.</div>
          )}

          {salonMasters.length > 0 && availableMasterServices.length === 0 && (
            <div style={{ fontSize: "13px", color: "#667085" }}>
              Все доступные услуги мастеров уже подключены в салон.
            </div>
          )}
        </div>

        {success && (
          <div
            style={{
              ...cardStyle(),
              border: "1px solid #abefc6",
              background: "#ecfdf3",
              color: "#067647"
            }}
          >
            {success}
          </div>
        )}

        {error && (
          <div
            style={{
              ...cardStyle(),
              border: "1px solid #fecdca",
              background: "#fff6f5",
              color: "#b42318"
            }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div style={cardStyle()}>
            <div style={{ color: "#667085", fontSize: "14px" }}>Загрузка услуг...</div>
          </div>
        )}

        {!loading && services.length === 0 && !error && (
          <EmptyState
            title="Услуг пока нет"
            text="Подключите услуги мастеров и начните управлять витриной салона"
          />
        )}

        {!loading && services.length > 0 && (
          <>
            <div style={{ ...cardStyle(), padding: "16px" }}>
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
                <div style={{ fontSize: "13px", color: "#667085" }}>
                  Все изменения применяются сразу после действия.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px"
              }}
            >
              {services.map((service) => {
                const isProcessing = processingId === service.id;

                return (
                  <div key={service.id} style={cardStyle()}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                          {service.name || "Без названия"}
                        </div>
                        <div style={{ fontSize: "13px", color: "#667085" }}>
                          {service.master_name || "Мастер не указан"}
                        </div>
                      </div>
                      <span style={badgeStyle(!!service.active)}>
                        {service.active ? "Активна" : "Отключена"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "12px"
                      }}
                    >
                      <div>
                        <div style={labelStyle()}>Цена</div>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                          {formatMoney(service.price)}
                        </div>
                      </div>
                      <div>
                        <div style={labelStyle()}>Длительность</div>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                          {formatDuration(service.duration_min)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => toggleActive(service)}
                        disabled={isProcessing || attachLoading}
                        style={buttonStyle("default", isProcessing || attachLoading)}
                      >
                        {service.active ? "Выключить" : "Включить"}
                      </button>

                      <button
                        onClick={() => updatePrice(service)}
                        disabled={isProcessing || attachLoading}
                        style={buttonStyle("default", isProcessing || attachLoading)}
                      >
                        Цена
                      </button>

                      <button
                        onClick={() => updateDuration(service)}
                        disabled={isProcessing || attachLoading}
                        style={buttonStyle("default", isProcessing || attachLoading)}
                      >
                        Длительность
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageSection>
  );
}
