import { useEffect, useState } from "react";

export default function MasterDashboard(){

const [metrics,setMetrics] = useState(null);
const [error,setError] = useState(null);

useEffect(()=>{

async function load(){

try{

const slug = window.MASTER_SLUG;

if(!slug){
setError("MASTER_SLUG_NOT_FOUND");
return;
}

const res = await fetch(
`https://api.totemv.com/internal/masters/${slug}/metrics`
);

const data = await res.json();

if(!data.ok){
setError(data.error || "METRICS_FETCH_FAILED");
return;
}

setMetrics(data.metrics || {});

}catch(err){

console.error(err);
setError("METRICS_FETCH_FAILED");

}

}

load();

},[]);

if(error){
return (
<div style={{padding:"20px"}}>
<h2>Панель мастера</h2>
<p>Ошибка загрузки метрик: {error}</p>
</div>
);
}

if(!metrics){
return (
<div style={{padding:"20px"}}>
<h2>Панель мастера</h2>
<p>Загрузка...</p>
</div>
);
}

return(

<div style={{padding:"20px"}}>

<h2>Панель мастера</h2>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(3,1fr)",
gap:"16px",
marginTop:"20px"
}}>

<Card title="Записей сегодня" value={metrics.bookings_today || 0} color="#3b82f6"/>
<Card title="Записей за неделю" value={metrics.bookings_week || 0} color="#3b82f6"/>

<Card title="Клиентов всего" value={metrics.clients_total || 0} color="#8b5cf6"/>

<Card title="Доход сегодня" value={metrics.revenue_today || 0} color="#10b981"/>
<Card title="Доход за месяц" value={metrics.revenue_month || 0} color="#10b981"/>

</div>

</div>

);

}

function Card({title,value,color}){

return(

<div style={{
border:"1px solid #e5e7eb",
borderLeft:`6px solid ${color}`,
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