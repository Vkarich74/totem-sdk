// TOTEM US-07 — real US branches with verified-only activation.
// No fabricated or empty salons/locations are generated.
// The backend revalidates owner auth, market, billing, state, zone and ZIP.
import { useEffect, useState } from "react";
import {
  getSalonUsLocations, mutateSalonUsLocation
} from "../../api/internal";

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

// Only the US branch editor renders these statuses; KG/KZ is unchanged.
// Codes are mapped deliberately, so no internal server stack/error leaks.
const usGeoReasonLabels = Object.freeze({
  US_GEO_NOT_CHECKED: "Not checked yet.",
  US_GEO_EVIDENCE_EXPIRED: "Evidence expired. Save draft changes to recheck.",
  US_GEO_CENSUS_UNAVAILABLE: "US Census address lookup is unavailable.",
  US_GEO_DATASET_UNAVAILABLE: "Verified time-zone polygons are unavailable.",
  US_GEO_CENSUS_NO_MATCH: "US Census could not match this street address.",
  US_GEO_CENSUS_AMBIGUOUS: "US Census returned more than one address.",
  US_GEO_ADDRESS_STATE_MISMATCH: "Address state differs from the selected state.",
  US_GEO_COORDINATE_STATE_MISMATCH: "Coordinates point to another state or district.",
  US_GEO_ZIP5_MISMATCH: "US Census ZIP5 differs from the entered ZIP.",
  US_GEO_ZIP_PLUS4_REQUIRES_USPS_REVIEW: "ZIP+4 needs separate USPS verification.",
  US_GEO_CITY_MISMATCH: "US Census city differs from the entered city.",
  US_GEO_STREET_MISMATCH: "US Census street or house number differs.",
  US_GEO_COORDINATES_INVALID: "US Census coordinates could not be validated.",
  US_GEO_POLYGON_NOT_UNIQUE: "No unique IANA time-zone polygon matched.",
  US_GEO_POLYGON_UNAVAILABLE: "The pinned time-zone boundaries cannot be read.",
  US_GEO_IANA_TIMEZONE_MISMATCH: "Selected time zone differs from mapped location.",
  US_GEO_NEAR_IANA_BORDER: "Location is near an IANA time-zone border.",
});
function geoReasonText(code) {
  return usGeoReasonLabels[String(code)] || "Additional address review is required.";
}
function UsGeoStatus({ location }) {
  const verified = location.geo_status === "VERIFIED_GEOMETRY";
  const reasons = verified ? [] : (
    Array.isArray(location.geo_reasons) && location.geo_reasons.length
      ? location.geo_reasons : ["US_GEO_NOT_CHECKED"]
  );
  return (
    <div aria-label={"Address verification for " + location.location_code}
      style={{fontSize:13,marginTop:8,padding:"9px 10px",borderRadius:9,
        border:"1px solid " + (verified ? "#a7e3bd" : "#f0ce91"),
        background:verified ? "#effcf3" : "#fff9ed",
        color:verified ? "#155b35" : "#7c4511"}}>
      <strong>{verified ? "Geography consistent" : "Address needs review"}</strong>
      <div>{verified
        ? "US Census address, ZIP5 and mapped IANA zone agree."
        : "The branch remains an inactive draft; review the details below."}</div>
      {reasons.length > 0 && <ul style={{margin:"6px 0 3px 0",paddingLeft:18}}>
        {reasons.map((code,i)=><li key={String(code)+i}>{geoReasonText(code)}</li>)}
      </ul>}
      <div style={{fontSize:12,marginTop:5}}>
        {location.geo_source_version ? "Map version: " + location.geo_source_version + ". " : ""}
        {location.geo_expires_at ? "Evidence expiry: " +
          new Date(location.geo_expires_at).toLocaleDateString("en-US") + ". " : ""}
        USPS delivery-point / ZIP+4 not certified. {location.enabled
          ? "Location is active."
          : location.activation_allowed
            ? "Verified location may be activated."
            : "Activation requires current verified evidence."}
      </div>
    </div>
  );
}

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
  if (method === "GET" && pathname === "") {
    return getSalonUsLocations(slug,{signal});
  }
  const path = String(pathname || "").replace(/^\//,"");
  const activate = path.endsWith("/activate");
  const code = activate ? path.slice(0,-"/activate".length) : path;
  if (method === "GET" || (method !== "POST" && method !== "PUT") ||
      (code && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) ||
      (activate && !code)) {
    throw new Error("US_LOCATIONS_METHOD_INVALID");
  }
  return mutateSalonUsLocation(slug,method,code,body,{signal,activate});
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
         typeof payload.activation_allowed!=="boolean"){
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
      if(fresh.market_code!=="US"||typeof fresh.activation_allowed!=="boolean")
        throw new Error("US_LOCATIONS_CONTRACT_MISMATCH");
      setLocations(fresh.locations);
      setEditing("");
      setForm({...blank});
      setNotice("Branch saved. Activation requires current US Census/IANA verification.");
    }catch(e){
      setError(String(e.message||"Could not save the branch."));
    }finally{setSaving(false);}
  }

  async function activateLocation(location) {
    if(!canWrite || saving || !marketActive ||
       location?.activation_allowed!==true || location.enabled)return;
    setSaving(true);setError("");setNotice("");
    try {
      await request(slug,"POST",`/${encodeURIComponent(location.location_code)}/activate`);
      const fresh=await request(slug);
      if(fresh.market_code!=="US"||fresh.currency_code!=="USD"||
         typeof fresh.activation_allowed!=="boolean"||!Array.isArray(fresh.locations)){
        throw new Error("US_LOCATIONS_CONTRACT_MISMATCH");
      }
      setLocations(fresh.locations);
      setNotice("Verified US branch activated. Booking is now available for its schedule.");
    }catch(e){
      setError(String(e.message||"Could not activate the branch."));
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
        {marketActive ? "US market is active. Only verified branches may be activated." :
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
            <UsGeoStatus location={loc} />
          </div>
          {!loc.enabled && (
            <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
              <button type="button" style={css.button} onClick={()=>edit(loc)}
                disabled={!canWrite || saving}>Edit</button>
              <button type="button" style={css.button}
                onClick={()=>activateLocation(loc)}
                disabled={!canWrite || saving || !marketActive ||
                  loc.activation_allowed!==true}
                title={loc.activation_allowed
                  ? "Activate this verified existing branch"
                  : "Verify the address before activation"}>
                Activate verified branch
              </button>
            </div>
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
          <p style={css.note}>Saving this US draft sends the street address to
            the US Census Geocoder. The API checks the returned coordinates
            against pinned 2026d IANA time-zone polygons. A geographic match
            is not USPS delivery-point or ZIP+4 certification. Review results
            appear above. Activation requires current matching verification;
            deleting branches remains unavailable.</p>
        </form>
      </div>
    </section>
  );
}
