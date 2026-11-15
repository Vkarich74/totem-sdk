// US06 STAGING ROUTES: standalone Node unit contract, no network.
import assert from "node:assert/strict";
import {
  checkStagingOrigin, createStagingRouteSafety, checkForForbiddenStageHost,
} from "./stagingRouteSafety.js";
const ok={VITE_STAGE_STRICT:"1",
  VITE_API_BASE:"http://127.0.0.1:54321",
  VITE_STAGE_APP_ORIGIN:"http://127.0.0.1:5173",
  VITE_STAGE_PUBLIC_ORIGIN:"http://127.0.0.1:5173"};
let checks=0;
function test(label,fn){fn();checks++;console.log("US06_STAGE_ROUTES_UNIT_PASS",label)}
test("production_build_unmodified",()=>{
  assert.equal(createStagingRouteSafety({mode:"production",env:{}}),null);
});
test("staging_requires_explicit_mode_switch",()=>{
  assert.throws(()=>createStagingRouteSafety({
    mode:"staging",env:{...ok,VITE_STAGE_STRICT:"0"},
  }),/STAGING_EXPLICIT_VITE_STAGE_STRICT_REQUIRED/);
});
test("staging_requires_api_origin",()=>{
  assert.throws(()=>createStagingRouteSafety({
    mode:"staging",env:{...ok,VITE_API_BASE:""},
  }),/STAGING_API_URL_REQUIRED/);
});
test("staging_rejects_production_api",()=>{
  assert.throws(()=>createStagingRouteSafety({
    mode:"staging",env:{...ok,VITE_API_BASE:"https://api.totemv.com"},
  }),/STAGING_API_ORIGIN_REJECTED/);
});
test("staging_rejects_production_app_and_public",()=>{
  assert.throws(()=>createStagingRouteSafety({
    mode:"staging",env:{...ok,VITE_STAGE_APP_ORIGIN:"https://app.totemv.com"},
  }),/STAGING_APP_ORIGIN_REJECTED/);
  assert.throws(()=>createStagingRouteSafety({
    mode:"staging",env:{...ok,VITE_STAGE_PUBLIC_ORIGIN:"https://www.totemv.com"},
  }),/STAGING_PUBLIC_ORIGIN_REJECTED/);
});
test("staging_rejects_external_insecure_http",()=>{
  assert.throws(()=>checkStagingOrigin("http://staging.totemv.example.invalid","API"),
    /STAGING_API_ORIGIN_REJECTED/);
});
test("staging_rejects_credentials_paths_and_credentials_in_url",()=>{
  for(const bad of [
    "https://user:pass@stage.example.invalid",
    "https://stage.example.invalid/api",
    "https://stage.example.invalid/?token=secret",
  ]) assert.throws(()=>checkStagingOrigin(bad,"API"),/STAGING_API_ORIGIN_REJECTED/);
});
test("staging_rejects_independent_public_api_override",()=>{
  assert.throws(()=>createStagingRouteSafety({
    mode:"staging",env:{...ok,VITE_PUBLIC_API_BASE:"https://api.totemv.com/public"},
  }),/STAGING_PUBLIC_API_MUST_MATCH_CONFIGURED_API/);
});
test("staging_refuses_external_override",()=>{
  assert.throws(()=>createStagingRouteSafety({
    mode:"staging",env:{...ok,VITE_STAGE_ENABLE_PRODUCTION:"1"},
  }),/STAGING_UNSAFE_EXTERNAL_OVERRIDE_REJECTED/);
});
test("stage_plugin_rewrites_all_product_api_and_navigation_routes",()=>{
  const plugin=createStagingRouteSafety({mode:"staging",env:ok});
  const src=[
    'fetch("https://api.totemv.com/internal/admin/auth/session")',
    'const api = "https://api.totemv.com/public"',
    'const app = "https://app.totemv.com/#/auth/login"',
    'const site = "https://www.totemv.com/salon/example"',
    'const root = "https://totemv.com/salon"',
  ].join(";\n");
  const transformed=plugin.transform(src,"C:/work/totem-sdk/src/App.jsx");
  assert.ok(transformed?.code);
  checkForForbiddenStageHost(transformed.code);
  assert.ok(transformed.code.includes("http://127.0.0.1:54321/internal"));
  assert.ok(transformed.code.includes("http://127.0.0.1:5173/#/auth"));
  assert.ok(transformed.code.includes("http://127.0.0.1:5173/salon"));
});
test("stage_html_csp_connects_only_to_staging_api",()=>{
  const plugin=createStagingRouteSafety({mode:"staging",env:ok});
  const out=plugin.transformIndexHtml.handler(
    '<html><head><meta content="https://app.totemv.com/#/mobile"></head></html>');
  assert.ok(out.html.includes("http://127.0.0.1:5173/#/mobile"));
  assert.equal(out.tags.length,1);
  assert.equal(out.tags[0].attrs["http-equiv"],"Content-Security-Policy");
  assert.ok(out.tags[0].attrs.content.includes(
    "connect-src 'self' http://127.0.0.1:54321"));
  assert.ok(!out.tags[0].attrs.content.includes("api.totemv.com"));
});
test("generated_bundle_with_production_host_fails_closed",()=>{
  const plugin=createStagingRouteSafety({mode:"staging",env:ok});
  plugin.transform('const t="https://api.totemv.com"',
   "C:/work/totem-sdk/src/App.jsx");
  assert.throws(()=>plugin.generateBundle.call({emitFile(){}},{},{
    "assets/index.js":{type:"chunk",code:'fetch("https://api.totemv.com/public")'},
  }),/STAGING_PRODUCTION_HOST_IN_OUTPUT/);
});
test("generated_bundle_without_host_passes",()=>{
  const plugin=createStagingRouteSafety({mode:"staging",env:ok});
  const sample=plugin.transform('const t="https://api.totemv.com"',
    "C:/work/totem-sdk/src/App.jsx").code;
  plugin.generateBundle.call({emitFile(){}},{},
    {"assets/index.js":{type:"chunk",code:sample}});
});
test("unknown_production_domain_cannot_bypass_stage_check",()=>{
  for(const host of ["api.totemv.com","app.totemv.com","www.totemv.com",
                     "totem-platform.odoo.com","honey.totemv.com"]){
    assert.throws(()=>checkForForbiddenStageHost("https://"+host+"/ping"),
      /STAGING_PRODUCTION_HOST_IN_OUTPUT/);
  }
});
console.log("US06_STAGE_ROUTES_ALL_UNIT_PASS",JSON.stringify({
  checks,network_requests:0,production_writes:0,deployments:0,
}));
