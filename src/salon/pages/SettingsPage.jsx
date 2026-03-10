import { useState } from "react";
import PageSection from "../../cabinet/PageSection";

export default function SettingsPage(){

const [name,setName] = useState("Мой салон");

return(

<PageSection title="Настройки салона">

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

</PageSection>

);

}