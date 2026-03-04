import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import * as api from "../api/internal";
import { getSalonSlug } from "../utils/salon";
import { generateTimeSlots } from "../calendar/calendarEngine";

export default function OwnerCalendarPage(){

const navigate = useNavigate();

const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);

const salonSlug = getSalonSlug();

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
`https://api.totemv.com/internal/bookings/create`,
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
`https://api.totemv.com/internal/bookings/${booking.id}/move`,
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

<div style={{padding:"20px"}}>

<h2 style={{marginBottom:"20px"}}>Календарь дня</h2>

<div style={{
display:"grid",
gridTemplateColumns:`120px repeat(${masters.length},1fr)`,
border:"1px solid #e5e7eb"
}}>

<div style={{background:"#f9fafb"}}></div>

{masters.map(m=>(

<div
key={m.id}
style={{
padding:"8px",
borderLeft:"1px solid #e5e7eb",
background:"#f9fafb",
fontWeight:"600"
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
fontSize:"13px"
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
minHeight:"36px",
background: b ? "#d1fae5" : "#ffffff",
fontSize:"13px",
cursor:"pointer"
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

<div>

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

);

}