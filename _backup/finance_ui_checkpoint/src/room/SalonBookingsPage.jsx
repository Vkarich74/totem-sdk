import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = "https://api.totemv.com";

export default function SalonBookingsPage() {
  const [searchParams] = useSearchParams();

  const salonSlug =
    searchParams.get("salon") ||
    window.SALON_SLUG ||
    null;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!salonSlug) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/public/salons/${salonSlug}/bookings`
      );
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

  const lifecycle = async (id, action) => {
    try {
      const res = await fetch(
        `${API_BASE}/public/salons/${salonSlug}/bookings/${id}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "LIFECYCLE_FAILED");
      }

      // Локально обновляем статус
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: data.status } : b
        )
      );
    } catch (err) {
      console.error("LIFECYCLE_ERROR", err);
      alert("Не удалось изменить статус");
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "reserved":
        return "#f5a623";
      case "confirmed":
        return "#1976d2";
      case "completed":
        return "#2e7d32";
      case "cancelled":
        return "#d32f2f";
      default:
        return "#999";
    }
  };

  const formatDate = (booking) => {
    const iso = booking?.datetime_start || booking?.start_at;
    if (!iso) return "—";

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (!salonSlug) {
    return <div style={{ padding: 20 }}>Slug не найден</div>;
  }

  return (
    <div style={styles.wrapper}>
      <h2 style={{ marginBottom: 20 }}>Бронирования</h2>

      {loading && <div style={{ color: "#666" }}>Загрузка...</div>}

      {!loading && bookings.length === 0 && (
        <div style={{ color: "#666" }}>Нет бронирований</div>
      )}

      {bookings.map((b) => (
        <div
          key={b.id}
          style={{
            ...styles.card,
            borderLeft: `6px solid ${statusColor(b.status)}`
          }}
        >
          <div style={styles.header}>
            <div style={{ fontWeight: 700 }}>
              BR-{String(b.id).padStart(5, "0")}
            </div>
            <div style={{ fontWeight: 600, color: statusColor(b.status) }}>
              {b.status}
            </div>
          </div>

          <div><strong>Клиент:</strong> {b.client_name || "—"}</div>
          <div><strong>Мастер:</strong> {b.master_name || "—"}</div>
          <div style={{ marginBottom: 12 }}>
            <strong>Дата:</strong> {formatDate(b)}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {b.status !== "completed" && (
              <button
                style={styles.btnGreen}
                onClick={() => lifecycle(b.id, "complete")}
              >
                Завершить
              </button>
            )}

            {b.status !== "cancelled" && b.status !== "completed" && (
              <button
                style={styles.btnRed}
                onClick={() => lifecycle(b.id, "cancel")}
              >
                Отменить
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: 720,
    margin: "0 auto",
    padding: 20,
    fontFamily: "system-ui",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  btnGreen: {
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    background: "#2e7d32",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnRed: {
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    background: "#d32f2f",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};