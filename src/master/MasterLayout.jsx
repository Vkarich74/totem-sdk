import { Outlet, useLocation } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
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

const ODOO_BASE = "https://www.totemv.com/odoo"

function getCurrentSection(pathname){
  if(!pathname) return "dashboard"

  const parts = pathname.split("/").filter(Boolean)

  if(parts.length < 3) return "dashboard"

  return parts[2] || "dashboard"
}

function isLocalRuntime(){
  if(typeof window === "undefined") return false

  const host = String(window.location.hostname || "").toLowerCase()
  return host === "localhost" || host === "127.0.0.1"
}

function setOdooContent(message){
  const container = document.getElementById("odoo-content")

  if(!container){
    console.error("ODOO BRIDGE: container missing")
    return
  }

  container.innerHTML = `
    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;color:#111827;font:14px/1.5 Arial, sans-serif;">
      ${message}
    </div>
  `
}

async function loadOdooPanel(slug, section){
  if(!slug){
    console.error("ODOO BRIDGE: master slug missing")
    setOdooContent("Odoo блок не загружен: отсутствует slug мастера.")
    return
  }

  const targetSection = section || "dashboard"

  if(isLocalRuntime()){
    setOdooContent("Локальный режим: Odoo блок отключён, чтобы не создавать сетевые ошибки при локальном аудите и разработке.")
    return
  }

  const url = `${ODOO_BASE}/master/${slug}/${targetSection}`

  try{
    const res = await fetch(url)

    if(!res.ok){
      throw new Error(`ODOO_FETCH_FAILED_${res.status}`)
    }

    const html = await res.text()
    const container = document.getElementById("odoo-content")

    if(!container){
      console.error("ODOO BRIDGE: container missing")
      return
    }

    container.innerHTML = html
  }catch(e){
    console.error("ODOO BRIDGE ERROR", e)
    setOdooContent("Не удалось загрузить Odoo блок. Продолжайте работу в кабинете, основной интерфейс доступен.")
  }
}

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
      const role = String(session?.identity?.role || session?.auth?.role || "")
      const masterSlug = String(
        session?.identity?.master_slug ||
        session?.auth?.master_slug ||
        ""
      )

      const hasAccess =
        authenticated &&
        role === "master" &&
        masterSlug === String(slug || "")

      if(!hasAccess){
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

    const target = slug ? `/master/${slug}` : "/"
    window.location.href = target
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
  const location = useLocation()
  const {
    slug,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason,
    loading: masterLoading
  } = useMaster()

  const section = useMemo(() => getCurrentSection(location.pathname), [location.pathname])

  useEffect(() => {
    if(masterLoading) return
    loadOdooPanel(slug, section)
  }, [slug, section, masterLoading])

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
      window.location.href = "/"
      return
    }

    window.location.href = `/master/${slug}`
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