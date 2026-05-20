import { useEffect, useMemo, useState } from "react"
import { useMaster } from "../MasterContext"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { getAuthAccessToken, getMasterBookings, getMasterServices } from "../../api/internal"

import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"

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
  const [searchParams] = useSearchParams()
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
  const [serviceId, setServiceId] = useState("")
  const [bookingDate, setBookingDate] = useState("")
  const [bookingTime, setBookingTime] = useState("")
  const [createError, setCreateError] = useState("")
  const [serviceOptions, setServiceOptions] = useState([])
  const [serviceOptionsLoading, setServiceOptionsLoading] = useState(false)

  const masterSlug = master?.slug || slug
  const isCreateMode = bookingId === "new"

  useEffect(() => {
    if(!isCreateMode) return

    setBookingDate(searchParams.get("date") || "")
    setBookingTime(searchParams.get("time") || "")
  }, [isCreateMode, searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadServiceOptions(){
      if(!isCreateMode || !masterSlug){
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
            setCreateError("Нет активных услуг для создания записи")
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
          setCreateError(error?.message || "MASTER_SERVICES_LOAD_FAILED")
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
  }, [isCreateMode, masterSlug])

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

        const result = await getMasterBookings(masterSlug)

        if(!result?.ok){
          const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
          throw new Error(status ? "MASTER_BOOKINGS_HTTP_" + status : (result?.error || "MASTER_BOOKINGS_LOAD_FAILED"))
        }

        const data = normalizeBookingsResponse(result)

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

    if (!date || !time || !client.trim()) {
      setCreateError("Заполните дату, время и имя клиента")
      return
    }

    const start = date + "T" + time + ":00+06:00"
    const token = getAuthAccessToken()

    try {
      const response = await fetch(
        API_BASE + "/internal/masters/" + encodeURIComponent(masterSlug) + "/bookings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {})
          },
          body: JSON.stringify({
            client_name: client,
            phone: phone,
            start_at: start,
            service_id: Number(serviceId)
          })
        }
      )

      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "MASTER_BOOKING_CREATE_FAILED")
      }

      setCreateError("")
      navigate(`/master/${masterSlug}/schedule`)
      return
    } catch (e) {
      console.error("createBooking error", e)
      setCreateError(e?.message || "MASTER_BOOKING_CREATE_FAILED")
    }
  }

  if (isCreateMode) {
    return (
      <div style={{ padding: "20px" }}>
        <button
          onClick={() => navigate(`/master/${masterSlug}/schedule`)}
          style={styles.backButton}
        >
          ← К календарю
        </button>

        <PageSection title="Новая запись">
          <div style={styles.createForm}>
            {createError && (
              <div style={styles.errorBanner}>
                {createError}
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Дата</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Время</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Клиент</label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Имя клиента"
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Телефон</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Телефон"
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Услуга</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                style={styles.fieldInput}
                disabled={serviceOptionsLoading || serviceOptions.length === 0}
              >
                {serviceOptions.length === 0 ? (
                  <option value="">Нет активных услуг</option>
                ) : (
                  serviceOptions.map((service) => {
                    const id = String(service?.id ?? service?.service_id ?? "")
                    const label = service?.name || service?.title || service?.label || `Услуга #${id}`
                    return (
                      <option key={id} value={id}>
                        {label}
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
              >
                Создать запись
              </button>

              <button
                onClick={() => navigate(`/master/${masterSlug}/schedule`)}
                style={styles.secondaryButton}
              >
                Отмена
              </button>
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
  createForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxWidth: "420px"
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
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
    flexWrap: "wrap"
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
  }
}
