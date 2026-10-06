import { NotificationText } from "../../i18n/NotificationText.jsx";
import { UiValue, uiMessage, uiMoney, uiDate, uiTemplate, uiConcat, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import PageSection from "../../cabinet/PageSection"
import EmptyState from "../../cabinet/EmptyState"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"
import OwnerPushOptInCard from "../../components/OwnerPushOptInCard"
import {
  confirmOwnerQrPayment,
  confirmSalonCashPayment,
  closeSalonCollectionAnchors,
  getBookings as getSalonBookings,
  getSalonCollectionAnchors,
  getSalonMetrics,
  getSalonRentObligations,
  getSalonSalaryObligations,
  getSalonOwnerQrPayments,
  getSalonPaymentProjections,
  rejectOwnerQrPayment
} from "../../api/internal"
import { getSalonNotifications, markSalonNotificationRead } from "../../api/salon.js"

function money(value, currency) { return uiMoney(value, currency); }

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

function getCollectionAnchorOwnerLabel(value){
  const status = String(value || "").trim().toLowerCase()

  if(status === "master") return uiMessage("salon.s0287")
  if(status === "salon") return uiMessage("salon.s0288")
  if(status === "unknown") return uiMessage("salon.s0289")
  if(status === "conflict") return uiMessage("salon.s0290")
  return status ? status : "—"
}

function getCollectionAnchorStatusLabel(value){
  const status = String(value || "").trim().toLowerCase()

  if(status === "open") return uiMessage("salon.s0047")
  if(status === "closed") return uiMessage("salon.s0291")
  if(status === "not_needed") return uiMessage("salon.s0292")
  if(status === "unknown") return uiMessage("salon.s0289")
  if(status === "conflict") return uiMessage("salon.s0290")
  return status ? status : "—"
}

function getCollectionAnchorRows(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.rows)) return payload.rows
  if(Array.isArray(payload?.items)) return payload.items
  if(Array.isArray(payload?.anchors)) return payload.anchors
  return []
}

function readCollectionAnchorMetric(summary, keys = []){
  const source = summary && typeof summary === "object" ? summary : {}

  for(const key of keys){
    const raw = source?.[key]
    if(raw && typeof raw === "object"){
      const count = Number(
        raw.count ??
        raw.total_count ??
        raw.items_count ??
        raw.row_count ??
        raw.anchor_count ??
        raw.value ??
        0
      )
      const amount = Number(
        raw.amount ??
        raw.total_amount ??
        raw.amount_total ??
        raw.sum ??
        0
      )
      return {
        count: Number.isFinite(count) ? count : null,
        amount: Number.isFinite(amount) ? amount : null
      }
    }
  }

  for(const key of keys){
    const countKey = uiTemplate(["","_count"], [key])
    const amountKey = uiTemplate(["","_amount"], [key])
    const hasCount = Object.prototype.hasOwnProperty.call(source, countKey)
    const hasAmount = Object.prototype.hasOwnProperty.call(source, amountKey)
    const hasRaw = Object.prototype.hasOwnProperty.call(source, key)

    if(hasCount || hasAmount || hasRaw){
      const count = hasCount ? Number(source?.[countKey]) : null
      const amount = hasAmount ? Number(source?.[amountKey]) : (hasRaw ? Number(source?.[key]) : null)
      return {
        count: Number.isFinite(count) ? count : null,
        amount: Number.isFinite(amount) ? amount : null
      }
    }
  }

  for(const key of keys){
    if(Object.prototype.hasOwnProperty.call(source, key)){
      const amount = Number(source?.[key])
      if(Number.isFinite(amount)){
        return { count: null, amount }
      }
    }
  }

  return { count: null, amount: null }
}

function formatCollectionAnchorMetric(summary, keys = []){
  const metric = readCollectionAnchorMetric(summary, keys)

  if(metric.amount === null && metric.count === null){
    return "—"
  }

  if(metric.count === null){
    return money(metric.amount, metric?.currency_code || metric?.currency)
  }

  if(metric.amount === null){
    return String(metric.count)
  }

  return uiTemplate([""," / ",""], [Number(metric.count), money(metric.amount, metric?.currency_code || metric?.currency)])
}

function formatCollectionAnchorCount(summary, keys = []){
  const metric = readCollectionAnchorMetric(summary, keys)
  if(metric.count === null) return "—"
  return String(Number(metric.count))
}

function getCollectionAnchorMasterLabel(row){
  return String(
    row?.master_name ||
    row?.master_slug ||
    row?.master?.name ||
    row?.master?.slug ||
    row?.master_id ||
    row?.beneficiary_master_id ||
    "—"
  ).trim() || "—"
}

function getCollectionAnchorSaloonLabel(row){
  return String(
    row?.salon_name ||
    row?.salon_slug ||
    row?.salon?.name ||
    row?.salon?.slug ||
    row?.salon_id ||
    "—"
  ).trim() || "—"
}

function getCollectionAnchorRowKey(row, index){
  return String(row?.id || row?.payment_id || row?.source_id || uiTemplate(["",""], [index]))
}

const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Bishkek"

function resolveBusinessTimeZone(source){
  const directTimezone = [
    source?.timezone,
    source?.time_zone,
    source?.business_timezone,
    source?.salon_timezone,
    source?.master_timezone,
    source?.contract_timezone
  ].find((value) => String(value || "").trim())

  if(directTimezone){
    return String(directTimezone).trim()
  }

  const cityCandidates = [
    source?.city,
    source?.salon_city,
    source?.master_city,
    source?.location_city
  ]

  for(const cityValue of cityCandidates){
    const city = String(cityValue || "").trim().toLowerCase()

    if(!city){
      continue
    }

    if(city.includes("bishkek") || city.includes("бишкек")){
      return "Asia/Bishkek"
    }

    if(
      city.includes("almaty") ||
      city.includes("алматы") ||
      city.includes("астана") ||
      city.includes("nur-sultan") ||
      city.includes("нур-султан") ||
      city.includes("nur sultan")
    ){
      return "Asia/Almaty"
    }
  }

  return DEFAULT_BUSINESS_TIME_ZONE
}

function formatBusinessDateTime(value, source){ if (!value) return "—"; return uiDate(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function formatSignedMoney(value, sign, currency) { const amount = Number(value); if (value == null || value === "" || !Number.isFinite(amount)) return String(value ?? ""); const prefix = sign === "-" ? "-" : sign === "+" ? "+" : ""; return uiConcat(prefix, uiMoney(Math.abs(amount), currency)); }

function normalizeObligationStatus(value){
  return String(value || "").trim().toLowerCase()
}

function getObligationStatusLabel(value){
  const status = normalizeObligationStatus(value)

  if(status === "overdue") return uiMessage("salon.s0045")
  if(status === "upcoming") return uiMessage("salon.s0046")
  if(status === "open") return uiMessage("salon.s0047")
  if(status === "paid") return uiMessage("salon.s0048")
  if(status === "cancelled") return uiMessage("salon.s0049")
  if(status === "voided") return uiMessage("salon.s0050")
  if(status === "active") return uiMessage("salon.s0041")
  if(status === "pending") return uiMessage("salon.s0042")
  if(status === "archived") return uiMessage("salon.s0294")

  return value || "—"
}

function getObligationPriority(item){
  const status = normalizeObligationStatus(item?.status)

  if(status === "overdue"){
    return 0
  }

  if(status === "open" || status === "active"){
    return 1
  }

  if(status === "upcoming" || status === "pending"){
    return 2
  }

  if(status === "paid"){
    return 3
  }

  return 4
}

function getObligationAmount(item){
  const amount = Number(item?.amount ?? item?.open_amount ?? item?.paid_amount ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function buildSalonObligationSummary(rentObligations, salaryObligations){
  const rentRows = Array.isArray(rentObligations) ? rentObligations : []
  const salaryRows = Array.isArray(salaryObligations) ? salaryObligations : []
  const combined = [
    ...rentRows.map((item) => ({ ...item, obligation_type: "rent" })),
    ...salaryRows.map((item) => ({ ...item, obligation_type: "salary" }))
  ]

  const summary = {
    open_count: 0,
    overdue_count: 0,
    rent_receivable_amount: 0,
    salary_payable_amount: 0,
    rent_received_amount: 0,
    salary_paid_amount: 0,
    priority_obligation: null,
    priority_label: null,
    priority_note: null
  }

  let priorityCandidate = null

  for(const item of combined){
    const status = normalizeObligationStatus(item?.status)
    const amount = getObligationAmount(item)
    const isOpenish = status === "open" || status === "overdue" || status === "upcoming" || status === "active" || status === "pending"

    if(isOpenish){
      summary.open_count += 1
    }

    if(status === "overdue"){
      summary.overdue_count += 1
    }

    if(item?.obligation_type === "rent"){
      if(isOpenish){
        summary.rent_receivable_amount += amount
      }

      if(status === "paid"){
        summary.rent_received_amount += amount
      }
    }

    if(item?.obligation_type === "salary"){
      if(isOpenish){
        summary.salary_payable_amount += amount
      }

      if(status === "paid"){
        summary.salary_paid_amount += amount
      }
    }

    const priorityRank = getObligationPriority(item)
    const candidateTime = new Date(
      item?.due_at ||
      item?.period_start ||
      item?.paid_at ||
      item?.created_at ||
      0
    ).getTime() || 0

    if(!priorityCandidate){
      priorityCandidate = {
        item,
        rank: priorityRank,
        time: candidateTime
      }
      continue
    }

    const shouldReplace =
      priorityRank < priorityCandidate.rank ||
      (
        priorityRank === priorityCandidate.rank &&
        (
          priorityRank === 3
            ? candidateTime > priorityCandidate.time
            : candidateTime < priorityCandidate.time
        )
      )

    if(shouldReplace){
      priorityCandidate = {
        item,
        rank: priorityRank,
        time: candidateTime
      }
    }
  }

  if(priorityCandidate?.item){
    const priorityItem = priorityCandidate.item
    const kindLabel = priorityItem.obligation_type === "salary" ? uiMessage("salon.s0039") : uiMessage("salon.s0053")
    const priorityLabel = getObligationStatusLabel(priorityItem?.status)

    summary.priority_obligation = priorityItem
    summary.priority_label = priorityLabel
    summary.priority_note = uiTemplate([""," · ",""], [kindLabel, formatBusinessDateTime(priorityItem?.due_at || priorityItem?.period_start || priorityItem?.paid_at || priorityItem?.created_at, priorityItem)])
  }

  return summary
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

function StatGrid({ children }){
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "12px"
    }}>
      <UiValue value={children} />
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
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}><UiValue value={value} /></div>
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

function formatNotificationDate(value){ if (!value) return "—"; return uiDate(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

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
      <UiValue value={children} />
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
      <UiValue value={children} />
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
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.82)", marginBottom: "8px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}><UiValue value={value} /></div>
      {note ? (
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.78)", marginTop: "6px", lineHeight: 1.35 }}>
          <UiValue value={note} />
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
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", fontWeight: 700 }}><UiValue value={title} /></div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}><UiValue value={value} /></div>
      {note ? (
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px", lineHeight: 1.45 }}><UiValue value={note} /></div>
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
      <div style={{ padding: "18px" }}><UiValue value={children} /></div>
    </div>
  )
}

export default function DashboardPage(){
  const { renderUi } = useUiMessages();
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
  const [paymentProjectionSummary, setPaymentProjectionSummary] = useState(null)
  const [contractObligations, setContractObligations] = useState({ rent: [], salary: [], summary: null })
  const [contractObligationsLoading, setContractObligationsLoading] = useState(true)
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
  const [collectionAnchors, setCollectionAnchors] = useState(null)
  const [collectionAnchorsLoading, setCollectionAnchorsLoading] = useState(true)
  const [collectionAnchorsError, setCollectionAnchorsError] = useState("")
  const [collectionAnchorsNotice, setCollectionAnchorsNotice] = useState("")
  const [closingAnchorId, setClosingAnchorId] = useState("")
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState("")
  const [readingNotificationUid, setReadingNotificationUid] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsExpanded, setNotificationsExpanded] = useState(false)

  useEffect(() => {
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
          setMetricsError(uiError(error?.message || "SALON_METRICS_LOAD_FAILED"))
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

    async function loadPaymentProjectionSummary(){
      if(!slug){
        if(!cancelled) setPaymentProjectionSummary(null)
        return
      }

      try{
        const result = await getSalonPaymentProjections(slug)
        if(!cancelled){
          setPaymentProjectionSummary(result?.ok ? (result.summary || null) : null)
        }
      }catch(error){
        if(!cancelled) setPaymentProjectionSummary(null)
      }
    }

    loadPaymentProjectionSummary()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadContractObligations(){
      if(!slug){
        if(!cancelled){
          setContractObligations({ rent: [], salary: [], summary: null })
          setContractObligationsLoading(false)
        }
        return
      }

      try{
        setContractObligationsLoading(true)

        const [rentResult, salaryResult] = await Promise.allSettled([
          getSalonRentObligations(slug),
          getSalonSalaryObligations(slug)
        ])

        if(cancelled){
          return
        }

        const rentOk = rentResult.status === "fulfilled" && rentResult.value?.ok
        const salaryOk = salaryResult.status === "fulfilled" && salaryResult.value?.ok

        if(!rentOk || !salaryOk){
          setContractObligations({ rent: [], salary: [], summary: null })
          return
        }

        const rent = Array.isArray(rentResult.value?.obligations) ? rentResult.value.obligations : []
        const salary = Array.isArray(salaryResult.value?.obligations) ? salaryResult.value.obligations : []

        setContractObligations({
          rent,
          salary,
          summary: buildSalonObligationSummary(rent, salary)
        })
      }catch(error){
        if(!cancelled){
          setContractObligations({ rent: [], salary: [], summary: null })
        }
      }finally{
        if(!cancelled){
          setContractObligationsLoading(false)
        }
      }
    }

    void loadContractObligations()

    return () => {
      cancelled = true
    }
  }, [slug])

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

      const result = await getSalonOwnerQrPayments(slug)

      if(!result?.ok){
        const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
        throw new Error(status ? "SALON_OWNER_QR_HTTP_" + status : (result?.error || "SALON_OWNER_QR_LOAD_FAILED"))
      }

      const payments = getSafeOwnerQrPaymentList(result).filter(isOwnerQrPayment)
      setOwnerQrPayments(payments)
    }catch(error){
      console.error("SALON DASHBOARD OWNER QR LOAD ERROR", error)
      setOwnerQrPayments([])
      setOwnerQrError(uiError(error?.message || "SALON_OWNER_QR_LOAD_FAILED"))
    }finally{
      setOwnerQrLoading(false)
    }
  }

  useEffect(() => {
    loadOwnerQrPayments()
  }, [slug])

  async function fetchCollectionAnchors(){
    if(!slug){
      return { ok:false, error:"SALON_SLUG_MISSING" }
    }

    return getSalonCollectionAnchors(slug, { limit: 100 })
  }

  useEffect(() => {
    let cancelled = false

    async function loadCollectionAnchors(){
      if(!slug){
        if(!cancelled){
          setCollectionAnchors(null)
          setCollectionAnchorsLoading(false)
          setCollectionAnchorsError("")
          setCollectionAnchorsNotice("")
        }
        return
      }

      try{
        if(!cancelled){
          setCollectionAnchorsLoading(true)
          setCollectionAnchorsError("")
          setCollectionAnchorsNotice("")
        }

        const result = await fetchCollectionAnchors()

        if(cancelled){
          return
        }

        if(result?.ok){
          setCollectionAnchors(result)
        }else{
          setCollectionAnchors(null)
          setCollectionAnchorsError(uiError(uiMessage("salon.s0306")))
        }
      }catch(error){
        console.error("SALON DASHBOARD COLLECTION ANCHORS LOAD ERROR", error)

        if(!cancelled){
          setCollectionAnchors(null)
          setCollectionAnchorsError(uiError(uiMessage("salon.s0306")))
        }
      }finally{
        if(!cancelled){
          setCollectionAnchorsLoading(false)
        }
      }
    }

    void loadCollectionAnchors()

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
          setPendingCashError(uiError(error?.message || "SALON_PENDING_CASH_LOAD_FAILED"))
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
          setNotificationsError(uiError(error?.message || "SALON_NOTIFICATIONS_LOAD_FAILED"))
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
      setPendingCashError(uiError(error?.message || "SALON_CASH_CONFIRM_FAILED"))
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

  async function closeCollectionAnchor(row){
    const anchorId = String(row?.id || "").trim()
    const paymentId = Number(row?.payment_id || row?.paymentId || 0)
    const actionKey = anchorId || String(Number.isFinite(paymentId) && paymentId > 0 ? paymentId : "")

    if(!actionKey){
      return
    }

    const confirmed = typeof window !== "undefined"
      ? window.confirm(renderUi(uiMessage("salon.s0309")))
      : false

    if(!confirmed){
      return
    }

    setClosingAnchorId(actionKey)
    setCollectionAnchorsError("")
    setCollectionAnchorsNotice("")

    try{
      const payload = anchorId
        ? {
            anchor_ids: [anchorId],
            payment_ids: [],
            close_note: "Закрыто из кабинета салона"
          }
        : {
            anchor_ids: [],
            payment_ids: [paymentId],
            close_note: "Закрыто из кабинета салона"
          }

      const result = await closeSalonCollectionAnchors(slug, payload)

      if(!result?.ok){
        throw new Error(result?.error || "SALON_COLLECTION_ANCHORS_CLOSE_FAILED")
      }

      const refreshed = await fetchCollectionAnchors()
      if(refreshed?.ok){
        setCollectionAnchors(refreshed)
      }

      setCollectionAnchorsNotice(uiMessage("salon.s0311"))
    }catch(error){
      console.error("SALON COLLECTION ANCHORS CLOSE ERROR", error)
      setCollectionAnchorsNotice("")
      setCollectionAnchorsError(uiError(uiError(error?.message, uiMessage("salon.s0312"))))
    }finally{
      setClosingAnchorId("")
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
      setNotificationsError(uiError(error?.message || "SALON_NOTIFICATIONS_LOAD_FAILED"))
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
  const financeCardAmount = Number(paymentProjectionSummary?.history_amount || 0)
  const visibleNotifications = useMemo(() => {
    if (notificationsExpanded || notifications.length <= 4) {
      return notifications
    }

    return notifications.slice(0, 4)
  }, [notifications, notificationsExpanded])
  const hiddenNotificationsCount = Math.max(0, notifications.length - visibleNotifications.length)
  const billingUi = useMemo(
    () => getBillingUi(billingAccess, billingBlockReason),
    [billingAccess, billingBlockReason]
  )
  const collectionAnchorSummary = collectionAnchors?.summary || null
  const collectionAnchorRows = getCollectionAnchorRows(collectionAnchors)
  const collectionAnchorByMaster = Array.isArray(collectionAnchors?.by_master) ? collectionAnchors.by_master : []

  if(error){
    return (
      <div style={{ padding: "20px" }}>
        <h2><UiValue value={uiMessage("salon.s0313")} /></h2>
        <div style={{
          border: "1px solid #f5c2c7",
          background: "#fff5f5",
          color: "#b42318",
          borderRadius: "10px",
          padding: "12px",
          marginTop: "10px"
        }}><UiValue value={uiMessage("salon.s0314")} /></div>
        {slug ? (
          <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}><UiValue value={uiMessage("salon.s0315")} /><UiValue value={slug} />
          </div>
        ) : null}
      </div>
    )
  }

  if(loading){
    return (
      <div style={{ padding: "20px" }}>
        <h2><UiValue value={uiMessage("salon.s0313")} /></h2>
        <p><UiValue value={uiMessage("salon.s0118")} /></p>
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
              <div style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.72, fontWeight: 800 }}><UiValue value={uiMessage("salon.s0316")} /></div>
              <h2 style={{ margin: "8px 0 0", fontSize: "30px", lineHeight: 1.08, letterSpacing: "-0.03em" }}><UiValue value={uiMessage("salon.s0317")} /></h2>
              <div style={{ marginTop: "10px", fontSize: "15px", lineHeight: 1.6, maxWidth: "760px", color: "rgba(255,255,255,0.88)" }}><UiValue value={uiMessage("salon.s0318")} /></div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-end" }}>
              <HeroPill tone="default"><UiValue value={uiMessage("salon.s0319")} /></HeroPill>
              <HeroPill tone="neutral"><UiValue value={slug || "slug"} /></HeroPill>
              <HeroPill tone="success"><UiValue value={billingUi.label} /></HeroPill>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            <HeroMetric
              title={uiMessage("salon.s0213")}
              value={safeMetrics.bookings_today || 0}
              note={uiMessage("salon.s0320")}
            />
            <HeroMetric
              title={uiMessage("salon.s0017")}
              value={money(financeCardAmount)}
              note={canWithdraw ? uiMessage("salon.s0321") : uiMessage("salon.s0322")}
            />
            <HeroMetric
              title={uiMessage("salon.s0323")}
              value={safeMetrics.masters_active || 0}
              note={uiMessage("salon.s0324")}
            />
            <HeroMetric
              title={uiMessage("salon.s0325")}
              value={safeMetrics.clients_total || 0}
              note={uiMessage("salon.s0326")}
            />
          </div>
        </div>
      </SurfaceCard>

      <SectionFrame>
        <div style={{
          border: uiTemplate(["1px solid ",""], [billingUi.border]),
          background: billingUi.bg,
          color: billingUi.tone,
          borderRadius: "20px",
          padding: "18px"
        }}>
          <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "6px" }}><UiValue value={billingUi.label} /></div>
          <div style={{ fontSize: "13px", lineHeight: 1.45 }}><UiValue value={billingUi.note} /></div>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#344054" }}><UiValue value={uiMessage("salon.s0005")} /><strong><UiValue value={canWrite ? uiMessage("salon.s0006") : uiMessage("salon.s0007")} /></strong><UiValue value={uiMessage("salon.s0008")} /><strong><UiValue value={canWithdraw ? uiMessage("salon.s0009") : uiMessage("salon.s0010")} /></strong>
          </div>
        </div>
      </SectionFrame>

      <PageSection title={uiMessage("salon.s0213")}>
        <StatGrid>
          <CompactMetric title={uiMessage("salon.s0327")} value={safeMetrics.bookings_today || 0} note={uiMessage("salon.s0328")} />
          <CompactMetric title={uiMessage("salon.s0329")} value={safeMetrics.bookings_week || 0} note={uiMessage("salon.s0330")} />
          <CompactMetric title={uiMessage("salon.s0331")} value={safeMetrics.clients_total || 0} note={uiMessage("salon.s0332")} />
          <CompactMetric title={uiMessage("salon.s0333")} value={safeMetrics.masters_active || 0} note={uiMessage("salon.s0334")} />
          <CompactMetric title={uiMessage("salon.s0335")} value={money(financeCardAmount)} note={uiMessage("salon.s0336")} />
          <CompactMetric title={uiMessage("salon.s0337")} value={money(financeCardAmount)} note={uiMessage("salon.s0338")} />
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
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991b1b", marginBottom: "4px" }}><UiValue value={uiMessage("salon.s0339")} /></div>
              <div style={{ fontSize: "12px", color: "#7f1d1d", lineHeight: 1.45 }}><UiValue value={uiMessage("salon.s0340")} /></div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <HeroPill tone="accent">
                <UiValue value={Number(safeMetrics.cash_pending_exposure_count || 0)} /><UiValue value={uiMessage("salon.s0341")} /></HeroPill>
              <HeroPill tone="neutral">
                <UiValue value={money(safeMetrics.cash_pending_exposure_amount || 0)} />
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
                          <UiValue value={formatNotificationDate(booking?.start_at)} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#7f1d1d", marginTop: "4px" }}>
                          <UiValue value={booking?.master_name || uiMessage("salon.s0094")} />
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
                          <UiValue value={amount > 0 ? money(amount) : money(booking?.price_snapshot, booking?.currency_code || booking?.currency)} />
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
                          <UiValue value={amount > 0 ? money(amount) : money(payment?.amount, payment?.currency_code || payment?.currency)} />
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

      <PageSection title={uiMessage("salon.s0359")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <QuickAction to={buildSalonPath(slug, "bookings")} title={uiMessage("salon.s0014")} note={uiMessage("salon.s0360")} />
          <QuickAction to={buildSalonPath(slug, "calendar")} title={uiMessage("salon.s0361")} note={uiMessage("salon.s0362")} />
          <QuickAction to={buildSalonPath(slug, "masters")} title={uiMessage("salon.s0323")} note={uiMessage("salon.s0363")} />
          <QuickAction to={buildSalonPath(slug, "finance")} title={uiMessage("salon.s0017")} note={uiMessage("salon.s0364")} />
        </div>
      </PageSection>

      <OwnerBookingQrCard
        ownerType="salon"
        slug={slug}
        title={uiMessage("salon.s0365")}
        subtitle={uiMessage("salon.s0366")}
      />

      <OwnerPushOptInCard
        ownerType="salon"
        slug={slug}
        title={uiMessage("salon.s0367")}
        subtitle={uiMessage("salon.s0368")}
      />

      <PageSection title={uiMessage("salon.s0369")}>
        <div style={{
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          background: "#fff",
          padding: "16px"
        }}>
          <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.5, marginBottom: "12px" }}><UiValue value={uiMessage("salon.s0370")} /></div>

          {collectionAnchorsError ? (
            <div style={{
              border: "1px solid #fca5a5",
              borderRadius: "14px",
              background: "#fff5f5",
              color: "#b91c1c",
              padding: "12px",
              fontSize: "13px",
              marginBottom: "12px"
            }}>
              <UiValue value={collectionAnchorsError} />
            </div>
          ) : null}

          {collectionAnchorsNotice ? (
            <div style={{
              border: "1px solid #86efac",
              borderRadius: "14px",
              background: "#f0fdf4",
              color: "#166534",
              padding: "12px",
              fontSize: "13px",
              marginBottom: "12px"
            }}>
              <UiValue value={collectionAnchorsNotice} />
            </div>
          ) : null}

          {collectionAnchorsLoading ? (
            <div style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0371")} /></div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px"
              }}>
                <SummaryCard
                  title={uiMessage("salon.s0288")}
                  value={formatCollectionAnchorMetric(collectionAnchorSummary, ["collected_by_salon", "open_to_transfer"])}
                  note={uiMessage("salon.s0372")}
                />
                <SummaryCard
                  title={uiMessage("salon.s0287")}
                  value={formatCollectionAnchorMetric(collectionAnchorSummary, ["collected_by_master"])}
                  note={uiMessage("salon.s0373")}
                />
                <SummaryCard
                  title={uiMessage("salon.s0289")}
                  value={formatCollectionAnchorMetric(collectionAnchorSummary, ["unknown"])}
                  note={uiMessage("salon.s0374")}
                />
                <SummaryCard
                  title={uiMessage("salon.s0290")}
                  value={formatCollectionAnchorMetric(collectionAnchorSummary, ["conflict"])}
                  note={uiMessage("salon.s0375")}
                />
                <SummaryCard
                  title={uiMessage("salon.s0291")}
                  value={formatCollectionAnchorMetric(collectionAnchorSummary, ["closed_transfers"])}
                  note={uiMessage("salon.s0376")}
                />
              </div>

              {collectionAnchorByMaster.length ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0377")} /></div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {collectionAnchorByMaster.slice(0, 12).map((item, index) => (
                      <div
                        key={item?.master_id || item?.master_slug || item?.master_name || index}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "14px",
                          background: "#fff",
                          padding: "12px",
                          display: "grid",
                          gap: "8px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                              <UiValue value={item?.master_name || item?.master_slug || uiMessage("salon.s0378", {p0: index + 1})} />
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                              <UiValue value={item?.master_slug || "—"} /><UiValue value={item?.master_id ? uiTemplate([" · ID ",""], [item.master_id]) : ""} />
                            </div>
                          </div>

                          <div style={{ display: "grid", justifyItems: "end", gap: "6px" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: "12px",
                              fontWeight: 800,
                              border: "1px solid #bfdbfe"
                            }}>
                              <UiValue value={item?.collector_owner_type === "master" ? uiMessage("salon.s0287") : item?.collector_owner_type === "salon" ? uiMessage("salon.s0288") : getCollectionAnchorOwnerLabel(item?.collector_owner_type)} />
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                              <UiValue value={money(item?.total_paid || item?.amount || item?.total_amount || item?.amount_total || 0)} />
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.45 }}>
                          <UiValue value={Number(item?.payment_count || item?.count || item?.anchor_count || item?.total_count || 0) > 0
                            ? uiMessage("salon.s0379", {p0: Number(item?.payment_count || item?.count || item?.anchor_count || item?.total_count || 0)})
                            : "—"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {collectionAnchorRows.length ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  {collectionAnchorRows.map((row, index) => {
                    const key = getCollectionAnchorRowKey(row, index)
                    const rowAmount = Number(row?.amount || row?.payment_amount || row?.price_snapshot || 0)
                    const canClose = String(row?.collector_owner_type || "").toLowerCase() === "salon" && String(row?.anchor_status || "").toLowerCase() === "open"
                    const isClosing = closingAnchorId === key
                    const masterLabel = getCollectionAnchorMasterLabel(row)
                    const sourceType = String(row?.source_type || row?.source || "—").trim() || "—"
                    const sourceId = String(row?.source_id || row?.payment_id || row?.booking_id || "—").trim() || "—"

                    return (
                      <div
                        key={key}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "14px",
                          background: "#fff",
                          padding: "12px",
                          display: "grid",
                          gap: "10px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0380")} /><UiValue value={row?.payment_id || "—"} />
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                              <UiValue value={row?.booking_id ? uiMessage("salon.s0381", {p0: row.booking_id}) : uiMessage("salon.s0382")} /> · <UiValue value={masterLabel} />
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}><UiValue value={uiMessage("salon.s0383")} /><UiValue value={sourceType} /> · <UiValue value={sourceId} />
                            </div>
                          </div>

                          <div style={{ display: "grid", justifyItems: "end", gap: "6px" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              background: "#f8fafc",
                              color: "#334155",
                              fontSize: "12px",
                              fontWeight: 800,
                              border: "1px solid #e2e8f0"
                            }}>
                              <UiValue value={getCollectionAnchorOwnerLabel(row?.collector_owner_type)} />
                            </span>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: "12px",
                              fontWeight: 800,
                              border: "1px solid #bfdbfe"
                            }}>
                              <UiValue value={getCollectionAnchorStatusLabel(row?.anchor_status)} />
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                              <UiValue value={money(rowAmount)} />
                            </span>
                          </div>
                        </div>

                        {canClose ? (
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => closeCollectionAnchor(row)}
                              disabled={isClosing}
                              style={{
                                minHeight: "40px",
                                padding: "0 14px",
                                borderRadius: "10px",
                                border: "1px solid #1d4ed8",
                                background: isClosing ? "#dbeafe" : "#1d4ed8",
                                color: "#fff",
                                fontSize: "13px",
                                fontWeight: 800,
                                cursor: isClosing ? "default" : "pointer"
                              }}
                            >
                              <UiValue value={isClosing ? uiMessage("salon.s0384") : uiMessage("salon.s0385")} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0386")} /></div>
              )}
            </div>
          )}
        </div>
      </PageSection>

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
            {visibleNotifications.map((notification) => {
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
          <RouteCard to={buildSalonPath(slug, "bookings")} title={uiMessage("salon.s0014")} note={uiMessage("salon.s0402")} />
          <RouteCard to={buildSalonPath(slug, "calendar")} title={uiMessage("salon.s0361")} note={uiMessage("salon.s0403")} />
          <RouteCard to={buildSalonPath(slug, "money")} title={uiMessage("salon.s0017")} note={uiMessage("salon.s0404")} tone="finance" />
          <RouteCard to={buildSalonPath(slug, "contracts")} title={uiMessage("salon.s0405")} note={uiMessage("salon.s0406")} tone="finance" />
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
            note={uiMessage("salon.s0409")}
          />
          <SummaryCard
            title={uiMessage("salon.s0410")}
            value={safeMetrics.masters_active || 0}
            note={uiMessage("salon.s0411")}
          />
          <SummaryCard
            title={uiMessage("salon.s0412")}
            value={money(financeCardAmount)}
            note={uiMessage("salon.s0413")}
          />
        </div>
      </PageSection>

      <PageSection
        title={uiMessage("salon.s0122")}
        right={(
          <Link
            to={buildSalonPath(slug, "contracts")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "40px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #d0d5dd",
              background: "#ffffff",
              color: "#344054",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700
            }}
          ><UiValue value={uiMessage("salon.s0414")} /></Link>
        )}
      >
        {contractObligationsLoading ? (
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            background: "#fff",
            padding: "14px",
            color: "#6b7280",
            fontSize: "14px"
          }}><UiValue value={uiMessage("salon.s0124")} /></div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px"
            }}>
              <SummaryCard
                title={uiMessage("salon.s0047")}
                value={Number(contractObligations.summary?.open_count || 0)}
                note={uiMessage("salon.s0125")}
              />
              <SummaryCard
                title={uiMessage("salon.s0045")}
                value={Number(contractObligations.summary?.overdue_count || 0)}
                note={uiMessage("salon.s0126")}
              />
              <SummaryCard
                title={uiMessage("salon.s0127")}
                value={formatSignedMoney(contractObligations.summary?.rent_receivable_amount || 0, "+")}
                note={uiMessage("salon.s0128")}
              />
              <SummaryCard
                title={uiMessage("salon.s0129")}
                value={formatSignedMoney(contractObligations.summary?.salary_payable_amount || 0, "-")}
                note={uiMessage("salon.s0130")}
              />
              <SummaryCard
                title={uiMessage("salon.s0415")}
                value={contractObligations.summary?.priority_label || "—"}
                note={contractObligations.summary?.priority_note || uiMessage("salon.s0416")}
              />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px"
            }}>
              <SummaryCard
                title={uiMessage("salon.s0131")}
                value={formatSignedMoney(contractObligations.summary?.rent_received_amount || 0, "+")}
                note={uiMessage("salon.s0132")}
              />
              <SummaryCard
                title={uiMessage("salon.s0133")}
                value={formatSignedMoney(contractObligations.summary?.salary_paid_amount || 0, "+")}
                note={uiMessage("salon.s0134")}
              />
            </div>

            {!contractObligations.rent.length && !contractObligations.salary.length ? (
              <EmptyState message={uiMessage("salon.s0135")} />
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {contractObligations.summary?.priority_obligation ? (
                  <div style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    background: "#fff",
                    padding: "14px"
                  }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}><UiValue value={uiMessage("salon.s0417")} /></div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>
                      <UiValue value={contractObligations.summary.priority_label || "—"} />
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}>
                      <UiValue value={contractObligations.summary.priority_note || uiMessage("salon.s0418")} />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
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
  )
}
