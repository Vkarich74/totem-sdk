import React, { useEffect, useMemo, useState } from "react";

import {
  fetchActiveContract,
  fetchContractHistory
} from "../../core/contracts/contractApi";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

export default function MasterFinancePage() {
  const [activeContract, setActiveContract] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const masterId = "current";

  useEffect(() => {
    async function loadFinance() {
      try {
        const active = await fetchActiveContract(masterId);
        const hist = await fetchContractHistory(masterId);

        setActiveContract(active || null);
        setHistory(Array.isArray(hist) ? hist : []);
      } catch (err) {
        console.error("Finance load error:", err);
        setError("Ошибка загрузки финансовых данных");
      } finally {
        setLoading(false);
      }
    }

    loadFinance();
  }, []);

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

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorCard}>{error}</div>
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

        <section style={styles.overviewGrid}>
          {overviewItems.map((item) => (
            <div key={item.label} style={styles.statCard}>
              <div style={styles.statLabel}>{item.label}</div>
              <div style={styles.statValue}>{item.value}</div>
            </div>
          ))}
        </section>

        <section style={styles.mainGrid}>
          <div style={styles.leftColumn}>
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
                        {history.map((item) => (
                          <tr key={item.contract_id}>
                            <td style={styles.td}>{item.contract_id || "—"}</td>
                            <td style={styles.td}>{item.status || "—"}</td>
                            <td style={styles.td}>{item.start_date || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <div style={styles.rightColumn}>
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
          </div>
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
    background: "#f6f8fb",
    padding: "24px"
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto"
  },
  header: {
    marginBottom: "24px"
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
    fontSize: "32px",
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#111827"
  },
  subtitle: {
    margin: "10px 0 0 0",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#6b7280",
    maxWidth: "860px"
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px 20px",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "8px"
  },
  statValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
    wordBreak: "break-word"
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
    gap: "24px",
    alignItems: "start"
  },
  leftColumn: {
    display: "grid",
    gap: "24px"
  },
  rightColumn: {
    display: "grid",
    gap: "24px"
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  cardHeader: {
    padding: "20px 22px 14px 22px",
    borderBottom: "1px solid #f0f2f5"
  },
  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "#111827"
  },
  cardSubtitle: {
    marginTop: "6px",
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#6b7280"
  },
  cardBody: {
    padding: "20px 22px 22px 22px"
  },
  infoGrid: {
    display: "grid",
    gap: "12px"
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  infoLabel: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: 600
  },
  infoValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 600,
    textAlign: "right",
    wordBreak: "break-word"
  },
  contractCard: {
    border: "1px solid #edf0f3",
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
    background: "#fafafa"
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #edf0f3",
    borderRadius: "14px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    background: "#f9fafb",
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid #edf0f3"
  },
  td: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top"
  },
  paragraph: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.7,
    color: "#4b5563"
  },
  noteBox: {
    marginTop: "16px",
    padding: "14px 16px",
    borderRadius: "14px",
    background: "#f9fafb",
    border: "1px solid #edf0f3"
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
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "20px",
    fontSize: "14px",
    color: "#374151"
  },
  errorCard: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "16px",
    padding: "20px",
    fontSize: "14px",
    color: "#9f1239"
  }
};