// src/layout/AppShell.jsx
import { NavLink, Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h3 style={{ margin: 0 }}>Master Room</h3>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>

      <nav style={styles.bottomNav}>
        <NavItem to="/room/bookings" label="Bookings" />
        <NavItem to="/room/schedule" label="Schedule" />
        <NavItem to="/room/clients" label="Clients" />
        <NavItem to="/room/settings" label="Settings" />
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
  },
  navItem: {
    textDecoration: "none",
    fontSize: "14px",
  },
};