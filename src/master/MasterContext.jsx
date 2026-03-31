import { createContext, useContext, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  getMasterMetrics,
  getMasterBookings,
  getMasterClients
} from "../api/master"

const C = createContext(null)

function resolveSlug(routeSlug) {
  if (routeSlug) return routeSlug

  if (window.MASTER_SLUG) return window.MASTER_SLUG

  const hash = window.location.hash || ""
  const hashPath = hash.startsWith("#") ? hash.slice(1) : hash
  const clean = hashPath.startsWith("/") ? hashPath : `/${hashPath}`
  const parts = clean.split("/").filter(Boolean)

  if (parts[0] === "master" && parts[1]) return parts[1]

  return null
}

export function MasterProvider({ children }) {

  const { slug: routeSlug } = useParams()
  const slug = resolveSlug(routeSlug)

  const [master, setMaster] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [bookings, setBookings] = useState([])
  const [clients, setClients] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [empty, setEmpty] = useState(false)

  async function load(currentSlug) {

    if (!currentSlug) {
      console.error("MASTER CONTEXT ERROR: SLUG_MISSING")
      setError("SLUG_MISSING")
      setLoading(false)
      return
    }

    // 🔒 reset при смене slug
    setMaster(null)
    setMetrics(null)
    setBookings([])
    setClients([])
    setEmpty(false)

    setLoading(true)
    setError(null)

    try {

      const [m, b, c] = await Promise.all([
        getMasterMetrics(currentSlug),
        getMasterBookings(currentSlug),
        getMasterClients(currentSlug)
      ])

      const metricsData = m?.metrics || m || {}
      const bookingsData = Array.isArray(b) ? b : b?.bookings || []
      const clientsData = Array.isArray(c) ? c : c?.clients || []

      setMetrics(metricsData)
      setBookings(bookingsData)
      setClients(clientsData)

      // 👇 формируем master объект
      setMaster({
        slug: currentSlug,
        hasData:
          bookingsData.length > 0 ||
          clientsData.length > 0 ||
          Object.keys(metricsData || {}).length > 0
      })

      // 👇 empty state
      if (
        bookingsData.length === 0 &&
        clientsData.length === 0 &&
        Object.keys(metricsData || {}).length === 0
      ) {
        setEmpty(true)
      }

    } catch (e) {

      console.error("MASTER CONTEXT ERROR", e)

      setMaster(null)
      setMetrics(null)
      setBookings([])
      setClients([])
      setError(e?.message || "MASTER_CONTEXT_LOAD_FAILED")

    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(slug)
  }, [slug])

  return (
    <C.Provider
      value={{
        slug,
        master,
        metrics,
        bookings,
        clients,
        loading,
        error,
        empty,
        reload: () => load(slug)
      }}
    >
      {children}
    </C.Provider>
  )
}

export function useMaster() {
  return useContext(C)
}