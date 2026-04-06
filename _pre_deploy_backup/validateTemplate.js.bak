// src/utils/validateTemplate.js

function isObject(value){
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value){
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value){
  const num = Number(value);
  return Number.isFinite(num);
}

function pushError(target, path, code, message){
  target.push({ level: "error", path, code, message });
}

function pushWarning(target, path, code, message){
  target.push({ level: "warning", path, code, message });
}

function validateStringField(issues, value, path, options = {}){
  const { required = false, maxLength = 0 } = options;

  if (!isNonEmptyString(value)) {
    if (required) {
      pushError(issues, path, "REQUIRED_STRING_MISSING", `${path} is required.`);
    }
    return;
  }

  if (maxLength > 0 && value.trim().length > maxLength) {
    pushWarning(issues, path, "STRING_TOO_LONG", `${path} exceeds recommended length ${maxLength}.`);
  }
}

function validateArrayField(issues, value, path){
  if (value == null) return;
  if (!Array.isArray(value)) {
    pushError(issues, path, "ARRAY_EXPECTED", `${path} must be an array.`);
  }
}

function validateImageRef(issues, value, path){
  if (value == null) return;

  if (!isObject(value)) {
    pushError(issues, path, "IMAGE_REF_INVALID", `${path} must be an object.`);
    return;
  }

  const hasAssetId = isNonEmptyString(value.image_asset_id);
  const hasUrl = isNonEmptyString(value.secure_url) || isNonEmptyString(value.url) || isNonEmptyString(value.image_url) || isNonEmptyString(value.src);

  if (!hasAssetId && !hasUrl) {
    pushWarning(issues, path, "IMAGE_REF_EMPTY", `${path} does not contain image_asset_id or direct url.`);
  }
}

export function validateTemplatePayload(payload){
  const issues = [];

  if (!isObject(payload)) {
    pushError(issues, "payload", "PAYLOAD_INVALID", "Template payload must be an object.");
    return buildResult(issues);
  }

  const identity = isObject(payload.identity) ? payload.identity : {};
  const contact = isObject(payload.contact) ? payload.contact : {};
  const trust = isObject(payload.trust) ? payload.trust : {};
  const cta = isObject(payload.cta) ? payload.cta : {};
  const sections = isObject(payload.sections) ? payload.sections : {};
  const images = isObject(payload.images) ? payload.images : {};
  const seo = isObject(payload.seo) ? payload.seo : {};

  validateStringField(issues, identity.salon_name, "identity.salon_name", { required: true, maxLength: 120 });
  validateStringField(issues, identity.hero_badge, "identity.hero_badge", { maxLength: 80 });
  validateStringField(issues, identity.slogan, "identity.slogan", { maxLength: 180 });
  validateStringField(issues, identity.subtitle, "identity.subtitle", { maxLength: 500 });

  validateStringField(issues, contact.address, "contact.address", { required: true, maxLength: 180 });
  validateStringField(issues, contact.district, "contact.district", { maxLength: 120 });
  validateStringField(issues, contact.city, "contact.city", { maxLength: 120 });
  validateStringField(issues, contact.phone, "contact.phone", { maxLength: 40 });
  validateStringField(issues, contact.whatsapp, "contact.whatsapp", { maxLength: 40 });
  validateStringField(issues, contact.schedule_text, "contact.schedule_text", { maxLength: 120 });

  if (!isNonEmptyString(contact.phone) && !isNonEmptyString(contact.whatsapp)) {
    pushWarning(issues, "contact", "CONTACT_CHANNEL_MISSING", "At least one contact channel is recommended: phone or whatsapp.");
  }

  if (trust.rating_value != null && !isFiniteNumber(trust.rating_value)) {
    pushWarning(issues, "trust.rating_value", "RATING_INVALID", "trust.rating_value should be numeric.");
  }

  if (trust.review_count != null && !isNonEmptyString(String(trust.review_count))) {
    pushWarning(issues, "trust.review_count", "REVIEW_COUNT_INVALID", "trust.review_count should be a string or number.");
  }

  if (trust.completed_bookings != null && !isFiniteNumber(trust.completed_bookings)) {
    pushWarning(issues, "trust.completed_bookings", "COMPLETED_BOOKINGS_INVALID", "trust.completed_bookings should be numeric.");
  }

  validateStringField(issues, cta.booking_label, "cta.booking_label", { maxLength: 80 });
  validateStringField(issues, cta.booking_url, "cta.booking_url", { maxLength: 500 });
  validateStringField(issues, cta.services_label, "cta.services_label", { maxLength: 80 });
  validateStringField(issues, cta.services_anchor, "cta.services_anchor", { maxLength: 120 });

  validateArrayField(issues, sections.benefits, "sections.benefits");
  validateArrayField(issues, sections.popular_services, "sections.popular_services");
  validateArrayField(issues, sections.full_service_list, "sections.full_service_list");
  validateArrayField(issues, sections.promos, "sections.promos");
  validateArrayField(issues, sections.gallery, "sections.gallery");
  validateArrayField(issues, sections.reviews, "sections.reviews");
  validateArrayField(issues, sections.about_paragraphs, "sections.about_paragraphs");
  validateArrayField(issues, sections.masters, "sections.masters");

  validateImageRef(issues, images.hero, "images.hero");
  validateImageRef(issues, images.logo, "images.logo");
  validateImageRef(issues, images.promo, "images.promo");

  if (images.assets != null && !isObject(images.assets)) {
    pushError(issues, "images.assets", "ASSETS_INVALID", "images.assets must be an object map.");
  }

  validateStringField(issues, seo.title, "seo.title", { maxLength: 160 });
  validateStringField(issues, seo.description, "seo.description", { maxLength: 320 });
  validateStringField(issues, seo.canonical_url, "seo.canonical_url", { maxLength: 500 });

  return buildResult(issues);
}

function buildResult(issues){
  const hardErrors = issues.filter((item) => item.level === "error");
  const warnings = issues.filter((item) => item.level === "warning");

  const completenessBase = 100;
  const completenessPenalty = hardErrors.length * 20 + warnings.length * 5;
  const completenessScore = Math.max(0, completenessBase - completenessPenalty);

  return {
    ok: hardErrors.length === 0,
    is_publishable: hardErrors.length === 0,
    is_ready_for_preview: hardErrors.length === 0,
    completeness_score: completenessScore,
    hard_errors: hardErrors,
    warnings,
    issues,
  };
}