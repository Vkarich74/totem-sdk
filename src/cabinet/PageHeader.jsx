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
gap:"16px",
marginBottom:"20px"
}}>

<div style={{flex:1}}>

<div style={{
fontSize:"22px",
fontWeight:"700",
lineHeight:"26px"
}}>
{title}
</div>

{subtitle && (

<div style={{
fontSize:"13px",
color:"#6b7280",
marginTop:"4px"
}}>
{subtitle}
</div>

)}

</div>

{actions && (

<div style={{
display:"flex",
gap:"8px"
}}>
{actions}
</div>

)}

</div>

)

}