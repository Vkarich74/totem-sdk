import { NavLink } from "react-router-dom"
import { buildSalonPath } from "./SalonContext"

const NAV_GROUPS = [
  {
    title: "Основное",
    items: [
      { label: "Главная", section: "dashboard" },
      { label: "Мастера", section: "masters" },
      { label: "Записи", section: "bookings" },
      { label: "Расписание", section: "calendar" },
      { label: "Клиенты", section: "clients" },
      { label: "Услуги", section: "services" },
    ],
  },
  {
    title: "Финансы",
    items: [
      { label: "Финансы", section: "finance" },
      { label: "Доход", section: "salon-money" },
      { label: "Деньги", section: "money" },
      { label: "Транзакции", section: "transactions" },
      { label: "Сеты", section: "settlements" },
      { label: "Выплаты", section: "payouts" },
      { label: "Контракты", section: "contracts" },
    ],
  },
  {
    title: "Аккаунт",
    items: [{ label: "Настройки", section: "settings" }],
  },
]

export default function SalonSidebar({ slug }) {
  const sidebarStyle = {
    width: "220px",
    flexShrink: 0,
    borderRight: "1px solid #eee",
    padding: "20px",
    background: "#fafafa",
    position: "sticky",
    top: 0,
    height: "100%",
    alignSelf: "flex-start",
  }

  const menuStyle = ({ isActive }) => ({
    display: "block",
    padding: "8px 0",
    textDecoration: "none",
    color: isActive ? "#111827" : "#4b5563",
    fontWeight: isActive ? 700 : 400,
  })

  return (
    <div style={sidebarStyle}>
      <div style={{ marginBottom: "25px" }}>
        <strong>Салон</strong>
        <div
          style={{
            fontSize: "12px",
            color: "#777",
            marginTop: "4px",
            wordBreak: "break-word",
          }}
        >
          {slug || "slug не найден"}
        </div>
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
            {group.title}
          </div>

          <nav>
            {group.items.map((item) => (
              <NavLink key={item.section} style={menuStyle} to={buildSalonPath(slug, item.section)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </div>
  )
}
