import React, { useEffect, useState } from "react"

export default function SalonFinancePage() {

  const [payments, setPayments] = useState([])
  const [ledger, setLedger] = useState([])
  const [walletBalance, setWalletBalance] = useState(null)

  const [contracts, setContracts] = useState([])
  const [contractsLoading, setContractsLoading] = useState(true)

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

  useEffect(() => {

    loadPayments()
    loadLedger()
    loadWallet()
    loadContracts()

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