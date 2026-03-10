import { useEffect, useState } from "react";
import PageSection from "../../cabinet/PageSection";

const API_BASE = import.meta.env.VITE_API_BASE

function resolveSlug() {

  if (window.SALON_SLUG) return window.SALON_SLUG;

  const parts = window.location.pathname.split("/");
  return parts[2] || "totem-demo-salon";

}

export default function ClientsPage(){

const [clients,setClients] = useState([]);
const [loading,setLoading] = useState(true);
const [search,setSearch] = useState("");
const [selected,setSelected] = useState(null);

const salonSlug = resolveSlug();

useEffect(()=>{

async function load(){

try{

const res = await fetch(
`${API_BASE}/internal/salons/${salonSlug}/clients`
);

const data = await res.json();

if(data.ok){
setClients(data.clients || []);
}

}catch(e){
console.error(e);
}

setLoading(false);

}

load();

},[salonSlug]);

if(loading){
return (
<PageSection title="Клиенты салона">
<div>Загрузка клиентов...</div>
</PageSection>
);
}

const filtered = clients.filter(c => {

const q = search.toLowerCase();

return (
(c.name || "").toLowerCase().includes(q) ||
(c.phone || "").toLowerCase().includes(q)
);

});

return (

<PageSection title="Клиенты салона">

<div style={{
display:"flex",
gap:"30px"
}}>

{/* LIST */}

<div style={{flex:1}}>

<input
placeholder="Поиск клиента..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
width:"100%",
padding:"10px",
marginBottom:"15px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
/>

{filtered.length === 0 && (

<div style={{
padding:"20px",
border:"1px dashed #ccc",
borderRadius:"8px",
color:"#888"
}}>
Клиенты пока отсутствуют
</div>

)}

{filtered.length > 0 && (

<table style={{
width:"100%",
borderCollapse:"collapse"
}}>

<thead>

<tr style={{borderBottom:"1px solid #ddd"}}>
<th align="left">Имя</th>
<th align="left">Телефон</th>
<th align="left">Визиты</th>
</tr>

</thead>

<tbody>

{filtered.map(c=>(

<tr
key={c.id}
onClick={()=>setSelected(c)}
style={{
borderBottom:"1px solid #eee",
cursor:"pointer",
background:selected?.id === c.id ? "#f5f7ff" : "white"
}}
>

<td>{c.name}</td>
<td>{c.phone}</td>
<td>{c.visits}</td>

</tr>

))}

</tbody>

</table>

)}

</div>

{/* CARD */}

<div style={{
width:"320px"
}}>

{selected && (

<div style={{
border:"1px solid #eee",
borderRadius:"10px",
padding:"20px",
background:"#fafafa"
}}>

<h3 style={{marginTop:0}}>
{selected.name}
</h3>

<div style={{marginBottom:"10px"}}>
Телефон: {selected.phone}
</div>

<div style={{marginBottom:"10px"}}>
Визиты: {selected.visits}
</div>

<div style={{marginBottom:"10px"}}>
Регистрация:
{selected.created_at
? new Date(selected.created_at).toLocaleDateString("ru-RU")
: ""}
</div>

</div>

)}

</div>

</div>

</PageSection>

);

}