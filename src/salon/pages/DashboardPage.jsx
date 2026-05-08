import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import PageSection from "../../cabinet/PageSection"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"
import { confirmSalonCashPayment, getBookings as getSalonBookings, getSalonMetrics } from "../../api/internal"
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

function getSafeBookingList(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.bookings)) return payload.bookings
  if(Array.isArray(payload?.data?.bookings)) return payload.data.bookings
  if(Array.isArray(payload?.items)) return payload.items
  return []
}

function isPendingCashBooking(booking){
  const provider = String(booking?.payment_provider || "").toLowerCase()
  const status = String(booking?.payment_status || "").toLowerCase()

  return Boolean(
    booking?.cash_pending_alert ||
    (provider === "direct" && status === "pending" && Boolean(booking?.payment_is_active))
  )
}

function getPaymentLabelRu(booking){
  const explicitLabel = String(booking?.payment_label_ru || "").trim()
  if(explicitLabel) return explicitLabel

  const provider = String(booking?.payment_provider || "").toLowerCase()
  const status = String(booking?.payment_status || "").toLowerCase()

  if(status === "failed") return "Оплата не прошла"
  if(status === "refunded") return "Оплата возвращена"
  if(provider === "direct" && status === "pending") return "Наличные ожидают подтверждения"
  if(provider === "direct" && status === "confirmed") return "Оплата наличными подтверждена"
  if(provider === "xpay" && status === "pending") return "Ожидаем оплату XPAY"
  if(provider === "xpay" && status === "confirmed") return "Оплата получена"
  return "Оплата не выбрана"
}

function getBookingAmount(booking){
  const value = booking?.payment_amount ?? booking?.price_snapshot ?? booking?.price ?? 0
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
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

function SurfaceCard({ children, style }){
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: "24px",
      background: "#ffffff",
      boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
      overflow: "hidden",
      ...style
    }}>
      {children}
    </div>
  )
}

function HeroPill({ children, tone = "default" }){
  const palette = {
    default: { bg: "#eef2ff", color: "#4338ca" },
    neutral: { bg: "#f3f4f6", color: "#374151" },
    success: { bg: "#ecfdf3", color: "#027a48" },
    accent: { bg: "#fff7ed", color: "#c2410c" }
  }[tone] || { bg: "#eef2ff", color: "#4338ca" }

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      minHeight: "28px",
      padding: "0 12px",
      borderRadius: "999px",
      background: palette.bg,
      color: palette.color,
      fontSize: "12px",
      fontWeight: 800,
      letterSpacing: "0.01em"
    }}>
      {children}
    </span>
  )
}

function HeroMetric({ title, value, note }){
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: "18px",
      background: "rgba(255,255,255,0.14)",
      backdropFilter: "blur(10px)",
      padding: "14px"
    }}>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.82)", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{value}</div>
      {note ? (
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.78)", marginTop: "6px", lineHeight: 1.35 }}>
          {note}
        </div>
      ) : null}
    </div>
  )
}

function CompactMetric({ title, value, note }){
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: "18px",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      padding: "16px",
      minHeight: "120px"
    }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>{value}</div>
      {note ? (
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px", lineHeight: 1.45 }}>{note}</div>
      ) : null}
    </div>
  )
}

function SectionFrame({ children }){
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: "24px",
      background: "#fff",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
      overflow: "hidden"
    }}>
      <div style={{ padding: "18px" }}>{children}</div>
    </div>
  )
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
  const [pendingCashBookings, setPendingCashBookings] = useState([])
  const [pendingCashLoading, setPendingCashLoading] = useState(false)
  const [pendingCashError, setPendingCashError] = useState("")
  const [confirmingCashKey, setConfirmingCashKey] = useState("")
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

    async function loadPendingCashBookings(){
      if(!slug){
        if(!cancelled){
          setPendingCashBookings([])
          setPendingCashLoading(false)
          setPendingCashError("")
        }
        return
      }

      try{
        if(!cancelled){
          setPendingCashLoading(true)
          setPendingCashError("")
        }

        const result = await getSalonBookings(slug)

        if(!result?.ok){
          const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
          throw new Error(status ? "SALON_BOOKINGS_HTTP_" + status : (result?.error || "SALON_BOOKINGS_LOAD_FAILED"))
        }

        const bookings = getSafeBookingList(result).filter(isPendingCashBooking)

        if(!cancelled){
          setPendingCashBookings(bookings)
        }
      }catch(error){
        console.error("SALON DASHBOARD PENDING CASH LOAD ERROR", error)

        if(!cancelled){
          setPendingCashBookings([])
          setPendingCashError(error?.message || "SALON_PENDING_CASH_LOAD_FAILED")
        }
      }finally{
        if(!cancelled){
          setPendingCashLoading(false)
        }
      }
    }

    loadPendingCashBookings()

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

  async function confirmCashBooking(booking){
    const bookingId = booking?.id
    if(!bookingId || confirmingCashKey){
      return
    }

    const key = String(bookingId)
    setConfirmingCashKey(key)
    setPendingCashError("")

    try{
      const result = await confirmSalonCashPayment({
        booking_id: bookingId,
        payment_id: booking?.payment_id || undefined,
        salon_slug: slug
      })

      if(!result?.ok){
        const message = result?.detail?.message_ru || result?.detail?.error || result?.error || "SALON_CASH_CONFIRM_FAILED"
        throw new Error(message)
      }

      setPendingCashBookings((prev) => prev.filter((item) => String(item?.id || "") !== key))
    }catch(error){
      setPendingCashError(error?.message || "SALON_CASH_CONFIRM_FAILED")
    }finally{
      setConfirmingCashKey("")
    }
  }

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
    <div style={{
      maxWidth: "1240px",
      margin: "0 auto",
      display: "grid",
      gap: "16px",
      padding: "4px 0 24px"
    }}>
      <SurfaceCard style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #7c3aed 100%)",
        color: "#fff"
      }}>
        <div style={{
          display: "grid",
          gap: "18px",
          padding: "22px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.72, fontWeight: 800 }}>
                TOTEM Salon
              </div>
              <h2 style={{ margin: "8px 0 0", fontSize: "30px", lineHeight: 1.08, letterSpacing: "-0.03em" }}>
                Кабинет салона
              </h2>
              <div style={{ marginTop: "10px", fontSize: "15px", lineHeight: 1.6, maxWidth: "760px", color: "rgba(255,255,255,0.88)" }}>
                Быстрый доступ к команде, расписанию, записям и финансам салона.
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-end" }}>
              <HeroPill tone="default">Салон</HeroPill>
              <HeroPill tone="neutral">{slug || "slug"}</HeroPill>
              <HeroPill tone="success">{billingUi.label}</HeroPill>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            <HeroMetric
              title="Сегодня"
              value={safeMetrics.bookings_today || 0}
              note="Главный операционный фокус дня"
            />
            <HeroMetric
              title="Финансы"
              value={money(safeMetrics.revenue_today)}
              note={canWithdraw ? "Выплаты доступны" : "Выплаты ограничены"}
            />
            <HeroMetric
              title="Команда"
              value={safeMetrics.masters_active || 0}
              note="Активные мастера в салоне"
            />
            <HeroMetric
              title="Статистика"
              value={safeMetrics.clients_total || 0}
              note="Клиенты и операционный охват"
            />
          </div>
        </div>
      </SurfaceCard>

      <SectionFrame>
        <div style={{
          border: `1px solid ${billingUi.border}`,
          background: billingUi.bg,
          color: billingUi.tone,
          borderRadius: "20px",
          padding: "18px"
        }}>
          <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "6px" }}>{billingUi.label}</div>
          <div style={{ fontSize: "13px", lineHeight: 1.45 }}>{billingUi.note}</div>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#344054" }}>
            Запись: <strong>{canWrite ? "доступна" : "ограничена"}</strong> · Выплаты: <strong>{canWithdraw ? "доступны" : "ограничены"}</strong>
          </div>
        </div>
      </SectionFrame>

      <PageSection title="Сегодня">
        <StatGrid>
          <CompactMetric title="Записей сегодня" value={safeMetrics.bookings_today || 0} note="Текущая загрузка дня" />
          <CompactMetric title="Записей за неделю" value={safeMetrics.bookings_week || 0} note="Динамика за 7 дней" />
          <CompactMetric title="Клиентов всего" value={safeMetrics.clients_total || 0} note="Накопленная клиентская база" />
          <CompactMetric title="Активных мастеров" value={safeMetrics.masters_active || 0} note="Команда в рабочем режиме" />
          <CompactMetric title="Доход сегодня" value={money(safeMetrics.revenue_today)} note="Быстрый финансовый обзор" />
          <CompactMetric title="Доход за месяц" value={money(safeMetrics.revenue_month)} note="Общая monthly динамика" />
        </StatGrid>

        <div style={{
          marginTop: "16px",
          border: "1px solid #fecaca",
          borderRadius: "18px",
          background: "#fff1f2",
          padding: "16px"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "10px"
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991b1b", marginBottom: "4px" }}>
                Наличные ожидают подтверждения
              </div>
              <div style={{ fontSize: "12px", color: "#7f1d1d", lineHeight: 1.45 }}>
                Салон может подтвердить cash вручную без изменения booking lifecycle.
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <HeroPill tone="accent">
                {Number(safeMetrics.cash_pending_exposure_count || 0)} записей
              </HeroPill>
              <HeroPill tone="neutral">
                {money(safeMetrics.cash_pending_exposure_amount || 0)}
              </HeroPill>
            </div>
          </div>

          {pendingCashError ? (
            <div style={{
              border: "1px solid #fca5a5",
              borderRadius: "14px",
              background: "#fff",
              color: "#b91c1c",
              padding: "12px",
              fontSize: "13px",
              marginBottom: "12px"
            }}>
              {pendingCashError}
            </div>
          ) : null}

          {pendingCashLoading ? (
            <div style={{ fontSize: "13px", color: "#7f1d1d" }}>
              Загружаем pending cash…
            </div>
          ) : pendingCashBookings.length ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {pendingCashBookings.slice(0, 5).map((booking) => {
                const amount = getBookingAmount(booking)
                const key = String(booking?.id || "")
                const isConfirming = confirmingCashKey === key

                return (
                  <div
                    key={key || `${booking?.service_name || "booking"}-${booking?.start_at || ""}`}
                    style={{
                      display: "grid",
                      gap: "10px",
                      padding: "12px",
                      borderRadius: "14px",
                      background: "#ffffff",
                      border: "1px solid #fecaca"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                      alignItems: "flex-start"
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                          {booking?.service_name || "Услуга"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#7f1d1d", marginTop: "4px" }}>
                          {formatNotificationDate(booking?.start_at)}
                        </div>
                        <div style={{ fontSize: "12px", color: "#7f1d1d", marginTop: "4px" }}>
                          {booking?.master_name || "Мастер"}
                        </div>
                      </div>

                      <div style={{ display: "grid", justifyItems: "end", gap: "6px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "5px 9px",
                          borderRadius: "999px",
                          background: "#fef2f2",
                          color: "#991b1b",
                          fontSize: "12px",
                          fontWeight: 800,
                          border: "1px solid #fecaca"
                        }}>
                          {getPaymentLabelRu(booking)}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#7f1d1d" }}>
                          {amount > 0 ? money(amount) : money(booking?.price_snapshot)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => confirmCashBooking(booking)}
                        disabled={isConfirming}
                        style={{
                          minHeight: "40px",
                          padding: "0 14px",
                          borderRadius: "10px",
                          border: "1px solid #dc2626",
                          background: isConfirming ? "#fee2e2" : "#dc2626",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: 800,
                          cursor: isConfirming ? "default" : "pointer"
                        }}
                      >
                        {isConfirming ? "Подтверждаем…" : "Подтвердить наличные"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "#7f1d1d" }}>
              Pending cash записей нет.
            </div>
          )}
        </div>
      </PageSection>

      <PageSection title="Быстрый доступ">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <QuickAction to={buildSalonPath(slug, "bookings")} title="Записи" note="Список записей, статусы и переход к деталям." />
          <QuickAction to={buildSalonPath(slug, "calendar")} title="Календарь" note="Управление загрузкой салона и быстрый переход по времени." />
          <QuickAction to={buildSalonPath(slug, "masters")} title="Команда" note="Состав команды, статусы и операционные действия по мастерам." />
          <QuickAction to={buildSalonPath(slug, "finance")} title="Финансы" note="Обзор денег, баланса и переход к расчётам и контрактам." />
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
              const actionUrl = String(notification?.action_url || "").trim()
              const hasAction = Boolean(actionUrl)
              const isExternal = /^https?:\/\//i.test(actionUrl)

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

                  {hasAction ? (
                    <div style={{ marginTop: "12px" }}>
                      <a
                        href={actionUrl}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noreferrer" : undefined}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "40px",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: "1px solid #d0d5dd",
                          background: "#fff",
                          color: "#344054",
                          textDecoration: "none",
                          fontSize: "13px",
                          fontWeight: 700
                        }}
                      >
                        Открыть
                      </a>
                    </div>
                  ) : null}

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
          <RouteCard to={buildSalonPath(slug, "bookings")} title="Записи" note="Открой поток записей, фильтруй статусы и работай с операционкой дня." />
          <RouteCard to={buildSalonPath(slug, "calendar")} title="Календарь" note="Перейди в time-based view, если нужно быстро понять окна и плотность расписания." />
          <RouteCard to={buildSalonPath(slug, "money")} title="Финансы" note="Смотри деньги сейчас без тяжёлого ledger на стартовом экране." tone="finance" />
          <RouteCard to={buildSalonPath(slug, "contracts")} title="Команда / договоры" note="Переход прямо к договорному модулю салона и связке с мастерами." tone="finance" />
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
            title="Команда в работе"
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
