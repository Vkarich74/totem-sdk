import { UiValue, uiMessage, uiMoney, uiDate, uiTemplate, uiError } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { resolveSalonSlug } from "../SalonContext"
import { generateTimeSlots } from "../../calendar/calendarEngine"
import PageSection from "../../cabinet/PageSection"
import EmptyState from "../../cabinet/EmptyState"
import { getSalonCalendar } from "../../api/internal"


function useIsMobile(){
  const getValue = () => {
    if(typeof window === "undefined") return false
    return window.innerWidth <= 900
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

function getBookingStartAt(booking){
  return (
    booking?.start_at ||
    booking?.datetime_start ||
    booking?.startAt ||
    booking?.date_time ||
    booking?.date ||
    ""
  )
}

function normalizeStatus(status){
  const value = String(status || "reserved").toLowerCase()
  if(value === "canceled") return "cancelled"
  return value
}

function statusText(status){
  const value = normalizeStatus(status)
  if(value === "reserved" || value === "pending") return uiMessage("salon.s0042")
  if(value === "confirmed") return uiMessage("salon.s0204")
  if(value === "completed") return uiMessage("salon.s0205")
  if(value === "cancelled") return uiMessage("salon.s0206")
  return status || "—"
}

function statusColor(status){
  const value = normalizeStatus(status)
  if(value === "reserved" || value === "pending") return "#f59e0b"
  if(value === "confirmed") return "#2563eb"
  if(value === "completed") return "#6b7280"
  if(value === "cancelled") return "#ef4444"
  return "#9ca3af"
}

function pad(value){
  return String(value).padStart(2, "0")
}

function toLocalDateKey(date){
  return uiTemplate(["","-","-",""], [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())])
}

function parseLocalDateKey(value){
  if(typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)){
    return null
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day)

  if(Number.isNaN(date.getTime())){
    return null
  }

  return date
}

function isValidLocalDateKey(value){
  return Boolean(parseLocalDateKey(value))
}

function getLocalTodayKey(){
  return toLocalDateKey(new Date())
}

function buildLocalDateTime(dayKey, time){
  const date = parseLocalDateKey(dayKey)
  if(!date || typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)){
    return null
  }

  const [hours, minutes] = time.split(":").map(Number)
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

function isPastSlot(dayKey, time){
  const slotDate = buildLocalDateTime(dayKey, time)
  if(!slotDate) return false
  return slotDate.getTime() < Date.now()
}

function formatDateLabel(value){ if (!value) return "—"; const normalized = String(value).trim(); const localDate = normalized.includes(" ") ? normalized.split(" ")[0] : normalized; return uiDate(localDate, { day: "2-digit", month: "2-digit", year: "numeric" }); }

function formatTimeLabel(value){ if (!value) return "—"; const normalized = String(value).trim(); const timePart = normalized.includes(" ") ? normalized.split(" ")[1] : ""; if (timePart && /^\d{2}:\d{2}/.test(timePart)) return timePart.slice(0, 5); return uiDate(value, { hour: "2-digit", minute: "2-digit" }); }

function normalizeCalendarDateKey(value){
  const text = String(value || "").trim()
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text)) return ""
  return text
}

function addDaysKey(dateKey, delta){
  const date = parseLocalDateKey(dateKey)
  if(!date) return ""
  const next = new Date(date)
  next.setDate(next.getDate() + Number(delta || 0))
  return toLocalDateKey(next)
}

function parseCalendarSearchDate(search){
  try{
    const params = new URLSearchParams(String(search || ""))
    return normalizeCalendarDateKey(params.get("date"))
  }catch(e){
    return ""
  }
}

function parseLocalStamp(value){
  const normalized = String(value || "").trim().replace("T", " ")
  if(!normalized) return null

  const [datePart, timePartRaw = ""] = normalized.split(" ")
  const timePart = timePartRaw.slice(0, 5)
  if(!normalizeCalendarDateKey(datePart) || !/^\d{2}:\d{2}$/.test(timePart)){
    return null
  }

  return { date: datePart, time: timePart }
}

function isOccupiedEventStatus(status){
  const value = normalizeStatus(status)
  return ["pending", "confirmed", "completed"].includes(value)
}

function isCancelledEventStatus(status){
  const value = normalizeStatus(status)
  return ["cancelled", "canceled", "rejected", "failed", "refunded"].includes(value)
}

function getAvailabilityStatus(row){
  return String(row?.availability_status || row?.status || "").trim().toLowerCase()
}

function getAvailabilityLabel(row){
  const status = getAvailabilityStatus(row)
  if(status === "unknown") return uiMessage("salon.s0238")
  if(status === "configured") return uiMessage("salon.s0239")
  return uiMessage("salon.s0240")
}

function getEmptySlotLabel(row){
  return getEmptySlotState(row, null).label
}

function parseClockMinutes(value){
  const text = String(value || "").trim()
  if(!text) return null

  const [hoursRaw, minutesRaw] = text.split(":")
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if(!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if(hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

function isConfiguredWorkingRow(row){
  return getAvailabilityStatus(row) === "configured"
}

function isSlotInsideWorkingHours(slotTime, row){
  if(!isConfiguredWorkingRow(row)) return false

  const slotMinutes = parseClockMinutes(slotTime)
  const startMinutes = parseClockMinutes(row?.start_time)
  const endMinutes = parseClockMinutes(row?.end_time)

  if(slotMinutes === null || startMinutes === null || endMinutes === null) return false

  return slotMinutes >= startMinutes && slotMinutes < endMinutes
}

function getEmptySlotState(row, slotTime, occupiedEvent = null){
  const status = getAvailabilityStatus(row)

  if(status === "configured"){
    const canBook = !occupiedEvent && (slotTime ? isSlotInsideWorkingHours(slotTime, row) : true)
    return {
      canBook,
      label: canBook ? uiMessage("salon.s0241") : uiMessage("salon.s0242")
    }
  }

  if(status === "unknown") return { canBook: false, label: uiMessage("salon.s0238") }

  return { canBook: false, label: uiMessage("salon.s0240") }
}

function buildBookingHash(salonSlug, masterId, date, time){
  const params = new URLSearchParams()
  if(salonSlug) params.set("salon", salonSlug)
  if(masterId) params.set("master", String(masterId))
  if(date) params.set("date", date)
  if(time) params.set("time", time)
  return uiTemplate(["#/booking?",""], [params.toString()])
}

function openBookingForSlot(salonSlug, masterId, date, time){
  const bookingHash = buildBookingHash(salonSlug, masterId, date, time)
  window.location.hash = bookingHash
}

function eventStartsAtSlot(event, dayKey, time){
  const start = parseLocalStamp(event?.start_local || event?.start_at)
  if(!start) return false
  return start.date === dayKey && start.time === time
}

function eventOverlapsSlot(event, dayKey, time){
  const start = parseLocalStamp(event?.start_local || event?.start_at)
  if(!start || start.date !== dayKey) return false

  const end = parseLocalStamp(event?.end_local || event?.end_at)
  if(!end || end.date !== dayKey){
    return start.time === time
  }

  return time >= start.time && time < end.time
}

function formatLocalRange(startValue, endValue){
  const start = formatTimeLabel(startValue)
  const end = formatTimeLabel(endValue)
  if(start === "—" && end === "—") return "—"
  if(end === "—") return start
  if(start === "—") return end
  return uiTemplate([""," — ",""], [start, end])
}

function normalizeBooking(raw){
  const startAt = getBookingStartAt(raw)
  return {
    ...raw,
    start_at: startAt,
    client_name: raw?.client_name || raw?.client || uiMessage("salon.s0229"),
    master_name: raw?.master_name || raw?.master || uiMessage("salon.s0094"),
    phone: raw?.phone || raw?.client_phone || "",
    status: normalizeStatus(raw?.status),
    service_name: raw?.service_name || raw?.service || ""
  }
}

function buildDayOptions(bookings){
  const keys = new Set()

  bookings.forEach((booking) => {
    const value = getBookingStartAt(booking)
    if(!value) return

    const date = new Date(value)
    if(Number.isNaN(date.getTime())) return

    const key = toLocalDateKey(date)
    keys.add(key)
  })

  if(keys.size === 0){
    keys.add(toLocalDateKey(new Date()))
  }

  return [...keys].sort()
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

function isPendingCashBooking(booking){
  const provider = String(booking?.payment_provider || "").toLowerCase()
  const status = String(booking?.payment_status || "").toLowerCase()

  return Boolean(
    booking?.cash_pending_alert === true ||
    (provider === "direct" && status === "pending" && Boolean(booking?.payment_is_active))
  )
}

function getPaymentLabelRu(booking){
  return isPendingCashBooking(booking) ? uiMessage("salon.s0243") : uiMessage("salon.s0244")
}

function formatCurrency(value, currency) { return uiMoney(value, currency); }

export default function CalendarPage(){
  const { slug: routeSlug } = useParams()
  const location = useLocation()
  const salonSlug = resolveSalonSlug(routeSlug)
  const isMobile = useIsMobile()

  const routeDay = useMemo(() => parseCalendarSearchDate(location.search), [location.search])
  const [selectedDay, setSelectedDay] = useState(() => routeDay || getLocalTodayKey())
  const [calendarResponse, setCalendarResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if(routeDay && routeDay !== selectedDay){
      setSelectedDay(routeDay)
    }
  }, [routeDay, selectedDay])

  async function load(){
    if(!salonSlug){
      setCalendarResponse(null)
      setError(uiError("SALON_SLUG_MISSING"))
      setLoading(false)
      return
    }

    try{
      setLoading(true)
      setError("")

      const result = await getSalonCalendar(salonSlug, selectedDay)
      if(!result?.ok){
        throw new Error("SALON_CALENDAR_LOAD_FAILED")
      }

      setCalendarResponse(result)

      const backendRequestedDate = normalizeCalendarDateKey(result?.date?.requested_date)
      if(backendRequestedDate && backendRequestedDate !== selectedDay){
        setSelectedDay(backendRequestedDate)
      }
    }catch(loadError){
      console.error("SALON CALENDAR LOAD ERROR", loadError)
      setCalendarResponse(null)
      setError(uiError(loadError?.message || "SALON_CALENDAR_LOAD_FAILED"))
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonSlug, selectedDay])

  const slots = useMemo(() => generateTimeSlots(), [])
  const masters = calendarResponse?.masters || []
  const workingHours = calendarResponse?.working_hours || []
  const events = calendarResponse?.events || []
  const summary = calendarResponse?.summary || {}
  const dateMeta = calendarResponse?.date || {}

  const activeMastersCount = Number(summary.active_masters_count ?? masters.length ?? 0)
  const eventsCount = Number(summary.events_count ?? events.length ?? 0)
  const occupiedCount = Number(summary.occupied_count ?? events.filter((event) => isOccupiedEventStatus(event?.status)).length ?? 0)
  const pendingCount = Number(summary.pending_count ?? events.filter((event) => normalizeStatus(event?.status) === "pending").length ?? 0)

  const workingHoursByMasterId = useMemo(() => {
    const index = new Map()
    workingHours.forEach((row) => {
      index.set(String(row?.master_id || ""), row)
    })
    return index
  }, [workingHours])

  const eventsByMasterId = useMemo(() => {
    const index = new Map()
    events.forEach((event) => {
      const key = String(event?.master_id || "")
      if(!index.has(key)){
        index.set(key, [])
      }
      index.get(key).push(event)
    })
    return index
  }, [events])

  const dayEvents = useMemo(() => {
    return [...events]
      .filter((event) => {
        const start = parseLocalStamp(event?.start_local || event?.start_at)
        return Boolean(start && start.date === selectedDay)
      })
      .sort((left, right) => {
        const leftStart = String(left?.start_local || left?.start_at || "")
        const rightStart = String(right?.start_local || right?.start_at || "")
        return leftStart.localeCompare(rightStart)
      })
  }, [events, selectedDay])

  const todayDate = normalizeCalendarDateKey(dateMeta.salon_today) || getLocalTodayKey()
  const prevDate = normalizeCalendarDateKey(dateMeta.prev_date) || addDaysKey(selectedDay || todayDate, -1)
  const nextDate = normalizeCalendarDateKey(dateMeta.next_date) || addDaysKey(selectedDay || todayDate, 1)

  const currentDayLabel = formatDateLabel(selectedDay)
  const todayLabel = formatDateLabel(todayDate)
  const masterColumnCount = Math.max(1, masters.length)
  const gridTemplateColumns = masterColumnCount <= 1
    ? "110px minmax(0, 1fr)"
    : uiTemplate(["110px repeat(",", minmax(180px, 1fr))"], [masterColumnCount])

  function selectDay(nextDay){
    const normalized = normalizeCalendarDateKey(nextDay)
    if(!normalized) return
    setSelectedDay(normalized)
  }

  function renderEventCard(event){
    const occupied = isOccupiedEventStatus(event?.status)
    const cancelled = isCancelledEventStatus(event?.status)
    const tone = occupied ? "#2563eb" : cancelled ? "#9ca3af" : "#7c3aed"
    const text = occupied ? uiMessage("salon.s0247") : cancelled ? uiMessage("salon.s0206") : statusText(event?.status)

    return (
      <div
        key={uiTemplate(["","-",""], [event?.booking_id || event?.booking_code || event?.master_id || "event", event?.start_local || event?.start_at || ""])}
        style={{
          ...styles.mobileCard,
          borderColor: uiTemplate(["","33"], [tone])
        }}
      >
        <div style={styles.mobileCardHeader}>
          <div>
            <div style={styles.mobileTitle}><UiValue value={event?.client_name || uiMessage("salon.s0229")} /></div>
            <div style={styles.mobileMeta}><UiValue value={event?.master_name || uiMessage("salon.s0094")} /></div>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: "6px" }}>
            <span style={{ ...styles.statusBadge, background: uiTemplate(["","18"], [tone]), color: tone }}><UiValue value={text} /></span>
          </div>
        </div>
        <div style={styles.mobileMetaRow}>
          <span><UiValue value={formatLocalRange(event?.start_local || event?.start_at, event?.end_local || event?.end_at)} /></span>
          <span><UiValue value={selectedDay ? currentDayLabel : "—"} /></span>
        </div>
        {event?.service_name ? <div style={styles.mobileService}><UiValue value={event.service_name} /></div> : null}
        {event?.client_phone ? <div style={styles.mobilePhone}><UiValue value={event.client_phone} /></div> : null}
        {event?.price !== null && event?.price !== undefined ? <div style={styles.mobilePaymentLabel}><UiValue value={formatCurrency(event.price, event?.currency_code || event?.currency)} /></div> : null}
      </div>
    )
  }

  if(loading){
    return (
      <PageSection title={uiMessage("salon.s0248")}>
        <div style={styles.feedbackCard}><UiValue value={uiMessage("salon.s0249")} /></div>
      </PageSection>
    )
  }

  if(error){
    return (
      <PageSection title={uiMessage("salon.s0248")}>
        <div style={styles.errorCard}>
          <div style={styles.errorTitle}><UiValue value={uiMessage("salon.s0250")} /></div>
          <div style={styles.errorText}><UiValue value={error} /></div>
          <button style={styles.primaryButton} onClick={load}><UiValue value={uiMessage("salon.s0251")} /></button>
        </div>
      </PageSection>
    )
  }

  if(!masters.length){
    return (
      <PageSection title={uiMessage("salon.s0248")}>
        <EmptyState title={uiMessage("salon.s0252")} description={uiMessage("salon.s0253")} />
      </PageSection>
    )
  }

  return (
    <PageSection title={uiMessage("salon.s0248")}>
      <div style={styles.pageHint}><UiValue value={uiMessage("salon.s0254")} /></div>

      <div style={styles.summaryGrid}>
        <SummaryCard label={uiMessage("salon.s0255")} value={activeMastersCount} hint={uiMessage("salon.s0256")} />
        <SummaryCard label={uiMessage("salon.s0257")} value={eventsCount} hint={currentDayLabel} />
        <SummaryCard label={uiMessage("salon.s0258")} value={occupiedCount} hint={uiMessage("salon.s0259")} />
        <SummaryCard label={uiMessage("salon.s0220")} value={pendingCount} hint={uiMessage("salon.s0126")} />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.calendarNav}>
          <button
            type="button"
            style={styles.navButton}
            onClick={() => selectDay(prevDate)}
            disabled={!prevDate}
          >
            ←
          </button>
          <button
            type="button"
            style={styles.navButton}
            onClick={() => selectDay(todayDate)}
            disabled={!todayDate}
          ><UiValue value={uiMessage("salon.s0261")} /></button>
          <button
            type="button"
            style={styles.navButton}
            onClick={() => selectDay(nextDate)}
            disabled={!nextDate}
          >
            →
          </button>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}><UiValue value={uiMessage("salon.s0233")} /></label>
          <input
            type="date"
            value={selectedDay}
            onChange={(event) => selectDay(event.target.value)}
            style={styles.dateInput}
          />
        </div>
      </div>

      <div style={styles.calendarMetaRow}>
        <div><UiValue value={uiMessage("salon.s0263")} /><b><UiValue value={currentDayLabel} /></b></div>
        <div><UiValue value={uiMessage("salon.s0264")} /><b><UiValue value={todayLabel} /></b></div>
      </div>

      {workingHours.some((row) => getAvailabilityStatus(row) === "unknown") ? (
        <div style={styles.availabilityNote}><UiValue value={uiMessage("salon.s0265")} /></div>
      ) : null}

      {isMobile ? (
        dayEvents.length === 0 ? (
          <EmptyState
            title={uiMessage("salon.s0266")}
            description={uiMessage("salon.s0267")}
          />
        ) : (
          <div style={styles.mobileList}>
            <UiValue value={dayEvents.map((event) => renderEventCard(event))} />
          </div>
        )
      ) : (
        <div style={styles.desktopWrap}>
          <div style={{ ...styles.grid, gridTemplateColumns }}>
            <div style={styles.cornerCell}>
              <div style={styles.cornerTitle}><UiValue value={uiMessage("salon.s0268")} /></div>
              <div style={styles.cornerSubtitle}><UiValue value={currentDayLabel} /></div>
            </div>

            {masters.map((master) => {
              const availabilityRow = workingHoursByMasterId.get(String(master.id || ""))
              return (
                <div key={master.id} style={styles.masterHeader}>
                  <div style={styles.masterName}><UiValue value={master.name} /></div>
                  <div style={styles.masterAvailability}><UiValue value={getAvailabilityLabel(availabilityRow)} /></div>
                </div>
              )
            })}

            {slots.map((time) => (
              <div key={time} style={{ display: "contents" }}>
                <div style={styles.timeCell}><UiValue value={time} /></div>

                {masters.map((master) => {
                  const masterId = String(master?.id || "")
                  const availabilityRow = workingHoursByMasterId.get(masterId)
                  const masterEvents = eventsByMasterId.get(masterId) || []
                  const occupiedEvent = masterEvents.find((event) => isOccupiedEventStatus(event?.status) && eventOverlapsSlot(event, selectedDay, time))
                  const historyEvent = masterEvents.find((event) => isCancelledEventStatus(event?.status) && eventStartsAtSlot(event, selectedDay, time))
                  const emptySlotState = getEmptySlotState(availabilityRow, time, occupiedEvent || historyEvent)
                  const cellTone = occupiedEvent ? "#2563eb" : historyEvent ? "#9ca3af" : "#e5e7eb"

                  return (
                    <div
                      key={uiTemplate(["","-",""], [masterId, time])}
                      style={{
                        ...styles.slotCell,
                        background: occupiedEvent ? "#eff6ff" : historyEvent ? "#f8fafc" : "#ffffff",
                        borderLeft: "1px solid #e5e7eb"
                      }}
                    >
                      {occupiedEvent ? (
                        <div style={styles.bookingCell}>
                          <div style={{ ...styles.bookingClient, color: cellTone }}><UiValue value={occupiedEvent.client_name || uiMessage("salon.s0247")} /></div>
                          <div style={styles.bookingMeta}><UiValue value={occupiedEvent.service_name || statusText(occupiedEvent.status)} /></div>
                          <div style={styles.bookingCashMeta}><UiValue value={formatLocalRange(occupiedEvent.start_local || occupiedEvent.start_at, occupiedEvent.end_local || occupiedEvent.end_at)} /></div>
                        </div>
                      ) : historyEvent ? (
                        <div style={styles.historyCell}>
                          <div style={styles.historyTitle}><UiValue value={uiMessage("salon.s0206")} /></div>
                          <div style={styles.historyMeta}><UiValue value={historyEvent.client_name || uiMessage("salon.s0229")} /></div>
                        </div>
                      ) : (
                        <div style={styles.unknownSlotCell}>
                          <div style={styles.unknownSlotTitle}><UiValue value={emptySlotState.label} /></div>
                          {emptySlotState.canBook ? (
                            <button
                              type="button"
                              style={{
                                ...styles.emptySlotAction,
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                cursor: "pointer"
                              }}
                              onClick={() => openBookingForSlot(salonSlug, master.id || masterId, selectedDay, time)}
                            ><UiValue value={uiMessage("salon.s0269")} /></button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageSection>
  )
}

const styles = {
  pageHint: {
    marginBottom: 16,
    color: "#6b7280",
    fontSize: 14
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16
  },
  summaryCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)"
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827"
  },
  summaryHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#9ca3af"
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16
  },
  calendarNav: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  navButton: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    minHeight: 40,
    minWidth: 40,
    padding: "0 12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  filterPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#991b1b",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none"
  },
  pendingCashSummary: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#991b1b",
    fontSize: 13,
    fontWeight: 700
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 220
  },
  dateInput: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "#fff",
    minHeight: 40
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 600
  },
  select: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "#fff"
  },
  feedbackCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    color: "#374151"
  },
  errorCard: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    padding: 18,
    display: "grid",
    gap: 10
  },
  errorTitle: {
    fontWeight: 700,
    color: "#9f1239"
  },
  errorText: {
    color: "#be123c",
    fontSize: 14
  },
  calendarMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
    color: "#374151",
    fontSize: 13
  },
  availabilityNote: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#475569",
    fontSize: 13,
    fontWeight: 600
  },
  primaryButton: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    background: "#111827",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    width: "fit-content"
  },
  desktopWrap: {
    maxWidth: "100%",
    overflowX: "auto",
    overflowY: "visible",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff"
  },
  grid: {
    display: "grid",
    width: "100%",
    minWidth: 0
  },
  cornerCell: {
    position: "sticky",
    top: 0,
    left: 0,
    zIndex: 4,
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    padding: 12,
    display: "grid",
    gap: 4
  },
  masterHeader: {
    position: "sticky",
    top: 0,
    zIndex: 3,
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    borderLeft: "1px solid #e5e7eb",
    padding: 12,
    textAlign: "center",
    fontWeight: 700,
    color: "#111827",
    display: "grid",
    gap: 4,
    minWidth: 0
  },
  masterName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827"
  },
  masterAvailability: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 600
  },
  cornerTitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 600
  },
  cornerSubtitle: {
    fontSize: 13,
    color: "#111827",
    fontWeight: 700
  },
  timeCell: {
    position: "sticky",
    left: 0,
    zIndex: 2,
    background: "#fafafa",
    borderTop: "1px solid #e5e7eb",
    padding: "12px 10px",
    fontSize: 13,
    color: "#374151",
    fontWeight: 600,
    minWidth: 0
  },
  slotCell: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    minHeight: 54,
    padding: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
    minWidth: 0
  },
  bookingCell: {
    display: "grid",
    gap: 3,
    textAlign: "center"
  },
  bookingClient: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827"
  },
  bookingMeta: {
    fontSize: 11,
    color: "#6b7280"
  },
  bookingCashMeta: {
    fontSize: 11,
    color: "#991b1b",
    fontWeight: 700
  },
  historyCell: {
    display: "grid",
    gap: 3,
    textAlign: "center"
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#64748b"
  },
  historyMeta: {
    fontSize: 11,
    color: "#94a3b8"
  },
  unknownSlotCell: {
    display: "grid",
    gap: 2,
    textAlign: "center"
  },
  unknownSlotTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.2
  },
  emptySlot: {
    color: "#9ca3af",
    fontSize: 20,
    lineHeight: 1
  },
  emptySlotAction: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.2
  },
  emptySlotPast: {
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 1.2
  },
  mobileList: {
    display: "grid",
    gap: 12
  },
  mobileCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    textAlign: "left",
    display: "grid",
    gap: 10,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)"
  },
  mobileCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },
  mobileTitle: {
    fontWeight: 700,
    color: "#111827"
  },
  mobileMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280"
  },
  mobileMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 13,
    color: "#374151"
  },
  mobileService: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: 600
  },
  mobilePhone: {
    fontSize: 13,
    color: "#6b7280"
  },
  mobilePaymentLabel: {
    fontSize: 12,
    color: "#991b1b",
    fontWeight: 700
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap"
  },
  pendingCashBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    background: "#fff1f2",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid #fecaca"
  }
}
