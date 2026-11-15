import assert from "node:assert/strict";
import {
  US_STATE_CODES, validateUsLocationCatalog, usLocationsForState,
  normalizeUsPhoneDraft, getUsBusinessDate, formatUsPrice,
  formatUsLocationAddress, isValidUsSlot, createUsBookingRequest,
} from "./usBookingModel.js";
import { translate, localeLabels, messages } from "../i18n/messages.js";

assert.equal(US_STATE_CODES.length, 51);
assert.equal(new Set(US_STATE_CODES).size, 51);
assert.ok(US_STATE_CODES.includes("DC"));
assert.ok(US_STATE_CODES.includes("AK"));
assert.ok(US_STATE_CODES.includes("HI"));
for (const code of ["PR", "GU", "VI", "AS", "MP"]) {
  assert.ok(!US_STATE_CODES.includes(code));
}
const states = US_STATE_CODES.map(code => ({
  code, name_en: code === "DC" ? "District of Columbia" : `State ${code}`,
  kind: code === "DC" ? "federal_district" : "state",
}));
const locations = [{
  location_code:"ny", state_code:"NY", city_name:"New York",
  street_line1:"111 Test Street", street_line2:"Suite 2",
  postal_code:"10001-0001", timezone:"America/New_York", is_primary:true,
}, {
  location_code:"az", state_code:"AZ", city_name:"Phoenix",
  street_line1:"222 Example Ave", street_line2:"",
  postal_code:"85001", timezone:"America/Phoenix", is_primary:false,
}];
const raw = {ok:true,market_code:"US",currency_code:"USD",locale:"en-US",
  phone_country_code:"+1",states,locations};
const valid = validateUsLocationCatalog(raw);
assert.equal(valid.states.length,51);
assert.equal(valid.locations.length,2);
assert.ok(Object.isFrozen(valid));
assert.equal(valid.states[0].name,"District of Columbia");
assert.deepEqual(usLocationsForState(valid.locations,"NY").map(x=>x.location_code),["ny"]);
assert.deepEqual(usLocationsForState(valid.locations,"AZ").map(x=>x.location_code),["az"]);
assert.deepEqual(usLocationsForState(valid.locations,"CA"),[]);
assert.deepEqual(usLocationsForState(valid.locations,"PR"),[]);
assert.equal(formatUsLocationAddress(valid.locations[0]),
  "111 Test Street · Suite 2 · New York, NY 10001-0001");
for (const bad of [
  {...raw, states:states.slice(1)},
  {...raw, states:[...states.slice(0,-1),states[0]]},
  {...raw, locations:[{...locations[0],timezone:"Etc/UTC"}]},
  {...raw, locations:[{...locations[0],postal_code:"1001"}]},
  {...raw, locations:[{...locations[0],state_code:"PR"}]},
  {...raw, locations:[locations[0],locations[0]]},
  {...raw, currency_code:"KGS"},
]) assert.throws(()=>validateUsLocationCatalog(bad));
assert.deepEqual([
  normalizeUsPhoneDraft("+1 (213) 373-4253"),
  normalizeUsPhoneDraft("(213) 373-4253"),
  normalizeUsPhoneDraft("12133734253"),
  normalizeUsPhoneDraft("2133734253"),
],Array(4).fill("+12133734253"));
for(const bad of ["","12345","+996555123456","1133734253","213 073 4253","213-373-4253 ext 1"])
  assert.equal(normalizeUsPhoneDraft(bad),null);
assert.equal(getUsBusinessDate("2026-11-01T03:30:00.000Z","America/New_York"),"2026-10-31");
assert.equal(getUsBusinessDate("2026-11-01T03:30:00.000Z","America/Phoenix"),"2026-10-31");
assert.equal(getUsBusinessDate("2026-11-01T03:30:00.000Z","Pacific/Honolulu"),"2026-10-31");
assert.equal(getUsBusinessDate("2026-11-01T14:30:00.000Z","America/New_York"),"2026-11-01");
assert.equal(formatUsPrice(1200),"$1,200.00");
const slot={location_code:"ny",local_time:"11:00",
  start_at:"2027-01-18T16:00:00.000Z",end_at:"2027-01-18T16:30:00.000Z"};
assert.equal(isValidUsSlot(slot,"ny"),true);
assert.equal(isValidUsSlot(slot,"az"),false);
const booking=createUsBookingRequest({
  masterId:401,serviceId:601,location:valid.locations[0],date:"2027-01-18",
  slot,clientName:" Test Client ",clientPhone:"213-373-4253",
});
assert.deepEqual(booking,{
  master_id:401,service_id:601,location_code:"ny",
  date:"2027-01-18",time:"11:00",start_at:"2027-01-18T16:00:00.000Z",
  client_payload:{name:"Test Client",phone:"+12133734253"},
});
assert.throws(()=>createUsBookingRequest({...booking,
  masterId:401,serviceId:601,location:valid.locations[1],slot,
  clientName:"Test Client",clientPhone:"213-373-4253"}));
assert.equal(localeLabels["en-US"],"English");
const ruKeys=Object.keys(messages.ru).filter(x=>x.startsWith("us.book."));
const enKeys=Object.keys(messages.en).filter(x=>x.startsWith("us.book."));
assert.equal(enKeys.length,37);
assert.deepEqual(ruKeys.sort(),enKeys.sort());
assert.equal(translate("en-US","us.book.title"),"Book an appointment");
assert.equal(translate("ru-KG","us.book.title"),"Запись в салон");
assert.equal(translate("en-US","us.book.bookingNumber",{number:52}),"Booking number: 52");
console.log("US04_SDK_MODEL_TRANSLATION_UNIT=PASS",JSON.stringify({
  states_and_dc:51,translations_en_ru:37,location_address_zip:true,
  us_phone_syntax:true,iana_business_date:true,usd:true,slot_payload:true,
  legacy_dictionary_keys_untouched:true,
}));
