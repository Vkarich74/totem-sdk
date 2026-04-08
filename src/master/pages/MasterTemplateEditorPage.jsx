
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../cabinet/PageHeader";
import PageSection from "../../cabinet/PageSection";
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
  { id: "identity", label: "Identity", note: "Имя мастера, профессия, город и верхняя identity strip." },
  { id: "hero", label: "Hero", note: "Главный hero блок, бейдж, описание, CTA и hero image." },
  { id: "contacts", label: "Contacts / Location", note: "Адрес, район, город, график, телефон, WhatsApp и карта." },
  { id: "trust", label: "Trust", note: "Рейтинг, количество отзывов и trust note." },
  { id: "badges", label: "Badges", note: "Короткие бейджи под hero." },
  { id: "benefits", label: "Benefits", note: "Карточки преимуществ мастера." },
  { id: "metrics", label: "Metrics", note: "Trust metrics/value cards." },
  { id: "featured-services", label: "Featured Services", note: "Основные услуги с ценой и временем." },
  { id: "catalog", label: "Full Catalog", note: "Полный каталог услуг." },
  { id: "reviews", label: "Reviews", note: "Отзывы клиентов." },
  { id: "about", label: "About", note: "О мастере и параграфы описания." },
  { id: "stats", label: "Stats", note: "Годы, рейтинг, бронирования." },
  { id: "images", label: "Images", note: "Hero mandatory, avatar/portfolio/service-card reserved." },
  { id: "cta", label: "CTA", note: "Booking CTA band и sticky CTA." },
  { id: "seo", label: "SEO", note: "Title, description и canonical URL." },
  { id: "preview-publish", label: "Preview / Publish", note: "Сохранение, preview, publish и validation state." }
];

const EMPTY_DRAFT = {
  identity: {
    master_name: "",
    profession: "",
    city: "",
    hero_badge: "",
    hero_subtitle: "",
    hero_description: ""
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
  metrics: {
    metrics: []
  },
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
    portfolio: [],
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
    throw new Error(`MASTER_ASSET_KIND_INVALID:${assetKind || "unknown"}`);
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
  return `${rootFolder}/${normalizedOwnerType}/${ownerSlug}/${normalizedAssetKind}`;
}

function buildCloudinaryContext(meta) {
  const ownerType = String(meta.ownerType || MASTER_OWNER_TYPE).trim().toLowerCase() || MASTER_OWNER_TYPE;
  const assetKind = resolveMasterAssetKind(meta.assetKind);
  return `owner_type=${ownerType}|owner_slug=${meta.ownerSlug}|asset_kind=${assetKind}`;
}

function buildCloudinaryTags(meta) {
  const ownerType = String(meta.ownerType || MASTER_OWNER_TYPE).trim().toLowerCase() || MASTER_OWNER_TYPE;
  const assetKind = resolveMasterAssetKind(meta.assetKind);
  return ["totem", ownerType, assetKind].filter(Boolean).join(",");
}

function normalizeCloudinaryAsset(payload, meta) {
  const ownerType = String(meta.ownerType || MASTER_OWNER_TYPE).trim().toLowerCase() || MASTER_OWNER_TYPE;
  const assetKind = resolveMasterAssetKind(meta.assetKind);

  return {
    asset_id: `cld:${payload?.public_id || ""}`,
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

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
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

function mergeDraft(source = {}) {
  return {
    ...EMPTY_DRAFT,
    ...source,
    identity: { ...EMPTY_DRAFT.identity, ...(source.identity || {}) },
    location: { ...EMPTY_DRAFT.location, ...(source.location || {}) },
    trust: { ...EMPTY_DRAFT.trust, ...(source.trust || {}) },
    metrics: {
      ...EMPTY_DRAFT.metrics,
      ...(source.metrics || {}),
      metrics: Array.isArray(source.metrics?.metrics) ? source.metrics.metrics : []
    },
    cta: { ...EMPTY_DRAFT.cta, ...(source.cta || {}) },
    sections: {
      ...EMPTY_DRAFT.sections,
      ...(source.sections || {}),
      badges: Array.isArray(source.sections?.badges) ? source.sections.badges : [],
      benefits: Array.isArray(source.sections?.benefits) ? source.sections.benefits : [],
      featured_services: Array.isArray(source.sections?.featured_services) ? source.sections.featured_services : [],
      service_catalog: Array.isArray(source.sections?.service_catalog) ? source.sections.service_catalog : [],
      reviews: Array.isArray(source.sections?.reviews) ? source.sections.reviews : [],
      about_paragraphs: Array.isArray(source.sections?.about_paragraphs) ? source.sections.about_paragraphs : [],
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
      portfolio: Array.isArray(source.images?.portfolio) ? source.images.portfolio : [],
      service_card: Array.isArray(source.images?.service_card) ? source.images.service_card : [],
      assets: { ...EMPTY_DRAFT.images.assets, ...(source.images?.assets || {}) }
    },
    seo: { ...EMPTY_DRAFT.seo, ...(source.seo || {}) },
    stats: { ...EMPTY_DRAFT.stats, ...(source.stats || {}) }
  };
}

function extractMessage(result, fallback) {
  return (
    result?.detail?.json?.message ||
    result?.detail?.json?.error ||
    result?.detail?.text ||
    result?.error ||
    fallback
  );
}

function getItemKey(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

  if (!Array.isArray(draft.sections.about_paragraphs) || draft.sections.about_paragraphs.length < 1) {
    critical.push("sections.about_paragraphs");
  }

  if (!normalizeText(draft.cta.booking_label)) critical.push("cta.booking_label");
  if (!normalizeText(draft.cta.booking_url)) critical.push("cta.booking_url");

  if (!Array.isArray(draft.sections.reviews) || draft.sections.reviews.length === 0) warnings.push("sections.reviews");
  if (!Array.isArray(draft.metrics.metrics) || draft.metrics.metrics.length === 0) warnings.push("metrics.metrics");
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
    Array.isArray(draft.sections.about_paragraphs) && draft.sections.about_paragraphs.length ? "about" : ""
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

function StatusPill({ tone = "neutral", children }) {
  const map = {
    neutral: { background: "#f3f4f6", color: "#111827", border: "#e5e7eb" },
    success: { background: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
    warning: { background: "#fffbeb", color: "#92400e", border: "#fde68a" },
    danger: { background: "#fef2f2", color: "#991b1b", border: "#fecaca" }
  };
  const palette = map[tone] || map.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "32px",
        padding: "0 12px",
        borderRadius: "999px",
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        fontSize: "13px",
        fontWeight: 600
      }}
    >
      {children}
    </span>
  );
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
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        borderRadius: "14px",
        padding: "16px"
      }}
    >
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: palette.value }}>{value}</div>
      {note ? (
        <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}>{note}</div>
      ) : null}
    </div>
  );
}

function Panel({ title, note, children, id }) {
  return (
    <div id={id} style={{ scrollMarginTop: "24px" }}>
      <PageSection title={title} description={note}>
        <div style={{ display: "grid", gap: "16px" }}>{children}</div>
      </PageSection>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: "12px", color: "#6b7280" }}>{hint}</span> : null}
    </label>
  );
}

function UploadInput({ onSelect, disabled = false }) {
  return (
    <label style={uploadFieldStyle}>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}>Загрузка изображения</span>
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

function AssetPreview({ title = "Preview", entity = {}, emptyNote = "Изображение ещё не загружено." }) {
  const previewUrl = getAssetPreviewUrl(entity);
  const assetId = entity?.image_asset_id || entity?.asset_id || "";

  return (
    <div style={assetPreviewCardStyle}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{title}</div>
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={entity?.alt || title} style={assetPreviewImageStyle} />
          <div style={assetPreviewMetaStyle}>{assetId || "Asset attached"}</div>
        </>
      ) : (
        <div style={assetPreviewEmptyStyle}>{emptyNote}</div>
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
    minHeight: `${rows * 24 + 24}px`,
    resize: "vertical"
  };
}

function selectStyle() {
  return {
    width: "100%",
    border: "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "11px 14px",
    fontSize: "14px",
    color: "#111827",
    background: "#ffffff",
    boxSizing: "border-box"
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
        border: `1px solid ${palette.border}`,
        background: disabled ? "#e5e7eb" : palette.background,
        color: disabled ? "#9ca3af" : palette.color,
        fontSize: "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >
      {children}
    </button>
  );
}

function ArrayCard({ title, note, children, onAdd, addLabel }) {
  return (
    <div style={{ display: "grid", gap: "12px", padding: "16px", borderRadius: "14px", border: "1px solid #e5e7eb", background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: "4px" }}>
          <strong style={{ fontSize: "15px", color: "#111827" }}>{title}</strong>
          {note ? <span style={{ fontSize: "12px", color: "#6b7280" }}>{note}</span> : null}
        </div>
        {onAdd ? <ActionButton tone="secondary" onClick={onAdd}>{addLabel}</ActionButton> : null}
      </div>
      {children}
    </div>
  );
}

export default function MasterTemplateEditorPage() {
  const { slug = "" } = useParams();
  const [draft, setDraft] = useState(() => mergeDraft());
  const [documentState, setDocumentState] = useState(null);
  const [previewState, setPreviewState] = useState({ open: false, loading: false, payload: null, mode: "idle", message: "" });
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
      if (!slug) {
        setPageLoading(false);
        setPageError("MASTER_SLUG_MISSING");
        return;
      }

      if (!hasToken) {
        const fallbackDraft = mergeDraft();
        const localValidation = validateMasterTemplateDraft(fallbackDraft);
        const localDocument = buildLocalDocument(null, fallbackDraft, slug, "save", localValidation);
        if (cancelled) return;
        setDocumentState(localDocument);
        setDraft(fallbackDraft);
        setPageError(null);
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      setPageError(null);

      const result = await getMasterTemplateDocument(slug);
      if (cancelled) return;

      if (!result.ok) {
        setPageError(extractMessage(result, "MASTER_TEMPLATE_DOCUMENT_FETCH_FAILED"));
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
  }, [hasToken, slug]);

  const validation = useMemo(() => validateMasterTemplateDraft(draft), [draft]);
  const hardErrors = Array.isArray(validation.hard_errors) ? validation.hard_errors : [];
  const warnings = Array.isArray(validation.warnings) ? validation.warnings : [];
  const completionScore = Number(validation.completeness_score || 0);
  const lastSavedAt = documentState?.meta?.last_saved_at || documentState?.last_saved_at || null;

  const sectionHealthItems = [
    { label: "Badges", value: draft.sections.badges.length },
    { label: "Benefits", value: draft.sections.benefits.length },
    { label: "Metrics", value: draft.metrics.metrics.length },
    { label: "Featured", value: draft.sections.featured_services.length },
    { label: "Catalog", value: draft.sections.service_catalog.length },
    { label: "Reviews", value: draft.sections.reviews.length }
  ];

  function resetStateMessages() {
    setSaveState({ kind: "idle", message: "" });
    setPublishState({ kind: "idle", message: "" });
  }

  function setUploadFlag(key, value) {
    setUploadState((current) => ({ ...current, [key]: value }));
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
    if (!slug) return;

    const uploadKey = `root:${slot}`;
    setUploadFlag(uploadKey, { loading: true, error: "" });

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: MASTER_OWNER_TYPE,
        ownerSlug: slug,
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
      metrics: {
        ...prev.metrics,
        metrics: prev.metrics.metrics.map((item, itemIndex) => (
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
      metrics: {
        ...prev.metrics,
        metrics: [...prev.metrics.metrics, { id: getItemKey("metric"), value: "", label: "" }]
      }
    }));
    resetStateMessages();
  }

  function removeMetric(index) {
    setDraft((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        metrics: prev.metrics.metrics.filter((_, itemIndex) => itemIndex !== index)
      }
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

  async function handleImageArrayUpload(imageKey, index, file) {
    if (!slug) return;

    const uploadKey = `${imageKey}:${index}`;
    setUploadFlag(uploadKey, { loading: true, error: "" });

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: MASTER_OWNER_TYPE,
        ownerSlug: slug,
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

  async function persistDraft(nextDraft) {
    const validationResult = validateMasterTemplateDraft(nextDraft);

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, slug, "save", validationResult);
      setDocumentState(nextDocument);
      setDraft(mergeDraft(nextDocument.draft || nextDraft));
      setSaveState({
        kind: "success",
        message: validationResult.is_ready_for_publish
          ? "Черновик сохранён локально. Это mock-режим до полной auth цепочки."
          : "Черновик сохранён локально с validation blockers."
      });
      return { ok: true, document: nextDocument, validation: validationResult, mode: "mock" };
    }

    const result = await saveMasterTemplateDraft(nextDraft, slug);

    if (!result.ok) {
      const message = extractMessage(result, "MASTER_TEMPLATE_DRAFT_SAVE_FAILED");
      setSaveState({ kind: "error", message });
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
    setSaveState({ kind: "success", message: "Черновик мастера сохранён." });
    return { ok: true, document: nextDocument, validation: nextDocument?.validation || validationResult, mode: "backend" };
  }

  async function handleSaveDraft() {
    if (!slug) return;
    setSaveState({ kind: "saving", message: "Сохраняем draft…" });
    setPublishState({ kind: "idle", message: "" });
    await persistDraft(draft);
  }

  async function handleOpenPreview() {
    if (!slug) return;

    setPreviewState({
      open: true,
      loading: true,
      payload: null,
      mode: "loading",
      message: "Сохраняем draft и собираем preview…"
    });

    const saveResult = await persistDraft(draft);
    if (!saveResult.ok) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(draft, slug),
        mode: "fallback",
        message: saveResult.error || "PREVIEW_SAVE_FAILED — открыт fallback preview."
      });
      return;
    }

    if (!hasToken) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(draft, slug),
        mode: "mock",
        message: "Локальный preview открыт без backend auth. Это mock по текущему draft."
      });
      return;
    }

    const result = await getMasterTemplatePreview(slug);

    if (!result.ok) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(draft, slug),
        mode: "fallback",
        message: extractMessage(result, "MASTER_TEMPLATE_PREVIEW_FAILED — открыт fallback preview.")
      });
      return;
    }

    setPreviewState({
      open: true,
      loading: false,
      payload: result.payload || buildPreviewPayload(draft, slug),
      mode: "backend",
      message: result.is_ready_for_preview ? "Preview получен из backend." : "Preview получен, но backend validation ещё не готов."
    });
  }

  function handleClosePreview() {
    setPreviewState({ open: false, loading: false, payload: null, mode: "idle", message: "" });
  }

  async function handlePublish() {
    if (!slug) return;

    const liveValidation = validateMasterTemplateDraft(draft);
    if (!liveValidation.is_ready_for_publish) {
      const nextDocument = buildLocalDocument(documentState, draft, slug, "save", liveValidation);
      setDocumentState(nextDocument);
      setPublishState({
        kind: "error",
        message: "Публикация заблокирована: исправь обязательные поля master template."
      });
      return;
    }

    setPublishState({ kind: "publishing", message: "Публикуем страницу…" });
    const saveResult = await persistDraft(draft);

    if (!saveResult.ok) {
      setPublishState({
        kind: "error",
        message: saveResult.error || "DRAFT_SAVE_BEFORE_PUBLISH_FAILED"
      });
      return;
    }

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, draft, slug, "publish", liveValidation);
      setDocumentState(nextDocument);
      setDraft(mergeDraft(nextDocument.draft || draft));
      setPublishState({
        kind: "success",
        message: "Публикация выполнена локально. Это mock-режим до полной auth цепочки."
      });
      return;
    }

    const result = await publishMasterTemplate(slug, "system:1");

    if (!result.ok) {
      setPublishState({
        kind: "error",
        message: extractMessage(result, "MASTER_TEMPLATE_PUBLISH_FAILED")
      });
      return;
    }

    const nextDocument = result.document || null;
    setDocumentState({
      ...nextDocument,
      validation: nextDocument?.validation || liveValidation,
      status: {
        ...(nextDocument?.status || {}),
        is_publishable: Boolean((nextDocument?.validation || liveValidation)?.is_ready_for_publish)
      }
    });
    setDraft(mergeDraft(nextDocument?.draft || draft));
    setPublishState({ kind: "success", message: "Master template опубликован." });
    setSaveState({ kind: "idle", message: "" });
  }

  const previewPath = `/preview/master/${slug}`;
  const publicPath = `/master/${slug}`;
  const blockTone = pageError ? "warn" : hasToken ? "good" : "neutral";
  const blockValue = pageLoading ? "Загрузка" : pageError ? "Ошибка" : hasToken ? "Готово" : "Локальный режим";
  const blockNote = pageError
    ? pageError
    : hasToken
      ? "Страница читает document и работает с backend."
      : "Полная auth цепочка ещё не внедрена, editor работает в local mock режиме без поломки кабинета.";

  return (
    <div style={{ display: "grid", gap: "20px", padding: "24px" }}>
      <PageHeader
        title="Master Template Editor"
        subtitle={`Mirror editor для мастера${slug ? ` · ${slug}` : ""}. Логика сохранена как у салона, без трогания эталонного PublicMasterPage.`}
        actions={(
          <>
            <ActionButton tone="secondary" onClick={handleSaveDraft} disabled={!slug || pageLoading || saveState.kind === "saving"}>
              {saveState.kind === "saving" ? "Сохраняем…" : "Сохранить draft"}
            </ActionButton>
            <ActionButton tone="secondary" onClick={handleOpenPreview} disabled={!slug || pageLoading}>
              Открыть preview
            </ActionButton>
            <ActionButton onClick={handlePublish} disabled={!slug || pageLoading || publishState.kind === "publishing"}>
              {publishState.kind === "publishing" ? "Публикуем…" : "Опубликовать"}
            </ActionButton>
          </>
        )}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px"
      }}>
        <StatusCard title="Статус блока" value={blockValue} note={blockNote} tone={blockTone} />
        <StatusCard title="Slug" value={slug || "—"} note="Master editor работает от текущего route slug." />
        <StatusCard title="Готовность к публикации" value={validation.is_ready_for_publish ? "Готово" : "Не готово"} note={`Ошибок: ${hardErrors.length} · Warnings: ${warnings.length}`} tone={validation.is_ready_for_publish ? "good" : "warn"} />
        <StatusCard title="Заполнение" value={`${completionScore}%`} note={lastSavedAt ? `Последнее сохранение: ${new Date(lastSavedAt).toLocaleString()}` : "Сохранения ещё не было."} />
      </div>

      {!hasToken ? (
        <PageSection title="Локальный режим" subtitle="Полная цепочка доступа ещё не внедрена, поэтому backend auth для browser не обязателен на этом этапе.">
          <div style={infoBoxStyle}>
            Страница работает в local mock режиме. Это не ломает контракт: сейчас мы фиксируем editor flow, preview и publish UI, не трогая эталонный public shell.
          </div>
        </PageSection>
      ) : null}

      <PageSection title="Cloudinary pipeline" subtitle="Upload layer подключён прямо в master editor. Ручной image_asset_id сохранён как резерв.">
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            <StatusCard title="Cloud name" value={cloudinaryConfig.cloudName || "MISSING"} tone={cloudinaryConfig.cloudName ? "good" : "warn"} />
            <StatusCard title="Upload preset" value={cloudinaryConfig.uploadPreset || "MISSING"} tone={cloudinaryConfig.uploadPreset ? "good" : "warn"} />
            <StatusCard title="Root folder" value={cloudinaryConfig.rootFolder} note={`Storage contract: ${cloudinaryConfig.rootFolder}/${MASTER_OWNER_TYPE}/<slug>/<asset_kind>`} tone="neutral" />
            <StatusCard title="Upload state" value={cloudinaryReady ? "READY" : "BLOCKED"} note={cloudinaryReady ? "Можно загружать hero/avatar/portfolio/service-card прямо из editor." : "Нужно заполнить VITE_CLOUDINARY_* в SDK env."} tone={cloudinaryReady ? "good" : "warn"} />
          </div>
        </div>
      </PageSection>

      <PageSection title="Validation UX" subtitle="Живая проверка текущего draft без ожидания save. Это контроль перед publish.">
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            <StatusCard title="Live publish state" value={validation.is_ready_for_publish ? "READY" : "BLOCKED"} note="Статус считается по текущему draft." tone={validation.is_ready_for_publish ? "good" : "warn"} />
            <StatusCard title="Hard errors" value={String(hardErrors.length)} note="Эти ошибки блокируют publish." tone={hardErrors.length ? "warn" : "good"} />
            <StatusCard title="Warnings" value={String(warnings.length)} note="Не блокируют publish, но снижают готовность." tone={warnings.length ? "warn" : "good"} />
            <StatusCard title="Section coverage" value={`${sectionHealthItems.filter((item) => item.value > 0).length}/6`} note="Покрытие ключевых editor-секций." tone="neutral" />
          </div>

          {hardErrors.length ? (
            <div style={warningBoxStyle}>
              <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px" }}>Блокеры публикации</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {hardErrors.map((item, index) => (
                  <div key={`${item}-${index}`} style={validationLineStyle}>• {item}</div>
                ))}
              </div>
            </div>
          ) : (
            <div style={successBoxStyle}>Блокеров публикации по текущему draft нет.</div>
          )}

          {warnings.length ? (
            <div style={infoBoxStyle}>
              <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px", color: "#111827" }}>Warnings</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {warnings.map((item, index) => (
                  <div key={`${item}-${index}`} style={validationLineStyle}>• {item}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </PageSection>

      <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: "20px", alignItems: "start" }}>
        <aside style={{ position: "sticky", top: "24px", display: "grid", gap: "12px" }}>
          <div style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", background: "#ffffff" }}>
            <div style={{ display: "grid", gap: "10px" }}>
              <strong style={{ fontSize: "15px", color: "#111827" }}>Sections</strong>
              {sectionItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  style={{ textDecoration: "none", color: "#111827", display: "grid", gap: "2px" }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>{item.note}</span>
                </a>
              ))}
            </div>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", background: "#ffffff", display: "grid", gap: "10px" }}>
            <strong style={{ fontSize: "15px", color: "#111827" }}>Actions</strong>
            <ActionButton onClick={handleSaveDraft} disabled={!slug || pageLoading || saveState.kind === "saving"}>
              {saveState.kind === "saving" ? "Сохраняю..." : "Сохранить draft"}
            </ActionButton>
            <ActionButton tone="secondary" onClick={handleOpenPreview} disabled={!slug || pageLoading}>
              Открыть preview
            </ActionButton>
            <ActionButton onClick={handlePublish} disabled={!slug || pageLoading || publishState.kind === "publishing" || !validation.is_ready_for_publish}>
              {publishState.kind === "publishing" ? "Публикую..." : "Publish"}
            </ActionButton>
            <Link to={publicPath} style={{ color: "#111827", fontSize: "13px", fontWeight: 600 }}>Открыть public master page</Link>
            <Link to={previewPath} style={{ color: "#111827", fontSize: "13px", fontWeight: 600 }}>Открыть preview route</Link>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", background: "#ffffff", display: "grid", gap: "8px" }}>
            <strong style={{ fontSize: "15px", color: "#111827" }}>Validation</strong>
            <div style={{ fontSize: "13px", color: "#111827" }}>Critical</div>
            {hardErrors.length ? hardErrors.map((item) => (
              <span key={item} style={{ fontSize: "12px", color: "#991b1b" }}>{item}</span>
            )) : <span style={{ fontSize: "12px", color: "#065f46" }}>Нет critical ошибок.</span>}
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#111827" }}>Warnings</div>
            {warnings.length ? warnings.map((item) => (
              <span key={item} style={{ fontSize: "12px", color: "#92400e" }}>{item}</span>
            )) : <span style={{ fontSize: "12px", color: "#6b7280" }}>Нет warnings.</span>}
          </div>
        </aside>

        <div style={{ display: "grid", gap: "20px" }}>
          <Panel id="identity" title="Identity" note="Top identity strip / master identity.">
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Field label="Имя мастера"><input value={draft.identity.master_name} onChange={(e) => setDraftField("identity", "master_name", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Профессия"><input value={draft.identity.profession} onChange={(e) => setDraftField("identity", "profession", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Город"><input value={draft.identity.city} onChange={(e) => setDraftField("identity", "city", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Hero badge"><input value={draft.identity.hero_badge} onChange={(e) => setDraftField("identity", "hero_badge", e.target.value)} style={inputStyle()} /></Field>
            </div>
          </Panel>

          <Panel id="hero" title="Hero" note="Main hero content and top CTA.">
            <Field label="Hero subtitle"><input value={draft.identity.hero_subtitle} onChange={(e) => setDraftField("identity", "hero_subtitle", e.target.value)} style={inputStyle()} /></Field>
            <Field label="Hero description"><textarea value={draft.identity.hero_description} onChange={(e) => setDraftField("identity", "hero_description", e.target.value)} style={textareaStyle(5)} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
              <div style={{ display: "grid", gap: "14px" }}>
                <Field label="Hero image asset id" hint="V1 primary pipeline field."><input value={draft.images.hero.image_asset_id} onChange={(e) => setNestedDraftField("images", "hero", "image_asset_id", e.target.value)} style={inputStyle()} /></Field>
                <Field label="Hero image URL" hint="Fallback для dev/manual mode."><input value={draft.images.hero.image_url} onChange={(e) => setNestedDraftField("images", "hero", "image_url", e.target.value)} style={inputStyle()} /></Field>
                <Field label="Hero alt"><input value={draft.images.hero.alt} onChange={(e) => setNestedDraftField("images", "hero", "alt", e.target.value)} style={inputStyle()} /></Field>
                <UploadInput onSelect={(file) => handleRootImageUpload("hero", file)} disabled={!cloudinaryReady || !slug || uploadState["root:hero"]?.loading} />
                {uploadState["root:hero"]?.error ? <div style={warningBoxStyle}>{uploadState["root:hero"].error}</div> : null}
              </div>
              <AssetPreview title="Hero preview" entity={draft.images.hero || {}} emptyNote="Hero пока не загружен." />
            </div>
          </Panel>

          <Panel id="contacts" title="Contacts / Location" note="Address card and map contract.">
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Field label="Адрес"><input value={draft.location.address} onChange={(e) => setDraftField("location", "address", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Район"><input value={draft.location.district} onChange={(e) => setDraftField("location", "district", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Город"><input value={draft.location.city} onChange={(e) => setDraftField("location", "city", e.target.value)} style={inputStyle()} /></Field>
              <Field label="График"><input value={draft.location.schedule_text} onChange={(e) => setDraftField("location", "schedule_text", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Телефон"><input value={draft.location.phone} onChange={(e) => setDraftField("location", "phone", e.target.value)} style={inputStyle()} /></Field>
              <Field label="WhatsApp"><input value={draft.location.whatsapp} onChange={(e) => setDraftField("location", "whatsapp", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Instagram"><input value={draft.location.instagram} onChange={(e) => setDraftField("location", "instagram", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Telegram"><input value={draft.location.telegram} onChange={(e) => setDraftField("location", "telegram", e.target.value)} style={inputStyle()} /></Field>
            </div>
            <Field label="Map URL"><input value={draft.location.map_url} onChange={(e) => setDraftField("location", "map_url", e.target.value)} style={inputStyle()} /></Field>
          </Panel>

          <Panel id="trust" title="Trust" note="Ratings and social proof.">
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Field label="Rating value"><input value={draft.trust.rating_value} onChange={(e) => setDraftField("trust", "rating_value", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Review count"><input value={draft.trust.review_count} onChange={(e) => setDraftField("trust", "review_count", e.target.value)} style={inputStyle()} /></Field>
            </div>
            <Field label="Trust note"><textarea value={draft.trust.trust_note} onChange={(e) => setDraftField("trust", "trust_note", e.target.value)} style={textareaStyle(3)} /></Field>
            <Field label="Sticky subline"><input value={draft.trust.sticky_subline} onChange={(e) => setDraftField("trust", "sticky_subline", e.target.value)} style={inputStyle()} /></Field>
          </Panel>

          <Panel id="badges" title="Badges" note="Short hero badges.">
            <ArrayCard title="Badges" note="Один badge = одна короткая строка." onAdd={() => addPrimitiveItem("badges", "")} addLabel="Добавить badge">
              {draft.sections.badges.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.sections.badges.map((item, index) => (
                <div key={`badge_${index}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
                  <input value={item} onChange={(e) => updatePrimitiveItem("badges", index, e.target.value)} style={inputStyle()} />
                  <ActionButton tone="secondary" onClick={() => removePrimitiveItem("badges", index)}>Удалить</ActionButton>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="benefits" title="Benefits" note="Карточки преимуществ мастера.">
            <ArrayCard title="Benefits" note="title + text" onAdd={() => addObjectItem("benefits", () => ({ id: getItemKey("benefit"), title: "", text: "" }))} addLabel="Добавить benefit">
              {draft.sections.benefits.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.sections.benefits.map((item, index) => (
                <div key={item.id || `benefit_${index}`} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <Field label="Title"><input value={item.title || ""} onChange={(e) => setArrayItem("benefits", index, "title", e.target.value)} style={inputStyle()} /></Field>
                  <Field label="Text"><textarea value={item.text || ""} onChange={(e) => setArrayItem("benefits", index, "text", e.target.value)} style={textareaStyle(3)} /></Field>
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("benefits", index)}>Удалить</ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="metrics" title="Metrics" note="Trust cards/value indicators.">
            <ArrayCard title="Metrics" note="value + label" onAdd={addMetric} addLabel="Добавить metric">
              {draft.metrics.metrics.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.metrics.metrics.map((item, index) => (
                <div key={item.id || `metric_${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px" }}>
                  <input placeholder="Value" value={item.value || ""} onChange={(e) => setMetricItem(index, "value", e.target.value)} style={inputStyle()} />
                  <input placeholder="Label" value={item.label || ""} onChange={(e) => setMetricItem(index, "label", e.target.value)} style={inputStyle()} />
                  <ActionButton tone="secondary" onClick={() => removeMetric(index)}>Удалить</ActionButton>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="featured-services" title="Featured Services" note="Карточки основных услуг мастера.">
            <ArrayCard title="Featured services" note="title / price / time / note" onAdd={() => addObjectItem("featured_services", () => ({ id: getItemKey("featured_service"), title: "", price: "", time: "", note: "" }))} addLabel="Добавить услугу">
              {draft.sections.featured_services.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.sections.featured_services.map((item, index) => (
                <div key={item.id || `featured_service_${index}`} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "2fr 1fr 1fr" }}>
                    <input placeholder="Title" value={item.title || ""} onChange={(e) => setArrayItem("featured_services", index, "title", e.target.value)} style={inputStyle()} />
                    <input placeholder="Price" value={item.price || ""} onChange={(e) => setArrayItem("featured_services", index, "price", e.target.value)} style={inputStyle()} />
                    <input placeholder="Time" value={item.time || ""} onChange={(e) => setArrayItem("featured_services", index, "time", e.target.value)} style={inputStyle()} />
                  </div>
                  <textarea placeholder="Note" value={item.note || ""} onChange={(e) => setArrayItem("featured_services", index, "note", e.target.value)} style={textareaStyle(3)} />
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("featured_services", index)}>Удалить</ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="catalog" title="Full Catalog" note="Полный service catalog мастера.">
            <ArrayCard title="Service catalog" note="name / price / duration / description" onAdd={() => addObjectItem("service_catalog", () => ({ id: getItemKey("service_catalog"), name: "", price: "", duration: "", description: "" }))} addLabel="Добавить в каталог">
              {draft.sections.service_catalog.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.sections.service_catalog.map((item, index) => (
                <div key={item.id || `service_catalog_${index}`} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "2fr 1fr 1fr" }}>
                    <input placeholder="Name" value={item.name || ""} onChange={(e) => setArrayItem("service_catalog", index, "name", e.target.value)} style={inputStyle()} />
                    <input placeholder="Price" value={item.price || ""} onChange={(e) => setArrayItem("service_catalog", index, "price", e.target.value)} style={inputStyle()} />
                    <input placeholder="Duration" value={item.duration || ""} onChange={(e) => setArrayItem("service_catalog", index, "duration", e.target.value)} style={inputStyle()} />
                  </div>
                  <textarea placeholder="Description" value={item.description || ""} onChange={(e) => setArrayItem("service_catalog", index, "description", e.target.value)} style={textareaStyle(3)} />
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("service_catalog", index)}>Удалить</ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="reviews" title="Reviews" note="Отзывы клиентов.">
            <ArrayCard title="Reviews" note="name / text / rating" onAdd={() => addObjectItem("reviews", () => ({ id: getItemKey("review"), name: "", text: "", rating: "" }))} addLabel="Добавить отзыв">
              {draft.sections.reviews.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.sections.reviews.map((item, index) => (
                <div key={item.id || `review_${index}`} style={{ display: "grid", gap: "10px", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "2fr 1fr" }}>
                    <input placeholder="Name" value={item.name || ""} onChange={(e) => setReviewItem(index, "name", e.target.value)} style={inputStyle()} />
                    <input placeholder="Rating" value={item.rating || ""} onChange={(e) => setReviewItem(index, "rating", e.target.value)} style={inputStyle()} />
                  </div>
                  <textarea placeholder="Text" value={item.text || ""} onChange={(e) => setReviewItem(index, "text", e.target.value)} style={textareaStyle(3)} />
                  <div><ActionButton tone="secondary" onClick={() => removeObjectItem("reviews", index)}>Удалить</ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="about" title="About" note="About + stats composition stays together in public shell.">
            <ArrayCard title="About paragraphs" note="Минимум 1 paragraph обязателен для publish." onAdd={() => addPrimitiveItem("about_paragraphs", "")} addLabel="Добавить paragraph">
              {draft.sections.about_paragraphs.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.sections.about_paragraphs.map((item, index) => (
                <div key={`about_${index}`} style={{ display: "grid", gap: "10px" }}>
                  <textarea value={item} onChange={(e) => updatePrimitiveItem("about_paragraphs", index, e.target.value)} style={textareaStyle(4)} />
                  <div><ActionButton tone="secondary" onClick={() => removePrimitiveItem("about_paragraphs", index)}>Удалить</ActionButton></div>
                </div>
              ))}
            </ArrayCard>
          </Panel>

          <Panel id="stats" title="Stats" note="Years / rating / bookings block.">
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <Field label="Years"><input value={draft.stats.years} onChange={(e) => setDraftField("stats", "years", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Rating"><input value={draft.stats.rating} onChange={(e) => setDraftField("stats", "rating", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Bookings"><input value={draft.stats.bookings} onChange={(e) => setDraftField("stats", "bookings", e.target.value)} style={inputStyle()} /></Field>
            </div>
          </Panel>

          <Panel id="images" title="Images" note="Hero now, avatar/portfolio/service-card reserved and already wired into upload pipeline.">
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={nestedCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: "14px" }}>
                    <Field label="Avatar asset id"><input value={draft.images.avatar.image_asset_id} onChange={(e) => setNestedDraftField("images", "avatar", "image_asset_id", e.target.value)} style={inputStyle()} /></Field>
                    <Field label="Avatar URL"><input value={draft.images.avatar.image_url} onChange={(e) => setNestedDraftField("images", "avatar", "image_url", e.target.value)} style={inputStyle()} /></Field>
                    <Field label="Avatar alt"><input value={draft.images.avatar.alt} onChange={(e) => setNestedDraftField("images", "avatar", "alt", e.target.value)} style={inputStyle()} /></Field>
                    <UploadInput onSelect={(file) => handleRootImageUpload("avatar", file)} disabled={!cloudinaryReady || !slug || uploadState["root:avatar"]?.loading} />
                    {uploadState["root:avatar"]?.error ? <div style={warningBoxStyle}>{uploadState["root:avatar"].error}</div> : null}
                  </div>
                  <AssetPreview title="Avatar preview" entity={draft.images.avatar || {}} emptyNote="Avatar пока не загружен." />
                </div>
              </div>

              <ArrayCard title="Portfolio reserved" note="Pipeline ready. Public block будет позже, но upload уже готов." onAdd={() => addImageItem("portfolio")} addLabel="Добавить portfolio image">
                {draft.images.portfolio.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
                {draft.images.portfolio.map((item, index) => (
                  <div key={item.id || `portfolio_${index}`} style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start", padding: "12px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ display: "grid", gap: "10px" }}>
                      <input placeholder="asset id" value={item.image_asset_id || ""} onChange={(e) => setImageArrayItem("portfolio", index, "image_asset_id", e.target.value)} style={inputStyle()} />
                      <input placeholder="image url" value={item.image_url || ""} onChange={(e) => setImageArrayItem("portfolio", index, "image_url", e.target.value)} style={inputStyle()} />
                      <input placeholder="alt" value={item.alt || ""} onChange={(e) => setImageArrayItem("portfolio", index, "alt", e.target.value)} style={inputStyle()} />
                      <UploadInput onSelect={(file) => handleImageArrayUpload("portfolio", index, file)} disabled={!cloudinaryReady || !slug || uploadState[`portfolio:${index}`]?.loading} />
                      {uploadState[`portfolio:${index}`]?.error ? <div style={warningBoxStyle}>{uploadState[`portfolio:${index}`].error}</div> : null}
                      <div><ActionButton tone="secondary" onClick={() => removeImageItem("portfolio", index)}>Удалить</ActionButton></div>
                    </div>
                    <AssetPreview title="Portfolio preview" entity={item} emptyNote="Portfolio image пока не загружено." />
                  </div>
                ))}
              </ArrayCard>

              <ArrayCard title="Service-card reserved" note="Future service-card visuals." onAdd={() => addImageItem("service_card")} addLabel="Добавить service-card image">
                {draft.images.service_card.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
                {draft.images.service_card.map((item, index) => (
                  <div key={item.id || `service_card_${index}`} style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start", padding: "12px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ display: "grid", gap: "10px" }}>
                      <input placeholder="asset id" value={item.image_asset_id || ""} onChange={(e) => setImageArrayItem("service_card", index, "image_asset_id", e.target.value)} style={inputStyle()} />
                      <input placeholder="image url" value={item.image_url || ""} onChange={(e) => setImageArrayItem("service_card", index, "image_url", e.target.value)} style={inputStyle()} />
                      <input placeholder="alt" value={item.alt || ""} onChange={(e) => setImageArrayItem("service_card", index, "alt", e.target.value)} style={inputStyle()} />
                      <UploadInput onSelect={(file) => handleImageArrayUpload("service_card", index, file)} disabled={!cloudinaryReady || !slug || uploadState[`service_card:${index}`]?.loading} />
                      {uploadState[`service_card:${index}`]?.error ? <div style={warningBoxStyle}>{uploadState[`service_card:${index}`].error}</div> : null}
                      <div><ActionButton tone="secondary" onClick={() => removeImageItem("service_card", index)}>Удалить</ActionButton></div>
                    </div>
                    <AssetPreview title="Service-card preview" entity={item} emptyNote="Service-card image пока не загружено." />
                  </div>
                ))}
              </ArrayCard>
            </div>
          </Panel>

          <Panel id="cta" title="CTA" note="Booking band + sticky bottom CTA preserved.">
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Field label="Booking label"><input value={draft.cta.booking_label} onChange={(e) => setDraftField("cta", "booking_label", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Booking URL"><input value={draft.cta.booking_url} onChange={(e) => setDraftField("cta", "booking_url", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Services label"><input value={draft.cta.services_label} onChange={(e) => setDraftField("cta", "services_label", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Services anchor"><input value={draft.cta.services_anchor} onChange={(e) => setDraftField("cta", "services_anchor", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Contact map label"><input value={draft.cta.contact_map_label} onChange={(e) => setDraftField("cta", "contact_map_label", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Sticky CTA label"><input value={draft.cta.sticky_label} onChange={(e) => setDraftField("cta", "sticky_label", e.target.value)} style={inputStyle()} /></Field>
            </div>

            <ArrayCard title="Booking CTA band" note="Bottom booking band before sticky CTA.">
              <div style={{ display: "grid", gap: "10px" }}>
                <input placeholder="Band title" value={draft.sections.booking_band.title} onChange={(e) => setBookingBand("title", e.target.value)} style={inputStyle()} />
                <textarea placeholder="Band text" value={draft.sections.booking_band.text} onChange={(e) => setBookingBand("text", e.target.value)} style={textareaStyle(3)} />
                <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <input placeholder="Booking CTA label" value={draft.sections.booking_band.booking_cta_label} onChange={(e) => setBookingBand("booking_cta_label", e.target.value)} style={inputStyle()} />
                  <input placeholder="Booking CTA URL" value={draft.sections.booking_band.booking_cta_url} onChange={(e) => setBookingBand("booking_cta_url", e.target.value)} style={inputStyle()} />
                  <input placeholder="Services CTA label" value={draft.sections.booking_band.services_cta_label} onChange={(e) => setBookingBand("services_cta_label", e.target.value)} style={inputStyle()} />
                  <input placeholder="Services anchor" value={draft.sections.booking_band.services_anchor} onChange={(e) => setBookingBand("services_anchor", e.target.value)} style={inputStyle()} />
                </div>
              </div>
            </ArrayCard>
          </Panel>

          <Panel id="seo" title="SEO" note="Public metadata.">
            <div style={{ display: "grid", gap: "16px" }}>
              <Field label="SEO title"><input value={draft.seo.title} onChange={(e) => setDraftField("seo", "title", e.target.value)} style={inputStyle()} /></Field>
              <Field label="SEO description"><textarea value={draft.seo.description} onChange={(e) => setDraftField("seo", "description", e.target.value)} style={textareaStyle(3)} /></Field>
              <Field label="Canonical URL"><input value={draft.seo.canonical_url} onChange={(e) => setDraftField("seo", "canonical_url", e.target.value)} style={inputStyle()} /></Field>
            </div>
          </Panel>

          <Panel id="preview-publish" title="Preview / Publish" note="Server preview state + local draft snapshot.">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px"
            }}>
              <StatusCard title="Draft save" value={saveState.kind === "idle" ? "IDLE" : saveState.kind.toUpperCase()} note={saveState.message || "Готов к сохранению."} tone={saveState.kind === "error" ? "warn" : saveState.kind === "success" ? "good" : "neutral"} />
              <StatusCard title="Publish" value={publishState.kind === "idle" ? "IDLE" : publishState.kind.toUpperCase()} note={publishState.message || "Готов к публикации."} tone={publishState.kind === "error" ? "warn" : publishState.kind === "success" ? "good" : "neutral"} />
              <StatusCard title="Preview mode" value={(previewState.mode || "idle").toUpperCase()} note={previewState.message || "Preview ещё не открыт."} tone={previewState.mode === "backend" ? "good" : previewState.mode === "fallback" ? "warn" : "neutral"} />
              <StatusCard title="Published path" value={publicPath} note="Эталонный public shell пока не трогаем." tone="neutral" />
            </div>
          </Panel>
        </div>
      </div>

      <PageSection title="Секции шаблона" subtitle="Это жёсткая карта секций, на которые дальше вешаются данные без трогания PublicMasterPage.">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px"
        }}>
          {sectionItems.map((item, index) => (
            <div key={item.id} style={sectionCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{item.label}</div>
                <div style={badgeIndexStyle}>{index + 1}</div>
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </PageSection>

      {previewState.open ? (
        <div style={previewOverlayStyle}>
          <div style={previewModalStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>Preview · {slug || "master"}</div>
                <div style={{ marginTop: "6px", fontSize: "13px", color: "#6b7280" }}>{previewState.message}</div>
              </div>
              <ActionButton tone="secondary" onClick={handleClosePreview}>Закрыть</ActionButton>
            </div>

            {previewState.loading ? (
              <div style={infoBoxStyle}>Загружаем preview…</div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={previewHeroStyle}>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={previewBadgeStyle}>{previewState.payload?.identity?.hero_badge || "Master preview"}</div>
                    <div style={{ fontSize: "32px", lineHeight: 1.1, fontWeight: 900, color: "#111827" }}>
                      {previewState.payload?.identity?.master_name || "Preview мастера"}
                    </div>
                    <div style={{ fontSize: "16px", color: "#475467", lineHeight: 1.6 }}>
                      {previewState.payload?.identity?.hero_description || previewState.payload?.identity?.profession || "Подзаголовок preview"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                      <a href={previewState.payload?.cta?.booking_url || "#"} style={previewPrimaryCtaStyle}>{previewState.payload?.cta?.booking_label || "Записаться"}</a>
                      <span style={previewSecondaryCtaStyle}>{previewState.payload?.cta?.services_label || "Услуги"}</span>
                    </div>
                  </div>
                  <div style={previewImageCardStyle}>
                    {getAssetPreviewUrl(previewState.payload?.images?.hero || {}) ? (
                      <img src={getAssetPreviewUrl(previewState.payload?.images?.hero || {})} alt={previewState.payload?.images?.hero?.alt || "Hero preview"} style={previewImageRealStyle} />
                    ) : previewState.payload?.images?.hero?.image_asset_id ? (
                      <div style={{ fontSize: "14px", color: "#111827", fontWeight: 700 }}>Hero asset: {previewState.payload.images.hero.image_asset_id}</div>
                    ) : (
                      <div style={{ fontSize: "14px", color: "#6b7280" }}>Hero image не подключён</div>
                    )}
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#667085" }}>{previewState.payload?.images?.hero?.alt || "Hero preview"}</div>
                  </div>
                </div>

                <div style={previewGridStyle}>
                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}>Identity</div>
                    <div style={previewCardTextStyle}>Мастер: {previewState.payload?.identity?.master_name || "—"}</div>
                    <div style={previewCardTextStyle}>Профессия: {previewState.payload?.identity?.profession || "—"}</div>
                    <div style={previewCardTextStyle}>Город: {previewState.payload?.identity?.city || "—"}</div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}>Contacts</div>
                    <div style={previewCardTextStyle}>{previewState.payload?.location?.address || "—"}</div>
                    <div style={previewCardTextStyle}>{previewState.payload?.location?.phone || previewState.payload?.location?.whatsapp || "—"}</div>
                    <div style={previewCardTextStyle}>{previewState.payload?.location?.schedule_text || "—"}</div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}>CTA</div>
                    <div style={previewCardTextStyle}>Кнопка: {previewState.payload?.cta?.booking_label || "—"}</div>
                    <div style={previewCardTextStyle}>URL: {previewState.payload?.cta?.booking_url || "—"}</div>
                    <div style={previewCardTextStyle}>Якорь: {previewState.payload?.cta?.services_anchor || "—"}</div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}>Sections coverage</div>
                    <div style={previewCardTextStyle}>Badges: {previewState.payload?.sections?.badges?.length || 0}</div>
                    <div style={previewCardTextStyle}>Benefits: {previewState.payload?.sections?.benefits?.length || 0}</div>
                    <div style={previewCardTextStyle}>Featured services: {previewState.payload?.sections?.featured_services?.length || 0}</div>
                    <div style={previewCardTextStyle}>Catalog: {previewState.payload?.sections?.service_catalog?.length || 0}</div>
                    <div style={previewCardTextStyle}>Reviews: {previewState.payload?.sections?.reviews?.length || 0}</div>
                    <div style={previewCardTextStyle}>Portfolio: {previewState.payload?.images?.portfolio?.length || 0}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <PageSection title="Быстрые переходы" subtitle="Рабочая навигация вокруг template entry point без смешивания с public template shell.">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <Link to={publicPath} style={linkCardStyle}>
            <div style={linkTitleStyle}>Public page</div>
            <div style={linkTextStyle}>Эталонная публичная страница мастера остаётся отдельной и не чистится на этом этапе.</div>
          </Link>

          <Link to={previewPath} style={linkCardStyle}>
            <div style={linkTitleStyle}>Preview route</div>
            <div style={linkTextStyle}>Маршрут preview для следующего шага parity.</div>
          </Link>

          <a href="#images" style={linkCardStyle}>
            <div style={linkTitleStyle}>Image slots</div>
            <div style={linkTextStyle}>Hero / avatar / portfolio / service-card pipeline уже подключён.</div>
          </a>

          <a href="#preview-publish" style={linkCardStyle}>
            <div style={linkTitleStyle}>Publish state</div>
            <div style={linkTextStyle}>Контроль draft / preview / publish без возврата к прошлым фиксам.</div>
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
  minHeight: "108px"
};

const validationLineStyle = {
  fontSize: "13px",
  lineHeight: 1.5
};

const uploadFieldStyle = {
  display: "grid",
  gap: "8px"
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
  gap: "8px"
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
  zIndex: 50
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
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)"
};

const previewHeroStyle = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "20px",
  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)"
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
  textAlign: "center"
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
  gap: "12px"
};

const previewCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "16px",
  display: "grid",
  gap: "8px"
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
  padding: "16px"
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
