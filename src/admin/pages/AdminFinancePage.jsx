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
        fetchJson("/internal/reports/payments-summary?limit=20"),
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
  }, []);

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
  const paymentsSummaryRowsColumns = [
    { key: "payment_id", title: "payment_id", dataIndex: "payment_id" },
    { key: "booking_id", title: "booking_id", dataIndex: "booking_id" },
    { key: "provider", title: "provider", dataIndex: "provider" },
    { key: "payment_status", title: "payment_status", dataIndex: "payment_status", render: (value) => <Pill tone="blue">{statusLabel(value)}</Pill> },
    { key: "payout_status", title: "payout_status", dataIndex: "payout_status", render: (value) => <Pill tone="amber">{statusLabel(value)}</Pill> },
    { key: "booking_status", title: "booking_status", dataIndex: "booking_status", render: (value) => <Pill tone="neutral">{statusLabel(value)}</Pill> },
    { key: "payment_amount", title: "payment_amount", dataIndex: "payment_amount", render: (value) => formatNumber(value) },
    { key: "platform_fee", title: "platform_fee", dataIndex: "platform_fee", render: (value) => formatNumber(value) },
    { key: "provider_amount", title: "provider_amount", dataIndex: "provider_amount", render: (value) => formatNumber(value) },
    { key: "take_rate_bps", title: "take_rate_bps", dataIndex: "take_rate_bps", render: (value) => formatNumber(value) },
    { key: "payment_created_at", title: "payment_created_at", dataIndex: "payment_created_at", render: (value) => formatDate(value) },
  ];

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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <SummaryTile title="Подтверждено всего" value={formatNumber(paymentsSummarySummary.gross_confirmed)} hint="gross_confirmed" />
            <SummaryTile title="Наличные / direct" value={formatNumber(paymentsSummarySummary.direct_gross)} hint="direct_gross" />
            <SummaryTile title="XPAY подтверждено" value={formatNumber(paymentsSummarySummary.xpay_confirmed_gross)} hint="xpay_confirmed_gross" />
            <SummaryTile title="Ожидает оплаты" value={formatNumber(paymentsSummarySummary.pending_gross)} hint="pending_gross" />
            <SummaryTile title="Комиссия платформы" value={formatNumber(paymentsSummarySummary.platform_fee)} hint="platform_fee" />
            <SummaryTile title="Сумма владельцев" value={formatNumber(paymentsSummarySummary.owner_amount)} hint="owner_amount" />
            <SummaryTile title="Остаток наличных" value={formatNumber(paymentsSummarySummary.direct_remaining)} hint="direct_remaining" />
            <SummaryTile title="Accounting warnings" value={formatNumber(paymentsSummarySummary.accounting_warning_count)} hint="accounting_warning_count" />
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
