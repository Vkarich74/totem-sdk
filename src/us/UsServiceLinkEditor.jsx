// US-SERVICES-01 — one scoped service creation/attachment form for US owners.
// The backend alone chooses IDs from verified market/ownership, not this UI.
import {useEffect,useMemo,useRef,useState} from "react";
import {
  createUsScopedServiceLink,getUsScopedServiceLinkOptions,getUsOwnerServicePrice,
} from "../api/internal.js";
import {parseUsdMinor,parseUsPriceResponse} from "./usOwnerPriceModel.js";

const panel={
  border:"1px solid #cbd5e1",borderRadius:12,background:"#f8fafc",
  padding:18,display:"grid",gap:14,
};
const field={
  width:"100%",maxWidth:450,boxSizing:"border-box",padding:"10px 11px",
  fontSize:16,border:"1px solid #9ca3af",borderRadius:8,
};
const button={
  padding:"10px 14px",minHeight:44,border:"1px solid #9ca3af",
  borderRadius:8,fontWeight:600,background:"#fff",color:"#111827",
};

export default function UsServiceLinkEditor({
  ownerType,ownerSlug,canWrite=false,onSaved,
}) {
  const [options,setOptions]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [mode,setMode]=useState("create");
  const [target,setTarget]=useState("");
  const [name,setName]=useState("");
  const [catalogId,setCatalogId]=useState("");
  const [duration,setDuration]=useState("60");
  const [usd,setUsd]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [uncertain,setUncertain]=useState(false);
  const savingRef=useRef(false);

  useEffect(()=>{
    if(!ownerSlug||!["salon","master"].includes(ownerType)){
      setLoading(false);setOptions(null);return undefined;
    }
    let live=true;
    const abort=new AbortController();
    setLoading(true);setOptions(null);setError("");setNotice("");
    setTarget("");setCatalogId("");setUncertain(false);
    getUsScopedServiceLinkOptions(ownerType,ownerSlug,{signal:abort.signal})
      .then(data=>{if(live)setOptions(data);})
      .catch(problem=>{
        if(live&&!abort.signal.aborted) {
          setError(String(problem?.message||"US_SERVICE_LINK_OPTIONS_UNAVAILABLE"));
        }
      })
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;abort.abort();};
  },[ownerType,ownerSlug]);

  const targets=ownerType==="salon"
    ? (options?.masters||[]):(options?.salons||[]);
  // Salon administrator may reuse only catalog links from this same salon.
  // Master may reuse only their own US catalog from an active US relation.
  // Both scopes are verified again by the Backend on POST.
  const candidates=useMemo(()=>options?.catalog_services||[],[options]);
  const selectedCandidate=candidates.find(item=>String(item.service_pk)===catalogId);
  const durationValue=Number(duration);
  const amountMinor=parseUsdMinor(usd);
  const validDuration=/^[1-9][0-9]*$/.test(duration)&&
    Number.isSafeInteger(durationValue)&&durationValue<=720;
  const validName=name.trim().length>0&&name.trim().length<=160;
  const selectedTarget=targets.find(item=>
    String(ownerType==="salon"?item.id:item.slug)===target);
  const canSubmit=canWrite&&!loading&&!saving&&!uncertain&&
    Boolean(selectedTarget)&&amountMinor!==null&&validDuration&&
    (mode==="create"?validName:Boolean(selectedCandidate));

  async function submit(event){
    event.preventDefault();
    if(!canSubmit||savingRef.current)return;
    savingRef.current=true;
    setSaving(true);setError("");setNotice("");
    const actorTarget=ownerType==="salon"
      ? {master_id:Number(target)}:{salon_slug:target};
    const input={
      operation:mode,...actorTarget,
      ...(mode==="create"?{name:name.trim()}:{service_pk:Number(catalogId)}),
      duration_min:durationValue,amount_minor:amountMinor,
    };
    try {
      const saved=await createUsScopedServiceLink(ownerType,ownerSlug,input);
      if(saved.contract_version!=="US-SERVICES-01-v1"||
         saved.market_code!=="US"||saved.currency_code!=="USD"||
         saved.owner_type!==ownerType||saved.owner_slug!==ownerSlug||
         saved.operation!==mode||saved.readback_verified!==true||
         saved.service?.amount_minor!==String(amountMinor)||
         saved.service?.duration_min!==durationValue||
         saved.service?.currency_code!=="USD"||
         (ownerType==="salon" &&
           Number(saved.service?.master_id)!==Number(target))||
         (ownerType==="master" && saved.service?.salon_slug!==target)||
         !Number.isSafeInteger(saved.salon_master_service_id)) {
        throw Error("US_SERVICE_LINK_RESPONSE_MISMATCH");
      }
      // A fresh authoritative GET confirms the exact newly-linked USD cents.
      const read=await getUsOwnerServicePrice(
        ownerType,ownerSlug,saved.salon_master_service_id);
      const verified=parseUsPriceResponse(
        read,ownerType,ownerSlug,saved.salon_master_service_id);
      if(!verified.configured||verified.amount_minor!==amountMinor||
         verified.price_version!==saved.service.price_version) {
        throw Error("US_SERVICE_LINK_PRICE_READBACK_MISMATCH");
      }
      setNotice("Услуга привязана к выбранному салону и мастеру. Цена USD подтверждена сервером.");
      setName("");setCatalogId("");setUsd("");
      setUncertain(false);
      if(typeof onSaved==="function")onSaved();
    } catch(problem) {
      // An interrupted response might follow a committed write. Never
      // encourage blind POST retries: reload the source list first.
      setUncertain(true);
      setError("Результат не подтверждён: "+
        String(problem?.message||"US_SERVICE_LINK_UNAVAILABLE")+
        ". Проверьте список услуг перед повторным созданием.");
      if(typeof onSaved==="function")onSaved();
    } finally {
      savingRef.current=false;setSaving(false);
    }
  }

  if(!ownerSlug||!["salon","master"].includes(ownerType))return null;
  return (
    <section aria-label="Услуги США — безопасная привязка" style={panel}>
      <h3 style={{margin:0,fontSize:18}}>Услуга США · салон и мастер</h3>
      <p style={{margin:0,color:"#475569",lineHeight:1.5}}>
        Выберите конкретный {ownerType==="salon"?"мастер":"салон"}.
        Цена вводится только в USD; пересчёта из старой цены нет.
      </p>
      {loading?<p role="status">Проверяем разрешённые US-салоны и мастеров…</p>:null}
      {options&&targets.length===0?
        <p role="status">Нет действующих связей с US-салоном. Создание заблокировано.</p>:null}
      {options&&targets.length>0?(
        <form onSubmit={submit} style={{display:"grid",gap:12}}>
          <label style={{display:"grid",gap:5}}>
            {ownerType==="salon"?"Мастер":"Салон США"}
            <select aria-label="Выбор салона или мастера"
              value={target} onChange={event=>{
                setTarget(event.target.value);setCatalogId("");setError("");setNotice("");
              }} disabled={saving||uncertain} style={field}>
              <option value="">Выберите явно</option>
              {targets.map(item=>(
                <option key={item.id} value={ownerType==="salon"?String(item.id):item.slug}>
                  {item.name} ({item.slug})
                </option>
              ))}
            </select>
          </label>
          <label style={{display:"grid",gap:5}}>
            Действие
            <select aria-label="Создание или привязка" value={mode}
              onChange={event=>{
                setMode(event.target.value);setCatalogId("");setError("");setNotice("");
              }} disabled={saving||uncertain} style={field}>
              <option value="create">Создать новую услугу</option>
              <option value="attach">Привязать существующую услугу мастера</option>
            </select>
          </label>
          {mode==="create"?(
            <label style={{display:"grid",gap:5}}>
              Название услуги
              <input type="text" maxLength={160} style={field} value={name}
                disabled={saving||uncertain}
                onChange={event=>setName(event.target.value)}
                placeholder="Например, Haircut" />
            </label>
          ):(
            <label style={{display:"grid",gap:5}}>
              Существующая услуга выбранного мастера
              <select aria-label="Выбор существующей услуги"
                value={catalogId} style={field} disabled={saving||uncertain}
                onChange={event=>{
                  const value=event.target.value;
                  setCatalogId(value);
                  const selected=candidates.find(x=>String(x.service_pk)===value);
                  if(selected)setDuration(String(selected.duration_min));
                }}>
                <option value="">Выберите услугу</option>
                {candidates.map(item=>(
                  <option key={String(item.master_id)+"-"+String(item.service_pk)}
                    value={String(item.service_pk)}>
                    {item.name} ({item.duration_min} мин)
                  </option>
                ))}
              </select>
            </label>
          )}
          <label style={{display:"grid",gap:5}}>
            Длительность, минуты (1–720)
            <input type="number" min="1" max="720" step="1"
              value={duration} style={field} disabled={saving||uncertain}
              onChange={event=>setDuration(event.target.value)} />
          </label>
          <label style={{display:"grid",gap:5}}>
            Цена, USD
            <input type="text" inputMode="decimal" autoComplete="off"
              placeholder="150.00" value={usd} style={field}
              disabled={saving||uncertain} maxLength={11}
              onChange={event=>setUsd(event.target.value)} />
          </label>
          <div>
            <button type="submit" style={button} disabled={!canSubmit}>
              {saving?"Сохраняем…":"Сохранить услугу с ценой USD"}
            </button>
          </div>
          {!canWrite?<p role="status">Запись запрещена правами или состоянием подписки.</p>:null}
        </form>
      ):null}
      {uncertain?(
        <button type="button" style={button}
          onClick={()=>window.location.reload()} disabled={saving}>
          Обновить список и проверить результат
        </button>
      ):null}
      {error?<p role="alert" style={{color:"#991b1b",margin:0}}>{error}</p>:null}
      {notice?<p role="status" style={{color:"#047857",margin:0}}>{notice}</p>:null}
    </section>
  );
}
