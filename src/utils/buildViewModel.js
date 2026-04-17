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

function splitParagraphs(text){
  if (typeof text !== "string" || !text.trim()) return [];
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
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
  const asset = assetId && imagesRoot?.assets ? imagesRoot.assets[String(assetId)] : null;

  return transformImageUrl(
    pickFirstString(
      asset?.secure_url,
      asset?.url,
      asset?.image_url,
      asset?.src,
    ),
    transform,
  );
}

function extractServices(salon){
  const raw =
    salon?.services ||
    salon?.service_list ||
    salon?.service_items ||
    salon?.public_services ||
    salon?.items ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((service, index) => ({
      id: service?.id ?? service?.sms_id ?? service?.service_id ?? index,
      name: pickFirstString(service?.name, service?.title),
      description: normalizeText(
        pickFirstString(service?.description, service?.short_description, service?.details),
      ),
      price: pickFirstNumber(
        service?.price,
        service?.service_price,
        service?.price_kgs,
        service?.price_amount,
      ),
      durationMin: pickFirstNumber(
        service?.duration_min,
        service?.duration,
        service?.duration_minutes,
      ),
      active:
        service?.is_active !== false &&
        service?.active !== false &&
        service?.status !== "inactive",
    }))
    .filter((service) => service.name && service.active);
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

function safeArray(value){
  return Array.isArray(value) ? value : [];
}

function safeObject(value){
  return value && typeof value === "object" ? value : {};
}

function buildSalonTemplateViewModelFallback({
  demoSlug = "totem-demo-salon",
  demoVisuals = { hero: "", gallery: [] },
  demoMasterFallbacks = [],
  demoBenefits = [],
  demoPromos = [],
  demoReviews = [],
  demoServiceCatalog = [],
  isDemoSalon = false,
} = {}){
  return {
    validation: {
      is_valid: false,
      is_publishable: false,
      errors: [{ code: "VIEW_MODEL_BUILD_FAILED", message: "View model fallback used" }],
      warnings: [],
    },
    normalizedTemplate: {},
    slug: demoSlug,
    title: isDemoSalon ? "TOTEM Демо Салон" : "Салон",
    description: isDemoSalon
      ? "Публичная страница салона в TOTEM."
      : "Публичная страница салона.",
    salonName: isDemoSalon ? "TOTEM Демо Салон" : "Салон",
    slogan: "",
    subtitle: "",
    heroBadge: "Витрина салона в TOTEM",
    heroImage: pickFirstString(demoVisuals?.hero),
    district: "",
    address: "",
    city: "",
    phone: "",
    whatsapp: "",
    scheduleText: "",
    ratingValue: "0",
    reviewCount: "0",
    completedBookings: 0,
    mapEmbedUrl: "",
    defaultMapAddress: "",
    cta: {
      bookingLabel: "Записаться онлайн",
      bookingUrl: "/booking",
      servicesLabel: "Смотреть услуги",
      servicesAnchor: "popular-services",
    },
    sections: {
      benefits: safeArray(demoBenefits),
      popularServices: safeArray(demoServiceCatalog),
      fullServiceList: safeArray(demoServiceCatalog),
      promos: safeArray(demoPromos),
      reviews: safeArray(demoReviews),
      masters: safeArray(demoMasterFallbacks),
      aboutParagraphs: [],
      galleryImages: safeArray(demoVisuals?.gallery),
    },
    meta: {
      fallback_used: true,
      render_safe: true,
    },
  };
}

export function buildSalonTemplateViewModel({
  salon,
  masters,
  metrics,
  publishedTemplate,
  isDemoSalon = false,
  demoSlug = "totem-demo-salon",
  demoVisuals = { hero: "", gallery: [] },
  demoMasterFallbacks = [],
  demoBenefits = [],
  demoPromos = [],
  demoReviews = [],
  demoServiceCatalog = [],
}){
  try {
    const safePublishedTemplate = safeObject(publishedTemplate);
    const normalizedTemplate = normalizeTemplatePayload(safePublishedTemplate);
    const validation = validateTemplatePayload(safePublishedTemplate);

    const templateIdentity = safeObject(normalizedTemplate.identity);
    const templateContact = safeObject(normalizedTemplate.contact);
    const templateTrust = safeObject(normalizedTemplate.trust);
    const templateSections = safeObject(normalizedTemplate.sections);
    const templateImages = safeObject(normalizedTemplate.images);
    const templateSeo = safeObject(normalizedTemplate.seo);
    const templateCta = safeObject(normalizedTemplate.cta);

    const popularServices = mapTemplateServices(templateSections.popular_services, templateImages);
    const fullServiceList = mapTemplateServices(templateSections.full_service_list, templateImages);
    const visibleMasters = mapTemplateMasters(templateSections.masters, templateImages);
    const reviews = mapTemplateReviews(templateSections.reviews);
    const promos = mapTemplatePromos(templateSections.promos);
    const benefits = mapTemplateBenefits(templateSections.benefits);
    const aboutParagraphs = mapTemplateAbout(templateSections.about_paragraphs);
    const galleryImages = mapTemplateGallery(
      normalizedTemplate,
      isDemoSalon ? safeArray(demoVisuals.gallery) : [],
    );

    const finalMasters =
      visibleMasters.length > 0
        ? visibleMasters
        : isDemoSalon
          ? safeArray(demoMasterFallbacks).map((master, index) => ({
              ...master,
              imageUrl: demoVisuals.masters?.[index] || "",
            }))
          : [];

    const finalBenefits =
      benefits.length > 0 ? benefits : (isDemoSalon ? safeArray(demoBenefits) : []);

    const finalPromos =
      promos.length > 0 ? promos : (isDemoSalon ? safeArray(demoPromos) : []);

    const finalReviews =
      reviews.length > 0 ? reviews : (isDemoSalon ? safeArray(demoReviews) : []);

    const finalPopularServices =
      popularServices.length > 0
        ? popularServices
        : (isDemoSalon ? safeArray(demoServiceCatalog) : []);

    const finalFullServiceList =
      fullServiceList.length > 0
        ? fullServiceList
        : (isDemoSalon ? safeArray(demoServiceCatalog) : []);

    const finalAboutParagraphs =
      aboutParagraphs.length > 0
        ? aboutParagraphs
        : isDemoSalon
          ? splitParagraphs(
              pickFirstString(
                salon?.about,
                salon?.description,
                "TOTEM Демо Салон — это эталон современной витрины салона: премиальный визуальный образ, понятная подача услуг, команда, отзывы и быстрый переход к записи.",
                "Такая страница работает не как обычная визитка, а как полноценная продуктовая витрина, которая помогает салону вызывать доверие и продавать услуги с мобильного телефона.",
                "Клиент видит атмосферу, процесс, результат и понятную структуру услуг, а владелец получает красивую публичную страницу, которую не стыдно показывать и использовать как рабочий продукт.",
              ),
            )
          : [];

    return {
      validation,
      normalizedTemplate,
      slug: pickFirstString(salon?.slug, demoSlug),
      title: pickFirstString(
        templateSeo.title,
        templateIdentity.salon_name,
        salon?.name,
        isDemoSalon ? "TOTEM Демо Салон" : "Салон",
      ),
      description: pickFirstString(
        templateSeo.description,
        templateIdentity.subtitle,
        salon?.description,
        isDemoSalon
          ? "TOTEM Демо Салон: премиальная витрина салона с услугами, командой, галереей, картой и удобной онлайн записью."
          : "Публичная страница салона в TOTEM: услуги, команда, контакты и удобная онлайн запись.",
      ),
      salonName: pickFirstString(
        templateIdentity.salon_name,
        salon?.name,
        isDemoSalon ? "TOTEM Демо Салон" : "Салон",
      ),
      slogan: pickFirstString(
        templateIdentity.slogan,
        isDemoSalon
          ? "Премиальная витрина салона с живым визуалом и онлайн-записью"
          : "Красота, сервис и онлайн-запись в одном месте",
      ),
      subtitle: pickFirstString(
        templateIdentity.subtitle,
        salon?.description,
        isDemoSalon
          ? "Современная публичная страница салона в TOTEM: услуги, команда, галерея, акции, отзывы и понятный путь от первого впечатления до записи."
          : "Современная витрина салона в TOTEM: услуги, акции, отзывы, абонементы и удобная запись с телефона.",
      ),
      heroBadge: pickFirstString(templateIdentity.hero_badge, "Витрина салона в TOTEM"),
      heroImage: resolveTemplateAsset(templateImages, templateImages?.hero, {
        width: 1600,
        height: 1200,
        crop: "fill",
        gravity: "auto",
        quality: "auto",
        format: "auto",
      }) || (isDemoSalon ? demoVisuals.hero || "" : ""),
      district: pickFirstString(templateContact.district, salon?.district),
      address: pickFirstString(templateContact.address, salon?.address),
      city: pickFirstString(templateContact.city, salon?.city),
      phone: pickFirstString(templateContact.phone, templateContact.whatsapp, salon?.phone),
      whatsapp: pickFirstString(templateContact.whatsapp),
      scheduleText: pickFirstString(templateContact.schedule_text, salon?.schedule_text),
      ratingValue: pickFirstString(templateTrust.rating_value),
      reviewCount: pickFirstString(templateTrust.review_count),
      completedBookings: pickFirstNumber(
        templateTrust.completed_bookings,
        metrics?.completed,
        metrics?.completed_bookings,
        metrics?.bookings_completed,
      ),
      mapEmbedUrl: pickFirstString(
        templateContact.map_embed_url,
        salon?.map_embed_url,
        salon?.google_map_embed_url,
        salon?.map_url,
      ),
      defaultMapAddress: [
        pickFirstString(templateContact.address, salon?.address),
        pickFirstString(templateContact.district, salon?.district),
        pickFirstString(templateContact.city, salon?.city),
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
        benefits: finalBenefits,
        popularServices: finalPopularServices,
        fullServiceList: finalFullServiceList,
        promos: finalPromos,
        reviews: finalReviews,
        masters: finalMasters,
        aboutParagraphs: finalAboutParagraphs,
        galleryImages,
      },
      meta: {
        fallback_used: false,
        render_safe: true,
      },
    };
  } catch (error) {
    return buildSalonTemplateViewModelFallback({
      demoSlug,
      demoVisuals,
      demoMasterFallbacks,
      demoBenefits,
      demoPromos,
      demoReviews,
      demoServiceCatalog,
      isDemoSalon,
    });
  }
}

// FIX: minimal master builder to satisfy import
export function buildMasterTemplateViewModel(payload){
  const normalized = normalizeTemplatePayload ? normalizeTemplatePayload(payload || {}) : (payload || {});
  const identity = normalized.identity || {};
  const location = normalized.location || {};
  const sections = normalized.sections || {};
  const trust = normalized.trust || {};
  const stats = normalized.stats || {};
  const cta = normalized.cta || {};

  return {
    masterName: identity.master_name || "",
    profession: identity.profession || "",
    city: identity.city || location.city || "",
    district: location.district || "",
    address: location.address || "",
    schedule: location.schedule_text || "",
    phone: location.phone || location.whatsapp || "",
    mapUrl: location.map_url || "",
    heroImage: normalized.images?.hero?.secure_url || normalized.images?.hero?.image_url || "",
    heroAlt: normalized.images?.hero?.alt || identity.master_name || "",
    heroBadge: identity.hero_badge || "",
    subtitle: identity.subtitle || "",
    description: identity.description || "",
    metrics: normalized.metrics || [],
    benefits: sections.benefits || [],
    featuredServices: sections.featured_services || [],
    serviceCatalog: sections.service_catalog || [],
    reviews: sections.reviews || [],
    badges: sections.badges || [],
    aboutParagraphs: sections.about_paragraphs || [],
    stats: stats,
    bookingBand: sections.booking_band || {},
    bookingUrl: cta.booking_url || "",
    bookingLabel: cta.booking_label || "",
    servicesLabel: cta.services_label || "",
    servicesAnchor: cta.services_anchor || "",
    mapLabel: cta.contact_map_label || "",
    stickyLabel: cta.sticky_label || "",
    stickySubline: trust.sticky_subline || "",
    ratingValue: trust.rating_value || "",
    reviewCount: trust.review_count || "",
    trustNote: trust.trust_note || ""
  };
}
