import assert from "node:assert/strict";
import { buildUsSalonBookingUrl } from "./usBookingNavigation.js";
let ok=0;
function check(name,fn){fn();ok++;console.log("US_UNIFIED_BOOKING_NAV_PASS",name)}
check("salon_booking_in_shared_sdk",()=>{
  assert.equal(buildUsSalonBookingUrl({salonSlug:"us-salon"}),"/#/booking?salon=us-salon");
  assert.equal(buildUsSalonBookingUrl({salonSlug:"us-salon",bookingUrl:"/booking"}),"/#/booking?salon=us-salon");
});
check("master_filter_from_us_route",()=>{
  assert.equal(buildUsSalonBookingUrl({salonSlug:"us-salon",bookingUrl:"#/booking?master=101"}),
    "/#/booking?salon=us-salon&master=101");
});
check("malicious_salon_context_cannot_redirect_other_tenant",()=>{
  assert.equal(buildUsSalonBookingUrl({salonSlug:"us-salon",bookingUrl:"/#/booking?salon=another"}),
    "/#/booking?salon=us-salon");
});
check("absolute_booking_is_mapped_locally_not_external",()=>{
  assert.equal(buildUsSalonBookingUrl({salonSlug:"us-salon",bookingUrl:"https://app.totemv.com/#/booking?master=7"}),
    "/#/booking?salon=us-salon&master=7");
});
check("reject_untrusted_protocols_and_pseudo_links",()=>{
  for(const url of ["javascript:alert(1)","https://evil.example/#/auth/login",
    "//evil.example/#/booking","/#/booking?master=../../x","https://evil.example:443/salon/test",
    "/%2fbooking","#/booking?master=NaN"]){
    assert.equal(buildUsSalonBookingUrl({salonSlug:"us-salon",bookingUrl:url}),"",url);
  }
});
check("reject_invalid_slugs",()=>assert.equal(buildUsSalonBookingUrl({salonSlug:"../prod"}),""));
check("do_not_require_US_service_or_database",()=>assert.equal(buildUsSalonBookingUrl({salonSlug:"us-salon"}),"/#/booking?salon=us-salon"));
console.log("US_UNIFIED_BOOKING_NAV_ALL_PASS",ok);
