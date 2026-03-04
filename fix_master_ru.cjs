const fs = require("fs")
const path = require("path")

const base = path.join(__dirname, "src", "master")

const files = {

"MasterLayout.jsx": `
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
`,

"MasterDashboard.jsx": `
export default function MasterDashboard() {
  return (
    <div>
      <h1>Главная мастера</h1>
      <p>Здесь будут отображаться метрики.</p>
    </div>
  )
}
`,

"MasterBookingsPage.jsx": `
export default function MasterBookingsPage() {
  return (
    <div>
      <h1>Записи</h1>
    </div>
  )
}
`,

"MasterClientsPage.jsx": `
export default function MasterClientsPage() {
  return (
    <div>
      <h1>Клиенты</h1>
    </div>
  )
}
`,

"MasterSchedulePage.jsx": `
export default function MasterSchedulePage() {
  return (
    <div>
      <h1>Расписание</h1>
    </div>
  )
}
`,

"MasterMoneyPage.jsx": `
export default function MasterMoneyPage() {
  return (
    <div>
      <h1>Доход мастера</h1>
    </div>
  )
}
`,

"MasterSettingsPage.jsx": `
export default function MasterSettingsPage() {
  return (
    <div>
      <h1>Настройки мастера</h1>
    </div>
  )
}
`

}

for (const file in files) {

  const filePath = path.join(base, file)

  fs.writeFileSync(filePath, files[file].trim())

  console.log("Обновлён:", file)

}

console.log("\\nРусский интерфейс мастера установлен.")