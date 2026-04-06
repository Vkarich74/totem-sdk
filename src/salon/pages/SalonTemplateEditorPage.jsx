import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import PageHeader from "../../cabinet/PageHeader"
import PageSection from "../../cabinet/PageSection"
import {
  getSalonTemplateDocument,
  getSalonTemplatePreview,
  hasInternalTemplateToken,
  publishSalonTemplate,
  saveSalonTemplateDraft
} from "../../api/internal"
import { validateTemplatePayload } from "../../utils/validateTemplate"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"

const sectionItems = [
  { id: "identity", label: "Идентичность", note: "Имя салона, бейдж, оффер и подзаголовок." },
  { id: "contacts", label: "Контакты", note: "Адрес, телефон, WhatsApp, график и карта." },
  { id: "trust", label: "Доверие", note: "Рейтинг, отзывы и completed bookings." },
  { id: "hero", label: "Hero-изображение", note: "Главное изображение и брендовый визуал." },
  { id: "benefits", label: "Преимущества", note: "Преимущества салона в карточках." },
  { id: "popular-services", label: "Популярные услуги", note: "Основные услуги для первого экрана услуг." },
  { id: "catalog", label: "Полный каталог", note: "Полный каталог услуг и цен." },
  { id: "promos", label: "Акции", note: "Акции и офферы." },
  { id: "gallery", label: "Галерея", note: "Галерея интерьера, работ и атмосферы." },
  { id: "reviews", label: "Отзывы", note: "Отзывы клиентов." },
  { id: "about", label: "О салоне", note: "Параграфы о салоне и позиционировании." },
  { id: "team", label: "Команда", note: "Команда салона и карточки мастеров." },
  { id: "map", label: "Карта", note: "Карта и location block." },
  { id: "cta", label: "CTA", note: "Кнопки записи и привязка к services anchor." },
  { id: "seo", label: "SEO", note: "SEO title, description и canonical." },
  { id: "preview-publish", label: "Предпросмотр / Публикация", note: "Предпросмотр, publish и контроль статуса." }
]

const EMPTY_DRAFT = {
  identity: {
    salon_name: "",
    hero_badge: "",
    slogan: "",
    subtitle: ""
  },
  contact: {
    address: "",
    district: "",
    city: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    telegram: "",
    schedule_text: "",
    map_embed_url: ""
  },
  trust: {
    rating_value: "",
    review_count: "",
    completed_bookings: 0,
    trust_note: ""
  },
  cta: {
    booking_label: "",
    booking_url: "",
    services_label: "",
    services_anchor: ""
  },
  sections: {
    benefits: [],
    popular_services: [],
    full_service_list: [],
    promos: [],
    gallery: [],
    reviews: [],
    about_paragraphs: [],
    masters: []
  },
  images: {
    hero: { image_asset_id: null, alt: "" },
    logo: { image_asset_id: null, alt: "" },
    promo: { image_asset_id: null, alt: "" },
    assets: {}
  },
  seo: {
    title: "",
    description: "",
    canonical_url: ""
  }}

const SALON_OWNER_TYPE = "salon"
const SALON_ASSET_KINDS = {
  hero: "hero",
  logo: "logo",
  promo: "promo",
  gallery: "gallery",
  services: "services",
  reviews: "reviews",
  team: "team"
}

const SALON_ASSET_KIND_VALUES = Object.freeze(Object.values(SALON_ASSET_KINDS))

function resolveSalonAssetKind(assetKind) {
  const normalized = String(assetKind || "").trim().toLowerCase()
  if (!SALON_ASSET_KIND_VALUES.includes(normalized)) {
    throw new Error(`SALON_ASSET_KIND_INVALID:${assetKind || "unknown"}`)
  }
  return normalized
}

function mergeDraft(source = {}) {
  return {
    ...EMPTY_DRAFT,
    ...source,
    identity: { ...EMPTY_DRAFT.identity, ...(source.identity || {}) },
    contact: { ...EMPTY_DRAFT.contact, ...(source.contact || {}) },
    trust: { ...EMPTY_DRAFT.trust, ...(source.trust || {}) },
    cta: { ...EMPTY_DRAFT.cta, ...(source.cta || {}) },
    sections: { ...EMPTY_DRAFT.sections, ...(source.sections || {}) },
    images: {
      ...EMPTY_DRAFT.images,
      ...(source.images || {}),
      hero: { ...EMPTY_DRAFT.images.hero, ...(source.images?.hero || {}) },
      logo: { ...EMPTY_DRAFT.images.logo, ...(source.images?.logo || {}) },
      promo: { ...EMPTY_DRAFT.images.promo, ...(source.images?.promo || {}) },
      assets: source.images?.assets || {}
    },
    seo: { ...EMPTY_DRAFT.seo, ...(source.seo || {}) }
  }
}

function extractMessage(result, fallback) {
  return (
    result?.detail?.json?.message ||
    result?.detail?.json?.error ||
    result?.detail?.text ||
    result?.error ||
    fallback
  )
}

function buildPreviewPayload(draft, slug) {
  return {
    identity: draft?.identity || {},
    contact: draft?.contact || {},
    trust: draft?.trust || {},
    cta: draft?.cta || {},
    images: draft?.images || {},
    seo: draft?.seo || {},
    sections: draft?.sections || {},
    slug: slug || ""
  }
}

function buildMapUrl(contact = {}) {
  const parts = [contact.address, contact.district, contact.city]
    .map((value) => String(value || "").trim())
    .filter(Boolean)

  if (!parts.length) {
    return ""
  }

  return `https://maps.google.com/?q=${encodeURIComponent(parts.join(", "))}`
}

function hasHardErrors(validationResult) {
  return Array.isArray(validationResult?.hard_errors) && validationResult.hard_errors.length > 0
}

function isTemplatePublishable(validationResult) {
  return Boolean(validationResult?.is_publishable) && !hasHardErrors(validationResult)
}

function createBenefitItem() {
  return {
    id: `benefit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    text: "",
    is_active: true
  }
}

function createPopularServiceItem() {
  return {
    id: `popular-service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    description: "",
    price: "",
    duration_min: "",
    image_asset_id: "",
    image_secure_url: "",
    image_public_id: "",
    is_active: true
  }
}

function createPromoItem(nextIndex = 0) {
  return {
    id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    subtitle: "",
    promo_code: "",
    valid_until: "",
    cta_label: "",
    cta_url: "",
    image_asset_id: "",
    image_secure_url: "",
    image_public_id: "",
    is_active: true,
    slot_index: nextIndex
  }
}

function createGalleryItem(nextIndex = 0) {
  return {
    id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    image_asset_id: "",
    image_secure_url: "",
    image_public_id: "",
    alt: "",
    slot_index: nextIndex,
    is_active: true
  }
}

function createReviewItem(nextIndex = 0) {
  return {
    id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: "",
    text: "",
    rating: 5,
    is_active: true,
    slot_index: nextIndex
  }
}

function createMasterItem(nextIndex = 0) {
  return {
    id: `master-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    role: "",
    avatar_asset_id: "",
    avatar_secure_url: "",
    avatar_public_id: "",
    bio: "",
    experience_years: "",
    is_active: true,
    slot_index: nextIndex
  }
}

function buildLocalDocument(previous, draft, slug, mode, validationResult) {
  const nowIso = new Date().toISOString()
  const current = previous || {}
  const validation = validationResult || validateTemplatePayload(draft)

  return {
    ...current,
    owner_type: SALON_OWNER_TYPE,
    owner_slug: slug,
    template_version: current.template_version || "v1",
    status: {
      ...(current.status || {}),
      is_dirty: mode === "save",
      draft_exists: true,
      publish_state: mode === "publish" ? "published" : (current.status?.publish_state || "draft"),
      is_publishable: Boolean(validation.is_publishable),
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
  }
}

function getValidationList(values) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === "string") return item
    if (item?.message) return item.message
    if (item?.code) return item.code
    return JSON.stringify(item)
  })
}

function getCloudinaryConfig() {
  return {
    cloudName: String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim(),
    uploadPreset: String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim(),
    rootFolder: String(import.meta.env.VITE_CLOUDINARY_ROOT_FOLDER || "totem_media").trim() || "totem_media"
  }
}

function buildCloudinaryAssetFolder(ownerType, ownerSlug, assetKind, rootFolder) {
  const normalizedOwnerType = String(ownerType || SALON_OWNER_TYPE).trim().toLowerCase() || SALON_OWNER_TYPE
  const normalizedAssetKind = resolveSalonAssetKind(assetKind)
  return `${rootFolder}/${normalizedOwnerType}/${ownerSlug}/${normalizedAssetKind}`
}

function buildCloudinaryContext(meta) {
  const ownerType = String(meta.ownerType || SALON_OWNER_TYPE).trim().toLowerCase() || SALON_OWNER_TYPE
  const assetKind = resolveSalonAssetKind(meta.assetKind)
  return `owner_type=${ownerType}|owner_slug=${meta.ownerSlug}|asset_kind=${assetKind}`
}

function buildCloudinaryTags(meta) {
  const ownerType = String(meta.ownerType || SALON_OWNER_TYPE).trim().toLowerCase() || SALON_OWNER_TYPE
  const assetKind = resolveSalonAssetKind(meta.assetKind)
  return ["totem", ownerType, assetKind].filter(Boolean).join(",")
}

function normalizeCloudinaryAsset(payload, meta) {
  const ownerType = String(meta.ownerType || SALON_OWNER_TYPE).trim().toLowerCase() || SALON_OWNER_TYPE
  const assetKind = resolveSalonAssetKind(meta.assetKind)

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
  }
}

async function uploadImageToCloudinary(file, meta) {
  const config = getCloudinaryConfig()

  if (!config.cloudName || !config.uploadPreset) {
    throw new Error("CLOUDINARY_CONFIG_MISSING")
  }

  const assetFolder = buildCloudinaryAssetFolder(meta.ownerType, meta.ownerSlug, meta.assetKind, config.rootFolder)
  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", config.uploadPreset)
  form.append("asset_folder", assetFolder)
  form.append("context", buildCloudinaryContext(meta))
  form.append("tags", buildCloudinaryTags(meta))

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body: form
  })

  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok || !json) {
    throw new Error(json?.error?.message || text || "CLOUDINARY_UPLOAD_FAILED")
  }

  return normalizeCloudinaryAsset(json, { ...meta, assetFolder })
}

function getAssetPreviewUrl(entity = {}) {
  return entity?.secure_url || entity?.image_secure_url || entity?.avatar_secure_url || ""
}

function AssetPreview({ title = "Preview", entity = {}, emptyNote = "Изображение ещё не загружено." }) {
  const previewUrl = getAssetPreviewUrl(entity)
  const assetId = entity?.image_asset_id || entity?.avatar_asset_id || entity?.asset_id || ""

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
  )
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
          const file = event.target.files?.[0]
          if (file) {
            onSelect(file)
          }
          event.target.value = ""
        }}
        style={{ fontSize: "13px" }}
      />
    </label>
  )
}

function StatusCard({ title, value, note, tone = "neutral" }) {
  const palette = tone === "good"
    ? { border: "#abefc6", bg: "#ecfdf3", value: "#027a48" }
    : tone === "warn"
      ? { border: "#fde68a", bg: "#fffbeb", value: "#b45309" }
      : { border: "#e5e7eb", bg: "#ffffff", value: "#111827" }

  return (
    <div style={{
      border: `1px solid ${palette.border}`,
      background: palette.bg,
      borderRadius: "14px",
      padding: "16px"
    }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: palette.value }}>{value}</div>
      {note ? (
        <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}>{note}</div>
      ) : null}
    </div>
  )
}

function ActionButton({ children, tone = "primary", disabled = false, onClick }) {
  const palette = tone === "secondary"
    ? {
        background: "#ffffff",
        color: "#111827",
        border: "1px solid #d0d5dd"
      }
    : {
        background: disabled ? "#93c5fd" : "#2563eb",
        color: "#ffffff",
        border: "1px solid #2563eb"
      }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        appearance: "none",
        borderRadius: "12px",
        padding: "10px 14px",
        fontSize: "14px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        ...palette
      }}
    >
      {children}
    </button>
  )
}

function Field({ label, value, onChange, placeholder = "", multiline = false, readOnly = false }) {
  const Component = multiline ? "textarea" : "input"

  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}>{label}</span>
      <Component
        value={value}
        onChange={readOnly ? undefined : (event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={multiline ? 4 : undefined}
        readOnly={readOnly}
        style={{
          width: "100%",
          border: "1px solid #d0d5dd",
          borderRadius: "12px",
          padding: multiline ? "12px 14px" : "11px 14px",
          fontSize: "14px",
          color: "#111827",
          background: readOnly ? "#f8fafc" : "#ffffff",
          resize: multiline ? "vertical" : "none",
          minHeight: multiline ? "108px" : undefined,
          boxSizing: "border-box"
        }}
      />
    </label>
  )
}

export default function SalonTemplateEditorPage() {
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)
  const { identity, billingAccess, canWrite } = useSalonContext()

  const [documentState, setDocumentState] = useState(null)
  const [draft, setDraft] = useState(mergeDraft())
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [saveState, setSaveState] = useState({ kind: "idle", message: "" })
  const [publishState, setPublishState] = useState({ kind: "idle", message: "" })
  const [previewState, setPreviewState] = useState({ open: false, loading: false, payload: null, mode: "idle", message: "" })
  const [uploadState, setUploadState] = useState({})

  const accessState = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  const readyForWrite = canWrite !== false && accessState !== "blocked"
  const hasToken = hasInternalTemplateToken()
  const cloudinaryConfig = getCloudinaryConfig()
  const cloudinaryReady = Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset)

  useEffect(() => {
    let cancelled = false

    async function loadDocument() {
      if (!slug) {
        setPageLoading(false)
        setPageError("SLUG_MISSING")
        return
      }

      if (!hasToken) {
        const fallbackDraft = mergeDraft(draft)
        const localValidation = validateTemplatePayload(fallbackDraft)
        const localDocument = buildLocalDocument(null, fallbackDraft, slug, "save", localValidation)
        if (cancelled) return
        setDocumentState(localDocument)
        setDraft(fallbackDraft)
        setPageError(null)
        setPageLoading(false)
        return
      }

      setPageLoading(true)
      setPageError(null)

      const result = await getSalonTemplateDocument(slug)

      if (cancelled) return

      if (!result.ok) {
        setPageError(extractMessage(result, "SALON_TEMPLATE_DOCUMENT_FETCH_FAILED"))
        setPageLoading(false)
        return
      }

      const nextDocument = result.document || null
      setDocumentState(nextDocument)
      setDraft(mergeDraft(nextDocument?.draft || {}))
      setPageLoading(false)
    }

    loadDocument()

    return () => {
      cancelled = true
    }
  }, [slug, hasToken])

  const quickLinks = useMemo(() => ({
    publicPage: slug ? `/salon/${slug}` : "/salon",
    bookings: buildSalonPath(slug, "bookings"),
    services: buildSalonPath(slug, "services"),
    dashboard: buildSalonPath(slug, "dashboard")
  }), [slug])

  const validation = documentState?.validation || {}
  const mapUrl = buildMapUrl(draft.contact || {})

  const previewDraft = useMemo(() => ({
    ...draft,
    contact: {
      ...draft.contact,
      map_embed_url: mapUrl
    }
  }), [draft, mapUrl])

  const liveValidation = useMemo(() => validateTemplatePayload(previewDraft), [previewDraft])
  const hardErrors = getValidationList(liveValidation?.hard_errors)
  const warnings = getValidationList(liveValidation?.warnings)
  const warningCount = warnings.length
  const errorCount = hardErrors.length
  const completionScore = Number(liveValidation?.completeness_score || validation?.completeness_score || 0)
  const lastSavedAt = documentState?.meta?.last_saved_at || documentState?.last_saved_at || null

  const benefits = Array.isArray(draft.sections?.benefits) ? draft.sections.benefits : []
  const popularServices = Array.isArray(draft.sections?.popular_services) ? draft.sections.popular_services : []
  const promos = Array.isArray(draft.sections?.promos) ? draft.sections.promos : []
  const galleryItems = Array.isArray(draft.sections?.gallery) ? draft.sections.gallery : []
  const reviews = Array.isArray(draft.sections?.reviews) ? draft.sections.reviews : []
  const masters = Array.isArray(draft.sections?.masters) ? draft.sections.masters : []

  function resetStateMessages() {
    setSaveState({ kind: "idle", message: "" })
    setPublishState({ kind: "idle", message: "" })
  }

  function setUploadFlag(key, value) {
    setUploadState((current) => ({ ...current, [key]: value }))
  }

  function updateDraftSection(section, field, value) {
    setDraft((current) => {
      const next = {
        ...current,
        [section]: {
          ...(current[section] || {}),
          [field]: value
        }
      }

      if (section === "contact" && ["address", "district", "city"].includes(field)) {
        next.contact.map_embed_url = buildMapUrl(next.contact)
      }

      return next
    })
    resetStateMessages()
  }

  function updateRootImage(slot, patch) {
    setDraft((current) => ({
      ...current,
      images: {
        ...(current.images || {}),
        [slot]: {
          ...(current.images?.[slot] || {}),
          ...patch
        },
        assets: {
          ...(current.images?.assets || {}),
          [slot]: {
            ...(current.images?.assets?.[slot] || {}),
            ...patch
          }
        }
      }
    }))
    resetStateMessages()
  }

  function applyCloudinaryAssetToRootImage(slot, asset) {
    updateRootImage(slot, {
      image_asset_id: asset.asset_id,
      secure_url: asset.secure_url,
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
    })
  }

  async function handleRootImageUpload(slot, file) {
    if (!slug) return

    const uploadKey = `root:${slot}`
    setUploadFlag(uploadKey, { loading: true, error: "" })

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: SALON_OWNER_TYPE,
        ownerSlug: slug,
        assetKind: resolveSalonAssetKind(slot),
        alt: draft.images?.[slot]?.alt || ""
      })
      applyCloudinaryAssetToRootImage(slot, asset)
      setUploadFlag(uploadKey, { loading: false, error: "" })
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" })
    }
  }

  function updateBenefitsItem(itemId, field, value) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        benefits: (current.sections?.benefits || []).map((item) =>
          item.id === itemId
            ? { ...item, [field]: value }
            : item
        )
      }
    }))
    resetStateMessages()
  }

  function handleAddBenefit() {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        benefits: [...(current.sections?.benefits || []), createBenefitItem()]
      }
    }))
    resetStateMessages()
  }

  function handleRemoveBenefit(itemId) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        benefits: (current.sections?.benefits || []).filter((item) => item.id !== itemId)
      }
    }))
    resetStateMessages()
  }

  function updatePopularServiceItem(itemId, field, value) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        popular_services: (current.sections?.popular_services || []).map((item) =>
          item.id === itemId
            ? { ...item, [field]: value }
            : item
        )
      }
    }))
    resetStateMessages()
  }

  function applyPopularServiceAsset(itemId, asset) {
    updatePopularServiceItem(itemId, "image_asset_id", asset.asset_id)
    updatePopularServiceItem(itemId, "image_secure_url", asset.secure_url)
    updatePopularServiceItem(itemId, "image_public_id", asset.public_id)
  }

  async function handlePopularServiceUpload(itemId, file) {
    if (!slug) return

    const uploadKey = `popular:${itemId}`
    setUploadFlag(uploadKey, { loading: true, error: "" })

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: SALON_OWNER_TYPE,
        ownerSlug: slug,
        assetKind: SALON_ASSET_KINDS.services
      })
      applyPopularServiceAsset(itemId, asset)
      setUploadFlag(uploadKey, { loading: false, error: "" })
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" })
    }
  }

  function handleAddPopularService() {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        popular_services: [...(current.sections?.popular_services || []), createPopularServiceItem()]
      }
    }))
    resetStateMessages()
  }

  function handleRemovePopularService(itemId) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        popular_services: (current.sections?.popular_services || []).filter((item) => item.id !== itemId)
      }
    }))
    resetStateMessages()
  }

  function updatePromoItem(itemId, field, value) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        promos: (current.sections?.promos || []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                [field]:
                  field === "slot_index"
                    ? Number(value || 0)
                    : field === "is_active"
                      ? Boolean(value)
                      : value
              }
            : item
        )
      }
    }))
    resetStateMessages()
  }

  function applyPromoAsset(itemId, asset) {
    updatePromoItem(itemId, "image_asset_id", asset.asset_id)
    updatePromoItem(itemId, "image_secure_url", asset.secure_url)
    updatePromoItem(itemId, "image_public_id", asset.public_id)
  }

  async function handlePromoUpload(itemId, file) {
    if (!slug) return

    const uploadKey = `promo:${itemId}`
    setUploadFlag(uploadKey, { loading: true, error: "" })

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: SALON_OWNER_TYPE,
        ownerSlug: slug,
        assetKind: SALON_ASSET_KINDS.promo
      })
      applyPromoAsset(itemId, asset)
      setUploadFlag(uploadKey, { loading: false, error: "" })
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" })
    }
  }

  function handleAddPromo() {
    setDraft((current) => {
      const currentPromos = current.sections?.promos || []
      return {
        ...current,
        sections: {
          ...(current.sections || {}),
          promos: [...currentPromos, createPromoItem(currentPromos.length)]
        }
      }
    })
    resetStateMessages()
  }

  function handleRemovePromo(itemId) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        promos: (current.sections?.promos || []).filter((item) => item.id !== itemId)
      }
    }))
    resetStateMessages()
  }

  function updateGalleryItem(itemId, field, value) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        gallery: (current.sections?.gallery || []).map((item) =>
          item.id === itemId
            ? { ...item, [field]: field === "slot_index" ? Number(value || 0) : value }
            : item
        )
      }
    }))
    resetStateMessages()
  }

  function applyGalleryAsset(itemId, asset) {
    updateGalleryItem(itemId, "image_asset_id", asset.asset_id)
    updateGalleryItem(itemId, "image_secure_url", asset.secure_url)
    updateGalleryItem(itemId, "image_public_id", asset.public_id)
  }

  async function handleGalleryUpload(itemId, file) {
    if (!slug) return

    const uploadKey = `gallery:${itemId}`
    setUploadFlag(uploadKey, { loading: true, error: "" })

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: SALON_OWNER_TYPE,
        ownerSlug: slug,
        assetKind: SALON_ASSET_KINDS.gallery
      })
      applyGalleryAsset(itemId, asset)
      setUploadFlag(uploadKey, { loading: false, error: "" })
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" })
    }
  }

  function handleAddGalleryItem() {
    setDraft((current) => {
      const currentGallery = current.sections?.gallery || []
      return {
        ...current,
        sections: {
          ...(current.sections || {}),
          gallery: [...currentGallery, createGalleryItem(currentGallery.length)]
        }
      }
    })
    resetStateMessages()
  }

  function handleRemoveGalleryItem(itemId) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        gallery: (current.sections?.gallery || []).filter((item) => item.id !== itemId)
      }
    }))
    resetStateMessages()
  }

  function updateReviewItem(itemId, field, value) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        reviews: (current.sections?.reviews || []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                [field]:
                  field === "rating" || field === "slot_index"
                    ? Number(value || 0)
                    : field === "is_active"
                      ? Boolean(value)
                      : value
              }
            : item
        )
      }
    }))
    resetStateMessages()
  }

  function handleAddReview() {
    setDraft((current) => {
      const currentReviews = current.sections?.reviews || []
      return {
        ...current,
        sections: {
          ...(current.sections || {}),
          reviews: [...currentReviews, createReviewItem(currentReviews.length)]
        }
      }
    })
    resetStateMessages()
  }

  function handleRemoveReview(itemId) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        reviews: (current.sections?.reviews || []).filter((item) => item.id !== itemId)
      }
    }))
    resetStateMessages()
  }

  function updateMasterItem(itemId, field, value) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        masters: (current.sections?.masters || []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                [field]:
                  field === "slot_index" || field === "experience_years"
                    ? value === "" ? "" : Number(value)
                    : field === "is_active"
                      ? Boolean(value)
                      : value
              }
            : item
        )
      }
    }))
    resetStateMessages()
  }

  function applyMasterAsset(itemId, asset) {
    updateMasterItem(itemId, "avatar_asset_id", asset.asset_id)
    updateMasterItem(itemId, "avatar_secure_url", asset.secure_url)
    updateMasterItem(itemId, "avatar_public_id", asset.public_id)
  }

  async function handleMasterAvatarUpload(itemId, file) {
    if (!slug) return

    const uploadKey = `team:${itemId}`
    setUploadFlag(uploadKey, { loading: true, error: "" })

    try {
      const asset = await uploadImageToCloudinary(file, {
        ownerType: SALON_OWNER_TYPE,
        ownerSlug: slug,
        assetKind: SALON_ASSET_KINDS.team
      })
      applyMasterAsset(itemId, asset)
      setUploadFlag(uploadKey, { loading: false, error: "" })
    } catch (error) {
      setUploadFlag(uploadKey, { loading: false, error: error?.message || "UPLOAD_FAILED" })
    }
  }

  function handleAddMaster() {
    setDraft((current) => {
      const currentMasters = current.sections?.masters || []
      return {
        ...current,
        sections: {
          ...(current.sections || {}),
          masters: [...currentMasters, createMasterItem(currentMasters.length)]
        }
      }
    })
    resetStateMessages()
  }

  function handleRemoveMaster(itemId) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        masters: (current.sections?.masters || []).filter((item) => item.id !== itemId)
      }
    }))
    resetStateMessages()
  }

  async function handleOpenPreview() {
    if (!slug) return

    const nextDraft = previewDraft

    if (!hasToken) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(nextDraft, slug),
        mode: "mock",
        message: "Локальный preview открыт без backend auth. Это mock по текущему draft."
      })
      return
    }

    setPreviewState({
      open: true,
      loading: true,
      payload: null,
      mode: "loading",
      message: "Сохраняем draft и загружаем preview…"
    })

    const saveResult = await saveSalonTemplateDraft(nextDraft, slug)

    if (!saveResult.ok) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(nextDraft, slug),
        mode: "fallback",
        message: extractMessage(saveResult, "DRAFT_SAVE_BEFORE_PREVIEW_FAILED — открыт fallback preview.")
      })
      return
    }

    const savedDocument = saveResult.document || null
    const savedValidation = savedDocument?.validation || validateTemplatePayload(nextDraft)

    setDocumentState(savedDocument ? {
      ...savedDocument,
      validation: savedValidation,
      status: {
        ...(savedDocument?.status || {}),
        is_publishable: Boolean(savedValidation?.is_publishable)
      }
    } : null)
    setDraft(mergeDraft(savedDocument?.draft || nextDraft))
    setSaveState({ kind: "success", message: "Черновик сохранён перед preview." })
    setPublishState({ kind: "idle", message: "" })

    const result = await getSalonTemplatePreview(slug)

    if (!result.ok) {
      setPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(nextDraft, slug),
        mode: "fallback",
        message: extractMessage(result, "PREVIEW_FETCH_FAILED — открыт fallback preview.")
      })
      return
    }

    setPreviewState({
      open: true,
      loading: false,
      payload: result.payload || buildPreviewPayload(nextDraft, slug),
      mode: "backend",
      message: result.is_ready_for_preview ? "Preview получен из backend." : "Preview получен, но страница ещё not ready."
    })
  }

  function handleClosePreview() {
    setPreviewState({ open: false, loading: false, payload: null, mode: "idle", message: "" })
  }

  async function handleSaveDraft() {
    if (!readyForWrite || !slug) return

    const nextDraft = previewDraft
    const validationResult = validateTemplatePayload(nextDraft)

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, slug, "save", validationResult)
      setDocumentState(nextDocument)
      setDraft(mergeDraft(nextDocument.draft || nextDraft))
      setSaveState({
        kind: "success",
        message: !hasHardErrors(validationResult)
          ? "Черновик сохранён локально. Это mock-режим до подключения полной цепочки доступа."
          : "Черновик сохранён локально с validation errors. Проверь обязательные поля перед публикацией."
      })
      setPublishState({ kind: "idle", message: "" })
      return
    }

    setSaveState({ kind: "saving", message: "Сохраняем draft…" })

    const result = await saveSalonTemplateDraft(nextDraft, slug)

    if (!result.ok) {
      setSaveState({
        kind: "error",
        message: extractMessage(result, "DRAFT_SAVE_FAILED")
      })
      return
    }

    const nextDocument = result.document || null
    const mergedValidation = nextDocument?.validation || validationResult
    setDocumentState({
      ...nextDocument,
      validation: mergedValidation,
      status: {
        ...(nextDocument?.status || {}),
        is_publishable: Boolean(mergedValidation?.is_publishable)
      }
    })
    setDraft(mergeDraft(nextDocument?.draft || nextDraft))
    setSaveState({ kind: "success", message: "Черновик сохранён." })
    setPublishState({ kind: "idle", message: "" })
  }

  async function handlePublish() {
    if (!readyForWrite || !slug) return

    const nextDraft = previewDraft
    const validationResult = validateTemplatePayload(nextDraft)

    if (!isTemplatePublishable(validationResult)) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, slug, "save", validationResult)
      setDocumentState(nextDocument)
      setDraft(mergeDraft(nextDraft))
      setPublishState({
        kind: "error",
        message: "Публикация заблокирована: исправь обязательные поля template."
      })
      setSaveState({ kind: "idle", message: "" })
      return
    }

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, slug, "publish", validationResult)
      setDocumentState(nextDocument)
      setDraft(mergeDraft(nextDocument.draft || nextDraft))
      setPublishState({
        kind: "success",
        message: "Публикация выполнена локально. Это mock-режим до подключения полной цепочки доступа."
      })
      setSaveState({ kind: "idle", message: "" })
      return
    }

    setPublishState({ kind: "publishing", message: "Публикуем страницу…" })

    const saveResult = await saveSalonTemplateDraft(nextDraft, slug)
    if (!saveResult.ok) {
      setPublishState({
        kind: "error",
        message: extractMessage(saveResult, "DRAFT_SAVE_BEFORE_PUBLISH_FAILED")
      })
      return
    }

    const result = await publishSalonTemplate(slug, "system:1")

    if (!result.ok) {
      setPublishState({
        kind: "error",
        message: extractMessage(result, "PUBLISH_FAILED")
      })
      return
    }

    const nextDocument = result.document || null
    const mergedValidation = nextDocument?.validation || validationResult
    setDocumentState({
      ...nextDocument,
      validation: mergedValidation,
      status: {
        ...(nextDocument?.status || {}),
        is_publishable: Boolean(mergedValidation?.is_publishable)
      }
    })
    setDraft(mergeDraft(nextDocument?.draft || nextDraft))
    setPublishState({ kind: "success", message: "Страница опубликована." })
    setSaveState({ kind: "idle", message: "" })
  }

  const blockTone = pageError ? "warn" : hasToken ? "good" : "neutral"
  const blockValue = pageLoading ? "Загрузка" : pageError ? "Ошибка" : hasToken ? "Готово" : "Локальный режим"
  const blockNote = pageError
    ? pageError
    : hasToken
      ? "Страница читает document и позволяет работать с backend."
      : "Полная цепочка доступа ещё не внедрена. Страница работает в local mock режиме без поломки кабинета."

  const sectionHealthItems = [
    { label: "Benefits", value: benefits.length },
    { label: "Popular services", value: popularServices.length },
    { label: "Promos", value: promos.length },
    { label: "Gallery", value: galleryItems.length },
    { label: "Reviews", value: reviews.length },
    { label: "Team", value: masters.length }
  ]

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <PageHeader
        title="Редактор публичной страницы"
        subtitle={`Рабочая точка template system для салона${slug ? ` · ${slug}` : ""}. Здесь начинается draft / preview / publish flow без изменения публичного шаблона.`}
        actions={(
          <>
            <ActionButton tone="secondary" onClick={handleSaveDraft} disabled={!readyForWrite || pageLoading || saveState.kind === "saving"}>
              {saveState.kind === "saving" ? "Сохраняем…" : "Сохранить draft"}
            </ActionButton>
            <ActionButton tone="secondary" onClick={handleOpenPreview}>Открыть preview</ActionButton>
            <ActionButton onClick={handlePublish} disabled={!readyForWrite || pageLoading || publishState.kind === "publishing"}>
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
        <StatusCard
          title="Slug"
          value={slug || "—"}
          note={identity?.name || identity?.title || "Салон определяется из текущего маршрута и SalonContext."}
        />
        <StatusCard
          title="Готовность к публикации"
          value={liveValidation?.is_publishable ? "Готово" : "Не готово"}
          note={`Ошибок: ${errorCount} · Warnings: ${warningCount}`}
          tone={liveValidation?.is_publishable ? "good" : errorCount ? "warn" : "neutral"}
        />
        <StatusCard
          title="Заполнение"
          value={`${completionScore}%`}
          note={lastSavedAt ? `Последнее сохранение: ${new Date(lastSavedAt).toLocaleString()}` : "Сохранения ещё не было."}
        />
      </div>

      {!hasToken ? (
        <PageSection title="Локальный режим" subtitle="Полная цепочка доступа ещё не внедрена, поэтому backend auth для browser не обязателен на этом этапе.">
          <div style={infoBoxStyle}>
            Страница работает в local mock режиме. Это не ломает контракт: сейчас мы фиксируем editor flow, preview и publish UI, не трогая login system.
          </div>
        </PageSection>
      ) : null}

      <PageSection title="Cloudinary pipeline" subtitle="Upload layer подключён прямо в editor. Ручной image_asset_id оставлен как резерв, ничего не удалено.">
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            <StatusCard title="Cloud name" value={cloudinaryConfig.cloudName || "MISSING"} tone={cloudinaryConfig.cloudName ? "good" : "warn"} />
            <StatusCard title="Upload preset" value={cloudinaryConfig.uploadPreset || "MISSING"} tone={cloudinaryConfig.uploadPreset ? "good" : "warn"} />
            <StatusCard title="Root folder" value={cloudinaryConfig.rootFolder} note={`Storage contract: ${cloudinaryConfig.rootFolder}/${SALON_OWNER_TYPE}/<slug>/<asset_kind>`} tone="neutral" />
            <StatusCard title="Upload state" value={cloudinaryReady ? "READY" : "BLOCKED"} note={cloudinaryReady ? "Можно загружать изображения прямо из editor." : "Нужно заполнить VITE_CLOUDINARY_* в SDK env."} tone={cloudinaryReady ? "good" : "warn"} />
          </div>
        </div>
      </PageSection>

      <PageSection title="Validation UX" subtitle="Живая проверка текущего draft без ожидания save. Это финальный контроль перед publish.">
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            <StatusCard title="Live publish state" value={liveValidation?.is_publishable ? "READY" : "BLOCKED"} note="Статус считается по текущему draft, а не только по последнему save." tone={liveValidation?.is_publishable ? "good" : "warn"} />
            <StatusCard title="Hard errors" value={String(errorCount)} note="Эти ошибки блокируют publish." tone={errorCount ? "warn" : "good"} />
            <StatusCard title="Warnings" value={String(warningCount)} note="Не блокируют publish, но ухудшают готовность." tone={warningCount ? "warn" : "good"} />
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

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            {sectionHealthItems.map((item) => (
              <div key={item.label} style={miniMetricCardStyle}>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>{item.label}</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#111827" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection title="Рабочий блок v1" subtitle="Живой binding: Identity + Contacts + Benefits + Popular Services + Promos + Gallery + Reviews + Team + CTA. Остальные секции пока остаются structure-first, без тяжёлой формы.">
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}>Идентичность</div>
            <div style={editorGridStyle}>
              <Field label="Название салона" value={draft.identity.salon_name} onChange={(value) => updateDraftSection("identity", "salon_name", value)} placeholder="TOTEM Demo Salon" />
              <Field label="Бейдж hero" value={draft.identity.hero_badge} onChange={(value) => updateDraftSection("identity", "hero_badge", value)} placeholder="Премиальный салон" />
              <Field label="Главный оффер" value={draft.identity.slogan} onChange={(value) => updateDraftSection("identity", "slogan", value)} placeholder="Главный оффер салона" />
              <Field label="Подзаголовок" value={draft.identity.subtitle} onChange={(value) => updateDraftSection("identity", "subtitle", value)} placeholder="Уточняющий подзаголовок" />
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}>Контакты</div>
            <div style={editorGridStyle}>
              <Field label="Адрес" value={draft.contact.address} onChange={(value) => updateDraftSection("contact", "address", value)} placeholder="Bishkek, Chui Avenue 100" />
              <Field label="Район" value={draft.contact.district} onChange={(value) => updateDraftSection("contact", "district", value)} placeholder="Центр" />
              <Field label="Город" value={draft.contact.city} onChange={(value) => updateDraftSection("contact", "city", value)} placeholder="Bishkek" />
              <Field label="Телефон" value={draft.contact.phone} onChange={(value) => updateDraftSection("contact", "phone", value)} placeholder="+996555000111" />
              <Field label="WhatsApp" value={draft.contact.whatsapp} onChange={(value) => updateDraftSection("contact", "whatsapp", value)} placeholder="+996555000111" />
              <Field label="График" value={draft.contact.schedule_text} onChange={(value) => updateDraftSection("contact", "schedule_text", value)} placeholder="Ежедневно 10:00–20:00" />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Ссылка на карту" value={mapUrl} onChange={() => {}} placeholder="Собирается автоматически по адресу" readOnly />
              </div>
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}>Brand assets</div>
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={nestedCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: "14px" }}>
                    <Field label="Hero image asset id" value={draft.images?.hero?.image_asset_id || ""} onChange={(value) => updateRootImage("hero", { image_asset_id: value })} placeholder="cld:..." />
                    <Field label="Hero alt" value={draft.images?.hero?.alt || ""} onChange={(value) => updateRootImage("hero", { alt: value })} placeholder="Главное фото салона" />
                    <UploadInput onSelect={(file) => handleRootImageUpload("hero", file)} disabled={!cloudinaryReady || !slug || uploadState["root:hero"]?.loading} />
                    {uploadState["root:hero"]?.error ? <div style={warningBoxStyle}>{uploadState["root:hero"].error}</div> : null}
                  </div>
                  <AssetPreview title="Hero preview" entity={draft.images?.hero || {}} emptyNote="Hero пока не загружен." />
                </div>
              </div>

              <div style={nestedCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: "14px" }}>
                    <Field label="Logo image asset id" value={draft.images?.logo?.image_asset_id || ""} onChange={(value) => updateRootImage("logo", { image_asset_id: value })} placeholder="cld:..." />
                    <Field label="Logo alt" value={draft.images?.logo?.alt || ""} onChange={(value) => updateRootImage("logo", { alt: value })} placeholder="Логотип салона" />
                    <UploadInput onSelect={(file) => handleRootImageUpload("logo", file)} disabled={!cloudinaryReady || !slug || uploadState["root:logo"]?.loading} />
                    {uploadState["root:logo"]?.error ? <div style={warningBoxStyle}>{uploadState["root:logo"].error}</div> : null}
                  </div>
                  <AssetPreview title="Logo preview" entity={draft.images?.logo || {}} emptyNote="Logo пока не загружен." />
                </div>
              </div>
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}>Преимущества</div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}>Карточки сохраняются в draft.sections.benefits без ломки текущего draft flow.</div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddBenefit}>Добавить преимущество</ActionButton>
            </div>
            {benefits.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {benefits.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>Преимущество #{index + 1}</div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveBenefit(item.id)}>Удалить</ActionButton>
                    </div>
                    <div style={editorGridStyle}>
                      <Field label="Заголовок" value={item.title || ""} onChange={(value) => updateBenefitsItem(item.id, "title", value)} placeholder="Например: Сильная команда мастеров" />
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Описание" value={item.text || ""} onChange={(value) => updateBenefitsItem(item.id, "text", value)} placeholder="Короткое описание преимущества" multiline />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}>Преимущества ещё не добавлены.</div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}>Популярные услуги</div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}>Карточки сохраняются в draft.sections.popular_services без ломки текущего draft flow.</div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddPopularService}>Добавить услугу</ActionButton>
            </div>
            {popularServices.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {popularServices.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>Популярная услуга #{index + 1}</div>
                      <ActionButton tone="secondary" onClick={() => handleRemovePopularService(item.id)}>Удалить</ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label="Название услуги" value={item.name || ""} onChange={(value) => updatePopularServiceItem(item.id, "name", value)} placeholder="Например: Женская стрижка" />
                        <Field label="Цена" value={item.price || ""} onChange={(value) => updatePopularServiceItem(item.id, "price", value)} placeholder="от 1500 KGS" />
                        <Field label="Длительность (мин)" value={item.duration_min || ""} onChange={(value) => updatePopularServiceItem(item.id, "duration_min", value)} placeholder="90" />
                        <Field label="Image asset id" value={item.image_asset_id || ""} onChange={(value) => updatePopularServiceItem(item.id, "image_asset_id", value)} placeholder="cld:..." />
                        <UploadInput onSelect={(file) => handlePopularServiceUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[`popular:${item.id}`]?.loading} />
                        {uploadState[`popular:${item.id}`]?.error ? <div style={warningBoxStyle}>{uploadState[`popular:${item.id}`].error}</div> : null}
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Field label="Описание" value={item.description || ""} onChange={(value) => updatePopularServiceItem(item.id, "description", value)} placeholder="Короткое описание услуги" multiline />
                        </div>
                      </div>
                      <AssetPreview title="Service image" entity={item} emptyNote="Фото услуги пока не загружено." />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}>Популярные услуги ещё не добавлены.</div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}>Акции</div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}>Карточки сохраняются в draft.sections.promos. Это рабочий блок акций до полной preview parity.</div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddPromo}>Добавить акцию</ActionButton>
            </div>
            {promos.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {promos.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>Акция #{index + 1}</div>
                      <ActionButton tone="secondary" onClick={() => handleRemovePromo(item.id)}>Удалить</ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label="Заголовок" value={item.title || ""} onChange={(value) => updatePromoItem(item.id, "title", value)} placeholder="Например: -20% на первое посещение" />
                        <Field label="Подзаголовок" value={item.subtitle || ""} onChange={(value) => updatePromoItem(item.id, "subtitle", value)} placeholder="Короткое описание акции" />
                        <Field label="Промокод" value={item.promo_code || ""} onChange={(value) => updatePromoItem(item.id, "promo_code", value)} placeholder="WELCOME20" />
                        <Field label="Действует до" value={item.valid_until || ""} onChange={(value) => updatePromoItem(item.id, "valid_until", value)} placeholder="2026-05-01" />
                        <Field label="Текст CTA" value={item.cta_label || ""} onChange={(value) => updatePromoItem(item.id, "cta_label", value)} placeholder="Записаться по акции" />
                        <Field label="Ссылка CTA" value={item.cta_url || ""} onChange={(value) => updatePromoItem(item.id, "cta_url", value)} placeholder="/book/totem-demo-salon?promo=welcome20" />
                        <Field label="Image asset id" value={item.image_asset_id || ""} onChange={(value) => updatePromoItem(item.id, "image_asset_id", value)} placeholder="cld:..." />
                        <Field label="Порядок" value={String(item.slot_index ?? index)} onChange={(value) => updatePromoItem(item.id, "slot_index", value)} placeholder="0" />
                        <UploadInput onSelect={(file) => handlePromoUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[`promo:${item.id}`]?.loading} />
                        {uploadState[`promo:${item.id}`]?.error ? <div style={warningBoxStyle}>{uploadState[`promo:${item.id}`].error}</div> : null}
                        <label style={{ display: "grid", gap: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}>Активна</span>
                          <select value={item.is_active ? "true" : "false"} onChange={(event) => updatePromoItem(item.id, "is_active", event.target.value === "true")} style={selectStyle}>
                            <option value="true">Да</option>
                            <option value="false">Нет</option>
                          </select>
                        </label>
                      </div>
                      <AssetPreview title="Promo image" entity={item} emptyNote="Изображение акции пока не загружено." />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}>Акции ещё не добавлены.</div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}>Галерея</div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}>Карточки сохраняются в draft.sections.gallery. Теперь upload идёт через Cloudinary, manual image asset id оставлен как резерв.</div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddGalleryItem}>Добавить изображение</ActionButton>
            </div>
            {galleryItems.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {galleryItems.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>Изображение галереи #{index + 1}</div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveGalleryItem(item.id)}>Удалить</ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label="Image asset id" value={item.image_asset_id || ""} onChange={(value) => updateGalleryItem(item.id, "image_asset_id", value)} placeholder="cld:..." />
                        <Field label="Alt" value={item.alt || ""} onChange={(value) => updateGalleryItem(item.id, "alt", value)} placeholder="Например: Интерьер салона" />
                        <Field label="Порядок" value={String(item.slot_index ?? index)} onChange={(value) => updateGalleryItem(item.id, "slot_index", value)} placeholder="0" />
                        <UploadInput onSelect={(file) => handleGalleryUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[`gallery:${item.id}`]?.loading} />
                        {uploadState[`gallery:${item.id}`]?.error ? <div style={warningBoxStyle}>{uploadState[`gallery:${item.id}`].error}</div> : null}
                      </div>
                      <AssetPreview title="Gallery image" entity={item} emptyNote="Изображение галереи пока не загружено." />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}>Галерея ещё не добавлена.</div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}>Отзывы</div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}>Карточки сохраняются в draft.sections.reviews. Это рабочий блок отзывов до полной preview parity.</div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddReview}>Добавить отзыв</ActionButton>
            </div>
            {reviews.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {reviews.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>Отзыв #{index + 1}</div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveReview(item.id)}>Удалить</ActionButton>
                    </div>
                    <div style={editorGridStyle}>
                      <Field label="Автор" value={item.author || ""} onChange={(value) => updateReviewItem(item.id, "author", value)} placeholder="Имя клиента" />
                      <Field label="Рейтинг" value={String(item.rating ?? 5)} onChange={(value) => updateReviewItem(item.id, "rating", value)} placeholder="5" />
                      <Field label="Порядок" value={String(item.slot_index ?? index)} onChange={(value) => updateReviewItem(item.id, "slot_index", value)} placeholder="0" />
                      <label style={{ display: "grid", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}>Активен</span>
                        <select value={item.is_active ? "true" : "false"} onChange={(event) => updateReviewItem(item.id, "is_active", event.target.value === "true")} style={selectStyle}>
                          <option value="true">Да</option>
                          <option value="false">Нет</option>
                        </select>
                      </label>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Текст отзыва" value={item.text || ""} onChange={(value) => updateReviewItem(item.id, "text", value)} placeholder="Текст отзыва клиента" multiline />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}>Отзывы ещё не добавлены.</div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}>Команда</div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}>Карточки мастеров сохраняются в draft.sections.masters. Upload avatar встроен, manual asset id сохранён как резерв.</div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddMaster}>Добавить мастера</ActionButton>
            </div>
            {masters.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {masters.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>Мастер #{index + 1}</div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveMaster(item.id)}>Удалить</ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 280px)", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label="Имя" value={item.name || ""} onChange={(value) => updateMasterItem(item.id, "name", value)} placeholder="Имя мастера" />
                        <Field label="Роль" value={item.role || ""} onChange={(value) => updateMasterItem(item.id, "role", value)} placeholder="Топ-стилист / Барбер / Колорист" />
                        <Field label="Avatar asset id" value={item.avatar_asset_id || ""} onChange={(value) => updateMasterItem(item.id, "avatar_asset_id", value)} placeholder="cld:..." />
                        <Field label="Опыт (лет)" value={item.experience_years === "" ? "" : String(item.experience_years ?? "")} onChange={(value) => updateMasterItem(item.id, "experience_years", value)} placeholder="5" />
                        <Field label="Порядок" value={String(item.slot_index ?? index)} onChange={(value) => updateMasterItem(item.id, "slot_index", value)} placeholder="0" />
                        <UploadInput onSelect={(file) => handleMasterAvatarUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[`team:${item.id}`]?.loading} />
                        {uploadState[`team:${item.id}`]?.error ? <div style={warningBoxStyle}>{uploadState[`team:${item.id}`].error}</div> : null}
                        <label style={{ display: "grid", gap: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}>Активен</span>
                          <select value={item.is_active ? "true" : "false"} onChange={(event) => updateMasterItem(item.id, "is_active", event.target.value === "true")} style={selectStyle}>
                            <option value="true">Да</option>
                            <option value="false">Нет</option>
                          </select>
                        </label>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Field label="Bio" value={item.bio || ""} onChange={(value) => updateMasterItem(item.id, "bio", value)} placeholder="Короткое описание мастера" multiline />
                        </div>
                      </div>
                      <AssetPreview title="Team image" entity={item} emptyNote="Фото мастера пока не загружено." />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}>Команда ещё не добавлена.</div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}>CTA</div>
            <div style={editorGridStyle}>
              <Field label="Текст кнопки записи" value={draft.cta.booking_label} onChange={(value) => updateDraftSection("cta", "booking_label", value)} placeholder="Записаться" />
              <Field label="Ссылка кнопки записи" value={draft.cta.booking_url} onChange={(value) => updateDraftSection("cta", "booking_url", value)} placeholder="/book/totem-demo-salon" />
              <Field label="Текст кнопки услуг" value={draft.cta.services_label} onChange={(value) => updateDraftSection("cta", "services_label", value)} placeholder="Услуги" />
              <Field label="Якорь услуг" value={draft.cta.services_anchor} onChange={(value) => updateDraftSection("cta", "services_anchor", value)} placeholder="#services" />
            </div>
          </div>

          <div style={
            publishState.kind === "error"
              ? warningBoxStyle
              : publishState.kind === "success"
                ? successBoxStyle
                : saveState.kind === "error"
                  ? warningBoxStyle
                  : saveState.kind === "success"
                    ? successBoxStyle
                    : infoBoxStyle
          }>
            {publishState.message || saveState.message || "Сейчас рабочими остаются save draft, preview и publish. Cloudinary upload layer встроен без удаления ручных резервных полей."}
          </div>
        </div>
      </PageSection>

      <PageSection title="Секции шаблона" subtitle="Это жёсткая карта секций, на которые дальше будут вешаться рабочие поля и image slots.">
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
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>Preview · {slug || "salon"}</div>
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
                    <div style={previewBadgeStyle}>{previewState.payload?.identity?.hero_badge || "Премиальный салон"}</div>
                    <div style={{ fontSize: "32px", lineHeight: 1.1, fontWeight: 900, color: "#111827" }}>{previewState.payload?.identity?.slogan || previewState.payload?.identity?.salon_name || "Preview салона"}</div>
                    <div style={{ fontSize: "16px", color: "#475467", lineHeight: 1.6 }}>{previewState.payload?.identity?.subtitle || "Подзаголовок preview"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                      <a href={previewState.payload?.cta?.booking_url || "#"} style={previewPrimaryCtaStyle}>{previewState.payload?.cta?.booking_label || "Записаться"}</a>
                      <span style={previewSecondaryCtaStyle}>{previewState.payload?.cta?.services_label || "Услуги"}</span>
                    </div>
                  </div>
                  <div style={previewImageCardStyle}>
                    {previewState.payload?.images?.hero?.secure_url ? (
                      <img src={previewState.payload.images.hero.secure_url} alt={previewState.payload?.images?.hero?.alt || "Hero preview"} style={previewImageRealStyle} />
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
                    <div style={previewCardTextStyle}>Салон: {previewState.payload?.identity?.salon_name || "—"}</div>
                    <div style={previewCardTextStyle}>Бейдж: {previewState.payload?.identity?.hero_badge || "—"}</div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}>Contacts</div>
                    <div style={previewCardTextStyle}>{previewState.payload?.contact?.address || "—"}</div>
                    <div style={previewCardTextStyle}>{previewState.payload?.contact?.phone || previewState.payload?.contact?.whatsapp || "—"}</div>
                    <div style={previewCardTextStyle}>{previewState.payload?.contact?.schedule_text || "—"}</div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}>CTA</div>
                    <div style={previewCardTextStyle}>Кнопка: {previewState.payload?.cta?.booking_label || "—"}</div>
                    <div style={previewCardTextStyle}>URL: {previewState.payload?.cta?.booking_url || "—"}</div>
                    <div style={previewCardTextStyle}>Якорь: {previewState.payload?.cta?.services_anchor || "—"}</div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}>Sections coverage</div>
                    <div style={previewCardTextStyle}>Benefits: {previewState.payload?.sections?.benefits?.length || 0}</div>
                    <div style={previewCardTextStyle}>Popular services: {previewState.payload?.sections?.popular_services?.length || 0}</div>
                    <div style={previewCardTextStyle}>Promos: {previewState.payload?.sections?.promos?.length || 0}</div>
                    <div style={previewCardTextStyle}>Gallery: {previewState.payload?.sections?.gallery?.length || 0}</div>
                    <div style={previewCardTextStyle}>Reviews: {previewState.payload?.sections?.reviews?.length || 0}</div>
                    <div style={previewCardTextStyle}>Team: {previewState.payload?.sections?.masters?.length || 0}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <PageSection title="Быстрые переходы" subtitle="Рабочая навигация вокруг template entry point без смешивания с public template.">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          <Link to={quickLinks.dashboard} style={linkCardStyle}>
            <div style={linkTitleStyle}>Dashboard</div>
            <div style={linkTextStyle}>Вернуться в главную точку кабинета.</div>
          </Link>

          <Link to={quickLinks.services} style={linkCardStyle}>
            <div style={linkTitleStyle}>Services</div>
            <div style={linkTextStyle}>Проверить связанный блок услуг салона.</div>
          </Link>

          <Link to={quickLinks.bookings} style={linkCardStyle}>
            <div style={linkTitleStyle}>Bookings</div>
            <div style={linkTextStyle}>Операционка остаётся отдельно, editor с ней не смешивается.</div>
          </Link>

          <a href={quickLinks.publicPage} style={linkCardStyle}>
            <div style={linkTitleStyle}>Public page</div>
            <div style={linkTextStyle}>Открыть публичную страницу салона отдельно от editor flow.</div>
          </a>
        </div>
      </PageSection>
    </div>
  )
}

const infoBoxStyle = {
  border: "1px solid #d0d5dd",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "14px",
  fontSize: "13px",
  color: "#475467",
  lineHeight: 1.5
}

const successBoxStyle = {
  ...infoBoxStyle,
  border: "1px solid #abefc6",
  background: "#ecfdf3",
  color: "#027a48"
}

const warningBoxStyle = {
  ...infoBoxStyle,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#b45309"
}

const editorGroupStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "16px"
}

const editorGroupHeaderStyle = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#111827",
  marginBottom: "14px"
}

const editorGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px"
}

const nestedCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "14px",
  display: "grid",
  gap: "12px"
}

const sectionCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "14px",
  minHeight: "108px"
}

const validationLineStyle = {
  fontSize: "13px",
  lineHeight: 1.5
}

const miniMetricCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "14px"
}

const selectStyle = {
  width: "100%",
  border: "1px solid #d0d5dd",
  borderRadius: "12px",
  padding: "11px 14px",
  fontSize: "14px",
  color: "#111827",
  background: "#ffffff",
  boxSizing: "border-box"
}

const uploadFieldStyle = {
  display: "grid",
  gap: "8px"
}

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
}

const assetPreviewImageStyle = {
  maxWidth: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "12px"
}

const assetPreviewMetaStyle = {
  fontSize: "12px",
  color: "#475467",
  wordBreak: "break-word"
}

const assetPreviewEmptyStyle = {
  fontSize: "13px",
  color: "#6b7280"
}

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
}

const previewOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 50
}

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
}

const previewHeroStyle = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "20px",
  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)"
}

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
}

const previewImageRealStyle = {
  maxWidth: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "12px"
}

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
}

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
}

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
}

const previewGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px"
}

const previewCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "16px",
  display: "grid",
  gap: "8px"
}

const previewCardTitleStyle = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#111827"
}

const previewCardTextStyle = {
  fontSize: "13px",
  color: "#475467",
  lineHeight: 1.5
}

const linkCardStyle = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "16px"
}

const linkTitleStyle = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "6px"
}

const linkTextStyle = {
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: 1.45
}
