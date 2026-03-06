import React, { useEffect, useMemo, useState } from "react";
import { getMasterSlug } from "../utils/slug";
import api from "../api/internal";

function generateSlots() {
  const slots = [];
  const start = 7 * 60;
  const end = 21 * 60;

  for (let t = start; t < end; t += 15) {
    const h = Math.floor(t / 60);
    const m = t % 60;

    slots.push(
      String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0")
    );
  }

  return slots;
}

function toUtcDateKey(dateString) {
  const d = new Date(dateString);
  return d.toISOString().slice(0, 10);
}

function toUtcTimeKey(dateString) {
  const d = new Date(dateString);
  return (
    String(d.getUTCHours()).padStart(2, "0") +
    ":" +
    String(d.getUTCMinutes()).padStart(2, "0")
  );
}

function addDays(dateKey, days) {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatHeaderDate(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${month}/${day}/${year}`;
}

function isBusyStatus(status) {
  const s = String(status || "").toLowerCase();
  return s !== "cancelled" && s !== "canceled";
}

export default function SchedulePage() {
  const slug = getMasterSlug();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const slots = useMemo(() => generateSlots(), []);

  useEffect(() => {
    loadBookings();
  }, [slug]);

  async function loadBookings() {
    try {
      setLoading(true);

      const res = await api.get(`/internal/masters/${slug}/bookings`);

      if (res.data && res.data.ok) {
        setBookings(Array.isArray(res.data.bookings) ? res.data.bookings : []);
      } else {
        setBookings([]);
      }
    } catch (e) {
      console.error("BOOKINGS_FETCH_FAILED", e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  function getBookingForSlot(time) {
    return bookings.find((booking) => {
      if (!booking?.start_at) return false;
      if (!isBusyStatus(booking.status)) return false;

      const bookingDate = toUtcDateKey(booking.start_at);
      const bookingTime = toUtcTimeKey(booking.start_at);

      return bookingDate === selectedDate && bookingTime === time;
    });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Календарь мастера</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ←
        </button>

        <div style={{ minWidth: 120, fontWeight: 600 }}>
          {formatHeaderDate(selectedDate)}
        </div>

        <button
          type="button"
          onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          →
        </button>

        <button
          type="button"
          onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Сегодня
        </button>

        <button
          type="button"
          onClick={loadBookings}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Обновить
        </button>
      </div>

      {loading && (
        <div style={{ marginBottom: 16 }}>
          Загрузка расписания...
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {slots.map((time) => {
          const booking = getBookingForSlot(time);
          const booked = !!booking;

          return (
            <div
              key={time}
              style={{
                padding: 12,
                borderRadius: 6,
                border: "1px solid #ddd",
                background: booked ? "#ffb3b3" : "#f0f0f0",
                minHeight: 76,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 6,
                  textAlign: "center",
                }}
              >
                {time}
              </div>

              {booked ? (
                <div style={{ fontSize: 12, textAlign: "center", color: "#333" }}>
                  <div style={{ marginBottom: 4 }}>
                    {booking.client_name || "Client"}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    {booking.phone || ""}
                  </div>
                  <div>{booking.status || "reserved"}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, textAlign: "center", color: "#666" }}>
                  свободно
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}