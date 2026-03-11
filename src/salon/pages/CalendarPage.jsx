import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../../api/internal";
import { getSalonSlug } from "../../utils/salon";
import { generateTimeSlots } from "../../calendar/calendarEngine";
import PageSection from "../../cabinet/PageSection";

const API_BASE = import.meta.env.VITE_API_BASE;

function resolveSlug(){
const util = getSalonSlug();
if(util) return util;

const parts = window.location.pathname.split("/");
return parts[2] || "totem-demo-salon";
}

export default function CalendarPage(){

const navigate = useNavigate();

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const salonSlug = resolveSlug();

async function load(){

try{

const resBookings = await api.getBookings(salonSlug);

if(resBookings.ok){
setBookings(resBookings.bookings || []);
}

const resMasters = await api.getMasters(salonSlug);

if(resMasters.ok){
setMasters(resMasters.masters || []);
}

}catch(e){

console.error("CALENDAR LOAD ERROR",e);

}

}

useEffect(()=>{
load();
},[]);

function formatTime(d){

if(!d) return "";

const date = new Date(d);

return date.toLocaleTimeString("ru-RU",{
hour:"2-digit",
minute:"2-digit"
});

}

const slots = generateTimeSlots();

function findBooking(masterName,time){

return bookings.find(b=>{

if(b.master_name!==masterName) return false;

const t = formatTime(b.start_at);

return t===time;

});

}

async function createBooking(master,time){

const client = prompt("Имя клиента");

if(!client) return;

try{

await fetch(
`${API_BASE}/internal/bookings/create`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
salon_slug:salonSlug,
master_name:master.name,
client_name:client,
start_at:time
})
}
);

load();

}catch(e){

console.error("CREATE BOOKING ERROR",e);

}

}

async function moveBooking(booking){

const newTime = prompt("Новое время (например 12:00)", formatTime(booking.start_at));

if(!newTime) return;

try{

await fetch(
`${API_BASE}/internal/bookings/${booking.id}/move`,
{
method:"PATCH",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
start_at:newTime
})
}
);

load();

}catch(e){

console.error("MOVE BOOKING ERROR",e);

}

}

return(

<PageSection title="Календарь салона">

<div style={{
overflow:"auto",
maxHeight:"calc(100vh - 220px)"
}}>

<div style={{
display:"grid",
gridTemplateColumns:`120px repeat(${masters.length},1fr)`,
border:"1px solid #e5e7eb",
borderRadius:"10px",
background:"#fff",
minWidth:"900px"
}}>

<div style={{
background:"#f9fafb",
position:"sticky",
top:0,
left:0,
zIndex:5
}}></div>

{masters.map(m=>(

<div
key={m.id}
style={{
padding:"10px",
borderLeft:"1px solid #e5e7eb",
background:"#f9fafb",
fontWeight:"600",
position:"sticky",
top:0,
zIndex:4,
textAlign:"center"
}}
>
{m.name}
</div>

))}

{slots.map(time=>(

<>

<div
key={time}
style={{
padding:"8px",
borderTop:"1px solid #e5e7eb",
background:"#fafafa",
fontSize:"13px",
position:"sticky",
left:0,
zIndex:3,
fontWeight:"500"
}}
>
{time}
</div>

{masters.map(m=>{

const b = findBooking(m.name,time);

return(

<div
key={m.id+time}
style={{
borderTop:"1px solid #e5e7eb",
borderLeft:"1px solid #e5e7eb",
padding:"6px",
minHeight:"40px",
background: b ? "#d1fae5" : "#ffffff",
fontSize:"13px",
cursor:"pointer",
display:"flex",
alignItems:"center",
justifyContent:"center"
}}

onClick={()=>{

if(b){
moveBooking(b);
}else{
createBooking(m,time);
}

}}

>

{b && (

<div style={{textAlign:"center"}}>

<div
style={{fontWeight:"600",cursor:"pointer"}}
onClick={(e)=>{
e.stopPropagation();
navigate(`/owner/client/${b.client_id}`);
}}
>
{b.client_name || "клиент"}
</div>

</div>

)}

{!b && (
<div style={{color:"#9ca3af"}}>+</div>
)}

</div>

);

})}

</>

))}

</div>

</div>

</PageSection>

);

}