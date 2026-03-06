import React, { useEffect, useState } from "react";
import { getMasterSlug } from "../utils/slug";
import api from "../api/internal";

function generateSlots() {
  const slots = [];
  const start = 7 * 60;
  const end = 21 * 60;

  for (let t = start; t < end; t += 15) {
    const h = Math.floor(t / 60);
    const m = t % 60;

    const time =
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0");

    slots.push(time);
  }

  return slots;
}

function formatTime(dateString) {
  const d = new Date(dateString);

  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");

  return `${h}:${m}`;
}

export default function SchedulePage() {
  const slug = getMasterSlug();

  const [bookings, setBookings] = useState([]);
  const [slots] = useState(generateSlots());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);

      const res = await api.get(`/internal/masters/${slug}/bookings`);

      if (res.data && res.data.ok) {
        setBookings(res.data.bookings || []);
      }

    } catch (e) {

      console.error("BOOKINGS_FETCH_FAILED", e);

    } finally {

      setLoading(false);

    }
  }

  function getBooking(time) {
    return bookings.find((b) => {
      if (!b.start_at) return false;
      return formatTime(b.start_at) === time;
    });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Master Schedule</h2>

      {loading && <div>Loading schedule...</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
          marginTop: 20,
        }}
      >
        {slots.map((time) => {

          const booking = getBooking(time);

          const booked = !!booking;

          return (
            <div
              key={time}
              style={{
                padding: 12,
                borderRadius: 6,
                textAlign: "center",
                background: booked ? "#ffb3b3" : "#f0f0f0",
                border: "1px solid #ddd",
                fontWeight: 500,
                minHeight: 60,
              }}
            >
              <div>{time}</div>

              {booking && (
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 5,
                    color: "#333",
                  }}
                >
                  {booking.client_name || "Client"}

                  {booking.phone && (
                    <div>{booking.phone}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}