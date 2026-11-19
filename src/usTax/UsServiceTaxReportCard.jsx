// TOTEM USA / TAX-07 — seller-owned read-only snapshot of signed payments
// and refund allocations. Not state/local sales-tax filing or Stripe payout.
// No write endpoints, no payment initiation and no financial guessing.
import { useEffect,useRef,useState } from "react";
import { useMarketContext } from "../market/MarketContext.jsx";
import { getAuthAccessToken } from "../api/internal.js";
import {
  fetchUsServiceTaxReport,fetchUsC11LiveReconciliation,
  formatUsTaxReportMoney,
} from "./usServiceTaxReportClient.js";

const EN={
  exceptionsTitle:"US finance · exceptions and reconciliation",
  exceptionsNote:"Items below are only exceptional booking cases from this seller's verified report. No automatic payments, refunds, disputes or payout adjustments are performed.",
  exceptionsCount:"Booking exceptions",
  exceptionsNone:"No booking exceptions in these records. This does NOT prove all Stripe seller payouts are reconciled.",
  exceptionTruncated:"Only the first 40 exceptions are displayed.",
  unverifiedCount:"Unverified payments",
  disputesCount:"Disputes",
  refundCount:"Outstanding refunds",
  externalCount:"Refunds not authorized in TOTEM",
  exceptionReasons:{
    payment_unverified:"Payment has no verified capture",
    disputed:"Stripe dispute requires review",
    outstanding:"Refund request still awaiting an outcome",
    external:"Refund not authorized in TOTEM",
    refund_open:"Refund has an incomplete or failed outcome",
  },
  evidenceTitle:"Stripe LIVE case evidence (read-only)",
  evidenceLoad:"View Stripe reconciliation",
  evidenceReload:"Refresh this case",
  evidenceLoading:"Reading signed evidence…",
  evidenceFailure:"Case evidence is unavailable. Do not assume reconciliation completed.",
  evidenceNoLive:"No linked Stripe LIVE payment attempt. Not evidence of settlement.",
  evidenceReview:"Manual review required — not closed",
  evidenceUnverified:"No verified signed receipt for this case",
  evidenceVerified:"Latest signed receipt and quote match",
  evidenceSuccess:"Signed payment success observed",
  evidenceNotSuccess:"No signed payment success observed",
  evidenceStripeStatus:"Stripe intent state",
  evidenceRefund:"Succeeded refunds",
  evidenceDisputes:"Recorded disputes",
  evidenceIntent:"Stripe intent reference",
  evidenceSteps:"Required external review",
  evidenceNoSteps:"No additional review steps recorded",
  reasonCodes:{
    US_C11_NO_LIVE_INTENT:"No linked LIVE attempt",
    US_C11_UNKNOWN_STRIPE_STATE:"Unknown Stripe payment state",
    US_C11_CANCELLED_WITH_FUNDS_OR_DISPUTE:"Cancelled booking has funds or a dispute",
    US_C11_BOOKING_STATUS_PAYMENT_CONFLICT:"Booking/payment status conflict",
    US_C11_STRIPE_CREATION_OUTCOME_UNKNOWN:"Payment initiation outcome unknown",
    US_C11_STRIPE_PAYMENT_PROCESSING:"Stripe payment still processing",
    US_C11_FINANCIAL_SETTLEMENT_REQUIRES_REVIEW:"Signed finance and settlement evidence needs external review",
    US_C11_STRIPE_MANUAL_REVIEW_REQUIRED:"Stripe marked payment for manual review",
    US_C11_TERMINAL_EVIDENCE_NEEDS_OWNER_VERIFICATION:"Terminal event requires seller verification",
    US_C11_STRIPE_OUTCOME_NOT_FINAL:"Stripe payment outcome not final",
  },
  actionCodes:{
    VERIFY_CONNECTED_STRIPE_ACCOUNT_AND_INTENT_IN_SELLER_DASHBOARD:"Open the connected seller's Stripe account and verify the payment intent.",
    COMPARE_USD_AMOUNT_WITH_IMMUTABLE_BOOKING_QUOTE:"Compare the amount with the immutable USD booking quote.",
    CHECK_SIGNED_EVENTS_REFUNDS_AND_DISPUTES:"Check signed Stripe receipts, refunds and disputes.",
    DOCUMENT_EXTERNAL_REVIEW_BEFORE_AUTHORIZED_SEPARATE_ACTION:"Document the review before any separately authorized financial action.",
    CONTACT_VERIFIED_PAYMENT_COLLECTOR:"Contact the verified payment collector; do not assume access to their Stripe account.",
  },
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
  exceptionsTitle:"США · исключения и сверка финансов",
  exceptionsNote:"Отображаются исключения только по записям в подтверждённом отчёте этого получателя. Никакие платежи, возвраты, споры и выплаты автоматически не изменяются.",
  exceptionsCount:"Записей с исключениями",
  exceptionsNone:"В данных этого отчёта исключения по записям не выявлены. Это НЕ означает, что выплаты продавца Stripe полностью сверены.",
  exceptionTruncated:"Показаны первые 40 исключений.",
  unverifiedCount:"Неподтверждённые оплаты",
  disputesCount:"Споры",
  refundCount:"Ожидающие возвраты",
  externalCount:"Возвраты без разрешения в TOTEM",
  exceptionReasons:{
    payment_unverified:"Нет подтверждённого списания",
    disputed:"Спор Stripe требует проверки",
    outstanding:"Возврат ожидает окончательного результата",
    external:"Возврат не был разрешён через TOTEM",
    refund_open:"Возврат завершился неокончательно или с ошибкой",
  },
  evidenceTitle:"Сверка Stripe LIVE (только чтение)",
  evidenceLoad:"Посмотреть сверку Stripe",
  evidenceReload:"Обновить данные записи",
  evidenceLoading:"Получаем подтверждённые события…",
  evidenceFailure:"Данные сверки недоступны. Нельзя считать операцию закрытой.",
  evidenceNoLive:"Связанная попытка Stripe LIVE отсутствует. Это не подтверждает окончательный расчёт.",
  evidenceReview:"Требуется ручная сверка — не закрыта",
  evidenceUnverified:"Нет подтверждённого подписанного события для этой записи",
  evidenceVerified:"Подписанное событие и сумма подтверждены",
  evidenceSuccess:"Есть подписанное подтверждение успешной оплаты",
  evidenceNotSuccess:"Подтверждение успешной оплаты отсутствует",
  evidenceStripeStatus:"Статус Stripe",
  evidenceRefund:"Успешные возвраты",
  evidenceDisputes:"Зафиксированные споры",
  evidenceIntent:"Идентификатор Stripe",
  evidenceSteps:"Что проверить у продавца",
  evidenceNoSteps:"Дополнительных действий сверки не указано",
  reasonCodes:{
    US_C11_NO_LIVE_INTENT:"Связанная LIVE-оплата отсутствует",
    US_C11_UNKNOWN_STRIPE_STATE:"Неизвестный статус платежа Stripe",
    US_C11_CANCELLED_WITH_FUNDS_OR_DISPUTE:"Запись отменена, но есть деньги или спор",
    US_C11_BOOKING_STATUS_PAYMENT_CONFLICT:"Статус записи и платежа противоречат друг другу",
    US_C11_STRIPE_CREATION_OUTCOME_UNKNOWN:"Результат создания платежа неизвестен",
    US_C11_STRIPE_PAYMENT_PROCESSING:"Платёж ещё обрабатывается Stripe",
    US_C11_FINANCIAL_SETTLEMENT_REQUIRES_REVIEW:"Для расчётов нужна внешняя сверка Stripe",
    US_C11_STRIPE_MANUAL_REVIEW_REQUIRED:"Stripe требует ручной проверки",
    US_C11_TERMINAL_EVIDENCE_NEEDS_OWNER_VERIFICATION:"Финальное событие требует подтверждения продавцом",
    US_C11_STRIPE_OUTCOME_NOT_FINAL:"Результат Stripe ещё не окончательный",
  },
  actionCodes:{
    VERIFY_CONNECTED_STRIPE_ACCOUNT_AND_INTENT_IN_SELLER_DASHBOARD:"Проверить платёж в подключённом Stripe продавца.",
    COMPARE_USD_AMOUNT_WITH_IMMUTABLE_BOOKING_QUOTE:"Сравнить сумму с неизменяемой квитанцией записи в USD.",
    CHECK_SIGNED_EVENTS_REFUNDS_AND_DISPUTES:"Проверить подписанные события Stripe, возвраты и споры.",
    DOCUMENT_EXTERNAL_REVIEW_BEFORE_AUTHORIZED_SEPARATE_ACTION:"Зафиксировать сверку перед отдельным разрешённым финансовым действием.",
    CONTACT_VERIFIED_PAYMENT_COLLECTOR:"Обратиться к подтверждённому получателю платежа; чужой Stripe недоступен.",
  },
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

function minorIsPositive(value){
  return typeof value==="string" && /^\d+$/.test(value) &&
    BigInt(value)>0n;
}
function reasonsForItem(item){
  const reasons=[];
  if(item.reconciliation_status==="payment_unverified")
    reasons.push("payment_unverified");
  if(item.reconciliation_status==="disputed" || item.blocking_dispute===true)
    reasons.push("disputed");
  if(minorIsPositive(item.outstanding_refund_requests_minor))
    reasons.push("outstanding");
  if(item.refunded?.refunds?.some(refund=>
    refund.authorized_by_owner===false))
    reasons.push("external");
  if(item.refunded?.refunds?.some(refund=>
    ["pending","requires_action","failed"].includes(refund.status)))
    reasons.push("refund_open");
  return reasons;
}

// Evidence is read ONLY on owner request, for the exact booking row;
// the Backend independently enforces session, market, seller and booking.
function UsReconciliationEvidence({
  ownerType,ownerId,bookingId,token,c,
}){
  const [state,setState]=useState({loading:false,data:null,error:""});
  const request=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function show(){
    if(state.loading)return;
    request.current?.abort();
    const controller=new AbortController();
    request.current=controller;
    setState({loading:true,data:null,error:""});
    try{
      const data=await fetchUsC11LiveReconciliation({
        ownerType,ownerId,bookingId,token,signal:controller.signal,
      });
      if(!controller.signal.aborted)
        setState({loading:false,data,error:""});
    }catch(problem){
      if(!controller.signal.aborted)
        setState({loading:false,data:null,
          error:String(problem?.message||"US_C11_RECONCILIATION_UNAVAILABLE")});
    }
  }
  const {data,error,loading}=state;
  return <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #e2e8f0"}}>
    <button type="button" onClick={show} disabled={loading}
      style={{padding:"8px 12px",minHeight:40,borderRadius:8,
        border:"1px solid #64748b",background:"#fff",cursor:"pointer"}}>
      {loading?c.evidenceLoading:data?c.evidenceReload:c.evidenceLoad}
    </button>
    {error?<p role="alert" style={{color:"#991b1b",fontSize:13}}>
      {c.evidenceFailure} ({error})
    </p>:null}
    {data?<section aria-label={c.evidenceTitle}
      style={{padding:12,border:"1px solid #fde68a",
        background:"#fffbeb",borderRadius:10,marginTop:10}}>
      <h4 style={{margin:"0 0 8px"}}>{c.evidenceTitle}</h4>
      <p style={{margin:"5px 0",fontWeight:600}}>
        {data.case_status==="no_live_attempt"
          ?c.evidenceNoLive:c.evidenceReview}
      </p>
      <p style={{margin:"5px 0"}}>
        {c.reasonCodes[data.reason_code]||data.reason_code}
      </p>
      {data.case_status!=="no_live_attempt"?<>
        <p style={{margin:"5px 0"}}>
          {data.verified_signed_evidence?c.evidenceVerified:c.evidenceUnverified}
          {" · "}{data.signed_success_observed?c.evidenceSuccess:c.evidenceNotSuccess}
        </p>
        <div style={{...row,margin:"6px 0"}}>
          <span>{c.evidenceStripeStatus}</span>
          <strong>{data.payment_intent_status||"—"}</strong>
        </div>
        <div style={row}>
          <span>{c.evidenceRefund}</span>
          <strong>{data.succeeded_refund_minor!==null
            ?formatUsTaxReportMoney(data.succeeded_refund_minor):"—"}</strong>
        </div>
        <div style={row}>
          <span>{c.evidenceDisputes}</span>
          <strong>{data.dispute_count??"—"}</strong>
        </div>
        {data.stripe_payment_intent_reference?
          <div style={{...row,marginTop:5}}>
            <span>{c.evidenceIntent}</span>
            <code style={{overflowWrap:"anywhere"}}>
              {data.stripe_payment_intent_reference}
            </code>
          </div>:null}
        <div style={{marginTop:10,fontSize:13}}>
          <strong>{c.evidenceSteps}:</strong>
          {data.next_steps.length?<ol style={{paddingLeft:22,lineHeight:1.5}}>
            {data.next_steps.map((code,i)=><li key={i}>
              {c.actionCodes[code]||code}
            </li>)}
          </ol>:<p>{c.evidenceNoSteps}</p>}
        </div>
      </>:null}
    </section>:null}
  </div>;
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
  const attention=report?.items.map(item=>({
    item,reasons:reasonsForItem(item),
  })).filter(x=>x.reasons.length>0)||[];
  const unverifiedCount=report?.items.filter(x=>
    x.reconciliation_status==="payment_unverified").length||0;
  const disputeCount=report?.items.filter(x=>
    x.reconciliation_status==="disputed"||x.blocking_dispute===true).length||0;
  const outstandingCount=report?.items.filter(x=>
    minorIsPositive(x.outstanding_refund_requests_minor)).length||0;
  const externalCount=report?.items.filter(x=>
    x.refunded?.refunds?.some(r=>r.authorized_by_owner===false)).length||0;

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

          <section aria-label={c.exceptionsTitle} style={{
            margin:"18px 0",padding:14,borderRadius:12,
            background:"#f8fafc",border:"1px solid #cbd5e1",
          }}>
            <h3 style={{fontSize:17,margin:"0 0 7px"}}>{c.exceptionsTitle}</h3>
            <p style={{fontSize:13,color:"#475569",margin:"0 0 12px"}}>
              {c.exceptionsNote}
            </p>
            <div style={grid}>
              {[
                [c.exceptionsCount,attention.length],
                [c.unverifiedCount,unverifiedCount],
                [c.disputesCount,disputeCount],
                [c.refundCount,outstandingCount],
                [c.externalCount,externalCount],
              ].map(([title,n])=><div key={title}
                style={{padding:10,background:"#fff",borderRadius:9,
                  border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:12,color:"#64748b"}}>{title}</div>
                <strong style={{fontSize:21,color:n?"#9a3412":"#334155"}}>
                  {n}
                </strong>
              </div>)}
            </div>
            {!attention.length?<p style={{fontSize:13,color:"#475569"}}>
              {c.exceptionsNone}
            </p>:<div style={{display:"grid",gap:10,marginTop:14}}>
              {attention.slice(0,40).map(({item,reasons})=>
                <article key={item.booking_id} style={{
                  borderRadius:10,border:"1px solid #fbbf24",
                  background:"#fff",padding:12,
                }}>
                  <strong>{c.booking} #{item.booking_id}</strong>
                  {" · "}{formatUsTaxReportMoney(item.quote.charge_total_minor)}
                  <ul style={{margin:"8px 0",paddingLeft:22,fontSize:13,
                    lineHeight:1.6}}>
                    {reasons.map(code=><li key={code}>
                      {c.exceptionReasons[code]||code}
                    </li>)}
                  </ul>
                  <UsReconciliationEvidence
                    key={ownerType+"-"+id+"-"+item.booking_id}
                    ownerType={ownerType} ownerId={id}
                    bookingId={item.booking_id} token={token} c={c}/>
                </article>
              )}
              {attention.length>40?<p style={{fontSize:12,color:"#9a3412"}}>
                {c.exceptionTruncated} ({attention.length})
              </p>:null}
            </div>}
          </section>
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
                  <UsReconciliationEvidence
                    key={ownerType+"-"+id+"-"+item.booking_id}
                    ownerType={ownerType} ownerId={id}
                    bookingId={item.booking_id} token={token} c={c}/>
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
