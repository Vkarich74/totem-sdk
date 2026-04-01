import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { getSalon } from "../api/internal"

const SalonContext = createContext(null)

function normalizeSalonRoot(payload){
  if(!payload) return null
  if(payload.salon || payload.billing_access) return payload
  if(payload.data?.salon || payload.data?.billing_access) return payload.data
  return payload
}

function extractSalon(payload, slug){
  const direct =
    payload?.salon ||
    payload?.data?.salon ||
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

export function resolveSalonSlug(routeSlug){
  if(routeSlug) return routeSlug
  return null
}

export function buildSalonPath(slug, section = "dashboard"){
  const targetSection = section || "dashboard"

  if(slug){
    return `/salon/${slug}/${targetSection}`
  }

  return `/salon/${targetSection}`
}

export function SalonProvider({ children }){
  const { slug: routeSlug } = useParams()
  const slug = useMemo(() => resolveSalonSlug(routeSlug), [routeSlug])

  const [identity, setIdentity] = useState(null)
  const [billingAccess, setBillingAccess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [empty, setEmpty] = useState(false)

  async function load(currentSlug){
    if(!currentSlug){
      console.error("SALON CONTEXT ERROR: SLUG_MISSING")
      setIdentity(null)
      setBillingAccess(null)
      setEmpty(false)
      setError("SLUG_MISSING")
      setLoading(false)
      return
    }

    setIdentity(null)
    setBillingAccess(null)
    setEmpty(false)
    setLoading(true)
    setError(null)

    try{
      const raw = await getSalon(currentSlug)
      const normalized = normalizeSalonRoot(raw)
      const salonData = extractSalon(normalized, currentSlug)
      const billing = extractBillingAccess(normalized)

      setIdentity({
        ...salonData,
        slug: salonData?.slug || currentSlug,
        hasData: true
      })
      setBillingAccess(billing || null)
      setEmpty(false)
    }catch(e){
      console.error("SALON CONTEXT ERROR", e)

      setIdentity({
        slug: currentSlug,
        hasData: false
      })
      setBillingAccess(null)
      setEmpty(false)
      setError(e?.message || "SALON_CONTEXT_LOAD_FAILED")
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    load(slug)
  }, [slug])

  const canWrite = deriveCanWrite(billingAccess)
  const canWithdraw = deriveCanWithdraw(billingAccess)
  const billingBlockReason = deriveBillingBlockReason(billingAccess)

  return (
    <SalonContext.Provider
      value={{
        slug,
        identity,
        billing_access: billingAccess,
        billingAccess,
        canWrite,
        canWithdraw,
        billingBlockReason,
        loading,
        error,
        empty,
        reload: () => load(slug)
      }}
    >
      {children}
    </SalonContext.Provider>
  )
}

export function useSalonContext(){
  const context = useContext(SalonContext)

  if(!context){
    throw new Error("useSalonContext must be used inside SalonProvider")
  }

  return context
}

export function useSalonSlug(){
  return useSalonContext().slug
}

export function useSalonBillingAccess(){
  return useSalonContext().billing_access
}
