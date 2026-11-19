// US-MASTER-BOOKING-02 — canonical manual booking in existing master cabinet.
// US branch, active salon/master service, authoritative USD cents, real IANA
// slot; uses the same public booking transaction through authenticated route.
import { useEffect,useMemo,useRef,useState } from "react";
import {
  getMasterUsWorkingHours,getMasterServices,getUsOwnerServicePrice,
  postUsMasterManualBooking,
} from "../api/internal.js";
import {
  normalizeUsMasterHoursLocations,isValidUsSlot,getUsBusinessDate,
  normalizeUsPhoneDraft,
} from "./usBookingModel.js";
import {parseUsPriceResponse,formatUsdMinor} from "./usOwnerPriceModel.js";

const API=String(import.meta.env.VITE_API_BASE||
  (typeof window!=="undefined"?window.TOTEM_API_BASE:"")||
  "https://api.totemv.com").replace(/\/$/,"");
const input={width:"100%",maxWidth:510,minHeight:42,padding:"9px 12px",
  boxSizing:"border-box",border:"1px solid #94a3b8",borderRadius:8,
  background:"#fff",fontSize:15};
const panel={display:"grid",gap:14,padding:18,
  border:"1px solid #cbd5e1",borderRadius:12,background:"#f8fafc"};
const label={display:"grid",gap:6,fontWeight:600,color:"#334155"};
const button={minHeight:44,borderRadius:8,padding:"10px 16px",
  border:"1px solid #64748b",background:"#fff",fontWeight:600};

async function readAvailability(salon,masterId,serviceId,location,date,signal){
  const search=new URLSearchParams({service_id:String(serviceId),date,
    location_code:location.location_code,step_min:"15"});
  const res=await fetch(API+"/public/salons/"+encodeURIComponent(salon)+
    "/masters/"+encodeURIComponent(masterId)+"/availability?"+search,
    {method:"GET",credentials:"omit",cache:"no-store",signal,
     headers:{Accept:"application/json"}});
  const data=await res.json().catch(()=>null);
  if(!res.ok||data?.ok!==true)
    throw Error(String(data?.error||"US_MANUAL_AVAILABILITY_FAILED"));
  if(data.location_code!==location.location_code||
     data.timezone!==location.timezone||data.date!==date||
     Number(data.master_id)!==Number(masterId)||
     Number(data.service_id)!==Number(serviceId)||
     !Array.isArray(data.slots)||
     data.slots.some(slot=>!isValidUsSlot(slot,location.location_code)))
    throw Error("US_MANUAL_AVAILABILITY_CONTRACT_MISMATCH");
  return data;
}

export default function UsMasterManualBooking({
  masterSlug,canWrite=false,initialDate="",onBooked=()=>{},
}){
  const [locations,setLocations]=useState([]);
  const [services,setServices]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [branch,setBranch]=useState("");
  const [serviceId,setServiceId]=useState("");
  const [date,setDate]=useState(initialDate);
  const [slots,setSlots]=useState([]);
  const [slotStart,setSlotStart]=useState("");
  const [amount,setAmount]=useState(null);
  const [availableLoading,setAvailableLoading]=useState(false);
  const [booking,setBooking]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(null);
  const [uncertain,setUncertain]=useState(false);
  const [clientName,setClientName]=useState("");
  const [phone,setPhone]=useState("");
  const lock=useRef(false);
  const requestKey=useRef(null);

  useEffect(()=>{
    if(!masterSlug)return;
    const ac=new AbortController();let live=true;
    setLoading(true);setLoadError("");setLocations([]);setServices([]);
    setBranch("");setServiceId("");setSuccess(null);
    Promise.all([
      getMasterUsWorkingHours(masterSlug,{signal:ac.signal}),
      getMasterServices(masterSlug),
    ]).then(([locationData,serviceData])=>{
      if(!live)return;
      if(serviceData?.ok!==true||!Array.isArray(serviceData.services))
        throw Error("US_MANUAL_SERVICES_UNAVAILABLE");
      setLocations(normalizeUsMasterHoursLocations(locationData,masterSlug));
      setServices(serviceData.services.filter(s=>
        s?.market_code==="US"&&s?.currency_code==="USD"&&
        s?.active===true&&Number.isSafeInteger(Number(s?.id))&&
        Number(s.id)>0));
    }).catch(problem=>{
      if(live&&!ac.signal.aborted)
        setLoadError(String(problem?.message||"US_MANUAL_SCOPE_UNAVAILABLE"));
    }).finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;ac.abort();};
  },[masterSlug]);

  const location=locations.find(x=>
    x.salon_slug+"/"+x.location_code===branch)||null;
  const scopedServices=useMemo(()=>
    location?services.filter(s=>s.salon_slug===location.salon_slug):[],
    [location,services]);
  const service=scopedServices.find(s=>String(s.id)===serviceId)||null;
  const slot=slots.find(s=>s.start_at===slotStart)||null;
  const minDate=location?getUsBusinessDate(new Date(),location.timezone):"";

  useEffect(()=>{
    setSlots([]);setSlotStart("");setAmount(null);setError("");
    if(!location||!service||!date||date<minDate||uncertain)return;
    let live=true;const ac=new AbortController();
    setAvailableLoading(true);
    Promise.all([
      getUsOwnerServicePrice("master",masterSlug,service.id,{signal:ac.signal}),
      readAvailability(location.salon_slug,service.master_id,service.id,
        location,date,ac.signal),
    ]).then(([ownerPrice,availability])=>{
      if(!live)return;
      const price=parseUsPriceResponse(ownerPrice,"master",masterSlug,service.id);
      const offered=availability.service_price;
      if(!price.configured||offered?.configured!==true||
         offered.currency_code!=="USD"||
         offered.source!=="us_service_price_amounts"||
         offered.amount_minor!==String(price.amount_minor)||
         offered.price_version!==price.price_version)
        throw Error("US_MANUAL_USD_PRICE_MISMATCH");
      setAmount(price);
      setSlots(availability.slots);
    }).catch(problem=>{
      if(live&&!ac.signal.aborted)setError(String(
        problem?.message||"US_MANUAL_SLOTS_UNAVAILABLE"));
    }).finally(()=>{if(live)setAvailableLoading(false);});
    return ()=>{live=false;ac.abort();};
  },[masterSlug,location,serviceId,service?.id,date,minDate,uncertain]);

  const canSubmit=canWrite&&!loading&&!booking&&!uncertain&&
    !availableLoading&&location&&service&&slot&&amount&&
    clientName.trim().length>=2&&clientName.trim().length<=160&&
    phone.trim().length>=7;

  async function submit(event){
    event.preventDefault();
    if(!canSubmit||lock.current)return;
    let normalizedPhone;
    try {
      normalizedPhone=normalizeUsPhoneDraft(phone);
      if(!normalizedPhone)throw Error("US_MANUAL_CLIENT_PHONE_INVALID");
    }catch(problem){setError(String(problem?.message||"US_PHONE_INVALID"));return;}
    const body={
      salon_slug:location.salon_slug,
      location_code:location.location_code,
      service_id:Number(service.id),date,time:slot.local_time,
      start_at:slot.start_at,
      client_payload:{name:clientName.trim(),phone:normalizedPhone},
      expected_us_price_version:amount.price_version,
      expected_us_amount_minor:String(amount.amount_minor),
    };
    if(!requestKey.current)requestKey.current=crypto.randomUUID();
    lock.current=true;setBooking(true);setError("");
    try {
      const result=await postUsMasterManualBooking(
        masterSlug,body,requestKey.current);
      if(!Number.isSafeInteger(Number(result.booking_id))||
         Number(result.booking_id)<1||result.status!=="reserved"||
         result.us_service_price?.currency_code!=="USD"||
         result.us_service_price?.service_price_version!==amount.price_version||
         result.us_service_price?.amount_minor!==String(amount.amount_minor)) {
        throw Error("US_MANUAL_BOOKING_RESPONSE_MISMATCH");
      }
      setSuccess({id:Number(result.booking_id),date,
        time:slot.local_time,timezone:location.timezone,
        price:amount.amount_minor});
      requestKey.current=null;
      setUncertain(false);
      if(typeof onBooked==="function")onBooked(result);
    } catch(problem){
      // A timeout can follow a COMMIT; do NOT silently repeat POST.
      setUncertain(true);
      setError("Запись не подтверждена. Проверьте расписание перед новым"+
        " созданием. "+String(problem?.message||"US_MANUAL_BOOKING_FAILED"));
    }finally{lock.current=false;setBooking(false);}
  }

  function chooseBranch(v){setBranch(v);setServiceId("");setDate("");
    setAmount(null);setSlots([]);setSlotStart("");setError("");requestKey.current=null;}
  function chooseService(v){setServiceId(v);setSlotStart("");setError("");
    requestKey.current=null;}
  if(!masterSlug)return null;
  return <section style={panel} aria-label="Ручная запись мастера США">
    <h3 style={{fontSize:18,margin:0}}>Ручная запись · США</h3>
    <p style={{margin:0,color:"#475569",lineHeight:1.5}}>
      Выберите действующий филиал, услугу и свободное время.
      Часы учитывают часовой пояс филиала и переходы DST.
      Цена — подтверждённая стоимость услуги в USD.
      Оплата не создаётся.
    </p>
    {loading?<p role="status">Загрузка US-филиалов и услуг…</p>:null}
    {loadError?<p role="alert">{loadError}</p>:null}
    {!loading&&!loadError&&locations.length===0?
      <p role="status">У мастера нет доступных US-филиалов.</p>:null}
    {!loading&&!loadError&&locations.length>0?(
      <form onSubmit={submit} style={{display:"grid",gap:13}}>
        <label style={label}>Филиал
          <select style={input} value={branch}
            onChange={e=>chooseBranch(e.target.value)}
            disabled={booking||uncertain}>
            <option value="">Выберите филиал</option>
            {locations.map(item=><option
              key={item.salon_slug+"/"+item.location_code}
              value={item.salon_slug+"/"+item.location_code}>
              {item.salon_name} · {item.city_name} ({item.timezone})
            </option>)}
          </select>
        </label>
        <label style={label}>Услуга выбранного салона
          <select style={input} value={serviceId}
            disabled={!location||booking||uncertain}
            onChange={e=>chooseService(e.target.value)}>
            <option value="">Выберите услугу</option>
            {scopedServices.map(item=><option key={item.id} value={String(item.id)}>
              {item.name} · {item.duration_min} мин
            </option>)}
          </select>
        </label>
        <label style={label}>Дата по часовому поясу филиала
          <input style={input} type="date" value={date}
            min={minDate||undefined} disabled={!service||booking||uncertain}
            onChange={e=>{setDate(e.target.value);setSlotStart("");requestKey.current=null;}}/>
        </label>
        {availableLoading?<p role="status">Получаем свободные слоты и цену USD…</p>:null}
        {amount?<p style={{margin:0}}>Цена услуги: <strong>
          {formatUsdMinor(amount.amount_minor)}
        </strong></p>:null}
        <label style={label}>Свободное время ({location?.timezone||"IANA"})
          <select style={input} value={slotStart}
            disabled={!amount||!slots.length||booking||uncertain}
            onChange={e=>{setSlotStart(e.target.value);requestKey.current=null;}}>
            <option value="">Выберите подтверждённый слот</option>
            {slots.map(s=><option key={s.start_at} value={s.start_at}>
              {s.local_time}
            </option>)}
          </select>
        </label>
        {service&&date&&!availableLoading&&slots.length===0?
          <p role="status">Свободных подтверждённых слотов нет.</p>:null}
        <label style={label}>Имя клиента
          <input style={input} type="text" value={clientName}
            maxLength={160} disabled={booking||uncertain}
            onChange={e=>setClientName(e.target.value)}/>
        </label>
        <label style={label}>Телефон клиента (США)
          <input style={input} type="tel" value={phone}
            disabled={booking||uncertain}
            onChange={e=>setPhone(e.target.value)}
            placeholder="+1 212 555 0100"/>
        </label>
        {error?<p role="alert" style={{color:"#991b1b"}}>{error}</p>:null}
        {success?<p role="status" style={{color:"#166534"}}>
          Запись #{success.id} подтверждена: {success.date} {success.time}
          ({success.timezone}), {formatUsdMinor(success.price)}.
        </p>:null}
        {!canWrite?<p role="status">Создание недоступно для текущих прав.</p>:null}
        <button type="submit" style={button} disabled={!canSubmit}>
          {booking?"Сохраняется…":"Создать ручную запись"}
        </button>
        {uncertain?<p>Результат запроса требует проверки в расписании.
          Повторная отправка отключена.</p>:null}
      </form>
    ):null}
  </section>;
}
