import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

import PageSection from "../../cabinet/PageSection";
import EmptyState from "../../cabinet/EmptyState";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com";

function money(value) {
  const n = Number(value) || 0;
  return `${new Intl.NumberFormat("ru-RU").format(n)} сом`;
}

function formatDate(iso) {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return (
    d.toLocaleDateString("ru-RU") +
    " " +
    d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function getStatusLabel(status) {
  if (status === "open") return "Открыт";
  if (status === "closed") return "Закрыт";
  return status || "—";
}

function normalizeSettlements(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.settlements)) return payload.settlements;
  if (Array.isArray(payload?.periods)) return payload.periods;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.settlements)) return payload.data.settlements;
  return [];
}

function SummaryCard({ label, value, hint }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
      {hint ? <div style={styles.summaryHint}>{hint}</div> : null}
    </div>
  );
}

function FinanceNav({ masterSlug, active }) {
  const items = [
    { key: "finance", label: "Финансы", note: "overview", to: `/master/${masterSlug}/finance` },
    { key: "money", label: "Доход", note: "деньги сейчас", to: `/master/${masterSlug}/money` },
    { key: "settlements", label: "Сеты", note: "расчётные периоды", to: `/master/${masterSlug}/settlements` },
    { key: "payouts", label: "Выплаты", note: "фактические выплаты", to: `/master/${masterSlug}/payouts` },
    { key: "transactions", label: "Транзакции", note: "ledger", to: `/master/${masterSlug}/transactions` }
  ];

  return (
    <div style={styles.navGrid}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            to={item.to}
            style={{
              ...styles.navCard,
              borderColor: isActive ? "#dbeafe" : "#e5e7eb",
              background: isActive ? "#eff6ff" : "#ffffff"
            }}
          >
            <div style={{ ...styles.navTitle, color: isActive ? "#1d4ed8" : "#111827" }}>{item.label}</div>
            <div style={styles.navNote}>{item.note}</div>
          </Link>
        );
      })}
    </div>
  );
}

export default function MasterSettlementsPage() {
  const { master, slug: contextSlug } = useMaster() || {};
  const masterSlug = master?.slug || contextSlug || null;

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettlements() {
      try {
        setLoading(true);
        setError(null);

        if (!masterSlug) {
          if (!cancelled) {
            setPeriods([]);
            setError("Не найден master slug");
          }
          return;
        }

        const res = await fetch(`${API_BASE}/internal/masters/${masterSlug}/settlements`);
        if (!res.ok) {
          throw new Error("SETTLEMENTS_FETCH_FAILED");
        }

        const data = await res.json();
        if (cancelled) return;

        setPeriods(normalizeSettlements(data));
      } catch (e) {
        console.error("MASTER_SETTLEMENTS_LOAD_FAILED", e);

        if (!cancelled) {
          setPeriods([]);
          setError("Не удалось загрузить расчетные периоды");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettlements();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  const totalAmount = useMemo(() => {
    return periods.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
  }, [periods]);

  const openCount = useMemo(() => {
    return periods.filter((item) => String(item?.status || "").toLowerCase() === "open").length;
  }, [periods]);

  return (
    <div style={{ padding: "14px 14px 20px" }}>
      {masterSlug ? <FinanceNav masterSlug={masterSlug} active="settlements" /> : null}

      <PageSection title="Сеты">
        {loading && <div>Загрузка...</div>}

        {!loading && error && (
          <EmptyState
            title="Ошибка загрузки"
            message={error}
          />
        )}

        {!loading && !error && periods.length === 0 && (
          <EmptyState
            title="Сеты отсутствуют"
            message="Расчетные периоды появятся после транзакций"
          />
        )}

        {!loading && !error && periods.length > 0 && (
          <>
            <div style={styles.summaryGrid}>
              <SummaryCard label="Кол-во сетов" value={periods.length} />
              <SummaryCard label="Общая сумма" value={money(totalAmount)} />
              <SummaryCard label="Открытые" value={openCount} hint="Текущие незакрытые периоды" />
            </div>

            <div style={styles.cardsList}>
              {periods.map((item, index) => (
                <div key={item?.id || index} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <strong>{item?.id || `Сет ${index + 1}`}</strong>
                    <span style={styles.statusBadge}>{getStatusLabel(item?.status)}</span>
                  </div>

                  <div style={styles.metaGrid}>
                    <div>
                      <div style={styles.metaLabel}>Начало</div>
                      <div style={styles.metaValue}>{formatDate(item?.period_start || item?.start_date)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Конец</div>
                      <div style={styles.metaValue}>{formatDate(item?.period_end || item?.end_date)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Сумма</div>
                      <div style={styles.metaValue}>{money(item?.amount)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Создан</div>
                      <div style={styles.metaValue}>{formatDate(item?.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}

const styles = {
  navGrid: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    paddingBottom: "4px",
    marginBottom: "16px",
    scrollbarWidth: "thin"
  },
  navCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px 14px",
    textDecoration: "none",
    display: "block",
    minWidth: "150px",
    flex: "0 0 auto"
  },
  navTitle: {
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "4px"
  },
  navNote: {
    fontSize: "12px",
    color: "#6b7280"
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginBottom: "16px"
  },
  summaryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px"
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  summaryValue: {
    fontSize: "24px",
    fontWeight: 700
  },
  summaryHint: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#6b7280"
  },
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  itemCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px"
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "12px"
  },
  statusBadge: {
    background: "#f3f4f6",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#374151"
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px"
  },
  metaLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "4px"
  },
  metaValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 600
  }
};
