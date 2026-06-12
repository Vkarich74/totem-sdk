// src/utils/normalizeTemplate.js

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return isObject(value) ? value : {};
}

/* =========================
   SALON NORMALIZE (НЕ ТРОГАЕМ)
========================= */

function normalizeIdentity(identity = {}) {
  return {
    salon_name: asString(identity.salon_name),
    hero_badge: asString(identity.hero_badge),
    slogan: asString(identity.slogan),
    subtitle: asString(identity.subtitle),
  };
}

function normalizeContact(contact = {}) {
  return {
    address: asString(contact.address),
    district: asString(contact.district),
    city: asString(contact.city),
    phone: asString(contact.phone),
    whatsapp: asString(contact.whatsapp),
    instagram: asString(contact.instagram),
    telegram: asString(contact.telegram),
    schedule_text: asString(contact.schedule_text),
    map_embed_url: asString(contact.map_embed_url),
  };
}

function normalizeTrust(trust = {}) {
  return {
    rating_value: asString(trust.rating_value),
    review_count: asString(trust.review_count),
    completed_bookings: asNumber(trust.completed_bookings),
    trust_note: asString(trust.trust_note),
  };
}

function normalizeSectionItems(items) {
  return asArray(items)
    .map((item, index) => {
      if (isObject(item)) return item;

      if (typeof item === "string" && item.trim()) {
        return {
          id: index + 1,
          text: item.trim(),
          title: item.trim(),
          name: item.trim(),
          alt: item.trim(),
          image_url: item.trim(),
          secure_url: item.trim(),
          slot_index: index,
          is_active: true,
        };
      }

      if (typeof item === "number" && Number.isFinite(item)) {
        return {
          id: index + 1,
          image_asset_id: String(item),
          slot_index: index,
          is_active: true,
        };
      }

      return null;
    })
    .filter((item) => isObject(item));
}

function normalizeSections(sections = {}) {
  return {
    benefits: normalizeSectionItems(sections.benefits),
    popular_services: normalizeSectionItems(sections.popular_services),
    full_service_list: normalizeSectionItems(sections.full_service_list),
    promos: normalizeSectionItems(sections.promos),
    gallery: normalizeSectionItems(sections.gallery),
    portfolio: normalizeSectionItems(sections.portfolio),
    reviews: normalizeSectionItems(sections.reviews),
    about_paragraphs: normalizeSectionItems(sections.about_paragraphs),
    masters: normalizeSectionItems(sections.masters),
  };
}

function normalizeSalonSectionsFromPayload(payload = {}) {
  const sections = asObject(payload.sections);

  return normalizeSections({
    ...sections,
    benefits:
      sections.benefits ??
      payload.benefits,
    popular_services:
      sections.popular_services ??
      payload.popular_services ??
      payload.featured_services ??
      payload.services ??
      payload.service_items ??
      payload.public_services ??
      payload.items,
    full_service_list:
      sections.full_service_list ??
      payload.full_service_list ??
      payload.service_catalog ??
      payload.service_list ??
      payload.services ??
      payload.service_items ??
      payload.public_services ??
      payload.items,
    promos:
      sections.promos ??
      payload.promos ??
      payload.offers ??
      payload.promotions,
    gallery:
      sections.gallery ??
      payload.gallery ??
      payload.works ??
      payload.photos ??
      asObject(payload.images).gallery,
    portfolio:
      sections.portfolio ??
      payload.portfolio ??
      payload.works,
    reviews:
      sections.reviews ??
      payload.reviews ??
      payload.testimonials ??
      payload.feedback,
    about_paragraphs:
      sections.about_paragraphs ??
      payload.about_paragraphs ??
      payload.about,
    masters:
      sections.masters ??
      payload.masters ??
      payload.team ??
      payload.staff,
  });
}

function normalizeImageSlot(slot = {}) {
  return {
    image_asset_id: slot.image_asset_id ?? slot.asset_id ?? null,
    alt: asString(slot.alt),
    secure_url: asString(slot.secure_url),
    image_secure_url: asString(slot.image_secure_url),
    avatar_secure_url: asString(slot.avatar_secure_url),
    url: asString(slot.url),
    image_url: asString(slot.image_url),
    src: asString(slot.src),
  };
}

function normalizeImages(images = {}) {
  return {
    hero: normalizeImageSlot(images.hero),
    logo: normalizeImageSlot(images.logo),
    promo: normalizeImageSlot(images.promo),
    assets: asObject(images.assets),
  };
}

function normalizeSalonImagesFromPayload(payload = {}) {
  const images = asObject(payload.images);

  return normalizeImages({
    ...images,
    hero: images.hero ?? payload.hero,
    logo: images.logo ?? payload.logo,
    promo: images.promo ?? payload.promo,
    assets: images.assets ?? payload.assets,
  });
}

function normalizeSeo(seo = {}) {
  return {
    title: asString(seo.title),
    description: asString(seo.description),
    canonical_url: asString(seo.canonical_url),
  };
}

function normalizeCta(cta = {}) {
  return {
    booking_label: asString(cta.booking_label),
    booking_url: asString(cta.booking_url),
    services_label: asString(cta.services_label),
    services_anchor: asString(cta.services_anchor),
  };
}

/* =========================
   MASTER NORMALIZE (НОВЫЙ БЛОК)
========================= */

function normalizeMasterIdentity(identity = {}) {
  return {
    master_name: asString(identity.master_name),
    profession: asString(identity.profession),
    city: asString(identity.city),
    hero_badge: asString(identity.hero_badge),
    subtitle: asString(identity.subtitle),
    description: asString(identity.description || identity.hero_description),
    hero_description: asString(identity.hero_description),
  };
}

function normalizeMasterLocation(location = {}) {
  return {
    address: asString(location.address),
    district: asString(location.district),
    city: asString(location.city),
    phone: asString(location.phone),
    schedule_text: asString(location.schedule_text),
    map_url: asString(location.map_url),
  };
}

function normalizeMasterTrust(trust = {}) {
  return {
    rating_value: asString(trust.rating_value),
    review_count: asString(trust.review_count),
    trust_note: asString(trust.trust_note),
    sticky_subline: asString(trust.sticky_subline),
  };
}

function normalizeMasterSections(sections = {}) {
  return {
    benefits: normalizeSectionItems(sections.benefits),
    featured_services: normalizeSectionItems(sections.featured_services),
    service_catalog: normalizeSectionItems(sections.service_catalog),
    reviews: normalizeSectionItems(sections.reviews),
    about_paragraphs: normalizeSectionItems(sections.about_paragraphs),
    portfolio: normalizeSectionItems(sections.portfolio),
    booking_band: asObject(sections.booking_band),
    badges: normalizeSectionItems(sections.badges),
  };
}

function normalizeMasterStats(stats = {}) {
  return {
    years: asNumber(stats.years),
    rating: asString(stats.rating),
    bookings: asNumber(stats.bookings),
  };
}

function normalizeMasterCta(cta = {}) {
  return {
    booking_label: asString(cta.booking_label),
    booking_url: asString(cta.booking_url),
    services_label: asString(cta.services_label),
    services_anchor: asString(cta.services_anchor),
    contact_map_label: asString(cta.contact_map_label),
    sticky_label: asString(cta.sticky_label),
  };
}

function normalizeMasterImages(images = {}) {
  return {
    hero: normalizeImageSlot(images.hero),
    avatar: normalizeImageSlot(images.avatar),
    logo: normalizeImageSlot(images.logo),
  };
}

/* =========================
   EXPORTS
========================= */

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasNonEmptyObject(value) {
  return isObject(value) && Object.keys(value).length > 0;
}

function isMasterTemplatePayload(payload) {
  if (!isObject(payload)) return false;

  const identity = asObject(payload.identity);
  const sections = asObject(payload.sections);
  const stats = asObject(payload.stats);

  return Boolean(
    asString(identity.master_name) ||
    asString(identity.profession) ||
    hasNonEmptyArray(sections.featured_services) ||
    hasNonEmptyArray(sections.service_catalog) ||
    hasNonEmptyObject(sections.booking_band) ||
    hasNonEmptyObject(stats)
  );
}

export function normalizeTemplatePayload(payload) {
  // AUTO DETECT MASTER PAYLOAD (strict markers only)
  if (isMasterTemplatePayload(payload)) {
    return normalizeMasterTemplatePayload(payload);
  }

  if (!isObject(payload)) {
    return {
      identity: normalizeIdentity(),
      contact: normalizeContact(),
      trust: normalizeTrust(),
      sections: normalizeSections(),
      images: normalizeImages(),
      seo: normalizeSeo(),
      cta: normalizeCta(),
    };
  }

  return {
    identity: normalizeIdentity(payload.identity),
    contact: normalizeContact(payload.contact),
    trust: normalizeTrust(payload.trust),
    sections: normalizeSalonSectionsFromPayload(payload),
    images: normalizeSalonImagesFromPayload(payload),
    seo: normalizeSeo(payload.seo),
    cta: normalizeCta(payload.cta),
  };
}

export function normalizeMasterTemplatePayload(payload) {
  if (!isObject(payload)) {
    return {
      identity: normalizeMasterIdentity(),
      location: normalizeMasterLocation(),
      trust: normalizeMasterTrust(),
      sections: normalizeMasterSections(),
      stats: normalizeMasterStats(),
      images: normalizeMasterImages(),
      cta: normalizeMasterCta(),
    };
  }

  return {
    identity: normalizeMasterIdentity(payload.identity),
    location: normalizeMasterLocation(payload.location),
    trust: normalizeMasterTrust(payload.trust),
    sections: normalizeMasterSections(payload.sections),
    stats: normalizeMasterStats(payload.stats),
    images: normalizeMasterImages(payload.images),
    cta: normalizeMasterCta(payload.cta),
  };
}
