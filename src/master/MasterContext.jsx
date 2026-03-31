import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
  getMasterMetrics,
  getMasterBookings,
  getMasterClients
} from "../api/master"

const C = createContext(null)

function resolveSlug(routeSlug){
  if(routeSlug) return routeSlug

  if(window.MASTER_SLUG) return window.MASTER_SLUG

  return null
}

function normalizeMetricsResponse(payload){
  if(payload?.metrics) return payload.metrics
  if(payload?.data?.metrics) return payload.data.metrics
  if(payload && typeof payload === "object") return payload
  return {}
}

function normalizeBookingsResponse(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.bookings)) return payload.bookings
  if(Array.isArray(payload?.data?.bookings)) return payload.data.bookings
  return []
}

function normalizeClientsResponse(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.clients)) return payload.clients
  if(Array.isArray(payload?.data?.clients)) return payload.data.clients
  return []
}

function extractMasterFromPayloads(metricsPayload, bookingsPayload, clientsPayload, slug){
  const direct =
    metricsPayload?.master ||
    metricsPayload?.data?.master ||
    bookingsPayload?.master ||
    bookingsPayload?.data?.master ||
    clientsPayload?.master ||
    clientsPayload?.data?.master ||
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

export function MasterProvider({ children }){

  const { slug: routeSlug } = useParams()
  const slug = useMemo(()=>resolveSlug(routeSlug),[routeSlug])

  const [master,setMaster] = useState(null)
  const [metrics,setMetrics] = useState(null)
  const [bookings,setBookings] = useState([])
  const [clients,setClients] = useState([])

  const [loading,setLoading] = useState(true)
  const [error,setError] = useState(null)
  const [empty,setEmpty] = useState(false)

  async function load(currentSlug){
    if(!currentSlug){
      console.error("MASTER CONTEXT ERROR: SLUG_MISSING")
      setMaster(null)
      setMetrics(null)
      setBookings([])
      setClients([])
      setEmpty(false)
      setError("SLUG_MISSING")
      setLoading(false)
      return
    }

    setMaster(null)
    setMetrics(null)
    setBookings([])
    setClients([])
    setEmpty(false)

    setLoading(true)
    setError(null)

    try{
      const [metricsResponse, bookingsResponse, clientsResponse] = await Promise.all([
        getMasterMetrics(currentSlug),
        getMasterBookings(currentSlug),
        getMasterClients(currentSlug)
      ])

      const metricsData = normalizeMetricsResponse(metricsResponse)
      const bookingsData = normalizeBookingsResponse(bookingsResponse)
      const clientsData = normalizeClientsResponse(clientsResponse)

      const hasData =
        bookingsData.length > 0 ||
        clientsData.length > 0 ||
        Object.keys(metricsData || {}).length > 0

      const masterData = extractMasterFromPayloads(
        metricsResponse,
        bookingsResponse,
        clientsResponse,
        currentSlug
      )

      setMetrics(metricsData)
      setBookings(bookingsData)
      setClients(clientsData)
      setMaster({
        ...masterData,
        slug: masterData?.slug || currentSlug,
        hasData
      })
      setEmpty(!hasData)
    }catch(e){
      console.error("MASTER CONTEXT ERROR", e)

      setMaster(null)
      setMetrics(null)
      setBookings([])
      setClients([])
      setEmpty(false)
      setError(e?.message || "MASTER_CONTEXT_LOAD_FAILED")
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    load(slug)
  },[slug])

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