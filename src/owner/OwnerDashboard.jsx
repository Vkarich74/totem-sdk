import { useEffect, useState } from "react";

export default function OwnerDashboard(){

const [metrics,setMetrics] = useState(null);

const salonSlug = window.SALON_SLUG;

async function load(){

try{

const r = await fetch(
`https://api.totemv.com/internal/salons/${salonSlug}/metrics`
);

const j = await r.json();

if(j.ok){
setMetrics(j.metrics);
}

}catch(e){
console.error(e);
}

}

useEffect(()=>{
load();
},[]);

if(!metrics){
return <div>Loading metrics...</div>;
}

return (

<div style={{padding:"20px"}}>

<h2>Salon Dashboard</h2>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(4,1fr)",
gap:"20px",
marginTop:"20px"
}}>

<Card title="Bookings Today" value={metrics.bookings_today}/>
<Card title="Bookings Week" value={metrics.bookings_week}/>
<Card title="Bookings Month" value={metrics.bookings_month}/>

<Card title="Revenue Today" value={metrics.revenue_today}/>
<Card title="Revenue Month" value={metrics.revenue_month}/>
<Card title="Avg Check" value={metrics.avg_check}/>

<Card title="Masters Active" value={metrics.masters_active}/>
<Card title="Masters Pending" value={metrics.masters_pending}/>

<Card title="Clients Total" value={metrics.clients_total}/>
<Card title="Clients Today" value={metrics.clients_today}/>

<Card title="Services" value={metrics.services_total}/>

<Card title="Payments" value={metrics.payments_total}/>
<Card title="Refunds" value={metrics.refunds_total}/>

<Card title="Slots Today" value={metrics.slots_today}/>
<Card title="Slots Booked" value={metrics.slots_booked_today}/>

<Card title="Load %" value={metrics.load_today}/>

</div>

</div>

);

}

function Card({title,value}){

return(

<div style={{
border:"1px solid #ddd",
borderRadius:"8px",
padding:"16px",
background:"#fff"
}}>

<div style={{
fontSize:"12px",
color:"#666",
marginBottom:"8px"
}}>

{title}

</div>

<div style={{
fontSize:"22px",
fontWeight:"bold"
}}>

{value}

</div>

</div>

);

}