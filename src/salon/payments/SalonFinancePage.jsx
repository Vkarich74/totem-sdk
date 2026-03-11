import React from "react";

export default function SalonFinancePage() {
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

    </div>
  );
}