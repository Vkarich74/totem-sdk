import { useEffect, useState } from "react";

export default function OwnerDashboard(){

  const [metrics,setMetrics] = useState(null);
  const salonSlug = window.SALON_SLUG || "totem-demo-salon";

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
    return <div style={{padding:20}}>Loading metrics...</div>;
  }

  return (

    <div style={{padding:"20px"}}>

      <h2>Salon Dashboard</h2>

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(4,1fr)",
          gap:"16px",
          marginTop:"20px"
        }}
      >

        <Card title="Bookings Today" value={metrics.bookings_today}/>
        <Card title="Bookings Week" value={metrics.bookings_week}/>
        <Card title="Bookings Month" value={metrics.bookings_month}/>

        <Card title="Revenue Today" value={metrics.revenue_today}/>
        <Card title="Revenue Month" value={metrics.revenue_month}/>
        <Card title="Avg Check" value={metrics.avg_check}/>

        <Card title="Masters Active" value={metrics.masters_active}/>
        <Card title="Masters Pending" value={metrics.masters_pending}/>
        <Card title="Masters Total" value={metrics.masters_total}/>

        <Card title="Clients Total" value={metrics.clients_total}/>
        <Card title="Clients Today" value={metrics.clients_today}/>

        <Card title="Services Total" value={metrics.services_total}/>

        <Card title="Payments Total" value={metrics.payments_total}/>
        <Card title="Refunds Total" value={metrics.refunds_total}/>

        <Card title="Slots Today" value={metrics.slots_today}/>
        <Card title="Booked Slots" value={metrics.slots_booked_today}/>

        <Card title="Load %" value={metrics.load_today}/>

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