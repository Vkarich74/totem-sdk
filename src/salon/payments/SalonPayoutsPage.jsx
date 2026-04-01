import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { resolveSalonSlug } from "../SalonContext"

import PageSection from "../../cabinet/PageSection"
import EmptyState from "../../cabinet/EmptyState"

const API_BASE = import.meta.env.VITE_API_BASE

export default function SalonPayoutsPage() {

  const params = useParams()

  const slug = resolveSalonSlug(params.slug)

  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    let cancelled = false

    async function loadPayouts() {

      if (!slug) {
        if (!cancelled) {
          setPayouts([])
          setLoading(false)
        }
        return
      }

      try {

        const res = await fetch(
          `${API_BASE}/internal/salons/${slug}/payouts`
        )

        if (!res.ok) {
          if (!cancelled) {
            setPayouts([])
            setLoading(false)
          }
          return
        }

        const data = await res.json()

        if (!cancelled) {

          if (data && data.ok && Array.isArray(data.payouts)) {
            setPayouts(data.payouts)
          } else {
            setPayouts([])
          }

          setLoading(false)
        }

      } catch (err) {

        console.log("PAYOUTS API NOT AVAILABLE")

        if (!cancelled) {
          setPayouts([])
          setLoading(false)
        }

      }

    }

    loadPayouts()

    return () => {
      cancelled = true
    }

  }, [slug])

  if (loading) {
    return (
      <PageSection title="Выплаты салона">
        <div>Загрузка выплат...</div>
      </PageSection>
    )
  }

  if (payouts.length === 0) {
    return (
      <PageSection title="Выплаты салона">
        <EmptyState
          title="Выплаты отсутствуют"
          text="Выплаты салона пока отсутствуют"
        />
      </PageSection>
    )
  }

  return (
    <PageSection title="Выплаты салона">

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">ID</th>
            <th align="left">Дата</th>
            <th align="left">Сумма</th>
            <th align="left">Статус</th>
          </tr>
        </thead>

        <tbody>

          {payouts.map((p) => (

            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.created_at || "-"}</td>
              <td>{p.amount || 0}</td>
              <td>{p.status || "-"}</td>
            </tr>

          ))}

        </tbody>

      </table>

    </PageSection>
  )
}