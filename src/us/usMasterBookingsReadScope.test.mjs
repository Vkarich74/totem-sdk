// Offline regression of existing master bookings page, IANA/DST, and region guard.
// Does not create real users, master bookings, salons or DB rows.
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import {classifyUnresolvedMasterMarketProbe,normalizeUsMasterScheduleFeed} from "./usBookingModel.js";
import {translate} from "../i18n/messages.js";

const ui=fs.readFileSync(new URL("../master/pages/MasterBookingsPage.jsx",import.meta.url),"utf8");
const schedule=fs.readFileSync(new URL("../master/pages/MasterSchedulePage.jsx",import.meta.url),"utf8");
const internal=fs.readFileSync(new URL("../api/internal.js",import.meta.url),"utf8");

test("existing master bookings and schedule use ONE opt-in US location booking feed",()=>{
  assert.ok(ui.includes("getMasterBookings(masterSlug,{usLocationScope:true})"));
  assert.ok(schedule.includes("getMasterBookings(routeSlug,{usLocationScope:true})"));
  assert.ok(internal.includes("calendar_scope=us_location"));
  assert.ok(ui.includes("normalizeUsMasterScheduleFeed(usResult)"));
  assert.ok(ui.includes("classifyUnresolvedMasterMarketProbe(usResult)"));
  assert.doesNotMatch(ui,/\bfetch\s*\(/);
  assert.ok(!ui.includes("const API_BASE"));
});

test("unresolved market probes US, rejects mixed, falls back only for legacy KG/KZ",()=>{
  assert.ok(ui.includes('if(explicitUsMarket || unresolvedMasterMarket)'));
  assert.ok(ui.includes('if(scope.mode==="mixed")throw new Error("MASTER_US_MIXED_MARKETS")'));
  assert.ok(ui.includes('else if(marketContext?.market_code==="KG" ||'));
  assert.ok(ui.includes('marketContext?.market_code==="KZ")'));
  assert.ok(ui.includes('throw new Error("MASTER_MARKET_SCOPE_UNVERIFIED")'));
  const mixed=classifyUnresolvedMasterMarketProbe({
    ok:false,detail:{status:409,json:{error:"MASTER_US_MIXED_MARKETS"}}
  });
  assert.equal(mixed.mode,"mixed");
  const legacy=classifyUnresolvedMasterMarketProbe({
    ok:false,detail:{status:409,json:{error:"MASTER_US_MARKET_SCOPE_REQUIRED"}}
  });
  assert.equal(legacy.mode,"legacy");
  assert.deepEqual(classifyUnresolvedMasterMarketProbe({
    ok:true,market_code:"US",calendar_scope:"us_location",bookings:[]
  }),{mode:"us",bookings:[]});
  assert.throws(()=>classifyUnresolvedMasterMarketProbe({
    ok:false,detail:{status:403,json:{error:"MASTER_US_SESSION_REQUIRED"}}
  }));
});

test("US time label uses verified per-booking IANA + UTC offset, not device timezone",()=>{
  assert.ok(ui.includes("booking.local_date"));
  assert.ok(ui.includes("booking.local_time"));
  assert.ok(ui.includes("booking.location_timezone"));
  assert.ok(ui.includes("booking.utc_offset"));
  assert.match(ui,/formatVerifiedBookingTime\(booking,verifiedUsBookings\)/);
  assert.match(ui,/formatVerifiedBookingTime\(b,verifiedUsBookings\)/);
  assert.ok(ui.includes("const verifiedUsBookings = bookingsScope.key === bookingsScopeKey"));
  assert.ok(ui.includes("bookingsScope.mode === \"us\""));
  assert.ok(ui.includes("bookingsScope.key !== bookingsScopeKey"));
  assert.deepEqual(normalizeUsMasterScheduleFeed({
    ok:true,market_code:"US",calendar_scope:"us_location",bookings:[]
  }),[]);
});

test("legacy KG/KZ money, no unverified US price or refund side effects",()=>{
  assert.ok(ui.includes("formatDateTime(booking?.start_at)"));
  assert.ok(ui.includes("!verifiedUsBookings && booking.price"));
  assert.ok(ui.includes("{verifiedUsBookings ? ("));
  assert.match(ui,/getMasterBookings\(masterSlug\)/);
  assert.ok(ui.includes('date + "T" + time + ":00+06:00"'));
  assert.ok(ui.includes("if(!legacyQuickBookingAllowed){"));
});

test("RU+EN explain ambiguous and unavailable market with no raw server exception",()=>{
  for(const [locale,key] of [
    ["ru-KG","master.bookingsMixedMarkets"],
    ["en-US","master.bookingsMixedMarkets"],
    ["ru-KG","master.bookingsMarketUnavailable"],
    ["en-US","master.bookingsMarketUnavailable"],
  ]){
    const v=translate(locale,key);
    assert.notEqual(v,key);
    assert.ok(v.length>20);
  }
});
