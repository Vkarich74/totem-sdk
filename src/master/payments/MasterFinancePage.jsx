import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

import {
  getMoneyCoreDestinationProviders,
  getMasterActiveContract,
  getMasterContractHistory,
  getMasterMoneyCoreSummary,
  getMasterPayouts,
  getMasterRentObligations,
  getMasterSettlements,
  getMasterWalletBalance,
  getMasterWithdrawDestinations,
  getMasterWithdrawRequests,
  getMasterWithdrawSettings
} from "../../api/internal";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

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

function EmptyState({ title, text }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyStateTitle}>{title}</div>
      <div style={styles.emptyStateText}>{text}</div>
    </div>
  );
}

function PreviewRow({ title, meta, status, value }) {
  return (
    <div style={styles.previewRow}>
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <div style={styles.previewTitle}>{title}</div>
        {meta ? <div style={styles.previewMeta}>{meta}</div> : null}
      </div>
      <div style={styles.previewAside}>
        {typeof value !== "undefined" ? <div style={styles.previewValue}>{value}</div> : null}
        {status ? <div style={styles.previewStatus}>{status}</div> : null}
      </div>
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
  const [moneyCoreSummary, setMoneyCoreSummary] = useState(null);
  const [moneyCoreDestinationProviders, setMoneyCoreDestinationProviders] = useState([]);
  const [moneyCoreWithdrawDestinations, setMoneyCoreWithdrawDestinations] = useState([]);
  const [moneyCoreWithdrawSettings, setMoneyCoreWithdrawSettings] = useState(null);
  const [moneyCoreWithdrawRequests, setMoneyCoreWithdrawRequests] = useState([]);
  const [rentObligations, setRentObligations] = useState([]);
  const [rentObligationsSummary, setRentObligationsSummary] = useState(null);
  const [rentObligationsLoading, setRentObligationsLoading] = useState(true);
  const [rentObligationsError, setRentObligationsError] = useState("");
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
            payoutsResult,
            moneyCoreResult
          ] = await Promise.allSettled([
            getMasterActiveContract(masterSlug),
            getMasterContractHistory(masterSlug),
            getMasterWalletBalance(masterSlug),
            getMasterSettlements(masterSlug),
            getMasterPayouts(masterSlug),
            getMasterMoneyCoreSummary(masterSlug)
          ]);

        if (cancelled) return;

        setActiveContract(
          activeResult.status === "fulfilled" && activeResult.value?.ok
            ? normalizeContractResponse(activeResult.value)
            : null
        );

        setHistory(
          historyResult.status === "fulfilled" && historyResult.value?.ok
            ? normalizeHistoryResponse(historyResult.value)
            : []
        );

        setWallet(
          walletResult.status === "fulfilled" && walletResult.value?.ok
            ? normalizeWalletResponse(walletResult.value)
            : null
        );

        setSettlements(
          settlementsResult.status === "fulfilled" && settlementsResult.value?.ok
            ? normalizeSettlementsResponse(settlementsResult.value)
            : []
        );

        setPayouts(
          payoutsResult.status === "fulfilled" && payoutsResult.value?.ok
            ? normalizePayoutsResponse(payoutsResult.value)
            : []
          );

        const summarySource =
          moneyCoreResult.status === "fulfilled" ? moneyCoreResult.value : null;
        const summary =
          summarySource?.summary ||
          summarySource?.data ||
          summarySource ||
          null;
        setMoneyCoreSummary(summary);

        if (
          (activeResult.status === "rejected" || !activeResult.value?.ok) &&
          (historyResult.status === "rejected" || !historyResult.value?.ok) &&
          (walletResult.status === "rejected" || !walletResult.value?.ok) &&
          (settlementsResult.status === "rejected" || !settlementsResult.value?.ok) &&
          (payoutsResult.status === "rejected" || !payoutsResult.value?.ok)
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
          setMoneyCoreSummary(null);
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

  useEffect(() => {
    let cancelled = false;

    async function loadMoneyCoreCabinet() {
      const masterSlugValue = masterSlug;

      if (!masterSlugValue) {
        if (!cancelled) {
          setMoneyCoreDestinationProviders([]);
          setMoneyCoreWithdrawDestinations([]);
          setMoneyCoreWithdrawSettings(null);
          setMoneyCoreWithdrawRequests([]);
        }
        return;
      }

      try {
        const [
          providersResult,
          destinationsResult,
          settingsResult,
          requestsResult,
        ] = await Promise.all([
          getMoneyCoreDestinationProviders({ enabled: true }),
          getMasterWithdrawDestinations(masterSlugValue),
          getMasterWithdrawSettings(masterSlugValue),
          getMasterWithdrawRequests(masterSlugValue, { limit: 10, offset: 0 }),
        ]);

        if (cancelled) return;

        setMoneyCoreDestinationProviders(Array.isArray(providersResult?.providers) ? providersResult.providers : []);
        setMoneyCoreWithdrawDestinations(Array.isArray(destinationsResult?.destinations) ? destinationsResult.destinations : []);
        setMoneyCoreWithdrawSettings(settingsResult?.settings || null);
        setMoneyCoreWithdrawRequests(Array.isArray(requestsResult?.requests) ? requestsResult.requests : []);
      } catch (e) {
        if (!cancelled) {
          setMoneyCoreDestinationProviders([]);
          setMoneyCoreWithdrawDestinations([]);
          setMoneyCoreWithdrawSettings(null);
          setMoneyCoreWithdrawRequests([]);
        }
      }
    }

    loadMoneyCoreCabinet();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadRentObligations() {
      if (!masterSlug) {
        if (!cancelled) {
          setRentObligations([]);
          setRentObligationsSummary(null);
          setRentObligationsError("");
          setRentObligationsLoading(false);
        }
        return;
      }

      try {
        setRentObligationsLoading(true);
        setRentObligationsError("");

        const result = await getMasterRentObligations(masterSlug);

        if (cancelled) return;

        if (result?.ok) {
          setRentObligations(Array.isArray(result?.obligations) ? result.obligations : []);
          setRentObligationsSummary(result?.summary || null);
        }
        else {
          setRentObligations([]);
          setRentObligationsSummary(null);
          setRentObligationsError("Не удалось загрузить обязательства по аренде.");
        }
      }
      catch (e) {
        console.error("MASTER_RENT_OBLIGATIONS_LOAD_FAILED", e);

        if (!cancelled) {
          setRentObligations([]);
          setRentObligationsSummary(null);
          setRentObligationsError("Не удалось загрузить обязательства по аренде.");
        }
      }
      finally {
        if (!cancelled) {
          setRentObligationsLoading(false);
        }
      }
    }

    void loadRentObligations();

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
  const moneyCoreZones = moneyCoreSummary || {};
  const moneyCoreOwnerType = moneyCoreSummary?.owner?.type || null;
  const moneyCoreOwnerId = moneyCoreSummary?.owner?.id || null;

  const lastSettlement = useMemo(() => {
    if (!settlements.length) return null;

    return [...settlements].sort((a, b) => {
      return new Date(b?.period_end || b?.created_at || 0) - new Date(a?.period_end || a?.created_at || 0);
    })[0];
  }, [settlements]);

  const historyPreview = useMemo(() => history.slice(0, 5), [history]);

  const formatObligationStatus = (value) => {
    if (value === "open") return "Открыто";
    if (value === "paid") return "Оплачено";
    if (value === "cancelled") return "Отменено";
    if (value === "voided") return "Аннулировано";
    return value || "—";
  };

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

            <Panel
              title="Money Core: баланс и вывод"
              subtitle="Новая модель вывода средств. Сейчас доступен только read-only режим."
            >
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#92400e" }}>
                Заявки на вывод через Money Core пока выключены. Деньги нельзя вывести напрямую до включения write-флагов.
              </div>

              {moneyCoreSummary ? (
                <section style={styles.grid}>
                  <StatCard label="provider_hold" value={money(moneyCoreZones.provider_hold)} hint="Резерв у провайдера" />
                  <StatCard label="pending_settlement" value={money(moneyCoreZones.pending_settlement)} hint="Ожидает расчёта" />
                  <StatCard label="available" value={money(moneyCoreZones.available)} hint="Доступно к выводу" />
                  <StatCard label="locked" value={money(moneyCoreZones.locked)} hint="Заблокировано" />
                  <StatCard label="paid_out" value={money(moneyCoreZones.paid_out)} hint="Уже выплачено" />
                  <StatCard label="refunded" value={money(moneyCoreZones.refunded)} hint="Возвраты" />
                  <StatCard label="reversed" value={money(moneyCoreZones.reversed)} hint="Ревёрсы" />
                  <StatCard label="requires_review" value={money(moneyCoreZones.requires_review)} hint="Требует проверки" />
                  <StatCard label="commission" value={money(moneyCoreZones.commission)} hint="Комиссия" />
                  <StatCard label="fee_reserved" value={money(moneyCoreZones.fee_reserved)} hint="Резерв под fee" />
                </section>
              ) : (
                <EmptyState
                  title="Money Core баланс пока не сформирован"
                  text="Доступный вывод появится после подтверждённого settlement."
                />
              )}

              {moneyCoreOwnerType && moneyCoreOwnerId ? (
                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  <Panel title="Способы вывода" subtitle="Доступные провайдеры вывода для Money Core">
                    {moneyCoreDestinationProviders.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {moneyCoreDestinationProviders.map((item) => (
                          <PreviewRow
                            key={item.code}
                            title={item.name || item.code}
                            meta={`${item.code} · ${item.method || "—"}`}
                            status={item.enabled ? "Доступен" : "Отключён"}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Провайдеры не настроены"
                        text="Список способов вывода пока пуст."
                      />
                    )}
                  </Panel>

                  <Panel title="Мои реквизиты" subtitle="Сохранённые реквизиты для вывода средств">
                    {moneyCoreWithdrawDestinations.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {moneyCoreWithdrawDestinations.map((item) => (
                          <PreviewRow
                            key={item.id}
                            title={item.method || "—"}
                            meta={`${item.status || "—"} · ${item.destination_relation || "—"}`}
                            value={item.phone || item.bank_name || item.account_masked || item.card_last4 || "—"}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Реквизиты ещё не добавлены"
                        text="Для этого владельца пока нет сохранённых реквизитов."
                      />
                    )}

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                        Добавление реквизитов будет доступно после включения Money Core write-флагов.
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Способ вывода</span>
                          <select
                            disabled
                            defaultValue=""
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          >
                            <option value="">Выберите способ вывода</option>
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Получатель</span>
                          <input
                            disabled
                            defaultValue=""
                            placeholder="Имя получателя"
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Телефон</span>
                          <input
                            disabled
                            defaultValue=""
                            placeholder="+996..."
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Банк</span>
                          <input
                            disabled
                            defaultValue=""
                            placeholder="Название банка"
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Маска счёта / карты</span>
                          <input
                            disabled
                            defaultValue=""
                            placeholder="**** 1234"
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Отношение к владельцу</span>
                          <select
                            disabled
                            defaultValue=""
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          >
                            <option value="">Выберите отношение</option>
                          </select>
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 12,
                          background: "#e5e7eb",
                          color: "#6b7280",
                          padding: "12px 16px",
                          fontWeight: 700,
                          opacity: 0.55,
                          cursor: "not-allowed",
                          justifySelf: "start"
                        }}
                      >
                        Добавить реквизиты
                      </button>
                    </div>
                  </Panel>

                  <Panel title="Настройки вывода" subtitle="Текущий режим Money Core без возможности записи">
                    {moneyCoreWithdrawSettings ? (
                      <div style={styles.grid}>
                        <StatCard title="Режим" value={moneyCoreWithdrawSettings.mode || "—"} note="Текущий режим" />
                        <StatCard title="Автозаявки" value={String(Boolean(moneyCoreWithdrawSettings.auto_submit_enabled))} note="Автоматизация" />
                        <StatCard title="Проверка админом" value={String(Boolean(moneyCoreWithdrawSettings.requires_admin_review))} note="Контроль" />
                        <StatCard title="Способ суммы" value={moneyCoreWithdrawSettings.amount_mode || "—"} note="Модель суммы" />
                      </div>
                    ) : (
                      <EmptyState
                        title="Настройки вывода не заданы"
                        text="Пока используется дефолтная read-only конфигурация."
                      />
                    )}
                  </Panel>

                  <Panel title="История заявок" subtitle="Последние заявки на вывод по Money Core">
                    {moneyCoreWithdrawRequests.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {moneyCoreWithdrawRequests.map((item) => (
                          <PreviewRow
                            key={item.id}
                            title={`Заявка #${item.id}`}
                            meta={`${item.status || "—"} · ${formatDateTime(item.created_at)}`}
                            value={money(item.amount)}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Заявок пока нет"
                        text="История выводов появится после включения write-флагов."
                      />
                    )}

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                        Создание заявки будет доступно после controlled write-smoke и включения Money Core write-флагов.
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Доступно к выводу</div>
                          <div style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, background: "#f9fafb", padding: "12px 14px", fontSize: 14, color: "#111827" }}>
                            {money(moneyCoreZones.available)}
                          </div>
                        </div>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Сумма вывода</span>
                          <input
                            disabled
                            defaultValue=""
                            placeholder="0 сом"
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Реквизиты</span>
                          <select
                            disabled
                            defaultValue=""
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          >
                            <option value="">Выберите реквизиты</option>
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Комментарий</span>
                          <textarea
                            disabled
                            defaultValue=""
                            placeholder="Комментарий к заявке"
                            rows={3}
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed",
                              resize: "vertical"
                            }}
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 12,
                          background: "#e5e7eb",
                          color: "#6b7280",
                          padding: "12px 16px",
                          fontWeight: 700,
                          opacity: 0.55,
                          cursor: "not-allowed",
                          justifySelf: "start"
                        }}
                      >
                        Создать заявку на вывод
                      </button>
                    </div>
                  </Panel>
                </div>
              ) : null}
            </Panel>

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

              <Panel title="Обязательства по аренде" subtitle="Только read-only список fixed_rent без изменений финансового контура.">
                {rentObligationsError ? (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 14 }}>
                    {rentObligationsError}
                  </div>
                ) : null}

                <div style={styles.infoGrid}>
                  <InfoRow label="Открыто" value={rentObligationsLoading ? "..." : String(Number(rentObligationsSummary?.open_count ?? 0))} />
                  <InfoRow label="Сумма открытых" value={rentObligationsLoading ? "..." : `${new Intl.NumberFormat("ru-RU").format(Number(rentObligationsSummary?.open_amount ?? 0))} KGS`} />
                  <InfoRow label="Оплачено" value={rentObligationsLoading ? "..." : String(Number(rentObligationsSummary?.paid_count ?? 0))} />
                  <InfoRow label="Оплаченная сумма" value={rentObligationsLoading ? "..." : `${new Intl.NumberFormat("ru-RU").format(Number(rentObligationsSummary?.paid_amount ?? 0))} KGS`} />
                </div>

                {rentObligationsLoading ? (
                  <div style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}>Загружаем обязательства по аренде...</div>
                ) : null}

                {!rentObligationsLoading && !rentObligationsError && rentObligations.length === 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState
                      title="Обязательства по аренде пока не найдены."
                      text="Read-only список по fixed_rent появится после создания обязательств."
                    />
                  </div>
                ) : null}

                {!rentObligationsLoading && !rentObligationsError && rentObligations.length > 0 ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {rentObligations.map((item, index) => {
                      const periodLabel = `${formatDateTime(item?.period_start)} — ${formatDateTime(item?.period_end)}`;
                      const amountLabel = `${new Intl.NumberFormat("ru-RU").format(Number(item?.amount || 0))} KGS`;
                      const dueLabel = formatDateTime(item?.due_at);

                      return (
                        <PreviewRow
                          key={item?.id || `${item?.contract_id || "obligation"}-${index}`}
                          title={periodLabel}
                          meta={`Срок оплаты: ${dueLabel}`}
                          value={amountLabel}
                          status={formatObligationStatus(item?.status)}
                        />
                      );
                    })}
                  </div>
                ) : null}
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
    padding: "20px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflowX: "hidden",
    boxSizing: "border-box"
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
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
    color: "#111827",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    maxWidth: "720px",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  loadingCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "18px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  errorBanner: {
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    borderRadius: "14px",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  errorTitle: {
    fontWeight: 700,
    marginBottom: "6px"
  },
  errorText: {
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
  actionsGrid: {
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
    fontSize: "12px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  actionCard: {
    display: "block",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    textDecoration: "none",
    color: "#111827",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  actionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    marginBottom: "6px"
  },
  actionText: {
    fontSize: "13px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
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
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  infoRow: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    padding: "12px",
    background: "#f8fafc",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
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
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  historyItem: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    background: "#f8fafc",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  historySummary: {
    cursor: "pointer",
    listStyle: "none",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    fontWeight: 600,
    color: "#111827",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  historyBody: {
    padding: "0 14px 14px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  emptyText: {
    fontSize: "14px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  }
};
