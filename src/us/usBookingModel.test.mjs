import assert from "node:assert/strict";
import {
  US_STATE_CODES, validateUsLocationCatalog, usLocationsForState,
  normalizeUsPhoneDraft, getUsBusinessDate, formatUsPrice,
  getUsCalendarLocations, verifyUsCalendarLocationResponse,
  normalizeUsMasterScheduleFeed,
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

// USA-01 calendar: selected physical branch is required; never fallback UTC.
const registry = {
  ok:true, market_code:"US", currency_code:"USD",
  locations:[
    {location_code:"west",timezone_name:"America/Los_Angeles",
      city_name:"Los Angeles",state_code:"CA",enabled:true,is_primary:false},
    {location_code:"east",timezone_name:"America/New_York",
      city_name:"New York",state_code:"NY",enabled:true,is_primary:true},
    {location_code:"draft",timezone_name:"America/Chicago",
      city_name:"Chicago",state_code:"IL",enabled:false,is_primary:false},
  ],
};
const activeLocations = getUsCalendarLocations(registry);
assert.deepEqual(activeLocations.map(row=>row.location_code),["east","west"]);
assert.equal(activeLocations[0].timezone,"America/New_York");
assert.equal(Object.isFrozen(activeLocations),true);
assert.deepEqual(getUsCalendarLocations({...registry,locations:registry.locations.slice(2)}),[]);
for(const bad of [
  {...registry,market_code:"KG"},
  {...registry,currency_code:"KGS"},
  {...registry,locations:[{...registry.locations[0],timezone_name:"Etc/UTC"}]},
  {...registry,locations:[registry.locations[0],registry.locations[0]]},
  {...registry,locations:null},
]) assert.throws(()=>getUsCalendarLocations(bad));
const scopedCalendar = {
  ok:true,market_code:"US",
  date:{location_code:"east",timezone:"America/New_York",requested_date:"2026-11-18"},
  location:{location_code:"east",timezone:"America/New_York"},
  masters:[],working_hours:[],events:[],
};
assert.equal(verifyUsCalendarLocationResponse(
  scopedCalendar,activeLocations[0]).market_code,"US");
for(const invalid of [
  {...scopedCalendar,market_code:"KG"},
  {...scopedCalendar,date:{...scopedCalendar.date,location_code:"west"}},
  {...scopedCalendar,location:{...scopedCalendar.location,timezone:"Etc/UTC"}},
  {...scopedCalendar,events:null},
]) assert.throws(
  ()=>verifyUsCalendarLocationResponse(invalid,activeLocations[0]),
  /US_CALENDAR_LOCATION_READBACK_MISMATCH/
);
assert.equal(getUsBusinessDate(
  "2026-11-18T03:30:00.000Z","America/Los_Angeles"),"2026-11-17");


// US master schedule: only immutable location-linked bookings, not a new
// salon/master or a mock PostgreSQL write.
const makeUsMasterBooking=(changes={})=>({
  id:501,status:"confirmed",client_name:"Existing client",
  salon_id:18,salon_slug:"existing-salon",salon_name:"Existing salon",
  location_code:"ny",location_timezone:"America/New_York",
  start_at:"2026-11-01T05:30:00.000Z",
  end_at:"2026-11-01T06:00:00.000Z",
  ...changes,
});
const usMasterFeed=bookings=>({
  ok:true,calendar_scope:"us_location",market_code:"US",bookings
});
const dstRows=normalizeUsMasterScheduleFeed(usMasterFeed([
  makeUsMasterBooking({id:503,start_at:"2026-11-01T06:30:00.000Z",
    end_at:"2026-11-01T07:00:00.000Z"}),
  makeUsMasterBooking({id:502,start_at:"2026-11-01T05:30:00.000Z",
    end_at:"2026-11-01T06:00:00.000Z"}),
]));
assert.deepEqual(dstRows.map(x=>x.id),[502,503]);
assert.equal(dstRows[0].local_date,"2026-11-01");
assert.equal(dstRows[0].local_time,"01:30");
assert.equal(dstRows[1].local_time,"01:30");
assert.equal(dstRows[0].utc_offset,"GMT-4");
assert.equal(dstRows[1].utc_offset,"GMT-5");
assert.ok(Object.isFrozen(dstRows));
const laRows=normalizeUsMasterScheduleFeed(usMasterFeed([
  makeUsMasterBooking({
    id:504,location_code:"la",location_timezone:"America/Los_Angeles",
    start_at:"2027-01-01T07:45:00.000Z",
    end_at:"2027-01-01T08:15:00.000Z"
  }),
]));
assert.equal(laRows[0].local_date,"2026-12-31");
assert.equal(laRows[0].local_time,"23:45");
assert.equal(laRows[0].local_end_date,"2027-01-01");
assert.equal(laRows[0].local_end_time,"00:15");
assert.equal(laRows[0].utc_offset,"GMT-8");
assert.deepEqual(normalizeUsMasterScheduleFeed(usMasterFeed([])),[]);
for (const bad of [
  {...usMasterFeed([]),market_code:"KG"},
  {...usMasterFeed([]),calendar_scope:"generic"},
  {...usMasterFeed([]),bookings:null},
  usMasterFeed([makeUsMasterBooking({location_timezone:"Asia/Bishkek",
    location_code:"ny",salon_slug:""} )]),
  usMasterFeed([makeUsMasterBooking({location_timezone:"Etc/UTC"})]),
  usMasterFeed([makeUsMasterBooking({location_timezone:"Invalid/Zone"})]),
  usMasterFeed([makeUsMasterBooking({location_code:"../other"})]),
  usMasterFeed([makeUsMasterBooking({start_at:"2026-11-01 01:30:00"})]),
  usMasterFeed([makeUsMasterBooking({start_at:null})]),
  usMasterFeed([makeUsMasterBooking({end_at:"bad"})]),
  usMasterFeed([makeUsMasterBooking(),makeUsMasterBooking()]),
]) assert.throws(()=>normalizeUsMasterScheduleFeed(bad));
console.log("US_MASTER_BOOKING_TIMEZONE_READ_ONLY=PASS");

console.log("US04_SDK_MODEL_TRANSLATION_UNIT=PASS",JSON.stringify({
  states_and_dc:51,translations_en_ru:37,location_address_zip:true,
  us_phone_syntax:true,iana_business_date:true,usd:true,slot_payload:true,
  legacy_dictionary_keys_untouched:true,
}));
