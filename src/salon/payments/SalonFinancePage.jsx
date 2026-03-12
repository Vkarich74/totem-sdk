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


  const activeContracts = contracts.filter(c => c.status === "active")
  const pendingContracts = contracts.filter(c => c.status === "pending")


  function renderSettlementRules() {

    if (contractsLoading) return <p>Loading rules...</p>

    if (activeContracts.length === 0) {
      return <p>No settlement rules available</p>
    }

    return (

      <table border="1" cellPadding="8">

        <thead>
          <tr>
            <th>Master</th>
            <th>Master Share</th>
            <th>Salon Share</th>
            <th>Payout Schedule</th>
          </tr>
        </thead>

        <tbody>

          {activeContracts.map(c => {

            let terms = {}

            try {
              terms = JSON.parse(c.terms_json || "{}")
            } catch {
              terms = {}
            }

            const masterShare = terms.master_share || "-"
            const salonShare = terms.salon_share || "-"
            const payoutSchedule = terms.payout_schedule || "-"

            return (

              <tr key={c.id}>
                <td>{c.master_slug}</td>
                <td>{masterShare}%</td>
                <td>{salonShare}%</td>
                <td>{payoutSchedule}</td>
              </tr>

            )

          })}

        </tbody>

      </table>

    )

  }


  return (

    <div style={{ padding: 20 }}>

      <h1>Finance</h1>


      <section>

        <h2>Contract Summary</h2>

        {contractsLoading && <p>Loading contracts...</p>}

        {!contractsLoading && (
          <div>
            <p>Active contracts: {activeContracts.length}</p>
            <p>Pending contracts: {pendingContracts.length}</p>
            <p>Total contracts: {contracts.length}</p>
          </div>
        )}

      </section>


      <section>

        <h2>Master Contracts</h2>

        {contractsLoading && <p>Loading...</p>}

        {!contractsLoading && activeContracts.length === 0 && (
          <p>No active contracts</p>
        )}

        {!contractsLoading && activeContracts.length > 0 && (

          <table border="1" cellPadding="8">

            <thead>
              <tr>
                <th>ID</th>
                <th>Master</th>
                <th>Share %</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {activeContracts.map((c) => (

                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.master_slug}</td>
                  <td>{c.share_percent}</td>
                  <td>{c.status}</td>
                </tr>

              ))}

            </tbody>

          </table>

        )}

      </section>


      <section>

        <h2>Pending Contracts</h2>

        {contractsLoading && <p>Loading...</p>}

        {!contractsLoading && pendingContracts.length === 0 && (
          <p>No pending contracts</p>
        )}

        {!contractsLoading && pendingContracts.length > 0 && (

          <table border="1" cellPadding="8">

            <thead>
              <tr>
                <th>ID</th>
                <th>Master</th>
                <th>Share %</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {pendingContracts.map((c) => (

                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.master_slug}</td>
                  <td>{c.share_percent}</td>
                  <td>{c.status}</td>
                </tr>

              ))}

            </tbody>

          </table>

        )}

      </section>


      <section>

        <h2>Settlement Rules</h2>

        {renderSettlementRules()}

      </section>


      <section>

        <h2>Payout Method</h2>

        <p>Payout configuration defined in contract terms.</p>

      </section>


      <section>

        <h2>Contract History</h2>

        {contractsLoading && <p>Loading...</p>}

        {!contractsLoading && contracts.length === 0 && (
          <p>No contract history</p>
        )}

        {!contractsLoading && contracts.length > 0 && (

          <table border="1" cellPadding="8">

            <thead>
              <tr>
                <th>ID</th>
                <th>Master</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>

              {contracts.map((c) => (

                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.master_slug}</td>
                  <td>{c.status}</td>
                  <td>{c.created_at}</td>
                </tr>

              ))}

            </tbody>

          </table>

        )}

      </section>


      <section>

        <h2>Wallet Balance</h2>

        {walletLoading && <p>Loading wallet...</p>}

        {!walletLoading && (
          <h3>{formatAmount(walletBalance)} KGS</h3>
        )}

      </section>


      <section>

        <h2>Payments</h2>

        {loading && <p>Loading payments...</p>}

        {!loading && payments.length === 0 && (
          <p>No payments found</p>
        )}

        {!loading && payments.length > 0 && (

          <table border="1" cellPadding="8">

            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
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

      </section>


      <section>

        <h2>Ledger</h2>

        {ledgerLoading && <p>Loading ledger...</p>}

        {!ledgerLoading && ledger.length === 0 && (
          <p>No ledger entries</p>
        )}

        {!ledgerLoading && ledger.length > 0 && (

          <table border="1" cellPadding="8">

            <thead>
              <tr>
                <th>ID</th>
                <th>Direction</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Date</th>
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

      </section>

    </div>

  )

}