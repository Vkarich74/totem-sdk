import { UiValue, uiMessage } from "../i18n/uiMessages.js";
import { NavLink } from "react-router-dom"
import { buildSalonPath } from "./SalonContext"

function buildMenuStyle(isActive){
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
    boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.04)" : "none"
  }
}

function SectionTitle({ children, note }){
  return (
    <div style={{ marginTop: "22px", marginBottom: "10px" }}>
      <div style={{
        fontSize: "11px",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 700
      }}>
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

export default function SalonSidebar({ slug }) {
  const menuStyle = ({ isActive }) => buildMenuStyle(isActive)

  return (
    <div style={{
      width: "240px",
      flexShrink: 0,
      borderRight: "1px solid #eee",
      padding: "20px",
      background: "#fafafa",
      position: "sticky",
      top: 0,
      height: "100%",
      alignSelf: "flex-start"
    }}>
      <div style={{ marginBottom: "24px" }}>
        <strong style={{ fontSize: "16px" }}><UiValue value={uiMessage("salon.s0020")} /></strong>
        <div style={{ fontSize: "12px", color: "#777", marginTop: "6px", wordBreak: "break-word" }}>
          <UiValue value={slug || "—"} />
        </div>
      </div>

      <SectionTitle note={uiMessage("salon.s0021")}><UiValue value={uiMessage("salon.s0022")} /></SectionTitle>
      <nav>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "dashboard")}><UiValue value={uiMessage("salon.s0013")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "masters")}><UiValue value={uiMessage("salon.s0015")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "bookings")}><UiValue value={uiMessage("salon.s0014")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "calendar")}><UiValue value={uiMessage("salon.s0023")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "clients")}><UiValue value={uiMessage("salon.s0016")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "services")}><UiValue value={uiMessage("salon.s0024")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "settings")}><UiValue value={uiMessage("salon.s0025")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "template")}><UiValue value={uiMessage("salon.s0026")} /></NavLink>
      </nav>

      <SectionTitle note={uiMessage("salon.s0027")}><UiValue value={uiMessage("salon.s0017")} /></SectionTitle>
      <nav>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "finance")}><UiValue value={uiMessage("salon.s0017")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "money")}><UiValue value={uiMessage("salon.s0028")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "settlements")}><UiValue value={uiMessage("salon.s0029")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "payouts")}><UiValue value={uiMessage("salon.s0030")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "transactions")}><UiValue value={uiMessage("salon.s0031")} /></NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "contracts")}><UiValue value={uiMessage("salon.s0032")} /></NavLink>
      </nav>

      <div style={{
        marginTop: "22px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#fff",
        padding: "12px"
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}><UiValue value={uiMessage("salon.s0033")} /></div>
        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.45 }}><UiValue value={uiMessage("salon.s0034")} /></div>
      </div>
    </div>
  )
}
