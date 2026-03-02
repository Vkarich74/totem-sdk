import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = "https://api.totemv.com";

export default function SalonBookingsPage() {
  const [searchParams] = useSearchParams();
  const salonSlug = searchParams.get("salon");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!salonSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/salons/${salonSlug}/bookings`);
      const data = await res.json();
      if (data.ok) setBookings(data.bookings || []);
      else setBookings([]);
    } catch (e) {
      console.error("PUBLIC_SALON_BOOKINGS_ERROR", e?.message || e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [salonSlug]);

  const statusColor = (status) => {
    switch (status) {
      case "reserved":
        return "#f5a623";
      case "confirmed":
        return "#1976d2";
      case "completed":
        return "#2e7d32";
      case "canceled":
      case "cancelled":
        return "#d32f2f";
      default:
        return "#999";
    }
  };

  const formatDate = (booking) => {
    const iso = booking?.datetime_start || booking?.start_at;

    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
    }
    return "—";
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui",
      }}
    >
      <h2 style={{ marginBottom: 20 }}>Бронирования</h2>

      {!salonSlug && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            color: "#856404",
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          Нет salon в URL. Пример: <code>?salon=totem-demo-salon</code>
        </div>
      )}

      {loading && (
        <div style={{ color: "#666", marginBottom: 12 }}>Загрузка...</div>
      )}

      {!loading && bookings.length === 0 && salonSlug && (
        <div style={{ color: "#666" }}>Нет бронирований</div>
      )}

      {bookings.map((b) => (
        <div
          key={b.id}
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
            borderLeft: `6px solid ${statusColor(b.status)}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              BR-{String(b.id).padStart(5, "0")}
            </div>
            <div style={{ fontWeight: 600, color: statusColor(b.status) }}>
              {b.status}
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <strong>Клиент:</strong> {b.client_name || "—"}
          </div>

          <div style={{ marginBottom: 6 }}>
            <strong>Мастер:</strong> {b.master_name || "—"}
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>Дата:</strong> {formatDate(b)}
          </div>

          <div
            style={{
              background: "#f5f5f5",
              borderRadius: 10,
              padding: 10,
              color: "#666",
              fontSize: 13,
            }}
          >
            Lifecycle действия (confirm/complete/cancel) временно доступны только
            через Odoo.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button disabled style={btnDisabled()}>
              Подтвердить (после Odoo)
            </button>
            <button disabled style={btnDisabled()}>
              Завершить (после Odoo)
            </button>
            <button disabled style={btnDisabled()}>
              Отменить (после Odoo)
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function btnDisabled() {
  return {
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    background: "#bbb",
    color: "#fff",
    cursor: "not-allowed",
    fontWeight: 600,
    opacity: 0.7,
  };
}