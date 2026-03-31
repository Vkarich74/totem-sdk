import { useMemo, useEffect, useState } from "react"
import { useMaster } from "../MasterContext"

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

function dateOnly(iso){
  if(!iso) return "—"

  const d=new Date(iso)

  if(Number.isNaN(d.getTime())) return "—"

  return d.toLocaleDateString("ru-RU")
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

function Section({title,children}){
  return(
    <div style={{
      border:"1px solid #eee",
      borderRadius:"10px",
      padding:"12px",
      background:"#fff",
      marginTop:"16px"
    }}>
      <div style={{
        fontWeight:"bold",
        marginBottom:"10px"
      }}>
        {title}
      </div>

      {children}
    </div>
  )
}

function Row({label,value,error}){
  return(
    <div style={{
      display:"flex",
      justifyContent:"space-between",
      gap:"12px",
      padding:"8px 0",
      borderBottom:"1px solid #f3f4f6",
      color:error ? "#b42318" : "#111827",
      fontSize:"14px"
    }}>
      <div style={{color:"#666"}}>{label}</div>
      <div style={{
        textAlign:"right",
        whiteSpace:"pre-wrap",
        wordBreak:"break-word"
      }}>
        {value}
      </div>
    </div>
  )
}

function safeJsonParse(text){
  try{
    return JSON.parse(text)
  }catch{
    return null
  }
}

function shortText(value){
  if(value == null || value === "") return "—"
  const text=String(value)
  if(text.length<=180) return text
  return text.slice(0,180)+"..."
}

function normalizeWallet(payload){
  if(!payload) return null
  if(payload.wallet) return payload.wallet
  if(payload.data?.wallet) return payload.data.wallet
  if(typeof payload.balance !== "undefined") return payload
  if(typeof payload.data?.balance !== "undefined") return payload.data
  return payload
}

function normalizeMasterRoot(payload){
  if(!payload) return null
  if(payload.master || payload.billing_access) return payload
  if(payload.data?.master || payload.data?.billing_access) return payload.data
  return payload
}

function normalizeSettlements(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.settlements)) return payload.settlements
  if(Array.isArray(payload?.items)) return payload.items
  if(Array.isArray(payload?.data?.settlements)) return payload.data.settlements
  return []
}

function getBillingAccess(payload){
  if(!payload) return null
  if(payload.billing_access) return payload.billing_access
  if(payload.data?.billing_access) return payload.data.billing_access
  return null
}

function accessLabel(value, fallback = "—"){
  if(value === true) return "Разрешено"
  if(value === false) return "Ограничено"
  return fallback
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

  const masterName=master?.name || ""
  const slug=master?.slug || contextSlug || null

  const [wallet,setWallet]=useState(null)
  const [walletLoading,setWalletLoading]=useState(true)
  const [walletError,setWalletError]=useState("")
  const [walletHttpStatus,setWalletHttpStatus]=useState("")
  const [walletRawType,setWalletRawType]=useState("")
  const [walletRawPreview,setWalletRawPreview]=useState("")

  const [masterRoot,setMasterRoot]=useState(null)
  const [masterRootLoading,setMasterRootLoading]=useState(true)
  const [masterRootError,setMasterRootError]=useState("")
  const [masterRootHttpStatus,setMasterRootHttpStatus]=useState("")
  const [masterRootRawType,setMasterRootRawType]=useState("")
  const [masterRootRawPreview,setMasterRootRawPreview]=useState("")

  const [settlements,setSettlements]=useState([])
  const [settlementsLoading,setSettlementsLoading]=useState(true)
  const [settlementsError,setSettlementsError]=useState("")
  const [settlementsHttpStatus,setSettlementsHttpStatus]=useState("")
  const [settlementsRawType,setSettlementsRawType]=useState("")
  const [settlementsRawPreview,setSettlementsRawPreview]=useState("")

  useEffect(()=>{

    let cancelled=false

    async function loadWallet(){

      if(!slug){
        if(!cancelled){
          setWallet(null)
          setWalletLoading(false)
          setWalletError("Не найден master slug")
          setWalletHttpStatus("")
          setWalletRawType("")
          setWalletRawPreview("")
        }
        return
      }

      try{
        setWalletLoading(true)
        setWalletError("")
        setWalletHttpStatus("")
        setWalletRawType("")
        setWalletRawPreview("")

        const r=await fetch(API_BASE+"/internal/masters/"+encodeURIComponent(slug)+"/wallet-balance")
        const text=await r.text()

        if(cancelled) return

        setWalletHttpStatus(String(r.status))

        const data=safeJsonParse(text)

        if(!data){
          setWalletRawType("text/html")
          setWalletRawPreview(shortText(text))
          throw new Error("WALLET_NOT_JSON")
        }

        setWalletRawType("json")
        setWalletRawPreview(shortText(JSON.stringify(data,null,2)))

        if(!r.ok){
          throw new Error("WALLET_HTTP_"+r.status)
        }

        const normalized=normalizeWallet(data)

        if(typeof normalized?.balance !== "undefined"){
          setWallet(Number(normalized.balance)||0)
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

  useEffect(()=>{

    let cancelled=false

    async function loadMasterRoot(){

      if(!slug){
        if(!cancelled){
          setMasterRoot(null)
          setMasterRootLoading(false)
          setMasterRootError("Не найден master slug")
          setMasterRootHttpStatus("")
          setMasterRootRawType("")
          setMasterRootRawPreview("")
        }
        return
      }

      try{
        setMasterRootLoading(true)
        setMasterRootError("")
        setMasterRootHttpStatus("")
        setMasterRootRawType("")
        setMasterRootRawPreview("")

        const r=await fetch(API_BASE+"/internal/masters/"+encodeURIComponent(slug))
        const text=await r.text()

        if(cancelled) return

        setMasterRootHttpStatus(String(r.status))

        const data=safeJsonParse(text)

        if(!data){
          setMasterRootRawType("text/html")
          setMasterRootRawPreview(shortText(text))
          throw new Error("MASTER_ROOT_NOT_JSON")
        }

        setMasterRootRawType("json")
        setMasterRootRawPreview(shortText(JSON.stringify(data,null,2)))

        if(!r.ok){
          throw new Error("MASTER_ROOT_HTTP_"+r.status)
        }

        setMasterRoot(normalizeMasterRoot(data))

      }catch(e){
        console.error("MASTER_ROOT_LOAD_FAILED",e)

        if(!cancelled){
          setMasterRoot(null)
          setMasterRootError("Не удалось загрузить master root")
        }
      }finally{
        if(!cancelled){
          setMasterRootLoading(false)
        }
      }

    }

    loadMasterRoot()

    return()=>{
      cancelled=true
    }

  },[slug])

  useEffect(()=>{

    let cancelled=false

    async function loadSettlements(){

      if(!slug){
        if(!cancelled){
          setSettlements([])
          setSettlementsLoading(false)
          setSettlementsError("Не найден master slug")
          setSettlementsHttpStatus("")
          setSettlementsRawType("")
          setSettlementsRawPreview("")
        }
        return
      }

      try{
        setSettlementsLoading(true)
        setSettlementsError("")
        setSettlementsHttpStatus("")
        setSettlementsRawType("")
        setSettlementsRawPreview("")

        const r=await fetch(API_BASE+"/internal/masters/"+encodeURIComponent(slug)+"/settlements")
        const text=await r.text()

        if(cancelled) return

        setSettlementsHttpStatus(String(r.status))

        const data=safeJsonParse(text)

        if(!data){
          setSettlementsRawType("text/html")
          setSettlementsRawPreview(shortText(text))
          throw new Error("SETTLEMENTS_NOT_JSON")
        }

        setSettlementsRawType("json")
        setSettlementsRawPreview(shortText(JSON.stringify(data,null,2)))

        if(!r.ok){
          throw new Error("SETTLEMENTS_HTTP_"+r.status)
        }

        setSettlements(normalizeSettlements(data))

      }catch(e){
        console.error("SETTLEMENTS_LOAD_FAILED",e)

        if(!cancelled){
          setSettlements([])
          setSettlementsError("Не удалось загрузить settlements")
        }
      }finally{
        if(!cancelled){
          setSettlementsLoading(false)
        }
      }

    }

    loadSettlements()

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

  const billingAccess=useMemo(()=>{
    return getBillingAccess(masterRoot)
  },[masterRoot])

  const settlementsCount=settlements.length

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

      <Section title="Wallet">
        <Row label="Slug" value={slug || "—"} />
        <Row label="HTTP status" value={walletHttpStatus || "—"} error={Boolean(walletError)} />
        <Row label="Raw type" value={walletRawType || "—"} />
        <Row label="Баланс" value={walletError ? "—" : money(wallet)} error={Boolean(walletError)} />
        <Row label="Ошибка" value={walletError || "—"} error={Boolean(walletError)} />
        <div style={{paddingTop:"8px"}}>
          <div style={{fontSize:"12px",color:"#666",marginBottom:"6px"}}>Raw preview</div>
          <pre style={{
            margin:0,
            whiteSpace:"pre-wrap",
            wordBreak:"break-word",
            fontSize:"12px",
            color:"#111827",
            background:"#f8fafc",
            border:"1px solid #eef2f7",
            borderRadius:"8px",
            padding:"10px"
          }}>
            {walletRawPreview || "—"}
          </pre>
        </div>
      </Section>

      <Section title="Billing access">
        <Row label="HTTP status" value={masterRootHttpStatus || "—"} error={Boolean(masterRootError)} />
        <Row label="Raw type" value={masterRootRawType || "—"} />
        <Row label="Access state" value={billingAccess?.access_state || "—"} />
        <Row label="Subscription status" value={billingAccess?.subscription_status || "—"} />
        <Row label="Write access" value={accessLabel(billingAccess?.can_write)} />
        <Row label="Withdraw access" value={accessLabel(billingAccess?.can_withdraw)} />
        <Row label="Exists" value={typeof billingAccess?.exists === "boolean" ? String(billingAccess.exists) : "—"} />
        <Row label="Ошибка" value={masterRootError || "—"} error={Boolean(masterRootError)} />
        <div style={{paddingTop:"8px"}}>
          <div style={{fontSize:"12px",color:"#666",marginBottom:"6px"}}>Raw preview</div>
          <pre style={{
            margin:0,
            whiteSpace:"pre-wrap",
            wordBreak:"break-word",
            fontSize:"12px",
            color:"#111827",
            background:"#f8fafc",
            border:"1px solid #eef2f7",
            borderRadius:"8px",
            padding:"10px"
          }}>
            {masterRootRawPreview || "—"}
          </pre>
        </div>
      </Section>

      <Section title="Settlements">
        <Row label="HTTP status" value={settlementsHttpStatus || "—"} error={Boolean(settlementsError)} />
        <Row label="Raw type" value={settlementsRawType || "—"} />
        <Row label="Количество периодов" value={settlementsCount} />
        <Row label="Ошибка" value={settlementsError || "—"} error={Boolean(settlementsError)} />

        <div style={{paddingTop:"8px"}}>
          {settlementsLoading ? (
            <div style={{fontSize:"13px",color:"#666"}}>Загрузка settlements...</div>
          ) : settlements.length===0 ? (
            <div style={{fontSize:"13px",color:"#666"}}>Расчетных периодов пока нет</div>
          ) : settlements.map((item,index)=>(
            <div
              key={item?.id || index}
              style={{
                border:"1px solid #eef2f7",
                borderRadius:"8px",
                padding:"10px",
                marginBottom:"8px",
                background:"#f8fafc"
              }}
            >
              <div><b>ID:</b> {item?.id || "—"}</div>
              <div><b>Период:</b> {dateOnly(item?.period_start || item?.start_date)} — {dateOnly(item?.period_end || item?.end_date)}</div>
              <div><b>Status:</b> {item?.status || "—"}</div>
            </div>
          ))}
        </div>

        <div style={{paddingTop:"8px"}}>
          <div style={{fontSize:"12px",color:"#666",marginBottom:"6px"}}>Raw preview</div>
          <pre style={{
            margin:0,
            whiteSpace:"pre-wrap",
            wordBreak:"break-word",
            fontSize:"12px",
            color:"#111827",
            background:"#f8fafc",
            border:"1px solid #eef2f7",
            borderRadius:"8px",
            padding:"10px"
          }}>
            {settlementsRawPreview || "—"}
          </pre>
        </div>
      </Section>

      <div style={{
        border:"1px solid #eee",
        borderRadius:"10px",
        padding:"12px",
        marginTop:"16px"
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