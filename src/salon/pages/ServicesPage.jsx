import { UiValue, uiMessage, uiMoney, uiJoin, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveSalonSlug } from "../SalonContext";
import { attachSalonService, getMasterServices, getSalonMasters, getSalonServices, updateMasterService } from "../../api/internal";

import PageSection from "../../cabinet/PageSection";
import StatGrid from "../../cabinet/StatGrid";
import EmptyState from "../../cabinet/EmptyState";

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

function formatMoney(value, currency) { return uiMoney(value, currency); }

function formatDuration(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "—";
  }

  return uiMessage("salon.s0735", {p0: numberValue});
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
    tail.push(uiMoney(service.price, service.currency_code || service.currency));
  }
  if (Number.isFinite(Number(service?.duration_min))) {
    tail.push(uiMessage("salon.s0735", {p0: service.duration_min}));
  }

  return uiJoin([uiJoin(parts, " — "), uiJoin(tail, " — ")].filter(Boolean), " — ");
}

function resolveMasterSlug(master) {
  return String(
    master?.slug ||
    master?.master_slug ||
    master?.masterSlug ||
    ""
  ).trim();
}

export default function ServicesPage() {
  const { renderUi } = useUiMessages();
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
    const result = await getSalonMasters(slug);
    if (!result?.ok) {
      const status = Number(result?.detail?.status || result?.detail?.response?.status || 0);
      throw new Error(status ? uiTemplate(["SALON_MASTERS_LOAD_FAILED_",""], [status]) : "SALON_MASTERS_LOAD_FAILED");
    }
    const list = Array.isArray(result?.masters) ? result.masters : [];
    return list.filter((item) => item?.status === "active");
  }

  async function loadServices(showLoader = true) {
    if (!slug) {
      setServices([]);
      setLoading(false);
      setError(uiError(uiMessage("salon.s0736")));
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setError("");

      const [servicesResult, activeMasters] = await Promise.all([
        getSalonServices(slug),
        fetchSalonMasters()
      ]);

      if (!servicesResult?.ok) {
        const status = Number(servicesResult?.detail?.status || servicesResult?.detail?.response?.status || 0);
        throw new Error(status ? uiTemplate(["LOAD_FAILED_",""], [status]) : "LOAD_FAILED");
      }

      const normalizedServices = normalizeServicesResponse(servicesResult);

      setServices(normalizedServices);
      setSalonMasters(activeMasters);
      setSuccess("");
    } catch (e) {
      console.error("LOAD_SERVICES_ERROR", e);
      setServices([]);
      setSalonMasters([]);
      setError(uiError(uiMessage("salon.s0737")));
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

      const requestableMasters = activeMasters.filter((currentMaster) => Boolean(resolveMasterSlug(currentMaster)));

      if (requestableMasters.length === 0) {
        setMasterServices([]);
        return;
      }

      const responses = await Promise.allSettled(
        requestableMasters.map(async (currentMaster) => {
          const masterSlug = resolveMasterSlug(currentMaster);
          const result = await getMasterServices(masterSlug);
          if (!result?.ok) {
            const status = Number(result?.detail?.status || result?.detail?.response?.status || 0);
            throw new Error(uiTemplate(["MASTER_SERVICES_LOAD_FAILED_","_",""], [masterSlug, status || "ERROR"]));
          }

          const list = normalizeServicesResponse(result);

          return list.map((item) => ({
            ...item,
            master_id: currentMaster.id,
            master_slug: masterSlug,
            master_name: currentMaster.name
          }));
        })
      );

      const fulfilled = responses
        .filter((item) => item.status === "fulfilled")
        .flatMap((item) => item.value);

      const rejected = responses.filter((item) => item.status === "rejected");

      if (rejected.length > 0) {
        console.error("LOAD_MASTER_SERVICES_PARTIAL_FAILED", rejected);
      }

      setMasterServices(fulfilled);
    } catch (e) {
      console.error("LOAD_MASTER_SERVICES_ERROR", e);
      setMasterServices([]);
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

      if (!service?.master_slug) {
        throw new Error("MASTER_SLUG_MISSING");
      }

      const result = await updateMasterService(encodeURIComponent(service.master_slug), service.id, { active: !service.active });
      if (!result?.ok) throw new Error("TOGGLE_FAILED");

      await loadServices(false);
      setSuccess(service.active ? uiMessage("salon.s0738") : uiMessage("salon.s0739"));
    } catch (e) {
      console.error("TOGGLE_ERROR", e);
      setError(uiError(uiMessage("salon.s0740")));
    } finally {
      setProcessingId(null);
    }
  }

  async function updatePrice(service) {
    const input = window.prompt(renderUi(uiMessage("salon.s0741")), String(service.price ?? ""));
    if (input === null) return;

    const price = Number(input);

    if (!Number.isFinite(price) || price < 0) {
      setError(uiError(uiMessage("salon.s0742")));
      return;
    }

    try {
      setProcessingId(service.id);
      setError("");
      setSuccess("");

      if (!service?.master_slug) {
        throw new Error("MASTER_SLUG_MISSING");
      }

      const result = await updateMasterService(encodeURIComponent(service.master_slug), service.id, { price });
      if (!result?.ok) throw new Error("UPDATE_PRICE_FAILED");

      await loadServices(false);
      setSuccess(uiMessage("salon.s0743"));
    } catch (e) {
      console.error("UPDATE_PRICE_ERROR", e);
      setError(uiError(uiMessage("salon.s0744")));
    } finally {
      setProcessingId(null);
    }
  }

  async function updateDuration(service) {
    const input = window.prompt(renderUi(uiMessage("salon.s0745")), String(service.duration_min ?? ""));
    if (input === null) return;

    const durationMin = Number(input);

    if (!Number.isFinite(durationMin) || durationMin <= 0 || !Number.isInteger(durationMin)) {
      setError(uiError(uiMessage("salon.s0746")));
      return;
    }

    try {
      setProcessingId(service.id);
      setError("");
      setSuccess("");

      if (!service?.master_slug) {
        throw new Error("MASTER_SLUG_MISSING");
      }

      const result = await updateMasterService(encodeURIComponent(service.master_slug), service.id, { duration_min: durationMin });
      if (!result?.ok) throw new Error("UPDATE_DURATION_FAILED");

      await loadServices(false);
      setSuccess(uiMessage("salon.s0747"));
    } catch (e) {
      console.error("UPDATE_DURATION_ERROR", e);
      setError(uiError(uiMessage("salon.s0748")));
    } finally {
      setProcessingId(null);
    }
  }

  async function attachService() {
    if (!selectedServiceId) {
      setError(uiError(uiMessage("salon.s0749")));
      return;
    }

    const selected = masterServices.find((item) => String(item.id) === String(selectedServiceId));

    if (!selected) {
      setError(uiError(uiMessage("salon.s0750")));
      return;
    }

    const targetMasterId = selected.master_id;
    if (!targetMasterId) {
      setError(uiError(uiMessage("salon.s0751")));
      return;
    }

    try {
      setAttachLoading(true);
      setError("");
      setSuccess("");

      const response = await attachSalonService(slug, {
        master_id: Number(targetMasterId),
        service_pk: Number(selected.service_pk),
        price: Number(selected.price),
        duration_min: Number(selected.duration_min),
        active: true
      });

      if (!response?.ok) {
        let message = uiMessage("salon.s0752");
        try {
          message = response?.error || response?.detail?.json?.error || message;
        } catch (parseError) {
          console.error("ATTACH_ERROR_PARSE_FAILED", parseError);
        }
        throw new Error(message);
      }

      await loadServices(false);
      await loadMasterServices(false);
      setSelectedServiceId("");
      setSuccess(uiMessage("salon.s0753"));
    } catch (e) {
      console.error("ATTACH_ERROR", e);
      setError(uiError(e?.message || uiMessage("salon.s0752")));
    } finally {
      setAttachLoading(false);
    }
  }

  const availableMasterServices = useMemo(() => {
    const existingKeys = new Set(services.map((item) => uiTemplate(["",":",""], [item.master_id, item.service_pk])));

    return masterServices.filter((item) => {
      const masterId = item?.master_id;
      if (!masterId) return false;
      return !existingKeys.has(uiTemplate(["",":",""], [masterId, item.service_pk]));
    });
  }, [masterServices, services]);

  const hasAvailableMasterServices = availableMasterServices.length > 0;

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((item) => item?.active).length;
    const masters = new Set(services.map((item) => item?.master_id).filter(Boolean)).size;
    return { total, active, masters };
  }, [services]);

  const isBusy = loading || attachLoading || processingId !== null;

  return (
    <PageSection title={uiMessage("salon.s0754")}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <div
            style={{
              color: "#667085",
              marginTop: "-8px",
              fontSize: "14px",
              lineHeight: 1.5
            }}
          ><UiValue value={uiMessage("salon.s0755")} /></div>
        </div>

        <StatGrid
          items={[
            { label: uiMessage("salon.s0756"), value: stats.total },
            { label: uiMessage("salon.s0109"), value: stats.active },
            { label: uiMessage("salon.s0757"), value: stats.masters }
          ]}
        />

        <div style={cardStyle()}>
          <h3 style={sectionTitleStyle()}><UiValue value={uiMessage("salon.s0758")} /></h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
              alignItems: "end"
            }}
          >
            <div>
              <div style={labelStyle()}><UiValue value={uiMessage("salon.s0759")} /></div>
              <select
                value={selectedServiceId}
                onChange={(event) => setSelectedServiceId(event.target.value)}
                style={inputStyle()}
                disabled={attachLoading || !hasAvailableMasterServices}
              >
                <option value=""><UiValue value={hasAvailableMasterServices ? uiMessage("salon.s0760") : uiMessage("salon.s0761")} /></option>
                {availableMasterServices.map((service) => (
                  <option key={uiTemplate(["","-",""], [service.master_id || "master", service.id])} value={service.id}>
                    <UiValue value={getAttachOptionLabel(service)} />
                  </option>
                ))}
              </select>
              {!hasAvailableMasterServices ? (
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#667085", lineHeight: 1.5 }}><UiValue value={uiMessage("salon.s0762")} /></div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={attachService}
                disabled={attachLoading || !hasAvailableMasterServices}
                style={buttonStyle("primary", attachLoading || !hasAvailableMasterServices)}
              >
                <UiValue value={attachLoading ? uiMessage("salon.s0429") : uiMessage("salon.s0763")} />
              </button>

              <button
                onClick={() => {
                  loadServices(true);
                  loadMasterServices(false);
                }}
                disabled={isBusy}
                style={buttonStyle("default", isBusy)}
              >
                <UiValue value={loading ? uiMessage("salon.s0431") : uiMessage("salon.s0107")} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={badgeStyle(salonMasters.length > 0)}><UiValue value={uiMessage("salon.s0764")} /><UiValue value={salonMasters.length} /></div>
            <div style={badgeStyle(hasAvailableMasterServices)}><UiValue value={uiMessage("salon.s0765")} /><UiValue value={availableMasterServices.length} />
            </div>
          </div>

          {salonMasters.length === 0 && (
            <div style={{ fontSize: "13px", color: "#667085" }}><UiValue value={uiMessage("salon.s0766")} /></div>
          )}

          {salonMasters.length > 0 && !hasAvailableMasterServices && (
            <div style={{ fontSize: "13px", color: "#667085" }}><UiValue value={uiMessage("salon.s0767")} /></div>
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
            <UiValue value={success} />
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
            <UiValue value={error} />
          </div>
        )}

        {loading && (
          <div style={cardStyle()}>
            <div style={{ color: "#667085", fontSize: "14px" }}><UiValue value={uiMessage("salon.s0768")} /></div>
          </div>
        )}

        {!loading && services.length === 0 && !error && (
          <EmptyState
            title={uiMessage("salon.s0769")}
            text={uiMessage("salon.s0770")}
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
                <h3 style={sectionTitleStyle()}><UiValue value={uiMessage("salon.s0771")} /></h3>
                <div style={{ fontSize: "13px", color: "#667085" }}><UiValue value={uiMessage("salon.s0772")} /></div>
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
                          <UiValue value={service.name || uiMessage("salon.s0773")} />
                        </div>
                        <div style={{ fontSize: "13px", color: "#667085" }}>
                          <UiValue value={service.master_name || uiMessage("salon.s0774")} />
                        </div>
                      </div>
                      <span style={badgeStyle(!!service.active)}>
                        <UiValue value={service.active ? uiMessage("salon.s0627") : uiMessage("salon.s0775")} />
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
                        <div style={labelStyle()}><UiValue value={uiMessage("salon.s0232")} /></div>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                          <UiValue value={formatMoney(service.price, service?.currency_code || service?.currency)} />
                        </div>
                      </div>
                      <div>
                        <div style={labelStyle()}><UiValue value={uiMessage("salon.s0776")} /></div>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                          <UiValue value={formatDuration(service.duration_min)} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => toggleActive(service)}
                        disabled={isProcessing || attachLoading}
                        style={buttonStyle("default", isProcessing || attachLoading)}
                      >
                        <UiValue value={service.active ? uiMessage("salon.s0777") : uiMessage("salon.s0778")} />
                      </button>

                      <button
                        onClick={() => updatePrice(service)}
                        disabled={isProcessing || attachLoading}
                        style={buttonStyle("default", isProcessing || attachLoading)}
                      ><UiValue value={uiMessage("salon.s0779")} /></button>

                      <button
                        onClick={() => updateDuration(service)}
                        disabled={isProcessing || attachLoading}
                        style={buttonStyle("default", isProcessing || attachLoading)}
                      ><UiValue value={uiMessage("salon.s0780")} /></button>
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
