import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import PageSection from "../../cabinet/PageSection"

const API_BASE = import.meta.env.VITE_API_BASE

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
          fetch(`${API_BASE}/internal/salons/${slug}/metrics`),
          fetch(`${API_BASE}/internal/salons/${slug}/wallet-balance`)
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

        if (!cancelled) setLoading(false)

      }

    }

    loadMoney()

    return () => {
      cancelled = true
    }

  }, [slug])


  if (loading) {
    return (
      <PageSection title="Финансы салона">
        <div style={{padding:"20px"}}>Загрузка финансов...</div>
      </PageSection>
    )
  }

  const walletBalance = wallet?.computed_balance_cents || 0
  const revenueToday = metrics?.revenue_today || 0
  const revenueMonth = metrics?.revenue_month || 0
  const paymentsTotal = metrics?.payments_total || 0

  return (

    <PageSection title="Финансы салона">

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(4,1fr)",
        gap:"16px",
        marginTop:"20px"
      }}>

        <Card
          title="Баланс кошелька"
          value={walletBalance}
          color="#10b981"
        />

        <Card
          title="Выручка сегодня"
          value={revenueToday}
          color="#3b82f6"
        />

        <Card
          title="Выручка за месяц"
          value={revenueMonth}
          color="#3b82f6"
        />

        <Card
          title="Всего платежей"
          value={paymentsTotal}
          color="#8b5cf6"
        />

      </div>

    </PageSection>

  )

}

function Card({title,value,color}){

return(

<div style={{
border:"1px solid #e5e7eb",
borderLeft:`6px solid ${color}`,
borderRadius:"8px",
padding:"16px",
background:"#fff"
}}>

<div style={{
fontSize:"13px",
color:"#6b7280"
}}>
{title}
</div>

<div style={{
fontSize:"26px",
fontWeight:"bold",
marginTop:"6px"
}}>
{value}
</div>

</div>

)

}