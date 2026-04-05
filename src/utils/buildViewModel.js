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
    imageRef.secure_url,
    imageRef.url,
    imageRef.image_url,
    imageRef.src,
  );

  if (directUrl) return transformImageUrl(directUrl, transform);

  const assetId = pickFirstString(imageRef.image_asset_id);
  const asset = assetId && imagesRoot.assets ? imagesRoot.assets[assetId] : null;

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
  const urls = galleryItems
    .map((item) => resolveTemplateAsset(payload?.images, item, {
      width: 1400,
      height: 1050,
      crop: "fill",
      gravity: "auto",
      quality: "auto",
      format: "auto",
    }))
    .filter(Boolean);

  return urls.length > 0 ? urls : fallbackImages;
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
  const normalizedTemplate = normalizeTemplatePayload(publishedTemplate || {});
  const validation = validateTemplatePayload(publishedTemplate || {});

  const templateIdentity = publishedTemplate?.identity || {};
  const templateContact = publishedTemplate?.contact || {};
  const templateTrust = publishedTemplate?.trust || {};
  const templateSections = publishedTemplate?.sections || {};
  const templateImages = publishedTemplate?.images || {};
  const templateSeo = publishedTemplate?.seo || {};

  const serviceCatalogFromApi = extractServices(salon);
  const popularServices = mapTemplateServices(templateSections.popular_services, templateImages);
  const fullServiceList = mapTemplateServices(templateSections.full_service_list, templateImages);
  const visibleMasters = mapTemplateMasters(templateSections.masters, templateImages);
  const reviews = mapTemplateReviews(templateSections.reviews);
  const promos = mapTemplatePromos(templateSections.promos);
  const benefits = mapTemplateBenefits(templateSections.benefits);
  const aboutParagraphs = mapTemplateAbout(templateSections.about_paragraphs);
  const galleryImages = mapTemplateGallery(publishedTemplate, isDemoSalon ? demoVisuals.gallery || [] : []);

  const apiMasters = Array.isArray(masters) ? masters : [];
  const finalMasters =
    visibleMasters.length > 0
      ? visibleMasters
      : apiMasters.length > 0
        ? apiMasters
            .filter((master) => !!pickFirstString(master?.name))
            .slice(0, 4)
            .map((master, index) => ({
              ...master,
              imageUrl: isDemoSalon ? demoVisuals.masters?.[index] || "" : "",
            }))
        : isDemoSalon
          ? demoMasterFallbacks.map((master, index) => ({
              ...master,
              imageUrl: demoVisuals.masters?.[index] || "",
            }))
          : [];

  return {
    validation,
    normalizedTemplate,
    slug: pickFirstString(salon?.slug, demoSlug),
    title: pickFirstString(
      templateSeo.title,
      templateIdentity.salon_name,
      isDemoSalon ? "TOTEM Демо Салон" : pickFirstString(salon?.name, "Салон"),
    ),
    description: pickFirstString(
      templateSeo.description,
      isDemoSalon
        ? "TOTEM Демо Салон: премиальная витрина салона с услугами, командой, галереей, картой и удобной онлайн записью."
        : "Публичная страница салона в TOTEM: услуги, команда, контакты и удобная онлайн запись.",
    ),
    salonName: pickFirstString(
      templateIdentity.salon_name,
      isDemoSalon ? "TOTEM Демо Салон" : pickFirstString(salon?.name, "Салон"),
    ),
    slogan: pickFirstString(
      templateIdentity.slogan,
      isDemoSalon
        ? "Премиальная витрина салона с живым визуалом и онлайн-записью"
        : "Красота, сервис и онлайн-запись в одном месте",
    ),
    subtitle: pickFirstString(
      templateIdentity.subtitle,
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
    district: pickFirstString(templateContact.district, "Первомайский район, Бишкек"),
    address: pickFirstString(templateContact.address, "Киевская улица, 148"),
    city: pickFirstString(templateContact.city),
    phone: pickFirstString(templateContact.phone, templateContact.whatsapp, "+996 700 123 456"),
    whatsapp: pickFirstString(templateContact.whatsapp),
    scheduleText: pickFirstString(templateContact.schedule_text, "Ежедневно, 10:00–20:00"),
    ratingValue: pickFirstString(templateTrust.rating_value, "4.9"),
    reviewCount: pickFirstString(templateTrust.review_count, "127+"),
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
      pickFirstString(templateContact.address, "Киевская улица, 148"),
      pickFirstString(templateContact.district, "Первомайский район, Бишкек"),
      pickFirstString(templateContact.city),
    ]
      .filter(Boolean)
      .join(", "),
    cta: {
      bookingLabel: pickFirstString(publishedTemplate?.cta?.booking_label, "Записаться онлайн"),
      bookingUrl: pickFirstString(publishedTemplate?.cta?.booking_url, "/booking"),
      servicesLabel: pickFirstString(publishedTemplate?.cta?.services_label, "Смотреть услуги"),
      servicesAnchor: pickFirstString(publishedTemplate?.cta?.services_anchor, "popular-services"),
    },
    sections: {
      benefits: benefits.length > 0 ? benefits : demoBenefits,
      popularServices: popularServices.length > 0 ? popularServices : demoServiceCatalog.length > 0 ? demoServiceCatalog : serviceCatalogFromApi.slice(0, 12),
      fullServiceList: fullServiceList.length > 0 ? fullServiceList : demoServiceCatalog.length > 0 ? demoServiceCatalog : serviceCatalogFromApi.slice(0, 12),
      promos: promos.length > 0 ? promos : demoPromos,
      reviews: reviews.length > 0 ? reviews : demoReviews,
      masters: finalMasters,
      aboutParagraphs:
        aboutParagraphs.length > 0
          ? aboutParagraphs
          : splitParagraphs(
              pickFirstString(
                salon?.about,
                salon?.description,
                "TOTEM Демо Салон — это эталон современной витрины салона: премиальный визуальный образ, понятная подача услуг, команда, отзывы и быстрый переход к записи.",
                "Такая страница работает не как обычная визитка, а как полноценная продуктовая витрина, которая помогает салону вызывать доверие и продавать услуги с мобильного телефона.",
                "Клиент видит атмосферу, процесс, результат и понятную структуру услуг, а владелец получает красивую публичную страницу, которую не стыдно показывать и использовать как рабочий продукт.",
              ),
            ),
      galleryImages,
    },
  };
}
