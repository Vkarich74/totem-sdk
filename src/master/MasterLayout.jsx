import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import { MasterProvider } from "./MasterContext"
import MasterSidebar from "./MasterSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"
import {
  getMaster,
  canWriteByBilling,
  canWithdrawByBilling,
  getBillingBlockReason
} from "../api/internal"

const ODOO_BASE = "https://www.totemv.com/odoo"

function getMasterSlug() {

  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG
  }

  const hash = window.location.hash

  if (hash) {
    const clean = hash.replace("#/", "")
    const parts = clean.split("/")

    if (parts.length >= 2 && parts[0] === "master") {
      return parts[1]
    }
  }

  const storedSlug =
    window.localStorage.getItem("totem_master_slug") ||
    window.sessionStorage.getItem("totem_master_slug")

  if (storedSlug) {
    return storedSlug
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
  const [billing, setBilling] = useState(null)
  const [billingLoading, setBillingLoading] = useState(true)

  useEffect(() => {
    if (slug) {
      window.localStorage.setItem("totem_master_slug", slug)
      window.sessionStorage.setItem("totem_master_slug", slug)
    }

    async function loadBilling() {
      if (!slug) {
        setBilling(null)
        setBillingLoading(false)
        return
      }

      try {
        const r = await getMaster(slug)

        if (r.ok) {
          setBilling(r.billing_access || null)
        } else {
          setBilling(null)
        }
      } catch (e) {
        console.error("MASTER BILLING LOAD ERROR", e)
        setBilling(null)
      } finally {
        setBillingLoading(false)
      }
    }

    loadBilling()
    loadOdooPanel()

    window.addEventListener("hashchange", loadOdooPanel)

    return () => {
      window.removeEventListener("hashchange", loadOdooPanel)
    }

  }, [slug])

  function logout() {
    window.location.href = "/"
  }

  const billingState = billing?.access_state || null
  const isBlocked = billingState === "blocked"
  const isGrace = billingState === "grace"

  const canWrite = canWriteByBilling(billing)
  const canWithdraw = canWithdrawByBilling(billing)
  const billingBlockReason = getBillingBlockReason(billing)

  window.__TOTEM_MASTER_BILLING__ = {
    billing,
    billingLoading,
    canWrite,
    canWithdraw,
    billingBlockReason
  }

  return (

    <MasterProvider>

      <div style={{ position: "relative", height: "100%" }}>

        {isGrace && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#ffcc00",
            color: "#000",
            padding: "10px",
            textAlign: "center",
            zIndex: 1000,
            fontWeight: "bold"
          }}>
            Внимание: истекает подписка. Пополните баланс.
          </div>
        )}

        <CabinetLayout

          header={
            <CabinetHeader slug={slug} onLogout={logout} />
          }

          sidebar={
            <MasterSidebar slug={slug} />
          }

          page={
            <Outlet />
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
            padding: "24px"
          }}>
            <div>
              <div>Доступ ограничен. Оплатите подписку.</div>
              {billingBlockReason && (
                <div style={{ marginTop: "10px", fontSize: "14px", fontWeight: "normal" }}>
                  {billingBlockReason}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </MasterProvider>

  )

}