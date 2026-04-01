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
  if (status === "pending") return "В обработке";
  if (status === "processing") return "Обрабатывается";
  if (status === "completed") return "Завершено";
  if (status === "failed") return "Ошибка";
  return status || "—";
}

function normalizePayouts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.payouts)) return payload.data.payouts;
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

export default function MasterPayoutsPage() {
  const { master, slug: contextSlug } = useMaster() || {};
  const masterSlug = master?.slug || contextSlug || null;

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (!masterSlug) {
          if (!cancelled) {
            setError("Не найден master slug");
            setPayouts([]);
          }
          return;
        }

        const res = await fetch(`${API_BASE}/internal/masters/${masterSlug}/payouts`);
        if (!res.ok) {
          throw new Error("PAYOUTS_FETCH_FAILED");
        }

        const data = await res.json();
        if (cancelled) return;

        setPayouts(normalizePayouts(data));
      } catch (e) {
        console.error("MASTER_PAYOUTS_LOAD_FAILED", e);

        if (!cancelled) {
          setPayouts([]);
          setError("Не удалось загрузить выплаты");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  const total = useMemo(() => {
    return payouts.reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
  }, [payouts]);

  const completedCount = useMemo(() => {
    return payouts.filter((p) => String(p?.status || "").toLowerCase() === "completed").length;
  }, [payouts]);

  return (
    <div style={{ padding: "14px 14px 20px" }}>
      {masterSlug ? <FinanceNav masterSlug={masterSlug} active="payouts" /> : null}

      <PageSection title="Выплаты">
        {loading && <div>Загрузка...</div>}

        {!loading && error && (
          <EmptyState
            title="Ошибка загрузки"
            message={error}
          />
        )}

        {!loading && !error && payouts.length === 0 && (
          <EmptyState
            title="Выплат нет"
            message="Выплаты появятся после закрытия сетов"
          />
        )}

        {!loading && !error && payouts.length > 0 && (
          <>
            <div style={styles.summaryGrid}>
              <SummaryCard label="Кол-во выплат" value={payouts.length} />
              <SummaryCard label="Общая сумма" value={money(total)} />
              <SummaryCard label="Завершено" value={completedCount} hint="Успешно проведенные выплаты" />
            </div>

            <div style={styles.cardsList}>
              {payouts.map((p, index) => (
                <div key={p?.id || index} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <strong>{p?.id || `Выплата ${index + 1}`}</strong>
                    <span style={styles.statusBadge}>{getStatusLabel(p?.status)}</span>
                  </div>

                  <div style={styles.metaGrid}>
                    <div>
                      <div style={styles.metaLabel}>Дата</div>
                      <div style={styles.metaValue}>{formatDate(p?.created_at || p?.date)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Сумма</div>
                      <div style={styles.metaValue}>{money(p?.amount)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Reference</div>
                      <div style={styles.metaValue}>{p?.reference || p?.reference_id || "—"}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Статус</div>
                      <div style={styles.metaValue}>{getStatusLabel(p?.status)}</div>
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
    fontWeight: 600,
    wordBreak: "break-word"
  }
};
