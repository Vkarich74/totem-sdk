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
return <div>Загрузка...</div>;
}

return(

<div style={{padding:"20px"}}>

<h2>Панель салона</h2>

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:"16px",
marginTop:"20px"
}}>

<div style={{
border:"1px solid #e5e7eb",
padding:"16px",
borderRadius:"8px"
}}>
<div>Записей сегодня</div>
<div style={{fontSize:"24px",fontWeight:"bold"}}>
{metrics.bookings_today}
</div>
</div>

</div>

</div>

);

}