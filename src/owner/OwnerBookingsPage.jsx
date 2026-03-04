import { useEffect, useState } from "react";

export default function OwnerBookingsPage(){

  const [bookings,setBookings] = useState([]);
  const [selected,setSelected] = useState(null);

  const salonSlug = window.SALON_SLUG || "totem-demo-salon";

  async function load(){

    const r = await fetch(
      `https://api.totemv.com/internal/salons/${salonSlug}/bookings`
    );

    const j = await r.json();

    if(j.ok){
      setBookings(j.bookings);
    }

  }

  useEffect(()=>{
    load();
  },[]);

  return(

    <div
      style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        height:"100%"
      }}
    >

      {/* LEFT SIDE — LIST */}

      <div
        style={{
          borderRight:"1px solid #e5e7eb",
          padding:"20px",
          overflowY:"auto"
        }}
      >

        <h3>Записи</h3>

        {bookings.map(b=>(

          <div
            key={b.id}
            onClick={()=>setSelected(b)}
            style={{
              border:"1px solid #e5e7eb",
              borderRadius:"8px",
              padding:"12px",
              marginBottom:"10px",
              cursor:"pointer",
              background:selected?.id === b.id ? "#f3f4f6" : "#fff"
            }}
          >

            <div><b>#{b.id}</b></div>
            <div>{b.client_name}</div>
            <div>{b.start_at}</div>
            <div>{b.status}</div>

          </div>

        ))}

      </div>

      {/* RIGHT SIDE — DETAILS */}

      <div
        style={{
          padding:"20px"
        }}
      >

        {!selected && (
          <div>Выберите запись</div>
        )}

        {selected && (
          <BookingDetails booking={selected} reload={load}/>
        )}

      </div>

    </div>

  );

}

function BookingDetails({booking,reload}){

  async function confirm(){

    await fetch(
      "https://api.totemv.com/internal/bookings/confirm",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ booking_id:booking.id })
      }
    );

    reload();

  }

  async function cancel(){

    await fetch(
      "https://api.totemv.com/internal/bookings/cancel",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ booking_id:booking.id })
      }
    );

    reload();

  }

  async function complete(){

    await fetch(
      "https://api.totemv.com/internal/bookings/complete",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ booking_id:booking.id })
      }
    );

    reload();

  }

  return(

    <div>

      <h3>Запись #{booking.id}</h3>

      <p>Клиент: {booking.client_name}</p>
      <p>Мастер: {booking.master_name}</p>
      <p>Услуга: {booking.service_name}</p>
      <p>Дата: {booking.start_at}</p>
      <p>Статус: {booking.status}</p>

      <div style={{marginTop:"20px"}}>

        {booking.status === "reserved" && (
          <button onClick={confirm}>
            Подтвердить
          </button>
        )}

        {booking.status === "confirmed" && (
          <button onClick={complete}>
            Завершить
          </button>
        )}

        <button
          onClick={cancel}
          style={{marginLeft:"10px"}}
        >
          Отменить
        </button>

      </div>

    </div>

  );

}