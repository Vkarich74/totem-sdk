// Thin SDK adapter over the existing src/api/internal.js transport.
// No separate base URL, token parser or network layer.
import {
  getSalon, getMaster, patchSalonProfile, patchMasterProfile,
} from "../api/internal.js";
import {
  assertOwnerProfileTarget, validateOwnerProfileReply, profilePayload,
} from "./ownerProfileModel.js";

function verifiedContract(raw, ownerType, ownerSlug) {
  const detail = raw?.detail?.json || raw?.detail || {};
  if (!raw?.ok) {
    const error = new Error(String(detail?.error || raw?.error || "PROFILE_REQUEST_FAILED"));
    error.status = Number(raw?.detail?.status || 0);
    throw error;
  }
  if (!raw.profile || !raw.profile_revision) {
    throw new Error("PROFILE_CANONICAL_ENDPOINT_UNAVAILABLE");
  }
  return validateOwnerProfileReply({
    ok:true,
    owner_type:ownerType,
    owner_slug:ownerSlug,
    profile:raw.profile,
    revision:raw.profile_revision,
    editable_fields:raw.profile_editable_fields,
    unsupported_fields:raw.profile_unsupported_fields,
    can_write:raw.profile_can_write,
    saved:raw.profile_saved === true,
  },ownerType,ownerSlug);
}

export async function getOwnerCabinetProfile(ownerType, ownerSlug, {signal} = {}) {
  assertOwnerProfileTarget(ownerType,ownerSlug);
  const response = ownerType === "salon"
    ? await getSalon(ownerSlug,{signal})
    : await getMaster(ownerSlug,{signal});
  return verifiedContract(response,ownerType,ownerSlug);
}

export async function saveOwnerCabinetProfile(record, values, {signal} = {}) {
  const {ownerType,ownerSlug} =
    assertOwnerProfileTarget(record.owner_type,record.owner_slug);
  const payload = profilePayload(record,values);
  const result = ownerType === "salon"
    ? await patchSalonProfile(ownerSlug,payload,{signal})
    : await patchMasterProfile(ownerSlug,payload,{signal});
  return verifiedContract(result,ownerType,ownerSlug);
}
