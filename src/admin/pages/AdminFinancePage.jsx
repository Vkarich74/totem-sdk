import { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavigation from "../AdminNavigation";

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "");

function getAuthToken() {
  try {
    return String(window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim();
  } catch {
    return "";
  }
}

async function fetchJson(path) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await response.text();
  const isHtml = text.trim().startsWith("<") || (response.headers.get("content-type") || "").includes("text/html");

  if (isHtml) {
    throw new Error("API вернул HTML вместо JSON.");
  }

  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Не удалось разобрать JSON-ответ API.");
  }

  if (!response.ok || payload?.ok === false) {
    const code = payload?.error || `HTTP_${response.status}`;
    const message =
      code === "NO_AUTH" || code === "HTTP_401" || code === "HTTP_403"
        ? "Требуется вход администратора."
        : payload?.message || `Ошибка загрузки данных (${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return new Intl.NumberFormat("ru-RU").format(numeric);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();

  if (!value) {
    return "—";
  }

  const map = {
    completed: "Завершено",
    completed_with_mismatches: "Завершено с расхождениями",
    running: "Выполняется",
    pending: "Ожидает",
    open: "Открыто",
    requires_review: "Требует проверки",
    failed: "Сбой",
    blocked: "Заблокировано",
    active: "Активно",
    archived: "Архивировано",
    draft: "Черновик",
    submitted: "Отправлено",
    processing: "В обработке",
    bank_processing: "Обработка банком",
    bank_received: "Получено банком",
    locked: "Заблокировано",
    ignored: "Игнорировано",
    resolved: "Решено",
  };

  return map[value] || status;
}

function formatProviderLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "direct") return "Наличные / direct";
  if (normalized === "xpay") return "XPAY";
  if (normalized === "internal") return "Internal";
  return value || "—";
}

function formatPaymentStatusLabel(value) {
  const normalized = String(value || "").toLowerCase();
  const map = {
    pending: "Ожидает",
    confirmed: "Подтверждено",
    failed: "Сбой",
    refunded: "Возврат",
  };
  return map[normalized] || value || "—";
}

function formatPayoutStatusLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized || normalized === "no_payout") return "Нет payout";
  const map = {
    created: "Создано",
    processing: "В обработке",
    completed: "Завершено",
    paid: "Выплачено",
    failed: "Сбой",
    canceled: "Отменено",
  };
  return map[normalized] || value || "—";
}

function formatBookingStatusLabel(value) {
  const normalized = String(value || "").toLowerCase();
  const map = {
    reserved: "Забронировано",
    confirmed: "Подтверждено",
    completed: "Завершено",
    canceled: "Отменено",
    cancelled: "Отменено",
  };
  return map[normalized] || value || "—";
}

function buildPaymentsSummaryPath(filters) {
  const params = new URLSearchParams();
  params.set("limit", "20");

  const appendIfAllowed = (key, value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    if (normalized.toLowerCase() === "all") return;
    params.set(key, normalized);
  };

  appendIfAllowed("provider", filters?.provider);
  appendIfAllowed("payment_status", filters?.payment_status);
  appendIfAllowed("payout_status", filters?.payout_status);
  appendIfAllowed("booking_status", filters?.booking_status);
  appendIfAllowed("date_from", filters?.date_from);
  appendIfAllowed("date_to", filters?.date_to);

  const numericOnly = (value) => /^\d+$/.test(String(value || "").trim()) ? String(value).trim() : "";
  const salonId = numericOnly(filters?.salon_id);
  const masterId = numericOnly(filters?.master_id);

  if (salonId) params.set("salon_id", salonId);
  if (masterId) params.set("master_id", masterId);

  return `/internal/reports/payments-summary?${params.toString()}`;
}

function Pill({ children, tone = "neutral" }) {
  const palette = {
    neutral: { background: "#f3f4f6", color: "#374151" },
    green: { background: "#dcfce7", color: "#166534" },
    amber: { background: "#fef3c7", color: "#92400e" },
    red: { background: "#fee2e2", color: "#991b1b" },
    blue: { background: "#dbeafe", color: "#1d4ed8" },
  };

  const style = palette[tone] || palette.neutral;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: "left",
                  fontSize: 13,
                  padding: "10px 8px",
                  borderBottom: "1px solid #e5e7eb",
                  color: "#374151",
                  whiteSpace: "nowrap",
                }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 12, color: "#6b7280" }}>
                Данных пока нет
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id ?? index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      padding: "10px 8px",
                      borderBottom: "1px solid #f3f4f6",
                      verticalAlign: "top",
                      fontSize: 14,
                    }}
                  >
                    {column.render ? column.render(row[column.dataIndex], row) : row[column.dataIndex] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({ title, children, extra }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
        </div>
        {extra}
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

function SummaryTile({ title, value, hint }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ color: "#6b7280", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{hint}</div>
    </div>
  );
}

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [providerEvents, setProviderEvents] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [ownerBalances, setOwnerBalances] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [payoutExecutions, setPayoutExecutions] = useState([]);
  const [reconciliationRuns, setReconciliationRuns] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [moneyReceipts, setMoneyReceipts] = useState([]);
  const [moneyAuditEvents, setMoneyAuditEvents] = useState([]);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paymentsSummaryRows, setPaymentsSummaryRows] = useState([]);
  const [paymentsSummaryFilters, setPaymentsSummaryFilters] = useState({
    provider: "all",
    payment_status: "all",
    payout_status: "all",
    booking_status: "all",
    date_from: "",
    date_to: "",
    salon_id: "",
    master_id: "",
  });

  const loadAll = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Требуется вход администратора.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        overviewPayload,
        providerEventsPayload,
        settlementsPayload,
        balancesPayload,
        withdrawRequestsPayload,
        payoutExecutionsPayload,
        reconciliationPayload,
        exceptionsPayload,
        receiptsPayload,
        auditEventsPayload,
        paymentsSummaryPayload,
      ] = await Promise.all([
        fetchJson("/internal/money-core/admin/overview"),
        fetchJson("/internal/money-core/admin/provider-events?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/settlements?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/owner-balances?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/withdraw-requests?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/payout-executions?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/reconciliation?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/exceptions?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/receipts?limit=5&offset=0"),
        fetchJson("/internal/money-core/admin/audit-events?limit=5&offset=0"),
        fetchJson(buildPaymentsSummaryPath(paymentsSummaryFilters)),
      ]);

      setOverview(overviewPayload?.data || null);
      setProviderEvents(Array.isArray(providerEventsPayload?.data) ? providerEventsPayload.data : []);
      setSettlements(Array.isArray(settlementsPayload?.data) ? settlementsPayload.data : []);
      setOwnerBalances(Array.isArray(balancesPayload?.data) ? balancesPayload.data : []);
      setWithdrawRequests(Array.isArray(withdrawRequestsPayload?.data) ? withdrawRequestsPayload.data : []);
      setPayoutExecutions(Array.isArray(payoutExecutionsPayload?.data) ? payoutExecutionsPayload.data : []);
      setReconciliationRuns(Array.isArray(reconciliationPayload?.data) ? reconciliationPayload.data : []);
      setExceptions(Array.isArray(exceptionsPayload?.data) ? exceptionsPayload.data : []);
      setMoneyReceipts(Array.isArray(receiptsPayload?.data) ? receiptsPayload.data : []);
      setMoneyAuditEvents(Array.isArray(auditEventsPayload?.data) ? auditEventsPayload.data : []);
      setPaymentsSummary(paymentsSummaryPayload || null);
      setPaymentsSummaryRows(Array.isArray(paymentsSummaryPayload?.rows) ? paymentsSummaryPayload.rows : []);
    } catch (e) {
      setError(e?.message || "Не удалось загрузить финансовый центр.");
    } finally {
      setLoading(false);
    }
  }, [paymentsSummaryFilters]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const summaryCards = useMemo(
    () => [
      {
        title: "События провайдеров",
        value: providerEvents.length,
        hint: "Последние webhook и статусы",
      },
      {
        title: "Поступления от провайдера",
        value: settlements.length,
        hint: "Последние settlement-записи",
      },
      {
        title: "Балансы владельцев",
        value: ownerBalances.length,
        hint: "Состояние money_owner_balances",
      },
      {
        title: "Заявки на вывод",
        value: withdrawRequests.length,
        hint: "Lock-модель withdraw_requests",
      },
      {
        title: "Выплаты",
        value: payoutExecutions.length,
        hint: "Manual payout executions",
      },
      {
        title: "Сверка",
        value: reconciliationRuns.length,
        hint: "Запуски reconciliation",
      },
        {
          title: "Исключения",
          value: exceptions.length,
          hint: "Mismatches и отклонения",
        },
        {
          title: "Квитанции",
          value: moneyReceipts.length,
          hint: "Чеки и подтверждения выплат",
        },
        {
          title: "Аудит Money Core",
          value: moneyAuditEvents.length,
          hint: "Финансовые audit-события",
        },
      ],
      [providerEvents.length, settlements.length, ownerBalances.length, withdrawRequests.length, payoutExecutions.length, reconciliationRuns.length, exceptions.length, moneyReceipts.length, moneyAuditEvents.length]
    );

  const overviewData = overview || {};
  const overviewTiles = [
    { title: "Provider events", value: overviewData.provider_events?.total_count ?? "—", hint: "События провайдеров" },
    { title: "Settlements", value: overviewData.provider_settlements?.total_count ?? "—", hint: "Поступления от провайдера" },
    { title: "Owner balances", value: overviewData.owner_balances?.total_count ?? "—", hint: "Балансы владельцев" },
    { title: "Withdraw requests", value: overviewData.withdraw_requests?.total_count ?? "—", hint: "Заявки на вывод" },
    { title: "Payout executions", value: overviewData.payout_executions?.total_count ?? "—", hint: "Выплаты" },
    { title: "Reconciliation runs", value: overviewData.reconciliation_runs?.total_count ?? "—", hint: "Запуски сверки" },
    { title: "Exceptions", value: overviewData.reconciliation_mismatches?.total_count ?? "—", hint: "Исключения" },
    { title: "Money receipts", value: overviewData.money_receipts?.total_count ?? "—", hint: "Квитанции" },
    { title: "Money audit events", value: overviewData.money_audit_events?.total_count ?? "—", hint: "Аудит" },
  ];

  const paymentsSummaryData = paymentsSummary || {};
  const paymentsSummarySummary = paymentsSummaryData.summary || {};
  const paymentsSummaryIntegrity = paymentsSummaryData.integrity || {};
  const paymentsSummaryIssueCounts = Array.isArray(paymentsSummaryIntegrity.counts) ? paymentsSummaryIntegrity.counts : [];
  const platformRevenueAccrued =
    paymentsSummarySummary.platform_revenue_accrued ?? paymentsSummarySummary.platform_fee ?? 0;
  const directPlatformReceivable =
    paymentsSummarySummary.direct_platform_receivable ??
    paymentsSummarySummary.direct_remaining ??
    paymentsSummarySummary.direct_gross ??
    0;
  const xpayPlatformPendingOrRetained =
    paymentsSummarySummary.xpay_platform_pending_or_retained ?? paymentsSummarySummary.xpay_confirmed_gross ?? 0;
  const platformCollectedActualProven = paymentsSummarySummary.platform_collected_actual_proven ?? 0;
  const ownerProviderPayable =
    paymentsSummarySummary.owner_provider_payable ?? paymentsSummarySummary.owner_amount ?? 0;
  const paymentsSummaryRowsColumns = [
    { key: "payment_id", title: "payment_id", dataIndex: "payment_id" },
    { key: "booking_id", title: "booking_id", dataIndex: "booking_id" },
    { key: "provider", title: "provider", dataIndex: "provider", render: (value) => formatProviderLabel(value) },
    { key: "payment_status", title: "payment_status", dataIndex: "payment_status", render: (value) => <Pill tone="blue">{formatPaymentStatusLabel(value)}</Pill> },
    { key: "payout_status", title: "payout_status", dataIndex: "payout_status", render: (value) => <Pill tone="amber">{formatPayoutStatusLabel(value)}</Pill> },
    { key: "booking_status", title: "booking_status", dataIndex: "booking_status", render: (value) => <Pill tone="neutral">{formatBookingStatusLabel(value)}</Pill> },
    { key: "payment_amount", title: "payment_amount", dataIndex: "payment_amount", render: (value) => formatNumber(value) },
    { key: "platform_fee", title: "platform_fee", dataIndex: "platform_fee", render: (value) => formatNumber(value) },
    { key: "provider_amount", title: "provider_amount", dataIndex: "provider_amount", render: (value) => formatNumber(value) },
    { key: "take_rate_bps", title: "take_rate_bps", dataIndex: "take_rate_bps", render: (value) => formatNumber(value) },
    { key: "payment_created_at", title: "payment_created_at", dataIndex: "payment_created_at", render: (value) => formatDate(value) },
  ];

  const handlePaymentsSummaryFilterChange = (key, value) => {
    setPaymentsSummaryFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetPaymentsSummaryFilters = () => {
    setPaymentsSummaryFilters({
      provider: "all",
      payment_status: "all",
      payout_status: "all",
      booking_status: "all",
      date_from: "",
      date_to: "",
      salon_id: "",
      master_id: "",
    });
  };

  const providerEventsColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "provider_code", title: "Провайдер", dataIndex: "provider_code" },
    { key: "event_type", title: "Тип события", dataIndex: "event_type" },
    { key: "status_normalized", title: "Статус", dataIndex: "status_normalized", render: (_, row) => <Pill tone="blue">{statusLabel(row.status_normalized)}</Pill> },
    { key: "received_at", title: "Получено", dataIndex: "received_at", render: (value) => formatDate(value) },
  ];

  const settlementsColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "provider_code", title: "Провайдер", dataIndex: "provider_code" },
    { key: "settlement_source", title: "Источник", dataIndex: "settlement_source" },
    { key: "status", title: "Статус", dataIndex: "status", render: (_, row) => <Pill tone="amber">{statusLabel(row.status)}</Pill> },
    { key: "amount_net", title: "Сумма", dataIndex: "amount_net", render: (value) => formatNumber(value) },
    { key: "created_at", title: "Создано", dataIndex: "created_at", render: (value) => formatDate(value) },
  ];

  const balancesColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "owner_type", title: "Тип owner", dataIndex: "owner_type" },
    { key: "owner_id", title: "Owner ID", dataIndex: "owner_id" },
    { key: "currency", title: "Валюта", dataIndex: "currency" },
    { key: "available", title: "Доступно", dataIndex: "available", render: (value) => formatNumber(value) },
    { key: "locked", title: "Заблокировано", dataIndex: "locked", render: (value) => formatNumber(value) },
  ];

  const withdrawColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "status", title: "Статус", dataIndex: "status", render: (_, row) => <Pill tone="amber">{statusLabel(row.status)}</Pill> },
    { key: "amount", title: "Сумма", dataIndex: "amount", render: (value) => formatNumber(value) },
    { key: "destination_id", title: "Депозит", dataIndex: "destination_id" },
    { key: "updated_at", title: "Обновлено", dataIndex: "updated_at", render: (value) => formatDate(value) },
  ];

  const payoutColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "status", title: "Статус", dataIndex: "status", render: (_, row) => <Pill tone="green">{statusLabel(row.status)}</Pill> },
    { key: "payout_mode", title: "Режим", dataIndex: "payout_mode" },
    { key: "amount", title: "Сумма", dataIndex: "amount", render: (value) => formatNumber(value) },
    { key: "updated_at", title: "Обновлено", dataIndex: "updated_at", render: (value) => formatDate(value) },
  ];

  const reconciliationColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "run_type", title: "Тип", dataIndex: "run_type" },
    { key: "status", title: "Статус", dataIndex: "status", render: (_, row) => <Pill tone="blue">{statusLabel(row.status)}</Pill> },
    { key: "mismatches_count", title: "Несоответствия", dataIndex: "mismatches_count" },
    { key: "created_at", title: "Создано", dataIndex: "created_at", render: (value) => formatDate(value) },
  ];

  const exceptionsColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "severity", title: "Severity", dataIndex: "severity", render: (_, row) => <Pill tone={String(row.severity).toLowerCase() === "critical" ? "red" : "amber"}>{statusLabel(row.severity)}</Pill> },
    { key: "mismatch_type", title: "Тип", dataIndex: "mismatch_type" },
    { key: "source_type", title: "Источник", dataIndex: "source_type" },
    { key: "status", title: "Статус", dataIndex: "status", render: (_, row) => <Pill tone="blue">{statusLabel(row.status)}</Pill> },
  ];

  const receiptColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "receipt_type", title: "Тип квитанции", dataIndex: "receipt_type" },
    { key: "source_type", title: "Источник", dataIndex: "source_type" },
    { key: "amount", title: "Сумма", dataIndex: "amount", render: (value) => formatNumber(value) },
    { key: "external_ref", title: "Внешний реф", dataIndex: "external_ref" },
    { key: "issued_at", title: "Выдано", dataIndex: "issued_at", render: (value) => formatDate(value) },
  ];

  const auditEventColumns = [
    { key: "id", title: "ID", dataIndex: "id" },
    { key: "event_type", title: "Тип события", dataIndex: "event_type" },
    { key: "actor_type", title: "Actor", dataIndex: "actor_type" },
    { key: "owner_type", title: "Owner", dataIndex: "owner_type" },
    { key: "source_type", title: "Источник", dataIndex: "source_type" },
    { key: "created_at", title: "Создано", dataIndex: "created_at", render: (value) => formatDate(value) },
  ];

  if (!getAuthToken()) {
    return (
      <div style={{ padding: 20 }}>
        <AdminNavigation />
        <h1 style={{ marginTop: 16 }}>Финансовый центр</h1>
        <p>Требуется вход администратора.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <AdminNavigation />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginTop: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Финансовый центр</h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
            Read-only контроль Money Core: события провайдеров, поступления, балансы владельцев, заявки на вывод, выплаты, сверка и исключения.
          </p>
        </div>
        <button type="button" onClick={loadAll} disabled={loading}>
          {loading ? "Обновление..." : "Обновить"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 10,
            padding: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 20,
        }}
      >
        {summaryCards.map((card) => (
          <SummaryTile key={card.title} title={card.title} value={card.value} hint={card.hint} />
        ))}
      </div>

      <SectionCard title="Обзор Money Core">
        {loading && !overview ? <div>Загрузка...</div> : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {overviewTiles.map((tile) => (
            <SummaryTile key={tile.title} title={tile.title} value={tile.value} hint={tile.hint} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Legacy payments / наличные и XPAY">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#b45309", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: 12 }}>
            Read-only отчёт по legacy payments/payouts. Money Core не изменяется.
          </div>
          <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
            Комиссия платформы — начисленная выручка. Фактически получено подтверждается ledger; сейчас ledger не подтверждает поступление.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>provider</span>
              <select
                value={paymentsSummaryFilters.provider}
                onChange={(event) => handlePaymentsSummaryFilterChange("provider", event.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                <option value="all">all</option>
                <option value="direct">direct</option>
                <option value="xpay">xpay</option>
                <option value="internal">internal</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>payment_status</span>
              <select
                value={paymentsSummaryFilters.payment_status}
                onChange={(event) => handlePaymentsSummaryFilterChange("payment_status", event.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                <option value="all">all</option>
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="failed">failed</option>
                <option value="refunded">refunded</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>payout_status</span>
              <select
                value={paymentsSummaryFilters.payout_status}
                onChange={(event) => handlePaymentsSummaryFilterChange("payout_status", event.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                <option value="all">all</option>
                <option value="no_payout">no_payout</option>
                <option value="created">created</option>
                <option value="processing">processing</option>
                <option value="completed">completed</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
                <option value="canceled">canceled</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>booking_status</span>
              <select
                value={paymentsSummaryFilters.booking_status}
                onChange={(event) => handlePaymentsSummaryFilterChange("booking_status", event.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                <option value="all">all</option>
                <option value="reserved">reserved</option>
                <option value="confirmed">confirmed</option>
                <option value="completed">completed</option>
                <option value="canceled">canceled</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>date_from</span>
              <input
                type="date"
                value={paymentsSummaryFilters.date_from}
                onChange={(event) => handlePaymentsSummaryFilterChange("date_from", event.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>date_to</span>
              <input
                type="date"
                value={paymentsSummaryFilters.date_to}
                onChange={(event) => handlePaymentsSummaryFilterChange("date_to", event.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>salon_id</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="salon_id"
                value={paymentsSummaryFilters.salon_id}
                onChange={(event) => handlePaymentsSummaryFilterChange("salon_id", event.target.value.replace(/\D/g, ""))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>master_id</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="master_id"
                value={paymentsSummaryFilters.master_id}
                onChange={(event) => handlePaymentsSummaryFilterChange("master_id", event.target.value.replace(/\D/g, ""))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" onClick={loadAll}>
              Применить
            </button>
            <button type="button" onClick={resetPaymentsSummaryFilters}>
              Сбросить
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <SummaryTile title="Оборот / подтверждено" value={formatNumber(paymentsSummarySummary.gross_confirmed)} hint="gross_confirmed" />
            <SummaryTile title="Начисленная комиссия платформы" value={formatNumber(platformRevenueAccrued)} hint="platform_revenue_accrued" />
            <SummaryTile title="К получению по наличным/direct" value={formatNumber(directPlatformReceivable)} hint="direct_platform_receivable" />
            <SummaryTile title="XPAY ожидает / удержано" value={formatNumber(xpayPlatformPendingOrRetained)} hint="xpay_platform_pending_or_retained" />
            <SummaryTile title="Фактически получено" value={formatNumber(platformCollectedActualProven)} hint="не подтверждено ledger" />
            <SummaryTile title="К выплате владельцам" value={formatNumber(ownerProviderPayable)} hint="owner_provider_payable" />
            <SummaryTile title="Ожидает оплаты" value={formatNumber(paymentsSummarySummary.pending_gross)} hint="pending_gross" />
            <SummaryTile title="Accounting warnings" value={formatNumber(paymentsSummarySummary.accounting_warning_count)} hint="accounting_warning_count" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <SummaryTile title="Наличные / direct оборот" value={formatNumber(paymentsSummarySummary.direct_gross)} hint="direct_gross" />
            <SummaryTile title="XPAY подтверждено оборот" value={formatNumber(paymentsSummarySummary.xpay_confirmed_gross)} hint="xpay_confirmed_gross" />
            <SummaryTile title="Legacy platform_fee начислено" value={formatNumber(paymentsSummarySummary.platform_fee)} hint="platform_fee" />
            <SummaryTile title="Legacy owner_amount" value={formatNumber(paymentsSummarySummary.owner_amount)} hint="owner_amount" />
            <SummaryTile title="Direct remaining legacy" value={formatNumber(paymentsSummarySummary.direct_remaining)} hint="direct_remaining" />
          </div>

          {paymentsSummaryIssueCounts.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Integrity issues</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {paymentsSummaryIssueCounts.map((item, index) => (
                  <Pill key={`${item.issue_type || "issue"}-${index}`} tone="amber">
                    {String(item.issue_type || "unknown")} · {formatNumber(item.count)}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}

          <DataTable columns={paymentsSummaryRowsColumns} rows={paymentsSummaryRows} />
        </div>
      </SectionCard>

      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <SectionCard title="События провайдеров">
          <DataTable columns={providerEventsColumns} rows={providerEvents} />
        </SectionCard>

        <SectionCard title="Поступления от провайдера">
          <DataTable columns={settlementsColumns} rows={settlements} />
        </SectionCard>

        <SectionCard title="Балансы владельцев">
          <DataTable columns={balancesColumns} rows={ownerBalances} />
        </SectionCard>

        <SectionCard title="Заявки на вывод">
          <DataTable columns={withdrawColumns} rows={withdrawRequests} />
        </SectionCard>

        <SectionCard title="Выплаты">
          <DataTable columns={payoutColumns} rows={payoutExecutions} />
        </SectionCard>

        <SectionCard title="Сверка">
          <DataTable columns={reconciliationColumns} rows={reconciliationRuns} />
        </SectionCard>

        <SectionCard title="Исключения">
          <DataTable columns={exceptionsColumns} rows={exceptions} />
        </SectionCard>

        <SectionCard title="Квитанции">
          <DataTable columns={receiptColumns} rows={moneyReceipts} />
        </SectionCard>

        <SectionCard title="Аудит Money Core">
          <DataTable columns={auditEventColumns} rows={moneyAuditEvents} />
        </SectionCard>
      </div>
    </div>
  );
}
