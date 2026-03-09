import { useEffect, useState } from "react";

function getMasterSlug() {

  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG;
  }

  const parts = window.location.pathname.split("/");

  if (parts.length >= 3 && parts[1] === "salon") {
    return parts[2];
  }

  if (parts.length >= 3 && parts[1] === "master") {
    return parts[2];
  }

  return null;
}

function money(cents){

  const n = (Number(cents) || 0) / 100

  return new Intl.NumberFormat("ru-RU").format(n) + " сом"

}

function formatDate(iso){

  const d = new Date(iso)

  return d.toLocaleDateString("ru-RU") + " " +
  d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})

}

export default function MasterPayoutsPage() {

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function loadPayouts() {

      try {

        const slug = getMasterSlug();

        if (!slug) {
          console.error("MASTER_SLUG_NOT_FOUND");
          setLoading(false);
          return;
        }

        const res = await fetch(
          `https://api.totemv.com/internal/masters/${slug}/payouts`
        );

        if (!res.ok) {
          throw new Error("PAYOUTS_FETCH_FAILED");
        }

        const data = await res.json();

        setPayouts(data.payouts || []);

      } catch (e) {

        console.error("Payouts load error", e);

      } finally {

        setLoading(false);

      }

    }

    loadPayouts();

  }, []);

  return (
    <div>

      <h1>Выплаты</h1>

      {loading && <p>Загрузка...</p>}

      {!loading && payouts.length === 0 && (
        <p>Выплат пока нет</p>
      )}

      {!loading && payouts.length > 0 && (

        <table style={{width:"100%", borderCollapse:"collapse"}}>

          <thead>
            <tr>
              <th align="left">Дата</th>
              <th align="left">Сумма</th>
              <th align="left">Статус</th>
              <th align="left">Метод</th>
            </tr>
          </thead>

          <tbody>

            {payouts.map((p) => (

              <tr key={p.id}>

                <td>{formatDate(p.created_at)}</td>

                <td>{money(p.amount_cents || p.amount)}</td>

                <td>{p.status}</td>

                <td>{p.method || "—"}</td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>
  );
}