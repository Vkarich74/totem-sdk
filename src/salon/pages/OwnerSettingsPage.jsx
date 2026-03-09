
import { useState } from "react";

export default function OwnerSettingsPage(){

const [name,setName] = useState("Мой салон");

return(

<div style={{padding:"20px"}}>

<h2>Настройки салона</h2>

<div style={{marginTop:"20px"}}>

<div style={{marginBottom:"10px"}}>

<label>Название салона</label>

<br/>

<input
value={name}
onChange={e=>setName(e.target.value)}
style={{
padding:"6px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
/>

</div>

<div style={{marginTop:"20px"}}>

<div>Валюта: <b>сом</b></div>

<div>Язык: <b>русский</b></div>

</div>

</div>

</div>

);

}
