
import { useEffect, useState } from "react";
import * as api from "../api/internal";
import { getSalonSlug } from "../utils/salon";

export default function OwnerMoneyPage(){

const salonSlug = getSalonSlug();

const [metrics,setMetrics] = useState(null);

useEffect(()=>{

async function load(){

const res = await api.getMetrics(salonSlug);

if(res.ok){
setMetrics(res.metrics);
}

}

load();

},[]);

if(!metrics){
return <div style={{padding:"20px"}}>Загрузка...</div>
}

return(

<div style={{padding:"20px"}}>

<h2>Финансы салона</h2>

<div style={{marginTop:"20px"}}>

<div>Доход сегодня: <b>{metrics.revenue_today} сом</b></div>
<div>Доход за месяц: <b>{metrics.revenue_month} сом</b></div>

<div style={{marginTop:"10px"}}>
Всего платежей: {metrics.payments_total}
</div>

</div>

</div>

);

}
