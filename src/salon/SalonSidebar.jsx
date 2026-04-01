import { NavLink } from "react-router-dom"
import { buildSalonPath } from "./SalonContext"

const mainItems = [
  { section: "dashboard", label: "Главная" },
  { section: "masters", label: "Мастера" },
  { section: "bookings", label: "Записи" },
  { section: "calendar", label: "Расписание" },
  { section: "clients", label: "Клиенты" },
  { section: "services", label: "Услуги" }
]

const financeItems = [
  { section: "finance", label: "Финансы" },
  { section: "money", label: "Доход" },
  { section: "salon-money", label: "Деньги" },
  { section: "transactions", label: "Транзакции" },
  { section: "settlements", label: "Сеты" },
  { section: "payouts", label: "Выплаты" },
  { section: "contracts", label: "Контракты" }
]

const accountItems = [{ section: "settings", label: "Настройки" }]

function menuStyle({ isActive }) {
  return {
    display: "block",
    padding: "8px 0",
    textDecoration: "none",
    color: isActive ? "#111827" : "#4b5563",
    fontWeight: isActive ? 700 : 500
  }
}

function MenuGroup({ title, items, slug }) {
  return (
    <>
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </div>
      <nav>
        {items.map((item) => (
          <NavLink key={item.section} style={menuStyle} to={buildSalonPath(slug, item.section)}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default function SalonSidebar({ slug }) {
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid #eee",
        padding: 20,
        background: "#fafafa",
        position: "sticky",
        top: 0,
        height: "100%",
        alignSelf: "flex-start"
      }}
    >
      <div style={{ marginBottom: 25 }}>
        <strong>Салон</strong>
        <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{slug || "—"}</div>
      </div>

      <MenuGroup title="Основное" items={mainItems} slug={slug} />

      <div style={{ marginTop: 25 }}>
        <MenuGroup title="Финансы" items={financeItems} slug={slug} />
      </div>

      <div style={{ marginTop: 25 }}>
        <MenuGroup title="Аккаунт" items={accountItems} slug={slug} />
      </div>
    </div>
  )
}
