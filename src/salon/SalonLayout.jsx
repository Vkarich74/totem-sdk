import { Outlet, useLocation } from "react-router-dom"
import { useEffect, useMemo } from "react"
import { SalonProvider, useSalonContext } from "./SalonContext"
import SalonSidebar from "./SalonSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"

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
    console.error("ODOO BRIDGE: salon slug missing")
    setOdooContent("Odoo блок не загружен: отсутствует slug салона.")
    return
  }

  const targetSection = section || "dashboard"

  if(isLocalRuntime()){
    setOdooContent("Локальный режим: Odoo блок отключён, чтобы не создавать сетевые ошибки при локальном аудите и разработке.")
    return
  }

  const url = `${ODOO_BASE}/salon/${slug}/${targetSection}`

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

function SalonLayoutInner(){
  const location = useLocation()
  const {
    slug,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason,
    loading: salonLoading
  } = useSalonContext()

  const section = useMemo(() => getCurrentSection(location.pathname), [location.pathname])

  useEffect(() => {
    if(salonLoading) return
    loadOdooPanel(slug, section)
  }, [slug, section, salonLoading])

  useEffect(() => {
    window.__TOTEM_SALON_BILLING__ = {
      billing: billingAccess,
      billingLoading: salonLoading,
      canWrite,
      canWithdraw,
      billingBlockReason
    }
  }, [billingAccess, salonLoading, canWrite, canWithdraw, billingBlockReason])

  function logout(){
    if(!slug){
      window.location.href = "/"
      return
    }

    window.location.href = `/salon/${slug}`
  }

  return (
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
          />
        }
      />

      <BillingOverlay
        billingAccess={billingAccess}
        billingBlockReason={billingBlockReason}
      />
    </div>
  )
}

export default function SalonLayout(){
  return (
    <SalonProvider>
      <SalonLayoutInner />
    </SalonProvider>
  )
}
