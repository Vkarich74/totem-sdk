import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeUsPayC11Response,
  formatUsPayC11Amount,
  formatUsPayC11Status,
  formatUsPayC11Recipient,
  formatUsPayC11PaymentStatus,
} from "./usPayC11Model.js";
import {
  formatClientBookingMoney,
  clientBookingStatusLabel,
  clientBookingPaymentLabel,
  clientBookingRecipientLabel,
} from "./clientCabinetPresentation.js";
import { fetchUsPayC11Details } from "./usPayC11Client.js";

const trusted = Object.freeze({
  ok: true, contract_version: "US-PAY-C11-read-v1",
  booking_id: 500, market_code: "US", currency_code: "USD",
  booking_status: "reserved", payment_ready: false,
  price: {
    amount_minor: "1050", currency_code: "USD",
    source: "us_booking_price_snapshots",
  },
  service_tax: {
    rate_bps: 0, amount_minor: "0", currency_code: "USD",
    source: "us_booking_service_tax_snapshots",
  },
  charge_total_minor: "1050",
  total_source: "us_booking_service_tax_snapshots",
  collector: {
    owner_type: "salon", display_name: "SYNTHETIC_US_A", verified: true,
  },
  payment: {
    service_payment_status: "requires_review", provider: null,
  },
});
const us = (payload = trusted) => ({
  id: 500, market_code: "US", currency_code: "USD",
  price_snapshot: 9999, // MALICIOUS/Stale legacy value must NEVER appear.
  status: "completed", // Demonstrate C11 booking status is authoritative.
  payment_status: "confirmed", payment_provider: "xpay",
  us_pay_c11: payload,
});

test("US shows verified USD cents, booking state, recipient and no false paid claim", () => {
  const booking = us();
  assert.equal(formatClientBookingMoney(booking), "$10.50");
  assert.equal(clientBookingStatusLabel(booking), "Reserved");
  assert.equal(clientBookingRecipientLabel(booking),
    "Payment recipient: Salon — SYNTHETIC_US_A");
  assert.equal(clientBookingPaymentLabel(booking), "Payment status unavailable");
});

test("US minimum cent is $0.01, no IEEE754 rounding", () => {
  const payload = {
    ...trusted,price:{...trusted.price,amount_minor:"1"},charge_total_minor:"1",
  };
  assert.equal(formatUsPayC11Amount(us(payload)), "$0.01");
  const more = {
    ...trusted,price:{...trusted.price,amount_minor:"99999999"},
    charge_total_minor:"99999999",
  };
  assert.equal(formatUsPayC11Amount(us(more)), "$999,999.99");
});

test("US only accepts valid signed-off public contract and correct booking id", () => {
  const invalid = [
    { ...trusted, booking_id: 501 },
    { ...trusted, market_code: "KG" },
    { ...trusted, currency_code: "KGS" },
    { ...trusted, payment_ready: true },
    { ...trusted, contract_version: "legacy" },
    { ...trusted, ok: false },
    null,
  ];
  for (const data of invalid) {
    assert.equal(normalizeUsPayC11Response(data, 500), null);
    assert.equal(formatUsPayC11Amount(us(data)), "Price unavailable");
    assert.equal(formatUsPayC11Status(us(data)), "Status unavailable");
    assert.equal(formatUsPayC11Recipient(us(data)), "Payment recipient unavailable");
    assert.equal(formatUsPayC11PaymentStatus(us(data)), "Payment status unavailable");
  }
});

test("US malformed amounts and wrong currency never fall back to legacy", () => {
  for (const amount of ["0", "10.50", "1e3", "-1", "100000000", "", 1050, " 1050"]) {
    const response = { ...trusted, price: { ...trusted.price, amount_minor: amount } };
    assert.equal(formatUsPayC11Amount(us(response)), "Price unavailable");
  }
  const bad = { ...trusted, price: { ...trusted.price, currency_code: "KGS" } };
  assert.equal(formatUsPayC11Amount(us(bad)), "Price unavailable");
});

test("unverified or missing collector never renders owner identity", () => {
  for (const collector of [
    null,
    { ...trusted.collector, verified: false },
    { ...trusted.collector, owner_type: "other" },
    { ...trusted.collector, display_name: "" },
  ]) {
    const payload = { ...trusted, collector };
    assert.equal(formatUsPayC11Recipient(us(payload)), "Payment recipient unavailable");
  }
  const master = {
    ...trusted, collector: {
      owner_type: "master", display_name: "SYNTHETIC_MASTER_US", verified: true,
    },
  };
  assert.equal(formatUsPayC11Recipient(us(master)),
    "Payment recipient: Professional — SYNTHETIC_MASTER_US");
});

test("US never inherits legacy payment confirmed, even if server payload is missing", () => {
  const base = us(null);
  assert.equal(clientBookingPaymentLabel(base), "Payment status unavailable");
  assert.equal(clientBookingStatusLabel(base), "Status unavailable");
  assert.equal(formatClientBookingMoney(base), "Price unavailable");
  const fakePaid = { ...trusted, payment: {
    service_payment_status: "paid", provider: "xpay",
  } };
  assert.equal(clientBookingPaymentLabel(us(fakePaid)), "Payment status unavailable");
});

test("7.25% tax is displayed separately and the checkout total is $107.30",()=>{
  const paid={...trusted,
    price:{...trusted.price,amount_minor:"10005"},
    service_tax:{...trusted.service_tax,rate_bps:725,amount_minor:"725"},
    charge_total_minor:"10730",
    payment:{service_payment_status:"paid",provider:"stripe"},
  };
  const detail=normalizeUsPayC11Response(paid,500);
  assert.equal(detail.breakdown.service_base_minor,"10005");
  assert.equal(detail.breakdown.service_tax_minor,"725");
  assert.equal(detail.breakdown.charge_total_minor,"10730");
  assert.equal(detail.breakdown.rate_bps,725);
  assert.equal(formatUsPayC11Amount(us(paid)),"$107.30");
  assert.equal(detail.payment.service_payment_status,"paid");
});

test("SDK rejects missing or inconsistent tax total instead of displaying base as total",()=>{
  const invalid=[
    {...trusted,service_tax:null},
    {...trusted,charge_total_minor:null},
    {...trusted,total_source:"legacy"},
    {...trusted,service_tax:{...trusted.service_tax,source:"unknown"}},
    {...trusted,service_tax:{...trusted.service_tax,amount_minor:"1"}},
    {...trusted,service_tax:{...trusted.service_tax,rate_bps:7.25}},
    {...trusted,service_tax:{...trusted.service_tax,rate_bps:10001}},
    {...trusted,charge_total_minor:"1051"},
    {...trusted,charge_total_minor:"999999999"},
    {...trusted,service_tax:{...trusted.service_tax,currency_code:"KGS"}},
  ];
  for(const payload of invalid){
    const detail=normalizeUsPayC11Response(payload,500);
    assert.equal(detail.breakdown,null,JSON.stringify(payload));
    assert.equal(formatUsPayC11Amount(us(payload)),"Total unavailable");
  }
  const fakePaid={...invalid[0],payment:{
    service_payment_status:"paid",provider:"stripe",
  }};
  assert.equal(normalizeUsPayC11Response(fakePaid,500)
    .payment.service_payment_status,"requires_review");
});

test("100% service rate is permitted only if gross stays below Stripe cap",()=>{
  const fine={...trusted,
    price:{...trusted.price,amount_minor:"2000"},
    service_tax:{...trusted.service_tax,amount_minor:"2000",rate_bps:10000},
    charge_total_minor:"4000",
  };
  assert.equal(formatUsPayC11Amount(us(fine)),"$40.00");
  assert.equal(normalizeUsPayC11Response({...fine,
    price:{...fine.price,amount_minor:"99999999"},
    service_tax:{...fine.service_tax,amount_minor:"99999999"},
    charge_total_minor:"199999998",
  },500).breakdown,null);
});

test("KG/KZ presentation is not modified by US contract", () => {
  for (const market_code of ["KG", "KZ"]) {
    const booking = {
      market_code, price_snapshot: 1250, status: "confirmed",
      payment_status: "confirmed", payment_provider: "direct",
      us_pay_c11: trusted,
    };
    assert.equal(formatClientBookingMoney(booking), "1 250 сом");
    assert.equal(clientBookingStatusLabel(booking), "Подтверждено");
    assert.equal(clientBookingPaymentLabel(booking), "Оплата наличными подтверждена");
  }
});

test("SDK requests US only and validates booking ID before displaying", async () => {
  const calls = [];
  const mockFetch = async (url, options) => {
    calls.push({url,options});
    return { ok: true, json: async () => trusted };
  };
  const details = await fetchUsPayC11Details({
    apiBase: "https://api.totemv.com/",
    clientId: "55", token: "synthetic-token",
    bookings: [
      {id:500,market_code:"US"},
      {id:502,market_code:"KG"},
      {id:503,market_code:"KZ"},
    ],
    fetchImpl: mockFetch,
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/public\/clients\/55\/synthetic-token\/us-pay-c11\/500$/);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(details["500"].price.amount_minor, "1050");
  assert.equal(details["502"], undefined);
});

test("SDK fail-closed on HTTP 503 and wrong-booking payload", async () => {
  const bookings = [{id:500,market_code:"US"}];
  for (const mockFetch of [
    async () => ({ok:false,status:503}),
    async () => ({ok:true,json:async () => ({...trusted,booking_id:999})}),
    async () => {throw new Error("network down")},
  ]) {
    const result = await fetchUsPayC11Details({
      apiBase:"https://api.totemv.com",clientId:55,token:"synthetic",
      bookings,fetchImpl:mockFetch,
    });
    assert.equal(result["500"], null);
  }
});

test("SDK limits simultaneous US reads to four", async () => {
  let inFlight=0,peak=0;
  const count=13;
  const fakeFetch=async(url) => {
    inFlight++;
    peak=Math.max(peak,inFlight);
    await new Promise(r => setTimeout(r,3));
    inFlight--;
    const id = Number(url.split("/").at(-1));
    return {ok:true,json:async()=>({...trusted,booking_id:id})};
  };
  const result=await fetchUsPayC11Details({
    apiBase:"https://api.totemv.com",clientId:55,token:"synthetic",
    bookings:Array.from({length:count},(_,i)=>({id:i+1,market_code:"US"})),
    fetchImpl:fakeFetch,
  });
  assert.equal(peak,4);
  assert.equal(Object.keys(result).length,count);
});
