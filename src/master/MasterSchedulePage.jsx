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
  // local date key: YYYY-MM-DD
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
  // dateKey YYYY-MM-DD → new YYYY-MM-DD (local)
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
  const {bookings, master} = useMaster()

  const [dateKey, setDateKey] = useState(todayKey())

  const slots = useMemo(()=>timeSlots(),[])
  const masterName = master?.name

  const dayBookings = useMemo(()=>{
    const list = (bookings || [])
      .filter(b => b && b.start_at)
      .filter(b => b.master_name === masterName)
      .filter(b => dateKeyFromISO(b.start_at) === dateKey)
      .map(b => ({
        ...b,
        _slot: timeFromISO(b.start_at),
        _status: normalizeStatus(b.status),
      }))

    // group by slot
    const map = {}
    for(const b of list){
      if(!map[b._slot]) map[b._slot] = []
      map[b._slot].push(b)
    }

    // stable sort inside slot: status then time
    for(const k of Object.keys(map)){
      map[k].sort((a,b)=>{
        const sa = String(a._status||"")
        const sb = String(b._status||"")
        if(sa<sb) return -1
        if(sa>sb) return 1
        return String(a.start_at).localeCompare(String(b.start_at))
      })
    }

    return map
  }, [bookings, masterName, dateKey])

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

        <button
          onClick={()=>setDateKey(addDays(dateKey,-1))}
          style={{
            border:"1px solid #ddd",
            borderRadius:"8px",
            padding:"6px 10px",
            background:"#fff",
            cursor:"pointer"
          }}
        >
          ←
        </button>

        <input
          type="date"
          value={dateKey}
          onChange={(e)=>setDateKey(e.target.value)}
          style={{
            border:"1px solid #ddd",
            borderRadius:"8px",
            padding:"6px 10px"
          }}
        />

        <button
          onClick={()=>setDateKey(addDays(dateKey,1))}
          style={{
            border:"1px solid #ddd",
            borderRadius:"8px",
            padding:"6px 10px",
            background:"#fff",
            cursor:"pointer"
          }}
        >
          →
        </button>

        <button
          onClick={()=>setDateKey(todayKey())}
          style={{
            border:"1px solid #ddd",
            borderRadius:"8px",
            padding:"6px 10px",
            background:"#fff",
            cursor:"pointer"
          }}
        >
          Сегодня
        </button>
      </div>

      {!masterName ? (
        <div style={{padding:"10px", border:"1px solid #eee", borderRadius:"8px", color:"#666"}}>
          Мастер не определён.
        </div>
      ) : null}

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
            <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
              <b style={{minWidth:"56px", display:"inline-block"}}>{t}</b>

              {has ? (
                <span style={{color:"#111"}}>
                  {list.length===1 ? "занято" : `занято (${list.length})`}
                </span>
              ) : (
                <span style={{color:"#aaa"}}>свободно</span>
              )}
            </div>

            {has ? (
              <div style={{marginTop:"8px", display:"flex", flexDirection:"column", gap:"6px"}}>
                {list.map(b=>(
                  <div
                    key={b.id}
                    style={{
                      border:"1px solid #eee",
                      borderRadius:"8px",
                      padding:"8px 10px",
                      background: statusColor(b._status)
                    }}
                  >
                    <div style={{display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap"}}>
                      <b>#{b.id}</b>
                      <span>{b.client_name || "клиент"}</span>
                      {b.phone ? <span style={{color:"#333"}}>{b.phone}</span> : null}
                      <span style={{
                        border:"1px solid rgba(0,0,0,0.15)",
                        borderRadius:"999px",
                        padding:"2px 8px",
                        background:"rgba(255,255,255,0.55)"
                      }}>
                        {statusLabel(b._status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

          </div>
        )
      })}

    </div>
  )
}