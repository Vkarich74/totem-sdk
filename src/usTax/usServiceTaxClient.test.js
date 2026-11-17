// TOTEM US / TAX-06 pure client contract tests. No real requests/keys.
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseUsServiceTaxPercent,formatUsServiceTaxPercent,
  readUsServiceTax,saveUsServiceTax,
} from "./usServiceTaxClient.js";

const TOKEN="synthetic-salon-session-token-not-live";
const OWNER={ownerType:"salon",ownerSlug:"us-salon",token:TOKEN};
const result=(rate_bps=0,revision=0,configured=false)=>({
  ok:true,market_code:"US",currency_code:"USD",
  payment_purpose:"beauty_service",owner_type:"salon",owner_slug:"us-salon",
  rate_bps,revision,configured,tax_percent:(rate_bps/100).toFixed(2),
});
const mock=(payload,status=200)=>async()=>({
  ok:status>=200&&status<300,status,
  json:async()=>payload,
});

test("TAX-06 parses exact 0 to 100% without float rounding",()=>{
  const good=new Map([
    ["0",0],["0.00",0],["0,01",1],["0.05",5],["7.25",725],
    ["7,5",750],["99.99",9999],["100",10000],["100.00",10000],
  ]);
  for(const [input,bps] of good){
    assert.equal(parseUsServiceTaxPercent(input),bps,input);
    assert.equal(parseUsServiceTaxPercent(formatUsServiceTaxPercent(bps)),bps);
  }
  for(const invalid of ["","-1","100.01","101","99.999","1e2","abc",
      "  ","01.20","1,2,3","0.001","5%","1.234","Infinity"]){
    assert.equal(parseUsServiceTaxPercent(invalid),null,invalid);
  }
});

test("TAX-06 GET default zero only after authenticated verified US response",async()=>{
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    calls.push({url,opts});
    return mock(result())();
  };
  const answer=await readUsServiceTax({...OWNER,fetchImpl});
  assert.equal(answer.rate_bps,0);
  assert.equal(answer.configured,false);
  assert.equal(answer.revision,0);
  assert.equal(answer.payment_purpose,"beauty_service");
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,"https://api.totemv.com/internal/us-service-tax/salon/us-salon");
  assert.equal(calls[0].opts.method,"GET");
  assert.equal(calls[0].opts.cache,"no-store");
  assert.equal(calls[0].opts.credentials,"omit");
  assert.equal(calls[0].opts.headers.Authorization,`Bearer ${TOKEN}`);
});

test("TAX-06 PUT 7.25% uses basis-point integer and optimistic revision",async()=>{
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    calls.push(opts);
    return mock(result(725,1,true))();
  };
  const saved=await saveUsServiceTax({...OWNER,fetchImpl,
    rateBps:725,expectedRevision:0,
  });
  assert.equal(saved.rate_bps,725);
  assert.equal(saved.revision,1);
  assert.equal(saved.configured,true);
  assert.equal(calls[0].method,"PUT");
  assert.deepEqual(JSON.parse(calls[0].body),{
    rate_bps:725,expected_revision:0,
  });
  assert.equal(calls[0].headers["Content-Type"],"application/json");
  assert.equal(calls[0].cache,"no-store");
});

test("TAX-06 stale revision 409 surfaces conflict without client overwrite",async()=>{
  await assert.rejects(
    saveUsServiceTax({...OWNER,rateBps:725,expectedRevision:1,
      fetchImpl:mock({ok:false,error:"US_TAX_SETTING_REVISION_CONFLICT"},409)}),
    e=>e?.code==="US_TAX_SETTING_REVISION_CONFLICT"&&e?.status===409
  );
});

test("TAX-06 rejects non-US, wrong owner, corrupted rate or missing schema",async()=>{
  for(const payload of [
    {...result(),market_code:"KG"},
    {...result(),currency_code:"KGS"},
    {...result(),payment_purpose:"subscription"},
    {...result(),owner_slug:"another-salon"},
    {...result(),owner_type:"master"},
    {...result(),rate_bps:10001,tax_percent:"100.01"},
    {...result(),tax_percent:"0.01"},
    {...result(),configured:true},
    {...result(),rate_bps:725,tax_percent:"7.25",configured:false},
    {...result(725,1,true),revision:0},
  ]){
    await assert.rejects(readUsServiceTax({...OWNER,
      fetchImpl:mock(payload)}),/US_TAX_API_/);
  }
  await assert.rejects(readUsServiceTax({...OWNER,
    fetchImpl:mock({ok:false},503)}),/US_TAX_API_UNAVAILABLE/);
});

test("TAX-06 never sends tax setting for other market/payment or untrusted input",async()=>{
  let invoked=false;
  const fetchImpl=async()=>{invoked=true;throw Error("SHOULD_NOT_FETCH");};
  for(const opts of [
    {...OWNER,ownerType:"subscription"},
    {...OWNER,ownerSlug:"../../other"},
    {...OWNER,token:""},
    {...OWNER,rateBps:-1,expectedRevision:0},
    {...OWNER,rateBps:10001,expectedRevision:0},
    {...OWNER,rateBps:7.25,expectedRevision:0},
    {...OWNER,rateBps:"725",expectedRevision:0},
  ]){
    await assert.rejects(
      ("rateBps" in opts ?
        saveUsServiceTax({...opts,fetchImpl}) :
        readUsServiceTax({...opts,fetchImpl})),
      /US_TAX_/
    );
  }
  assert.equal(invoked,false);
});

test("TAX-06 master is independent of salon in URL and contract",async()=>{
  const data={...result(250,1,true),
    owner_type:"master",owner_slug:"us-master",tax_percent:"2.50",
  };
  let url="";
  const x=await readUsServiceTax({
    ownerType:"master",ownerSlug:"us-master",token:TOKEN,
    fetchImpl:async(location)=>{
      url=location;
      return mock(data)();
    },
  });
  assert.equal(x.rate_bps,250);
  assert.match(url,/\/internal\/us-service-tax\/master\/us-master$/);
});
