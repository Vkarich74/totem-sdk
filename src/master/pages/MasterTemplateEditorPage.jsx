import { UiValue, uiMessage, uiDate, uiJoin, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../cabinet/PageHeader";
import PageSection from "../../cabinet/PageSection";
import { useMaster } from "../MasterContext";
import {
  getMasterTemplateDocument,
  getMasterTemplatePreview,
  hasInternalTemplateToken,
  publishMasterTemplate,
  saveMasterTemplateDraft
} from "../../api/internal";

const MASTER_OWNER_TYPE = "master";
const MASTER_ASSET_KINDS = {
  hero: "hero",
  avatar: "avatar",
  portfolio: "portfolio",
  service_card: "service_card"
};

const MASTER_ASSET_KIND_VALUES = Object.freeze(Object.values(MASTER_ASSET_KINDS));

const sectionItems = [
  { id: "identity", label: uiMessage("salon.s0681"), note: uiMessage("master.s0324") },
  { id: "hero", label: uiMessage("master.s0325"), note: uiMessage("master.s0326") },
  { id: "contacts", label: uiMessage("master.s0327"), note: uiMessage("master.s0328") },
  { id: "trust", label: uiMessage("salon.s0686"), note: uiMessage("master.s0330") },
  { id: "badges", label: uiMessage("master.s0331"), note: uiMessage("master.s0332") },
  { id: "benefits", label: uiMessage("salon.s0511"), note: uiMessage("master.s0334") },
  { id: "metrics", label: uiMessage("master.s0335"), note: uiMessage("master.s0336") },
  { id: "featured-services", label: uiMessage("master.s0337"), note: uiMessage("master.s0338") },
  { id: "catalog", label: uiMessage("master.s0339"), note: uiMessage("master.s0340") },
  { id: "reviews", label: uiMessage("salon.s0515"), note: uiMessage("salon.s0474") },
  { id: "about", label: uiMessage("master.s0343"), note: uiMessage("master.s0344") },
  { id: "stats", label: uiMessage("master.s0345"), note: uiMessage("master.s0346") },
  { id: "images", label: uiMessage("master.s0347"), note: uiMessage("master.s0348") },
  { id: "cta", label: uiMessage("salon.s0480"), note: uiMessage("master.s0350") },
  { id: "seo", label: uiMessage("salon.s0482"), note: uiMessage("master.s0352") },
  { id: "preview-publish", label: uiMessage("master.s0353"), note: uiMessage("master.s0354") }
];

const EMPTY_DRAFT = {
  identity: {
    master_name: "",
    profession: "",
    city: "",
    hero_badge: "",
    subtitle: "",
    description: ""
  },
  location: {
    address: "",
    district: "",
    city: "",
    schedule_text: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    telegram: "",
    map_url: ""
  },
  trust: {
    rating_value: "",
    review_count: "",
    trust_note: "",
    sticky_subline: ""
  },
  metrics: [],
  cta: {
    booking_label: "",
    booking_url: "",
    services_label: "",
    services_anchor: "",
    contact_map_label: "",
    sticky_label: ""
  },
  sections: {
    badges: [],
    benefits: [],
    featured_services: [],
    service_catalog: [],
    reviews: [],
    about_paragraphs: [],
    portfolio: [],
    booking_band: {
      title: "",
      text: "",
      booking_cta_label: "",
      booking_cta_url: "",
      services_cta_label: "",
      services_anchor: ""
    }
  },
  images: {
    hero: {
      image_asset_id: "",
      image_url: "",
      secure_url: "",
      public_id: "",
      alt: ""
    },
    avatar: {
      image_asset_id: "",
      image_url: "",
      secure_url: "",
      public_id: "",
      alt: ""
    },
    service_card: [],
    assets: {}
  },
  seo: {
    title: "",
    description: "",
    canonical_url: ""
  },
  stats: {
    years: "",
    rating: "",
    bookings: ""
  }
};

function resolveMasterAssetKind(assetKind) {
  const normalized = String(assetKind || "").trim().toLowerCase();
  if (!MASTER_ASSET_KIND_VALUES.includes(normalized)) {
    throw new Error(uiTemplate(["MASTER_ASSET_KIND_INVALID:",""], [assetKind || "unknown"]));
  }
  return normalized;
}

function getCloudinaryConfig() {
  return {
    cloudName: String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim(),
    uploadPreset: String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim(),
    rootFolder: String(import.meta.env.VITE_CLOUDINARY_ROOT_FOLDER || "totem_media").trim() || "totem_media"
  };
}

function buildCloudinaryAssetFolder(ownerType, ownerSlug, assetKind, rootFolder) {
  const normalizedOwnerType = String(ownerType || MASTER_OWNER_TYPE).trim().toLowerCase() || MASTER_OWNER_TYPE;
  const normalizedAssetKind = resolveMasterAssetKind(assetKind);
  return uiTemplate(["","/","/","/",""], [rootFolder, normalizedOwnerType, ownerSlug, normalizedAssetKind]);
}

function buildCloudinaryContext(meta) {
  const ownerType = String(meta.ownerType || MASTER_OWNER_TYPE).trim().toLowerCase() || MASTER_OWNER_TYPE;
  const assetKind = resolveMasterAssetKind(meta.assetKind);
  return uiTemplate(["owner_type=","|owner_slug=","|asset_kind=",""], [ownerType, meta.ownerSlug, assetKind]);
}

function buildCloudinaryTags(meta) {
  const ownerType = String(meta.ownerType || MASTER_OWNER_TYPE).trim().toLowerCase() || MASTER_OWNER_TYPE;
  const assetKind = resolveMasterAssetKind(meta.assetKind);
  return uiJoin(["totem", ownerType, assetKind].filter(Boolean), ",");
}

function normalizeCloudinaryAsset(payload, meta) {
  const ownerType = String(meta.ownerType || MASTER_OWNER_TYPE).trim().toLowerCase() || MASTER_OWNER_TYPE;
  const assetKind = resolveMasterAssetKind(meta.assetKind);

  return {
    asset_id: uiTemplate(["cld:",""], [payload?.public_id || ""]),
    public_id: payload?.public_id || "",
    secure_url: payload?.secure_url || "",
    asset_folder: payload?.asset_folder || meta.assetFolder,
    width: payload?.width || null,
    height: payload?.height || null,
    format: payload?.format || "",
    bytes: payload?.bytes || null,
    resource_type: payload?.resource_type || "image",
    owner_type: ownerType,
    owner_slug: meta.ownerSlug,
    asset_kind: assetKind,
    alt: meta.alt || ""
  };
}

async function uploadImageToCloudinary(file, meta) {
  const config = getCloudinaryConfig();

  if (!config.cloudName || !config.uploadPreset) {
    throw new Error("CLOUDINARY_CONFIG_MISSING");
  }

  const assetFolder = buildCloudinaryAssetFolder(meta.ownerType, meta.ownerSlug, meta.assetKind, config.rootFolder);
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", config.uploadPreset);
  form.append("asset_folder", assetFolder);
  form.append("context", buildCloudinaryContext(meta));
  form.append("tags", buildCloudinaryTags(meta));

  const response = await fetch(uiTemplate(["https://api.cloudinary.com/v1_1/","/image/upload"], [config.cloudName]), {
    method: "POST",
    body: form
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok || !json) {
    throw new Error(json?.error?.message || text || "CLOUDINARY_UPLOAD_FAILED");
  }

  return normalizeCloudinaryAsset(json, { ...meta, assetFolder });
}

function normalizeObjectItem(item) {
  return item && typeof item === "object" && !Array.isArray(item) ? item : null;
}

function normalizeAboutParagraphs(items) {
  return Array.isArray(items)
    ? items
        .map((item) => {
          if (typeof item === "string") {
            return { id: getItemKey("about"), text: item, is_active: true };
          }
          const normalized = normalizeObjectItem(item);
          if (!normalized) return null;
          return {
            id: normalized.id || getItemKey("about"),
            text: String(normalized.text || "").trim(),
            is_active: normalized.is_active !== false
          };
        })
        .filter(Boolean)
    : [];
}

function normalizePortfolioItems(items) {
  return Array.isArray(items)
    ? items
        .map((item) => {
          const normalized = normalizeObjectItem(item);
          if (!normalized) return null;
          return {
            id: normalized.id || getItemKey("portfolio"),
            image_asset_id: String(normalized.image_asset_id || "").trim(),
            image_url: String(normalized.image_url || normalized.secure_url || "").trim(),
            secure_url: String(normalized.secure_url || normalized.image_url || "").trim(),
            public_id: String(normalized.public_id || "").trim(),
            alt: String(normalized.alt || "").trim(),
            is_active: normalized.is_active !== false,
            slot_index: Number.isFinite(Number(normalized.slot_index)) ? Number(normalized.slot_index) : 0
          };
        })
        .filter(Boolean)
    : [];
}

function mergeDraft(source = {}) {
  const metricsSource = Array.isArray(source.metrics)
    ? source.metrics
    : Array.isArray(source.metrics?.metrics)
      ? source.metrics.metrics
      : [];

  return {
    ...EMPTY_DRAFT,
    ...source,
    identity: {
      ...EMPTY_DRAFT.identity,
      ...(source.identity || {}),
      subtitle: String(source.identity?.subtitle || source.identity?.hero_subtitle || "").trim(),
      description: String(source.identity?.description || source.identity?.hero_description || "").trim()
    },
    location: { ...EMPTY_DRAFT.location, ...(source.location || {}) },
    trust: { ...EMPTY_DRAFT.trust, ...(source.trust || {}) },
    metrics: metricsSource.map((item) => ({
      id: item?.id || getItemKey("metric"),
      value: String(item?.value || "").trim(),
      label: String(item?.label || "").trim()
    })),
    cta: { ...EMPTY_DRAFT.cta, ...(source.cta || {}) },
    sections: {
      ...EMPTY_DRAFT.sections,
      ...(source.sections || {}),
      badges: Array.isArray(source.sections?.badges) ? source.sections.badges : [],
      benefits: Array.isArray(source.sections?.benefits) ? source.sections.benefits : [],
      featured_services: Array.isArray(source.sections?.featured_services) ? source.sections.featured_services : [],
      service_catalog: Array.isArray(source.sections?.service_catalog) ? source.sections.service_catalog : [],
      reviews: Array.isArray(source.sections?.reviews) ? source.sections.reviews : [],
      about_paragraphs: normalizeAboutParagraphs(source.sections?.about_paragraphs),
      portfolio: normalizePortfolioItems(source.sections?.portfolio || source.images?.portfolio),
      booking_band: {
        ...EMPTY_DRAFT.sections.booking_band,
        ...(source.sections?.booking_band || {})
      }
    },
    images: {
      ...EMPTY_DRAFT.images,
      ...(source.images || {}),
      hero: { ...EMPTY_DRAFT.images.hero, ...(source.images?.hero || {}) },
      avatar: { ...EMPTY_DRAFT.images.avatar, ...(source.images?.avatar || {}) },
      service_card: Array.isArray(source.images?.service_card) ? source.images.service_card : [],
      assets: { ...EMPTY_DRAFT.images.assets, ...(source.images?.assets || {}) }
    },
    seo: { ...EMPTY_DRAFT.seo, ...(source.seo || {}) },
    stats: { ...EMPTY_DRAFT.stats, ...(source.stats || {}) }
  };
}

function extractMessage(result, fallback) {
 const safeFallback = typeof fallback === "string" ? uiMessage("salon.error.generic") : fallback;
 return uiError(result?.detail?.json?.message || result?.detail?.json?.error || result?.detail?.text || result?.error || safeFallback, safeFallback);
}

function getItemKey(prefix) {
  return uiTemplate(["","_","_",""], [prefix, Date.now(), Math.random().toString(36).slice(2, 8)]);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function buildPreviewPayload(draft, slug) {
  return {
    ...draft,
    slug: slug || ""
  };
}

function pickPreviewValue(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    const normalized = String(value || "").trim();
    if (normalized) return value;
  }

  return "";
}

function buildContextPreviewIdentity(previewPayload, draft, master) {
  const previewIdentity = previewPayload?.identity || {};
  const draftIdentity = draft?.identity || {};

  return {
    ...draftIdentity,
    ...previewIdentity,
    master_name: pickPreviewValue(previewIdentity.master_name, master?.name, master?.master_name, draftIdentity.master_name),
    profession: pickPreviewValue(previewIdentity.profession, master?.profession, master?.specialty, draftIdentity.profession),
    city: pickPreviewValue(previewIdentity.city, master?.city, draftIdentity.city),
    hero_badge: pickPreviewValue(previewIdentity.hero_badge, master?.hero_badge, draftIdentity.hero_badge),
    subtitle: pickPreviewValue(previewIdentity.subtitle, master?.subtitle, master?.tagline, draftIdentity.subtitle),
    description: pickPreviewValue(previewIdentity.description, master?.bio, master?.about, master?.description, draftIdentity.description)
  };
}

function buildContextPreviewLocation(previewPayload, draft, master) {
  const previewLocation = previewPayload?.location || {};
  const draftLocation = draft?.location || {};

  return {
    ...draftLocation,
    ...previewLocation,
    address: pickPreviewValue(previewLocation.address, master?.address, draftLocation.address),
    district: pickPreviewValue(previewLocation.district, master?.district, draftLocation.district),
    city: pickPreviewValue(previewLocation.city, master?.city, draftLocation.city),
    schedule_text: pickPreviewValue(previewLocation.schedule_text, master?.schedule_text, master?.schedule, draftLocation.schedule_text),
    phone: pickPreviewValue(previewLocation.phone, master?.phone, draftLocation.phone),
    whatsapp: pickPreviewValue(previewLocation.whatsapp, master?.whatsapp, master?.phone, draftLocation.whatsapp),
    instagram: pickPreviewValue(previewLocation.instagram, master?.instagram, draftLocation.instagram),
    telegram: pickPreviewValue(previewLocation.telegram, master?.telegram, draftLocation.telegram),
    map_url: pickPreviewValue(previewLocation.map_url, master?.map_url, master?.mapUrl, draftLocation.map_url)
  };
}

function buildContextPreviewTrust(previewPayload, draft, master) {
  const previewTrust = previewPayload?.trust || {};
  const draftTrust = draft?.trust || {};

  return {
    ...draftTrust,
    ...previewTrust,
    rating_value: pickPreviewValue(previewTrust.rating_value, master?.rating_value, master?.rating, draftTrust.rating_value),
    review_count: pickPreviewValue(previewTrust.review_count, master?.review_count, master?.reviews_count, master?.reviewCount, draftTrust.review_count),
    trust_note: pickPreviewValue(previewTrust.trust_note, master?.trust_note, draftTrust.trust_note),
    sticky_subline: pickPreviewValue(previewTrust.sticky_subline, master?.sticky_subline, draftTrust.sticky_subline)
  };
}

function buildContextPreviewStats(previewPayload, draft, master) {
  const previewStats = previewPayload?.stats || {};
  const draftStats = draft?.stats || {};

  return {
    ...draftStats,
    ...previewStats,
    years: pickPreviewValue(previewStats.years, master?.years, master?.experience_years, draftStats.years),
    rating: pickPreviewValue(previewStats.rating, master?.rating, previewPayload?.trust?.rating_value, draftStats.rating),
    bookings: pickPreviewValue(previewStats.bookings, master?.bookings, master?.bookings_count, draftStats.bookings)
  };
}

function buildLocalDocument(previous, draft, slug, mode, validationResult) {
  const nowIso = new Date().toISOString();
  const current = previous || {};
  const validation = validationResult || validateMasterTemplateDraft(draft);

  return {
    ...current,
    owner_type: MASTER_OWNER_TYPE,
    owner_slug: slug,
    template_version: current.template_version || "v1",
    status: {
      ...(current.status || {}),
      is_dirty: mode === "save",
      draft_exists: true,
      publish_state: mode === "publish" ? "published" : (current.status?.publish_state || "draft"),
      is_publishable: Boolean(validation.is_ready_for_publish),
      published_exists: mode === "publish" ? true : Boolean(current.status?.published_exists)
    },
    draft,
    published: mode === "publish" ? draft : (current.published || draft),
    validation: {
      ...validation,
      validated_at: nowIso
    },
    meta: {
      ...(current.meta || {}),
      edited_by: "local-mock",
      published_by: mode === "publish" ? "local-mock" : (current.meta?.published_by || null),
      last_saved_at: mode === "save" ? nowIso : (current.meta?.last_saved_at || null),
      last_published_at: mode === "publish" ? nowIso : (current.meta?.last_published_at || null),
      updated_at: nowIso
    },
    publish_state: mode === "publish" ? "published" : (current.publish_state || "draft"),
    last_saved_at: mode === "save" ? nowIso : (current.last_saved_at || null),
    last_published_at: mode === "publish" ? nowIso : (current.last_published_at || null),
    updated_at: nowIso
  };
}

function normalizeTemplateDocumentState(nextDocument, fallbackValidation) {
  return {
    ...nextDocument,
    validation: nextDocument?.validation || fallbackValidation,
    status: {
      ...(nextDocument?.status || {}),
      is_publishable: Boolean((nextDocument?.validation || fallbackValidation)?.is_ready_for_publish)
    }
  };
}

function createStatusState(kind = "idle", message = "") {
  return { kind, message };
}

function createPreviewState({
  open = false,
  loading = false,
  payload = null,
  mode = "idle",
  message = ""
} = {}) {
  return { open, loading, payload, mode, message };
}

function validateMasterTemplateDraft(draft) {
  const critical = [];
  const warnings = [];

  if (!normalizeText(draft.identity.master_name)) critical.push("identity.master_name");
  if (!normalizeText(draft.identity.profession)) critical.push("identity.profession");

  const hasHeroAssetId = normalizeText(draft.images.hero.image_asset_id);
  const hasHeroFallback = normalizeText(draft.images.hero.image_url) || normalizeText(draft.images.hero.secure_url);
  if (!hasHeroAssetId && !hasHeroFallback) critical.push("images.hero");

  if (!normalizeText(draft.location.address) && !normalizeText(draft.location.map_url)) {
    critical.push("location.address_or_map_url");
  }

  if (!normalizeText(draft.location.phone) && !normalizeText(draft.location.whatsapp)) {
    critical.push("location.phone_or_whatsapp");
  }

  const hasFeaturedServices = Array.isArray(draft.sections.featured_services) && draft.sections.featured_services.length > 0;
  const hasServiceCatalog = Array.isArray(draft.sections.service_catalog) && draft.sections.service_catalog.length > 0;
  if (!hasFeaturedServices && !hasServiceCatalog) {
    critical.push("sections.featured_services_or_service_catalog");
  }

  const hasAboutParagraphs = Array.isArray(draft.sections.about_paragraphs)
    && draft.sections.about_paragraphs.some((item) => normalizeText(item?.text));
  if (!hasAboutParagraphs) {
    critical.push("sections.about_paragraphs");
  }

  if (!normalizeText(draft.cta.booking_label)) critical.push("cta.booking_label");
  if (!normalizeText(draft.cta.booking_url)) critical.push("cta.booking_url");

  if (!Array.isArray(draft.sections.reviews) || draft.sections.reviews.length === 0) warnings.push("sections.reviews");
  if (!Array.isArray(draft.metrics) || draft.metrics.length === 0) warnings.push("metrics");
  if (!Array.isArray(draft.sections.badges) || draft.sections.badges.length === 0) warnings.push("sections.badges");
  if (!Array.isArray(draft.sections.benefits) || draft.sections.benefits.length === 0) warnings.push("sections.benefits");
  if (!normalizeText(draft.seo.title) && !normalizeText(draft.seo.description)) warnings.push("seo");
  if (!normalizeText(draft.trust.sticky_subline)) warnings.push("trust.sticky_subline");

  const filledSections = [
    draft.identity.master_name,
    draft.identity.profession,
    draft.location.address || draft.location.map_url,
    draft.cta.booking_label,
    hasFeaturedServices || hasServiceCatalog ? "services" : "",
    hasAboutParagraphs ? "about" : ""
  ].filter(Boolean).length;

  return {
    critical,
    warnings,
    hard_errors: critical,
    is_ready_for_publish: critical.length === 0,
    is_publishable: critical.length === 0,
    completeness_score: Math.round((filledSections / 6) * 100)
  };
}

function getAssetPreviewUrl(entity = {}) {
  return entity?.secure_url || entity?.image_secure_url || entity?.image_url || "";
}

function StatusCard({ title, value, note, tone = "neutral" }) {
  const palette = tone === "good"
    ? { border: "#abefc6", bg: "#ecfdf3", value: "#027a48" }
    : tone === "warn"
      ? { border: "#fde68a", bg: "#fffbeb", value: "#b45309" }
      : { border: "#e5e7eb", bg: "#ffffff", value: "#111827" };

  return (
    <div
      style={{
        border: uiTemplate(["1px solid ",""], [palette.border]),
        background: palette.bg,
        borderRadius: "14px",
        padding: "16px"
      }}
    >
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: palette.value }}><UiValue value={value} /></div>
      {note ? (
        <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}><UiValue value={note} /></div>
      ) : null}
    </div>
  );
}

function Panel({ title, note, children, id }) {
  return (
    <div id={id} style={{ scrollMarginTop: "24px" }}>
      <PageSection title={title} description={note}>
        <div style={{ display: "grid", gap: "16px" }}><UiValue value={children} /></div>
      </PageSection>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}><UiValue value={label} /></span>
      <UiValue value={children} />
      {hint ? <span style={{ fontSize: "12px", color: "#6b7280" }}><UiValue value={hint} /></span> : null}
    </label>
  );
}

function UploadInput({ onSelect, disabled = false }) {
  return (
    <label style={uploadFieldStyle}>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}><UiValue value={uiMessage("salon.s0489")} /></span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onSelect(file);
          }
          event.target.value = "";
        }}
        style={{ fontSize: "13px" }}
      />
    </label>
  );
}

function AssetPreview({ title = "Preview", entity = {}, emptyNote = uiMessage("salon.s0488") }) {
  const { renderUi } = useUiMessages();
  const previewUrl = getAssetPreviewUrl(entity);
  const assetId = entity?.image_asset_id || entity?.asset_id || "";

  return (
    <div style={assetPreviewCardStyle}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}><UiValue value={title} /></div>
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={renderUi(entity?.alt || title)} style={assetPreviewImageStyle} />
          <div style={assetPreviewMetaStyle}><UiValue value={assetId || uiMessage("salon.display.assetAttached")} /></div>
        </>
      ) : (
        <div style={assetPreviewEmptyStyle}><UiValue value={emptyNote} /></div>
      )}
    </div>
  );
}

function inputStyle() {
  return {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#111827",
    background: "#ffffff",
    boxSizing: "border-box"
  };
}

function textareaStyle(rows = 4) {
  return {
    ...inputStyle(),
    minHeight: uiTemplate(["","px"], [rows * 24 + 24]),
    resize: "vertical"
  };
}

function ActionButton({ children, onClick, disabled = false, tone = "primary", type = "button" }) {
  const palette = tone === "secondary"
    ? { background: "#ffffff", color: "#111827", border: "#d1d5db" }
    : tone === "danger"
      ? { background: "#111827", color: "#ffffff", border: "#111827" }
      : { background: "#111827", color: "#ffffff", border: "#111827" };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: "40px",
        padding: "0 14px",
        borderRadius: "10px",
        border: uiTemplate(["1px solid ",""], [palette.border]),
        background: disabled ? "#e5e7eb" : palette.background,
        color: disabled ? "#9ca3af" : palette.color,
        fontSize: "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >
      <UiValue value={children} />
    </button>
  );
}

function ArrayCard({ title, note, children, onAdd, addLabel }) {
  return (
    <div style={{ display: "grid", gap: "12px", padding: "16px", borderRadius: "14px", border: "1px solid #e5e7eb", background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: "4px" }}>
          <strong style={{ fontSize: "15px", color: "#111827" }}><UiValue value={title} /></strong>
          {note ? <span style={{ fontSize: "12px", color: "#6b7280" }}><UiValue value={note} /></span> : null}
        </div>
        {onAdd ? <ActionButton tone="secondary" onClick={onAdd}><UiValue value={addLabel} /></ActionButton> : null}
      </div>
      <UiValue value={children} />
    </div>
  );
}

export default function MasterTemplateEditorPage() {
  const { renderUi } = useUiMessages();
  const { slug = "" } = useParams();
  const { master } = useMaster();
  const resolvedSlug = master?.slug || slug;
  const [draft, setDraft] = useState(() => mergeDraft());
  const [documentState, setDocumentState] = useState(null);
  const [previewState, setPreviewState] = useState(() => createPreviewState());
  const [uploadState, setUploadState] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [saveState, setSaveState] = useState({ kind: "idle", message: "" });
  const [publishState, setPublishState] = useState({ kind: "idle", message: "" });

  const hasToken = hasInternalTemplateToken();
  const cloudinaryConfig = getCloudinaryConfig();
  const cloudinaryReady = Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset);

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      if (!resolvedSlug) {
        setPageLoading(false);
        setPageError(uiError("MASTER_SLUG_MISSING"));
        return;
      }

      if (!hasToken) {
        const fallbackDraft = mergeDraft();
        const localValidation = validateMasterTemplateDraft(fallbackDraft);
        const localDocument = buildLocalDocument(null, fallbackDraft, resolvedSlug, "save", localValidation);
        if (cancelled) return;
        setDocumentState(localDocument);
        setDraft(fallbackDraft);
        setPageError(null);
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      setPageError(null);

      const result = await getMasterTemplateDocument(resolvedSlug);
      if (cancelled) return;

      if (!result.ok) {
        setPageError(uiError(extractMessage(result, "MASTER_TEMPLATE_DOCUMENT_FETCH_FAILED")));
        setPageLoading(false);
        return;
      }

      const nextDocument = result.document || null;
      const sourceDraft = nextDocument?.draft || nextDocument?.payload || {};
      setDocumentState(nextDocument);
      setDraft(mergeDraft(sourceDraft));
      setPageLoading(false);
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [hasToken, resolvedSlug]);

  const validation = useMemo(() => validateMasterTemplateDraft(draft), [draft]);
  const hardErrors = Array.isArray(validation.hard_errors) ? validation.hard_errors : [];
  const warnings = Array.isArray(validation.warnings) ? validation.warnings : [];
  const completionScore = Number(validation.completeness_score || 0);
  const lastSavedAt = documentState?.meta?.last_saved_at || documentState?.last_saved_at || null;

  const sectionHealthItems = [
    { label: uiMessage("master.s0331"), value: draft.sections.badges.length },
    { label: uiMessage("salon.s0511"), value: draft.sections.benefits.length },
    { label: uiMessage("master.s0335"), value: draft.metrics.length },
    { label: uiMessage("master.s0357"), value: draft.sections.featured_services.length },
    { label: uiMessage("master.s0358"), value: draft.sections.service_catalog.length },
    { label: uiMessage("salon.s0515"), value: draft.sections.reviews.length }
  ];
  const previewPayload = previewState.payload || {};
  const previewIdentity = useMemo(() => buildContextPreviewIdentity(previewPayload, draft, master), [previewPayload, draft, master]);
  const previewLocation = useMemo(() => buildContextPreviewLocation(previewPayload, draft, master), [previewPayload, draft, master]);
  const previewTrust = useMemo(() => buildContextPreviewTrust(previewPayload, draft, master), [previewPayload, draft, master]);
  const previewStats = useMemo(() => buildContextPreviewStats(previewPayload, draft, master), [previewPayload, draft, master]);
  const previewCta = previewPayload.cta || {};
  const previewSections = previewPayload.sections || {};
  const previewImages = previewPayload.images || {};
  const previewFeaturedServices = Array.isArray(previewSections.featured_services) ? previewSections.featured_services.slice(0, 2) : [];
  const previewServiceCatalog = Array.isArray(previewSections.service_catalog) ? previewSections.service_catalog.slice(0, 2) : [];
  const previewBookingBand = previewSections.booking_band || {};

  function resetStateMessages() {
    setSaveState({ kind: "idle", message: "" });
    setPublishState({ kind: "idle", message: "" });
  }

  function setUploadFlag(key, value) {
    setUploadState((current) => ({ ...current, [key]: { ...value, error: uiError(value.error) } }));
  }

  function setDraftField(section, field, value) {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    resetStateMessages();
  }

  function setNestedDraftField(section, nested, field, value) {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nested]: {
          ...prev[section][nested],
          [field]: value
        }
      }
    }));
    resetStateMessages();
  }

  function applyCloudinaryAssetToRootImage(slot, asset) {
    setDraft((current) => ({
      ...current,
      images: {
        ...(current.images || {}),
        [slot]: {
          ...(current.images?.[slot] || {}),
          image_asset_id: asset.asset_id,
          secure_url: asset.secure_url,
          image_url: asset.secure_url,
          public_id: asset.public_id,
          asset_folder: asset.asset_folder,
          width: asset.width,
          height: asset.height,
          format: asset.format,
          bytes: asset.bytes,
          resource_type: asset.resource_type,
          owner_type: asset.owner_type,
          owner_slug: asset.owner_slug,
          asset_kind: asset.asset_kind
        },
        assets: {
          ...(current.images?.assets || {}),
          [slot]: {
            ...(current.images?.assets?.[slot] || {}),
            ...asset
          }
        }
      }
    }));
    resetStateMessages();
  }

  async function handleRootImageUpload(slot, file) {
    if (!resolvedSlug) return;

    const uploadKey = uiTemplate(["root:",""], [slot]);
    setUploadFlag(uploadKey, { loading: true, error: "" });

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: MASTER_OWNER_TYPE,
        ownerSlug: resolvedSlug,
        assetKind: resolveMasterAssetKind(slot),
        alt: draft.images?.[slot]?.alt || ""
      });
      applyCloudinaryAssetToRootImage(slot, asset);
      setUploadFlag(uploadKey, { loading: false, error: "" });
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" });
    }
  }

  function setArrayItem(sectionKey, index, field, value) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].map((item, itemIndex) => (
          itemIndex === index ? { ...item, [field]: value } : item
        ))
      }
    }));
    resetStateMessages();
  }

  function setMetricItem(index, field, value) {
    setDraft((prev) => ({
      ...prev,
      metrics: prev.metrics.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
    resetStateMessages();
  }

  function setSectionImageArrayItem(sectionKey, index, field, value) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].map((item, itemIndex) => (
          itemIndex === index ? { ...item, [field]: value } : item
        ))
      }
    }));
    resetStateMessages();
  }

  function setImageArrayItem(imageKey, index, field, value) {
    setDraft((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [imageKey]: prev.images[imageKey].map((item, itemIndex) => (
          itemIndex === index ? { ...item, [field]: value } : item
        ))
      }
    }));
    resetStateMessages();
  }

  function setReviewItem(index, field, value) {
    setArrayItem("reviews", index, field, value);
  }

  function setBookingBand(field, value) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        booking_band: {
          ...prev.sections.booking_band,
          [field]: value
        }
      }
    }));
    resetStateMessages();
  }

  function addPrimitiveItem(sectionKey, emptyValue = "") {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: [...prev.sections[sectionKey], emptyValue]
      }
    }));
    resetStateMessages();
  }

  function updatePrimitiveItem(sectionKey, index, value) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].map((item, itemIndex) => itemIndex === index ? value : item)
      }
    }));
    resetStateMessages();
  }

  function removePrimitiveItem(sectionKey, index) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
    resetStateMessages();
  }

  function addObjectItem(sectionKey, factory) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: [...prev.sections[sectionKey], factory()]
      }
    }));
    resetStateMessages();
  }

  function removeObjectItem(sectionKey, index) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
    resetStateMessages();
  }

  function addMetric() {
    setDraft((prev) => ({
      ...prev,
      metrics: [...prev.metrics, { id: getItemKey("metric"), value: "", label: "" }]
    }));
    resetStateMessages();
  }

  function removeMetric(index) {
    setDraft((prev) => ({
      ...prev,
      metrics: prev.metrics.filter((_, itemIndex) => itemIndex !== index)
    }));
    resetStateMessages();
  }

  function addImageItem(imageKey) {
    setDraft((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [imageKey]: [...prev.images[imageKey], { id: getItemKey(imageKey), image_asset_id: "", image_url: "", secure_url: "", public_id: "", alt: "" }]
      }
    }));
    resetStateMessages();
  }

  function removeImageItem(imageKey, index) {
    setDraft((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [imageKey]: prev.images[imageKey].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
    resetStateMessages();
  }

  function addPortfolioItem() {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        portfolio: [
          ...prev.sections.portfolio,
          {
            id: getItemKey("portfolio"),
            image_asset_id: "",
            image_url: "",
            secure_url: "",
            public_id: "",
            alt: "",
            is_active: true,
            slot_index: prev.sections.portfolio.length
          }
        ]
      }
    }));
    resetStateMessages();
  }

  function removePortfolioItem(index) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        portfolio: prev.sections.portfolio.filter((_, itemIndex) => itemIndex !== index)
      }
    }));
    resetStateMessages();
  }

  function addAboutParagraph() {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        about_paragraphs: [
          ...prev.sections.about_paragraphs,
          {
            id: getItemKey("about"),
            text: "",
            is_active: true
          }
        ]
      }
    }));
    resetStateMessages();
  }

  function updateAboutParagraph(index, field, value) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        about_paragraphs: prev.sections.about_paragraphs.map((item, itemIndex) => (
          itemIndex === index ? { ...item, [field]: value } : item
        ))
      }
    }));
    resetStateMessages();
  }

  function removeAboutParagraph(index) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        about_paragraphs: prev.sections.about_paragraphs.filter((_, itemIndex) => itemIndex !== index)
      }
    }));
    resetStateMessages();
  }

  async function handleImageArrayUpload(imageKey, index, file) {
    if (!resolvedSlug) return;

    const uploadKey = uiTemplate(["",":",""], [imageKey, index]);
    setUploadFlag(uploadKey, { loading: true, error: "" });

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: MASTER_OWNER_TYPE,
        ownerSlug: resolvedSlug,
        assetKind: resolveMasterAssetKind(imageKey),
        alt: draft.images?.[imageKey]?.[index]?.alt || ""
      });

      setDraft((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          [imageKey]: prev.images[imageKey].map((item, itemIndex) => (
            itemIndex === index
              ? {
                  ...item,
                  image_asset_id: asset.asset_id,
                  image_url: asset.secure_url,
                  secure_url: asset.secure_url,
                  public_id: asset.public_id
                }
              : item
          ))
        }
      }));
      setUploadFlag(uploadKey, { loading: false, error: "" });
      resetStateMessages();
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" });
    }
  }

  async function handlePortfolioUpload(index, file) {
    if (!resolvedSlug) return;

    const uploadKey = uiTemplate(["portfolio:",""], [index]);
    setUploadFlag(uploadKey, { loading: true, error: "" });

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: MASTER_OWNER_TYPE,
        ownerSlug: resolvedSlug,
        assetKind: resolveMasterAssetKind("portfolio"),
        alt: draft.sections.portfolio?.[index]?.alt || ""
      });

      setDraft((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          portfolio: prev.sections.portfolio.map((item, itemIndex) => (
            itemIndex === index
              ? {
                  ...item,
                  image_asset_id: asset.asset_id,
                  image_url: asset.secure_url,
                  secure_url: asset.secure_url,
                  public_id: asset.public_id
                }
              : item
          ))
        }
      }));
      setUploadFlag(uploadKey, { loading: false, error: "" });
      resetStateMessages();
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" });
    }
  }

  async function persistDraft(nextDraft) {
    const validationResult = validateMasterTemplateDraft(nextDraft);

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, resolvedSlug, "save", validationResult);
      setDocumentState(nextDocument);
      setDraft(mergeDraft(nextDocument.draft || nextDraft));
      setSaveState({
        kind: "success",
        message: validationResult.is_ready_for_publish
          ? uiMessage("master.s0359")
          : uiMessage("master.s0360")
      });
      return { ok: true, document: nextDocument, validation: validationResult, mode: "mock" };
    }

    const result = await saveMasterTemplateDraft(nextDraft, resolvedSlug);

    if (!result.ok) {
      const message = extractMessage(result, "MASTER_TEMPLATE_DRAFT_SAVE_FAILED");
      setSaveState(createStatusState("error", message));
      return { ok: false, error: message };
    }

    const nextDocument = result.document || null;
    setDocumentState({
      ...nextDocument,
      validation: nextDocument?.validation || validationResult,
      status: {
        ...(nextDocument?.status || {}),
        is_publishable: Boolean((nextDocument?.validation || validationResult)?.is_ready_for_publish)
      }
    });
    setDraft(mergeDraft(nextDocument?.draft || nextDraft));
    setSaveState(createStatusState("success", uiMessage("master.s0361")));
    return { ok: true, document: nextDocument, validation: nextDocument?.validation || validationResult, mode: "backend" };
  }

  async function handleSaveDraft() {
    if (!resolvedSlug) return;
    setSaveState({ kind: "saving", message: uiMessage("salon.s0499") });
    setPublishState({ kind: "idle", message: "" });
    await persistDraft(draft);
  }

  async function handleOpenPreview() {
    if (!resolvedSlug) return;

    setPreviewState({
      open: true,
      loading: true,
      payload: null,
      mode: "loading",
      message: uiMessage("master.s0363")
    });

    const saveResult = await persistDraft(draft);
    if (!saveResult.ok) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(draft, resolvedSlug),
        mode: "fallback",
        message: uiError(saveResult.error || uiMessage("master.s0364"))
      });
      return;
    }

    if (!hasToken) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(draft, resolvedSlug),
        mode: "mock",
        message: uiMessage("salon.s0490")
      });
      return;
    }

    const result = await getMasterTemplatePreview(resolvedSlug);

    if (!result.ok) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(draft, resolvedSlug),
        mode: "fallback",
        message: extractMessage(result, uiMessage("master.s0366"))
      });
      return;
    }

    setPreviewState({
      open: true,
      loading: false,
      payload: result.payload || buildPreviewPayload(draft, resolvedSlug),
      mode: "backend",
      message: result.is_ready_for_preview ? uiMessage("salon.s0495") : uiMessage("master.s0368")
    });
  }

  function handleClosePreview() {
    setPreviewState(createPreviewState());
  }

  async function handlePublish() {
    if (!resolvedSlug) return;

    const liveValidation = validateMasterTemplateDraft(draft);
    if (!liveValidation.is_ready_for_publish) {
      const nextDocument = buildLocalDocument(documentState, draft, resolvedSlug, "save", liveValidation);
      setDocumentState(nextDocument);
      setPublishState({
        kind: "error",
        message: uiMessage("master.s0369")
      });
      return;
    }

    setPublishState(createStatusState("publishing", uiMessage("salon.s0503")));
    const saveResult = await persistDraft(draft);

    if (!saveResult.ok) {
      setPublishState({
        kind: "error",
        message: uiError(saveResult.error || "DRAFT_SAVE_BEFORE_PUBLISH_FAILED")
      });
      return;
    }

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, draft, resolvedSlug, "publish", liveValidation);
      setDocumentState(nextDocument);
      setDraft(mergeDraft(nextDocument.draft || draft));
      setPublishState({
        kind: "success",
        message: uiMessage("master.s0371")
      });
      return;
    }

    const result = await publishMasterTemplate(resolvedSlug, "system:1");

    if (!result.ok) {
      setPublishState({
        kind: "error",
        message: extractMessage(result, "MASTER_TEMPLATE_PUBLISH_FAILED")
      });
      return;
    }

    const rereadResult = await getMasterTemplateDocument(resolvedSlug);
    const nextDocument = rereadResult.ok
      ? (rereadResult.document || result.document || null)
      : (result.document || null);
    const nextDraft = nextDocument?.draft || nextDocument?.payload || draft;
    setDocumentState({
      ...nextDocument,
      validation: nextDocument?.validation || liveValidation,
      status: {
        ...(nextDocument?.status || {}),
        is_publishable: Boolean((nextDocument?.validation || liveValidation)?.is_ready_for_publish)
      }
    });
    setDraft(mergeDraft(nextDraft));
    setPublishState({ kind: "success", message: uiMessage("master.s0372") });
    setSaveState({ kind: "idle", message: "" });
  }

  const previewPath = uiTemplate(["/preview/master/",""], [resolvedSlug]);
  const publicPath = uiTemplate(["/master/",""], [resolvedSlug]);
  const blockTone = pageError ? "warn" : hasToken ? "good" : "neutral";
  const blockValue = pageLoading ? uiMessage("salon.s0505") : pageError ? uiMessage("salon.s0506") : hasToken ? uiMessage("salon.s0507") : uiMessage("salon.s0508");
  const blockNote = pageError
    ? pageError
    : hasToken
      ? uiMessage("master.s0376")
      : uiMessage("master.s0377");

  return (
    <div style={{ display: "grid", gap: "20px", padding: "24px", width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box" }}>
      <PageHeader
        title={uiMessage("master.s0378")}
        subtitle={uiMessage("master.s0379", {p0: resolvedSlug ? uiTemplate([" · ",""], [resolvedSlug]) : ""})}
        actions={(
          <>
            <ActionButton tone="secondary" onClick={handleSaveDraft} disabled={!resolvedSlug || pageLoading || saveState.kind === "saving"}>
              <UiValue value={saveState.kind === "saving" ? uiMessage("salon.s0519") : uiMessage("salon.s0520")} />
            </ActionButton>
            <ActionButton tone="secondary" onClick={handleOpenPreview} disabled={!resolvedSlug || pageLoading}><UiValue value={uiMessage("master.s0381")} /></ActionButton>
            <ActionButton onClick={handlePublish} disabled={!resolvedSlug || pageLoading || publishState.kind === "publishing"}>
              <UiValue value={publishState.kind === "publishing" ? uiMessage("salon.s0522") : uiMessage("salon.s0523")} />
            </ActionButton>
          </>
        )}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box"
      }}>
        <StatusCard title={uiMessage("salon.s0524")} value={blockValue} note={blockNote} tone={blockTone} />
        <StatusCard title={uiMessage("salon.s0525")} value={resolvedSlug || "—"} note={uiMessage("master.s0386")} />
        <StatusCard title={uiMessage("salon.s0527")} value={validation.is_ready_for_publish ? uiMessage("salon.s0507") : uiMessage("salon.s0528")} note={uiMessage("salon.s0529", {p0: hardErrors.length, p1: warnings.length})} tone={validation.is_ready_for_publish ? "good" : "warn"} />
        <StatusCard title={uiMessage("salon.s0530")} value={uiTemplate(["","%"], [completionScore])} note={lastSavedAt ? uiMessage("salon.s0531", {p0: uiDate(lastSavedAt, { dateStyle: "short", timeStyle: "short" })}) : uiMessage("salon.s0532")} />
      </div>

      {!hasToken ? (
        <PageSection title={uiMessage("salon.s0508")} subtitle={uiMessage("salon.s0533")}>
          <div style={infoBoxStyle}><UiValue value={uiMessage("master.s0394")} /></div>
        </PageSection>
      ) : null}

      <PageSection title={uiMessage("salon.s0535")} subtitle={uiMessage("master.s0396")}>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            minWidth: 0,
            maxWidth: "100%",
            boxSizing: "border-box"
          }}>
            <StatusCard title={uiMessage("salon.s0537")} value={cloudinaryConfig.cloudName || uiMessage("salon.display.missing")} tone={cloudinaryConfig.cloudName ? "good" : "warn"} />
            <StatusCard title={uiMessage("salon.s0538")} value={cloudinaryConfig.uploadPreset || uiMessage("salon.display.missing")} tone={cloudinaryConfig.uploadPreset ? "good" : "warn"} />
            <StatusCard title={uiMessage("salon.s0539")} value={cloudinaryConfig.rootFolder} note={uiMessage("salon.s0540", {p0: cloudinaryConfig.rootFolder, p1: MASTER_OWNER_TYPE})} tone="neutral" />
            <StatusCard title={uiMessage("salon.s0541")} value={cloudinaryReady ? uiMessage("salon.display.ready") : uiMessage("salon.display.blocked")} note={cloudinaryReady ? uiMessage("master.s0402") : uiMessage("salon.s0543")} tone={cloudinaryReady ? "good" : "warn"} />
          </div>
        </div>
      </PageSection>

      <PageSection title={uiMessage("salon.s0544")} subtitle={uiMessage("master.s0405")}>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            minWidth: 0,
            maxWidth: "100%",
            boxSizing: "border-box"
          }}>
            <StatusCard title={uiMessage("salon.s0546")} value={validation.is_ready_for_publish ? uiMessage("salon.display.ready") : uiMessage("salon.display.blocked")} note={uiMessage("master.s0407")} tone={validation.is_ready_for_publish ? "good" : "warn"} />
            <StatusCard title={uiMessage("salon.s0548")} value={String(hardErrors.length)} note={uiMessage("salon.s0549")} tone={hardErrors.length ? "warn" : "good"} />
            <StatusCard title={uiMessage("salon.s0550")} value={String(warnings.length)} note={uiMessage("master.s0411")} tone={warnings.length ? "warn" : "good"} />
            <StatusCard title={uiMessage("salon.s0552")} value={uiTemplate(["","/6"], [sectionHealthItems.filter((item) => item.value > 0).length])} note={uiMessage("salon.s0553")} tone="neutral" />
          </div>

          {hardErrors.length ? (
            <div style={warningBoxStyle}>
              <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px" }}><UiValue value={uiMessage("salon.s0554")} /></div>
              <div style={{ display: "grid", gap: "8px" }}>
                {hardErrors.map((item, index) => (
                  <div key={index} style={validationLineStyle}>• <UiValue value={validationLabel(item)} /></div>
                ))}
              </div>
            </div>
          ) : (
            <div style={successBoxStyle}><UiValue value={uiMessage("salon.s0556")} /></div>
          )}

          {warnings.length ? (
            <div style={infoBoxStyle}>
              <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px", color: "#111827" }}><UiValue value={uiMessage("salon.s0550")} /></div>
              <div style={{ display: "grid", gap: "8px" }}>
                {warnings.map((item, index) => (
                  <div key={index} style={validationLineStyle}>• <UiValue value={validationLabel(item)} /></div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </PageSection>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", alignItems: "start", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
        <aside style={{ position: "sticky", top: "24px", display: "grid", gap: "12px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
          <div style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", background: "#ffffff" }}>
            <div style={{ display: "grid", gap: "10px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
              <strong style={{ fontSize: "15px", color: "#111827" }}><UiValue value={uiMessage("master.s0416")} /></strong>
              {sectionItems.map((item) => (
                <a
                  key={item.id}
                  href={uiTemplate(["#",""], [item.id])}
                  style={{ textDecoration: "none", color: "#111827", display: "grid", gap: "2px" }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600 }}><UiValue value={item.label} /></span>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}><UiValue value={item.note} /></span>
                </a>
              ))}
            </div>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", background: "#ffffff", display: "grid", gap: "10px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
            <strong style={{ fontSize: "15px", color: "#111827" }}><UiValue value={uiMessage("master.s0417")} /></strong>
            <ActionButton onClick={handleSaveDraft} disabled={!resolvedSlug || pageLoading || saveState.kind === "saving"}>
              <UiValue value={saveState.kind === "saving" ? uiMessage("master.s0418") : uiMessage("salon.s0520")} />
            </ActionButton>
            <ActionButton tone="secondary" onClick={handleOpenPreview} disabled={!resolvedSlug || pageLoading}><UiValue value={uiMessage("master.s0381")} /></ActionButton>
            <ActionButton onClick={handlePublish} disabled={!resolvedSlug || pageLoading || publishState.kind === "publishing" || !validation.is_ready_for_publish}>
              <UiValue value={publishState.kind === "publishing" ? uiMessage("master.s0419") : "Publish"} />
            </ActionButton>
            <Link to={publicPath} style={{ color: "#111827", fontSize: "13px", fontWeight: 600 }}><UiValue value={uiMessage("master.s0420")} /></Link>
            <Link to={previewPath} style={{ color: "#111827", fontSize: "13px", fontWeight: 600 }}><UiValue value={uiMessage("master.s0421")} /></Link>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", background: "#ffffff", display: "grid", gap: "8px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
            <strong style={{ fontSize: "15px", color: "#111827" }}><UiValue value={uiMessage("master.s0422")} /></strong>
            <div style={{ fontSize: "13px", color: "#111827" }}><UiValue value={uiMessage("master.s0423")} /></div>
            {hardErrors.length ? hardErrors.map((item) => (
              <span key={item} style={{ fontSize: "12px", color: "#991b1b" }}><UiValue value={validationLabel(item)} /></span>
            )) : <span style={{ fontSize: "12px", color: "#065f46" }}><UiValue value={uiMessage("master.s0424")} /></span>}
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#111827" }}><UiValue value={uiMessage("salon.s0550")} /></div>
            {warnings.length ? warnings.map((item) => (
              <span key={item} style={{ fontSize: "12px", color: "#92400e" }}><UiValue value={validationLabel(item)} /></span>
            )) : <span style={{ fontSize: "12px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0425")} /></span>}
          </div>
        </aside>

        <div style={{ display: "grid", gap: "20px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
          <Panel id="identity" title={uiMessage("salon.s0681")} note={uiMessage("master.s0426")}>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
              <Field label={uiMessage("salon.s0439")}><input value={draft.identity.master_name} onChange={(e) => setDraftField("identity", "master_name", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0428")}><input value={draft.identity.profession} onChange={(e) => setDraftField("identity", "profession", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("salon.s0571")}><input value={draft.identity.city} onChange={(e) => setDraftField("identity", "city", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0430")}><input value={draft.identity.hero_badge} onChange={(e) => setDraftField("identity", "hero_badge", e.target.value)} style={inputStyle()} /></Field>
            </div>
          </Panel>

          <Panel id="hero" title={uiMessage("master.s0325")} note={uiMessage("master.s0431")}>
            <Field label={uiMessage("master.s0432")}><input value={draft.identity.subtitle} onChange={(e) => setDraftField("identity", "subtitle", e.target.value)} style={inputStyle()} /></Field>
            <Field label={uiMessage("master.s0433")}><textarea value={draft.identity.description} onChange={(e) => setDraftField("identity", "description", e.target.value)} style={textareaStyle(5)} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", alignItems: "start", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "grid", gap: "14px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                <Field label={uiMessage("salon.s0580")} hint={uiMessage("master.s0435")}><input value={draft.images.hero.image_asset_id} onChange={(e) => setNestedDraftField("images", "hero", "image_asset_id", e.target.value)} style={inputStyle()} /></Field>
                <Field label={uiMessage("master.s0436")} hint={uiMessage("master.s0437")}><input value={draft.images.hero.image_url} onChange={(e) => setNestedDraftField("images", "hero", "image_url", e.target.value)} style={inputStyle()} /></Field>
                <Field label={uiMessage("salon.s0582")}><input value={draft.images.hero.alt} onChange={(e) => setNestedDraftField("images", "hero", "alt", e.target.value)} style={inputStyle()} /></Field>
                <UploadInput onSelect={(file) => handleRootImageUpload("hero", file)} disabled={!cloudinaryReady || !resolvedSlug || uploadState["root:hero"]?.loading} />
                {uploadState["root:hero"]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState["root:hero"].error} /></div> : null}
              </div>
              <AssetPreview title={uiMessage("salon.s0584")} entity={draft.images.hero || {}} emptyNote={uiMessage("salon.s0585")} />
            </div>
          </Panel>

          <Panel id="contacts" title={uiMessage("master.s0327")} note={uiMessage("master.s0441")}>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
              <Field label={uiMessage("salon.s0567")}><input value={draft.location.address} onChange={(e) => setDraftField("location", "address", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("salon.s0569")}><input value={draft.location.district} onChange={(e) => setDraftField("location", "district", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("salon.s0571")}><input value={draft.location.city} onChange={(e) => setDraftField("location", "city", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("salon.s0575")}><input value={draft.location.schedule_text} onChange={(e) => setDraftField("location", "schedule_text", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("salon.s0230")}><input value={draft.location.phone} onChange={(e) => setDraftField("location", "phone", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("salon.s0574")}><input value={draft.location.whatsapp} onChange={(e) => setDraftField("location", "whatsapp", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0445")}><input value={draft.location.instagram} onChange={(e) => setDraftField("location", "instagram", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0446")}><input value={draft.location.telegram} onChange={(e) => setDraftField("location", "telegram", e.target.value)} style={inputStyle()} /></Field>
            </div>
            <Field label={uiMessage("master.s0447")}><input value={draft.location.map_url} onChange={(e) => setDraftField("location", "map_url", e.target.value)} style={inputStyle()} /></Field>
          </Panel>

          <Panel id="trust" title={uiMessage("salon.s0686")} note={uiMessage("master.s0448")}>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
              <Field label={uiMessage("master.s0449")}><input value={draft.trust.rating_value} onChange={(e) => setDraftField("trust", "rating_value", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0450")}><input value={draft.trust.review_count} onChange={(e) => setDraftField("trust", "review_count", e.target.value)} style={inputStyle()} /></Field>
            </div>
            <Field label={uiMessage("master.s0451")}><textarea value={draft.trust.trust_note} onChange={(e) => setDraftField("trust", "trust_note", e.target.value)} style={textareaStyle(3)} /></Field>
            <Field label={uiMessage("master.s0452")}><input value={draft.trust.sticky_subline} onChange={(e) => setDraftField("trust", "sticky_subline", e.target.value)} style={inputStyle()} /></Field>
          </Panel>

          <Panel id="badges" title={uiMessage("master.s0331")} note={uiMessage("master.s0453")}>
            <ArrayCard title={uiMessage("master.s0331")} note={uiMessage("master.s0454")} onAdd={() => addPrimitiveItem("badges", "")} addLabel={uiMessage("master.s0455")}>
              {draft.sections.badges.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
              {draft.sections.badges.map((item, index) => (
                <div key={uiTemplate(["badge_",""], [index])} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                  <input value={item} onChange={(e) => updatePrimitiveItem("badges", index, e.target.value)} style={inputStyle()} />
                  <ActionButton tone="secondary" onClick={() => removePrimitiveItem("badges", index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="benefits" title={uiMessage("salon.s0511")} note={uiMessage("master.s0334")}>
            <ArrayCard title={uiMessage("salon.s0511")} note={uiMessage("master.s0457")} onAdd={() => addObjectItem("benefits", () => ({ id: getItemKey("benefit"), title: "", text: "" }))} addLabel={uiMessage("master.s0458")}>
              {draft.sections.benefits.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
              {draft.sections.benefits.map((item, index) => (
                <div key={item.id || uiTemplate(["benefit_",""], [index])} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <Field label={uiMessage("master.s0459")}><input value={item.title || ""} onChange={(e) => setArrayItem("benefits", index, "title", e.target.value)} style={inputStyle()} /></Field>
                  <Field label={uiMessage("master.s0460")}><textarea value={item.text || ""} onChange={(e) => setArrayItem("benefits", index, "text", e.target.value)} style={textareaStyle(3)} /></Field>
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("benefits", index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="metrics" title={uiMessage("master.s0335")} note={uiMessage("master.s0461")}>
            <ArrayCard title={uiMessage("master.s0335")} note={uiMessage("master.s0462")} onAdd={addMetric} addLabel={uiMessage("master.s0463")}>
              {draft.metrics.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
              {draft.metrics.map((item, index) => (
                <div key={item.id || uiTemplate(["metric_",""], [index])} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                  <input placeholder={renderUi(uiMessage("master.s0464"))} value={item.value || ""} onChange={(e) => setMetricItem(index, "value", e.target.value)} style={inputStyle()} />
                  <input placeholder={renderUi(uiMessage("master.s0465"))} value={item.label || ""} onChange={(e) => setMetricItem(index, "label", e.target.value)} style={inputStyle()} />
                  <ActionButton tone="secondary" onClick={() => removeMetric(index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="featured-services" title={uiMessage("master.s0337")} note={uiMessage("master.s0466")}>
            <ArrayCard title={uiMessage("master.s0467")} note={uiMessage("master.s0468")} onAdd={() => addObjectItem("featured_services", () => ({ id: getItemKey("featured_service"), title: "", price: "", time: "", note: "" }))} addLabel={uiMessage("salon.s0601")}>
              {draft.sections.featured_services.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
              {draft.sections.featured_services.map((item, index) => (
                <div key={item.id || uiTemplate(["featured_service_",""], [index])} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                    <input placeholder={renderUi(uiMessage("master.s0459"))} value={item.title || ""} onChange={(e) => setArrayItem("featured_services", index, "title", e.target.value)} style={inputStyle()} />
                    <input placeholder={renderUi(uiMessage("master.s0469"))} value={item.price || ""} onChange={(e) => setArrayItem("featured_services", index, "price", e.target.value)} style={inputStyle()} />
                    <input placeholder={renderUi(uiMessage("master.s0470"))} value={item.time || ""} onChange={(e) => setArrayItem("featured_services", index, "time", e.target.value)} style={inputStyle()} />
                  </div>
                  <textarea placeholder={renderUi(uiMessage("master.s0471"))} value={item.note || ""} onChange={(e) => setArrayItem("featured_services", index, "note", e.target.value)} style={textareaStyle(3)} />
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("featured_services", index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="catalog" title={uiMessage("master.s0339")} note={uiMessage("master.s0472")}>
            <ArrayCard title={uiMessage("master.s0473")} note={uiMessage("master.s0474")} onAdd={() => addObjectItem("service_catalog", () => ({ id: getItemKey("service_catalog"), name: "", price: "", duration: "", description: "" }))} addLabel={uiMessage("master.s0475")}>
              {draft.sections.service_catalog.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
              {draft.sections.service_catalog.map((item, index) => (
                <div key={item.id || uiTemplate(["service_catalog_",""], [index])} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                    <input placeholder={renderUi(uiMessage("master.s0476"))} value={item.name || ""} onChange={(e) => setArrayItem("service_catalog", index, "name", e.target.value)} style={inputStyle()} />
                    <input placeholder={renderUi(uiMessage("master.s0469"))} value={item.price || ""} onChange={(e) => setArrayItem("service_catalog", index, "price", e.target.value)} style={inputStyle()} />
                    <input placeholder={renderUi(uiMessage("master.s0477"))} value={item.duration || ""} onChange={(e) => setArrayItem("service_catalog", index, "duration", e.target.value)} style={inputStyle()} />
                  </div>
                  <textarea placeholder={renderUi(uiMessage("master.s0478"))} value={item.description || ""} onChange={(e) => setArrayItem("service_catalog", index, "description", e.target.value)} style={textareaStyle(3)} />
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("service_catalog", index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="reviews" title={uiMessage("salon.s0515")} note={uiMessage("salon.s0474")}>
            <ArrayCard title={uiMessage("salon.s0515")} note={uiMessage("master.s0479")} onAdd={() => addObjectItem("reviews", () => ({ id: getItemKey("review"), name: "", text: "", rating: "" }))} addLabel={uiMessage("salon.s0642")}>
              {draft.sections.reviews.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
              {draft.sections.reviews.map((item, index) => (
                <div key={item.id || uiTemplate(["review_",""], [index])} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                    <input placeholder={renderUi(uiMessage("master.s0476"))} value={item.name || ""} onChange={(e) => setReviewItem(index, "name", e.target.value)} style={inputStyle()} />
                    <input placeholder={renderUi(uiMessage("master.s0481"))} value={item.rating || ""} onChange={(e) => setReviewItem(index, "rating", e.target.value)} style={inputStyle()} />
                  </div>
                  <textarea placeholder={renderUi(uiMessage("master.s0460"))} value={item.text || ""} onChange={(e) => setReviewItem(index, "text", e.target.value)} style={textareaStyle(3)} />
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("reviews", index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="about" title={uiMessage("master.s0343")} note={uiMessage("master.s0482")}>
            <ArrayCard title={uiMessage("master.s0483")} note={uiMessage("master.s0484")} onAdd={addAboutParagraph} addLabel={uiMessage("master.s0485")}>
              {draft.sections.about_paragraphs.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
              {draft.sections.about_paragraphs.map((item, index) => (
                <div key={item.id || uiTemplate(["about_",""], [index])} style={{ display: "grid", gap: "10px" }}>
                  <textarea value={item.text || ""} onChange={(e) => updateAboutParagraph(index, "text", e.target.value)} style={textareaStyle(4)} />
                  <div><ActionButton tone="secondary" onClick={() => removeAboutParagraph(index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="stats" title={uiMessage("master.s0345")} note={uiMessage("master.s0486")}>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
              <Field label={uiMessage("master.s0487")}><input value={draft.stats.years} onChange={(e) => setDraftField("stats", "years", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0481")}><input value={draft.stats.rating} onChange={(e) => setDraftField("stats", "rating", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("salon.s0731")}><input value={draft.stats.bookings} onChange={(e) => setDraftField("stats", "bookings", e.target.value)} style={inputStyle()} /></Field>
            </div>
          </Panel>

          <Panel id="images" title={uiMessage("master.s0347")} note={uiMessage("master.s0489")}>
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={nestedCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", alignItems: "start", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                  <div style={{ display: "grid", gap: "14px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                    <Field label={uiMessage("salon.s0657")}><input value={draft.images.avatar.image_asset_id} onChange={(e) => setNestedDraftField("images", "avatar", "image_asset_id", e.target.value)} style={inputStyle()} /></Field>
                    <Field label={uiMessage("master.s0491")}><input value={draft.images.avatar.image_url} onChange={(e) => setNestedDraftField("images", "avatar", "image_url", e.target.value)} style={inputStyle()} /></Field>
                    <Field label={uiMessage("master.s0492")}><input value={draft.images.avatar.alt} onChange={(e) => setNestedDraftField("images", "avatar", "alt", e.target.value)} style={inputStyle()} /></Field>
                    <UploadInput onSelect={(file) => handleRootImageUpload("avatar", file)} disabled={!cloudinaryReady || !resolvedSlug || uploadState["root:avatar"]?.loading} />
                    {uploadState["root:avatar"]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState["root:avatar"].error} /></div> : null}
                  </div>
                  <AssetPreview title={uiMessage("master.s0493")} entity={draft.images.avatar || {}} emptyNote={uiMessage("master.s0494")} />
                </div>
              </div>

              <ArrayCard title={uiMessage("master.s0495")} note={uiMessage("master.s0496")} onAdd={addPortfolioItem} addLabel={uiMessage("master.s0497")}>
                {draft.sections.portfolio.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
                {draft.sections.portfolio.map((item, index) => (
                  <div key={item.id || uiTemplate(["portfolio_",""], [index])} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", alignItems: "start", padding: "12px", borderRadius: "12px", border: "1px solid #e5e7eb", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "grid", gap: "10px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                      <input placeholder={renderUi(uiMessage("master.s0498"))} value={item.image_asset_id || ""} onChange={(e) => setSectionImageArrayItem("portfolio", index, "image_asset_id", e.target.value)} style={inputStyle()} />
                      <input placeholder={renderUi(uiMessage("master.s0499"))} value={item.image_url || ""} onChange={(e) => setSectionImageArrayItem("portfolio", index, "image_url", e.target.value)} style={inputStyle()} />
                      <input placeholder={renderUi(uiMessage("master.s0500"))} value={item.alt || ""} onChange={(e) => setSectionImageArrayItem("portfolio", index, "alt", e.target.value)} style={inputStyle()} />
                      <UploadInput onSelect={(file) => handlePortfolioUpload(index, file)} disabled={!cloudinaryReady || !resolvedSlug || uploadState[uiTemplate(["portfolio:",""], [index])]?.loading} />
                      {uploadState[uiTemplate(["portfolio:",""], [index])]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState[uiTemplate(["portfolio:",""], [index])].error} /></div> : null}
                      <div><ActionButton tone="secondary" onClick={() => removePortfolioItem(index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton></div>
                    </div>
                    <AssetPreview title={uiMessage("master.s0501")} entity={item} emptyNote={uiMessage("master.s0502")} />
                  </div>
                ))}
              </ArrayCard>

              <ArrayCard title={uiMessage("master.s0503")} note={uiMessage("master.s0504")} onAdd={() => addImageItem("service_card")} addLabel={uiMessage("master.s0505")}>
                {draft.images.service_card.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("master.s0456")} /></span> : null}
                {draft.images.service_card.map((item, index) => (
                  <div key={item.id || uiTemplate(["service_card_",""], [index])} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", alignItems: "start", padding: "12px", borderRadius: "12px", border: "1px solid #e5e7eb", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "grid", gap: "10px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                      <input placeholder={renderUi(uiMessage("master.s0498"))} value={item.image_asset_id || ""} onChange={(e) => setImageArrayItem("service_card", index, "image_asset_id", e.target.value)} style={inputStyle()} />
                      <input placeholder={renderUi(uiMessage("master.s0499"))} value={item.image_url || ""} onChange={(e) => setImageArrayItem("service_card", index, "image_url", e.target.value)} style={inputStyle()} />
                      <input placeholder={renderUi(uiMessage("master.s0500"))} value={item.alt || ""} onChange={(e) => setImageArrayItem("service_card", index, "alt", e.target.value)} style={inputStyle()} />
                      <UploadInput onSelect={(file) => handleImageArrayUpload("service_card", index, file)} disabled={!cloudinaryReady || !resolvedSlug || uploadState[uiTemplate(["service_card:",""], [index])]?.loading} />
                      {uploadState[uiTemplate(["service_card:",""], [index])]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState[uiTemplate(["service_card:",""], [index])].error} /></div> : null}
                      <div><ActionButton tone="secondary" onClick={() => removeImageItem("service_card", index)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton></div>
                    </div>
                    <AssetPreview title={uiMessage("master.s0506")} entity={item} emptyNote={uiMessage("master.s0507")} />
                  </div>
                ))}
              </ArrayCard>
            </div>
          </Panel>

          <Panel id="cta" title={uiMessage("salon.s0480")} note={uiMessage("master.s0508")}>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
              <Field label={uiMessage("master.s0509")}><input value={draft.cta.booking_label} onChange={(e) => setDraftField("cta", "booking_label", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0510")}><input value={draft.cta.booking_url} onChange={(e) => setDraftField("cta", "booking_url", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0511")}><input value={draft.cta.services_label} onChange={(e) => setDraftField("cta", "services_label", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0512")}><input value={draft.cta.services_anchor} onChange={(e) => setDraftField("cta", "services_anchor", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0513")}><input value={draft.cta.contact_map_label} onChange={(e) => setDraftField("cta", "contact_map_label", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0514")}><input value={draft.cta.sticky_label} onChange={(e) => setDraftField("cta", "sticky_label", e.target.value)} style={inputStyle()} /></Field>
            </div>

            <ArrayCard title={uiMessage("master.s0515")} note={uiMessage("master.s0516")}>
              <div style={{ display: "grid", gap: "10px" }}>
                <input placeholder={renderUi(uiMessage("master.s0517"))} value={draft.sections.booking_band.title} onChange={(e) => setBookingBand("title", e.target.value)} style={inputStyle()} />
                <textarea placeholder={renderUi(uiMessage("master.s0518"))} value={draft.sections.booking_band.text} onChange={(e) => setBookingBand("text", e.target.value)} style={textareaStyle(3)} />
                <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                  <input placeholder={renderUi(uiMessage("master.s0519"))} value={draft.sections.booking_band.booking_cta_label} onChange={(e) => setBookingBand("booking_cta_label", e.target.value)} style={inputStyle()} />
                  <input placeholder={renderUi(uiMessage("master.s0520"))} value={draft.sections.booking_band.booking_cta_url} onChange={(e) => setBookingBand("booking_cta_url", e.target.value)} style={inputStyle()} />
                  <input placeholder={renderUi(uiMessage("master.s0521"))} value={draft.sections.booking_band.services_cta_label} onChange={(e) => setBookingBand("services_cta_label", e.target.value)} style={inputStyle()} />
                  <input placeholder={renderUi(uiMessage("master.s0512"))} value={draft.sections.booking_band.services_anchor} onChange={(e) => setBookingBand("services_anchor", e.target.value)} style={inputStyle()} />
                </div>
              </div>
            </ArrayCard>
          </Panel>

          <Panel id="seo" title={uiMessage("salon.s0482")} note={uiMessage("master.s0522")}>
            <div style={{ display: "grid", gap: "16px" }}>
              <Field label={uiMessage("master.s0523")}><input value={draft.seo.title} onChange={(e) => setDraftField("seo", "title", e.target.value)} style={inputStyle()} /></Field>
              <Field label={uiMessage("master.s0524")}><textarea value={draft.seo.description} onChange={(e) => setDraftField("seo", "description", e.target.value)} style={textareaStyle(3)} /></Field>
              <Field label={uiMessage("master.s0525")}><input value={draft.seo.canonical_url} onChange={(e) => setDraftField("seo", "canonical_url", e.target.value)} style={inputStyle()} /></Field>
            </div>
          </Panel>

          <Panel id="preview-publish" title={uiMessage("master.s0353")} note={uiMessage("master.s0526")}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box"
            }}>
              <StatusCard title={uiMessage("master.s0527")} value={saveState.kind === "idle" ? "IDLE" : saveState.kind.toUpperCase()} note={saveState.message || uiMessage("master.s0528")} tone={saveState.kind === "error" ? "warn" : saveState.kind === "success" ? "good" : "neutral"} />
              <StatusCard title={uiMessage("master.s0529")} value={publishState.kind === "idle" ? "IDLE" : publishState.kind.toUpperCase()} note={publishState.message || uiMessage("master.s0530")} tone={publishState.kind === "error" ? "warn" : publishState.kind === "success" ? "good" : "neutral"} />
              <StatusCard title={uiMessage("master.s0531")} value={(previewState.mode || "idle").toUpperCase()} note={previewState.message || uiMessage("master.s0532")} tone={previewState.mode === "backend" ? "good" : previewState.mode === "fallback" ? "warn" : "neutral"} />
              <StatusCard title={uiMessage("master.s0533")} value={publicPath} note={uiMessage("master.s0534")} tone="neutral" />
            </div>
          </Panel>
        </div>
      </div>

      <PageSection title={uiMessage("salon.s0672")} subtitle={uiMessage("master.s0536")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box"
        }}>
          {sectionItems.map((item, index) => (
            <div key={item.id} style={sectionCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}><UiValue value={item.label} /></div>
                <div style={badgeIndexStyle}><UiValue value={index + 1} /></div>
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}><UiValue value={item.note} /></div>
            </div>
          ))}
        </div>
      </PageSection>

      {previewState.open ? (
        <div style={previewOverlayStyle}>
          <div style={previewModalStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", minWidth: 0 }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0674")} /><UiValue value={resolvedSlug || "master"} /></div>
                <div style={{ marginTop: "6px", fontSize: "13px", color: "#6b7280" }}><UiValue value={previewState.message} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleClosePreview}><UiValue value={uiMessage("salon.s0675")} /></ActionButton>
            </div>

            {previewState.loading ? (
              <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0676")} /></div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={previewHeroStyle}>
                  <div style={{ display: "grid", gap: "10px", minWidth: 0 }}>
                    <div style={previewBadgeStyle}><UiValue value={previewIdentity.hero_badge || "Master preview"} /></div>
                    <div style={{ fontSize: "32px", lineHeight: 1.1, fontWeight: 900, color: "#111827" }}>
                      <UiValue value={previewIdentity.master_name || uiMessage("master.s0540")} />
                    </div>
                    <div style={{ fontSize: "16px", color: "#111827", fontWeight: 600, lineHeight: 1.5 }}>
                      <UiValue value={uiJoin([previewIdentity.profession, previewIdentity.subtitle].filter(Boolean), ". ") || uiMessage("master.s0541")} />
                    </div>
                    <div style={{ fontSize: "16px", color: "#475467", lineHeight: 1.6 }}>
                      <UiValue value={previewIdentity.description || uiMessage("master.s0542")} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                      <a href={previewCta.booking_url || "#"} style={previewPrimaryCtaStyle}><UiValue value={previewCta.booking_label || uiMessage("salon.s0665")} /></a>
                      <span style={previewSecondaryCtaStyle}><UiValue value={previewCta.services_label || uiMessage("salon.s0024")} /></span>
                    </div>
                  </div>
                  <div style={previewImageCardStyle}>
                    {getAssetPreviewUrl(previewImages.hero || {}) ? (
                      <img src={getAssetPreviewUrl(previewImages.hero || {})} alt={renderUi(previewImages.hero?.alt || "Hero preview")} style={previewImageRealStyle} />
                    ) : previewImages.hero?.image_asset_id ? (
                      <div style={{ fontSize: "14px", color: "#111827", fontWeight: 700 }}><UiValue value={uiMessage("salon.s0679")} /><UiValue value={previewImages.hero.image_asset_id} /></div>
                    ) : (
                      <div style={{ fontSize: "14px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0680")} /></div>
                    )}
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#667085" }}><UiValue value={previewImages.hero?.alt || "Hero preview"} /></div>
                  </div>
                </div>

                <div style={previewGridStyle}>
                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0681")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0546")} /><UiValue value={previewIdentity.master_name || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0547")} /><UiValue value={previewIdentity.profession || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0548")} /><UiValue value={previewIdentity.subtitle || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0549")} /><UiValue value={previewIdentity.description || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0550")} /><UiValue value={previewIdentity.city || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("master.s0551")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewLocation.address || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewLocation.phone || previewLocation.whatsapp || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewLocation.schedule_text || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewLocation.map_url || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0686")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0552")} /><UiValue value={previewTrust.rating_value || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0702")} /><UiValue value={previewTrust.review_count || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0554")} /><UiValue value={previewTrust.trust_note || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0555")} /><UiValue value={previewTrust.sticky_subline || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("master.s0345")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0556")} /><UiValue value={previewStats.years || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0552")} /><UiValue value={previewStats.rating || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0557")} /><UiValue value={previewStats.bookings || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0480")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0693")} /><UiValue value={previewCta.booking_label || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0694")} /><UiValue value={previewCta.booking_url || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0560")} /><UiValue value={previewCta.services_label || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0695")} /><UiValue value={previewCta.services_anchor || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("master.s0467")} /></div>
                    {previewFeaturedServices.length === 0 ? (
                      <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0456")} /></div>
                    ) : previewFeaturedServices.map((item, index) => (
                      <div key={item.id || uiTemplate(["preview_featured_",""], [index])} style={previewCardTextStyle}>
                        <UiValue value={item.title || uiMessage("salon.s0773")} />
                        <UiValue value={[item.price, item.time].filter(Boolean).length ? uiTemplate([" · ",""], [uiJoin([item.price, item.time].filter(Boolean), " · ")]) : ""} />
                      </div>
                    ))}
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("master.s0473")} /></div>
                    {previewServiceCatalog.length === 0 ? (
                      <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0456")} /></div>
                    ) : previewServiceCatalog.map((item, index) => (
                      <div key={item.id || uiTemplate(["preview_catalog_",""], [index])} style={previewCardTextStyle}>
                        <UiValue value={item.name || uiMessage("salon.s0773")} />
                        <UiValue value={[item.price, item.duration].filter(Boolean).length ? uiTemplate([" · ",""], [uiJoin([item.price, item.duration].filter(Boolean), " · ")]) : ""} />
                      </div>
                    ))}
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("master.s0562")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0563")} /><UiValue value={previewBookingBand.title || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0564")} /><UiValue value={previewBookingBand.text || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0565")} /><UiValue value={previewBookingBand.booking_cta_label || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0566")} /><UiValue value={previewBookingBand.booking_cta_url || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0567")} /><UiValue value={previewBookingBand.services_cta_label || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0568")} /><UiValue value={previewBookingBand.services_anchor || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0696")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0570")} /><UiValue value={previewSections.badges?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0697")} /><UiValue value={previewSections.benefits?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0572")} /><UiValue value={previewSections.featured_services?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0573")} /><UiValue value={previewSections.service_catalog?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0702")} /><UiValue value={previewSections.reviews?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("master.s0574")} /><UiValue value={previewSections.portfolio?.length || 0} /></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <PageSection title={uiMessage("salon.s0725")} subtitle={uiMessage("master.s0576")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <Link to={publicPath} style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("salon.s0733")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("master.s0578")} /></div>
          </Link>

          <Link to={previewPath} style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("master.s0579")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("master.s0580")} /></div>
          </Link>

          <a href="#images" style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("master.s0581")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("master.s0582")} /></div>
          </a>

          <a href="#preview-publish" style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("master.s0583")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("master.s0584")} /></div>
          </a>
        </div>
      </PageSection>
    </div>
  );
}

const infoBoxStyle = {
  border: "1px solid #d0d5dd",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "14px",
  fontSize: "13px",
  color: "#475467",
  lineHeight: 1.5
};

const successBoxStyle = {
  ...infoBoxStyle,
  border: "1px solid #abefc6",
  background: "#ecfdf3",
  color: "#027a48"
};

const warningBoxStyle = {
  ...infoBoxStyle,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#b45309"
};

const nestedCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "14px",
  display: "grid",
  gap: "12px"
};

const sectionCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "14px",
  minHeight: "108px",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const validationLineStyle = {
  fontSize: "13px",
  lineHeight: 1.5
};

const uploadFieldStyle = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const assetPreviewCardStyle = {
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  minHeight: "180px",
  padding: "14px",
  background: "#ffffff",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  gap: "8px",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const assetPreviewImageStyle = {
  maxWidth: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "12px"
};

const assetPreviewMetaStyle = {
  fontSize: "12px",
  color: "#475467",
  wordBreak: "break-word"
};

const assetPreviewEmptyStyle = {
  fontSize: "13px",
  color: "#6b7280"
};

const badgeIndexStyle = {
  minWidth: "28px",
  height: "28px",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1d4ed8",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 800
};

const previewOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 50,
  minWidth: 0,
  boxSizing: "border-box"
};

const previewModalStyle = {
  width: "min(1100px, 100%)",
  maxHeight: "calc(100vh - 48px)",
  overflow: "auto",
  borderRadius: "20px",
  background: "#ffffff",
  padding: "20px",
  display: "grid",
  gap: "16px",
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const previewHeroStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "20px",
  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const previewImageCardStyle = {
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  minHeight: "180px",
  padding: "16px",
  background: "#ffffff",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const previewImageRealStyle = {
  maxWidth: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "12px"
};

const previewBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "12px",
  fontWeight: 700
};

const previewPrimaryCtaStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  borderRadius: "12px",
  padding: "10px 14px",
  background: "#111827",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 800
};

const previewSecondaryCtaStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  padding: "10px 14px",
  border: "1px solid #d0d5dd",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
  fontWeight: 700
};

const previewGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const previewCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "16px",
  display: "grid",
  gap: "8px",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const previewCardTitleStyle = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#111827"
};

const previewCardTextStyle = {
  fontSize: "13px",
  color: "#475467",
  lineHeight: 1.5
};

const linkCardStyle = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "16px",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box"
};

const linkTitleStyle = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "6px"
};

const linkTextStyle = {
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: 1.45
};

const VALIDATION_FIELDS = {"identity.master_name":"master.validation.field0","identity.profession":"master.validation.field1","images.hero":"master.validation.field2","location.address_or_map_url":"master.validation.field3","location.phone_or_whatsapp":"master.validation.field4","sections.featured_services_or_service_catalog":"master.validation.field5","sections.about_paragraphs":"master.validation.field6","cta.booking_label":"master.validation.field7","cta.booking_url":"master.validation.field8","sections.reviews":"master.validation.field9","metrics":"master.validation.field10","sections.badges":"master.validation.field11","sections.benefits":"master.validation.field12","seo":"master.validation.field13","trust.sticky_subline":"master.validation.field14"};
function validationLabel(code) { return uiMessage(VALIDATION_FIELDS[code] || "master.validation.unknown"); }
