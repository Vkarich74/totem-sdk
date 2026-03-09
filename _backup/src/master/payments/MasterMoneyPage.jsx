import { useEffect, useState } from "react"
import { useMaster } from "../MasterContext"

const API_BASE = "https://api.totemv.com"

function money(n){
  return new Intl.NumberFormat("ru-RU").format(n || 0) + " сом"
}

function Card({title,value}){

  return(
    <div style={{
      border:"1px solid #eee",
      borderRadius:"10px",
      padding:"12px",
      background:"#fff"
    }}>

      <div style={{color:"#666"}}>{title}</div>

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

  if(!metrics) return <div>Загрузка...</div>

  return(

    <div>

      <h3>Доход</h3>

      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:"10px",
        marginBottom:"16px"
      }}>

        <Card
          title="Баланс кошелька"
          value={loading ? "..." : money(wallet)}
        />

        <Card
          title="Доход сегодня"
          value={money(metrics.revenue_today)}
        />

        <Card
          title="Доход месяц"
          value={money(metrics.revenue_month)}
        />

        <Card
          title="Записи сегодня"
          value={metrics.bookings_today || 0}
        />

        <Card
          title="Записи неделя"
          value={metrics.bookings_week || 0}
        />

        <Card
          title="Клиенты"
          value={metrics.clients_total || 0}
        />

      </div>

    </div>

  )

}