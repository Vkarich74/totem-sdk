import {useMemo, useState} from "react"
import {useMaster} from "./MasterContext"

function normalizeStatus(s){
  if(!s) return "reserved"
  s = String(s).toLowerCase()
  if(s === "canceled") return "cancelled"
  return s
}

function timeSlots(){
  const s=[]
  let h=7
  let m=0

  for(let i=0;i<56;i++){
    const hh=h<10?"0"+h:""+h
    const mm=m<10?"0"+m:""+m
    s.push(hh+":"+mm)

    m+=15
    if(m>=60){
      h++
      m=0
    }
  }

  return s
}

function timeFromISO(iso){
  const d=new Date(iso)
  const h=d.getHours()
  const m=d.getMinutes()
  const hh=h<10?"0"+h:""+h
  const mm=m<10?"0"+m:""+m
  return hh+":"+mm
}

function dateKeyFromISO(iso){
  const d=new Date(iso)
  const y=d.getFullYear()
  const mo=d.getMonth()+1
  const da=d.getDate()
  const mm=mo<10?"0"+mo:""+mo
  const dd=da<10?"0"+da:""+da
  return y+"-"+mm+"-"+dd
}

function todayKey(){
  const d=new Date()
  const y=d.getFullYear()
  const mo=d.getMonth()+1
  const da=d.getDate()
  const mm=mo<10?"0"+mo:""+mo
  const dd=da<10?"0"+da:""+da
  return y+"-"+mm+"-"+dd
}

function addDays(dateKey,delta){
  const [y,m,d]=dateKey.split("-").map(Number)
  const dt=new Date(y,(m-1),d)
  dt.setDate(dt.getDate()+delta)

  const yy=dt.getFullYear()
  const mo=dt.getMonth()+1
  const da=dt.getDate()
  const mm=mo<10?"0"+mo:""+mo
  const dd=da<10?"0"+da:""+da

  return yy+"-"+mm+"-"+dd
}

function statusColor(s){
  s=normalizeStatus(s)

  if(s==="reserved") return "#fff3cd"
  if(s==="confirmed") return "#d0ebff"
  if(s==="completed") return "#d3f9d8"
  if(s==="cancelled") return "#ffe3e3"

  return "#eee"
}

function statusLabel(s){
  s=normalizeStatus(s)

  if(s==="reserved") return "ожидает"
  if(s==="confirmed") return "подтверждена"
  if(s==="completed") return "завершена"
  if(s==="cancelled") return "отмена"

  return s
}

export default function MasterSchedulePage(){

  const {bookings} = useMaster()

  const [dateKey,setDateKey]=useState(todayKey())

  const [quickSlot,setQuickSlot]=useState(null)
  const [clientName,setClientName]=useState("")
  const [phone,setPhone]=useState("")

  const slots=useMemo(()=>timeSlots(),[])

  const dayBookings=useMemo(()=>{

    const list=(bookings||[])
      .filter(b=>b && b.start_at)
      .filter(b=>dateKeyFromISO(b.start_at)===dateKey)
      .map(b=>({
        ...b,
        _slot:timeFromISO(b.start_at),
        _status:normalizeStatus(b.status)
      }))

    const map={}

    for(const b of list){
      if(!map[b._slot]) map[b._slot]=[]
      map[b._slot].push(b)
    }

    return map

  },[bookings,dateKey])

  function openQuick(slot){
    setQuickSlot(slot)
    setClientName("")
    setPhone("")
  }

  function closeQuick(){
    setQuickSlot(null)
  }

  function createBooking(){
    alert("создание записи: "+clientName+" "+phone+" "+quickSlot)
    closeQuick()
  }

  return(

    <div>

      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>

        <h3 style={{margin:0}}>Календарь мастера</h3>

        <div style={{flex:1}}/>

        <button onClick={()=>setDateKey(addDays(dateKey,-1))}>←</button>

        <input
          type="date"
          value={dateKey}
          onChange={(e)=>setDateKey(e.target.value)}
        />

        <button onClick={()=>setDateKey(addDays(dateKey,1))}>→</button>

        <button onClick={()=>setDateKey(todayKey())}>Сегодня</button>

      </div>

      {slots.map(t=>{

        const list=dayBookings[t]||[]
        const has=list.length>0

        return(

          <div
            key={t}
            style={{
              border:"1px solid #ddd",
              padding:"10px",
              marginBottom:"6px",
              borderRadius:"8px",
              background:has?"#fff":"#fafafa",
              cursor:has?"default":"pointer"
            }}

            onClick={()=>{
              if(!has) openQuick(t)
            }}

          >

            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>

              <b style={{minWidth:"60px"}}>{t}</b>

              {has
                ? <span style={{color:"#111"}}>занято</span>
                : <span style={{color:"#999"}}>свободно</span>
              }

            </div>

            {list.map(b=>(

              <div
                key={b.id}
                style={{
                  border:"1px solid #eee",
                  borderRadius:"8px",
                  padding:"10px",
                  marginTop:"8px",
                  background:statusColor(b._status)
                }}
              >

                <div style={{display:"flex",justifyContent:"space-between"}}>

                  <b>#{b.id}</b>

                  <span style={{
                    fontSize:"12px",
                    padding:"2px 8px",
                    borderRadius:"12px",
                    border:"1px solid rgba(0,0,0,0.2)"
                  }}>
                    {statusLabel(b._status)}
                  </span>

                </div>

                <div style={{marginTop:"6px"}}>
                  {b.client_name || "клиент"}
                </div>

                <div style={{color:"#444"}}>
                  {b.phone || "—"}
                </div>

              </div>

            ))}

          </div>

        )

      })}

      {quickSlot && (

        <div style={{
          position:"fixed",
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:"rgba(0,0,0,0.3)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center"
        }}>

          <div style={{
            background:"#fff",
            padding:"20px",
            borderRadius:"10px",
            width:"300px"
          }}>

            <h4>Новая запись</h4>

            <div>Время: {quickSlot}</div>

            <input
              placeholder="имя клиента"
              value={clientName}
              onChange={e=>setClientName(e.target.value)}
              style={{width:"100%",marginTop:"10px"}}
            />

            <input
              placeholder="телефон"
              value={phone}
              onChange={e=>setPhone(e.target.value)}
              style={{width:"100%",marginTop:"10px"}}
            />

            <div style={{marginTop:"12px",display:"flex",gap:"8px"}}>

              <button onClick={createBooking}>
                сохранить
              </button>

              <button onClick={closeQuick}>
                отмена
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  )

}