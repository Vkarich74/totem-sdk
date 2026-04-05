import React from "react";

export default function StatGrid({ children, className="" }) {

return (

<div className={`stat-grid ${className}`}>

{children}

<style>{`

.stat-grid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
gap:16px;
width:100%;
}

@media (max-width:768px){

.stat-grid{
grid-template-columns:repeat(2,1fr);
gap:12px;
}

}

@media (max-width:480px){

.stat-grid{
grid-template-columns:1fr;
}

}

`}</style>

</div>

);

}