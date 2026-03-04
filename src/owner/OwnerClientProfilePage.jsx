import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

export default function OwnerClientProfilePage(){

const { clientId } = useParams();

const [client,setClient] = useState(null);
const [bookings,setBookings] = useState([]);
const [error,setError] = useState("");

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

try{

setError("");

const rc = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/clients`
);

const jc = await rc.json();

if(!jc.ok){
setError("CLIENTS_FETCH_FAILED");
return;
}

const idNum = Number(clientId);

const found = (jc.clients || []).find(c => Number(c.id) === idNum);

if(!found){
setError("CLIENT_NOT_FOUND");
return;
}

setClient(found);

const rb = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/bookings`
);

const jb = await rb.json();

if(!jb.ok){
setError("BOOKINGS_FETCH_FAILED");
return;
}

const list = (jb.bookings || []).filter(b => {

const bid = b.client_id != null ? Number(b.client_id) : null;

if(bid != null && bid === Number(found.id)) return true;

const phoneA = (b.phone || "").trim();
const phoneB = (found.phone || "").trim();
if(phoneA && phoneB && phoneA === phoneB) return true;

const nameA = (b.client_name || "").trim().toLowerCase();
const nameB = (found.name || "").trim().toLowerCase();
if(nameA && nameB && nameA === nameB) return true;

return false;

});

setBookings(list);

}catch(e){

console.error("CLIENT PROFILE LOAD ERROR",e);
setError("CLIENT_PROFILE_LOAD_ERROR");

}

}

useEffect(()=>{
load();
},[]);

const revenue = useMemo(()=>{

return bookings.reduce((sum,b)=>{
const v = Number(b.price ?? b.amount ?? b.total ?? 0);
return sum + (Number.isFinite(v) ? v : 0);
},0);

},[bookings]);

if(error){

return(
<div style={{padding:"20px"}}>
<div style={{fontWeight:"700",marginBottom:"10px"}}>Ошибка</div>
<div>{error}</div>
</div>
);

}

if(!client){
return <div style={{padding:"20px"}}>Загрузка...</div>;
}

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
Выручка клиента: {revenue} ₽
</div>

</div>

<h3 style={{marginBottom:"10px"}}>История записей</h3>

{bookings.length === 0 && (
<div style={{color:"#6b7280"}}>Записей нет</div>
)}

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

<div>Дата: {b.start_at || "—"}</div>
<div>Мастер: {b.master_name || "—"}</div>
<div>Статус: {b.status || "—"}</div>

</div>

))}

</div>

);

}