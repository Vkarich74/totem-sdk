import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import SalonSidebar from "./SalonSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"
import { getSalon } from "../api/internal"

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

  const [billing, setBilling] = useState(null)

  useEffect(() => {

    async function loadBilling() {
      if (!slug) return

      const r = await getSalon(slug)

      if (r.ok) {
        setBilling(r.billing_access || null)
      }
    }

    loadBilling()

  }, [slug])

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

  const isBlocked = billing?.access_state === "blocked"
  const isGrace = billing?.access_state === "grace"

  return (

    <div style={{ position:"relative", height:"100%" }}>

      {isGrace && (
        <div style={{
          position:"fixed",
          top:0,
          left:0,
          right:0,
          background:"#ffcc00",
          color:"#000",
          padding:"10px",
          textAlign:"center",
          zIndex:1000,
          fontWeight:"bold"
        }}>
          Внимание: истекает подписка. Пополните баланс.
        </div>
      )}

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

      {isBlocked && (
        <div style={{
          position:"absolute",
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:"rgba(0,0,0,0.6)",
          zIndex:2000,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          color:"#fff",
          fontSize:"20px",
          fontWeight:"bold"
        }}>
          Доступ ограничен. Оплатите подписку.
        </div>
      )}

    </div>

  )

}