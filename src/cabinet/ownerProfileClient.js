// Existing canonical owner-profile transport; the returned owner, not the
// requested URL, is the authority for identity and persistence readback.
import {
  getSalon, getMaster, patchSalonProfile, patchMasterProfile, getAuthRevision,
} from "../api/internal.js";
import {
  PROFILE_FIELDS, assertOwnerProfileTarget, validateOwnerProfileReply,
  profilePayload, verifyOwnerProfileSave,
} from "./ownerProfileModel.js";

function mismatch(){
  return new Error("PROFILE_READBACK_CONTRACT_MISMATCH");
}
function ownerId(value){
  const id=String(value ?? "");
  if(!/^[1-9][0-9]*$/.test(id))throw mismatch();
  return id;
}
function requireRevision(revision){
  if(getAuthRevision()!==revision)throw new Error("AUTH_CONTEXT_CHANGED");
}
function verifiedContract(raw, ownerType, ownerSlug, revision, saved) {
  requireRevision(revision);
  const detail=raw?.detail?.json||raw?.detail||{};
  if(!raw?.ok){
    const error=new Error(String(detail?.error||raw?.error||"PROFILE_REQUEST_FAILED"));
    error.status=Number(raw?.detail?.status||0);
    throw error;
  }
  if(!raw.profile||!raw.profile_revision)
    throw new Error("PROFILE_CANONICAL_ENDPOINT_UNAVAILABLE");
  const owner=raw[ownerType];
  if(!owner||typeof owner!=="object"||Array.isArray(owner)||
      owner.slug!==ownerSlug||raw.profile_saved!==saved||
      PROFILE_FIELDS[ownerType].some(key=>
        !Object.hasOwn(owner,key)||String(owner[key]??"")!==raw.profile[key]))
    throw mismatch();
  const id=ownerId(owner.id);
  return {
    ...validateOwnerProfileReply({
      ok:true,owner_type:ownerType,owner_slug:owner.slug,
      profile:raw.profile,revision:raw.profile_revision,
      editable_fields:raw.profile_editable_fields,
      unsupported_fields:raw.profile_unsupported_fields,
      can_write:raw.profile_can_write,saved:raw.profile_saved,
    },ownerType,ownerSlug),
    owner_id:id,auth_revision:revision,
  };
}

export async function getOwnerCabinetProfile(ownerType, ownerSlug, {signal} = {}) {
  assertOwnerProfileTarget(ownerType,ownerSlug);
  const revision=getAuthRevision();
  const response=ownerType==="salon"
    ? await getSalon(ownerSlug,{signal})
    : await getMaster(ownerSlug,{signal});
  return verifiedContract(response,ownerType,ownerSlug,revision,false);
}

export async function saveOwnerCabinetProfile(record, values, {signal} = {}) {
  const {ownerType,ownerSlug}=assertOwnerProfileTarget(record.owner_type,record.owner_slug);
  requireRevision(record.auth_revision);
  const id=ownerId(record.owner_id);
  if(record.can_write!==true||record.saved!==false)
    throw new Error("PROFILE_BILLING_BLOCKED");
  const payload=profilePayload(record,values);
  const result=ownerType==="salon"
    ? await patchSalonProfile(ownerSlug,payload,{signal})
    : await patchMasterProfile(ownerSlug,payload,{signal});
  const patched=verifiedContract(result,ownerType,ownerSlug,record.auth_revision,true);
  if(patched.owner_id!==id||patched.can_write!==true||
      patched.profile.email!==record.profile.email)throw mismatch();
  // Backend canonicalizes salon phone by the tenant market. Do not invent
  // another phone validator. Empty/unchanged phone must remain exact; a
  // changed nonempty phone must be returned nonempty by the canonical server.
  for(const key of PROFILE_FIELDS[ownerType]){
    const value=payload.profile[key];
    if(key==="phone"&&value&&value!==record.profile.phone){
      if(!patched.profile.phone)throw mismatch();
      continue;
    }
    const expected=key==="logo_url"&&value?new URL(value).toString():value;
    if(patched.profile[key]!==expected)throw mismatch();
  }
  return patched;
}

export function verifyOwnerCabinetProfileSave(before,patched,fresh){
  requireRevision(before.auth_revision);
  const id=ownerId(before.owner_id);
  if(patched.owner_id!==id||fresh.owner_id!==id||
      patched.auth_revision!==before.auth_revision||
      fresh.auth_revision!==before.auth_revision)throw mismatch();
  return verifyOwnerProfileSave(before,patched,fresh);
}
