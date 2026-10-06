import { UiValue, uiMessage, uiDate, uiJoin, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
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
  { id: "identity", label: uiMessage("salon.s0455"), note: uiMessage("salon.s0456") },
  { id: "contacts", label: uiMessage("salon.s0457"), note: uiMessage("salon.s0458") },
  { id: "trust", label: uiMessage("salon.s0459"), note: uiMessage("salon.s0460") },
  { id: "hero", label: uiMessage("salon.s0461"), note: uiMessage("salon.s0462") },
  { id: "benefits", label: uiMessage("salon.s0463"), note: uiMessage("salon.s0464") },
  { id: "popular-services", label: uiMessage("salon.s0465"), note: uiMessage("salon.s0466") },
  { id: "catalog", label: uiMessage("salon.s0467"), note: uiMessage("salon.s0468") },
  { id: "promos", label: uiMessage("salon.s0469"), note: uiMessage("salon.s0470") },
  { id: "gallery", label: uiMessage("salon.s0471"), note: uiMessage("salon.s0472") },
  { id: "reviews", label: uiMessage("salon.s0473"), note: uiMessage("salon.s0474") },
  { id: "about", label: uiMessage("salon.s0475"), note: uiMessage("salon.s0476") },
  { id: "team", label: uiMessage("salon.s0323"), note: uiMessage("salon.s0477") },
  { id: "map", label: uiMessage("salon.s0478"), note: uiMessage("salon.s0479") },
  { id: "cta", label: uiMessage("salon.s0480"), note: uiMessage("salon.s0481") },
  { id: "seo", label: uiMessage("salon.s0482"), note: uiMessage("salon.s0483") },
  { id: "preview-publish", label: uiMessage("salon.s0484"), note: uiMessage("salon.s0485") }
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
    map_place_query: "",
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
    throw new Error(uiTemplate(["SALON_ASSET_KIND_INVALID:",""], [assetKind || "unknown"]))
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
  const safeFallback = typeof fallback === "string" ? uiMessage("salon.error.generic") : fallback
  return uiError(result?.detail?.json?.message || result?.detail?.json?.error || result?.detail?.text || result?.error || safeFallback, safeFallback)
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

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/["«»]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ")
    .trim()
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripMapNoise(value) {
  return normalizeWhitespace(value)
    .replace(/\b\d+\s*(?:этаж|эт\.?)\b.*$/gi, "")
    .replace(/\b\d+\s*(?:кабинет|каб\.?)\b.*$/gi, "")
    .replace(/\b\d+\s*(?:офис|оф\.)\b.*$/gi, "")
    .replace(/\b\d+\s*-\s*(?:мк\.?|mk\.?)\b.*$/gi, "")
    .replace(/\b(?:салон\s+красоты|barbershop|барбершоп|студия)\b.*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*$/g, "")
    .trim()
}

function removeRepeatedPhrase(value, phrase) {
  const normalizedPhrase = normalizeWhitespace(phrase)
  if (!normalizedPhrase) {
    return normalizeWhitespace(value)
  }
  const pattern = new RegExp(uiTemplate(["\\b","\\b"], [escapeRegExp(normalizedPhrase)]), "gi")
  return normalizeWhitespace(value).replace(pattern, "").replace(/\s{2,}/g, " ").trim()
}

function extractStreetHouseAddress(address) {
  const normalized = normalizeWhitespace(address)
  if (!normalized) {
    return ""
  }

  const streetMatch = normalized.match(/^(.+?\b\d+(?:[\/-]\d+)?(?:[-–—]?[A-Za-zА-Яа-я])?)/u)
  if (streetMatch?.[1]) {
    return normalizeWhitespace(streetMatch[1])
  }

  return normalized
}

function cleanMapAddress(value, salonName = "") {
  const salonPattern = salonName ? escapeRegExp(normalizeWhitespace(salonName)) : ""
  let normalized = normalizeWhitespace(removeRepeatedPhrase(value, salonName))
  if (!normalized) {
    return ""
  }

  if (salonPattern) {
    normalized = normalized
      .replace(new RegExp(uiTemplate(["\\b(?:салон\\s+красоты|барбершоп|студия)\\s+","\\b"], [salonPattern]), "gi"), "")
      .replace(new RegExp(uiTemplate(["\\b","\\b"], [salonPattern]), "gi"), "")
  }

  normalized = normalized
    .replace(/["«»]/g, "")
    .replace(/\b(?:салон\s+красоты|барбершоп|студия)\s+[A-Za-zА-Яа-я0-9\s'-]+/gi, "")
    .replace(/\b\d+\s*(?:этаж|эт\.?)\b/gi, "")
    .replace(/\b\d+\s*(?:кабинет|каб\.?)\b/gi, "")
    .replace(/\b(?:каб\.?|офис|оф\.?)\s*\d+\b/gi, "")
    .replace(/\b\d+\s*(?:офис|оф\.?)\b/gi, "")
    .replace(
      /^(.+?\b\d+(?:[\/-]\d+)?(?:[-–—]?[A-Za-zА-Яа-я])?)\s*(?:,|\s)+\b(?:тц|трц|бц|торговый\s+центр|бизнес\s+центр|этаж|эт\.?|кабинет|каб\.?|офис|оф\.?|салон)\b.*$/iu,
      "$1",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*$/g, "")
    .trim()

  if (!normalized) {
    return ""
  }

  const primarySegment = normalizeWhitespace(normalized.split(",")[0] || normalized)
  const streetMatch = primarySegment.match(/^(.+?\b\d+(?:[\/-]\d+)?(?:[-–—]?[A-Za-zА-Яа-я])?)/u)
  if (streetMatch?.[1]) {
    return normalizeWhitespace(streetMatch[1])
  }

  return primarySegment
}

function buildMapSearchQuery(contact = {}, identity = {}) {
  const salonName = stripMapNoise(identity.salon_name || identity.title || identity.name || contact.name || "")
  const address = extractStreetHouseAddress(cleanMapAddress(contact.address || contact.full_address || "", salonName))
  const city = stripMapNoise(contact.city || "")
  const country = normalizeWhitespace(contact.country || "Кыргызстан")

  if (salonName && address && city) {
    return normalizeWhitespace(uiTemplate(["",", ",", ",", ",""], [salonName, address, city, country]))
  }
  if (address && city) {
    return normalizeWhitespace(uiTemplate(["",", ",", ",""], [address, city, country]))
  }
  if (address) {
    return normalizeWhitespace(uiTemplate(["",", ",""], [address, country]))
  }
  return ""
}

function buildMapEmbedUrl(query = "") {
  const normalized = normalizeWhitespace(query)
  if (!normalized) {
    return ""
  }

  return uiTemplate(["https://maps.google.com/maps?output=embed&q=","&z=16"], [encodeURIComponent(normalized)])
}

function buildMapSearchUrl(query = "") {
  const normalized = normalizeWhitespace(query)
  if (!normalized) {
    return ""
  }

  return uiTemplate(["https://www.google.com/maps/search/?api=1&query=",""], [encodeURIComponent(normalized)])
}

function buildMapUrl(contact = {}, identity = {}) {
  const query = buildMapSearchQuery(contact, identity)
  return buildMapEmbedUrl(query)
}

function hasHardErrors(validationResult) {
  return Array.isArray(validationResult?.hard_errors) && validationResult.hard_errors.length > 0
}

function isTemplatePublishable(validationResult) {
  return Boolean(validationResult?.is_publishable) && !hasHardErrors(validationResult)
}

function createBenefitItem() {
  return {
    id: uiTemplate(["benefit-","-",""], [Date.now(), Math.random().toString(36).slice(2, 8)]),
    title: "",
    text: "",
    is_active: true
  }
}

function createPopularServiceItem() {
  return {
    id: uiTemplate(["popular-service-","-",""], [Date.now(), Math.random().toString(36).slice(2, 8)]),
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
    id: uiTemplate(["promo-","-",""], [Date.now(), Math.random().toString(36).slice(2, 8)]),
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
    id: uiTemplate(["gallery-","-",""], [Date.now(), Math.random().toString(36).slice(2, 8)]),
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
    id: uiTemplate(["review-","-",""], [Date.now(), Math.random().toString(36).slice(2, 8)]),
    author: "",
    text: "",
    rating: 5,
    is_active: true,
    slot_index: nextIndex
  }
}

function createMasterItem(nextIndex = 0) {
  return {
    id: uiTemplate(["master-","-",""], [Date.now(), Math.random().toString(36).slice(2, 8)]),
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

function normalizeTemplateDocumentState(nextDocument, fallbackValidation) {
  return {
    ...nextDocument,
    validation: nextDocument?.validation || fallbackValidation,
    status: {
      ...(nextDocument?.status || {}),
      is_publishable: Boolean((nextDocument?.validation || fallbackValidation)?.is_publishable)
    }
  }
}

function createStatusState(kind = "idle", message = "") {
  return { kind, message }
}

function createPreviewState({
  open = false,
  loading = false,
  payload = null,
  mode = "idle",
  message = ""
} = {}) {
  return { open, loading, payload, mode, message }
}

function getValidationList(values) {
  if (!Array.isArray(values)) return []
  return values.map(item => uiMessage(VALIDATION_MESSAGES[item?.code] || "salon.validation.unknown", { field: uiMessage(VALIDATION_FIELDS[item?.path] || "salon.validation.field") }))
}
const VALIDATION_MESSAGES = {"REQUIRED_STRING_MISSING": "salon.validation.REQUIRED_STRING_MISSING", "STRING_TOO_LONG": "salon.validation.STRING_TOO_LONG", "ARRAY_EXPECTED": "salon.validation.ARRAY_EXPECTED", "IMAGE_REF_INVALID": "salon.validation.IMAGE_REF_INVALID", "IMAGE_REF_EMPTY": "salon.validation.IMAGE_REF_EMPTY", "PAYLOAD_INVALID": "salon.validation.PAYLOAD_INVALID", "CONTACT_CHANNEL_MISSING": "salon.validation.CONTACT_CHANNEL_MISSING", "RATING_INVALID": "salon.validation.RATING_INVALID", "REVIEW_COUNT_INVALID": "salon.validation.REVIEW_COUNT_INVALID", "COMPLETED_BOOKINGS_INVALID": "salon.validation.COMPLETED_BOOKINGS_INVALID", "ASSETS_INVALID": "salon.validation.ASSETS_INVALID"}
const VALIDATION_FIELDS = {"identity.salon_name": "salon.validation.salonName", "contact.address": "salon.validation.address", "contact": "salon.validation.contact", "trust.rating_value": "salon.validation.rating", "trust.review_count": "salon.validation.reviews", "trust.completed_bookings": "salon.validation.bookings", "payload": "salon.validation.template"}

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
  return uiTemplate(["","/","/","/",""], [rootFolder, normalizedOwnerType, ownerSlug, normalizedAssetKind])
}

function buildCloudinaryContext(meta) {
  const ownerType = String(meta.ownerType || SALON_OWNER_TYPE).trim().toLowerCase() || SALON_OWNER_TYPE
  const assetKind = resolveSalonAssetKind(meta.assetKind)
  return uiTemplate(["owner_type=","|owner_slug=","|asset_kind=",""], [ownerType, meta.ownerSlug, assetKind])
}

function buildCloudinaryTags(meta) {
  const ownerType = String(meta.ownerType || SALON_OWNER_TYPE).trim().toLowerCase() || SALON_OWNER_TYPE
  const assetKind = resolveSalonAssetKind(meta.assetKind)
  return uiJoin(["totem", ownerType, assetKind].filter(Boolean), ",")
}

function normalizeCloudinaryAsset(payload, meta) {
  const ownerType = String(meta.ownerType || SALON_OWNER_TYPE).trim().toLowerCase() || SALON_OWNER_TYPE
  const assetKind = resolveSalonAssetKind(meta.assetKind)

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

  const response = await fetch(uiTemplate(["https://api.cloudinary.com/v1_1/","/image/upload"], [config.cloudName]), {
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

function AssetPreview({ title = "Preview", entity = {}, emptyNote = uiMessage("salon.s0488") }) {
  const { renderUi } = useUiMessages();
  const previewUrl = getAssetPreviewUrl(entity)
  const assetId = entity?.image_asset_id || entity?.avatar_asset_id || entity?.asset_id || ""

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
  )
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
      border: uiTemplate(["1px solid ",""], [palette.border]),
      background: palette.bg,
      borderRadius: "14px",
      padding: "16px"
    }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: palette.value }}><UiValue value={value} /></div>
      {note ? (
        <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}><UiValue value={note} /></div>
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
      <UiValue value={children} />
    </button>
  )
}

function Field({ label, value, onChange, placeholder = "", multiline = false, readOnly = false }) {
  const { renderUi } = useUiMessages();
  const Component = multiline ? "textarea" : "input"

  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}><UiValue value={label} /></span>
      <Component
        value={value}
        onChange={readOnly ? undefined : (event) => onChange(event.target.value)}
        placeholder={renderUi(placeholder)}
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
  const { renderUi } = useUiMessages();
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)
  const { identity, billingAccess, canWrite } = useSalonContext()

  const [documentState, setDocumentState] = useState(null)
  const [draft, setDraft] = useState(mergeDraft())
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [saveState, setSaveState] = useState(() => createStatusState())
  const [publishState, setPublishState] = useState(() => createStatusState())
  const [previewState, setPreviewState] = useState(() => createPreviewState())
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
        setPageError(uiError("SLUG_MISSING"))
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
        setPageError(uiError(extractMessage(result, "SALON_TEMPLATE_DOCUMENT_FETCH_FAILED")))
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
    publicPage: slug ? uiTemplate(["https://www.totemv.com/salon/",""], [encodeURIComponent(slug)]) : "https://www.totemv.com/salon",
    bookings: buildSalonPath(slug, "bookings"),
    services: buildSalonPath(slug, "services"),
    dashboard: buildSalonPath(slug, "dashboard")
  }), [slug])

  const validation = documentState?.validation || {}
  const mapQuery = buildMapSearchQuery(draft.contact || {}, draft.identity || {})
  const mapUrl = buildMapEmbedUrl(mapQuery)

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
  const previewPayload = previewState.payload || {}
  const previewIdentity = previewPayload?.identity || {}
  const previewContact = previewPayload?.contact || {}
  const previewTrust = previewPayload?.trust || {}
  const previewCta = previewPayload?.cta || {}
  const previewImages = previewPayload?.images || {}
  const previewSections = previewPayload?.sections || {}
  const previewPopularServices = Array.isArray(previewSections?.popular_services) ? previewSections.popular_services.slice(0, 2) : []
  const previewFullServiceList = Array.isArray(previewSections?.full_service_list) ? previewSections.full_service_list.slice(0, 3) : []
  const previewPromos = Array.isArray(previewSections?.promos) ? previewSections.promos.slice(0, 2) : []
  const previewGallery = Array.isArray(previewSections?.gallery) ? previewSections.gallery.slice(0, 3) : []
  const previewAboutParagraphs = Array.isArray(previewSections?.about_paragraphs) ? previewSections.about_paragraphs.slice(0, 2) : []
  const previewMasters = Array.isArray(previewSections?.masters) ? previewSections.masters.slice(0, 2) : []
  const previewMapUrl = previewContact?.map_embed_url || buildMapUrl(previewContact, previewIdentity)

  const benefits = Array.isArray(draft.sections?.benefits) ? draft.sections.benefits : []
  const popularServices = Array.isArray(draft.sections?.popular_services) ? draft.sections.popular_services : []
  const promos = Array.isArray(draft.sections?.promos) ? draft.sections.promos : []
  const galleryItems = Array.isArray(draft.sections?.gallery) ? draft.sections.gallery : []
  const reviews = Array.isArray(draft.sections?.reviews) ? draft.sections.reviews : []
  const masters = Array.isArray(draft.sections?.masters) ? draft.sections.masters : []

  function resetStateMessages() {
    setSaveState(createStatusState())
    setPublishState(createStatusState())
  }

  function setUploadFlag(key, value) {
    setUploadState((current) => ({ ...current, [key]: { ...value, error: uiError(value.error) } }))
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

      if (section === "contact" && ["address", "district", "city", "map_place_query"].includes(field)) {
        const mapQuery = buildMapSearchQuery({ ...next.contact, map_place_query: "" }, next.identity)
        next.contact.map_place_query = mapQuery
        next.contact.map_embed_url = buildMapEmbedUrl(mapQuery)
      }

      if (section === "identity" && ["salon_name", "title"].includes(field)) {
        const mapQuery = buildMapSearchQuery({ ...next.contact, map_place_query: "" }, next.identity)
        next.contact.map_place_query = mapQuery
        next.contact.map_embed_url = buildMapEmbedUrl(mapQuery)
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

    const uploadKey = uiTemplate(["root:",""], [slot])
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

    const uploadKey = uiTemplate(["popular:",""], [itemId])
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

    const uploadKey = uiTemplate(["promo:",""], [itemId])
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

    const uploadKey = uiTemplate(["gallery:",""], [itemId])
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

    const uploadKey = uiTemplate(["team:",""], [itemId])
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
      setPreviewState(createPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(nextDraft, slug),
        mode: "mock",
        message: uiMessage("salon.s0490")
      }))
      return
    }

    setPreviewState(createPreviewState({
      open: true,
      loading: true,
      payload: null,
      mode: "loading",
      message: uiMessage("salon.s0491")
    }))

    const saveResult = await saveSalonTemplateDraft(nextDraft, slug)

    if (!saveResult.ok) {
      setPreviewState(createPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(nextDraft, slug),
        mode: "fallback",
        message: extractMessage(saveResult, uiMessage("salon.s0492"))
      }))
      return
    }

    const savedDocument = saveResult.document || null
    const savedValidation = savedDocument?.validation || validateTemplatePayload(nextDraft)

    setDocumentState(savedDocument ? normalizeTemplateDocumentState(savedDocument, savedValidation) : null)
    setDraft(mergeDraft(savedDocument?.draft || nextDraft))
    setSaveState(createStatusState("success", uiMessage("salon.s0493")))
    setPublishState(createStatusState())

    const result = await getSalonTemplatePreview(slug)

    if (!result.ok) {
      setPreviewState(createPreviewState({
        open: true,
        loading: false,
        payload: buildPreviewPayload(nextDraft, slug),
        mode: "fallback",
        message: extractMessage(result, uiMessage("salon.s0494"))
      }))
      return
    }

    setPreviewState(createPreviewState({
      open: true,
      loading: false,
      payload: result.payload || buildPreviewPayload(nextDraft, slug),
      mode: "backend",
      message: result.is_ready_for_preview ? uiMessage("salon.s0495") : uiMessage("salon.s0496")
    }))
  }

  function handleClosePreview() {
    setPreviewState(createPreviewState())
  }

  async function handleSaveDraft() {
    if (!readyForWrite || !slug) return

    const nextDraft = previewDraft
    const validationResult = validateTemplatePayload(nextDraft)

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, slug, "save", validationResult)
      setDocumentState(nextDocument)
      setDraft(mergeDraft(nextDocument.draft || nextDraft))
      setSaveState(createStatusState(
        "success",
        !hasHardErrors(validationResult)
          ? uiMessage("salon.s0497")
          : uiMessage("salon.s0498")
      ))
      setPublishState(createStatusState())
      return
    }

    setSaveState(createStatusState("saving", uiMessage("salon.s0499")))

    const result = await saveSalonTemplateDraft(nextDraft, slug)

    if (!result.ok) {
      setSaveState(createStatusState("error", extractMessage(result, "DRAFT_SAVE_FAILED")))
      return
    }

    const nextDocument = result.document || null
    const mergedValidation = nextDocument?.validation || validationResult
    setDocumentState(normalizeTemplateDocumentState(nextDocument, mergedValidation))
    setDraft(mergeDraft(nextDocument?.draft || nextDraft))
    setSaveState(createStatusState("success", uiMessage("salon.s0500")))
    setPublishState(createStatusState())
  }

  async function handlePublish() {
    if (!readyForWrite || !slug) return

    const nextDraft = previewDraft
    const validationResult = validateTemplatePayload(nextDraft)

    if (!isTemplatePublishable(validationResult)) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, slug, "save", validationResult)
      setDocumentState(nextDocument)
      setDraft(mergeDraft(nextDraft))
      setPublishState(createStatusState("error", uiMessage("salon.s0501")))
      setSaveState(createStatusState())
      return
    }

    if (!hasToken) {
      const nextDocument = buildLocalDocument(documentState, nextDraft, slug, "publish", validationResult)
      setDocumentState(nextDocument)
      setDraft(mergeDraft(nextDocument.draft || nextDraft))
      setPublishState(createStatusState("success", uiMessage("salon.s0502")))
      setSaveState(createStatusState())
      return
    }

    setPublishState(createStatusState("publishing", uiMessage("salon.s0503")))

    const saveResult = await saveSalonTemplateDraft(nextDraft, slug)
    if (!saveResult.ok) {
      setPublishState(createStatusState("error", extractMessage(saveResult, "DRAFT_SAVE_BEFORE_PUBLISH_FAILED")))
      return
    }

    const result = await publishSalonTemplate(slug, "system:1")

    if (!result.ok) {
      setPublishState(createStatusState("error", extractMessage(result, "PUBLISH_FAILED")))
      return
    }

    const rereadResult = await getSalonTemplateDocument(slug)
    const nextDocument = rereadResult.ok
      ? (rereadResult.document || result.document || null)
      : (result.document || null)
    const mergedValidation = nextDocument?.validation || validationResult
    setDocumentState(normalizeTemplateDocumentState(nextDocument, mergedValidation))
    setDraft(mergeDraft(nextDocument?.draft || nextDraft))
    setPublishState(createStatusState("success", uiMessage("salon.s0504")))
    setSaveState(createStatusState())
  }

  const blockTone = pageError ? "warn" : hasToken ? "good" : "neutral"
  const blockValue = pageLoading ? uiMessage("salon.s0505") : pageError ? uiMessage("salon.s0506") : hasToken ? uiMessage("salon.s0507") : uiMessage("salon.s0508")
  const blockNote = pageError
    ? pageError
    : hasToken
      ? uiMessage("salon.s0509")
      : uiMessage("salon.s0510")

  const sectionHealthItems = [
    { label: uiMessage("salon.s0511"), value: benefits.length },
    { label: uiMessage("salon.s0512"), value: popularServices.length },
    { label: uiMessage("salon.s0513"), value: promos.length },
    { label: uiMessage("salon.s0514"), value: galleryItems.length },
    { label: uiMessage("salon.s0515"), value: reviews.length },
    { label: uiMessage("salon.s0516"), value: masters.length }
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, width: "100%", boxSizing: "border-box", gap: "20px" }}>
      <PageHeader
        title={uiMessage("salon.s0517")}
        subtitle={uiMessage("salon.s0518", {p0: slug ? uiTemplate([" · ",""], [slug]) : ""})}
        actions={(
          <>
            <ActionButton tone="secondary" onClick={handleSaveDraft} disabled={!readyForWrite || pageLoading || saveState.kind === "saving"}>
              <UiValue value={saveState.kind === "saving" ? uiMessage("salon.s0519") : uiMessage("salon.s0520")} />
            </ActionButton>
            <ActionButton tone="secondary" onClick={handleOpenPreview}><UiValue value={uiMessage("salon.s0521")} /></ActionButton>
            <ActionButton onClick={handlePublish} disabled={!readyForWrite || pageLoading || publishState.kind === "publishing"}>
              <UiValue value={publishState.kind === "publishing" ? uiMessage("salon.s0522") : uiMessage("salon.s0523")} />
            </ActionButton>
          </>
        )}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: "12px"
      }}>
        <StatusCard title={uiMessage("salon.s0524")} value={blockValue} note={blockNote} tone={blockTone} />
        <StatusCard
          title={uiMessage("salon.s0525")}
          value={slug || "—"}
          note={identity?.name || identity?.title || uiMessage("salon.s0526")}
        />
        <StatusCard
          title={uiMessage("salon.s0527")}
          value={liveValidation?.is_publishable ? uiMessage("salon.s0507") : uiMessage("salon.s0528")}
          note={uiMessage("salon.s0529", {p0: errorCount, p1: warningCount})}
          tone={liveValidation?.is_publishable ? "good" : errorCount ? "warn" : "neutral"}
        />
        <StatusCard
          title={uiMessage("salon.s0530")}
          value={uiTemplate(["","%"], [completionScore])}
          note={lastSavedAt ? uiMessage("salon.s0531", {p0: uiDate(lastSavedAt, {dateStyle: "short", timeStyle: "short"})}) : uiMessage("salon.s0532")}
        />
      </div>

      {!hasToken ? (
        <PageSection title={uiMessage("salon.s0508")} subtitle={uiMessage("salon.s0533")}>
          <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0534")} /></div>
        </PageSection>
      ) : null}

      <PageSection title={uiMessage("salon.s0535")} subtitle={uiMessage("salon.s0536")}>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: "12px"
          }}>
            <StatusCard title={uiMessage("salon.s0537")} value={cloudinaryConfig.cloudName || uiMessage("salon.display.missing")} tone={cloudinaryConfig.cloudName ? "good" : "warn"} />
            <StatusCard title={uiMessage("salon.s0538")} value={cloudinaryConfig.uploadPreset || uiMessage("salon.display.missing")} tone={cloudinaryConfig.uploadPreset ? "good" : "warn"} />
            <StatusCard title={uiMessage("salon.s0539")} value={cloudinaryConfig.rootFolder} note={uiMessage("salon.s0540", {p0: cloudinaryConfig.rootFolder, p1: SALON_OWNER_TYPE})} tone="neutral" />
            <StatusCard title={uiMessage("salon.s0541")} value={cloudinaryReady ? uiMessage("salon.display.ready") : uiMessage("salon.display.blocked")} note={cloudinaryReady ? uiMessage("salon.s0542") : uiMessage("salon.s0543")} tone={cloudinaryReady ? "good" : "warn"} />
          </div>
        </div>
      </PageSection>

      <PageSection title={uiMessage("salon.s0544")} subtitle={uiMessage("salon.s0545")}>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: "12px"
          }}>
            <StatusCard title={uiMessage("salon.s0546")} value={liveValidation?.is_publishable ? uiMessage("salon.display.ready") : uiMessage("salon.display.blocked")} note={uiMessage("salon.s0547")} tone={liveValidation?.is_publishable ? "good" : "warn"} />
            <StatusCard title={uiMessage("salon.s0548")} value={String(errorCount)} note={uiMessage("salon.s0549")} tone={errorCount ? "warn" : "good"} />
            <StatusCard title={uiMessage("salon.s0550")} value={String(warningCount)} note={uiMessage("salon.s0551")} tone={warningCount ? "warn" : "good"} />
            <StatusCard title={uiMessage("salon.s0552")} value={uiTemplate(["","/6"], [sectionHealthItems.filter((item) => item.value > 0).length])} note={uiMessage("salon.s0553")} tone="neutral" />
          </div>

          {hardErrors.length ? (
            <div style={warningBoxStyle}>
              <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px" }}><UiValue value={uiMessage("salon.s0554")} /></div>
              <div style={{ display: "grid", gap: "8px" }}>
                {hardErrors.map((item, index) => (
                  <div key={index} style={validationLineStyle}>• <UiValue value={item} /></div>
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
                  <div key={index} style={validationLineStyle}>• <UiValue value={item} /></div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: "12px"
          }}>
            {sectionHealthItems.map((item) => (
              <div key={item.label} style={miniMetricCardStyle}>
                <div style={{ fontSize: "12px", color: "#6b7280" }}><UiValue value={item.label} /></div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#111827" }}><UiValue value={item.value} /></div>
              </div>
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection title={uiMessage("salon.s0557")} subtitle={uiMessage("salon.s0558")}>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0455")} /></div>
            <div style={editorGridStyle}>
              <Field label={uiMessage("salon.s0559")} value={draft.identity.salon_name} onChange={(value) => updateDraftSection("identity", "salon_name", value)} placeholder={uiMessage("salon.s0560")} />
              <Field label={uiMessage("salon.s0561")} value={draft.identity.hero_badge} onChange={(value) => updateDraftSection("identity", "hero_badge", value)} placeholder={uiMessage("salon.s0562")} />
              <Field label={uiMessage("salon.s0563")} value={draft.identity.slogan} onChange={(value) => updateDraftSection("identity", "slogan", value)} placeholder={uiMessage("salon.s0564")} />
              <Field label={uiMessage("salon.s0565")} value={draft.identity.subtitle} onChange={(value) => updateDraftSection("identity", "subtitle", value)} placeholder={uiMessage("salon.s0566")} />
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0457")} /></div>
            <div style={editorGridStyle}>
              <Field label={uiMessage("salon.s0567")} value={draft.contact.address} onChange={(value) => updateDraftSection("contact", "address", value)} placeholder={uiMessage("salon.s0568")} />
              <Field label={uiMessage("salon.s0569")} value={draft.contact.district} onChange={(value) => updateDraftSection("contact", "district", value)} placeholder={uiMessage("salon.s0570")} />
              <Field label={uiMessage("salon.s0571")} value={draft.contact.city} onChange={(value) => updateDraftSection("contact", "city", value)} placeholder={uiMessage("salon.s0572")} />
              <Field label={uiMessage("salon.s0230")} value={draft.contact.phone} onChange={(value) => updateDraftSection("contact", "phone", value)} placeholder="+996555000111" />
              <Field label={uiMessage("salon.s0574")} value={draft.contact.whatsapp} onChange={(value) => updateDraftSection("contact", "whatsapp", value)} placeholder="+996555000111" />
              <Field label={uiMessage("salon.s0575")} value={draft.contact.schedule_text} onChange={(value) => updateDraftSection("contact", "schedule_text", value)} placeholder={uiMessage("salon.s0576")} />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label={uiMessage("salon.s0577")} value={mapUrl} onChange={() => {}} placeholder={uiMessage("salon.s0578")} readOnly />
              </div>
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0579")} /></div>
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={nestedCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: "14px" }}>
                    <Field label={uiMessage("salon.s0580")} value={draft.images?.hero?.image_asset_id || ""} onChange={(value) => updateRootImage("hero", { image_asset_id: value })} placeholder={uiMessage("salon.s0581")} />
                    <Field label={uiMessage("salon.s0582")} value={draft.images?.hero?.alt || ""} onChange={(value) => updateRootImage("hero", { alt: value })} placeholder={uiMessage("salon.s0583")} />
                    <UploadInput onSelect={(file) => handleRootImageUpload("hero", file)} disabled={!cloudinaryReady || !slug || uploadState["root:hero"]?.loading} />
                    {uploadState["root:hero"]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState["root:hero"].error} /></div> : null}
                  </div>
                  <AssetPreview title={uiMessage("salon.s0584")} entity={draft.images?.hero || {}} emptyNote={uiMessage("salon.s0585")} />
                </div>
              </div>

              <div style={nestedCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: "14px" }}>
                    <Field label={uiMessage("salon.s0586")} value={draft.images?.logo?.image_asset_id || ""} onChange={(value) => updateRootImage("logo", { image_asset_id: value })} placeholder={uiMessage("salon.s0581")} />
                    <Field label={uiMessage("salon.s0587")} value={draft.images?.logo?.alt || ""} onChange={(value) => updateRootImage("logo", { alt: value })} placeholder={uiMessage("salon.s0588")} />
                    <UploadInput onSelect={(file) => handleRootImageUpload("logo", file)} disabled={!cloudinaryReady || !slug || uploadState["root:logo"]?.loading} />
                    {uploadState["root:logo"]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState["root:logo"].error} /></div> : null}
                  </div>
                  <AssetPreview title={uiMessage("salon.s0589")} entity={draft.images?.logo || {}} emptyNote={uiMessage("salon.s0590")} />
                </div>
              </div>
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0463")} /></div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0591")} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddBenefit}><UiValue value={uiMessage("salon.s0592")} /></ActionButton>
            </div>
            {benefits.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {benefits.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0593")} /><UiValue value={index + 1} /></div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveBenefit(item.id)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                    </div>
                    <div style={editorGridStyle}>
                      <Field label={uiMessage("salon.s0595")} value={item.title || ""} onChange={(value) => updateBenefitsItem(item.id, "title", value)} placeholder={uiMessage("salon.s0596")} />
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label={uiMessage("salon.s0597")} value={item.text || ""} onChange={(value) => updateBenefitsItem(item.id, "text", value)} placeholder={uiMessage("salon.s0598")} multiline />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0599")} /></div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0465")} /></div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0600")} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddPopularService}><UiValue value={uiMessage("salon.s0601")} /></ActionButton>
            </div>
            {popularServices.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {popularServices.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0602")} /><UiValue value={index + 1} /></div>
                      <ActionButton tone="secondary" onClick={() => handleRemovePopularService(item.id)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label={uiMessage("salon.s0603")} value={item.name || ""} onChange={(value) => updatePopularServiceItem(item.id, "name", value)} placeholder={uiMessage("salon.s0604")} />
                        <Field label={uiMessage("salon.s0232")} value={item.price || ""} onChange={(value) => updatePopularServiceItem(item.id, "price", value)} placeholder={uiMessage("salon.s0605")} />
                        <Field label={uiMessage("salon.s0606")} value={item.duration_min || ""} onChange={(value) => updatePopularServiceItem(item.id, "duration_min", value)} placeholder="90" />
                        <Field label={uiMessage("salon.s0608")} value={item.image_asset_id || ""} onChange={(value) => updatePopularServiceItem(item.id, "image_asset_id", value)} placeholder={uiMessage("salon.s0581")} />
                        <UploadInput onSelect={(file) => handlePopularServiceUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[uiTemplate(["popular:",""], [item.id])]?.loading} />
                        {uploadState[uiTemplate(["popular:",""], [item.id])]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState[uiTemplate(["popular:",""], [item.id])].error} /></div> : null}
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Field label={uiMessage("salon.s0597")} value={item.description || ""} onChange={(value) => updatePopularServiceItem(item.id, "description", value)} placeholder={uiMessage("salon.s0609")} multiline />
                        </div>
                      </div>
                      <AssetPreview title={uiMessage("salon.s0610")} entity={item} emptyNote={uiMessage("salon.s0611")} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0612")} /></div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0469")} /></div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0613")} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddPromo}><UiValue value={uiMessage("salon.s0614")} /></ActionButton>
            </div>
            {promos.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {promos.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0615")} /><UiValue value={index + 1} /></div>
                      <ActionButton tone="secondary" onClick={() => handleRemovePromo(item.id)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label={uiMessage("salon.s0595")} value={item.title || ""} onChange={(value) => updatePromoItem(item.id, "title", value)} placeholder={uiMessage("salon.s0616")} />
                        <Field label={uiMessage("salon.s0565")} value={item.subtitle || ""} onChange={(value) => updatePromoItem(item.id, "subtitle", value)} placeholder={uiMessage("salon.s0617")} />
                        <Field label={uiMessage("salon.s0618")} value={item.promo_code || ""} onChange={(value) => updatePromoItem(item.id, "promo_code", value)} placeholder={uiMessage("salon.s0619")} />
                        <Field label={uiMessage("salon.s0620")} value={item.valid_until || ""} onChange={(value) => updatePromoItem(item.id, "valid_until", value)} placeholder="2026-05-01" />
                        <Field label={uiMessage("salon.s0622")} value={item.cta_label || ""} onChange={(value) => updatePromoItem(item.id, "cta_label", value)} placeholder={uiMessage("salon.s0623")} />
                        <Field label={uiMessage("salon.s0624")} value={item.cta_url || ""} onChange={(value) => updatePromoItem(item.id, "cta_url", value)} placeholder={uiMessage("salon.s0625")} />
                        <Field label={uiMessage("salon.s0608")} value={item.image_asset_id || ""} onChange={(value) => updatePromoItem(item.id, "image_asset_id", value)} placeholder={uiMessage("salon.s0581")} />
                        <Field label={uiMessage("salon.s0626")} value={String(item.slot_index ?? index)} onChange={(value) => updatePromoItem(item.id, "slot_index", value)} placeholder="0" />
                        <UploadInput onSelect={(file) => handlePromoUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[uiTemplate(["promo:",""], [item.id])]?.loading} />
                        {uploadState[uiTemplate(["promo:",""], [item.id])]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState[uiTemplate(["promo:",""], [item.id])].error} /></div> : null}
                        <label style={{ display: "grid", gap: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}><UiValue value={uiMessage("salon.s0627")} /></span>
                          <select value={item.is_active ? "true" : "false"} onChange={(event) => updatePromoItem(item.id, "is_active", event.target.value === "true")} style={selectStyle}>
                            <option value="true"><UiValue value={uiMessage("salon.s0628")} /></option>
                            <option value="false"><UiValue value={uiMessage("salon.s0629")} /></option>
                          </select>
                        </label>
                      </div>
                      <AssetPreview title={uiMessage("salon.s0630")} entity={item} emptyNote={uiMessage("salon.s0631")} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0632")} /></div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0471")} /></div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0633")} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddGalleryItem}><UiValue value={uiMessage("salon.s0634")} /></ActionButton>
            </div>
            {galleryItems.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {galleryItems.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0635")} /><UiValue value={index + 1} /></div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveGalleryItem(item.id)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label={uiMessage("salon.s0608")} value={item.image_asset_id || ""} onChange={(value) => updateGalleryItem(item.id, "image_asset_id", value)} placeholder={uiMessage("salon.s0581")} />
                        <Field label={uiMessage("salon.s0636")} value={item.alt || ""} onChange={(value) => updateGalleryItem(item.id, "alt", value)} placeholder={uiMessage("salon.s0637")} />
                        <Field label={uiMessage("salon.s0626")} value={String(item.slot_index ?? index)} onChange={(value) => updateGalleryItem(item.id, "slot_index", value)} placeholder="0" />
                        <UploadInput onSelect={(file) => handleGalleryUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[uiTemplate(["gallery:",""], [item.id])]?.loading} />
                        {uploadState[uiTemplate(["gallery:",""], [item.id])]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState[uiTemplate(["gallery:",""], [item.id])].error} /></div> : null}
                      </div>
                      <AssetPreview title={uiMessage("salon.s0638")} entity={item} emptyNote={uiMessage("salon.s0639")} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0640")} /></div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0473")} /></div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0641")} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddReview}><UiValue value={uiMessage("salon.s0642")} /></ActionButton>
            </div>
            {reviews.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {reviews.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0643")} /><UiValue value={index + 1} /></div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveReview(item.id)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                    </div>
                    <div style={editorGridStyle}>
                      <Field label={uiMessage("salon.s0644")} value={item.author || ""} onChange={(value) => updateReviewItem(item.id, "author", value)} placeholder={uiMessage("salon.s0645")} />
                      <Field label={uiMessage("salon.s0646")} value={String(item.rating ?? 5)} onChange={(value) => updateReviewItem(item.id, "rating", value)} placeholder="5" />
                      <Field label={uiMessage("salon.s0626")} value={String(item.slot_index ?? index)} onChange={(value) => updateReviewItem(item.id, "slot_index", value)} placeholder="0" />
                      <label style={{ display: "grid", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}><UiValue value={uiMessage("salon.s0420")} /></span>
                        <select value={item.is_active ? "true" : "false"} onChange={(event) => updateReviewItem(item.id, "is_active", event.target.value === "true")} style={selectStyle}>
                          <option value="true"><UiValue value={uiMessage("salon.s0628")} /></option>
                          <option value="false"><UiValue value={uiMessage("salon.s0629")} /></option>
                        </select>
                      </label>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label={uiMessage("salon.s0648")} value={item.text || ""} onChange={(value) => updateReviewItem(item.id, "text", value)} placeholder={uiMessage("salon.s0649")} multiline />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0650")} /></div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0323")} /></div>
                <div style={{ marginTop: "-8px", fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0651")} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleAddMaster}><UiValue value={uiMessage("salon.s0652")} /></ActionButton>
            </div>
            {masters.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {masters.map((item, index) => (
                  <div key={item.id} style={nestedCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0653")} /><UiValue value={index + 1} /></div>
                      <ActionButton tone="secondary" onClick={() => handleRemoveMaster(item.id)}><UiValue value={uiMessage("salon.s0594")} /></ActionButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", alignItems: "start" }}>
                      <div style={editorGridStyle}>
                        <Field label={uiMessage("salon.s0654")} value={item.name || ""} onChange={(value) => updateMasterItem(item.id, "name", value)} placeholder={uiMessage("salon.s0439")} />
                        <Field label={uiMessage("salon.s0655")} value={item.role || ""} onChange={(value) => updateMasterItem(item.id, "role", value)} placeholder={uiMessage("salon.s0656")} />
                        <Field label={uiMessage("salon.s0657")} value={item.avatar_asset_id || ""} onChange={(value) => updateMasterItem(item.id, "avatar_asset_id", value)} placeholder={uiMessage("salon.s0581")} />
                        <Field label={uiMessage("salon.s0658")} value={item.experience_years === "" ? "" : String(item.experience_years ?? "")} onChange={(value) => updateMasterItem(item.id, "experience_years", value)} placeholder="5" />
                        <Field label={uiMessage("salon.s0626")} value={String(item.slot_index ?? index)} onChange={(value) => updateMasterItem(item.id, "slot_index", value)} placeholder="0" />
                        <UploadInput onSelect={(file) => handleMasterAvatarUpload(item.id, file)} disabled={!cloudinaryReady || !slug || uploadState[uiTemplate(["team:",""], [item.id])]?.loading} />
                        {uploadState[uiTemplate(["team:",""], [item.id])]?.error ? <div style={warningBoxStyle}><UiValue value={uploadState[uiTemplate(["team:",""], [item.id])].error} /></div> : null}
                        <label style={{ display: "grid", gap: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}><UiValue value={uiMessage("salon.s0420")} /></span>
                          <select value={item.is_active ? "true" : "false"} onChange={(event) => updateMasterItem(item.id, "is_active", event.target.value === "true")} style={selectStyle}>
                            <option value="true"><UiValue value={uiMessage("salon.s0628")} /></option>
                            <option value="false"><UiValue value={uiMessage("salon.s0629")} /></option>
                          </select>
                        </label>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Field label={uiMessage("salon.s0659")} value={item.bio || ""} onChange={(value) => updateMasterItem(item.id, "bio", value)} placeholder={uiMessage("salon.s0660")} multiline />
                        </div>
                      </div>
                      <AssetPreview title={uiMessage("salon.s0661")} entity={item} emptyNote={uiMessage("salon.s0662")} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0663")} /></div>}
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}><UiValue value={uiMessage("salon.s0480")} /></div>
            <div style={editorGridStyle}>
              <Field label={uiMessage("salon.s0664")} value={draft.cta.booking_label} onChange={(value) => updateDraftSection("cta", "booking_label", value)} placeholder={uiMessage("salon.s0665")} />
              <Field label={uiMessage("salon.s0666")} value={draft.cta.booking_url} onChange={(value) => updateDraftSection("cta", "booking_url", value)} placeholder={uiMessage("salon.s0667")} />
              <Field label={uiMessage("salon.s0668")} value={draft.cta.services_label} onChange={(value) => updateDraftSection("cta", "services_label", value)} placeholder={uiMessage("salon.s0024")} />
              <Field label={uiMessage("salon.s0669")} value={draft.cta.services_anchor} onChange={(value) => updateDraftSection("cta", "services_anchor", value)} placeholder={uiMessage("salon.s0670")} />
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
            <UiValue value={publishState.message || saveState.message || uiMessage("salon.s0671")} />
          </div>
        </div>
      </PageSection>

      <PageSection title={uiMessage("salon.s0672")} subtitle={uiMessage("salon.s0673")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: "12px"
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}><UiValue value={uiMessage("salon.s0674")} /><UiValue value={slug || "salon"} /></div>
                <div style={{ marginTop: "6px", fontSize: "13px", color: "#6b7280" }}><UiValue value={previewState.message} /></div>
              </div>
              <ActionButton tone="secondary" onClick={handleClosePreview}><UiValue value={uiMessage("salon.s0675")} /></ActionButton>
            </div>

            {previewState.loading ? (
              <div style={infoBoxStyle}><UiValue value={uiMessage("salon.s0676")} /></div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={previewHeroStyle}>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={previewBadgeStyle}><UiValue value={previewIdentity.hero_badge || uiMessage("salon.s0562")} /></div>
                    <div style={{ fontSize: "32px", lineHeight: 1.1, fontWeight: 900, color: "#111827" }}><UiValue value={previewIdentity.slogan || previewIdentity.salon_name || uiMessage("salon.s0677")} /></div>
                    <div style={{ fontSize: "16px", color: "#475467", lineHeight: 1.6 }}><UiValue value={previewIdentity.subtitle || uiMessage("salon.s0678")} /></div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                      <a href={previewCta.booking_url || "#"} style={previewPrimaryCtaStyle}><UiValue value={previewCta.booking_label || uiMessage("salon.s0665")} /></a>
                      <span style={previewSecondaryCtaStyle}><UiValue value={previewCta.services_label || uiMessage("salon.s0024")} /></span>
                    </div>
                  </div>
                  <div style={previewImageCardStyle}>
                    {previewImages?.hero?.secure_url ? (
                      <img src={previewImages.hero.secure_url} alt={renderUi(previewImages?.hero?.alt || uiMessage("salon.s0584"))} style={previewImageRealStyle} />
                    ) : previewImages?.hero?.image_asset_id ? (
                      <div style={{ fontSize: "14px", color: "#111827", fontWeight: 700 }}><UiValue value={uiMessage("salon.s0679")} /><UiValue value={previewImages.hero.image_asset_id} /></div>
                    ) : (
                      <div style={{ fontSize: "14px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0680")} /></div>
                    )}
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#667085" }}><UiValue value={previewImages?.hero?.alt || uiMessage("salon.s0584")} /></div>
                  </div>
                </div>

                <div style={previewGridStyle}>
                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0681")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0682")} /><UiValue value={previewIdentity.salon_name || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0683")} /><UiValue value={previewIdentity.hero_badge || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0684")} /><UiValue value={previewIdentity.slogan || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0685")} /><UiValue value={previewIdentity.subtitle || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0686")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0687")} /><UiValue value={previewTrust.rating_value || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0688")} /><UiValue value={previewTrust.review_count || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0689")} /><UiValue value={String(previewTrust.completed_bookings || 0)} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewTrust.trust_note || uiMessage("salon.s0690")} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0691")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewContact.address || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiJoin([previewContact.district, previewContact.city].filter(Boolean), ", ") || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewContact.phone || previewContact.whatsapp || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewContact.schedule_text || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={previewMapUrl || uiMessage("salon.s0692")} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0480")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0693")} /><UiValue value={previewCta.booking_label || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0694")} /><UiValue value={previewCta.booking_url || "—"} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0695")} /><UiValue value={previewCta.services_anchor || "—"} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0696")} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0697")} /><UiValue value={previewSections?.benefits?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0698")} /><UiValue value={previewSections?.popular_services?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0699")} /><UiValue value={previewSections?.full_service_list?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0700")} /><UiValue value={previewSections?.promos?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0701")} /><UiValue value={previewSections?.gallery?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0702")} /><UiValue value={previewSections?.reviews?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0703")} /><UiValue value={previewSections?.about_paragraphs?.length || 0} /></div>
                    <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0704")} /><UiValue value={previewSections?.masters?.length || 0} /></div>
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0705")} /></div>
                    {previewPopularServices.length ? previewPopularServices.map((item, index) => (
                      <div key={item?.id || uiTemplate(["preview-popular-",""], [index])} style={previewCardTextStyle}>
                        <UiValue value={item?.name || item?.title || uiMessage("salon.s0706", {p0: index + 1})} /> · <UiValue value={item?.price || uiMessage("salon.s0707")} /> · <UiValue value={item?.duration_min || item?.duration || uiMessage("salon.s0708")} />
                      </div>
                    )) : <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0709")} /></div>}
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0710")} /></div>
                    {previewFullServiceList.length ? previewFullServiceList.map((item, index) => (
                      <div key={item?.id || uiTemplate(["preview-catalog-",""], [index])} style={previewCardTextStyle}>
                        <UiValue value={item?.name || item?.title || uiMessage("salon.s0711", {p0: index + 1})} /> · <UiValue value={item?.price || uiMessage("salon.s0707")} /> · <UiValue value={item?.duration_min || item?.duration || uiMessage("salon.s0708")} />
                      </div>
                    )) : <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0712")} /></div>}
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0713")} /></div>
                    {previewPromos.length ? previewPromos.map((item, index) => (
                      <div key={item?.id || uiTemplate(["preview-promo-",""], [index])} style={previewCardTextStyle}>
                        <UiValue value={item?.title || uiMessage("salon.s0714", {p0: index + 1})} /><UiValue value={item?.subtitle ? uiTemplate([" · ",""], [item.subtitle]) : ""} /><UiValue value={item?.promo_code ? uiTemplate([" · ",""], [item.promo_code]) : ""} />
                      </div>
                    )) : <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0715")} /></div>}
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0716")} /></div>
                    {previewAboutParagraphs.length ? previewAboutParagraphs.map((item, index) => (
                      <div key={item?.id || uiTemplate(["preview-about-",""], [index])} style={previewCardTextStyle}>
                        <UiValue value={item?.text || uiMessage("salon.s0717")} />
                      </div>
                    )) : <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0718")} /></div>}
                  </div>

                  <div style={previewCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0719")} /></div>
                    {previewMasters.length ? previewMasters.map((item, index) => (
                      <div key={item?.id || uiTemplate(["preview-master-",""], [index])} style={previewCardTextStyle}>
                        <UiValue value={item?.name || uiMessage("salon.s0378", {p0: index + 1})} /><UiValue value={item?.role ? uiTemplate([" · ",""], [item.role]) : ""} /><UiValue value={item?.bio ? uiTemplate([" · ",""], [item.bio]) : ""} />
                      </div>
                    )) : <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0720")} /></div>}
                  </div>
                </div>

                <div style={previewWideGridStyle}>
                  <div style={previewWideCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0721")} /></div>
                    {previewGallery.length ? (
                      <div style={previewGalleryGridStyle}>
                        {previewGallery.map((item, index) => {
                          const previewUrl = item?.image_secure_url || item?.secure_url || ""

                          return (
                            <div key={item?.id || uiTemplate(["preview-gallery-",""], [index])} style={previewGalleryItemStyle}>
                              {previewUrl ? (
                                <img src={previewUrl} alt={renderUi(item?.alt || uiTemplate(["Gallery ",""], [index + 1]))} style={previewGalleryImageStyle} />
                              ) : (
                                <div style={previewGalleryEmptyStyle}><UiValue value={item?.image_asset_id || "Gallery asset pending"} /></div>
                              )}
                              <div style={previewCardTextStyle}><UiValue value={item?.alt || uiTemplate(["Gallery item ",""], [index + 1])} /></div>
                            </div>
                          )
                        })}
                      </div>
                    ) : <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0722")} /></div>}
                  </div>

                  <div style={previewWideCardStyle}>
                    <div style={previewCardTitleStyle}><UiValue value={uiMessage("salon.s0723")} /></div>
                    {previewMapUrl ? (
                      <iframe
                        title={renderUi(uiTemplate(["salon-template-preview-map-",""], [slug || "salon"]))}
                        src={previewMapUrl}
                        width="100%"
                        height="220"
                        style={{ border: "none", borderRadius: "12px", display: "block" }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div style={previewCardTextStyle}><UiValue value={uiMessage("salon.s0724")} /></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <PageSection title={uiMessage("salon.s0725")} subtitle={uiMessage("salon.s0726")}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "12px"
        }}>
          <Link to={quickLinks.dashboard} style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("salon.s0727")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("salon.s0728")} /></div>
          </Link>

          <Link to={quickLinks.services} style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("salon.s0729")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("salon.s0730")} /></div>
          </Link>

          <Link to={quickLinks.bookings} style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("salon.s0731")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("salon.s0732")} /></div>
          </Link>

          <a href={quickLinks.publicPage} style={linkCardStyle}>
            <div style={linkTitleStyle}><UiValue value={uiMessage("salon.s0733")} /></div>
            <div style={linkTextStyle}><UiValue value={uiMessage("salon.s0734")} /></div>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
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

const previewWideGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: "12px"
}

const previewWideCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "16px",
  display: "grid",
  gap: "12px"
}

const previewGalleryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
  gap: "12px"
}

const previewGalleryItemStyle = {
  display: "grid",
  gap: "8px"
}

const previewGalleryImageStyle = {
  width: "100%",
  height: "140px",
  objectFit: "cover",
  borderRadius: "12px",
  display: "block",
  background: "#f8fafc"
}

const previewGalleryEmptyStyle = {
  minHeight: "140px",
  borderRadius: "12px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px",
  textAlign: "center",
  fontSize: "13px",
  color: "#6b7280"
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

