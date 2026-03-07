import { useEffect, useState } from "react";
import * as api from "../api/internal";
import { getSalonSlug } from "../utils/salon";

export default function OwnerDashboard(){

const [metrics,setMetrics] = useState(null);
const [error,setError] = useState(null);

function resolveSlug(){
const utilSlug = getSalonSlug();
if(utilSlug) return utilSlug;

const parts = window.location.pathname.split("/");
return parts[2] || "totem-demo-salon";
}

const salonSlug = resolveSlug();

async function load(){

try{

setError(null);

const res = await api.getMetrics(salonSlug);

if(!res || !res.ok){
setError("METRICS_FETCH_FAILED");
return;
}

setMetrics(res.metrics || {});

}catch(e){

console.error("METRICS LOAD ERROR",e);
setError("METRICS_FETCH_FAILED");

}

}

useEffect(()=>{

load();

const interval = setInterval(()=>{

load();

},30000);

return ()=> clearInterval(interval);

},[salonSlug]);

if(error){

return(
<div style={{padding:20}}>
<div style={{fontWeight:"600",marginBottom:"8px"}}>
Ошибка загрузки метрик
</div>
<div>{error}</div>
</div>
);

}

if(!metrics){
return <div style={{padding:20}}>Загрузка данных...</div>;
}

function val(v){
if(v===undefined || v===null) return 0;
return v;
}

return(

<div style={{padding:"20px"}}>

<h2>Панель управления салоном</h2>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(4,1fr)",
gap:"16px",
marginTop:"20px"
}}
>

<Card title="Записей сегодня" value={val(metrics.bookings_today)}/>
<Card title="Записей за неделю" value={val(metrics.bookings_week)}/>
<Card title="Записей за месяц" value={val(metrics.bookings_month)}/>

<Card title="Выручка сегодня" value={val(metrics.revenue_today)}/>
<Card title="Выручка за месяц" value={val(metrics.revenue_month)}/>
<Card title="Средний чек" value={val(metrics.avg_check)}/>

<Card title="Мастеров активных" value={val(metrics.masters_active)}/>
<Card title="Мастеров ожидают" value={val(metrics.masters_pending)}/>
<Card title="Всего мастеров" value={val(metrics.masters_total)}/>

<Card title="Клиентов всего" value={val(metrics.clients_total)}/>
<Card title="Новых клиентов сегодня" value={val(metrics.clients_today)}/>

<Card title="Услуг в салоне" value={val(metrics.services_total)}/>

<Card title="Платежей всего" value={val(metrics.payments_total)}/>
<Card title="Возвратов" value={val(metrics.refunds_total)}/>

<Card title="Слотов сегодня" value={val(metrics.slots_today)}/>
<Card title="Занято слотов" value={val(metrics.slots_booked_today)}/>

<Card title="Загрузка %" value={val(metrics.load_today)}/>

</div>

</div>

);

}

function Card({title,value}){

return(

<div
style={{
background:"#fff",
border:"1px solid #e5e7eb",
borderRadius:"10px",
padding:"18px",
boxShadow:"0 1px 2px rgba(0,0,0,0.05)"
}}
>

<div
style={{
fontSize:"12px",
color:"#6b7280",
marginBottom:"6px"
}}
>
{title}
</div>

<div
style={{
fontSize:"26px",
fontWeight:"700"
}}
>
{value}
</div>

</div>

);

}