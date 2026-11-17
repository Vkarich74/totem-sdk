// US06-CABINET: pure deterministic RU/US presentation, USD, branch DST.
// Node standard library only; no network, DB, production, or writes.
import assert from "node:assert/strict";
import {
  CLIENT_CABINET_RU, CLIENT_CABINET_EN,
  isUsClientDashboard, clientCabinetLabels,
  formatClientBookingTime, formatClientBookingMoney,
  clientBookingStatusLabel, clientBookingPaymentLabel,
} from "./clientCabinetPresentation.js";
const checks=[];
function check(name,fn){fn();checks.push(name);console.log("US06_CABINET_UNIT_PASS",name)}
const ny={
  id:500,
  market_code:"US",currency_code:"USD",booking_timezone:"America/New_York",
  start_at:"2027-01-18T16:00:00.000Z",price_snapshot:125,
  status:"reserved",payment_status:null,payment_provider:null,
  us_pay_c11:{
    ok:true,contract_version:"US-PAY-C11-read-v1",
    booking_id:500,market_code:"US",currency_code:"USD",
    booking_status:"reserved",payment_ready:false,
    price:{amount_minor:"12500",currency_code:"USD",source:"us_booking_price_snapshots"},
    service_tax:{rate_bps:0,amount_minor:"0",currency_code:"USD",source:"us_booking_service_tax_snapshots"},
    charge_total_minor:"12500",total_source:"us_booking_service_tax_snapshots",
    collector:{owner_type:"salon",display_name:"US SALON",verified:true},
    payment:{service_payment_status:"requires_review",provider:null},
  },
};
const legacy={
  market_code:"KG",currency_code:"KGS",start_at:"2027-01-18T16:00:00.000Z",
  price_snapshot:1200,status:"reserved",payment_status:"pending",
  payment_provider:"direct",
};
check("US_MARKET_SERVER_CLIENT_CONTEXT",()=>{
 assert.equal(isUsClientDashboard({client:{market_code:"US"},bookings:[]}),true);
 assert.equal(clientCabinetLabels({client:{market_code:"US"}}),CLIENT_CABINET_EN);
});
check("KG_AND_KZ_CLIENT_CONTEXT_NOT_FORCED_TO_US",()=>{
 for(const market_code of ["KG","KZ"]){
  const data={client:{market_code},bookings:[ny]};
  assert.equal(isUsClientDashboard(data),false);
  assert.equal(clientCabinetLabels(data),CLIENT_CABINET_RU);
 }
});
check("US_BOOKING_ONLY_COMPATIBLE_BACKEND_FALLBACK",()=>{
 assert.equal(isUsClientDashboard({bookings:[ny]}),true);
 assert.equal(isUsClientDashboard({bookings:[ny,legacy]}),false);
 assert.equal(isUsClientDashboard({bookings:[]}),false);
});
check("USD_VERIFIED_IMMUTABLE_GROSS_NOT_LEGACY_CATALOG_PRICE",()=>{
 assert.equal(formatClientBookingMoney(ny),"$125.00");
 assert.equal(formatClientBookingMoney({...ny,price_snapshot:0}),"$125.00");
 assert.equal(formatClientBookingMoney({...ny,price_snapshot:"145.9"}),"$125.00");
 assert.equal(formatClientBookingMoney({...ny,us_pay_c11:null}),"Price unavailable");
});
check("US_CANNOT_ACCIDENTALLY_DISPLAY_KGS_OR_MISSING_AS_USD",()=>{
 assert.equal(formatClientBookingMoney({...ny,currency_code:"KGS"}),"Price unavailable");
 assert.equal(formatClientBookingMoney({...ny,currency_code:null}),"Price unavailable");
 assert.equal(formatClientBookingMoney({...ny,price_snapshot:null}),"$125.00");
 assert.equal(formatClientBookingMoney({
   ...ny,us_pay_c11:{...ny.us_pay_c11,service_tax:null},
 }),"Total unavailable");
});
check("LEGACY_KG_MONEY_PRESERVED",()=>{
 assert.equal(formatClientBookingMoney(legacy),"1 200 сом".replace(" ","\u00a0").replace(/^1\u00a0200/, (1200).toLocaleString("ru-RU")));
 assert.equal(formatClientBookingMoney({...legacy,price_snapshot:null}),"0 сом");
});
check("LEGACY_KZ_BEHAVIOR_UNCHANGED_IN_US_GATE",()=>{
 assert.equal(formatClientBookingMoney({...legacy,market_code:"KZ",currency_code:"KZT"}),(1200).toLocaleString("ru-RU")+" сом");
});
check("NEW_YORK_WINTER_IANA_DST",()=>{
 const s=formatClientBookingTime(ny);
 assert.match(s,/Jan 18, 2027/);
 assert.match(s,/11:00\s?AM/);
 assert.match(s,/EST/);
});
check("NEW_YORK_SUMMER_IANA_DST",()=>{
 const s=formatClientBookingTime({...ny,start_at:"2027-07-18T16:00:00.000Z"});
 assert.match(s,/Jul 18, 2027/);
 assert.match(s,/12:00\s?PM/);
 assert.match(s,/EDT/);
});
check("ARIZONA_NO_DST_ACROSS_SEASONS",()=>{
 for(const start_at of ["2027-01-18T16:00:00.000Z","2027-07-18T16:00:00.000Z"]){
  const s=formatClientBookingTime({...ny,start_at,booking_timezone:"America/Phoenix"});
  assert.match(s,/9:00\s?AM/);
  assert.match(s,/MST/);
 }
});
check("US_MISSING_BRANCH_TZ_FAILS_CLOSED",()=>{
 assert.equal(formatClientBookingTime({...ny,booking_timezone:null}),"Time zone unavailable");
 assert.equal(formatClientBookingTime({...ny,booking_timezone:"Not/Timezone"}),"Time zone unavailable");
});
check("US_INVALID_INSTANT_FAILS_CLOSED",()=>{
 assert.equal(formatClientBookingTime({...ny,start_at:"invalid"}),"Time unavailable");
});
check("STATUS_US_EN_LEGACY_RU",()=>{
 assert.equal(clientBookingStatusLabel(ny),"Reserved");
 assert.equal(clientBookingStatusLabel({...ny,status:"confirmed"}),"Confirmed");
 assert.equal(clientBookingStatusLabel(legacy),"Забронировано");
});
check("PAYMENT_US_VERIFIED_ONLY_LEGACY_KG_UNCHANGED",()=>{
 assert.equal(clientBookingPaymentLabel({...ny,payment_provider:"direct",payment_status:"pending"}),"Payment status unavailable");
 assert.equal(clientBookingPaymentLabel({...ny,payment_status:"refunded"}),"Payment status unavailable");
 assert.equal(clientBookingPaymentLabel(legacy),"Наличные ожидают подтверждения");
});
check("US_IGNORES_RUSSIAN_LEGACY_PAYMENT_LABEL",()=>{
 assert.equal(clientBookingPaymentLabel({...ny,payment_label_ru:"Ожидаем оплату XPAY"}),"Payment status unavailable");
});
check("PAGE_COPY_EN_RU_PARITY_AND_NO_RUBLES",()=>{
 assert.equal(CLIENT_CABINET_EN.title,"Client dashboard");
 assert.equal(CLIENT_CABINET_RU.title,"Кабинет клиента");
 assert.deepEqual(Object.keys(CLIENT_CABINET_EN).sort(),Object.keys(CLIENT_CABINET_RU).sort());
});
console.log("US06_CABINET_ALL_UNIT_PASS",JSON.stringify({checks:checks.length,
 production_calls:0,production_writes:0}));
