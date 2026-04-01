import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

import {
  fetchActiveContract,
  fetchContractHistory
} from "../../core/contracts/contractApi";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com";

function money(value) {
  const n = Number(value) || 0;
  return `${new Intl.NumberFormat("ru-RU").format(n)} сом`;
}

function formatDateTime(iso) {
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

function fetchJson(url, errorCode) {
  return fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(errorCode);
    }

    return response.json();
  });
}

function normalizeContractResponse(payload) {
  if (!payload) return null;
  if (payload.contract) return payload.contract;
  if (payload.active_contract) return payload.active_contract;
  if (payload.ok && payload.data) return payload.data;
  return payload;
}

function normalizeHistoryResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.contracts)) return payload.contracts;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeWalletResponse(payload) {
  if (!payload) return null;
  if (payload.wallet) return payload.wallet;
  if (payload.data?.wallet) return payload.data.wallet;
  if (typeof payload.balance !== "undefined") return payload;
  if (typeof payload.data?.balance !== "undefined") return payload.data;
  return payload;
}

function normalizeSettlementsResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.settlements)) return payload.settlements;
  if (Array.isArray(payload?.periods)) return payload.periods;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.settlements)) return payload.data.settlements;
  return [];
}

function normalizePayoutsResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.payouts)) return payload.data.payouts;
  return [];
}

function getBillingSnapshot() {
  const snapshot = window.__TOTEM_MASTER_BILLING__ || {};

  return {
    billing: snapshot.billing || null,
    billingLoading: Boolean(snapshot.billingLoading),
    canWrite: typeof snapshot.canWrite === "boolean" ? snapshot.canWrite : true,
    canWithdraw: typeof snapshot.canWithdraw === "boolean" ? snapshot.canWithdraw : true,
    billingBlockReason: snapshot.billingBlockReason || null
  };
}

function formatBillingState(billing, billingLoading) {
  if (billingLoading) return "Проверка";

  const state = String(
    billing?.access_state ||
      billing?.subscription_status ||
      "active"
  ).toLowerCase();

  if (state === "active") return "Активен";
  if (state === "grace") return "Grace";
  if (state === "blocked") return "Blocked";
  return state || "—";
}

function formatAccessFlag(value) {
  return value ? "Разрешено" : "Ограничено";
}

function sumAmounts(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
}

function StatCard({ label, value, hint }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
      {hint ? <div style={styles.cardHint}>{hint}</div> : null}
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <div style={styles.panelTitle}>{title}</div>
          {subtitle ? <div style={styles.panelSubtitle}>{subtitle}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
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

export default function MasterFinancePage() {
  const { master, slug: contextSlug } = useMaster() || {};
  const masterSlug = master?.slug || contextSlug || null;

  const [activeContract, setActiveContract] = useState(null);
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFinance() {
      try {
        setLoading(true);
        setError(null);

        if (!masterSlug) {
          if (!cancelled) {
            setActiveContract(null);
            setHistory([]);
            setWallet(null);
            setSettlements([]);
            setPayouts([]);
            setError("Не найден master slug");
          }
          return;
        }

        const [
          activeResult,
          historyResult,
          walletResult,
          settlementsResult,
          payoutsResult
        ] = await Promise.allSettled([
          fetchActiveContract(masterSlug),
          fetchContractHistory(masterSlug),
          fetchJson(`${API_BASE}/internal/masters/${masterSlug}/wallet-balance`, "WALLET_FETCH_FAILED"),
          fetchJson(`${API_BASE}/internal/masters/${masterSlug}/settlements`, "SETTLEMENTS_FETCH_FAILED"),
          fetchJson(`${API_BASE}/internal/masters/${masterSlug}/payouts`, "PAYOUTS_FETCH_FAILED")
        ]);

        if (cancelled) return;

        setActiveContract(
          activeResult.status === "fulfilled"
            ? normalizeContractResponse(activeResult.value)
            : null
        );

        setHistory(
          historyResult.status === "fulfilled"
            ? normalizeHistoryResponse(historyResult.value)
            : []
        );

        setWallet(
          walletResult.status === "fulfilled"
            ? normalizeWalletResponse(walletResult.value)
            : null
        );

        setSettlements(
          settlementsResult.status === "fulfilled"
            ? normalizeSettlementsResponse(settlementsResult.value)
            : []
        );

        setPayouts(
          payoutsResult.status === "fulfilled"
            ? normalizePayoutsResponse(payoutsResult.value)
            : []
        );

        if (
          activeResult.status === "rejected" &&
          historyResult.status === "rejected" &&
          walletResult.status === "rejected" &&
          settlementsResult.status === "rejected" &&
          payoutsResult.status === "rejected"
        ) {
          setError("Не удалось загрузить finance overview");
        }
      } catch (e) {
        console.error("MASTER_FINANCE_OVERVIEW_LOAD_FAILED", e);

        if (!cancelled) {
          setActiveContract(null);
          setHistory([]);
          setWallet(null);
          setSettlements([]);
          setPayouts([]);
          setError("Не удалось загрузить finance overview");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFinance();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  const billingSnapshot = getBillingSnapshot();
  const billingStateLabel = formatBillingState(
    billingSnapshot.billing,
    billingSnapshot.billingLoading
  );

  const contractIsActive = useMemo(() => {
    return activeContract ? isContractActive(activeContract) : false;
  }, [activeContract]);

  const walletBalance = useMemo(() => {
    if (typeof wallet?.balance === "undefined") return 0;
    return Number(wallet.balance) || 0;
  }, [wallet]);

  const settlementTotal = useMemo(() => sumAmounts(settlements), [settlements]);
  const payoutTotal = useMemo(() => sumAmounts(payouts), [payouts]);

  const lastSettlement = useMemo(() => {
    if (!settlements.length) return null;

    return [...settlements].sort((a, b) => {
      return new Date(b?.period_end || b?.created_at || 0) - new Date(a?.period_end || a?.created_at || 0);
    })[0];
  }, [settlements]);

  const historyPreview = useMemo(() => history.slice(0, 5), [history]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>MASTER CABINET</div>
            <h1 style={styles.title}>Финансы</h1>
            <p style={styles.subtitle}>
              Обзор финансового состояния мастера. Детальные движения вынесены в отдельные страницы.
            </p>
          </div>
        </header>

        {masterSlug ? <FinanceNav masterSlug={masterSlug} active="finance" /> : null}

        {loading ? <div style={styles.loadingCard}>Загрузка финансов...</div> : null}

        {!loading && error ? (
          <div style={styles.errorBanner}>
            <div style={styles.errorTitle}>Ошибка загрузки</div>
            <div style={styles.errorText}>{error}</div>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <section style={styles.grid}>
              <StatCard label="Баланс" value={money(walletBalance)} hint="Текущий wallet state" />
              <StatCard label="Статус billing" value={billingStateLabel} hint={`Запись: ${formatAccessFlag(billingSnapshot.canWrite)} · Выплаты: ${formatAccessFlag(billingSnapshot.canWithdraw)}`} />
              <StatCard label="Сеты" value={String(settlements.length)} hint={money(settlementTotal)} />
              <StatCard label="Выплаты" value={String(payouts.length)} hint={money(payoutTotal)} />
            </section>

            <section style={styles.actionsGrid}>
              <Link to={`/master/${masterSlug}/money`} style={styles.actionCard}>
                <div style={styles.actionTitle}>Доход</div>
                <div style={styles.actionText}>Баланс, доступы, последний расчетный период</div>
              </Link>

              <Link to={`/master/${masterSlug}/settlements`} style={styles.actionCard}>
                <div style={styles.actionTitle}>Сеты</div>
                <div style={styles.actionText}>Все расчетные периоды по мастеру</div>
              </Link>

              <Link to={`/master/${masterSlug}/payouts`} style={styles.actionCard}>
                <div style={styles.actionTitle}>Выплаты</div>
                <div style={styles.actionText}>Фактические выплаты и их статусы</div>
              </Link>

              <Link to={`/master/${masterSlug}/transactions`} style={styles.actionCard}>
                <div style={styles.actionTitle}>Транзакции</div>
                <div style={styles.actionText}>Техническая финансовая лента и движения</div>
              </Link>
            </section>

            <div style={styles.stack}>
              <Panel title="Текущее состояние" subtitle="Только summary без тяжелых таблиц">
                <div style={styles.infoGrid}>
                  <InfoRow label="Активный контракт" value={contractIsActive ? "Да" : "Нет"} />
                  <InfoRow label="Contract ID" value={activeContract?.contract_id || activeContract?.id || "—"} />
                  <InfoRow label="Модель" value={activeContract?.model_type || activeContract?.terms_json?.model || "—"} />
                  <InfoRow label="Баланс" value={money(walletBalance)} />
                  <InfoRow label="Billing state" value={billingStateLabel} />
                  <InfoRow label="Write доступ" value={formatAccessFlag(billingSnapshot.canWrite)} />
                  <InfoRow label="Withdraw доступ" value={formatAccessFlag(billingSnapshot.canWithdraw)} />
                  <InfoRow label="Block reason" value={billingSnapshot.billingBlockReason || "—"} />
                </div>
              </Panel>

              <Panel title="Последний расчетный период" subtitle="Компактная поверхность вместо полной таблицы">
                {lastSettlement ? (
                  <div style={styles.infoGrid}>
                    <InfoRow label="Settlement ID" value={lastSettlement.id || "—"} />
                    <InfoRow label="Начало" value={formatDateTime(lastSettlement.period_start || lastSettlement.start_date)} />
                    <InfoRow label="Конец" value={formatDateTime(lastSettlement.period_end || lastSettlement.end_date)} />
                    <InfoRow label="Сумма" value={money(lastSettlement.amount)} />
                    <InfoRow label="Статус" value={lastSettlement.status || "—"} />
                    <InfoRow label="Создан" value={formatDateTime(lastSettlement.created_at)} />
                  </div>
                ) : (
                  <div style={styles.emptyText}>Расчетных периодов пока нет.</div>
                )}
              </Panel>

              <Panel title="История контрактов" subtitle="Компактный блок. Полная история не перегружает hub.">
                {historyPreview.length === 0 ? (
                  <div style={styles.emptyText}>История контрактов пока не найдена.</div>
                ) : (
                  <div style={styles.historyList}>
                    {historyPreview.map((item, index) => (
                      <details key={item?.id || item?.contract_id || index} style={styles.historyItem}>
                        <summary style={styles.historySummary}>
                          <span>{item?.contract_id || item?.id || `Контракт ${index + 1}`}</span>
                          <span>{item?.status || item?.state || "—"}</span>
                        </summary>
                        <div style={styles.historyBody}>
                          <InfoRow label="Модель" value={item?.model_type || item?.terms_json?.model || "—"} />
                          <InfoRow label="Версия" value={item?.version || "—"} />
                          <InfoRow label="Начало" value={formatDateTime(item?.start_date || item?.created_at)} />
                          <InfoRow label="Окончание" value={formatDateTime(item?.end_date || item?.closed_at)} />
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </>
        ) : null}
      </div>
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
    padding: "20px"
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  eyebrow: {
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b7280",
    fontWeight: 700,
    marginBottom: "6px"
  },
  title: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1.1,
    color: "#111827"
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    maxWidth: "720px"
  },
  loadingCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "18px"
  },
  errorBanner: {
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    borderRadius: "14px",
    padding: "16px"
  },
  errorTitle: {
    fontWeight: 700,
    marginBottom: "6px"
  },
  errorText: {
    fontSize: "14px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px"
  },
  actionsGrid: {
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
    fontSize: "12px",
    color: "#6b7280"
  },
  actionCard: {
    display: "block",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    textDecoration: "none",
    color: "#111827"
  },
  actionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    marginBottom: "6px"
  },
  actionText: {
    fontSize: "13px",
    color: "#6b7280"
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px"
  },
  panelHeader: {
    marginBottom: "12px"
  },
  panelTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827"
  },
  panelSubtitle: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6b7280"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px"
  },
  infoRow: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    padding: "12px",
    background: "#f8fafc"
  },
  infoLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  infoValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 600,
    wordBreak: "break-word"
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  historyItem: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    background: "#f8fafc"
  },
  historySummary: {
    cursor: "pointer",
    listStyle: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    fontWeight: 600,
    color: "#111827"
  },
  historyBody: {
    padding: "0 14px 14px"
  },
  emptyText: {
    fontSize: "14px",
    color: "#6b7280"
  }
};
