import React, { useEffect, useState } from "react";

export default function SalonFinancePage() {

  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(true);

  const salonSlug = "totem-demo-salon";

  useEffect(() => {
    loadPayments();
    loadLedger();
    loadWallet();
  }, []);


  async function loadPayments() {
    try {

      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/payments`
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setPayments(data);
      } else if (data.payments) {
        setPayments(data.payments);
      }

    } catch (err) {
      console.error("Payments load error:", err);
    } finally {
      setLoading(false);
    }
  }


  async function loadLedger() {
    try {

      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/ledger`
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setLedger(data);
      } else if (data.ledger) {
        setLedger(data.ledger);
      }

    } catch (err) {
      console.error("Ledger load error:", err);
    } finally {
      setLedgerLoading(false);
    }
  }


  async function loadWallet() {
    try {

      const res = await fetch(
        `https://api.totemv.com/internal/salons/${salonSlug}/wallet-balance`
      );

      const data = await res.json();

      if (data.balance !== undefined) {
        setWalletBalance(data.balance);
      }

    } catch (err) {
      console.error("Wallet load error:", err);
    } finally {
      setWalletLoading(false);
    }
  }


  function formatAmount(cents) {
    if (cents === null || cents === undefined) return "-";
    return (Number(cents) / 100).toFixed(2);
  }


  return (
    <div style={{ padding: 20 }}>

      <h1>Finance</h1>


      <section>
        <h2>Contract Summary</h2>
        <p>Активные контракты с мастерами.</p>
      </section>


      <section>
        <h2>Master Contracts</h2>
        <p>Список контрактов мастеров.</p>
      </section>


      <section>
        <h2>Pending Contracts</h2>
        <p>Контракты ожидающие подтверждения.</p>
      </section>


      <section>
        <h2>Settlement Rules</h2>
        <p>Правила расчётов и распределения денег.</p>
      </section>


      <section>
        <h2>Payout Method</h2>
        <p>Методы выплат.</p>
      </section>


      <section>
        <h2>Contract History</h2>
        <p>История изменений контрактов.</p>
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
  );
}