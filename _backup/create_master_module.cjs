const fs = require("fs")
const path = require("path")

const base = path.join(__dirname, "src", "master")

if (!fs.existsSync(base)) {
  fs.mkdirSync(base, { recursive: true })
}

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
`,

"MasterDashboard.jsx": `
export default function MasterDashboard() {
  return (
    <div>
      <h1>Master Dashboard</h1>
      <p>Metrics will appear here.</p>
    </div>
  )
}
`,

"MasterBookingsPage.jsx": `
export default function MasterBookingsPage() {
  return (
    <div>
      <h1>Master Bookings</h1>
    </div>
  )
}
`,

"MasterClientsPage.jsx": `
export default function MasterClientsPage() {
  return (
    <div>
      <h1>Master Clients</h1>
    </div>
  )
}
`,

"MasterSchedulePage.jsx": `
export default function MasterSchedulePage() {
  return (
    <div>
      <h1>Master Schedule</h1>
    </div>
  )
}
`,

"MasterMoneyPage.jsx": `
export default function MasterMoneyPage() {
  return (
    <div>
      <h1>Master Money</h1>
    </div>
  )
}
`,

"MasterSettingsPage.jsx": `
export default function MasterSettingsPage() {
  return (
    <div>
      <h1>Master Settings</h1>
    </div>
  )
}
`

}

for (const file in files) {

  const filePath = path.join(base, file)

  fs.writeFileSync(filePath, files[file].trim())

  console.log("Created:", file)

}

console.log("\\nMaster CRM module created successfully.")