import { useMemo, useState } from "react"
import { useMaster } from "./MasterContext"

function pad(v){
return v<10?"0"+v:String(v)
}

function toDateKey(d){
return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())
}

function todayKey(){
return toDateKey(new Date())
}

function formatDMY(k){
const [y,m,d]=k.split("-")
return d+"-"+m+"-"+y
}

function addDays(key,delta){
const [y,m,d]=key.split("-").map(Number)
const dt=new Date(y,m-1,d)
dt.setDate(dt.getDate()+delta)
return toDateKey(dt)
}

function buildSlots(){

const slots=[]
let h=7
let m=0

for(let i=0;i<56;i++){

slots.push(pad(h)+":"+pad(m))

m+=15

if(m>=60){
h++
m=0
}

}

return slots

}

function slotKey(date){

const h=date.getHours()
const m=Math.floor(date.getMinutes()/15)*15

return pad(h)+":"+pad(m)

}

function currentSlot(){

const now=new Date()

const h=now.getHours()
const m=Math.floor(now.getMinutes()/15)*15

return pad(h)+":"+pad(m)

}

function normalizeStatus(v){

const s=String(v||"reserved").toLowerCase()

if(s==="canceled")return"cancelled"

return s

}

function statusLabel(s){

s=normalizeStatus(s)

if(s==="reserved")return"ожидает"
if(s==="confirmed")return"подтверждена"
if(s==="completed")return"завершена"
if(s==="cancelled")return"отмена"

return s

}

function statusColor(s){

s=normalizeStatus(s)

if(s==="reserved")return"#fff3cd"
if(s==="confirmed")return"#d0ebff"
if(s==="completed")return"#d3f9d8"
if(s==="cancelled")return"#ffe3e3"

return"#eee"

}

function timeRange(start,end){

const s=new Date(start)

const sh=pad(s.getHours())
const sm=pad(s.getMinutes())

if(!end){
return sh+":"+sm
}

const e=new Date(end)

const eh=pad(e.getHours())
const em=pad(e.getMinutes())

return sh+":"+sm+" – "+eh+":"+em

}

function durationMinutes(start,end){

if(!end)return 30

const s=new Date(start).getTime()
const e=new Date(end).getTime()

return Math.round((e-s)/60000)

}

function serviceLabel(b){

return (
b.service_name ||
b.service ||
b.service_title ||
""
)

}

export default function MasterSchedulePage(){

const {bookings=[],loading}=useMaster()

const [dateKey,setDateKey]=useState(todayKey())

const slots=useMemo(()=>buildSlots(),[])

const nowSlot=currentSlot()

function openBooking(id){
window.location.hash="/master/bookings/"+id
}

function createBooking(time){
window.location.hash="/master/bookings/new?time="+time+"&date="+dateKey
}

const stats=useMemo(()=>{

const today=todayKey()
const yesterday=addDays(today,-1)
const tomorrow=addDays(today,1)

let t=0
let y=0
let tm=0

for(const b of bookings){

if(!b.start_at)continue

const d=toDateKey(new Date(b.start_at))

if(d===today)t++
if(d===yesterday)y++
if(d===tomorrow)tm++

}

return{
today:t,
yesterday:y,
tomorrow:tm
}

},[bookings])

const calendar=useMemo(()=>{

const map={}

for(const b of bookings){

if(!b.start_at)continue

const start=new Date(b.start_at)

if(toDateKey(start)!==dateKey)continue

const slot=slotKey(start)

if(!map[slot])map[slot]=[]

map[slot].push({
...b,
_status:normalizeStatus(b.status)
})

}

return map

},[bookings,dateKey])

if(loading)return<div>Загрузка...</div>

return(

<div>

<div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>

<h3 style={{margin:0}}>Календарь мастера</h3>

<div style={{flex:1}}/>

<button onClick={()=>setDateKey(addDays(dateKey,-1))}>←</button>

<div style={{fontWeight:700,minWidth:"120px",textAlign:"center"}}>
{formatDMY(dateKey)}
</div>

<button onClick={()=>setDateKey(addDays(dateKey,1))}>→</button>

<button onClick={()=>setDateKey(todayKey())}>Сегодня</button>

</div>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
marginBottom:"12px",
background:"#fafafa"
}}>

<div>Записей сегодня: <b>{stats.today}</b></div>
<div>Вчера: <b>{stats.yesterday}</b></div>
<div>Завтра: <b>{stats.tomorrow}</b></div>

</div>

{slots.map(s=>{

const list=calendar[s]||[]

const highlight=s===nowSlot

return(

<div key={s} style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
marginBottom:"8px",
background:highlight?"#e8f7ff":list.length?"#fff":"#fafafa"
}}>

<div style={{display:"flex",gap:"10px"}}>

<b style={{minWidth:"60px"}}>{highlight?"▶ "+s:s}</b>

<span style={{color:list.length?"#111":"#999"}}>
{list.length?"занято":"свободно"}
</span>

</div>

{!list.length && (

<div
onClick={()=>createBooking(s)}
style={{
marginTop:"6px",
fontSize:"13px",
color:"#2980b9",
cursor:"pointer"
}}
>
+ запись
</div>

)}

{list.map(b=>{

const dur=durationMinutes(b.start_at,b.end_at)

const slotHeight=(dur/15)*40

return(

<div
key={b.id}
onClick={()=>openBooking(b.id)}
style={{
marginTop:"8px",
padding:"10px",
border:"1px solid #eee",
borderRadius:"8px",
background:statusColor(b._status),
cursor:"pointer",
height:slotHeight
}}
>

<div style={{display:"flex",justifyContent:"space-between"}}>

<b>#{b.id}</b>

<span style={{fontSize:"12px"}}>
{statusLabel(b._status)}
</span>

</div>

{serviceLabel(b) && (
<div style={{marginTop:"4px",fontWeight:"600"}}>
{serviceLabel(b)}
</div>
)}

<div style={{marginTop:"4px",fontWeight:"600"}}>
{timeRange(b.start_at,b.end_at)}
</div>

<div style={{marginTop:"4px"}}>
длительность: {dur} мин
</div>

<div style={{marginTop:"4px"}}>
{b.client_name||"клиент"}
</div>

<div style={{color:"#444"}}>
{b.phone||"—"}
</div>

</div>

)

})}

</div>

)

})}

</div>

)

}