import React, { useEffect, useMemo, useState } from "react";

import {
  fetchActiveContract,
  fetchContractHistory
} from "../../core/contracts/contractApi";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

const API_BASE = import.meta.env.VITE_API_BASE;

function getMasterSlug() {
  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG;
  }

  const parts = window.location.pathname.split("/");

  if (parts.length >= 3 && parts[1] === "master") {
    return parts[2];
  }

  if (parts.length >= 3 && parts[1] === "salon") {
    return parts[2];
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
          fetch(`${API_BASE}/internal/masters/${masterId}/wallet-balance`).then(async (r) => {
            if (!r.ok) {
              throw new Error("WALLET_FETCH_FAILED");
            }
            return r.json();
          }),
          fetch(`${API_BASE}/internal/masters/${masterId}/settlements`).then(async (r) => {
            if (!r.ok) {
              throw new Error("SETTLEMENTS_FETCH_FAILED");
            }
            return r.json();
          }),
          fetch(`${API_BASE}/internal/masters/${masterId}/ledger`).then(async (r) => {
            if (!r.ok) {
              throw new Error("LEDGER_FETCH_FAILED");
            }
            return r.json();
          })
        ]);

        if (cancelled) {
          return;
        }

        if (activeResult.status === "fulfilled") {
          setActiveContract(activeResult.value || null);
        } else {
          console.error("Active contract load error:", activeResult.reason);
          setActiveContract(null);
        }

        if (historyResult.status === "fulfilled") {
          setHistory(Array.isArray(historyResult.value) ? historyResult.value : []);
        } else {
          console.error("Contract history load error:", historyResult.reason);
          setHistory([]);
        }

        if (walletResult.status === "fulfilled") {
          setWallet(walletResult.value || null);
        } else {
          console.error("Wallet load error:", walletResult.reason);
          setWallet(null);
        }

        if (settlementsResult.status === "fulfilled") {
          setSettlements(
            Array.isArray(settlementsResult.value?.periods)
              ? settlementsResult.value.periods
              : []
          );
        } else {
          console.error("Settlements load error:", settlementsResult.reason);
          setSettlements([]);
        }

        if (ledgerResult.status === "fulfilled") {
          setLedger(
            Array.isArray(ledgerResult.value?.ledger)
              ? ledgerResult.value.ledger
              : []
          );
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

  const overviewItems = useMemo(() => {
    return [
      {
        label: "Баланс кошелька",
        value: wallet?.ok ? money(wallet.balance) : "—"
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
        value: activeContract?.contract_id || "—"
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
    activeContract
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
              <InfoRow label="Contract ID" value={activeContract?.contract_id || "—"} />
              <InfoRow label="Model Type" value={activeContract?.model_type || "—"} />
              <InfoRow label="Start Date" value={activeContract?.start_date || "—"} />
              <InfoRow label="Wallet Balance" value={wallet?.ok ? money(wallet.balance) : "—"} />
              <InfoRow label="Real Income" value={money(realIncomeTotal)} />
              <InfoRow label="Current Settlements" value={money(settlementTotal)} />
              <InfoRow label="Payout Total" value={money(payoutTotal)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Wallet"
            subtitle="Баланс и кошелёк мастера"
          >
            <div style={styles.infoGrid}>
              <InfoRow label="Wallet ID" value={wallet?.wallet_id || "—"} />
              <InfoRow label="Баланс" value={wallet?.ok ? money(wallet.balance) : "—"} />
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
                  <InfoRow label="Contract ID" value={activeContract?.contract_id || "—"} />
                  <InfoRow label="Model" value={activeContract?.model_type || "—"} />
                  <InfoRow label="Start Date" value={activeContract?.start_date || "—"} />
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
                          <tr key={item.contract_id || index}>
                            <td
                              style={{
                                ...styles.td,
                                ...(isLast ? styles.lastRowCell : null)
                              }}
                            >
                              {item.contract_id || "—"}
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
                              {item.start_date || "—"}
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
                            {formatDate(item.start_date)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(isLast ? styles.lastRowCell : null)
                            }}
                          >
                            {formatDate(item.end_date)}
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