import React, { useEffect, useState } from "react";

export default function SalonFinancePage() {

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const salonSlug = "totem-demo-salon";

  useEffect(() => {
    loadPayments();
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

    </div>
  );
}