import { useEffect, useState } from "react";

export default function OwnerDashboardPage(){

const [metrics,setMetrics] = useState(null);

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

const r = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/metrics`
);

const j = await r.json();

if(j.ok){
setMetrics(j.metrics);
}

}

useEffect(()=>{
load();
},[]);

if(!metrics){
return <div style={{padding:"20px"}}>Загрузка...</div>;
}

return(

<div style={{padding:"20px"}}>

<h2>Панель управления салоном</h2>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(3,1fr)",
gap:"16px",
marginTop:"20px"
}}>

<Card title="Записей сегодня" value={metrics.bookings_today}/>
<Card title="Записей за неделю" value={metrics.bookings_week}/>
<Card title="Записей за месяц" value={metrics.bookings_month}/>

<Card title="Клиентов всего" value={metrics.clients_total}/>
<Card title="Новых клиентов сегодня" value={metrics.clients_today}/>

<Card title="Мастеров активных" value={metrics.masters_active}/>
<Card title="Мастеров ожидают" value={metrics.masters_pending}/>
<Card title="Всего мастеров" value={metrics.masters_total}/>

</div>

</div>

);

}

function Card({title,value}){

return(

<div style={{
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"16px",
background:"#fff"
}}>

<div style={{
fontSize:"13px",
color:"#6b7280"
}}>
{title}
</div>

<div style={{
fontSize:"26px",
fontWeight:"bold",
marginTop:"6px"
}}>
{value}
</div>

</div>

);

}