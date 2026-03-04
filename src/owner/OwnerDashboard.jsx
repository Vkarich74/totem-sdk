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
    return <div style={{padding:20}}>Загрузка данных...</div>;
  }

  return (

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

        <Card title="Записей сегодня" value={metrics.bookings_today}/>
        <Card title="Записей за неделю" value={metrics.bookings_week}/>
        <Card title="Записей за месяц" value={metrics.bookings_month}/>

        <Card title="Выручка сегодня" value={metrics.revenue_today}/>
        <Card title="Выручка за месяц" value={metrics.revenue_month}/>
        <Card title="Средний чек" value={metrics.avg_check}/>

        <Card title="Мастеров активных" value={metrics.masters_active}/>
        <Card title="Мастеров ожидают" value={metrics.masters_pending}/>
        <Card title="Всего мастеров" value={metrics.masters_total}/>

        <Card title="Клиентов всего" value={metrics.clients_total}/>
        <Card title="Новых клиентов сегодня" value={metrics.clients_today}/>

        <Card title="Услуг в салоне" value={metrics.services_total}/>

        <Card title="Платежей всего" value={metrics.payments_total}/>
        <Card title="Возвратов" value={metrics.refunds_total}/>

        <Card title="Слотов сегодня" value={metrics.slots_today}/>
        <Card title="Занято слотов" value={metrics.slots_booked_today}/>

        <Card title="Загрузка %" value={metrics.load_today}/>

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