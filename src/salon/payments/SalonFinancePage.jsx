import React, { useEffect, useState } from "react"

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
    color: "#6b7280"
  }

  const sectionStyle = {
    marginTop: 20
  }

  const sectionHeaderRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap"
  }

  const sectionTitleStyle = {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#111827"
  }

  const sectionHintStyle = {
    margin: 0,
    fontSize: 13,
    color: "#6b7280"
  }

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff",
    padding: 18,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)"
  }

  const softCardStyle = {
    ...cardStyle,
    background: "#fbfcfe"
  }

  const overviewGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  }

  const overviewCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    background: "#ffffff",
    minHeight: 116,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  }

  const overviewLabelStyle = {
    margin: 0,
    fontSize: 13,
    color: "#6b7280",
    fontWeight: 500
  }

  const overviewValueStyle = {
    margin: "10px 0 0 0",
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.1,
    color: "#111827"
  }

  const overviewSubtleStyle = {
    margin: "8px 0 0 0",
    fontSize: 12,
    color: "#9ca3af"
  }

  const twoColumnGridStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: 16,
    alignItems: "start"
  }

  const infoGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12
  }

  const infoBoxStyle = {
    border: "1px solid #eef2f7",
    borderRadius: 12,
    padding: 14,
    background: "#ffffff"
  }

  const infoLabelStyle = {
    margin: 0,
    fontSize: 12,
    color: "#6b7280"
  }

  const infoValueStyle = {
    margin: "6px 0 0 0",
    fontSize: 22,
    fontWeight: 700,
    color: "#111827"
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
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    color: "#6b7280",
    background: "#f9fafb",
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
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    boxSizing: "border-box",
    fontSize: 14,
    background: "#ffffff",
    color: "#111827",
    outline: "none"
  }

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151"
  }

  const fieldBlockStyle = {
    marginBottom: 14
  }

  const formGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14
  }

  const buttonStyle = {
    padding: "11px 16px",
    border: "1px solid #111827",
    borderRadius: 10,
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600
  }

  const helperTextStyle = {
    margin: "2px 0 0 0",
    fontSize: 12,
    color: "#6b7280"
  }

  const statusPillBaseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent"
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


  function formatAmount(value) {

    if (value === null || value === undefined) return "-"

    return Number(value)

  }


  function formatStatus(value) {

    if (value === "active") return "Активный"
    if (value === "pending") return "Ожидает"
    if (value === "archived") return "Архивный"

    return value || "-"
  }


  function getStatusStyle(value) {

    if (value === "active") {
      return {
        ...statusPillBaseStyle,
        background: "#ecfdf3",
        color: "#027a48",
        borderColor: "#abefc6"
      }
    }

    if (value === "pending") {
      return {
        ...statusPillBaseStyle,
        background: "#fffaeb",
        color: "#b54708",
        borderColor: "#fedf89"
      }
    }

    if (value === "archived") {
      return {
        ...statusPillBaseStyle,
        background: "#f2f4f7",
        color: "#475467",
        borderColor: "#d0d5dd"
      }
    }

    return {
      ...statusPillBaseStyle,
      background: "#f2f4f7",
      color: "#344054",
      borderColor: "#d0d5dd"
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
      } catch {
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


  function formatDateTime(value) {

    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })

  }


  function renderTableEmpty(text) {
    return (
      <div style={{
        padding: 18,
        fontSize: 14,
        color: "#6b7280"
      }}>
        {text}
      </div>
    )
  }


  function renderCell(content, extraStyle = {}) {
    return (
      <td style={{ ...tableCellStyle, ...extraStyle }}>
        {content}
      </td>
    )
  }


  const activeContracts = contracts.filter(c => c.status === "active")
  const pendingContracts = contracts.filter(c => c.status === "pending")

  const todayRevenue = getRevenueByDays(1)
  const weekRevenue = getRevenueByDays(7)
  const monthRevenue = getRevenueByDays(30)


  function renderSettlementRules() {

    if (contractsLoading) return <p>Загрузка правил...</p>

    if (activeContracts.length === 0) {
      return <p>Нет правил распределения</p>
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

              const masterShare = terms.master_percent ?? "-"
              const salonShare = terms.salon_percent ?? "-"
              const platformShare = terms.platform_percent ?? "-"

              return (

                <tr key={c.id}>
                  {renderCell(getMasterName(c))}
                  {renderCell(masterShare)}
                  {renderCell(salonShare)}
                  {renderCell(platformShare, index === activeContracts.length - 1 ? { borderBottom: "none" } : {})}
                </tr>

              )

            })}

          </tbody>

        </table>
      </div>

    )

  }


  function renderPayoutMethod() {

    if (contractsLoading) return <p>Загрузка правил выплат...</p>

    if (activeContracts.length === 0) {
      return <p>Нет настроек выплат</p>
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


  return (

    <div style={pageStyle}>

      <div style={shellStyle}>

        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>Финансы салона</h1>
          <p style={pageSubtitleStyle}>
            Единая страница финансов, контрактов, выплат и движения средств.
          </p>
        </div>


        <section style={{ ...sectionStyle, marginTop: 0 }}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Finance Overview</h2>
              <p style={sectionHintStyle}>Ключевые показатели салона без дублирования блоков.</p>
            </div>
          </div>

          <div style={overviewGridStyle}>

            <div style={overviewCardStyle}>
              <p style={overviewLabelStyle}>Баланс кошелька</p>
              <p style={overviewValueStyle}>
                {walletLoading ? "..." : `${formatAmount(walletBalance)} KGS`}
              </p>
              <p style={overviewSubtleStyle}>Актуальное значение кошелька салона</p>
            </div>

            <div style={overviewCardStyle}>
              <p style={overviewLabelStyle}>Доход за сегодня</p>
              <p style={overviewValueStyle}>
                {ledgerLoading ? "..." : `${formatAmount(todayRevenue)} KGS`}
              </p>
              <p style={overviewSubtleStyle}>Все credit / in записи за текущий день</p>
            </div>

            <div style={overviewCardStyle}>
              <p style={overviewLabelStyle}>Доход за 7 дней</p>
              <p style={overviewValueStyle}>
                {ledgerLoading ? "..." : `${formatAmount(weekRevenue)} KGS`}
              </p>
              <p style={overviewSubtleStyle}>Срез за последнюю неделю</p>
            </div>

            <div style={overviewCardStyle}>
              <p style={overviewLabelStyle}>Доход за 30 дней</p>
              <p style={overviewValueStyle}>
                {ledgerLoading ? "..." : `${formatAmount(monthRevenue)} KGS`}
              </p>
              <p style={overviewSubtleStyle}>Срез за последний месяц</p>
            </div>

          </div>

        </section>


        <section style={sectionStyle}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Contracts</h2>
              <p style={sectionHintStyle}>Активные правила, ожидающие договоры и создание нового контракта.</p>
            </div>
          </div>

          <div style={twoColumnGridStyle}>

            <div style={cardStyle}>

              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Сводка по контрактам
                </h3>
              </div>

              <div style={infoGridStyle}>

                <div style={infoBoxStyle}>
                  <p style={infoLabelStyle}>Активные</p>
                  <p style={infoValueStyle}>{contractsLoading ? "..." : activeContracts.length}</p>
                </div>

                <div style={infoBoxStyle}>
                  <p style={infoLabelStyle}>Ожидающие</p>
                  <p style={infoValueStyle}>{contractsLoading ? "..." : pendingContracts.length}</p>
                </div>

                <div style={infoBoxStyle}>
                  <p style={infoLabelStyle}>Всего</p>
                  <p style={infoValueStyle}>{contractsLoading ? "..." : contracts.length}</p>
                </div>

              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#111827" }}>
                  Активные контракты
                </h3>

                {contractsLoading && (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Загрузка...</div>
                )}

                {!contractsLoading && activeContracts.length === 0 && renderTableEmpty("Нет активных контрактов")}

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

                {!contractsLoading && pendingContracts.length === 0 && renderTableEmpty("Нет ожидающих контрактов")}

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

            </div>


            <div style={softCardStyle}>

              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Создать контракт
                </h3>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                  Только UI и форма. Логика создания и API остаются без изменений.
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

                  <div style={fieldBlockStyle}>
                    <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>
                      Сумма процентов: {Number(masterPercent || 0) + Number(salonPercent || 0) + Number(platformPercent || 0)}
                    </p>
                    <p style={helperTextStyle}>
                      Должна быть ровно 100.
                    </p>
                  </div>

                  {createContractError && (
                    <div style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid #fecdca",
                      background: "#fef3f2",
                      color: "#b42318",
                      fontSize: 14
                    }}>
                      {createContractError}
                    </div>
                  )}

                  {createContractSuccess && (
                    <div style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid #abefc6",
                      background: "#ecfdf3",
                      color: "#027a48",
                      fontSize: 14
                    }}>
                      {createContractSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createContractLoading}
                    style={buttonStyle}
                  >
                    {createContractLoading ? "Создание..." : "Создать контракт"}
                  </button>

                </form>
              )}

            </div>

          </div>

        </section>


        <section style={sectionStyle}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Settlement Rules</h2>
              <p style={sectionHintStyle}>Правила распределения выручки по активным контрактам.</p>
            </div>
          </div>

          <div style={cardStyle}>
            {renderSettlementRules()}
          </div>

        </section>


        <section style={sectionStyle}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Payout Method</h2>
              <p style={sectionHintStyle}>График выплат и разбивка долей по активным договорам.</p>
            </div>
          </div>

          <div style={cardStyle}>
            {renderPayoutMethod()}
          </div>

        </section>


        <section style={sectionStyle}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>History</h2>
              <p style={sectionHintStyle}>Полная история контрактов салона.</p>
            </div>
          </div>

          <div style={cardStyle}>

            {contractsLoading && <p style={{ margin: 0, color: "#6b7280" }}>Загрузка...</p>}

            {!contractsLoading && contracts.length === 0 && renderTableEmpty("История контрактов пуста")}

            {!contractsLoading && contracts.length > 0 && (

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

            )}

          </div>

        </section>


        <section style={sectionStyle}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Wallet</h2>
              <p style={sectionHintStyle}>Отдельный компактный блок без повторения overview-карточек.</p>
            </div>
          </div>

          <div style={cardStyle}>
            {walletLoading && <p style={{ margin: 0, color: "#6b7280" }}>Загрузка кошелька...</p>}

            {!walletLoading && (
              <div>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Баланс</p>
                <p style={{ margin: "8px 0 0 0", fontSize: 32, fontWeight: 700, color: "#111827" }}>
                  {formatAmount(walletBalance)} KGS
                </p>
              </div>
            )}
          </div>

        </section>


        <section style={sectionStyle}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Payments</h2>
              <p style={sectionHintStyle}>История платежей без изменений данных и endpoint-логики.</p>
            </div>
          </div>

          <div style={cardStyle}>

            {loading && <p style={{ margin: 0, color: "#6b7280" }}>Загрузка платежей...</p>}

            {!loading && payments.length === 0 && renderTableEmpty("Платежи не найдены")}

            {!loading && payments.length > 0 && (

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
                          {renderCell(
                            <span style={getStatusStyle(p.status)}>{p.status || "-"}</span>,
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

        </section>


        <section style={sectionStyle}>

          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Ledger</h2>
              <p style={sectionHintStyle}>Движение средств и источники записей ledger.</p>
            </div>
          </div>

          <div style={cardStyle}>

            {ledgerLoading && <p style={{ margin: 0, color: "#6b7280" }}>Загрузка леджера...</p>}

            {!ledgerLoading && ledger.length === 0 && renderTableEmpty("Нет записей леджера")}

            {!ledgerLoading && ledger.length > 0 && (

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
                          {renderCell(l.direction, isLast ? { borderBottom: "none" } : {})}
                          {renderCell(formatAmount(l.amount), isLast ? { borderBottom: "none" } : {})}
                          {renderCell(l.reference_type, isLast ? { borderBottom: "none" } : {})}
                          {renderCell(formatDateTime(l.created_at), isLast ? { borderBottom: "none" } : {})}
                        </tr>
                      )
                    })}

                  </tbody>

                </table>
              </div>

            )}

          </div>

        </section>

      </div>

    </div>

  )

}
