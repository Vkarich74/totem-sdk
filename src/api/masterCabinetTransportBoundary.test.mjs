import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = name => fs.readFileSync(new URL(name, import.meta.url), "utf8");
const bookings = read("../master/pages/MasterBookingsPage.jsx");
const schedule = read("../master/pages/MasterSchedulePage.jsx");
const publicApi = read("./publicApi.js");
const internal = read("./internal.js");
const app = read("../App.jsx");

test("canonical master routes, no duplicate page or raw cabinet fetch", () => {
  assert.doesNotMatch(bookings, /\bfetch\s*\(/);
  assert.doesNotMatch(schedule, /\bfetch\s*\(/);
  assert.doesNotMatch(bookings, /const API_BASE/);
  assert.doesNotMatch(schedule, /const API_BASE/);
  assert.match(app, /\.\/master\/pages\/MasterBookingsPage/);
  assert.ok(!fs.existsSync(new URL("../master/MasterBookingsPage.jsx", import.meta.url)));
});

test("create booking retains original master path, payload, timezone", () => {
  assert.match(bookings, /masterCabinetLegacyJson/);
  assert.match(internal, /export async function masterCabinetLegacyJson/);
  for (const literal of [
    '"/masters/" + encodeURIComponent(masterSlug) + "/bookings"',
    'method: "POST"', "client_name: client", "phone: phone",
    "start_at: start", "service_id: Number(serviceId)",
    'date + "T" + time + ":00+06:00"',
  ]) assert.ok(bookings.includes(literal), "Missing legacy "+literal);
});

test("lifecycle delegates to existing publicApi with unchanged action mapping", () => {
  assert.match(schedule, /await postSalonBookingLifecycle\(actionSalonSlug,booking\.id,lifecycleAction\)/);
  for (const action of ['"confirm"','"complete"','"cancel"']) {
    assert.ok(schedule.includes(action), "Missing lifecycle "+action);
  }
  assert.match(publicApi, /export async function postSalonBookingLifecycle/);
});

test("public lifecycle URL/method/JSON payload preserved offline", async () => {
  const start=publicApi.indexOf("export async function postSalonBookingLifecycle(");
  const end=publicApi.indexOf("\nexport async function getSalon(",start);
  assert.ok(start>=0 && end>start);
  const impl=publicApi.slice(start,end)
    .replace(/^export\s+/,"")
    .replace("import.meta.env.VITE_API_BASE","viteBase");
  const calls=[];
  const fetchMock=async (url,opts)=>{calls.push({url,opts});return {ok:true,status:200};};
  const fn=new Function("fetch","window","API","viteBase","getAuthAccessToken",
    impl+"\nreturn postSalonBookingLifecycle;")(
      fetchMock,{API_BASE:"https://example.test"},"https://fallback.test","",
      ()=>"offline-owner-session");
  const result=await fn("salon",49,"complete");
  assert.equal(result.status,200);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,
    "https://example.test/public/salons/salon/bookings/49/lifecycle");
  assert.equal(calls[0].opts.method,"POST");
  assert.equal(calls[0].opts.headers["Content-Type"],"application/json");
  assert.equal(calls[0].opts.headers.Authorization,"Bearer offline-owner-session");
  assert.equal(calls[0].opts.body,JSON.stringify({action:"complete"}));
});
