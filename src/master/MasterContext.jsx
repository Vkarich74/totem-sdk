import { createContext, useContext, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getMasterMetrics, getMasterBookings, getMasterClients } from "../api/master"

const C = createContext(null)

export function MasterProvider({ children }) {

  const { slug } = useParams()

  const [metrics, setMetrics] = useState(null)
  const [bookings, setBookings] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load(currentSlug) {

    if (!currentSlug) {
      console.error("MASTER CONTEXT ERROR: SLUG_MISSING")
      setError("SLUG_MISSING")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {

      const [m, b, c] = await Promise.all([
        getMasterMetrics(currentSlug),
        getMasterBookings(currentSlug),
        getMasterClients(currentSlug)
      ])

      setMetrics(m?.metrics || m || {})
      setBookings(Array.isArray(b) ? b : b?.bookings || [])
      setClients(Array.isArray(c) ? c : c?.clients || [])

    } catch (e) {

      console.error("MASTER CONTEXT ERROR", e)

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
        metrics,
        bookings,
        clients,
        loading,
        error,
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