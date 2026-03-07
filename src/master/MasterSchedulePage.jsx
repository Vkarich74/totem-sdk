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

function slotKeysBetween(start,end){

const keys=[]

let t=new Date(start)

while(t<end){

keys.push(slotKey(t))

t=new Date(t.getTime()+15*60000)

}

return keys

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

function getDayLoadMeta(bookings,dateKey){

let busyMinutes=0

for(const b of bookings){

if(!b.start_at)continue

const start=new Date(b.start_at)

if(toDateKey(start)!==dateKey)continue

const status=normalizeStatus(b.status)

if(status==="cancelled")continue

busyMinutes+=durationMinutes(b.start_at,b.end_at)

}

const totalMinutes=56*15
const percent=Math.min(100,Math.round((busyMinutes/totalMinutes)*100))

if(percent<40){
return{
percent,
label:"низкая",
color:"#2f9e44",
bg:"#ebfbee"
}
}

if(percent<70){
return{
percent,
label:"средняя",
color:"#e67700",
bg:"#fff9db"
}
}

return{
percent,
label:"высокая",
color:"#e03131",
bg:"#fff5f5"
}

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

const dayLoad=useMemo(()=>{
return getDayLoadMeta(bookings,dateKey)
},[bookings,dateKey])

const {calendar,occupied}=useMemo(()=>{

const map={}
const occupied=new Set()

for(const b of bookings){

if(!b.start_at)continue

const start=new Date(b.start_at)

if(toDateKey(start)!==dateKey)continue

const end=b.end_at?new Date(b.end_at):new Date(start.getTime()+30*60000)

const first=slotKey(start)

if(!map[first])map[first]=[]

map[first].push({
...b,
_status:normalizeStatus(b.status)
})

const keys=slotKeysBetween(start,end)

for(const k of keys){
occupied.add(k)
}

}

return{
calendar:map,
occupied
}

},[bookings,dateKey])

if(loading)return<div>Загрузка...</div>

return(

<div>

<h3>Календарь мастера</h3>

{slots.map(s=>{

const list=calendar[s]||[]

const blocked=occupied.has(s)&&!list.length

return(

<div key={s} style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
marginBottom:"8px",
background:blocked?"#f1f3f5":"#fff"
}}>

<div style={{display:"flex",gap:"10px"}}>

<b style={{minWidth:"60px"}}>{s}</b>

<span style={{color:list.length?"#111":"#999"}}>
{list.length?"занято":blocked?"занято":"свободно"}
</span>

</div>

{!list.length && !blocked && (

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
height:slotHeight,
boxSizing:"border-box",
overflow:"hidden"
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