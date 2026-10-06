import { UiValue, uiMessage, uiTemplate } from "../i18n/uiMessages.js";
import { NavLink } from "react-router-dom"

function buildMenuStyle(isActive) {
  return {
    display: "block",
    width: "100%",
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
        <UiValue value={children} />
      </div>
      {note ? (
        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px", lineHeight: 1.35 }}>
          <UiValue value={note} />
        </div>
      ) : null}
    </div>
  )
}

function buildMasterPath(slug, tail = "") {
  const safeSlug = String(slug || "").trim()
  const safeTail = String(tail || "").trim().replace(/^\/+/, "")

  if (!safeSlug) {
    return ""
  }

  return safeTail ? uiTemplate(["/master/","/",""], [safeSlug, safeTail]) : uiTemplate(["/master/",""], [safeSlug])
}

function renderMenu(items, menuStyle) {
  return (
    <nav>
      {items.map((item) => (
        <NavLink key={item.to} style={menuStyle} to={item.to}>
          <UiValue value={item.label} />
        </NavLink>
      ))}
    </nav>
  )
}

export default function MasterSidebar({ slug }) {
  if (!String(slug || "").trim()) {
    return null
  }

  const menuStyle = ({ isActive }) => buildMenuStyle(isActive)

  const mainItems = [
    { to: buildMasterPath(slug, "dashboard"), label: uiMessage("salon.s0013") },
    { to: buildMasterPath(slug, "bookings"), label: uiMessage("salon.s0014") },
    { to: buildMasterPath(slug, "schedule"), label: uiMessage("salon.s0023") },
    { to: buildMasterPath(slug, "clients"), label: uiMessage("salon.s0016") },
    { to: buildMasterPath(slug, "services"), label: uiMessage("salon.s0024") },
    { to: buildMasterPath(slug, "settings"), label: uiMessage("salon.s0025") },
    { to: buildMasterPath(slug, "template"), label: uiMessage("salon.s0026") },
  ]

  const showcaseItems = [
    { to: buildMasterPath(slug, "template"), label: uiMessage("salon.s0026") },
  ]

  const financeItems = [
    { to: buildMasterPath(slug, "finance"), label: uiMessage("salon.s0017") },
    { to: buildMasterPath(slug, "money"), label: uiMessage("salon.s0028") },
    { to: buildMasterPath(slug, "settlements"), label: uiMessage("salon.s0029") },
    { to: buildMasterPath(slug, "payouts"), label: uiMessage("salon.s0030") },
    { to: buildMasterPath(slug, "transactions"), label: uiMessage("salon.s0031") },
  ]

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
        <strong style={{ fontSize: "16px" }}><UiValue value={uiMessage("master.s0021")} /></strong>
        <div style={{ fontSize: "12px", color: "#777", marginTop: "6px", wordBreak: "break-word" }}>
          <UiValue value={slug} />
        </div>
      </div>

      <SectionTitle note={uiMessage("master.s0022")}><UiValue value={uiMessage("salon.s0022")} /></SectionTitle>
      <UiValue value={renderMenu(mainItems, menuStyle)} />


      <SectionTitle note={uiMessage("master.s0024")}><UiValue value={uiMessage("salon.s0017")} /></SectionTitle>
      <UiValue value={renderMenu(financeItems, menuStyle)} />

      <div
        style={{
          marginTop: "22px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          background: "#fff",
          padding: "12px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}><UiValue value={uiMessage("master.s0025")} /></div>
        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.45 }}><UiValue value={uiMessage("master.s0026")} /></div>
      </div>
    </div>
  )
}
