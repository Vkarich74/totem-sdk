import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import SalonSidebar from "./SalonSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"

const ODOO_BASE = "https://www.totemv.com/odoo"

function getSalonSlug() {

  if (window.SALON_SLUG) {
    return window.SALON_SLUG
  }

  const parts = window.location.pathname.split("/")

  if (parts.length >= 3 && parts[1] === "salon") {
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

  const slug = getSalonSlug()

  if (!slug) {
    console.error("ODOO BRIDGE: salon slug missing")
    return
  }

  const section = getCurrentSection()

  const url = `${ODOO_BASE}/salon/${slug}/${section}`

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

export default function SalonLayout() {

  const slug = getSalonSlug()

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

    <CabinetLayout

      header={
        <CabinetHeader slug={slug} onLogout={logout} />
      }

      sidebar={
        <SalonSidebar slug={slug} />
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

  )

}