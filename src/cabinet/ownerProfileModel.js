// Cabinet profile transport contract. Never claim to save fields absent
// from verified public.salons / public.masters production schema.
export const PROFILE_FIELDS = Object.freeze({
  salon: Object.freeze(["name", "description", "city", "phone", "logo_url"]),
  master: Object.freeze(["name"]),
});
const REVISION = /^[a-f0-9]{64}$/;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;

export function assertOwnerProfileTarget(ownerType, ownerSlug) {
  if (!PROFILE_FIELDS[ownerType] ||
      typeof ownerSlug !== "string" || !SLUG.test(ownerSlug)) {
    throw new Error("PROFILE_TARGET_INVALID");
  }
  return { ownerType, ownerSlug };
}

export function validateOwnerProfileReply(raw, ownerType, ownerSlug) {
  assertOwnerProfileTarget(ownerType, ownerSlug);
  if (!raw || raw.ok !== true ||
      raw.owner_type !== ownerType || raw.owner_slug !== ownerSlug ||
      !raw.profile || typeof raw.profile !== "object" ||
      Array.isArray(raw.profile) ||
      typeof raw.revision !== "string" || !REVISION.test(raw.revision) ||
      typeof raw.can_write !== "boolean" ||
      typeof raw.saved !== "boolean" ||
      !Array.isArray(raw.editable_fields) ||
      raw.editable_fields.length !== PROFILE_FIELDS[ownerType].length ||
      raw.editable_fields.some((key,index) => key !== PROFILE_FIELDS[ownerType][index])) {
    throw new Error("PROFILE_READBACK_CONTRACT_MISMATCH");
  }
  const keys = [...PROFILE_FIELDS[ownerType], "email"];
  if (Object.keys(raw.profile).length !== keys.length ||
      keys.some(key => typeof raw.profile[key] !== "string") ||
      Object.keys(raw.profile).some(key => !keys.includes(key))) {
    throw new Error("PROFILE_READBACK_CONTRACT_MISMATCH");
  }
  return {
    ...raw,
    profile: Object.fromEntries(keys.map(key => [key, raw.profile[key]])),
  };
}

export function profilePayload(record, values) {
  if (!record || !PROFILE_FIELDS[record.owner_type] ||
      !REVISION.test(record.revision || "")) {
    throw new Error("PROFILE_LOCAL_STATE_INVALID");
  }
  const profile = {};
  for (const key of PROFILE_FIELDS[record.owner_type]) {
    if (typeof values?.[key] !== "string") {
      throw new Error("PROFILE_LOCAL_FIELD_INVALID");
    }
    profile[key] = values[key].trim();
  }
  if (!profile.name || profile.name.length > 160) {
    throw new Error("PROFILE_NAME_INVALID");
  }
  return {revision: record.revision, profile};
}

export function ownerProfileChanged(record, values) {
  if (!record || !PROFILE_FIELDS[record.owner_type]) return false;
  return PROFILE_FIELDS[record.owner_type].some(key =>
    String(record.profile[key] ?? "") !== String(values?.[key] ?? "").trim()
  );
}

// Persist must be proved twice: PATCH readback inside SQL transaction, then
// fresh independent GET. Neither a toast nor HTTP 200 alone is sufficient.
export function verifyOwnerProfileSave(before, patched, fresh) {
  const ownerType = before?.owner_type;
  const ownerSlug = before?.owner_slug;
  const b = validateOwnerProfileReply(before, ownerType, ownerSlug);
  const p = validateOwnerProfileReply(patched, ownerType, ownerSlug);
  const f = validateOwnerProfileReply(fresh, ownerType, ownerSlug);
  if (!p.saved || f.saved || !p.can_write ||
      p.revision !== f.revision ||
      p.profile.email !== b.profile.email ||
      f.profile.email !== b.profile.email ||
      PROFILE_FIELDS[ownerType].some(key =>
        p.profile[key] !== f.profile[key])) {
    throw new Error("PROFILE_PERSISTENCE_VERIFICATION_FAILED");
  }
  return f;
}
