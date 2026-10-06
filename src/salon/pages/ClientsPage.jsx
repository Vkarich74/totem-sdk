import { UiValue, uiMessage, uiDate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveSalonSlug } from "../SalonContext";
import PageSection from "../../cabinet/PageSection";
import { getClients } from "../../api/internal";

export default function ClientsPage(){
  const { renderUi } = useUiMessages();

const [clients,setClients] = useState([]);
const [loading,setLoading] = useState(true);
const [error,setError] = useState(null);
const [search,setSearch] = useState("");

const { slug: routeSlug } = useParams();
const salonSlug = resolveSalonSlug(routeSlug);

useEffect(()=>{

async function load(){

try{

setLoading(true);
setError(null);

const result = await getClients(salonSlug);

if(result?.ok){
setClients(result.clients || []);
}else{
setError(uiError(uiMessage("salon.s0270")));
}

}catch(e){
console.error(e);
setError(uiError(uiMessage("salon.s0271")));
}

setLoading(false);

}

load();

},[salonSlug]);

const filtered = clients.filter(c => {

const q = search.toLowerCase();

return (
(c.name || "").toLowerCase().includes(q) ||
(c.phone || "").toLowerCase().includes(q)
);

});

return (

<PageSection title={uiMessage("salon.s0272")}>

{/* SEARCH */}

<input
placeholder={renderUi(uiMessage("salon.s0273"))}
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
width:"100%",
padding:"12px",
marginBottom:"15px",
border:"1px solid #ddd",
borderRadius:"8px",
fontSize:"14px"
}}
/>

{/* LOADING */}

{loading && (

<div style={{
display:"flex",
flexDirection:"column",
gap:"10px"
}}>
{[1,2,3].map(i=>(
<div key={i} style={{
padding:"15px",
border:"1px solid #eee",
borderRadius:"10px",
background:"#fafafa"
}}><UiValue value={uiMessage("salon.s0274")} /></div>
))}
</div>

)}

{/* ERROR */}

{error && (

<div style={{
padding:"15px",
border:"1px solid #ffdddd",
background:"#fff5f5",
borderRadius:"8px",
color:"#c00"
}}>
<UiValue value={error} />
</div>

)}

{/* EMPTY */}

{!loading && !error && filtered.length === 0 && (

<div style={{
padding:"20px",
border:"1px dashed #ccc",
borderRadius:"10px",
color:"#888",
textAlign:"center"
}}><UiValue value={uiMessage("salon.s0275")} /></div>

)}

{/* LIST */}

{!loading && !error && filtered.length > 0 && (

<div style={{
display:"flex",
flexDirection:"column",
gap:"10px"
}}>

{filtered.map(c=>(

<div
key={c.id}
style={{
border:"1px solid #eee",
borderRadius:"12px",
padding:"15px",
background:"#fff",
boxShadow:"0 2px 6px rgba(0,0,0,0.04)"
}}
>

<div style={{
fontWeight:"600",
fontSize:"15px",
marginBottom:"5px"
}}>
<UiValue value={c.name || uiMessage("salon.s0276")} />
</div>

<div style={{
fontSize:"13px",
color:"#666",
marginBottom:"8px"
}}>
📞 <UiValue value={c.phone || "-"} />
</div>

<div style={{
display:"flex",
justifyContent:"space-between",
fontSize:"13px",
color:"#444"
}}>

<div><UiValue value={uiMessage("salon.s0278")} /><b><UiValue value={c.visits || 0} /></b>
</div>

<div>
<UiValue value={c.created_at
? uiDate(c.created_at, {dateStyle: "short"})
: ""} />
</div>

</div>

</div>

))}

</div>

)}

</PageSection>

);

}
