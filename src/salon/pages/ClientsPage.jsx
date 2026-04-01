import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveSalonSlug } from "../SalonContext";
import PageSection from "../../cabinet/PageSection";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function ClientsPage(){

const [clients,setClients] = useState([]);
const [loading,setLoading] = useState(true);
const [error,setError] = useState(null);
const [search,setSearch] = useState("");

const { slug: routeSlug } = useParams();
const salonSlug = resolveSalonSlug(routeSlug);

useEffect(()=>{

async function load(){

try{

setLoading(true);
setError(null);

const res = await fetch(
`${API_BASE}/internal/salons/${salonSlug}/clients`
);

const data = await res.json();

if(data.ok){
setClients(data.clients || []);
}else{
setError("Ошибка загрузки клиентов");
}

}catch(e){
console.error(e);
setError("Ошибка сети");
}

setLoading(false);

}

load();

},[salonSlug]);

const filtered = clients.filter(c => {

const q = search.toLowerCase();

return (
(c.name || "").toLowerCase().includes(q) ||
(c.phone || "").toLowerCase().includes(q)
);

});

return (

<PageSection title="Клиенты салона">

{/* SEARCH */}

<input
placeholder="Поиск клиента..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
width:"100%",
padding:"12px",
marginBottom:"15px",
border:"1px solid #ddd",
borderRadius:"8px",
fontSize:"14px"
}}
/>

{/* LOADING */}

{loading && (

<div style={{
display:"flex",
flexDirection:"column",
gap:"10px"
}}>
{[1,2,3].map(i=>(
<div key={i} style={{
padding:"15px",
border:"1px solid #eee",
borderRadius:"10px",
background:"#fafafa"
}}>
Загрузка...
</div>
))}
</div>

)}

{/* ERROR */}

{error && (

<div style={{
padding:"15px",
border:"1px solid #ffdddd",
background:"#fff5f5",
borderRadius:"8px",
color:"#c00"
}}>
{error}
</div>

)}

{/* EMPTY */}

{!loading && !error && filtered.length === 0 && (

<div style={{
padding:"20px",
border:"1px dashed #ccc",
borderRadius:"10px",
color:"#888",
textAlign:"center"
}}>
Клиенты пока отсутствуют
</div>

)}

{/* LIST */}

{!loading && !error && filtered.length > 0 && (

<div style={{
display:"flex",
flexDirection:"column",
gap:"10px"
}}>

{filtered.map(c=>(

<div
key={c.id}
style={{
border:"1px solid #eee",
borderRadius:"12px",
padding:"15px",
background:"#fff",
boxShadow:"0 2px 6px rgba(0,0,0,0.04)"
}}
>

<div style={{
fontWeight:"600",
fontSize:"15px",
marginBottom:"5px"
}}>
{c.name || "Без имени"}
</div>

<div style={{
fontSize:"13px",
color:"#666",
marginBottom:"8px"
}}>
📞 {c.phone || "-"}
</div>

<div style={{
display:"flex",
justifyContent:"space-between",
fontSize:"13px",
color:"#444"
}}>

<div>
Визиты: <b>{c.visits || 0}</b>
</div>

<div>
{c.created_at
? new Date(c.created_at).toLocaleDateString("ru-RU")
: ""}
</div>

</div>

</div>

))}

</div>

)}

</PageSection>

);

}