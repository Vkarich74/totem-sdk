import { UiValue, uiMessage, uiMoney, uiDate, uiTemplate, uiError } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

import PageSection from "../../cabinet/PageSection";
import EmptyState from "../../cabinet/EmptyState";
import { getMasterLedger } from "../../api/internal";

function money(value, currency) { return uiMoney(value, currency); }

function formatDate(iso) { if (!iso) return "—"; return uiDate(iso, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function getDirectionLabel(value) {
  if (value === "credit") return uiMessage("salon.s1165");
  if (value === "debit") return uiMessage("salon.s1166");
  return value || "—";
}

function getTypeLabel(value) {
  if (value === "payout") return uiMessage("salon.s1066");
  if (value === "subscription") return uiMessage("salon.s1167");
  if (value === "platform_fee") return uiMessage("salon.s1168");
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
      <div style={styles.summaryLabel}><UiValue value={label} /></div>
      <div style={styles.summaryValue}><UiValue value={value} /></div>
      {hint ? <div style={styles.summaryHint}><UiValue value={hint} /></div> : null}
    </div>
  );
}

function FinanceNav({ masterSlug, active }) {
  const items = [
    { key: "finance", label: uiMessage("salon.s0017"), note: uiMessage("salon.s1070"), to: uiTemplate(["/master/","/finance"], [masterSlug]) },
    { key: "money", label: uiMessage("salon.s0412"), note: uiMessage("salon.s0902"), to: uiTemplate(["/master/","/money"], [masterSlug]) },
    { key: "settlements", label: uiMessage("salon.s0029"), note: uiMessage("salon.s1071"), to: uiTemplate(["/master/","/settlements"], [masterSlug]) },
    { key: "payouts", label: uiMessage("salon.s0030"), note: uiMessage("salon.s1072"), to: uiTemplate(["/master/","/payouts"], [masterSlug]) },
    { key: "transactions", label: uiMessage("salon.s0031"), note: uiMessage("salon.s1073"), to: uiTemplate(["/master/","/transactions"], [masterSlug]) }
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
            <div style={{ ...styles.navTitle, color: isActive ? "#1d4ed8" : "#111827" }}><UiValue value={item.label} /></div>
            <div style={styles.navNote}><UiValue value={item.note} /></div>
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
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
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
            setError(uiError(uiMessage("master.s0201")));
          }
          return;
        }

        const result = await getMasterLedger(masterSlug);
        if (!result?.ok) {
          throw new Error(result?.error || "LEDGER_FETCH_FAILED");
        }
        if (cancelled) return;

        setTransactions(normalizeLedger(result));
      } catch (e) {
        console.error("MASTER_TRANSACTIONS_LOAD_FAILED", e);

        if (!cancelled) {
          setTransactions([]);
          setError(uiError(uiMessage("salon.s1172")));
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

  const visibleTransactions = transactionsExpanded ? transactions : transactions.slice(0, 4);
  const hiddenTransactionsCount = Math.max(transactions.length - 4, 0);

  return (
    <div style={{ padding: "14px 14px 20px" }}>
      {masterSlug ? <FinanceNav masterSlug={masterSlug} active="transactions" /> : null}

      <PageSection title={uiMessage("salon.s0031")}>
        {loading && <div><UiValue value={uiMessage("salon.s0118")} /></div>}

        {!loading && error && (
          <EmptyState
            title={uiMessage("salon.s1036")}
            message={error}
          />
        )}

        {!loading && !error && transactions.length === 0 && (
          <EmptyState
            title={uiMessage("salon.s1184")}
            message={uiMessage("master.s0875")}
          />
        )}

        {!loading && !error && transactions.length > 0 && (
          <>
            <div style={styles.summaryGrid}>
              <SummaryCard label={uiMessage("salon.s1175")} value={transactions.length} />
              <SummaryCard label={uiMessage("salon.s1177")} value={money(summary.creditAmount)} hint={uiMessage("salon.s1178", {p0: summary.creditCount})} />
              <SummaryCard label={uiMessage("salon.s1179")} value={money(summary.debitAmount)} hint={uiMessage("salon.s1178", {p0: summary.debitCount})} />
              <SummaryCard label={uiMessage("salon.s1180")} value={money(summary.total)} />
            </div>

            <div style={styles.cardsList}>
              {visibleTransactions.map((item, index) => (
                <div key={item?.id || index} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <strong><UiValue value={item?.id || uiMessage("salon.s1189", {p0: index + 1})} /></strong>
                    <span style={styles.directionBadge}><UiValue value={getDirectionLabel(item?.direction)} /></span>
                  </div>

                  <div style={styles.metaGrid}>
                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s1190")} /></div>
                      <div style={styles.metaValue}><UiValue value={getTypeLabel(item?.reference_type || item?.type)} /></div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0147")} /></div>
                      <div style={styles.metaValue}><UiValue value={money(item?.amount, item?.currency_code || item?.currency)} /></div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0233")} /></div>
                      <div style={styles.metaValue}><UiValue value={formatDate(item?.created_at || item?.date)} /></div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s1191")} /></div>
                      <div style={styles.metaValue}><UiValue value={item?.reference_id || "—"} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {transactions.length > 4 ? (
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setTransactionsExpanded((value) => !value)}
                  style={{
                    border: "1px solid #dbeafe",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    borderRadius: "999px",
                    padding: "10px 14px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  <UiValue value={transactionsExpanded ? uiMessage("salon.s0166") : uiMessage("salon.s0167", {p0: hiddenTransactionsCount})} />
                </button>
              </div>
            ) : null}
          </>
        )}
      </PageSection>
    </div>
  );
}

const styles = {
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
    marginBottom: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  navCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px 14px",
    textDecoration: "none",
    display: "block",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
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
    marginBottom: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  summaryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
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
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  itemCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
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
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
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
    wordBreak: "break-word",
    overflowWrap: "anywhere"
  }
};
