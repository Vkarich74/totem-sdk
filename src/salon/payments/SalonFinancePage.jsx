
import React, { useEffect, useMemo, useState } from "react"

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
        <div>
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
                lineHeight: 1.45
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
        ...style
      }}
    >
      {children}
    </div>
  )
}

function MetricCard({ label, value, note }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 18,
        background: "#ffffff",
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "#6b7280",
          fontWeight: 500
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "10px 0 0 0",
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.1,
          color: "#111827"
        }}
      >
        {value}
      </p>

      {note && (
        <p
          style={{
            margin: "8px 0 0 0",
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

function InfoBox({ label, value, note }) {
  return (
    <div
      style={{
        border: "1px solid #eef2f7",
        borderRadius: 12,
        padding: 14,
        background: "#ffffff"
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
          color: "#111827"
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

export default function SalonFinancePage() {
  const [payments, setPayments] = useState([])
  const [ledger, setLedger] = useState([])
  const [walletBalance, setWalletBalance] = useState(null)

  const [contracts, setContracts] = useState([])
  const [contractsLoading, setContractsLoading] = useState(true)

  const [masters, setMasters] = useState([])
  const [mastersLoading, setMastersLoading] = useState(true)

  const [selectedMasterId, setSelectedMasterId] = useState("")
  const [masterPercent, setMasterPercent] = useState("70")
  const [salonPercent, setSalonPercent] = useState("20")
  const [platformPercent, setPlatformPercent] = useState("10")
  const [payoutSchedule, setPayoutSchedule] = useState("manual")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [withdrawMethod, setWithdrawMethod] = useState("bank")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawComment, setWithdrawComment] = useState("")
  const [withdrawRecipient, setWithdrawRecipient] = useState("")
  const [withdrawError, setWithdrawError] = useState("")
  const [withdrawNotice, setWithdrawNotice] = useState("")

  const [createContractLoading, setCreateContractLoading] = useState(false)
  const [createContractError, setCreateContractError] = useState("")
  const [createContractSuccess, setCreateContractSuccess] = useState("")

  const [loading, setLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [walletLoading, setWalletLoading] = useState(true)

  const salonSlug = "totem-demo-salon"

  const pageStyle = {
    minHeight: "100%",
    padding: 24,
    background: "#f6f7fb"
  }

  const shellStyle = {
    maxWidth: 1400,
    margin: "0 auto"
  }

  const pageHeaderStyle = {
    marginBottom: 20
  }

  const pageTitleStyle = {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "#111827"
  }

  const pageSubtitleStyle = {
    margin: "6px 0 0 0",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.5
  }

  const overviewGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  }

  const twoColumnGridStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: 16,
    alignItems: "start"
  }

  const threeColumnGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12
  }

  const compactGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12
  }

  const formGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12
  }

  const tableWrapStyle = {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#ffffff"
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720
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
    verticalAlign: "top"
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

  const disabledInputStyle = {
    ...inputStyle,
    background: "#f9fafb",
    color: "#9ca3af",
    cursor: "not-allowed"
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
    padding: "11px 16px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#ffffff",
    color: "#374151",
    cursor: "not-allowed",
    fontSize: 14,
    fontWeight: 600
  }

  useEffect(() => {
    loadPayments()
    loadLedger()
    loadWallet()
    loadContracts()
    loadMasters()
  }, [])

  async function loadPayments() {
    try {
      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/payments`
      )

      const data = await res.json()

      if (Array.isArray(data)) {
        setPayments(data)
      }
      else if (data.payments) {
        setPayments(data.payments)
      }
    }
    catch (err) {
      console.error("Payments load error:", err)
    }
    finally {
      setLoading(false)
    }
  }

  async function loadLedger() {
    try {
      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/ledger`
      )

      const data = await res.json()

      if (Array.isArray(data)) {
        setLedger(data)
      }
      else if (data.ledger) {
        setLedger(data.ledger)
      }
    }
    catch (err) {
      console.error("Ledger load error:", err)
    }
    finally {
      setLedgerLoading(false)
    }
  }

  async function loadWallet() {
    try {
      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/wallet-balance`
      )

      const data = await res.json()

      if (data.balance !== undefined) {
        setWalletBalance(data.balance)
      }
    }
    catch (err) {
      console.error("Wallet load error:", err)
    }
    finally {
      setWalletLoading(false)
    }
  }

  async function loadContracts() {
    try {
      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/contracts`
      )

      const data = await res.json()

      if (Array.isArray(data)) {
        setContracts(data)
      }
      else if (data.contracts) {
        setContracts(data.contracts)
      }
    }
    catch (err) {
      console.error("Contracts load error:", err)
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

      const data = await res.json()

      if (Array.isArray(data)) {
        setMasters(data)
      }
      else if (data.masters) {
        setMasters(data.masters)
      }
    }
    catch (err) {
      console.error("Masters load error:", err)
    }
    finally {
      setMastersLoading(false)
    }
  }

  async function createContract(event) {
    event.preventDefault()

    setCreateContractError("")
    setCreateContractSuccess("")

    const masterIdNumber = Number(selectedMasterId)
    const masterValue = Number(masterPercent)
    const salonValue = Number(salonPercent)
    const platformValue = Number(platformPercent)

    if (!masterIdNumber) {
      setCreateContractError("Выбери мастера")
      return
    }

    if (
      Number.isNaN(masterValue) ||
      Number.isNaN(salonValue) ||
      Number.isNaN(platformValue)
    ) {
      setCreateContractError("Проценты должны быть числами")
      return
    }

    if (masterValue + salonValue + platformValue !== 100) {
      setCreateContractError("Сумма процентов должна быть ровно 100")
      return
    }

    setCreateContractLoading(true)

    try {
      const payload = {
        master_id: masterIdNumber,
        terms_json: {
          master_percent: masterValue,
          salon_percent: salonValue,
          platform_percent: platformValue,
          payout_schedule: payoutSchedule || "manual"
        }
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

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setCreateContractError(data.error || "Не удалось создать контракт")
        return
      }

      setCreateContractSuccess("Контракт создан в статусе ожидания")
      await loadContracts()
    }
    catch (err) {
      console.error("Create contract error:", err)
      setCreateContractError("Ошибка создания контракта")
    }
    finally {
      setCreateContractLoading(false)
    }
  }

  function prepareWithdraw(event) {
    event.preventDefault()

    setWithdrawError("")
    setWithdrawNotice("")

    const amountValue = Number(withdrawAmount)

    if (!withdrawRecipient.trim()) {
      setWithdrawError("Укажи внешний реквизит для вывода")
      return
    }

    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setWithdrawError("Укажи корректную сумму вывода")
      return
    }

    if (walletBalance !== null && amountValue > Number(walletBalance)) {
      setWithdrawError("Сумма вывода превышает доступный баланс кошелька")
      return
    }

    setWithdrawNotice(
      "Форма подготовки вывода заполнена корректно. Выполнение внешнего вывода будет активировано после получения ключей xPay и подключения backend endpoint для salon withdraw."
    )
  }

  function formatAmount(value) {
    if (value === null || value === undefined) return "-"
    return Number(value)
  }

  function formatDateTime(value) {
    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return String(value)
    }

    return date.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  function formatStatus(value) {
    if (value === "active") return "Активный"
    if (value === "pending") return "Ожидает"
    if (value === "archived") return "Архивный"
    return value || "-"
  }

  function getStatusStyle(status) {
    if (status === "active") {
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

    if (status === "pending") {
      return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#92400e",
        background: "#fef3c7"
      }
    }

    if (status === "archived") {
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

  function getContractMasterPercent(contract) {
    const terms = getContractTerms(contract)

    if (terms.master_percent !== undefined && terms.master_percent !== null) {
      return terms.master_percent
    }

    if (contract?.share_percent !== undefined && contract?.share_percent !== null) {
      return contract.share_percent
    }

    return "-"
  }

  function getRevenueByDays(days) {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)

    if (days === 7) {
      start.setDate(start.getDate() - 6)
    }
    else if (days === 30) {
      start.setDate(start.getDate() - 29)
    }

    return ledger.reduce((sum, entry) => {
      const createdAt = entry?.created_at ? new Date(entry.created_at) : null
      const amount = Number(entry?.amount || 0)
      const direction = String(entry?.direction || "").toLowerCase()

      if (!createdAt || Number.isNaN(createdAt.getTime())) {
        return sum
      }

      if (createdAt < start) {
        return sum
      }

      if (direction !== "credit" && direction !== "in") {
        return sum
      }

      return sum + amount
    }, 0)
  }

  function renderCell(content, extraStyle = {}) {
    return (
      <td style={{ ...tableCellStyle, ...extraStyle }}>
        {content}
      </td>
    )
  }

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === "active"),
    [contracts]
  )

  const pendingContracts = useMemo(
    () => contracts.filter((c) => c.status === "pending"),
    [contracts]
  )

  const todayRevenue = getRevenueByDays(1)
  const weekRevenue = getRevenueByDays(7)
  const monthRevenue = getRevenueByDays(30)

  const contractSum = Number(masterPercent || 0) + Number(salonPercent || 0) + Number(platformPercent || 0)

  const walletReady = !walletLoading && walletBalance !== null
  const contractsReady = !contractsLoading
  const settlementsReady = !contractsLoading && activeContracts.length > 0
  const ledgerReady = !ledgerLoading && Array.isArray(ledger)
  const paymentsReady = !loading && Array.isArray(payments)

  const payoutEntries = useMemo(
    () =>
      ledger
        .filter((entry) => {
          const refType = String(entry?.reference_type || "").toLowerCase()
          return refType === "payout" || refType === "withdraw"
        })
        .slice()
        .sort((a, b) => {
          const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0
          return bTime - aTime
        }),
    [ledger]
  )

  const payoutAmountTotal = payoutEntries.reduce(
    (sum, entry) => sum + Number(entry?.amount || 0),
    0
  )

  const lastPayoutEntry = payoutEntries[0] || null

  const pipelineChecks = [
    {
      label: "Контракты",
      status: contractsReady ? "ok" : "loading",
      value: contractsReady ? `${contracts.length}` : "...",
      note: contractsReady ? "Контрактный слой загружен" : "Идёт загрузка контрактов"
    },
    {
      label: "Правила расчётов",
      status: settlementsReady ? "ok" : "warn",
      value: settlementsReady ? `${activeContracts.length}` : "0",
      note: settlementsReady ? "Есть активные правила распределения" : "Нет активных правил распределения"
    },
    {
      label: "Леджер",
      status: ledgerReady ? "ok" : "loading",
      value: ledgerReady ? `${ledger.length}` : "...",
      note: ledgerReady ? "Поток движения средств доступен" : "Идёт загрузка записей леджера"
    },
    {
      label: "Кошелёк",
      status: walletReady ? "ok" : "loading",
      value: walletReady ? `${formatAmount(walletBalance)} KGS` : "...",
      note: walletReady ? "Баланс кошелька получен" : "Идёт загрузка баланса"
    },
    {
      label: "Внешний вывод",
      status: payoutEntries.length > 0 ? "ok" : "warn",
      value: payoutEntries.length > 0 ? `${payoutEntries.length}` : "0",
      note:
        payoutEntries.length > 0
          ? `Найдены payout / withdraw операции на ${formatAmount(payoutAmountTotal)} KGS`
          : "История внешнего вывода пока не сформирована"
    }
  ]

  function renderPipelineBadge(status) {
    if (status === "ok") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            background: "#dcfce7",
            color: "#166534",
            fontSize: 12,
            fontWeight: 700
          }}
        >
          OK
        </span>
      )
    }

    if (status === "warn") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            background: "#fef3c7",
            color: "#92400e",
            fontSize: 12,
            fontWeight: 700
          }}
        >
          Проверить
        </span>
      )
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: 999,
          background: "#e5e7eb",
          color: "#4b5563",
          fontSize: 12,
          fontWeight: 700
        }}
      >
        Загрузка
      </span>
    )
  }

  function renderSettlementRules() {
    if (contractsLoading) return <p style={{ margin: 0, color: "#6b7280" }}>Загрузка правил...</p>

    if (activeContracts.length === 0) {
      return <EmptyState text="Нет правил распределения" />
    }

    return (
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeadCellStyle}>Мастер</th>
              <th style={tableHeadCellStyle}>Мастер %</th>
              <th style={tableHeadCellStyle}>Салон %</th>
              <th style={tableHeadCellStyle}>Платформа %</th>
            </tr>
          </thead>

          <tbody>
            {activeContracts.map((c, index) => {
              const terms = getContractTerms(c)
              const isLast = index === activeContracts.length - 1

              return (
                <tr key={c.id}>
                  {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                  {renderCell(terms.master_percent ?? "-", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(terms.salon_percent ?? "-", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(terms.platform_percent ?? "-", isLast ? { borderBottom: "none" } : {})}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderPayoutMethod() {
    if (contractsLoading) return <p style={{ margin: 0, color: "#6b7280" }}>Загрузка правил выплат...</p>

    if (activeContracts.length === 0) {
      return <EmptyState text="Нет настроек выплат" />
    }

    return (
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeadCellStyle}>Мастер</th>
              <th style={tableHeadCellStyle}>График выплат</th>
              <th style={tableHeadCellStyle}>Мастер %</th>
              <th style={tableHeadCellStyle}>Салон %</th>
              <th style={tableHeadCellStyle}>Платформа %</th>
            </tr>
          </thead>

          <tbody>
            {activeContracts.map((c, index) => {
              const terms = getContractTerms(c)
              const isLast = index === activeContracts.length - 1

              return (
                <tr key={c.id}>
                  {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                  {renderCell(terms.payout_schedule || "вручную", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(terms.master_percent ?? "-", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(terms.salon_percent ?? "-", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(terms.platform_percent ?? "-", isLast ? { borderBottom: "none" } : {})}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderContractsHistory() {
    if (contractsLoading) return <p style={{ margin: 0, color: "#6b7280" }}>Загрузка...</p>

    if (contracts.length === 0) {
      return <EmptyState text="История контрактов пуста" />
    }

    return (
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeadCellStyle}>ID</th>
              <th style={tableHeadCellStyle}>Мастер</th>
              <th style={tableHeadCellStyle}>Статус</th>
              <th style={tableHeadCellStyle}>Создан</th>
            </tr>
          </thead>

          <tbody>
            {contracts.map((c, index) => {
              const isLast = index === contracts.length - 1

              return (
                <tr key={c.id}>
                  {renderCell(c.id, isLast ? { borderBottom: "none" } : {})}
                  {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                  {renderCell(
                    <span style={getStatusStyle(c.status)}>{formatStatus(c.status)}</span>,
                    isLast ? { borderBottom: "none" } : {}
                  )}
                  {renderCell(formatDateTime(c.created_at), isLast ? { borderBottom: "none" } : {})}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderWithdrawHistory() {
    if (ledgerLoading) {
      return <EmptyState text="Загрузка истории вывода средств..." />
    }

    if (payoutEntries.length === 0) {
      return (
        <EmptyState text="История вывода средств пока пуста. После подключения провайдера здесь появятся внешние payout / withdraw операции салона." />
      )
    }

    return (
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeadCellStyle}>ID</th>
              <th style={tableHeadCellStyle}>Тип</th>
              <th style={tableHeadCellStyle}>Сумма</th>
              <th style={tableHeadCellStyle}>Источник</th>
              <th style={tableHeadCellStyle}>Дата</th>
            </tr>
          </thead>

          <tbody>
            {payoutEntries.map((entry) => (
              <tr key={entry.id}>
                <td style={tableCellStyle}>{entry.id}</td>
                <td style={tableCellStyle}>
                  <span style={getStatusStyle("pending")}>
                    {String(entry.reference_type || "").toLowerCase() === "withdraw" ? "withdraw" : "payout"}
                  </span>
                </td>
                <td style={tableCellStyle}>{formatAmount(entry.amount)} KGS</td>
                <td style={tableCellStyle}>{entry.reference_id || "-"}</td>
                <td style={tableCellStyle}>{formatDateTime(entry.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderPaymentsTable() {
    if (loading) return <p style={{ margin: 0, color: "#6b7280" }}>Загрузка платежей...</p>

    if (payments.length === 0) {
      return <EmptyState text="Платежи не найдены" />
    }

    return (
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeadCellStyle}>ID</th>
              <th style={tableHeadCellStyle}>Дата</th>
              <th style={tableHeadCellStyle}>Клиент</th>
              <th style={tableHeadCellStyle}>Сумма</th>
              <th style={tableHeadCellStyle}>Статус</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((p, index) => {
              const isLast = index === payments.length - 1

              return (
                <tr key={p.id}>
                  {renderCell(p.id, isLast ? { borderBottom: "none" } : {})}
                  {renderCell(formatDateTime(p.created_at), isLast ? { borderBottom: "none" } : {})}
                  {renderCell(p.client_name || "-", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(p.amount, isLast ? { borderBottom: "none" } : {})}
                  {renderCell(p.status || "-", isLast ? { borderBottom: "none" } : {})}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderLedgerTable() {
    if (ledgerLoading) return <p style={{ margin: 0, color: "#6b7280" }}>Загрузка леджера...</p>

    if (ledger.length === 0) {
      return <EmptyState text="Нет записей леджера" />
    }

    return (
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeadCellStyle}>ID</th>
              <th style={tableHeadCellStyle}>Направление</th>
              <th style={tableHeadCellStyle}>Сумма</th>
              <th style={tableHeadCellStyle}>Источник</th>
              <th style={tableHeadCellStyle}>Дата</th>
            </tr>
          </thead>

          <tbody>
            {ledger.map((l, index) => {
              const isLast = index === ledger.length - 1

              return (
                <tr key={l.id}>
                  {renderCell(l.id, isLast ? { borderBottom: "none" } : {})}
                  {renderCell(l.direction || "-", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(formatAmount(l.amount), isLast ? { borderBottom: "none" } : {})}
                  {renderCell(l.reference_type || "-", isLast ? { borderBottom: "none" } : {})}
                  {renderCell(formatDateTime(l.created_at), isLast ? { borderBottom: "none" } : {})}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>Финансы салона</h1>
          <p style={pageSubtitleStyle}>
            Финальная структура страницы: обзор, кошелёк, контракты, правила расчётов,
            способы выплат, вывод средств, платежи и леджер — на одной странице без изменения API.
          </p>
        </div>

        <SectionBlock
          title="Обзор финансов"
          hint="Ключевые показатели салона и быстрый контроль текущего финансового состояния."
          style={{ marginTop: 0 }}
        >
          <div style={overviewGridStyle}>
            <MetricCard
              label="Баланс кошелька"
              value={walletLoading ? "..." : `${formatAmount(walletBalance)} KGS`}
              note="Актуальное значение кошелька салона"
            />

            <MetricCard
              label="Доход за сегодня"
              value={ledgerLoading ? "..." : `${formatAmount(todayRevenue)} KGS`}
              note="Все credit / in записи за текущий день"
            />

            <MetricCard
              label="Доход за 7 дней"
              value={ledgerLoading ? "..." : `${formatAmount(weekRevenue)} KGS`}
              note="Срез по последним семи дням"
            />

            <MetricCard
              label="Доход за 30 дней"
              value={ledgerLoading ? "..." : `${formatAmount(monthRevenue)} KGS`}
              note="Срез по последнему месяцу"
            />
          </div>
        </SectionBlock>

        <SectionBlock
          title="Кошелёк"
          hint="Отдельный блок кошелька без дублирования и debug-оформления."
        >
          <div style={compactGridStyle}>
            <InfoBox
              label="Текущий баланс"
              value={walletLoading ? "..." : `${formatAmount(walletBalance)} KGS`}
              note="Значение получено из wallet-balance endpoint"
            />

            <InfoBox
              label="Статус кошелька"
              value={walletReady ? "Готов" : "Загрузка"}
              note="Используется как итоговая точка для движения средств"
            />

            <InfoBox
              label="Источники данных"
              value="Wallet / Ledger"
              note="Кошелёк сверяется с финансовым движением салона"
            />
          </div>
        </SectionBlock>

        <SectionBlock
          title="Контракты"
          hint="Единый блок: сводка, активные и ожидающие контракты, создание нового контракта."
        >
          <div style={twoColumnGridStyle}>
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
                  label="Всего"
                  value={contractsLoading ? "..." : contracts.length}
                  note="Полная история контрактов салона"
                />
              </div>

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
                          <th style={tableHeadCellStyle}>Доля %</th>
                          <th style={tableHeadCellStyle}>Статус</th>
                        </tr>
                      </thead>

                      <tbody>
                        {activeContracts.map((c, index) => {
                          const isLast = index === activeContracts.length - 1

                          return (
                            <tr key={c.id}>
                              {renderCell(c.id, isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractMasterPercent(c), isLast ? { borderBottom: "none" } : {})}
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
                          <th style={tableHeadCellStyle}>Доля %</th>
                          <th style={tableHeadCellStyle}>Статус</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pendingContracts.map((c, index) => {
                          const isLast = index === pendingContracts.length - 1

                          return (
                            <tr key={c.id}>
                              {renderCell(c.id, isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getMasterName(c), isLast ? { borderBottom: "none" } : {})}
                              {renderCell(getContractMasterPercent(c), isLast ? { borderBottom: "none" } : {})}
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
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Создать контракт
                </h3>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
                  UI унифицирован под карточки кабинета. Логика создания и API остаются без изменений.
                </p>
              </div>

              {mastersLoading && <p style={{ margin: 0, color: "#6b7280" }}>Загрузка мастеров...</p>}

              {!mastersLoading && (
                <form onSubmit={createContract}>
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

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>Дата начала действия</label>
                    <input
                      type="datetime-local"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      style={inputStyle}
                    />
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
                    Сумма процентов: {contractSum}
                  </div>

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
                    disabled={createContractLoading}
                    style={{
                      ...primaryButtonStyle,
                      opacity: createContractLoading ? 0.7 : 1,
                      cursor: createContractLoading ? "wait" : "pointer"
                    }}
                  >
                    {createContractLoading ? "Создание..." : "Создать контракт"}
                  </button>
                </form>
              )}
            </Card>
          </div>
        </SectionBlock>

        <SectionBlock
          title="Правила расчётов"
          hint="Активные правила распределения дохода между мастером, салоном и платформой."
        >
          <Card>
            {renderSettlementRules()}
          </Card>
        </SectionBlock>

        <SectionBlock
          title="Способы выплат"
          hint="Графики выплат по активным контрактам. Этот блок использует текущие terms_json без изменения логики."
        >
          <Card>
            {renderPayoutMethod()}
          </Card>
        </SectionBlock>

        <SectionBlock
          title="Вывод средств"
          hint="Внешний вывод средств подготовлен как полноценный UI-блок. Выполнение payout останется закрытым до получения ключей xPay и backend endpoint."
        >
          <div style={twoColumnGridStyle}>
            <Card>
              <div style={compactGridStyle}>
                <InfoBox
                  label="Статус интеграции"
                  value="Ожидает ключи"
                  note="xPay ещё не подключён к внешнему payout flow"
                />

                <InfoBox
                  label="Источник средств"
                  value="Кошелёк салона"
                  note="После подключения провайдера вывод будет идти из wallet balance"
                />

                <InfoBox
                  label="Текущий баланс"
                  value={walletLoading ? "..." : `${formatAmount(walletBalance)} KGS`}
                  note="Доступный остаток для будущего внешнего вывода"
                />

                <InfoBox
                  label="История payout"
                  value={ledgerLoading ? "..." : payoutEntries.length}
                  note="Уже зафиксированные внешние списания в леджере"
                />
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #dbeafe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 14,
                  lineHeight: 1.5
                }}
              >
                Инструмент вывода добавлен в структуру страницы и подготовлен для работы с внешним payout provider.
                Сейчас форма нужна для подготовки UX и финальной схемы вывода. Реальное списание намеренно выключено
                до получения ключей и подтверждения backend endpoint для salon withdraw.
              </div>
            </Card>

            <Card soft>
              <form onSubmit={prepareWithdraw}>
                <div style={fieldBlockStyle}>
                  <label style={labelStyle}>Куда выводить</label>
                  <select
                    value={withdrawMethod}
                    onChange={(event) => setWithdrawMethod(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="bank">Банковский счёт</option>
                    <option value="card">Карта</option>
                    <option value="wallet">Электронный кошелёк</option>
                    <option value="xpay">xPay</option>
                  </select>
                </div>

                <div style={fieldBlockStyle}>
                  <label style={labelStyle}>Реквизит получателя</label>
                  <input
                    type="text"
                    value={withdrawRecipient}
                    onChange={(event) => setWithdrawRecipient(event.target.value)}
                    placeholder="Счёт / карта / кошелёк / xPay ID"
                    style={inputStyle}
                  />
                </div>

                <div style={fieldBlockStyle}>
                  <label style={labelStyle}>Сумма вывода</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>

                <div style={fieldBlockStyle}>
                  <label style={labelStyle}>Комментарий</label>
                  <input
                    type="text"
                    value={withdrawComment}
                    onChange={(event) => setWithdrawComment(event.target.value)}
                    placeholder="Например: вывод на расчётный счёт салона"
                    style={inputStyle}
                  />
                </div>

                <div style={fieldBlockStyle}>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      color: "#4b5563",
                      fontSize: 13,
                      lineHeight: 1.5
                    }}
                  >
                    Подготовка заявки не отправляет деньги наружу. Она проверяет данные формы и фиксирует,
                    что UI готов к подключению провайдера.
                    {withdrawComment ? ` Комментарий: ${withdrawComment}` : ""}
                  </div>
                </div>

                {withdrawError && (
                  <div style={errorBoxStyle}>
                    {withdrawError}
                  </div>
                )}

                {withdrawNotice && (
                  <div style={successBoxStyle}>
                    {withdrawNotice}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="submit" style={secondaryButtonStyle}>
                    Подготовить вывод
                  </button>

                  <button
                    type="button"
                    style={{
                      ...secondaryButtonStyle,
                      opacity: 0.55,
                      cursor: "not-allowed"
                    }}
                    disabled
                  >
                    Выполнить вывод
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </SectionBlock>

        <SectionBlock
          title="История вывода средств"
          hint="Журнал debit / payout операций салона по данным леджера. Этот блок нужен для контроля внешних выводов и ручной сверки."
        >
          <div style={twoColumnGridStyle}>
            <Card>
              <div style={compactGridStyle}>
                <InfoBox
                  label="Операций вывода"
                  value={ledgerLoading ? "..." : payoutEntries.length}
                  note="Количество payout / withdraw записей в леджере"
                />

                <InfoBox
                  label="Сумма выводов"
                  value={ledgerLoading ? "..." : `${formatAmount(payoutAmountTotal)} KGS`}
                  note="Совокупный объём внешних списаний"
                />

                <InfoBox
                  label="Последний вывод"
                  value={lastPayoutEntry ? formatDateTime(lastPayoutEntry.created_at) : "-"}
                  note={lastPayoutEntry ? `ID: ${lastPayoutEntry.id}` : "Пока нет завершённых payout / withdraw записей"}
                />
              </div>
            </Card>

            <Card soft>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  color: "#4b5563",
                  fontSize: 14,
                  lineHeight: 1.55
                }}
              >
                Этот блок не создаёт новые транзакции. Он только показывает историю выводов, уже попавших в леджер.
                После активации backend endpoint для salon withdraw здесь можно будет сверять заявку на вывод,
                факт списания и внешний payout provider в одном месте.
              </div>
            </Card>
          </div>

          <Card style={{ marginTop: 14 }}>
            {renderWithdrawHistory()}
          </Card>
        </SectionBlock>

        <SectionBlock
          title="Проверка пайплайна: Контракты → Расчёты → Кошелёк"
          hint="Финальная визуальная сверка загрузки ключевых слоёв без изменения backend-логики."
        >
          <div style={threeColumnGridStyle}>
            {pipelineChecks.map((item) => (
              <Card key={item.label} style={{ minHeight: 158 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "#6b7280",
                        fontWeight: 500
                      }}
                    >
                      {item.label}
                    </p>

                    <p
                      style={{
                        margin: "10px 0 0 0",
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#111827"
                      }}
                    >
                      {item.value}
                    </p>
                  </div>

                  <div>
                    {renderPipelineBadge(item.status)}
                  </div>
                </div>

                <p
                  style={{
                    margin: "14px 0 0 0",
                    fontSize: 13,
                    color: "#6b7280",
                    lineHeight: 1.5
                  }}
                >
                  {item.note}
                </p>
              </Card>
            ))}
          </div>

          <Card style={{ marginTop: 14 }}>
            <div style={compactGridStyle}>
              <InfoBox
                label="Платежи"
                value={paymentsReady ? payments.length : "..."}
                note="Поток входящих платёжных событий"
              />

              <InfoBox
                label="Леджер"
                value={ledgerReady ? ledger.length : "..."}
                note="Транзакционный журнал движения средств"
              />

              <InfoBox
                label="Активные правила"
                value={contractsReady ? activeContracts.length : "..."}
                note="Правила, которые участвуют в распределении"
              />

              <InfoBox
                label="Итог"
                value={walletReady && ledgerReady && contractsReady ? "Связка загружена" : "Проверка идёт"}
                note="Визуальная проверка цепочки contracts → settlements → wallet"
              />
            </div>
          </Card>
        </SectionBlock>

        <SectionBlock
          title="История контрактов"
          hint="Полный список созданных контрактов с датой создания и статусом."
        >
          <Card>
            {renderContractsHistory()}
          </Card>
        </SectionBlock>

        <SectionBlock
          title="Платежи"
          hint="Входящие платёжные операции салона без изменения endpoint и структуры данных."
        >
          <Card>
            {renderPaymentsTable()}
          </Card>
        </SectionBlock>

        <SectionBlock
          title="Леджер"
          hint="Финальный журнал движения средств по салону."
        >
          <Card>
            {renderLedgerTable()}
          </Card>
        </SectionBlock>
      </div>
    </div>
  )
}
