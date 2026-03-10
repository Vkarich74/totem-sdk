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

if(status==="reserved") return "Ожидает подтверждения";
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

function rowHoverStyle(e, enter){
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

try{

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

}catch(e){

console.error("BOOKING ACTION ERROR",e);
alert("Ошибка сервера");
setLoadingAction(null);

}

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

},[selectedBookingId, filteredBookings]);

const selectedBooking = useMemo(()=>{
return filteredBookings.find(b=>String(b.id)===String(selectedBookingId)) || null;
},[filteredBookings, selectedBookingId]);

const selectedMaster = useMemo(()=>{
if(!selectedBooking) return null;
return masters.find(m=>String(m.id)===String(selectedBooking.master_id)) || null;
},[masters, selectedBooking]);

return(

<div
style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
height:"100%"
}}
>

<div
style={{
borderRight:"1px solid #e5e7eb",
padding:"20px",
overflowY:"auto"
}}
>

<h3>Записи</h3>

<div style={{marginBottom:"12px"}}>

<button onClick={()=>setFilter("today")} style={{marginRight:"6px"}}>
Сегодня
</button>

<button onClick={()=>setFilter("week")} style={{marginRight:"6px"}}>
Неделя
</button>

<button onClick={()=>setFilter("all")}>
Все
</button>

</div>

<div style={{marginBottom:"12px"}}>

<input
placeholder="Поиск: имя или телефон"
value={search}
onChange={e=>setSearch(e.target.value)}
style={{
width:"100%",
padding:"6px",
border:"1px solid #e5e7eb",
borderRadius:"6px"
}}
/>

</div>

{filteredBookings.length===0 && (
<div
style={{
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"16px",
background:"#fff",
color:"#6b7280"
}}
>
Записей пока нет
</div>
)}

{filteredBookings.map(b=>(

<div
key={b.id}
onClick={()=>setSelectedBookingId(b.id)}
onMouseEnter={(e)=>rowHoverStyle(e,true)}
onMouseLeave={(e)=>rowHoverStyle(e,false)}
style={{
border:"1px solid #e5e7eb",
borderLeft:`6px solid ${statusColor(b.status)}`,
borderRadius:"8px",
padding:"12px",
marginBottom:"10px",
background:String(selectedBookingId)===String(b.id) ? "#f9fafb" : "#fff",
cursor:"pointer"
}}
>

<div style={{display:"flex",justifyContent:"space-between",gap:"12px"}}>

<div>
<b>BR-{String(b.id).padStart(5,"0")}</b>
</div>

<div style={{color:statusColor(b.status),fontWeight:"600"}}>
{statusText(b.status)}
</div>

</div>

<div>Клиент: {b.client_name || "—"}</div>
<div>Телефон: {b.phone || "—"}</div>
<div>Мастер: {b.master_name || "—"}</div>
<div>Услуга: {b.service_name || "—"}</div>
<div>{formatDate(b.start_at)}</div>

<div style={{marginTop:"8px"}}>

{b.status==="reserved" && (

<>
<button
disabled={loadingAction===b.id}
onClick={(e)=>{
e.stopPropagation();
action(b.id,"confirm");
}}
>
Подтвердить
</button>

<button
disabled={loadingAction===b.id}
onClick={(e)=>{
e.stopPropagation();
action(b.id,"cancel");
}}
style={{marginLeft:"6px"}}
>
Отменить
</button>
</>

)}

{b.status==="confirmed" && (

<>
<button
disabled={loadingAction===b.id}
onClick={(e)=>{
e.stopPropagation();
action(b.id,"complete");
}}
>
Завершить
</button>

<button
disabled={loadingAction===b.id}
onClick={(e)=>{
e.stopPropagation();
action(b.id,"cancel");
}}
style={{marginLeft:"6px"}}
>
Отменить
</button>
</>

)}

</div>

</div>

))}

</div>

<div
style={{
padding:"20px",
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
background:"#fff",
color:"#6b7280"
}}
>
Выберите запись слева
</div>

) : (

<div
style={{
border:"1px solid #e5e7eb",
borderRadius:"10px",
padding:"16px",
background:"#fff"
}}
>

<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",gap:"12px"}}>
<div style={{fontSize:"18px",fontWeight:"700"}}>
BR-{String(selectedBooking.id).padStart(5,"0")}
</div>
<div style={{color:statusColor(selectedBooking.status),fontWeight:"700"}}>
{statusText(selectedBooking.status)}
</div>
</div>

<div style={{marginBottom:"8px"}}>
<b>Мастер:</b> {selectedBooking.master_name || selectedMaster?.name || "—"}
</div>

<div style={{marginBottom:"8px"}}>
<b>Услуга:</b> {selectedBooking.service_name || "—"}
</div>

<div style={{marginBottom:"8px"}}>
<b>Цена:</b> {formatMoney(selectedBooking.price)}
</div>

<div style={{marginBottom:"8px"}}>
<b>Дата и время:</b> {formatDate(selectedBooking.start_at)}
</div>

<div style={{marginBottom:"8px"}}>
<b>Клиент:</b> {selectedBooking.client_name || "—"}
</div>

<div style={{marginBottom:"8px"}}>
<b>Телефон:</b> {selectedBooking.phone || "—"}
</div>

<div style={{marginTop:"16px"}}>

{selectedBooking.status==="reserved" && (
<>
<button
disabled={loadingAction===selectedBooking.id}
onClick={()=>action(selectedBooking.id,"confirm")}
>
Подтвердить
</button>

<button
disabled={loadingAction===selectedBooking.id}
onClick={()=>action(selectedBooking.id,"cancel")}
style={{marginLeft:"6px"}}
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
>
Завершить
</button>

<button
disabled={loadingAction===selectedBooking.id}
onClick={()=>action(selectedBooking.id,"cancel")}
style={{marginLeft:"6px"}}
>
Отменить
</button>
</>
)}

{selectedBooking.phone && (
<button
onClick={()=>window.location.href=`tel:${selectedBooking.phone}`}
style={{marginLeft:"6px"}}
>
Позвонить
</button>
)}

</div>

</div>

)}

</div>

</div>

);

}