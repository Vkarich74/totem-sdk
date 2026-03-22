import React, { useEffect, useMemo, useState } from "react"

function SectionBlock({ title, hint, right, children, style = {} }) {
  return (
    <section style={{ marginTop: 28, ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap"
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#18181b"
            }}
          >
            {title}
          </h2>

          {hint && (
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 15,
                color: "#71717a",
                lineHeight: 1.6,
                maxWidth: 860
              }}
            >
              {hint}
            </p>
          )}
        </div>

        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>

      {children}
    </section>
  )
}

function Card({ children, soft = false, style = {} }) {
  return (
    <div
      style={{
        border: soft ? "1px solid #e4e4e7" : "1px solid #e7e7ec",
        borderRadius: 24,
        background: soft ? "#fcfcfd" : "#ffffff",
        padding: 24,
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
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
        border: "1px solid #ececf2",
        borderRadius: 20,
        padding: 18,
        background: "#ffffff",
        minWidth: 0,
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)"
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: "#71717a",
          textTransform: "uppercase",
          letterSpacing: "0.04em"
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "10px 0 0 0",
          fontSize: 30,
          fontWeight: 800,
          color: "#18181b",
          lineHeight: 1.05,
          wordBreak: "break-word"
        }}
      >
        {value}
      </p>

      {note && (
        <p
          style={{
            margin: "8px 0 0 0",
            fontSize: 13,
            color: "#a1a1aa",
            lineHeight: 1.5
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
        padding: "22px 18px",
        border: "1px dashed #d4d4d8",
        borderRadius: 20,
        background: "#fafafa",
        color: "#71717a",
        fontSize: 15
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

export default function SalonContractsPage() {
  const [contracts, setContracts] = useState([])
  const [contractsLoading, setContractsLoading] = useState(true)

  const [masters, setMasters] = useState([])
  const [mastersLoading, setMastersLoading] = useState(true)

  const [selectedMasterId, setSelectedMasterId] = useState("")
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
  const [contractActionError, setContractActionError] = useState("")
  const [contractActionSuccess, setContractActionSuccess] = useState("")

  const salonSlug = "totem-demo-salon"

  const pageStyle = {
    minHeight: "100%",
    padding: "28px 24px 40px",
    background: "#f4f4f5"
  }

  const shellStyle = {
    maxWidth: 1320,
    margin: "0 auto"
  }

  const pageHeaderStyle = {
    marginBottom: 22
  }

  const pageTitleStyle = {
    margin: 0,
    fontSize: 38,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    color: "#18181b",
    lineHeight: 1.05
  }

  const pageSubtitleStyle = {
    margin: "12px 0 0 0",
    fontSize: 16,
    color: "#71717a",
    lineHeight: 1.7,
    maxWidth: 920
  }

  const pageStackStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(360px, 0.9fr)",
    gap: 20,
    alignItems: "start"
  }

  const compactGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  }

  const formGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  }

  const modelGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginBottom: 18
  }

  const tableWrapStyle = {
    overflowX: "auto",
    border: "1px solid #ececf2",
    borderRadius: 20,
    background: "#ffffff",
    maxWidth: "100%"
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1040
  }

  const tableHeadCellStyle = {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: 13,
    fontWeight: 800,
    color: "#71717a",
    background: "#fafafa",
    borderBottom: "1px solid #ececf2",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    letterSpacing: "0.04em"
  }

  const tableCellStyle = {
    padding: "16px",
    fontSize: 15,
    color: "#18181b",
    borderBottom: "1px solid #f1f1f4",
    verticalAlign: "top",
    wordBreak: "break-word",
    lineHeight: 1.5
  }

  const inputStyle = {
    width: "100%",
    padding: "14px 15px",
    border: "1px solid #d4d4d8",
    borderRadius: 14,
    boxSizing: "border-box",
    background: "#ffffff",
    fontSize: 15,
    color: "#18181b",
    outline: "none"
  }

  const labelStyle = {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 14,
    color: "#3f3f46"
  }

  const fieldBlockStyle = {
    marginBottom: 16
  }

  const primaryButtonStyle = {
    padding: "13px 18px",
    border: "1px solid #18181b",
    borderRadius: 14,
    background: "#18181b",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800
  }

  const secondaryButtonStyle = {
    padding: "11px 14px",
    border: "1px solid #d4d4d8",
    borderRadius: 14,
    background: "#ffffff",
    color: "#18181b",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap"
  }

  const dangerButtonStyle = {
    padding: "11px 14px",
    border: "1px solid #fecaca",
    borderRadius: 14,
    background: "#fff1f2",
    color: "#be123c",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap"
  }

  useEffect(() => {
    initializePage()
  }, [])

  async function initializePage() {
    setContractsLoading(true)
    setMastersLoading(true)
    await Promise.all([loadContracts(), loadMasters()])
  }

  async function loadContracts() {
    try {
      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/contracts`
      )

      const data = await safeReadJson(res)

      if (Array.isArray(data)) {
        setContracts(data)
      }
      else if (Array.isArray(data.contracts)) {
        setContracts(data.contracts)
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
      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/masters`
      )

      const data = await safeReadJson(res)

      if (Array.isArray(data)) {
        setMasters(data)
      }
      else if (Array.isArray(data.masters)) {
        setMasters(data.masters)
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

  async function refreshContracts() {
    setContractsLoading(true)
    await loadContracts()
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

  function formatDateTime(value) {
    if (!value) {
      return "-"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date)
  }

  function getStatusStyle(status) {
    if (status === "active") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        color: "#166534",
        background: "#dcfce7"
      }
    }

    if (status === "pending") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        color: "#92400e",
        background: "#fef3c7"
      }
    }

    if (status === "archived") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        color: "#52525b",
        background: "#e4e4e7"
      }
    }

    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      color: "#3f3f46",
      background: "#f4f4f5"
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

      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/contracts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      )

      const data = await safeReadJson(res)

      if (!res.ok || !data.ok) {
        setCreateContractError(data.error || "Не удалось создать контракт")
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

  async function acceptContract(contractId) {
    if (contractActionLoadingId) {
      return
    }

    resetMessages()
    setContractActionLoadingId(contractId)

    try {
      const res = await fetch(
        `https://api.totemv.com/internal/contracts/${contractId}/accept`,
        {
          method: "POST"
        }
      )

      const data = await safeReadJson(res)

      if (!res.ok || !data.ok) {
        setContractActionError(data.error || "Не удалось принять контракт")
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

  async function archiveContract(contractId) {
    if (contractActionLoadingId) {
      return
    }

    resetMessages()
    setContractActionLoadingId(contractId)

    try {
      const res = await fetch(
        `https://api.totemv.com/internal/contracts/${contractId}/archive`,
        {
          method: "POST"
        }
      )

      const data = await safeReadJson(res)

      if (!res.ok || !data.ok) {
        setContractActionError(data.error || "Не удалось архивировать контракт")
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

  const contractSum = Number(masterPercent || 0) + Number(salonPercent || 0) + Number(platformPercent || 0)
  const isPercentModel = contractModel === "percentage"
  const isRentModel = contractModel === "fixed_rent"
  const isSalaryModel = contractModel === "salary"
  const isHybridModel = contractModel === "hybrid"
  const hasMasters = masters.length > 0

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>Контракты салона</h1>
          <p style={pageSubtitleStyle}>
            Управление полным жизненным циклом контрактов: создание, активация, архивация и история договорённостей по мастерам.
          </p>
        </div>

        <SectionBlock
          title="Кабинет контрактов"
          hint="Здесь собраны текущие, ожидающие и архивные контракты, а справа — форма создания нового контракта."
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
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#18181b" }}>
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

              {contractActionError && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#be123c",
                    fontSize: 15
                  }}
                >
                  {contractActionError}
                </div>
              )}

              {contractActionSuccess && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    color: "#166534",
                    fontSize: 15
                  }}
                >
                  {contractActionSuccess}
                </div>
              )}

              <div style={{ marginTop: 22 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 800, color: "#18181b" }}>
                  Активные контракты
                </h3>

                {contractsLoading && (
                  <div style={{ color: "#71717a", fontSize: 15 }}>Загрузка...</div>
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
                                    onClick={() => archiveContract(c.id)}
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

              <div style={{ marginTop: 22 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 800, color: "#18181b" }}>
                  Ожидающие контракты
                </h3>

                {contractsLoading && (
                  <div style={{ color: "#71717a", fontSize: 15 }}>Загрузка...</div>
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
                                    onClick={() => acceptContract(c.id)}
                                    disabled={actionsLocked}
                                    style={{
                                      ...primaryButtonStyle,
                                      padding: "11px 14px",
                                      width: "auto",
                                      opacity: actionsLocked ? 0.7 : 1,
                                      cursor: actionsLocked ? "wait" : "pointer"
                                    }}
                                  >
                                    {isBusy ? "Обработка..." : "Принять"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => archiveContract(c.id)}
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

              <div style={{ marginTop: 22 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 800, color: "#18181b" }}>
                  Архивные контракты
                </h3>

                {contractsLoading && (
                  <div style={{ color: "#71717a", fontSize: 15 }}>Загрузка...</div>
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
                        </tr>
                      </thead>

                      <tbody>
                        {archivedContracts.map((c, index) => {
                          const isLast = index === archivedContracts.length - 1

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
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>

            <Card soft>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#18181b" }}>
                  Создать контракт
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#71717a", lineHeight: 1.6 }}>
                  Создание нового договора с сохранением текущей модели terms_json и всех рабочих сценариев backend.
                </p>
              </div>

              {mastersLoading && <p style={{ margin: 0, color: "#71717a", fontSize: 15 }}>Загрузка мастеров...</p>}

              {!mastersLoading && !hasMasters && (
                <EmptyState text="Нет мастеров для создания контракта" />
              )}

              {!mastersLoading && hasMasters && (
                <form onSubmit={createContract}>
                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>Модель договора</label>
                    <div style={modelGridStyle}>
                      {[
                        { value: "percentage", label: "Процентный" },
                        { value: "fixed_rent", label: "Фиксированная аренда" },
                        { value: "salary", label: "Зарплата" },
                        { value: "hybrid", label: "Гибридный" }
                      ].map((item) => {
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
                              padding: "14px 16px",
                              borderRadius: 16,
                              border: isActive ? "1px solid #18181b" : "1px solid #d4d4d8",
                              background: isActive ? "#18181b" : "#ffffff",
                              color: isActive ? "#ffffff" : "#18181b",
                              fontSize: 15,
                              fontWeight: 800,
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
                          marginBottom: 16,
                          padding: 14,
                          borderRadius: 16,
                          border: "1px solid #dbeafe",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontSize: 14,
                          lineHeight: 1.6
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
                          marginBottom: 16,
                          padding: 14,
                          borderRadius: 16,
                          background: contractSum === 100 ? "#f0fdf4" : "#fffbeb",
                          border: contractSum === 100 ? "1px solid #bbf7d0" : "1px solid #fde68a",
                          color: contractSum === 100 ? "#166534" : "#92400e",
                          fontSize: 14,
                          fontWeight: 700
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
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 16,
                        background: contractSum === 100 ? "#f0fdf4" : "#fffbeb",
                        border: contractSum === 100 ? "1px solid #bbf7d0" : "1px solid #fde68a",
                        color: contractSum === 100 ? "#166534" : "#92400e",
                        fontSize: 14,
                        fontWeight: 700
                      }}
                    >
                      Сумма процентов: {contractSum}
                    </div>
                  )}

                  {createContractError && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 16,
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#be123c",
                        fontSize: 15
                      }}
                    >
                      {createContractError}
                    </div>
                  )}

                  {createContractSuccess && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 16,
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#166534",
                        fontSize: 15
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
