import { useEffect, useState } from "react"
import { useMaster } from "../MasterContext"

import PageSection from "../../cabinet/PageSection"
import StatGrid from "../../cabinet/StatGrid"

const API_BASE = import.meta.env.VITE_API_BASE

function money(n){
  return new Intl.NumberFormat("ru-RU").format(n || 0) + " сом"
}

function Card({title,value,color}){

  return(
    <div style={{
      border:"1px solid #eee",
      borderLeft: color ? `6px solid ${color}` : "1px solid #eee",
      borderRadius:"10px",
      padding:"12px",
      background:"#fff"
    }}>

      <div style={{color:"#666"}}>
        {title}
      </div>

      <div style={{
        fontSize:"20px",
        fontWeight:"bold",
        marginTop:"6px"
      }}>
        {value}
      </div>

    </div>
  )

}

export default function MasterMoneyPage(){

  const {metrics, master} = useMaster()

  const [wallet,setWallet] = useState(null)
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    if(!master?.slug) return

    async function loadWallet(){

      try{

        const res = await fetch(
          `${API_BASE}/masters/${master.slug}/wallet-balance`
        )

        const data = await res.json()

        if(data?.ok){
          setWallet(data.balance || 0)
        }

      }catch(e){

        console.error("WALLET_LOAD_FAILED",e)

      }finally{
        setLoading(false)
      }

    }

    loadWallet()

  },[master])

  if(!metrics){
    return <div>Загрузка...</div>
  }

  return(

    <PageSection title="Доход">

      <StatGrid>

        <Card
          title="Баланс кошелька"
          value={loading ? "..." : money(wallet)}
          color="#10b981"
        />

        <Card
          title="Доход сегодня"
          value={money(metrics.revenue_today)}
          color="#3b82f6"
        />

        <Card
          title="Доход месяц"
          value={money(metrics.revenue_month)}
          color="#3b82f6"
        />

        <Card
          title="Записи сегодня"
          value={metrics.bookings_today || 0}
          color="#8b5cf6"
        />

        <Card
          title="Записи неделя"
          value={metrics.bookings_week || 0}
          color="#8b5cf6"
        />

        <Card
          title="Клиенты"
          value={metrics.clients_total || 0}
          color="#f59e0b"
        />

      </StatGrid>

    </PageSection>

  )

}