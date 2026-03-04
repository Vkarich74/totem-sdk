import { useEffect, useState } from "react";

export default function OwnerBookingsPage(){

  const [bookings,setBookings] = useState([]);
  const [masters,setMasters] = useState([]);

  const salonSlug = window.SALON_SLUG || "totem-demo-salon";

  async function load(){

    const r = await fetch(
      `https://api.totemv.com/internal/salons/${salonSlug}/bookings`
    );

    const j = await r.json();

    if(j.ok){
      setBookings(j.bookings);
    }

    const rm = await fetch(
      `https://api.totemv.com/internal/salons/${salonSlug}/masters`
    );

    const jm = await rm.json();

    if(jm.ok){
      setMasters(jm.masters);
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

      {/* LEFT SIDE — BOOKINGS */}

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
            style={{
              border:"1px solid #e5e7eb",
              borderRadius:"8px",
              padding:"12px",
              marginBottom:"10px",
              background:"#fff"
            }}
          >

            <div><b>#{b.id}</b></div>
            <div>Клиент: {b.client_name}</div>
            <div>Мастер: {b.master_name}</div>
            <div>{b.start_at}</div>
            <div>Статус: {b.status}</div>

          </div>

        ))}

      </div>

      {/* RIGHT SIDE — CALENDAR */}

      <div
        style={{
          padding:"20px",
          overflowY:"auto"
        }}
      >

        <h3>Календарь мастеров (сегодня)</h3>

        {masters.map(m=>{

          const masterBookings =
            bookings.filter(b => b.master_id === m.id);

          return(

            <div
              key={m.id}
              style={{
                border:"1px solid #e5e7eb",
                borderRadius:"8px",
                padding:"12px",
                marginBottom:"12px"
              }}
            >

              <div style={{fontWeight:"600"}}>
                {m.name}
              </div>

              {masterBookings.length === 0 && (
                <div style={{color:"#6b7280"}}>
                  Нет записей
                </div>
              )}

              {masterBookings.map(b=>(
                <div
                  key={b.id}
                  style={{
                    marginTop:"6px",
                    padding:"6px",
                    background:"#f3f4f6",
                    borderRadius:"6px"
                  }}
                >

                  {b.start_at} — {b.client_name}

                </div>
              ))}

            </div>

          );

        })}

      </div>

    </div>

  );

}