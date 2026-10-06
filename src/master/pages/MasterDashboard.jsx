import { NotificationText } from "../../i18n/NotificationText.jsx";
import { UiValue, uiMessage, uiMoney, uiDate, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import PageSection from "../../cabinet/PageSection"
import StatCard from "../../cabinet/StatCard"
import StatGrid from "../../cabinet/StatGrid"
import { useMaster } from "../MasterContext"
import {
  confirmMasterCashPayment,
  confirmOwnerQrPayment,
  getMasterMetrics,
  getMasterOwnerQrPayments,
  getMasterPaymentProjections,
  getMasterPendingCashBookings,
  rejectOwnerQrPayment
} from "../../api/internal"
import { getMasterNotifications, markMasterNotificationRead } from "../../api/master.js"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"
import OwnerPushOptInCard from "../../components/OwnerPushOptInCard"

function money(n, currency) { return uiMoney(n, currency); }

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
      label: uiMessage("salon.s0300"),
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: uiError(billingBlockReason, uiMessage("salon.s0301"))
    }
  }

  if(state === "grace"){
    return {
      label: uiMessage("salon.s0302"),
      tone: "#9a6700",
      bg: "#fff8db",
      border: "#facc15",
      note: uiError(billingBlockReason, uiMessage("salon.s0303"))
    }
  }

  return {
    label: uiMessage("salon.s0304"),
    tone: "#027a48",
    bg: "#ecfdf3",
    border: "#abefc6",
    note: uiMessage("salon.s0305")
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
      <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.4 }}><UiValue value={note} /></div>
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
        border: uiTemplate(["1px solid ",""], [palette.border]),
        borderRadius: "14px",
        background: palette.bg,
        padding: "14px"
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.45 }}><UiValue value={note} /></div>
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
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}><UiValue value={value} /></div>
      {note ? (
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px", lineHeight: 1.4 }}><UiValue value={note} /></div>
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
  return getSafeNotificationList(items).reduce((count, item)=> {
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

function formatNotificationDate(value){ if (!value) return "—"; return uiDate(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function getSafeBookingList(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.bookings)) return payload.bookings
  if(Array.isArray(payload?.data?.bookings)) return payload.data.bookings
  if(Array.isArray(payload?.items)) return payload.items
  return []
}

function isCancelledBookingStatus(status){
  const normalized = String(status || "").trim().toLowerCase()
  return normalized === "cancelled" || normalized === "canceled" || normalized === uiMessage("master.s0034")
}

function isPendingCashBooking(booking){
  const provider = String(booking?.payment_provider || "").toLowerCase()
  const status = String(booking?.payment_status || "").toLowerCase()

  return Boolean(
    !isCancelledBookingStatus(booking?.status) &&
    (booking?.cash_pending_alert ||
    (provider === "direct" && status === "pending" && Boolean(booking?.payment_is_active))
    )
  )
}

function getPaymentLabelRu(booking){
  const provider = String(booking?.payment_provider || "").toLowerCase()
  const status = String(booking?.payment_status || "").toLowerCase()

  if(status === "failed") return uiMessage("salon.s0279")
  if(status === "refunded") return uiMessage("salon.s0280")
  if(provider === "direct" && status === "pending") return uiMessage("salon.s0243")
  if(provider === "direct" && status === "confirmed") return uiMessage("salon.s0281")
  if(provider === "xpay" && status === "pending") return uiMessage("salon.s0282")
  if(provider === "xpay" && status === "confirmed") return uiMessage("salon.s0283")
  return uiMessage("salon.s0244")
}

function getBookingAmount(booking){
  const value = booking?.payment_amount ?? booking?.price_snapshot ?? booking?.price ?? 0
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

function getSafeOwnerQrPaymentList(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.payments)) return payload.payments
  if(Array.isArray(payload?.data?.payments)) return payload.data.payments
  if(Array.isArray(payload?.items)) return payload.items
  if(Array.isArray(payload?.data?.items)) return payload.data.items
  return []
}

function getOwnerQrPaymentStatusLabel(payment){
  const status = String(payment?.status || payment?.payment_status || "").toLowerCase()

  if(status === "pending_owner_confirmation") return uiMessage("salon.s0284")
  if(status === "confirmed") return uiMessage("salon.s0285")
  if(status === "rejected") return uiMessage("salon.s0286")
  return status ? status : "—"
}

function isOwnerQrPayment(payment){
  const provider = String(payment?.provider || payment?.payment_provider || "").toLowerCase()
  const method = String(payment?.method || "").toLowerCase()

  return provider === "owner_qr" || method === "owner_qr"
}

function getOwnerQrPaymentAmount(payment){
  const value = payment?.amount ?? payment?.payment_amount ?? payment?.price_snapshot ?? 0
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

function getOwnerQrActionErrorMessage(error){
  const code = String(error || "").trim()

  if(code === "OWNER_QR_CONFIRM_WRITE_DISABLED"){
    return uiMessage("salon.s0295")
  }

  if(code === "OWNER_QR_ACTIVE_CONTRACT_REQUIRED"){
    return uiMessage("salon.s0296")
  }

  if(code === "OWNER_QR_INVALID_CONTRACT_TERMS"){
    return uiMessage("salon.s0297")
  }

  if(code === "OWNER_QR_FORBIDDEN"){
    return uiMessage("salon.s0298")
  }

  return code || uiMessage("salon.s0299")
}

export default function MasterDashboard() {
  const { renderUi } = useUiMessages();
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
  const [paymentProjectionSummary, setPaymentProjectionSummary] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState("")
  const [empty, setEmpty] = useState(false)
  const [pendingCashBookings, setPendingCashBookings] = useState([])
  const [pendingCashLoading, setPendingCashLoading] = useState(false)
  const [pendingCashError, setPendingCashError] = useState("")
  const [confirmingCashKey, setConfirmingCashKey] = useState("")
  const [ownerQrPayments, setOwnerQrPayments] = useState([])
  const [ownerQrLoading, setOwnerQrLoading] = useState(false)
  const [ownerQrError, setOwnerQrError] = useState("")
  const [ownerQrActionError, setOwnerQrActionError] = useState("")
  const [ownerQrActionLoadingId, setOwnerQrActionLoadingId] = useState("")
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState("")
  const [readingNotificationUid, setReadingNotificationUid] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsExpanded, setNotificationsExpanded] = useState(false)

  useEffect(()=>{
    let cancelled = false

    async function loadMetrics(){
      if(!slug){
        if(!cancelled){
          setMetrics(null)
          setMetricsLoading(false)
          setMetricsError(uiError("SLUG_MISSING"))
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
          setMetricsError(uiError(error?.message || "MASTER_METRICS_LOAD_FAILED"))
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

    async function loadPaymentProjectionSummary(){
      if(!slug){
        if(!cancelled) setPaymentProjectionSummary(null)
        return
      }

      try{
        const result = await getMasterPaymentProjections(slug)
        if(!cancelled){
          setPaymentProjectionSummary(result?.ok ? (result.summary || null) : null)
        }
      }catch(error){
        if(!cancelled) setPaymentProjectionSummary(null)
      }
    }

    loadPaymentProjectionSummary()

    return ()=>{
      cancelled = true
    }
  },[slug])

  async function loadOwnerQrPayments(){
    if(!slug){
      setOwnerQrPayments([])
      setOwnerQrLoading(false)
      setOwnerQrError("")
      setOwnerQrActionError("")
      return
    }

    try{
      setOwnerQrLoading(true)
      setOwnerQrError("")
      setOwnerQrActionError("")

      const result = await getMasterOwnerQrPayments(slug)

      if(!result?.ok){
        const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
        throw new Error(status ? "MASTER_OWNER_QR_HTTP_" + status : (result?.error || "MASTER_OWNER_QR_LOAD_FAILED"))
      }

      const payments = getSafeOwnerQrPaymentList(result).filter(isOwnerQrPayment)
      setOwnerQrPayments(payments)
    }catch(error){
      console.error("MASTER DASHBOARD OWNER QR LOAD ERROR", error)
      setOwnerQrPayments([])
      setOwnerQrError(uiError(error?.message || "MASTER_OWNER_QR_LOAD_FAILED"))
    }finally{
      setOwnerQrLoading(false)
    }
  }

  useEffect(()=>{
    loadOwnerQrPayments()
  },[slug])

  useEffect(()=>{
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

        const result = await getMasterPendingCashBookings(slug)
        const bookings = getSafeBookingList(result).filter((booking) => !isCancelledBookingStatus(booking?.status))

        if(!cancelled){
          setPendingCashBookings(bookings)
          setMetrics((current) => {
            const next = current ? { ...current } : {}
            next.cash_pending_exposure_count = Number.isFinite(Number(result?.count)) ? Number(result.count) : bookings.length
            next.cash_pending_exposure_amount = Number.isFinite(Number(result?.amount)) ? Number(result.amount) : bookings.reduce((sum, booking) => sum + getBookingAmount(booking), 0)
            return next
          })
        }
      }catch(error){
        console.error("MASTER DASHBOARD PENDING CASH LOAD ERROR", error)

        if(!cancelled){
          setPendingCashBookings([])
          setPendingCashError(uiError(error?.message || "MASTER_PENDING_CASH_LOAD_FAILED"))
        }
      }finally{
        if(!cancelled){
          setPendingCashLoading(false)
        }
      }
    }

    loadPendingCashBookings()

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
          setUnreadCount(0)
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
          setUnreadCount(getResolvedUnreadCount(result, items))
        }
      }catch(error){
        console.error("MASTER NOTIFICATIONS LOAD ERROR", error)

        if(!cancelled){
          setNotifications([])
          setUnreadCount(0)
          setNotificationsError(uiError(error?.message || "MASTER_NOTIFICATIONS_LOAD_FAILED"))
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

  async function confirmCashBooking(booking){
    const bookingId = booking?.id
    if(!bookingId || confirmingCashKey){
      return
    }

    const key = String(bookingId)
    setConfirmingCashKey(key)
    setPendingCashError("")

    try{
      const result = await confirmMasterCashPayment({
        booking_id: bookingId,
        payment_id: booking?.payment_id || undefined,
        master_slug: slug
      })

      if(!result?.ok){
        const message = result?.detail?.message_ru || result?.detail?.error || result?.error || "MASTER_CASH_CONFIRM_FAILED"
        throw new Error(message)
      }

      setPendingCashBookings((prev) => prev.filter((item) => String(item?.id || "") !== key))
    }catch(error){
      setPendingCashError(uiError(error?.message || "MASTER_CASH_CONFIRM_FAILED"))
    }finally{
      setConfirmingCashKey("")
    }
  }

  async function confirmOwnerQrBooking(payment){
    const paymentId = payment?.id || payment?.payment_id
    if(!paymentId || ownerQrActionLoadingId){
      return
    }

    const key = String(paymentId)
    setOwnerQrActionLoadingId(key)
    setOwnerQrActionError("")

    try{
      const result = await confirmOwnerQrPayment(paymentId)

      if(!result?.ok){
        const code = String(result?.error || result?.detail?.error || result?.message || "OWNER_QR_CONFIRM_FAILED")
        throw new Error(code)
      }

      await loadOwnerQrPayments()
    }catch(error){
      setOwnerQrActionError(uiError(getOwnerQrActionErrorMessage(error?.message || "OWNER_QR_CONFIRM_FAILED")))
    }finally{
      setOwnerQrActionLoadingId("")
    }
  }

  async function rejectOwnerQrBooking(payment){
    const paymentId = payment?.id || payment?.payment_id
    if(!paymentId || ownerQrActionLoadingId){
      return
    }

    const reason = typeof window !== "undefined" ? window.prompt(renderUi(uiMessage("salon.s0307")), "") : ""
    const rejectionReason = String(reason || "").trim()

    if(!rejectionReason){
      setOwnerQrActionError(uiError(uiMessage("salon.s0308")))
      return
    }

    const key = String(paymentId)
    setOwnerQrActionLoadingId(key)
    setOwnerQrActionError("")

    try{
      const result = await rejectOwnerQrPayment(paymentId, rejectionReason)

      if(!result?.ok){
        const code = String(result?.error || result?.detail?.error || result?.message || "OWNER_QR_REJECT_FAILED")
        throw new Error(code)
      }

      await loadOwnerQrPayments()
    }catch(error){
      setOwnerQrActionError(uiError(getOwnerQrActionErrorMessage(error?.message || "OWNER_QR_REJECT_FAILED")))
    }finally{
      setOwnerQrActionLoadingId("")
    }
  }

  async function loadMasterNotifications(){
    if(!slug){
      setUnreadCount(0)
      return
    }

    try{
      setNotificationsLoading(true)
      setNotificationsError("")

      const result = await getMasterNotifications(slug, { limit: 20 })
      const items = getSafeNotificationList(result)
      setNotifications(items)
      setUnreadCount(getResolvedUnreadCount(result, items))
    }catch(error){
      console.error("MASTER NOTIFICATIONS LOAD ERROR", error)
      setNotifications([])
      setUnreadCount(0)
      setNotificationsError(uiError(error?.message || "MASTER_NOTIFICATIONS_LOAD_FAILED"))
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
      if(!notification?.read_at && !notification?.is_read){
        setUnreadCount((current)=>Math.max(0, current - 1))
      }

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
  const financeCardAmount = Number(paymentProjectionSummary?.history_amount || 0)
  const visibleNotifications = useMemo(() => {
    if (notificationsExpanded || notifications.length <= 4) {
      return notifications
    }

    return notifications.slice(0, 4)
  }, [notifications, notificationsExpanded])
  const hiddenNotificationsCount = Math.max(0, notifications.length - visibleNotifications.length)
  const billingUi = useMemo(
    ()=>getBillingUi(billingAccess, billingBlockReason),
    [billingAccess, billingBlockReason]
  )
  const roleLabel = uiMessage("salon.s0094")
  const masterSlugLabel = String(slug || "").trim() || uiMessage("master.s0053")

  if (error) {
    return (
      <div style={{
        padding: "20px",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 46%, #f8fafc 100%)",
        minHeight: "100vh"
      }}>
        <div style={{
          maxWidth: 1240,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)"
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280" }}><UiValue value={uiMessage("master.s0054")} /></div>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#111827" }}><UiValue value={uiMessage("master.s0055")} /></h2>
          <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.5 }}><UiValue value={uiMessage("master.s0056")} /></p>
        </div>
        <div style={{
          marginTop: 14,
          border: "1px solid #f5c2c7",
          background: "#fff5f5",
          color: "#b42318",
          borderRadius: "16px",
          padding: "16px",
        }}><UiValue value={uiMessage("salon.s0314")} /></div>
        {slug ? (
          <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}><UiValue value={uiMessage("salon.s0315")} /><UiValue value={slug} />
          </div>
        ) : null}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        padding: "20px",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 46%, #f8fafc 100%)",
        minHeight: "100vh"
      }}>
        <div style={{
          maxWidth: 1240,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)"
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280" }}><UiValue value={uiMessage("master.s0054")} /></div>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#111827" }}><UiValue value={uiMessage("master.s0059")} /></h2>
          <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.5 }}><UiValue value={uiMessage("master.s0060")} /></p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: "20px",
      background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 46%, #f8fafc 100%)",
      minHeight: "100vh"
    }}>
      <div style={{
        maxWidth: 1240,
        margin: "0 auto",
        display: "grid",
        gap: 16
      }}>
      <section style={{
        background: "linear-gradient(135deg, #111827 0%, #1d4ed8 50%, #6366f1 100%)",
        color: "#fff",
        borderRadius: 28,
        padding: 24,
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.82 }}><UiValue value={uiMessage("master.s0054")} /></div>
            <h2 style={{ margin: "10px 0 8px", fontSize: 34, lineHeight: 1.05 }}><UiValue value={uiMessage("master.s0021")} /><UiValue value={masterName ? uiTemplate([" — ",""], [masterName]) : ""} />
            </h2>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.92)", maxWidth: 760 }}><UiValue value={uiMessage("master.s0061")} /></div>
          </div>

          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontSize: 12,
              fontWeight: 700
            }}>
              <UiValue value={roleLabel} />
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontSize: 12,
              fontWeight: 700
            }}>
              <UiValue value={masterSlugLabel} />
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontSize: 12,
              fontWeight: 700
            }}><UiValue value={uiMessage("salon.s0261")} /></span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 12, fontWeight: 700 }}><UiValue value={uiMessage("salon.s0014")} /></span>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 12, fontWeight: 700 }}><UiValue value={uiMessage("salon.s0361")} /></span>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 12, fontWeight: 700 }}><UiValue value={uiMessage("salon.s0017")} /></span>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 12, fontWeight: 700 }}><UiValue value={uiMessage("salon.s0325")} /></span>
        </div>
      </section>

      <PageSection>
        <div style={{
          border: uiTemplate(["1px solid ",""], [billingUi.border]),
          background: billingUi.bg,
          color: billingUi.tone,
          borderRadius: "18px",
          padding: "18px",
          marginBottom: "16px",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)"
        }}>
          <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "6px" }}><UiValue value={billingUi.label} /></div>
          <div style={{ fontSize: "13px", lineHeight: 1.45 }}><UiValue value={billingUi.note} /></div>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#344054" }}><UiValue value={uiMessage("salon.s0005")} /><strong><UiValue value={canWrite ? uiMessage("salon.s0006") : uiMessage("salon.s0007")} /></strong><UiValue value={uiMessage("salon.s0008")} /><strong><UiValue value={canWithdraw ? uiMessage("salon.s0009") : uiMessage("salon.s0010")} /></strong>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px"
        }}>
          <StatCard title={uiMessage("salon.s0327")} value={safeMetrics.bookings_today || 0} />
          <StatCard title={uiMessage("salon.s0329")} value={safeMetrics.bookings_week || 0} />
          <StatCard title={uiMessage("salon.s0331")} value={safeMetrics.clients_total || 0} />
          <StatCard title={uiMessage("salon.s0335")} value={money(financeCardAmount)} />
          <StatCard title={uiMessage("salon.s0337")} value={money(financeCardAmount)} />
        </div>

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
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991b1b", marginBottom: "4px" }}><UiValue value={uiMessage("salon.s0339")} /></div>
              <div style={{ fontSize: "12px", color: "#7f1d1d", lineHeight: 1.45 }}><UiValue value={uiMessage("master.s0071")} /></div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "28px",
                padding: "0 12px",
                borderRadius: "999px",
                background: "#fff7ed",
                color: "#c2410c",
                fontSize: "12px",
                fontWeight: 800
              }}>
                <UiValue value={Number(safeMetrics.cash_pending_exposure_count || 0)} /><UiValue value={uiMessage("salon.s0341")} /></span>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "28px",
                padding: "0 12px",
                borderRadius: "999px",
                background: "#f8fafc",
                color: "#374151",
                fontSize: "12px",
                fontWeight: 800
              }}>
                <UiValue value={money(safeMetrics.cash_pending_exposure_amount || 0)} />
              </span>
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
              <UiValue value={pendingCashError} />
            </div>
          ) : null}

          {pendingCashLoading ? (
            <div style={{ fontSize: "13px", color: "#7f1d1d" }}><UiValue value={uiMessage("salon.s0342")} /></div>
          ) : pendingCashBookings.length ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {pendingCashBookings.slice(0, 5).map((booking) => {
                const amount = getBookingAmount(booking)
                const key = String(booking?.id || "")
                const isConfirming = confirmingCashKey === key

                return (
                  <div
                    key={key || uiTemplate(["","-",""], [booking?.service_name || "booking", booking?.start_at || ""])}
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
                          <UiValue value={booking?.service_name || uiMessage("salon.s0231")} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#7f1d1d", marginTop: "4px" }}>
                          <UiValue value={booking?.start_at ? formatNotificationDate(booking.start_at) : "—"} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#7f1d1d", marginTop: "4px" }}>
                          <UiValue value={booking?.salon_name || uiMessage("salon.s0319")} />
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
                          <UiValue value={getPaymentLabelRu(booking)} />
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#7f1d1d" }}>
                          <UiValue value={amount > 0 ? money(amount, booking?.currency_code || booking?.currency) : money(booking?.price_snapshot, booking?.currency_code || booking?.currency)} />
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
                        <UiValue value={isConfirming ? uiMessage("salon.s0343") : uiMessage("salon.s0344")} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "#7f1d1d" }}><UiValue value={uiMessage("salon.s0345")} /></div>
          )}
        </div>
      </PageSection>

      <PageSection title={uiMessage("salon.s0346")}>
        <div style={{
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          background: "#fff",
          padding: "16px"
        }}>
          <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.5, marginBottom: "12px" }}><UiValue value={uiMessage("salon.s0347")} /></div>

          {ownerQrActionError ? (
            <div style={{
              border: "1px solid #fca5a5",
              borderRadius: "14px",
              background: "#fff5f5",
              color: "#b91c1c",
              padding: "12px",
              fontSize: "13px",
              marginBottom: "12px"
            }}>
              <UiValue value={ownerQrActionError} />
            </div>
          ) : null}

          {ownerQrError ? (
            <div style={{
              border: "1px solid #fca5a5",
              borderRadius: "14px",
              background: "#fff",
              color: "#b91c1c",
              padding: "12px",
              fontSize: "13px",
              marginBottom: "12px"
            }}>
              <UiValue value={ownerQrError} />
            </div>
          ) : null}

          {ownerQrLoading ? (
            <div style={{ fontSize: "13px", color: "#7f1d1d" }}><UiValue value={uiMessage("salon.s0348")} /></div>
          ) : ownerQrPayments.length ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {ownerQrPayments.slice(0, 10).map((payment) => {
                const key = String(payment?.id || payment?.payment_id || "")
                const amount = getOwnerQrPaymentAmount(payment)
                const status = String(payment?.status || payment?.payment_status || "").toLowerCase()
                const isPending = status === "pending_owner_confirmation" || status === "pending"
                const isBusy = ownerQrActionLoadingId === key
                const clientName = String(payment?.client_name || payment?.client?.name || "").trim()
                const clientPhone = String(payment?.client_phone || payment?.client?.phone || "").trim()
                const serviceName = String(payment?.service_name || payment?.service?.name || "").trim()
                const bookingStartAt = payment?.booking_start_at || payment?.start_at || payment?.booking?.start_at || ""
                const createdAt = payment?.created_at || payment?.payment_created_at || ""
                const rejectedAt = payment?.rejected_at || ""
                const rejectionReason = String(payment?.rejection_reason || "").trim()

                return (
                  <div
                    key={key || uiTemplate(["","-",""], [payment?.booking_id || "owner-qr", payment?.created_at || ""])}
                    style={{
                      display: "grid",
                      gap: "10px",
                      padding: "12px",
                      borderRadius: "14px",
                      background: "#ffffff",
                      border: status === "rejected" ? "1px solid #fecaca" : "1px solid #e5e7eb"
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
                        <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0349")} /><UiValue value={payment?.booking_id || "—"} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                          <UiValue value={serviceName || uiMessage("salon.s0231")} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                          <UiValue value={bookingStartAt ? formatNotificationDate(bookingStartAt) : "—"} />
                        </div>
                      </div>

                      <div style={{ display: "grid", justifyItems: "end", gap: "6px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "5px 9px",
                          borderRadius: "999px",
                          background: status === "rejected" ? "#fef2f2" : "#eff6ff",
                          color: status === "rejected" ? "#991b1b" : "#1d4ed8",
                          fontSize: "12px",
                          fontWeight: 800,
                          border: status === "rejected" ? "1px solid #fecaca" : "1px solid #bfdbfe"
                        }}>
                          <UiValue value={getOwnerQrPaymentStatusLabel(payment)} />
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                          <UiValue value={amount > 0 ? money(amount, payment?.currency_code || payment?.currency) : money(payment?.amount, payment?.currency_code || payment?.currency)} />
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.55, display: "grid", gap: "4px" }}>
                      {clientName ? <div><UiValue value={uiMessage("salon.s0350")} /><strong><UiValue value={clientName} /></strong></div> : null}
                      {clientPhone ? <div><UiValue value={uiMessage("salon.s0351")} /><strong><UiValue value={clientPhone} /></strong></div> : null}
                      <div><UiValue value={uiMessage("salon.s0352")} /><strong><UiValue value={createdAt ? formatNotificationDate(createdAt) : "—"} /></strong></div>
                      {status === "rejected" && rejectedAt ? (
                        <div><UiValue value={uiMessage("salon.s0353")} /><strong><UiValue value={formatNotificationDate(rejectedAt)} /></strong></div>
                      ) : null}
                      {rejectionReason ? <div style={{ color: "#991b1b" }}><UiValue value={uiMessage("salon.s0354")} /><strong><UiValue value={rejectionReason} /></strong></div> : null}
                    </div>

                    {isPending ? (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => confirmOwnerQrBooking(payment)}
                          disabled={isBusy}
                          style={{
                            minHeight: "40px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1px solid #2563eb",
                            background: isBusy ? "#dbeafe" : "#2563eb",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: isBusy ? "default" : "pointer"
                          }}
                        >
                          <UiValue value={isBusy ? uiMessage("salon.s0343") : uiMessage("salon.s0355")} />
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectOwnerQrBooking(payment)}
                          disabled={isBusy}
                          style={{
                            minHeight: "40px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1px solid #dc2626",
                            background: isBusy ? "#fee2e2" : "#dc2626",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: isBusy ? "default" : "pointer"
                          }}
                        >
                          <UiValue value={isBusy ? uiMessage("salon.s0356") : uiMessage("salon.s0357")} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0358")} /></div>
          )}
        </div>
      </PageSection>

      <PageSection title={uiMessage("master.s0092")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <QuickAction to={uiTemplate(["/master/","/bookings"], [slug])} title={uiMessage("master.s0093")} note={uiMessage("salon.s0360")} />
          <QuickAction to={uiTemplate(["/master/","/schedule"], [slug])} title={uiMessage("master.s0095")} note={uiMessage("master.s0096")} />
          <QuickAction to={uiTemplate(["/master/","/clients"], [slug])} title={uiMessage("master.s0097")} note={uiMessage("master.s0098")} />
          <QuickAction to={uiTemplate(["/master/","/finance"], [slug])} title={uiMessage("salon.s0832")} note={uiMessage("master.s0100")} />
        </div>
      </PageSection>

      <OwnerBookingQrCard
        ownerType="master"
        slug={slug}
        title={uiMessage("master.s0101")}
        subtitle={uiMessage("master.s0102")}
      />

      <OwnerPushOptInCard
        ownerType="master"
        slug={slug}
        title={uiMessage("salon.s0367")}
        subtitle={uiMessage("master.s0104")}
      />

      <PageSection title={(
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span><UiValue value={uiMessage("salon.s0387")} /></span>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: "12px",
            fontWeight: 700
          }}><UiValue value={uiMessage("salon.s0388")} /><UiValue value={unreadCount} />
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
          }}><UiValue value={uiMessage("salon.s0389")} /></div>
        ) : notificationsError ? (
          <div style={{
            border: "1px solid #f5c2c7",
            borderRadius: "14px",
            background: "#fff5f5",
            color: "#b42318",
            padding: "14px",
            fontSize: "14px"
          }}><UiValue value={uiMessage("salon.s0390")} /></div>
        ) : notifications.length ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {visibleNotifications.map((notification)=>{
              const uid = getNotificationUid(notification)
              const isRead = Boolean(notification?.is_read || notification?.read_at)
              const title = <NotificationText notification={notification} field="title" fallback={uiMessage("salon.s0391")} />
              const body = <NotificationText notification={notification} field="body" />
              const type = notification?.target_type || notification?.action_type || "—"
              const priority = notification?.priority || "normal"
              const actionUrl = String(notification?.action_url || "").trim()
              const hasAction = Boolean(actionUrl)
              const isExternal = /^https?:\/\//i.test(actionUrl)

              return (
                <div
                  key={uid || uiTemplate(["","-",""], [title, notification?.created_at || ""])}
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
                        <UiValue value={title} />
                      </div>
                      {body ? (
                        <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          <UiValue value={body} />
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
                      <UiValue value={isRead ? uiMessage("salon.s0392") : uiMessage("salon.s0393")} />
                    </div>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#667085"
                  }}>
                    <div><UiValue value={uiMessage("salon.s0394")} /><strong style={{ color: "#344054" }}><UiValue value={type} /></strong></div>
                    <div><UiValue value={uiMessage("salon.s0395")} /><strong style={{ color: "#344054" }}><UiValue value={priority} /></strong></div>
                    <div><UiValue value={uiMessage("salon.s0352")} /><strong style={{ color: "#344054" }}><UiValue value={formatNotificationDate(notification?.created_at)} /></strong></div>
                    <div><UiValue value={uiMessage("salon.s0396")} /><strong style={{ color: "#344054" }}><UiValue value={isRead ? uiMessage("salon.s0392") : uiMessage("salon.s0397")} /></strong></div>
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
                      ><UiValue value={uiMessage("salon.s0398")} /></a>
                    </div>
                  ) : null}

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
                      ><UiValue value={uiMessage("salon.s0399")} /></button>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {hiddenNotificationsCount > 0 ? (
              <button
                type="button"
                onClick={() => setNotificationsExpanded((current) => !current)}
                style={{
                  width: "100%",
                  border: "1px solid #d0d5dd",
                  borderRadius: "10px",
                  background: "#fff",
                  color: "#344054",
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "10px 14px",
                  cursor: "pointer"
                }}
              >
                <UiValue value={notificationsExpanded ? uiMessage("salon.s0166") : uiMessage("salon.s0167", {p0: hiddenNotificationsCount})} />
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            background: "#fff",
            padding: "14px",
            color: "#6b7280",
            fontSize: "14px"
          }}><UiValue value={uiMessage("salon.s0400")} /></div>
        )}
      </PageSection>

      <PageSection title={uiMessage("salon.s0401")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <RouteCard to={uiTemplate(["/master/","/bookings"], [slug])} title={uiMessage("master.s0122")} note={uiMessage("master.s0123")} />
          <RouteCard to={uiTemplate(["/master/","/schedule"], [slug])} title={uiMessage("master.s0124")} note={uiMessage("master.s0125")} />
          <RouteCard to={uiTemplate(["/master/","/money"], [slug])} title={uiMessage("salon.s0412")} note={uiMessage("salon.s0404")} tone="finance" />
          <RouteCard to={uiTemplate(["/master/","/payouts"], [slug])} title={uiMessage("master.s0128")} note={uiMessage("master.s0129")} tone="finance" />
        </div>
      </PageSection>

      <PageSection title={uiMessage("salon.s0407")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <SummaryCard
            title={uiMessage("salon.s0408")}
            value={safeMetrics.bookings_today || 0}
            note={uiMessage("master.s0132")}
          />
          <SummaryCard
            title={uiMessage("salon.s0412")}
            value={money(financeCardAmount)}
            note={uiMessage("master.s0133")}
          />
          <SummaryCard
            title={uiMessage("master.s0134")}
            value={safeMetrics.clients_total || 0}
            note={uiMessage("master.s0135")}
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
          }}><UiValue value={uiMessage("salon.s0419")} /></div>
        </PageSection>
      ) : null}
      </div>
    </div>
  )
}
