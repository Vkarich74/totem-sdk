import { useEffect, useState } from "react";
import AdminNavigation from "../AdminNavigation";
import {
  getAdminNotificationDeliveries,
  getAdminNotifications,
  getAdminPushSubscriptions,
} from "../../api/internal.js";

function textValue(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function shortText(value, maxLength = 160) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "—";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return textValue(value);
  }

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Bishkek",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getItems(payload) {
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function getTotalCount(payload, fallback = 0) {
  const raw = payload?.data?.total_count ?? payload?.total_count ?? fallback;
  const total = Number(raw);
  return Number.isFinite(total) ? total : fallback;
}

function statusTone(status) {
  const value = String(status || "").toLowerCase();

  if (
    ["sent", "delivered", "active", "enabled", "read", "success", "published"].includes(value)
  ) {
    return "green";
  }

  if (["scheduled", "draft", "pending", "processing", "in_progress"].includes(value)) {
    return "amber";
  }

  if (["failed", "revoked", "cancelled", "disabled", "expired", "error"].includes(value)) {
    return "red";
  }

  return "neutral";
}

function priorityTone(priority) {
  const value = String(priority || "").toLowerCase();

  if (value === "urgent") {
    return "red";
  }

  if (value === "high") {
    return "amber";
  }

  if (value === "low") {
    return "blue";
  }

  return "neutral";
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
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          {subtitle ? (
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13, lineHeight: 1.45 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {extra}
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
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
                  minWidth: column.minWidth || "auto",
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
              <tr key={row.id ?? row.notification_uid ?? row.delivery_uid ?? row.subscription_uid ?? index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      padding: "10px 8px",
                      borderBottom: "1px solid #f3f4f6",
                      verticalAlign: "top",
                      fontSize: 14,
                      minWidth: column.minWidth || "auto",
                      maxWidth: column.maxWidth || "none",
                    }}
                  >
                    {column.render
                      ? column.render(row[column.dataIndex], row)
                      : textValue(row[column.dataIndex])}
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

const notificationsColumns = [
  { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
  { key: "uid", title: "UID", dataIndex: "notification_uid", minWidth: 200, render: (_, row) => shortText(row.notification_uid, 24) },
  { key: "target_type", title: "Тип цели", dataIndex: "target_type", minWidth: 120 },
  { key: "target_id", title: "ID цели", dataIndex: "target_id", minWidth: 120 },
  { key: "owner_type", title: "Тип владельца", dataIndex: "owner_type", minWidth: 120 },
  { key: "owner_id", title: "ID владельца", dataIndex: "owner_id", minWidth: 100 },
  { key: "channel", title: "Канал", dataIndex: "channel", minWidth: 110 },
  {
    key: "priority",
    title: "Приоритет",
    dataIndex: "priority",
    minWidth: 110,
    render: (_, row) => <Pill tone={priorityTone(row.priority)}>{textValue(row.priority)}</Pill>,
  },
  {
    key: "status",
    title: "Статус",
    dataIndex: "status",
    minWidth: 110,
    render: (_, row) => <Pill tone={statusTone(row.status)}>{textValue(row.status)}</Pill>,
  },
  { key: "title_ru", title: "Заголовок", dataIndex: "title_ru", minWidth: 180, render: (_, row) => shortText(row.title_ru || row.title_en || row.title, 42) },
  { key: "body_ru", title: "Текст", dataIndex: "body_ru", minWidth: 240, render: (_, row) => shortText(row.body_ru || row.body_en || row.body, 80) },
  { key: "created_at", title: "Создано", dataIndex: "created_at", minWidth: 150, render: (_, row) => formatDateTime(row.created_at) },
];

const deliveriesColumns = [
  { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
  { key: "notification_id", title: "ID уведомления", dataIndex: "notification_id", minWidth: 120 },
  { key: "delivery_uid", title: "UID доставки", dataIndex: "delivery_uid", minWidth: 200, render: (_, row) => shortText(row.delivery_uid, 24) },
  { key: "channel", title: "Канал", dataIndex: "channel", minWidth: 110 },
  { key: "provider", title: "Провайдер", dataIndex: "provider", minWidth: 120 },
  { key: "target", title: "Цель", dataIndex: "target", minWidth: 180, render: (_, row) => shortText(row.target, 42) },
  {
    key: "status",
    title: "Статус",
    dataIndex: "status",
    minWidth: 110,
    render: (_, row) => <Pill tone={statusTone(row.status)}>{textValue(row.status)}</Pill>,
  },
  { key: "attempt_count", title: "Попытки", dataIndex: "attempt_count", minWidth: 90 },
  { key: "last_error", title: "Последняя ошибка", dataIndex: "last_error", minWidth: 220, render: (_, row) => shortText(row.last_error, 80) },
  { key: "sent_at", title: "Отправлено", dataIndex: "sent_at", minWidth: 150, render: (_, row) => formatDateTime(row.sent_at) },
  { key: "delivered_at", title: "Доставлено", dataIndex: "delivered_at", minWidth: 150, render: (_, row) => formatDateTime(row.delivered_at) },
  { key: "failed_at", title: "Сбой", dataIndex: "failed_at", minWidth: 150, render: (_, row) => formatDateTime(row.failed_at) },
  { key: "created_at", title: "Создано", dataIndex: "created_at", minWidth: 150, render: (_, row) => formatDateTime(row.created_at) },
];

const pushSubscriptionsColumns = [
  { key: "id", title: "ID", dataIndex: "id", minWidth: 80 },
  { key: "subscription_uid", title: "UID подписки", dataIndex: "subscription_uid", minWidth: 220, render: (_, row) => shortText(row.subscription_uid, 26) },
  { key: "user_type", title: "Тип пользователя", dataIndex: "user_type", minWidth: 120 },
  { key: "user_id", title: "ID пользователя", dataIndex: "user_id", minWidth: 100 },
  { key: "device_id", title: "ID устройства", dataIndex: "device_id", minWidth: 140, render: (_, row) => shortText(row.device_id, 24) },
  { key: "platform", title: "Платформа", dataIndex: "platform", minWidth: 110 },
  { key: "endpoint", title: "Адрес", dataIndex: "endpoint", minWidth: 260, render: (_, row) => shortText(row.endpoint, 72) },
  {
    key: "enabled",
    title: "Включено",
    dataIndex: "enabled",
    minWidth: 100,
    render: (_, row) => <Pill tone={row.enabled ? "green" : "red"}>{row.enabled ? "Да" : "Нет"}</Pill>,
  },
  { key: "user_agent", title: "Агент", dataIndex: "user_agent", minWidth: 220, render: (_, row) => shortText(row.user_agent, 72) },
  { key: "has_p256dh", title: "Есть p256dh", dataIndex: "has_p256dh", minWidth: 100, render: (_, row) => <Pill tone={row.has_p256dh ? "green" : "red"}>{row.has_p256dh ? "Да" : "Нет"}</Pill> },
  { key: "has_auth", title: "Есть auth", dataIndex: "has_auth", minWidth: 90, render: (_, row) => <Pill tone={row.has_auth ? "green" : "red"}>{row.has_auth ? "Да" : "Нет"}</Pill> },
  { key: "last_seen_at", title: "Последний визит", dataIndex: "last_seen_at", minWidth: 150, render: (_, row) => formatDateTime(row.last_seen_at) },
  { key: "revoked_at", title: "Отозвано", dataIndex: "revoked_at", minWidth: 150, render: (_, row) => formatDateTime(row.revoked_at) },
  { key: "created_at", title: "Создано", dataIndex: "created_at", minWidth: 150, render: (_, row) => formatDateTime(row.created_at) },
];

function sectionMeta(totalCount, limit) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <Pill tone="blue">Лимит {limit}</Pill>
      <Pill>{totalCount}</Pill>
    </div>
  );
}

function renderSectionBody({ loading, error, items, emptyMessage, columns }) {
  if (loading) {
    return <div style={{ color: "#6b7280", fontSize: 14 }}>Загрузка...</div>;
  }

  if (error) {
    return (
      <div
        style={{
          border: "1px solid #f5c2c7",
          background: "#fff5f5",
          color: "#b42318",
          borderRadius: 12,
          padding: 12,
          fontSize: 14,
        }}
      >
        Не удалось загрузить данные
      </div>
    );
  }

  if (!items.length) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          background: "#fafafa",
          color: "#6b7280",
          borderRadius: 12,
          padding: 12,
          fontSize: 14,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return <DataTable columns={columns} rows={items} />;
}

export default function AdminNotificationsPage() {
  const [notificationsState, setNotificationsState] = useState({
    items: [],
    total: 0,
    loading: true,
    error: "",
  });
  const [deliveriesState, setDeliveriesState] = useState({
    items: [],
    total: 0,
    loading: true,
    error: "",
  });
  const [pushSubscriptionsState, setPushSubscriptionsState] = useState({
    items: [],
    total: 0,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    const limit = 50;

    async function loadAll() {
      setNotificationsState((prev) => ({ ...prev, loading: true, error: "" }));
      setDeliveriesState((prev) => ({ ...prev, loading: true, error: "" }));
      setPushSubscriptionsState((prev) => ({ ...prev, loading: true, error: "" }));

      const [notificationsRes, deliveriesRes, pushSubscriptionsRes] = await Promise.allSettled([
        getAdminNotifications({ limit }),
        getAdminNotificationDeliveries({ limit }),
        getAdminPushSubscriptions({ limit }),
      ]);

      if (cancelled) {
        return;
      }

      const applyResult = (result, fallbackError) => {
        if (result.status === "fulfilled" && result.value?.ok !== false) {
          const payload = result.value;
          const items = getItems(payload);
          const total = getTotalCount(payload, items.length);
          return { items, total, loading: false, error: "" };
        }

        const reason = result.status === "rejected" ? result.reason : result.value;
        const error = reason?.error || reason?.message || fallbackError;
        return { items: [], total: 0, loading: false, error };
      };

      setNotificationsState(applyResult(notificationsRes, "ADMIN_NOTIFICATIONS_LOAD_FAILED"));
      setDeliveriesState(applyResult(deliveriesRes, "ADMIN_NOTIFICATION_DELIVERIES_LOAD_FAILED"));
      setPushSubscriptionsState(applyResult(pushSubscriptionsRes, "ADMIN_PUSH_SUBSCRIPTIONS_LOAD_FAILED"));
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const notificationColumns = notificationsColumns;
  const deliveryColumns = deliveriesColumns;
  const subscriptionColumns = pushSubscriptionsColumns;

  return (
    <div style={{ padding: 24, background: "#f9fafb", minHeight: "100vh" }}>
      <AdminNavigation />

      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gap: 20 }}>
        <header style={{ display: "grid", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.1 }}>Центр уведомлений</h1>
          <div style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.5 }}>
            Только чтение. Лимит на выборку: 50 записей на секцию.
          </div>
        </header>

        <SectionCard
          title="Уведомления"
          subtitle="Список из public.app_notifications."
          extra={sectionMeta(notificationsState.total, 50)}
        >
          {renderSectionBody({
            loading: notificationsState.loading,
            error: notificationsState.error,
            items: notificationsState.items,
            emptyMessage: "Уведомлений пока нет.",
            columns: notificationColumns,
          })}
        </SectionCard>

        <SectionCard
          title="Доставки"
          subtitle="Список из public.notification_deliveries."
          extra={sectionMeta(deliveriesState.total, 50)}
        >
          {renderSectionBody({
            loading: deliveriesState.loading,
            error: deliveriesState.error,
            items: deliveriesState.items,
            emptyMessage: "Доставок пока нет.",
            columns: deliveryColumns,
          })}
        </SectionCard>

        <SectionCard
          title="Push subscriptions"
          subtitle="Список из public.push_subscriptions без раскрытия p256dh/auth."
          extra={sectionMeta(pushSubscriptionsState.total, 50)}
        >
          {renderSectionBody({
            loading: pushSubscriptionsState.loading,
            error: pushSubscriptionsState.error,
            items: pushSubscriptionsState.items.map((item) => ({
              ...item,
              has_p256dh: Boolean(item?.p256dh || item?.has_p256dh),
              has_auth: Boolean(item?.auth || item?.has_auth),
            })),
            emptyMessage: "Push subscriptions пока нет.",
            columns: subscriptionColumns,
          })}
        </SectionCard>
      </div>
    </div>
  );
}
