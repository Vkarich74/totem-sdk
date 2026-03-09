import { useEffect, useState } from "react";
import * as api from "../../api/internal";
import { getSalonSlug } from "../../utils/salon";

function resolveSlug(){
const util = getSalonSlug();
if(util) return util;

const parts = window.location.pathname.split("/");
return parts[2] || "totem-demo-salon";
}

export default function OwnerBookingsPage(){

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const [filter,setFilter] = useState("today");
const [search,setSearch] = useState("");

const [loadingAction,setLoadingAction] = useState(null);

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

async function action(id,type){

if(loadingAction) return;

try{

setLoadingAction(id);

const res = await api.bookingAction(id,type);

if(!res.ok){
alert("Ошибка изменения статуса");
setLoadingAction(null);
return;
}

await load();

}catch(e){

console.error("BOOKING ACTION ERROR",e);
alert("Ошибка сервера");

}

setLoadingAction(null);

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
(b.phone || "").toLowerCase().includes(q)
);

}

return result;

}

const filteredBookings = applyFilters(bookings);

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

{filteredBookings.map(b=>(

<div
key={b.id}
style={{
border:"1px solid #e5e7eb",
borderLeft:`6px solid ${statusColor(b.status)}`,
borderRadius:"8px",
padding:"12px",
marginBottom:"10px",
background:"#fff"
}}
>

<div style={{display:"flex",justifyContent:"space-between"}}>

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
<div>{formatDate(b.start_at)}</div>

<div style={{marginTop:"8px"}}>

{b.status==="reserved" && (

<>
<button
disabled={loadingAction===b.id}
onClick={()=>action(b.id,"confirm")}
>
Подтвердить
</button>

<button
disabled={loadingAction===b.id}
onClick={()=>action(b.id,"cancel")}
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
onClick={()=>action(b.id,"complete")}
>
Завершить
</button>

<button
disabled={loadingAction===b.id}
onClick={()=>action(b.id,"cancel")}
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

</div>

);

}