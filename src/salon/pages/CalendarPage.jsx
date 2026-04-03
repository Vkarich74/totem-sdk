import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { resolveSalonSlug } from "../SalonContext"
import { generateTimeSlots } from "../../calendar/calendarEngine"
import PageSection from "../../cabinet/PageSection"
import EmptyState from "../../cabinet/EmptyState"

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.totemv.com"


async function fetchJson(url, options){
  const response = await fetch(url, options)

  let data = null
  try{
    data = await response.json()
  }catch{
    data = null
  }

  if(!response.ok){
    throw new Error(data?.error || `HTTP_${response.status}`)
  }

  return data
}


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
  if(value === "reserved") return "Ожидает"
  if(value === "confirmed") return "Подтверждена"
  if(value === "completed") return "Завершена"
  if(value === "cancelled") return "Отменена"
  return status || "—"
}

function statusColor(status){
  const value = normalizeStatus(status)
  if(value === "reserved") return "#f59e0b"
  if(value === "confirmed") return "#2563eb"
  if(value === "completed") return "#6b7280"
  if(value === "cancelled") return "#ef4444"
  return "#9ca3af"
}

function formatDateLabel(value){
  if(!value) return "—"

  const date = new Date(value)
  if(Number.isNaN(date.getTime())) return "—"

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

function formatTimeLabel(value){
  if(!value) return "—"

  const date = new Date(value)
  if(Number.isNaN(date.getTime())) return "—"

  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  })
}

function normalizeBooking(raw){
  const startAt = getBookingStartAt(raw)
  return {
    ...raw,
    start_at: startAt,
    client_name: raw?.client_name || raw?.client || "Клиент",
    master_name: raw?.master_name || raw?.master || "Мастер",
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

    const key = date.toISOString().slice(0, 10)
    keys.add(key)
  })

  if(keys.size === 0){
    keys.add(new Date().toISOString().slice(0, 10))
  }

  return [...keys].sort()
}

function SummaryCard({ label, value, hint }){
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
      {hint ? <div style={styles.summaryHint}>{hint}</div> : null}
    </div>
  )
}

export default function CalendarPage(){
  const { slug: routeSlug } = useParams()
  const salonSlug = resolveSalonSlug(routeSlug)
  const isMobile = useIsMobile()

  const [bookings, setBookings] = useState([])
  const [masters, setMasters] = useState([])
  const [selectedDay, setSelectedDay] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState("")

  async function load(){
    if(!salonSlug){
      setBookings([])
      setMasters([])
      setError("SALON_SLUG_MISSING")
      setLoading(false)
      return
    }

    try{
      setLoading(true)
      setError("")

      const [resBookings, resMasters] = await Promise.all([
        fetchJson(`${API_BASE}/internal/salons/${salonSlug}/bookings`),
        fetchJson(`${API_BASE}/internal/salons/${salonSlug}/masters`)
      ])

      if(!resBookings?.ok){
        throw new Error("SALON_CALENDAR_BOOKINGS_LOAD_FAILED")
      }

      const normalizedBookings = (resBookings.bookings || []).map(normalizeBooking)
      const normalizedMasters = resMasters?.ok ? (resMasters.masters || []) : []

      setBookings(normalizedBookings)
      setMasters(normalizedMasters)

      const dayOptions = buildDayOptions(normalizedBookings)
      setSelectedDay((prev) => (prev && dayOptions.includes(prev) ? prev : dayOptions[0]))
    }catch(loadError){
      console.error("SALON CALENDAR LOAD ERROR", loadError)
      setBookings([])
      setMasters([])
      setError(loadError?.message || "SALON_CALENDAR_LOAD_FAILED")
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonSlug])

  const dayOptions = useMemo(() => buildDayOptions(bookings), [bookings])
  const slots = useMemo(() => generateTimeSlots().slice(0, 16), [])

  const bookingsByMasterAndTime = useMemo(() => {
    const index = new Map()

    bookings.forEach((booking) => {
      const startAt = getBookingStartAt(booking)
      if(!startAt) return

      const date = new Date(startAt)
      if(Number.isNaN(date.getTime())) return

      const dayKey = date.toISOString().slice(0, 10)
      if(selectedDay && dayKey !== selectedDay) return

      const timeKey = formatTimeLabel(startAt)
      const masterKey = String(booking.master_name || "")
      index.set(`${masterKey}__${timeKey}`, booking)
    })

    return index
  }, [bookings, selectedDay])

  const dayBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const startAt = getBookingStartAt(booking)
        if(!startAt || !selectedDay) return false

        const date = new Date(startAt)
        if(Number.isNaN(date.getTime())) return false

        return date.toISOString().slice(0, 10) === selectedDay
      })
      .sort((left, right) => new Date(getBookingStartAt(left)) - new Date(getBookingStartAt(right)))
  }, [bookings, selectedDay])

  async function createBooking(master, time){
    const client = prompt("Имя клиента")
    if(!client) return

    try{
      setActionLoading(`${master?.id || master?.name}-${time}`)
      await fetchJson(`${API_BASE}/internal/bookings/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          salon_slug: salonSlug,
          master_name: master.name,
          client_name: client,
          start_at: `${selectedDay}T${time}:00`
        })
      })
      await load()
    }catch(actionError){
      console.error("SALON CALENDAR CREATE BOOKING ERROR", actionError)
      alert("Ошибка создания записи")
    }finally{
      setActionLoading("")
    }
  }

  async function moveBooking(booking){
    const startAt = getBookingStartAt(booking)
    const newTime = prompt("Новое время (например 12:00)", formatTimeLabel(startAt))
    if(!newTime) return

    try{
      setActionLoading(String(booking.id))
      await fetchJson(`${API_BASE}/internal/bookings/${booking.id}/move`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          start_at: `${selectedDay}T${newTime}:00`
        })
      })
      await load()
    }catch(actionError){
      console.error("SALON CALENDAR MOVE BOOKING ERROR", actionError)
      alert("Ошибка переноса записи")
    }finally{
      setActionLoading("")
    }
  }

  const summary = {
    masters: masters.length,
    bookings: dayBookings.length,
    confirmed: dayBookings.filter((booking) => booking.status === "confirmed").length,
    pending: dayBookings.filter((booking) => booking.status === "reserved").length
  }

  if(loading){
    return (
      <PageSection title="Расписание салона">
        <div style={styles.feedbackCard}>Загрузка расписания…</div>
      </PageSection>
    )
  }

  if(error){
    return (
      <PageSection title="Расписание салона">
        <div style={styles.errorCard}>
          <div style={styles.errorTitle}>Не удалось загрузить расписание</div>
          <div style={styles.errorText}>{error}</div>
          <button style={styles.primaryButton} onClick={load}>Повторить</button>
        </div>
      </PageSection>
    )
  }

  if(masters.length === 0){
    return (
      <PageSection title="Расписание салона">
        <EmptyState title="Нет мастеров" description="Сначала добавьте мастеров, чтобы построить расписание салона." />
      </PageSection>
    )
  }

  return (
    <PageSection title="Расписание салона">
      <div style={styles.pageHint}>Календарь записей и управление слотами мастеров</div>

      <div style={styles.summaryGrid}>
        <SummaryCard label="Мастеров" value={summary.masters} hint="В активном расписании" />
        <SummaryCard label="Записей на день" value={summary.bookings} hint={selectedDay ? formatDateLabel(selectedDay) : "—"} />
        <SummaryCard label="Подтверждены" value={summary.confirmed} hint="Активные записи" />
        <SummaryCard label="Ожидают" value={summary.pending} hint="Требуют внимания" />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>День</label>
          <select
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
            style={styles.select}
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>{formatDateLabel(day)}</option>
            ))}
          </select>
        </div>
      </div>

      {isMobile ? (
        dayBookings.length === 0 ? (
          <EmptyState title="На этот день записей нет" description="Выберите другой день или создайте запись из свободного слота." />
        ) : (
          <div style={styles.mobileList}>
            {dayBookings.map((booking) => {
              const color = statusColor(booking.status)
              return (
                <button
                  key={booking.id}
                  type="button"
                  style={{ ...styles.mobileCard, borderColor: `${color}33` }}
                  onClick={() => moveBooking(booking)}
                >
                  <div style={styles.mobileCardHeader}>
                    <div>
                      <div style={styles.mobileTitle}>{booking.client_name}</div>
                      <div style={styles.mobileMeta}>{booking.master_name}</div>
                    </div>
                    <span style={{ ...styles.statusBadge, background: `${color}18`, color }}>{statusText(booking.status)}</span>
                  </div>
                  <div style={styles.mobileMetaRow}>
                    <span>{formatTimeLabel(getBookingStartAt(booking))}</span>
                    <span>{formatDateLabel(getBookingStartAt(booking))}</span>
                  </div>
                  {booking.service_name ? <div style={styles.mobileService}>{booking.service_name}</div> : null}
                  {booking.phone ? <div style={styles.mobilePhone}>{booking.phone}</div> : null}
                </button>
              )
            })}
          </div>
        )
      ) : (
        <div style={styles.desktopWrap}>
          <div style={{ ...styles.grid, gridTemplateColumns: `110px repeat(${Math.max(1, masters.length)}, minmax(180px, 1fr))` }}>
            <div style={styles.cornerCell}></div>

            {masters.map((master) => (
              <div key={master.id || master.name} style={styles.masterHeader}>
                {master.name}
              </div>
            ))}

            {slots.map((time) => (
              <div key={time} style={{ display: "contents" }}>
                <div style={styles.timeCell}>{time}</div>

                {masters.map((master) => {
                  const booking = bookingsByMasterAndTime.get(`${String(master.name)}__${time}`)
                  const color = booking ? statusColor(booking.status) : "#e5e7eb"
                  const loadingKey = booking ? String(booking.id) : `${master?.id || master?.name}-${time}`

                  return (
                    <button
                      key={`${master.id || master.name}-${time}`}
                      type="button"
                      disabled={actionLoading === loadingKey}
                      style={{
                        ...styles.slotCell,
                        background: booking ? `${color}14` : "#ffffff",
                        borderLeft: "1px solid #e5e7eb"
                      }}
                      onClick={() => {
                        if(booking){
                          moveBooking(booking)
                        }else{
                          createBooking(master, time)
                        }
                      }}
                    >
                      {booking ? (
                        <div style={styles.bookingCell}>
                          <div style={styles.bookingClient}>{booking.client_name}</div>
                          <div style={styles.bookingMeta}>{statusText(booking.status)}</div>
                        </div>
                      ) : (
                        <div style={styles.emptySlot}>+</div>
                      )}
                    </button>
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
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 220
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
    overflow: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff"
  },
  grid: {
    display: "grid",
    minWidth: 960
  },
  cornerCell: {
    position: "sticky",
    top: 0,
    left: 0,
    zIndex: 4,
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb"
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
    color: "#111827"
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
    fontWeight: 600
  },
  slotCell: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    minHeight: 54,
    padding: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
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
  emptySlot: {
    color: "#9ca3af",
    fontSize: 20,
    lineHeight: 1
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
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap"
  }
}
