import { useEffect, useState } from "react"

import PageSection from "../../cabinet/PageSection"
import EmptyState from "../../cabinet/EmptyState"

export default function SalonTransactionsPage() {

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    let cancelled = false

    async function loadTransactions() {

      const path = window.location.pathname

      const parts = path.split("/")
      const slug = parts[2]

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

        console.log("PAYMENTS API ERROR", err)

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

  }, [])

  if (loading) {
    return (
      <PageSection title="Транзакции салона">
        <div>Загрузка транзакций...</div>
      </PageSection>
    )
  }

  if (transactions.length === 0) {
    return (
      <PageSection title="Транзакции салона">
        <EmptyState
          title="Транзакции отсутствуют"
          text="Транзакции салона пока отсутствуют"
        />
      </PageSection>
    )
  }

  return (

    <PageSection title="Транзакции салона">

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
              <td>{tx.provider || "-"}</td>
              <td>{tx.status || "-"}</td>
            </tr>

          ))}

        </tbody>
      </table>

    </PageSection>

  )
}