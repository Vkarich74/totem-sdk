import { UiValue } from "../i18n/uiMessages.js";
import React from "react"

export default function PageHeader({
title,
subtitle,
actions
}){

return(

<div style={{
display:"flex",
alignItems:"center",
flexWrap:"wrap",
gap:"16px",
marginBottom:"20px"
}}>

<div style={{flex:"1 1 220px", minWidth:0}}>

<div style={{
fontSize:"22px",
fontWeight:"700",
lineHeight:"26px"
}}>
<UiValue value={title} />
</div>

{subtitle && (

<div style={{
fontSize:"13px",
color:"#6b7280",
marginTop:"4px"
}}>
<UiValue value={subtitle} />
</div>

)}

</div>

{actions && (

<div style={{
display:"flex",
gap:"8px",
flexWrap:"wrap",
maxWidth:"100%"
}}>
<UiValue value={actions} />
</div>

)}

</div>

)

}