import { useMemo, useEffect, useState } from "react"
import { useMaster } from "./MasterContext"

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com"

function normalizeStatus(s){
  if(!s) return "reserved"

  s=String(s).toLowerCase()

  if(s==="canceled") return "cancelled"

  return s
}

function statusColor(s){
  s=normalizeStatus(s)

  if(s==="reserved") return "#ffe082"
  if(s==="confirmed") return "#90caf9"
  if(s==="completed") return "#a5d6a7"
  if(s==="cancelled") return "#ef9a9a"

  return "#eee"
}

function money(n){
  return new Intl.NumberFormat("ru-RU").format(Number(n)||0)+" сом"
}

function time(iso){
  if(!iso) return "—"

  const d=new Date(iso)

  if(Number.isNaN(d.getTime())) return "—"

  return d.toLocaleDateString("ru-RU")+" "+
  d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})
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

  const {
    metrics,
    bookings=[],
    master,
    slug: contextSlug,
    loading,
    error,
    empty
  } = useMaster()

  const [wallet,setWallet]=useState(null)
  const [walletLoading,setWalletLoading]=useState(true)
  const [walletError,setWalletError]=useState("")

  const masterName=master?.name || ""
  const slug=master?.slug || contextSlug || null

  useEffect(()=>{

    let cancelled=false

    async function loadWallet(){

      if(!slug){
        if(!cancelled){
          setWallet(null)
          setWalletLoading(false)
          setWalletError("Не найден master slug")
        }
        return
      }

      try{
        setWalletLoading(true)
        setWalletError("")

        const r=await fetch(API_BASE+"/internal/masters/"+encodeURIComponent(slug)+"/wallet-balance")

        if(!r.ok){
          throw new Error("WALLET_FETCH_FAILED")
        }

        const j=await r.json()

        if(cancelled){
          return
        }

        if(j?.ok || typeof j?.balance !== "undefined"){
          setWallet(Number(j.balance)||0)
        }else{
          setWallet(null)
          setWalletError("Баланс недоступен")
        }

      }catch(e){
        console.error("WALLET_LOAD_FAILED",e)

        if(!cancelled){
          setWallet(null)
          setWalletError("Не удалось загрузить баланс")
        }
      }finally{
        if(!cancelled){
          setWalletLoading(false)
        }
      }

    }

    loadWallet()

    return()=>{
      cancelled=true
    }

  },[slug])

  const recent=useMemo(()=>{

    if(!Array.isArray(bookings)) return []

    return [...bookings]
      .sort((a,b)=>new Date(b.start_at)-new Date(a.start_at))
      .slice(0,10)

  },[bookings])

  if(loading){
    return <div>Загрузка...</div>
  }

  if(error){
    return (
      <div style={{
        border:"1px solid #f5c2c7",
        background:"#fff5f5",
        color:"#b42318",
        borderRadius:"10px",
        padding:"12px"
      }}>
        Ошибка загрузки данных
      </div>
    )
  }

  if(!metrics && empty){
    return (
      <div style={{
        border:"1px solid #eee",
        borderRadius:"10px",
        padding:"12px",
        background:"#fff"
      }}>
        Нет данных
      </div>
    )
  }

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
          title="Баланс"
          value={
            walletLoading
              ? "..."
              : walletError
                ? "—"
                : money(wallet)
          }
        />

        <Card
          title="Записи сегодня"
          value={metrics?.bookings_today||0}
        />

        <Card
          title="Записи неделя"
          value={metrics?.bookings_week||0}
        />

        <Card
          title="Клиенты"
          value={metrics?.clients_total||0}
        />

      </div>

      {walletError && (
        <div style={{
          color:"#b42318",
          fontSize:"13px",
          marginBottom:"12px"
        }}>
          {walletError}
        </div>
      )}

      <div style={{
        border:"1px solid #eee",
        borderRadius:"10px",
        padding:"12px"
      }}>

        <b>Последние записи{masterName ? ` — ${masterName}` : ""}</b>

        <div style={{marginTop:"10px"}}>

          {recent.length===0 ? (
            <div style={{color:"#666"}}>Записей пока нет</div>
          ) : recent.map(b=>(

            <div
              key={b.id}
              style={{
                border:"1px solid #eee",
                borderRadius:"8px",
                padding:"8px",
                marginBottom:"6px",
                background:statusColor(b.status)
              }}
            >

              <div>
                <b>#{b.id}</b>
                {" "}
                {time(b.start_at)}
              </div>

              <div>
                {b.client_name||"клиент"}
                {" "}
                {b.phone||""}
              </div>

              <div style={{fontSize:"12px"}}>
                {normalizeStatus(b.status)}
              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  )

}