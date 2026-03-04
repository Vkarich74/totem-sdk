import { useEffect, useState } from "react";

export default function OwnerBookingsPage(){

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const [filter,setFilter] = useState("today");
const [search,setSearch] = useState("");

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

try{

const r = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/bookings`
);

const j = await r.json();

if(j.ok){

const sorted = (j.bookings || []).sort((a,b)=>{
if(!a.start_at) return 1;
if(!b.start_at) return -1;
return new Date(a.start_at) - new Date(b.start_at);
});

setBookings(sorted);

}

const rm = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/masters`
);

const jm = await rm.json();

if(jm.ok){
setMasters(jm.masters || []);
}

}catch(e){

console.error("LOAD BOOKINGS ERROR",e);

}

}

useEffect(()=>{

load();

const interval = setInterval(()=>{
load();
},10000);

return ()=>{
clearInterval(interval);
};

},[]);

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

try{

const r = await fetch(
`https://api.totemv.com/internal/bookings/${id}/${type}`,
{
method:"PATCH"
}
);

const j = await r.json();

if(!j.ok){
console.error("BOOKING ACTION FAILED",j);
return;
}

load();

}catch(e){

console.error("BOOKING ACTION ERROR",e);

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
<button onClick={()=>action(b.id,"confirm")}>
Подтвердить
</button>

<button onClick={()=>action(b.id,"cancel")} style={{marginLeft:"6px"}}>
Отменить
</button>
</>

)}

{b.status==="confirmed" && (

<>
<button onClick={()=>action(b.id,"complete")}>
Завершить
</button>

<button onClick={()=>action(b.id,"cancel")} style={{marginLeft:"6px"}}>
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
overflowY:"auto"
}}
>

<h3>Календарь мастеров</h3>

{masters.map(m=>{

const masterBookings =
filteredBookings.filter(b => b.master_name === m.name);

return(

<div
key={m.id}
style={{
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"12px",
marginBottom:"12px"
}}
>

<div style={{fontWeight:"600"}}>
{m.name}
</div>

{masterBookings.length === 0 && (
<div style={{color:"#6b7280"}}>
Нет записей
</div>
)}

{masterBookings.map(b=>(

<div
key={b.id}
style={{
marginTop:"6px",
padding:"6px",
background:"#f3f4f6",
borderRadius:"6px"
}}
>

{formatDate(b.start_at)} — {b.client_name || "клиент"}

</div>

))}

</div>

);

})}

</div>

</div>

);

}