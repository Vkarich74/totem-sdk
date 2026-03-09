import { useEffect, useState } from "react";
import * as api from "../api/internal";
import { getSalonSlug } from "../utils/salon";

function resolveSlug(){

const util = getSalonSlug();
if(util) return util;

const parts = window.location.pathname.split("/");
return parts[2] || "totem-demo-salon";

}

export default function OwnerMoneyPage(){

const salonSlug = resolveSlug();

const [metrics,setMetrics] = useState(null);

useEffect(()=>{

async function load(){

try{

const res = await api.getMetrics(salonSlug);

if(res.ok){
setMetrics(res.metrics || {});
}

}catch(e){

console.error("LOAD MONEY ERROR",e);

}

}

load();

},[salonSlug]);

if(!metrics){
return <div style={{padding:"20px"}}>Загрузка...</div>
}

return(

<div style={{padding:"20px"}}>

<h2>Финансы салона</h2>

<div style={{marginTop:"20px"}}>

<div>Доход сегодня: <b>{metrics.revenue_today || 0} сом</b></div>
<div>Доход за месяц: <b>{metrics.revenue_month || 0} сом</b></div>

<div style={{marginTop:"10px"}}>
Всего платежей: {metrics.payments_total || 0}
</div>

</div>

</div>

);

}