// Shared role authority is an extension of the existing MasterLayout,
// never an alternate cabinet or a second token/session store.
import {createContext,useContext,useEffect,useState,useRef} from "react";
import {getMaster,getUsOwnSalonRoleOptions,switchUsOwnSalonContext,resolveSession} from "../api/internal.js";
import {useMarketContext} from "../market/MarketContext.jsx";
import {readSharedCapabilities} from "./sharedRoleContract.js";
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

const SharedRole=createContext(null);
export const useSharedMasterRole=()=>useContext(SharedRole);
export function SharedMasterRoleProvider({slug,session,children}){
  const [state,setState]=useState({status:"loading",root:null,caps:null,salonSlug:""});
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let live=true,busy=false;
    const ac=new AbortController();
    async function load(){
      if(busy||!live)return;busy=true;
      try{
        const active=await resolveSession();
        const root=await getMaster(slug,{signal:ac.signal});
        const caps=readSharedCapabilities(root,active,slug);
        if(!caps||active.auth.session_id!==session.auth.session_id||
           String(active.auth.user_id)!==String(session.auth.user_id))
          throw Error("US_SHARED_AUTHORITY_REQUIRED");
        if(live)setState({status:"ready",root,caps,salonSlug:caps.salonSlug});
      }catch(_error){
        if(live)setState(prev=>({...prev,status:"blocked",root:null,caps:null}));
      }finally{busy=false;}
    }
    load();const timer=setInterval(load,15000);
    function resume(){if(document.visibilityState==="visible")load();}
    document.addEventListener("visibilitychange",resume);
    return ()=>{live=false;ac.abort();clearInterval(timer);document.removeEventListener("visibilitychange",resume);};
  },[slug,session.auth.session_id,session.auth.user_id,refresh]);
  return <SharedRole.Provider value={{...state,refresh:()=>setRefresh(x=>x+1)}}>{children}</SharedRole.Provider>;
}
export function SharedMasterReturn(){
  const shared=useSharedMasterRole();
  if(!shared)return null;
  if(shared.status==="ready")return <PasswordSwitch role="salon_admin" onDone={()=>{
    window.location.hash="/salon/"+encodeURIComponent(shared.salonSlug)+"/dashboard";
  }}>Return to salon owner</PasswordSwitch>;
  return <a href={"#/auth/login?role=salon_admin"+(shared.salonSlug?"&slug="+encodeURIComponent(shared.salonSlug):"")}>Sign in as salon owner</a>;
}
export function allowedSharedSections(caps){
  if(!caps)return [];
  return ["dashboard",...(caps.services?["services"]:[]),...(caps.hours?["schedule"]:[]),
    ...(caps.booking?["bookings"]:[]),"settings"];
}
