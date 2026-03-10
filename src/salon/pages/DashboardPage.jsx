import { useEffect, useState } from "react";

import PageSection from "../../cabinet/PageSection";
import StatGrid from "../../cabinet/StatGrid";

export default function DashboardPage(){

const [metrics,setMetrics] = useState(null);

const salonSlug = window.SALON_SLUG || "totem-demo-salon";

async function load(){

try{

const r = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/metrics`
);

const j = await r.json();

if(j.ok){
setMetrics(j.metrics || {});
}

}catch(e){

console.error("METRICS LOAD ERROR",e);

}

}

useEffect(()=>{
load();
},[]);

if(!metrics){
return (
<PageSection title="Панель управления салоном">
<div style={{padding:"20px"}}>Загрузка...</div>
</PageSection>
);
}

return(

<PageSection title="Панель управления салоном">

<StatGrid
items={[
{label:"Записей сегодня",value:metrics.bookings_today || 0},
{label:"Записей за неделю",value:metrics.bookings_week || 0},
{label:"Записей за месяц",value:metrics.bookings_month || 0},

{label:"Клиентов всего",value:metrics.clients_total || 0},
{label:"Новых клиентов сегодня",value:metrics.clients_today || 0},

{label:"Мастеров активных",value:metrics.masters_active || 0},
{label:"Мастеров ожидают",value:metrics.masters_pending || 0},
{label:"Всего мастеров",value:metrics.masters_total || 0}
]}
/>

</PageSection>

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