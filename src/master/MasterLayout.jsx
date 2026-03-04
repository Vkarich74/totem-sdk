import { Link, Outlet } from "react-router-dom"

export default function MasterLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>

      <aside
        style={{
          width: "240px",
          background: "#111",
          color: "#fff",
          padding: "20px",
          boxSizing: "border-box"
        }}
      >

        <h2 style={{ marginTop: 0 }}>Master Panel</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link to="/master/dashboard">Dashboard</Link>
          <Link to="/master/bookings">Bookings</Link>
          <Link to="/master/clients">Clients</Link>
          <Link to="/master/schedule">Schedule</Link>
          <Link to="/master/money">Money</Link>
          <Link to="/master/settings">Settings</Link>
        </nav>

      </aside>

      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <Outlet />
      </main>

    </div>
  )
}