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

setMetrics(data.metrics);

}catch(err){

console.error(err);
setError("METRICS_FETCH_FAILED");

}

}

load();

},[]);

if(error){
return (
<div>
<h1>Главная мастера</h1>
<p>Ошибка загрузки метрик: {error}</p>
</div>
);
}

if(!metrics){
return (
<div>
<h1>Главная мастера</h1>
<p>Загрузка метрик...</p>
</div>
);
}

return (

<div>

<h1>Главная мастера</h1>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(5,1fr)",
gap:"20px",
marginTop:"20px"
}}>

<Card
title="Записи сегодня"
value={metrics.bookings_today}
/>

<Card
title="Записи неделя"
value={metrics.bookings_week}
/>

<Card
title="Клиенты"
value={metrics.clients_total}
/>

<Card
title="Доход сегодня"
value={metrics.revenue_today}
/>

<Card
title="Доход месяц"
value={metrics.revenue_month}
/>

</div>

</div>

);

}

function Card({title,value}){

return(

<div style={{
border:"1px solid #ddd",
borderRadius:"8px",
padding:"20px",
background:"#fff"
}}>

<div style={{
fontSize:"14px",
color:"#666"
}}>
{title}
</div>

<div style={{
fontSize:"28px",
fontWeight:"bold",
marginTop:"10px"
}}>
{value}
</div>

</div>

);

}