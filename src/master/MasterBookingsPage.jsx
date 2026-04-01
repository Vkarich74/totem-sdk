import { useEffect, useMemo, useState } from "react"
import { useMaster } from "./MasterContext"
import { useParams, useNavigate } from "react-router-dom"

import PageSection from "../cabinet/PageSection"
import TableSection from "../cabinet/TableSection"
import EmptyState from "../cabinet/EmptyState"

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com"

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
  if(s === "reserved") return "Ожидает"
  if(s === "confirmed") return "Подтверждена"
  if(s === "completed") return "Завершена"
  if(s === "cancelled" || s === "canceled") return "Отменена"
  return value || "—"
}

function rowHoverStyle(e, enter) {
  if (enter) {
    e.currentTarget.style.background = "#f9fafb"
  } else {
    e.currentTarget.style.background = ""
  }
}

function formatDateTime(value){
  if(!value) return "—"
  const date = new Date(value)
  if(Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("ru-RU")
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
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
      {hint ? <div style={styles.summaryHint}>{hint}</div> : null}
    </div>
  )
}

export default function MasterBookingsPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const {
    loading: masterLoading,
    error: masterError,
    master,
    slug
  } = useMaster()

  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState("")
  const [empty, setEmpty] = useState(false)

  const [client, setClient] = useState("")
  const [phone, setPhone] = useState("")
  const [serviceId, setServiceId] = useState("1")

  const masterSlug = master?.slug || slug

  useEffect(()=>{
    let cancelled = false

    async function loadBookings(){
      if(!masterSlug){
        if(!cancelled){
          setBookings([])
          setBookingsLoading(false)
          setBookingsError("SLUG_MISSING")
          setEmpty(false)
        }
        return
      }

      try{
        setBookingsLoading(true)
        setBookingsError("")
        setEmpty(false)

        const response = await fetch(
          API_BASE + "/internal/masters/" + encodeURIComponent(masterSlug) + "/bookings"
        )

        const text = await response.text()
        let raw = null

        try{
          raw = JSON.parse(text)
        }catch{
          raw = null
        }

        if(!response.ok){
          throw new Error("MASTER_BOOKINGS_HTTP_" + response.status)
        }

        const data = normalizeBookingsResponse(raw)

        if(!cancelled){
          setBookings(data)
          setEmpty(data.length === 0)
        }
      }catch(error){
        console.error("MASTER BOOKINGS LOAD ERROR", error)

        if(!cancelled){
          setBookings([])
          setBookingsError(error?.message || "MASTER_BOOKINGS_LOAD_FAILED")
          setEmpty(false)
        }
      }finally{
        if(!cancelled){
          setBookingsLoading(false)
        }
      }
    }

    loadBookings()

    return ()=>{
      cancelled = true
    }
  },[masterSlug])

  const loading = masterLoading || bookingsLoading
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
    return <div style={{ padding: "20px" }}>Загрузка...</div>
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title="Ошибка">
          <EmptyState title="Ошибка загрузки данных" message={error} />
        </PageSection>
      </div>
    )
  }

  async function createBooking(date, time) {
    if (!masterSlug) return

    const start = date + "T" + time + ":00+06:00"

    try {
      await fetch(
        API_BASE + "/internal/masters/" + encodeURIComponent(masterSlug) + "/bookings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            client_name: client,
            phone: phone,
            start_at: start,
            service_id: Number(serviceId)
          })
        }
      )
    } catch (e) {
      console.error("createBooking error", e)
    }

    navigate(`/master/${masterSlug}/schedule`)
  }

  if (bookingId) {
    const booking = selectedBooking

    if (!booking) {
      return (
        <div style={{ padding: "20px" }}>
          <PageSection title="Запись">
            <EmptyState title="Запись не найдена" />
          </PageSection>
        </div>
      )
    }

    return (
      <div style={{ padding: "20px" }}>
        <button
          onClick={() => navigate(`/master/${masterSlug}/schedule`)}
          style={styles.backButton}
        >
          ← К календарю
        </button>

        <PageSection title={"BR-" + booking.id}>
          <div style={{ ...styles.detailStatus, color: statusColor(booking.status) }}>
            {statusLabel(booking.status)}
          </div>

          {booking.service_name && (
            <div style={styles.detailRow}>
              Услуга: {booking.service_name}
            </div>
          )}

          {booking.price && (
            <div style={styles.detailRow}>
              Цена: {booking.price} сом
            </div>
          )}

          <div style={styles.detailRow}>
            Время: {formatDateTime(booking.start_at)}
          </div>

          <div style={styles.detailRow}>
            Клиент: {booking.client_name || "—"}
          </div>

          <div>
            Телефон: {booking.phone || "—"}
          </div>
        </PageSection>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? "14px" : "20px" }}>
      <PageSection title="Записи">
        {!empty && (
          <div style={styles.summaryGrid}>
            <SummaryCard label="Всего записей" value={summary.total} />
            <SummaryCard label="Активные" value={summary.active} />
            <SummaryCard label="Ожидают" value={summary.reserved} />
            <SummaryCard label="Завершено" value={summary.completed} />
          </div>
        )}

        {empty ? (
          <EmptyState
            title="Записей пока нет"
            message="Записи появятся после бронирований"
          />
        ) : isMobile ? (
          <div style={styles.cardsList}>
            {bookings.map((b) => (
              <button
                key={b.id}
                type="button"
                style={styles.bookingCard}
                onClick={() => navigate(`/master/${masterSlug}/bookings/${b.id}`)}
              >
                <div style={styles.cardTop}>
                  <strong>BR-{b.id}</strong>
                  <span style={{ ...styles.statusBadge, color: statusColor(b.status) }}>
                    {statusLabel(b.status)}
                  </span>
                </div>

                <div style={styles.cardMeta}>
                  <div>
                    <div style={styles.metaLabel}>Дата</div>
                    <div style={styles.metaValue}>{formatDateTime(b.start_at)}</div>
                  </div>

                  <div>
                    <div style={styles.metaLabel}>Клиент</div>
                    <div style={styles.metaValue}>{b.client_name || "—"}</div>
                  </div>

                  <div>
                    <div style={styles.metaLabel}>Телефон</div>
                    <div style={styles.metaValue}>{b.phone || "—"}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <TableSection>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th>Телефон</th>
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
                        navigate(`/master/${masterSlug}/bookings/${b.id}`)
                      }
                    }}
                  >
                    <td>
                      <a href={`#/master/${masterSlug}/bookings/${b.id}`}>
                        BR-{b.id}
                      </a>
                    </td>

                    <td style={{ color: statusColor(b.status) }}>
                      {statusLabel(b.status)}
                    </td>

                    <td>
                      {formatDateTime(b.start_at)}
                    </td>

                    <td>
                      {b.client_name || "—"}
                    </td>

                    <td>
                      {b.phone || "—"}
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
    marginBottom: "16px"
  },
  summaryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px",
    textAlign: "left"
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
    gap: "12px"
  },
  bookingCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "14px",
    textAlign: "left"
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    marginBottom: "12px"
  },
  statusBadge: {
    fontSize: "12px",
    fontWeight: 700
  },
  cardMeta: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px"
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
  detailStatus: {
    marginBottom: "10px",
    fontWeight: 700
  },
  detailRow: {
    marginBottom: "6px"
  }
}
