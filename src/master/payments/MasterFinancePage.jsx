import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

import {
  getMoneyCoreDestinationProviders,
  getMasterActiveContract,
  getMasterContractHistory,
  getMasterCollectionAnchors,
  getMasterLostProfit,
  getMasterMoneyCoreSummary,
  getMasterPaymentProjections,
  getMasterPayouts,
  getMasterSalaryObligations,
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

const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Bishkek";

function resolveBusinessTimeZone(source) {
  const directTimezone = [
    source?.timezone,
    source?.time_zone,
    source?.business_timezone,
    source?.salon_timezone,
    source?.master_timezone,
    source?.contract_timezone
  ].find((value) => String(value || "").trim());

  if (directTimezone) {
    return String(directTimezone).trim();
  }

  const cityCandidates = [
    source?.city,
    source?.salon_city,
    source?.master_city,
    source?.location_city
  ];

  for (const cityValue of cityCandidates) {
    const city = String(cityValue || "").trim().toLowerCase();

    if (!city) {
      continue;
    }

    if (city.includes("bishkek") || city.includes("бишкек")) {
      return "Asia/Bishkek";
    }

    if (
      city.includes("almaty") ||
      city.includes("алматы") ||
      city.includes("астана") ||
      city.includes("nur-sultan") ||
      city.includes("нур-султан") ||
      city.includes("nur sultan")
    ) {
      return "Asia/Almaty";
    }
  }

  return DEFAULT_BUSINESS_TIME_ZONE;
}

function formatDateTime(iso, source) {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: resolveBusinessTimeZone(source),
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
}

function formatSignedCurrency(value, sign, currency = "KGS") {
  const amount = Math.abs(Number(value || 0));

  if (Number.isNaN(amount)) {
    return "—";
  }

  const prefix = sign === "-" ? "-" : sign === "+" ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("ru-RU").format(amount)} ${currency}`;
}

function normalizeObligationStatus(value) {
  return String(value || "").trim().toLowerCase();
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

function getCollectionAnchorOwnerLabel(value) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "master") return "У мастера";
  if (status === "salon") return "У салона";
  if (status === "unknown") return "Не определено";
  if (status === "conflict") return "Конфликт";
  return status ? status : "—";
}

function getCollectionAnchorStatusLabel(value) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "open") return "Открыто";
  if (status === "closed") return "Закрыто";
  if (status === "not_needed") return "Не требуется";
  if (status === "unknown") return "Не определено";
  if (status === "conflict") return "Конфликт";
  return status ? status : "—";
}

function getCollectionAnchorRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.anchors)) return payload.anchors;
  return [];
}

function readCollectionAnchorMetric(summary, keys = []) {
  const source = summary && typeof summary === "object" ? summary : {};

  for (const key of keys) {
    const raw = source?.[key];
    if (raw && typeof raw === "object") {
      const count = Number(
        raw.count ??
        raw.total_count ??
        raw.items_count ??
        raw.row_count ??
        raw.anchor_count ??
        raw.value ??
        0
      );
      const amount = Number(
        raw.amount ??
        raw.total_amount ??
        raw.amount_total ??
        raw.sum ??
        0
      );
      return {
        count: Number.isFinite(count) ? count : null,
        amount: Number.isFinite(amount) ? amount : null
      };
    }
  }

  for (const key of keys) {
    const countKey = `${key}_count`;
    const amountKey = `${key}_amount`;
    const hasCount = Object.prototype.hasOwnProperty.call(source, countKey);
    const hasAmount = Object.prototype.hasOwnProperty.call(source, amountKey);
    const hasRaw = Object.prototype.hasOwnProperty.call(source, key);
    if (hasCount || hasAmount || hasRaw) {
      const count = hasCount ? Number(source?.[countKey]) : null;
      const amount = hasAmount ? Number(source?.[amountKey]) : (hasRaw ? Number(source?.[key]) : null);
      return {
        count: Number.isFinite(count) ? count : null,
        amount: Number.isFinite(amount) ? amount : null
      };
    }
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const amount = Number(source?.[key]);
      if (Number.isFinite(amount)) {
        return { count: null, amount };
      }
    }
  }

  return { count: null, amount: null };
}

function formatCollectionAnchorMetric(summary, keys = []) {
  const metric = readCollectionAnchorMetric(summary, keys);

  if (metric.amount === null && metric.count === null) {
    return "—";
  }

  if (metric.count === null) {
    return money(metric.amount);
  }

  if (metric.amount === null) {
    return String(metric.count);
  }

  return `${Number(metric.count)} / ${money(metric.amount)}`;
}

function getCollectionAnchorRowKey(row, index) {
  return String(row?.id || row?.payment_id || row?.source_id || `${index}`);
}

function getCollectionAnchorSalonLabel(row) {
  return String(
    row?.salon_name ||
    row?.salon_slug ||
    row?.salon?.name ||
    row?.salon?.slug ||
    row?.salon_id ||
    "—"
  ).trim() || "—";
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
    { key: "money", label: "Кошелёк и вывод", note: "Баланс, расчёты и вывод", to: `/master/${masterSlug}/money` },
    { key: "settlements", label: "Сеты", note: "расчётные периоды", to: `/master/${masterSlug}/settlements` },
    { key: "payouts", label: "Выплаты", note: "фактические выплаты", to: `/master/${masterSlug}/payouts` },
    { key: "transactions", label: "Транзакции", note: "Журнал операций", to: `/master/${masterSlug}/transactions` }
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
  const [paymentProjectionSummary, setPaymentProjectionSummary] = useState(null);
  const [moneyCoreDestinationProviders, setMoneyCoreDestinationProviders] = useState([]);
  const [moneyCoreWithdrawDestinations, setMoneyCoreWithdrawDestinations] = useState([]);
  const [moneyCoreWithdrawSettings, setMoneyCoreWithdrawSettings] = useState(null);
  const [moneyCoreWithdrawRequests, setMoneyCoreWithdrawRequests] = useState([]);
  const [lostProfit, setLostProfit] = useState(null);
  const [lostProfitLoading, setLostProfitLoading] = useState(true);
  const [lostProfitError, setLostProfitError] = useState("");
  const [collectionAnchors, setCollectionAnchors] = useState(null);
  const [collectionAnchorsLoading, setCollectionAnchorsLoading] = useState(true);
  const [collectionAnchorsError, setCollectionAnchorsError] = useState("");
  const [rentObligations, setRentObligations] = useState([]);
  const [rentObligationsSummary, setRentObligationsSummary] = useState(null);
  const [rentObligationsLoading, setRentObligationsLoading] = useState(true);
  const [rentObligationsError, setRentObligationsError] = useState("");
  const [salaryObligations, setSalaryObligations] = useState([]);
  const [salaryObligationsSummary, setSalaryObligationsSummary] = useState(null);
  const [salaryObligationsLoading, setSalaryObligationsLoading] = useState(true);
  const [salaryObligationsError, setSalaryObligationsError] = useState("");
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
            setPaymentProjectionSummary(null);
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
            paymentProjectionResult,
            moneyCoreResult
          ] = await Promise.allSettled([
            getMasterActiveContract(masterSlug),
            getMasterContractHistory(masterSlug),
            getMasterWalletBalance(masterSlug),
            getMasterSettlements(masterSlug),
            getMasterPayouts(masterSlug),
            getMasterPaymentProjections(masterSlug),
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

        setPaymentProjectionSummary(
          paymentProjectionResult.status === "fulfilled" && paymentProjectionResult.value?.ok
            ? paymentProjectionResult.value.summary || null
            : null
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
          setPaymentProjectionSummary(null);
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

    async function loadLostProfit() {
      if (!masterSlug) {
        if (!cancelled) {
          setLostProfit(null);
          setLostProfitLoading(false);
          setLostProfitError("");
        }
        return;
      }

      try {
        setLostProfitLoading(true);
        setLostProfitError("");

        const result = await getMasterLostProfit(undefined, { limit: 50 });

        if (cancelled) return;

        if (result?.ok) {
          setLostProfit(result.result || null);
        }
        else {
          setLostProfit(null);
          setLostProfitError("Недополученная прибыль временно недоступна");
        }
      }
      catch (e) {
        console.error("MASTER_LOST_PROFIT_LOAD_FAILED", e);

        if (!cancelled) {
          setLostProfit(null);
          setLostProfitError("Недополученная прибыль временно недоступна");
        }
      }
      finally {
        if (!cancelled) {
          setLostProfitLoading(false);
        }
      }
    }

    void loadLostProfit();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  async function fetchCollectionAnchors() {
    if (!masterSlug) {
      return { ok: false, error: "MASTER_SLUG_MISSING" };
    }

    return getMasterCollectionAnchors(masterSlug, { limit: 100 });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCollectionAnchors() {
      if (!masterSlug) {
        if (!cancelled) {
          setCollectionAnchors(null);
          setCollectionAnchorsLoading(false);
          setCollectionAnchorsError("");
        }
        return;
      }

      try {
        if (!cancelled) {
          setCollectionAnchorsLoading(true);
          setCollectionAnchorsError("");
        }

        const result = await fetchCollectionAnchors();

        if (cancelled) return;

        if (result?.ok) {
          setCollectionAnchors(result);
        }
        else {
          setCollectionAnchors(null);
          setCollectionAnchorsError("Не удалось загрузить оплаты за мои услуги.");
        }
      }
      catch (e) {
        console.error("MASTER_COLLECTION_ANCHORS_LOAD_FAILED", e);

        if (!cancelled) {
          setCollectionAnchors(null);
          setCollectionAnchorsError("Не удалось загрузить оплаты за мои услуги.");
        }
      }
      finally {
        if (!cancelled) {
          setCollectionAnchorsLoading(false);
        }
      }
    }

    void loadCollectionAnchors();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadSalaryObligations() {
      if (!masterSlug) {
        if (!cancelled) {
          setSalaryObligations([]);
          setSalaryObligationsSummary(null);
          setSalaryObligationsError("");
          setSalaryObligationsLoading(false);
        }
        return;
      }

      try {
        setSalaryObligationsLoading(true);
        setSalaryObligationsError("");

        const result = await getMasterSalaryObligations(masterSlug);

        if (cancelled) return;

        if (result?.ok) {
          setSalaryObligations(Array.isArray(result?.obligations) ? result.obligations : []);
          setSalaryObligationsSummary(result?.summary || null);
        }
        else {
          setSalaryObligations([]);
          setSalaryObligationsSummary(null);
          setSalaryObligationsError("Не удалось загрузить обязательства по зарплате.");
        }
      }
      catch (e) {
        console.error("MASTER_SALARY_OBLIGATIONS_LOAD_FAILED", e);

        if (!cancelled) {
          setSalaryObligations([]);
          setSalaryObligationsSummary(null);
          setSalaryObligationsError("Не удалось загрузить обязательства по зарплате.");
        }
      }
      finally {
        if (!cancelled) {
          setSalaryObligationsLoading(false);
        }
      }
    }

    void loadSalaryObligations();

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
  const lostProfitSummary = lostProfit?.summary || null;
  const lostProfitMonthly = Array.isArray(lostProfit?.monthly) ? lostProfit.monthly : [];
  const collectionAnchorsSummary = collectionAnchors?.summary || null;
  const collectionAnchorRows = getCollectionAnchorRows(collectionAnchors);

  const lastSettlement = useMemo(() => {
    if (!settlements.length) return null;

    return [...settlements].sort((a, b) => {
      return new Date(b?.period_end || b?.created_at || 0) - new Date(a?.period_end || a?.created_at || 0);
    })[0];
  }, [settlements]);

  const historyPreview = useMemo(() => history.slice(0, 5), [history]);

  const formatObligationStatus = (value) => {
    const status = normalizeObligationStatus(value);

    if (status === "overdue") return "Просрочено";
    if (status === "upcoming") return "Предстоящий";
    if (status === "open") return "Открыто";
    if (status === "paid") return "Оплачено";
    if (status === "cancelled") return "Отменено";
    if (status === "voided") return "Аннулировано";
    return value || "—";
  };

  const formatCurrencyAmount = (value, currencyCode = "KGS") => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) return "—";
    return `${new Intl.NumberFormat("ru-RU").format(amount)} ${currencyCode}`;
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
              <StatCard label="История оплат" value={money(paymentProjectionSummary?.history_amount)} hint={`Строк: ${Number(paymentProjectionSummary?.history_count || 0)}`} />
              <StatCard label="Открытый баланс" value={money(paymentProjectionSummary?.open_balance_amount)} hint={`Открыто: ${Number(paymentProjectionSummary?.open_balance_count || 0)}`} />
            </section>

            <Panel
              title="Недополученная прибыль"
              subtitle="Только отменённые записи этого мастера. Не влияет на выплаты."
            >
              {lostProfitError ? (
                <div style={{ marginBottom: 12, fontSize: 13, color: "#b42318", background: "#fff5f5", border: "1px solid #f5c2c7", borderRadius: 12, padding: 12 }}>
                  {lostProfitError}
                </div>
              ) : null}

              {lostProfitLoading ? (
                <EmptyState
                  title="Недополученная прибыль загружается"
                  text="Считаем отменённые записи и суммы по этому мастеру."
                />
              ) : lostProfitSummary ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <section style={styles.grid}>
                    <StatCard label="Сумма" value={money(lostProfitSummary.lost_profit_amount)} hint="Недополученная прибыль" />
                    <StatCard label="Отменённые записи" value={String(Number(lostProfitSummary.cancelled_count || 0))} hint="Записи в выборке" />
                    {Number(lostProfitSummary.missing_price_count || 0) > 0 ? (
                      <StatCard label="Без цены" value={String(Number(lostProfitSummary.missing_price_count || 0))} hint="Записи без price_snapshot" />
                    ) : null}
                  </section>

                  {lostProfitMonthly.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>История по месяцам</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {lostProfitMonthly.map((item) => (
                          <PreviewRow
                            key={item.month}
                            title={item.month || "—"}
                            meta={`${Number(item.cancelled_count || 0)} отменённых записей`}
                            value={money(item.lost_profit_amount)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="Недополученная прибыль пока не найдена"
                  text="Для выбранного периода нет отменённых записей."
                />
              )}
            </Panel>

            <Panel
              title="Оплаты за мои услуги"
              subtitle="Только просмотр. Деньги по моим услугам без действий."
            >
              {collectionAnchorsError ? (
                <div style={{ marginBottom: 12, fontSize: 13, color: "#b42318", background: "#fff5f5", border: "1px solid #f5c2c7", borderRadius: 12, padding: 12 }}>
                  {collectionAnchorsError}
                </div>
              ) : null}

              {collectionAnchorsLoading ? (
                <EmptyState
                  title="Оплаты за мои услуги загружаются"
                  text="Считаем деньги по моим услугам и распределение по статусам."
                />
              ) : collectionAnchors?.ok && collectionAnchorRows.length ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <section style={styles.grid}>
                    <StatCard label="Сумма" value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["total_paid_for_my_services", "collected_by_master", "paid_for_my_services"])} hint="Деньги по моим услугам" />
                    <StatCard label="У мастера" value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["collected_by_master"])} hint="Уже закреплено за мной" />
                    <StatCard label="У салона" value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["open_at_salon", "open_to_transfer"])} hint="Пока у салона" />
                    <StatCard label="Закрыто" value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["closed_by_salon", "closed_transfers"])} hint="Передача завершена" />
                    <StatCard label="Не определено" value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["unknown"])} hint="Требует проверки" />
                    <StatCard label="Конфликт" value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["conflict"])} hint="Нужна сверка" />
                  </section>

                  <div style={{ display: "grid", gap: 8 }}>
                    {collectionAnchorRows.slice(0, 12).map((row, index) => {
                      const amount = Number(row?.amount || row?.payment_amount || row?.price_snapshot || 0);
                      const masterLabel = String(
                        row?.master_name ||
                        row?.master_slug ||
                        row?.master?.name ||
                        row?.master?.slug ||
                        row?.master_id ||
                        row?.beneficiary_master_id ||
                        "—"
                      ).trim() || "—";
                      const salonLabel = getCollectionAnchorSalonLabel(row);
                      const rowKey = getCollectionAnchorRowKey(row, index);

                      return (
                        <PreviewRow
                          key={rowKey}
                          title={`Оплата #${row?.payment_id || "—"}`}
                          meta={`Запись #${row?.booking_id || "—"} · Салон: ${salonLabel} · Мастер: ${masterLabel} · Источник: ${String(row?.source_type || row?.source || "—").trim() || "—"}`}
                          value={money(amount)}
                          status={`${getCollectionAnchorOwnerLabel(row?.collector_owner_type)} · ${getCollectionAnchorStatusLabel(row?.anchor_status)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Оплаты за мои услуги пока не найдены"
                  text="Для выбранного периода нет данных."
                />
              )}
            </Panel>

            <Panel
              title="Money Core: баланс и вывод"
              subtitle="Новая модель вывода средств. Сейчас доступен только просмотр."
            >
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#92400e" }}>
                Заявки на вывод через Money Core пока выключены. Деньги нельзя вывести напрямую до включения write-флагов.
              </div>

              {moneyCoreSummary ? (
                <section style={styles.grid}>
                  <StatCard label="Резерв у провайдера" value={money(moneyCoreZones.provider_hold)} hint="Резерв у провайдера" />
                  <StatCard label="Ожидает расчёта" value={money(moneyCoreZones.pending_settlement)} hint="Ожидает расчёта" />
                  <StatCard label="available" value={money(moneyCoreZones.available)} hint="Доступно к выводу" />
                  <StatCard label="locked" value={money(moneyCoreZones.locked)} hint="Заблокировано" />
                  <StatCard label="paid_out" value={money(moneyCoreZones.paid_out)} hint="Уже выплачено" />
                  <StatCard label="Возвраты" value={money(moneyCoreZones.refunded)} hint="Возвраты" />
                  <StatCard label="Отменённые операции" value={money(moneyCoreZones.reversed)} hint="Отмены" />
                  <StatCard label="Требует проверки" value={money(moneyCoreZones.requires_review)} hint="Требует проверки" />
                  <StatCard label="Комиссия сервиса" value={money(moneyCoreZones.commission)} hint="Комиссия" />
                  <StatCard label="Резерв комиссии" value={money(moneyCoreZones.fee_reserved)} hint="Резерв комиссии" />
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
                        text="Пока используется дефолтная только просмотр конфигурация."
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
                <div style={styles.actionText}>История финансовых операций</div>
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
                  <InfoRow label="История оплат" value={money(paymentProjectionSummary?.history_amount)} />
                  <InfoRow label="Открытый баланс" value={money(paymentProjectionSummary?.open_balance_amount)} />
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

              <Panel title="Обязательства по аренде" subtitle="Только просмотр. Аренда показывает обязательства мастера перед салоном.">
                {rentObligationsError ? (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 14 }}>
                    {rentObligationsError}
                  </div>
                ) : null}

                <div style={styles.infoGrid}>
                  <InfoRow label="Открыто" value={rentObligationsLoading ? "..." : String(Number(rentObligationsSummary?.open_count ?? 0))} />
                  <InfoRow label="Аренда к оплате / удержанию" value={rentObligationsLoading ? "..." : formatSignedCurrency(rentObligationsSummary?.open_amount ?? 0, "-")} />
                  <InfoRow label="Оплачено" value={rentObligationsLoading ? "..." : String(Number(rentObligationsSummary?.paid_count ?? 0))} />
                  <InfoRow label="Аренда оплачена / удержана" value={rentObligationsLoading ? "..." : formatSignedCurrency(rentObligationsSummary?.paid_amount ?? 0, "-")} />
                </div>

                {rentObligationsLoading ? (
                  <div style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}>Загружаем обязательства по аренде...</div>
                ) : null}

                {!rentObligationsLoading && !rentObligationsError && rentObligations.length === 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState
                      title="Обязательства по аренде пока не найдены."
                      text="Список обязательств по аренде появится после создания записей."
                    />
                  </div>
                ) : null}

                {!rentObligationsLoading && !rentObligationsError && rentObligations.length > 0 ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {rentObligations.map((item, index) => {
                      const periodLabel = `${formatDateTime(item?.period_start, item)} — ${formatDateTime(item?.period_end, item)}`;
                      const amountLabel = formatSignedCurrency(item?.amount, "-", item?.currency || "KGS");
                      const dueLabel = formatDateTime(item?.due_at, item);

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

              <Panel title="Обязательства по зарплате" subtitle="Только просмотр. Зарплата показывает обязательства салона перед мастером.">
                {salaryObligationsError ? (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 14 }}>
                    {salaryObligationsError}
                  </div>
                ) : null}

                <div style={styles.infoGrid}>
                  <InfoRow label="Открыто" value={salaryObligationsLoading ? "..." : String(Number(salaryObligationsSummary?.open_count ?? 0))} />
                  <InfoRow label="Зарплата к получению" value={salaryObligationsLoading ? "..." : formatSignedCurrency(salaryObligationsSummary?.open_amount ?? 0, "+")} />
                  <InfoRow label="Оплачено" value={salaryObligationsLoading ? "..." : String(Number(salaryObligationsSummary?.paid_count ?? 0))} />
                  <InfoRow label="Зарплата получена" value={salaryObligationsLoading ? "..." : formatSignedCurrency(salaryObligationsSummary?.paid_amount ?? 0, "+")} />
                </div>

                {salaryObligationsLoading ? (
                  <div style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}>Загружаем обязательства по зарплате...</div>
                ) : null}

                {!salaryObligationsLoading && !salaryObligationsError && salaryObligations.length === 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState
                      title="Обязательства по зарплате пока не найдены."
                      text="Список обязательств по зарплате появится после создания записей."
                    />
                  </div>
                ) : null}

                {!salaryObligationsLoading && !salaryObligationsError && salaryObligations.length > 0 ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {salaryObligations.map((item, index) => {
                      const periodLabel = `${formatDateTime(item?.period_start, item)} — ${formatDateTime(item?.period_end, item)}`;
                      const amountLabel = formatSignedCurrency(item?.amount, "+", item?.currency || "KGS");
                      const dueLabel = formatDateTime(item?.due_at, item);

                      return (
                        <PreviewRow
                          key={item?.id || `${item?.contract_id || "salary-obligation"}-${index}`}
                          title={periodLabel}
                          meta={`Срок выплаты: ${dueLabel}`}
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
