import { useEffect, useMemo, useState } from "react"
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
return d+"."+m+"."+y
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

function statusColor(s){
s=normalizeStatus(s)

if(s==="reserved")return"#fff3cd"
if(s==="confirmed")return"#d0ebff"
if(s==="completed")return"#d3f9d8"
if(s==="cancelled")return"#ffe3e3"

return"#eee"
}

function durationMinutes(start,end){
if(!end)return 30
return Math.round((new Date(end)-new Date(start))/60000)
}

function isPastSlot(slot,dateKey){
if(dateKey!==todayKey())return dateKey<todayKey()
return slot<currentSlot()
}

export default function MasterSchedulePage(){

const {bookings=[],loading}=useMaster()

const [dateKey,setDateKey]=useState(todayKey())
const [clockTick,setClockTick]=useState(0)

useEffect(()=>{
const timer=setInterval(()=>{
setClockTick(v=>v+1)
},60000)

return()=>clearInterval(timer)
},[])

const slots=useMemo(()=>buildSlots(),[])
const nowSlot=currentSlot()

const {calendar,skip}=useMemo(()=>{

const calendar={}
const skip=new Set()

for(const b of bookings){

if(!b.start_at)continue

const start=new Date(b.start_at)
if(toDateKey(start)!==dateKey)continue

const end=b.end_at?new Date(b.end_at):new Date(start.getTime()+30*60000)

const startSlot=slotKey(start)
const span=Math.max(1,Math.round(durationMinutes(start,end)/15))

calendar[startSlot]={...b,span}

const keys=slotKeysBetween(start,end)
keys.shift()

for(const k of keys){
skip.add(k)
}

}

return{calendar,skip}

},[bookings,dateKey,clockTick])

if(loading)return<div>Загрузка...</div>

return(

<div style={{
overflow:"auto",
maxHeight:"calc(100vh - 220px)"
}}>

<div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>

<h3 style={{margin:0}}>Расписание мастера</h3>

<div style={{flex:1}}/>

<button onClick={()=>setDateKey(addDays(dateKey,-1))}>←</button>

<div style={{fontWeight:700,minWidth:"120px",textAlign:"center"}}>
{formatDMY(dateKey)}
</div>

<button onClick={()=>setDateKey(addDays(dateKey,1))}>→</button>

<button onClick={()=>setDateKey(todayKey())}>Сегодня</button>

</div>

{slots.map(s=>{

if(skip.has(s))return null

const b=calendar[s]
const isNow=s===nowSlot
const isPast=isPastSlot(s,dateKey)

return(

<div key={s} style={{
border:isNow?"2px solid #339af0":"1px solid #ddd",
borderRadius:"10px",
padding:"12px",
marginBottom:"8px",
background:b?statusColor(b.status):(isNow?"#e8f7ff":isPast?"#f8f9fa":"#fff"),
opacity:isPast&&!b?0.7:1,
transition:"all .15s"
}}>

<div style={{display:"flex",gap:"10px",alignItems:"center"}}>

<b style={{minWidth:"60px"}}>
{isNow?"● "+s:s}
</b>

{!b && (
<span style={{color:"#999"}}>
{isPast?"прошло":"свободно"}
</span>
)}

{b && (

<div style={{flex:1}}>

<div style={{fontWeight:600}}>
{b.client_name || "Клиент"}
</div>

<div style={{fontSize:"13px",color:"#666"}}>
{b.service_name || ""}
</div>

</div>

)}

</div>

{b && (

<div style={{
marginTop:"8px",
display:"flex",
gap:"6px",
flexWrap:"wrap"
}}>

<button style={{fontSize:"12px"}}>Подтвердить</button>
<button style={{fontSize:"12px"}}>Завершить</button>
<button style={{fontSize:"12px"}}>Отменить</button>

</div>

)}

</div>

)

})}

</div>

)

}