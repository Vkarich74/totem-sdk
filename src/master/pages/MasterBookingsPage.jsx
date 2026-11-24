import { uiMoney, UiValue, uiMessage, uiDate, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { useMaster } from "../MasterContext"
import {useSharedMasterRole} from "../../us/SharedMasterRole.jsx"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { masterCabinetLegacyJson, getMasterBookings, getMasterServices } from "../../api/internal"
import { useMarketContext } from "../../market/MarketContext.jsx"
import {
  allowsLegacyMasterQuickBooking,
  normalizeUsMasterScheduleFeed, classifyUnresolvedMasterMarketProbe,
} from "../../us/usBookingModel.js"
import UsPayC11RefundCard from "../../us/UsPayC11RefundCard.jsx"
import UsMasterManualBooking from "../../us/UsMasterManualBooking.jsx"

import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"

function normalizeBookingsResponse(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.bookings)) return payload.bookings
  if(Array.isArray(payload?.data?.bookings)) return payload.data.bookings
  return []
}

function statusColor(s) {
  if (s === "completed") return "#27ae60"
  if (s === "confirmed") return "#2980b9"
  if (s === "reserved") return "#f39c12"
  return "#e74c3c"
}

function statusLabel(value){
  const s = String(value || "reserved").toLowerCase()
  if(s === "reserved") return uiMessage("salon.s0042")
  if(s === "confirmed") return uiMessage("salon.s0204")
  if(s === "completed") return uiMessage("salon.s0205")
  if(s === "cancelled" || s === "canceled") return uiMessage("salon.s0206")
  return value || "—"
}

function rowHoverStyle(e, enter) {
  if (enter) {
    e.currentTarget.style.background = "#f9fafb"
  } else {
    e.currentTarget.style.background = ""
  }
}

function formatDateTime(value){ if (!value) return "—"; return uiDate(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

// US rows are prevalidated by the same IANA/DST model as master schedule.
function formatVerifiedBookingTime(booking, usScope){
  if(!usScope)return formatDateTime(booking?.start_at);
  if(!booking?.local_date || !booking?.local_time ||
     !booking?.location_timezone || !booking?.utc_offset)return "—";
  return booking.local_date+" "+booking.local_time+
    " ("+booking.location_timezone+", "+booking.utc_offset+")";
}

function useIsMobile(){
  const getValue = () => {
    if(typeof window === "undefined") return false
    return window.innerWidth <= 768
  }

  const [isMobile, setIsMobile] = useState(getValue)

  useEffect(() => {
    if(typeof window === "undefined") return undefined

    function onResize(){
      setIsMobile(getValue())
    }

    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return isMobile
}

function SummaryCard({ label, value, hint }){
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}><UiValue value={label} /></div>
      <div style={styles.summaryValue}><UiValue value={value} /></div>
      {hint ? <div style={styles.summaryHint}><UiValue value={hint} /></div> : null}
    </div>
  )
}

export default function MasterBookingsPage(){
  const shared=useSharedMasterRole()
  const {slug,master,reload}=useMaster()
  if(shared)return <PageSection title={uiMessage("salon.s0014")}>
    <UsMasterManualBooking masterSlug={slug} canWrite={shared.caps?.booking===true}/>
    <p>Booking history and lifecycle actions are not authorized in this limited role.</p>
  </PageSection>
  return <StandardMasterBookingsPage/>
}

function StandardMasterBookingsPage(){
  const { renderUi } = useUiMessages();
  const {
    context: marketContext, status: marketStatus,
    context_source: marketContextSource,
    business_context_status: businessContextStatus,
    userId: marketUserId,
  } = useMarketContext();
  const legacyQuickBookingAllowed = allowsLegacyMasterQuickBooking({
    status:marketStatus,context:marketContext,
    context_source:marketContextSource,
    business_context_status:businessContextStatus,
  });
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMobile = useIsMobile()

  const {
    loading: masterLoading,
    error: masterError,
    master,
    slug,
    canWrite
  } = useMaster()

  const [bookings, setBookings] = useState([])
  const [bookingsScope, setBookingsScope] = useState({key:"",mode:"pending"})
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState("")
  const [empty, setEmpty] = useState(false)

  const [client, setClient] = useState("")
  const [phone, setPhone] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [bookingDate, setBookingDate] = useState("")
  const [bookingTime, setBookingTime] = useState("")
  const [createError, setCreateError] = useState("")
  const [serviceOptions, setServiceOptions] = useState([])
  const [serviceOptionsLoading, setServiceOptionsLoading] = useState(false)

  const masterSlug = master?.slug || slug
  const isCreateMode = bookingId === "new"
  const explicitUsMarket = marketStatus === "ready" && marketContext?.market_code === "US"
  const unresolvedMasterMarket = marketStatus === "ready" &&
    businessContextStatus === "unresolved" && marketContextSource === "platform_ui_default"
  const bookingsScopeKey = JSON.stringify([
    masterSlug, marketUserId, marketStatus, marketContext?.market_code,
    marketContextSource, businessContextStatus,
  ])
  const verifiedUsBookings = bookingsScope.key === bookingsScopeKey &&
    bookingsScope.mode === "us"

  useEffect(() => {
    if(!isCreateMode) return

    setBookingDate(searchParams.get("date") || "")
    setBookingTime(searchParams.get("time") || "")
  }, [isCreateMode, searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadServiceOptions(){
      if(!isCreateMode || !masterSlug || !legacyQuickBookingAllowed){
        if(!cancelled){
          setServiceOptions([])
          setServiceOptionsLoading(false)
        }
        return
      }

      try {
        setServiceOptionsLoading(true)
        const result = await getMasterServices(masterSlug)

        if(!result?.ok){
          const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
          throw new Error(status ? "MASTER_SERVICES_HTTP_" + status : (result?.error || "MASTER_SERVICES_LOAD_FAILED"))
        }

        const services = Array.isArray(result?.services) ? result.services : []
        const activeServices = services.filter((service) => {
          const normalizedStatus = String(service?.status || "").toLowerCase()
          if (service?.is_active === false || service?.active === false) return false
          if (normalizedStatus === "inactive" || normalizedStatus === "disabled") return false
          return true
        })

        if(!cancelled){
          setServiceOptions(activeServices)
          if(activeServices.length === 0){
            setServiceId("")
            setCreateError(uiError(uiMessage("master.s0260")))
          } else {
            const currentServiceId = String(serviceId || "")
            const hasCurrent = activeServices.some((service) => String(service?.id ?? service?.service_id ?? "") === currentServiceId)
            if(!currentServiceId || !hasCurrent){
              const nextId = String(activeServices[0]?.id ?? activeServices[0]?.service_id ?? "")
              setServiceId(nextId)
            }
            setCreateError("")
          }
        }
      }catch(error){
        console.error("MASTER SERVICES LOAD ERROR", error)
        if(!cancelled){
          setServiceOptions([])
          setServiceId("")
          setCreateError(uiError(error?.message || "MASTER_SERVICES_LOAD_FAILED"))
        }
      }finally{
        if(!cancelled){
          setServiceOptionsLoading(false)
        }
      }
    }

    loadServiceOptions()

    return () => {
      cancelled = true
    }
  }, [isCreateMode, masterSlug, legacyQuickBookingAllowed])

  useEffect(()=>{
    let cancelled=false
    async function loadBookings(){
      if(marketStatus!=="ready"){
        if(!cancelled){
          setBookings([])
          setEmpty(false)
          setBookingsScope({key:bookingsScopeKey,mode:"unavailable"})
          setBookingsLoading(marketStatus!=="error")
          setBookingsError(marketStatus==="error"
            ? uiMessage("master.bookingsMarketUnavailable") : "")
        }
        return
      }
      if(!masterSlug){
        if(!cancelled){
          setBookings([])
          setBookingsLoading(false)
          setBookingsError(uiError("SLUG_MISSING"))
          setEmpty(false)
          setBookingsScope({key:bookingsScopeKey,mode:"error"})
        }
        return
      }
      try{
        setBookingsLoading(true)
        setBookingsError("")
        setEmpty(false)
        let data
        let mode="legacy"
        if(explicitUsMarket || unresolvedMasterMarket){
          // Read the existing US-scoped master feed; never infer a US timezone
          // from the client's clock, selected salon or default KG context.
          const usResult=await getMasterBookings(masterSlug,{usLocationScope:true})
          if(explicitUsMarket){
            if(!usResult?.ok)throw new Error("US_MASTER_BOOKINGS_UNAVAILABLE")
            data=normalizeUsMasterScheduleFeed(usResult)
            mode="us"
          }else{
            const scope=classifyUnresolvedMasterMarketProbe(usResult)
            if(scope.mode==="mixed")throw new Error("MASTER_US_MIXED_MARKETS")
            if(scope.mode==="us"){
              data=scope.bookings
              mode="us"
            }else{
              // KG/KZ-only affiliation: original legacy path unchanged.
              const result=await getMasterBookings(masterSlug)
              if(!result?.ok)throw new Error("MASTER_BOOKINGS_LOAD_FAILED")
              data=normalizeBookingsResponse(result)
            }
          }
        }else if(marketContext?.market_code==="KG" ||
                 marketContext?.market_code==="KZ"){
          const result=await getMasterBookings(masterSlug)
          if(!result?.ok)throw new Error("MASTER_BOOKINGS_LOAD_FAILED")
          data=normalizeBookingsResponse(result)
        }else{
          throw new Error("MASTER_MARKET_SCOPE_UNVERIFIED")
        }
        if(!cancelled){
          setBookings(data)
          setEmpty(data.length===0)
          setBookingsScope({key:bookingsScopeKey,mode})
        }
      }catch(error){
        console.error("MASTER BOOKINGS LOAD ERROR",error)
        if(!cancelled){
          setBookings([])
          setBookingsError(error?.message==="MASTER_US_MIXED_MARKETS"
            ? uiMessage("master.bookingsMixedMarkets")
            : uiError(error?.message||"MASTER_BOOKINGS_LOAD_FAILED"))
          setEmpty(false)
          setBookingsScope({key:bookingsScopeKey,mode:"error"})
        }
      }finally{
        if(!cancelled)setBookingsLoading(false)
      }
    }
    loadBookings()
    return ()=>{cancelled=true}
  },[masterSlug,bookingsScopeKey])

  const loading = masterLoading || bookingsLoading ||
    (bookingsScope.key !== bookingsScopeKey && marketStatus !== "error")
  const error = masterError || bookingsError

  const selectedBooking = useMemo(()=>{
    if(!bookingId) return null

    return bookings.find(
      (item) => String(item.id) === String(bookingId)
    ) || null
  },[bookings, bookingId])

  const summary = useMemo(() => {
    const result = {
      total: bookings.length,
      active: 0,
      reserved: 0,
      completed: 0
    }

    bookings.forEach((item) => {
      const status = String(item?.status || "").toLowerCase()
      if(status === "completed"){
        result.completed += 1
      } else {
        result.active += 1
      }

      if(status === "reserved"){
        result.reserved += 1
      }
    })

    return result
  }, [bookings])

  if (loading) {
    return <div style={{ padding: "20px" }}><UiValue value={uiMessage("salon.s0118")} /></div>
  }

  // US manual booking uses explicit physical branch, offered slot and
  // server-verified USD. Mixed-market masters choose the US branch explicitly.
  // Keep the KG/KZ quick-booking form untouched.
  if (isCreateMode && !legacyQuickBookingAllowed &&
      (explicitUsMarket || unresolvedMasterMarket)) {
    return <div style={{padding:"20px"}}>
      <button
        type="button"
        onClick={() => navigate("/master/"+encodeURIComponent(masterSlug)+"/schedule")}
        style={styles.backButton}
      >Назад к расписанию</button>
      <PageSection title="Ручная запись мастера · США">
        <UsMasterManualBooking
          masterSlug={masterSlug}
          canWrite={canWrite===true}
          initialDate={bookingDate}
          onBooked={() => navigate("/master/"+encodeURIComponent(masterSlug)+"/schedule")}
        />
      </PageSection>
    </div>
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title={uiMessage("salon.s0506")}>
          <EmptyState title={uiMessage("salon.s0212")} message={error} />
        </PageSection>
      </div>
    )
  }

  async function createBooking(date, time) {
    // US master bookings require the canonical location-specific public
    // availability/price transaction. Never send KG +06:00 legacy payload.
    if(!legacyQuickBookingAllowed){
      setCreateError(uiMessage("master.quickBookingUnavailable"))
      return
    }
    if (!masterSlug) return

    if (!date || !time || !client.trim()) {
      setCreateError(uiError(uiMessage("master.s0264")))
      return
    }

    const start = date + "T" + time + ":00+06:00"
    try {
      const payload = await masterCabinetLegacyJson(
        "/masters/" + encodeURIComponent(masterSlug) + "/bookings",
        { method: "POST", body: {
          client_name: client,
          phone: phone,
          start_at: start,
          service_id: Number(serviceId)
        }}
      )

      if (payload?.ok === false) {
        throw new Error(payload?.error || "MASTER_BOOKING_CREATE_FAILED")
      }

      setCreateError("")
      navigate(uiTemplate(["/master/","/schedule"], [masterSlug]))
      return
    } catch (e) {
      console.error("createBooking error", e)
      setCreateError(uiError(e?.message || "MASTER_BOOKING_CREATE_FAILED"))
    }
  }

  if (isCreateMode && !legacyQuickBookingAllowed) {
    return (
      <div style={{ padding: "20px" }}>
        <button
          onClick={() => navigate(uiTemplate(["/master/","/schedule"], [masterSlug]))}
          style={styles.backButton}
        ><UiValue value={uiMessage("master.s0265")} /></button>
        <PageSection title={uiMessage("master.s0266")}>
          <div style={styles.errorBanner}>
            <UiValue value={uiMessage("master.quickBookingUnavailable")} />
          </div>
        </PageSection>
      </div>
    )
  }

  if (isCreateMode) {
    return (
      <div style={{ padding: "20px" }}>
        <button
          onClick={() => navigate(uiTemplate(["/master/","/schedule"], [masterSlug]))}
          style={styles.backButton}
        ><UiValue value={uiMessage("master.s0265")} /></button>

        <PageSection title={uiMessage("master.s0266")}>
          <div style={styles.createForm}>
            {createError && (
              <div style={styles.errorBanner}>
                <UiValue value={createError} />
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}><UiValue value={uiMessage("salon.s0233")} /></label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}><UiValue value={uiMessage("salon.s0268")} /></label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}><UiValue value={uiMessage("salon.s0229")} /></label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={renderUi(uiMessage("salon.s0645"))}
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}><UiValue value={uiMessage("salon.s0230")} /></label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={renderUi(uiMessage("salon.s0230"))}
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}><UiValue value={uiMessage("salon.s0231")} /></label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                style={styles.fieldInput}
                disabled={serviceOptionsLoading || serviceOptions.length === 0}
              >
                {serviceOptions.length === 0 ? (
                  <option value=""><UiValue value={uiMessage("master.s0271")} /></option>
                ) : (
                  serviceOptions.map((service) => {
                    const id = String(service?.id ?? service?.service_id ?? "")
                    const label = service?.name || service?.title || service?.label || uiMessage("master.s0272", {p0: id})
                    return (
                      <option key={id} value={id}>
                        <UiValue value={label} />
                      </option>
                    )
                  })
                )}
              </select>
            </div>

            <div style={styles.createActions}>
              <button
                onClick={() => createBooking(bookingDate, bookingTime)}
                style={styles.primaryButton}
                disabled={serviceOptionsLoading || serviceOptions.length === 0}
              ><UiValue value={uiMessage("master.s0273")} /></button>

              <button
                onClick={() => navigate(uiTemplate(["/master/","/schedule"], [masterSlug]))}
                style={styles.secondaryButton}
              ><UiValue value={uiMessage("master.s0274")} /></button>
            </div>
          </div>
        </PageSection>
      </div>
    )
  }

  if (bookingId) {
    const booking = selectedBooking

    if (!booking) {
      return (
        <div style={{ padding: "20px" }}>
          <PageSection title={uiMessage("salon.s0827")}>
            <EmptyState title={uiMessage("master.s0275")} />
          </PageSection>
        </div>
      )
    }

    return (
      <div style={{ padding: "20px" }}>
        <button
          onClick={() => navigate(uiTemplate(["/master/","/schedule"], [masterSlug]))}
          style={styles.backButton}
        ><UiValue value={uiMessage("master.s0265")} /></button>

        <PageSection title={"BR-" + booking.id}>
          <div style={{ ...styles.detailStatus, color: statusColor(booking.status) }}>
            <UiValue value={statusLabel(booking.status)} />
          </div>

          {booking.service_name && (
            <div style={styles.detailRow}><UiValue value={uiMessage("master.s0276")} /><UiValue value={booking.service_name} />
            </div>
          )}

          {!verifiedUsBookings && booking.price && (
            <div style={styles.detailRow}><UiValue value={uiMessage("master.s0240")} /><UiValue value={uiMoney(booking.price, booking.currency_code || booking.currency)} /></div>
          )}

          <div style={styles.detailRow}><UiValue value={uiMessage("master.s0278")} /><UiValue value={formatVerifiedBookingTime(booking,verifiedUsBookings)} />
          </div>

          <div style={styles.detailRow}><UiValue value={uiMessage("salon.s0350")} /><UiValue value={booking.client_name || "—"} />
          </div>

          <div><UiValue value={uiMessage("salon.s0351")} /><UiValue value={booking.phone || "—"} />
          </div>
          {verifiedUsBookings ? (
            <UsPayC11RefundCard
              key={"refund-"+String(booking.id)}
              ownerType="master"
              ownerId={master?.id}
              bookingId={booking.id}
              isUsMarket={true}
            />
          ) : null}
        </PageSection>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? "14px" : "20px" }}>
      <PageSection title={uiMessage("salon.s0014")}>
        {!empty && (
          <div style={styles.summaryGrid}>
            <SummaryCard label={uiMessage("master.s0279")} value={summary.total} />
            <SummaryCard label={uiMessage("salon.s0109")} value={summary.active} />
            <SummaryCard label={uiMessage("salon.s0220")} value={summary.reserved} />
            <SummaryCard label={uiMessage("salon.s1122")} value={summary.completed} />
          </div>
        )}

        {empty ? (
          <EmptyState
            title={uiMessage("salon.s0216")}
            message={uiMessage("master.s0284")}
          />
        ) : isMobile ? (
          <div style={styles.cardsList}>
            {bookings.map((b) => (
              <button
                key={b.id}
                type="button"
                style={styles.bookingCard}
                onClick={() => navigate(uiTemplate(["/master/","/bookings/",""], [masterSlug, b.id]))}
              >
                <div style={styles.cardTop}>
                  <strong><UiValue value={uiMessage("salon.s0226")} /><UiValue value={b.id} /></strong>
                  <span style={{ ...styles.statusBadge, color: statusColor(b.status) }}>
                    <UiValue value={statusLabel(b.status)} />
                  </span>
                </div>

                <div style={styles.cardMeta}>
                  <div>
                    <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0233")} /></div>
                    <div style={styles.metaValue}><UiValue value={formatVerifiedBookingTime(b,verifiedUsBookings)} /></div>
                  </div>

                  <div>
                    <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0229")} /></div>
                    <div style={styles.metaValue}><UiValue value={b.client_name || "—"} /></div>
                  </div>

                  <div>
                    <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0230")} /></div>
                    <div style={styles.metaValue}><UiValue value={b.phone || "—"} /></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <TableSection>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeadCell}><UiValue value={uiMessage("salon.s0096")} /></th>
                  <th style={styles.tableHeadCell}><UiValue value={uiMessage("salon.s0148")} /></th>
                  <th style={styles.tableHeadCell}><UiValue value={uiMessage("salon.s0233")} /></th>
                  <th style={styles.tableHeadCell}><UiValue value={uiMessage("salon.s0229")} /></th>
                  <th style={styles.tableHeadCell}><UiValue value={uiMessage("salon.s0230")} /></th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    style={{ cursor: "pointer", borderTop: "1px solid #eee" }}
                    onMouseEnter={(e) => rowHoverStyle(e, true)}
                    onMouseLeave={(e) => rowHoverStyle(e, false)}
                    onClick={(e) => {
                      if (e.target.tagName !== "A") {
                        navigate(uiTemplate(["/master/","/bookings/",""], [masterSlug, b.id]))
                      }
                    }}
                  >
                    <td style={styles.tableCell}>
                      <a href={uiTemplate(["#/master/","/bookings/",""], [masterSlug, b.id])}><UiValue value={uiMessage("salon.s0226")} /><UiValue value={b.id} />
                      </a>
                    </td>

                    <td style={{ ...styles.tableCell, color: statusColor(b.status) }}>
                      <UiValue value={statusLabel(b.status)} />
                    </td>

                    <td style={styles.tableCell}>
                      <UiValue value={formatVerifiedBookingTime(b,verifiedUsBookings)} />
                    </td>

                    <td style={styles.tableCell}>
                      <UiValue value={b.client_name || "—"} />
                    </td>

                    <td style={styles.tableCell}>
                      <UiValue value={b.phone || "—"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableSection>
        )}
      </PageSection>
    </div>
  )
}

const styles = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
    minWidth: 0,
    maxWidth: "100%"
  },
  summaryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px",
    textAlign: "left",
    minWidth: 0,
    maxWidth: "100%"
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  summaryValue: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#111827"
  },
  summaryHint: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#6b7280"
  },
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
    maxWidth: "100%"
  },
  bookingCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "14px",
    textAlign: "left",
    minWidth: 0,
    maxWidth: "100%"
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    minWidth: 0
  },
  statusBadge: {
    fontSize: "12px",
    fontWeight: 700
  },
  cardMeta: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%"
  },
  metaLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "4px"
  },
  metaValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 600,
    wordBreak: "break-word"
  },
  backButton: {
    marginBottom: "10px"
  },
  createForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxWidth: "420px",
    minWidth: 0
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0
  },
  fieldLabel: {
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: 600
  },
  fieldInput: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px"
  },
  createActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    minWidth: 0
  },
  primaryButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #111827",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600
  },
  detailStatus: {
    marginBottom: "10px",
    fontWeight: 700
  },
  errorBanner: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #ffa8a8",
    background: "#fff5f5",
    color: "#c92a2a",
    fontSize: "13px",
    fontWeight: 600
  },
  detailRow: {
    marginBottom: "6px"
  },
  table: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    tableLayout: "fixed",
    borderCollapse: "collapse"
  },
  tableHeadCell: {
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    minWidth: 0,
    maxWidth: "100%",
    verticalAlign: "top"
  },
  tableCell: {
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    minWidth: 0,
    maxWidth: "100%",
    verticalAlign: "top"
  }
}
