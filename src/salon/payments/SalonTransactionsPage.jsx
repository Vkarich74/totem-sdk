import { useEffect, useState } from "react"

import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
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

  const rows = transactions.map(tx => ({
    id: tx.id,
    date: tx.created_at || "-",
    amount: tx.amount || 0,
    provider: tx.provider || "-",
    status: tx.status || "-"
  }))

  return (

    <PageSection title="Транзакции салона">

      <TableSection
        columns={[
          { key: "id", label: "ID" },
          { key: "date", label: "Дата" },
          { key: "amount", label: "Сумма" },
          { key: "provider", label: "Метод" },
          { key: "status", label: "Статус" }
        ]}
        rows={rows}
      />

    </PageSection>

  )
}