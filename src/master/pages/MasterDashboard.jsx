import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import PageSection from "../../cabinet/PageSection"
import StatCard from "../../cabinet/StatCard"
import StatGrid from "../../cabinet/StatGrid"
import { useMaster } from "../MasterContext"
import { getMasterMetrics } from "../../api/internal"
import { getMasterNotifications, markMasterNotificationRead } from "../../api/master.js"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"

function money(n){
  return new Intl.NumberFormat("ru-RU").format(Number(n) || 0) + " сом"
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

function isLocalDev(){
  if(typeof window === "undefined") return false
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
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

export default function MasterDashboard() {
  const {
    loading: masterLoading,
    error: masterError,
    slug,
    master,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason
  } = useMaster()

  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState("")
  const [empty, setEmpty] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState("")
  const [readingNotificationUid, setReadingNotificationUid] = useState("")

  useEffect(()=>{
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

      if(isLocalDev()){
        if(!cancelled){
          setMetrics({})
          setMetricsLoading(false)
          setMetricsError("")
          setEmpty(true)
        }
        return
      }

      try{
        setMetricsLoading(true)
        setMetricsError("")
        setEmpty(false)

        const result = await getMasterMetrics(slug)

        if(!result?.ok){
          const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)

          if(status === 403){
            if(!cancelled){
              setMetrics({})
              setMetricsError("")
              setEmpty(true)
            }
            return
          }

          throw new Error(status ? "MASTER_METRICS_HTTP_" + status : (result?.error || "MASTER_METRICS_LOAD_FAILED"))
        }

        const data = normalizeMetricsResponse(result)

        if(!cancelled){
          setMetrics(data)
          setEmpty(Object.keys(data || {}).length === 0)
        }
      }catch(error){
        console.error("MASTER DASHBOARD LOAD ERROR", error)

        if(!cancelled){
          setMetrics(null)
          setMetricsError(error?.message || "MASTER_METRICS_LOAD_FAILED")
          setEmpty(false)
        }
      }finally{
        if(!cancelled){
          setMetricsLoading(false)
        }
      }
    }

    loadMetrics()

    return ()=>{
      cancelled = true
    }
  },[slug])

  useEffect(()=>{
    let cancelled = false

    async function loadMasterNotificationsEffect(){
      if(!slug){
        if(!cancelled){
          setNotifications([])
          setNotificationsLoading(false)
          setNotificationsError("")
        }
        return
      }

      try{
        if(!cancelled){
          setNotificationsLoading(true)
          setNotificationsError("")
        }

        const result = await getMasterNotifications(slug, { limit: 20 })
        const items = getSafeNotificationList(result)

        if(!cancelled){
          setNotifications(items)
        }
      }catch(error){
        console.error("MASTER NOTIFICATIONS LOAD ERROR", error)

        if(!cancelled){
          setNotifications([])
          setNotificationsError(error?.message || "MASTER_NOTIFICATIONS_LOAD_FAILED")
        }
      }finally{
        if(!cancelled){
          setNotificationsLoading(false)
        }
      }
    }

    loadMasterNotificationsEffect()

    return ()=>{
      cancelled = true
    }
  },[slug])

  async function loadMasterNotifications(){
    if(!slug){
      return
    }

    try{
      setNotificationsLoading(true)
      setNotificationsError("")

      const result = await getMasterNotifications(slug, { limit: 20 })
      setNotifications(getSafeNotificationList(result))
    }catch(error){
      console.error("MASTER NOTIFICATIONS LOAD ERROR", error)
      setNotifications([])
      setNotificationsError(error?.message || "MASTER_NOTIFICATIONS_LOAD_FAILED")
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
      await markMasterNotificationRead(slug, notificationUid)
      const readAt = new Date().toISOString()

      setNotifications((prev)=>prev.map((item)=>{
        if(getNotificationUid(item) !== notificationUid) return item
        return {
          ...item,
          is_read: true,
          read_at: item?.read_at || readAt
        }
      }))
    }catch(error){
      console.error("MASTER NOTIFICATION READ ERROR", error)
      await loadMasterNotifications()
    }finally{
      setReadingNotificationUid("")
    }
  }

  const loading = masterLoading || metricsLoading
  const error = masterError || metricsError
  const masterName = master?.name || ""
  const safeMetrics = useMemo(()=>metrics || {},[metrics])
  const billingUi = useMemo(
    ()=>getBillingUi(billingAccess, billingBlockReason),
    [billingAccess, billingBlockReason]
  )

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель мастера</h2>
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

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель мастера</h2>
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>
        Панель мастера
        {masterName ? ` — ${masterName}` : ""}
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
          <QuickAction to={`/master/${slug}/bookings`} title="Открыть записи" note="Список записей, статусы и переход к деталям." />
          <QuickAction to={`/master/${slug}/schedule`} title="Открыть расписание" note="Рабочее время, ближайшие окна и управление днём." />
          <QuickAction to={`/master/${slug}/clients`} title="Открыть клиентов" note="CRM-light список клиентов и последних визитов." />
          <QuickAction to={`/master/${slug}/finance`} title="Открыть финансы" note="Обзор денег, баланса и переход к расчётам." />
        </div>
      </PageSection>

      <OwnerBookingQrCard
        ownerType="master"
        slug={slug}
        title="QR для записи к мастеру"
        subtitle="Клиент откроет форму записи с выбранным мастером."
      />

      <PageSection title="Уведомления">
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
            {notifications.map((notification)=>{
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
                        onClick={()=>readNotification(notification)}
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
          <RouteCard to={`/master/${slug}/bookings`} title="Кто записан" note="Открой список записей, фильтруй статусы и работай с потоком дня." />
          <RouteCard to={`/master/${slug}/schedule`} title="Когда запись" note="Перейди в time-based view, если нужно быстро понять загрузку и окна." />
          <RouteCard to={`/master/${slug}/money`} title="Сколько заработал" note="Смотри деньги сейчас без тяжёлого ledger на стартовом экране." tone="finance" />
          <RouteCard to={`/master/${slug}/payouts`} title="Когда выплата" note="Переход прямо к выплатам и их статусам без лишних промежуточных блоков." tone="finance" />
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
            note="Главный операционный ориентир — сегодняшние записи. Управление временем вынесено в раздел «Расписание»."
          />
          <SummaryCard
            title="Деньги сейчас"
            value={money(safeMetrics.revenue_today)}
            note="Быстрый обзор без тяжёлых таблиц. Детальные движения вынесены в отдельные финансовые страницы."
          />
          <SummaryCard
            title="Клиентская база"
            value={safeMetrics.clients_total || 0}
            note="На dashboard только обзор. Подробный клиентский список живёт отдельно и не нагружает стартовый экран."
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
