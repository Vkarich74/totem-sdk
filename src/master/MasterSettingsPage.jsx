import {useMaster} from "./MasterContext"

function Row({label,value}){

return(

<div style={{
display:"flex",
justifyContent:"space-between",
padding:"10px 0",
borderBottom:"1px solid #eee"
}}>

<div style={{color:"#666"}}>{label}</div>

<div style={{fontWeight:"bold"}}>{value||"-"}</div>

</div>

)

}

export default function MasterSettingsPage(){

const {master,reload}=useMaster()

return(

<div>

<h3>Настройки</h3>

<div style={{
border:"1px solid #eee",
borderRadius:"10px",
padding:"14px",
marginBottom:"16px"
}}>

<b>Профиль мастера</b>

<Row label="Имя мастера" value={master?.name}/>

<Row label="Slug" value={window.MASTER_SLUG}/>

<Row label="Master ID" value={master?.id}/>

<Row label="User ID" value={master?.user_id}/>

</div>

<div style={{
border:"1px solid #eee",
borderRadius:"10px",
padding:"14px",
marginBottom:"16px"
}}>

<b>Система</b>

<Row label="API" value="api.totemv.com"/>

<Row label="SDK" value="app.totemv.com"/>

<Row label="Platform" value="TOTEM Master CRM"/>

</div>

<button
onClick={reload}
style={{
padding:"10px 14px",
borderRadius:"8px",
border:"1px solid #ddd",
background:"#fff",
cursor:"pointer"
}}
>

Обновить данные

</button>

</div>

)

}