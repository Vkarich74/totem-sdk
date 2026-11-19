// Stage 2/4 — canonical US/KG/KZ boundary, no HTTP or persisted test data.
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import {allowsLegacyMasterQuickBooking} from "./usBookingModel.js";
const read=p=>fs.readFileSync(new URL(p,import.meta.url),"utf8");
const bookings=read("../master/pages/MasterBookingsPage.jsx");
const schedule=read("../master/pages/MasterSchedulePage.jsx");
const publicApi=read("../api/publicApi.js");
const model=read("./usBookingModel.js");
const i18n=read("../i18n/messages.js");

for(const market of ["KG","KZ"]){
  test(market+" legacy master quick-booking preserved with verified context",()=>{
    assert.equal(allowsLegacyMasterQuickBooking({
      status:"ready",context:{market_code:market},
      context_source:"owner_verified",
      business_context_status:"resolved",
    }),true);
  });
}
for(const [label,props] of [
  ["US", {status:"ready",context:{market_code:"US"}}],
  ["loading",{status:"loading",context:{market_code:"KG"}}],
  ["unresolved mixed-market",{status:"ready",context:{market_code:"KG"},
    context_source:"platform_ui_default",business_context_status:"unresolved"}],
  ["invalid",{status:"ready",context:{market_code:"MX"}}],
  ["missing",{status:"ready",context:null}],
]){
  test(label+" master legacy quick-booking denied",()=>{
    assert.equal(allowsLegacyMasterQuickBooking(props),false);
  });
}
test("US manual creation form and service fetch blocked at source",()=>{
  assert.match(bookings,/if\(!isCreateMode \|\| !masterSlug \|\| !legacyQuickBookingAllowed\)/);
  const guard=bookings.indexOf("if(!legacyQuickBookingAllowed){");
  const legacyTime=bookings.indexOf('date + "T" + time + ":00+06:00"');
  const legacyRequest=bookings.indexOf("await masterCabinetLegacyJson(");
  assert.ok(guard>=0 && legacyTime>guard && legacyRequest>guard);
  assert.match(bookings,/if \(isCreateMode && !legacyQuickBookingAllowed\)/);
  assert.match(bookings,/master\.quickBookingUnavailable/);
});
test("US lifecycle chooses booking owner salon, KG/KZ keep legacy salon selector",()=>{
  assert.match(schedule,/const actionSalonSlug=isUsMarket\s*\? String\(booking\?\.salon_slug\|\|""\)\.trim\(\)\s*:\s*resolveActionSalonSlug\(\)/);
  assert.match(model,/const salonSlug = String\(raw\?\.salon_slug \|\| ""\)/);
  assert.match(model,/US_MASTER_BOOKING_LOCATION_INVALID/);
});
test("US lifecycle reuses canonical existing bearer store, never invents a token",()=>{
  assert.match(publicApi,/import \{ getAuthAccessToken \} from "\.\/internal\.js"/);
  assert.match(publicApi,/const token = getAuthAccessToken\(\);/);
  assert.match(publicApi,/Authorization: "Bearer " \+ token/);
  assert.match(publicApi,/postSalonBookingLifecycle\(salonSlug, bookingId, action\)/);
  assert.doesNotMatch(publicApi,/TOTEM_NEW_TOKEN|US_LIFECYCLE_API_BASE/);
});
test("user-readable US safety boundary is translated RU + EN",()=>{
  assert.equal(i18n.split('"master.quickBookingUnavailable"').length-1,2);
});
