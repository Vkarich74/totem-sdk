import { UiValue, uiMessage, uiMoney, uiTemplate, uiConcat, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { useMaster } from "../MasterContext"
import PageSection from "../../cabinet/PageSection"
import { getMasterBookings } from "../../api/internal"

const API_BASE = import.meta.env.VITE_API_BASE || window.API_BASE || "https://api.totemv.com"

function normalizeBookingsResponse(payload){
if(Array.isArray(payload)) return payload
if(Array.isArray(payload?.bookings)) return payload.bookings
if(Array.isArray(payload?.data?.bookings)) return payload.data.bookings
return []
}

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
eta=uiConcat(uiConcat(uiConcat(uiConcat(uiMessage("master.s0288"), hours), uiMessage("master.s0289")), minutes), uiMessage("master.s0290"))
}else if(hours>0){
eta=uiConcat(uiConcat(uiMessage("master.s0288"), hours), uiMessage("master.s0291"))
}else{
eta=uiConcat(uiConcat(uiMessage("master.s0288"), minutes), uiMessage("master.s0290"))
}

return{
...nearest,
eta
}
}

function normalizeStatus(v){
const s=String(v||"reserved").toLowerCase()
if(s==="canceled")return"cancelled"
return s
}

function isCancelledBooking(status){
return normalizeStatus(status)==="cancelled"
}

function isActiveBooking(status){
return !isCancelledBooking(status)
}

function statusLabel(s){
s=normalizeStatus(s)

if(s==="reserved")return uiMessage("master.s0292")
if(s==="confirmed")return uiMessage("master.s0293")
if(s==="completed")return uiMessage("master.s0294")
if(s==="cancelled")return uiMessage("master.s0034")

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
return uiConcat(hours, uiMessage("master.s0291"))
}

if(hours===0){
return uiConcat(minutes, uiMessage("master.s0290"))
}

return uiConcat(uiConcat(uiConcat(hours, uiMessage("master.s0289")), minutes), uiMessage("master.s0290"))
}

function canShowMasterActions(status){
const normalized=normalizeStatus(status)

if(normalized==="reserved" || normalized==="pending" || normalized==="created" || normalized==="new"){
return true
}

if(normalized==="confirmed"){
return true
}

return false
}

function formatMoney(value, currency) { return uiMoney(value, currency); }

function formatTimeHHMM(value){
const date=new Date(value)
if(Number.isNaN(date.getTime()))return"—"

return new Intl.DateTimeFormat("ru-RU",{
hour:"2-digit",
minute:"2-digit",
hour12:false,
timeZone:"Asia/Bishkek"
}).format(date)
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

if(!isActiveBooking(status))continue

busyMinutes+=durationMinutes(b.start_at,b.end_at)
}

const totalMinutes=56*15
const percent=Math.min(100,Math.round((busyMinutes/totalMinutes)*100))

if(percent<40){
return{
percent,
label:uiMessage("master.s0295"),
color:"#2f9e44",
bg:"#ebfbee"
}
}

if(percent<70){
return{
percent,
label:uiMessage("master.s0296"),
color:"#e67700",
bg:"#fff9db"
}
}

return{
percent,
label:uiMessage("master.s0297"),
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

if(!isActiveBooking(status))continue

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

async function fetchMasterBookingsSnapshot(routeSlug){
const result = await getMasterBookings(routeSlug)

if(!result?.ok){
const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
throw new Error(status ? "MASTER_BOOKINGS_HTTP_" + status : (result?.error || "MASTER_BOOKINGS_LOAD_FAILED"))
}

return normalizeBookingsResponse(result)
}

export default function MasterSchedulePage(){
 const { renderUi } = useUiMessages();

const {
loading: masterLoading,
error: masterError,
master,
slug,
salonSlug
}=useMaster()

const [bookings,setBookings]=useState([])
const [bookingsLoading,setBookingsLoading]=useState(true)
const [bookingsError,setBookingsError]=useState("")

const [dateKey,setDateKey]=useState(todayKey())
const [statusOverrides,setStatusOverrides]=useState({})
const [actionLoading,setActionLoading]=useState({})
const [clockTick,setClockTick]=useState(0)
const routeSlug=master?.slug || slug

async function refreshBookingsFromBackend(){
if(!routeSlug){
setBookings([])
setBookingsLoading(false)
setBookingsError(uiError("SLUG_MISSING"))
return []
}

setBookingsError("")
const nextBookings = await fetchMasterBookingsSnapshot(routeSlug)
setBookings(nextBookings)
return nextBookings
}

useEffect(()=>{
let cancelled=false

async function loadBookings(){
if(!routeSlug){
if(!cancelled){
setBookings([])
setBookingsLoading(false)
setBookingsError(uiError("SLUG_MISSING"))
}
return
}

try{
setBookingsLoading(true)
setBookingsError("")
const nextBookings = await fetchMasterBookingsSnapshot(routeSlug)

if(!cancelled){
setBookings(nextBookings)
}
}catch(error){
console.error("MASTER_SCHEDULE_BOOKINGS_LOAD_FAILED",error)

if(!cancelled){
setBookings([])
setBookingsError(uiError(error?.message || "MASTER_BOOKINGS_LOAD_FAILED"))
}
}finally{
if(!cancelled){
setBookingsLoading(false)
}
}
}

loadBookings()

return()=>{
cancelled=true
}
},[master?.slug,slug])

useEffect(()=>{
const timer=setInterval(()=>{
setClockTick(v=>v+1)
},60000)

return()=>clearInterval(timer)
},[])

const slots=useMemo(()=>buildSlots(),[])
const nowSlot=currentSlot()

function getMasterRouteSlug(){
return master?.slug || slug || ""
}

function openBooking(id){
const routeSlug=getMasterRouteSlug()
if(!routeSlug)return
window.location.hash=uiTemplate(["/master/","/bookings/",""], [routeSlug, id])
}

function createBooking(time){
const routeSlug=getMasterRouteSlug()
if(!routeSlug)return
window.location.hash=uiTemplate(["/master/","/bookings/new?time=","&date=",""], [routeSlug, encodeURIComponent(time), encodeURIComponent(dateKey)])
}

function resolveActionSalonSlug(){
return salonSlug || master?.salon_slug || master?.salonSlug || ""
}

async function quickAction(e,booking,action){
e.stopPropagation()

const nextStatus=
action==="confirm" ? "confirmed" :
action==="done" ? "completed" :
action==="cancel" ? "cancelled" :
"reserved"

const lifecycleAction=
action==="confirm" ? "confirm" :
action==="done" ? "complete" :
action==="cancel" ? "cancel" :
""

setActionLoading((prev)=>( {
...prev,
[booking.id]:action
}))

try{
const actionSalonSlug=resolveActionSalonSlug()

if(!actionSalonSlug){
alert(renderUi(uiError(uiMessage("master.s0298"))))
return
}

const response=await fetch(
uiTemplate(["","/public/salons/"], [API_BASE])+encodeURIComponent(actionSalonSlug)+"/bookings/"+booking.id+"/lifecycle",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(
{action:lifecycleAction}
)
}
)

if(!response.ok){
throw new Error("STATUS_UPDATE_FAILED")
}

await refreshBookingsFromBackend()
setStatusOverrides((prev)=>{
const next={...prev}
delete next[booking.id]
return next
})

}catch(error){
if(error && error.message==="SALON_SLUG_NOT_FOUND"){
alert(renderUi(uiError(uiMessage("master.s0298"))))
}else{
alert(renderUi(uiError(uiMessage("master.s0299"))))
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

if(!isActiveBooking(b.status))continue

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
if(isCancelledBooking(effectiveStatus))continue
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

const loading=masterLoading || bookingsLoading
const error=masterError || bookingsError

if(loading)return<PageSection title={uiMessage("master.s0300")}><div><UiValue value={uiMessage("salon.s0118")} /></div></PageSection>

if(error){
return(
<PageSection title={uiMessage("master.s0300")}>
<div style={{
border:"1px solid #fecaca",
background:"#fef2f2",
color:"#991b1b",
borderRadius:"10px",
padding:"12px"
}}><UiValue value={uiMessage("master.s0301")} /></div>
</PageSection>
)
}

return(

<PageSection title={uiMessage("master.s0300")}>

<div>

<div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>

<h3 style={{margin:0}}><UiValue value={uiMessage("master.s0300")} /></h3>

<div style={{flex:1}}/>

<button onClick={()=>setDateKey(addDays(dateKey,-1))}>←</button>

<div style={{fontWeight:700,minWidth:"120px",textAlign:"center"}}>
<UiValue value={formatDMY(dateKey)} />
</div>

<button onClick={()=>setDateKey(addDays(dateKey,1))}>→</button>

<button onClick={()=>setDateKey(todayKey())}><UiValue value={uiMessage("salon.s0213")} /></button>

</div>

{nextBookingInfo && (

<div style={{
border:"1px solid #d0ebff",
borderRadius:"10px",
padding:"10px",
marginBottom:"12px",
background:"#f1f8ff"
}}>

<div style={{fontSize:"12px",color:"#666"}}><UiValue value={uiMessage("master.s0303")} /></div>

<div style={{marginTop:"4px",fontWeight:"700"}}>
<UiValue value={nextBookingInfo.eta} />
</div>

<div style={{marginTop:"4px",fontSize:"13px",color:"#333"}}>
#<UiValue value={nextBookingInfo.id} />
<UiValue value={nextBookingInfo.serviceName ? " · "+nextBookingInfo.serviceName : ""} />
<UiValue value={nextBookingInfo.clientName ? " · "+nextBookingInfo.clientName : ""} />
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

<div><UiValue value={uiMessage("master.s0304")} /><b><UiValue value={stats.today} /></b></div>
<div><UiValue value={uiMessage("master.s0305")} /><b><UiValue value={stats.yesterday} /></b></div>
<div><UiValue value={uiMessage("master.s0306")} /><b><UiValue value={stats.tomorrow} /></b></div>

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
<div style={{fontSize:"12px",color:"#666"}}><UiValue value={uiMessage("master.s0307")} /></div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}><UiValue value={dayKpi.bookingsCount} /></div>
</div>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
background:"#fafafa"
}}>
<div style={{fontSize:"12px",color:"#666"}}><UiValue value={uiMessage("salon.s0247")} /></div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}>
<UiValue value={formatHoursMinutes(dayKpi.busyMinutes)} />
</div>
</div>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
background:"#fafafa"
}}>
<div style={{fontSize:"12px",color:"#666"}}><UiValue value={uiMessage("salon.s0241")} /></div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}>
<UiValue value={formatHoursMinutes(dayKpi.freeMinutes)} />
</div>
</div>

<div style={{
border:"1px solid #ddd",
borderRadius:"10px",
padding:"10px",
background:"#fafafa"
}}>
<div style={{fontSize:"12px",color:"#666"}}><UiValue value={uiMessage("master.s0310")} /></div>
<div style={{marginTop:"4px",fontSize:"20px",fontWeight:"700"}}>
<UiValue value={formatMoney(dayKpi.revenueTotal)} />
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
<b><UiValue value={uiMessage("master.s0311")} /></b>
<span style={{fontWeight:"700",color:dayLoad.color}}>
<UiValue value={dayLoad.percent} />% · <UiValue value={dayLoad.label} />
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
opacity:isPast&&!b?0.72:1,
transition:"all 0.15s ease"
}}>

<div style={{display:"flex",gap:"10px",alignItems:"center"}}>
<b style={{minWidth:"60px",color:isPast&&!isNow?"#868e96":"inherit"}}>
<UiValue value={isNow?"▶ "+s:s} />
</b>
<span style={{color:b?"#111":"#999"}}>
<UiValue value={b?uiMessage("master.s0312"):isPast?uiMessage("master.s0313"):uiMessage("master.s0314")} />
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
><UiValue value={uiMessage("master.s0315")} /></div>

)}

{!b && isPast && (

<div style={{
marginTop:"6px",
fontSize:"12px",
color:"#868e96"
}}><UiValue value={uiMessage("master.s0316")} /></div>

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
<b>#<UiValue value={b.id} /></b>
<span style={{fontSize:"12px"}}><UiValue value={statusLabel(b._status)} /></span>
</div>

{serviceLabel(b) && (
<div style={{marginTop:"4px",fontWeight:"600"}}>
<UiValue value={serviceLabel(b)} />
</div>
)}

<div style={{marginTop:"4px"}}>
<UiValue value={formatTimeHHMM(b.start_at)} />
<UiValue value={" – "} />
<UiValue value={formatTimeHHMM(b.end_at)} />
</div>

<div style={{marginTop:"4px"}}>
<UiValue value={b.client_name||uiMessage("master.s0317")} />
</div>

<div style={{marginTop:"4px",color:"#444"}}>
<UiValue value={b.phone||"—"} />
</div>

<div style={{marginTop:"6px",fontSize:"12px"}}><UiValue value={uiMessage("master.s0318")} /><UiValue value={durationMinutes(b.start_at,b.end_at)} /><UiValue value={uiMessage("master.s0319")} /></div>

<div style={{marginTop:"8px",display:"flex",gap:"6px",position:"sticky",bottom:0,background:statusColor(b._status),paddingTop:"4px"}}>

{canShowMasterActions(b._status) && (
<>
{(["reserved","pending","created","new"].includes(normalizeStatus(b._status))) && (
<>
<button
onClick={(e)=>quickAction(e,b,"confirm")}
disabled={bookingBusy}
style={{padding:"6px 10px",borderRadius:"6px",border:"1px solid #d0d7de",background:"#fff",cursor:bookingBusy?"not-allowed":"pointer"}}
><UiValue value={uiMessage("master.s0320")} /></button>

<button
onClick={(e)=>quickAction(e,b,"cancel")}
disabled={bookingBusy}
style={{padding:"6px 10px",borderRadius:"6px",border:"1px solid #d0d7de",background:"#fff",cursor:bookingBusy?"not-allowed":"pointer"}}
><UiValue value={uiMessage("master.s0321")} /></button>
</>
)}

{normalizeStatus(b._status)==="confirmed" && (
<>
<button
onClick={(e)=>quickAction(e,b,"done")}
disabled={bookingBusy}
style={{padding:"6px 10px",borderRadius:"6px",border:"1px solid #d0d7de",background:"#fff",cursor:bookingBusy?"not-allowed":"pointer"}}
><UiValue value={uiMessage("master.s0322")} /></button>

<button
onClick={(e)=>quickAction(e,b,"cancel")}
disabled={bookingBusy}
style={{padding:"6px 10px",borderRadius:"6px",border:"1px solid #d0d7de",background:"#fff",cursor:bookingBusy?"not-allowed":"pointer"}}
><UiValue value={uiMessage("master.s0321")} /></button>
</>
)}
</>
)}

</div>

</div>

)}

</div>

)

})}

</div>

</PageSection>

)

}
