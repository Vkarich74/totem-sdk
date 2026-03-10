import { useEffect, useMemo, useState } from "react";
import * as api from "../../api/internal";
import { getSalonSlug } from "../../utils/salon";

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
return date.toLocaleString("ru-RU",{
day:"2-digit",
month:"2-digit",
hour:"2-digit",
minute:"2-digit"
});
}

function formatMoney(v){
if(v===null || v===undefined || v==="") return "—";
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

console.error("LOAD BOOKINGS ERROR",e);

}

}

useEffect(()=>{

load();

const interval = setInterval(()=>{
if(!loadingAction){
load();
}
},10000);

return ()=>{
clearInterval(interval);
};

},[loadingAction]);

function action(id,type){

if(loadingAction) return;

setLoadingAction(id);

api.bookingAction(id,type).then(async (res)=>{

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

function applyFilters(list){

let result = [...list];

if(search){

const q = search.toLowerCase();

result = result.filter(b=>
(b.client_name || "").toLowerCase().includes(q) ||
(b.phone || "").toLowerCase().includes(q)
);

}

return result;

}

const filteredBookings = applyFilters(bookings);

const selectedBooking = useMemo(()=>{
return filteredBookings.find(b=>String(b.id)===String(selectedBookingId)) || null;
},[filteredBookings, selectedBookingId]);

return(

<div
style={{
display:"grid",
gridTemplateColumns:"420px 1fr",
height:"100%"
}}
>

{/* список */}

<div
style={{
borderRight:"1px solid #e5e7eb",
padding:"20px",
overflowY:"auto"
}}
>

<h3>Записи</h3>

<input
placeholder="Поиск"
value={search}
onChange={e=>setSearch(e.target.value)}
style={{
width:"100%",
marginBottom:"16px",
padding:"8px",
border:"1px solid #e5e7eb",
borderRadius:"6px"
}}
/>

{filteredBookings.map(b=>(

<div
key={b.id}
onClick={()=>setSelectedBookingId(b.id)}
style={{
border:"1px solid #e5e7eb",
borderLeft:`6px solid ${statusColor(b.status)}`,
borderRadius:"8px",
padding:"10px",
marginBottom:"8px",
cursor:"pointer",
background:selectedBookingId===b.id?"#f3f4f6":"#fff"
}}
>

<div style={{display:"flex",justifyContent:"space-between"}}>

<b>BR-{b.id}</b>

<span style={{color:statusColor(b.status)}}>
{statusText(b.status)}
</span>

</div>

<div style={{fontSize:"13px",color:"#6b7280"}}>
{formatDate(b.start_at)}
</div>

<div style={{fontSize:"14px"}}>
{b.client_name || "—"}
</div>

</div>

))}

</div>

{/* карточка */}

<div
style={{
padding:"24px",
overflowY:"auto",
background:"#fafafa"
}}
>

<h3>Карточка записи</h3>

{!selectedBooking ? (

<div
style={{
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"16px",
background:"#fff"
}}
>
Выберите запись
</div>

) : (

<div
style={{
border:"1px solid #e5e7eb",
borderRadius:"12px",
padding:"20px",
background:"#fff",
maxWidth:"520px"
}}
>

<h2 style={{marginBottom:"10px"}}>
BR-{selectedBooking.id}
</h2>

<div><b>Статус:</b> {statusText(selectedBooking.status)}</div>
<div><b>Мастер:</b> {selectedBooking.master_name || "—"}</div>
<div><b>Услуга:</b> {selectedBooking.service_name || "—"}</div>
<div><b>Цена:</b> {formatMoney(selectedBooking.price)}</div>
<div><b>Дата:</b> {formatDate(selectedBooking.start_at)}</div>
<div><b>Клиент:</b> {selectedBooking.client_name || "—"}</div>
<div><b>Телефон:</b> {selectedBooking.phone || "—"}</div>

<div style={{marginTop:"16px"}}>

<button
onClick={()=>action(selectedBooking.id,"confirm")}
style={{marginRight:"6px"}}
>
Подтвердить
</button>

<button
onClick={()=>action(selectedBooking.id,"complete")}
style={{marginRight:"6px"}}
>
Завершить
</button>

<button
onClick={()=>action(selectedBooking.id,"cancel")}
>
Отменить
</button>

</div>

</div>

)}

</div>

</div>

);

}