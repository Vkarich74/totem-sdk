// TOTEM USA / TAX-07 — read-only, owner-scoped signed service tax report.
// Not a tax return, remittance statement or Stripe payout statement.
// Caller supplies the existing authentication token; no browser module dependencies.
const MAX_BOOKINGS=500;
const COLUMNS=[
  "quoted_service_base_minor","quoted_service_tax_minor","quoted_gross_minor",
  "captured_service_base_minor","captured_service_tax_minor","captured_gross_minor",
  "refunded_service_base_minor","refunded_service_tax_minor","refunded_gross_minor",
  "net_service_base_minor","net_service_tax_minor","net_gross_minor",
  "outstanding_refund_requests_minor",
];
const USD=/^\d{1,16}$/;

function requireCents(value){
  if(typeof value!=="string"||!USD.test(value))throw Error("US_TAX07_REPORT_INVALID_MONEY");
  return BigInt(value);
}
export function formatUsTaxReportMoney(value){
  try {
    const cents=requireCents(value);
    return "$"+(cents/100n).toLocaleString("en-US")+"."+
      String(cents%100n).padStart(2,"0");
  } catch {return "—";}
}

function checkSplit(obj,prefix){
  const base=requireCents(obj[`${prefix}_service_base_minor`]);
  const tax=requireCents(obj[`${prefix}_service_tax_minor`]);
  const gross=requireCents(obj[`${prefix}_gross_minor`]);
  if(base+tax!==gross)throw Error("US_TAX07_REPORT_SPLIT_INVALID");
  return {base,tax,gross};
}

export function normalizeUsServiceTaxReport(body,ownerType,ownerId){
  const id=Number(ownerId);
  if(body?.ok!==true ||
     body.contract_version!=="US-SERVICE-TAX-report-v1" ||
     body.market_code!=="US" || body.currency_code!=="USD" ||
     body.payment_purpose!=="beauty_service" ||
     body.owner_type!==ownerType || Number(body.owner_id)!==id ||
     body.tax_filing_ready!==false || body.tax_remittance_claim!==false ||
     body.stripe_payouts_are_seller_aggregate!==true ||
     body.allocation_policy!=="cumulative_proportional_half_up_v1" ||
     body.report_basis!=="lifetime_current_state_by_frozen_booking" ||
     !Number.isSafeInteger(body.booking_count) ||
     body.booking_count<0 || body.booking_count>MAX_BOOKINGS ||
     !Array.isArray(body.items) || body.items.length!==body.booking_count ||
     !body.totals || typeof body.totals!=="object" ||
     !Number.isFinite(new Date(body.as_of).getTime())){
    throw Error("US_TAX07_REPORT_CONTRACT_INVALID");
  }
  for(const k of COLUMNS)requireCents(body.totals[k]);
  const quoted=checkSplit(body.totals,"quoted");
  const captured=checkSplit(body.totals,"captured");
  const refunded=checkSplit(body.totals,"refunded");
  const net=checkSplit(body.totals,"net");
  if(captured.base!==refunded.base+net.base ||
     captured.tax!==refunded.tax+net.tax ||
     captured.gross!==refunded.gross+net.gross ||
     refunded.gross>captured.gross ||
     captured.gross>quoted.gross){
    throw Error("US_TAX07_REPORT_TOTAL_MISMATCH");
  }
  const ids=new Set();
  const items=body.items.map(item=>{
    if(!Number.isSafeInteger(item?.booking_id)||item.booking_id<=0 ||
       ids.has(item.booking_id) ||
       item.payment_purpose!=="beauty_service" ||
       item.currency_code!=="USD" ||
       item.collector_owner_type!==ownerType ||
       Number(item.collector_owner_id)!==id ||
       !["quote_frozen","payment_unverified","captured","refunded_partial",
         "refunded_full","disputed"].includes(item.reconciliation_status) ||
       typeof item.signed_payment_captured!=="boolean" ||
       item.payout_attributed_to_booking!==false ||
       !item.quote || !item.refunded ||
       !Array.isArray(item.refunded.refunds)){
      throw Error("US_TAX07_REPORT_BOOKING_INVALID");
    }
    ids.add(item.booking_id);
    const quotedBase=requireCents(item.quote.service_base_minor);
    const quotedTax=requireCents(item.quote.service_tax_minor);
    const quotedGross=requireCents(item.quote.charge_total_minor);
    if(quotedBase+quotedTax!==quotedGross ||
       quotedGross>99999999n ||
       !Number.isSafeInteger(item.quote.rate_bps) ||
       item.quote.rate_bps<0||item.quote.rate_bps>10000 ||
       (quotedBase*BigInt(item.quote.rate_bps)+5000n)/10000n!==quotedTax){
      throw Error("US_TAX07_REPORT_BOOKING_TAX_INVALID");
    }
    const refundedBase=requireCents(item.refunded.refunded_service_base_minor);
    const refundedTax=requireCents(item.refunded.refunded_service_tax_minor);
    const refundedGross=requireCents(item.refunded.refunded_gross_minor);
    if(refundedBase+refundedTax!==refundedGross ||
       refundedGross>quotedGross ||
       !item.signed_payment_captured && refundedGross>0n){
      throw Error("US_TAX07_REPORT_BOOKING_REFUND_INVALID");
    }
    return item;
  });
  return Object.freeze({
    as_of:body.as_of,booking_count:body.booking_count,
    totals:Object.freeze({...body.totals}),
    items:Object.freeze(items),
    currency_code:"USD",
  });
}

export async function fetchUsServiceTaxReport({
  ownerType,ownerId,apiBase,fetchImpl=globalThis.fetch,
  token,signal,
}={}){
  const id=Number(ownerId);
  if(!["salon","master"].includes(ownerType) ||
     !Number.isSafeInteger(id)||id<1 ||
     typeof token!=="string"||token.length<12 ||
     typeof fetchImpl!=="function"){
    throw Error("US_TAX07_REPORT_REQUEST_INVALID");
  }
  const base=String(apiBase || (typeof window!=="undefined"?
    window.TOTEM_API_BASE:null) || "https://api.totemv.com").replace(/\/$/,"");
  const url=new URL(base);
  if(url.protocol!=="https:"&&
     !["127.0.0.1","localhost"].includes(url.hostname)){
    throw Error("US_TAX07_REPORT_ENDPOINT_INVALID");
  }
  const response=await fetchImpl(
    base+"/internal/us-service-tax/report/"+ownerType+"/"+id,{
      method:"GET",signal,credentials:"omit",cache:"no-store",
      headers:{
        Accept:"application/json",Authorization:"Bearer "+token,
      },
    }
  );
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    throw Error(typeof payload?.error==="string" &&
      /^US_TAX07_[A-Z_]{3,80}$/.test(payload.error)
        ? payload.error:"US_TAX07_REPORT_UNAVAILABLE");
  }
  return normalizeUsServiceTaxReport(payload,ownerType,id);
}


// FINANCE-US-03 — existing server-scoped, read-only Stripe case evidence.
// Never treats absence of a LIVE intent as proof of settlement or a refund.
// This request cannot acknowledge or close a reconciliation case.
export async function fetchUsC11LiveReconciliation({
  ownerType,ownerId,bookingId,apiBase,
  fetchImpl=globalThis.fetch,token,signal,
}={}) {
  const id=Number(ownerId),booking=Number(bookingId);
  if(!["salon","master"].includes(ownerType)||
     !Number.isSafeInteger(id)||id<1||
     !Number.isSafeInteger(booking)||booking<1||
     typeof token!=="string"||token.length<12||
     typeof fetchImpl!=="function"){
    throw Error("US_C11_RECONCILIATION_REQUEST_INVALID");
  }
  const base=String(apiBase || (typeof window!=="undefined"?
    window.TOTEM_API_BASE:null) || "https://api.totemv.com").replace(/\/$/,"");
  const url=new URL(base);
  if(url.protocol!=="https:" &&
     !["127.0.0.1","localhost"].includes(url.hostname)){
    throw Error("US_C11_RECONCILIATION_ENDPOINT_INVALID");
  }
  const response=await fetchImpl(
    base+"/internal/us-pay-c11/live-connect/"+ownerType+"/"+id+
    "/bookings/"+booking+"/reconciliation",{
      method:"GET",signal,cache:"no-store",credentials:"omit",
      headers:{Accept:"application/json",Authorization:"Bearer "+token},
    }
  );
  const body=await response.json().catch(()=>null);
  if(!response.ok){
    throw Error(typeof body?.error==="string"&&
      /^US_C11_[A-Z_]{3,100}$/.test(body.error)
        ? body.error:"US_C11_RECONCILIATION_UNAVAILABLE");
  }
  const row=body?.reconciliation;
  if(body?.ok!==true||
     body.contract_version!=="US-PAY-C11-reconciliation-read-v1"||
     body.market_code!=="US"||body.currency_code!=="USD"||
     body.booking_id!==booking||
     body.read_only!==true||
     body.persistent_review_acknowledgment!==false||
     body.financial_operation_performed!==false||
     !row || !["no_live_attempt","manual_review"].includes(row.case_status) ||
     typeof row.reason_code!=="string"||
     !/^US_C11_[A-Z_]+$/.test(row.reason_code)||
     typeof row.manual_review_required!=="boolean"||
     row.review_closed!==false||
     row.automatic_refund_allowed!==false||
     row.safe_to_cancel_via_reconciliation!==false||
     !Array.isArray(row.next_steps)||
     row.next_steps.some(x=>typeof x!=="string"||
       !/^[A-Z_]{3,100}$/.test(x))){
    throw Error("US_C11_RECONCILIATION_CONTRACT_INVALID");
  }
  return Object.freeze({
    booking_id:booking,booking_status:String(body.booking_status||""),
    case_status:row.case_status,reason_code:row.reason_code,
    manual_review_required:row.manual_review_required,
    payment_intent_status:row.payment_intent_status||null,
    verified_signed_evidence:row.verified_signed_evidence===true,
    signed_success_observed:row.signed_success_observed===true,
    connected_seller_is_reviewer:row.connected_seller_is_reviewer===true,
    succeeded_refund_minor:row.succeeded_refund_minor??null,
    dispute_count:Number.isSafeInteger(row.dispute_count)
      ? row.dispute_count:null,
    stripe_payment_intent_reference:
      row.connected_seller_is_reviewer===true
        ? row.stripe_payment_intent_reference||null:null,
    last_verified_event_type:row.last_verified_event_type||null,
    next_steps:Object.freeze([...row.next_steps]),
    review_closed:false,read_only:true,
  });
}
