// src/salon/SalonShell.jsx
import { NavLink, Outlet } from "react-router-dom";

export default function SalonShell() {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h3 style={{ margin: 0 }}>Комната салона</h3>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>

      <nav style={styles.bottomNav}>
        <NavItem to="/salon/masters" label="Мастера" />
        <NavItem to="/salon/bookings" label="Записи" />
        <NavItem to="/salon/reports" label="Отчёты" />
        <NavItem to="/salon/money" label="Деньги" />
        <NavItem to="/salon/settings" label="Настройки" />
      </nav>
    </div>
  );
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
  );
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
  },
  navItem: {
    textDecoration: "none",
  },
};