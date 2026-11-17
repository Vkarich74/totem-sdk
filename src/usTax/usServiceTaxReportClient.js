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
