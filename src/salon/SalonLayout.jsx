import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import SalonSidebar from "./SalonSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"
import { SalonProvider, useSalonContext } from "./SalonContext"

const ODOO_BASE = "https://www.totemv.com/odoo"

function loadOdooPanel(slug, section) {
  if (!slug) {
    console.error("ODOO BRIDGE: salon slug missing")
    return
  }

  const targetSection = section || "dashboard"
  const url = `${ODOO_BASE}/salon/${slug}/${targetSection}`

  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error("ODOO_FETCH_FAILED")
      }

      return res.text()
    })
    .then((html) => {
      const container = document.getElementById("odoo-content")

      if (!container) {
        console.error("ODOO BRIDGE: container missing")
        return
      }

      container.innerHTML = html
    })
    .catch((e) => {
      console.error("ODOO BRIDGE ERROR", e)
    })
}

function SalonLayoutInner() {
  const {
    slug,
    billing_access,
    loading,
    billingBlockReason,
    section,
  } = useSalonContext()

  useEffect(() => {
    if (!slug) {
      return
    }

    loadOdooPanel(slug, section)

    function handleHashChange() {
      loadOdooPanel(slug, section)
    }

    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [slug, section])

  function logout() {
    window.location.href = "/"
  }

  const isBlocked = billing_access?.access_state === "blocked"
  const isGrace = billing_access?.access_state === "grace"

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {isGrace && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#ffcc00",
            color: "#000",
            padding: "10px",
            textAlign: "center",
            zIndex: 1000,
            fontWeight: "bold",
          }}
        >
          Внимание: истекает подписка. Пополните баланс.
        </div>
      )}

      <CabinetLayout
        header={<CabinetHeader slug={slug} onLogout={logout} />}
        sidebar={<SalonSidebar slug={slug} />}
        page={<Outlet />}
        odoo={
          <div
            id="odoo-content"
            style={{
              width: "30%",
              overflow: "auto",
              padding: "20px",
              minHeight: 0,
            }}
          />
        }
      />

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.55)",
            zIndex: 1500,
            pointerEvents: "none",
          }}
        />
      )}

      {isBlocked && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "20px",
            fontWeight: "bold",
            textAlign: "center",
            padding: "24px",
          }}
        >
          Доступ ограничен. Оплатите подписку.
        </div>
      )}

      {!slug && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.96)",
            zIndex: 2200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#111827",
            fontSize: "18px",
            fontWeight: "bold",
            textAlign: "center",
            padding: "24px",
          }}
        >
          Salon slug не найден. Проверь маршрут cabinet.
        </div>
      )}

      {!isBlocked && billingBlockReason === "grace" && null}
    </div>
  )
}

export default function SalonLayout() {
  return (
    <SalonProvider>
      <SalonLayoutInner />
    </SalonProvider>
  )
}