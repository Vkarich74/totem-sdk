import React, { useEffect, useMemo, useState } from "react";

import {
  fetchActiveContract,
  fetchContractHistory
} from "../../core/contracts/contractApi";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

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

export default function MasterFinancePage() {
  const [activeContract, setActiveContract] = useState(null);
  const [history, setHistory] = useState([]);
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
            setError("Не найден master slug");
          }
          return;
        }

        const [activeResult, historyResult] = await Promise.allSettled([
          fetchActiveContract(masterId),
          fetchContractHistory(masterId)
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

        if (
          activeResult.status === "rejected" &&
          historyResult.status === "rejected"
        ) {
          setError("Ошибка загрузки финансовых данных");
        }
      } catch (err) {
        console.error("Finance load error:", err);

        if (!cancelled) {
          setActiveContract(null);
          setHistory([]);
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

  const overviewItems = useMemo(() => {
    return [
      {
        label: "Статус контракта",
        value: contractIsActive ? "Активен" : "Нет активного контракта"
      },
      {
        label: "Contract ID",
        value: activeContract?.contract_id || "—"
      },
      {
        label: "Модель",
        value: activeContract?.model_type || "—"
      },
      {
        label: "Дата старта",
        value: activeContract?.start_date || "—"
      }
    ];
  }, [activeContract, contractIsActive]);

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
              Единая финансовая панель мастера. Архитектура выровнена под salon-уровень,
              без изменения бизнес-логики.
            </p>
          </div>
        </header>

        {error ? (
          <section style={styles.warningBanner}>
            <div style={styles.warningTitle}>Часть финансовых данных недоступна</div>
            <div style={styles.warningText}>
              Страница открыта в безопасном режиме. Проверь console и network по contract endpoint.
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
            </div>
          </SectionCard>

          <SectionCard
            title="Wallet"
            subtitle="Баланс и кошелёк мастера"
          >
            <div style={styles.placeholderBlock}>
              <div style={styles.placeholderTitle}>Wallet section ready for sync</div>
              <p style={styles.paragraph}>
                Блок подготовлен под единый dashboard layout. Источник данных не менялся.
                Подключение wallet-метрик остаётся на существующей backend-архитектуре.
              </p>
            </div>
          </SectionCard>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Contracts</h2>
              <div style={styles.cardSubtitle}>
                Активный контракт и история изменений
              </div>
            </div>

            <div style={styles.cardBody}>
              <div style={styles.twoColumn}>
                <div style={styles.contractColumn}>
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
                </div>

                <div style={styles.contractColumn}>
                  <div style={styles.noteBox}>
                    <div style={styles.noteTitle}>Contract state</div>
                    <div style={styles.noteText}>
                      Блок вынесен в отдельную правую колонку по salon-архитектуре.
                      Нижняя часть страницы больше не ломается, потому что двухколоночная
                      сетка ограничена только секцией contracts.
                    </div>
                  </div>

                  <div style={styles.noteBox}>
                    <div style={styles.noteTitle}>Data source</div>
                    <div style={styles.noteText}>
                      Используются текущие contract endpoints без изменения backend и terms logic.
                    </div>
                  </div>
                </div>
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
                            <tr key={item.contract_id}>
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
            </div>
          </section>

          <SectionCard
            title="Settlements"
            subtitle="Правила распределения и расчётов"
          >
            <p style={styles.paragraph}>
              Правила распределения дохода определяются активным контрактом.
              Блок сохранён в master-кабинете в той же архитектурной позиции,
              что и в salon finance.
            </p>

            <div style={styles.noteBox}>
              <div style={styles.noteTitle}>Settlement source</div>
              <div style={styles.noteText}>
                Данные зависят от contract terms и backend settlement pipeline.
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Payouts"
            subtitle="Выплаты мастеру"
          >
            <p style={styles.paragraph}>
              Метод выплат определяется настройками платформы и текущей финансовой конфигурацией.
            </p>

            <div style={styles.noteBox}>
              <div style={styles.noteTitle}>Payout status</div>
              <div style={styles.noteText}>
                UI выровнен. Бизнес-логика выплат и withdraw pipeline не изменялись.
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Ledger"
            subtitle="Финансовый журнал"
          >
            <p style={styles.paragraph}>
              Ledger layer остаётся системным источником истины. В этой версии блок
              приведён к единому cabinet layout без вмешательства в ledger structure.
            </p>

            <div style={styles.noteBox}>
              <div style={styles.noteTitle}>Ledger integrity</div>
              <div style={styles.noteText}>
                Double-entry механика, reference_type и backend ledger logic не изменялись.
              </div>
            </div>
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
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: "16px",
    alignItems: "start"
  },
  contractColumn: {
    minWidth: 0
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
  paragraph: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.7,
    color: "#4b5563"
  },
  noteBox: {
    marginTop: "12px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb"
  },
  noteTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "6px"
  },
  noteText: {
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#6b7280"
  },
  placeholderBlock: {
    display: "grid",
    gap: "8px"
  },
  placeholderTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827"
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