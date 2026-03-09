import {useState} from "react"
import {useMaster} from "./MasterContext"
import PageSection from "../cabinet/PageSection"

function Block({title,children}){

return(

<div style={{
border:"1px solid #eee",
borderRadius:"10px",
padding:"14px",
marginBottom:"16px",
background:"#fff"
}}>

<b>{title}</b>

<div style={{marginTop:"10px"}}>
{children}
</div>

</div>

)

}

function Field({label,value,onChange,type="text"}){

return(

<div style={{marginBottom:"10px"}}>

<div style={{
fontSize:"12px",
color:"#666",
marginBottom:"4px"
}}>

{label}

</div>

<input
type={type}
value={value||""}
onChange={e=>onChange(e.target.value)}
style={{
width:"100%",
padding:"8px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
/>

</div>

)

}

function ServiceRow({service,setService}){

return(

<div style={{
display:"flex",
gap:"10px",
marginBottom:"8px"
}}>

<input
value={service.name}
onChange={e=>setService({...service,name:e.target.value})}
placeholder="Название услуги"
style={{
flex:2,
padding:"8px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
/>

<input
type="number"
value={service.price}
onChange={e=>setService({...service,price:e.target.value})}
placeholder="Цена"
style={{
flex:1,
padding:"8px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
/>

<input
type="number"
value={service.duration}
onChange={e=>setService({...service,duration:e.target.value})}
placeholder="Мин"
style={{
flex:1,
padding:"8px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
/>

</div>

)

}

export default function MasterSettingsPage(){

const {master}=useMaster()

const [name,setName]=useState(master?.name||"")
const [photo,setPhoto]=useState("")
const [bio,setBio]=useState("")

const [phone,setPhone]=useState("")
const [email,setEmail]=useState("")
const [whatsapp,setWhatsapp]=useState("")

const [services,setServices]=useState([
{name:"Стрижка",price:800,duration:30},
{name:"Маникюр",price:1200,duration:60}
])

const [hours,setHours]=useState({
mon:"09:00-19:00",
tue:"09:00-19:00",
wed:"",
thu:"09:00-19:00",
fri:"09:00-19:00",
sat:"10:00-18:00",
sun:""
})

const [slot,setSlot]=useState(15)
const [minBefore,setMinBefore]=useState(60)
const [advance,setAdvance]=useState(30)

const updateService=(i,val)=>{
const copy=[...services]
copy[i]=val
setServices(copy)
}

const addService=()=>{
setServices([...services,{name:"",price:"",duration:""}])
}

const save=()=>{

console.log("MASTER SETTINGS",{
name,
photo,
bio,
phone,
email,
whatsapp,
services,
hours,
slot,
minBefore,
advance
})

alert("Настройки сохранены (локально)")

}

return(

<PageSection title="Настройки мастера">

<h3>Настройки мастера</h3>

<Block title="Контакты">

<Field label="Телефон" value={phone} onChange={setPhone}/>
<Field label="Email" value={email} onChange={setEmail}/>
<Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp}/>

</Block>

<Block title="Профиль">

<Field label="Имя" value={name} onChange={setName}/>
<Field label="Фото (URL)" value={photo} onChange={setPhoto}/>
<Field label="Описание" value={bio} onChange={setBio}/>

</Block>

<Block title="Услуги">

{services.map((s,i)=>(

<ServiceRow
key={i}
service={s}
setService={(v)=>updateService(i,v)}
/>

))}

<button onClick={addService}>Добавить услугу</button>

</Block>

<Block title="Рабочие часы">

<Field label="Понедельник" value={hours.mon} onChange={v=>setHours({...hours,mon:v})}/>
<Field label="Вторник" value={hours.tue} onChange={v=>setHours({...hours,tue:v})}/>
<Field label="Среда" value={hours.wed} onChange={v=>setHours({...hours,wed:v})}/>
<Field label="Четверг" value={hours.thu} onChange={v=>setHours({...hours,thu:v})}/>
<Field label="Пятница" value={hours.fri} onChange={v=>setHours({...hours,fri:v})}/>
<Field label="Суббота" value={hours.sat} onChange={v=>setHours({...hours,sat:v})}/>
<Field label="Воскресенье" value={hours.sun} onChange={v=>setHours({...hours,sun:v})}/>

</Block>

<Block title="Бронирование">

<Field label="Шаг слота (мин)" value={slot} onChange={setSlot} type="number"/>
<Field label="Минимум до записи (мин)" value={minBefore} onChange={setMinBefore} type="number"/>
<Field label="Максимум вперед (дней)" value={advance} onChange={setAdvance} type="number"/>

</Block>

<button
onClick={save}
style={{
padding:"10px 16px",
borderRadius:"8px",
border:"none",
background:"#111",
color:"#fff",
cursor:"pointer"
}}
>

Сохранить

</button>

</PageSection>

)

}