// src/salon/Bookings.jsx
import { useEffect, useState } from "react";
import { fetchSalonBookings } from "../api/salonBookings";
import { fetchSalonMasters } from "../api/salonMasters";

const SALON_SLUG = "totem-demo-salon";

export default function SalonBookings() {
  const [bookings, setBookings] = useState([]);
  const [masters, setMasters] = useState([]);
  const [status, setStatus] = useState("");
  const [masterId, setMasterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMasters();
    loadBookings();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [status, masterId]);

  async function loadMasters() {
    try {
      const data = await fetchSalonMasters(SALON_SLUG);
      setMasters(data);
    } catch (err) {
      console.error("MASTERS_LOAD_ERROR", err);
    }
  }

  async function loadBookings() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSalonBookings(SALON_SLUG, {
        status,
        master_id: masterId,
      });

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
      <h2>Записи салона</h2>

      <div style={styles.filters}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="confirmed">Подтверждено</option>
          <option value="completed">Завершено</option>
          <option value="cancelled">Отменено</option>
        </select>

        <select
          value={masterId}
          onChange={(e) => setMasterId(e.target.value)}
        >
          <option value="">Все мастера</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading &&
        !error &&
        bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}

      {!loading && !error && bookings.length === 0 && (
        <p>Записей нет.</p>
      )}
    </div>
  );
}

function BookingCard({ booking }) {
  const start = new Date(booking.datetime_start);
  const end = new Date(booking.datetime_end);

  const statusMap = {
    confirmed: { text: "Подтверждено", color: "#2563eb" },
    completed: { text: "Завершено", color: "#16a34a" },
    cancelled: { text: "Отменено", color: "#dc2626" },
  };

  const status = statusMap[booking.status];

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <strong>{booking.client_name}</strong>
        <span
          style={{
            ...styles.status,
            backgroundColor: status?.color || "#999",
          }}
        >
          {status?.text || booking.status}
        </span>
      </div>

      <div>{booking.service_name}</div>

      <div style={styles.sub}>
        Мастер: {booking.master_name}
      </div>

      <div style={styles.sub}>
        {start.toLocaleDateString("ru-RU")}{" "}
        {start.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        —{" "}
        {end.toLocaleTimeString("ru-RU", {
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

function formatKGS(amount) {
  const value = Number(amount) || 0;
  return (
    new Intl.NumberFormat("ru-RU").format(value) + " сом"
  );
}

const styles = {
  filters: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  card: {
    border: "1px solid #eee",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  status: {
    color: "white",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
  },
  sub: {
    fontSize: "13px",
    color: "#555",
  },
  price: {
    marginTop: "6px",
    fontWeight: "bold",
  },
};