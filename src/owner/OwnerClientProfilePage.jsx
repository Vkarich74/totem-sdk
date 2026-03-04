import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function OwnerClientProfilePage(){

const { clientId } = useParams();

const [client,setClient] = useState(null);
const [bookings,setBookings] = useState([]);

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

try{

const rc = await fetch(
`https://api.totemv.com/internal/clients/${clientId}`
);

const jc = await rc.json();

if(jc.ok){
setClient(jc.client);
}

const rb = await fetch(
`https://api.totemv.com/internal/clients/${clientId}/bookings`
);

const jb = await rb.json();

if(jb.ok){
setBookings(jb.bookings || []);
}

}catch(e){

console.error("CLIENT PROFILE LOAD ERROR",e);

}

}

useEffect(()=>{
load();
},[]);

if(!client){
return <div style={{padding:"20px"}}>Загрузка...</div>;
}

/* расчет LTV клиента */

const revenue = bookings.reduce((sum,b)=>{
return sum + (b.price || 0);
},0);

return(

<div style={{padding:"20px"}}>

<h2 style={{marginBottom:"20px"}}>
Клиент: {client.name}
</h2>

<div style={{
border:"1px solid #e5e7eb",
padding:"16px",
borderRadius:"8px",
marginBottom:"20px"
}}>

<div>Телефон: {client.phone || "—"}</div>
<div>Визитов: {client.visits || 0}</div>
<div>Дата регистрации: {client.created_at || "—"}</div>

<div style={{
marginTop:"10px",
fontWeight:"600",
color:"#065f46"
}}>
Выручка клиента: {revenue} сом
</div>

</div>

<h3 style={{marginBottom:"10px"}}>История записей</h3>

{bookings.map(b=>(

<div
key={b.id}
style={{
border:"1px solid #e5e7eb",
padding:"10px",
borderRadius:"6px",
marginBottom:"8px"
}}
>

<div>Дата: {b.start_at}</div>
<div>Мастер: {b.master_name}</div>
<div>Статус: {b.status}</div>

</div>

))}

</div>

);

}