import { useEffect, useMemo, useState } from "react";
import AdminNavigation from "../AdminNavigation";

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "");

function getAdminToken(){
  try{
    return String(window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim();
  }catch(e){
    return "";
  }
}

function buildHeaders(){
  const token = getAdminToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeItems(payload){
  if(Array.isArray(payload?.data?.items)){
    return payload.data.items;
  }

  if(Array.isArray(payload?.items)){
    return payload.items;
  }

  return [];
}

function formatOwnerState(ownerType, owner){
  if(ownerType === "salon"){
    return owner?.enabled === false ? "Деактивирован" : "Активен";
  }

  return owner?.active === false ? "Деактивирован" : "Активен";
}

function isOwnerActive(ownerType, owner){
  if(ownerType === "salon"){
    return owner?.enabled !== false;
  }

  return owner?.active !== false;
}

function getOwnerId(owner){
  return Number(owner?.id || 0);
}

function getOwnerSlug(owner){
  return String(owner?.slug || "").trim();
}

function buildActionPayload(action, reason){
  return JSON.stringify({
    action,
    reason: String(reason || "").trim() || "admin owner offboarding",
  });
}

export default function AdminOwnersPage(){
  const [salons, setSalons] = useState([]);
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("по просьбе владельца");

  const token = getAdminToken();

  async function loadOwners(){
    if(!token){
      setLoading(false);
      setError("NO_ADMIN_TOKEN");
      return;
    }

    try{
      setLoading(true);
      setError("");
      setNotice("");

      const headers = buildHeaders();
      const [salonsResponse, mastersResponse] = await Promise.all([
        fetch(`${API_BASE}/internal/admin/salons?limit=200`, { headers }),
        fetch(`${API_BASE}/internal/admin/masters?limit=200`, { headers }),
      ]);

      const [salonsPayload, mastersPayload] = await Promise.all([
        salonsResponse.json().catch(() => null),
        mastersResponse.json().catch(() => null),
      ]);

      if(!salonsResponse.ok || salonsPayload?.ok !== true){
        throw new Error(salonsPayload?.error || `SALONS_HTTP_${salonsResponse.status}`);
      }

      if(!mastersResponse.ok || mastersPayload?.ok !== true){
        throw new Error(mastersPayload?.error || `MASTERS_HTTP_${mastersResponse.status}`);
      }

      setSalons(normalizeItems(salonsPayload));
      setMasters(normalizeItems(mastersPayload));
    }catch(e){
      setSalons([]);
      setMasters([]);
      setError(e?.message || "ADMIN_OWNERS_LOAD_FAILED");
    }finally{
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runOwnerAction(ownerType, owner, action){
    const id = getOwnerId(owner);
    const slug = getOwnerSlug(owner);

    if(!id || !slug){
      setError("OWNER_INVALID");
      return;
    }

    const actionLabel = action === "suspend" ? "деактивировать" : "активировать";
    const confirmed = window.confirm(`Подтвердить: ${actionLabel} ${ownerType} ${slug}?`);

    if(!confirmed){
      return;
    }

    try{
      setActionLoading(true);
      setError("");
      setNotice("");

      const collection = ownerType === "salon" ? "salons" : "masters";
      const response = await fetch(`${API_BASE}/internal/admin/${collection}/${id}/action`, {
        method: "POST",
        headers: buildHeaders(),
        body: buildActionPayload(action, reason),
      });

      const payload = await response.json().catch(() => null);

      if(!response.ok || payload?.ok !== true){
        throw new Error(payload?.error || `OWNER_ACTION_HTTP_${response.status}`);
      }

      setNotice(`${slug}: действие выполнено`);
      await loadOwners();
    }catch(e){
      setError(e?.message || "OWNER_ACTION_FAILED");
    }finally{
      setActionLoading(false);
    }
  }

  const totals = useMemo(() => {
    const activeSalons = salons.filter((item) => isOwnerActive("salon", item)).length;
    const activeMasters = masters.filter((item) => isOwnerActive("master", item)).length;

    return {
      salons: salons.length,
      masters: masters.length,
      activeSalons,
      inactiveSalons: salons.length - activeSalons,
      activeMasters,
      inactiveMasters: masters.length - activeMasters,
    };
  }, [salons, masters]);

  if(!token){
    return (
      <div style={{ padding: 24 }}>
        <AdminNavigation />
        <p>Требуется вход администратора</p>
        <a href="#/admin/login?returnTo=/admin/owners">Войти как администратор</a>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <AdminNavigation />

      <h1 style={styles.title}>Владельцы</h1>
      <p style={styles.subtitle}>Деактивация и реактивация салонов и мастеров без удаления данных.</p>

      {error ? <div style={styles.errorBox}>Ошибка: {error}</div> : null}
      {notice ? <div style={styles.noticeBox}>{notice}</div> : null}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Салоны</div>
          <div style={styles.statValue}>{totals.salons}</div>
          <div style={styles.statHint}>Активны: {totals.activeSalons} / Отключены: {totals.inactiveSalons}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Мастера</div>
          <div style={styles.statValue}>{totals.masters}</div>
          <div style={styles.statHint}>Активны: {totals.activeMasters} / Отключены: {totals.inactiveMasters}</div>
        </div>
      </div>

      <label style={styles.reasonLabel}>
        Причина действия
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          style={styles.input}
          placeholder="по просьбе владельца"
        />
      </label>

      <div style={styles.buttonRow}>
        <button type="button" onClick={loadOwners} disabled={loading || actionLoading} style={styles.secondaryButton}>
          Обновить
        </button>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div style={styles.grid}>
          <OwnerSection
            title="Салоны"
            ownerType="salon"
            owners={salons}
            actionLoading={actionLoading}
            onAction={runOwnerAction}
          />

          <OwnerSection
            title="Мастера"
            ownerType="master"
            owners={masters}
            actionLoading={actionLoading}
            onAction={runOwnerAction}
          />
        </div>
      )}
    </div>
  );
}

function OwnerSection({ title, ownerType, owners, actionLoading, onAction }){
  return (
    <section style={styles.panel}>
      <h2 style={styles.panelTitle}>{title}</h2>

      {owners.length === 0 ? (
        <div>Нет записей</div>
      ) : (
        <div style={styles.ownerList}>
          {owners.map((owner) => {
            const active = isOwnerActive(ownerType, owner);
            const slug = getOwnerSlug(owner);

            return (
              <div key={`${ownerType}-${owner.id}`} style={styles.ownerCard}>
                <div style={styles.ownerHeader}>
                  <div>
                    <strong>#{owner.id}</strong> {owner.name || "-"}
                  </div>
                  <span style={active ? styles.activeBadge : styles.inactiveBadge}>
                    {formatOwnerState(ownerType, owner)}
                  </span>
                </div>

                <div style={styles.ownerMeta}>slug: {slug || "-"}</div>
                {ownerType === "salon" ? <div style={styles.ownerMeta}>status: {owner.status || "-"}</div> : null}
                {ownerType === "master" ? <div style={styles.ownerMeta}>salon: {owner.salon_slug || "-"}</div> : null}

                <div style={styles.buttonRowCompact}>
                  {active ? (
                    <button
                      type="button"
                      onClick={() => onAction(ownerType, owner, "suspend")}
                      disabled={actionLoading}
                      style={styles.dangerButton}
                    >
                      Деактивировать
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAction(ownerType, owner, "unsuspend")}
                      disabled={actionLoading}
                      style={styles.primaryButton}
                    >
                      Активировать
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles = {
  title: {
    margin: "0 0 8px",
  },
  subtitle: {
    margin: "0 0 16px",
    color: "#4b5563",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    padding: 14,
  },
  statLabel: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
  },
  statHint: {
    color: "#4b5563",
    fontSize: 13,
    marginTop: 4,
  },
  reasonLabel: {
    display: "grid",
    gap: 6,
    maxWidth: 520,
    fontWeight: 700,
    marginBottom: 12,
  },
  input: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "10px 12px",
    font: "inherit",
    fontWeight: 400,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  panel: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 16,
    background: "#fff",
  },
  panelTitle: {
    margin: "0 0 12px",
  },
  ownerList: {
    display: "grid",
    gap: 10,
    maxHeight: 620,
    overflowY: "auto",
    paddingRight: 4,
  },
  ownerCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    background: "#fafafa",
  },
  ownerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  ownerMeta: {
    color: "#4b5563",
    fontSize: 13,
    marginTop: 3,
    wordBreak: "break-word",
  },
  activeBadge: {
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    padding: "3px 8px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  inactiveBadge: {
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    padding: "3px 8px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  buttonRowCompact: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  primaryButton: {
    border: "1px solid #111",
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    padding: "8px 11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #111",
    borderRadius: 8,
    background: "#fff",
    color: "#111",
    padding: "8px 11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #991b1b",
    borderRadius: 8,
    background: "#991b1b",
    color: "#fff",
    padding: "8px 11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBox: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontWeight: 700,
  },
  noticeBox: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontWeight: 700,
  },
};
