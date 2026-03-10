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
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    let cancelled = false

    async function loadMoney() {

      if (!slug) {
        if (!cancelled) setLoading(false)
        return
      }

      try {

        const [metricsRes, walletRes] = await Promise.all([
          fetch(`https://api.totemv.com/internal/salons/${slug}/metrics`),
          fetch(`https://api.totemv.com/internal/salons/${slug}/wallet-balance`)
        ])

        if (!metricsRes.ok || !walletRes.ok) {
          if (!cancelled) setLoading(false)
          return
        }

        const metricsData = await metricsRes.json()
        const walletData = await walletRes.json()

        if (!cancelled) {

          if (metricsData?.ok) {
            setMetrics(metricsData.metrics)
          }

          if (walletData?.ok) {
            setWallet(walletData.balance)
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
      <div style={{ padding: 24 }}>
        <h1>Финансы салона</h1>
        <p>Загрузка финансов...</p>
      </div>
    )
  }


  const walletBalance = wallet?.computed_balance_cents || 0
  const revenueToday = metrics?.revenue_today || 0
  const revenueMonth = metrics?.revenue_month || 0
  const paymentsTotal = metrics?.payments_total || 0


  return (
    <div style={{ padding: 24 }}>

      <h1>Финансы салона</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 16,
          marginTop: 20
        }}
      >

        <StatCard
          title="Баланс кошелька"
          value={walletBalance}
        />

        <StatCard
          title="Выручка сегодня"
          value={revenueToday}
        />

        <StatCard
          title="Выручка за месяц"
          value={revenueMonth}
        />

        <StatCard
          title="Всего платежей"
          value={paymentsTotal}
        />

      </div>

    </div>
  )
}



function StatCard({ title, value }) {

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#fff"
      }}
    >

      <div
        style={{
          fontSize: 13,
          color: "#6b7280",
          marginBottom: 6
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 600
        }}
      >
        {value}
      </div>

    </div>
  )

}