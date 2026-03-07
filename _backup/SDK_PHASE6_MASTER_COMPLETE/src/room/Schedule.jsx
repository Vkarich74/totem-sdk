// src/room/Schedule.jsx
import { useEffect, useState } from "react";
import { loadSchedule } from "../api/schedule";

const MASTER_ID = 1;

export default function Schedule() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await loadSchedule(MASTER_ID);
      setItems(data);
    } catch (err) {
      console.error("SCHEDULE_LOAD_ERROR", err);
      setError("Ошибка загрузки расписания");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Расписание</h2>

      {loading && <p>Загрузка...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p>Записей нет.</p>
      )}

      {!loading &&
        !error &&
        items.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
    </div>
  );
}

function TimelineCard({ item }) {
  const start = new Date(item.start);
  const end = new Date(item.end);

  const statusMap = {
    confirmed: { text: "Подтверждено", color: "#2563eb" },
    completed: { text: "Завершено", color: "#16a34a" },
  };

  const config = statusMap[item.status];

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <strong>
          {item.client_name === "Unknown"
            ? "Клиент"
            : item.client_name}
        </strong>
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
      </div>

      <div>
        {item.service_name === "Service"
          ? "Услуга"
          : item.service_name}
      </div>

      <div style={styles.time}>
        {start.toLocaleDateString("ru-RU")}{" "}
        {start.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {" — "}
        {end.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      <div style={styles.price}>
        {formatKGS(item.price)}
      </div>
    </div>
  );
}

function formatKGS(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("ru-RU").format(value) + " сом";
}

const styles = {
  card: {
    border: "1px solid #eee",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  time: {
    fontSize: "13px",
    color: "#555",
    marginTop: "4px",
  },
  price: {
    marginTop: "6px",
    fontWeight: "bold",
  },
};