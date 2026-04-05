import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import PageHeader from "../../cabinet/PageHeader"
import PageSection from "../../cabinet/PageSection"
import { getSalonTemplateDocument, hasInternalTemplateToken, saveSalonTemplateDraft } from "../../api/internal"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"

const sectionItems = [
  { id: "identity", label: "Identity", note: "Имя салона, badge, оффер и subtitle." },
  { id: "contacts", label: "Contacts", note: "Адрес, телефон, WhatsApp, график и карта." },
  { id: "trust", label: "Trust", note: "Рейтинг, отзывы, completed bookings." },
  { id: "hero", label: "Hero Image", note: "Главное изображение и брендовый визуал." },
  { id: "benefits", label: "Benefits", note: "Преимущества салона в карточках." },
  { id: "popular-services", label: "Popular Services", note: "Основные услуги для первого экрана услуг." },
  { id: "catalog", label: "Full Catalog", note: "Полный каталог услуг и цен." },
  { id: "promos", label: "Promos", note: "Акции и офферы." },
  { id: "gallery", label: "Gallery", note: "Галерея интерьера, работ и атмосферы." },
  { id: "reviews", label: "Reviews", note: "Отзывы клиентов." },
  { id: "about", label: "About", note: "Параграфы о салоне и позиционировании." },
  { id: "team", label: "Team", note: "Команда салона и карточки мастеров." },
  { id: "map", label: "Map", note: "Карта и location block." },
  { id: "cta", label: "CTA", note: "Кнопки записи и привязка к services anchor." },
  { id: "seo", label: "SEO", note: "SEO title, description и canonical." },
  { id: "preview-publish", label: "Preview / Publish", note: "Предпросмотр, publish и контроль статуса." }
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

function Field({ label, value, onChange, placeholder = "", multiline = false }) {
  const Component = multiline ? "textarea" : "input"

  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#344054" }}>{label}</span>
      <Component
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={multiline ? 4 : undefined}
        style={{
          width: "100%",
          border: "1px solid #d0d5dd",
          borderRadius: "12px",
          padding: multiline ? "12px 14px" : "11px 14px",
          fontSize: "14px",
          color: "#111827",
          background: "#ffffff",
          resize: multiline ? "vertical" : "none",
          minHeight: multiline ? "108px" : undefined,
          boxSizing: "border-box"
        }}
      />
    </label>
  )
}

function extractMessage(result, fallback) {
  return result?.detail?.json?.message ||
    result?.detail?.json?.error ||
    result?.detail?.text ||
    result?.error ||
    fallback
}

export default function SalonTemplateEditorPage() {
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)
  const { identity, billingAccess, canWrite, loading, error } = useSalonContext()

  const [documentState, setDocumentState] = useState(null)
  const [draft, setDraft] = useState(mergeDraft())
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [saveState, setSaveState] = useState({ kind: "idle", message: "" })

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
        setPageLoading(false)
        setPageError("INTERNAL_TEMPLATE_TOKEN_MISSING")
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

  function updateDraftSection(section, field, value) {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        [field]: value
      }
    }))
    setSaveState({ kind: "idle", message: "" })
  }

  async function handleSaveDraft() {
    if (!readyForWrite || !hasToken || !slug) return

    setSaveState({ kind: "saving", message: "Сохраняем draft…" })

    const result = await saveSalonTemplateDraft(draft, slug)

    if (!result.ok) {
      setSaveState({
        kind: "error",
        message: extractMessage(result, "DRAFT_SAVE_FAILED")
      })
      return
    }

    const nextDocument = result.document || null
    setDocumentState(nextDocument)
    setDraft(mergeDraft(nextDocument?.draft || draft))
    setSaveState({ kind: "success", message: "Draft сохранён." })
  }

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <PageHeader
        title="Редактор публичной страницы"
        subtitle={`Рабочая точка template system для салона${slug ? ` · ${slug}` : ""}. Здесь начинается draft / preview / publish flow без изменения public template.`}
        actions={(
          <>
            <ActionButton tone="secondary" onClick={handleSaveDraft} disabled={!readyForWrite || !hasToken || pageLoading || saveState.kind === "saving"}>
              {saveState.kind === "saving" ? "Сохраняем…" : "Сохранить draft"}
            </ActionButton>
            <ActionButton tone="secondary" disabled>Открыть preview</ActionButton>
            <ActionButton disabled>Publish</ActionButton>
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
          value={pageLoading ? "Loading" : pageError ? "Blocked" : "Draft Live"}
          note={pageError || "Страница читает document и позволяет сохранить первый рабочий draft block."}
          tone={pageError ? "warn" : "good"}
        />
        <StatusCard
          title="Slug"
          value={slug || "—"}
          note={identity?.name || identity?.title || "Салон определяется из текущего маршрута и SalonContext."}
        />
        <StatusCard
          title="Publishability"
          value={status.is_publishable ? "Ready" : "Not ready"}
          note={`Ошибок: ${errorCount} · Warnings: ${warningCount}`}
          tone={status.is_publishable ? "good" : errorCount ? "warn" : "neutral"}
        />
        <StatusCard
          title="Completion"
          value={`${completionScore}%`}
          note={lastSavedAt ? `Последний save: ${new Date(lastSavedAt).toLocaleString()}` : "Сохранения ещё не было."}
        />
      </div>

      {!hasToken ? (
        <PageSection
          title="Нужен internal token"
          subtitle="Для draft / preview / publish flow браузер должен получить TOTEM_INTERNAL_TOKEN. В локальном режиме положи токен в localStorage по ключу TOTEM_INTERNAL_TOKEN или в window.TOTEM_INTERNAL_TOKEN."
        >
          <div style={warningBoxStyle}>
            Internal template endpoints защищены. Без токена эта страница не делает fetch/save к backend.
          </div>
        </PageSection>
      ) : null}

      <PageSection
        title="Рабочий блок v1"
        subtitle="Первый живой binding: Identity + Contacts + CTA. Остальные секции пока остаются structure-first, без тяжёлой формы."
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}>Identity</div>
            <div style={editorGridStyle}>
              <Field label="Salon name" value={draft.identity.salon_name} onChange={(value) => updateDraftSection("identity", "salon_name", value)} placeholder="TOTEM Demo Salon" />
              <Field label="Hero badge" value={draft.identity.hero_badge} onChange={(value) => updateDraftSection("identity", "hero_badge", value)} placeholder="Премиальный салон" />
              <Field label="Slogan" value={draft.identity.slogan} onChange={(value) => updateDraftSection("identity", "slogan", value)} placeholder="Главный оффер салона" />
              <Field label="Subtitle" value={draft.identity.subtitle} onChange={(value) => updateDraftSection("identity", "subtitle", value)} placeholder="Уточняющий подзаголовок" />
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}>Contacts</div>
            <div style={editorGridStyle}>
              <Field label="Address" value={draft.contact.address} onChange={(value) => updateDraftSection("contact", "address", value)} placeholder="Bishkek, Chui Avenue 100" />
              <Field label="District" value={draft.contact.district} onChange={(value) => updateDraftSection("contact", "district", value)} placeholder="Центр" />
              <Field label="City" value={draft.contact.city} onChange={(value) => updateDraftSection("contact", "city", value)} placeholder="Bishkek" />
              <Field label="Phone" value={draft.contact.phone} onChange={(value) => updateDraftSection("contact", "phone", value)} placeholder="+996555000111" />
              <Field label="WhatsApp" value={draft.contact.whatsapp} onChange={(value) => updateDraftSection("contact", "whatsapp", value)} placeholder="+996555000111" />
              <Field label="Schedule" value={draft.contact.schedule_text} onChange={(value) => updateDraftSection("contact", "schedule_text", value)} placeholder="Ежедневно 10:00–20:00" />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Map URL" value={draft.contact.map_embed_url} onChange={(value) => updateDraftSection("contact", "map_embed_url", value)} placeholder="https://maps.google.com/?q=..." />
              </div>
            </div>
          </div>

          <div style={editorGroupStyle}>
            <div style={editorGroupHeaderStyle}>CTA</div>
            <div style={editorGridStyle}>
              <Field label="Booking label" value={draft.cta.booking_label} onChange={(value) => updateDraftSection("cta", "booking_label", value)} placeholder="Записаться" />
              <Field label="Booking URL" value={draft.cta.booking_url} onChange={(value) => updateDraftSection("cta", "booking_url", value)} placeholder="/book/totem-demo-salon" />
              <Field label="Services label" value={draft.cta.services_label} onChange={(value) => updateDraftSection("cta", "services_label", value)} placeholder="Услуги" />
              <Field label="Services anchor" value={draft.cta.services_anchor} onChange={(value) => updateDraftSection("cta", "services_anchor", value)} placeholder="#services" />
            </div>
          </div>

          <div style={saveState.kind === "error" ? warningBoxStyle : saveState.kind === "success" ? successBoxStyle : infoBoxStyle}>
            {saveState.message || "Сейчас рабочим остаётся только save draft. Preview / Publish wiring идёт следующим шагом."}
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
