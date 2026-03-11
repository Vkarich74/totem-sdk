import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import { MasterProvider } from "./MasterContext"
import MasterSidebar from "./MasterSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"

const ODOO_BASE = "https://www.totemv.com/odoo"

function getMasterSlug() {

  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG
  }

  const hash = window.location.hash

  if (!hash) {
    return null
  }

  const clean = hash.replace("#/", "")
  const parts = clean.split("/")

  if (parts.length >= 2 && parts[0] === "master") {
    return parts[1]
  }

  return null
}

function getCurrentSection() {

  const hash = window.location.hash

  if (!hash) return "dashboard"

  const clean = hash.replace("#/", "")
  const parts = clean.split("/")

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

      <CabinetLayout

        header={
          <CabinetHeader slug={slug} onLogout={logout} />
        }

        sidebar={
          <MasterSidebar slug={slug} />
        }

        page={
          <Outlet/>
        }

        odoo={
          <div
            id="odoo-content"
            style={{
              width: "30%",
              overflow: "auto",
              padding: "20px",
              minHeight: 0
            }}
          />
        }

      />

    </MasterProvider>

  )

}