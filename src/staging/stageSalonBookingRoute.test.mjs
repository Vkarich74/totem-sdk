import assert from "node:assert/strict";
import { createStageLinkPolicy } from "./stageLinkPolicy.js";
import { shouldUseStageBookingHash, buildStageSalonBookingRoute } from "./stageSalonBookingRoute.js";

const STAGE = "https://totem-us-staging-sdk-staging.up.railway.app";
const policy = createStageLinkPolicy({strict:true,appOrigin:STAGE,publicOrigin:STAGE});
let passed=0;
function check(name, fn){fn();passed++;console.log("STAGE_SALON_BOOKING_ROUTE_PASS",name)}
check("salon_public_path_hash_booking_is_priority",()=>{
  assert.equal(shouldUseStageBookingHash(["salon","us-salon"],["booking"],true),true);
  assert.equal(shouldUseStageBookingHash(["master","us-master"],["booking"],true),true);
});
check("production_cabinet_routes_unchanged",()=>{
  assert.equal(shouldUseStageBookingHash(["salon","us-salon"],["booking"],false),false);
  assert.equal(shouldUseStageBookingHash(["master","us-master"],["booking"],false),false);
  assert.equal(shouldUseStageBookingHash(["salon","us-salon"],["dashboard"],true),false);
});
check("default_booking_contains_salon",()=>{
  assert.equal(buildStageSalonBookingRoute("/booking","us-salon",policy),"/booking?salon=us-salon");
  assert.equal(buildStageSalonBookingRoute("#/booking","us-salon",policy),"/booking?salon=us-salon");
});
check("approved_absolute_booking_keeps_master",()=>{
  assert.equal(buildStageSalonBookingRoute(STAGE+"/#/booking?salon=other&master=101","us-salon",policy),
    "/booking?salon=us-salon&master=101");
});
check("booking_route_keeps_optional_filters",()=>{
  assert.equal(buildStageSalonBookingRoute("/m/booking?master=101","us-salon",policy),
    "/booking?master=101&salon=us-salon");
});
check("invalid_template_url_denied",()=>{
  assert.equal(buildStageSalonBookingRoute("https://app.totemv.com/#/booking?salon=prod","us-salon",policy),"");
  assert.equal(buildStageSalonBookingRoute("javascript:alert(1)","us-salon",policy),"");
  assert.equal(buildStageSalonBookingRoute(STAGE+"/#/auth/login","us-salon",policy),"");
});
check("invalid_salon_slug_denied",()=>{
  assert.equal(buildStageSalonBookingRoute("/booking","../other",policy),"");
  assert.equal(buildStageSalonBookingRoute("/booking","",policy),"");
});
console.log("STAGE_SALON_BOOKING_ROUTE_ALL_PASS",passed);
