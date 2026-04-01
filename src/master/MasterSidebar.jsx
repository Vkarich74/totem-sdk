import { NavLink } from "react-router-dom"

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

export default function MasterSidebar({ slug }) {
  const base = `/master/${slug}`

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
        <strong style={{ fontSize: "16px" }}>Кабинет мастера</strong>
        <div style={{ fontSize: "12px", color: "#777", marginTop: "6px", wordBreak: "break-word" }}>
          {slug}
        </div>
      </div>

      <SectionTitle note="Операционка и ежедневная работа">Основное</SectionTitle>
      <nav>
        <NavLink style={menuStyle} to={`${base}/dashboard`}>Главная</NavLink>
        <NavLink style={menuStyle} to={`${base}/bookings`}>Записи</NavLink>
        <NavLink style={menuStyle} to={`${base}/schedule`}>Расписание</NavLink>
        <NavLink style={menuStyle} to={`${base}/clients`}>Клиенты</NavLink>
        <NavLink style={menuStyle} to={`${base}/services`}>Услуги</NavLink>
        <NavLink style={menuStyle} to={`${base}/settings`}>Настройки</NavLink>
      </nav>

      <SectionTitle note="Деньги, расчёты и выплаты">Финансы</SectionTitle>
      <nav>
        <NavLink style={menuStyle} to={`${base}/finance`}>Финансы</NavLink>
        <NavLink style={menuStyle} to={`${base}/money`}>Доход</NavLink>
        <NavLink style={menuStyle} to={`${base}/settlements`}>Сеты</NavLink>
        <NavLink style={menuStyle} to={`${base}/payouts`}>Выплаты</NavLink>
        <NavLink style={menuStyle} to={`${base}/transactions`}>Транзакции</NavLink>
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
          Стартуй с dashboard. Операционные задачи держи в верхнем блоке, деньги и расчёты — в нижнем.
        </div>
      </div>
    </div>
  )
}
