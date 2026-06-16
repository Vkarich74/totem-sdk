import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import { MasterProvider, useMaster } from "./MasterContext"
import MasterSidebar from "./MasterSidebar"
import MobileBottomNav from "../mobile/MobileBottomNav"
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

function getMasterMobileActiveKey() {
  const hash = String(window.location.hash || "").toLowerCase()

  if (hash.includes("/bookings")) return "bookings"
  if (hash.includes("/schedule")) return "schedule"
  if (hash.includes("/clients")) return "clients"
  if (
    hash.includes("/finance") ||
    hash.includes("/money") ||
    hash.includes("/transactions") ||
    hash.includes("/payouts") ||
    hash.includes("/sets")
  ) {
    return "finance"
  }

  return "dashboard"
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

        const params = new URLSearchParams()
        params.set("role", "master")
        if(slug) params.set("slug", slug)
        window.location.hash = `/auth/login?${params.toString()}`

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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    window.__TOTEM_MASTER_BILLING__ = {
      billing: billingAccess,
      billingLoading: masterLoading,
      canWrite,
      canWithdraw,
      billingBlockReason
    }
  }, [billingAccess, masterLoading, canWrite, canWithdraw, billingBlockReason])

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  async function logout(){
    try{
      await logoutCurrentSession()
    }catch(e){
      clearAuthAccessToken()
    }

    const params = new URLSearchParams()
    params.set("role", "master")
    if(slug) params.set("slug", slug)
    window.location.hash = `/auth/login?${params.toString()}`
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

        {isMobile ? (
          <>
            <CabinetHeader slug={slug} onLogout={logout} />
            <div style={{
              minHeight: "100vh",
              background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 46%, #f8fafc 100%)",
              padding: "16px 12px 104px",
              boxSizing: "border-box"
            }}>
              <Outlet />
            </div>
            <MobileBottomNav
              activeKey={getMasterMobileActiveKey()}
              items={[
                {
                  key: "dashboard",
                  label: "Главная",
                  href: `#/master/${encodeURIComponent(String(slug || "").trim())}/dashboard`,
                },
                {
                  key: "bookings",
                  label: "Записи",
                  href: `#/master/${encodeURIComponent(String(slug || "").trim())}/bookings`,
                },
                {
                  key: "schedule",
                  label: "Расписание",
                  href: `#/master/${encodeURIComponent(String(slug || "").trim())}/schedule`,
                },
                {
                  key: "clients",
                  label: "Клиенты",
                  href: `#/master/${encodeURIComponent(String(slug || "").trim())}/clients`,
                },
                {
                  key: "finance",
                  label: "Финансы",
                  href: `#/master/${encodeURIComponent(String(slug || "").trim())}/finance`,
                },
              ]}
            />
          </>
        ) : null}

        {!isMobile ? (
          <CabinetLayout
            header={<CabinetHeader slug={slug} onLogout={logout} />}
            sidebar={<MasterSidebar slug={slug} />}
            page={
              <div style={{
                background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 46%, #f8fafc 100%)",
                minHeight: "100%",
                padding: "12px 12px 16px",
                borderRadius: "24px"
              }}>
                <Outlet />
              </div>
            }
            odoo={null}
          />
        ) : null}

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
