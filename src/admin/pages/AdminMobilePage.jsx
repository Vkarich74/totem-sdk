import { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavigation from "../AdminNavigation";

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "");

function getAuthToken() {
  try {
    return String(
      window.localStorage.getItem("TOTEM_AUTH_TOKEN") ||
        window.localStorage.getItem("TOTEM_ACCESS_TOKEN") ||
        "",
    ).trim();
  } catch {
    return "";
  }
}

async function fetchJson(path, init = {}) {
  const token = getAuthToken();
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
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
    const code = payload?.error || payload?.message || `HTTP_${response.status}`;
    throw new Error(code);
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

function textValue(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();

  const map = {
    new: "Новый",
    reviewed: "Проверен",
    closed: "Закрыт",
    spam: "Спам",
    active: "Активен",
    planned: "Запланирован",
    disabled: "Отключён",
    recorded: "Записано",
    none: "Без награды",
    pending: "Ожидает",
    granted: "Начислено",
    failed: "Сбой",
    link_opened: "Открытие ссылки",
    booking_started: "Старт записи",
    data_access: "Доступ к данным",
    data_delete: "Удаление данных",
    data_export: "Экспорт данных",
    other: "Другое",
  };

  return map[value] || textValue(status);
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
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </span>
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

function SummaryCard({ title, value, hint }) {
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
                      minWidth: column.minWidth || "auto",
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

function getFlagKey(row) {
  return String(row?.flag_key || "").trim();
}

function getFlagDraft(row) {
  return {
    enabled: Boolean(row?.enabled),
    status: String(row?.status || "planned").trim(),
  };
}

function getCrmRouting(row) {
  const crm = row?.payload_json?.routing?.crm;
  return crm && typeof crm === "object" ? crm : null;
}

function sanitizeRewardStatus(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return ["none", "pending", "approved", "rejected", "cancelled"].includes(raw) ? raw : "none";
}

function getMobileEventTarget(row) {
  return textValue(row?.target_slug || row?.target_id);
}

export default function AdminMobilePage() {
  const token = getAuthToken();
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [overview, setOverview] = useState(null);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [dataRequestItems, setDataRequestItems] = useState([]);
  const [referralLinks, setReferralLinks] = useState([]);
  const [referralEvents, setReferralEvents] = useState([]);
  const [mobileEvents, setMobileEvents] = useState([]);
  const [flags, setFlags] = useState([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [dataRequestDrafts, setDataRequestDrafts] = useState({});
  const [rewardDrafts, setRewardDrafts] = useState({});
  const [flagDrafts, setFlagDrafts] = useState({});
  const [savingKey, setSavingKey] = useState("");
  const [savingRewardEventId, setSavingRewardEventId] = useState("");

  const loadAll = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const responses = await Promise.allSettled([
      fetchJson("/internal/admin/mobile/overview"),
      fetchJson("/internal/admin/mobile/feedback?limit=50&offset=0"),
      fetchJson("/internal/admin/mobile/data-requests?limit=50&offset=0"),
      fetchJson("/internal/admin/mobile/referrals?limit=50&offset=0"),
      fetchJson("/internal/admin/mobile/referral-events?limit=50&offset=0"),
      fetchJson("/internal/admin/mobile/events?limit=50&offset=0"),
      fetchJson("/internal/admin/mobile/flags"),
    ]);

    const failures = [];

    const overviewRes = responses[0];
    if (overviewRes.status === "fulfilled") {
      setOverview(overviewRes.value?.data || null);
    } else {
      failures.push(String(overviewRes.reason?.message || overviewRes.reason || "ADMIN_MOBILE_OVERVIEW_FAILED"));
    }

    const feedbackRes = responses[1];
    if (feedbackRes.status === "fulfilled") {
      const items = Array.isArray(feedbackRes.value?.data?.items) ? feedbackRes.value.data.items : [];
      setFeedbackItems(items);
      setFeedbackDrafts(
        items.reduce((acc, item) => {
          acc[String(item.id)] = String(item.status || "new");
          return acc;
        }, {}),
      );
    } else {
      failures.push(String(feedbackRes.reason?.message || feedbackRes.reason || "ADMIN_MOBILE_FEEDBACK_FAILED"));
    }

    const dataRequestsRes = responses[2];
    if (dataRequestsRes.status === "fulfilled") {
      const items = Array.isArray(dataRequestsRes.value?.data?.items) ? dataRequestsRes.value.data.items : [];
      setDataRequestItems(items);
      setDataRequestDrafts(
        items.reduce((acc, item) => {
          acc[String(item.id)] = String(item.status || "new");
          return acc;
        }, {}),
      );
    } else {
      failures.push(String(dataRequestsRes.reason?.message || dataRequestsRes.reason || "ADMIN_MOBILE_DATA_REQUESTS_FAILED"));
    }

    const referralsRes = responses[3];
    if (referralsRes.status === "fulfilled") {
      setReferralLinks(Array.isArray(referralsRes.value?.data?.items) ? referralsRes.value.data.items : []);
    } else {
      failures.push(String(referralsRes.reason?.message || referralsRes.reason || "ADMIN_MOBILE_REFERRALS_FAILED"));
    }

    const referralEventsRes = responses[4];
    if (referralEventsRes.status === "fulfilled") {
      setReferralEvents(Array.isArray(referralEventsRes.value?.data?.items) ? referralEventsRes.value.data.items : []);
    } else {
      failures.push(String(referralEventsRes.reason?.message || referralEventsRes.reason || "ADMIN_MOBILE_REFERRAL_EVENTS_FAILED"));
    }

    const mobileEventsRes = responses[5];
    if (mobileEventsRes.status === "fulfilled") {
      setMobileEvents(Array.isArray(mobileEventsRes.value?.data?.items) ? mobileEventsRes.value.data.items : []);
    } else {
      failures.push(String(mobileEventsRes.reason?.message || mobileEventsRes.reason || "ADMIN_MOBILE_EVENTS_FAILED"));
    }

    const flagsRes = responses[6];
    if (flagsRes.status === "fulfilled") {
      const items = Array.isArray(flagsRes.value?.data?.items) ? flagsRes.value.data.items : [];
      setFlags(items);
      setFlagDrafts(
        items.reduce((acc, item) => {
          acc[getFlagKey(item)] = getFlagDraft(item);
          return acc;
        }, {}),
      );
    } else {
      failures.push(String(flagsRes.reason?.message || flagsRes.reason || "ADMIN_MOBILE_FLAGS_FAILED"));
    }

    if (failures.length) {
      setError(failures[0]);
    } else {
      setError("");
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const syncRewardDrafts = useCallback((items) => {
    const nextDrafts = {};

    items.forEach((item) => {
      if (item?.id !== undefined && item?.id !== null) {
        nextDrafts[String(item.id)] = sanitizeRewardStatus(item?.reward_status);
      }
    });

    setRewardDrafts(nextDrafts);
  }, []);

  useEffect(() => {
    syncRewardDrafts(referralEvents);
  }, [referralEvents, syncRewardDrafts]);

  const stats = useMemo(() => {
    const flagsActive = flags.filter((item) => String(item?.status || "").toLowerCase() === "active").length;

    return [
      {
        title: "Feedback всего",
        value: overview?.feedback?.total_count ?? feedbackItems.length,
        hint: "Обращения из mobile HelpBlock",
      },
      {
        title: "Запросы данных всего",
        value: overview?.data_requests?.total_count ?? dataRequestItems.length,
        hint: "Запросы по данным и приватности",
      },
      {
        title: "Referral events",
        value: overview?.referrals?.events_total ?? referralEvents.length,
        hint: "События открытия и старта записи",
      },
      {
        title: "Активные флаги",
        value: overview?.flags?.active_count ?? flagsActive,
        hint: `Всего: ${overview?.flags?.total_count ?? flags.length}`,
      },
      {
        title: "Уведомления",
        value: overview?.notifications?.total_count ?? 0,
        hint: "Сводка notifications",
      },
      {
        title: "Анонсы",
        value: overview?.announcements?.total_count ?? 0,
        hint: "Сводка announcements",
      },
    ];
  }, [overview, feedbackItems.length, dataRequestItems.length, referralEvents.length, flags]);

  const feedbackColumns = useMemo(
    () => [
      { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
      {
        key: "status",
        title: "Статус",
        dataIndex: "status",
        minWidth: 130,
        render: (value) => <Pill tone={String(value) === "spam" ? "red" : String(value) === "closed" ? "neutral" : String(value) === "reviewed" ? "green" : "blue"}>{statusLabel(value)}</Pill>,
      },
      { key: "country_code", title: "Страна", dataIndex: "country_code", minWidth: 100 },
      { key: "city_slug", title: "Город", dataIndex: "city_slug", minWidth: 120 },
      {
        key: "message",
        title: "Сообщение",
        dataIndex: "message",
        minWidth: 280,
        render: (value) => <span style={{ wordBreak: "break-word" }}>{textValue(value)}</span>,
      },
      {
        key: "created_at",
        title: "Создано",
        dataIndex: "created_at",
        minWidth: 160,
        render: (value) => formatDateTime(value),
      },
      {
        key: "action",
        title: "Действие",
        dataIndex: "action",
        minWidth: 230,
        render: (_, row) => {
          const key = String(row.id);
          const draft = feedbackDrafts[key] || String(row.status || "new");
          const saving = savingKey === `feedback:${key}` || savingKey === `feedback-crm:${key}`;
          const crmRouting = getCrmRouting(row);

          return (
            <div style={{ display: "grid", gap: 8 }}>
              {crmRouting?.lead_db_id ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>CRM: lead #{crmRouting.lead_db_id}</div>
              ) : null}
              <select
                value={draft}
                disabled={saving}
                onChange={(event) => setFeedbackDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                <option value="new">Новый</option>
                <option value="reviewed">Проверен</option>
                <option value="closed">Закрыт</option>
                <option value="spam">Спам</option>
              </select>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSavingKey(`feedback:${key}`);
                  setError("");
                  try {
                    await fetchJson(`/internal/admin/mobile/feedback/${row.id}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: draft }),
                    });
                    await loadAll();
                    setSuccess("Сохранено");
                  } catch (nextError) {
                    setError(String(nextError?.message || nextError || "ADMIN_MOBILE_FEEDBACK_SAVE_FAILED"));
                  } finally {
                    setSavingKey("");
                  }
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Сохранить
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSavingKey(`feedback-crm:${key}`);
                  setError("");
                  try {
                    const result = await fetchJson(`/internal/admin/mobile/feedback/${row.id}/route-crm`, {
                      method: "POST",
                    });
                    await loadAll();
                    setSuccess(result?.data?.routing?.routing_status === "existing" ? "CRM routing уже был выполнен" : "CRM routing выполнен");
                  } catch (nextError) {
                    setError(String(nextError?.message || nextError || "ADMIN_MOBILE_FEEDBACK_ROUTE_CRM_FAILED"));
                  } finally {
                    setSavingKey("");
                  }
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                В CRM
              </button>
            </div>
          );
        },
      },
    ],
    [feedbackDrafts, loadAll, savingKey],
  );

  const dataRequestColumns = useMemo(
    () => [
      { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
      {
        key: "request_type",
        title: "Тип",
        dataIndex: "request_type",
        minWidth: 160,
        render: (value) => <span>{statusLabel(value)}</span>,
      },
      {
        key: "status",
        title: "Статус",
        dataIndex: "status",
        minWidth: 130,
        render: (value) => <Pill tone={String(value) === "spam" ? "red" : String(value) === "closed" ? "neutral" : String(value) === "reviewed" ? "green" : "blue"}>{statusLabel(value)}</Pill>,
      },
      {
        key: "contact_email",
        title: "Email",
        dataIndex: "contact_email",
        minWidth: 220,
        render: (value, row) => (
          <div style={{ display: "grid", gap: 4 }}>
            <span>{textValue(value)}</span>
            {row.contact_phone ? <span style={{ color: "#6b7280", fontSize: 12 }}>{textValue(row.contact_phone)}</span> : null}
          </div>
        ),
      },
      { key: "country_code", title: "Страна", dataIndex: "country_code", minWidth: 100 },
      { key: "city_slug", title: "Город", dataIndex: "city_slug", minWidth: 120 },
      {
        key: "message",
        title: "Сообщение",
        dataIndex: "message",
        minWidth: 280,
        render: (value) => <span style={{ wordBreak: "break-word" }}>{textValue(value)}</span>,
      },
      {
        key: "created_at",
        title: "Создано",
        dataIndex: "created_at",
        minWidth: 160,
        render: (value) => formatDateTime(value),
      },
      {
        key: "action",
        title: "Действие",
        dataIndex: "action",
        minWidth: 230,
        render: (_, row) => {
          const key = String(row.id);
          const draft = dataRequestDrafts[key] || String(row.status || "new");
          const saving = savingKey === `data:${key}` || savingKey === `data-crm:${key}`;
          const crmRouting = getCrmRouting(row);

          return (
            <div style={{ display: "grid", gap: 8 }}>
              {crmRouting?.lead_db_id ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>CRM: lead #{crmRouting.lead_db_id}</div>
              ) : null}
              <select
                value={draft}
                disabled={saving}
                onChange={(event) => setDataRequestDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                <option value="new">Новый</option>
                <option value="reviewed">Проверен</option>
                <option value="closed">Закрыт</option>
                <option value="spam">Спам</option>
              </select>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSavingKey(`data:${key}`);
                  setError("");
                  try {
                    await fetchJson(`/internal/admin/mobile/data-requests/${row.id}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: draft }),
                    });
                    await loadAll();
                    setSuccess("Сохранено");
                  } catch (nextError) {
                    setError(String(nextError?.message || nextError || "ADMIN_MOBILE_DATA_REQUEST_SAVE_FAILED"));
                  } finally {
                    setSavingKey("");
                  }
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Сохранить
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSavingKey(`data-crm:${key}`);
                  setError("");
                  try {
                    const result = await fetchJson(`/internal/admin/mobile/data-requests/${row.id}/route-crm`, {
                      method: "POST",
                    });
                    await loadAll();
                    setSuccess(result?.data?.routing?.routing_status === "existing" ? "CRM routing уже был выполнен" : "CRM routing выполнен");
                  } catch (nextError) {
                    setError(String(nextError?.message || nextError || "ADMIN_MOBILE_DATA_REQUEST_ROUTE_CRM_FAILED"));
                  } finally {
                    setSavingKey("");
                  }
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                В CRM
              </button>
            </div>
          );
        },
      },
    ],
    [dataRequestDrafts, loadAll, savingKey],
  );

  const referralLinkColumns = useMemo(
    () => [
      { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
      { key: "referral_code", title: "Code", dataIndex: "referral_code", minWidth: 180 },
      {
        key: "status",
        title: "Статус",
        dataIndex: "status",
        minWidth: 120,
        render: (value) => <Pill tone={String(value) === "active" ? "green" : "neutral"}>{statusLabel(value)}</Pill>,
      },
      { key: "country_code", title: "Страна", dataIndex: "country_code", minWidth: 100 },
      { key: "created_at", title: "Создано", dataIndex: "created_at", minWidth: 160, render: (value) => formatDateTime(value) },
    ],
    [],
  );

  const referralEventColumns = useMemo(
    () => [
      { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
      { key: "referral_code", title: "Code", dataIndex: "referral_code", minWidth: 180 },
      { key: "event_type", title: "Тип события", dataIndex: "event_type", minWidth: 160, render: (value) => statusLabel(value) },
      {
        key: "reward_status",
        title: "Reward",
        dataIndex: "reward_status",
        minWidth: 260,
        render: (_, row) => {
          const key = String(row.id);
          const draft = sanitizeRewardStatus(rewardDrafts[key] ?? row.reward_status);
          const saving = savingRewardEventId === key;

          return (
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={draft}
                disabled={saving}
                onChange={(event) => setRewardDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                <option value="none">Нет награды</option>
                <option value="pending">Ожидает</option>
                <option value="approved">Одобрено</option>
                <option value="rejected">Отклонено</option>
                <option value="cancelled">Отменено</option>
              </select>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSavingRewardEventId(key);
                  setError("");
                  try {
                    await fetchJson(`/internal/admin/mobile/referral-events/${row.id}/reward-status`, {
                      method: "PATCH",
                      body: JSON.stringify({ reward_status: sanitizeRewardStatus(draft) }),
                    });
                    await loadAll();
                    setSuccess("Сохранено");
                  } catch (nextError) {
                    setError(String(nextError?.message || nextError || "ADMIN_MOBILE_REFERRAL_REWARD_SAVE_FAILED"));
                  } finally {
                    setSavingRewardEventId("");
                  }
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Сохранить
              </button>
            </div>
          );
        },
      },
      {
        key: "status",
        title: "Статус",
        dataIndex: "status",
        minWidth: 120,
        render: (value) => <Pill tone={String(value) === "recorded" ? "blue" : "neutral"}>{statusLabel(value)}</Pill>,
      },
      { key: "country_code", title: "Страна", dataIndex: "country_code", minWidth: 100 },
      { key: "created_at", title: "Создано", dataIndex: "created_at", minWidth: 160, render: (value) => formatDateTime(value) },
    ],
    [loadAll, rewardDrafts, savingRewardEventId],
  );

  const mobileEventColumns = useMemo(
    () => [
      { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
      { key: "event_type", title: "Тип события", dataIndex: "event_type", minWidth: 150, render: (value) => statusLabel(value) },
      { key: "source", title: "Источник", dataIndex: "source", minWidth: 130, render: (value) => textValue(value) },
      { key: "country_code", title: "Страна", dataIndex: "country_code", minWidth: 110, render: (value) => textValue(value) },
      { key: "city_slug", title: "Город", dataIndex: "city_slug", minWidth: 120, render: (value) => textValue(value) },
      { key: "target_type", title: "Тип цели", dataIndex: "target_type", minWidth: 120, render: (value) => textValue(value) },
      { key: "target", title: "Цель", dataIndex: "target_id", minWidth: 170, render: (_, row) => getMobileEventTarget(row) },
      { key: "route", title: "Маршрут", dataIndex: "route", minWidth: 240, render: (value) => <span style={{ wordBreak: "break-word" }}>{textValue(value)}</span> },
      {
        key: "status",
        title: "Статус",
        dataIndex: "status",
        minWidth: 110,
        render: (value) => <Pill tone={String(value || "").toLowerCase() === "sent" ? "green" : "neutral"}>{textValue(value)}</Pill>,
      },
      { key: "created_at", title: "Создано", dataIndex: "created_at", minWidth: 160, render: (value) => formatDateTime(value) },
    ],
    [],
  );

  const flagColumns = useMemo(
    () => [
      { key: "flag_key", title: "flag_key", dataIndex: "flag_key", minWidth: 220 },
      {
        key: "enabled",
        title: "enabled",
        dataIndex: "enabled",
        minWidth: 100,
        render: (_value, row) => {
          const key = getFlagKey(row);
          const draft = flagDrafts[key] || getFlagDraft(row);
          const saving = savingKey === `flag:${key}`;

          return (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={Boolean(draft.enabled)}
                disabled={saving}
                onChange={(event) =>
                  setFlagDrafts((prev) => ({
                    ...prev,
                    [key]: {
                      ...draft,
                      enabled: event.target.checked,
                    },
                  }))
                }
              />
              <span>{draft.enabled ? "Да" : "Нет"}</span>
            </label>
          );
        },
      },
      {
        key: "status",
        title: "status",
        dataIndex: "status",
        minWidth: 160,
        render: (value, row) => {
          const key = getFlagKey(row);
          const draft = flagDrafts[key] || getFlagDraft(row);
          const saving = savingKey === `flag:${key}`;

          return (
            <select
              value={String(draft.status || value || "planned")}
              disabled={saving}
              onChange={(event) =>
                setFlagDrafts((prev) => ({
                  ...prev,
                  [key]: {
                    ...draft,
                    status: event.target.value,
                  },
                }))
              }
              style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
            >
              <option value="active">active</option>
              <option value="planned">planned</option>
              <option value="disabled">disabled</option>
            </select>
          );
        },
      },
      {
        key: "description_ru",
        title: "description_ru",
        dataIndex: "description_ru",
        minWidth: 280,
        render: (value) => <span style={{ wordBreak: "break-word" }}>{textValue(value)}</span>,
      },
      { key: "updated_at", title: "updated_at", dataIndex: "updated_at", minWidth: 160, render: (value) => formatDateTime(value) },
      {
        key: "action",
        title: "Действие",
        dataIndex: "action",
        minWidth: 140,
        render: (_, row) => {
          const key = getFlagKey(row);
          const draft = flagDrafts[key] || getFlagDraft(row);
          const saving = savingKey === `flag:${key}`;

          return (
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSavingKey(`flag:${key}`);
                setError("");
                try {
                  await fetchJson(`/internal/admin/mobile/flags/${encodeURIComponent(textValue(row.flag_key))}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      enabled: Boolean(draft.enabled),
                      status: String(draft.status || "planned"),
                    }),
                  });
                  await loadAll();
                  setSuccess("Сохранено");
                } catch (nextError) {
                  setError(String(nextError?.message || nextError || "ADMIN_MOBILE_FLAG_SAVE_FAILED"));
                } finally {
                  setSavingKey("");
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Сохранить
            </button>
          );
        },
      },
    ],
    [flagDrafts, loadAll, savingKey],
  );

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <AdminNavigation />
        <h1 style={{ margin: "16px 0 8px" }}>Мобильное</h1>
        <p style={{ margin: "0 0 16px", color: "#6b7280" }}>Mobile Control Center: заявки, данные, рефералы и флаги.</p>
        <p>Требуется вход администратора.</p>
        <a href="#/admin/login?returnTo=/admin/mobile">Войти как администратор</a>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, display: "grid", gap: 16 }}>
      <AdminNavigation />

      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Мобильное</h1>
        <p style={{ margin: 0, color: "#6b7280" }}>Mobile Control Center: заявки, данные, рефералы и флаги.</p>
      </header>

      {loading ? <div style={{ color: "#6b7280" }}>Загружаем mobile control center…</div> : null}

      {error ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 12,
            padding: 12,
          }}
        >
          Ошибка: {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: 12,
            padding: 12,
          }}
        >
          {success}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {stats.map((item) => (
          <SummaryCard key={item.title} title={item.title} value={item.value} hint={item.hint} />
        ))}
      </div>

      <SectionCard title="Уведомления и анонсы">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <SummaryCard
            title="Уведомления"
            value={overview?.notifications?.total_count ?? 0}
            hint={`Статусы: ${Array.isArray(overview?.notifications?.by_status) ? overview.notifications.by_status.map((item) => `${statusLabel(item.status)}: ${formatNumber(item.total_count ?? item.count ?? 0)}`).join(" · ") : "—"}`}
          />
          <SummaryCard
            title="Анонсы"
            value={overview?.announcements?.total_count ?? 0}
            hint={`Статусы: ${Array.isArray(overview?.announcements?.by_status) ? overview.announcements.by_status.map((item) => `${statusLabel(item.status)}: ${formatNumber(item.total_count ?? item.count ?? 0)}`).join(" · ") : "—"}`}
          />
        </div>
      </SectionCard>

      <SectionCard title="Referral links">
        <DataTable columns={referralLinkColumns} rows={referralLinks} />
      </SectionCard>

      <SectionCard title="Referral events">
        <DataTable columns={referralEventColumns} rows={referralEvents} />
      </SectionCard>

      <SectionCard title="Mobile events">
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>Read-only события мобильной витрины из public.mobile_events.</div>
        <DataTable columns={mobileEventColumns} rows={mobileEvents} />
      </SectionCard>

      <SectionCard title="Feedback">
        <DataTable columns={feedbackColumns} rows={feedbackItems} />
      </SectionCard>

      <SectionCard title="Запросы данных">
        <DataTable columns={dataRequestColumns} rows={dataRequestItems} />
      </SectionCard>

      <SectionCard title="Mobile flags">
        <DataTable columns={flagColumns} rows={flags} />
      </SectionCard>
    </div>
  );
}
