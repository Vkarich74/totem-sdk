// US06-STAGE-ROUTES: real Chrome smoke on Vite's compiled STAGING assets.
// Not a business E2E: no API server, no Production requests, no data writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
assert.equal(process.env.TOTEM_STAGE_ROUTE_LOCAL_ONLY,"1");
const sdk=process.cwd();
const dist=process.env.TOTEM_STAGE_ROUTE_DIST;
const output=process.env.TOTEM_STAGE_ROUTE_BROWSER_RESULT;
assert.ok(dist && output);
const html=fs.readFileSync(path.join(dist,"index.html"),"utf8");
assert.match(html,/Content-Security-Policy/);
assert.match(html,/connect-src 'self' http:\/\/127\.0\.0\.1:54321/);
assert.ok(!fs.existsSync(path.join(dist,"assets/index.js")));
assert.ok(!fs.existsSync(path.join(dist,"sw.js")));
let server=null,browser=null;
const origin="http://127.0.0.1:5173";
const routes=[
 "#/mobile",
 "#/admin/login",
 "#/admin/open-owner",
 "#/salon/us06-local-only/settings",
 "#/master/us06-test-master-only/bookings",
 "#/booking?salon=us06-local-only",
 "#/client/123/test",
 "#/salon/us06-local-only",
 "#/master/us06-test-master-only",
];
const evidence={status:"HOLD",stage_origin:origin,staging_api:"http://127.0.0.1:54321",
 route_results:[],external_requests_attempted:[],csp_blocked:[],
 production_api_requests_sent:0,deployments:0};
async function up() {
 for(let i=0;i<48;i++){
  if(server?.exitCode!=null)throw Error("STAGING_PREVIEW_EXITED_EARLY");
  try{
   const r=await fetch(origin,{signal:AbortSignal.timeout(700)});
   if(r.status===200)return;
  }catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error("STAGING_LOCAL_PREVIEW_TIMEOUT");
}
try {
 server=spawn(process.execPath,[
  path.join(sdk,"node_modules/vite/bin/vite.js"),
  "preview","--host","127.0.0.1","--port","5173","--strictPort",
  "--outDir",dist,
 ],{cwd:sdk,env:{...process.env,NODE_ENV:"production"},
    stdio:"ignore",windowsHide:true});
 await up();
 const chromePath=process.env.TOTEM_STAGE_ROUTE_SYSTEM_CHROME;
 assert.ok(chromePath && fs.existsSync(chromePath),
   "STAGING_TEST_KNOWN_LOCAL_CHROME_MISSING");
 browser=await chromium.launch({headless:true,executablePath:chromePath});
 for(const href of routes){
  const context=await browser.newContext({
   viewport:{width:390,height:844},locale:"en-US",serviceWorkers:"block",
  });
  const page=await context.newPage();
  const remote=[];
  await page.route("**/*",async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==="127.0.0.1" &&
      ["5173","54321"].includes(url.port)){
    await route.continue();return;
   }
   remote.push({host:url.hostname,port:url.port,
     path:url.pathname,method:route.request().method()});
   await route.abort();
  });
  await page.addInitScript(()=>{
   window.__STAGE_CSP_BLOCKED__=[];
   document.addEventListener("securitypolicyviolation",event=>{
    window.__STAGE_CSP_BLOCKED__.push({
      blockedURI:event.blockedURI,effectiveDirective:event.effectiveDirective,
    });
   });
  });
  const pageResponse=await page.goto(origin+"/"+href,{
   waitUntil:"domcontentloaded",timeout:13000,
  });
  assert.equal(pageResponse?.status(),200,href);
  await page.waitForTimeout(1150);
  const data=await page.evaluate(()=>({
    root_present:Boolean(document.getElementById("root")),
    root_chars:(document.getElementById("root")?.textContent||"").length,
    bootstrap_api:String(window.API_BASE||""),
    csp:window.__STAGE_CSP_BLOCKED__||[],
  }));
  assert.equal(data.root_present,true,"MISSING_REACT_ROOT "+href);
  if(data.bootstrap_api){
   assert.equal(data.bootstrap_api,"http://127.0.0.1:54321",
     "BOOTSTRAP_API_NOT_STAGING "+href);
  }
  for(const x of remote){
   evidence.external_requests_attempted.push({route:href,...x});
  }
  for(const csp of data.csp){
   evidence.csp_blocked.push({route:href,...csp});
  }
  if(remote.some(x=>/^(?:api|app|www)\.totemv\.com$/i.test(x.host))){
   throw Error("BROWSER_STAGING_ATTEMPTED_PRODUCTION_HOST "+href);
  }
  if(data.csp.some(x=>/^(?:https?:\/\/)?api\.totemv\.com/i.test(x.blockedURI))){
   throw Error("BROWSER_STAGING_HAS_PRODUCTION_API_CSP_BLOCK "+href);
  }
  evidence.route_results.push({
   route:href,http_status:pageResponse.status(),
   root_present:data.root_present,rendered_characters:data.root_chars,
   stage_bootstrap_api:data.bootstrap_api||null,
   external_network_requests:remote.length,
  });
  await context.close();
 }
 evidence.status="PASS_LOCAL_BROWSER";
 console.log("US06_STAGE_ROUTE_BROWSER_SMOKE_PASS",JSON.stringify({
  routes:evidence.route_results.length,external_requests_attempted:
   evidence.external_requests_attempted.length,csp_blocked:evidence.csp_blocked.length,
  production_sent:0,deployments:0,
 }));
}catch(error){
 evidence.status="HOLD";
 evidence.stop_reason=String(error?.stack||error).slice(0,1200);
 console.error("US06_STAGE_ROUTE_BROWSER_SMOKE_HOLD",evidence.stop_reason);
}finally{
 try{await browser?.close()}catch{}
 try{server?.kill()}catch{}
 fs.writeFileSync(output,JSON.stringify(evidence,null,2));
}
if(evidence.status!=="PASS_LOCAL_BROWSER")process.exitCode=2;
