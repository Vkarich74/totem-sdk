const fs = require("fs");
const path = require("path");

const ROOT = "C:/Work/totem-sdk";

function write(file, content){
  const p = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(p), { recursive:true });
  fs.writeFileSync(p, content);
  console.log("CREATE", file);
}

write(
"src/owner/OwnerMoneyPage.jsx",
`
import { useEffect, useState } from "react";
import * as api from "../api/internal";
import { getSalonSlug } from "../utils/salon";

export default function OwnerMoneyPage(){

const salonSlug = getSalonSlug();

const [metrics,setMetrics] = useState(null);

useEffect(()=>{

async function load(){

const res = await api.getMetrics(salonSlug);

if(res.ok){
setMetrics(res.metrics);
}

}

load();

},[]);

if(!metrics){
return <div style={{padding:"20px"}}>Загрузка...</div>
}

return(

<div style={{padding:"20px"}}>

<h2>Финансы салона</h2>

<div style={{marginTop:"20px"}}>

<div>Доход сегодня: <b>{metrics.revenue_today} сом</b></div>
<div>Доход за месяц: <b>{metrics.revenue_month} сом</b></div>

<div style={{marginTop:"10px"}}>
Всего платежей: {metrics.payments_total}
</div>

</div>

</div>

);

}
`
);

write(
"src/owner/OwnerSettingsPage.jsx",
`
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
`
);

console.log("OWNER FINAL PAGES CREATED");