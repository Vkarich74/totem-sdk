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

function rowHoverStyle(e, enter, active){
if(active) return;
if(enter){
e.currentTarget.style.background = "#f9fafb";
}else{
e.currentTarget.style.background = "#fff";
}
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

}).catch((e)=>{
console.error("BOOKING ACTION ERROR",e);
alert("Ошибка сервера");
setLoadingAction(null);
});

}

function applyFilters(list){

let result = [...list];
const now = new Date();

if(filter==="today"){

const start = new Date();
start.setHours(0,0,0,0);

const end = new Date();
end.setHours(23,59,59,999);

result = result.filter(b=>{
if(!b.start_at) return false;
const d = new Date(b.start_at);
return d>=start && d<=end;
});

}

if(filter==="week"){

const start = new Date();
start.setDate(now.getDate() - now.getDay() + 1);
start.setHours(0,0,0,0);

const end = new Date(start);
end.setDate(start.getDate()+7);

result = result.filter(b=>{
if(!b.start_at) return false;
const d = new Date(b.start_at);
return d>=start && d<end;
});

}

if(search){

const q = search.toLowerCase();

result = result.filter(b=>
(b.client_name || "").toLowerCase().includes(q) ||
(b.phone || "").toLowerCase().includes(q) ||
(b.master_name || "").toLowerCase().includes(q) ||
(b.service_name || "").toLowerCase().includes(q)
);

}

return result;

}

const filteredBookings = applyFilters(bookings);

useEffect(()=>{

if(filteredBookings.length===0){
setSelectedBookingId(null);
return;
}

if(selectedBookingId===null){
setSelectedBookingId(filteredBookings[0].id);
return;
}

const exists = filteredBookings.some(b=>String(b.id)===String(selectedBookingId));

if(!exists){
setSelectedBookingId(filteredBookings[0].id);
}

},[filteredBookings, selectedBookingId]);

const selectedBooking = useMemo(()=>{
return filteredBookings.find(b=>String(b.id)===String(selectedBookingId)) || null;
},[filteredBookings, selectedBookingId]);

const selectedMaster = useMemo(()=>{
if(!selectedBooking) return null;
return masters.find(m=>String(m.id)===String(selectedBooking.master_id)) || null;
},[masters, selectedBooking]);

return(

<PageSection title="Записи салона">

<div style={{marginBottom:"16px",display:"flex",gap:"8px",flexWrap:"wrap"}}>

<button
onClick={()=>setFilter("today")}
style={{
padding:"8px 12px",
border:"1px solid #e5e7eb",
borderRadius:"8px",
background:filter==="today" ? "#111827" : "#fff",
color:filter==="today" ? "#fff" : "#111827",
cursor:"pointer"
}}
>
Сегодня
</button>

<button
onClick={()=>setFilter("week")}
style={{
padding:"8px 12px",
border:"1px solid #e5e7eb",
borderRadius:"8px",
background:filter==="week" ? "#111827" : "#fff",
color:filter==="week" ? "#fff" : "#111827",
cursor:"pointer"
}}
>
Неделя
</button>

<button
onClick={()=>setFilter("all")}
style={{
padding:"8px 12px",
border:"1px solid #e5e7eb",
borderRadius:"8px",
background:filter==="all" ? "#111827" : "#fff",
color:filter==="all" ? "#fff" : "#111827",
cursor:"pointer"
}}
>
Все
</button>

</div>

<div style={{marginBottom:"16px"}}>
<input
placeholder="Поиск: клиент, телефон, мастер, услуга"
value={search}
onChange={e=>setSearch(e.target.value)}
style={{
width:"100%",
maxWidth:"480px",
padding:"10px 12px",
border:"1px solid #e5e7eb",
borderRadius:"8px",
background:"#fff"
}}
/>
</div>

{filteredBookings.length===0 ? (

<EmptyState
title="Записей пока нет"
message="Записи появятся после бронирований"
/>

) : (

<div
style={{
display:"grid",
gridTemplateColumns:"360px minmax(0,1fr)",
gap:"20px",
alignItems:"start"
}}
>

<div
style={{
display:"flex",
flexDirection:"column",
gap:"10px"
}}
>

{filteredBookings.map(b=>{

const active = String(selectedBookingId)===String(b.id);

return(
<div
key={b.id}
onClick={()=>setSelectedBookingId(b.id)}
onMouseEnter={(e)=>rowHoverStyle(e,true,active)}
onMouseLeave={(e)=>rowHoverStyle(e,false,active)}
style={{
border:"1px solid #e5e7eb",
borderLeft:`6px solid ${statusColor(b.status)}`,
borderRadius:"10px",
padding:"12px",
background:active ? "#f3f4f6" : "#fff",
cursor:"pointer",
transition:"background 0.15s ease"
}}
>

<div style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"center"}}>
<div style={{fontWeight:"700"}}>BR-{String(b.id).padStart(5,"0")}</div>
<div style={{fontSize:"13px",fontWeight:"600",color:statusColor(b.status)}}>
{statusText(b.status)}
</div>
</div>

<div style={{fontSize:"13px",color:"#6b7280",marginTop:"6px"}}>
{formatDate(b.start_at)}
</div>

<div style={{marginTop:"8px",fontSize:"14px",fontWeight:"600"}}>
{b.client_name || "—"}
</div>

<div style={{marginTop:"4px",fontSize:"13px",color:"#6b7280"}}>
{b.phone || "—"}
</div>

<div style={{marginTop:"4px",fontSize:"13px",color:"#6b7280"}}>
{b.master_name || "—"} · {b.service_name || "—"}
</div>

</div>
);
})}

</div>

<div
style={{
border:"1px solid #e5e7eb",
borderRadius:"12px",
padding:"20px",
background:"#fff",
minHeight:"320px"
}}
>

{!selectedBooking ? (

<EmptyState
title="Выберите запись"
message="Выберите запись слева, чтобы открыть карточку"
/>

) : (

<>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"16px",flexWrap:"wrap"}}>
<div style={{fontSize:"22px",fontWeight:"700"}}>
BR-{String(selectedBooking.id).padStart(5,"0")}
</div>

<div
style={{
padding:"6px 10px",
borderRadius:"999px",
background:"#f9fafb",
border:`1px solid ${statusColor(selectedBooking.status)}`,
color:statusColor(selectedBooking.status),
fontWeight:"700",
fontSize:"13px"
}}
>
{statusText(selectedBooking.status)}
</div>
</div>

<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"12px 20px"}}>
<div>
<div style={{fontSize:"12px",color:"#6b7280",marginBottom:"4px"}}>Мастер</div>
<div>{selectedBooking.master_name || selectedMaster?.name || "—"}</div>
</div>

<div>
<div style={{fontSize:"12px",color:"#6b7280",marginBottom:"4px"}}>Услуга</div>
<div>{selectedBooking.service_name || "—"}</div>
</div>

<div>
<div style={{fontSize:"12px",color:"#6b7280",marginBottom:"4px"}}>Цена</div>
<div>{formatMoney(selectedBooking.price)}</div>
</div>

<div>
<div style={{fontSize:"12px",color:"#6b7280",marginBottom:"4px"}}>Дата и время</div>
<div>{formatDate(selectedBooking.start_at)}</div>
</div>

<div>
<div style={{fontSize:"12px",color:"#6b7280",marginBottom:"4px"}}>Клиент</div>
<div>{selectedBooking.client_name || "—"}</div>
</div>

<div>
<div style={{fontSize:"12px",color:"#6b7280",marginBottom:"4px"}}>Телефон</div>
<div>{selectedBooking.phone || "—"}</div>
</div>
</div>

<div style={{marginTop:"20px",display:"flex",gap:"8px",flexWrap:"wrap"}}>

{selectedBooking.status==="reserved" && (
<>
<button
disabled={loadingAction===selectedBooking.id}
onClick={()=>action(selectedBooking.id,"confirm")}
style={{
padding:"10px 14px",
border:"1px solid #d1d5db",
borderRadius:"8px",
background:"#fff",
cursor:"pointer"
}}
>
Подтвердить
</button>

<button
disabled={loadingAction===selectedBooking.id}
onClick={()=>action(selectedBooking.id,"cancel")}
style={{
padding:"10px 14px",
border:"1px solid #d1d5db",
borderRadius:"8px",
background:"#fff",
cursor:"pointer"
}}
>
Отменить
</button>
</>
)}

{selectedBooking.status==="confirmed" && (
<>
<button
disabled={loadingAction===selectedBooking.id}
onClick={()=>action(selectedBooking.id,"complete")}
style={{
padding:"10px 14px",
border:"1px solid #d1d5db",
borderRadius:"8px",
background:"#fff",
cursor:"pointer"
}}
>
Завершить
</button>

<button
disabled={loadingAction===selectedBooking.id}
onClick={()=>action(selectedBooking.id,"cancel")}
style={{
padding:"10px 14px",
border:"1px solid #d1d5db",
borderRadius:"8px",
background:"#fff",
cursor:"pointer"
}}
>
Отменить
</button>
</>
)}

{selectedBooking.phone && (
<button
onClick={()=>window.location.href=`tel:${selectedBooking.phone}`}
style={{
padding:"10px 14px",
border:"1px solid #d1d5db",
borderRadius:"8px",
background:"#fff",
cursor:"pointer"
}}
>
Позвонить
</button>
)}

</div>
</>
)}

</div>

</div>

)}

</PageSection>

);

}