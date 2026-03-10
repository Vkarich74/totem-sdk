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

function isNowInsideBooking(start,end){
const now=Date.now()
const startMs=new Date(start).getTime()
const endMs=new Date(end).getTime()
return now>=startMs && now<endMs
}

function getNextBookingInfo(bookings,dateKey){
const now=Date.now()
let nearest=null

for(const b of bookings){
if(!b.start_at)continue

const start=new Date(b.start_at)
if(toDateKey(start)!==dateKey)continue

const status=normalizeStatus(b.status)
if(status==="cancelled" || status==="completed")continue

const startMs=start.getTime()
if(startMs<=now)continue

if(!nearest || startMs<nearest.startMs){
nearest={
id:b.id,
startMs,
startAt:b.start_at,
clientName:b.client_name || "",
serviceName:serviceLabel(b) || ""
}
}
}

if(!nearest)return null

const diffMinutes=Math.max(1,Math.ceil((nearest.startMs-now)/60000))
const hours=Math.floor(diffMinutes/60)
const minutes=diffMinutes%60

let eta=""
if(hours>0 && minutes>0){
eta="Ñ‡ÐµÑ€ÐµÐ· "+hours+" Ñ‡ "+minutes+" Ð¼Ð¸Ð½"
}else if(hours>0){
eta="Ñ‡ÐµÑ€ÐµÐ· "+hours+" Ñ‡"
}else{
eta="Ñ‡ÐµÑ€ÐµÐ· "+minutes+" Ð¼Ð¸Ð½"
}

return{
...nearest,
eta
}
}

function currentMasterSlug(){
const path=window.location.pathname||""
const parts=path.split("/").filter(Boolean)
const idx=parts.indexOf("master")

if(idx>=0 && parts[idx+1]){
return parts[idx+1]
}

return""
}

function normalizeStatus(v){
const s=String(v||"reserved").toLowerCase()
if(s==="canceled")return"cancelled"
return s
}

function statusLabel(s){
s=normalizeStatus(s)

if(s==="reserved")return"Ð¾Ð¶Ð¸Ð´Ð°ÐµÑ‚"
if(s==="confirmed")return"Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð°"
if(s==="completed")return"Ð·Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð°"
if(s==="cancelled")return"Ð¾Ñ‚Ð¼ÐµÐ½Ð°"

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

function formatHoursMinutes(totalMinutes){
const hours=Math.floor(totalMinutes/60)
const minutes=totalMinutes%60

if(minutes===0){
return hours+" Ñ‡"
}

if(hours===0){
return minutes+" Ð¼Ð¸Ð½"
}

return hours+" Ñ‡ "+minutes+" Ð¼Ð¸Ð½"
}

function formatMoney(value){
return String(value||0)+" ÑÐ¾Ð¼"
}

function bookingAmount(b){
const raw=
b.price ??
b.service_price ??
b.total_price ??
b.amount ??
0

const n=Number(raw)

if(Number.isNaN(n))return 0

return n
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
label:"Ð½Ð¸Ð·ÐºÐ°Ñ",
color:"#2f9e44",
bg:"#ebfbee"
}
}

if(percent<70){
return{
percent,
label:"ÑÑ€ÐµÐ´Ð½ÑÑ",
color:"#e67700",
bg:"#fff9db"
}
}

return{
percent,
label:"Ð²Ñ‹ÑÐ¾ÐºÐ°Ñ",
color:"#e03131",
bg:"#fff5f5"
}
}

function getDayKpi(bookings,dateKey){
let busyMinutes=0
let bookingsCount=0
let revenueTotal=0

for(const b of bookings){
if(!b.start_at)continue

const start=new Date(b.start_at)

if(toDateKey(start)!==dateKey)continue

const status=normalizeStatus(b.status)

if(status==="cancelled")continue

bookingsCount++
busyMinutes+=durationMinutes(b.start_at,b.end_at)
revenueTotal+=bookingAmount(b)
}

const totalMinutes=56*15
const freeMinutes=Math.max(0,totalMinutes-busyMinutes)

return{
bookingsCount,
busyMinutes,
freeMinutes,
revenueTotal
}
}

function isPastSlot(slot,dateKey){
if(dateKey!==todayKey())return dateKey<todayKey()
return slot<currentSlot()
}

export default function MasterSchedulePage(){

const {bookings=[],loading}=useMaster()

const [dateKey,setDateKey]=useState(todayKey())
const [statusOverrides,setStatusOverrides]=useState({})
const [actionLoading,setActionLoading]=useState({})
const [masterSalonSlug,setMasterSalonSlug]=useState("")
const [clockTick,setClockTick]=useState(0)

useEffect(()=>{
const timer=setInterval(()=>{
setClockTick(v=>v+1)
},60000)

return()=>clearInterval(timer)
},[])

const slots=useMemo(()=>buildSlots(),[])

const nowSlot=currentSlot()

function openBooking(id){
window.location.hash="/master/bookings/"+id
}

function createBooking(time){
window.location.hash="/master/bookings/new?time="+time+"&date="+dateKey
}

async function resolveSalonSlug(){
if(masterSalonSlug){
return masterSalonSlug
}

const masterSlug=currentMasterSlug()

if(!masterSlug){
throw new Error("MASTER_SLUG_NOT_FOUND")
}

const response=await fetch(
"https://api.totemv.com/internal/masters/"+encodeURIComponent(masterSlug)
)

if(!response.ok){
throw new Error("MASTER_FETCH_FAILED")
}

const data=await response.json()
const slug=
data?.master?.salon_slug ??
data?.master?.salonSlug ??
data?.master?.salon?.slug ??
data?.salon_slug ??
data?.salonSlug ??
data?.salon?.slug ??
""

if(!slug){
throw new Error("SALON_SLUG_NOT_FOUND")
}

setMasterSalonSlug(slug)
return slug
}

async function quickAction(e,booking,action){
e.stopPropagation()

const nextStatus=
action==="confirm" ? "confirmed" :
action==="done" ? "completed" :
action==="cancel" ? "cancelled" :
"reserved"

setActionLoading((prev)=>({
...prev,
[booking.id]:action
}))

try{
const salonSlug=await resolveSalonSlug()

const response=await fetch(
"https://api.totemv.com/public/salons/"+encodeURIComponent(salonSlug)+"/bookings/"+booking.id,
{
method:"PATCH",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({status:nextStatus})
}
)

if(!response.ok){
throw new Error("STATUS_UPDATE_FAILED")
}

setStatusOverrides((prev)=>({
...prev,
[booking.id]:nextStatus
}))

}catch(error){
if(error && error.message==="MASTER_SLUG_NOT_FOUND"){
alert("ÐÐµ Ð½Ð°Ð¹Ð´ÐµÐ½ master slug Ð² URL")
}else if(error && error.message==="SALON_SLUG_NOT_FOUND"){
alert("Ð£ Ð¼Ð°ÑÑ‚ÐµÑ€Ð° Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½ salon slug")
}else{
alert("Ð¡Ñ‚Ð°Ñ‚ÑƒÑ Ð½Ðµ Ð¾Ð±Ð½Ð¾Ð²Ð¸Ð»ÑÑ")
}
}finally{
setActionLoading((prev)=>{
const next={...prev}
delete next[booking.id]
return next
})
}
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
},[bookings,dateKey,clockTick])

const dayKpi=useMemo(()=>{
return getDayKpi(bookings,dateKey)
},[bookings,dateKey])

const nextBookingInfo=useMemo(()=>{
return getNextBookingInfo(bookings,dateKey)
},[bookings,dateKey,clockTick])

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
const effectiveStatus=normalizeStatus(statusOverrides[b.id] ?? b.status)
const isNowBooking=toDateKey(start)===todayKey() && isNowInsideBooking(start,end)

calendar[startSlot]={
...b,
span,
_status:effectiveStatus,
_isNow:isNowBooking
}

const keys=slotKeysBetween(start,end)
keys.shift()

for(const k of keys){
skip.add(k)
}

}

return{calendar,skip}

},[bookings,dateKey,statusOverrides,clockTick])

if(loading)return<div>Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ°...</div>

return(

<div>

<div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>

<h3 style={{margin:0}}>ÐšÐ°Ð»ÐµÐ½Ð´Ð°Ñ€ÑŒ Ð¼Ð°ÑÑ‚ÐµÑ€Ð°</h3>

<div style={{flex:1}}/>

<button onClick={()=>setDateKey(addDays(dateKey,-1))}>â†</button>

<div style={{fontWeight:700,minWidth:"120px",textAlign:"center"}}>
{formatDMY(dateKey)}
</div>

<button onClick={()=>setDateKey(addDays(dateKey,1))}>â†’</button>

<button onClick={()=>setDateKey(todayKey())}>Ð¡ÐµÐ³Ð¾Ð´Ð½Ñ</button>

</div>

{nextBookingInfo && (

<div style={{
border:"1px solid #d0ebff",
borderRadius:"10px",
padding:"10px",
marginBottom:"12px",
background:"#f1f8ff"
}}>

<div style={{fontSize:"12px",color:"#666"}}>Ð‘Ð»Ð¸Ð¶Ð°Ð¹ÑˆÐ°Ñ Ð·Ð°Ð¿Ð¸ÑÑŒ</div>

<div style={{marginTop:"4px",fontWeight:"700"}}>
{nextBookingInfo.eta}
</div>

<div style={{marginTop:"4px",fontSize:"13px",color:"#333"}}>
#{nextBookingInfo.id}
{nextBookingInfo.serviceName ? " Â· "+nextBookingInfo.serviceName : ""}
{nextBookingInfo.clientName ? " Â· "+nextBookingInfo.clientName : ""}
</div>

</div>

)}

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
marginBottom:"12px",
background:"#fafafa"
}}>

<div>Ð—Ð°Ð¿Ð¸ÑÐµÐ¹ ÑÐµÐ³Ð¾Ð´Ð½Ñ: <b>{stats.today}</b></div>
<div>Ð’Ñ‡ÐµÑ€Ð°: <b>{stats.yesterday}</b></div>
<div>Ð—Ð°Ð²Ñ‚Ñ€Ð°: <b>{stats.tomorrow}</b></div>

</div>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(4, 1fr)",
gap:"8px",
marginBottom:"12px"
}}>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
background:"#fafafa"
}}>
<div style={{fontSize:"12px",color:"#666"}}>Ð—Ð°Ð¿Ð¸ÑÐµÐ¹ Ð² Ð´Ð½Ðµ</div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}>{dayKpi.bookingsCount}</div>
</div>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
background:"#fafafa"
}}>
<div style={{fontSize:"12px",color:"#666"}}>Ð—Ð°Ð½ÑÑ‚Ð¾</div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}>
{formatHoursMinutes(dayKpi.busyMinutes)}
</div>
</div>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
background:"#fafafa"
}}>
<div style={{fontSize:"12px",color:"#666"}}>Ð¡Ð²Ð¾Ð±Ð¾Ð´Ð½Ð¾</div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}>
{formatHoursMinutes(dayKpi.freeMinutes)}
</div>
</div>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
background:"#fafafa"
}}>
<div style={{fontSize:"12px",color:"#666"}}>Ð¡ÑƒÐ¼Ð¼Ð° Ð´Ð½Ñ</div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}>
{formatMoney(dayKpi.revenueTotal)}
</div>
</div>

</div>

<div style={{
border:"1px solid "+dayLoad.color,
borderRadius:"10px",
padding:"12px",
marginBottom:"12px",
background:dayLoad.bg
}}>

<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
<b>Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ° Ð´Ð½Ñ</b>
<span style={{fontWeight:"700",color:dayLoad.color}}>
{dayLoad.percent}% Â· {dayLoad.label}
</span>
</div>

<div style={{
height:"12px",
borderRadius:"999px",
background:"#f1f3f5",
overflow:"hidden"
}}>
<div style={{
height:"100%",
width:dayLoad.percent+"%",
background:dayLoad.color,
transition:"width 0.2s ease"
}}/>
</div>

</div>

{slots.map(s=>{

if(skip.has(s))return null

const b=calendar[s]
const isNow=s===nowSlot
const isPast=isPastSlot(s,dateKey)
const bookingBusy=!!(b && actionLoading[b.id])

return(

<div key={s} style={{
border:isNow?"2px solid #339af0":"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
marginBottom:"8px",
background:isNow?"#e8f7ff":isPast?"#f8f9fa":"#fff",
opacity:isPast&&!b?0.72:1
}}>

<div style={{display:"flex",gap:"10px",alignItems:"center"}}>
<b style={{minWidth:"60px",color:isPast&&!isNow?"#868e96":"inherit"}}>
{isNow?"â–¶ "+s:s}
</b>
<span style={{color:b?"#111":"#999"}}>
{b?"Ð·Ð°Ð½ÑÑ‚Ð¾":isPast?"Ð¿Ñ€Ð¾ÑˆÐ»Ð¾":"ÑÐ²Ð¾Ð±Ð¾Ð´Ð½Ð¾"}
</span>
</div>

{!b && !isPast && (

<div
onClick={()=>createBooking(s)}
style={{
marginTop:"6px",
fontSize:"13px",
color:"#2980b9",
cursor:"pointer"
}}
>
+ Ð·Ð°Ð¿Ð¸ÑÑŒ
</div>

)}

{!b && isPast && (

<div style={{
marginTop:"6px",
fontSize:"12px",
color:"#868e96"
}}>
Ð²Ñ€ÐµÐ¼Ñ Ð¿Ñ€Ð¾ÑˆÐ»Ð¾
</div>

)}

{b && (

<div
onClick={()=>openBooking(b.id)}
style={{
marginTop:"8px",
padding:"10px",
paddingBottom:"14px",
borderRadius:"8px",
background:statusColor(b._status),
height:b.span*40,
minHeight:"150px",
cursor:"pointer",
boxSizing:"border-box",
overflowY:"auto",
border:b._isNow?"3px solid #ff6b6b":"none",
boxShadow:b._isNow?"0 0 0 3px rgba(255,107,107,0.15)":"none"
}}
>

<div style={{display:"flex",justifyContent:"space-between",gap:"8px"}}>
<b>#{b.id}</b>
<span style={{fontSize:"12px"}}>{statusLabel(b._status)}</span>
</div>

{serviceLabel(b) && (
<div style={{marginTop:"4px",fontWeight:"600"}}>
{serviceLabel(b)}
</div>
)}

<div style={{marginTop:"4px"}}>
{new Date(b.start_at).toLocaleTimeString().slice(0,5)}
{" â€“ "}
{new Date(b.end_at).toLocaleTimeString().slice(0,5)}
</div>

<div style={{marginTop:"4px"}}>
{b.client_name||"ÐºÐ»Ð¸ÐµÐ½Ñ‚"}
</div>

<div style={{marginTop:"4px",color:"#444"}}>
{b.phone||"â€”"}
</div>

<div style={{marginTop:"6px",fontSize:"12px"}}>
Ð´Ð»Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ÑÑ‚ÑŒ: {durationMinutes(b.start_at,b.end_at)} Ð¼Ð¸Ð½
</div>

<div style={{marginTop:"8px",display:"flex",gap:"6px",position:"sticky",bottom:0,background:statusColor(b._status),paddingTop:"4px"}}>

<button
onClick={(e)=>quickAction(e,b,"confirm")}
disabled={bookingBusy}
>
âœ”
</button>

<button
onClick={(e)=>quickAction(e,b,"done")}
disabled={bookingBusy}
>
âœ“
</button>

<button
onClick={(e)=>quickAction(e,b,"cancel")}
disabled={bookingBusy}
>
âœ–
</button>

</div>

</div>

)}

</div>

)

})}

</div>

)

}

