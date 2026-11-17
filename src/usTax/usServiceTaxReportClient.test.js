// TOTEM USA / TAX-07: read-only finance reconciliation presentation.
// Standard Node tests, no real API, auth secrets or Production writes.
import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchUsServiceTaxReport,normalizeUsServiceTaxReport,
  formatUsTaxReportMoney,
} from "./usServiceTaxReportClient.js";
const TOKEN="testonly-realistic-session-token-not-valid";
const basic={
  ok:true,contract_version:"US-SERVICE-TAX-report-v1",
  market_code:"US",currency_code:"USD",payment_purpose:"beauty_service",
  owner_type:"salon",owner_id:32,
  as_of:"2026-11-17T12:00:00.000Z",
  report_basis:"lifetime_current_state_by_frozen_booking",
  allocation_policy:"cumulative_proportional_half_up_v1",
  tax_remittance_claim:false,tax_filing_ready:false,
  stripe_payouts_are_seller_aggregate:true,booking_count:1,
  totals:{
    quoted_service_base_minor:"10005",
    quoted_service_tax_minor:"725",quoted_gross_minor:"10730",
    captured_service_base_minor:"10005",
    captured_service_tax_minor:"725",captured_gross_minor:"10730",
    refunded_service_base_minor:"2331",
    refunded_service_tax_minor:"169",refunded_gross_minor:"2500",
    net_service_base_minor:"7674",
    net_service_tax_minor:"556",net_gross_minor:"8230",
    outstanding_refund_requests_minor:"0",
  },
  items:[{
    booking_id:45,collector_owner_type:"salon",collector_owner_id:32,
    payment_purpose:"beauty_service",currency_code:"USD",
    quoted_at:"2026-11-17T09:00:00Z",
    quote:{
      service_base_minor:"10005",service_tax_minor:"725",
      charge_total_minor:"10730",rate_bps:725,
      collector_revision:2,tax_setting_revision:1,
    },
    signed_payment_captured:true,reconciliation_status:"refunded_partial",
    refunded:{
      refunded_gross_minor:"2500",refunded_service_base_minor:"2331",
      refunded_service_tax_minor:"169",
      net_gross_minor:"8230",net_service_base_minor:"7674",
      net_service_tax_minor:"556",
      refunds:[{
        stripe_refund_id:"re_TAX07EXTERNAL1",
        status:"succeeded",amount_minor:"2500",
        refunded_service_base_minor:"2331",
        refunded_service_tax_minor:"169",
        counted_as_refunded:true,authorized_by_owner:false,
      }],
    },
    outstanding_refund_requests_minor:"0",blocking_dispute:false,
    payout_attributed_to_booking:false,
  }],
};

test("TAX-07 owner tax report verifies exact $100.05 + $7.25 and partial refund",()=>{
  const report=normalizeUsServiceTaxReport(basic,"salon",32);
  assert.equal(report.booking_count,1);
  assert.equal(formatUsTaxReportMoney(report.totals.captured_gross_minor),"$107.30");
  assert.equal(formatUsTaxReportMoney(report.totals.refunded_gross_minor),"$25.00");
  assert.equal(formatUsTaxReportMoney(report.totals.refunded_service_tax_minor),"$1.69");
  assert.equal(formatUsTaxReportMoney(report.totals.net_gross_minor),"$82.30");
  assert.equal(formatUsTaxReportMoney(report.totals.net_service_tax_minor),"$5.56");
  assert.equal(formatUsTaxReportMoney("0"),"$0.00");
  assert.equal(formatUsTaxReportMoney("25000000000"),"$250,000,000.00");
});

test("TAX-07 safely rejects impersonation, non-US, invalid gross and tax filing claims",()=>{
  const bad=[
    {...basic,market_code:"KG"},
    {...basic,currency_code:"KGS"},
    {...basic,owner_id:999},
    {...basic,owner_type:"master"},
    {...basic,tax_filing_ready:true},
    {...basic,tax_remittance_claim:true},
    {...basic,stripe_payouts_are_seller_aggregate:false},
    {...basic,booking_count:2},
    {...basic,totals:{...basic.totals,net_gross_minor:"8231"}},
    {...basic,totals:{...basic.totals,refunded_service_tax_minor:"168"}},
    {...basic,totals:{...basic.totals,captured_gross_minor:"10731"}},
    {...basic,items:[{...basic.items[0],quote:{
      ...basic.items[0].quote,service_tax_minor:"726",
    }}]},
    {...basic,items:[{...basic.items[0],signed_payment_captured:false}]},
    {...basic,items:[{...basic.items[0],payout_attributed_to_booking:true}]},
    {...basic,totals:{...basic.totals,quoted_service_base_minor:"-1"}},
  ];
  for(const b of bad){
    assert.throws(()=>normalizeUsServiceTaxReport(b,"salon",32),
      /US_TAX07_REPORT_/);
  }
});

test("TAX-07 GET is read-only and omits other owners, markets or Stripe",async()=>{
  const calls=[];
  const response=await fetchUsServiceTaxReport({
    ownerType:"salon",ownerId:32,token:TOKEN,
    fetchImpl:async(url,options)=>{
      calls.push({url,options});
      return {ok:true,status:200,json:async()=>basic};
    },
  });
  assert.equal(response.items[0].booking_id,45);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,
    "https://api.totemv.com/internal/us-service-tax/report/salon/32");
  assert.equal(calls[0].options.method,"GET");
  assert.equal(calls[0].options.cache,"no-store");
  assert.equal(calls[0].options.credentials,"omit");
  assert.equal(calls[0].options.headers.Authorization,"Bearer "+TOKEN);
  assert.equal(calls[0].options.body,undefined);
});

test("TAX-07 no write, fake status, unsupported payment or invalid auth",async()=>{
  let invoked=false;
  const probe=async()=>{invoked=true;throw Error("NET_FORBIDDEN");};
  for(const options of [
    {ownerType:"master",ownerId:0,token:TOKEN},
    {ownerType:"subscription",ownerId:1,token:TOKEN},
    {ownerType:"salon",ownerId:1,token:""},
    {ownerType:"salon",ownerId:1,token:TOKEN,apiBase:"http://othersite.test"},
  ]){
    await assert.rejects(fetchUsServiceTaxReport({
      ...options,fetchImpl:probe,
    }),/US_TAX07_/);
  }
  assert.equal(invoked,false);
  await assert.rejects(fetchUsServiceTaxReport({
    ownerType:"salon",ownerId:32,token:TOKEN,
    fetchImpl:async()=>({ok:false,status:503,json:async()=>null}),
  }),/US_TAX07_REPORT_UNAVAILABLE/);
});

test("TAX-07 does not display owner-incorrect payload as an empty valid report",()=>{
  assert.throws(()=>normalizeUsServiceTaxReport(
    {...basic,items:[{...basic.items[0],collector_owner_id:31}]},
    "salon",32
  ),/US_TAX07_REPORT_BOOKING_INVALID/);
});
