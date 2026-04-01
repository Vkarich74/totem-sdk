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
        <strong style={{ fontSize: "16px" }}>Кабинет салона</strong>
        <div style={{ fontSize: "12px", color: "#777", marginTop: "6px", wordBreak: "break-word" }}>
          {slug || "—"}
        </div>
      </div>

      <SectionTitle note="Операционка, мастера и ежедневная работа">Основное</SectionTitle>
      <nav>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "dashboard")}>Главная</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "masters")}>Мастера</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "bookings")}>Записи</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "calendar")}>Расписание</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "clients")}>Клиенты</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "services")}>Услуги</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "settings")}>Настройки</NavLink>
      </nav>

      <SectionTitle note="Деньги, расчёты и договорный контур">Финансы</SectionTitle>
      <nav>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "finance")}>Финансы</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "money")}>Доход</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "settlements")}>Сеты</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "payouts")}>Выплаты</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "transactions")}>Транзакции</NavLink>
        <NavLink style={menuStyle} to={buildSalonPath(slug, "contracts")}>Контракты</NavLink>
      </nav>

      <div style={{
        marginTop: "22px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#fff",
        padding: "12px"
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>Логика кабинета</div>
        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.45 }}>
          Стартуй с dashboard. Операционные задачи и мастеров держи в верхнем блоке, деньги, расчёты и контракты — в нижнем.
        </div>
      </div>
    </div>
  )
}
