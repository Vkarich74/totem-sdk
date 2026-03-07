import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

export default function SalonTransactionsPage() {
  const { slug } = useParams()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/internal/salons/${slug}/payments`)

        if (!res.ok) {
          throw new Error("API_ERROR")
        }

        const data = await res.json()

        if (data && data.ok && Array.isArray(data.payments)) {
          setTransactions(data.payments)
        } else {
          setTransactions([])
        }
      } catch (err) {
        console.error("SalonTransactionsPage error:", err)
        setError("Ошибка загрузки транзакций")
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      loadTransactions()
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

  if (error) {
    return (
      <div>
        <h1>Транзакции салона</h1>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Транзакции салона</h1>

      {transactions.length === 0 ? (
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