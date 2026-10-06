import { UiValue, uiMessage, uiMoney, uiDate, uiJoin, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import { createSalonWithdrawDestination, getMoneyCoreDestinationProviders, getMoneyCoreFlags, getSalonContracts, getSalonLostProfit, getSalonMetrics, getSalonMoneyCoreSummary, getSalonOwnerQrDestinations, getSalonPaymentProjections, getSalonPayouts, getSalonSettlements, getSalonSplitAllocations, getSalonWalletBalance, getSalonWithdrawDestinations, getSalonWithdrawRequests, getSalonWithdrawSettings } from "../../api/internal"

function money(value, currency) { return uiMoney(value, currency); }

function toNumber(value){
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function cleanStatus(value){
  return String(value || "").trim().toLowerCase()
}

function calculateProjectionStats(rows, destinations, withdrawRequests, ownerQr){
  const safeRows = Array.isArray(rows) ? rows : []
  const safeDestinations = Array.isArray(destinations) ? destinations : []
  const safeWithdrawRequests = Array.isArray(withdrawRequests) ? withdrawRequests : []
  const safeOwnerQr = Array.isArray(ownerQr) ? ownerQr : []

  const confirmedRows = safeRows.filter((row) => {
    const paymentStatus = cleanStatus(row?.payment_status)
    const bookingStatus = cleanStatus(row?.booking_status)
    return paymentStatus === "confirmed" && bookingStatus !== "cancelled" && bookingStatus !== "canceled"
  })

  const rejectedOrCancelledRows = safeRows.filter((row) => {
    const paymentStatus = cleanStatus(row?.payment_status)
    const bookingStatus = cleanStatus(row?.booking_status)
    return paymentStatus !== "confirmed" || bookingStatus === "cancelled" || bookingStatus === "canceled"
  })

  const confirmedGrossAmount = confirmedRows.reduce((sum, row) => {
    const grossAmount = toNumber(row?.gross_amount)
    if (grossAmount !== null) return sum + grossAmount

    const rawGrossAmount = toNumber(row?.raw_gross_amount)
    if (rawGrossAmount !== null) return sum + rawGrossAmount

    return sum + Number(row?.salon_share || 0) + Number(row?.master_share || 0) + Number(row?.platform_share || 0)
  }, 0)

  const salonShare = confirmedRows.reduce((sum, row) => sum + Number(row?.salon_share || 0), 0)
  const masterShare = confirmedRows.reduce((sum, row) => sum + Number(row?.master_share || 0), 0)
  const platformShare = confirmedRows.reduce((sum, row) => sum + Number(row?.platform_share || 0), 0)

  const openBalanceAmount = confirmedRows.reduce((sum, row) => {
    const explicitOpenBalance = toNumber(row?.open_transfer_amount)
    if (explicitOpenBalance !== null) {
      return sum + explicitOpenBalance
    }

    return row?.included_in_open_balance === true
      ? sum + Number(row?.salon_share || 0) + Number(row?.master_share || 0) + Number(row?.platform_share || 0)
      : sum
  }, 0)

  return {
    totalRows: safeRows.length,
    confirmedRows: confirmedRows.length,
    rejectedOrCancelledRows: rejectedOrCancelledRows.length,
    confirmedGrossAmount,
    salonShare,
    masterShare,
    platformShare,
    openBalanceAmount,
    collectorMissingCount: confirmedRows.filter((row) => !cleanStatus(row?.collector_owner_type)).length,
    destinationsCount: safeDestinations.length,
    withdrawRequestsCount: safeWithdrawRequests.length,
    ownerQrCount: safeOwnerQr.length
  }
}

function calculateSplitAllocatedStats(rows){
  const safeRows = Array.isArray(rows) ? rows : []
  return {
    splitAllocatedCount: safeRows.length,
    splitAllocatedAmount: safeRows.reduce((sum, row) => sum + Number(row?.owner_net_amount || 0), 0),
  }
}

const WITHDRAW_REQUEST_USER_STATUS_LABELS = Object.freeze({
  pending_validation: uiMessage("salon.s0839"),
  requires_review: uiMessage("salon.s0840"),
  locked: uiMessage("salon.s0840"),
  queued_for_payout: uiMessage("salon.s0840"),
  bank_processing: uiMessage("salon.s0840"),
  completed: uiMessage("salon.s0841"),
  failed: uiMessage("salon.s0842"),
  canceled: uiMessage("salon.s0843"),
  rejected: uiMessage("salon.s0843")
})

function getWithdrawRequestUserStatusLabel(status){
  const normalizedStatus = cleanStatus(status)
  if(!normalizedStatus) return null
  return WITHDRAW_REQUEST_USER_STATUS_LABELS[normalizedStatus] || null
}

function getWithdrawRequestHistoryDetails(item){
  const status = cleanStatus(item?.status)
  const details = []
  const adminNote = cleanText(item?.admin_note)

  if(status) details.push(uiTemplate(["raw: ",""], [status]))
  if(adminNote){
    details.push(uiMessage("salon.s0844", {p0: adminNote}))
  }

  return uiJoin(details, " · ")
}

function getWithdrawRequestPayoutResultDetails(item){
  const payoutResult = parseMaybeJson(item?.payout_result) || (item?.payout_result && typeof item.payout_result === "object" ? item.payout_result : null) || null
  const completedAt = cleanText(payoutResult?.completed_at || item?.completed_at)
  const failedAt = cleanText(payoutResult?.failed_at || item?.failed_at)
  const failureReason = cleanText(payoutResult?.failure_reason || item?.failure_reason)
  const userMessage = cleanText(payoutResult?.user_message)
  const details = []

  if(completedAt) details.push(uiMessage("salon.s0845", {p0: formatDateTime(completedAt)}))
  if(failedAt) details.push(uiMessage("salon.s0846", {p0: formatDateTime(failedAt)}))
  if(failureReason) details.push(uiMessage("salon.s0847", {p0: failureReason}))
  if(userMessage) details.push(userMessage)

  return uiJoin(details, " · ")
}

function parseMaybeJson(value){
  if(!value) return null
  if(typeof value === "object") return value
  if(typeof value !== "string") return null
  const text = value.trim()
  if(!text) return null
  try{
    return JSON.parse(text)
  }catch{
    return null
  }
}

const WITHDRAW_DESTINATION_RELATION_OPTIONS = [
  "self",
  "company_account",
  "authorized_person",
  "third_party",
  "unknown"
]

const WITHDRAW_DESTINATION_METHOD_OPTIONS = new Set([
  "wallet",
  "card",
  "bank_account",
  "manual_other"
])

const WITHDRAW_DESTINATION_METHOD_LABELS = Object.freeze({
  wallet: uiMessage("salon.s0848"),
  card: uiMessage("salon.s0478"),
  bank_account: uiMessage("salon.s0849"),
  manual_other: uiMessage("salon.s0850")
})

const WITHDRAW_DESTINATION_RELATION_LABELS = Object.freeze({
  self: uiMessage("salon.s0851"),
  company_account: uiMessage("salon.s0852"),
  authorized_person: uiMessage("salon.s0853"),
  third_party: uiMessage("salon.s0854"),
  unknown: uiMessage("salon.s0855")
})

function cleanText(value){
  return typeof value === "string" ? value.trim() : ""
}

function maskPhone(value){
  const text = cleanText(value)
  if(!text) return ""
  if(text.includes("*")) return text
  const digits = text.replace(/\D/g, "")
  if(digits.length <= 4) return text
  const last4 = digits.slice(-4)
  if(digits.startsWith("996")){
    return uiTemplate(["+996•••",""], [last4])
  }
  if(text.startsWith("+")){
    return uiTemplate(["+•••",""], [last4])
  }
  return uiTemplate(["•••",""], [last4])
}

function getWithdrawRequestDestinationSummary(item, destinationsById){
  const destinationId = Number(item?.destination_id || 0)
  const destinationSummary = parseMaybeJson(item?.destination_summary) || (item?.destination_summary && typeof item.destination_summary === "object" ? item.destination_summary : null)
  const destinationByList = destinationsById instanceof Map && destinationId > 0 ? destinationsById.get(destinationId) || null : null
  const destinationSnapshot = parseMaybeJson(item?.destination_snapshot)
  const destination = destinationSummary || destinationByList || destinationSnapshot || null

  if(!destination && !destinationId){
    return uiMessage("salon.s0856")
  }

  const method = cleanText(destination?.method)
  const providerCode = cleanText(destination?.provider_code || destination?.provider || destination?.wallet_provider)
  const walletProvider = cleanText(destination?.wallet_provider)
  const relation = cleanText(destination?.destination_relation)
  const bankName = cleanText(destination?.bank_name)
  const phone = maskPhone(destination?.phone_masked || destination?.phone)
  const accountMasked = cleanText(destination?.account_masked)
  const cardLast4 = cleanText(destination?.card_last4)

  const parts = []
  if(method) parts.push(uiMessage("salon.s0857", {p0: WITHDRAW_DESTINATION_METHOD_LABELS[method] || method}))
  if(providerCode) parts.push(uiMessage("salon.s0858", {p0: providerCode}))
  if(walletProvider && walletProvider !== providerCode) parts.push(uiTemplate(["Wallet provider: ",""], [walletProvider]))
  if(relation) parts.push(uiMessage("salon.s0859", {p0: WITHDRAW_DESTINATION_RELATION_LABELS[relation] || relation}))
  if(bankName) parts.push(uiMessage("salon.s0860", {p0: bankName}))
  if(phone) parts.push(uiMessage("salon.s0861", {p0: phone}))
  if(accountMasked) parts.push(uiMessage("salon.s0862", {p0: accountMasked}))
  if(cardLast4) parts.push(uiMessage("salon.s0863", {p0: cardLast4}))

  if(!parts.length){
    return destinationId > 0 ? uiMessage("salon.s0864", {p0: destinationId}) : uiMessage("salon.s0856")
  }

  return uiJoin(parts, " · ")
}

function buildWithdrawDestinationPreview(providers, draft){
  const selectedProvider = Array.isArray(providers)
    ? providers.find((item) => item?.code === draft.selectedProviderCode) || null
    : null
  const method = cleanText(selectedProvider?.method)
  const destinationRelation = WITHDRAW_DESTINATION_RELATION_OPTIONS.includes(draft.destinationRelation)
    ? draft.destinationRelation
    : "unknown"
  const note = cleanText(draft.note)
  const accountHolder = cleanText(draft.accountHolder)
  const phone = cleanText(draft.phone)
  const bankName = cleanText(draft.bankName)
  const accountMasked = cleanText(draft.accountMasked)
  const cardLast4 = cleanText(draft.cardLast4)
  const errors = []

  if(!selectedProvider){
    errors.push(uiMessage("salon.s0865"))
  }else if(!WITHDRAW_DESTINATION_METHOD_OPTIONS.has(method)){
    errors.push(uiMessage("salon.s0866"))
  }

  if(destinationRelation === "unknown" && draft.destinationRelation !== "unknown"){
    errors.push(uiMessage("salon.s0867"))
  }

  if(method === "bank_account"){
    if(!bankName) errors.push(uiMessage("salon.s0868"))
    if(!accountMasked) errors.push(uiMessage("salon.s0869"))
  }else if(method === "card"){
    if(!accountMasked && !cardLast4) errors.push(uiMessage("salon.s0870"))
  }else if(method === "wallet"){
    if(!phone) errors.push(uiMessage("salon.s0871"))
    if(selectedProvider?.code !== draft.selectedProviderCode){
      errors.push(uiMessage("salon.s0872"))
    }
  }else if(method === "manual_other"){
    if(!accountHolder && !phone && !note && !accountMasked){
      errors.push(uiMessage("salon.s0873"))
    }
  }

  const payloadPreview = !selectedProvider
    ? null
    : method === "bank_account"
      ? {
          method: "bank_account",
          provider_code: selectedProvider.code,
          bank_name: bankName,
          account_masked: accountMasked,
          account_holder: accountHolder,
          destination_relation: destinationRelation,
          payload: { note }
        }
      : method === "card"
        ? {
            method: "card",
            provider_code: selectedProvider.code,
            account_masked: accountMasked,
            card_last4: cardLast4,
            account_holder: accountHolder,
            destination_relation: destinationRelation,
            payload: { note }
          }
        : method === "wallet"
          ? {
              method: "wallet",
              provider_code: selectedProvider.code,
              wallet_provider: selectedProvider.code,
              phone,
              account_holder: accountHolder,
              destination_relation: destinationRelation,
              payload: { note }
            }
          : method === "manual_other"
            ? {
                method: "manual_other",
                provider_code: selectedProvider.code,
                account_holder: accountHolder,
                phone,
                account_masked: accountMasked,
                destination_relation: destinationRelation,
                payload: { note }
              }
            : {
                method,
                provider_code: selectedProvider.code,
                account_holder: accountHolder,
                phone,
                bank_name: bankName,
                account_masked: accountMasked,
                card_last4: cardLast4,
                destination_relation: destinationRelation,
                payload: { note }
              }

  return {
    selectedProvider,
    method,
    destinationRelation,
    accountHolder,
    phone,
    bankName,
    accountMasked,
    cardLast4,
    note,
    errors,
    isReady: errors.length === 0 && Boolean(selectedProvider),
    payloadPreview
  }
}

function buildWithdrawDestinationCreatePayload(preview){
  if(!preview?.selectedProvider || !preview?.method){
    return null
  }

  const payload = {
    method: preview.method,
    provider_code: preview.selectedProvider.code,
    destination_relation: preview.destinationRelation
  }

  if(preview.method === "wallet"){
    payload.wallet_provider = preview.selectedProvider.code
  }

  if(preview.accountHolder){
    payload.account_holder = preview.accountHolder
  }

  if(preview.phone){
    payload.phone = preview.phone
  }

  if(preview.method === "bank_account" && preview.bankName){
    payload.bank_name = preview.bankName
  }

  if(preview.method === "bank_account" && preview.accountMasked){
    payload.account_masked = preview.accountMasked
  }

  if(preview.method === "card" && preview.accountMasked){
    payload.account_masked = preview.accountMasked
  }

  if(preview.method === "card" && preview.cardLast4){
    payload.card_last4 = preview.cardLast4
  }

  if(preview.method === "manual_other" && preview.accountMasked){
    payload.account_masked = preview.accountMasked
  }

  if(preview.note){
    payload.payload = { note: preview.note }
  }

  return payload
}

function formatDateTime(value){ if (!value) return "—"; return uiDate(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function normalizeList(payload, keys){
  if(Array.isArray(payload)) return payload

  for(const key of keys){
    if(Array.isArray(payload?.[key])) return payload[key]
    if(Array.isArray(payload?.data?.[key])) return payload.data[key]
  }

  return []
}

function normalizeMetrics(payload){
  if(payload?.metrics) return payload.metrics
  if(payload?.data?.metrics) return payload.data.metrics
  if(payload && typeof payload === "object") return payload
  return {}
}

function normalizeWallet(payload){
  if(typeof payload?.balance !== "undefined") return Number(payload.balance) || 0
  if(typeof payload?.data?.balance !== "undefined") return Number(payload.data.balance) || 0
  return 0
}

function getBillingUi(billingAccess, billingBlockReason){
  const state = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    billingAccess?.subscription_status ||
    "active"
  ).toLowerCase()

  if(state === "blocked"){
    return {
      title: uiMessage("salon.s0300"),
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: uiError(billingBlockReason, uiMessage("salon.s0874"))
    }
  }

  if(state === "grace"){
    return {
      title: uiMessage("salon.s0302"),
      tone: "#9a6700",
      bg: "#fff8db",
      border: "#facc15",
      note: uiError(billingBlockReason, uiMessage("salon.s0875"))
    }
  }

  return {
    title: uiMessage("salon.s0304"),
    tone: "#027a48",
    bg: "#ecfdf3",
    border: "#abefc6",
    note: uiMessage("salon.s0876")
  }
}

function getContractStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "active") return uiMessage("salon.s0041")
  if(status === "pending") return uiMessage("salon.s0042")
  if(status === "archived") return uiMessage("salon.s0043")
  return value || "—"
}

function getPayoutStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "paid" || status === "completed") return uiMessage("salon.s0877")
  if(status === "pending") return uiMessage("salon.s0042")
  if(status === "processing") return uiMessage("salon.s0878")
  if(status === "failed") return uiMessage("salon.s0506")
  return value || "—"
}

function getSettlementStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "open") return uiMessage("salon.s0879")
  if(status === "closed") return uiMessage("salon.s0880")
  if(status === "pending") return uiMessage("salon.s0042")
  return value || "—"
}

function FinanceNavCard({ to, title, note, active = false }){
  return (
    <Link
      to={to}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: uiTemplate(["1px solid ",""], [active ? "#dbeafe" : "#e5e7eb"]),
        borderRadius: 14,
        background: active ? "#eff6ff" : "#ffffff",
        padding: 14,
        minWidth: 0,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#1d4ed8" : "#111827", marginBottom: 6 }}><UiValue value={title} /></div>
      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}><UiValue value={note} /></div>
    </Link>
  )
}

function Panel({ title, note, children }){
  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.panelTitle}><UiValue value={title} /></h2>
        {note ? <p style={styles.panelNote}><UiValue value={note} /></p> : null}
      </div>
      <div style={{ marginTop: 14 }}><UiValue value={children} /></div>
    </section>
  )
}

function StatCard({ title, value, note }){
  return (
    <article style={styles.statCard}>
      <div style={styles.statLabel}><UiValue value={title} /></div>
      <div style={styles.statValue}><UiValue value={value} /></div>
      {note ? <div style={styles.statNote}><UiValue value={note} /></div> : null}
    </article>
  )
}

function EmptyState({ title, text }){
  return (
    <div style={styles.emptyBox}>
      <h3 style={styles.emptyTitle}><UiValue value={title} /></h3>
      <p style={styles.emptyText}><UiValue value={text} /></p>
    </div>
  )
}

function PreviewRow({ title, meta, value, status }){
  return (
    <article style={styles.previewRow}>
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <h3 style={styles.previewTitle}><UiValue value={title} /></h3>
        {meta ? <p style={styles.previewMeta}><UiValue value={meta} /></p> : null}
      </div>

      <div style={styles.previewAside}>
        {typeof value !== "undefined" ? <div style={styles.previewValue}><UiValue value={value} /></div> : null}
        {status ? <div style={styles.previewStatus}><UiValue value={status} /></div> : null}
      </div>
    </article>
  )
}

export default function SalonFinancePage(){
  const { renderUi } = useUiMessages();
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)

  const {
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason,
    loading: contextLoading,
    error: contextError
  } = useSalonContext()

  const [metrics, setMetrics] = useState({})
  const [walletBalance, setWalletBalance] = useState(0)
  const [contracts, setContracts] = useState([])
  const [settlements, setSettlements] = useState([])
  const [payouts, setPayouts] = useState([])
  const [moneyCoreSummary, setMoneyCoreSummary] = useState(null)
  const [paymentProjectionSummary, setPaymentProjectionSummary] = useState(null)
  const [lostProfit, setLostProfit] = useState(null)
  const [lostProfitLoading, setLostProfitLoading] = useState(true)
  const [lostProfitError, setLostProfitError] = useState("")
  const [moneyCoreFlags, setMoneyCoreFlags] = useState(null)
  const [moneyCoreDestinationProviders, setMoneyCoreDestinationProviders] = useState([])
  const [moneyCoreWithdrawDestinations, setMoneyCoreWithdrawDestinations] = useState([])
  const [moneyCoreWithdrawSettings, setMoneyCoreWithdrawSettings] = useState(null)
  const [moneyCoreWithdrawRequests, setMoneyCoreWithdrawRequests] = useState([])
  const [moneyCoreOwnerQr, setMoneyCoreOwnerQr] = useState([])
  const [moneyCoreSplitAllocations, setMoneyCoreSplitAllocations] = useState([])
  const [moneyCoreSplitAllocationsError, setMoneyCoreSplitAllocationsError] = useState("")
  const [paymentProjectionRows, setPaymentProjectionRows] = useState([])
  const [selectedProviderCode, setSelectedProviderCode] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [phone, setPhone] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountMasked, setAccountMasked] = useState("")
  const [cardLast4, setCardLast4] = useState("")
  const [destinationRelation, setDestinationRelation] = useState("self")
  const [note, setNote] = useState("")
  const [destinationSaving, setDestinationSaving] = useState(false)
  const [destinationSaveStatus, setDestinationSaveStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadFinance(){
      if(!slug){
        if(!cancelled){
          setMetrics({})
          setWalletBalance(0)
          setContracts([])
          setSettlements([])
          setPayouts([])
          setPaymentProjectionSummary(null)
          setPaymentProjectionRows([])
          setMoneyCoreOwnerQr([])
          setError(uiError("SLUG_MISSING"))
          setLoading(false)
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const [
          metricsRaw,
          walletRaw,
          contractsRaw,
          settlementsRaw,
          payoutsRaw,
          paymentProjectionRaw,
          moneyCoreRaw,
          moneyCoreFlagsRaw
        ] = await Promise.all([
          getSalonMetrics(slug),
          getSalonWalletBalance(slug),
          getSalonContracts(slug),
          getSalonSettlements(slug),
          getSalonPayouts(slug),
          getSalonPaymentProjections(slug),
          getSalonMoneyCoreSummary(slug),
          getMoneyCoreFlags()
        ])

        if(cancelled) return

        setMetrics(normalizeMetrics(metricsRaw?.ok ? metricsRaw : {}))
        setWalletBalance(normalizeWallet(walletRaw?.ok ? walletRaw.wallet : {}))
        setContracts(normalizeList(contractsRaw?.ok ? { contracts: contractsRaw.contracts } : {}, ["contracts", "items"]))
        setSettlements(normalizeList(settlementsRaw?.ok ? { settlements: settlementsRaw.settlements } : {}, ["settlements", "periods", "items"]))
        setPayouts(normalizeList(payoutsRaw?.ok ? { payouts: payoutsRaw.payouts } : {}, ["payouts", "items"]))
        setPaymentProjectionSummary(paymentProjectionRaw?.ok ? paymentProjectionRaw.summary : null)
        setPaymentProjectionRows(Array.isArray(paymentProjectionRaw?.rows) ? paymentProjectionRaw.rows : [])
        setMoneyCoreSummary((moneyCoreRaw?.ok ? moneyCoreRaw.summary : null) || moneyCoreRaw?.data || moneyCoreRaw || null)
        setMoneyCoreFlags((moneyCoreFlagsRaw?.ok ? moneyCoreFlagsRaw.flags : null) || moneyCoreFlagsRaw?.data || moneyCoreFlagsRaw || null)
      }catch(loadError){
        console.error("SALON FINANCE LOAD ERROR", loadError)

        if(!cancelled){
          setMetrics({})
          setWalletBalance(0)
          setContracts([])
          setSettlements([])
          setPayouts([])
          setPaymentProjectionSummary(null)
          setPaymentProjectionRows([])
          setMoneyCoreSummary(null)
          setMoneyCoreFlags(null)
          setError(uiError(loadError?.message || "SALON_FINANCE_LOAD_FAILED"))
        }
      }finally{
        if(!cancelled){
          setLoading(false)
        }
      }
    }

    loadFinance()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadLostProfit(){
      if(!slug){
        if(!cancelled){
          setLostProfit(null)
          setLostProfitLoading(false)
          setLostProfitError("")
        }
        return
      }

      try{
        setLostProfitLoading(true)
        setLostProfitError("")

        const result = await getSalonLostProfit(undefined, { limit: 50 })

        if(cancelled) return

        if(result?.ok){
          setLostProfit(result.result || null)
        }else{
          setLostProfit(null)
          setLostProfitError(uiError(uiMessage("salon.s0881")))
        }
      }catch(error){
        console.error("SALON_LOST_PROFIT_LOAD_ERROR", error)

        if(!cancelled){
          setLostProfit(null)
          setLostProfitError(uiError(uiMessage("salon.s0881")))
        }
      }finally{
        if(!cancelled){
          setLostProfitLoading(false)
        }
      }
    }

    void loadLostProfit()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadMoneyCoreCabinet(){
      const ownerSlug = slug

      if(!ownerSlug){
        if(!cancelled){
          setMoneyCoreDestinationProviders([])
          setMoneyCoreWithdrawDestinations([])
          setMoneyCoreWithdrawSettings(null)
          setMoneyCoreWithdrawRequests([])
          setMoneyCoreOwnerQr([])
          setMoneyCoreSplitAllocations([])
          setMoneyCoreSplitAllocationsError("")
        }
        return
      }

      const ownerId = moneyCoreSummary?.owner?.id || null

      if(!ownerId){
        if(!cancelled){
          setMoneyCoreSplitAllocations([])
          setMoneyCoreSplitAllocationsError("")
        }
        return
      }

      try{
        const [
          providersRaw,
          destinationsRaw,
          settingsRaw,
          requestsRaw,
          ownerQrRaw,
          splitAllocationsRaw
        ] = await Promise.all([
          getMoneyCoreDestinationProviders({ enabled: true }),
          getSalonWithdrawDestinations(ownerSlug),
          getSalonWithdrawSettings(ownerSlug),
          getSalonWithdrawRequests(ownerSlug, { limit: 10, offset: 0 }),
          getSalonOwnerQrDestinations(ownerSlug),
          getSalonSplitAllocations(ownerSlug, { owner_id: ownerId })
        ])

        if(cancelled) return

        setMoneyCoreDestinationProviders(Array.isArray(providersRaw?.providers) ? providersRaw.providers : [])
        setMoneyCoreWithdrawDestinations(Array.isArray(destinationsRaw?.destinations) ? destinationsRaw.destinations : [])
        setMoneyCoreWithdrawSettings(settingsRaw?.settings || null)
        setMoneyCoreWithdrawRequests(Array.isArray(requestsRaw?.requests) ? requestsRaw.requests : [])
        setMoneyCoreOwnerQr(Array.isArray(ownerQrRaw?.destinations) ? ownerQrRaw.destinations : [])
        setMoneyCoreSplitAllocations(Array.isArray(splitAllocationsRaw?.allocations) ? splitAllocationsRaw.allocations : [])
        setMoneyCoreSplitAllocationsError(uiError(splitAllocationsRaw?.ok ? "" : uiMessage("salon.s0882")))
      }catch(e){
        if(!cancelled){
          setMoneyCoreDestinationProviders([])
          setMoneyCoreWithdrawDestinations([])
          setMoneyCoreWithdrawSettings(null)
          setMoneyCoreWithdrawRequests([])
          setMoneyCoreOwnerQr([])
          setMoneyCoreSplitAllocations([])
          setMoneyCoreSplitAllocationsError(uiError(uiMessage("salon.s0882")))
        }
      }
    }

    loadMoneyCoreCabinet()

    return () => {
      cancelled = true
    }
  }, [moneyCoreSummary?.owner?.type, moneyCoreSummary?.owner?.id])

  const billingUi = useMemo(
    () => getBillingUi(billingAccess, billingBlockReason),
    [billingAccess, billingBlockReason]
  )

  const activeContracts = useMemo(
    () => contracts.filter((item) => String(item?.status || "").toLowerCase() === "active"),
    [contracts]
  )

  const recentSettlements = useMemo(() => {
    return [...settlements]
      .sort((a, b) => {
        const aTime = new Date(a?.period_end || a?.created_at || 0).getTime() || 0
        const bTime = new Date(b?.period_end || b?.created_at || 0).getTime() || 0
        return bTime - aTime
      })
      .slice(0, 3)
  }, [settlements])

  const recentPayouts = useMemo(() => {
    return [...payouts]
      .sort((a, b) => {
        const aTime = new Date(a?.created_at || a?.paid_at || 0).getTime() || 0
        const bTime = new Date(b?.created_at || b?.paid_at || 0).getTime() || 0
        return bTime - aTime
      })
      .slice(0, 3)
  }, [payouts])

  const metricsView = {
    revenueToday: Number(metrics?.revenue_today || 0),
    revenueMonth: Number(metrics?.revenue_month || 0),
    paymentsTotal: Number(metrics?.payments_total || 0),
    bookingsToday: Number(metrics?.bookings_today || 0)
  }

  const lostProfitSummary = lostProfit?.summary || null
  const lostProfitByMaster = Array.isArray(lostProfit?.by_master) ? lostProfit.by_master : []
  const lostProfitMonthly = Array.isArray(lostProfit?.monthly) ? lostProfit.monthly : []
  const financeStats = useMemo(
    () => calculateProjectionStats(paymentProjectionRows, moneyCoreWithdrawDestinations, moneyCoreWithdrawRequests, moneyCoreOwnerQr),
    [paymentProjectionRows, moneyCoreWithdrawDestinations, moneyCoreWithdrawRequests, moneyCoreOwnerQr]
  )
  const withdrawDestinationById = useMemo(() => {
    const map = new Map()
    for(const item of moneyCoreWithdrawDestinations){
      const id = Number(item?.id || item?.destination_id || 0)
      if(Number.isFinite(id) && id > 0){
        map.set(id, item)
      }
    }
    return map
  }, [moneyCoreWithdrawDestinations])
  const splitAllocatedStats = useMemo(
    () => calculateSplitAllocatedStats(moneyCoreSplitAllocations),
    [moneyCoreSplitAllocations]
  )

  const pageLoading = contextLoading || loading
  const pageError = !pageLoading && (contextError || error)
  const showEmpty = !pageLoading && !pageError && !contracts.length && !settlements.length && !payouts.length && !walletBalance && !Number(paymentProjectionSummary?.history_amount || 0)
  const moneyCoreZones = moneyCoreSummary || {}
  const moneyCoreFlagsData = moneyCoreFlags?.flags || moneyCoreFlags?.data || moneyCoreFlags || null
  const moneyCoreOpen = Boolean(
    moneyCoreFlagsData &&
    moneyCoreFlagsData.MONEY_CORE_ENABLED === true &&
    moneyCoreFlagsData.MONEY_CORE_READ_ONLY === false &&
    moneyCoreFlagsData.MONEY_CORE_WRITE_ENABLED === true &&
    moneyCoreFlagsData.WITHDRAW_REQUESTS_V2_ENABLED === true
  )
  const moneyCoreDestinationWriteOpen = Boolean(
    moneyCoreFlagsData &&
    moneyCoreFlagsData.MONEY_CORE_ENABLED === true &&
    moneyCoreFlagsData.MONEY_CORE_READ_ONLY === false &&
    moneyCoreFlagsData.MONEY_CORE_WRITE_ENABLED === true &&
    moneyCoreFlagsData.WITHDRAW_DESTINATIONS_WRITE_ENABLED === true
  )
  const moneyCoreWithdrawPanelNote = moneyCoreOpen
    ? uiMessage("salon.s0883")
    : uiMessage("salon.s0884")
  const moneyCoreWithdrawStateText = moneyCoreOpen
    ? uiMessage("salon.s0885")
    : uiMessage("salon.s0886")
  const moneyCoreWithdrawSettingsText = moneyCoreOpen
    ? uiMessage("salon.s0887")
    : uiMessage("salon.s0888")
  const moneyCoreWithdrawRequestsText = moneyCoreOpen
    ? uiMessage("salon.s0889")
    : uiMessage("salon.s0890")
  const moneyCoreCreateRequestText = moneyCoreOpen
    ? uiMessage("salon.s0891")
    : uiMessage("salon.s0892")
  const moneyCoreAddRequisitesText = moneyCoreDestinationWriteOpen
    ? uiMessage("salon.s0893")
    : uiMessage("salon.s0894")
  const selectedWithdrawProvider = useMemo(
    () => buildWithdrawDestinationPreview(moneyCoreDestinationProviders, {
      selectedProviderCode,
      accountHolder,
      phone,
      bankName,
      accountMasked,
      cardLast4,
      destinationRelation,
      note
    }),
    [
      moneyCoreDestinationProviders,
      selectedProviderCode,
      accountHolder,
      phone,
      bankName,
      accountMasked,
      cardLast4,
      destinationRelation,
      note
    ]
  )
  const destinationSaveReady = Boolean(
    moneyCoreDestinationWriteOpen &&
    selectedWithdrawProvider.isReady &&
    !destinationSaving
  )

  async function handleSaveWithdrawDestination() {
    if (!moneyCoreDestinationWriteOpen) {
      setDestinationSaveStatus({
        tone: "error",
        text: uiMessage("salon.s0895")
      })
      return
    }

    if (!selectedWithdrawProvider.isReady) {
      setDestinationSaveStatus({
        tone: "error",
        text: selectedWithdrawProvider.errors[0] || uiMessage("salon.s0896")
      })
      return
    }

    const payload = buildWithdrawDestinationCreatePayload(selectedWithdrawProvider)

    if (!payload) {
      setDestinationSaveStatus({
        tone: "error",
        text: uiMessage("salon.s0897")
      })
      return
    }

    setDestinationSaving(true)
    setDestinationSaveStatus(null)

    try {
      const result = await createSalonWithdrawDestination(slug, payload)

      if (result?.ok && result.destination) {
        const refreshed = await getSalonWithdrawDestinations(slug)
        if (refreshed?.ok && Array.isArray(refreshed.destinations)) {
          setMoneyCoreWithdrawDestinations(refreshed.destinations)
        } else {
          setMoneyCoreWithdrawDestinations((current) => {
            const currentList = Array.isArray(current) ? current : []
            const next = [result.destination, ...currentList.filter((item) => item?.id !== result.destination.id)]
            return next
          })
        }

        setSelectedProviderCode("")
        setAccountHolder("")
        setPhone("")
        setBankName("")
        setAccountMasked("")
        setCardLast4("")
        setDestinationRelation("self")
        setNote("")
        setDestinationSaveStatus({
          tone: "success",
          text: uiMessage("salon.s0898")
        })
        return
      }

      const blockedByFlag = result?.detail?.error === "MONEY_CORE_WITHDRAW_DESTINATIONS_WRITE_DISABLED" || result?.detail?.statusCode === 403

      setDestinationSaveStatus({
        tone: "error",
        text: blockedByFlag
          ? uiMessage("salon.s0895")
          : uiError(result?.detail?.message || result?.message || result?.error, uiMessage("salon.s0899"))
      })
    } catch (error) {
      setDestinationSaveStatus({
        tone: "error",
        text: uiError(error?.message, uiMessage("salon.s0899"))
      })
    } finally {
      setDestinationSaving(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {slug ? (
          <nav aria-label={renderUi(uiMessage("salon.s0900"))} style={styles.navGrid}>
            <FinanceNavCard to={buildSalonPath(slug, "finance")} title={uiMessage("salon.s0017")} note={uiMessage("salon.s0901")} active />
            <FinanceNavCard to={buildSalonPath(slug, "money")} title={uiMessage("salon.s0412")} note={uiMessage("salon.s0902")} />
            <FinanceNavCard to={buildSalonPath(slug, "settlements")} title={uiMessage("salon.s0029")} note={uiMessage("salon.s0903")} />
            <FinanceNavCard to={buildSalonPath(slug, "payouts")} title={uiMessage("salon.s0030")} note={uiMessage("salon.s0904")} />
            <FinanceNavCard to={buildSalonPath(slug, "transactions")} title={uiMessage("salon.s0031")} note={uiMessage("salon.s0905")} />
            <FinanceNavCard to={buildSalonPath(slug, "contracts")} title={uiMessage("salon.s0032")} note={uiMessage("salon.s0906")} />
          </nav>
        ) : null}

        <header style={styles.pageHeader}>
          <p style={styles.eyebrow}><UiValue value={uiMessage("salon.s0907")} /></p>
          <h1 style={styles.pageTitle}><UiValue value={uiMessage("salon.s0908")} /></h1>
          <p style={styles.pageSubtitle}><UiValue value={uiMessage("salon.s0909")} /></p>
        </header>

        <section
          style={{
            ...styles.alert,
            borderColor: billingUi.border,
            background: billingUi.bg,
            color: billingUi.tone
          }}
        >
          <div style={styles.alertMain}>
            <h2 style={{ ...styles.alertTitle, color: billingUi.tone }}><UiValue value={billingUi.title} /></h2>
            <p style={styles.alertText}><UiValue value={billingUi.note} /></p>
          </div>
          <div style={styles.alertMeta}>
            <div><UiValue value={uiMessage("salon.s0005")} /><UiValue value={canWrite ? uiMessage("salon.s0910") : uiMessage("salon.s0007")} /></div>
            <div><UiValue value={uiMessage("salon.s0911")} /><UiValue value={canWithdraw ? uiMessage("salon.s0912") : uiMessage("salon.s0913")} /></div>
          </div>
        </section>

        <section style={styles.statsGrid}>
          <StatCard title={uiMessage("salon.s0914")} value={money(walletBalance)} note={uiMessage("salon.s0915")} />
          <StatCard title={uiMessage("salon.s0335")} value={money(paymentProjectionSummary?.history_amount)} note={uiMessage("salon.s0916")} />
          <StatCard title={uiMessage("salon.s0337")} value={money(paymentProjectionSummary?.history_amount)} note={uiMessage("salon.s0917")} />
          <StatCard title={uiMessage("salon.s0918")} value={String(activeContracts.length)} note={uiMessage("salon.s0919")} />
          <StatCard title={uiMessage("salon.s0920")} value={money(paymentProjectionSummary?.history_amount)} note={uiMessage("salon.s0921", {p0: Number(paymentProjectionSummary?.history_count || 0)})} />
          <StatCard title={uiMessage("salon.s0922")} value={money(paymentProjectionSummary?.open_balance_amount)} note={uiMessage("salon.s0923", {p0: Number(paymentProjectionSummary?.open_balance_count || 0)})} />
        </section>

        <Panel
          title={uiMessage("salon.s0924")}
          note={uiMessage("salon.s0925")}
        >
          <section style={styles.statsGrid}>
            <StatCard title={uiMessage("salon.s0926")} value={money(financeStats.confirmedGrossAmount)} note={uiMessage("salon.s0927")} />
            <StatCard title={uiMessage("salon.s0928")} value={money(financeStats.salonShare)} note={uiMessage("salon.s0929")} />
            <StatCard title={uiMessage("salon.s0930")} value={money(financeStats.masterShare)} note={uiMessage("salon.s0931")} />
            <StatCard title={uiMessage("salon.s0932")} value={money(splitAllocatedStats.splitAllocatedAmount)} note={uiMessage("salon.s0933")} />
            <StatCard title={uiMessage("salon.s0934")} value={money(financeStats.openBalanceAmount)} note={uiMessage("salon.s0935")} />
            <StatCard title={uiMessage("salon.s0936")} value={uiMessage("salon.s0937", {p0: financeStats.collectorMissingCount})} note={uiMessage("salon.s0938")} />
            <StatCard title={uiMessage("salon.s0939")} value={uiTemplate([""," / ",""], [financeStats.destinationsCount, financeStats.withdrawRequestsCount])} note={uiMessage("salon.s0940")} />
            <StatCard title={uiMessage("salon.s0941")} value={String(financeStats.ownerQrCount)} note={uiMessage("salon.s0942")} />
          </section>

          <div style={{ display: "grid", gap: 8, marginTop: 14, fontSize: 13, lineHeight: 1.5, color: "#475569" }}>
            {financeStats.confirmedGrossAmount > 0 && financeStats.openBalanceAmount === 0 ? (
              <div><UiValue value={uiMessage("salon.s0943")} /></div>
            ) : null}
            {moneyCoreSplitAllocationsError ? (
              <div><UiValue value={moneyCoreSplitAllocationsError} /></div>
            ) : null}
            {financeStats.destinationsCount === 0 ? (
              <div><UiValue value={uiMessage("salon.s0944")} /></div>
            ) : null}
            {financeStats.withdrawRequestsCount === 0 ? (
              <div><UiValue value={uiMessage("salon.s0945")} /></div>
            ) : null}
          </div>
        </Panel>

        <Panel
          title={uiMessage("salon.s0946")}
          note={uiMessage("salon.s0947")}
        >
          {lostProfitError ? (
            <div style={{ marginBottom: 12, fontSize: 13, color: "#b42318", background: "#fff5f5", border: "1px solid #f5c2c7", borderRadius: 12, padding: 12 }}>
              <UiValue value={lostProfitError} />
            </div>
          ) : null}

          {lostProfitLoading ? (
            <EmptyState
              title={uiMessage("salon.s0948")}
              text={uiMessage("salon.s0949")}
            />
          ) : lostProfitSummary ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={styles.statsGrid}>
                <StatCard title={uiMessage("salon.s0147")} value={money(lostProfitSummary.lost_profit_amount, lostProfitSummary?.currency_code || lostProfitSummary?.currency)} note={uiMessage("salon.s0946")} />
                <StatCard title={uiMessage("salon.s0950")} value={String(Number(lostProfitSummary.cancelled_count || 0))} note={uiMessage("salon.s0951")} />
                {Number(lostProfitSummary.missing_price_count || 0) > 0 ? (
                  <StatCard title={uiMessage("salon.s0952")} value={String(Number(lostProfitSummary.missing_price_count || 0))} note={uiMessage("salon.s0953")} />
                ) : null}
              </div>

              {lostProfitByMaster.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0954")} /></div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {lostProfitByMaster.map((item) => (
                      <PreviewRow
                        key={uiTemplate(["","-",""], [item.master_id, item.master_slug || "master"])}
                        title={item.master_name || item.master_slug || uiMessage("salon.s0427", {p0: item.master_id})}
                        meta={uiMessage("salon.s0955", {p0: item.master_slug || "—", p1: Number(item.cancelled_count || 0)})}
                        value={money(item.lost_profit_amount, item?.currency_code || item?.currency)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {lostProfitMonthly.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0956")} /></div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {lostProfitMonthly.map((item) => (
                      <PreviewRow
                        key={item.month}
                        title={item.month || "—"}
                        meta={uiMessage("salon.s0957", {p0: Number(item.cancelled_count || 0)})}
                        value={money(item.lost_profit_amount, item?.currency_code || item?.currency)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title={uiMessage("salon.s0958")}
              text={uiMessage("salon.s0959")}
            />
          )}
        </Panel>

            <Panel
              title={uiMessage("salon.s0960")}
              note={moneyCoreOpen ? uiMessage("salon.s0961") : uiMessage("salon.s0962")}
            >
          {moneyCoreOpen ? (
            <div style={{ marginBottom: 12, color: "#065f46", background: "#ecfdf3", border: "1px solid #abefc6", borderRadius: 12, padding: 12 }}><UiValue value={uiMessage("salon.s0963")} /></div>
          ) : (
            <div style={{ marginBottom: 12, color: "#92400e", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 12 }}><UiValue value={uiMessage("salon.s0964")} /></div>
          )}

          {moneyCoreSummary ? (
            <div style={styles.statsGrid}>
              <StatCard title={uiMessage("salon.s0965")} value={money(moneyCoreZones.provider_hold)} note={uiMessage("salon.s0965")} />
              <StatCard title={uiMessage("salon.s0966")} value={money(moneyCoreZones.pending_settlement)} note={uiMessage("salon.s0966")} />
              <StatCard title={uiMessage("salon.s0967")} value={money(moneyCoreZones.available)} note={uiMessage("salon.s0968")} />
              <StatCard title={uiMessage("salon.s0969")} value={money(moneyCoreZones.locked)} note={uiMessage("salon.s0970")} />
              <StatCard title={uiMessage("salon.s0971")} value={money(moneyCoreZones.paid_out)} note={uiMessage("salon.s0972")} />
              <StatCard title={uiMessage("salon.s0973")} value={money(moneyCoreZones.refunded)} note={uiMessage("salon.s0973")} />
              <StatCard title={uiMessage("salon.s0974")} value={money(moneyCoreZones.reversed)} note={uiMessage("salon.s0975")} />
              <StatCard title={uiMessage("salon.s0976")} value={money(moneyCoreZones.requires_review)} note={uiMessage("salon.s0976")} />
              <StatCard title={uiMessage("salon.s0977")} value={money(moneyCoreZones.commission)} note={uiMessage("salon.s0978")} />
              <StatCard title={uiMessage("salon.s0979")} value={money(moneyCoreZones.fee_reserved)} note={uiMessage("salon.s0979")} />
            </div>
              ) : (
                <EmptyState
                  title={uiMessage("salon.s0980")}
                  text={uiMessage("salon.s0981")}
                />
              )}

              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <Panel title={uiMessage("salon.s0982")} note={uiMessage("salon.s0983")}>
                  {moneyCoreDestinationProviders.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {moneyCoreDestinationProviders.map((item) => (
                        <PreviewRow
                          key={item.code}
                          title={item.name || item.code}
                          meta={uiTemplate([""," · ",""], [item.code, item.method || "—"])}
                          status={item.enabled ? uiMessage("salon.s0984") : uiMessage("salon.s0421")}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title={uiMessage("salon.s0985")}
                      text={uiMessage("salon.s0986")}
                    />
                  )}
                </Panel>

                <Panel title={uiMessage("salon.s0987")} note={uiMessage("salon.s0988")}>
                  {moneyCoreWithdrawDestinations.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {moneyCoreWithdrawDestinations.map((item) => (
                        <PreviewRow
                          key={item.id}
                          title={item.method || "—"}
                          meta={uiTemplate([""," · ",""], [item.status || "—", item.destination_relation || "—"])}
                          value={item.phone || item.bank_name || item.account_masked || item.card_last4 || "—"}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title={uiMessage("salon.s0989")}
                      text={uiMessage("salon.s0990")}
                    />
                  )}

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eef2f7", display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                        <UiValue value={moneyCoreAddRequisitesText} />
                      </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0991")} /></span>
                        <select
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={selectedProviderCode}
                          onChange={(event) => setSelectedProviderCode(event.target.value)}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: moneyCoreDestinationWriteOpen ? "pointer" : "not-allowed"
                          }}
                        >
                          <option value=""><UiValue value={uiMessage("salon.s0992")} /></option>
                          {moneyCoreDestinationProviders.map((item) => (
                            <option key={item.code} value={item.code}>
                              <UiValue value={item.name || item.code} /> · <UiValue value={item.method || "—"} />
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0993")} /></span>
                        <input
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={accountHolder}
                          onChange={(event) => setAccountHolder(event.target.value)}
                          placeholder={renderUi(uiMessage("salon.s0994"))}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0230")} /></span>
                        <input
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="+996..."
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0849")} /></span>
                        <input
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={bankName}
                          onChange={(event) => setBankName(event.target.value)}
                          placeholder={renderUi(uiMessage("salon.s0996"))}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0997")} /></span>
                        <input
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={accountMasked}
                          onChange={(event) => setAccountMasked(event.target.value)}
                          placeholder="**** 1234"
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0999")} /></span>
                        <input
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={cardLast4}
                          onChange={(event) => setCardLast4(event.target.value)}
                          placeholder="1234"
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1001")} /></span>
                        <select
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={destinationRelation}
                          onChange={(event) => setDestinationRelation(event.target.value)}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: moneyCoreDestinationWriteOpen ? "pointer" : "not-allowed"
                          }}
                        >
                          {WITHDRAW_DESTINATION_RELATION_OPTIONS.map((relation) => (
                            <option key={relation} value={relation}>
                              <UiValue value={relation} />
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1002")} /></span>
                      <textarea
                        disabled={!moneyCoreDestinationWriteOpen}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={renderUi(uiMessage("salon.s1003"))}
                        rows={3}
                        style={{
                          width: "100%",
                          border: "1px solid #d1d5db",
                          borderRadius: 12,
                          background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                          color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                          padding: "12px 14px",
                          fontSize: 14,
                          resize: "vertical",
                          cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                        }}
                      />
                    </label>

                    <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1004")} /></div>
                      <div style={{ fontSize: 13, color: selectedWithdrawProvider.isReady ? "#065f46" : "#92400e", lineHeight: 1.5 }}>
                        <UiValue value={selectedWithdrawProvider.isReady
                          ? uiMessage("salon.s1005")
                          : uiMessage("salon.s1006", {p0: selectedWithdrawProvider.errors.length ? uiTemplate([": ",""], [selectedWithdrawProvider.errors[0]]) : ""})} />
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}><UiValue value={uiMessage("salon.s1007")} /><UiValue value={selectedWithdrawProvider.method || "—"} /><UiValue value={uiMessage("salon.s1008")} /><UiValue value={selectedWithdrawProvider.selectedProvider?.code || "—"} /><UiValue value={uiMessage("salon.s1009")} /><UiValue value={selectedWithdrawProvider.destinationRelation || "—"} />
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                        <UiValue value={selectedWithdrawProvider.method === "wallet"
                          ? uiTemplate(["wallet_provider: ",""], [selectedWithdrawProvider.selectedProvider?.code || "—"])
                          : selectedWithdrawProvider.method === "bank_account"
                            ? uiTemplate(["bank_name: ",""], [selectedWithdrawProvider.bankName || "—"])
                            : selectedWithdrawProvider.method === "card"
                              ? uiTemplate(["card_last4: ",""], [selectedWithdrawProvider.cardLast4 || "—"])
                              : uiTemplate(["safe fields: ",""], [[selectedWithdrawProvider.accountHolder, selectedWithdrawProvider.phone, selectedWithdrawProvider.accountMasked, selectedWithdrawProvider.note].filter(Boolean).length])} />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!destinationSaveReady}
                      onClick={handleSaveWithdrawDestination}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        background: destinationSaveReady ? "#f8fafc" : "#e5e7eb",
                        color: destinationSaveReady ? "#111827" : "#6b7280",
                        padding: "12px 16px",
                        fontWeight: 700,
                        opacity: destinationSaveReady ? 1 : 0.55,
                        cursor: destinationSaveReady ? "pointer" : "not-allowed",
                        justifySelf: "start"
                      }}
                    ><UiValue value={uiMessage("salon.s1010")} /></button>
                    <div style={{ fontSize: 12, color: destinationSaveStatus?.tone === "error" ? "#b91c1c" : destinationSaveStatus?.tone === "success" ? "#065f46" : "#6b7280", lineHeight: 1.5 }}>
                      <UiValue value={destinationSaveStatus?.text || moneyCoreAddRequisitesText} />
                    </div>
                  </div>
                </Panel>

                <Panel title={uiMessage("salon.s1011")} note={moneyCoreWithdrawPanelNote}>
                  {moneyCoreWithdrawSettings ? (
                    <div style={styles.statsGrid}>
                      <StatCard title={uiMessage("salon.s1012")} value={moneyCoreWithdrawSettings.mode || "—"} note={uiMessage("salon.s1013")} />
                      <StatCard title={uiMessage("salon.s1014")} value={String(Boolean(moneyCoreWithdrawSettings.auto_submit_enabled))} note={uiMessage("salon.s1015")} />
                      <StatCard title={uiMessage("salon.s1016")} value={String(Boolean(moneyCoreWithdrawSettings.requires_admin_review))} note={uiMessage("salon.s1017")} />
                      <StatCard title={uiMessage("salon.s1018")} value={moneyCoreWithdrawSettings.amount_mode || "—"} note={uiMessage("salon.s1019")} />
                    </div>
                  ) : (
                    <EmptyState
                      title={uiMessage("salon.s1020")}
                      text={moneyCoreWithdrawSettingsText}
                    />
                  )}
                </Panel>

                <Panel title={uiMessage("salon.s1021")} note={uiMessage("salon.s1022")}>
                  {moneyCoreWithdrawRequests.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {moneyCoreWithdrawRequests.map((item) => {
                        const withdrawRequestStatus = getWithdrawRequestUserStatusLabel(item?.status) || uiMessage("salon.s1023")
                        const withdrawRequestDetails = getWithdrawRequestHistoryDetails(item)
                        const withdrawRequestPayoutResultDetails = getWithdrawRequestPayoutResultDetails(item)
                        const withdrawRequestDestinationDetails = getWithdrawRequestDestinationSummary(item, withdrawDestinationById)

                        return (
                        <PreviewRow
                          key={item.id}
                          title={withdrawRequestStatus}
                          meta={uiMessage("salon.s1024", {p0: item.id || "—", p1: formatDateTime(item.created_at), p2: withdrawRequestDetails ? uiTemplate([" · ",""], [withdrawRequestDetails]) : "", p3: withdrawRequestPayoutResultDetails ? uiTemplate([" · ",""], [withdrawRequestPayoutResultDetails]) : "", p4: withdrawRequestDestinationDetails ? uiTemplate([" · ",""], [withdrawRequestDestinationDetails]) : ""})}
                          value={money(item.amount, item?.currency_code || item?.currency)}
                          status={cleanStatus(item?.status) || null}
                        />
                          )
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title={uiMessage("salon.s1025")}
                      text={moneyCoreWithdrawRequestsText}
                    />
                  )}

                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eef2f7", display: "grid", gap: 12 }}>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                      <UiValue value={moneyCoreCreateRequestText} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0968")} /></div>
                        <div style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, background: "#f9fafb", padding: "12px 14px", fontSize: 14, color: "#111827" }}>
                          <UiValue value={money(moneyCoreZones.available)} />
                        </div>
                      </div>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1026")} /></span>
                        <input
                          disabled
                          defaultValue=""
                          placeholder={renderUi(uiMessage("salon.s0246"))}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1027")} /></span>
                        <select
                          disabled
                          defaultValue=""
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        >
                          <option value=""><UiValue value={uiMessage("salon.s1028")} /></option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1029")} /></span>
                        <textarea
                          disabled
                          defaultValue=""
                          placeholder={renderUi(uiMessage("salon.s1030"))}
                          rows={3}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed",
                            resize: "vertical"
                          }}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      disabled
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        background: "#e5e7eb",
                        color: "#6b7280",
                        padding: "12px 16px",
                        fontWeight: 700,
                        opacity: 0.55,
                        cursor: "not-allowed",
                        justifySelf: "start"
                      }}
                    ><UiValue value={uiMessage("salon.s1031")} /></button>
                  </div>
                </Panel>
              </div>
            </Panel>

        <div style={styles.mainStack}>
          <Panel
            title={uiMessage("salon.s1032")}
            note={uiMessage("salon.s1033")}
          >
            {pageLoading ? <div style={styles.infoText}><UiValue value={uiMessage("salon.s1034")} /></div> : null}

            {pageError ? (
              <EmptyState
                title={contextError ? uiMessage("salon.s1035") : uiMessage("salon.s1036")}
                text={contextError ? uiMessage("salon.s1037") : uiMessage("salon.s1038")}
              />
            ) : null}

            {showEmpty ? (
              <EmptyState
                title={uiMessage("salon.s1039")}
                text={uiMessage("salon.s1040")}
              />
            ) : null}

            {!pageLoading && !pageError && !showEmpty ? (
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1041")} /></div>
                  <div style={styles.infoValue}><UiValue value={Number(paymentProjectionSummary?.history_count || 0)} /></div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s0327")} /></div>
                  <div style={styles.infoValue}><UiValue value={metricsView.bookingsToday} /></div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1042")} /></div>
                  <div style={styles.infoValue}><UiValue value={settlements.length} /></div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1043")} /></div>
                  <div style={styles.infoValue}><UiValue value={payouts.length} /></div>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel
            title={uiMessage("salon.s1044")}
            note={uiMessage("salon.s1045")}
          >
            {slug ? (
              <div style={styles.navOverviewGrid}>
                <FinanceNavCard to={buildSalonPath(slug, "finance")} title={uiMessage("salon.s0017")} note={uiMessage("salon.s0901")} active />
                <FinanceNavCard to={buildSalonPath(slug, "money")} title={uiMessage("salon.s0412")} note={uiMessage("salon.s0902")} />
                <FinanceNavCard to={buildSalonPath(slug, "settlements")} title={uiMessage("salon.s0029")} note={uiMessage("salon.s0903")} />
                <FinanceNavCard to={buildSalonPath(slug, "payouts")} title={uiMessage("salon.s0030")} note={uiMessage("salon.s0904")} />
                <FinanceNavCard to={buildSalonPath(slug, "transactions")} title={uiMessage("salon.s0031")} note={uiMessage("salon.s0905")} />
                <FinanceNavCard to={buildSalonPath(slug, "contracts")} title={uiMessage("salon.s0032")} note={uiMessage("salon.s0906")} />
              </div>
            ) : (
              <EmptyState title={uiMessage("salon.s1046")} text={uiMessage("salon.s1047")} />
            )}
          </Panel>

          {!pageLoading && !pageError && !showEmpty ? (
            <div style={styles.previewGrid}>
              <Panel title={uiMessage("salon.s1048")} note={uiMessage("salon.s1049")}>
                {activeContracts.length === 0 ? (
                  <EmptyState title={uiMessage("salon.s1050")} text={uiMessage("salon.s1051")} />
                ) : (
                  activeContracts.slice(0, 3).map((contract, index) => (
                    <PreviewRow
                      key={contract?.id || index}
                      title={contract?.master_name || contract?.master_slug || contract?.master_id || uiMessage("salon.s0094")}
                      meta={contract?.billing_model || contract?.contract_type || uiMessage("salon.s1052")}
                      value={money(contract?.amount || 0, contract?.currency_code || contract?.currency)}
                      status={getContractStatusLabel(contract?.status)}
                    />
                  ))
                )}
                <div style={styles.linkRow}>
                  <Link to={buildSalonPath(slug, "contracts")} style={styles.inlineLink}><UiValue value={uiMessage("salon.s1053")} /></Link>
                </div>
              </Panel>

              <Panel title={uiMessage("salon.s1054")} note={uiMessage("salon.s1055")}>
                {recentSettlements.length === 0 ? (
                  <EmptyState title={uiMessage("salon.s1056")} text={uiMessage("salon.s1057")} />
                ) : (
                  recentSettlements.map((settlement, index) => (
                    <PreviewRow
                      key={settlement?.id || index}
                      title={uiMessage("salon.s1058", {p0: formatDateTime(settlement?.period_start), p1: formatDateTime(settlement?.period_end)})}
                      meta={settlement?.closed_at ? uiMessage("salon.s1059", {p0: formatDateTime(settlement.closed_at)}) : uiMessage("salon.s1060")}
                      value={money(settlement?.amount || settlement?.total_amount || 0, settlement?.currency_code || settlement?.currency)}
                      status={getSettlementStatusLabel(settlement?.status)}
                    />
                  ))
                )}
                <div style={styles.linkRow}>
                  <Link to={buildSalonPath(slug, "settlements")} style={styles.inlineLink}><UiValue value={uiMessage("salon.s1061")} /></Link>
                </div>
              </Panel>

              <Panel title={uiMessage("salon.s1062")} note={uiMessage("salon.s1063")}>
                {recentPayouts.length === 0 ? (
                  <EmptyState title={uiMessage("salon.s1064")} text={uiMessage("salon.s1065")} />
                ) : (
                  recentPayouts.map((payout, index) => (
                    <PreviewRow
                      key={payout?.id || index}
                      title={payout?.destination || payout?.reference || payout?.reference_id || uiMessage("salon.s1066")}
                      meta={formatDateTime(payout?.paid_at || payout?.created_at)}
                      value={money(payout?.amount || 0, payout?.currency_code || payout?.currency)}
                      status={getPayoutStatusLabel(payout?.status)}
                    />
                  ))
                )}
                <div style={styles.linkRow}>
                  <Link to={buildSalonPath(slug, "payouts")} style={styles.inlineLink}><UiValue value={uiMessage("salon.s1067")} /></Link>
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: 14,
    background: "#f8fafc",
    minHeight: "100%"
  },
  container: {
    maxWidth: 980,
    margin: "0 auto"
  },
  navGrid: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 4,
    marginBottom: 16,
    scrollbarWidth: "thin"
  },
  pageHeader: {
    marginBottom: 16
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    color: "#475467",
    textTransform: "uppercase",
    letterSpacing: "0.04em"
  },
  pageTitle: {
    margin: "6px 0 0",
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#111827"
  },
  pageSubtitle: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.55
  },
  alert: {
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16
  },
  alertMain: {
    minWidth: 0,
    flex: "1 1 240px"
  },
  alertTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800
  },
  alertText: {
    margin: "4px 0 0",
    fontSize: 13,
    lineHeight: 1.45,
    color: "#475467"
  },
  alertMeta: {
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: "right",
    color: "#475467"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#ffffff",
    padding: 14,
    minHeight: 116
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827"
  },
  statNote: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.45
  },
  mainStack: {
    display: "grid",
    gap: 14
  },
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff",
    padding: 16,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  sectionHeader: {
    display: "grid",
    gap: 6
  },
  panelTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#111827"
  },
  panelNote: {
    margin: 0,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12
  },
  infoItem: {
    borderTop: "1px solid #eef2f7",
    paddingTop: 12
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.45
  },
  emptyBox: {
    border: "1px dashed #d1d5db",
    borderRadius: 14,
    background: "#f9fafb",
    padding: 16
  },
  emptyTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#111827"
  },
  emptyText: {
    margin: "6px 0 0",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.5
  },
  navOverviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14
  },
  previewRow: {
    borderTop: "1px solid #eef2f7",
    paddingTop: 12,
    marginTop: 12,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap"
  },
  previewTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#111827"
  },
  previewMeta: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.4
  },
  previewAside: {
    textAlign: "right"
  },
  previewValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827"
  },
  previewStatus: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4
  },
  linkRow: {
    marginTop: 14
  },
  inlineLink: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1d4ed8",
    textDecoration: "none"
  }
}
