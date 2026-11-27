// All role/permission data is supplied by the existing Core session and
// exact owner profile; never infer commercial rights from a JWT or route.
const slugPattern=/^[a-z0-9][a-z0-9-]{2,79}$/;
const positive=x=>Number.isSafeInteger(Number(x))&&Number(x)>0;
export function isSharedMasterSession(s,slug){
  return s?.ok===true&&s.authenticated===true&&s.role==="master"&&
    s.auth?.source==="session"&&s.auth?.role==="master"&&
    s.auth.us_role_context==="own_salon_master_v1"&&
    positive(s.auth.user_id)&&typeof s.auth.session_id==="string"&&Boolean(s.auth.session_id)&&
    positive(s.auth.master_request_id)&&slugPattern.test(String(slug||""))&&s.auth.master_slug===slug&&
    s.identity?.salons?.length===0&&Array.isArray(s.identity?.masters)&&s.identity.masters.length===1&&positive(s.identity.masters[0]);
}
// A partial server response must not downgrade a limited US role to an
// ordinary master cabinet. These markers are server identity evidence only.
export function hasSharedMasterContextEvidence(s){
  return s?.auth?.us_role_context!=null||s?.auth?.master_request_id!=null||
    (Array.isArray(s?.identity?.ownership)&&s.identity.ownership.some(
      item=>item?.relation==="verified_own_salon_role_context"));
}
export function readMasterCabinetAccess(s,slug){
  const authenticated=Boolean(s?.ok&&s?.authenticated);
  const role=String(s?.role||s?.identity?.role||s?.auth?.role||"");
  const masterSlug=String(s?.identity?.master_slug||s?.auth?.master_slug||"");
  const limited=hasSharedMasterContextEvidence(s);
  const allowed=authenticated&&role==="master"&&
    (limited?isSharedMasterSession(s,slug):(!masterSlug||masterSlug===String(slug||"")));
  return {allowed,limited};
}
export function normalizeSharedRoleOptions(rows,salonSlug){
  if(!slugPattern.test(String(salonSlug||""))||!Array.isArray(rows)||rows.length!==1)return [];
  const r=rows[0];
  if(r?.role!=="master"||r.salon_slug!==salonSlug||!positive(r.master_request_id)||
     !slugPattern.test(String(r.master_slug||"")))return [];
  return [{role:"master",master_request_id:Number(r.master_request_id),master_slug:r.master_slug,salon_slug:salonSlug}];
}
export function validateRoleSwitchSession(before,after,role,slug){
  if(before?.ok!==true||before.authenticated!==true||after?.ok!==true||after.authenticated!==true||
     after.role!==role||after.auth?.role!==role||after.auth?.source!=="session"||
     String(before.auth?.user_id)!==String(after.auth.user_id)||
     !before.auth?.session_id||before.auth.session_id!==after.auth.session_id)return false;
  if(role==="master")return before.role==="salon_admin"&&isSharedMasterSession(after,slug);
  return role==="salon_admin"&&before.auth.us_role_context==="own_salon_master_v1"&&
    !hasSharedMasterContextEvidence(after)&&Array.isArray(after.identity?.salons)&&after.identity.salons.length===1&&positive(after.identity.salons[0]);
}
export function readSharedCapabilities(root,session,slug,now=Date.now()){
  if(!isSharedMasterSession(session,slug)||root?.ok!==true||root.master?.slug!==slug||
     Number(root.master?.id)!==Number(session.identity.masters[0])||
     Number(root.master?.user_id)!==Number(session.auth.user_id)||
     !slugPattern.test(String(root.master?.salon_slug||""))||
     !positive(root.master?.salon_id))return null;
  const b=root.billing_access,c=b?.shared_operations;
  if(!b||b.role_context_limited!==true||b.shared_salon_subscription!==true||
     b.can_write!==false||b.can_withdraw!==false||b.subscription_status!=="active"||
     Number(b.salon_owner_id)!==Number(root.master.salon_id)||!Number.isFinite(Date.parse(b.paid_until))||
     Date.parse(b.paid_until)<=now||!c||c.finance!==false)return null;
  return {salonSlug:root.master.salon_slug,masterId:Number(root.master.id),
    profile:c.profile===true&&root.profile_can_write===true,
    services:c.services===true,price:c.services===true&&c.price===true,
    hours:c.hours===true,booking:c.booking===true&&c.services===true&&c.price===true&&c.hours===true,finance:false};
}
export function normalizeSharedServices(rows,caps){
  if(!caps||!Array.isArray(rows))return [];
  return rows.filter(s=>s?.active===true&&s.market_code==="US"&&s.currency_code==="USD"&&
    s.salon_slug===caps.salonSlug&&Number(s.master_id)===caps.masterId&&positive(s.id));
}

// The installed server publishes a versioned, authoritative release gate.
export function readSharedRoleAvailability(payload,salonSlug){
 const unavailable={release:"UNAVAILABLE",options:[]};
 if(payload?.ok!==true||payload.contract!=="own_salon_master_v1")return unavailable;
 if(payload.release==="HOLD"&&payload.switch_allowed===false&&Array.isArray(payload.options)&&payload.options.length===0)
   return {release:"HOLD",options:[]};
 if(payload.release!=="READY"||payload.switch_allowed!==true)return unavailable;
 const options=normalizeSharedRoleOptions(payload.options,salonSlug);
 return options.length===1?{release:"READY",options}:unavailable;
}
