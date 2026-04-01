import { NavLink, Outlet } from "react-router-dom"
import { buildSalonPath, useSalonSlug } from "./SalonContext"

const bottomItems = [
  { section: "dashboard", label: "Главная" },
  { section: "bookings", label: "Записи" },
  { section: "masters", label: "Мастера" },
  { section: "salon-money", label: "Деньги" },
  { section: "settings", label: "Ещё" }
]

export default function SalonShell() {
  const slug = useSalonSlug()

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h3 style={{ margin: 0 }}>Кабинет салона</h3>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>

      <nav style={styles.bottomNav}>
        {bottomItems.map((item) => (
          <NavItem key={item.section} to={buildSalonPath(slug, item.section)} label={item.label} />
        ))}
      </nav>
    </div>
  )
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...styles.navItem,
        color: isActive ? "#2563eb" : "#666"
      })}
    >
      {label}
    </NavLink>
  )
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh"
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #eee"
  },
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "16px"
  },
  bottomNav: {
    display: "flex",
    justifyContent: "space-around",
    borderTop: "1px solid #eee",
    padding: "10px 0",
    fontSize: "13px",
    background: "#fff"
  },
  navItem: {
    textDecoration: "none",
    fontWeight: 600
  }
}
