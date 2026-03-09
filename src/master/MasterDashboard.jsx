import { useEffect, useState } from "react";
import PageSection from "../cabinet/PageSection";
import StatCard from "../cabinet/StatCard";

export default function MasterDashboard() {

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

<PageSection>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(3,1fr)",
gap:"16px"
}}>

<StatCard
title="Записей сегодня"
value={metrics.bookings_today || 0}
/>

<StatCard
title="Записей за неделю"
value={metrics.bookings_week || 0}
/>

<StatCard
title="Клиентов всего"
value={metrics.clients_total || 0}
/>

<StatCard
title="Доход сегодня"
value={metrics.revenue_today || 0}
/>

<StatCard
title="Доход за месяц"
value={metrics.revenue_month || 0}
/>

</div>

</PageSection>

</div>

);

}