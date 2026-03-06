import {useMaster} from "./MasterContext"

function normalizeStatus(s){

if(!s) return "reserved"

s=s.toLowerCase()

if(s==="canceled") return "cancelled"

return s

}

function timeSlots(){

const s=[]

let h=7
let m=0

for(let i=0;i<56;i++){

const hh=h<10?"0"+h:h
const mm=m<10?"0"+m:m

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

let h=d.getHours()
let m=d.getMinutes()

const hh=h<10?"0"+h:h
const mm=m<10?"0"+m:m

return hh+":"+mm

}

function statusColor(s){

s=normalizeStatus(s)

if(s==="reserved") return "#ffe082"
if(s==="confirmed") return "#90caf9"
if(s==="completed") return "#a5d6a7"
if(s==="cancelled") return "#ef9a9a"

return "#eee"

}

export default function MasterSchedulePage(){

const {bookings,master}=useMaster()

const slots=timeSlots()

const masterName=master?.name

const masterBookings=bookings.filter(b=>b.master_name===masterName)

return(

<div>

<h3>Расписание</h3>

{slots.map(t=>{

const b=masterBookings.find(x=>timeFromISO(x.start_at)===t)

return(

<div
key={t}
style={{
border:"1px solid #ddd",
padding:"10px",
marginBottom:"6px",
borderRadius:"8px",
background:b?statusColor(b.status):"#fafafa"
}}
>

<b>{t}</b>

{b?

<span style={{marginLeft:"10px"}}>

{b.client_name||"клиент"}

{" — "}

{normalizeStatus(b.status)}

</span>

:

<span style={{marginLeft:"10px",color:"#aaa"}}>
свободно
</span>

}

</div>

)

})}

</div>

)

}