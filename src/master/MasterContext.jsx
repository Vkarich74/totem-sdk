import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com"

const C = createContext(null)

function resolveSlug(routeSlug){
  if(routeSlug) return routeSlug

  if(window.MASTER_SLUG) return window.MASTER_SLUG

  return null
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

export function MasterProvider({ children }){
  const { slug: routeSlug } = useParams()
  const slug = useMemo(()=>resolveSlug(routeSlug),[routeSlug])

  const [master,setMaster] = useState(null)
  const [billingAccess,setBillingAccess] = useState(null)

  const [loading,setLoading] = useState(true)
  const [error,setError] = useState(null)
  const [empty,setEmpty] = useState(false)

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
      const response = await fetch(
        API_BASE + "/internal/masters/" + encodeURIComponent(currentSlug)
      )

      const text = await response.text()
      let raw = null

      try{
        raw = JSON.parse(text)
      }catch{
        raw = null
      }

      if(!response.ok){
        throw new Error("MASTER_CONTEXT_HTTP_" + response.status)
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

  useEffect(()=>{
    load(slug)
  },[slug])

  const canWrite = deriveCanWrite(billingAccess)
  const canWithdraw = deriveCanWithdraw(billingAccess)
  const billingBlockReason = deriveBillingBlockReason(billingAccess)
  const salonSlug =
    master?.salon_slug ||
    master?.salonSlug ||
    billingAccess?.salon_slug ||
    billingAccess?.salonSlug ||
    null

  return (
    <C.Provider
      value={{
        slug,
        salonSlug,
        master,
        billingAccess,
        canWrite,
        canWithdraw,
        billingBlockReason,
        loading,
        error,
        empty,
        reload: ()=>load(slug)
      }}
    >
      {children}
    </C.Provider>
  )
}

export function useMaster(){
  return useContext(C)
}
