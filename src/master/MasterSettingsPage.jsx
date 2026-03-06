import {useState} from "react"
import {useMaster} from "./MasterContext"

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

<div style={{
marginBottom:"10px"
}}>

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

export default function MasterSettingsPage(){

const {master,reload}=useMaster()

const [name,setName]=useState(master?.name||"")

const [phone,setPhone]=useState("")
const [email,setEmail]=useState("")
const [whatsapp,setWhatsapp]=useState("")

const [bio,setBio]=useState("")

const [slot,setSlot]=useState(15)
const [advance,setAdvance]=useState(30)
const [minBefore,setMinBefore]=useState(60)

const save=()=>{

console.log("MASTER SETTINGS SAVE",{
name,
phone,
email,
whatsapp,
bio,
slot,
advance,
minBefore
})

alert("Настройки сохранены (пока локально)")

}

return(

<div>

<h3>Настройки мастера</h3>

<Block title="Профиль">

<Field
label="Имя мастера"
value={name}
onChange={setName}
/>

<Field
label="Описание / специализация"
value={bio}
onChange={setBio}
/>

</Block>

<Block title="Контакты">

<Field
label="Телефон"
value={phone}
onChange={setPhone}
/>

<Field
label="Email"
value={email}
onChange={setEmail}
/>

<Field
label="WhatsApp"
value={whatsapp}
onChange={setWhatsapp}
/>

</Block>

<Block title="Букинг правила">

<Field
label="Длительность слота (мин)"
value={slot}
onChange={setSlot}
type="number"
/>

<Field
label="Минимум до записи (мин)"
value={minBefore}
onChange={setMinBefore}
type="number"
/>

<Field
label="Максимум вперёд (дней)"
value={advance}
onChange={setAdvance}
type="number"
/>

</Block>

<Block title="Система">

<div>Slug: {window.MASTER_SLUG}</div>

<button
onClick={reload}
style={{
marginTop:"10px",
padding:"8px 12px",
borderRadius:"6px",
border:"1px solid #ddd",
background:"#fff"
}}
>

Обновить данные

</button>

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

Сохранить настройки

</button>

</div>

)

}