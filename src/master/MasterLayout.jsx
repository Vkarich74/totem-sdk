import { Outlet, NavLink } from "react-router-dom"
import { useEffect } from "react"
import { MasterProvider } from "./MasterContext"

const ODOO_BASE = "https://www.totemv.com/odoo"

function getMasterSlug() {

  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG
  }

  const parts = window.location.pathname.split("/")

  if (parts.length >= 3 && parts[1] === "master") {
    return parts[2]
  }

  return null
}

function getCurrentSection() {

  const hash = window.location.hash

  if (!hash) return "dashboard"

  const parts = hash.split("/")

  if (parts.length < 3) return "dashboard"

  return parts[2]
}

async function loadOdooPanel() {

  const slug = getMasterSlug()

  if (!slug) {
    console.error("ODOO BRIDGE: master slug missing")
    return
  }

  const section = getCurrentSection()

  const url = `${ODOO_BASE}/master/${slug}/${section}`

  try {

    const res = await fetch(url)

    if (!res.ok) {
      throw new Error("ODOO_FETCH_FAILED")
    }

    const html = await res.text()

    const container = document.getElementById("odoo-content")

    if (!container) {
      console.error("ODOO BRIDGE: container missing")
      return
    }

    container.innerHTML = html

  } catch (e) {

    console.error("ODOO BRIDGE ERROR", e)

  }

}

export default function MasterLayout() {

  const slug = getMasterSlug()

  useEffect(() => {

    loadOdooPanel()

    window.addEventListener("hashchange", loadOdooPanel)

    return () => {
      window.removeEventListener("hashchange", loadOdooPanel)
    }

  }, [])

  return (

    <MasterProvider>

      <div style={{
        display: "flex",
        height: "100vh",
        width: "100%"
      }}>

        <div style={{
          width: "70%",
          borderRight: "1px solid #eee",
          display: "flex",
          flexDirection: "column"
        }}>

          {/* HEADER */}

          <div style={{
            padding: "12px 20px",
            borderBottom: "1px solid #eee",
            background: "#fafafa"
          }}>
            <strong>Мастер:</strong> {slug}
          </div>

          {/* CONTENT */}

          <div style={{
            flex: 1,
            overflow: "auto",
            padding: "20px"
          }}>

            <h2>Панель мастера</h2>

            <nav style={{marginBottom:"20px"}}>

              <NavLink to="/master/dashboard">Главная</NavLink>
              <br/>

              <NavLink to="/master/bookings">Записи</NavLink>
              <br/>

              <NavLink to="/master/clients">Клиенты</NavLink>
              <br/>

              <NavLink to="/master/schedule">Расписание</NavLink>
              <br/>

              <NavLink to="/master/money">Доход</NavLink>
              <br/>

              <NavLink to="/master/transactions">Транзакции</NavLink>
              <br/>

              <NavLink to="/master/settlements">Сеты</NavLink>
              <br/>

              <NavLink to="/master/payouts">Выплаты</NavLink>
              <br/>

              <NavLink to="/master/settings">Настройки</NavLink>

            </nav>

            <Outlet/>

          </div>

        </div>

        <div
          id="odoo-content"
          style={{
            width: "30%",
            overflow: "auto",
            padding: "20px"
          }}
        />

      </div>

    </MasterProvider>

  )
}