// TOTEM USA / TAX-06: booking-owned verified USD service/tax/gross breakdown.
// No legacy KGS fallback. Never computes an owed amount in the browser.
import { useMarketContext } from "../market/MarketContext.jsx";
import {
  getUsPayC11Detail,isUsPayC11Booking,formatUsPayC11Cents,
} from "./usPayC11Model.js";

const COPY={
  en:{
    base:"Service price",tax:"Service tax",total:"Total for service",
    waiting:"Final service price and tax are not yet available.",
    scope:"This tax applies only to this service.",
  },
  ru:{
    base:"Стоимость услуги",tax:"Налог на услугу",total:"Итого за услугу",
    waiting:"Итоговая стоимость услуги с налогом пока недоступна.",
    scope:"Налог относится только к этой услуге.",
  },
};

export default function UsServiceTaxBreakdown({booking,compact=false}){
  const {locale}=useMarketContext();
  if(!isUsPayC11Booking(booking))return null;
  const copy=locale?.toLowerCase().startsWith("ru")?COPY.ru:COPY.en;
  const detail=getUsPayC11Detail(booking);
  const base=detail?.price?.amount_minor;
  const quote=detail?.breakdown;
  const row={
    display:"flex",flexWrap:"wrap",alignItems:"baseline",
    justifyContent:"space-between",gap:"8px 20px",
  };
  const container={
    border:"1px solid #e2e8f0",borderRadius:10,
    padding:compact?"10px 12px":"14px 16px",marginTop:10,
    background:"#f8fafc",display:"grid",gap:compact?5:9,
    width:"100%",boxSizing:"border-box",
  };
  if(!base||!quote){
    return (
      <div style={container} aria-label={copy.total}>
        {base?(
          <div style={row}>
            <span>{copy.base}</span>
            <strong>{formatUsPayC11Cents(base)}</strong>
          </div>
        ):null}
        <p role="status" style={{fontSize:13,color:"#9a3412",margin:0}}>
          {copy.waiting}
        </p>
      </div>
    );
  }
  const rate=String(Math.floor(quote.rate_bps/100))+
    ((quote.rate_bps%100)>0?"."+
      String(quote.rate_bps%100).padStart(2,"0").replace(/0$/,""):"");
  return (
    <div style={container} aria-label={copy.total}>
      <div style={row}>
        <span>{copy.base}</span>
        <strong>{formatUsPayC11Cents(quote.service_base_minor)}</strong>
      </div>
      <div style={row}>
        <span>{copy.tax} ({rate}%)</span>
        <strong>{formatUsPayC11Cents(quote.service_tax_minor)}</strong>
      </div>
      <div style={{...row,borderTop:"1px solid #cbd5e1",
        paddingTop:8,color:"#0f172a",fontWeight:700}}>
        <span>{copy.total}</span>
        <strong>{formatUsPayC11Cents(quote.charge_total_minor)}</strong>
      </div>
      {!compact?<small style={{color:"#64748b"}}>{copy.scope}</small>:null}
    </div>
  );
}
