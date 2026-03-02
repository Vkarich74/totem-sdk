// src/salon/Money.jsx
import { useEffect, useState } from "react";
import { fetchSalonBookings } from "../api/salonBookings";

const SALON_SLUG = "totem-demo-salon";

export default function Money() {
  const [bookings, setBookings] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    filterByDate();
  }, [from, to]);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSalonBookings(SALON_SLUG, {
        status: "completed",
      });

      setBookings(data);
    } catch (err) {
      console.error("MONEY_LOAD_ERROR", err);
      setError("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }

  function filterByDate() {
    // просто триггер рендера
    setBookings((prev) => [...prev]);
  }

  const filtered = bookings.filter((b) => {
    if (!from && !to) return true;

    const date = new Date(b.datetime_start);

    if (from) {
      const fromDate = new Date(from);
      if (date < fromDate) return false;
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }

    return true;
  });

  const total = filtered.reduce(
    (sum, b) => sum + Number(b.price || 0),
    0
  );

  return (
    <div>
      <h2>Деньги</h2>

      <div style={styles.filters}>
        <div>
          <label>С</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label>По</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={styles.total}>
            Итого: {formatKGS(total)}
          </div>

          {filtered.map((b) => (
            <div key={b.id} style={styles.card}>
              <div style={styles.row}>
                <strong>{b.client_name}</strong>
                <span>{formatKGS(b.price)}</span>
              </div>

              <div style={styles.sub}>
                {new Date(b.datetime_start).toLocaleDateString(
                  "ru-RU"
                )}{" "}
                — {b.master_name}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p>Записей нет.</p>
          )}
        </>
      )}
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
    gap: "20px",
    marginBottom: "16px",
  },
  total: {
    fontSize: "18px",
    fontWeight: "bold",
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
  },
  sub: {
    fontSize: "13px",
    color: "#555",
  },
};