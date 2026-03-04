import { useEffect, useState } from "react";

export default function OwnerBookingsPage(){

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

const r = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/bookings`
);

const j = await r.json();

if(j.ok){
setBookings(j.bookings);
}

const rm = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/masters`
);

const jm = await rm.json();

if(jm.ok){
setMasters(jm.masters);
}

}

useEffect(()=>{
load();
},[]);

function formatDate(d){

const date = new Date(d);

return date.toLocaleString("ru-RU",{
day:"2-digit",
month:"2-digit",
hour:"2-digit",
minute:"2-digit"
});

}

async function action(id,type){

await fetch(
`https://api.totemv.com/internal/bookings/${id}/${type}`,
{
method:"PATCH"
}
);

load();

}

return(

<div
style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
height:"100%"
}}
>

{/* BOOKINGS */}

<div
style={{
borderRight:"1px solid #e5e7eb",
padding:"20px",
overflowY:"auto"
}}
>

<h3>Записи</h3>

{bookings.map(b=>(

<div
key={b.id}
style={{
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"12px",
marginBottom:"10px",
background:"#fff"
}}
>

<div><b>BR-{String(b.id).padStart(5,"0")}</b></div>

<div>Клиент: {b.client_name || "—"}</div>

<div>Телефон: {b.phone || "—"}</div>

<div>Мастер: {b.master_name}</div>

<div>{formatDate(b.start_at)}</div>

<div>Статус: {b.status}</div>

<div style={{marginTop:"8px"}}>

{b.status==="reserved" && (

<>
<button onClick={()=>action(b.id,"confirm")}>
Подтвердить
</button>

<button
onClick={()=>action(b.id,"cancel")}
style={{marginLeft:"6px"}}
>
Отменить
</button>
</>

)}

{b.status==="confirmed" && (

<>
<button onClick={()=>action(b.id,"complete")}>
Завершить
</button>

<button
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

{/* MASTER CALENDAR */}

<div
style={{
padding:"20px",
overflowY:"auto"
}}
>

<h3>Календарь мастеров</h3>

{masters.map(m=>{

const masterBookings =
bookings.filter(b => b.master_name === m.name);

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

}import { useEffect, useState } from "react";

export default function OwnerBookingsPage(){

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

const r = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/bookings`
);

const j = await r.json();

if(j.ok){
setBookings(j.bookings);
}

const rm = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/masters`
);

const jm = await rm.json();

if(jm.ok){
setMasters(jm.masters);
}

}

useEffect(()=>{
load();
},[]);

function formatDate(d){

const date = new Date(d);

return date.toLocaleString("ru-RU",{
day:"2-digit",
month:"2-digit",
hour:"2-digit",
minute:"2-digit"
});

}

async function action(id,type){

await fetch(
`https://api.totemv.com/internal/bookings/${id}/${type}`,
{
method:"PATCH"
}
);

load();

}

return(

<div
style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
height:"100%"
}}
>

{/* BOOKINGS */}

<div
style={{
borderRight:"1px solid #e5e7eb",
padding:"20px",
overflowY:"auto"
}}
>

<h3>Записи</h3>

{bookings.map(b=>(

<div
key={b.id}
style={{
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"12px",
marginBottom:"10px",
background:"#fff"
}}
>

<div><b>BR-{String(b.id).padStart(5,"0")}</b></div>

<div>Клиент: {b.client_name || "—"}</div>

<div>Телефон: {b.phone || "—"}</div>

<div>Мастер: {b.master_name}</div>

<div>{formatDate(b.start_at)}</div>

<div>Статус: {b.status}</div>

<div style={{marginTop:"8px"}}>

{b.status==="reserved" && (

<>
<button onClick={()=>action(b.id,"confirm")}>
Подтвердить
</button>

<button
onClick={()=>action(b.id,"cancel")}
style={{marginLeft:"6px"}}
>
Отменить
</button>
</>

)}

{b.status==="confirmed" && (

<>
<button onClick={()=>action(b.id,"complete")}>
Завершить
</button>

<button
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

{/* MASTER CALENDAR */}

<div
style={{
padding:"20px",
overflowY:"auto"
}}
>

<h3>Календарь мастеров</h3>

{masters.map(m=>{

const masterBookings =
bookings.filter(b => b.master_name === m.name);

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