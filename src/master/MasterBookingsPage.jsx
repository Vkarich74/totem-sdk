import {useMaster} from "./MasterContext"
import {useParams} from "react-router-dom"

function statusColor(s){

if(s==="completed")return "#27ae60"
if(s==="confirmed")return "#2980b9"
if(s==="reserved")return "#f39c12"
return "#e74c3c"

}

export default function MasterBookingsPage(){

const {bookingId}=useParams()

const {bookings,loading}=useMaster()

if(loading)return <div>Загрузка...</div>

if(bookingId){

const booking=bookings.find(b=>String(b.id)===String(bookingId))

if(!booking){

return(
<div>
<h3>Запись не найдена</h3>
</div>
)

}

return(

<div>

<h3>Карточка записи</h3>

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

<div style={{marginTop:"10px"}}>
Время: {new Date(booking.start_at).toLocaleString("ru-RU")}
</div>

<div style={{marginTop:"6px"}}>
Клиент: {booking.client_name||"—"}
</div>

<div style={{marginTop:"6px"}}>
Телефон: {booking.phone||"—"}
</div>

</div>

</div>

)

}

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