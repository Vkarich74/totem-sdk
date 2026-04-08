import { NavLink } from "react-router-dom"

function buildMenuStyle(isActive) {
  return {
    display: "block",
    padding: "9px 12px",
    marginBottom: "4px",
    textDecoration: "none",
    color: isActive ? "#111827" : "#374151",
    background: isActive ? "#ffffff" : "transparent",
    border: isActive ? "1px solid #e5e7eb" : "1px solid transparent",
    borderRadius: "10px",
    fontWeight: isActive ? 700 : 500,
    boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
  }
}

function buildPublicLinkStyle() {
  return {
    display: "block",
    padding: "9px 12px",
    marginBottom: "4px",
    textDecoration: "none",
    color: "#374151",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "10px",
    fontWeight: 500,
    boxShadow: "none",
    cursor: "pointer",
  }
}

function SectionTitle({ children, note }) {
  return (
    <div style={{ marginTop: "22px", marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "11px",
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 700,
        }}
      >
        {children}
      </div>
      {note ? (
        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px", lineHeight: 1.35 }}>
          {note}
        </div>
      ) : null}
    </div>
  )
}

function buildMasterPath(slug, tail = "") {
  const safeSlug = String(slug || "").trim()
  const safeTail = String(tail || "").trim().replace(/^\/+/, "")

  if (!safeSlug) {
    return "/master"
  }

  return safeTail ? `/master/${safeSlug}/${safeTail}` : `/master/${safeSlug}`
}

function buildMasterPublicPath(slug) {
  const safeSlug = String(slug || "").trim()

  if (!safeSlug) {
    return "/master"
  }

  return `/master/${safeSlug}`
}

function renderMenu(items, menuStyle) {
  return (
    <nav>
      {items.map((item) => (
        <NavLink key={item.to} style={menuStyle} to={item.to}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function MasterSidebar({ slug }) {
  const menuStyle = ({ isActive }) => buildMenuStyle(isActive)
  const publicLinkStyle = buildPublicLinkStyle()

  const mainItems = [
    { to: buildMasterPath(slug, "dashboard"), label: "Главная" },
    { to: buildMasterPath(slug, "bookings"), label: "Записи" },
    { to: buildMasterPath(slug, "schedule"), label: "Расписание" },
    { to: buildMasterPath(slug, "clients"), label: "Клиенты" },
    { to: buildMasterPath(slug, "services"), label: "Услуги" },
    { to: buildMasterPath(slug, "settings"), label: "Настройки" },
  ]

  const showcaseItems = [
    { to: buildMasterPath(slug, "template"), label: "Шаблон страницы" },
  ]

  const financeItems = [
    { to: buildMasterPath(slug, "finance"), label: "Финансы" },
    { to: buildMasterPath(slug, "money"), label: "Доход" },
    { to: buildMasterPath(slug, "settlements"), label: "Сеты" },
    { to: buildMasterPath(slug, "payouts"), label: "Выплаты" },
    { to: buildMasterPath(slug, "transactions"), label: "Транзакции" },
  ]

  const publicHref = buildMasterPublicPath(slug)

  function openPublicPage(event) {
    event.preventDefault()
    window.location.assign(publicHref)
  }

  return (
    <div
      style={{
        width: "240px",
        flexShrink: 0,
        borderRight: "1px solid #eee",
        padding: "20px",
        background: "#fafafa",
        position: "sticky",
        top: 0,
        height: "100%",
        alignSelf: "flex-start",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <strong style={{ fontSize: "16px" }}>Кабинет мастера</strong>
        <div style={{ fontSize: "12px", color: "#777", marginTop: "6px", wordBreak: "break-word" }}>
          {slug}
        </div>
      </div>

      <SectionTitle note="Операционка и ежедневная работа">Основное</SectionTitle>
      {renderMenu(mainItems, menuStyle)}

      <SectionTitle note="Публичная страница, контент и публикация">Витрина</SectionTitle>
      {renderMenu(showcaseItems, menuStyle)}
      <nav>
        <a href={publicHref} onClick={openPublicPage} style={publicLinkStyle}>
          Публичная страница
        </a>
      </nav>

      <SectionTitle note="Деньги, расчёты и выплаты">Финансы</SectionTitle>
      {renderMenu(financeItems, menuStyle)}

      <div
        style={{
          marginTop: "22px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          background: "#fff",
          padding: "12px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>
          Логика кабинета
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.45 }}>
          Стартуй с dashboard. Операционные задачи держи в верхнем блоке, шаблон и публикацию — в витрине, деньги и расчёты — в нижнем блоке.
        </div>
      </div>
    </div>
  )
}
