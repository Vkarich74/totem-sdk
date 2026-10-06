import { UiValue, uiMessage, uiMoney, uiDate, uiTemplate, uiError } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

import PageSection from "../../cabinet/PageSection";
import EmptyState from "../../cabinet/EmptyState";
import { getMasterPayouts } from "../../api/internal";

function money(value, currency) { return uiMoney(value, currency); }

function formatDate(iso) { if (!iso) return "—"; return uiDate(iso, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function getStatusLabel(status) {
  if (status === "pending") return uiMessage("salon.s1120");
  if (status === "processing") return uiMessage("salon.s0878");
  if (status === "completed") return uiMessage("salon.s1122");
  if (status === "failed") return uiMessage("salon.s0506");
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
            setError(uiError(uiMessage("master.s0201")));
            setPayouts([]);
          }
          return;
        }

        const result = await getMasterPayouts(masterSlug);
        if (!result?.ok) {
          throw new Error(result?.error || "PAYOUTS_FETCH_FAILED");
        }
        if (cancelled) return;

        setPayouts(normalizePayouts(result));
      } catch (e) {
        console.error("MASTER_PAYOUTS_LOAD_FAILED", e);

        if (!cancelled) {
          setPayouts([]);
          setError(uiError(uiMessage("salon.s1113")));
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

      <PageSection title={uiMessage("salon.s0030")}>
        {loading && <div><UiValue value={uiMessage("salon.s0118")} /></div>}

        {!loading && error && (
          <EmptyState
            title={uiMessage("salon.s1036")}
            message={error}
          />
        )}

        {!loading && !error && payouts.length === 0 && (
          <EmptyState
            title={uiMessage("master.s0896")}
            message={uiMessage("master.s0897")}
          />
        )}

        {!loading && !error && payouts.length > 0 && (
          <>
            <div style={styles.summaryGrid}>
              <SummaryCard label={uiMessage("master.s0898")} value={payouts.length} />
              <SummaryCard label={uiMessage("salon.s1118")} value={money(total)} />
              <SummaryCard label={uiMessage("salon.s1122")} value={completedCount} hint={uiMessage("master.s0899")} />
            </div>

            <div style={styles.cardsList}>
              {payouts.map((p, index) => (
                <div key={p?.id || index} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <strong><UiValue value={p?.id || uiMessage("salon.s1131", {p0: index + 1})} /></strong>
                    <span style={styles.statusBadge}><UiValue value={getStatusLabel(p?.status)} /></span>
                  </div>

                  <div style={styles.metaGrid}>
                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0233")} /></div>
                      <div style={styles.metaValue}><UiValue value={formatDate(p?.created_at || p?.date)} /></div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0147")} /></div>
                      <div style={styles.metaValue}><UiValue value={money(p?.amount, p?.currency_code || p?.currency)} /></div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("master.s0901")} /></div>
                      <div style={styles.metaValue}><UiValue value={p?.reference || p?.reference_id || "—"} /></div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0148")} /></div>
                      <div style={styles.metaValue}><UiValue value={getStatusLabel(p?.status)} /></div>
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
