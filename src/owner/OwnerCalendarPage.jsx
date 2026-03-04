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

<h2 style={{marginBottom:"20px"}}>Календарь мастеров</h2>

{masters.map(m=>{

const masterBookings =
bookings.filter(b=>b.master_name === m.name);

return(

<div
key={m.id}
style={{
border:"1px solid #e5e7eb",
borderRadius:"10px",
padding:"14px",
marginBottom:"18px",
background:"#ffffff",
boxShadow:"0 3px 10px rgba(0,0,0,0.05)"
}}
>

<div
style={{
fontWeight:"600",
marginBottom:"12px",
color:"#2563eb",
fontSize:"15px"
}}
>
👤 {m.name}
</div>

{masterBookings.length===0 && (

<div
style={{
background:"#f3f4f6",
padding:"8px",
borderRadius:"6px",
color:"#6b7280",
fontSize:"13px"
}}
>
Нет записей
</div>

)}

{masterBookings.map(b=>(

<div
key={b.id}
style={{
padding:"8px",
marginBottom:"6px",
background:"#ecfdf5",
borderRadius:"6px",
display:"flex",
justifyContent:"space-between",
alignItems:"center",
fontSize:"14px"
}}
>

<span style={{fontWeight:"600",color:"#059669"}}>
{formatTime(b.start_at)}
</span>

<span>
{b.client_name || "клиент"}
</span>

</div>

))}

</div>

);

})}

</div>

);

}