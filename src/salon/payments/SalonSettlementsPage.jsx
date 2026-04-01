import { useEffect, useState } from "react"

import PageSection from "../../cabinet/PageSection"
import EmptyState from "../../cabinet/EmptyState"
import { useSalonSlug } from "../SalonContext"

const API_BASE = import.meta.env.VITE_API_BASE

export default function SalonSettlementsPage() {
  const slug = useSalonSlug()
  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadSettlements() {
      if (!slug) {
        if (!cancelled) {
          setSettlements([])
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLoading(true)
      }

      try {
        const response = await fetch(`${API_BASE}/internal/salons/${slug}/settlements`)

        if (!response.ok) {
          if (!cancelled) {
            setSettlements([])
            setLoading(false)
          }
          return
        }

        const data = await response.json()

        if (!cancelled) {
          if (data && data.ok && Array.isArray(data.settlements)) {
            setSettlements(data.settlements)
          } else {
            setSettlements([])
          }

          setLoading(false)
        }
      } catch (e) {
        console.log("SETTLEMENTS API NOT AVAILABLE")

        if (!cancelled) {
          setSettlements([])
          setLoading(false)
        }
      }
    }

    loadSettlements()

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <PageSection title="Расчёты салона">
        <div>Загрузка расчётов...</div>
      </PageSection>
    )
  }

  if (!slug) {
    return (
      <PageSection title="Расчёты салона">
        <EmptyState title="Slug не найден" text="Проверь маршрут salon cabinet" />
      </PageSection>
    )
  }

  if (!settlements.length) {
    return (
      <PageSection title="Расчёты салона">
        <EmptyState title="Расчёты отсутствуют" text="Расчёты салона пока отсутствуют" />
      </PageSection>
    )
  }

  return (
    <PageSection title="Расчёты салона">
      {settlements.map((s) => (
        <div
          key={s.id}
          style={{
            border: "1px solid #ddd",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "6px"
          }}
        >
          <div><strong>ID:</strong> {s.id}</div>
          <div><strong>Период:</strong> {s.period_start} — {s.period_end}</div>
          <div><strong>Сумма:</strong> {s.amount}</div>
          <div><strong>Статус:</strong> {s.status}</div>
        </div>
      ))}
    </PageSection>
  )
}
