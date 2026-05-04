import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import PageSection from "../../cabinet/PageSection"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"
import { getSalonMetrics } from "../../api/internal"
import { getSalonNotifications, markSalonNotificationRead } from "../../api/salon.js"

function money(value){
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0) + " сом"
}

function normalizeMetricsResponse(payload){
  if(payload?.metrics) return payload.metrics
  if(payload?.data?.metrics) return payload.data.metrics
  if(payload && typeof payload === "object") return payload
  return {}
}

function getBillingUi(billingAccess, billingBlockReason){
  const state = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  if(state === "blocked"){
    return {
      label: "Доступ ограничен",
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: billingBlockReason || "Оплатите подписку для полного доступа"
    }
  }

  if(state === "grace"){
    return {
      label: "Льготный период",
      tone: "#9a6700",
      bg: "#fff8db",
      border: "#facc15",
      note: billingBlockReason || "Скоро потребуется пополнение"
    }
  }

  return {
    label: "Доступ активен",
    tone: "#027a48",
    bg: "#ecfdf3",
    border: "#abefc6",
    note: "Кабинет работает без ограничений"
  }
}

function StatGrid({ children }){
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "12px"
    }}>
      {children}
    </div>
  )
}

function StatCard({ title, value }){
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: "14px",
      background: "#fff",
      padding: "16px"
    }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>{value}</div>
    </div>
  )
}

function QuickAction({ to, title, note }){
  return (
    <Link
      to={to}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: "#fff",
        padding: "16px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
      }}
    >
      <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.4 }}>{note}</div>
    </Link>
  )
}

function RouteCard({ to, title, note, tone = "default" }){
  const palette = tone === "finance"
    ? { bg: "#f8fafc", border: "#dbeafe" }
    : { bg: "#ffffff", border: "#e5e7eb" }

  return (
    <Link
      to={to}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: `1px solid ${palette.border}`,
        borderRadius: "14px",
        background: palette.bg,
        padding: "14px"
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.45 }}>{note}</div>
    </Link>
  )
}

function SummaryCard({ title, value, note }){
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: "14px",
      background: "#fff",
      padding: "16px"
    }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>{value}</div>
      {note ? (
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px", lineHeight: 1.4 }}>{note}</div>
      ) : null}
    </div>
  )
}

function getSafeNotificationList(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.notifications)) return payload.notifications
  if(Array.isArray(payload?.data?.notifications)) return payload.data.notifications
  if(Array.isArray(payload?.data?.items)) return payload.data.items
  if(Array.isArray(payload?.items)) return payload.items
  return []
}

function getNotificationUid(notification){
  const uid = notification?.notification_uid ?? notification?.uid ?? notification?.id ?? ""
  return String(uid || "").trim()
}

function getUnreadNotificationCount(items){
  return getSafeNotificationList(items).reduce((count, item) => {
    return count + (item?.read_at || item?.is_read ? 0 : 1)
  }, 0)
}

function getResolvedUnreadCount(payload, items){
  const apiUnreadCount = Number(payload?.unread_count)

  if(Number.isFinite(apiUnreadCount) && apiUnreadCount >= 0){
    return apiUnreadCount
  }

  return getUnreadNotificationCount(items)
}

function formatNotificationDate(value){
  if(!value) return "—"

  const date = new Date(value)
  if(Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

export default function DashboardPage(){
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)
  const {
    loading: salonLoading,
    error: salonError,
    identity,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason
  } = useSalonContext()

  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState("")
  const [empty, setEmpty] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState("")
  const [readingNotificationUid, setReadingNotificationUid] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadMetrics(){
      if(!slug){
        if(!cancelled){
          setMetrics(null)
          setMetricsLoading(false)
          setMetricsError("SLUG_MISSING")
          setEmpty(false)
        }
        return
      }

      try{
        setMetricsLoading(true)
        setMetricsError("")
        setEmpty(false)

        const result = await getSalonMetrics(slug)
        if(!result?.ok){
          const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
          throw new Error(status ? "SALON_METRICS_HTTP_" + status : (result?.error || "SALON_METRICS_LOAD_FAILED"))
        }

        const data = normalizeMetricsResponse(result)

        if(!cancelled){
          setMetrics(data)
          setEmpty(Object.keys(data || {}).length === 0)
        }
      }catch(error){
        console.error("SALON DASHBOARD LOAD ERROR", error)

        if(!cancelled){
          setMetrics(null)
          setMetricsError(error?.message || "SALON_METRICS_LOAD_FAILED")
          setEmpty(false)
        }
      }finally{
        if(!cancelled){
          setMetricsLoading(false)
        }
      }
    }

    loadMetrics()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadSalonNotificationsEffect(){
      if(!slug){
        if(!cancelled){
          setNotifications([])
          setNotificationsLoading(false)
          setNotificationsError("")
          setUnreadCount(0)
        }
        return
      }

      try{
        if(!cancelled){
          setNotificationsLoading(true)
          setNotificationsError("")
        }

        const result = await getSalonNotifications(slug, { limit: 20 })
        const items = getSafeNotificationList(result)

        if(!cancelled){
          setNotifications(items)
          setUnreadCount(getResolvedUnreadCount(result, items))
        }
      }catch(error){
        console.error("SALON NOTIFICATIONS LOAD ERROR", error)

        if(!cancelled){
          setNotifications([])
          setUnreadCount(0)
          setNotificationsError(error?.message || "SALON_NOTIFICATIONS_LOAD_FAILED")
        }
      }finally{
        if(!cancelled){
          setNotificationsLoading(false)
        }
      }
    }

    loadSalonNotificationsEffect()

    return () => {
      cancelled = true
    }
  }, [slug])

  async function loadSalonNotifications(){
    if(!slug){
      setUnreadCount(0)
      return
    }

    try{
      setNotificationsLoading(true)
      setNotificationsError("")

      const result = await getSalonNotifications(slug, { limit: 20 })
      const items = getSafeNotificationList(result)
      setNotifications(items)
      setUnreadCount(getResolvedUnreadCount(result, items))
    }catch(error){
      console.error("SALON NOTIFICATIONS LOAD ERROR", error)
      setNotifications([])
      setUnreadCount(0)
      setNotificationsError(error?.message || "SALON_NOTIFICATIONS_LOAD_FAILED")
    }finally{
      setNotificationsLoading(false)
    }
  }

  async function readNotification(notification){
    const notificationUid = getNotificationUid(notification)
    if(!notificationUid || readingNotificationUid){
      return
    }

    setReadingNotificationUid(notificationUid)

    try{
      await markSalonNotificationRead(slug, notificationUid)
      const readAt = new Date().toISOString()
      if(!notification?.read_at && !notification?.is_read){
        setUnreadCount((current)=>Math.max(0, current - 1))
      }

      setNotifications((prev) => prev.map((item) => {
        if(getNotificationUid(item) !== notificationUid) return item
        return {
          ...item,
          is_read: true,
          read_at: item?.read_at || readAt
        }
      }))
    }catch(error){
      console.error("SALON NOTIFICATION READ ERROR", error)
      await loadSalonNotifications()
    }finally{
      setReadingNotificationUid("")
    }
  }

  const loading = salonLoading || metricsLoading
  const error = salonError || metricsError
  const salonName = identity?.name || identity?.title || ""
  const safeMetrics = useMemo(() => metrics || {}, [metrics])
  const billingUi = useMemo(
    () => getBillingUi(billingAccess, billingBlockReason),
    [billingAccess, billingBlockReason]
  )

  if(error){
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель салона</h2>
        <div style={{
          border: "1px solid #f5c2c7",
          background: "#fff5f5",
          color: "#b42318",
          borderRadius: "10px",
          padding: "12px",
          marginTop: "10px"
        }}>
          Ошибка загрузки метрик
        </div>
        {slug ? (
          <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
            slug: {slug}
          </div>
        ) : null}
      </div>
    )
  }

  if(loading){
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель салона</h2>
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>
        Панель салона
        {salonName ? ` — ${salonName}` : ""}
      </h2>

      <PageSection>
        <div style={{
          border: `1px solid ${billingUi.border}`,
          background: billingUi.bg,
          color: billingUi.tone,
          borderRadius: "14px",
          padding: "16px",
          marginBottom: "16px"
        }}>
          <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "6px" }}>{billingUi.label}</div>
          <div style={{ fontSize: "13px", lineHeight: 1.45 }}>{billingUi.note}</div>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#344054" }}>
            Запись: <strong>{canWrite ? "доступна" : "ограничена"}</strong> · Выплаты: <strong>{canWithdraw ? "доступны" : "ограничены"}</strong>
          </div>
        </div>

        <StatGrid>
          <StatCard title="Записей сегодня" value={safeMetrics.bookings_today || 0} />
          <StatCard title="Записей за неделю" value={safeMetrics.bookings_week || 0} />
          <StatCard title="Клиентов всего" value={safeMetrics.clients_total || 0} />
          <StatCard title="Активных мастеров" value={safeMetrics.masters_active || 0} />
          <StatCard title="Доход сегодня" value={money(safeMetrics.revenue_today)} />
          <StatCard title="Доход за месяц" value={money(safeMetrics.revenue_month)} />
        </StatGrid>
      </PageSection>

      <PageSection title="Быстрые действия">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <QuickAction to={buildSalonPath(slug, "bookings")} title="Открыть записи" note="Список записей, статусы и переход к деталям." />
          <QuickAction to={buildSalonPath(slug, "calendar")} title="Открыть расписание" note="Управление загрузкой салона и быстрый переход по времени." />
          <QuickAction to={buildSalonPath(slug, "masters")} title="Открыть мастеров" note="Состав команды, статусы и операционные действия по мастерам." />
          <QuickAction to={buildSalonPath(slug, "finance")} title="Открыть финансы" note="Обзор денег, баланса и переход к расчётам и контрактам." />
        </div>
      </PageSection>

      <OwnerBookingQrCard
        ownerType="salon"
        slug={slug}
        title="QR для записи в салон"
        subtitle="Клиент откроет форму записи салона."
      />

      <PageSection title={(
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span>Уведомления</span>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: "12px",
            fontWeight: 700
          }}>
            Новых: {unreadCount}
          </span>
        </div>
      )}>
        {notificationsLoading ? (
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            background: "#fff",
            padding: "14px",
            color: "#6b7280",
            fontSize: "14px"
          }}>
            Загружаем уведомления…
          </div>
        ) : notificationsError ? (
          <div style={{
            border: "1px solid #f5c2c7",
            borderRadius: "14px",
            background: "#fff5f5",
            color: "#b42318",
            padding: "14px",
            fontSize: "14px"
          }}>
            Не удалось загрузить уведомления
          </div>
        ) : notifications.length ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {notifications.map((notification) => {
              const uid = getNotificationUid(notification)
              const isRead = Boolean(notification?.is_read || notification?.read_at)
              const title = notification?.title_ru || notification?.title_en || notification?.title || "Без заголовка"
              const body = notification?.body_ru || notification?.body_en || notification?.body || ""
              const type = notification?.target_type || notification?.action_type || "—"
              const priority = notification?.priority || "normal"

              return (
                <div
                  key={uid || `${title}-${notification?.created_at || ""}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    background: isRead ? "#f9fafb" : "#fff",
                    padding: "14px"
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "flex-start",
                    marginBottom: "10px"
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>
                        {title}
                      </div>
                      {body ? (
                        <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {body}
                        </div>
                      ) : null}
                    </div>

                    <div style={{
                      flexShrink: 0,
                      borderRadius: "999px",
                      padding: "6px 10px",
                      background: isRead ? "#f3f4f6" : "#ecfdf3",
                      color: isRead ? "#6b7280" : "#027a48",
                      fontSize: "12px",
                      fontWeight: 700
                    }}>
                      {isRead ? "Прочитано" : "Новое"}
                    </div>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#667085"
                  }}>
                    <div>Тип: <strong style={{ color: "#344054" }}>{type}</strong></div>
                    <div>Приоритет: <strong style={{ color: "#344054" }}>{priority}</strong></div>
                    <div>Создано: <strong style={{ color: "#344054" }}>{formatNotificationDate(notification?.created_at)}</strong></div>
                    <div>Статус: <strong style={{ color: "#344054" }}>{isRead ? "Прочитано" : "Не прочитано"}</strong></div>
                  </div>

                  {!isRead ? (
                    <div style={{ marginTop: "12px" }}>
                      <button
                        type="button"
                        onClick={() => readNotification(notification)}
                        disabled={readingNotificationUid === uid}
                        style={{
                          border: "1px solid #d0d5dd",
                          borderRadius: "10px",
                          background: "#fff",
                          color: "#344054",
                          fontSize: "13px",
                          fontWeight: 700,
                          padding: "8px 12px",
                          cursor: readingNotificationUid === uid ? "not-allowed" : "pointer",
                          opacity: readingNotificationUid === uid ? 0.7 : 1
                        }}
                      >
                        Прочитано
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            background: "#fff",
            padding: "14px",
            color: "#6b7280",
            fontSize: "14px"
          }}>
            Новых уведомлений пока нет.
          </div>
        )}
      </PageSection>

      <PageSection title="Маршруты из dashboard">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <RouteCard to={buildSalonPath(slug, "bookings")} title="Кто записан" note="Открой поток записей, фильтруй статусы и работай с операционкой дня." />
          <RouteCard to={buildSalonPath(slug, "calendar")} title="Когда загрузка" note="Перейди в time-based view, если нужно быстро понять окна и плотность расписания." />
          <RouteCard to={buildSalonPath(slug, "money")} title="Сколько заработал" note="Смотри деньги сейчас без тяжёлого ledger на стартовом экране." tone="finance" />
          <RouteCard to={buildSalonPath(slug, "contracts")} title="Какие контракты" note="Переход прямо к договорному модулю салона и связке с мастерами." tone="finance" />
        </div>
      </PageSection>

      <PageSection title="Краткий статус">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <SummaryCard
            title="Фокус на сегодня"
            value={safeMetrics.bookings_today || 0}
            note="Главный операционный ориентир — сегодняшние записи. Контроль времени вынесен в раздел «Расписание»."
          />
          <SummaryCard
            title="Мастера в работе"
            value={safeMetrics.masters_active || 0}
            note="На dashboard только обзор. Полное управление командой живёт на отдельной странице и не перегружает стартовый экран."
          />
          <SummaryCard
            title="Деньги сейчас"
            value={money(safeMetrics.revenue_today)}
            note="Быстрый обзор без тяжёлых таблиц. Детальные движения и расчёты вынесены в финансовые страницы."
          />
        </div>
      </PageSection>

      {empty ? (
        <PageSection>
          <div style={{
            border: "1px solid #eee",
            borderRadius: "10px",
            padding: "12px",
            background: "#fff",
            marginTop: "10px"
          }}>
            Нет данных
          </div>
        </PageSection>
      ) : null}
    </div>
  )
}
