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
          marginBottom: 14,
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
                lineHeight: 1.5,
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
        padding: 22,
        boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
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
        padding: 16,
        background: "#ffffff",
        minHeight: 122
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
          margin: "8px 0 0 0",
          fontSize: 24,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.15
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
            lineHeight: 1.45
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

export default function SalonContractsPage() {
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

  const salonSlug = "totem-demo-salon"

  const pageStyle = {
    minHeight: "100%",
    padding: 28,
    background: "#f6f7fb"
  }

  const shellStyle = {
    maxWidth: 1560,
    margin: "0 auto"
  }

  const pageHeaderStyle = {
    marginBottom: 20
  }

  const pageTitleStyle = {
    margin: 0,
    fontSize: 30,
    fontWeight: 700,
    color: "#111827"
  }

  const pageSubtitleStyle = {
    margin: "8px 0 0 0",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.55,
    maxWidth: 920
  }

  const twoColumnGridStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.35fr) minmax(460px, 0.95fr)",
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

  const tableWrapStyle = {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#ffffff"
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 760
  }

  const tableHeadCellStyle = {
    textAlign: "left",
    padding: "13px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap"
  }

  const tableCellStyle = {
    padding: "13px 14px",
    fontSize: 14,
    color: "#111827",
    borderBottom: "1px solid #eef2f7",
    verticalAlign: "top"
  }

  const inputStyle = {
    width: "100%",
    padding: 11,
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

  useEffect(() => {
    loadContracts()
    loadMasters()
  }, [])

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

      const data = await res.json()

      if (Array.isArray(data)) {
        setMasters(data)
      }
      else if (data.masters) {
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

  const contractSum = Number(masterPercent || 0) + Number(salonPercent || 0) + Number(platformPercent || 0)

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>Контракты салона</h1>
          <p style={pageSubtitleStyle}>
            Единый блок контрактов: сводка, активные и ожидающие контракты, создание нового контракта.
          </p>
        </div>

        <SectionBlock
          title="Контракты"
          hint="Единый блок: сводка, активные и ожидающие контракты, создание нового контракта."
          style={{ marginTop: 0 }}
        >
          <div style={twoColumnGridStyle}>
            <Card>
              <div style={{ marginBottom: 18 }}>
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

              <div style={{ marginTop: 22 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#111827" }}>
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

              <div style={{ marginTop: 22 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#111827" }}>
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

            <Card soft style={{ position: "sticky", top: 20 }}>
              <div style={{ marginBottom: 18 }}>
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
                      padding: 14,
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
                      cursor: createContractLoading ? "wait" : "pointer",
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