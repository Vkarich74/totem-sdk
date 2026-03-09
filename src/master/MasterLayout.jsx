import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import { MasterProvider } from "./MasterContext"
import MasterSidebar from "./MasterSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"

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

  function logout() {
    window.location.href = "/"
  }

  return (

    <MasterProvider>

      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%"
      }}>

        {/* HEADER COMPONENT */}

        <CabinetHeader slug={slug} onLogout={logout} />

        {/* MAIN */}

        <div style={{
          display: "flex",
          flex: 1,
          minHeight: 0
        }}>

          {/* CABINET */}

          <div style={{
            width: "70%",
            borderRight: "1px solid #eee",
            display: "flex",
            minHeight: 0
          }}>

            {/* SIDEBAR */}

            <MasterSidebar slug={slug} />

            {/* PAGE */}

            <div style={{
              flex: 1,
              overflow: "auto",
              padding: "20px",
              minHeight: 0,
              minWidth: 0
            }}>

              <Outlet/>

            </div>

          </div>

          {/* ODOO */}

          <div
            id="odoo-content"
            style={{
              width: "30%",
              overflow: "auto",
              padding: "20px",
              minHeight: 0
            }}
          />

        </div>

      </div>

    </MasterProvider>

  )

}