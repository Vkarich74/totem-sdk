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

function durationMinutes(start,end){
if(!end)return 30
return Math.round((new Date(end)-new Date(start))/60000)
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

const {calendar,skip}=useMemo(()=>{

const calendar={}
const skip=new Set()

for(const b of bookings){

if(!b.start_at)continue

const start=new Date(b.start_at)

if(toDateKey(start)!==dateKey)continue

const end=b.end_at?new Date(b.end_at):new Date(start.getTime()+30*60000)

const startSlot=slotKey(start)

const dur=durationMinutes(start,end)

const span=Math.max(1,Math.round(dur/15))

calendar[startSlot]={
...b,
span,
_status:normalizeStatus(b.status)
}

const keys=slotKeysBetween(start,end)

keys.shift()

for(const k of keys){
skip.add(k)
}

}

return{calendar,skip}

},[bookings,dateKey])

if(loading)return<div>Загрузка...</div>

return(

<div>

<h3>Календарь мастера</h3>

{slots.map(s=>{

if(skip.has(s))return null

const b=calendar[s]

const isNow=s===nowSlot

return(

<div key={s} style={{
border:isNow?"2px solid #339af0":"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
marginBottom:"8px",
background:isNow?"#e8f7ff":"#fff"
}}>

<b>{isNow?"▶ "+s:s}</b>

{!b && (

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

{b && (

<div
onClick={()=>openBooking(b.id)}
style={{
marginTop:"8px",
padding:"10px",
borderRadius:"8px",
background:statusColor(b._status),
height:b.span*40,
cursor:"pointer"
}}
>

<b>#{b.id}</b>

<div>{serviceLabel(b)}</div>

<div>
{new Date(b.start_at).toLocaleTimeString().slice(0,5)}
–
{new Date(b.end_at).toLocaleTimeString().slice(0,5)}
</div>

<div>{b.client_name||"клиент"}</div>

</div>

)}

</div>

)

})}

</div>

)

}