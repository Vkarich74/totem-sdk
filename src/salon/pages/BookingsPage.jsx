import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import * as api from "../../api/internal"
import { resolveSalonSlug } from "../SalonContext"
import PageSection from "../../cabinet/PageSection"
import EmptyState from "../../cabinet/EmptyState"

function statusColor(status){
  const value = String(status || "reserved").toLowerCase()
  if(value === "reserved") return "#f59e0b"
  if(value === "confirmed") return "#10b981"
  if(value === "completed") return "#6b7280"
  if(value === "cancelled" || value === "canceled") return "#ef4444"
  return "#9ca3af"
}

function statusText(status){
  const value = String(status || "reserved").toLowerCase()
  if(value === "reserved") return "Ожидает"
  if(value === "confirmed") return "Подтверждена"
  if(value === "completed") return "Завершена"
  if(value === "cancelled" || value === "canceled") return "Отменена"
  return status || "—"
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

function formatDateTime(value){
  if(!value) return "—"

  const date = new Date(value)

  if(Number.isNaN(date.getTime())){
    return "—"
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function formatMoney(value){
  if(value === null || value === undefined || value === "") return "—"
  return `${value} сом`
}

function normalizeBooking(raw){
  const startAt = getBookingStartAt(raw)

  return {
    ...raw,
    start_at: startAt,
    startAt,
    client_name: raw?.client_name || raw?.client || "—",
    phone: raw?.phone || raw?.client_phone || "",
    master_name: raw?.master_name || raw?.master || "—",
    service_name: raw?.service_name || raw?.service || "—",
    status: String(raw?.status || "reserved").toLowerCase(),
    price: raw?.price ?? raw?.amount ?? null
  }
}

function sortBookings(list){
  return [...list].sort((left, right) => {
    const leftValue = getBookingStartAt(left)
    const rightValue = getBookingStartAt(right)

    if(!leftValue && !rightValue) return 0
    if(!leftValue) return 1
    if(!rightValue) return -1

    return new Date(leftValue) - new Date(rightValue)
  })
}

function getWeekRange(now){
  const start = new Date(now)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  end.setHours(0, 0, 0, 0)

  return { start, end }
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

function SummaryCard({ label, value, hint }){
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
      {hint ? <div style={styles.summaryHint}>{hint}</div> : null}
    </div>
  )
}

export default function BookingsPage(){
  const { slug: routeSlug } = useParams()
  const isMobile = useIsMobile()
  const salonSlug = resolveSalonSlug(routeSlug)

  const [bookings, setBookings] = useState([])
  const [masters, setMasters] = useState([])
  const [filter, setFilter] = useState("today")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loadingAction, setLoadingAction] = useState(null)
  const [selectedBookingId, setSelectedBookingId] = useState(null)

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

      const [bookingsResponse, mastersResponse] = await Promise.all([
        api.getBookings(salonSlug),
        api.getMasters(salonSlug)
      ])

      if(!bookingsResponse?.ok){
        throw new Error("SALON_BOOKINGS_LOAD_FAILED")
      }

      const normalizedBookings = sortBookings(
        (bookingsResponse?.bookings || []).map(normalizeBooking)
      )

      setBookings(normalizedBookings)
      setMasters(mastersResponse?.ok ? (mastersResponse.masters || []) : [])
    }catch(loadError){
      console.error("SALON BOOKINGS LOAD ERROR", loadError)
      setBookings([])
      setMasters([])
      setError(loadError?.message || "SALON_BOOKINGS_LOAD_FAILED")
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function run(){
      if(cancelled || loadingAction) return
      await load()
    }

    run()

    return () => {
      cancelled = true
    }
  }, [salonSlug, loadingAction])

  async function action(id, type){
    if(loadingAction) return

    try{
      setLoadingAction(id)
      const response = await api.bookingAction(id, type)

      if(!response?.ok){
        alert("Ошибка изменения статуса")
        return
      }

      await load()
    }catch(actionError){
      console.error("SALON BOOKING ACTION ERROR", actionError)
      alert("Ошибка сервера")
    }finally{
      setLoadingAction(null)
    }
  }

  const filteredBookings = useMemo(() => {
    let result = [...bookings]
    const now = new Date()

    if(filter === "today"){
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)

      const end = new Date(now)
      end.setHours(23, 59, 59, 999)

      result = result.filter((booking) => {
        const value = getBookingStartAt(booking)
        if(!value) return false

        const date = new Date(value)
        return date >= start && date <= end
      })
    }

    if(filter === "week"){
      const { start, end } = getWeekRange(now)

      result = result.filter((booking) => {
        const value = getBookingStartAt(booking)
        if(!value) return false

        const date = new Date(value)
        return date >= start && date < end
      })
    }

    if(search.trim()){
      const query = search.trim().toLowerCase()

      result = result.filter((booking) => (
        String(booking?.client_name || "").toLowerCase().includes(query) ||
        String(booking?.phone || "").toLowerCase().includes(query) ||
        String(booking?.master_name || "").toLowerCase().includes(query) ||
        String(booking?.service_name || "").toLowerCase().includes(query)
      ))
    }

    return result
  }, [bookings, filter, search])

  useEffect(() => {
    if(filteredBookings.length === 0){
      setSelectedBookingId(null)
      return
    }

    if(selectedBookingId === null){
      setSelectedBookingId(filteredBookings[0].id)
      return
    }

    const exists = filteredBookings.some((booking) => String(booking.id) === String(selectedBookingId))

    if(!exists){
      setSelectedBookingId(filteredBookings[0].id)
    }
  }, [filteredBookings, selectedBookingId])

  const selectedBooking = useMemo(() => {
    return filteredBookings.find((booking) => String(booking.id) === String(selectedBookingId)) || null
  }, [filteredBookings, selectedBookingId])

  const summary = useMemo(() => {
    const result = {
      total: filteredBookings.length,
      active: 0,
      reserved: 0,
      completed: 0,
      masters: masters.length
    }

    filteredBookings.forEach((booking) => {
      const status = String(booking?.status || "").toLowerCase()

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
  }, [filteredBookings, masters.length])

  if(loading){
    return (
      <PageSection title="Записи салона">
        <div style={styles.feedbackBox}>Загрузка записей...</div>
      </PageSection>
    )
  }

  if(error){
    return (
      <PageSection title="Записи салона">
        <EmptyState title="Ошибка загрузки данных" message={error} />
      </PageSection>
    )
  }

  if(bookings.length === 0){
    return (
      <PageSection title="Записи салона">
        <div style={styles.toolbar}>
          <FilterButton active={filter === "today"} onClick={() => setFilter("today")}>Сегодня</FilterButton>
          <FilterButton active={filter === "week"} onClick={() => setFilter("week")}>Неделя</FilterButton>
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Все</FilterButton>
        </div>

        <EmptyState title="Записей пока нет" message="Когда появятся записи, они будут показаны здесь." />
      </PageSection>
    )
  }

  return (
    <PageSection title="Записи салона">
      <div style={styles.summaryGrid}>
        <SummaryCard label="Всего" value={summary.total} hint="по текущему фильтру" />
        <SummaryCard label="Активные" value={summary.active} hint="не завершены" />
        <SummaryCard label="Ожидают" value={summary.reserved} hint="нужно действие" />
        <SummaryCard label="Мастера" value={summary.masters} hint="в салоне" />
      </div>

      <div style={styles.toolbar}>
        <FilterButton active={filter === "today"} onClick={() => setFilter("today")}>Сегодня</FilterButton>
        <FilterButton active={filter === "week"} onClick={() => setFilter("week")}>Неделя</FilterButton>
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Все</FilterButton>
      </div>

      <div style={styles.searchWrap}>
        <input
          placeholder="Поиск по клиенту, телефону, мастеру, услуге"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={styles.searchInput}
        />
      </div>

      {filteredBookings.length === 0 ? (
        <EmptyState title="По текущему фильтру записей нет" message="Измените период или поисковый запрос." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "340px minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start"
          }}
        >
          <div style={styles.listCard}>
            {filteredBookings.map((booking) => {
              const active = String(selectedBookingId) === String(booking.id)

              return (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBookingId(booking.id)}
                  style={{
                    ...styles.listItem,
                    background: active ? "#f3f4f6" : "#fff",
                    borderLeftColor: statusColor(booking.status)
                  }}
                >
                  <div style={styles.listItemTop}>
                    <div style={styles.listItemTitle}>BR-{booking.id}</div>
                    <div style={{ ...styles.statusBadge, color: statusColor(booking.status), borderColor: statusColor(booking.status) }}>
                      {statusText(booking.status)}
                    </div>
                  </div>

                  <div style={styles.listItemName}>{booking.client_name}</div>
                  <div style={styles.listItemMeta}>{formatDateTime(booking.start_at)}</div>
                  <div style={styles.listItemMeta}>{booking.master_name} · {booking.service_name}</div>
                </button>
              )
            })}
          </div>

          <div style={styles.detailCard}>
            {!selectedBooking ? (
              <EmptyState title="Выберите запись" message="Справа откроются детали выбранной записи." />
            ) : (
              <>
                <div style={styles.detailHeader}>
                  <div>
                    <div style={styles.detailId}>BR-{selectedBooking.id}</div>
                    <div style={styles.detailDate}>{formatDateTime(selectedBooking.start_at)}</div>
                  </div>

                  <div style={{ ...styles.statusBadge, color: statusColor(selectedBooking.status), borderColor: statusColor(selectedBooking.status) }}>
                    {statusText(selectedBooking.status)}
                  </div>
                </div>

                <div style={styles.detailGrid}>
                  <DetailItem label="Клиент" value={selectedBooking.client_name} />
                  <DetailItem label="Телефон" value={selectedBooking.phone || "—"} />
                  <DetailItem label="Мастер" value={selectedBooking.master_name} />
                  <DetailItem label="Услуга" value={selectedBooking.service_name} />
                  <DetailItem label="Цена" value={formatMoney(selectedBooking.price)} />
                  <DetailItem label="Дата" value={formatDateTime(selectedBooking.start_at)} />
                </div>

                <div style={styles.actionsRow}>
                  {selectedBooking.status === "reserved" && (
                    <>
                      <ActionButton disabled={loadingAction === selectedBooking.id} onClick={() => action(selectedBooking.id, "confirm")}>Подтвердить</ActionButton>
                      <ActionButton disabled={loadingAction === selectedBooking.id} onClick={() => action(selectedBooking.id, "cancel")}>Отменить</ActionButton>
                    </>
                  )}

                  {selectedBooking.status === "confirmed" && (
                    <>
                      <ActionButton disabled={loadingAction === selectedBooking.id} onClick={() => action(selectedBooking.id, "complete")}>Завершить</ActionButton>
                      <ActionButton disabled={loadingAction === selectedBooking.id} onClick={() => action(selectedBooking.id, "cancel")}>Отменить</ActionButton>
                    </>
                  )}

                  {selectedBooking.phone ? (
                    <ActionButton onClick={() => {
                      window.location.href = `tel:${selectedBooking.phone}`
                    }}>Позвонить</ActionButton>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageSection>
  )
}

function FilterButton({ active, onClick, children }){
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.filterButton,
        background: active ? "#111827" : "#fff",
        color: active ? "#fff" : "#111827",
        borderColor: active ? "#111827" : "#d1d5db"
      }}
    >
      {children}
    </button>
  )
}

function ActionButton({ disabled, onClick, children }){
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles.actionButton,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >
      {children}
    </button>
  )
}

function DetailItem({ label, value }){
  return (
    <div style={styles.detailItem}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  )
}

const styles = {
  feedbackBox: {
    padding: "18px",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#fff"
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "18px"
  },
  summaryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#fff",
    padding: "16px"
  },
  summaryLabel: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  summaryValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.1
  },
  summaryHint: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#9ca3af"
  },
  toolbar: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "14px"
  },
  filterButton: {
    border: "1px solid #d1d5db",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: 600
  },
  searchWrap: {
    marginBottom: "18px"
  },
  searchInput: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "14px",
    padding: "12px 14px",
    fontSize: "14px",
    outline: "none"
  },
  listCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#fff",
    overflow: "hidden"
  },
  listItem: {
    width: "100%",
    textAlign: "left",
    border: "none",
    borderLeft: "4px solid transparent",
    borderBottom: "1px solid #f3f4f6",
    padding: "14px 14px 14px 16px",
    display: "block"
  },
  listItemTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "8px"
  },
  listItemTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827"
  },
  listItemName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "4px"
  },
  listItemMeta: {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.45
  },
  detailCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#fff",
    padding: "18px"
  },
  detailHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "18px"
  },
  detailId: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#111827",
    marginBottom: "4px"
  },
  detailDate: {
    fontSize: "14px",
    color: "#6b7280"
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid currentColor",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap"
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "18px"
  },
  detailItem: {
    border: "1px solid #f3f4f6",
    borderRadius: "14px",
    background: "#f9fafb",
    padding: "12px"
  },
  detailLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.45,
    wordBreak: "break-word"
  },
  actionsRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  actionButton: {
    border: "1px solid #111827",
    borderRadius: "12px",
    background: "#111827",
    color: "#fff",
    padding: "11px 14px",
    fontSize: "14px",
    fontWeight: 600
  }
}
