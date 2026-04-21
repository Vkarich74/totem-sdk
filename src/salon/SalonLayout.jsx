import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import { SalonProvider, useSalonContext } from "./SalonContext"
import SalonSidebar from "./SalonSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"
import {
  hasAuthAccessToken,
  clearAuthAccessToken,
  logoutCurrentSession,
  resolveSession
} from "../api/internal"

function BillingBanner({ billingAccess, billingBlockReason, canWrite, canWithdraw }){
  const accessState = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  if(accessState !== "grace") return null

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      background: "#ffcc00",
      color: "#000",
      padding: "10px 16px",
      textAlign: "center",
      zIndex: 1000,
      fontWeight: 700,
      fontSize: "14px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}>
      Внимание: истекает подписка. Пополните баланс.
      {billingBlockReason ? ` ${billingBlockReason}` : ""}
      <span style={{ display: "inline-block", marginLeft: "10px", fontWeight: 500 }}>
        Запись: {canWrite ? "доступна" : "ограничена"} · Выплаты: {canWithdraw ? "доступны" : "ограничены"}
      </span>
    </div>
  )
}

function BillingOverlay({ billingAccess, billingBlockReason }){
  const accessState = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  if(accessState !== "blocked") return null

  return (
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
  )
}

function SessionGate({ slug, children }){
  const [state, setState] = useState({
    loading: true,
    allowed: false
  })

  useEffect(() => {
    let active = true

    async function run(){
      if(!hasAuthAccessToken()){
        if(active){
          setState({ loading: false, allowed: false })
        }
        return
      }

      const session = await resolveSession()

      if(!active) return

      const authenticated = Boolean(session?.ok && session?.authenticated)
      const role = String(session?.role || session?.auth?.role || session?.identity?.role || "")
      const salons = Array.isArray(session?.identity?.salons) ? session.identity.salons : []
      const ownership = Array.isArray(session?.identity?.ownership) ? session.identity.ownership : []
      const salonSlug = String(session?.identity?.salon_slug || session?.auth?.salon_slug || "")
      const hasSalonAccess =
        role === "salon_admin" &&
        (
          salons.length > 0 ||
          ownership.length > 0 ||
          !salonSlug ||
          salonSlug === String(slug || "")
        )

      if(!authenticated || !hasSalonAccess){
        try{
          await logoutCurrentSession()
        }catch(e){
          clearAuthAccessToken()
        }

        if(active){
          setState({ loading: false, allowed: false })
        }
        return
      }

      setState({ loading: false, allowed: true })
    }

    run()

    return () => {
      active = false
    }
  }, [slug])

  useEffect(() => {
    if(state.loading || state.allowed) return

    const safeSlug = String(slug || "").trim()
    const params = new URLSearchParams()
    params.set("role", "salon_admin")
    if(safeSlug) params.set("slug", safeSlug)

    // FIX: redirect только через hash (SDK runtime)
    window.location.hash = `/auth/login?${params.toString()}`
  }, [state, slug])

  if(state.loading){
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        color: "#111827",
        font: "16px/1.5 Arial, sans-serif"
      }}>
        Проверка сессии кабинета…
      </div>
    )
  }

  if(!state.allowed){
    return null
  }

  return children
}

function SalonLayoutInner(){
  const {
    slug,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason,
    loading: salonLoading
  } = useSalonContext()

  useEffect(() => {
    window.__TOTEM_SALON_BILLING__ = {
      billing: billingAccess,
      billingLoading: salonLoading,
      canWrite,
      canWithdraw,
      billingBlockReason
    }
  }, [billingAccess, salonLoading, canWrite, canWithdraw, billingBlockReason])

  async function logout(){
    try{
      await logoutCurrentSession()
    }catch(e){
      clearAuthAccessToken()
    }

    if(!slug){
      window.location.hash = "/"
      return
    }

    // FIX: redirect через hash
    window.location.hash = `/salon/${slug}`
  }

  return (
    <SessionGate slug={slug}>
      <div style={{ position: "relative", height: "100%" }}>
        <BillingBanner
          billingAccess={billingAccess}
          billingBlockReason={billingBlockReason}
          canWrite={canWrite}
          canWithdraw={canWithdraw}
        />

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
                minHeight: 0
              }}
            >
              <div style={{
                padding: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                background: "#fff",
                color: "#111827",
                font: "14px/1.5 Arial, sans-serif"
              }}>
                Odoo блок отключён в cabinet runtime.
              </div>
            </div>
          }
        />

        <BillingOverlay
          billingAccess={billingAccess}
          billingBlockReason={billingBlockReason}
        />
      </div>
    </SessionGate>
  )
}

export default function SalonLayout(){
  return (
    <SalonProvider>
      <SalonLayoutInner />
    </SalonProvider>
  )
}
