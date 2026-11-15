// TOTEM US-05 — salon-owner-only US branch and address editor.
// Production US market and branches stay inactive; this UI edits DRAFTS only.
// The backend revalidates owner auth, market, billing, state, zone and ZIP.
import { useEffect, useState } from "react";
import { getAuthAccessToken } from "../../api/internal";

const API = String(
  typeof window !== "undefined" && window.TOTEM_API_BASE
    ? window.TOTEM_API_BASE : "https://api.totemv.com"
).replace(/\/$/, "");

const blank = Object.freeze({
  location_code: "", state_code: "", city_name: "", street_line1: "",
  street_line2: "", postal_code: "", timezone_name: "", is_primary: false,
});
const css = {
  box: { border:"1px solid #d6dee8",background:"#ffffff",
    padding:18,borderRadius:13,marginTop:18 },
  fields: { display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(225px,1fr))",
    gap:14 },
  field: { display:"grid",gap:5,fontSize:13,fontWeight:600,color:"#243142" },
  input: { width:"100%",maxWidth:"100%",boxSizing:"border-box",
    fontSize:16,padding:"10px",border:"1px solid #bcc9d7",borderRadius:8,
    background:"#fff",color:"#111827" },
  button: { padding:"10px 14px",borderRadius:8,border:"1px solid #8aa0ba",
    color:"#172a46",fontSize:14,fontWeight:650,background:"#f3f7fc",
    cursor:"pointer" },
  note: { fontSize:13,color:"#475569",lineHeight:1.6 },
  row: { borderBottom:"1px solid #e2e8f0",padding:"10px 0",
    display:"flex",gap:14,justifyContent:"space-between",
    alignItems:"flex-start",flexWrap:"wrap" },
};

function checkDraft(form, editing) {
  if (!editing && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.location_code))
    return "Enter a branch code with lowercase letters, digits and hyphens.";
  if (!/^[A-Z]{2}$/.test(form.state_code) ||
      form.city_name.trim().length < 1 || form.city_name.trim().length > 120 ||
      form.street_line1.trim().length < 3 ||
      form.street_line1.trim().length > 220 ||
      form.street_line2.trim().length > 220 ||
      !/^\d{5}(?:-\d{4})?$/.test(form.postal_code) ||
      !form.timezone_name) {
    return "Complete the state, city, street, ZIP code and IANA time zone.";
  }
  return "";
}

async function request(slug, method="GET", pathname="", body=null, signal=null) {
  const token=getAuthAccessToken();
  if (!token) {
    const error=new Error("Sign in to manage salon branches.");
    error.status=401;
    throw error;
  }
  const response=await fetch(
    `${API}/internal/salons/${encodeURIComponent(slug)}/us-locations${pathname}`,
    {
      method, credentials:"omit",signal,
      headers:{
        "Accept":"application/json",
        "Authorization":`Bearer ${token}`,
        ...(body ? {"Content-Type":"application/json"} : {}),
      },
      ...(body ? {body:JSON.stringify(body)} : {}),
    }
  );
  const payload=await response.json().catch(()=>null);
  if(!response.ok || payload?.ok!==true){
    const error=new Error(payload?.error||"US_LOCATIONS_REQUEST_FAILED");
    error.status=response.status;
    throw error;
  }
  return payload;
}

export default function UsSalonLocationsEditor({ slug, canWrite }) {
  const [status,setStatus]=useState("loading");
  const [states,setStates]=useState([]);
  const [zones,setZones]=useState([]);
  const [locations,setLocations]=useState([]);
  const [marketActive,setMarketActive]=useState(false);
  const [form,setForm]=useState({...blank});
  const [editing,setEditing]=useState("");
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    setStatus("loading");
    setEditing("");
    setForm({...blank});
    setError("");
    if(!slug){
      setStatus("absent");
      return ()=>controller.abort();
    }
    request(slug,"GET","",null,controller.signal).then(payload=>{
      if(!active)return;
      if(payload.market_code!=="US" || payload.currency_code!=="USD" ||
         !Array.isArray(payload.states) || payload.states.length!==51 ||
         !Array.isArray(payload.timezones) || payload.timezones.length!==29 ||
         !Array.isArray(payload.locations) ||
         payload.activation_allowed!==false){
        throw new Error("US_LOCATIONS_CONTRACT_MISMATCH");
      }
      setStates(payload.states);
      setZones(payload.timezones);
      setLocations(payload.locations);
      setMarketActive(payload.market_active===true);
      setStatus("ready");
    }).catch(e=>{
      if(!active || e.name==="AbortError")return;
      if(e.status===404){setStatus("absent");return;}
      setStatus("error");
      setError(e.message);
    });
    return ()=>{active=false;controller.abort();};
  },[slug]);

  function edit(location) {
    if(location?.enabled)return;
    setEditing(location?.location_code||"");
    setForm(location ? {
      location_code:location.location_code,
      state_code:location.state_code,
      city_name:location.city_name,
      street_line1:location.street_line1,
      street_line2:location.street_line2||"",
      postal_code:location.postal_code,
      timezone_name:location.timezone_name,
      is_primary:location.is_primary===true,
    } : {...blank});
    setError("");
    setNotice("");
  }

  function change(field,value){
    setForm(current=>({...current,[field]:value}));
    setError("");
    setNotice("");
  }

  async function submit(event){
    event.preventDefault();
    if(!canWrite || saving)return;
    const bad=checkDraft(form,Boolean(editing));
    if(bad){setError(bad);return;}
    setSaving(true);setError("");setNotice("");
    try{
      const body={
        state_code:form.state_code,
        city_name:form.city_name.trim(),
        street_line1:form.street_line1.trim(),
        street_line2:form.street_line2.trim(),
        postal_code:form.postal_code,
        timezone_name:form.timezone_name,
        is_primary:form.is_primary,
        ...(!editing ? {location_code:form.location_code} : {}),
      };
      await request(slug,editing?"PUT":"POST",
        editing?`/${encodeURIComponent(editing)}`:"",body);
      const fresh=await request(slug);
      if(fresh.market_code!=="US"||fresh.activation_allowed!==false)
        throw new Error("US_LOCATIONS_CONTRACT_MISMATCH");
      setLocations(fresh.locations);
      setEditing("");
      setForm({...blank});
      setNotice("Draft branch saved. Booking activation is locked.");
    }catch(e){
      setError(String(e.message||"Could not save the branch."));
    }finally{setSaving(false);}
  }

  if(status==="loading")return <p role="status" style={css.note}>Loading US salon branches…</p>;
  if(status==="absent")return null;
  if(status==="error")return (
    <section style={css.box} role="alert">
      <h3>United States · salon branches</h3>
      <p style={{color:"#9f1239"}}>{error}</p>
    </section>
  );
  return (
    <section style={css.box} aria-label="US salon branches">
      <h3 style={{marginTop:0}}>United States · salon locations</h3>
      <p style={css.note}>Manage your US branch address, ZIP or ZIP+4, and exact IANA time zone.
        Each location has its own local calendar. A state does not determine the
        time zone automatically; verify the IANA zone against the physical address.</p>
      <p style={{...css.note,color:"#92400e"}} role="status">
        {marketActive ? "US test market flag detected; branch activation remains locked." :
          "US market is not live. All new branches remain inactive drafts."}
        {" "}Online payments are not available.
      </p>
      <h4>Saved branches ({locations.length})</h4>
      {locations.length===0 && <p style={css.note}>No branches have been added.</p>}
      {locations.map(loc=>(
        <div key={loc.location_code} style={css.row}>
          <div style={{minWidth:0,maxWidth:"100%"}}>
            <strong>{loc.location_code}{loc.is_primary?" · Primary":""}</strong>
            <div>{loc.street_line1}{loc.street_line2?` · ${loc.street_line2}`:""}</div>
            <div>{loc.city_name}, {loc.state_code} {loc.postal_code}</div>
            <small>{loc.timezone_name} · {loc.enabled?"Active · locked":"Inactive draft"}</small>
          </div>
          {!loc.enabled && (
            <button type="button" style={css.button} onClick={()=>edit(loc)}
              disabled={!canWrite || saving}>Edit</button>
          )}
        </div>
      ))}
      <div style={{marginTop:20}}>
        <h4>{editing?`Edit branch: ${editing}`:"Add a US branch"}</h4>
        <form onSubmit={submit} style={{display:"grid",gap:14}}>
          <div style={css.fields}>
            <label style={css.field}>Branch code
              <input style={css.input} value={form.location_code}
                disabled={Boolean(editing) || !canWrite} required
                placeholder="e.g. downtown" maxLength={100}
                onChange={e=>change("location_code",e.target.value)}/>
            </label>
            <label style={css.field}>State or district
              <select style={css.input} value={form.state_code} required
                disabled={!canWrite} onChange={e=>change("state_code",e.target.value)}>
                <option value="">Select state</option>
                {states.map(x=><option key={x.code} value={x.code}>
                  {x.name_en} ({x.code})
                </option>)}
              </select>
            </label>
            <label style={css.field}>City
              <input style={css.input} value={form.city_name} required maxLength={120}
                disabled={!canWrite} onChange={e=>change("city_name",e.target.value)}/>
            </label>
            <label style={css.field}>Street address
              <input style={css.input} value={form.street_line1} required maxLength={220}
                disabled={!canWrite} onChange={e=>change("street_line1",e.target.value)}/>
            </label>
            <label style={css.field}>Suite / unit (optional)
              <input style={css.input} value={form.street_line2} maxLength={220}
                disabled={!canWrite} onChange={e=>change("street_line2",e.target.value)}/>
            </label>
            <label style={css.field}>ZIP / ZIP+4
              <input style={css.input} value={form.postal_code} required
                pattern="[0-9]{5}(-[0-9]{4})?" placeholder="10001 or 10001-0001"
                disabled={!canWrite} onChange={e=>change("postal_code",e.target.value)}/>
            </label>
            <label style={css.field}>IANA time zone
              <select style={css.input} value={form.timezone_name} required
                disabled={!canWrite} onChange={e=>change("timezone_name",e.target.value)}>
                <option value="">Select verified IANA time zone</option>
                {zones.map(zone=><option key={zone} value={zone}>{zone}</option>)}
              </select>
            </label>
            <label style={{...css.field,display:"flex",alignItems:"center",gap:10}}>
              <input type="checkbox" checked={form.is_primary} disabled={!canWrite}
                onChange={e=>change("is_primary",e.target.checked)}/>
              Set as primary branch
            </label>
          </div>
          {error && <p role="alert" style={{color:"#b42318"}}>{error}</p>}
          {notice && <p role="status" style={{color:"#047857"}}>{notice}</p>}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button style={css.button} type="submit" disabled={!canWrite||saving}>
              {saving?"Saving…":editing?"Save draft changes":"Add inactive branch"}
            </button>
            {editing && <button type="button" style={css.button}
              onClick={()=>edit(null)} disabled={saving}>Cancel edit</button>}
          </div>
          <p style={css.note}>Address formatting is checked. USPS delivery-point
            confirmation and the state's exact time-zone boundary are not
            verified automatically. No branch activation or deletion is available.</p>
        </form>
      </div>
    </section>
  );
}
