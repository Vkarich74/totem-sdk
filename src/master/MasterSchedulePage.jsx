import {useMaster} from "./MasterContext"
import {useParams} from "react-router-dom"
import {useState} from "react"

function statusColor(s){

if(s==="completed")return "#27ae60"
if(s==="confirmed")return "#2980b9"
if(s==="reserved")return "#f39c12"
return "#e74c3c"

}

export default function MasterBookingsPage(){

const {bookingId}=useParams()

const {bookings,loading,master}=useMaster()

const [client,setClient]=useState("")
const [phone,setPhone]=useState("")
const [serviceId,setServiceId]=useState("1")

if(loading)return <div>Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ°...</div>

const hash=window.location.hash

// Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð¾ Ð¿Ð¾Ð»ÑƒÑ‡Ð°ÐµÐ¼ slug Ð¼Ð°ÑÑ‚ÐµÑ€Ð°
let masterSlug=""
if(master && master.slug){
masterSlug=master.slug
}else{
const p=window.location.pathname.split("/")
masterSlug=p[2]||""
}

// Ñ€ÐµÐ¶Ð¸Ð¼ ÑÐ¾Ð·Ð´Ð°Ð½Ð¸Ñ Ð·Ð°Ð¿Ð¸ÑÐ¸
if(hash.includes("/master/bookings/new")){

const params=new URLSearchParams(hash.split("?")[1]||"")

const time=params.get("time")||""
const date=params.get("date")||""

async function createBooking(){

// FIX TIMEZONE KG (+06)
const start=date+"T"+time+":00+06:00"

await fetch(
"https://api.totemv.com/internal/masters/"+masterSlug+"/bookings",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
client_name:client,
phone:phone,
start_at:start,
service_id:Number(serviceId)
})
}
)

// ÐŸÐ Ð˜ÐÐ£Ð”Ð˜Ð¢Ð•Ð›Ð¬ÐÐž ÐžÐ‘ÐÐžÐ’Ð›Ð¯Ð•Ðœ ÐšÐÐ›Ð•ÐÐ”ÐÐ Ð¬
window.location.href=window.location.pathname+"#/master/schedule"

}

return(

<div>

<button
onClick={()=>window.location.hash="/master/schedule"}
style={{marginBottom:"10px"}}
>
â† ÐºÐ°Ð»ÐµÐ½Ð´Ð°Ñ€ÑŒ
</button>

<h3>ÐÐ¾Ð²Ð°Ñ Ð·Ð°Ð¿Ð¸ÑÑŒ</h3>

<div style={{
border:"1px solid #ddd",
padding:"14px",
borderRadius:"12px",
maxWidth:"420px"
}}>

<div style={{marginBottom:"10px"}}>
Ð”Ð°Ñ‚Ð°: <b>{date}</b>
</div>

<div style={{marginBottom:"10px"}}>
Ð’Ñ€ÐµÐ¼Ñ: <b>{time}</b>
</div>

<input
placeholder="ÐšÐ»Ð¸ÐµÐ½Ñ‚"
value={client}
onChange={e=>setClient(e.target.value)}
style={{width:"100%",marginBottom:"8px"}}
/>

<input
placeholder="Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½"
value={phone}
onChange={e=>setPhone(e.target.value)}
style={{width:"100%",marginBottom:"8px"}}
/>

<select
value={serviceId}
onChange={e=>setServiceId(e.target.value)}
style={{width:"100%",marginBottom:"10px"}}
>

<option value="1">Ð£ÑÐ»ÑƒÐ³Ð° 1</option>
<option value="2">Ð£ÑÐ»ÑƒÐ³Ð° 2</option>
<option value="3">Ð£ÑÐ»ÑƒÐ³Ð° 3</option>

</select>

<button onClick={createBooking}>
Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ Ð·Ð°Ð¿Ð¸ÑÑŒ
</button>

</div>

</div>

)

}

if(bookingId){

const booking=bookings.find(b=>String(b.id)===String(bookingId))

if(!booking){

return(
<div>
<h3>Ð—Ð°Ð¿Ð¸ÑÑŒ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð°</h3>
</div>
)

}

return(

<div>

<button
onClick={()=>window.location.hash="/master/schedule"}
style={{marginBottom:"10px"}}
>
â† ÐºÐ°Ð»ÐµÐ½Ð´Ð°Ñ€ÑŒ
</button>

<h3>ÐšÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÐ° Ð·Ð°Ð¿Ð¸ÑÐ¸</h3>

<div style={{
border:"1px solid #ddd",
padding:"14px",
borderRadius:"12px"
}}>

<div style={{fontWeight:700,fontSize:"18px"}}>
BR-{booking.id}
</div>

<div style={{color:statusColor(booking.status),marginTop:"6px"}}>
{booking.status}
</div>

{booking.service_name && (
<div style={{marginTop:"8px"}}>
Ð£ÑÐ»ÑƒÐ³Ð°: {booking.service_name}
</div>
)}

{booking.price && (
<div style={{marginTop:"6px"}}>
Ð¦ÐµÐ½Ð°: {booking.price} â‚½
</div>
)}

<div style={{marginTop:"10px"}}>
Ð’Ñ€ÐµÐ¼Ñ: {new Date(booking.start_at).toLocaleString("ru-RU")}
</div>

<div style={{marginTop:"6px"}}>
ÐšÐ»Ð¸ÐµÐ½Ñ‚: {booking.client_name||"â€”"}
</div>

<div style={{marginTop:"6px"}}>
Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½: {booking.phone||"â€”"}
</div>

</div>

</div>

)

}

return(

<div>

<h3>Ð—Ð°Ð¿Ð¸ÑÐ¸</h3>

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

<div>ÐšÐ»Ð¸ÐµÐ½Ñ‚: {b.client_name||"â€”"}</div>

<div>Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½: {b.phone||"â€”"}</div>

</div>

))}

</div>

)

}

