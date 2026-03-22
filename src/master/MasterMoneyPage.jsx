import { useMemo, useEffect, useState } from "react"
import { useMaster } from "./MasterContext"

const API = "https://api.totemv.com"

function normalizeStatus(s){

if(!s) return "reserved"

s=s.toLowerCase()

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

return new Intl.NumberFormat("ru-RU").format(n||0)+" сом"

}

function time(iso){

const d=new Date(iso)

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

const {metrics,bookings,master}=useMaster()

const [wallet,setWallet]=useState(null)

const masterName=master?.name
const slug=master?.slug

useEffect(()=>{

if(!slug) return

async function loadWallet(){

try{

const r=await fetch(API+"/internal/masters/"+slug+"/wallet-balance")
const j=await r.json()

if(j?.ok){
setWallet(j.balance||0)
}

}catch(e){
console.error("WALLET_LOAD_FAILED",e)
}

}

loadWallet()

},[slug])

const recent=useMemo(()=>{

if(!bookings)return[]

return bookings
.filter(b=>b.master_name===masterName)
.sort((a,b)=>new Date(b.start_at)-new Date(a.start_at))
.slice(0,10)

},[bookings,masterName])

if(!metrics)return <div>Загрузка...</div>

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
value={wallet===null ? "..." : money(wallet)}
/>

<Card
title="Записи сегодня"
value={metrics.bookings_today||0}
/>

<Card
title="Записи неделя"
value={metrics.bookings_week||0}
/>

<Card
title="Клиенты"
value={metrics.clients_total||0}
/>

</div>

<div style={{
border:"1px solid #eee",
borderRadius:"10px",
padding:"12px"
}}>

<b>Последние записи</b>

<div style={{marginTop:"10px"}}>

{recent.map(b=>(

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