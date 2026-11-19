// Offline master adapter regression: no network, users, salons or bookings.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const source = fs.readFileSync(new URL("./master.js", import.meta.url), "utf8");
const canonical = fs.readFileSync(new URL("./internal.js", import.meta.url), "utf8");
const apiExports = [
  "getMasterMetrics", "getMasterNotifications", "markMasterNotificationRead",
  "getMasterBookings", "getMasterClients", "getMasterServices",
  "createMasterService", "updateMasterService", "deleteMasterService",
];

function mount(handler) {
  const importLine = 'import { masterCabinetLegacyJson } from "./internal.js";';
  assert.equal(source.split(importLine).length, 2, "Facade imports only canonical SDK transport once");
  const moduleBody = source.replace(importLine, "")
    .replace(/^export\s+/gm, "");
  const ctor = new Function("masterCabinetLegacyJson",
    moduleBody + "\nreturn {" + apiExports.join(",") + "};");
  return ctor(handler);
}

function mockReturn(reply) {
  const calls = [];
  const api = mount(async (path, options = {}) => {
    calls.push({ path, options });
    return reply;
  });
  return { api, calls };
}

test("transport consolidation: no alternate endpoint base, raw fetch or token parser", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https?:\/\/api\.totemv\.com/);
  assert.doesNotMatch(source, /\bgetAuthAccessToken\b/);
  assert.match(canonical, /export async function masterCabinetLegacyJson\(/);
  assert.match(canonical, /const response = await safeInternalRequest\(path,/);
  assert.match(canonical, /path\.startsWith\("\/masters\/"\)/);
  assert.match(canonical, /function buildAuthHeaders\(/);
  assert.match(canonical, /const token = getAuthAccessToken\(\)/);
  assert.equal((source.match(/export async function /g) || []).length, 9);
});

test("metrics preserve raw j.metrics object", async () => {
  const { api, calls } = mockReturn({ ok:true, metrics:{ total:42 } });
  assert.deepEqual(await api.getMasterMetrics("m-1"), { total:42 });
  assert.deepEqual(calls, [{path:"/masters/m-1/metrics",options:{}}]);
});

test("notifications preserve limit query and raw response", async () => {
  const data = {ok:true, notifications:[{uid:"n"}]};
  const { api, calls } = mockReturn(data);
  assert.equal(await api.getMasterNotifications("a b",{limit:20}),data);
  assert.deepEqual(calls,[{path:"/masters/a%20b/notifications?limit=20",options:{}}]);
});

test("notification mark read keeps URL, method, explicit empty JSON body", async () => {
  const data={ok:true};
  const { api,calls }=mockReturn(data);
  assert.equal(await api.markMasterNotificationRead("m-1","id/2"),data);
  assert.deepEqual(calls,[{
    path:"/masters/m-1/notifications/id%2F2/read",
    options:{method:"POST",body:{}},
  }]);
});

test("bookings preserve original array facade", async () => {
  const {api,calls}=mockReturn({ok:true,bookings:[{id:7}]});
  assert.deepEqual(await api.getMasterBookings("m"),[{id:7}]);
  assert.deepEqual(calls,[{path:"/masters/m/bookings",options:{}}]);
});

test("clients preserve original array facade", async () => {
  const {api,calls}=mockReturn({ok:true,clients:[{id:9}]});
  assert.deepEqual(await api.getMasterClients("m"),[{id:9}]);
  assert.deepEqual(calls,[{path:"/masters/m/clients",options:{}}]);
});

test("services preserve raw backend response and GET path", async () => {
  const payload={ok:true,services:[{id:2}], market:"KG"};
  const {api,calls}=mockReturn(payload);
  assert.equal(await api.getMasterServices("m"),payload);
  assert.deepEqual(calls,[{path:"/masters/m/services",options:{}}]);
});

test("service create PATCH DELETE use existing backend URL, method and body", async () => {
  const {api,calls}=mockReturn({ok:true});
  await api.createMasterService("m",{name:"Salon"});
  await api.updateMasterService("m",34,{duration_min:40});
  await api.deleteMasterService("m",34);
  assert.deepEqual(calls,[
    {path:"/masters/m/services",options:{method:"POST",body:{name:"Salon"}}},
    {path:"/masters/m/services/34",options:{method:"PATCH",body:{duration_min:40}}},
    {path:"/masters/m/services/34",options:{method:"DELETE"}},
  ]);
});

test("canonical transport errors propagate to existing facade callers", async () => {
  const api = mount(async () => { throw new Error("HTTP_403_DENIED"); });
  await assert.rejects(api.getMasterServices("m"),/HTTP_403_DENIED/);
  await assert.rejects(api.createMasterService("m",{}),/HTTP_403_DENIED/);
  await assert.rejects(api.getMasterNotifications("m"),/HTTP_403_DENIED/);
});
