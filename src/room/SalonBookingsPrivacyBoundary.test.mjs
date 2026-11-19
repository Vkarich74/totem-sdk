// Stage 3/4 owner booking page compatibility: no API or authentication fork.
import assert from "node:assert/strict";
import fs from "node:fs";
import {test} from "node:test";

const read=relative=>fs.readFileSync(new URL(relative,import.meta.url),"utf8");
const compatibility=read("./SalonBookingsPage.jsx");
const app=read("../App.jsx");
const salonLayout=read("../salon/SalonLayout.jsx");
const ownerBookings=read("../salon/pages/BookingsPage.jsx");
const internal=read("../api/internal.js");
const publicApi=read("../api/publicApi.js");

test("existing /bookings URL is routed to ONE canonical salon-admin cabinet",()=>{
  assert.match(app,/import SalonBookingsPage from "\.\/room\/SalonBookingsPage"/);
  assert.match(app,/path="bookings" element=\{<SalonBookingsPage/);
  assert.match(app,/path="salon\/:slug" element=\{<SalonLayout/);
  assert.match(app,/path="bookings" element=\{<BookingsPage/);
  assert.match(compatibility,/\bNavigate\b/);
  assert.match(compatibility,/to=\{"\/salon\/" \+ encodeURIComponent\(salonSlug\) \+ "\/bookings"\}/);
  assert.match(compatibility,/\sreplace\s*\/>/);
});

test("legacy booking route cannot directly read names or mutate booking/payment",()=>{
  assert.doesNotMatch(compatibility,/\bfetch\s*\(/);
  assert.doesNotMatch(compatibility,/lifecycle|\/public\/salons|postSalonBookingLifecycle/);
  assert.doesNotMatch(compatibility,/updateBooking|cancelBooking|createBooking/);
  assert.match(compatibility,/\/\^\[a-z0-9\]/);
});

test("canonical SalonLayout has session and role gates before protected bookings UI",()=>{
  assert.match(salonLayout,/function SessionGate\(/);
  assert.match(salonLayout,/resolveSession\(/);
  assert.match(salonLayout,/role === "salon_admin"/);
  assert.match(salonLayout,/<SessionGate slug=\{slug\}>/);
  assert.match(salonLayout,/\/auth\/login\?/);
  assert.match(ownerBookings,/\.\.\/\.\.\/api\/internal/);
  assert.match(internal,/export async function getBookings\(/);
  assert.match(internal,/\/salons\/\$\{salonSlug\}\/bookings/);
});

test("shared lifecycle transport remains existing authenticated API",()=>{
  assert.match(internal,/export function getAuthAccessToken\(/);
  assert.match(publicApi,/getAuthAccessToken\(\)/);
  assert.match(publicApi,/Authorization: "Bearer " \+ token/);
  assert.match(internal,/export async function bookingAction\(/);
  assert.match(internal,/headers: buildJsonHeaders\(\)/);
  assert.match(publicApi,/postSalonBookingLifecycle\(salonSlug, bookingId, action\)/);
});
