// TOTEM USA / TAX-07 — seller-owned read-only snapshot of signed payments
// and refund allocations. Not state/local sales-tax filing or Stripe payout.
// No write endpoints, no payment initiation and no financial guessing.
import { useEffect,useState } from "react";
import { useMarketContext } from "../market/MarketContext.jsx";
import { getAuthAccessToken } from "../api/internal.js";
import {
  fetchUsServiceTaxReport,formatUsTaxReportMoney,
} from "./usServiceTaxReportClient.js";

const EN={
  title:"US service tax · payment and refund report",
  description:"Frozen service prices, the service tax portion and verified Stripe receipts.",
  disclaimer:"Accounting view only. This is not an official tax return or proof of tax remittance. Stripe payouts belong to the connected seller, not individual bookings.",
  loading:"Loading verified US service tax records…",
  unavailable:"Service-tax report is unavailable. No amounts have been assumed.",
  retry:"Refresh verified report",
  empty:"No US service-tax quotes have been recorded for this account.",
  asOf:"Verified ledger snapshot",
  notPaid:"Frozen quotes are not necessarily paid.",
  block:"Payment requires review",
  booking:"Booking",
  quoted:"Quoted (not necessarily paid)",
  captured:"Verified paid",
  refunded:"Verified refunds",
  remaining:"Net after successful refunds",
  outstanding:"Refund requests awaiting outcome",
  service:"Service",
  tax:"Service tax",
  total:"Total",
  statuses:{
    quote_frozen:"Quote frozen · unpaid",
    payment_unverified:"Payment not verified",
    captured:"Paid (signed Stripe confirmation)",
    refunded_partial:"Partially refunded",
    refunded_full:"Fully refunded",
    disputed:"Disputed — manual review",
  },
  signed:"Signed and verified",
  other:"Third-party refund (not approved in TOTEM)",
  approved:"Authorized from owner account",
  missing:"No verified refund",
  only:"Showing 30 records",
};
const RU={
  title:"США · отчёт по налогу на услуги",
  description:"Зафиксированная цена услуги, налог и подтверждённые операции Stripe.",
  disclaimer:"Учётная сводка, не налоговая декларация и не доказательство перечисления налога. Выплаты Stripe относятся к балансу продавца, а не к отдельной записи.",
  loading:"Получаем подтверждённые налоговые данные…",
  unavailable:"Отчёт недоступен. Суммы не подставляются.",
  retry:"Обновить отчёт",
  empty:"Для этого кабинета пока нет зафиксированных налоговых расчётов.",
  asOf:"Состояние на",
  notPaid:"Зафиксированная цена не означает получение оплаты.",
  block:"Оплата требует проверки",
  booking:"Запись",
  quoted:"Начислено (не обязательно оплачено)",
  captured:"Оплачено по Stripe",
  refunded:"Подтверждённые возвраты",
  remaining:"Остаток после успешных возвратов",
  outstanding:"Возвраты с неподтверждённым исходом",
  service:"Услуга",
  tax:"Налог на услугу",
  total:"Итого",
  statuses:{
    quote_frozen:"Сумма зафиксирована · не оплачена",
    payment_unverified:"Оплата не подтверждена",
    captured:"Оплачено (подписанное событие Stripe)",
    refunded_partial:"Частичный возврат",
    refunded_full:"Полный возврат",
    disputed:"Спорная операция — ручная проверка",
  },
  signed:"Подтверждено Stripe",
  other:"Возврат вне TOTEM (не одобрен в кабинете)",
  approved:"Одобрено владельцем",
  missing:"Подтверждённых возвратов нет",
  only:"Показаны первые 30 записей",
};
const box={padding:18,border:"1px solid #cbd5e1",borderRadius:14,
  background:"#fff",margin:"20px 0"};
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",
  gap:12};
const row={display:"flex",justifyContent:"space-between",
  gap:12,flexWrap:"wrap",fontSize:13,lineHeight:1.55};
function AmountRow({label,service,tax,total,c}){
  return (
    <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",
      borderRadius:10,padding:12}}>
      <strong style={{fontSize:14,color:"#0f172a"}}>{label}</strong>
      <div style={{...row,marginTop:10}}>
        <span>{c.service}</span><strong>{formatUsTaxReportMoney(service)}</strong>
      </div>
      <div style={row}>
        <span>{c.tax}</span><strong>{formatUsTaxReportMoney(tax)}</strong>
      </div>
      <div style={{...row,borderTop:"1px solid #cbd5e1",paddingTop:6,marginTop:6}}>
        <span>{c.total}</span><strong>{formatUsTaxReportMoney(total)}</strong>
      </div>
    </div>
  );
}
export default function UsServiceTaxReportCard({
  ownerType,ownerId,isUsMarket,
}){
  const {locale}=useMarketContext();
  const c=locale?.toLowerCase().startsWith("ru")?RU:EN;
  const id=Number(ownerId);
  const token=getAuthAccessToken();
  const eligible=isUsMarket && ["salon","master"].includes(ownerType) &&
    Number.isSafeInteger(id) && id>0;
  const [state,setState]=useState({
    loading:true,report:null,error:false,
  });
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    if(!eligible){
      setState({loading:false,report:null,error:false});
      return undefined;
    }
    let live=true;
    const controller=new AbortController();
    setState({loading:true,report:null,error:false});
    fetchUsServiceTaxReport({
      ownerType,ownerId:id,token,signal:controller.signal,
    }).then(report=>{
      if(live)setState({loading:false,report,error:false});
    }).catch(()=>{
      if(live&&!controller.signal.aborted){
        setState({loading:false,report:null,error:true});
      }
    });
    return()=>{live=false;controller.abort();};
  },[eligible,ownerType,id,token,reload]);
  if(!isUsMarket)return null;
  const {report,loading,error}=state;
  const totals=report?.totals;
  const shown=report?.items.slice(0,30)||[];
  return (
    <section style={box} aria-label={c.title}>
      <h2 style={{fontSize:18,margin:"0 0 10px",color:"#0f172a"}}>
        {c.title}
      </h2>
      <p style={{fontSize:13,color:"#475569",margin:"0 0 12px"}}>
        {c.description}
      </p>
      <p style={{fontSize:12,color:"#9a3412",lineHeight:1.5}}>
        {c.disclaimer}
      </p>
      {loading?<p role="status">{c.loading}</p>:null}
      {error||(!loading&&!report)?(
        <p role="alert" style={{color:"#b91c1c"}}>{c.unavailable}</p>
      ):null}
      <button type="button" disabled={!eligible||loading}
        onClick={()=>setReload(x=>x+1)}
        style={{padding:"10px 14px",minHeight:44,
          border:"1px solid #94a3b8",borderRadius:9,
          background:"#f8fafc",cursor:"pointer",marginBottom:14}}>
        {c.retry}
      </button>
      {report?(
        <>
          <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>
            {c.asOf}: {new Date(report.as_of).toLocaleString(locale||"en-US")}
            {" · "}{c.notPaid}
          </div>
          <div style={grid}>
            <AmountRow c={c} label={c.quoted}
              service={totals.quoted_service_base_minor}
              tax={totals.quoted_service_tax_minor}
              total={totals.quoted_gross_minor}/>
            <AmountRow c={c} label={c.captured}
              service={totals.captured_service_base_minor}
              tax={totals.captured_service_tax_minor}
              total={totals.captured_gross_minor}/>
            <AmountRow c={c} label={c.refunded}
              service={totals.refunded_service_base_minor}
              tax={totals.refunded_service_tax_minor}
              total={totals.refunded_gross_minor}/>
            <AmountRow c={c} label={c.remaining}
              service={totals.net_service_base_minor}
              tax={totals.net_service_tax_minor}
              total={totals.net_gross_minor}/>
          </div>
          <p style={{fontSize:13,margin:"14px 0"}}>
            {c.outstanding}:{" "}
            <strong>{formatUsTaxReportMoney(
              totals.outstanding_refund_requests_minor
            )}</strong>
          </p>
          {!shown.length?<p>{c.empty}</p>:(
            <div style={{display:"grid",gap:10}}>
              {shown.map(item=>(
                <details key={item.booking_id}
                  style={{padding:12,border:"1px solid #e2e8f0",
                    borderRadius:10,background:"#fff"}}>
                  <summary style={{cursor:"pointer",fontWeight:650,
                    lineHeight:1.5}}>
                    {c.booking} #{item.booking_id} —{" "}
                    {c.statuses[item.reconciliation_status]}
                    {" · "}{formatUsTaxReportMoney(
                      item.quote.charge_total_minor
                    )}
                  </summary>
                  <div style={{...row,marginTop:12}}>
                    <span>{c.service}</span>
                    <strong>{formatUsTaxReportMoney(
                      item.quote.service_base_minor
                    )}</strong>
                  </div>
                  <div style={row}>
                    <span>{c.tax} (
                      {Number(item.quote.rate_bps/100).toFixed(2)}%)
                    </span>
                    <strong>{formatUsTaxReportMoney(
                      item.quote.service_tax_minor
                    )}</strong>
                  </div>
                  <div style={row}>
                    <span>{c.refunded}</span>
                    <strong>{formatUsTaxReportMoney(
                      item.refunded.refunded_gross_minor
                    )}</strong>
                  </div>
                  <div style={row}>
                    <span>{c.remaining}</span>
                    <strong>{formatUsTaxReportMoney(
                      item.refunded.net_gross_minor
                    )}</strong>
                  </div>
                  {item.refunded.refunds.length ? (
                    <div style={{marginTop:12}}>
                      {item.refunded.refunds.map(refund=>(
                        <div key={refund.stripe_refund_id} style={{
                          borderTop:"1px solid #e2e8f0",paddingTop:8,
                          marginTop:8,fontSize:12,color:"#475569",
                        }}>
                          {refund.stripe_refund_id}:{" "}
                          <strong>{refund.status}</strong>{" · "}
                          {formatUsTaxReportMoney(refund.amount_minor)}
                          {" · "}{refund.authorized_by_owner
                            ?c.approved:c.other}
                          {refund.counted_as_refunded ? (
                            <div style={row}>
                              <span>{c.tax}</span>
                              <span>{formatUsTaxReportMoney(
                                refund.refunded_service_tax_minor
                              )}</span>
                            </div>
                          ):null}
                        </div>
                      ))}
                    </div>
                  ):<p style={{fontSize:12,color:"#64748b"}}>{c.missing}</p>}
                </details>
              ))}
            </div>
          )}
          {report.booking_count>shown.length?(
            <p style={{fontSize:12,color:"#9a3412"}}>
              {c.only} / {report.booking_count}.
            </p>
          ):null}
        </>
      ):null}
    </section>
  );
}
