import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildSalonPath, resolveSalonSlug } from "../SalonContext";

import PageSection from "../../cabinet/PageSection";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com";

function statusLabel(status) {
  if (status === "active") return "Активен";
  if (status === "pending") return "Ожидает";
  if (status === "fired") return "Отключён";
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
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>{value}</div>
      {note ? (
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px", lineHeight: 1.4 }}>{note}</div>
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
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginBottom: "8px" }}>
        Мастеров пока нет
      </div>
      <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5, marginBottom: "16px" }}>
        Пригласите первого мастера и подключите его к работе салона.
      </div>
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
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#b42318", marginBottom: "8px" }}>
        Не удалось загрузить мастеров
      </div>
      <div style={{ fontSize: "14px", color: "#7a271a", lineHeight: 1.5, marginBottom: "16px" }}>
        {error || "Произошла ошибка при загрузке списка мастеров."}
      </div>
      <button onClick={onRetry} style={buttonStyle()}>
        Повторить
      </button>
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
  const displayName = master.name || master.full_name || `Мастер #${master.id}`;
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
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}>{displayName}</div>
          <div style={{ fontSize: "13px", color: "#667085", lineHeight: 1.45 }}>slug: {master.slug || "—"}</div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: "999px",
            border: `1px solid ${tone.border}`,
            background: tone.bg,
            color: tone.color,
            fontSize: "12px",
            fontWeight: 800,
            whiteSpace: "nowrap"
          }}
        >
          {statusLabel(master.status)}
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
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Телефон</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{phone}</div>
        </div>

        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Услуги</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{serviceCount}</div>
        </div>

        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Записи</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{bookingsCount}</div>
        </div>

        <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Контракт</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{contractLabel || "—"}</div>
        </div>
      </div>

      {note ? (
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#475467", lineHeight: 1.5 }}>{note}</div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
        {master.status === "pending" ? (
          <button onClick={() => onActivate(master.id)} disabled={busy} style={buttonStyle("primary")}>
            {busy ? "Подключаем..." : "Активировать"}
          </button>
        ) : null}

        {master.status === "active" ? (
          <button onClick={() => onTerminate(master.id)} disabled={busy} style={buttonStyle("danger")}>
            {busy ? "Обновляем..." : "Прекратить"}
          </button>
        ) : null}

        {master.status === "fired" ? (
          <button onClick={() => onActivate(master.id)} disabled={busy} style={buttonStyle()}>
            {busy ? "Возвращаем..." : "Вернуть"}
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
        >
          Открыть контракты
        </Link>
      </div>
    </div>
  );
}

export default function MastersPage() {
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
      setError("SLUG_MISSING");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/internal/salons/${encodeURIComponent(slug)}/masters`);
      const text = await response.text();

      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error || `SALON_MASTERS_HTTP_${response.status}`);
      }

      if (Array.isArray(data)) {
        setMasters(data);
      } else if (Array.isArray(data?.masters)) {
        setMasters(data.masters);
      } else {
        setMasters([]);
      }
    } catch (loadError) {
      console.error("LOAD_MASTERS_ERROR", loadError);
      setMasters([]);
      setError(loadError?.message || "LOAD_MASTERS_FAILED");
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
        `${API_BASE}/internal/salons/${encodeURIComponent(slug)}/masters/${masterId}/terminate`,
        { method: "POST" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        alert(data?.error || "Ошибка при прекращении сотрудничества");
        return;
      }

      await loadMasters();
    } catch (requestError) {
      console.error("TERMINATE_ERROR", requestError);
      alert("Ошибка сети");
    } finally {
      setProcessingId(null);
    }
  }

  async function activate(id) {
    try {
      setProcessingId(id);

      const response = await fetch(`${API_BASE}/internal/masters/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id: id,
          salon_slug: slug
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        alert(data?.error || "Ошибка активации мастера");
        return;
      }

      await loadMasters();
    } catch (requestError) {
      console.error("ACTIVATE_MASTER_ERROR", requestError);
      alert("Ошибка активации мастера");
    } finally {
      setProcessingId(null);
    }
  }

  async function createMaster() {
    const name = window.prompt("Имя мастера");
    if (!name) return;

    try {
      const response = await fetch(`${API_BASE}/internal/masters/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          salon_slug: slug
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        alert(data?.error || "Ошибка создания мастера");
        return;
      }

      await loadMasters();
    } catch (requestError) {
      console.error("CREATE_MASTER_ERROR", requestError);
      alert("Ошибка создания мастера");
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
      const haystack = [
        master.id,
        master.name,
        master.full_name,
        master.slug,
        master.phone,
        master.phone_number,
        master.contact_phone,
        master.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [masters, search]);

  const hasData = filtered.length > 0;

  return (
    <PageSection title="Мастера салона">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "16px"
        }}
      >
        <StatCard title="Всего мастеров" value={stats.total} note="Вся команда салона" />
        <StatCard title="Активные" value={stats.active} note="Сейчас могут работать" />
        <StatCard title="Ожидают" value={stats.pending} note="Требуют активации" />
        <StatCard title="Отключены" value={stats.fired} note="Можно вернуть в работу" />
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
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}>Команда салона</div>
            <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
              Управляйте списком мастеров, активацией и переходами к контрактам без лишних блоков и таблиц.
            </div>
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
            >
              Контракты
            </Link>
            <button onClick={createMaster} style={buttonStyle("primary")}>
              Пригласить мастера
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginTop: "16px" }}>
          <input
            placeholder="Поиск по имени, slug, телефону..."
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
          >
            Перейти к услугам мастеров
          </Link>
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
