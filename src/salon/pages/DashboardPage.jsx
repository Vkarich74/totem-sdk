import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveSalonSlug } from "../SalonContext";
import PageSection from "../../cabinet/PageSection";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function DashboardPage(){

const [metrics,setMetrics] = useState(null);

const { slug: routeSlug } = useParams();
const salonSlug = resolveSalonSlug(routeSlug);

async function load(){

try{

const r = await fetch(
`${API_BASE}/internal/salons/${salonSlug}/metrics`
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

<StatGrid>

<Card title="Записей сегодня" value={metrics.bookings_today || 0} color="#3b82f6"/>
<Card title="Записей за неделю" value={metrics.bookings_week || 0} color="#3b82f6"/>
<Card title="Записей за месяц" value={metrics.bookings_month || 0} color="#3b82f6"/>

<Card title="Клиентов всего" value={metrics.clients_total || 0} color="#8b5cf6"/>
<Card title="Новых клиентов сегодня" value={metrics.clients_today || 0} color="#8b5cf6"/>

<Card title="Активных мастеров" value={metrics.masters_active || 0} color="#f59e0b"/>
<Card title="Мастеров на проверке" value={metrics.masters_pending || 0} color="#f59e0b"/>
<Card title="Всего мастеров" value={metrics.masters_total || 0} color="#f59e0b"/>

</StatGrid>

</PageSection>

);

}

function StatGrid({children}){

return(

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
gap:"16px",
marginTop:"20px"
}}>
{children}
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
background:"#fff",
minHeight:"80px"
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