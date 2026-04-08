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
  { id: "cta", label: "CTA", note: "Booking CTA, services anchor, contact map и sticky CTA." },
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
      alt: ""
    },
    avatar: {
      image_asset_id: "",
      image_url: "",
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

function getItemKey(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function validateMasterTemplateDraft(draft) {
  const critical = [];
  const warnings = [];

  if (!normalizeText(draft.identity.master_name)) critical.push("identity.master_name");
  if (!normalizeText(draft.identity.profession)) critical.push("identity.profession");

  const hasHeroAssetId = normalizeText(draft.images.hero.image_asset_id);
  const hasHeroFallback = normalizeText(draft.images.hero.image_url);
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

  return {
    critical,
    warnings,
    is_ready_for_publish: critical.length === 0
  };
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

function Panel({ title, note, children, id }) {
  return (
    <PageSection id={id} title={title} description={note}>
      <div style={{ display: "grid", gap: "16px" }}>{children}</div>
    </PageSection>
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
  const [previewState, setPreviewState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [serverState, setServerState] = useState({ tone: "neutral", text: "Черновик не загружен." });

  const hasToken = hasInternalTemplateToken();

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      if (!hasToken) {
        setServerState({ tone: "warning", text: "Нет TOTEM_INTERNAL_TOKEN. Редактор работает локально, но save/preview/publish на backend отключены." });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await getMasterTemplateDocument(slug);
      if (cancelled) return;

      if (!result.ok) {
        setServerState({ tone: "danger", text: `Не удалось загрузить master draft: ${result.error}` });
        setDraft(mergeDraft());
        setIsLoading(false);
        return;
      }

      const sourceDraft = result.document?.draft || result.document?.payload || {};
      setDraft(mergeDraft(sourceDraft));
      setDocumentState(result.document || null);
      setServerState({ tone: "success", text: "Master template document загружен." });
      setIsLoading(false);
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [hasToken, slug]);

  const validation = useMemo(() => validateMasterTemplateDraft(draft), [draft]);

  function setDraftField(section, field, value) {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
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
  }

  function addPrimitiveItem(sectionKey, emptyValue = "") {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: [...prev.sections[sectionKey], emptyValue]
      }
    }));
  }

  function updatePrimitiveItem(sectionKey, index, value) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].map((item, itemIndex) => itemIndex === index ? value : item)
      }
    }));
  }

  function removePrimitiveItem(sectionKey, index) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
  }

  function addObjectItem(sectionKey, factory) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: [...prev.sections[sectionKey], factory()]
      }
    }));
  }

  function removeObjectItem(sectionKey, index) {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
  }

  function addMetric() {
    setDraft((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        metrics: [...prev.metrics.metrics, { id: getItemKey("metric"), value: "", label: "" }]
      }
    }));
  }

  function removeMetric(index) {
    setDraft((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        metrics: prev.metrics.metrics.filter((_, itemIndex) => itemIndex !== index)
      }
    }));
  }

  function addImageItem(imageKey) {
    setDraft((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [imageKey]: [...prev.images[imageKey], { id: getItemKey(imageKey), image_asset_id: "", image_url: "", alt: "" }]
      }
    }));
  }

  function removeImageItem(imageKey, index) {
    setDraft((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [imageKey]: prev.images[imageKey].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
  }

  async function handleSaveDraft() {
    if (!hasToken) {
      setServerState({ tone: "warning", text: "Save пропущен: нет TOTEM_INTERNAL_TOKEN." });
      return;
    }

    setIsSaving(true);
    const result = await saveMasterTemplateDraft(draft, slug);
    setIsSaving(false);

    if (!result.ok) {
      setServerState({ tone: "danger", text: `Не удалось сохранить draft: ${result.error}` });
      return;
    }

    setDocumentState(result.document || null);
    setServerState({ tone: "success", text: "Черновик мастера сохранён." });
  }

  async function handlePreview() {
    if (!hasToken) {
      setServerState({ tone: "warning", text: "Preview пропущен: нет TOTEM_INTERNAL_TOKEN." });
      return;
    }

    setIsPreviewLoading(true);
    const result = await getMasterTemplatePreview(slug);
    setIsPreviewLoading(false);

    if (!result.ok) {
      setServerState({ tone: "danger", text: `Не удалось собрать preview: ${result.error}` });
      return;
    }

    setPreviewState(result);
    setServerState({ tone: result.is_ready_for_preview ? "success" : "warning", text: result.is_ready_for_preview ? "Preview payload собран." : "Preview собран, но draft ещё не готов по backend validation." });
  }

  async function handlePublish() {
    if (!hasToken) {
      setServerState({ tone: "warning", text: "Publish пропущен: нет TOTEM_INTERNAL_TOKEN." });
      return;
    }

    if (!validation.is_ready_for_publish) {
      setServerState({ tone: "warning", text: "Publish заблокирован: есть critical validation errors." });
      return;
    }

    setIsPublishing(true);
    const result = await publishMasterTemplate(slug, "system:1");
    setIsPublishing(false);

    if (!result.ok) {
      setServerState({ tone: "danger", text: `Не удалось опубликовать master template: ${result.error}` });
      return;
    }

    setDocumentState(result.document || null);
    setServerState({ tone: "success", text: "Master template опубликован." });
  }

  const previewPath = `/preview/master/${slug}`;
  const publicPath = `/master/${slug}`;

  return (
    <div style={{ padding: "24px", display: "grid", gap: "20px" }}>
      <PageHeader
        title="Master Template Editor"
        subtitle="Mirror editor для мастера: draft / preview / publish поверх реального PublicMasterPage shell."
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <StatusPill tone={hasToken ? "success" : "warning"}>
          {hasToken ? "TOKEN READY" : "TOKEN MISSING"}
        </StatusPill>
        <StatusPill tone={validation.is_ready_for_publish ? "success" : "warning"}>
          {validation.is_ready_for_publish ? "PUBLISH READY" : `CRITICAL: ${validation.critical.length}`}
        </StatusPill>
        <StatusPill tone={validation.warnings.length ? "warning" : "neutral"}>
          WARNINGS: {validation.warnings.length}
        </StatusPill>
        <StatusPill tone={serverState.tone}>{serverState.text}</StatusPill>
      </div>

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
            <ActionButton onClick={handleSaveDraft} disabled={isLoading || isSaving}>{isSaving ? "Сохраняю..." : "Сохранить draft"}</ActionButton>
            <ActionButton tone="secondary" onClick={handlePreview} disabled={isLoading || isPreviewLoading}>{isPreviewLoading ? "Собираю preview..." : "Собрать preview"}</ActionButton>
            <ActionButton onClick={handlePublish} disabled={isLoading || isPublishing || !validation.is_ready_for_publish}>{isPublishing ? "Публикую..." : "Publish"}</ActionButton>
            <Link to={publicPath} style={{ color: "#111827", fontSize: "13px", fontWeight: 600 }}>Открыть public master page</Link>
            <Link to={previewPath} style={{ color: "#111827", fontSize: "13px", fontWeight: 600 }}>Открыть preview route</Link>
          </div>

          <div style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", background: "#ffffff", display: "grid", gap: "8px" }}>
            <strong style={{ fontSize: "15px", color: "#111827" }}>Validation</strong>
            <div style={{ fontSize: "13px", color: "#111827" }}>Critical</div>
            {validation.critical.length ? validation.critical.map((item) => (
              <span key={item} style={{ fontSize: "12px", color: "#991b1b" }}>{item}</span>
            )) : <span style={{ fontSize: "12px", color: "#065f46" }}>Нет critical ошибок.</span>}
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#111827" }}>Warnings</div>
            {validation.warnings.length ? validation.warnings.map((item) => (
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
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <Field label="Hero image asset id" hint="V1 primary pipeline field."><input value={draft.images.hero.image_asset_id} onChange={(e) => setNestedDraftField("images", "hero", "image_asset_id", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Hero image URL" hint="Fallback для dev/manual mode."><input value={draft.images.hero.image_url} onChange={(e) => setNestedDraftField("images", "hero", "image_url", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Hero alt"><input value={draft.images.hero.alt} onChange={(e) => setNestedDraftField("images", "hero", "alt", e.target.value)} style={inputStyle()} /></Field>
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

          <Panel id="images" title="Images" note="Hero now, avatar/portfolio/service-card reserved but already wired into draft model.">
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <Field label="Avatar asset id"><input value={draft.images.avatar.image_asset_id} onChange={(e) => setNestedDraftField("images", "avatar", "image_asset_id", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Avatar URL"><input value={draft.images.avatar.image_url} onChange={(e) => setNestedDraftField("images", "avatar", "image_url", e.target.value)} style={inputStyle()} /></Field>
              <Field label="Avatar alt"><input value={draft.images.avatar.alt} onChange={(e) => setNestedDraftField("images", "avatar", "alt", e.target.value)} style={inputStyle()} /></Field>
            </div>

            <ArrayCard title="Portfolio reserved" note="Pipeline ready, public section will come later." onAdd={() => addImageItem("portfolio")} addLabel="Добавить portfolio image">
              {draft.images.portfolio.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.images.portfolio.map((item, index) => (
                <div key={item.id || `portfolio_${index}`} style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr 1fr 1fr auto" }}>
                  <input placeholder="asset id" value={item.image_asset_id || ""} onChange={(e) => setImageArrayItem("portfolio", index, "image_asset_id", e.target.value)} style={inputStyle()} />
                  <input placeholder="image url" value={item.image_url || ""} onChange={(e) => setImageArrayItem("portfolio", index, "image_url", e.target.value)} style={inputStyle()} />
                  <input placeholder="alt" value={item.alt || ""} onChange={(e) => setImageArrayItem("portfolio", index, "alt", e.target.value)} style={inputStyle()} />
                  <ActionButton tone="secondary" onClick={() => removeImageItem("portfolio", index)}>Удалить</ActionButton>
                </div>
              ))}
            </ArrayCard>

            <ArrayCard title="Service-card reserved" note="Future service-card visuals." onAdd={() => addImageItem("service_card")} addLabel="Добавить service-card image">
              {draft.images.service_card.length === 0 ? <span style={{ fontSize: "13px", color: "#6b7280" }}>Пока пусто.</span> : null}
              {draft.images.service_card.map((item, index) => (
                <div key={item.id || `service_card_${index}`} style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr 1fr 1fr auto" }}>
                  <input placeholder="asset id" value={item.image_asset_id || ""} onChange={(e) => setImageArrayItem("service_card", index, "image_asset_id", e.target.value)} style={inputStyle()} />
                  <input placeholder="image url" value={item.image_url || ""} onChange={(e) => setImageArrayItem("service_card", index, "image_url", e.target.value)} style={inputStyle()} />
                  <input placeholder="alt" value={item.alt || ""} onChange={(e) => setImageArrayItem("service_card", index, "alt", e.target.value)} style={inputStyle()} />
                  <ActionButton tone="secondary" onClick={() => removeImageItem("service_card", index)}>Удалить</ActionButton>
                </div>
              ))}
            </ArrayCard>
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
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gap: "8px", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb", background: "#ffffff" }}>
                <strong style={{ fontSize: "15px", color: "#111827" }}>Server document</strong>
                <pre style={{ margin: 0, fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#111827" }}>
                  {JSON.stringify(documentState, null, 2)}
                </pre>
              </div>
              <div style={{ display: "grid", gap: "8px", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb", background: "#ffffff" }}>
                <strong style={{ fontSize: "15px", color: "#111827" }}>Preview state</strong>
                <pre style={{ margin: 0, fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#111827" }}>
                  {JSON.stringify(previewState, null, 2)}
                </pre>
              </div>
              <div style={{ display: "grid", gap: "8px", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb", background: "#ffffff" }}>
                <strong style={{ fontSize: "15px", color: "#111827" }}>Current draft JSON</strong>
                <pre style={{ margin: 0, fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#111827" }}>
                  {JSON.stringify(draft, null, 2)}
                </pre>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}