import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveSalonSlug } from "../SalonContext";
import PageSection from "../../cabinet/PageSection";
import * as api from "../../api/internal";



export default function MoneyPage(){

const { slug: routeSlug } = useParams();
const salonSlug = resolveSalonSlug(routeSlug);

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
return (
<PageSection title="Финансы салона">
<div style={{padding:"20px"}}>Загрузка...</div>
</PageSection>
);
}

return(

<PageSection title="Финансы салона">

<div style={{marginTop:"20px"}}>

<div>
Доход сегодня: <b>{metrics.revenue_today || 0} сом</b>
</div>

<div>
Доход за месяц: <b>{metrics.revenue_month || 0} сом</b>
</div>

<div style={{marginTop:"10px"}}>
Всего платежей: {metrics.payments_total || 0}
</div>

</div>

</PageSection>

);

}