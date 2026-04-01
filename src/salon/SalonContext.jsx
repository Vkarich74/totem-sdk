import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { getSalon } from "../api/internal"

const SalonContext = createContext(null)

function readHashPath(hashValue) {
  const hash = hashValue ?? window.location.hash ?? ""
  return hash.replace(/^#\/?/, "")
}

function readSlugFromHash(hashValue) {
  const clean = readHashPath(hashValue)
  if (!clean) return null

  const parts = clean.split("/").filter(Boolean)
  const salonIndex = parts.indexOf("salon")

  if (salonIndex !== -1 && parts[salonIndex + 1]) {
    return parts[salonIndex + 1]
  }

  return null
}

function readSlugFromPathname(pathnameValue) {
  const pathname = pathnameValue ?? window.location.pathname ?? ""
  const parts = pathname.split("/").filter(Boolean)
  const salonIndex = parts.indexOf("salon")

  if (salonIndex !== -1 && parts[salonIndex + 1]) {
    return parts[salonIndex + 1]
  }

  return null
}

export function readSalonSection(hashValue) {
  const clean = readHashPath(hashValue)
  if (!clean) return "dashboard"

  const parts = clean.split("/").filter(Boolean)
  const salonIndex = parts.indexOf("salon")

  if (salonIndex !== -1 && parts[salonIndex + 2]) {
    return parts[salonIndex + 2]
  }

  return "dashboard"
}

export function resolveSalonSlugValue({
  paramsSlug = null,
  pathname = null,
  hash = null,
  windowSlug = null,
} = {}) {
  if (paramsSlug) {
    return paramsSlug
  }

  const hashSlug = readSlugFromHash(hash)
  if (hashSlug) {
    return hashSlug
  }

  const pathnameSlug = readSlugFromPathname(pathname)
  if (pathnameSlug) {
    return pathnameSlug
  }

  const bridgeSlug = windowSlug ?? window.SALON_SLUG ?? null
  if (bridgeSlug) {
    return bridgeSlug
  }

  return null
}

export function buildSalonPath(slug, section = "dashboard") {
  if (!slug) {
    return "/salon"
  }

  if (!section) {
    return `/salon/${slug}`
  }

  return `/salon/${slug}/${section}`
}

function normalizeIdentity(payload, slug) {
  if (!payload || typeof payload !== "object") {
    return slug
      ? {
          slug,
          name: slug,
        }
      : null
  }

  return {
    id: payload.id ?? null,
    slug: payload.slug ?? slug ?? null,
    name: payload.name ?? payload.title ?? payload.slug ?? slug ?? "Салон",
    status: payload.status ?? null,
  }
}

function normalizeBillingAccess(payload) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  return {
    exists: Boolean(payload.exists),
    subscription_status: payload.subscription_status ?? null,
    access_state: payload.access_state ?? null,
    can_write: Boolean(payload.can_write),
    can_withdraw: Boolean(payload.can_withdraw),
    billing: payload.billing ?? null,
  }
}

export function SalonProvider({ children }) {
  const params = useParams()
  const location = useLocation()

  const slug = useMemo(() => {
    return resolveSalonSlugValue({
      paramsSlug: params?.slug,
      pathname: location.pathname,
      hash: location.hash,
    })
  }, [params?.slug, location.pathname, location.hash])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [identity, setIdentity] = useState(null)
  const [billingAccess, setBillingAccess] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadSalonContext() {
      if (!slug) {
        if (!cancelled) {
          setIdentity(null)
          setBillingAccess(null)
          setError("SALON_SLUG_MISSING")
          setLoading(false)
        }
        return
      }

      if (window.SALON_SLUG !== slug) {
        window.SALON_SLUG = slug
      }

      try {
        if (!cancelled) {
          setLoading(true)
          setError("")
        }

        const response = await getSalon(slug)

        if (cancelled) {
          return
        }

        if (response && response.ok) {
          setIdentity(normalizeIdentity(response.salon || response.data || response, slug))
          setBillingAccess(normalizeBillingAccess(response.billing_access))
          setError("")
        } else {
          setIdentity(normalizeIdentity(null, slug))
          setBillingAccess(null)
          setError("SALON_CONTEXT_LOAD_FAILED")
        }
      } catch (e) {
        if (!cancelled) {
          setIdentity(normalizeIdentity(null, slug))
          setBillingAccess(null)
          setError("SALON_CONTEXT_LOAD_FAILED")
          console.error("SALON CONTEXT LOAD ERROR", e)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSalonContext()

    return () => {
      cancelled = true
    }
  }, [slug])

  const value = useMemo(() => {
    const accessState = billingAccess?.access_state ?? null
    const canWrite = Boolean(billingAccess?.can_write)
    const canWithdraw = Boolean(billingAccess?.can_withdraw)

    let billingBlockReason = null

    if (accessState === "blocked") {
      billingBlockReason = "blocked"
    } else if (accessState === "grace") {
      billingBlockReason = "grace"
    }

    return {
      slug,
      identity,
      billing_access: billingAccess,
      canWrite,
      canWithdraw,
      billingBlockReason,
      loading,
      error,
      section: readSalonSection(location.hash),
    }
  }, [slug, identity, billingAccess, loading, error, location.hash])

  return <SalonContext.Provider value={value}>{children}</SalonContext.Provider>
}

export function useSalonContext() {
  const context = useContext(SalonContext)

  if (!context) {
    throw new Error("useSalonContext must be used inside SalonProvider")
  }

  return context
}

export function useSalonSlug() {
  return useSalonContext().slug
}

export function useSalonBillingAccess() {
  return useSalonContext().billing_access
}
