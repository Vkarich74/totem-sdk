import { useEffect, useState } from "react";

export default function OwnerCalendarPage(){

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

try{

const rb = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/bookings`
);

const jb = await rb.json();

if(jb.ok){
setBookings(jb.bookings || []);
}

const rm = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/masters`
);

const jm = await rm.json();

if(jm.ok){
setMasters(jm.masters || []);
}

}catch(e){

console.error("CALENDAR LOAD ERROR",e);

}

}

useEffect(()=>{
load();
},[]);

function formatTime(d){

if(!d) return "—";

const date = new Date(d);

return date.toLocaleTimeString("ru-RU",{
hour:"2-digit",
minute:"2-digit"
});

}

return(

<div style={{padding:"20px"}}>

<h2>Календарь мастеров</h2>

{masters.map(m=>{

const masterBookings =
bookings.filter(b=>b.master_name === m.name);

return(

<div
key={m.id}
style={{
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"12px",
marginBottom:"16px"
}}
>

<div style={{fontWeight:"600",marginBottom:"10px"}}>
{m.name}
</div>

{masterBookings.length===0 && (
<div style={{color:"#6b7280"}}>
Нет записей
</div>
)}

{masterBookings.map(b=>(

<div
key={b.id}
style={{
padding:"6px",
marginBottom:"6px",
background:"#f3f4f6",
borderRadius:"6px"
}}
>

{formatTime(b.start_at)} — {b.client_name || "клиент"}

</div>

))}

</div>

);

})}

</div>

);

}