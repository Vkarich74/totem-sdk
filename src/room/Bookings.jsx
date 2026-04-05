// src/room/Bookings.jsx
import { useEffect, useState } from "react";
import { fetchBookings } from "../api/bookings";

const MASTER_ID = 1;

export default function Bookings() {
  const [status, setStatus] = useState("confirmed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    load();
  }, [status]);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchBookings(MASTER_ID, status);
      setBookings(data);
    } catch (err) {
      console.error("BOOKINGS_LOAD_ERROR", err);
      setError("Ошибка загрузки записей");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Записи</h2>

      <div style={styles.toggle}>
        <button
          style={status === "confirmed" ? styles.activeBtn : styles.btn}
          onClick={() => setStatus("confirmed")}
        >
          Подтверждено
        </button>

        <button
          style={status === "completed" ? styles.activeBtn : styles.btn}
          onClick={() => setStatus("completed")}
        >
          Завершено
        </button>
      </div>

      {loading && <p>Загрузка...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p>Записей пока нет.</p>
      )}

      {!loading &&
        !error &&
        bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
    </div>
  );
}

function BookingCard({ booking }) {
  const date = new Date(booking.datetime_start);

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <strong>
          {booking.client_name === "Unknown"
            ? "Клиент"
            : booking.client_name}
        </strong>
        <StatusBadge status={booking.status} />
      </div>

      <div>
        {booking.service_name === "Service"
          ? "Услуга"
          : booking.service_name}
      </div>

      <div style={styles.date}>
        {date.toLocaleDateString("ru-RU")}{" "}
        {date.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      <div style={styles.price}>
        {formatKGS(booking.price)}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    confirmed: { text: "Подтверждено", color: "#2563eb" },
    completed: { text: "Завершено", color: "#16a34a" },
  };

  const config = map[status];

  return (
    <span
      style={{
        backgroundColor: config.color,
        color: "white",
        padding: "4px 8px",
        borderRadius: "12px",
        fontSize: "12px",
      }}
    >
      {config.text}
    </span>
  );
}

function formatKGS(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("ru-RU").format(value) + " сом";
}

const styles = {
  toggle: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  btn: {
    padding: "6px 12px",
    border: "1px solid #ccc",
    background: "white",
    cursor: "pointer",
  },
  activeBtn: {
    padding: "6px 12px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },
  card: {
    border: "1px solid #eee",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  date: {
    fontSize: "13px",
    color: "#555",
  },
  price: {
    marginTop: "6px",
    fontWeight: "bold",
  },
};