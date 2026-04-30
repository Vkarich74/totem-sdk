import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import { MasterProvider, useMaster } from "./MasterContext"
import MasterSidebar from "./MasterSidebar"
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
      const role = String(session?.role || session?.identity?.role || session?.auth?.role || "")
      const masterSlug = String(
        session?.identity?.master_slug ||
        session?.auth?.master_slug ||
        ""
      )

      const hasAccess =
        authenticated &&
        role === "master" &&
        (!masterSlug || masterSlug === String(slug || ""))

      if(!hasAccess){
        clearAuthAccessToken()

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

    const params = new URLSearchParams()
    params.set("role","master")
    if(slug) params.set("slug",slug)
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

function MasterLayoutInner(){
  const {
    slug,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason,
    loading: masterLoading
  } = useMaster()

  useEffect(() => {
    window.__TOTEM_MASTER_BILLING__ = {
      billing: billingAccess,
      billingLoading: masterLoading,
      canWrite,
      canWithdraw,
      billingBlockReason
    }
  }, [billingAccess, masterLoading, canWrite, canWithdraw, billingBlockReason])

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

    window.location.hash = `/master/${slug}`
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
          sidebar={<MasterSidebar slug={slug} />}
          page={<Outlet />}
          odoo={null}
        />

        <BillingOverlay
          billingAccess={billingAccess}
          billingBlockReason={billingBlockReason}
        />
      </div>
    </SessionGate>
  )
}

export default function MasterLayout(){
  return (
    <MasterProvider>
      <MasterLayoutInner />
    </MasterProvider>
  )
}
