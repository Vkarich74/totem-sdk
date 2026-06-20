import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminNavigation from "../AdminNavigation";
import {
  getAdminWithdrawRequests,
  getAdminWithdrawRequestsSummary,
  getAdminWithdrawRequestById,
  adminClaimWithdrawRequest,
  adminCompleteWithdrawRequest,
  adminRejectWithdrawRequest,
  adminCommentWithdrawRequest,
  adminFailWithdrawRequest,
  adminStartProcessingWithdrawRequest,
} from "../../api/internal.js";

const PAGE_LABEL = "Центр вывода средств";
const REQUESTS_LIMIT = 500;

function getAuthToken() {
  try {
    return String(window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim();
  } catch {
    return "";
  }
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Bishkek",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value, currency = "KGS") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return `0 ${currency}`;
  }

  return `${new Intl.NumberFormat("ru-RU").format(numeric)} ${currency}`;
}

function textValue(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getAdminStatusLabel(status, fallbackLabel) {
  if (fallbackLabel) {
    return fallbackLabel;
  }

  const normalized = normalizeStatus(status);
  const map = {
    pending_validation: "Новая",
    requires_review: "В проверке",
    locked: "В процессе",
    queued_for_payout: "В процессе",
    bank_processing: "В процессе",
    completed: "Выполнена",
    failed: "Ошибка выплаты",
    canceled: "Отклонена",
    created: "Новая",
    rejected: "Отклонена",
  };

  return map[normalized] || textValue(status);
}

function getUserStatusLabel(status, fallbackLabel) {
  if (fallbackLabel) {
    return fallbackLabel;
  }

  const normalized = normalizeStatus(status);
  const map = {
    pending_validation: "Новая",
    requires_review: "В процессе",
    locked: "В процессе",
    queued_for_payout: "В процессе",
    bank_processing: "В процессе",
    completed: "Выполнена",
    failed: "Ошибка выплаты",
    canceled: "Отклонена",
    created: "Новая",
    rejected: "Отклонена",
  };

  return map[normalized] || textValue(status);
}

function getStatusTone(status) {
  const normalized = normalizeStatus(status);

  if (["completed"].includes(normalized)) {
    return "green";
  }

  if (["pending_validation", "requires_review", "locked", "queued_for_payout", "bank_processing", "created"].includes(normalized)) {
    return "amber";
  }

  if (["failed", "canceled", "rejected"].includes(normalized)) {
    return "red";
  }

  return "neutral";
}

function getRiskTone(flag) {
  const normalized = normalizeStatus(flag);
  if (normalized === "large_amount") {
    return "red";
  }
  if (["destination_not_found", "destination_archived", "owner_destination_mismatch", "lock_ledger_missing", "payout_execution_missing", "failed_with_reason", "rejected_with_reason"].includes(normalized)) {
    return "amber";
  }
  return "neutral";
}

function Badge({ children, tone = "neutral" }) {
  const palette = {
    neutral: { background: "#f3f4f6", color: "#374151" },
    green: { background: "#dcfce7", color: "#166534" },
    amber: { background: "#fef3c7", color: "#92400e" },
    red: { background: "#fee2e2", color: "#991b1b" },
    blue: { background: "#dbeafe", color: "#1d4ed8" },
    slate: { background: "#e2e8f0", color: "#334155" },
  };

  const style = palette[tone] || palette.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function SectionCard({ title, subtitle, extra, children }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>{title}</h2>
          {subtitle ? (
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>{subtitle}</div>
          ) : null}
        </div>
        {extra}
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

function MetricCard({ title, value, hint, tone = "slate" }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        background: "#fff",
        borderRadius: 18,
        padding: 16,
        minHeight: 100,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.4 }}>{title}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
      {hint ? <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.45 }}>{hint}</div> : null}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div
      style={{
        border: "1px dashed #d1d5db",
        borderRadius: 16,
        background: "#f9fafb",
        padding: 20,
        color: "#6b7280",
      }}
    >
      <div style={{ fontWeight: 700, color: "#374151" }}>{title}</div>
      {subtitle ? <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>{subtitle}</div> : null}
    </div>
  );
}

function Field({ label, value, mono = false, wrap = false }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ color: "#6b7280", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Consolas, monospace" : "inherit",
          whiteSpace: wrap ? "pre-wrap" : "normal",
          wordBreak: wrap ? "break-word" : "normal",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getHashParts() {
  const hash = window.location.hash || "";
  const clean = hash.replace(/^#\/?/, "");
  const path = clean.split("?")[0];
  return path.split("/").filter(Boolean);
}

function getInitialSelectedRequestId() {
  const parts = getHashParts();
  if (parts[0] === "admin" && parts[1] === "withdrawals" && parts[2]) {
    return String(parts[2]);
  }
  return "";
}

function getRequestStatusGroup(status) {
  const normalized = normalizeStatus(status);
  if (["created", "pending_validation"].includes(normalized)) return "new";
  if (normalized === "requires_review") return "review";
  if (["locked", "queued_for_payout", "bank_processing"].includes(normalized)) return "processing";
  if (normalized === "completed") return "completed";
  if (["canceled", "rejected"].includes(normalized)) return "rejected";
  if (normalized === "failed") return "failed";
  return "other";
}

function buildSearchHaystack(request, detail) {
  const owner = detail?.owner || {};
  const destination = detail?.destination || {};
  const pieces = [
    request?.id,
    request?.owner_type,
    request?.owner_id,
    owner?.owner_slug,
    owner?.owner_name,
    owner?.owner_type,
    owner?.owner_id,
    destination?.method,
    destination?.provider_code,
    destination?.wallet_provider,
    destination?.phone,
    destination?.bank_name,
    destination?.account_masked,
    destination?.card_last4,
    destination?.account_holder,
    request?.destination_id,
    request?.status,
    request?.admin_status_label,
    request?.user_status_label,
    request?.risk_flags?.join(" "),
    request?.creation_mode,
    request?.decision,
    request?.failure_reason,
    request?.admin_note,
  ];

  return pieces
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }
      return [value];
    })
    .map((value) => String(value ?? "").toLowerCase())
    .join(" | ");
}

function buildOwnerLabel(request, detail) {
  const owner = detail?.owner || {};
  const ownerName = String(owner?.owner_name || "").trim();
  const ownerSlug = String(owner?.owner_slug || "").trim();
  const ownerType = String(request?.owner_type || owner?.owner_type || "").trim();
  const ownerId = request?.owner_id ?? owner?.owner_id ?? "";

  return ownerName || ownerSlug || (ownerType ? `${ownerType} #${ownerId}` : `#${ownerId || "—"}`);
}

function buildDestinationSummary(request, detail) {
  const destination = detail?.destination || null;
  if (!destination) {
    return request?.destination_id ? `#${request.destination_id}` : "—";
  }

  const parts = [
    destination.method,
    destination.provider_code,
    destination.wallet_provider,
    destination.bank_name,
    destination.phone,
    destination.card_last4 ? `•••• ${destination.card_last4}` : "",
    destination.account_masked,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : `#${destination.destination_id || request?.destination_id || "—"}`;
}

function normalizeLargeAmountFlag(request) {
  return safeArray(request?.risk_flags).some((flag) => normalizeStatus(flag) === "large_amount");
}

function normalizeStatusMatch(request, tabKey) {
  const group = getRequestStatusGroup(request?.status);
  if (tabKey === "all") return true;
  return group === tabKey;
}

export default function AdminWithdrawalsPage() {
  const detailRef = useRef(null);
  const selectedRequestIdHash = useMemo(() => getInitialSelectedRequestId(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    owner_type: "all",
    search: "",
    risk_only: false,
    large_amount_only: false,
  });
  const [selectedRequestId, setSelectedRequestId] = useState(selectedRequestIdHash);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionForm, setActionForm] = useState({
    action: "",
    value: "",
    payoutProvider: "",
    internalNote: "",
    externalRef: "",
    bankReference: "",
    receiptUrl: "",
    failureReason: "",
    moneySentConfirmed: false,
    moneyNotSentConfirmed: false,
  });

  const loadSummaryAndRequests = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setError("Требуется вход администратора.");
      setSummary(null);
      setRequests([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [summaryResult, requestsResult] = await Promise.all([
        getAdminWithdrawRequestsSummary(),
        getAdminWithdrawRequests({ limit: REQUESTS_LIMIT, offset: 0 }),
      ]);

      if (!summaryResult.ok) {
        throw new Error(summaryResult.error || "SUMMARY_LOAD_FAILED");
      }

      if (!requestsResult.ok) {
        throw new Error(requestsResult.error || "REQUESTS_LOAD_FAILED");
      }

      setSummary({
        ...(summaryResult.summary || {}),
        by_status: safeArray(summaryResult.by_status),
        generated_at: summaryResult.generated_at || null,
      });
      setRequests(safeArray(requestsResult.requests));
    } catch (err) {
      setError(err?.message || "Не удалось загрузить Центр вывода.");
      setSummary(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    const safeId = String(id || "").trim();
    if (!safeId) {
      setSelectedRequest(null);
      setDetailError("");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setDetailError("Требуется вход администратора.");
      setSelectedRequest(null);
      return;
    }

    setDetailLoading(true);
    setDetailError("");

    try {
      const result = await getAdminWithdrawRequestById(safeId);
      if (!result.ok) {
        if (result.error === "ADMIN_WITHDRAW_REQUEST_GET_API_NOT_OK") {
          const status = Number(result.detail?.status || 0);
          if (status === 404) {
            setDetailError("Заявка не найдена");
          } else if (status === 401 || status === 403) {
            setDetailError("Требуется вход администратора.");
          } else {
            setDetailError("Не удалось загрузить заявку.");
          }
        } else {
          setDetailError("Не удалось загрузить заявку.");
        }
        setSelectedRequest(null);
        return;
      }

      setSelectedRequest(result.request || null);
      if (detailRef.current) {
        detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      setDetailError(err?.message || "Не удалось загрузить заявку.");
      setSelectedRequest(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const selectedActionSet = useMemo(() => new Set(safeArray(selectedRequest?.admin_available_actions)), [selectedRequest]);
  const completeExternalRef = String(actionForm.externalRef || "").trim();
  const completeBankReference = String(actionForm.bankReference || "").trim();
  const completeActionReady = Boolean(actionForm.moneySentConfirmed && (completeExternalRef || completeBankReference));
  const failReason = String(actionForm.failureReason || "").trim();
  const failActionReady = Boolean(actionForm.moneyNotSentConfirmed && failReason);

  function resetActionState() {
    setActionForm({
      action: "",
      value: "",
      payoutProvider: "",
      internalNote: "",
      externalRef: "",
      bankReference: "",
      receiptUrl: "",
      failureReason: "",
      moneySentConfirmed: false,
      moneyNotSentConfirmed: false,
    });
    setActionError("");
    setActionSuccess("");
    setActionLoading("");
  }

  function openActionForm(action) {
    setActionForm({
      action,
      value: "",
      payoutProvider: "",
      internalNote: "",
      externalRef: "",
      bankReference: "",
      receiptUrl: "",
      failureReason: "",
      moneySentConfirmed: false,
      moneyNotSentConfirmed: false,
    });
    setActionError("");
    setActionSuccess("");
  }

  function closeActionForm() {
    setActionForm({
      action: "",
      value: "",
      payoutProvider: "",
      internalNote: "",
      externalRef: "",
      bankReference: "",
      receiptUrl: "",
      failureReason: "",
      moneySentConfirmed: false,
      moneyNotSentConfirmed: false,
    });
    setActionError("");
  }

  async function refreshSelectedRequest() {
    if (!selectedRequestId) {
      await loadSummaryAndRequests();
      return;
    }

    await Promise.all([
      loadSummaryAndRequests(),
      loadDetail(selectedRequestId),
    ]);
  }

  async function handleClaimAction() {
    if (!selectedRequestId || actionLoading) {
      return;
    }

    const confirmed = window.confirm("Подтвердить перевод заявки в проверку?");
    if (!confirmed) {
      return;
    }

    try {
      setActionLoading("claim");
      setActionError("");
      setActionSuccess("");
      const result = await adminClaimWithdrawRequest(selectedRequestId);
      if (!result.ok) {
        throw new Error(result.error || "ADMIN_WITHDRAW_REQUEST_CLAIM_FAILED");
      }
      setActionSuccess("Заявка переведена в проверку.");
      closeActionForm();
      await refreshSelectedRequest();
    } catch (err) {
      setActionError(err?.message || "ADMIN_WITHDRAW_REQUEST_CLAIM_FAILED");
    } finally {
      setActionLoading("");
    }
  }

  async function handleStartProcessingAction() {
    if (!selectedRequestId || actionLoading) {
      return;
    }

    try {
      setActionLoading("start_processing");
      setActionError("");
      setActionSuccess("");

      const payload = {};
      if (String(actionForm.payoutProvider || "").trim()) {
        payload.payout_provider = String(actionForm.payoutProvider || "").trim();
      }
      if (String(actionForm.internalNote || "").trim()) {
        payload.internal_note = String(actionForm.internalNote || "").trim();
      }

      const result = await adminStartProcessingWithdrawRequest(selectedRequestId, payload);
      if (!result.ok) {
        throw new Error(result.error || "ADMIN_WITHDRAW_REQUEST_START_PROCESSING_FAILED");
      }

      setActionSuccess("Заявка переведена в обработку.");
      closeActionForm();
      await refreshSelectedRequest();
    } catch (err) {
      setActionError(err?.message || "ADMIN_WITHDRAW_REQUEST_START_PROCESSING_FAILED");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSubmitActionForm(event) {
    event.preventDefault();

    if (!selectedRequestId || actionLoading) {
      return;
    }

    const action = String(actionForm.action || "");
    try {
      setActionLoading(action);
      setActionError("");
      setActionSuccess("");

      let result = null;
      if (action === "reject") {
        const value = String(actionForm.value || "").trim();
        if (!value) {
          setActionError("Причина обязательна.");
          setActionLoading("");
          return;
        }
        result = await adminRejectWithdrawRequest(selectedRequestId, value);
      } else if (action === "comment") {
        const value = String(actionForm.value || "").trim();
        if (!value) {
          setActionError("Комментарий обязателен.");
          setActionLoading("");
          return;
        }
        result = await adminCommentWithdrawRequest(selectedRequestId, value);
      } else if (action === "start_processing") {
        result = await adminStartProcessingWithdrawRequest(selectedRequestId, {
          payout_provider: actionForm.payoutProvider,
          internal_note: actionForm.internalNote,
        });
      } else if (action === "complete") {
        const externalRef = String(actionForm.externalRef || "").trim();
        const bankReference = String(actionForm.bankReference || "").trim();
        if (!actionForm.moneySentConfirmed) {
          setActionError("Подтвердите, что деньги отправлены.");
          setActionLoading("");
          return;
        }
        if (!externalRef && !bankReference) {
          setActionError("Нужен external_ref или bank_reference.");
          setActionLoading("");
          return;
        }
        result = await adminCompleteWithdrawRequest(selectedRequestId, {
          external_ref: externalRef,
          bank_reference: bankReference,
          receipt_url: actionForm.receiptUrl,
        });
      } else if (action === "fail") {
        const failureReason = String(actionForm.failureReason || "").trim();
        if (!actionForm.moneyNotSentConfirmed) {
          setActionError("Подтвердите, что деньги НЕ отправлены / нужно вернуть locked balance.");
          setActionLoading("");
          return;
        }
        if (!failureReason) {
          setActionError("Причина обязательна.");
          setActionLoading("");
          return;
        }
        result = await adminFailWithdrawRequest(selectedRequestId, {
          failure_reason: failureReason,
        });
      } else {
        throw new Error("ACTION_FORM_INVALID");
      }

      if (!result.ok) {
        throw new Error(result.error || "ADMIN_WITHDRAW_REQUEST_ACTION_FAILED");
      }

      if (action === "reject") {
        setActionSuccess("Заявка отклонена.");
      } else if (action === "comment") {
        setActionSuccess("Комментарий сохранён.");
      } else if (action === "complete") {
        setActionSuccess("Выплата отмечена как завершённая.");
      } else if (action === "fail") {
        setActionSuccess("Выплата отмечена как неуспешная.");
      } else {
        setActionSuccess("Заявка переведена в обработку.");
      }
      closeActionForm();
      await refreshSelectedRequest();
    } catch (err) {
      setActionError(err?.message || "ADMIN_WITHDRAW_REQUEST_ACTION_FAILED");
    } finally {
      setActionLoading("");
    }
  }

  useEffect(() => {
    void loadSummaryAndRequests();
  }, [loadSummaryAndRequests]);

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedRequest(null);
      setDetailError("");
      setDetailLoading(false);
      resetActionState();
      return;
    }

    resetActionState();
    void loadDetail(selectedRequestId);
  }, [selectedRequestId, loadDetail]);

  useEffect(() => {
    function syncFromHash() {
      const parts = getHashParts();
      if (parts[0] === "admin" && parts[1] === "withdrawals" && parts[2]) {
        const nextId = String(parts[2]).trim();
        if (nextId && nextId !== selectedRequestId) {
          setSelectedRequestId(nextId);
        }
      }
    }

    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [selectedRequestId]);

  useEffect(() => {
    if (!selectedRequestIdHash) {
      return;
    }
    if (selectedRequestIdHash !== selectedRequestId) {
      setSelectedRequestId(selectedRequestIdHash);
    }
  }, [selectedRequestIdHash, selectedRequestId]);

  const requestsWithDetails = useMemo(() => {
    if (!selectedRequest) {
      return requests;
    }

    return requests.map((row) => {
      const rowId = String(row?.id ?? "");
      if (rowId !== String(selectedRequest?.withdraw_request?.id || selectedRequest?.id || "")) {
        return row;
      }

      return {
        ...row,
        detail: selectedRequest,
      };
    });
  }, [requests, selectedRequest]);

  const filteredRequests = useMemo(() => {
    const statusFilter = String(filters.status || "all");
    const ownerTypeFilter = String(filters.owner_type || "all");
    const searchText = String(filters.search || "").trim().toLowerCase();
    const riskOnly = Boolean(filters.risk_only);
    const largeAmountOnly = Boolean(filters.large_amount_only);

    return requestsWithDetails.filter((request) => {
      if (!normalizeStatusMatch(request, statusFilter)) {
        return false;
      }

      if (ownerTypeFilter !== "all" && normalizeStatus(request?.owner_type) !== normalizeStatus(ownerTypeFilter)) {
        return false;
      }

      if (riskOnly && safeArray(request?.risk_flags).length === 0) {
        return false;
      }

      if (largeAmountOnly && !normalizeLargeAmountFlag(request)) {
        return false;
      }

      if (searchText) {
        const haystack = buildSearchHaystack(request, request?.detail);
        if (!haystack.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }, [filters, requestsWithDetails]);

  const summaryData = summary || {};
  const totalCount = Number(summaryData.total_count || 0);
  const totalAmount = summaryData.total_amount || 0;
  const currency = summaryData.currency || "KGS";

  const tabs = useMemo(
    () => [
      { key: "all", label: "Все", count: totalCount },
      { key: "new", label: "Новые", count: Number(summaryData.new_count || 0) },
      { key: "review", label: "В проверке", count: Number(summaryData.review_count || 0) },
      { key: "processing", label: "В процессе", count: Number(summaryData.processing_count || 0) },
      { key: "completed", label: "Выполнены", count: Number(summaryData.completed_count || 0) },
      { key: "rejected", label: "Отклонены", count: Number(summaryData.rejected_count || 0) },
      { key: "failed", label: "Ошибки", count: Number(summaryData.failed_count || 0) },
    ],
    [
      totalCount,
      summaryData.new_count,
      summaryData.review_count,
      summaryData.processing_count,
      summaryData.completed_count,
      summaryData.rejected_count,
      summaryData.failed_count,
    ]
  );

  const kpis = useMemo(
    () => [
      { title: "Всего заявок", value: totalCount, hint: "Количество заявок в центре", tone: "slate" },
      { title: "Новые", value: Number(summaryData.new_count || 0), hint: "pending_validation / created", tone: "amber" },
      { title: "В проверке", value: Number(summaryData.review_count || 0), hint: "requires_review", tone: "amber" },
      { title: "В процессе", value: Number(summaryData.processing_count || 0), hint: "locked / payout flow", tone: "blue" },
      { title: "Выполнены", value: Number(summaryData.completed_count || 0), hint: "completed", tone: "green" },
      { title: "Отклонены", value: Number(summaryData.rejected_count || 0), hint: "canceled / rejected", tone: "red" },
      { title: "Ошибки выплаты", value: Number(summaryData.failed_count || 0), hint: "failed", tone: "red" },
      { title: "Сумма заявок", value: formatMoney(totalAmount, currency), hint: `Валюта: ${currency}`, tone: "slate" },
    ],
    [currency, summaryData, totalAmount, totalCount]
  );

  const selectedRequestDetail = selectedRequest?.withdraw_request || selectedRequest || null;
  const selectedOwner = selectedRequest?.owner || {};
  const selectedDestination = selectedRequest?.destination || null;
  const selectedBalance = selectedRequest?.balance || null;
  const selectedReconciliation = selectedRequest?.reconciliation || null;
  const selectedPayout = selectedRequest?.payout_execution || null;
  const selectedRiskFlags = safeArray(selectedRequest?.risk_flags);
  const selectedActions = safeArray(selectedRequest?.admin_available_actions);
  const selectedAuditEvents = safeArray(selectedRequest?.audit_events);

  function setFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleOpenRequest(requestId) {
    const safeId = String(requestId || "").trim();
    if (!safeId) {
      return;
    }

    setSelectedRequestId(safeId);
    setDetailError("");
  }

  function handleRefresh() {
    void loadSummaryAndRequests();
    if (selectedRequestId) {
      void loadDetail(selectedRequestId);
    }
  }

  const hasToken = Boolean(getAuthToken());

  if (!hasToken) {
    return (
      <div style={{ padding: 20 }}>
        <AdminNavigation />
        <SectionCard
          title={PAGE_LABEL}
          subtitle="Заявки мастеров и салонов на вывод средств"
        >
          <EmptyState title="Требуется вход администратора" subtitle="Для просмотра центра вывода нужен admin Bearer JWT/session." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, background: "#f8fafc" }}>
      <AdminNavigation />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{PAGE_LABEL}</h1>
            <Badge tone="slate">Только чтение</Badge>
          </div>
          <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
            Заявки мастеров и салонов на вывод средств
          </p>
        </div>

        <button type="button" onClick={handleRefresh} disabled={loading || detailLoading}>
          {loading || detailLoading ? "Обновление..." : "Обновить"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 12,
            padding: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          marginTop: 20,
        }}
      >
        {kpis.map((card) => (
          <MetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            hint={card.hint}
            tone={card.tone}
          />
        ))}
      </div>

      <SectionCard
        title="Фильтры"
        subtitle="Фронтенд-фильтры для оперативного просмотра заявок без write-действий."
        extra={<Badge tone="slate">Фильтрация только на клиенте</Badge>}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#374151" }}>Статус</span>
            <select value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
              {tabs.map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {tab.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#374151" }}>Owner type</span>
            <select value={filters.owner_type} onChange={(event) => setFilter("owner_type", event.target.value)}>
              <option value="all">Все</option>
              <option value="salon">salon</option>
              <option value="master">master</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#374151" }}>Поиск по id / owner / slug</span>
            <input
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Например: 22, salon, master-prime"
            />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 22 }}>
            <input
              type="checkbox"
              checked={filters.risk_only}
              onChange={(event) => setFilter("risk_only", event.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Только с рисками</span>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 22 }}>
            <input
              type="checkbox"
              checked={filters.large_amount_only}
              onChange={(event) => setFilter("large_amount_only", event.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Только LARGE_AMOUNT</span>
          </label>
        </div>

        <div style={{ marginTop: 16, color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
          Список фильтруется на фронтенде. Статусы и KPI берутся из read-only summary endpoint.
        </div>
      </SectionCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        {tabs.map((tab) => {
          const active = filters.status === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter("status", tab.key)}
              style={{
                border: "1px solid " + (active ? "#2563eb" : "#d1d5db"),
                background: active ? "#dbeafe" : "#fff",
                color: active ? "#1d4ed8" : "#374151",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {tab.label} <span style={{ opacity: 0.72 }}>({tab.count})</span>
            </button>
          );
        })}
      </div>

      <SectionCard
        title="Заявки"
        subtitle="Клик по карточке открывает read-only detail panel. Никаких статусов и write-кнопок в этой фазе нет."
        extra={<Badge tone="blue">{filteredRequests.length} показано</Badge>}
      >
        {loading ? (
          <EmptyState title="Загрузка заявок…" subtitle="Получаем summary и список withdraw requests." />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title="Заявок на вывод пока нет"
            subtitle="Попробуйте сменить фильтр или обновить данные."
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredRequests.map((request) => {
              const detail = request.detail || (selectedRequest && String(selectedRequest?.withdraw_request?.id || selectedRequest?.id || "") === String(request.id) ? selectedRequest : null);
              const ownerLabel = buildOwnerLabel(request, detail);
              const destinationSummary = buildDestinationSummary(request, detail);
              const riskFlags = safeArray(request?.risk_flags);
              const active = String(selectedRequestId) === String(request.id);

              return (
                <article
                  key={request.id}
                  style={{
                    border: `1px solid ${active ? "#60a5fa" : "#e5e7eb"}`,
                    background: active ? "#eff6ff" : "#fff",
                    borderRadius: 18,
                    padding: 16,
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 420px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Badge tone="slate">#{request.id}</Badge>
                        <Badge tone={getStatusTone(request.status)}>{getAdminStatusLabel(request.status, request.admin_status_label)}</Badge>
                        <Badge tone="blue">{getUserStatusLabel(request.status, request.user_status_label)}</Badge>
                        {riskFlags.length ? <Badge tone="amber">Риски: {riskFlags.length}</Badge> : null}
                      </div>

                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{ownerLabel}</div>
                        <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
                          {request.owner_type} · owner_id={request.owner_id} · {destinationSummary}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 12,
                        }}
                      >
                        <Field label="Сумма" value={formatMoney(request.amount, request.currency || currency)} />
                        <Field label="Locked amount" value={formatMoney(request.locked_amount, request.currency || currency)} />
                        <Field label="Создано" value={formatDateTime(request.created_at)} />
                        <Field label="Обновлено" value={formatDateTime(request.updated_at)} />
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {riskFlags.length ? (
                          riskFlags.map((flag) => (
                            <Badge key={flag} tone={getRiskTone(flag)}>
                              {flag}
                            </Badge>
                          ))
                        ) : (
                          <Badge tone="green">Рисков не найдено</Badge>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <button type="button" onClick={() => handleOpenRequest(request.id)}>
                        Открыть
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div ref={detailRef} style={{ marginTop: 20 }}>
        <SectionCard
          title="Детали заявки"
          subtitle="Полностью read-only карточка с балансом, сверкой, payout proof и аудитом."
          extra={selectedRequestId ? <Badge tone="blue">ID #{selectedRequestId}</Badge> : null}
        >
          {!selectedRequestId ? (
            <EmptyState title="Выберите заявку для просмотра" subtitle="После выбора откроется detail panel без изменения маршрута." />
          ) : detailLoading ? (
            <EmptyState title="Загрузка заявки…" subtitle="Получаем detail по withdraw_request_id." />
          ) : detailError ? (
            <EmptyState title={detailError} subtitle="Попробуйте выбрать другую заявку или обновить страницу." />
          ) : !selectedRequestDetail ? (
            <EmptyState title="Заявка не найдена" subtitle="Проверьте выбранный ID." />
          ) : (
            <div style={{ display: "grid", gap: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                <SectionCard title="Заявка">
                  <div style={{ display: "grid", gap: 14 }}>
                    <Field label="ID" value={textValue(selectedRequestDetail.id)} mono />
                    <Field label="Status" value={textValue(selectedRequestDetail.status)} />
                    <Field label="Admin label" value={textValue(selectedRequestDetail.admin_status_label)} />
                    <Field label="User label" value={textValue(selectedRequestDetail.user_status_label)} />
                    <Field label="Amount" value={formatMoney(selectedRequestDetail.amount, selectedRequestDetail.currency || currency)} />
                    <Field label="Created at" value={formatDateTime(selectedRequestDetail.created_at)} />
                    <Field label="Updated at" value={formatDateTime(selectedRequestDetail.updated_at)} />
                    <Field label="Admin note" value={textValue(selectedRequestDetail.admin_note)} wrap />
                    <Field label="Failure reason" value={textValue(selectedRequestDetail.failure_reason)} wrap />
                    <Field label="Creation mode" value={textValue(selectedRequestDetail.creation_mode)} />
                    <Field label="Decision" value={textValue(selectedRequestDetail.decision)} />
                    <Field label="Risk level" value={textValue(selectedRequestDetail.risk_level)} />
                    <Field label="Decision reasons" value={textValue(selectedRequestDetail.decision_reasons)} wrap />
                  </div>
                </SectionCard>

                <SectionCard title="Владелец">
                  <div style={{ display: "grid", gap: 14 }}>
                    <Field label="owner_type" value={textValue(selectedOwner.owner_type || selectedRequestDetail.owner_type)} />
                    <Field label="owner_id" value={textValue(selectedOwner.owner_id || selectedRequestDetail.owner_id)} mono />
                    <Field label="owner_slug" value={textValue(selectedOwner.owner_slug)} />
                    <Field label="owner_name" value={textValue(selectedOwner.owner_name)} />
                  </div>
                </SectionCard>

                <SectionCard title="Реквизиты">
                  <div style={{ display: "grid", gap: 14 }}>
                    <Field label="destination_id" value={textValue(selectedDestination?.destination_id || selectedRequestDetail.destination_id)} mono />
                    <Field label="method" value={textValue(selectedDestination?.method)} />
                    <Field label="provider_code" value={textValue(selectedDestination?.provider_code)} />
                    <Field label="wallet_provider" value={textValue(selectedDestination?.wallet_provider)} />
                    <Field label="phone" value={textValue(selectedDestination?.phone)} />
                    <Field label="bank_name" value={textValue(selectedDestination?.bank_name)} />
                    <Field label="account_masked" value={textValue(selectedDestination?.account_masked)} />
                    <Field label="card_last4" value={textValue(selectedDestination?.card_last4)} />
                    <Field label="account_holder" value={textValue(selectedDestination?.account_holder)} />
                    <Field label="destination_relation" value={textValue(selectedDestination?.destination_relation)} />
                    <Field label="destination status" value={textValue(selectedDestination?.status)} />
                    <Field label="created_at" value={formatDateTime(selectedDestination?.created_at)} />
                    <Field label="updated_at" value={formatDateTime(selectedDestination?.updated_at)} />
                  </div>
                </SectionCard>

                <SectionCard title="Баланс">
                  <div style={{ display: "grid", gap: 14 }}>
                    <Field label="available" value={formatMoney(selectedBalance?.available, selectedRequestDetail.currency || currency)} />
                    <Field label="locked" value={formatMoney(selectedBalance?.locked, selectedRequestDetail.currency || currency)} />
                    <Field label="paid_out" value={formatMoney(selectedBalance?.paid_out, selectedRequestDetail.currency || currency)} />
                    <Field label="provider_hold" value={formatMoney(selectedBalance?.provider_hold, selectedRequestDetail.currency || currency)} />
                    <Field label="pending_settlement" value={formatMoney(selectedBalance?.pending_settlement, selectedRequestDetail.currency || currency)} />
                    <Field label="requires_review" value={formatMoney(selectedBalance?.requires_review, selectedRequestDetail.currency || currency)} />
                    <Field label="updated_at" value={formatDateTime(selectedBalance?.updated_at)} />
                  </div>
                </SectionCard>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                <SectionCard title="Сверка">
                  <div style={{ display: "grid", gap: 14 }}>
                    <Field label="owner_matches" value={String(Boolean(selectedReconciliation?.owner_matches))} />
                    <Field label="destination_matches" value={String(Boolean(selectedReconciliation?.destination_matches))} />
                    <Field label="amount_matches_locked" value={String(Boolean(selectedReconciliation?.amount_matches_locked))} />
                    <Field label="lock_ledger_found" value={String(Boolean(selectedReconciliation?.lock_ledger_found))} />
                    <Field label="payout_execution_found" value={String(Boolean(selectedReconciliation?.payout_execution_found))} />
                    <Field label="paid_out_evidence_found" value={String(Boolean(selectedReconciliation?.paid_out_evidence_found))} />
                    <Field label="has_mismatch" value={String(Boolean(selectedReconciliation?.has_mismatch))} />
                  </div>
                </SectionCard>

                <SectionCard title="Payout proof">
                  {selectedPayout ? (
                    <div style={{ display: "grid", gap: 14 }}>
                      <Field label="id" value={textValue(selectedPayout.id)} mono />
                      <Field label="status" value={textValue(selectedPayout.status)} />
                      <Field label="payout_provider" value={textValue(selectedPayout.payout_provider)} />
                      <Field label="payout_mode" value={textValue(selectedPayout.payout_mode)} />
                      <Field label="amount" value={formatMoney(selectedPayout.amount, selectedPayout.currency || selectedRequestDetail.currency || currency)} />
                      <Field label="external_ref" value={textValue(selectedPayout.external_ref)} wrap />
                      <Field label="bank_reference" value={textValue(selectedPayout.bank_reference)} wrap />
                      <Field label="receipt_url" value={textValue(selectedPayout.receipt_url)} wrap />
                      <Field label="submitted_at" value={formatDateTime(selectedPayout.submitted_at)} />
                      <Field label="completed_at" value={formatDateTime(selectedPayout.completed_at)} />
                      <Field label="failed_at" value={formatDateTime(selectedPayout.failed_at)} />
                      <Field label="failure_reason" value={textValue(selectedPayout.failure_reason)} wrap />
                    </div>
                  ) : (
                    <EmptyState title="Payout proof отсутствует" subtitle="Для этой заявки payout_execution ещё не найден." />
                  )}
                </SectionCard>
              </div>

              <SectionCard title="Risk flags">
                {selectedRiskFlags.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedRiskFlags.map((flag) => (
                      <Badge key={flag} tone={getRiskTone(flag)}>
                        {flag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Risk flags отсутствуют" subtitle="Сигналы риска для заявки не найдены." />
                )}
              </SectionCard>

              <SectionCard title="Audit events">
                {selectedAuditEvents.length ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {selectedAuditEvents.map((event, index) => (
                      <div
                        key={event.id || `${event.event_type || "audit"}-${index}`}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 14,
                          padding: 14,
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          <Badge tone="slate">{textValue(event.event_type)}</Badge>
                          <Badge tone="blue">{textValue(event.actor_type)}</Badge>
                          <Badge tone="slate">{textValue(event.owner_type)}</Badge>
                          <Badge tone="slate">{textValue(event.source_type)}</Badge>
                          <Badge tone="slate">#{textValue(event.source_id)}</Badge>
                        </div>
                        <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
                          {formatDateTime(event.created_at)}
                        </div>
                        {event.data ? (
                          <pre
                            style={{
                              marginTop: 10,
                              padding: 12,
                              borderRadius: 12,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              overflowX: "auto",
                              fontSize: 12,
                              lineHeight: 1.5,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Audit events отсутствуют" subtitle="Для этой заявки не найдено записей money_audit_events." />
                )}
              </SectionCard>

              <SectionCard
                title="Действия администратора"
                subtitle="Безопасные действия: claim, reject, comment. Деньги не меняются."
              >
                <div style={{ display: "grid", gap: 14 }}>
                  {actionError ? (
                    <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}>
                      {actionError}
                    </div>
                  ) : null}

                  {actionSuccess ? (
                    <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0" }}>
                      {actionSuccess}
                    </div>
                  ) : null}

                  {selectedActionSet.size ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      {selectedActionSet.has("claim") ? (
                        <button
                          type="button"
                          onClick={handleClaimAction}
                          disabled={Boolean(actionLoading)}
                          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #0f766e", background: "#0f766e", color: "#fff" }}
                        >
                          {actionLoading === "claim" ? "Выполняется…" : "Взять в проверку"}
                        </button>
                      ) : null}

                      {selectedActionSet.has("reject") ? (
                        <button
                          type="button"
                          onClick={() => openActionForm("reject")}
                          disabled={Boolean(actionLoading)}
                          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #b91c1c", background: "#fff", color: "#b91c1c" }}
                        >
                          Отклонить
                        </button>
                      ) : null}

                      {selectedActionSet.has("comment") ? (
                        <button
                          type="button"
                          onClick={() => openActionForm("comment")}
                          disabled={Boolean(actionLoading)}
                          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #334155", background: "#fff", color: "#334155" }}
                        >
                          Комментарий
                        </button>
                      ) : null}

                      {selectedActionSet.has("start_processing") ? (
                        <button
                          type="button"
                          onClick={() => openActionForm("start_processing")}
                          disabled={Boolean(actionLoading)}
                          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#fff" }}
                        >
                          {actionLoading === "start_processing" ? "Выполняется…" : "Начать обработку"}
                        </button>
                      ) : null}

                      {selectedActionSet.has("complete") ? (
                        <button
                          type="button"
                          onClick={() => openActionForm("complete")}
                          disabled={Boolean(actionLoading)}
                          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #166534", background: "#16a34a", color: "#fff" }}
                        >
                          {actionLoading === "complete" ? "Выполняется…" : "Завершить выплату"}
                        </button>
                      ) : null}

                      {selectedActionSet.has("fail") ? (
                        <button
                          type="button"
                          onClick={() => openActionForm("fail")}
                          disabled={Boolean(actionLoading)}
                          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #b91c1c", background: "#fee2e2", color: "#991b1b" }}
                        >
                          {actionLoading === "fail" ? "Выполняется…" : "Отметить как неуспешную"}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState title="Активных действий нет" subtitle="Для текущего статуса нет доступных безопасных admin actions." />
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {["start_processing", "return_to_review"].concat(selectedActionSet.has("complete") ? [] : ["complete"]).concat(selectedActionSet.has("fail") ? [] : ["fail"]).map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled
                        title="Сейчас недоступно"
                        style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: "1px dashed #cbd5e1",
                          background: "#f8fafc",
                          color: "#64748b",
                          cursor: "not-allowed",
                        }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>

                  {actionForm.action ? (
                    <form
                      onSubmit={handleSubmitActionForm}
                      style={{
                        display: "grid",
                        gap: 12,
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 16,
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        {actionForm.action === "start_processing" ? (
                          <>
                            <strong style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 12, color: "#334155" }}>
                              Начать обработку
                            </strong>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>payout_provider</span>
                              <input
                                value={actionForm.payoutProvider}
                                onChange={(event) => setActionForm((current) => ({ ...current, payoutProvider: event.target.value }))}
                                placeholder="Например: manual"
                                disabled={Boolean(actionLoading)}
                                style={{
                                  width: "100%",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  padding: 12,
                                  font: "inherit",
                                }}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>internal_note</span>
                              <textarea
                                value={actionForm.internalNote}
                                onChange={(event) => setActionForm((current) => ({ ...current, internalNote: event.target.value }))}
                                rows={4}
                                placeholder="Внутренняя заметка (необязательно)"
                                disabled={Boolean(actionLoading)}
                                style={{
                                  width: "100%",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  padding: 12,
                                  font: "inherit",
                                  resize: "vertical",
                                  minHeight: 110,
                                }}
                              />
                            </label>
                          </>
                        ) : actionForm.action === "complete" ? (
                          <>
                            <strong style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 12, color: "#166534" }}>
                              Завершить выплату
                            </strong>
                            <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0", fontSize: 13, lineHeight: 1.5 }}>
                              Это изменит ledger/balance.
                            </div>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>external_ref</span>
                              <input
                                value={actionForm.externalRef}
                                onChange={(event) => setActionForm((current) => ({ ...current, externalRef: event.target.value }))}
                                placeholder="Внешний референс платежа"
                                disabled={Boolean(actionLoading)}
                                style={{
                                  width: "100%",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  padding: 12,
                                  font: "inherit",
                                }}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>bank_reference</span>
                              <input
                                value={actionForm.bankReference}
                                onChange={(event) => setActionForm((current) => ({ ...current, bankReference: event.target.value }))}
                                placeholder="Банковский reference"
                                disabled={Boolean(actionLoading)}
                                style={{
                                  width: "100%",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  padding: 12,
                                  font: "inherit",
                                }}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>receipt_url</span>
                              <input
                                value={actionForm.receiptUrl}
                                onChange={(event) => setActionForm((current) => ({ ...current, receiptUrl: event.target.value }))}
                                placeholder="Необязательно"
                                disabled={Boolean(actionLoading)}
                                style={{
                                  width: "100%",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  padding: 12,
                                  font: "inherit",
                                }}
                              />
                            </label>
                            <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <input
                                type="checkbox"
                                checked={Boolean(actionForm.moneySentConfirmed)}
                                onChange={(event) => setActionForm((current) => ({ ...current, moneySentConfirmed: event.target.checked }))}
                                disabled={Boolean(actionLoading)}
                                style={{ marginTop: 4 }}
                              />
                              <span style={{ fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
                                Деньги отправлены
                              </span>
                            </label>
                          </>
                        ) : actionForm.action === "fail" ? (
                          <>
                            <strong style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 12, color: "#991b1b" }}>
                              Отметить как неуспешную
                            </strong>
                            <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontSize: 13, lineHeight: 1.5 }}>
                              Это изменит ledger/balance.
                            </div>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>failure_reason</span>
                              <textarea
                                value={actionForm.failureReason}
                                onChange={(event) => setActionForm((current) => ({ ...current, failureReason: event.target.value }))}
                                rows={4}
                                placeholder="Причина неуспешной выплаты"
                                disabled={Boolean(actionLoading)}
                                style={{
                                  width: "100%",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  padding: 12,
                                  font: "inherit",
                                  resize: "vertical",
                                  minHeight: 110,
                                }}
                              />
                            </label>
                            <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <input
                                type="checkbox"
                                checked={Boolean(actionForm.moneyNotSentConfirmed)}
                                onChange={(event) => setActionForm((current) => ({ ...current, moneyNotSentConfirmed: event.target.checked }))}
                                disabled={Boolean(actionLoading)}
                                style={{ marginTop: 4 }}
                              />
                              <span style={{ fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
                                Деньги НЕ отправлены / нужно вернуть locked balance
                              </span>
                            </label>
                          </>
                        ) : (
                          <>
                            <strong style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 12, color: "#334155" }}>
                              {actionForm.action === "reject" ? "Причина отклонения" : "Комментарий"}
                            </strong>
                            <textarea
                              value={actionForm.value}
                              onChange={(event) => setActionForm((current) => ({ ...current, value: event.target.value }))}
                              rows={4}
                              placeholder={actionForm.action === "reject" ? "Опишите причину отклонения" : "Добавьте внутренний комментарий"}
                              disabled={Boolean(actionLoading)}
                              style={{
                                width: "100%",
                                borderRadius: 12,
                                border: "1px solid #cbd5e1",
                                padding: 12,
                                font: "inherit",
                                resize: "vertical",
                                minHeight: 110,
                              }}
                            />
                          </>
                        )}
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button
                          type="submit"
                          disabled={Boolean(actionLoading) || (actionForm.action === "complete" ? !completeActionReady : actionForm.action === "fail" ? !failActionReady : false)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #1d4ed8",
                            background: "#1d4ed8",
                            color: "#fff",
                          }}
                        >
                          {actionLoading === actionForm.action
                            ? "Сохранение…"
                            : actionForm.action === "start_processing"
                              ? "Начать обработку"
                              : actionForm.action === "complete"
                                ? "Подтвердить выплату"
                                : actionForm.action === "fail"
                                  ? "Отметить как неуспешную"
                                  : "Сохранить"}
                        </button>
                        <button
                          type="button"
                          onClick={closeActionForm}
                          disabled={Boolean(actionLoading)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#334155",
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </SectionCard>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
