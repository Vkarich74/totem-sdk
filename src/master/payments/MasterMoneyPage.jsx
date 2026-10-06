import { UiValue, uiMessage, uiMoney, uiDate, uiTemplate, uiError } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";
import {
  getMaster,
  getMasterSettlements,
  getMasterWalletBalance
} from "../../api/internal";

function displayStatus(value) { const state = String(value || "").toLowerCase(); const keys = { active: "active", grace: "grace", blocked: "blockedAccess", pending: "pending", processing: "processing", completed: "completed", failed: "failed", cancelled: "cancelled", expired: "expired", paid: "paid" }; return keys[state] ? uiMessage("salon.display." + keys[state]) : (value || "—"); }

function money(value, currency) { return uiMoney(value, currency); }

function formatDate(iso) { if (!iso) return "—"; return uiDate(iso, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function normalizeWallet(payload) {
  if (!payload) return null;
  if (payload.wallet) return payload.wallet;
  if (payload.data?.wallet) return payload.data.wallet;
  if (typeof payload.balance !== "undefined") return payload;
  if (typeof payload.data?.balance !== "undefined") return payload.data;
  return payload;
}

function normalizeMasterRoot(payload) {
  if (!payload) return null;
  if (payload.master || payload.billing_access) return payload;
  if (payload.data?.master || payload.data?.billing_access) return payload.data;
  return payload;
}

function normalizeSettlements(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.settlements)) return payload.settlements;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.settlements)) return payload.data.settlements;
  return [];
}

function getBillingAccess(payload) {
  if (!payload) return null;
  if (payload.billing_access) return payload.billing_access;
  if (payload.data?.billing_access) return payload.data.billing_access;
  return null;
}

function accessLabel(value, fallback = "—") {
  if (value === true) return uiMessage("salon.s1068");
  if (value === false) return uiMessage("salon.s1069");
  return fallback;
}

function StatCard({ title, value, hint }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}><UiValue value={title} /></div>
      <div style={styles.cardValue}><UiValue value={value} /></div>
      {hint ? <div style={styles.cardHint}><UiValue value={hint} /></div> : null}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}><UiValue value={title} /></div>
      {subtitle ? <div style={styles.sectionSubtitle}><UiValue value={subtitle} /></div> : null}
      <div style={{ marginTop: "12px" }}><UiValue value={children} /></div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}><UiValue value={label} /></div>
      <div style={styles.rowValue}><UiValue value={value} /></div>
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

export default function MasterMoneyPage() {
  const { master, slug: contextSlug, loading: masterLoading, error: masterError } = useMaster() || {};
  const slug = master?.slug || contextSlug || null;

  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState("");

  const [masterRoot, setMasterRoot] = useState(null);
  const [rootLoading, setRootLoading] = useState(true);
  const [rootError, setRootError] = useState("");

  const [settlements, setSettlements] = useState([]);
  const [settlementsLoading, setSettlementsLoading] = useState(true);
  const [settlementsError, setSettlementsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWallet() {
      if (!slug) {
        if (!cancelled) {
          setWallet(null);
          setWalletLoading(false);
          setWalletError(uiError(uiMessage("master.s0201")));
        }
        return;
      }

      try {
        setWalletLoading(true);
        setWalletError("");

        const result = await getMasterWalletBalance(slug);

        if (cancelled) return;

        if (!result?.ok) {
          throw new Error(result?.error || "WALLET_FETCH_FAILED");
        }

        setWallet(normalizeWallet(result));
      } catch (e) {
        console.error("MASTER_MONEY_WALLET_LOAD_FAILED", e);

        if (!cancelled) {
          setWallet(null);
          setWalletError(uiError(uiMessage("salon.s1076")));
        }
      } finally {
        if (!cancelled) {
          setWalletLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadMasterRoot() {
      if (!slug) {
        if (!cancelled) {
          setMasterRoot(null);
          setRootLoading(false);
          setRootError(uiError(uiMessage("master.s0201")));
        }
        return;
      }

      try {
        setRootLoading(true);
        setRootError("");

        const result = await getMaster(slug);

        if (cancelled) return;

        if (!result?.ok) {
          throw new Error(result?.error || "MASTER_ROOT_FETCH_FAILED");
        }

        setMasterRoot(normalizeMasterRoot(result));
      } catch (e) {
        console.error("MASTER_MONEY_ROOT_LOAD_FAILED", e);

        if (!cancelled) {
          setMasterRoot(null);
          setRootError(uiError(uiMessage("salon.s1077")));
        }
      } finally {
        if (!cancelled) {
          setRootLoading(false);
        }
      }
    }

    loadMasterRoot();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettlements() {
      if (!slug) {
        if (!cancelled) {
          setSettlements([]);
          setSettlementsLoading(false);
          setSettlementsError(uiError(uiMessage("master.s0201")));
        }
        return;
      }

      try {
        setSettlementsLoading(true);
        setSettlementsError("");

        const result = await getMasterSettlements(slug);

        if (cancelled) return;

        if (!result?.ok) {
          throw new Error(result?.error || "SETTLEMENTS_FETCH_FAILED");
        }

        setSettlements(normalizeSettlements(result));
      } catch (e) {
        console.error("MASTER_MONEY_SETTLEMENTS_LOAD_FAILED", e);

        if (!cancelled) {
          setSettlements([]);
          setSettlementsError(uiError(uiMessage("salon.s1078")));
        }
      } finally {
        if (!cancelled) {
          setSettlementsLoading(false);
        }
      }
    }

    loadSettlements();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const billingAccess = useMemo(() => getBillingAccess(masterRoot), [masterRoot]);

  const lastSettlement = useMemo(() => {
    if (!Array.isArray(settlements) || settlements.length === 0) return null;

    return [...settlements].sort((a, b) => {
      return new Date(b?.period_end || b?.created_at || 0) - new Date(a?.period_end || a?.created_at || 0);
    })[0];
  }, [settlements]);

  const recentSettlements = useMemo(() => {
    return Array.isArray(settlements) ? settlements.slice(0, 3) : [];
  }, [settlements]);

  const loading = masterLoading || walletLoading || rootLoading;
  const error = masterError || walletError || rootError;

  if (loading) {
    return <div style={styles.loading}><UiValue value={uiMessage("salon.s0118")} /></div>;
  }

  if (error) {
    return <div style={styles.error}><UiValue value={uiMessage("salon.s1079")} /><UiValue value={uiError(error)} /></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <div style={styles.eyebrow}><UiValue value={uiMessage("master.s0669")} /></div>
        <h3 style={styles.title}><UiValue value={uiMessage("salon.s0028")} /></h3>
        <div style={styles.subtitle}><UiValue value={uiMessage("master.s0846")} /></div>
      </div>

      {slug ? <FinanceNav masterSlug={slug} active="money" /> : null}

      <div style={styles.grid}>
        <StatCard title={uiMessage("salon.s1082")} value={money(wallet?.balance, wallet?.currency_code || wallet?.currency)} hint={uiMessage("salon.s1083")} />
        <StatCard title={uiMessage("salon.s1084")} value={displayStatus(billingAccess?.access_state || billingAccess?.subscription_status || "—")} hint={uiTemplate(["Write: "," · Withdraw: ",""], [accessLabel(billingAccess?.can_write), accessLabel(billingAccess?.can_withdraw)])} />
        <StatCard title={uiMessage("salon.s1085")} value={lastSettlement ? money(lastSettlement.amount, lastSettlement?.currency_code || lastSettlement?.currency) : "—"} hint={lastSettlement ? displayStatus(lastSettlement.status) : uiMessage("salon.s1086")} />
        <StatCard title={uiMessage("salon.s1087")} value={settlements.length} hint={settlementsError || uiMessage("salon.s1088")} />
      </div>

      <Section title={uiMessage("salon.s1089")} subtitle={uiMessage("master.s0853")}>
        <Row label={uiMessage("salon.s0525")} value={slug || "—"} />
        <Row label={uiMessage("salon.s1082")} value={money(wallet?.balance, wallet?.currency_code || wallet?.currency)} />
        <Row label={uiMessage("salon.s1092")} value={displayStatus(billingAccess?.subscription_status || "—")} />
        <Row label={uiMessage("salon.s1093")} value={displayStatus(billingAccess?.access_state || "—")} />
        <Row label={uiMessage("salon.s1094")} value={accessLabel(billingAccess?.can_write)} />
        <Row label={uiMessage("salon.s1095")} value={accessLabel(billingAccess?.can_withdraw)} />
      </Section>

      <Section title={uiMessage("salon.s1096")} subtitle={uiMessage("master.s0858")}>
        {lastSettlement ? (
          <>
            <Row label={uiMessage("salon.s1098")} value={lastSettlement.id || "—"} />
            <Row label={uiMessage("salon.s1099")} value={formatDate(lastSettlement.period_start || lastSettlement.start_date)} />
            <Row label={uiMessage("salon.s1100")} value={formatDate(lastSettlement.period_end || lastSettlement.end_date)} />
            <Row label={uiMessage("salon.s0147")} value={money(lastSettlement.amount, lastSettlement?.currency_code || lastSettlement?.currency)} />
            <Row label={uiMessage("salon.s0148")} value={displayStatus(lastSettlement.status || "—")} />
          </>
        ) : (
          <div style={styles.emptyText}><UiValue value={uiMessage("salon.s1101")} /></div>
        )}
      </Section>

      <Section title={uiMessage("salon.s0725")} subtitle={uiMessage("salon.s1102")}>
        <div style={styles.linksGrid}>
          <Link to={uiTemplate(["/master/","/settlements"], [slug])} style={styles.linkCard}><UiValue value={uiMessage("salon.s1103")} /></Link>
          <Link to={uiTemplate(["/master/","/payouts"], [slug])} style={styles.linkCard}><UiValue value={uiMessage("salon.s1104")} /></Link>
          <Link to={uiTemplate(["/master/","/transactions"], [slug])} style={styles.linkCard}><UiValue value={uiMessage("salon.s1105")} /></Link>
        </div>
      </Section>

      <Section title={uiMessage("salon.s1107")} subtitle={uiMessage("master.s0864")}>
        {settlementsLoading ? (
          <div style={styles.emptyText}><UiValue value={uiMessage("salon.s1109")} /></div>
        ) : settlementsError ? (
          <div style={styles.errorInline}><UiValue value={settlementsError} /></div>
        ) : recentSettlements.length === 0 ? (
          <div style={styles.emptyText}><UiValue value={uiMessage("salon.s1110")} /></div>
        ) : (
          <div style={styles.list}>
            {recentSettlements.map((item, index) => (
              <div key={item?.id || index} style={styles.listCard}>
                <div style={styles.listTop}>
                  <strong><UiValue value={item?.id || uiMessage("salon.s1111", {p0: index + 1})} /></strong>
                  <span><UiValue value={displayStatus(item?.status || "—")} /></span>
                </div>
                <div style={styles.listMeta}><UiValue value={formatDate(item?.period_start || item?.start_date)} /> — <UiValue value={formatDate(item?.period_end || item?.end_date)} /></div>
                <div style={styles.listAmount}><UiValue value={money(item?.amount, item?.currency_code || item?.currency)} /></div>
              </div>
            ))}
          </div>
        )}
      </Section>
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
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "20px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflowX: "hidden",
    boxSizing: "border-box"
  },
  loading: {
    padding: "20px"
  },
  error: {
    margin: "20px",
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    borderRadius: "12px",
    padding: "14px"
  },
  headerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b7280"
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#111827",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "14px",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  cardLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "8px"
  },
  cardValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827"
  },
  cardHint: {
    marginTop: "6px",
    color: "#6b7280",
    fontSize: "12px",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827"
  },
  sectionSubtitle: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    padding: "10px 0",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    borderBottom: "1px solid #eef2f7"
  },
  rowLabel: {
    color: "#6b7280",
    fontSize: "14px"
  },
  rowValue: {
    textAlign: "right",
    color: "#111827",
    fontSize: "14px",
    fontWeight: 600,
    wordBreak: "break-word",
    overflowWrap: "anywhere"
  },
  linksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  linkCard: {
    display: "block",
    textDecoration: "none",
    color: "#111827",
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    padding: "12px",
    background: "#f8fafc",
    fontWeight: 600,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  listCard: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    padding: "12px",
    background: "#f8fafc",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  listTop: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "6px",
    color: "#111827",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  listMeta: {
    color: "#6b7280",
    fontSize: "13px",
    marginBottom: "6px",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  listAmount: {
    fontWeight: 700,
    color: "#111827"
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "14px"
  },
  errorInline: {
    color: "#991b1b",
    fontSize: "14px",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  }
};
