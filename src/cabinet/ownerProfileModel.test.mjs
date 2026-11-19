import test from "node:test";
import assert from "node:assert/strict";
import {
  PROFILE_FIELDS, assertOwnerProfileTarget,
  validateOwnerProfileReply, profilePayload,
  ownerProfileChanged, verifyOwnerProfileSave,
} from "./ownerProfileModel.js";

const revision = "a".repeat(64);
const nextRevision = "b".repeat(64);
function salon(overrides = {}) {
  return {
    ok:true, owner_type:"salon", owner_slug:"existing-salon",
    profile:{
      name:"Existing salon",description:"",city:"Бишкек",
      phone:"+996555123456",logo_url:"",
      email:"owner@existing.example"
    },
    revision,editable_fields:PROFILE_FIELDS.salon,
    unsupported_fields:["email","whatsapp","slot","minBefore","advance"],
    can_write:true,saved:false,...overrides,
  };
}
function master(overrides={}) {
  return {
    ok:true,owner_type:"master",owner_slug:"existing-master",
    profile:{name:"Нуриза",email:"master@existing.example"},
    revision,editable_fields:PROFILE_FIELDS.master,
    unsupported_fields:["email","bio","phone"],
    can_write:true,saved:false,...overrides,
  };
}

test("exact existing owner slug/role required",()=>{
  assert.deepEqual(assertOwnerProfileTarget("salon","existing-salon"),{
    ownerType:"salon",ownerSlug:"existing-salon",
  });
  for(const args of [
    ["admin","existing-salon"],["salon","/../owner"],
    ["master",""],["client","existing-master"],
  ])assert.throws(()=>assertOwnerProfileTarget(...args),/PROFILE_TARGET_INVALID/);
});

test("server GET contract checked before any input may be editable",()=>{
  const data=validateOwnerProfileReply(salon(),"salon","existing-salon");
  assert.equal(data.profile.name,"Existing salon");
  assert.equal(data.profile.email,"owner@existing.example");
  assert.equal(data.can_write,true);
  for(const invalid of [
    {owner_slug:"foreign"}, {owner_type:"master"}, {revision:"1"},
    {editable_fields:["name","photo"]}, {can_write:"true"}, {saved:0},
    {profile:{...salon().profile,is_admin:true}},
    {profile:{name:"Existing salon"}},
  ])assert.throws(
    ()=>validateOwnerProfileReply(salon(invalid),"salon","existing-salon"),
    /PROFILE_READBACK_CONTRACT_MISMATCH/,
  );
});

test("PATCH body excludes authentication, unsupported fields and metadata",()=>{
  const row=salon();
  const values={
    name:"  New salon name ",description:"Актуальное описание",
    city:"Ош",phone:"+996555123456",logo_url:"",
    email:"hijacked@example.com", role:"admin",
  };
  const payload=profilePayload(row,values);
  assert.deepEqual(Object.keys(payload.profile),PROFILE_FIELDS.salon);
  assert.equal(payload.profile.name,"New salon name");
  assert.equal(payload.profile.email,undefined);
  assert.equal(payload.profile.role,undefined);
  assert.equal(payload.revision,revision);
  assert.equal(ownerProfileChanged(row,values),true);
  assert.equal(ownerProfileChanged(row,row.profile),false);
});

test("master only permits name; bio/avatar/email/phone cannot be silently saved",()=>{
  const row=master();
  const body=profilePayload(row,{
    name:"Алина",bio:"Not stored",photo:"https://example.invalid/image.jpg",
    phone:"+1",email:"no@example.com"
  });
  assert.deepEqual(body.profile,{name:"Алина"});
  assert.equal(ownerProfileChanged(row,{name:"Нуриза"}),false);
  assert.equal(ownerProfileChanged(row,{name:"Алина"}),true);
  assert.throws(()=>profilePayload(row,{name:" "}),/PROFILE_NAME_INVALID/);
});

test("real persistence needs PATCH + second GET to match precisely",()=>{
  const before=salon();
  const changed={...salon(),profile:{...salon().profile,name:"New name"},
    revision:nextRevision,saved:true};
  const reread={...changed,saved:false};
  assert.equal(
    verifyOwnerProfileSave(before,changed,reread).revision,
    nextRevision
  );
  for(const mismatch of [
    {...reread,revision},
    {...reread,profile:{...reread.profile,name:"Other name"}},
    {...reread,profile:{...reread.profile,email:"other@existing.example"}},
    {...reread,saved:true},
  ])assert.throws(
    ()=>verifyOwnerProfileSave(before,changed,mismatch),
    /PROFILE_PERSISTENCE_VERIFICATION_FAILED/,
  );
  assert.throws(
    ()=>verifyOwnerProfileSave(before,{...changed,saved:false},reread),
    /PROFILE_PERSISTENCE_VERIFICATION_FAILED/
  );
});

test("No test salons, remote API, DB or filesystem required",()=>{
  assert.equal(typeof globalThis.window,"undefined");
  assert.equal(typeof globalThis.fetch,"function");
  assert.equal(PROFILE_FIELDS.master.length,1);
});
