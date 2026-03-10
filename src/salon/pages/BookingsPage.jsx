import { useEffect, useMemo, useState } from "react";
import * as api from "../../api/internal";
import { getSalonSlug } from "../../utils/salon";
import PageSection from "../../cabinet/PageSection";
import EmptyState from "../../cabinet/EmptyState";

function resolveSlug(){
const util = getSalonSlug();
if(util) return util;
const parts = window.location.pathname.split("/");
return parts[2] || "totem-demo-salon";
}

function statusColor(status){
if(status==="reserved") return "#f59e0b";
if(status==="confirmed") return "#10b981";
if(status==="completed") return "#6b7280";
if(status==="cancelled") return "#ef4444";
return "#9ca3af";
}

function statusText(status){
if(status==="reserved") return "Ожидает";
if(status==="confirmed") return "Подтверждена";
if(status==="completed") return "Завершена";
if(status==="cancelled") return "Отменена";
return status;
}

function formatDate(d){
if(!d) return "—";
const date = new Date(d);
return date.toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}

function formatMoney(v){
if(v===null || v===undefined) return "—";
return `${v} сом`;
}

export default function BookingsPage(){

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const [filter,setFilter] = useState("today");
const [search,setSearch] = useState("");

const [loadingAction,setLoadingAction] = useState(null);
const [selectedBookingId,setSelectedBookingId] = useState(null);

const salonSlug = resolveSlug();

async function load(){

try{

const res = await api.getBookings(salonSlug);

if(res.ok){

const sorted = (res.bookings || []).sort((a,b)=>{
if(!a.start_at) return 1;
if(!b.start_at) return -1;
return new Date(a.start_at) - new Date(b.start_at);
});

setBookings(sorted);

}

const resMasters = await api.getMasters(salonSlug);

if(resMasters.ok){
setMasters(resMasters.masters || []);
}

}catch(e){
console.error(e);
}

}

useEffect(()=>{

load();

const interval=setInterval(()=>{
if(!loadingAction){
load();
}
},10000);

return()=>clearInterval(interval);

},[loadingAction]);

function action(id,type){

if(loadingAction) return;

setLoadingAction(id);

api.bookingAction(id,type).then(async(res)=>{

if(!res.ok){
alert("Ошибка изменения статуса");
setLoadingAction(null);
return;
}

await load();
setLoadingAction(null);

}).catch(()=>{
alert("Ошибка сервера");
setLoadingAction(null);
});

}

const filteredBookings = bookings;

const selectedBooking = useMemo(()=>{
return filteredBookings.find(b=>String(b.id)===String(selectedBookingId)) || null;
},[filteredBookings, selectedBookingId]);

return(

<PageSection title="Записи салона">

<div style={{
display:"grid",
gridTemplateColumns:"320px 1fr",
gap:"24px"
}}>

{/* список */}

<div style={{
border:"1px solid #e5e7eb",
borderRadius:"10px",
overflow:"hidden",
background:"#fff"
}}>

{filteredBookings.map(b=>{

const active = String(selectedBookingId)===String(b.id);

return(

<div
key={b.id}
onClick={()=>setSelectedBookingId(b.id)}
style={{
padding:"10px 12px",
borderBottom:"1px solid #eee",
cursor:"pointer",
background:active?"#f3f4f6":"#fff"
}}
>

<div style={{display:"flex",justifyContent:"space-between"}}>
<b>BR-{b.id}</b>
<span style={{color:statusColor(b.status)}}>{statusText(b.status)}</span>
</div>

<div style={{fontSize:"13px",color:"#666"}}>
{formatDate(b.start_at)}
</div>

<div style={{fontSize:"13px"}}>
{b.client_name || "—"}
</div>

</div>

);

})}

</div>

{/* карточка */}

<div style={{
border:"1px solid #e5e7eb",
borderRadius:"12px",
padding:"20px",
background:"#fff"
}}>

{!selectedBooking ? (

<EmptyState title="Выберите запись"/>

):( 

<>

<h2>BR-{selectedBooking.id}</h2>

<p><b>Статус:</b> {statusText(selectedBooking.status)}</p>
<p><b>Мастер:</b> {selectedBooking.master_name || "—"}</p>
<p><b>Услуга:</b> {selectedBooking.service_name || "—"}</p>
<p><b>Цена:</b> {formatMoney(selectedBooking.price)}</p>
<p><b>Дата:</b> {formatDate(selectedBooking.start_at)}</p>
<p><b>Клиент:</b> {selectedBooking.client_name || "—"}</p>
<p><b>Телефон:</b> {selectedBooking.phone || "—"}</p>

<div style={{marginTop:"16px"}}>

<button onClick={()=>action(selectedBooking.id,"confirm")}>Подтвердить</button>
<button onClick={()=>action(selectedBooking.id,"complete")} style={{marginLeft:"6px"}}>Завершить</button>
<button onClick={()=>action(selectedBooking.id,"cancel")} style={{marginLeft:"6px"}}>Отменить</button>

</div>

</>

)}

</div>

</div>

</PageSection>

);

}