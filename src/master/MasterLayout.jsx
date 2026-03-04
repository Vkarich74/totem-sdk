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

        <h2 style={{ marginTop: 0 }}>Панель мастера</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link to="/master/dashboard">Главная</Link>
          <Link to="/master/bookings">Записи</Link>
          <Link to="/master/clients">Клиенты</Link>
          <Link to="/master/schedule">Расписание</Link>
          <Link to="/master/money">Доход</Link>
          <Link to="/master/settings">Настройки</Link>
        </nav>

      </aside>

      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <Outlet />
      </main>

    </div>
  )
}