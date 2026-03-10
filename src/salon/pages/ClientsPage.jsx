import { useEffect, useState } from "react";
import PageSection from "../../cabinet/PageSection";

const API_BASE = "https://api.totemv.com";

function resolveSlug() {

  if (window.SALON_SLUG) return window.SALON_SLUG;

  const parts = window.location.pathname.split("/");
  return parts[2] || "totem-demo-salon";

}

export default function ClientsPage(){

const [clients,setClients] = useState([]);
const [loading,setLoading] = useState(true);

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

return (

<PageSection title="Клиенты салона">

<table style={{
width:"100%",
borderCollapse:"collapse",
marginTop:"20px"
}}>

<thead>

<tr style={{borderBottom:"1px solid #ddd"}}>
<th align="left">ID</th>
<th align="left">Имя</th>
<th align="left">Телефон</th>
<th align="left">Визиты</th>
<th align="left">Дата регистрации</th>
</tr>

</thead>

<tbody>

{clients.map(c=>(

<tr key={c.id} style={{borderBottom:"1px solid #eee"}}>

<td>{c.id}</td>
<td>{c.name}</td>
<td>{c.phone}</td>
<td>{c.visits}</td>

<td>
{c.created_at
? new Date(c.created_at).toLocaleDateString("ru-RU")
: ""}
</td>

</tr>

))}

</tbody>

</table>

</PageSection>

);

}