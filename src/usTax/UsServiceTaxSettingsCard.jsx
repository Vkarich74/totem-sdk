// TOTEM USA / TAX-06 — service-only tax setting for the selected owner.
// No price, Stripe, subscription, tax reporting or legacy KG/KZ mutation.
// The displayed rate comes exclusively from a successful authenticated GET.
import { useEffect,useState } from "react";
import { useMarketContext } from "../market/MarketContext.jsx";
import { getAuthAccessToken } from "../api/internal.js";
import {
  formatUsServiceTaxPercent,parseUsServiceTaxPercent,
  readUsServiceTax,saveUsServiceTax,
} from "./usServiceTaxClient.js";

const COPY={
  ru:{
    title:"Налог на услуги (США)",
    text:"Укажите процент, который будет добавляться к стоимости услуги, когда получателем оплаты выбран этот кабинет.",
    scope:"Только для услуг. Не применяется к подпискам, аренде и другим платежам.",
    guidance:"По умолчанию 0%. Проверьте применимость ставки для вашего штата и города самостоятельно.",
    rate:"Налог, %",
    current:"Сохранённая ставка",
    loading:"Получаем ставку с сервера…",
    save:"Сохранить ставку",
    saving:"Сохраняем…",
    saved:"Налоговая ставка сохранена.",
    unconfigured:"Ранее ставка не задавалась. Сервер вернул 0%.",
    conflict:"Ставка изменилась в другом сеансе. Актуальные данные загружены. Проверьте значение перед сохранением.",
    invalid:"Введите процент от 0 до 100 с точностью до 0,01%.",
    unavailable:"Не удалось получить налоговую ставку. Сохранение недоступно.",
    locked:"Изменение ставки сейчас ограничено правами кабинета.",
    retry:"Повторить загрузку",
    percent:"%",
  },
  en:{
    title:"US service tax rate",
    text:"Enter the percentage to add to a service when this salon or professional receives payment.",
    scope:"Services only. Never applied to subscriptions, rent or other payments.",
    guidance:"Default 0%. You are responsible for verifying applicable state and local tax requirements.",
    rate:"Service tax, %",
    current:"Saved rate",
    loading:"Loading the verified server rate…",
    save:"Save tax rate",
    saving:"Saving…",
    saved:"Service tax rate saved.",
    unconfigured:"No rate was previously configured. Server default is 0%.",
    conflict:"Another session changed the rate. Current values were reloaded. Review before saving.",
    invalid:"Enter a percentage from 0 to 100 with up to two decimal places.",
    unavailable:"Tax setting is unavailable. Saving is disabled.",
    locked:"Your account currently has no permission to edit this setting.",
    retry:"Retry loading",
    percent:"%",
  },
};

const panelStyle={
  border:"1px solid #cbd5e1",background:"#fff",
  borderRadius:14,padding:"18px",margin:"16px 0",maxWidth:"100%",
};
const messageStyle={fontSize:13,lineHeight:1.55,margin:"6px 0",color:"#475569"};

export default function UsServiceTaxSettingsCard({
  ownerType,ownerSlug,isUsMarket,canWrite=true,
}){
  const { locale }=useMarketContext();
  const copy=locale?.toLowerCase().startsWith("ru")?COPY.ru:COPY.en;
  const token=getAuthAccessToken();
  const [state,setState]=useState({
    loading:true,setting:null,loadingError:"",saving:false,
    notice:"",error:"",draft:"",
  });
  const [reload,setReload]=useState(0);

  useEffect(()=>{
    if(!isUsMarket)return undefined;
    let active=true;
    const controller=new AbortController();
    setState({
      loading:true,setting:null,loadingError:"",saving:false,
      notice:"",error:"",draft:"",
    });
    readUsServiceTax({
      ownerType,ownerSlug,token,signal:controller.signal,
    }).then(setting=>{
      if(active) setState({
        loading:false,setting,loadingError:"",saving:false,
        notice:"",error:"",
        draft:formatUsServiceTaxPercent(setting.rate_bps)??"",
      });
    }).catch(()=>{
      if(active && !controller.signal.aborted) {
        setState(previous=>({
          ...previous,loading:false,loadingError:"US_TAX_UNAVAILABLE",
          setting:null,saving:false,
        }));
      }
    });
    return()=>{active=false;controller.abort();};
  },[isUsMarket,ownerType,ownerSlug,token,reload]);

  if(!isUsMarket)return null;
  const updateDraft=value=>setState(previous=>({
    ...previous,draft:value,notice:"",error:"",
  }));
  const submit=async event=>{
    event.preventDefault();
    if(!canWrite || !state.setting || state.loading || state.saving)return;
    const nextRate=parseUsServiceTaxPercent(state.draft);
    if(nextRate===null){
      setState(previous=>({...previous,error:"invalid",notice:""}));
      return;
    }
    setState(previous=>({...previous,saving:true,error:"",notice:""}));
    try{
      const setting=await saveUsServiceTax({
        ownerType,ownerSlug,token,
        rateBps:nextRate,expectedRevision:state.setting.revision,
      });
      setState(previous=>({
        ...previous,setting,saving:false,error:"",
        notice:"saved",
        draft:formatUsServiceTaxPercent(setting.rate_bps)??"",
      }));
    }catch(error){
      if(error?.status===409){
        // Never resubmit a stale revision or silently overwrite another tab.
        try{
          const current=await readUsServiceTax({ownerType,ownerSlug,token});
          setState(previous=>({
            ...previous,setting:current,saving:false,notice:"",
            error:"conflict",
            draft:formatUsServiceTaxPercent(current.rate_bps)??"",
          }));
          return;
        }catch{
          setState(previous=>({
            ...previous,setting:null,saving:false,notice:"",
            error:"",loadingError:"US_TAX_CONFLICT_RELOAD_FAILED",
          }));
          return;
        }
      }
      setState(previous=>({
        ...previous,saving:false,notice:"",
        error:"unavailable",
      }));
    }
  };
  const ready=!state.loading && Boolean(state.setting);
  const rate=ready?formatUsServiceTaxPercent(state.setting.rate_bps):null;
  const disabled=!ready||state.saving||!canWrite;
  return (
    <section style={panelStyle} aria-label={copy.title}>
      <h3 style={{fontSize:17,fontWeight:750,color:"#0f172a",margin:"0 0 10px"}}>
        {copy.title}
      </h3>
      <p style={messageStyle}>{copy.text}</p>
      <p style={messageStyle}>{copy.scope}</p>
      <p style={{...messageStyle,color:"#64748b"}}>{copy.guidance}</p>
      {state.loading?(
        <p role="status" style={messageStyle}>{copy.loading}</p>
      ):state.loadingError?(
        <div role="alert" style={{marginTop:14}}>
          <p style={{...messageStyle,color:"#b91c1c"}}>{copy.unavailable}</p>
          <button type="button" onClick={()=>setReload(value=>value+1)}
            style={{minHeight:44,padding:"10px 14px",borderRadius:8,
              border:"1px solid #94a3b8",background:"#f8fafc",cursor:"pointer"}}>
            {copy.retry}
          </button>
        </div>
      ):(
        <form onSubmit={submit} noValidate style={{marginTop:16}}>
          <div style={{fontSize:13,color:"#334155",marginBottom:9}}>
            {copy.current}: <strong>{rate}{copy.percent}</strong>
          </div>
          {!state.setting?.configured?(
            <p style={messageStyle}>{copy.unconfigured}</p>
          ):null}
          <label htmlFor={`tax06-${ownerType}-rate`}
            style={{display:"block",fontWeight:650,fontSize:14,marginBottom:6}}>
            {copy.rate}
          </label>
          <input
            id={`tax06-${ownerType}-rate`}
            type="text" inputMode="decimal"
            autoComplete="off" spellCheck={false}
            value={state.draft}
            onChange={event=>updateDraft(event.target.value)}
            maxLength={6} disabled={disabled}
            aria-describedby={`tax06-${ownerType}-hint`}
            style={{width:"min(100%,220px)",minHeight:44,padding:"10px 12px",
              border:"1px solid #94a3b8",borderRadius:8,boxSizing:"border-box",
              fontSize:16,background:disabled?"#f8fafc":"white"}}
          />
          <p id={`tax06-${ownerType}-hint`} style={messageStyle}>0–100%</p>
          {!canWrite?<p style={messageStyle}>{copy.locked}</p>:null}
          {state.notice?(
            <p role="status" style={{color:"#047857",fontSize:13}}>
              {copy[state.notice]}
            </p>
          ):null}
          {state.error?(
            <p role="alert" style={{color:"#b91c1c",fontSize:13}}>
              {copy[state.error]}
            </p>
          ):null}
          <button type="submit" disabled={disabled}
            style={{display:"block",minHeight:44,padding:"10px 16px",
              border:0,borderRadius:8,color:"#fff",
              fontWeight:700,background:disabled?"#94a3b8":"#111827",
              cursor:disabled?"not-allowed":"pointer"}}>
            {state.saving?copy.saving:copy.save}
          </button>
        </form>
      )}
    </section>
  );
}
