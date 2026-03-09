const fs = require("fs")
const path = require("path")

const ROOT = process.cwd()

function write(file,content){

const full = path.join(ROOT,file)

const dir = path.dirname(full)

if(!fs.existsSync(dir)){
fs.mkdirSync(dir,{recursive:true})
}

if(fs.existsSync(full)){
fs.copyFileSync(full,full+".bak")
console.log("backup:",file)
}

fs.writeFileSync(full,content)
console.log("created:",file)

}

const masterApi = `
const API="https://api.totemv.com"

export async function getMasterMetrics(slug){

const r=await fetch(API+"/internal/masters/"+slug+"/metrics")
return r.json()

}

export async function getMasterBookings(slug){

const r=await fetch(API+"/internal/salons/"+window.SALON_SLUG+"/bookings")
const j=await r.json()

return j.bookings.filter(b=>b.master_name===window.MASTER_NAME||true)

}

export async function getMasterClients(slug){

const r=await fetch(API+"/internal/salons/"+window.SALON_SLUG+"/clients")
return r.json()

}
`

const masterContext = `
import {createContext,useContext,useEffect,useState} from "react"
import {getMasterMetrics,getMasterBookings,getMasterClients} from "../api/master"

const C=createContext()

export function MasterProvider({children}){

const slug=window.MASTER_SLUG

const [metrics,setMetrics]=useState(null)
const [bookings,setBookings]=useState([])
const [clients,setClients]=useState([])
const [loading,setLoading]=useState(true)

async function load(){

const m=await getMasterMetrics(slug)
setMetrics(m.metrics||m)

const b=await getMasterBookings(slug)
setBookings(b)

const c=await getMasterClients(slug)
setClients(c.clients||[])

setLoading(false)

}

useEffect(()=>{load()},[])

return(

<C.Provider value={{
metrics,
bookings,
clients,
loading,
reload:load
}}>

{children}

</C.Provider>

)

}

export function useMaster(){
return useContext(C)
}
`

const bookingsPage = `
import {useMaster} from "./MasterContext"

function statusColor(s){

if(s==="completed")return "#27ae60"
if(s==="confirmed")return "#2980b9"
if(s==="reserved")return "#f39c12"
return "#e74c3c"

}

export default function MasterBookingsPage(){

const {bookings,loading}=useMaster()

if(loading)return <div>Загрузка...</div>

return(

<div>

<h3>Записи</h3>

{bookings.map(b=>(

<div key={b.id} style={{
border:"1px solid #ddd",
padding:"12px",
borderRadius:"10px",
marginBottom:"10px"
}}>

<div style={{fontWeight:700}}>BR-{b.id}</div>

<div style={{color:statusColor(b.status)}}>{b.status}</div>

<div>{new Date(b.start_at).toLocaleString("ru-RU")}</div>

<div>Клиент: {b.client_name||"—"}</div>

<div>Телефон: {b.phone||"—"}</div>

</div>

))}

</div>

)

}
`

const clientsPage = `
import {useMaster} from "./MasterContext"

export default function MasterClientsPage(){

const {clients,loading}=useMaster()

if(loading)return <div>Загрузка...</div>

return(

<div>

<h3>Клиенты</h3>

{clients.map(c=>(

<div key={c.id} style={{
border:"1px solid #ddd",
padding:"12px",
borderRadius:"10px",
marginBottom:"10px"
}}>

<div style={{fontWeight:700}}>{c.name}</div>

<div>Телефон: {c.phone}</div>

<div>Визитов: {c.visits}</div>

</div>

))}

</div>

)

}
`

const schedulePage = `
import {useMaster} from "./MasterContext"

function slots(){

const s=[]

let h=7
let m=0

for(let i=0;i<56;i++){

s.push((h<10?"0"+h:h)+":"+(m<10?"0"+m:m))

m+=15

if(m>=60){
h++
m=0
}

}

return s

}

export default function MasterSchedulePage(){

const {bookings}=useMaster()

const s=slots()

return(

<div>

<h3>Расписание</h3>

{s.map(t=>{

const b=bookings.find(x=>new Date(x.start_at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})===t)

return(

<div key={t} style={{
border:"1px solid #ddd",
padding:"10px",
marginBottom:"6px",
borderRadius:"8px"
}}>

<b>{t}</b>

{b?

<span style={{marginLeft:"10px"}}>
{b.client_name||"клиент"}
</span>

:

<span style={{marginLeft:"10px",color:"#aaa"}}>
свободно
</span>

}

</div>

)

})}

</div>

)

}
`

const moneyPage = `
import {useMaster} from "./MasterContext"

function money(n){
return new Intl.NumberFormat("ru-RU").format(n)+" сом"
}

export default function MasterMoneyPage(){

const {metrics}=useMaster()

if(!metrics)return <div>Загрузка...</div>

return(

<div>

<h3>Доход</h3>

<div>Сегодня: {money(metrics.revenue_today||0)}</div>

<div>Месяц: {money(metrics.revenue_month||0)}</div>

</div>

)

}
`

const settingsPage = `
import {useMaster} from "./MasterContext"

export default function MasterSettingsPage(){

const {reload}=useMaster()

return(

<div>

<h3>Настройки</h3>

<div>Slug: {window.MASTER_SLUG}</div>

<button onClick={reload}>Обновить</button>

</div>

)

}
`

write("src/api/master.js",masterApi)
write("src/master/MasterContext.jsx",masterContext)
write("src/master/MasterBookingsPage.jsx",bookingsPage)
write("src/master/MasterClientsPage.jsx",clientsPage)
write("src/master/MasterSchedulePage.jsx",schedulePage)
write("src/master/MasterMoneyPage.jsx",moneyPage)
write("src/master/MasterSettingsPage.jsx",settingsPage)

console.log("MASTER CRM READY")