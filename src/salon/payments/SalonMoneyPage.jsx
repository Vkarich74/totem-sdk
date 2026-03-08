import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

export default function SalonMoneyPage() {

  const params = useParams()

  let slug = params.slug

  if (!slug) {
    const m = window.location.pathname.match(/salon\/([^/]+)/)
    if (m) slug = m[1]
  }

  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    let cancelled = false

    async function loadMoney() {

      if (!slug) {
        if (!cancelled) {
          setLoading(false)
        }
        return
      }

      try {

        const res = await fetch(
          `https://api.totemv.com/internal/salons/${slug}/metrics`
        )

        if (!res.ok) {
          if (!cancelled) setLoading(false)
          return
        }

        const data = await res.json()

        if (!cancelled) {

          if (data && data.ok) {
            setMetrics(data.metrics)
          }

          setLoading(false)
        }

      } catch (err) {

        console.log("SALON MONEY API ERROR")

        if (!cancelled) {
          setLoading(false)
        }

      }

    }

    loadMoney()

    return () => {
      cancelled = true
    }

  }, [slug])

  if (loading) {
    return (
      <div>
        <h1>Финансы салона</h1>
        <p>Загрузка финансов...</p>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div>
        <h1>Финансы салона</h1>
        <p>Данные финансов пока отсутствуют</p>
      </div>
    )
  }

  return (
    <div>

      <h1>Финансы салона</h1>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>

          <tr>
            <td><b>Выручка сегодня</b></td>
            <td>{metrics.revenue_today || 0}</td>
          </tr>

          <tr>
            <td><b>Выручка за месяц</b></td>
            <td>{metrics.revenue_month || 0}</td>
          </tr>

          <tr>
            <td><b>Всего платежей</b></td>
            <td>{metrics.payments_total || 0}</td>
          </tr>

        </tbody>
      </table>

    </div>
  )
}