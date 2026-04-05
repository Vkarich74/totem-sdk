import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import PageHeader from "../../cabinet/PageHeader"
import PageSection from "../../cabinet/PageSection"
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

function ActionButton({ children, tone = "primary", disabled = false }) {
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

export default function SalonTemplateEditorPage() {
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)
  const {
    identity,
    billingAccess,
    canWrite,
    loading,
    error
  } = useSalonContext()

  const accessState = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  const readyForWrite = canWrite !== false && accessState !== "blocked"

  const quickLinks = useMemo(() => ({
    publicPage: slug ? `/salon/${slug}` : "/salon",
    bookings: buildSalonPath(slug, "bookings"),
    services: buildSalonPath(slug, "services"),
    dashboard: buildSalonPath(slug, "dashboard")
  }), [slug])

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <PageHeader
        title="Редактор публичной страницы"
        subtitle={`Рабочая точка template system для салона${slug ? ` · ${slug}` : ""}. Здесь начинается draft / preview / publish flow без изменения public template.`}
        actions={(
          <>
            <ActionButton tone="secondary">Сохранить draft</ActionButton>
            <ActionButton tone="secondary">Открыть preview</ActionButton>
            <ActionButton disabled={!readyForWrite}>Publish</ActionButton>
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
          value="Entry Ready"
          note="Создан отдельный кабинетный entry point под template system."
          tone="good"
        />
        <StatusCard
          title="Slug"
          value={slug || "—"}
          note={identity?.name || identity?.title || "Салон определяется из текущего маршрута и SalonContext."}
        />
        <StatusCard
          title="Доступ к записи"
          value={readyForWrite ? "Разрешён" : "Ограничен"}
          note={readyForWrite ? "Можно переходить к draft / preview / publish flow." : "Сначала нужно снять ограничения billing access."}
          tone={readyForWrite ? "good" : "warn"}
        />
        <StatusCard
          title="Секций под шаблон"
          value={String(sectionItems.length)}
          note="Structure-first: сначала карта секций, потом field binding и рабочие формы."
        />
      </div>

      <PageSection
        title="Текущее состояние"
        subtitle="Страница создана как отдельная рабочая зона. Тяжёлая форма, Cloudinary UI и public binding сюда пока не врезаны."
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "12px"
        }}>
          <div style={infoCardStyle}>
            <div style={infoLabelStyle}>Routing</div>
            <div style={infoTitleStyle}>/salon/:slug/template</div>
            <div style={infoTextStyle}>Отдельная кабинетная точка входа для template system.</div>
          </div>

          <div style={infoCardStyle}>
            <div style={infoLabelStyle}>Flow</div>
            <div style={infoTitleStyle}>Draft → Preview → Publish</div>
            <div style={infoTextStyle}>Текущий шаг фиксирует entry layout и секционную навигацию.</div>
          </div>

          <div style={infoCardStyle}>
            <div style={infoLabelStyle}>Runtime</div>
            <div style={infoTitleStyle}>{loading ? "Загрузка..." : error ? "Есть ошибка контекста" : "Контекст поднят"}</div>
            <div style={infoTextStyle}>{error || "SalonContext активен, slug и billing state доступны на странице."}</div>
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

const infoCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "16px"
}

const infoLabelStyle = {
  fontSize: "12px",
  color: "#6b7280",
  marginBottom: "8px"
}

const infoTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "6px"
}

const infoTextStyle = {
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: 1.45
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
