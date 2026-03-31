import React, { useEffect, useMemo, useState } from "react";

import {
  fetchActiveContract,
  fetchContractHistory
} from "../../core/contracts/contractApi";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

const API_BASE = import.meta.env.VITE_API_BASE;

function getHashPath() {
  const hash = window.location.hash || "";
  if (!hash) {
    return "";
  }

  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function getMasterSlug() {
  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG;
  }

  const hashPath = getHashPath();
  const sourcePath = hashPath || window.location.pathname || "";
  const parts = sourcePath.split("/").filter(Boolean);

  if (parts.length >= 2 && parts[0] === "master") {
    return parts[1];
  }

  return null;
}

function money(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("ru-RU").format(n) + " сом";
}

function formatDate(iso) {
  if (!iso) {
    return "—";
  }

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return (
    d.toLocaleDateString("ru-RU") +
    " " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
}

function sumAmounts(items) {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
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
  if (billingLoading) {
    return "Проверка";
  }

  const state = billing?.access_state || billing?.subscription_status || "active";

  if (state === "active") return "Активен";
  if (state === "grace") return "Grace";
  if (state === "blocked") return "Blocked";

  return String(state);
}

function formatAccessFlag(value) {
  return value ? "Разрешено" : "Ограничено";
}

function normalizeContractResponse(payload) {
  if (!payload) {
    return null;
  }

  if (payload.contract) {
    return payload.contract;
  }

  if (payload.active_contract) {
    return payload.active_contract;
  }

  if (payload.ok && payload.data) {
    return payload.data;
  }

  return payload;
}

function normalizeHistoryResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.history)) {
    return payload.history;
  }

  if (Array.isArray(payload?.contracts)) {
    return payload.contracts;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function normalizeWalletResponse(payload) {
  if (!payload) {
    return null;
  }

  if (payload.wallet) {
    return payload.wallet;
  }

  if (payload.data?.wallet) {
    return payload.data.wallet;
  }

  if (typeof payload.balance !== "undefined") {
    return payload;
  }

  if (payload.data && typeof payload.data.balance !== "undefined") {
    return payload.data;
  }

  return payload;
}

function normalizeSettlementsResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.settlements)) {
    return payload.settlements;
  }

  if (Array.isArray(payload?.periods)) {
    return payload.periods;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data?.settlements)) {
    return payload.data.settlements;
  }

  if (Array.isArray(payload?.data?.periods)) {
    return payload.data.periods;
  }

  return [];
}

function normalizeLedgerResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.ledger)) {
    return payload.ledger;
  }

  if (Array.isArray(payload?.entries)) {
    return payload.entries;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data?.ledger)) {
    return payload.data.ledger;
  }

  if (Array.isArray(payload?.data?.entries)) {
    return payload.data.entries;
  }

  return [];
}

async function fetchJson(url, errorCode) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(errorCode);
  }

  return response.json();
}

export default function MasterFinancePage() {
  const [activeContract, setActiveContract] = useState(null);
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const masterId = getMasterSlug();

  useEffect(() => {
    let cancelled = false;

    async function loadFinance() {
      try {
        setLoading(true);
        setError(null);

        if (!masterId) {
          console.error("MASTER_SLUG_NOT_FOUND");

          if (!cancelled) {
            setActiveContract(null);
            setHistory([]);
            setWallet(null);
            setSettlements([]);
            setLedger([]);
            setError("Не найден master slug");
          }

          return;
        }

        const [
          activeResult,
          historyResult,
          walletResult,
          settlementsResult,
          ledgerResult
        ] = await Promise.allSettled([
          fetchActiveContract(masterId),
          fetchContractHistory(masterId),
          fetchJson(`${API_BASE}/internal/masters/${masterId}/wallet-balance`, "WALLET_FETCH_FAILED"),
          fetchJson(`${API_BASE}/internal/masters/${masterId}/settlements`, "SETTLEMENTS_FETCH_FAILED"),
          fetchJson(`${API_BASE}/internal/masters/${masterId}/ledger`, "LEDGER_FETCH_FAILED")
        ]);

        if (cancelled) {
          return;
        }

        if (activeResult.status === "fulfilled") {
          setActiveContract(normalizeContractResponse(activeResult.value));
        } else {
          console.error("Active contract load error:", activeResult.reason);
          setActiveContract(null);
        }

        if (historyResult.status === "fulfilled") {
          setHistory(normalizeHistoryResponse(historyResult.value));
        } else {
          console.error("Contract history load error:", historyResult.reason);
          setHistory([]);
        }

        if (walletResult.status === "fulfilled") {
          setWallet(normalizeWalletResponse(walletResult.value));
        } else {
          console.error("Wallet load error:", walletResult.reason);
          setWallet(null);
        }

        if (settlementsResult.status === "fulfilled") {
          setSettlements(normalizeSettlementsResponse(settlementsResult.value));
        } else {
          console.error("Settlements load error:", settlementsResult.reason);
          setSettlements([]);
        }

        if (ledgerResult.status === "fulfilled") {
          setLedger(normalizeLedgerResponse(ledgerResult.value));
        } else {
          console.error("Ledger load error:", ledgerResult.reason);
          setLedger([]);
        }

        if (
          activeResult.status === "rejected" &&
          historyResult.status === "rejected" &&
          walletResult.status === "rejected" &&
          settlementsResult.status === "rejected" &&
          ledgerResult.status === "rejected"
        ) {
          setError("Ошибка загрузки финансовых данных");
        }
      } catch (err) {
        console.error("Finance load error:", err);

        if (!cancelled) {
          setActiveContract(null);
          setHistory([]);
          setWallet(null);
          setSettlements([]);
          setLedger([]);
          setError("Ошибка загрузки финансовых данных");
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
  }, [masterId]);

  const contractIsActive = useMemo(() => {
    return activeContract ? isContractActive(activeContract) : false;
  }, [activeContract]);

  const payoutEntries = useMemo(() => {
    return ledger.filter((item) => item?.reference_type === "payout");
  }, [ledger]);

  const refundReverseEntries = useMemo(() => {
    return ledger.filter((item) => item?.reference_type === "refund_reverse");
  }, [ledger]);

  const settlementTotal = useMemo(() => {
    return sumAmounts(settlements);
  }, [settlements]);

  const payoutTotal = useMemo(() => {
    return sumAmounts(payoutEntries);
  }, [payoutEntries]);

  const refundReverseTotal = useMemo(() => {
    return sumAmounts(refundReverseEntries);
  }, [refundReverseEntries]);

  const realIncomeTotal = useMemo(() => {
    return sumAmounts(
      ledger.filter(
        (item) =>
          item?.reference_type === "payout" &&
          item?.direction === "credit"
      )
    );
  }, [ledger]);

  const billingSnapshot = getBillingSnapshot();
  const billing = billingSnapshot.billing;
  const billingLoading = billingSnapshot.billingLoading;
  const canWrite = billingSnapshot.canWrite;
  const canWithdraw = billingSnapshot.canWithdraw;
  const billingBlockReason = billingSnapshot.billingBlockReason;

  const billingStateLabel = useMemo(() => {
    return formatBillingState(billing, billingLoading);
  }, [billing, billingLoading]);

  const isBillingBlocked = billing?.access_state === "blocked";
  const isBillingGrace = billing?.access_state === "grace";

  const overviewItems = useMemo(() => {
    return [
      {
        label: "Баланс кошелька",
        value: wallet?.ok || typeof wallet?.balance !== "undefined" ? money(wallet.balance) : "—"
      },
      {
        label: "Реальный доход",
        value: money(realIncomeTotal)
      },
      {
        label: "Текущие начисления",
        value: money(settlementTotal)
      },
      {
        label: "Расчетных периодов",
        value: String(settlements.length)
      },
      {
        label: "Выплат / payout",
        value: String(payoutEntries.length)
      },
      {
        label: "Refund reverse",
        value: money(refundReverseTotal)
      },
      {
        label: "Статус контракта",
        value: contractIsActive ? "Активен" : "Нет активного контракта"
      },
      {
        label: "Contract ID",
        value: activeContract?.contract_id || activeContract?.id || "—"
      },
      {
        label: "Billing state",
        value: billingStateLabel
      },
      {
        label: "Write доступ",
        value: formatAccessFlag(canWrite)
      },
      {
        label: "Withdraw доступ",
        value: formatAccessFlag(canWithdraw)
      }
    ];
  }, [
    wallet,
    realIncomeTotal,
    settlementTotal,
    settlements.length,
    payoutEntries.length,
    refundReverseTotal,
    contractIsActive,
    activeContract,
    billingStateLabel,
    canWrite,
    canWithdraw
  ]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loadingCard}>Загрузка финансов...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>MASTER CABINET</div>
            <h1 style={styles.title}>Finance</h1>
            <p style={styles.subtitle}>
              Единая финансовая панель мастера. Контур собран на текущих backend endpoint без изменения бизнес-логики.
            </p>
          </div>
        </header>

        {error ? (
          <section style={styles.warningBanner}>
            <div style={styles.warningTitle}>Часть финансовых данных недоступна</div>
            <div style={styles.warningText}>
              Страница открыта в безопасном режиме. Проверь console и network по master finance endpoint.
            </div>
          </section>
        ) : null}

        {isBillingGrace ? (
          <section style={styles.warningBanner}>
            <div style={styles.warningTitle}>Billing: grace period</div>
            <div style={styles.warningText}>
              Доступ частично ограничен. Проверь оплату подписки, чтобы не перейти в blocked.
            </div>
          </section>
        ) : null}

        {isBillingBlocked ? (
          <section style={styles.blockedBanner}>
            <div style={styles.blockedTitle}>Billing: доступ ограничен</div>
            <div style={styles.blockedText}>
              Финансовые действия мастера заблокированы.
              {billingBlockReason ? ` Причина: ${billingBlockReason}` : ""}
            </div>
          </section>
        ) : null}

        <section style={styles.overviewGrid}>
          {overviewItems.map((item) => (
            <div key={item.label} style={styles.statCard}>
              <div style={styles.statLabel}>{item.label}</div>
              <div style={styles.statValue}>{item.value}</div>
            </div>
          ))}
        </section>

        <section style={styles.stack}>
          <SectionCard
            title="Overview"
            subtitle="Общий статус финансового контура мастера"
          >
            <div style={styles.infoGrid}>
              <InfoRow label="Активный контракт" value={contractIsActive ? "Да" : "Нет"} />
              <InfoRow label="Contract ID" value={activeContract?.contract_id || activeContract?.id || "—"} />
              <InfoRow label="Model Type" value={activeContract?.model_type || activeContract?.terms_json?.model || "—"} />
              <InfoRow label="Start Date" value={activeContract?.start_date || activeContract?.current_period_start || "—"} />
              <InfoRow label="Wallet Balance" value={wallet?.ok || typeof wallet?.balance !== "undefined" ? money(wallet.balance) : "—"} />
              <InfoRow label="Real Income" value={money(realIncomeTotal)} />
              <InfoRow label="Current Settlements" value={money(settlementTotal)} />
              <InfoRow label="Payout Total" value={money(payoutTotal)} />
              <InfoRow label="Billing State" value={billingStateLabel} />
              <InfoRow label="Write Access" value={formatAccessFlag(canWrite)} />
              <InfoRow label="Withdraw Access" value={formatAccessFlag(canWithdraw)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Wallet"
            subtitle="Баланс и кошелёк мастера"
          >
            <div style={styles.infoGrid}>
              <InfoRow label="Wallet ID" value={wallet?.wallet_id || wallet?.id || "—"} />
              <InfoRow label="Баланс" value={wallet?.ok || typeof wallet?.balance !== "undefined" ? money(wallet.balance) : "—"} />
              <InfoRow label="Валюта" value={wallet?.currency || "—"} />
            </div>
          </SectionCard>

          <SectionCard
            title="Contracts"
            subtitle="Активный контракт и история изменений"
          >
            <div style={styles.contractCard}>
              <div style={styles.contractHeader}>
                <div style={styles.contractStatusWrap}>
                  <span
                    style={{
                      ...styles.badge,
                      ...(contractIsActive ? styles.badgeSuccess : styles.badgeMuted)
                    }}
                  >
                    {contractIsActive ? "ACTIVE" : "NO ACTIVE CONTRACT"}
                  </span>
                </div>
              </div>

              {contractIsActive ? (
                <div style={styles.infoGrid}>
                  <InfoRow label="Contract ID" value={activeContract?.contract_id || activeContract?.id || "—"} />
                  <InfoRow label="Model" value={activeContract?.model_type || activeContract?.terms_json?.model || "—"} />
                  <InfoRow label="Start Date" value={activeContract?.start_date || activeContract?.current_period_start || "—"} />
                </div>
              ) : (
                <p style={styles.emptyText}>Активный контракт отсутствует</p>
              )}
            </div>

            <div style={styles.historyWrap}>
              <div style={styles.subsectionTitle}>Contract History</div>

              {history.length === 0 ? (
                <div style={styles.emptyPanel}>История контрактов отсутствует</div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Contract ID</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Start Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item, index) => {
                        const isLast = index === history.length - 1;

                        return (
                          <tr key={item.contract_id || item.id || index}>
                            <td
                              style={{
                                ...styles.td,
                                ...(isLast ? styles.lastRowCell : null)
                              }}
                            >
                              {item.contract_id || item.id || "—"}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                ...(isLast ? styles.lastRowCell : null)
                              }}
                            >
                              {item.status || "—"}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                ...(isLast ? styles.lastRowCell : null)
                              }}
                            >
                              {item.start_date || item.current_period_start || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Settlements"
            subtitle="Текущие начисления мастера по расчетным периодам"
          >
            {settlements.length === 0 ? (
              <div style={styles.emptyPanel}>Расчетных периодов пока нет</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Период</th>
                      <th style={styles.th}>Начало</th>
                      <th style={styles.th}>Конец</th>
                      <th style={styles.th}>Сумма</th>
                      <th style={styles.th}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((item, index) => {
                      const isLast = index === settlements.length - 1;

                      return (
                        <tr key={item.id || index}>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.id || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {formatDate(item.start_date || item.period_start)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {formatDate(item.end_date || item.period_end)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {money(item.amount)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.status || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Payouts"
            subtitle="Фактические выплаты мастеру из ledger"
          >
            {payoutEntries.length === 0 ? (
              <div style={styles.emptyPanel}>Выплат пока нет</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Дата</th>
                      <th style={styles.th}>Reference Type</th>
                      <th style={styles.th}>Reference ID</th>
                      <th style={styles.th}>Направление</th>
                      <th style={styles.th}>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutEntries.map((item, index) => {
                      const isLast = index === payoutEntries.length - 1;

                      return (
                        <tr key={item.id || index}>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {formatDate(item.created_at)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.reference_type || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.reference_id || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.direction || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {money(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Ledger"
            subtitle="Движения кошелька мастера"
          >
            {ledger.length === 0 ? (
              <div style={styles.emptyPanel}>Проводок пока нет</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Дата</th>
                      <th style={styles.th}>Reference Type</th>
                      <th style={styles.th}>Reference ID</th>
                      <th style={styles.th}>Направление</th>
                      <th style={styles.th}>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((item, index) => {
                      const isLast = index === ledger.length - 1;

                      return (
                        <tr key={item.id || index}>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {formatDate(item.created_at)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.reference_type || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.reference_id || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {item.direction || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {money(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </section>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>{title}</h2>
        <div style={styles.cardSubtitle}>{subtitle}</div>
      </div>
      <div style={styles.cardBody}>{children}</div>
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

const styles = {
  page: {
    minHeight: "100%",
    background: "#f6f7fb",
    padding: "24px"
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto"
  },
  header: {
    marginBottom: "20px"
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: "8px"
  },
  title: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#111827"
  },
  subtitle: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#6b7280",
    maxWidth: "860px"
  },
  warningBanner: {
    marginBottom: "20px",
    padding: "16px 18px",
    borderRadius: "16px",
    border: "1px solid #fde68a",
    background: "#fffbeb"
  },
  warningTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#92400e",
    marginBottom: "6px"
  },
  warningText: {
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#a16207"
  },
  blockedBanner: {
    marginBottom: "20px",
    padding: "16px 18px",
    borderRadius: "16px",
    border: "1px solid #fecaca",
    background: "#fef2f2"
  },
  blockedTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#991b1b",
    marginBottom: "6px"
  },
  blockedText: {
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#b91c1c"
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "20px"
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "18px",
    minHeight: "118px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  statLabel: {
    margin: 0,
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: 500
  },
  statValue: {
    margin: "10px 0 0 0",
    fontSize: "28px",
    fontWeight: 700,
    lineHeight: 1.1,
    color: "#111827",
    wordBreak: "break-word"
  },
  stack: {
    display: "grid",
    gap: "20px"
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  cardHeader: {
    marginBottom: "12px"
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827"
  },
  cardSubtitle: {
    marginTop: "6px",
    fontSize: "13px",
    lineHeight: 1.45,
    color: "#6b7280"
  },
  cardBody: {
    marginTop: "12px"
  },
  infoGrid: {
    display: "grid",
    gap: "12px"
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  infoLabel: {
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: 500
  },
  infoValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 600,
    textAlign: "right",
    wordBreak: "break-word"
  },
  contractCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "16px",
    background: "#fbfcfe"
  },
  contractHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px"
  },
  contractStatusWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em"
  },
  badgeSuccess: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0"
  },
  badgeMuted: {
    background: "#f3f4f6",
    color: "#6b7280",
    border: "1px solid #e5e7eb"
  },
  subsectionTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "12px"
  },
  historyWrap: {
    marginTop: "18px"
  },
  emptyText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: 1.6
  },
  emptyPanel: {
    border: "1px dashed #d1d5db",
    borderRadius: "14px",
    padding: "18px",
    fontSize: "14px",
    color: "#6b7280",
    background: "#f9fafb"
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "640px"
  },
  th: {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#6b7280",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap"
  },
  td: {
    padding: "12px 14px",
    fontSize: "14px",
    color: "#111827",
    borderBottom: "1px solid #eef2f7",
    verticalAlign: "top"
  },
  lastRowCell: {
    borderBottom: "none"
  },
  loadingCard: {
    padding: "20px",
    borderRadius: "16px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    fontSize: "14px",
    color: "#374151"
  }
};
