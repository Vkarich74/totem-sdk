// Existing cabinet route and existing editors, only the approved shared
// operations. No legacy finance, wallet, lifecycle or master-login fallback.
import {useEffect,useState,useRef} from "react";
import {getMaster,getMasterServices,getUsOwnSalonRoleOptions,switchUsOwnSalonContext,resolveSession} from "../api/internal.js";
import {useMarketContext} from "../market/MarketContext.jsx";
import {readSharedCapabilities,normalizeSharedServices} from "./sharedRoleContract.js";
import OwnerProfileSettings from "../cabinet/OwnerProfileSettings.jsx";
import UsServiceLinkEditor from "./UsServiceLinkEditor.jsx";
import UsOwnerPriceEditor from "./UsOwnerPriceEditor.jsx";
import UsMasterWorkingHoursEditor from "../master/pages/UsMasterWorkingHoursEditor.jsx";
import UsMasterManualBooking from "./UsMasterManualBooking.jsx";
const box={padding:16,margin:"12px 0",border:"1px solid #cbd5e1",borderRadius:12,background:"#fff"};
const btn={padding:"10px 14px",border:"1px solid #64748b",borderRadius:8,background:"#fff",cursor:"pointer"};
function PasswordSwitch({role,option,children,onDone}){
  const [open,setOpen]=useState(false),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const locked=useRef(false);
  async function submit(e){
    e.preventDefault();if(locked.current||!password)return;
    locked.current=true;setBusy(true);setError("");
    try{
      const r=await switchUsOwnSalonContext({role,password,masterRequestId:option?.master_request_id,masterSlug:option?.master_slug});
      setPassword("");onDone(r);
    }catch(e){setPassword("");setError(String(e?.message||"US_ROLE_CONTEXT_SWITCH_FAILED"));}
    finally{locked.current=false;setBusy(false);}
  }
  return <div>
    <button type="button" style={btn} onClick={()=>{setOpen(v=>!v);setPassword("");setError("");}} disabled={busy}>{children}</button>
    {open&&<form onSubmit={submit} style={{display:"grid",gap:8,maxWidth:360,marginTop:12}}>
      <label>Confirm your current account password
        <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/>
      </label>
      <button type="submit" style={btn} disabled={busy||!password}>{busy?"Verifying…":"Confirm role switch"}</button>
      {error&&<div role="alert">{error}</div>}
    </form>}
  </div>;
}
export function SalonSharedMasterSwitch({salonSlug}){
  const {context}=useMarketContext();
  const [option,setOption]=useState(null);
  useEffect(()=>{
    setOption(null);
    if(context?.market_code!=="US"||!salonSlug)return;
    const ac=new AbortController();
    getUsOwnSalonRoleOptions(salonSlug,{signal:ac.signal}).then(rows=>{
      if(!ac.signal.aborted)setOption(rows[0]||null);
    }).catch(()=>{});
    return ()=>ac.abort();
  },[salonSlug,context?.market_code]);
  if(!option)return null;
  return <section style={{...box,margin:"12px"}}>
    <PasswordSwitch role="master" option={option} onDone={r=>{
      window.location.hash="/master/"+encodeURIComponent(r.master_slug)+"/dashboard";
    }}>Open my Master workspace</PasswordSwitch>
  </section>;
}
export default function SharedMasterCabinet({slug,session}){
  const [caps,setCaps]=useState(null),[services,setServices]=useState([]),[status,setStatus]=useState("loading"),[salonSlug,setSalonSlug]=useState(""),[revision,setRevision]=useState(0);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let live=true,busy=false;
    const ac=new AbortController();
    async function load(){
      if(busy||!live)return;busy=true;
      try{
        const active=await resolveSession();
        const root=await getMaster(slug,{signal:ac.signal});
        const next=readSharedCapabilities(root,active,slug);
        if(!next||active.auth.session_id!==session.auth.session_id||active.auth.user_id!==session.auth.user_id)throw Error("US_SHARED_AUTHORITY_REQUIRED");
        let rows=[];
        if(next.services){
          const data=await getMasterServices(slug);
          if(data?.ok!==true)throw Error("US_SHARED_SERVICES_UNAVAILABLE");
          rows=normalizeSharedServices(data.services,next);
        }
        if(live){setCaps(next);setSalonSlug(next.salonSlug);setServices(rows);setStatus("ready");}
      }catch(e){if(live){setCaps(null);setServices([]);setStatus("blocked");}}
      finally{busy=false;}
    }
    load();const timer=setInterval(load,15000);
    function resume(){if(document.visibilityState==="visible")load();}
    document.addEventListener("visibilitychange",resume);
    return ()=>{live=false;ac.abort();clearInterval(timer);document.removeEventListener("visibilitychange",resume);};
  },[slug,session.auth.session_id,refresh]);
  const changed=()=>{setRevision(n=>n+1);setRefresh(n=>n+1);};
  const salonLogin=()=>{window.location.hash="/auth/login?role=salon_admin"+(salonSlug?"&slug="+encodeURIComponent(salonSlug):"");};
  return <main style={{maxWidth:980,margin:"0 auto",padding:16,color:"#0f172a"}}>
    <section style={box}>
      <h1>My Master workspace</h1>
      <p>One salon subscription · limited operational role</p>
      {status==="ready"?<PasswordSwitch role="salon_admin" onDone={()=>{window.location.hash="/salon/"+encodeURIComponent(salonSlug)+"/dashboard";}}>Return to salon owner</PasswordSwitch>:<button style={btn} onClick={salonLogin}>Sign in as salon owner</button>}
      <p>Financial operations remain in the salon owner workspace. No separate Master wallet, payout or merchant account is granted.</p>
      {status==="loading"&&<p role="status">Checking access…</p>}
      {status==="blocked"&&<p role="alert">Access expired, revoked or unavailable. Sign in as the salon owner to continue.</p>}
    </section>
    {status==="ready"&&caps&&<>
      {caps.profile&&<section style={box}><OwnerProfileSettings ownerType="master" ownerSlug={slug} canWrite onPersisted={changed}/></section>}
      {caps.services&&caps.price&&<section style={box}>
        <UsServiceLinkEditor ownerType="master" ownerSlug={slug} canWrite onSaved={changed}/>
        {services.map(s=><div key={s.id}><strong>{s.name}</strong><UsOwnerPriceEditor ownerType="master" ownerSlug={slug} serviceLinkId={s.id} isUsMarket canWrite/></div>)}
      </section>}
      {caps.hours&&<section style={box}><UsMasterWorkingHoursEditor masterSlug={slug} canWrite/></section>}
      {caps.booking&&<section style={box}><UsMasterManualBooking key={revision} masterSlug={slug} canWrite onBooked={()=>setRefresh(n=>n+1)}/></section>}
    </>}
  </main>;
}
