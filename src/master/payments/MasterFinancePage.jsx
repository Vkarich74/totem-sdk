import React, { useEffect, useState } from "react";

import {
  fetchActiveContract,
  fetchContractHistory
} from "../../core/contracts/contractApi";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

export default function MasterFinancePage() {

  const [activeContract, setActiveContract] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const masterId = "current";

  useEffect(() => {

    async function loadFinance() {

      try {

        const active = await fetchActiveContract(masterId);
        const hist = await fetchContractHistory(masterId);

        setActiveContract(active || null);
        setHistory(hist || []);

      } catch (err) {

        console.error("Finance load error:", err);
        setError("Ошибка загрузки финансовых данных");

      } finally {

        setLoading(false);

      }
    }

    loadFinance();

  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка финансов...</div>;
  }

  if (error) {
    return <div style={{ padding: 20 }}>{error}</div>;
  }

  return (

    <div style={{ padding: 20 }}>

      <h1>Finance</h1>

      {/* ACTIVE CONTRACT */}

      <section style={{ marginBottom: 30 }}>
        <h2>Contract Summary</h2>

        {activeContract && isContractActive(activeContract) ? (

          <div>

            <p><b>Contract ID:</b> {activeContract.contract_id}</p>
            <p><b>Model:</b> {activeContract.model_type}</p>
            <p><b>Start Date:</b> {activeContract.start_date}</p>

          </div>

        ) : (

          <p>Активный контракт отсутствует</p>

        )}

      </section>

      {/* SETTLEMENT RULES */}

      <section style={{ marginBottom: 30 }}>
        <h2>Settlement Rules</h2>
        <p>Правила распределения дохода определяются активным контрактом.</p>
      </section>

      {/* PAYOUT */}

      <section style={{ marginBottom: 30 }}>
        <h2>Payout Method</h2>
        <p>Метод выплат будет определяться настройками платформы.</p>
      </section>

      {/* HISTORY */}

      <section>

        <h2>Contract History</h2>

        {history.length === 0 ? (
          <p>История контрактов отсутствует</p>
        ) : (

          <ul>

            {history.map((item) => (

              <li key={item.contract_id}>

                {item.contract_id} — {item.status} — {item.start_date}

              </li>

            ))}

          </ul>

        )}

      </section>

    </div>

  );
}