import { NavLink, Outlet, useLocation, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlugValue } from "./SalonContext"

const MOBILE_NAV_ITEMS = [
  { label: "Главная", section: "dashboard" },
  { label: "Записи", section: "bookings" },
  { label: "Мастера", section: "masters" },
  { label: "Финансы", section: "finance" },
  { label: "Настройки", section: "settings" },
]

export default function SalonShell() {
  const params = useParams()
  const location = useLocation()

  const slug = resolveSalonSlugValue({
    paramsSlug: params?.slug,
    pathname: location.pathname,
    hash: location.hash,
  })

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h3 style={{ margin: 0 }}>Кабинет салона</h3>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>

      <nav style={styles.bottomNav}>
        {MOBILE_NAV_ITEMS.map((item) => (
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
        color: isActive ? "#2563eb" : "#666",
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
    height: "100vh",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #eee",
  },
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
  },
  bottomNav: {
    display: "flex",
    justifyContent: "space-around",
    borderTop: "1px solid #eee",
    padding: "10px 0",
    fontSize: "13px",
    gap: "8px",
  },
  navItem: {
    textDecoration: "none",
  },
}
