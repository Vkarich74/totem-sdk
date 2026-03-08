import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

export default function SalonTransactionsPage() {
  const { slug } = useParams()

  const [transactions, setTransactions] = useState([])
  const [apiChecked, setApiChecked] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadTransactions() {
      if (!slug) {
        if (!cancelled) {
          setTransactions([])
          setApiChecked(true)
        }
        return
      }

      try {
        const res = await fetch(
          `https://api.totemv.com/internal/salons/${slug}/payments`
        )

        if (!res.ok) {
          if (!cancelled) {
            setTransactions([])
            setApiChecked(true)
          }
          return
        }

        const data = await res.json()

        if (!cancelled) {
          if (data && data.ok && Array.isArray(data.payments)) {
            setTransactions(data.payments)
          } else {
            setTransactions([])
          }
          setApiChecked(true)
        }
      } catch (err) {
        if (!cancelled) {
          setTransactions([])
          setApiChecked(true)
        }
      }
    }

    loadTransactions()

    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <div>
      <h1>Транзакции салона</h1>

      {!apiChecked ? (
        <p>Транзакции пока отсутствуют</p>
      ) : transactions.length === 0 ? (
        <p>Транзакции пока отсутствуют</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Дата</th>
              <th align="left">Сумма</th>
              <th align="left">Метод</th>
              <th align="left">Статус</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.id}</td>
                <td>{tx.created_at || "-"}</td>
                <td>{tx.amount || 0}</td>
                <td>{tx.method || "-"}</td>
                <td>{tx.status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}