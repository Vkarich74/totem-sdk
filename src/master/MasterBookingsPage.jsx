import {useMaster} from "./MasterContext"
import {useParams} from "react-router-dom"
import {useState} from "react"

import PageSection from "../cabinet/PageSection"
import TableSection from "../cabinet/TableSection"
import EmptyState from "../cabinet/EmptyState"

function statusColor(s){
if(s==="completed")return "#27ae60"
if(s==="confirmed")return "#2980b9"
if(s==="reserved")return "#f39c12"
return "#e74c3c"
}

/* ДОБАВЛЕНО: стиль hover строк таблицы */
function rowHoverStyle(e,enter){
if(enter){
e.currentTarget.style.background="#f9fafb"
}else{
e.currentTarget.style.background=""
}
}

export default function MasterBookingsPage(){

const {bookingId}=useParams()

const {bookings,loading,master}=useMaster()

const [client,setClient]=useState("")
const [phone,setPhone]=useState("")
const [serviceId,setServiceId]=useState("1")

if(loading)return <div style={{padding:"20px"}}>╨ù╨░╨│╤Ç╤â╨╖╨║╨░...</div>

const hash=window.location.hash

let masterSlug=""
if(master && master.slug){
masterSlug=master.slug
}else{
const p=window.location.pathname.split("/")
masterSlug=p[2]||""
}

if(hash.includes("/master/bookings/new")){

const params=new URLSearchParams(hash.split("?")[1]||"")

const time=params.get("time")||""
const date=params.get("date")||""

async function createBooking(){

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

window.location.href=window.location.pathname+"#/master/schedule"
}

return(

<div style={{padding:"20px"}}>

<button
onClick={()=>window.location.hash="/master/schedule"}
style={{marginBottom:"10px"}}
>
ΓåÉ ╨║ ╨║╨░╨╗╨╡╨╜╨┤╨░╤Ç╤Ä
</button>

<PageSection title="╨¥╨╛╨▓╨░╤Å ╨╖╨░╨┐╨╕╤ü╤î">

<div style={{maxWidth:"420px"}}>

<div style={{marginBottom:"10px"}}>
╨ö╨░╤é╨░: <b>{date}</b>
</div>

<div style={{marginBottom:"10px"}}>
╨Æ╤Ç╨╡╨╝╤Å: <b>{time}</b>
</div>

<input
placeholder="╨Ü╨╗╨╕╨╡╨╜╤é"
value={client}
onChange={e=>setClient(e.target.value)}
style={{width:"100%",marginBottom:"8px"}}
/>

<input
placeholder="╨ó╨╡╨╗╨╡╤ä╨╛╨╜"
value={phone}
onChange={e=>setPhone(e.target.value)}
style={{width:"100%",marginBottom:"8px"}}
/>

<select
value={serviceId}
onChange={e=>setServiceId(e.target.value)}
style={{width:"100%",marginBottom:"10px"}}
>
<option value="1">╨ú╤ü╨╗╤â╨│╨░ 1</option>
<option value="2">╨ú╤ü╨╗╤â╨│╨░ 2</option>
<option value="3">╨ú╤ü╨╗╤â╨│╨░ 3</option>
</select>

<button onClick={createBooking}>
╨í╨╛╨╖╨┤╨░╤é╤î ╨╖╨░╨┐╨╕╤ü╤î
</button>

</div>

</PageSection>

</div>

)

}

if(bookingId){

const booking=bookings.find(b=>String(b.id)===String(bookingId))

if(!booking){

return(
<div style={{padding:"20px"}}>
<PageSection title="╨ù╨░╨┐╨╕╤ü╤î">
<EmptyState title="╨ù╨░╨┐╨╕╤ü╤î ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜╨░"/>
</PageSection>
</div>
)

}

return(

<div style={{padding:"20px"}}>

<button
onClick={()=>window.location.hash="/master/schedule"}
style={{marginBottom:"10px"}}
>
ΓåÉ ╨║ ╨║╨░╨╗╨╡╨╜╨┤╨░╤Ç╤Ä
</button>

<PageSection title={"BR-"+booking.id}>

<div style={{color:statusColor(booking.status),marginBottom:"10px"}}>
{booking.status}
</div>

{booking.service_name && (
<div style={{marginBottom:"6px"}}>
╨ú╤ü╨╗╤â╨│╨░: {booking.service_name}
</div>
)}

{booking.price && (
<div style={{marginBottom:"6px"}}>
╨ª╨╡╨╜╨░: {booking.price} Γé╕
</div>
)}

<div style={{marginBottom:"6px"}}>
╨Æ╤Ç╨╡╨╝╤Å: {new Date(booking.start_at).toLocaleString("ru-RU")}
</div>

<div style={{marginBottom:"6px"}}>
╨Ü╨╗╨╕╨╡╨╜╤é: {booking.client_name||"ΓÇö"}
</div>

<div>
╨ó╨╡╨╗╨╡╤ä╨╛╨╜: {booking.phone||"ΓÇö"}
</div>

</PageSection>

</div>

)

}

return(

<div style={{padding:"20px"}}>

<PageSection title="╨ù╨░╨┐╨╕╤ü╨╕">

{(!bookings || bookings.length===0) ? (

<EmptyState
title="╨ù╨░╨┐╨╕╤ü╨╡╨╣ ╨┐╨╛╨║╨░ ╨╜╨╡╤é"
message="╨ù╨░╨┐╨╕╤ü╨╕ ╨┐╨╛╤Å╨▓╤Å╤é╤ü╤Å ╨┐╨╛╤ü╨╗╨╡ ╨▒╤Ç╨╛╨╜╨╕╤Ç╨╛╨▓╨░╨╜╨╕╨╣"
/>

) : (

<TableSection>

<table>

<thead>
<tr>
<th>ID</th>
<th>╨í╤é╨░╤é╤â╤ü</th>
<th>╨ö╨░╤é╨░</th>
<th>╨Ü╨╗╨╕╨╡╨╜╤é</th>
<th>╨ó╨╡╨╗╨╡╤ä╨╛╨╜</th>
</tr>
</thead>

<tbody>

{bookings.map(b=>(

<tr
key={b.id}
style={{cursor:"pointer"}}
onMouseEnter={(e)=>rowHoverStyle(e,true)}
onMouseLeave={(e)=>rowHoverStyle(e,false)}
onClick={(e)=>{
if(e.target.tagName!=="A"){
window.location.hash="/master/bookings/"+b.id
}
}}
>

<td>
<a href={"#/master/bookings/"+b.id}>
BR-{b.id}
</a>
</td>

<td style={{color:statusColor(b.status)}}>
{b.status}
</td>

<td>
{new Date(b.start_at).toLocaleString("ru-RU")}
</td>

<td>
{b.client_name||"ΓÇö"}
</td>

<td>
{b.phone||"ΓÇö"}
</td>

</tr>

))}

</tbody>

</table>

</TableSection>

)}

</PageSection>

</div>

)

}