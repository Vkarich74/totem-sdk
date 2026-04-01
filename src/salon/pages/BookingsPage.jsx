import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "../../api/internal";
import { resolveSalonSlug } from "../SalonContext";
import PageSection from "../../cabinet/PageSection";
import EmptyState from "../../cabinet/EmptyState";



function statusColor(status){
  if(status==="reserved") return "#f59e0b";
  if(status==="confirmed") return "#10b981";
  if(status==="completed") return "#6b7280";
  if(status==="cancelled") return "#ef4444";
  return "#9ca3af";
}

function statusText(status){
  if(status==="reserved") return "Ожидает";
  if(status==="confirmed") return "Подтверждена";
  if(status==="completed") return "Завершена";
  if(status==="cancelled") return "Отменена";
  return status;
}

function formatDate(d){
  if(!d) return "—";

  const date = new Date(d);

  return date.toLocaleString("ru-RU",{
    day:"2-digit",
    month:"2-digit",
    hour:"2-digit",
    minute:"2-digit"
  });
}

function formatMoney(v){
  if(v===null || v===undefined || v==="") return "—";
  return `${v} сом`;
}

function rowHoverStyle(e, enter, active){
  if(active) return;

  if(enter){
    e.currentTarget.style.background = "#f9fafb";
  }else{
    e.currentTarget.style.background = "#fff";
  }
}

export default function BookingsPage(){

  const { slug: routeSlug } = useParams();

  const [bookings,setBookings] = useState([]);
  const [masters,setMasters] = useState([]);

  const [filter,setFilter] = useState("today");
  const [search,setSearch] = useState("");

  const [loadingAction,setLoadingAction] = useState(null);
  const [selectedBookingId,setSelectedBookingId] = useState(null);

  const salonSlug = resolveSalonSlug(routeSlug);

  async function load(){

    try{

      const res = await api.getBookings(salonSlug);

      if(res.ok){

        const sorted = (res.bookings || []).sort((a,b)=>{
          if(!a.start_at) return 1;
          if(!b.start_at) return -1;
          return new Date(a.start_at) - new Date(b.start_at);
        });

        setBookings(sorted);

      }

      const resMasters = await api.getMasters(salonSlug);

      if(resMasters.ok){
        setMasters(resMasters.masters || []);
      }

    }catch(e){

      console.error("LOAD BOOKINGS ERROR",e);

    }

  }

  useEffect(()=>{

    load();

    const interval = setInterval(()=>{
      if(!loadingAction){
        load();
      }
    },10000);

    return ()=>{
      clearInterval(interval);
    };

  },[loadingAction]);

  function action(id,type){

    if(loadingAction) return;

    setLoadingAction(id);

    api.bookingAction(id,type).then(async (res)=>{

      if(!res.ok){
        alert("Ошибка изменения статуса");
        setLoadingAction(null);
        return;
      }

      await load();
      setLoadingAction(null);

    }).catch(()=>{
      alert("Ошибка сервера");
      setLoadingAction(null);
    });

  }

  function applyFilters(list){

    let result = [...list];
    const now = new Date();

    if(filter==="today"){

      const start = new Date();
      start.setHours(0,0,0,0);

      const end = new Date();
      end.setHours(23,59,59,999);

      result = result.filter(b=>{
        if(!b.start_at) return false;
        const d = new Date(b.start_at);
        return d>=start && d<=end;
      });

    }

    if(filter==="week"){

      const start = new Date();
      start.setDate(now.getDate() - now.getDay() + 1);
      start.setHours(0,0,0,0);

      const end = new Date(start);
      end.setDate(start.getDate()+7);

      result = result.filter(b=>{
        if(!b.start_at) return false;
        const d = new Date(b.start_at);
        return d>=start && d<end;
      });

    }

    if(search){

      const q = search.toLowerCase();

      result = result.filter(b=>
        (b.client_name || "").toLowerCase().includes(q) ||
        (b.phone || "").toLowerCase().includes(q) ||
        (b.master_name || "").toLowerCase().includes(q) ||
        (b.service_name || "").toLowerCase().includes(q)
      );

    }

    return result;

  }

  const filteredBookings = applyFilters(bookings);

  useEffect(()=>{

    if(filteredBookings.length===0){
      setSelectedBookingId(null);
      return;
    }

    if(selectedBookingId===null){
      setSelectedBookingId(filteredBookings[0].id);
      return;
    }

    const exists = filteredBookings.some(b=>String(b.id)===String(selectedBookingId));

    if(!exists){
      setSelectedBookingId(filteredBookings[0].id);
    }

  },[filteredBookings, selectedBookingId]);

  const selectedBooking = useMemo(()=>{
    return filteredBookings.find(b=>String(b.id)===String(selectedBookingId)) || null;
  },[filteredBookings, selectedBookingId]);

  return(

    <PageSection title="Записи салона">

      <div style={{marginBottom:"16px",display:"flex",gap:"8px",flexWrap:"wrap"}}>

        <button onClick={()=>setFilter("today")}>Сегодня</button>
        <button onClick={()=>setFilter("week")}>Неделя</button>
        <button onClick={()=>setFilter("all")}>Все</button>

      </div>

      <div style={{marginBottom:"16px"}}>
        <input
          placeholder="Поиск"
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
      </div>

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"320px 1fr",
          gap:"24px",
          alignItems:"start"
        }}
      >

        <div style={{border:"1px solid #e5e7eb",borderRadius:"12px",background:"#fff",overflow:"hidden"}}>

          {filteredBookings.map(b=>{

            const active = String(selectedBookingId)===String(b.id);

            return(
              <div
                key={b.id}
                onClick={()=>setSelectedBookingId(b.id)}
                onMouseEnter={(e)=>rowHoverStyle(e,true,active)}
                onMouseLeave={(e)=>rowHoverStyle(e,false,active)}
                style={{
                  padding:"12px",
                  borderBottom:"1px solid #eee",
                  cursor:"pointer",
                  background:active ? "#f3f4f6" : "#fff"
                }}
              >

                <div style={{fontWeight:"700"}}>
                  BR-{b.id}
                </div>

                <div style={{fontSize:"13px",color:statusColor(b.status)}}>
                  {statusText(b.status)}
                </div>

                <div style={{fontSize:"13px"}}>
                  {b.client_name}
                </div>

                <div style={{fontSize:"12px",color:"#6b7280"}}>
                  {formatDate(b.start_at)}
                </div>

              </div>
            );
          })}

        </div>

        <div style={{border:"1px solid #e5e7eb",borderRadius:"12px",padding:"24px",background:"#fff"}}>

          {!selectedBooking ? (
            <EmptyState title="Выберите запись"/>
          ) : (

            <>
              <h2>BR-{selectedBooking.id}</h2>

              <p>Статус: <span style={{color:statusColor(selectedBooking.status)}}>{statusText(selectedBooking.status)}</span></p>
              <p>Мастер: {selectedBooking.master_name}</p>
              <p>Услуга: {selectedBooking.service_name}</p>
              <p>Цена: {formatMoney(selectedBooking.price)}</p>
              <p>Дата: {formatDate(selectedBooking.start_at)}</p>
              <p>Клиент: {selectedBooking.client_name}</p>
              <p>Телефон: {selectedBooking.phone}</p>

              <div style={{marginTop:"16px",display:"flex",gap:"8px",flexWrap:"wrap"}}>

                {selectedBooking.status==="reserved" && (
                  <>
                    <button
                      disabled={loadingAction===selectedBooking.id}
                      onClick={()=>action(selectedBooking.id,"confirm")}
                    >
                      Подтвердить
                    </button>

                    <button
                      disabled={loadingAction===selectedBooking.id}
                      onClick={()=>action(selectedBooking.id,"cancel")}
                    >
                      Отменить
                    </button>
                  </>
                )}

                {selectedBooking.status==="confirmed" && (
                  <>
                    <button
                      disabled={loadingAction===selectedBooking.id}
                      onClick={()=>action(selectedBooking.id,"complete")}
                    >
                      Завершить
                    </button>

                    <button
                      disabled={loadingAction===selectedBooking.id}
                      onClick={()=>action(selectedBooking.id,"cancel")}
                    >
                      Отменить
                    </button>
                  </>
                )}

                {selectedBooking.phone && (
                  <button onClick={()=>window.location.href=`tel:${selectedBooking.phone}`}>
                    Позвонить
                  </button>
                )}

              </div>

            </>

          )}

        </div>

      </div>

    </PageSection>

  );

}