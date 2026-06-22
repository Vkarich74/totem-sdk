import React, { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { resolveSalonSlug, buildSalonPath } from "../SalonContext"
import {
  acceptContract as acceptContractApi,
  archiveContract as archiveContractApi,
  confirmSalonRentPayment,
  confirmSalonSalaryObligation,
  createSalonContract,
  getSalonContracts,
  getSalonMasters,
  getSalonRentObligations,
  getSalonSalaryObligations
} from "../../api/internal"

function SectionBlock({ title, hint, right, children, style = {} }) {
  return (
    <section style={{ marginTop: 24, ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap"
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#111827"
            }}
          >
            {title}
          </h2>

          {hint && (
            <p
              style={{
                margin: "6px 0 0 0",
                fontSize: 13,
                color: "#6b7280",
                lineHeight: 1.45,
                maxWidth: 760
              }}
            >
              {hint}
            </p>
          )}
        </div>

        {right && <div>{right}</div>}
      </div>

      {children}
    </section>
  )
}

function Card({ children, soft = false, style = {} }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: soft ? "#fbfcfe" : "#ffffff",
        padding: 18,
        boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
        minWidth: 0,
        ...style
      }}
    >
      {children}
    </div>
  )
}

function InfoBox({ label, value, note }) {
  return (
    <div
      style={{
        border: "1px solid #eef2f7",
        borderRadius: 12,
        padding: 14,
        background: "#ffffff",
        minWidth: 0
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: "#6b7280"
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "6px 0 0 0",
          fontSize: 22,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.15,
          wordBreak: "break-word"
        }}
      >
        {value}
      </p>

      {note && (
        <p
          style={{
            margin: "6px 0 0 0",
            fontSize: 12,
            color: "#9ca3af",
            lineHeight: 1.4
          }}
        >
          {note}
        </p>
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        padding: "18px 16px",
        border: "1px dashed #d1d5db",
        borderRadius: 14,
        background: "#f9fafb",
        color: "#6b7280",
        fontSize: 14
      }}
    >
      {text}
    </div>
  )
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value || 0)

  if (Number.isNaN(amount)) {
    return "-"
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0
  }).format(amount)
}

async function safeReadJson(response) {
  try {
    return await response.json()
  }
  catch {
    return {}
  }
}


function FinanceTab({ href, label, active = false }) {
  return (
    <Link
      to={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: 12,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 700,
        border: active ? "1px solid #111827" : "1px solid #d1d5db",
        background: active ? "#111827" : "#ffffff",
        color: active ? "#ffffff" : "#111827",
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </Link>
  )
}

export default function SalonContractsPage() {
  const [contracts, setContracts] = useState([])
  const [contractsLoading, setContractsLoading] = useState(true)

  const [masters, setMasters] = useState([])
  const [mastersLoading, setMastersLoading] = useState(true)
  const [rentObligations, setRentObligations] = useState([])
  const [rentObligationsSummary, setRentObligationsSummary] = useState(null)
  const [rentObligationsLoading, setRentObligationsLoading] = useState(true)
  const [rentObligationsError, setRentObligationsError] = useState("")
  const [salaryObligations, setSalaryObligations] = useState([])
  const [salaryObligationsSummary, setSalaryObligationsSummary] = useState(null)
  const [salaryObligationsLoading, setSalaryObligationsLoading] = useState(true)
  const [salaryObligationsError, setSalaryObligationsError] = useState("")

  const [selectedMasterId, setSelectedMasterId] = useState("")
  const [selectedObligationMasterId, setSelectedObligationMasterId] = useState("")
  const [contractModel, setContractModel] = useState("percentage")
  const [masterPercent, setMasterPercent] = useState("70")
  const [salonPercent, setSalonPercent] = useState("20")
  const [platformPercent, setPlatformPercent] = useState("10")
  const [payoutSchedule, setPayoutSchedule] = useState("manual")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [currency, setCurrency] = useState("USD")

  const [rentAmount, setRentAmount] = useState("")
  const [rentPeriod, setRentPeriod] = useState("monthly")
  const [settlementMode, setSettlementMode] = useState("accrued")

  const [salaryAmount, setSalaryAmount] = useState("")
  const [salaryPeriod, setSalaryPeriod] = useState("monthly")
  const [bonusPercent, setBonusPercent] = useState("")

  const [hybridBaseType, setHybridBaseType] = useState("salary")
  const [hybridBaseAmount, setHybridBaseAmount] = useState("")
  const [hybridBasePeriod, setHybridBasePeriod] = useState("monthly")

  const [createContractLoading, setCreateContractLoading] = useState(false)
  const [createContractError, setCreateContractError] = useState("")
  const [createContractSuccess, setCreateContractSuccess] = useState("")

  const [contractActionLoadingId, setContractActionLoadingId] = useState("")
  const [obligationActionPendingKey, setObligationActionPendingKey] = useState("")
  const [contractActionError, setContractActionError] = useState("")
  const [contractActionSuccess, setContractActionSuccess] = useState("")
  const [archivedContractsExpanded, setArchivedContractsExpanded] = useState(false)

  const { slug: routeSlug } = useParams()
  const location = useLocation()

  const salonSlug = resolveSalonSlug(routeSlug)

  const financeTabs = useMemo(
    () => [
      { key: "finance", label: "Финансы", href: buildSalonPath(salonSlug, "finance") },
      { key: "money", label: "Доход", href: buildSalonPath(salonSlug, "money") },
      { key: "settlements", label: "Сеты", href: buildSalonPath(salonSlug, "settlements") },
      { key: "payouts", label: "Выплаты", href: buildSalonPath(salonSlug, "payouts") },
      { key: "transactions", label: "Транзакции", href: buildSalonPath(salonSlug, "transactions") },
      { key: "contracts", label: "Контракты", href: buildSalonPath(salonSlug, "contracts") }
    ],
    [salonSlug]
  )

  const pageStyle = {
    minHeight: "100%",
    padding: 20,
    background: "#f6f7fb"
  }

  const shellStyle = {
    maxWidth: 1080,
    margin: "0 auto"
  }

  const pageHeaderStyle = {
    marginBottom: 18
  }

  const pageTitleStyle = {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "#111827"
  }

  const pageSubtitleStyle = {
    margin: "8px 0 0 0",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.55,
    maxWidth: 760
  }

  const pageStackStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 16,
    alignItems: "start"
  }

  const compactGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12
  }

  const financeNavStyle = {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 4,
    marginTop: 16
  }

  const contractsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12
  }

  const formGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12
  }

  const modelGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 10,
    marginBottom: 14
  }

  const tableWrapStyle = {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#ffffff",
    maxWidth: "100%"
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980
  }

  const tableHeadCellStyle = {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap"
  }

  const tableCellStyle = {
    padding: "12px 14px",
    fontSize: 14,
    color: "#111827",
    borderBottom: "1px solid #eef2f7",
    verticalAlign: "top",
    wordBreak: "break-word"
  }

  const inputStyle = {
    width: "100%",
    padding: 10,
    border: "1px solid #d1d5db",
    borderRadius: 10,
    boxSizing: "border-box",
    background: "#ffffff",
    fontSize: 14,
    color: "#111827",
    outline: "none"
  }

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 13,
    color: "#374151"
  }

  const fieldBlockStyle = {
    marginBottom: 14
  }

  const primaryButtonStyle = {
    padding: "11px 16px",
    border: "1px solid #111827",
    borderRadius: 10,
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600
  }

  const secondaryButtonStyle = {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap"
  }

  const dangerButtonStyle = {
    padding: "8px 12px",
    border: "1px solid #fecaca",
    borderRadius: 10,
    background: "#fef2f2",
    color: "#b91c1c",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap"
  }

  useEffect(() => {
    initializePage()
  }, [])

  useEffect(() => {
    if (!salonSlug) {
      setRentObligations([])
      setRentObligationsSummary(null)
      setRentObligationsError("")
      setRentObligationsLoading(false)
      setSalaryObligations([])
      setSalaryObligationsSummary(null)
      setSalaryObligationsError("")
      setSalaryObligationsLoading(false)
      return
    }

    void loadRentObligations()
    void loadSalaryObligations()
  }, [salonSlug])

  async function initializePage() {
    setContractsLoading(true)
    setMastersLoading(true)
    await Promise.all([loadContracts(), loadMasters()])
  }

  async function loadContracts() {
    try {
      const result = await getSalonContracts(salonSlug)

      if (Array.isArray(result?.contracts)) {
        setContracts(result.contracts)
      }
      else {
        setContracts([])
      }
    }
    catch (err) {
      console.error("Contracts load error:", err)
      setContracts([])
    }
    finally {
      setContractsLoading(false)
    }
  }

  async function loadMasters() {
    try {
      const result = await getSalonMasters(salonSlug)

      if (Array.isArray(result?.masters)) {
        setMasters(result.masters)
      }
      else {
        setMasters([])
      }
    }
    catch (err) {
      console.error("Masters load error:", err)
      setMasters([])
    }
    finally {
      setMastersLoading(false)
    }
  }

  async function loadRentObligations() {
    setRentObligationsLoading(true)
    setRentObligationsError("")

    try {
      const result = await getSalonRentObligations(salonSlug)

      if (result?.ok) {
        setRentObligations(Array.isArray(result?.obligations) ? result.obligations : [])
        setRentObligationsSummary(result?.summary || null)
      }
      else {
        setRentObligations([])
        setRentObligationsSummary(null)
        setRentObligationsError("Не удалось загрузить обязательства по аренде.")
      }
    }
    catch (err) {
      console.error("Rent obligations load error:", err)
      setRentObligations([])
      setRentObligationsSummary(null)
      setRentObligationsError("Не удалось загрузить обязательства по аренде.")
    }
    finally {
      setRentObligationsLoading(false)
    }
  }

  async function loadSalaryObligations() {
    setSalaryObligationsLoading(true)
    setSalaryObligationsError("")

    try {
      const result = await getSalonSalaryObligations(salonSlug)

      if (result?.ok) {
        setSalaryObligations(Array.isArray(result?.obligations) ? result.obligations : [])
        setSalaryObligationsSummary(result?.summary || null)
      }
      else {
        setSalaryObligations([])
        setSalaryObligationsSummary(null)
        setSalaryObligationsError("Не удалось загрузить обязательства по зарплате.")
      }
    }
    catch (err) {
      console.error("Salary obligations load error:", err)
      setSalaryObligations([])
      setSalaryObligationsSummary(null)
      setSalaryObligationsError("Не удалось загрузить обязательства по зарплате.")
    }
    finally {
      setSalaryObligationsLoading(false)
    }
  }

  async function refreshContracts() {
    setContractsLoading(true)
    await Promise.all([
      loadContracts(),
      loadRentObligations(),
      loadSalaryObligations()
    ])
  }

  function resetMessages() {
    setCreateContractError("")
    setCreateContractSuccess("")
    setContractActionError("")
    setContractActionSuccess("")
  }

  function resetCreateForm() {
    setSelectedMasterId("")
    setContractModel("percentage")
    setMasterPercent("70")
    setSalonPercent("20")
    setPlatformPercent("10")
    setPayoutSchedule("manual")
    setEffectiveFrom("")
    setCurrency("USD")
    setRentAmount("")
    setRentPeriod("monthly")
    setSettlementMode("accrued")
    setSalaryAmount("")
    setSalaryPeriod("monthly")
    setBonusPercent("")
    setHybridBaseType("salary")
    setHybridBaseAmount("")
    setHybridBasePeriod("monthly")
  }

  function getContractTerms(contract) {
    let terms = {}

    if (typeof contract?.terms_json === "object" && contract?.terms_json !== null) {
      terms = contract.terms_json
    }
    else {
      try {
        terms = JSON.parse(contract?.terms_json || "{}")
      }
      catch {
        terms = {}
      }
    }

    return terms
  }

  function getContractModel(contract) {
    const terms = getContractTerms(contract)
    return terms.model || "percentage"
  }

  function getContractModelLabel(contract) {
    const model = typeof contract === "string" ? contract : getContractModel(contract)

    if (model === "percentage") return "Процентный"
    if (model === "fixed_rent") return "Фиксированная аренда"
    if (model === "salary") return "Зарплата"
    if (model === "hybrid") return "Гибридный"
    return model || "-"
  }

  function getMasterName(contract) {
    const contractMasterId = contract?.master_id
    const contractMasterSlug = contract?.master_slug

    const master = masters.find((item) => {
      return (
        String(item.id) === String(contractMasterId) ||
        String(item.id) === String(contractMasterSlug) ||
        String(item.slug) === String(contractMasterSlug)
      )
    })

    if (!master) {
      return contractMasterSlug || contractMasterId || "-"
    }

    return master.name || master.slug || master.id
  }

  function formatStatus(value) {
    if (value === "active") return "Активный"
    if (value === "pending") return "Ожидает"
    if (value === "archived") return "Архивный"
    if (value === "draft") return "Черновик"
    return value || "-"
  }

  function formatObligationStatus(value) {
    const status = String(value || "").trim().toLowerCase()

    if (status === "overdue") return "Просрочено"
    if (status === "upcoming") return "Предстоящий"
    if (status === "open") return "Открыто"
    if (status === "paid") return "Оплачено"
    if (status === "cancelled") return "Отменено"
    if (status === "voided") return "Аннулировано"
    if (status === "active") return "Активный"
    if (status === "pending") return "Ожидает"
    if (status === "archived") return "Архивный"
    return value || "-"
  }

  function formatDateTime(value, source) {
    if (!value) {
      return "-"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: resolveBusinessTimeZone(source),
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date)
  }

  function getStatusStyle(status) {
    const normalizedStatus = String(status || "").trim().toLowerCase()

    if (normalizedStatus === "overdue") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#b42318",
        background: "#fef2f2"
      }
    }

    if (normalizedStatus === "open" || normalizedStatus === "active") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#a16207",
        background: "#fef3c7"
      }
    }

    if (normalizedStatus === "upcoming" || normalizedStatus === "pending") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#1d4ed8",
        background: "#dbeafe"
      }
    }

    if (normalizedStatus === "paid") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#166534",
        background: "#dcfce7"
      }
    }

    if (normalizedStatus === "cancelled" || normalizedStatus === "voided") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#9f1239",
        background: "#fce7f3"
      }
    }

    if (normalizedStatus === "archived") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#4b5563",
        background: "#e5e7eb"
      }
    }

    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      color: "#374151",
      background: "#f3f4f6"
    }
  }

  function renderCell(content, extraStyle = {}) {
    return (
      <td style={{ ...tableCellStyle, ...extraStyle }}>
        {content}
      </td>
    )
  }

  function getContractSummary(contract) {
    const terms = getContractTerms(contract)
    const model = getContractModel(contract)
    const contractCurrency = terms.currency || currency || "USD"

    if (model === "percentage") {
      const masterValue = terms.master_percent ?? "-"
      const salonValue = terms.salon_percent ?? "-"
      const platformValue = terms.platform_percent ?? "-"
      return `Мастер ${masterValue}% · Салон ${salonValue}% · Платформа ${platformValue}%`
    }

    if (model === "fixed_rent") {
      return `${formatMoney(terms.rent_amount, contractCurrency)} · ${formatPeriodLabel(terms.rent_period)} · ${formatSettlementModeLabel(terms.settlement_mode)}`
    }

    if (model === "salary") {
      const bonusLabel = terms.bonus_percent ? ` · Бонус ${terms.bonus_percent}%` : ""
      return `${formatMoney(terms.salary_amount, contractCurrency)} · ${formatSalaryPeriodLabel(terms.salary_period)}${bonusLabel}`
    }

    if (model === "hybrid") {
      const baseTypeLabel = terms.base_type === "fixed_rent" ? "Аренда" : "Зарплата"
      return `${baseTypeLabel} ${formatMoney(terms.base_amount, contractCurrency)} + ${terms.master_percent ?? "-"}% мастеру`
    }

    return "-"
  }

  function formatPeriodLabel(value) {
    if (value === "daily") return "в день"
    if (value === "weekly") return "в неделю"
    if (value === "monthly") return "в месяц"
    return value || "-"
  }

  function formatSalaryPeriodLabel(value) {
    if (value === "weekly") return "еженедельно"
    if (value === "biweekly") return "раз в две недели"
    if (value === "monthly") return "ежемесячно"
    return value || "-"
  }

  function formatSettlementModeLabel(value) {
    if (value === "prepaid") return "предоплата"
    if (value === "accrued") return "по факту"
    return value || "-"
  }

  function formatCurrencyAmount(value, currencyCode = "KGS") {
    const amount = Number(value || 0)

    if (Number.isNaN(amount)) {
      return "-"
    }

    return `${new Intl.NumberFormat("ru-RU").format(amount)} ${currencyCode}`
  }

  const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Bishkek"

  function resolveBusinessTimeZone(source) {
    const directTimezone = [
      source?.timezone,
      source?.time_zone,
      source?.business_timezone,
      source?.salon_timezone,
      source?.master_timezone,
      source?.contract_timezone
    ].find((value) => String(value || "").trim())

    if (directTimezone) {
      return String(directTimezone).trim()
    }

    const cityCandidates = [
      source?.city,
      source?.salon_city,
      source?.master_city,
      source?.location_city
    ]

    for (const cityValue of cityCandidates) {
      const city = String(cityValue || "").trim().toLowerCase()

      if (!city) {
        continue
      }

      if (city.includes("bishkek") || city.includes("бишкек")) {
        return "Asia/Bishkek"
      }

      if (
        city.includes("almaty") ||
        city.includes("алматы") ||
        city.includes("астана") ||
        city.includes("nur-sultan") ||
        city.includes("нур-султан") ||
        city.includes("nur sultan")
      ) {
        return "Asia/Almaty"
      }
    }

    return DEFAULT_BUSINESS_TIME_ZONE
  }

  function formatSignedCurrency(value, sign, currencyCode = "KGS") {
    const amount = Math.abs(Number(value || 0))

    if (Number.isNaN(amount)) {
      return "-"
    }

    const prefix = sign === "-" ? "-" : sign === "+" ? "+" : ""
    return `${prefix}${new Intl.NumberFormat("ru-RU").format(amount)} ${currencyCode}`
  }

  function normalizeObligationStatus(value) {
    return String(value || "").trim().toLowerCase()
  }

  function canConfirmObligation(row) {
    const status = normalizeObligationStatus(row?.status)
    return status === "open" || status === "overdue"
  }

  function buildObligationActionKey(kind, row) {
    const obligationId = String(row?.id || row?.obligation_id || row?.obligationId || "").trim()
    const rawId = obligationId || String(row?.contract_id || row?.period_start || "").trim()
    return `${kind}:${rawId || "unknown"}`
  }

  function buildObligationIdempotencyKey(kind, row) {
    const obligationId = String(row?.id || row?.obligation_id || row?.obligationId || "").trim()
    return `c14f-${kind}-${String(obligationId || row?.contract_id || "unknown").trim()}-${Date.now()}`
  }

  function buildObligationConfirmPayload(row, kind) {
    const obligationId = String(row?.id || row?.obligation_id || row?.obligationId || "").trim()
    const rawAmount = Number(row?.amount)
    const currencyCode = String(row?.currency || "KGS").trim().toUpperCase()

    if (!obligationId || !Number.isFinite(rawAmount) || rawAmount <= 0 || !currencyCode) {
      return null
    }

    const payload = {
      obligation_id: obligationId,
      amount: Math.trunc(rawAmount),
      currency: currencyCode,
      idempotency_key: buildObligationIdempotencyKey(kind, row)
    }

    if (kind === "rent") {
      payload.provider = "manual"
      payload.payment_method = "cash"
    }

    return payload
  }

  function getObligationMasterId(item) {
    const value = item?.master_id ?? item?.masterId ?? item?.contract_master_id ?? item?.contractMasterId ?? item?.master?.id ?? item?.master?.master_id
    return value == null || value === "" ? "" : String(value)
  }

  function getObligationMasterName(item) {
    return (
      item?.master_name ||
      item?.master?.name ||
      item?.master?.slug ||
      item?.master_slug ||
      item?.masterSlug ||
      item?.contract_master_id ||
      item?.master_id ||
      "—"
    )
  }

  function getObligationAmount(item) {
    const amount = Number(item?.amount ?? 0)
    return Number.isFinite(amount) ? amount : 0
  }

  function normalizeSalonObligation(item, type) {
    const normalizedStatus = normalizeObligationStatus(item?.status)
    const amount = getObligationAmount(item)

    return {
      ...item,
      obligation_type: type,
      master_key: getObligationMasterId(item),
      master_label: getObligationMasterName(item),
      status: normalizedStatus,
      amount,
      currency: item?.currency || "KGS",
      is_open: normalizedStatus === "open" || normalizedStatus === "overdue" || normalizedStatus === "upcoming" || normalizedStatus === "active" || normalizedStatus === "pending"
    }
  }

  function getObligationPriority(item) {
    const status = normalizeObligationStatus(item?.status)

    if (status === "overdue") return 0
    if (status === "open" || status === "active") return 1
    if (status === "upcoming" || status === "pending") return 2
    if (status === "paid") return 3
    return 4
  }

  function sortObligationsByPriority(items) {
    return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
      const leftRank = getObligationPriority(left)
      const rightRank = getObligationPriority(right)

      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      const leftTime = new Date(
        left?.due_at ||
        left?.period_start ||
        left?.paid_at ||
        left?.created_at ||
        0
      ).getTime() || 0
      const rightTime = new Date(
        right?.due_at ||
        right?.period_start ||
        right?.paid_at ||
        right?.created_at ||
        0
      ).getTime() || 0

      if (leftRank === 3) {
        return rightTime - leftTime
      }

      return leftTime - rightTime
    })
  }

  function buildSalonObligationsModel(rentRows, salaryRows, masterRows) {
    const mastersMap = new Map()

    for (const master of Array.isArray(masterRows) ? masterRows : []) {
      const values = [
        master?.id,
        master?.master_id,
        master?.slug,
        master?.master_slug
      ].map((value) => String(value || "").trim()).filter(Boolean)

      if (!values.length) {
        continue
      }

      const masterInfo = {
        id: master?.id ?? null,
        slug: master?.slug || master?.master_slug || "",
        name: master?.name || master?.slug || master?.master_slug || String(master?.id || ""),
        values
      }

      for (const value of values) {
        if (!mastersMap.has(value)) {
          mastersMap.set(value, masterInfo)
        }
      }
    }

    const normalizedRent = sortObligationsByPriority((Array.isArray(rentRows) ? rentRows : []).map((item) => normalizeSalonObligation(item, "rent")))
    const normalizedSalary = sortObligationsByPriority((Array.isArray(salaryRows) ? salaryRows : []).map((item) => normalizeSalonObligation(item, "salary")))

    const combined = [...normalizedRent, ...normalizedSalary].map((item) => {
      const matched = mastersMap.get(item.master_key) || [...mastersMap.values()].find((candidate) => candidate.values.includes(item.master_key)) || null

      return {
        ...item,
        master_id: item.master_key || matched?.id || item.master_id || null,
        master_name: matched?.name || item.master_label,
        master_slug: matched?.slug || item.master_slug || "",
        master_values: matched?.values || [item.master_key].filter(Boolean)
      }
    })

    const masterGroups = new Map()

    for (const item of combined) {
      const groupKey = String(item.master_id || item.master_slug || item.master_name || "unknown")
      if (!masterGroups.has(groupKey)) {
        masterGroups.set(groupKey, {
          key: groupKey,
          master_id: item.master_id || null,
          master_slug: item.master_slug || "",
          master_name: item.master_name || item.master_label || "—",
          rent: [],
          salary: [],
          open_count: 0,
          overdue_count: 0,
          rent_receivable_amount: 0,
          salary_payable_amount: 0,
          rent_received_amount: 0,
          salary_paid_amount: 0,
          priority_rank: 99,
          priority_obligation: null,
          priority_label: null,
          priority_note: null
        })
      }

      const bucket = masterGroups.get(groupKey)
      bucket[item.obligation_type].push(item)

      if (item.is_open) {
        bucket.open_count += 1
      }

      if (item.status === "overdue") {
        bucket.overdue_count += 1
      }

      if (item.obligation_type === "rent") {
        if (item.is_open) {
          bucket.rent_receivable_amount += item.amount
        }

        if (item.status === "paid") {
          bucket.rent_received_amount += item.amount
        }
      }

      if (item.obligation_type === "salary") {
        if (item.is_open) {
          bucket.salary_payable_amount += item.amount
        }

        if (item.status === "paid") {
          bucket.salary_paid_amount += item.amount
        }
      }

      const candidateRank = getObligationPriority(item)
      const candidateTime = new Date(
        item?.due_at ||
        item?.period_start ||
        item?.paid_at ||
        item?.created_at ||
        0
      ).getTime() || 0

      const currentTime = bucket.priority_obligation ? new Date(
        bucket.priority_obligation?.due_at ||
        bucket.priority_obligation?.period_start ||
        bucket.priority_obligation?.paid_at ||
        bucket.priority_obligation?.created_at ||
        0
      ).getTime() || 0 : 0

      const shouldReplace =
        !bucket.priority_obligation ||
        candidateRank < bucket.priority_rank ||
        (
          candidateRank === bucket.priority_rank &&
          (
            candidateRank === 3
              ? candidateTime > currentTime
              : candidateTime < currentTime
          )
        )

      if (shouldReplace) {
        bucket.priority_rank = candidateRank
        bucket.priority_obligation = item
        bucket.priority_label = formatObligationStatus(item.status)
        bucket.priority_note = `${item.obligation_type === "salary" ? "Зарплата" : "Аренда"} · ${formatDateTime(item?.due_at || item?.period_start || item?.paid_at || item?.created_at, item)}`
      }
    }

    const masterCards = [...masterGroups.values()].sort((left, right) => {
      if (left.priority_rank !== right.priority_rank) {
        return left.priority_rank - right.priority_rank
      }

      return String(left.master_name).localeCompare(String(right.master_name), "ru")
    })

    const summary = masterCards.reduce((acc, group) => {
      acc.open_count += group.open_count
      acc.overdue_count += group.overdue_count
      acc.rent_receivable_amount += group.rent_receivable_amount
      acc.salary_payable_amount += group.salary_payable_amount
      acc.rent_received_amount += group.rent_received_amount
      acc.salary_paid_amount += group.salary_paid_amount
      return acc
    }, {
      open_count: 0,
      overdue_count: 0,
      rent_receivable_amount: 0,
      salary_payable_amount: 0,
      rent_received_amount: 0,
      salary_paid_amount: 0
    })

    return {
      masters: masterCards,
      rent: normalizedRent,
      salary: normalizedSalary,
      summary
    }
  }

  function buildTermsJson() {
    if (contractModel === "percentage") {
      return {
        model: "percentage",
        master_percent: Number(masterPercent),
        salon_percent: Number(salonPercent),
        platform_percent: Number(platformPercent),
        payout_schedule: payoutSchedule || "manual"
      }
    }

    if (contractModel === "fixed_rent") {
      return {
        model: "fixed_rent",
        rent_amount: Number(rentAmount),
        rent_period: rentPeriod,
        currency,
        payout_schedule: payoutSchedule || "manual",
        settlement_mode: settlementMode
      }
    }

    if (contractModel === "salary") {
      return {
        model: "salary",
        salary_amount: Number(salaryAmount),
        salary_period: salaryPeriod,
        currency,
        payout_schedule: payoutSchedule || "manual",
        bonus_percent: bonusPercent === "" ? 0 : Number(bonusPercent)
      }
    }

    return {
      model: "hybrid",
      base_type: hybridBaseType,
      base_amount: Number(hybridBaseAmount),
      base_period: hybridBasePeriod,
      currency,
      master_percent: Number(masterPercent),
      salon_percent: Number(salonPercent),
      platform_percent: Number(platformPercent),
      payout_schedule: payoutSchedule || "manual"
    }
  }

  function validateCreateForm() {
    const masterIdNumber = Number(selectedMasterId)

    if (!masterIdNumber) {
      return "Выбери мастера"
    }

    if (contractModel === "percentage") {
      const masterValue = Number(masterPercent)
      const salonValue = Number(salonPercent)
      const platformValue = Number(platformPercent)

      if (
        Number.isNaN(masterValue) ||
        Number.isNaN(salonValue) ||
        Number.isNaN(platformValue)
      ) {
        return "Проценты должны быть числами"
      }

      if (masterValue + salonValue + platformValue !== 100) {
        return "Сумма процентов должна быть ровно 100"
      }
    }

    if (contractModel === "fixed_rent") {
      const rentValue = Number(rentAmount)

      if (Number.isNaN(rentValue) || rentValue <= 0) {
        return "Укажи корректную сумму аренды"
      }
    }

    if (contractModel === "salary") {
      const salaryValue = Number(salaryAmount)
      const bonusValue = bonusPercent === "" ? 0 : Number(bonusPercent)

      if (Number.isNaN(salaryValue) || salaryValue <= 0) {
        return "Укажи корректную сумму зарплаты"
      }

      if (Number.isNaN(bonusValue) || bonusValue < 0) {
        return "Бонус должен быть числом 0 или больше"
      }
    }

    if (contractModel === "hybrid") {
      const baseValue = Number(hybridBaseAmount)
      const masterValue = Number(masterPercent)
      const salonValue = Number(salonPercent)
      const platformValue = Number(platformPercent)

      if (Number.isNaN(baseValue) || baseValue <= 0) {
        return "Укажи корректную базовую сумму"
      }

      if (
        Number.isNaN(masterValue) ||
        Number.isNaN(salonValue) ||
        Number.isNaN(platformValue)
      ) {
        return "Проценты гибридного договора должны быть числами"
      }

      if (masterValue + salonValue + platformValue !== 100) {
        return "Сумма процентов гибридного договора должна быть ровно 100"
      }
    }

    return ""
  }

  async function createContract(event) {
    event.preventDefault()

    if (createContractLoading) {
      return
    }

    resetMessages()

    const validationError = validateCreateForm()

    if (validationError) {
      setCreateContractError(validationError)
      return
    }

    setCreateContractLoading(true)

    try {
      const payload = {
        master_id: Number(selectedMasterId),
        terms_json: buildTermsJson()
      }

      if (effectiveFrom) {
        payload.effective_from = effectiveFrom
      }

      const result = await createSalonContract(salonSlug, payload)

      if (!result?.ok) {
        setCreateContractError(result?.error || result?.detail?.json?.error || "Не удалось создать контракт")
        return
      }

      setCreateContractSuccess("Контракт создан в статусе ожидания")
      resetCreateForm()
      await refreshContracts()
    }
    catch (err) {
      console.error("Create contract error:", err)
      setCreateContractError("Ошибка создания контракта")
    }
    finally {
      setCreateContractLoading(false)
    }
  }

  async function handleAcceptContract(contractId) {
    if (contractActionLoadingId) {
      return
    }

    resetMessages()
    setContractActionLoadingId(contractId)

    try {
      const result = await acceptContractApi(contractId)

      if (!result?.ok) {
        setContractActionError(result?.detail?.json?.message || result?.detail?.json?.error || result?.error || "Не удалось принять контракт")
        return
      }

      setContractActionSuccess("Контракт переведён в активный статус")
      await refreshContracts()
    }
    catch (err) {
      console.error("Accept contract error:", err)
      setContractActionError("Ошибка активации контракта")
    }
    finally {
      setContractActionLoadingId("")
    }
  }

  async function handleArchiveContract(contractId) {
    if (contractActionLoadingId) {
      return
    }

    resetMessages()
    setContractActionLoadingId(contractId)

    try {
      const result = await archiveContractApi(contractId)

      if (!result?.ok) {
        setContractActionError(result?.detail?.json?.message || result?.detail?.json?.error || result?.error || "Не удалось архивировать контракт")
        return
      }

      setContractActionSuccess("Контракт переведён в архив")
      await refreshContracts()
    }
    catch (err) {
      console.error("Archive contract error:", err)
      setContractActionError("Ошибка архивации контракта")
    }
    finally {
      setContractActionLoadingId("")
    }
  }

  async function handleRestoreContract(contractId) {
    if (contractActionLoadingId) {
      return
    }

    resetMessages()
    setContractActionLoadingId(contractId)

    try {
      const result = await acceptContractApi(contractId)

      if (!result?.ok) {
        setContractActionError(result?.detail?.json?.message || result?.detail?.json?.error || result?.error || "Не удалось восстановить контракт")
        return
      }

      setContractActionSuccess("Контракт восстановлен и переведён в активный статус")
      await refreshContracts()
    }
    catch (err) {
      console.error("Restore contract error:", err)
      setContractActionError("Ошибка восстановления контракта")
    }
    finally {
      setContractActionLoadingId("")
    }
  }

  async function handleConfirmRentObligation(row) {
    const actionKey = buildObligationActionKey("rent", row)

    if (obligationActionPendingKey || !canConfirmObligation(row)) {
      return
    }

    const payload = buildObligationConfirmPayload(row, "rent")
    if (!payload) {
      setContractActionError("Не удалось подтвердить получение аренды")
      return
    }

    resetMessages()
    setObligationActionPendingKey(actionKey)

    try {
      const result = await confirmSalonRentPayment(salonSlug, payload)
      const backendError = result?.detail?.json?.error || result?.detail?.json?.message || result?.error || ""

      if (!result?.ok) {
        setContractActionError(backendError ? `Не удалось подтвердить получение аренды: ${backendError}` : "Не удалось подтвердить получение аренды")
        return
      }

      setContractActionSuccess("Аренда подтверждена")
      await refreshContracts()
    }
    catch (err) {
      console.error("Confirm rent obligation error:", err)
      const backendError = err?.detail?.json?.error || err?.message || ""
      setContractActionError(backendError ? `Не удалось подтвердить получение аренды: ${backendError}` : "Не удалось подтвердить получение аренды")
    }
    finally {
      setObligationActionPendingKey("")
    }
  }

  async function handleConfirmSalaryObligation(row) {
    const actionKey = buildObligationActionKey("salary", row)

    if (obligationActionPendingKey || !canConfirmObligation(row)) {
      return
    }

    const payload = buildObligationConfirmPayload(row, "salary")
    if (!payload) {
      setContractActionError("Не удалось подтвердить выплату зарплаты")
      return
    }

    resetMessages()
    setObligationActionPendingKey(actionKey)

    try {
      const result = await confirmSalonSalaryObligation(salonSlug, payload)
      const backendError = result?.detail?.json?.error || result?.detail?.json?.message || result?.error || ""

      if (!result?.ok) {
        setContractActionError(backendError ? `Не удалось подтвердить выплату зарплаты: ${backendError}` : "Не удалось подтвердить выплату зарплаты")
        return
      }

      setContractActionSuccess("Выплата зарплаты подтверждена")
      await refreshContracts()
    }
    catch (err) {
      console.error("Confirm salary obligation error:", err)
      const backendError = err?.detail?.json?.error || err?.message || ""
      setContractActionError(backendError ? `Не удалось подтвердить выплату зарплаты: ${backendError}` : "Не удалось подтвердить выплату зарплаты")
    }
    finally {
      setObligationActionPendingKey("")
    }
  }

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === "active"),
    [contracts]
  )

  const pendingContracts = useMemo(
    () => contracts.filter((c) => c.status === "pending"),
    [contracts]
  )

  const archivedContracts = useMemo(
    () => contracts.filter((c) => c.status === "archived"),
    [contracts]
  )

  const visibleArchivedContracts = useMemo(
    () => (archivedContractsExpanded ? archivedContracts : archivedContracts.slice(0, 1)),
    [archivedContractsExpanded, archivedContracts]
  )
  const hiddenArchivedContractsCount = useMemo(
    () => Math.max(archivedContracts.length - 1, 0),
    [archivedContracts.length]
  )

  const latestActiveContract = useMemo(
    () => [...activeContracts].sort((a, b) => new Date(b.effective_from || 0) - new Date(a.effective_from || 0))[0] || null,
    [activeContracts]
  )

  const latestArchivedContract = useMemo(
    () => [...archivedContracts].sort((a, b) => new Date(b.archived_at || b.updated_at || 0) - new Date(a.archived_at || a.updated_at || 0))[0] || null,
    [archivedContracts]
  )

  const contractSum = Number(masterPercent || 0) + Number(salonPercent || 0) + Number(platformPercent || 0)
  const isPercentModel = contractModel === "percentage"
  const isRentModel = contractModel === "fixed_rent"
  const isSalaryModel = contractModel === "salary"
  const isHybridModel = contractModel === "hybrid"
  const hasMasters = masters.length > 0
  const contractModelOptions = useMemo(
    () => [
      { value: "percentage", label: "Процентный" },
      { value: "fixed_rent", label: "Фиксированная аренда" },
      { value: "salary", label: "Зарплата" },
      { value: "hybrid", label: "Гибридный" }
    ],
    []
  )
  const salonObligationsModel = useMemo(
    () => buildSalonObligationsModel(rentObligations, salaryObligations, masters),
    [rentObligations, salaryObligations, masters]
  )

  const selectedObligationMaster = useMemo(() => {
    if (!salonObligationsModel.masters.length) {
      return null
    }

    const selectedKey = String(selectedObligationMasterId || "").trim()

    if (!selectedKey) {
      return salonObligationsModel.masters[0]
    }

    return (
      salonObligationsModel.masters.find((item) => String(item.key) === selectedKey) ||
      salonObligationsModel.masters[0] ||
      null
    )
  }, [selectedObligationMasterId, salonObligationsModel.masters])

  useEffect(() => {
    if (!salonObligationsModel.masters.length) {
      if (selectedObligationMasterId) {
        setSelectedObligationMasterId("")
      }
      return
    }

    const selectedExists = salonObligationsModel.masters.some((item) => String(item.key) === String(selectedObligationMasterId || "").trim())

    if (!selectedExists) {
      setSelectedObligationMasterId(String(salonObligationsModel.masters[0].key))
    }
  }, [salonObligationsModel.masters, selectedObligationMasterId])

  function renderContractCard(contract, mode = "active") {
    const isBusy = contractActionLoadingId === contract.id
    const actionsLocked = Boolean(contractActionLoadingId)

    return (
      <Card key={`${mode}-${contract.id}`} style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Мастер</p>
            <p style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 700, color: "#111827" }}>{getMasterName(contract)}</p>
            <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
              {getContractModelLabel(contract)} · {getContractSummary(contract)}
            </p>
          </div>
          <span style={getStatusStyle(contract.status)}>{formatStatus(contract.status)}</span>
        </div>

        <div style={{ ...compactGridStyle, marginTop: 14 }}>
          <InfoBox label="ID" value={contract.id || "-"} />
          <InfoBox label="Дата начала" value={formatDateTime(contract.effective_from)} />
          {mode === "archived" ? (
            <InfoBox label="Архивирован" value={formatDateTime(contract.archived_at)} />
          ) : (
            <InfoBox label="Модель" value={getContractModelLabel(contract)} />
          )}
        </div>

        {mode !== "archived" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {mode === "pending" && (
              <button
                type="button"
                onClick={() => handleAcceptContract(contract.id)}
                disabled={actionsLocked}
                style={{
                  ...primaryButtonStyle,
                  padding: "8px 12px",
                  width: "auto",
                  opacity: actionsLocked ? 0.7 : 1,
                  cursor: actionsLocked ? "wait" : "pointer"
                }}
              >
                {isBusy ? "Обработка..." : "Принять"}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleArchiveContract(contract.id)}
              disabled={actionsLocked}
              style={{
                ...(mode === "active" ? dangerButtonStyle : secondaryButtonStyle),
                opacity: actionsLocked ? 0.7 : 1,
                cursor: actionsLocked ? "wait" : "pointer"
              }}
            >
              {isBusy ? "Обработка..." : "Архивировать"}
            </button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>Контракты салона</h1>
          <p style={pageSubtitleStyle}>
            Контракты вынесены в отдельную ось: здесь видно текущее состояние договорённостей, историю и создание нового контракта без смешения с общими финансами.
          </p>
        </div>

        <div style={financeNavStyle}>
          {financeTabs.map((tab) => (
            <FinanceTab
              key={tab.key}
              href={tab.href}
              label={tab.label}
              active={location.pathname.endsWith("/contracts")}
            />
          ))}
        </div>

        <SectionBlock
          title="Контракты"
          hint="Единый кабинет контрактов без разделения на две колонки."
          right={
            <button
              type="button"
              onClick={refreshContracts}
              disabled={contractsLoading || Boolean(contractActionLoadingId) || createContractLoading}
              style={{
                ...secondaryButtonStyle,
                opacity: contractsLoading || contractActionLoadingId || createContractLoading ? 0.7 : 1,
                cursor: contractsLoading || contractActionLoadingId || createContractLoading ? "wait" : "pointer"
              }}
            >
              {contractsLoading ? "Обновление..." : "Обновить"}
            </button>
          }
          style={{ marginTop: 0 }}
        >
          <div style={pageStackStyle}>
            <Card>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Сводка по контрактам
                </h3>
              </div>

              <div style={compactGridStyle}>
                <InfoBox
                  label="Активные"
                  value={contractsLoading ? "..." : activeContracts.length}
                  note="Используются в текущих правилах расчётов"
                />

                <InfoBox
                  label="Ожидающие"
                  value={contractsLoading ? "..." : pendingContracts.length}
                  note="Ожидают активации"
                />

                <InfoBox
                  label="Архивные"
                  value={contractsLoading ? "..." : archivedContracts.length}
                  note="История завершённых договорённостей"
                />

                <InfoBox
                  label="Всего"
                  value={contractsLoading ? "..." : contracts.length}
                  note="Полная история контрактов салона"
                />
              </div>


              <div style={{ ...compactGridStyle, marginTop: 12 }}>
                <InfoBox
                  label="Последний активный"
                  value={contractsLoading ? "..." : (latestActiveContract ? getMasterName(latestActiveContract) : "—")}
                  note={contractsLoading ? "Загрузка..." : (latestActiveContract ? getContractSummary(latestActiveContract) : "Нет активных контрактов")}
                />

                <InfoBox
                  label="Последний архивный"
                  value={contractsLoading ? "..." : (latestArchivedContract ? getMasterName(latestArchivedContract) : "—")}
                  note={contractsLoading ? "Загрузка..." : (latestArchivedContract ? formatDateTime(latestArchivedContract.archived_at) : "Архив пока пуст")}
                />
              </div>

              <SectionBlock
                title="Обязательства мастер-салон"
                hint="Салон видит обязательства по мастерам, срокам и статусам. Аренда — к получению, зарплата — к выплате."
                style={{ marginTop: 16 }}
              >
                {rentObligationsError ? (
                  <div style={{
                    marginBottom: 10,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #fde68a",
                    background: "#fffbeb",
                    color: "#92400e",
                    fontSize: 14
                  }}>
                    {rentObligationsError}
                  </div>
                ) : null}

                {salaryObligationsError ? (
                  <div style={{
                    marginBottom: 10,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #fde68a",
                    background: "#fffbeb",
                    color: "#92400e",
                    fontSize: 14
                  }}>
                    {salaryObligationsError}
                  </div>
                ) : null}

                {rentObligationsLoading || salaryObligationsLoading ? (
                  <div style={{
                    marginBottom: 12,
                    color: "#6b7280",
                    fontSize: 14
                  }}>
                    Загружаем обязательства мастер-салон...
                  </div>
                ) : null}

                <div style={compactGridStyle}>
                  <InfoBox
                    label="Открыто"
                    value={salonObligationsModel.summary ? Number(salonObligationsModel.summary.open_count ?? 0) : 0}
                    note="Активные обязательства в работе"
                  />
                  <InfoBox
                    label="Просрочено"
                    value={salonObligationsModel.summary ? Number(salonObligationsModel.summary.overdue_count ?? 0) : 0}
                    note="Требуют внимания"
                  />
                  <InfoBox
                    label="Аренда к получению"
                    value={formatSignedCurrency(salonObligationsModel.summary?.rent_receivable_amount ?? 0, "+")}
                    note="Положительный поток для салона"
                  />
                  <InfoBox
                    label="Зарплата к выплате"
                    value={formatSignedCurrency(salonObligationsModel.summary?.salary_payable_amount ?? 0, "-")}
                    note="Отток в пользу мастеров"
                  />
                  <InfoBox
                    label="Аренда получена"
                    value={formatSignedCurrency(salonObligationsModel.summary?.rent_received_amount ?? 0, "+")}
                    note="Закрытые арендные периоды"
                  />
                  <InfoBox
                    label="Зарплата выплачена"
                    value={formatSignedCurrency(salonObligationsModel.summary?.salary_paid_amount ?? 0, "+")}
                    note="Закрытые зарплатные периоды"
                  />
                </div>

                {!rentObligationsLoading && !salaryObligationsLoading && !salonObligationsModel.masters.length ? (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState text="Обязательства мастер-салон пока не найдены." />
                  </div>
                ) : null}

                {salonObligationsModel.masters.length ? (
                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12
                    }}>
                      {salonObligationsModel.masters.map((master) => {
                        const isActive = String(master.key) === String(selectedObligationMaster?.key || "")

                        return (
                          <button
                            key={master.key}
                            type="button"
                            onClick={() => setSelectedObligationMasterId(String(master.key))}
                            style={{
                              textAlign: "left",
                              border: isActive ? "1px solid #111827" : "1px solid #e5e7eb",
                              borderRadius: 14,
                              background: isActive ? "#f8fafc" : "#fff",
                              padding: 14,
                              cursor: "pointer"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{master.master_name || "—"}</div>
                                <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                                  {master.priority_label || "—"} · {master.overdue_count || 0} просрочено
                                </div>
                              </div>
                              <span style={getStatusStyle(master.priority_obligation?.status || "open")}>
                                {master.priority_label || "—"}
                              </span>
                            </div>

                            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                              <div style={{ fontSize: 13, color: "#374151" }}>
                                Аренда к получению: <strong>{formatSignedCurrency(master.rent_receivable_amount || 0, "+")}</strong>
                              </div>
                              <div style={{ fontSize: 13, color: "#374151" }}>
                                Зарплата к выплате: <strong>{formatSignedCurrency(master.salary_payable_amount || 0, "-")}</strong>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {selectedObligationMaster ? (
                      <Card soft style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Выбранный мастер</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginTop: 4 }}>
                              {selectedObligationMaster.master_name || "—"}
                            </div>
                            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                              {selectedObligationMaster.priority_note || "Список обязательств по мастеру"}
                            </div>
                          </div>
                          <span style={getStatusStyle(selectedObligationMaster.priority_obligation?.status || "open")}>
                            {selectedObligationMaster.priority_label || "Открыто"}
                          </span>
                        </div>

                        <div style={compactGridStyle}>
                          <InfoBox
                            label="Открыто"
                            value={selectedObligationMaster.open_count || 0}
                            note="Активные или ожидающие периоды"
                          />
                          <InfoBox
                            label="Просрочено"
                            value={selectedObligationMaster.overdue_count || 0}
                            note="Требуют срочного действия"
                          />
                          <InfoBox
                            label="Аренда к получению"
                            value={formatSignedCurrency(selectedObligationMaster.rent_receivable_amount || 0, "+")}
                            note="Салон должен получить"
                          />
                          <InfoBox
                            label="Зарплата к выплате"
                            value={formatSignedCurrency(selectedObligationMaster.salary_payable_amount || 0, "-")}
                            note="Салон должен выплатить"
                          />
                        </div>

                        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                          <div>
                            <div style={{ marginBottom: 10, fontSize: 15, fontWeight: 800, color: "#111827" }}>
                              Аренда к получению
                            </div>
                            {selectedObligationMaster.rent.length ? (
                              <div style={{ ...tableWrapStyle, minWidth: 0 }}>
                                <table style={{ ...tableStyle, minWidth: 820 }}>
                                  <thead>
                                    <tr>
                                      <th style={tableHeadCellStyle}>Период</th>
                                      <th style={tableHeadCellStyle}>Сумма</th>
                                      <th style={tableHeadCellStyle}>Статус</th>
                                      <th style={tableHeadCellStyle}>Срок оплаты</th>
                                      <th style={tableHeadCellStyle}>Действия</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedObligationMaster.rent.map((item, index) => {
                                      const isLast = index === selectedObligationMaster.rent.length - 1
                                      const itemKey = buildObligationActionKey("rent", item)
                                      const isPending = obligationActionPendingKey === itemKey
                                      const canConfirm = canConfirmObligation(item)
                                      return (
                                        <tr key={item?.id || `${item?.contract_id || "rent-obligation"}-${index}`}>
                                          {renderCell(
                                            <div>
                                              <div style={{ fontWeight: 600, color: "#111827" }}>
                                                {formatDateTime(item?.period_start, item)} — {formatDateTime(item?.period_end, item)}
                                              </div>
                                            </div>,
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            <span style={{ fontWeight: 600 }}>{formatSignedCurrency(item?.amount, "+", item?.currency || "KGS")}</span>,
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            <span style={getStatusStyle(item?.status)}>{formatObligationStatus(item?.status)}</span>,
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            formatDateTime(item?.due_at, item),
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            canConfirm ? (
                                              <button
                                                type="button"
                                                onClick={() => handleConfirmRentObligation(item)}
                                                disabled={isPending}
                                                style={{
                                                  ...secondaryButtonStyle,
                                                  padding: "8px 12px",
                                                  fontSize: 12,
                                                  opacity: isPending ? 0.7 : 1,
                                                  cursor: isPending ? "not-allowed" : "pointer",
                                                  whiteSpace: "nowrap"
                                                }}
                                              >
                                                {isPending ? "Подтверждаем..." : "Подтвердить получение аренды"}
                                              </button>
                                            ) : (
                                              "—"
                                            ),
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <EmptyState text="Аренда к получению пока не найдена." />
                            )}
                          </div>

                          <div>
                            <div style={{ marginBottom: 10, fontSize: 15, fontWeight: 800, color: "#111827" }}>
                              Зарплата к выплате
                            </div>
                            {selectedObligationMaster.salary.length ? (
                              <div style={{ ...tableWrapStyle, minWidth: 0 }}>
                                <table style={{ ...tableStyle, minWidth: 820 }}>
                                  <thead>
                                    <tr>
                                      <th style={tableHeadCellStyle}>Период</th>
                                      <th style={tableHeadCellStyle}>Сумма</th>
                                      <th style={tableHeadCellStyle}>Статус</th>
                                      <th style={tableHeadCellStyle}>Срок выплаты</th>
                                      <th style={tableHeadCellStyle}>Действия</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedObligationMaster.salary.map((item, index) => {
                                      const isLast = index === selectedObligationMaster.salary.length - 1
                                      const itemKey = buildObligationActionKey("salary", item)
                                      const isPending = obligationActionPendingKey === itemKey
                                      const canConfirm = canConfirmObligation(item)
                                      return (
                                        <tr key={item?.id || `${item?.contract_id || "salary-obligation"}-${index}`}>
                                          {renderCell(
                                            <div>
                                              <div style={{ fontWeight: 600, color: "#111827" }}>
                                                {formatDateTime(item?.period_start, item)} — {formatDateTime(item?.period_end, item)}
                                              </div>
                                            </div>,
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            <span style={{ fontWeight: 600 }}>{formatSignedCurrency(item?.amount, "-", item?.currency || "KGS")}</span>,
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            <span style={getStatusStyle(item?.status)}>{formatObligationStatus(item?.status)}</span>,
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            formatDateTime(item?.due_at, item),
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                          {renderCell(
                                            canConfirm ? (
                                              <button
                                                type="button"
                                                onClick={() => handleConfirmSalaryObligation(item)}
                                                disabled={isPending}
                                                style={{
                                                  ...secondaryButtonStyle,
                                                  padding: "8px 12px",
                                                  fontSize: 12,
                                                  opacity: isPending ? 0.7 : 1,
                                                  cursor: isPending ? "not-allowed" : "pointer",
                                                  whiteSpace: "nowrap"
                                                }}
                                              >
                                                {isPending ? "Подтверждаем..." : "Подтвердить выплату зарплаты"}
                                              </button>
                                            ) : (
                                              "—"
                                            ),
                                            isLast ? { borderBottom: "none" } : {}
                                          )}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <EmptyState text="Зарплата к выплате пока не найдена." />
                            )}
                          </div>
                        </div>
                      </Card>
                    ) : null}
                  </div>
                ) : null}
              </SectionBlock>

              {contractActionError && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontSize: 14
                  }}
                >
                  {contractActionError}
                </div>
              )}

              {contractActionSuccess && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    color: "#166534",
                    fontSize: 14
                  }}
                >
                  {contractActionSuccess}
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#111827" }}>
                  Активные контракты
                </h3>

                {contractsLoading && (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Загрузка...</div>
                )}

                {!contractsLoading && activeContracts.length === 0 && (
                  <EmptyState text="Нет активных контрактов" />
                )}

                {!contractsLoading && activeContracts.length > 0 && (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={tableHeadCellStyle}>ID</th>
                          <th style={tableHeadCellStyle}>Мастер</th>
                          <th style={tableHeadCellStyle}>Модель</th>
                          <th style={tableHeadCellStyle}>Условия</th>
                          <th style={tableHeadCellStyle}>Дата начала</th>
                          <th style={tableHeadCellStyle}>Статус</th>
                          <th style={tableHeadCellStyle}>Действия</th>
                        </tr>
                      </thead>

                      <tbody>
                        {activeContracts.map((c, index) => {
                          const isLast = index === activeContracts.length - 1
                          const isBusy = contractActionLoadingId === c.id
                          const actionsLocked = Boolean(contractActionLoadingId)

                          return (
                            <tr key={c.id}>
                              {renderCell(c.id, isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractModelLabel(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractSummary(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(formatDateTime(c.effective_from), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(
                                <span style={getStatusStyle(c.status)}>{formatStatus(c.status)}</span>,
                                isLast ? { borderBottom: "none" } : {}
                              )}
                              {renderCell(
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleArchiveContract(c.id)}
                                    disabled={actionsLocked}
                                    style={{
                                      ...dangerButtonStyle,
                                      opacity: actionsLocked ? 0.7 : 1,
                                      cursor: actionsLocked ? "wait" : "pointer"
                                    }}
                                  >
                                    {isBusy ? "Обработка..." : "Архивировать"}
                                  </button>
                                </div>,
                                isLast ? { borderBottom: "none" } : {}
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#111827" }}>
                  Ожидающие контракты
                </h3>

                {contractsLoading && (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Загрузка...</div>
                )}

                {!contractsLoading && pendingContracts.length === 0 && (
                  <EmptyState text="Нет ожидающих контрактов" />
                )}

                {!contractsLoading && pendingContracts.length > 0 && (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={tableHeadCellStyle}>ID</th>
                          <th style={tableHeadCellStyle}>Мастер</th>
                          <th style={tableHeadCellStyle}>Модель</th>
                          <th style={tableHeadCellStyle}>Условия</th>
                          <th style={tableHeadCellStyle}>Дата начала</th>
                          <th style={tableHeadCellStyle}>Статус</th>
                          <th style={tableHeadCellStyle}>Действия</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pendingContracts.map((c, index) => {
                          const isLast = index === pendingContracts.length - 1
                          const isBusy = contractActionLoadingId === c.id
                          const actionsLocked = Boolean(contractActionLoadingId)

                          return (
                            <tr key={c.id}>
                              {renderCell(c.id, isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractModelLabel(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractSummary(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(formatDateTime(c.effective_from), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(
                                <span style={getStatusStyle(c.status)}>{formatStatus(c.status)}</span>,
                                isLast ? { borderBottom: "none" } : {}
                              )}
                              {renderCell(
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptContract(c.id)}
                                    disabled={actionsLocked}
                                    style={{
                                      ...primaryButtonStyle,
                                      padding: "8px 12px",
                                      width: "auto",
                                      opacity: actionsLocked ? 0.7 : 1,
                                      cursor: actionsLocked ? "wait" : "pointer"
                                    }}
                                  >
                                    {isBusy ? "Обработка..." : "Принять"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleArchiveContract(c.id)}
                                    disabled={actionsLocked}
                                    style={{
                                      ...secondaryButtonStyle,
                                      opacity: actionsLocked ? 0.7 : 1,
                                      cursor: actionsLocked ? "wait" : "pointer"
                                    }}
                                  >
                                    {isBusy ? "Обработка..." : "Архивировать"}
                                  </button>
                                </div>,
                                isLast ? { borderBottom: "none" } : {}
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#111827" }}>
                  Архивные контракты
                </h3>

                {contractsLoading && (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Загрузка...</div>
                )}

                {!contractsLoading && archivedContracts.length === 0 && (
                  <EmptyState text="Нет архивных контрактов" />
                )}

                {!contractsLoading && archivedContracts.length > 0 && (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={tableHeadCellStyle}>ID</th>
                          <th style={tableHeadCellStyle}>Мастер</th>
                          <th style={tableHeadCellStyle}>Модель</th>
                          <th style={tableHeadCellStyle}>Условия</th>
                          <th style={tableHeadCellStyle}>Дата начала</th>
                          <th style={tableHeadCellStyle}>Архивирован</th>
                          <th style={tableHeadCellStyle}>Статус</th>
                          <th style={tableHeadCellStyle}>Действия</th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleArchivedContracts.map((c, index) => {
                          const isLast = index === visibleArchivedContracts.length - 1

                          return (
                            <tr key={c.id}>
                              {renderCell(c.id, isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractModelLabel(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractSummary(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(formatDateTime(c.effective_from), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(formatDateTime(c.archived_at), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(
                                <span style={getStatusStyle(c.status)}>{formatStatus(c.status)}</span>,
                                isLast ? { borderBottom: "none" } : {}
                              )}
                              {renderCell(
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreContract(c.id)}
                                    disabled={Boolean(contractActionLoadingId)}
                                    style={{
                                      ...secondaryButtonStyle,
                                      opacity: contractActionLoadingId ? 0.7 : 1,
                                      cursor: contractActionLoadingId ? "wait" : "pointer"
                                    }}
                                  >
                                    {contractActionLoadingId === c.id ? "Обработка..." : "Восстановить"}
                                  </button>
                                </div>,
                                isLast ? { borderBottom: "none" } : {}
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!contractsLoading && archivedContracts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setArchivedContractsExpanded((value) => !value)}
                    style={{
                      marginTop: 12,
                      border: "1px solid #d0d5dd",
                      background: "#ffffff",
                      color: "#344054",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {archivedContractsExpanded ? "Свернуть" : `Показать ещё ${hiddenArchivedContractsCount}`}
                  </button>
                )}
              </div>
            </Card>

            <Card soft>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Создать контракт
                </h3>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
                  Существующая структура сохранена. Добавлены сценарии договорённостей через модель контракта и поля в terms_json.
                </p>
              </div>

              {mastersLoading && <p style={{ margin: 0, color: "#6b7280" }}>Загрузка мастеров...</p>}

              {!mastersLoading && !hasMasters && (
                <EmptyState text="Нет мастеров для создания контракта" />
              )}

              {!mastersLoading && hasMasters && (
                <form onSubmit={createContract}>
                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>Модель договора</label>
                    <div style={modelGridStyle}>
                      {contractModelOptions.map((item) => {
                        const isActive = contractModel === item.value

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setContractModel(item.value)
                              resetMessages()
                            }}
                            style={{
                              padding: "12px 14px",
                              borderRadius: 12,
                              border: isActive ? "1px solid #111827" : "1px solid #d1d5db",
                              background: isActive ? "#111827" : "#ffffff",
                              color: isActive ? "#ffffff" : "#111827",
                              fontSize: 14,
                              fontWeight: 600,
                              textAlign: "left",
                              cursor: "pointer"
                            }}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>Мастер</label>
                    <select
                      value={selectedMasterId}
                      onChange={(e) => setSelectedMasterId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Выбери мастера</option>
                      {masters.map((master) => (
                        <option key={master.id} value={master.id}>
                          {master.name || master.slug || master.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(isRentModel || isSalaryModel || isHybridModel) && (
                    <div style={formGridStyle}>
                      <div style={fieldBlockStyle}>
                        <label style={labelStyle}>Валюта</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="USD">USD</option>
                          <option value="KGS">KGS</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>

                      <div style={fieldBlockStyle}>
                        <label style={labelStyle}>График выплат</label>
                        <select
                          value={payoutSchedule}
                          onChange={(e) => setPayoutSchedule(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="manual">Вручную</option>
                          <option value="daily">Ежедневно</option>
                          <option value="weekly">Еженедельно</option>
                          <option value="monthly">Ежемесячно</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {isPercentModel && (
                    <>
                      <div style={formGridStyle}>
                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Процент мастера</label>
                          <input
                            type="number"
                            value={masterPercent}
                            onChange={(e) => setMasterPercent(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Процент салона</label>
                          <input
                            type="number"
                            value={salonPercent}
                            onChange={(e) => setSalonPercent(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Процент платформы</label>
                          <input
                            type="number"
                            value={platformPercent}
                            onChange={(e) => setPlatformPercent(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={fieldBlockStyle}>
                        <label style={labelStyle}>График выплат</label>
                        <select
                          value={payoutSchedule}
                          onChange={(e) => setPayoutSchedule(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="manual">Вручную</option>
                          <option value="daily">Ежедневно</option>
                          <option value="weekly">Еженедельно</option>
                          <option value="monthly">Ежемесячно</option>
                        </select>
                      </div>
                    </>
                  )}

                  {isRentModel && (
                    <>
                      <div style={formGridStyle}>
                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Сумма аренды</label>
                          <input
                            type="number"
                            value={rentAmount}
                            onChange={(e) => setRentAmount(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Период аренды</label>
                          <select
                            value={rentPeriod}
                            onChange={(e) => setRentPeriod(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="daily">Ежедневно</option>
                            <option value="weekly">Еженедельно</option>
                            <option value="monthly">Ежемесячно</option>
                          </select>
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Режим расчёта</label>
                          <select
                            value={settlementMode}
                            onChange={(e) => setSettlementMode(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="accrued">По факту</option>
                            <option value="prepaid">Предоплата</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          marginBottom: 14,
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid #dbeafe",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontSize: 14,
                          lineHeight: 1.5
                        }}
                      >
                        Фиксированная аренда хранится как отдельная модель в terms_json и не ломает существующий процентный сценарий.
                      </div>
                    </>
                  )}

                  {isSalaryModel && (
                    <>
                      <div style={formGridStyle}>
                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Сумма зарплаты</label>
                          <input
                            type="number"
                            value={salaryAmount}
                            onChange={(e) => setSalaryAmount(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Период зарплаты</label>
                          <select
                            value={salaryPeriod}
                            onChange={(e) => setSalaryPeriod(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="weekly">Еженедельно</option>
                            <option value="biweekly">Раз в две недели</option>
                            <option value="monthly">Ежемесячно</option>
                          </select>
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Бонус %</label>
                          <input
                            type="number"
                            value={bonusPercent}
                            onChange={(e) => setBonusPercent(e.target.value)}
                            style={inputStyle}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {isHybridModel && (
                    <>
                      <div style={formGridStyle}>
                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Базовый тип</label>
                          <select
                            value={hybridBaseType}
                            onChange={(e) => setHybridBaseType(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="salary">Зарплата</option>
                            <option value="fixed_rent">Аренда</option>
                          </select>
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Базовая сумма</label>
                          <input
                            type="number"
                            value={hybridBaseAmount}
                            onChange={(e) => setHybridBaseAmount(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Базовый период</label>
                          <select
                            value={hybridBasePeriod}
                            onChange={(e) => setHybridBasePeriod(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="weekly">Еженедельно</option>
                            <option value="monthly">Ежемесячно</option>
                          </select>
                        </div>
                      </div>

                      <div style={formGridStyle}>
                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Процент мастера</label>
                          <input
                            type="number"
                            value={masterPercent}
                            onChange={(e) => setMasterPercent(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Процент салона</label>
                          <input
                            type="number"
                            value={salonPercent}
                            onChange={(e) => setSalonPercent(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <div style={fieldBlockStyle}>
                          <label style={labelStyle}>Процент платформы</label>
                          <input
                            type="number"
                            value={platformPercent}
                            onChange={(e) => setPlatformPercent(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          marginBottom: 14,
                          padding: 12,
                          borderRadius: 12,
                          background: contractSum === 100 ? "#f0fdf4" : "#fffbeb",
                          border: contractSum === 100 ? "1px solid #bbf7d0" : "1px solid #fde68a",
                          color: contractSum === 100 ? "#166534" : "#92400e",
                          fontSize: 14,
                          fontWeight: 600
                        }}
                      >
                        Сумма процентов гибридного договора: {contractSum}
                      </div>
                    </>
                  )}

                  {!isRentModel && !isSalaryModel && (
                    <div style={fieldBlockStyle}>
                      <label style={labelStyle}>Дата начала действия</label>
                      <input
                        type="datetime-local"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  )}

                  {(isRentModel || isSalaryModel) && (
                    <div style={fieldBlockStyle}>
                      <label style={labelStyle}>Дата начала действия</label>
                      <input
                        type="datetime-local"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  )}

                  {isPercentModel && (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 12,
                        borderRadius: 12,
                        background: contractSum === 100 ? "#f0fdf4" : "#fffbeb",
                        border: contractSum === 100 ? "1px solid #bbf7d0" : "1px solid #fde68a",
                        color: contractSum === 100 ? "#166534" : "#92400e",
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      Сумма процентов: {contractSum}
                    </div>
                  )}

                  {createContractError && (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        fontSize: 14
                      }}
                    >
                      {createContractError}
                    </div>
                  )}

                  {createContractSuccess && (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#166534",
                        fontSize: 14
                      }}
                    >
                      {createContractSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createContractLoading || Boolean(contractActionLoadingId)}
                    style={{
                      ...primaryButtonStyle,
                      opacity: createContractLoading || contractActionLoadingId ? 0.7 : 1,
                      cursor: createContractLoading || contractActionLoadingId ? "wait" : "pointer",
                      width: "100%"
                    }}
                  >
                    {createContractLoading ? "Создание..." : "Создать контракт"}
                  </button>
                </form>
              )}
            </Card>
          </div>
        </SectionBlock>
      </div>
    </div>
  )
}
