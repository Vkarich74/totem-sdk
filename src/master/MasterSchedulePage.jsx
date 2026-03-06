import {useMemo, useState} from "react"
import {useMaster} from "./MasterContext"

function normalizeStatus(s){
  if(!s) return "reserved"
  s = String(s).toLowerCase()
  if(s === "canceled") return "cancelled"
  return s
}

function timeSlots(){
  const s = []
  let h = 7
  let m = 0

  for(let i=0;i<56;i++){
    const hh = h<10 ? "0"+h : ""+h
    const mm = m<10 ? "0"+m : ""+m
    s.push(hh+":"+mm)

    m += 15
    if(m>=60){
      h++
      m=0
    }
  }

  return s
}

function timeFromISO(iso){
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const hh = h<10 ? "0"+h : ""+h
  const mm = m<10 ? "0"+m : ""+m
  return hh+":"+mm
}

function dateKeyFromISO(iso){
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = d.getMonth()+1
  const da = d.getDate()
  const mm = mo<10 ? "0"+mo : ""+mo
  const dd = da<10 ? "0"+da : ""+da
  return y + "-" + mm + "-" + dd
}

function todayKey(){
  const d = new Date()
  const y = d.getFullYear()
  const mo = d.getMonth()+1
  const da = d.getDate()
  const mm = mo<10 ? "0"+mo : ""+mo
  const dd = da<10 ? "0"+da : ""+da
  return y + "-" + mm + "-" + dd
}

function addDays(dateKey, delta){
  const [y,m,d] = dateKey.split("-").map(Number)
  const dt = new Date(y, (m-1), d)
  dt.setDate(dt.getDate() + delta)

  const yy = dt.getFullYear()
  const mo = dt.getMonth()+1
  const da = dt.getDate()
  const mm = mo<10 ? "0"+mo : ""+mo
  const dd = da<10 ? "0"+da : ""+da

  return yy + "-" + mm + "-" + dd
}

function statusColor(s){
  s = normalizeStatus(s)
  if(s==="reserved") return "#ffe082"
  if(s==="confirmed") return "#90caf9"
  if(s==="completed") return "#a5d6a7"
  if(s==="cancelled") return "#ef9a9a"
  return "#eee"
}

function statusLabel(s){
  s = normalizeStatus(s)
  if(s==="reserved") return "reserved"
  if(s==="confirmed") return "confirmed"
  if(s==="completed") return "completed"
  if(s==="cancelled") return "cancelled"
  return s || "reserved"
}

export default function MasterSchedulePage(){

  const {bookings} = useMaster()

  const [dateKey, setDateKey] = useState(todayKey())

  const slots = useMemo(()=>timeSlots(),[])

  const dayBookings = useMemo(()=>{

    const list = (bookings || [])
      .filter(b => b && b.start_at)
      .filter(b => dateKeyFromISO(b.start_at) === dateKey)
      .map(b => ({
        ...b,
        _slot: timeFromISO(b.start_at),
        _status: normalizeStatus(b.status),
      }))

    const map = {}

    for(const b of list){
      if(!map[b._slot]) map[b._slot] = []
      map[b._slot].push(b)
    }

    return map

  }, [bookings, dateKey])

  return(

    <div>

      <div style={{
        display:"flex",
        alignItems:"center",
        gap:"8px",
        marginBottom:"12px"
      }}>

        <h3 style={{margin:0}}>Расписание</h3>

        <div style={{flex:1}} />

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

        const list = dayBookings[t] || []
        const has = list.length>0

        return(

          <div
            key={t}
            style={{
              border:"1px solid #ddd",
              padding:"10px",
              marginBottom:"6px",
              borderRadius:"8px",
              background: has ? "#fff" : "#fafafa"
            }}
          >

            <div style={{display:"flex", gap:"10px"}}>

              <b style={{minWidth:"56px"}}>{t}</b>

              {has
                ? <span>занято</span>
                : <span style={{color:"#aaa"}}>свободно</span>
              }

            </div>

            {list.map(b=>(

              <div
                key={b.id}
                style={{
                  border:"1px solid #eee",
                  borderRadius:"8px",
                  padding:"8px",
                  marginTop:"6px",
                  background: statusColor(b._status)
                }}
              >

                <div>

                  <b>#{b.id}</b> {b.client_name || "клиент"}

                </div>

                <div>

                  {b.phone || "—"}

                </div>

                <div>

                  {statusLabel(b._status)}

                </div>

              </div>

            ))}

          </div>

        )

      })}

    </div>

  )

}