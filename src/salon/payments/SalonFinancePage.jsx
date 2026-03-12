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

  const sectionCardStyle = {
    border: "1px solid #ddd",
    padding: 20,
    borderRadius: 8,
    background: "#fafafa",
    marginTop: 10
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse"
  }

  const inputStyle = {
    width: "100%",
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 6,
    boxSizing: "border-box"
  }

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600
  }

  const fieldBlockStyle = {
    marginBottom: 14
  }

  const buttonStyle = {
    padding: "10px 16px",
    border: "1px solid #222",
    borderRadius: 6,
    background: "#222",
    color: "#fff",
    cursor: "pointer"
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


  const activeContracts = contracts.filter(c => c.status === "active")
  const pendingContracts = contracts.filter(c => c.status === "pending")


  function renderSettlementRules() {

    if (contractsLoading) return <p>Загрузка правил...</p>

    if (activeContracts.length === 0) {
      return <p>Нет правил распределения</p>
    }

    return (

      <table border="1" cellPadding="8" style={tableStyle}>

        <thead>
          <tr>
            <th>Мастер</th>
            <th>Мастер %</th>
            <th>Салон %</th>
            <th>Платформа %</th>
          </tr>
        </thead>

        <tbody>

          {activeContracts.map(c => {

            const terms = getContractTerms(c)

            const masterShare = terms.master_percent ?? "-"
            const salonShare = terms.salon_percent ?? "-"
            const platformShare = terms.platform_percent ?? "-"

            return (

              <tr key={c.id}>
                <td>{c.master_slug}</td>
                <td>{masterShare}</td>
                <td>{salonShare}</td>
                <td>{platformShare}</td>
              </tr>

            )

          })}

        </tbody>

      </table>

    )

  }


  function renderPayoutMethod() {

    if (contractsLoading) return <p>Загрузка правил выплат...</p>

    if (activeContracts.length === 0) {
      return <p>Нет настроек выплат</p>
    }

    return (

      <table border="1" cellPadding="8" style={tableStyle}>

        <thead>
          <tr>
            <th>Мастер</th>
            <th>График выплат</th>
            <th>Мастер %</th>
            <th>Салон %</th>
            <th>Платформа %</th>
          </tr>
        </thead>

        <tbody>

          {activeContracts.map(c => {

            const terms = getContractTerms(c)

            return (

              <tr key={c.id}>
                <td>{c.master_slug}</td>
                <td>{terms.payout_schedule || "вручную"}</td>
                <td>{terms.master_percent ?? "-"}</td>
                <td>{terms.salon_percent ?? "-"}</td>
                <td>{terms.platform_percent ?? "-"}</td>
              </tr>

            )

          })}

        </tbody>

      </table>

    )

  }


  return (

    <div style={{ padding: 20 }}>

      <h1>Финансы</h1>


      <section>

        <h2>Сводка по контрактам</h2>

        <div style={sectionCardStyle}>

          {contractsLoading && <p>Загрузка контрактов...</p>}

          {!contractsLoading && (
            <div>
              <p>Активные контракты: {activeContracts.length}</p>
              <p>Ожидающие контракты: {pendingContracts.length}</p>
              <p>Всего контрактов: {contracts.length}</p>
            </div>
          )}

        </div>

      </section>


      <section>

        <h2>Контракты мастеров</h2>

        <div style={sectionCardStyle}>

          {contractsLoading && <p>Загрузка...</p>}

          {!contractsLoading && activeContracts.length === 0 && (
            <p>Нет активных контрактов</p>
          )}

          {!contractsLoading && activeContracts.length > 0 && (

            <table border="1" cellPadding="8" style={tableStyle}>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Мастер</th>
                  <th>Доля %</th>
                  <th>Статус</th>
                </tr>
              </thead>

              <tbody>

                {activeContracts.map((c) => (

                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.master_slug}</td>
                    <td>{c.share_percent}</td>
                    <td>{formatStatus(c.status)}</td>
                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </section>


      <section>

        <h2>Ожидающие контракты</h2>

        <div style={sectionCardStyle}>

          {contractsLoading && <p>Загрузка...</p>}

          {!contractsLoading && pendingContracts.length === 0 && (
            <p>Нет ожидающих контрактов</p>
          )}

          {!contractsLoading && pendingContracts.length > 0 && (

            <table border="1" cellPadding="8" style={tableStyle}>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Мастер</th>
                  <th>Доля %</th>
                  <th>Статус</th>
                </tr>
              </thead>

              <tbody>

                {pendingContracts.map((c) => (

                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.master_slug}</td>
                    <td>{c.share_percent}</td>
                    <td>{formatStatus(c.status)}</td>
                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </section>


      <section>

        <h2>Создать контракт</h2>

        <div style={sectionCardStyle}>

          {mastersLoading && <p>Загрузка мастеров...</p>}

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
                <p>
                  Сумма процентов: {Number(masterPercent || 0) + Number(salonPercent || 0) + Number(platformPercent || 0)}
                </p>
              </div>

              {createContractError && (
                <div style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid #e0b4b4",
                  background: "#fff6f6",
                  color: "#9f3a38"
                }}>
                  {createContractError}
                </div>
              )}

              {createContractSuccess && (
                <div style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid #b7eb8f",
                  background: "#f6ffed",
                  color: "#389e0d"
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

      </section>


      <section>

        <h2>Правила распределения</h2>

        <div style={sectionCardStyle}>
          {renderSettlementRules()}
        </div>

      </section>


      <section>

        <h2>Способ выплат</h2>

        <div style={sectionCardStyle}>
          {renderPayoutMethod()}
        </div>

      </section>


      <section>

        <h2>История контрактов</h2>

        <div style={sectionCardStyle}>

          {contractsLoading && <p>Загрузка...</p>}

          {!contractsLoading && contracts.length === 0 && (
            <p>История контрактов пуста</p>
          )}

          {!contractsLoading && contracts.length > 0 && (

            <table border="1" cellPadding="8" style={tableStyle}>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Мастер</th>
                  <th>Статус</th>
                  <th>Создан</th>
                </tr>
              </thead>

              <tbody>

                {contracts.map((c) => (

                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.master_slug}</td>
                    <td>{formatStatus(c.status)}</td>
                    <td>{c.created_at}</td>
                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </section>


      <section>

        <h2>Баланс кошелька</h2>

        <div style={sectionCardStyle}>

          {walletLoading && <p>Загрузка кошелька...</p>}

          {!walletLoading && (
            <h3>{formatAmount(walletBalance)} KGS</h3>
          )}

        </div>

      </section>


      <section>

        <h2>Платежи</h2>

        <div style={sectionCardStyle}>

          {loading && <p>Загрузка платежей...</p>}

          {!loading && payments.length === 0 && (
            <p>Платежи не найдены</p>
          )}

          {!loading && payments.length > 0 && (

            <table border="1" cellPadding="8" style={tableStyle}>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                </tr>
              </thead>

              <tbody>

                {payments.map((p) => (

                  <tr key={p.id}>

                    <td>{p.id}</td>

                    <td>{p.created_at}</td>

                    <td>{p.client_name || "-"}</td>

                    <td>{p.amount}</td>

                    <td>{p.status}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </section>


      <section>

        <h2>Леджер</h2>

        <div style={sectionCardStyle}>

          {ledgerLoading && <p>Загрузка леджера...</p>}

          {!ledgerLoading && ledger.length === 0 && (
            <p>Нет записей леджера</p>
          )}

          {!ledgerLoading && ledger.length > 0 && (

            <table border="1" cellPadding="8" style={tableStyle}>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Направление</th>
                  <th>Сумма</th>
                  <th>Источник</th>
                  <th>Дата</th>
                </tr>
              </thead>

              <tbody>

                {ledger.map((l) => (

                  <tr key={l.id}>

                    <td>{l.id}</td>

                    <td>{l.direction}</td>

                    <td>{formatAmount(l.amount)}</td>

                    <td>{l.reference_type}</td>

                    <td>{l.created_at}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </section>

    </div>

  )

}