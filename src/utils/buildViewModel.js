// src/utils/buildViewModel.js

import { normalizeTemplatePayload } from "./normalizeTemplate";
import { validateTemplatePayload } from "./validateTemplate";

function pickFirstString(...values){
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickFirstNumber(...values){
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}

function pickFirstAssetId(...values){
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeText(text){
  if (typeof text !== "string") return "";
  return text.replace(/\s+/g, " ").trim();
}

function filterActiveItems(items){
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && item.is_active !== false);
}

function buildCloudinaryTransformString(transform = {}){
  const parts = [];

  if (transform.crop) parts.push(`c_${transform.crop}`);
  if (transform.gravity) parts.push(`g_${transform.gravity}`);
  if (transform.width) parts.push(`w_${transform.width}`);
  if (transform.height) parts.push(`h_${transform.height}`);
  if (transform.quality) parts.push(`q_${transform.quality}`);
  if (transform.format) parts.push(`f_${transform.format}`);

  return parts.filter(Boolean).join(",");
}

function transformImageUrl(url, transform = {}){
  const safeUrl = pickFirstString(url);

  if (!safeUrl) return "";
  if (!safeUrl.includes("/upload/")) return safeUrl;
  if (!safeUrl.includes("res.cloudinary.com")) return safeUrl;

  const transformString = buildCloudinaryTransformString(transform);
  if (!transformString) return safeUrl;

  return safeUrl.replace("/upload/", `/upload/${transformString}/`);
}

function resolveTemplateAsset(imagesRoot, imageRef, transform = {}){
  if (!imagesRoot || !imageRef) return "";

  const safeImagesRoot = safeObject(imagesRoot);
  const directUrl = pickFirstString(
    imageRef?.secure_url,
    imageRef?.image_secure_url,
    imageRef?.avatar_secure_url,
    imageRef?.url,
    imageRef?.image_url,
    imageRef?.src,
    imageRef?.image?.secure_url,
    imageRef?.image?.url,
    imageRef?.image?.image_url,
    imageRef?.image?.src,
    imageRef?.hero?.secure_url,
    imageRef?.hero?.url,
    imageRef?.hero?.image_url,
    imageRef?.hero?.src,
    imageRef?.cover?.secure_url,
    imageRef?.cover?.url,
    imageRef?.cover?.image_url,
    imageRef?.cover?.src,
    imageRef?.photo?.secure_url,
    imageRef?.photo?.url,
    imageRef?.photo?.image_url,
    imageRef?.photo?.src,
    imageRef?.avatar?.secure_url,
    imageRef?.avatar?.url,
    imageRef?.avatar?.image_url,
    imageRef?.avatar?.src,
    imageRef?.media?.secure_url,
    imageRef?.media?.url,
    imageRef?.media?.image_url,
    imageRef?.media?.src,
  );

  if (directUrl) return transformImageUrl(directUrl, transform);

  const assetId = pickFirstAssetId(
    imageRef?.image_asset_id,
    imageRef?.avatar_asset_id,
    imageRef?.asset_id,
    imageRef?.image?.image_asset_id,
    imageRef?.hero?.image_asset_id,
    imageRef?.cover?.image_asset_id,
    imageRef?.photo?.image_asset_id,
    imageRef?.avatar?.image_asset_id,
    imageRef?.media?.image_asset_id,
  );
  const asset = assetId && safeImagesRoot?.assets ? safeImagesRoot.assets[String(assetId)] : null;

  return transformImageUrl(
    pickFirstString(
      asset?.secure_url,
      asset?.image_secure_url,
      asset?.avatar_secure_url,
      asset?.url,
      asset?.image_url,
      asset?.src,
      asset?.image?.secure_url,
      asset?.image?.image_secure_url,
      asset?.image?.url,
      asset?.image?.image_url,
      asset?.image?.src,
      asset?.hero?.secure_url,
      asset?.hero?.image_secure_url,
      asset?.hero?.url,
      asset?.hero?.image_url,
      asset?.hero?.src,
      asset?.cover?.secure_url,
      asset?.cover?.image_secure_url,
      asset?.cover?.url,
      asset?.cover?.image_url,
      asset?.cover?.src,
      asset?.photo?.secure_url,
      asset?.photo?.image_secure_url,
      asset?.photo?.url,
      asset?.photo?.image_url,
      asset?.photo?.src,
      asset?.avatar?.secure_url,
      asset?.avatar?.image_secure_url,
      asset?.avatar?.url,
      asset?.avatar?.image_url,
      asset?.avatar?.src,
      asset?.media?.secure_url,
      asset?.media?.image_secure_url,
      asset?.media?.url,
      asset?.media?.image_url,
      asset?.media?.src,
    ),
    transform,
  );
}

function mapTemplateServices(items, imagesRoot){
  return filterActiveItems(items)
    .map((service) => ({
      id: service.id,
      name: pickFirstString(service.name, service.title),
      description: normalizeText(pickFirstString(service.description, service.text, service.note)),
      price: pickFirstNumber(service.price),
      durationMin: pickFirstNumber(service.duration_min, service.duration),
      imageUrl: resolveTemplateAsset(imagesRoot, service, {
        width: 900,
        height: 675,
        crop: "fill",
        gravity: "auto",
        quality: "auto",
        format: "auto",
      }),
    }))
    .filter((service) => service.name);
}

function mapTemplateMasters(items, imagesRoot){
  return filterActiveItems(items)
    .map((master) => ({
      id: master.id || master.slug || master.name,
      slug: master.slug || "",
      name: pickFirstString(master.name),
      role: pickFirstString(master.role, master.profession),
      bio: normalizeText(pickFirstString(master.bio, master.description)),
      imageUrl: resolveTemplateAsset(imagesRoot, master, {
        width: 700,
        height: 700,
        crop: "fill",
        gravity: "face",
        quality: "auto",
        format: "auto",
      }),
    }))
    .filter((master) => master.name);
}

function mapTemplateReviews(items){
  return filterActiveItems(items)
    .map((review, index) => ({
      id: review.id || index + 1,
      name: pickFirstString(review.name, `Гость ${index + 1}`),
      text: normalizeText(pickFirstString(review.text)),
      rating: pickFirstNumber(review.rating) || 5,
    }))
    .filter((review) => review.text);
}

function mapTemplatePromos(items){
  return filterActiveItems(items)
    .map((promo, index) => ({
      id: promo.id || index + 1,
      title: pickFirstString(promo.title, promo.name),
      text: normalizeText(pickFirstString(promo.text, promo.description)),
      badge: pickFirstString(promo.badge, "Предложение"),
    }))
    .filter((promo) => promo.title);
}

function mapTemplateBenefits(items){
  return filterActiveItems(items)
    .map((item, index) => ({
      id: item.id || index + 1,
      title: pickFirstString(item.title),
      text: normalizeText(pickFirstString(item.text, item.description)),
    }))
    .filter((item) => item.title);
}

function mapTemplateAbout(items){
  return filterActiveItems(items)
    .sort((a, b) => Number(a?.slot_index || 0) - Number(b?.slot_index || 0))
    .map((item) => normalizeText(pickFirstString(item.text)))
    .filter(Boolean)
    .slice(0, 4);
}

function mapTemplateGallery(payload, fallbackImages){
  const galleryItems = filterActiveItems(payload?.sections?.gallery);
  const portfolioItems = filterActiveItems(payload?.sections?.portfolio);
  const urls = [...galleryItems, ...portfolioItems]
    .map((item) => resolveTemplateAsset(payload?.images, item, {
      width: 1400,
      height: 1050,
      crop: "fill",
      gravity: "auto",
      quality: "auto",
      format: "auto",
    }))
    .filter(Boolean);

  if (urls.length === 0) return fallbackImages;

  return Array.from(new Set(urls));
}

function safeObject(value){
  return value && typeof value === "object" ? value : {};
}

export function buildSalonTemplateViewModel({
  salon,
  masters,
  metrics,
  publishedTemplate,
}){
  const safePublishedTemplate = safeObject(publishedTemplate);
  const normalizedTemplate = normalizeTemplatePayload(safePublishedTemplate);
  const validation = validateTemplatePayload(safePublishedTemplate);

  const templateIdentity = safeObject(normalizedTemplate.identity);
  const templateContact = safeObject(normalizedTemplate.contact);
  const templateTrust = safeObject(normalizedTemplate.trust);
  const templateSections = safeObject(normalizedTemplate.sections);
  const templateImages = safeObject(normalizedTemplate.images);
  const rawTemplateImages = safeObject(safePublishedTemplate.images);
  const resolvedTemplateImages = {
    ...rawTemplateImages,
    ...templateImages,
    hero: safeObject(templateImages.hero).image_asset_id || pickFirstString(
      templateImages.hero?.secure_url,
      templateImages.hero?.image_secure_url,
      templateImages.hero?.url,
      templateImages.hero?.image_url,
      templateImages.hero?.src,
    )
      ? templateImages.hero
      : safeObject(rawTemplateImages.hero),
    logo: safeObject(templateImages.logo).image_asset_id || pickFirstString(
      templateImages.logo?.secure_url,
      templateImages.logo?.image_secure_url,
      templateImages.logo?.url,
      templateImages.logo?.image_url,
      templateImages.logo?.src,
    )
      ? templateImages.logo
      : safeObject(rawTemplateImages.logo),
    promo: safeObject(templateImages.promo).image_asset_id || pickFirstString(
      templateImages.promo?.secure_url,
      templateImages.promo?.image_secure_url,
      templateImages.promo?.url,
      templateImages.promo?.image_url,
      templateImages.promo?.src,
    )
      ? templateImages.promo
      : safeObject(rawTemplateImages.promo),
    assets: {
      ...safeObject(rawTemplateImages.assets),
      ...safeObject(templateImages.assets),
    },
  };
  const templateSeo = safeObject(normalizedTemplate.seo);
  const templateCta = safeObject(normalizedTemplate.cta);

  const popularServices = mapTemplateServices(templateSections.popular_services, resolvedTemplateImages);
  const fullServiceList = mapTemplateServices(templateSections.full_service_list, resolvedTemplateImages);
  const visibleMasters = mapTemplateMasters(templateSections.masters, resolvedTemplateImages);
  const reviews = mapTemplateReviews(templateSections.reviews);
  const promos = mapTemplatePromos(templateSections.promos);
  const benefits = mapTemplateBenefits(templateSections.benefits);
  const aboutParagraphs = mapTemplateAbout(templateSections.about_paragraphs);
    const galleryImages = mapTemplateGallery({ ...normalizedTemplate, images: resolvedTemplateImages }, []);

  return {
    validation,
    normalizedTemplate,
    slug: pickFirstString(salon?.slug),
    title: pickFirstString(
      templateSeo.title,
      templateIdentity.salon_name,
    ),
    description: pickFirstString(
      templateSeo.description,
      templateIdentity.subtitle,
    ),
    salonName: pickFirstString(templateIdentity.salon_name),
    slogan: pickFirstString(templateIdentity.slogan),
    subtitle: pickFirstString(templateIdentity.subtitle),
    heroBadge: pickFirstString(templateIdentity.hero_badge, "Витрина салона в TOTEM"),
        heroImage: resolveTemplateAsset(resolvedTemplateImages, resolvedTemplateImages?.hero, {
      width: 1600,
      height: 1200,
      crop: "fill",
      gravity: "auto",
      quality: "auto",
      format: "auto",
    }),
    district: pickFirstString(templateContact.district),
    address: pickFirstString(templateContact.address),
    city: pickFirstString(templateContact.city),
    phone: pickFirstString(templateContact.phone, templateContact.whatsapp),
    whatsapp: pickFirstString(templateContact.whatsapp),
    scheduleText: pickFirstString(templateContact.schedule_text),
    ratingValue: pickFirstString(templateTrust.rating_value),
    reviewCount: pickFirstString(templateTrust.review_count),
    completedBookings: pickFirstNumber(templateTrust.completed_bookings),
    mapEmbedUrl: pickFirstString(templateContact.map_embed_url),
    defaultMapAddress: [
      pickFirstString(templateContact.address),
      pickFirstString(templateContact.district),
      pickFirstString(templateContact.city),
    ]
      .filter(Boolean)
      .join(", "),
    cta: {
      bookingLabel: pickFirstString(templateCta.booking_label, "Записаться онлайн"),
      bookingUrl: pickFirstString(templateCta.booking_url, "/booking"),
      servicesLabel: pickFirstString(templateCta.services_label, "Смотреть услуги"),
      servicesAnchor: pickFirstString(templateCta.services_anchor, "popular-services"),
    },
    sections: {
      benefits,
      popularServices,
      fullServiceList,
      promos,
      reviews,
      masters: visibleMasters,
      aboutParagraphs,
      galleryImages,
    },
    meta: {
      fallback_used: false,
      render_safe: true,
    },
  };
}


export function buildMasterTemplateViewModel(payload){
  const safePayload = safeObject(payload);
  const normalized = normalizeTemplatePayload ? normalizeTemplatePayload(safePayload) : safePayload;
  const identity = safeObject(normalized.identity);
  const location = safeObject(normalized.location);
  const sections = safeObject(normalized.sections);
  const trust = safeObject(normalized.trust);
  const stats = safeObject(normalized.stats);
  const cta = safeObject(normalized.cta);
  const images = safeObject(normalized.images);
  const resolvedHeroImage = resolveTemplateAsset(images, images.hero, {
    width: 1400,
    height: 1400,
    crop: "fill",
    gravity: "face",
    quality: "auto",
    format: "auto",
  });

  const metrics = filterActiveItems(normalized.metrics)
    .map((item) => ({
      value: pickFirstString(item?.value),
      label: pickFirstString(item?.label),
    }))
    .filter((item) => item.value || item.label);

  const benefits = filterActiveItems(sections.benefits)
    .map((item, index) => ({
      id: item?.id || index + 1,
      title: pickFirstString(item?.title),
      text: normalizeText(pickFirstString(item?.text, item?.description)),
    }))
    .filter((item) => item.title || item.text);

  const featuredServices = filterActiveItems(sections.featured_services)
    .map((item, index) => ({
      id: item?.id || index + 1,
      title: pickFirstString(item?.title, item?.name),
      price: pickFirstString(item?.price),
      time: pickFirstString(item?.time, item?.duration),
      note: normalizeText(pickFirstString(item?.note, item?.description, item?.text)),
    }))
    .filter((item) => item.title || item.price || item.time || item.note);

  const serviceCatalog = filterActiveItems(sections.service_catalog)
    .map((item, index) => ({
      id: item?.id || index + 1,
      name: pickFirstString(item?.name, item?.title),
      price: pickFirstString(item?.price),
      duration: pickFirstString(item?.duration, item?.time),
      description: normalizeText(pickFirstString(item?.description, item?.text, item?.note)),
    }))
    .filter((item) => item.name || item.price || item.duration || item.description);

  const reviews = filterActiveItems(sections.reviews)
    .map((item, index) => ({
      id: item?.id || index + 1,
      name: pickFirstString(item?.name),
      text: normalizeText(pickFirstString(item?.text)),
      rating: pickFirstString(item?.rating) || String(pickFirstNumber(item?.rating) || ""),
    }))
    .filter((item) => item.name || item.text || item.rating);

  const badges = filterActiveItems(sections.badges)
    .map((item) => pickFirstString(item?.text, item?.title, item?.name))
    .filter(Boolean);

  const aboutParagraphs = filterActiveItems(sections.about_paragraphs)
    .sort((a, b) => Number(a?.slot_index || 0) - Number(b?.slot_index || 0))
    .map((item) => normalizeText(pickFirstString(item?.text)))
    .filter(Boolean)
    .slice(0, 4);

  const safeStats = {
    years: pickFirstString(stats.years),
    rating: pickFirstString(stats.rating),
    bookings: pickFirstString(stats.bookings),
  };

  const bookingBand = {
    title: pickFirstString(sections?.booking_band?.title),
    text: normalizeText(pickFirstString(sections?.booking_band?.text)),
    booking_cta_label: pickFirstString(sections?.booking_band?.booking_cta_label),
    booking_cta_url: pickFirstString(sections?.booking_band?.booking_cta_url),
    services_cta_label: pickFirstString(sections?.booking_band?.services_cta_label),
    services_anchor: pickFirstString(sections?.booking_band?.services_anchor),
  };

  return {
    masterName: pickFirstString(identity.master_name),
    profession: pickFirstString(identity.profession),
    city: pickFirstString(identity.city, location.city),
    district: pickFirstString(location.district),
    address: pickFirstString(location.address),
    schedule: pickFirstString(location.schedule_text),
    phone: pickFirstString(location.phone, location.whatsapp),
    mapUrl: pickFirstString(location.map_url),
    heroImage: resolvedHeroImage,
    heroAlt: pickFirstString(images?.hero?.alt, identity.master_name),
    heroBadge: pickFirstString(identity.hero_badge),
    subtitle: pickFirstString(identity.subtitle),
    description: pickFirstString(identity.description),
    metrics,
    benefits,
    featuredServices,
    serviceCatalog,
    reviews,
    badges,
    aboutParagraphs,
    stats: safeStats,
    bookingBand,
    bookingUrl: pickFirstString(cta.booking_url),
    bookingLabel: pickFirstString(cta.booking_label),
    servicesLabel: pickFirstString(cta.services_label),
    servicesAnchor: pickFirstString(cta.services_anchor),
    mapLabel: pickFirstString(cta.contact_map_label),
    stickyLabel: pickFirstString(cta.sticky_label),
    stickySubline: pickFirstString(trust.sticky_subline),
    ratingValue: pickFirstString(trust.rating_value),
    reviewCount: pickFirstString(trust.review_count),
    trustNote: pickFirstString(trust.trust_note),
  };
}
