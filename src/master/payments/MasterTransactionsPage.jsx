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

function getDirectionLabel(value) {
  if (value === "credit") return "Пополнение";
  if (value === "debit") return "Списание";
  return value || "—";
}

function getTypeLabel(value) {
  if (value === "payout") return "Выплата";
  if (value === "subscription") return "Подписка";
  if (value === "platform_fee") return "Платформа";
  if (value === "refund_reverse") return "Refund reverse";
  return value || "—";
}

function normalizeLedger(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.ledger)) return payload.ledger;
  if (Array.isArray(payload?.entries)) return payload.entries;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.ledger)) return payload.data.ledger;
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

export default function MasterTransactionsPage() {
  const { master, slug: contextSlug } = useMaster() || {};
  const masterSlug = master?.slug || contextSlug || null;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        setLoading(true);
        setError(null);

        if (!masterSlug) {
          if (!cancelled) {
            setTransactions([]);
            setError("Не найден master slug");
          }
          return;
        }

        const res = await fetch(`${API_BASE}/internal/masters/${masterSlug}/ledger`);
        if (!res.ok) {
          throw new Error("LEDGER_FETCH_FAILED");
        }

        const data = await res.json();
        if (cancelled) return;

        setTransactions(normalizeLedger(data));
      } catch (e) {
        console.error("MASTER_TRANSACTIONS_LOAD_FAILED", e);

        if (!cancelled) {
          setTransactions([]);
          setError("Не удалось загрузить транзакции");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, item) => {
        const amount = Number(item?.amount) || 0;

        acc.total += amount;

        if (item?.direction === "credit") {
          acc.creditCount += 1;
          acc.creditAmount += amount;
        }

        if (item?.direction === "debit") {
          acc.debitCount += 1;
          acc.debitAmount += amount;
        }

        return acc;
      },
      {
        total: 0,
        creditCount: 0,
        creditAmount: 0,
        debitCount: 0,
        debitAmount: 0
      }
    );
  }, [transactions]);

  return (
    <div style={{ padding: "14px 14px 20px" }}>
      {masterSlug ? <FinanceNav masterSlug={masterSlug} active="transactions" /> : null}

      <PageSection title="Транзакции">
        {loading && <div>Загрузка...</div>}

        {!loading && error && (
          <EmptyState
            title="Ошибка загрузки"
            message={error}
          />
        )}

        {!loading && !error && transactions.length === 0 && (
          <EmptyState
            title="Транзакций пока нет"
            message="Финансовые операции появятся здесь"
          />
        )}

        {!loading && !error && transactions.length > 0 && (
          <>
            <div style={styles.summaryGrid}>
              <SummaryCard label="Всего операций" value={transactions.length} />
              <SummaryCard label="Пополнения" value={money(summary.creditAmount)} hint={`${summary.creditCount} шт.`} />
              <SummaryCard label="Списания" value={money(summary.debitAmount)} hint={`${summary.debitCount} шт.`} />
              <SummaryCard label="Общий оборот" value={money(summary.total)} />
            </div>

            <div style={styles.cardsList}>
              {transactions.map((item, index) => (
                <div key={item?.id || index} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <strong>{item?.id || `Операция ${index + 1}`}</strong>
                    <span style={styles.directionBadge}>{getDirectionLabel(item?.direction)}</span>
                  </div>

                  <div style={styles.metaGrid}>
                    <div>
                      <div style={styles.metaLabel}>Тип</div>
                      <div style={styles.metaValue}>{getTypeLabel(item?.reference_type || item?.type)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Сумма</div>
                      <div style={styles.metaValue}>{money(item?.amount)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Дата</div>
                      <div style={styles.metaValue}>{formatDate(item?.created_at || item?.date)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Reference ID</div>
                      <div style={styles.metaValue}>{item?.reference_id || "—"}</div>
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
  directionBadge: {
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
