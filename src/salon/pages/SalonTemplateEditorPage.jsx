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
  }
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

function buildLocalDocument(previous, draft, slug, mode, validationResult) {
  const nowIso = new Date().toISOString()
  const current = previous || {}
  const validation = validationResult || validateTemplatePayload(draft)

  return {
    ...current,
    owner_type: "salon",
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

  const accessState = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  const readyForWrite = canWrite !== false && accessState !== "blocked"
  const hasToken = hasInternalTemplateToken()

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
  const status = documentState?.status || {}
  const warningCount = Array.isArray(validation.warnings) ? validation.warnings.length : 0
  const errorCount = Array.isArray(validation.hard_errors) ? validation.hard_errors.length : 0
  const completionScore = Number(validation.completeness_score || 0)
  const lastSavedAt = documentState?.meta?.last_saved_at || documentState?.last_saved_at || null
  const mapUrl = buildMapUrl(draft.contact || {})
  const benefits = Array.isArray(draft.sections?.benefits) ? draft.sections.benefits : []

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
    setSaveState({ kind: "idle", message: "" })
    setPublishState({ kind: "idle", message: "" })
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
    setSaveState({ kind: "idle", message: "" })
    setPublishState({ kind: "idle", message: "" })
  }

  function handleAddBenefit() {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        benefits: [...(current.sections?.benefits || []), createBenefitItem()]
      }
    }))
    setSaveState({ kind: "idle", message: "" })
    setPublishState({ kind: "idle", message: "" })
  }

  function handleRemoveBenefit(itemId) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...(current.sections || {}),
        benefits: (current.sections?.benefits || []).filter((item) => item.id !== itemId)
      }
    }))
    setSaveState({ kind: "idle", message: "" })
    setPublishState({ kind: "idle", message: "" })
  }

  async function handleOpenPreview() {
    if (!slug) return

    const nextDraft = {
      ...draft,
      contact: {
        ...draft.contact,
        map_embed_url: mapUrl
      }
    }

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

    const nextDraft = {
      ...draft,
      contact: {
        ...draft.contact,
        map_embed_url: mapUrl
      }
    }
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

    const nextDraft = {
      ...draft,
      contact: {
        ...draft.contact,
        map_embed_url: mapUrl
      }
    }
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
        <StatusCard
          title="Статус блока"
          value={blockValue}
          note={blockNote}
          tone={blockTone}
        />
        <StatusCard
          title="Slug"
          value={slug || "—"}
          note={identity?.name || identity?.title || "Салон определяется из текущего маршрута и SalonContext."}
        />
        <StatusCard
          title="Готовность к публикации"
          value={status.is_publishable ? "Готово" : "Не готово"}
          note={`Ошибок: ${errorCount} · Warnings: ${warningCount}`}
          tone={status.is_publishable ? "good" : errorCount ? "warn" : "neutral"}
        />
        <StatusCard
          title="Заполнение"
          value={`${completionScore}%`}
          note={lastSavedAt ? `Последнее сохранение: ${new Date(lastSavedAt).toLocaleString()}` : "Сохранения ещё не было."}
        />
      </div>

      {!hasToken ? (
        <PageSection
          title="Локальный режим"
          subtitle="Полная цепочка доступа ещё не внедрена, поэтому backend auth для browser не обязателен на этом этапе."
        >
          <div style={infoBoxStyle}>
            Страница работает в local mock режиме. Это не ломает контракт: сейчас мы фиксируем editor flow, preview и publish UI, не трогая login system.
          </div>
        </PageSection>
      ) : null}

      <PageSection
        title="Рабочий блок v1"
        subtitle="Первый живой binding: Identity + Contacts + Benefits + CTA. Остальные секции пока остаются structure-first, без тяжёлой формы."
      >
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
            {publishState.message || saveState.message || "Сейчас рабочими остаются save draft, preview и publish. Остальные секции пока structure-first."}
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Секции шаблона"
        subtitle="Это жёсткая карта секций, на которые дальше будут вешаться рабочие поля и image slots."
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px"
        }}>
          {sectionItems.map((item, index) => (
            <div key={item.id} style={sectionCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{item.label}</div>
                <div style={{
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
                }}>
                  {index + 1}
                </div>
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
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", width: "fit-content", padding: "6px 10px", borderRadius: "999px", background: "#eef2ff", color: "#3730a3", fontSize: "12px", fontWeight: 700 }}>
                      {previewState.payload?.identity?.hero_badge || "Премиальный салон"}
                    </div>
                    <div style={{ fontSize: "32px", lineHeight: 1.1, fontWeight: 900, color: "#111827" }}>
                      {previewState.payload?.identity?.slogan || previewState.payload?.identity?.salon_name || "Preview салона"}
                    </div>
                    <div style={{ fontSize: "16px", color: "#475467", lineHeight: 1.6 }}>
                      {previewState.payload?.identity?.subtitle || "Подзаголовок preview"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                      <a href={previewState.payload?.cta?.booking_url || "#"} style={previewPrimaryCtaStyle}>
                        {previewState.payload?.cta?.booking_label || "Записаться"}
                      </a>
                      <span style={previewSecondaryCtaStyle}>
                        {previewState.payload?.cta?.services_label || "Услуги"}
                      </span>
                    </div>
                  </div>
                  <div style={previewImageCardStyle}>
                    {previewState.payload?.images?.hero?.image_asset_id ? (
                      <div style={{ fontSize: "14px", color: "#111827", fontWeight: 700 }}>
                        Hero asset: {previewState.payload.images.hero.image_asset_id}
                      </div>
                    ) : (
                      <div style={{ fontSize: "14px", color: "#6b7280" }}>Hero image не подключён</div>
                    )}
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#667085" }}>
                      {previewState.payload?.images?.hero?.alt || "Hero preview"}
                    </div>
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
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <PageSection
        title="Быстрые переходы"
        subtitle="Рабочая навигация вокруг template entry point без смешивания с public template."
      >
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

const nestedEditorCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "14px",
  display: "grid",
  gap: "14px"
}

const editorGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px"
}

const sectionCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "14px",
  minHeight: "108px"
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
