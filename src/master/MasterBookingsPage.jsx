import { useMaster } from "./MasterContext"
import { useParams, useNavigate } from "react-router-dom"
import { useState } from "react"

import PageSection from "../cabinet/PageSection"
import TableSection from "../cabinet/TableSection"
import EmptyState from "../cabinet/EmptyState"

function statusColor(s) {
  if (s === "completed") return "#27ae60"
  if (s === "confirmed") return "#2980b9"
  if (s === "reserved") return "#f39c12"
  return "#e74c3c"
}

function rowHoverStyle(e, enter) {
  if (enter) {
    e.currentTarget.style.background = "#f9fafb"
  } else {
    e.currentTarget.style.background = ""
  }
}

export default function MasterBookingsPage() {

  const { bookingId } = useParams()
  const navigate = useNavigate()

  const {
    bookings,
    loading,
    error,
    empty,
    master,
    slug
  } = useMaster()

  const [client, setClient] = useState("")
  const [phone, setPhone] = useState("")
  const [serviceId, setServiceId] = useState("1")

  // 🔒 единый slug
  const masterSlug = master?.slug || slug

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

  // ❗ CREATE (оставили, но безопаснее)
  async function createBooking(date, time) {
    if (!masterSlug) return

    const start = date + "T" + time + ":00+06:00"

    try {
      await fetch(
        `https://api.totemv.com/internal/masters/${masterSlug}/bookings`,
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

  // ❗ DETAIL
  if (bookingId) {

    const booking = bookings?.find(
      (b) => String(b.id) === String(bookingId)
    )

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
          style={{ marginBottom: "10px" }}
        >
          ← К календарю
        </button>

        <PageSection title={"BR-" + booking.id}>

          <div style={{ color: statusColor(booking.status), marginBottom: "10px" }}>
            {booking.status}
          </div>

          {booking.service_name && (
            <div style={{ marginBottom: "6px" }}>
              Услуга: {booking.service_name}
            </div>
          )}

          {booking.price && (
            <div style={{ marginBottom: "6px" }}>
              Цена: {booking.price} сом
            </div>
          )}

          <div style={{ marginBottom: "6px" }}>
            Время: {new Date(booking.start_at).toLocaleString("ru-RU")}
          </div>

          <div style={{ marginBottom: "6px" }}>
            Клиент: {booking.client_name || "—"}
          </div>

          <div>
            Телефон: {booking.phone || "—"}
          </div>

        </PageSection>

      </div>
    )
  }

  // ❗ LIST
  return (
    <div style={{ padding: "20px" }}>

      <PageSection title="Записи">

        {empty ? (

          <EmptyState
            title="Записей пока нет"
            message="Записи появятся после бронирований"
          />

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

                {bookings?.map((b) => (

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
                      {b.status}
                    </td>

                    <td>
                      {new Date(b.start_at).toLocaleString("ru-RU")}
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