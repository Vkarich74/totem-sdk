import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com";

function money(value) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} сом`;
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

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

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
  if (value === true) return "Разрешено";
  if (value === false) return "Ограничено";
  return fallback;
}

function StatCard({ title, value, hint }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      {hint ? <div style={styles.cardHint}>{hint}</div> : null}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {subtitle ? <div style={styles.sectionSubtitle}>{subtitle}</div> : null}
      <div style={{ marginTop: "12px" }}>{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.rowValue}>{value}</div>
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
          setWalletError("Не найден master slug");
        }
        return;
      }

      try {
        setWalletLoading(true);
        setWalletError("");

        const response = await fetch(`${API_BASE}/internal/masters/${encodeURIComponent(slug)}/wallet-balance`);
        const text = await response.text();

        if (cancelled) return;

        const data = safeJsonParse(text);
        if (!data || !response.ok) {
          throw new Error("WALLET_FETCH_FAILED");
        }

        setWallet(normalizeWallet(data));
      } catch (e) {
        console.error("MASTER_MONEY_WALLET_LOAD_FAILED", e);

        if (!cancelled) {
          setWallet(null);
          setWalletError("Не удалось загрузить баланс");
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
          setRootError("Не найден master slug");
        }
        return;
      }

      try {
        setRootLoading(true);
        setRootError("");

        const response = await fetch(`${API_BASE}/internal/masters/${encodeURIComponent(slug)}`);
        const text = await response.text();

        if (cancelled) return;

        const data = safeJsonParse(text);
        if (!data || !response.ok) {
          throw new Error("MASTER_ROOT_FETCH_FAILED");
        }

        setMasterRoot(normalizeMasterRoot(data));
      } catch (e) {
        console.error("MASTER_MONEY_ROOT_LOAD_FAILED", e);

        if (!cancelled) {
          setMasterRoot(null);
          setRootError("Не удалось загрузить billing state");
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
          setSettlementsError("Не найден master slug");
        }
        return;
      }

      try {
        setSettlementsLoading(true);
        setSettlementsError("");

        const response = await fetch(`${API_BASE}/internal/masters/${encodeURIComponent(slug)}/settlements`);
        const text = await response.text();

        if (cancelled) return;

        const data = safeJsonParse(text);
        if (!data || !response.ok) {
          throw new Error("SETTLEMENTS_FETCH_FAILED");
        }

        setSettlements(normalizeSettlements(data));
      } catch (e) {
        console.error("MASTER_MONEY_SETTLEMENTS_LOAD_FAILED", e);

        if (!cancelled) {
          setSettlements([]);
          setSettlementsError("Не удалось загрузить сеты");
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
    return <div style={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div style={styles.error}>Ошибка загрузки данных: {error}</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <div style={styles.eyebrow}>MASTER CABINET</div>
        <h3 style={styles.title}>Доход</h3>
        <div style={styles.subtitle}>Деньги сейчас: баланс, доступы и ближайший расчетный контур.</div>
      </div>

      {slug ? <FinanceNav masterSlug={slug} active="money" /> : null}

      <div style={styles.grid}>
        <StatCard title="Баланс" value={money(wallet?.balance)} hint="Текущий wallet balance" />
        <StatCard title="Billing state" value={billingAccess?.access_state || billingAccess?.subscription_status || "—"} hint={`Write: ${accessLabel(billingAccess?.can_write)} · Withdraw: ${accessLabel(billingAccess?.can_withdraw)}`} />
        <StatCard title="Последний сет" value={lastSettlement ? money(lastSettlement.amount) : "—"} hint={lastSettlement ? (lastSettlement.status || "—") : "Пока нет периодов"} />
        <StatCard title="Всего сетов" value={settlements.length} hint={settlementsError || "История расчетных периодов"} />
      </div>

      <Section title="Wallet summary" subtitle="Только текущая денежная поверхность">
        <Row label="Slug" value={slug || "—"} />
        <Row label="Баланс" value={money(wallet?.balance)} />
        <Row label="Subscription status" value={billingAccess?.subscription_status || "—"} />
        <Row label="Access state" value={billingAccess?.access_state || "—"} />
        <Row label="Write access" value={accessLabel(billingAccess?.can_write)} />
        <Row label="Withdraw access" value={accessLabel(billingAccess?.can_withdraw)} />
      </Section>

      <Section title="Последний расчетный период" subtitle="Без полной таблицы и без дубля finance hub">
        {lastSettlement ? (
          <>
            <Row label="Settlement ID" value={lastSettlement.id || "—"} />
            <Row label="Начало" value={formatDate(lastSettlement.period_start || lastSettlement.start_date)} />
            <Row label="Конец" value={formatDate(lastSettlement.period_end || lastSettlement.end_date)} />
            <Row label="Сумма" value={money(lastSettlement.amount)} />
            <Row label="Статус" value={lastSettlement.status || "—"} />
          </>
        ) : (
          <div style={styles.emptyText}>Расчетных периодов пока нет.</div>
        )}
      </Section>

      <Section title="Быстрые переходы" subtitle="Детали вынесены по ownership страниц">
        <div style={styles.linksGrid}>
          <Link to={`/master/${slug}/settlements`} style={styles.linkCard}>Все сеты</Link>
          <Link to={`/master/${slug}/payouts`} style={styles.linkCard}>Все выплаты</Link>
          <Link to={`/master/${slug}/transactions`} style={styles.linkCard}>Все транзакции</Link>
        </div>
      </Section>

      <Section title="Последние сеты" subtitle="Короткий preview вместо дублирующего центра">
        {settlementsLoading ? (
          <div style={styles.emptyText}>Загрузка сетов...</div>
        ) : settlementsError ? (
          <div style={styles.errorInline}>{settlementsError}</div>
        ) : recentSettlements.length === 0 ? (
          <div style={styles.emptyText}>Сетов пока нет.</div>
        ) : (
          <div style={styles.list}>
            {recentSettlements.map((item, index) => (
              <div key={item?.id || index} style={styles.listCard}>
                <div style={styles.listTop}>
                  <strong>{item?.id || `Сет ${index + 1}`}</strong>
                  <span>{item?.status || "—"}</span>
                </div>
                <div style={styles.listMeta}>{formatDate(item?.period_start || item?.start_date)} — {formatDate(item?.period_end || item?.end_date)}</div>
                <div style={styles.listAmount}>{money(item?.amount)}</div>
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
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "20px"
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
    gap: "6px"
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
    color: "#111827"
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "14px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px"
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px"
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
    fontSize: "12px"
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px"
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827"
  },
  sectionSubtitle: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6b7280"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 0",
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
    wordBreak: "break-word"
  },
  linksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px"
  },
  linkCard: {
    display: "block",
    textDecoration: "none",
    color: "#111827",
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    padding: "12px",
    background: "#f8fafc",
    fontWeight: 600
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  listCard: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    padding: "12px",
    background: "#f8fafc"
  },
  listTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "6px",
    color: "#111827"
  },
  listMeta: {
    color: "#6b7280",
    fontSize: "13px",
    marginBottom: "6px"
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
    fontSize: "14px"
  }
};
