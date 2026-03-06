import { useMemo, useState } from "react"
import { useMaster } from "./MasterContext"

function pad(value) {
  return value < 10 ? "0" + value : String(value)
}

function toLocalDateKey(date) {
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  )
}

function todayKey() {
  return toLocalDateKey(new Date())
}

function formatDateDMY(dateKey) {
  const [y, m, d] = dateKey.split("-")
  return d + "-" + m + "-" + y
}

function addDays(dateKey, delta) {
  const [y, m, d] = dateKey.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return toLocalDateKey(date)
}

function buildSlots() {
  const result = []
  let hour = 7
  let minute = 0

  for (let i = 0; i < 56; i++) {
    result.push(pad(hour) + ":" + pad(minute))
    minute += 15
    if (minute >= 60) {
      hour += 1
      minute = 0
    }
  }

  return result
}

function normalizeStatus(value) {
  const s = String(value || "reserved").toLowerCase()
  if (s === "canceled") return "cancelled"
  return s
}

function statusLabel(status) {
  const s = normalizeStatus(status)
  if (s === "reserved") return "ожидает"
  if (s === "confirmed") return "подтверждена"
  if (s === "completed") return "завершена"
  if (s === "cancelled") return "отмена"
  return s
}

function statusColor(status) {
  const s = normalizeStatus(status)
  if (s === "reserved") return "#fff3cd"
  if (s === "confirmed") return "#d0ebff"
  if (s === "completed") return "#d3f9d8"
  if (s === "cancelled") return "#ffe3e3"
  return "#eeeeee"
}

function bookingDateKey(startAt) {
  return toLocalDateKey(new Date(startAt))
}

function bookingSlotKey(startAt) {
  const date = new Date(startAt)
  const hour = date.getHours()
  const minute = date.getMinutes()
  const roundedMinute = Math.floor(minute / 15) * 15
  return pad(hour) + ":" + pad(roundedMinute)
}

function bookingTimeLabel(startAt, endAt) {
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null

  const startText = pad(start.getHours()) + ":" + pad(start.getMinutes())

  if (!end) return startText

  const endText = pad(end.getHours()) + ":" + pad(end.getMinutes())
  return startText + " - " + endText
}

function sortBookingsByTime(items) {
  return [...items].sort((a, b) => {
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  })
}

export default function MasterSchedulePage() {
  const { bookings = [], loading } = useMaster()
  const [dateKey, setDateKey] = useState(todayKey())

  const slots = useMemo(() => buildSlots(), [])

  const calendarMap = useMemo(() => {
    const map = {}

    for (const booking of bookings || []) {
      if (!booking || !booking.start_at) continue
      if (bookingDateKey(booking.start_at) !== dateKey) continue

      const slot = bookingSlotKey(booking.start_at)

      if (!map[slot]) {
        map[slot] = []
      }

      map[slot].push({
        ...booking,
        _status: normalizeStatus(booking.status),
      })
    }

    for (const slot of Object.keys(map)) {
      map[slot] = sortBookingsByTime(map[slot])
    }

    return map
  }, [bookings, dateKey])

  const dayBookingsCount = useMemo(() => {
    let total = 0
    for (const slot of Object.keys(calendarMap)) {
      total += calendarMap[slot].length
    }
    return total
  }, [calendarMap])

  if (loading) {
    return <div>Загрузка...</div>
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Календарь мастера</h3>

        <div style={{ flex: 1 }} />

        <button onClick={() => setDateKey(addDays(dateKey, -1))}>←</button>

        <div
          style={{
            minWidth: "120px",
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          {formatDateDMY(dateKey)}
        </div>

        <button onClick={() => setDateKey(addDays(dateKey, 1))}>→</button>

        <button onClick={() => setDateKey(todayKey())}>Сегодня</button>
      </div>

      <div
        style={{
          border: "1px solid #dddddd",
          borderRadius: "10px",
          padding: "10px 12px",
          marginBottom: "12px",
          background: "#fafafa",
        }}
      >
        Записей на день: <b>{dayBookingsCount}</b>
      </div>

      {slots.map((slot) => {
        const items = calendarMap[slot] || []
        const busy = items.length > 0

        return (
          <div
            key={slot}
            style={{
              border: "1px solid #dddddd",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "8px",
              background: busy ? "#ffffff" : "#fafafa",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <b style={{ minWidth: "60px" }}>{slot}</b>
              <span style={{ color: busy ? "#111111" : "#888888" }}>
                {busy ? "занято" : "свободно"}
              </span>
            </div>

            {items.map((booking) => (
              <div
                key={booking.id}
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  border: "1px solid #e9e9e9",
                  borderRadius: "8px",
                  background: statusColor(booking._status),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <b>#{booking.id}</b>

                  <span
                    style={{
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(0,0,0,0.2)",
                    }}
                  >
                    {statusLabel(booking._status)}
                  </span>
                </div>

                <div style={{ marginTop: "6px" }}>
                  {booking.client_name || "клиент"}
                </div>

                <div style={{ color: "#444444", marginTop: "4px" }}>
                  {booking.phone || "—"}
                </div>

                <div style={{ color: "#444444", marginTop: "4px" }}>
                  {bookingTimeLabel(booking.start_at, booking.end_at)}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}