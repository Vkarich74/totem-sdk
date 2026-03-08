import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

export default function SalonTransactionsPage() {
  const { slug } = useParams()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadTransactions() {

      if (!slug) {
        if (!cancelled) {
          setTransactions([])
          setLoading(false)
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
            setLoading(false)
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

          setLoading(false)
        }

      } catch (err) {

        console.log("PAYMENTS API NOT AVAILABLE")

        if (!cancelled) {
          setTransactions([])
          setLoading(false)
        }

      }
    }

    loadTransactions()

    return () => {
      cancelled = true
    }

  }, [slug])

  if (loading) {
    return (
      <div>
        <h1>Транзакции салона</h1>
        <p>Загрузка транзакций...</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div>
        <h1>Транзакции салона</h1>
        <p>Транзакции пока отсутствуют</p>
      </div>
    )
  }

  return (
    <div>

      <h1>Транзакции салона</h1>

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
              <td>{tx.provider || tx.method || "-"}</td>
              <td>{tx.status || "-"}</td>
            </tr>

          ))}

        </tbody>
      </table>

    </div>
  )
}