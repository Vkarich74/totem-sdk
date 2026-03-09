import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

export default function OwnerClientProfilePage(){

const { clientId } = useParams();

const [client,setClient] = useState(null);
const [bookings,setBookings] = useState([]);
const [masters,setMasters] = useState([]);
const [error,setError] = useState("");

const [showCreate,setShowCreate] = useState(false);
const [masterId,setMasterId] = useState("");
const [startAt,setStartAt] = useState("");

function resolveSalonSlug(){

try{

const w = (window.SALON_SLUG || "").trim();
if(w){
localStorage.setItem("TOTEM_SALON_SLUG", w);
return w;
}

const ls = (localStorage.getItem("TOTEM_SALON_SLUG") || "").trim();
if(ls) return ls;

const qs = new URLSearchParams(window.location.search);
const q = (qs.get("salon") || "").trim();
if(q){
localStorage.setItem("TOTEM_SALON_SLUG", q);
return q;
}

}catch(e){}

return "totem-demo-salon";

}

const salonSlug = resolveSalonSlug();

async function safeJson(url,opts){

const r = await fetch(url,opts);

const ct = (r.headers.get("content-type") || "").toLowerCase();

if(!r.ok){
const t = await r.text().catch(()=> "");
return { ok:false, status:r.status, ct, text:t };
}

if(!ct.includes("application/json")){
const t = await r.text().catch(()=> "");
return { ok:false, status:r.status, ct, text:t };
}

try{
const j = await r.json();
return { ok:true, json:j };
}catch(e){
const t = await r.text().catch(()=> "");
return { ok:false, status:r.status, ct, text:t };
}

}

async function load(){

try{

setError("");

const c = await safeJson(
`https://api.totemv.com/internal/salons/${salonSlug}/clients`
);

if(!c.ok){
setError(`CLIENTS_FETCH_FAILED_${c.status || ""}`);
return;
}

const jc = c.json;

if(!jc || !jc.ok){
setError("CLIENTS_API_NOT_OK");
return;
}

const idNum = Number(clientId);

const found = (jc.clients || []).find(x => Number(x.id) === idNum);

if(!found){
setError("CLIENT_NOT_FOUND");
return;
}

setClient(found);

const m = await safeJson(
`https://api.totemv.com/internal/salons/${salonSlug}/masters`
);

if(m.ok && m.json && m.json.ok){
setMasters(m.json.masters || []);
}

const b = await safeJson(
`https://api.totemv.com/internal/salons/${salonSlug}/bookings`
);

if(!b.ok){
setError(`BOOKINGS_FETCH_FAILED_${b.status || ""}`);
return;
}

const jb = b.json;

if(!jb || !jb.ok){
setError("BOOKINGS_API_NOT_OK");
return;
}

const list = (jb.bookings || []).filter(it => {

if(it.client_id != null && Number(it.client_id) === Number(found.id)) return true;

const phoneA = (it.phone || "").trim();
const phoneB = (found.phone || "").trim();
if(phoneA && phoneB && phoneA === phoneB) return true;

const nameA = (it.client_name || "").trim().toLowerCase();
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

async function createBooking(){

if(!masterId || !startAt) return;

try{

const body = {
client_id: client.id,
master_id: Number(masterId),
start_at: startAt,
client_name: client.name,
phone: client.phone
};

const r = await safeJson(
`https://api.totemv.com/internal/bookings/create`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(body)
}
);

if(!r.ok || !r.json || !r.json.ok){
alert("CREATE_BOOKING_FAILED");
return;
}

setShowCreate(false);
setMasterId("");
setStartAt("");

await load();

}catch(e){
console.error(e);
alert("CREATE_BOOKING_ERROR");
}

}

useEffect(()=>{
load();
},[]);

const revenue = useMemo(()=>{

return bookings.reduce((sum,b)=>{

const v =
b.price != null ? Number(b.price) :
b.amount != null ? Number(b.amount) :
b.total != null ? Number(b.total) :
0;

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
Выручка клиента: {revenue} сом
</div>

<button
onClick={()=>setShowCreate(true)}
style={{
marginTop:"15px",
background:"#111827",
color:"#fff",
padding:"8px 14px",
borderRadius:"6px",
border:"none",
cursor:"pointer"
}}
>
Создать запись
</button>

</div>

{showCreate && (

<div style={{
border:"1px solid #e5e7eb",
padding:"16px",
borderRadius:"8px",
marginBottom:"20px"
}}>

<div style={{marginBottom:"10px",fontWeight:"600"}}>
Новая запись
</div>

<div style={{marginBottom:"10px"}}>

<select
value={masterId}
onChange={e=>setMasterId(e.target.value)}
style={{padding:"6px"}}
>
<option value="">Выберите мастера</option>

{masters.map(m=>(
<option key={m.id} value={m.id}>
{m.name}
</option>
))}

</select>

</div>

<div style={{marginBottom:"10px"}}>

<input
type="datetime-local"
value={startAt}
onChange={e=>setStartAt(e.target.value)}
/>

</div>

<button
onClick={createBooking}
style={{
background:"#059669",
color:"#fff",
padding:"8px 14px",
border:"none",
borderRadius:"6px",
cursor:"pointer"
}}
>
Создать
</button>

</div>

)}

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