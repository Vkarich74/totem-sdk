import { UiValue, uiMessage, uiJoin, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildSalonPath, resolveSalonSlug } from "../SalonContext";
import { activateSalonMaster, getSalonMasters, provisionMaster, terminateSalonMaster } from "../../api/internal";

import PageSection from "../../cabinet/PageSection";

function statusLabel(status) {
  if (status === "active") return uiMessage("salon.s0420");
  if (status === "pending") return uiMessage("salon.s0042");
  if (status === "fired") return uiMessage("salon.s0421");
  return status || "—";
}

function statusTone(status) {
  if (status === "active") {
    return {
      bg: "#ecfdf3",
      border: "#abefc6",
      color: "#067647"
    };
  }

  if (status === "pending") {
    return {
      bg: "#fffaeb",
      border: "#fedf89",
      color: "#b54708"
    };
  }

  if (status === "fired") {
    return {
      bg: "#fff5f5",
      border: "#fecaca",
      color: "#b42318"
    };
  }

  return {
    bg: "#f8fafc",
    border: "#e5e7eb",
    color: "#475467"
  };
}

function buttonStyle(kind = "default") {
  const base = {
    padding: "9px 12px",
    borderRadius: "10px",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: 1.2
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
      border: "1px solid #dc2626",
      background: "#dc2626",
      color: "#ffffff"
    };
  }

  return base;
}

function StatCard({ title, value, note }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: "#fff",
        padding: "16px"
      }}
    >
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}><UiValue value={value} /></div>
      {note ? (
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px", lineHeight: 1.4 }}><UiValue value={note} /></div>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: "1px dashed #d0d5dd",
        borderRadius: "16px",
        background: "#ffffff",
        padding: "24px"
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginBottom: "8px" }}><UiValue value={uiMessage("salon.s0422")} /></div>
      <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5, marginBottom: "16px" }}><UiValue value={uiMessage("salon.s0423")} /></div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div
      style={{
        border: "1px solid #fecaca",
        borderRadius: "16px",
        background: "#fff5f5",
        padding: "20px"
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#b42318", marginBottom: "8px" }}><UiValue value={uiMessage("salon.s0424")} /></div>
      <div style={{ fontSize: "14px", color: "#7a271a", lineHeight: 1.5, marginBottom: "16px" }}>
        <UiValue value={error || uiMessage("salon.s0425")} />
      </div>
      <button onClick={onRetry} style={buttonStyle()}><UiValue value={uiMessage("salon.s0426")} /></button>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "12px"
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            background: "#ffffff",
            padding: "16px"
          }}
        >
          <div style={{ height: "16px", width: "40%", background: "#f3f4f6", borderRadius: "8px", marginBottom: "12px" }} />
          <div style={{ height: "14px", width: "80%", background: "#f3f4f6", borderRadius: "8px", marginBottom: "8px" }} />
          <div style={{ height: "14px", width: "60%", background: "#f3f4f6", borderRadius: "8px", marginBottom: "20px" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ height: "36px", width: "110px", background: "#f3f4f6", borderRadius: "10px" }} />
            <div style={{ height: "36px", width: "110px", background: "#f3f4f6", borderRadius: "10px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MasterCard({ master, processingId, onActivate, onTerminate, detailLink }) {
  const tone = statusTone(master.status);
  const busy = processingId === master.id;
  const displayName = master.name || master.full_name || uiMessage("salon.s0427", {p0: master.id});
  const phone = master.phone || master.phone_number || master.contact_phone || "—";
  const serviceCount = Number(master.services_count || master.service_count || master.services || 0) || 0;
  const bookingsCount = Number(master.bookings_count || master.booking_count || 0) || 0;
  const contractLabel = master.contract_status || master.contractState || master.contract_status_label || "—";
  const note = master.note || master.comment || "";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        background: "#ffffff",
        padding: "16px",
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}><UiValue value={displayName} /></div>
          <div style={{ fontSize: "13px", color: "#667085", lineHeight: 1.45 }}><UiValue value={uiMessage("salon.s0315")} /><UiValue value={master.slug || "—"} /></div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: "999px",
            border: uiTemplate(["1px solid ",""], [tone.border]),
            background: tone.bg,
            color: tone.color,
            fontSize: "12px",
            fontWeight: 800,
            whiteSpace: "nowrap"
          }}
        >
          <UiValue value={statusLabel(master.status)} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
          marginTop: "14px"
        }}
      >
        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}><UiValue value={uiMessage("salon.s0230")} /></div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}><UiValue value={phone} /></div>
        </div>

        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}><UiValue value={uiMessage("salon.s0024")} /></div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}><UiValue value={serviceCount} /></div>
        </div>

        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}><UiValue value={uiMessage("salon.s0014")} /></div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}><UiValue value={bookingsCount} /></div>
        </div>

        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}><UiValue value={uiMessage("salon.s0428")} /></div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}><UiValue value={contractLabel || "—"} /></div>
        </div>
      </div>

      {note ? (
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#475467", lineHeight: 1.5 }}><UiValue value={note} /></div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
        {master.status === "pending" ? (
          <button onClick={() => onActivate(master.id)} disabled={busy} style={buttonStyle("primary")}>
            <UiValue value={busy ? uiMessage("salon.s0429") : uiMessage("salon.s0430")} />
          </button>
        ) : null}

        {master.status === "active" ? (
          <button onClick={() => onTerminate(master.id)} disabled={busy} style={buttonStyle("danger")}>
            <UiValue value={busy ? uiMessage("salon.s0431") : uiMessage("salon.s0432")} />
          </button>
        ) : null}

        {master.status === "fired" ? (
          <button onClick={() => onActivate(master.id)} disabled={busy} style={buttonStyle()}>
            <UiValue value={busy ? uiMessage("salon.s0433") : uiMessage("salon.s0434")} />
          </button>
        ) : null}

        <Link
          to={detailLink}
          style={{
            ...buttonStyle(),
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center"
          }}
        ><UiValue value={uiMessage("salon.s0435")} /></Link>
      </div>
    </div>
  );
}

export default function MastersPage() {
  const { renderUi } = useUiMessages();
  const { slug: routeSlug } = useParams();
  const slug = resolveSalonSlug(routeSlug);

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);

  async function loadMasters() {
    if (!slug) {
      setMasters([]);
      setError(uiError("SLUG_MISSING"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await getSalonMasters(slug);
      if (!result?.ok) {
        const status = Number(result?.detail?.status || result?.detail?.response?.status || 0);
        throw new Error(status ? uiTemplate(["SALON_MASTERS_HTTP_",""], [status]) : (result?.error || "LOAD_MASTERS_FAILED"));
      }

      setMasters(Array.isArray(result?.masters) ? result.masters : []);
    } catch (loadError) {
      console.error("LOAD_MASTERS_ERROR", loadError);
      setMasters([]);
      setError(uiError(loadError?.message || "LOAD_MASTERS_FAILED"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMasters();
  }, [slug]);

  async function terminate(masterId) {
    const confirmed = window.confirm(
      renderUi(uiMessage("salon.s0436"))
    );

    if (!confirmed) return;

    try {
      setProcessingId(masterId);

      const result = await terminateSalonMaster(slug, masterId);
      if (!result?.ok) {
        alert(renderUi(uiError(result?.error || result?.detail?.json?.error || uiMessage("salon.s0437"))));
        return;
      }

      await loadMasters();
    } catch (requestError) {
      console.error("TERMINATE_ERROR", requestError);
      alert(renderUi(uiError(uiMessage("salon.s0271"))));
    } finally {
      setProcessingId(null);
    }
  }

  async function activate(id) {
    try {
      setProcessingId(id);

      const result = await activateSalonMaster(slug, id);
      if (!result?.ok) {
        alert(renderUi(uiError(result?.error || result?.detail?.json?.error || uiMessage("salon.s0438"))));
        return;
      }

      await loadMasters();
    } catch (requestError) {
      console.error("ACTIVATE_MASTER_ERROR", requestError);
      alert(renderUi(uiError(uiMessage("salon.s0438"))));
    } finally {
      setProcessingId(null);
    }
  }

  async function createMaster() {
    const name = window.prompt(renderUi(uiMessage("salon.s0439")));
    if (!name) return;

    const email = window.prompt(renderUi(uiMessage("salon.s0440")));
    if (!email) return;

    try {
      const result = await provisionMaster({
        email,
        name
      });

      if (!result?.ok) {
        alert(renderUi(uiError(result?.error || result?.detail?.json?.error || uiMessage("salon.s0441"))));
        return;
      }

      await loadMasters();
    } catch (requestError) {
      console.error("CREATE_MASTER_ERROR", requestError);
      alert(renderUi(uiError(uiMessage("salon.s0441"))));
    }
  }

  const stats = useMemo(() => {
    const total = masters.length;
    const active = masters.filter((master) => master.status === "active").length;
    const pending = masters.filter((master) => master.status === "pending").length;
    const fired = masters.filter((master) => master.status === "fired").length;

    return { total, active, pending, fired };
  }, [masters]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return masters;

    return masters.filter((master) => {
      const haystack = uiJoin([
        master.id,
        master.name,
        master.full_name,
        master.slug,
        master.phone,
        master.phone_number,
        master.contact_phone,
        master.status
      ]
        .filter(Boolean), " ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [masters, search]);

  const hasData = filtered.length > 0;

  return (
    <PageSection title={uiMessage("salon.s0442")}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "16px"
        }}
      >
        <StatCard title={uiMessage("salon.s0443")} value={stats.total} note={uiMessage("salon.s0444")} />
        <StatCard title={uiMessage("salon.s0109")} value={stats.active} note={uiMessage("salon.s0445")} />
        <StatCard title={uiMessage("salon.s0220")} value={stats.pending} note={uiMessage("salon.s0446")} />
        <StatCard title={uiMessage("salon.s0447")} value={stats.fired} note={uiMessage("salon.s0448")} />
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          background: "#ffffff",
          padding: "16px",
          marginBottom: "16px"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}><UiValue value={uiMessage("salon.s0449")} /></div>
            <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}><UiValue value={uiMessage("salon.s0450")} /></div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <Link
              to={buildSalonPath(slug, "contracts")}
              style={{
                ...buttonStyle(),
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center"
              }}
            ><UiValue value={uiMessage("salon.s0451")} /></Link>
            <button onClick={createMaster} style={buttonStyle("primary")}><UiValue value={uiMessage("salon.s0452")} /></button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginTop: "16px" }}>
          <input
            placeholder={renderUi(uiMessage("salon.s0453"))}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              padding: "11px 12px",
              width: "100%",
              border: "1px solid #d0d5dd",
              borderRadius: "10px",
              fontSize: "14px"
            }}
          />

          <Link
            to={buildSalonPath(slug, "services")}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              background: "#f8fafc",
              color: "#111827",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "11px 12px",
              fontSize: "14px",
              fontWeight: 700
            }}
          ><UiValue value={uiMessage("salon.s0454")} /></Link>
        </div>
      </div>

      {loading ? <LoadingGrid /> : null}
      {!loading && error ? <ErrorState error={error} onRetry={loadMasters} /> : null}
      {!loading && !error && !hasData ? <EmptyState /> : null}

      {!loading && !error && hasData ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px"
          }}
        >
          {filtered.map((master) => (
            <MasterCard
              key={master.id}
              master={master}
              processingId={processingId}
              onActivate={activate}
              onTerminate={terminate}
              detailLink={buildSalonPath(slug, "contracts")}
            />
          ))}
        </div>
      ) : null}
    </PageSection>
  );
}
