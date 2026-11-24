import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { getMaster } from "../api/internal"
import {useSharedMasterRole} from "../us/SharedMasterRole.jsx"

const MasterContext = createContext(null)

export function resolveMasterSlug(routeSlug){
  if(routeSlug) return routeSlug

  if(window.MASTER_SLUG) return window.MASTER_SLUG

  return null
}

export function buildMasterPath(slug, section = "dashboard"){
  const targetSection = section || "dashboard"

  if(slug){
    return `#/master/${slug}/${targetSection}`
  }

  console.error("MASTER PATH ERROR: SLUG_MISSING", { section: targetSection })
  return "#/master"
}

function normalizeMasterRoot(payload){
  if(!payload) return null
  if(payload.master || payload.billing_access) return payload
  if(payload.data?.master || payload.data?.billing_access) return payload.data
  return payload
}

function extractMaster(payload, slug){
  const direct =
    payload?.master ||
    payload?.data?.master ||
    null

  if(direct && typeof direct === "object"){
    return {
      ...direct,
      slug: direct.slug || slug
    }
  }

  return {
    slug,
    hasData: false
  }
}

function extractBillingAccess(payload){
  if(payload?.billing_access) return payload.billing_access
  if(payload?.data?.billing_access) return payload.data.billing_access
  return null
}

function deriveCanWrite(billingAccess){
  if(typeof billingAccess?.can_write === "boolean") return billingAccess.can_write
  if(typeof billingAccess?.canWrite === "boolean") return billingAccess.canWrite

  const state = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    ""
  ).toLowerCase()

  if(state === "blocked") return false
  return true
}

function deriveCanWithdraw(billingAccess){
  if(typeof billingAccess?.can_withdraw === "boolean") return billingAccess.can_withdraw
  if(typeof billingAccess?.canWithdraw === "boolean") return billingAccess.canWithdraw

  const state = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    ""
  ).toLowerCase()

  if(state === "blocked") return false
  return true
}

function deriveBillingBlockReason(billingAccess){
  return (
    billingAccess?.block_reason ||
    billingAccess?.billing_block_reason ||
    billingAccess?.reason ||
    null
  )
}

function isForbiddenMasterLoad(result){
  return Boolean(
    result &&
    result.ok === false &&
    (
      result?.detail?.status === 403 ||
      result?.detail?.response?.status === 403
    )
  )
}

export function MasterProvider({ children }){
  const { slug: routeSlug } = useParams()
  const slug = useMemo(() => resolveMasterSlug(routeSlug), [routeSlug])

  const shared=useSharedMasterRole()
  const [master, setMaster] = useState(null)
  const [billingAccess, setBillingAccess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [empty, setEmpty] = useState(false)

  async function load(currentSlug){
    if(!currentSlug){
      console.error("MASTER CONTEXT ERROR: SLUG_MISSING")
      setMaster(null)
      setBillingAccess(null)
      setEmpty(false)
      setError("SLUG_MISSING")
      setLoading(false)
      return
    }

    setMaster(null)
    setBillingAccess(null)
    setEmpty(false)
    setLoading(true)
    setError(null)

    try{
      const raw = await getMaster(currentSlug)

      if(isForbiddenMasterLoad(raw)){
        console.warn("MASTER CONTEXT WARN: ROOT_PROFILE_FORBIDDEN", {
          slug: currentSlug
        })

        setMaster({
          slug: currentSlug,
          hasData: false
        })
        setBillingAccess(null)
        setEmpty(false)
        setError(null)
        return
      }

      const normalized = normalizeMasterRoot(raw)
      const masterData = extractMaster(normalized, currentSlug)
      const billing = extractBillingAccess(normalized)

      setMaster({
        ...masterData,
        slug: masterData?.slug || currentSlug,
        hasData: true
      })
      setBillingAccess(billing || null)
      setEmpty(false)
    }catch(e){
      console.error("MASTER CONTEXT ERROR", e)

      setMaster({
        slug: currentSlug,
        hasData: false
      })
      setBillingAccess(null)
      setEmpty(false)
      setError(e?.message || "MASTER_CONTEXT_LOAD_FAILED")
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    if(!shared)load(slug)
  }, [slug, Boolean(shared)])

  const canWrite = shared?false:deriveCanWrite(billingAccess)
  const canWithdraw = shared?false:deriveCanWithdraw(billingAccess)
  const billingBlockReason = deriveBillingBlockReason(billingAccess)
  const salonSlug =
    master?.salon_slug ||
    master?.salonSlug ||
    billingAccess?.salon_slug ||
    billingAccess?.salonSlug ||
    null

  return (
    <MasterContext.Provider
      value={{
        slug,
        salonSlug:shared?shared.salonSlug:salonSlug,
        master:shared?shared.root?.master||null:master,
        billing_access:shared?shared.root?.billing_access||null:billingAccess,
        billingAccess:shared?shared.root?.billing_access||null:billingAccess,
        canWrite,
        canWithdraw,
        billingBlockReason,
        loading:shared?shared.status==="loading":loading,
        error:shared?(shared.status==="blocked"?"US_SHARED_AUTHORITY_REQUIRED":null):error,
        empty:shared?false:empty,
        reload:shared?shared.refresh:() => load(slug)
      }}
    >
      {children}
    </MasterContext.Provider>
  )
}

export function useMasterContext(){
  const context = useContext(MasterContext)

  if(!context){
    throw new Error("useMasterContext must be used inside MasterProvider")
  }

  return context
}

export function useMaster(){
  return useMasterContext()
}

export function useMasterSlug(){
  return useMasterContext().slug
}

export function useMasterBillingAccess(){
  return useMasterContext().billing_access
}
