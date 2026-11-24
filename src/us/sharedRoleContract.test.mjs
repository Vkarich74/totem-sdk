import test from "node:test";
import assert from "node:assert/strict";
import {isSharedMasterSession,normalizeSharedRoleOptions,validateRoleSwitchSession,readSharedCapabilities,normalizeSharedServices} from "./sharedRoleContract.js";
const salon={ok:true,authenticated:true,role:"salon_admin",auth:{role:"salon_admin",source:"session",user_id:100,session_id:"same-session"},identity:{salons:[32],masters:[]}};
const master={ok:true,authenticated:true,role:"master",auth:{role:"master",source:"session",user_id:100,session_id:"same-session",us_role_context:"own_salon_master_v1",master_request_id:2,master_slug:"fixture-master"},identity:{salons:[],masters:[46]}};
const root={ok:true,master:{id:46,user_id:100,slug:"fixture-master",salon_id:32,salon_slug:"fixture-salon"},profile_can_write:true,billing_access:{role_context_limited:true,shared_salon_subscription:true,can_write:false,can_withdraw:false,subscription_status:"active",salon_owner_id:32,paid_until:"2099-01-01T00:00:00Z",shared_operations:{profile:true,services:true,price:true,hours:true,booking:true,finance:false}}};
test("only one exact source-owned role option",()=>{
 const row={role:"master",master_request_id:2,master_slug:"fixture-master",salon_slug:"fixture-salon"};
 assert.deepEqual(normalizeSharedRoleOptions([row],"fixture-salon"),[row]);
 assert.deepEqual(normalizeSharedRoleOptions([row],"other-salon"),[]);
 assert.deepEqual(normalizeSharedRoleOptions([row,row],"fixture-salon"),[]);
});
test("switch response must preserve live principal and session",()=>{
 assert.equal(validateRoleSwitchSession(salon,master,"master","fixture-master"),true);
 assert.equal(validateRoleSwitchSession(master,salon,"salon_admin"),true);
 assert.equal(validateRoleSwitchSession(salon,{...master,auth:{...master.auth,session_id:"other"}},"master","fixture-master"),false);
 assert.equal(isSharedMasterSession(master,"another-master"),false);
 assert.equal(isSharedMasterSession({...master,identity:{salons:[32],masters:[46]}},"fixture-master"),false);
});
test("only exact server capabilities; absence, revocation, expiry and foreign scope fail closed",()=>{
 const caps=readSharedCapabilities(root,master,"fixture-master");
 assert.deepEqual(caps,{salonSlug:"fixture-salon",masterId:46,profile:true,services:true,price:true,hours:true,booking:true,finance:false});
 for(const patch of [{can_withdraw:true},{can_write:true},{subscription_status:"blocked"},{paid_until:"2000-01-01"},{shared_operations:undefined},{salon_owner_id:99},{shared_operations:{finance:true}}]){
  assert.equal(readSharedCapabilities({...root,billing_access:{...root.billing_access,...patch}},master,"fixture-master"),null);
 }
 const limited=readSharedCapabilities({...root,billing_access:{...root.billing_access,shared_operations:{...root.billing_access.shared_operations,price:false}}},master,"fixture-master");
 assert.equal(limited.booking,false);
 assert.equal(readSharedCapabilities({...root,master:{...root.master,id:99}},master,"fixture-master"),null);
});
test("only exact own active USD services become selectable",()=>{
 const s={id:1,master_id:46,salon_slug:"fixture-salon",active:true,market_code:"US",currency_code:"USD"};
 assert.deepEqual(normalizeSharedServices([s,{...s,id:2,master_id:47},{...s,id:3,salon_slug:"other"},{...s,id:4,currency_code:"KGS"}],readSharedCapabilities(root,master,"fixture-master")),[s]);
});
