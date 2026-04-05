// src/room/Clients.jsx
import { useEffect, useState } from "react";
import { fetchClients } from "../api/clients";

const MASTER_ID = 1;

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    applySearch();
  }, [search, clients]);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchClients(MASTER_ID);
      setClients(data);
      setFiltered(data);
    } catch (err) {
      console.error("CLIENTS_LOAD_ERROR", err);
      setError("Ошибка загрузки клиентов");
    } finally {
      setLoading(false);
    }
  }

  function applySearch() {
    if (!search.trim()) {
      setFiltered(clients);
      return;
    }

    const lower = search.toLowerCase();

    const result = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.phone && c.phone.includes(lower))
    );

    setFiltered(result);
  }

  return (
    <div>
      <h2>Клиенты</h2>

      <input
        type="text"
        placeholder="Поиск по имени или телефону"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.input}
      />

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>Клиентов нет.</p>
      )}

      {!loading &&
        !error &&
        filtered.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
    </div>
  );
}

function ClientCard({ client }) {
  const lastVisit = client.last_visit
    ? new Date(client.last_visit)
    : null;

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <strong>{client.name}</strong>
        <span style={styles.visits}>
          {client.visits_count} визит(ов)
        </span>
      </div>

      {client.phone && (
        <div style={styles.phone}>📞 {client.phone}</div>
      )}

      {lastVisit && (
        <div style={styles.date}>
          Последний визит:{" "}
          {lastVisit.toLocaleDateString("ru-RU")}{" "}
          {lastVisit.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      <div style={styles.spent}>
        Всего потрачено: {formatKGS(client.total_spent)}
      </div>
    </div>
  );
}

function formatKGS(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("ru-RU").format(value) + " сом";
}

const styles = {
  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "16px",
    border: "1px solid #ccc",
    borderRadius: "6px",
  },
  card: {
    border: "1px solid #eee",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  visits: {
    fontSize: "13px",
    color: "#555",
  },
  phone: {
    fontSize: "14px",
    marginBottom: "4px",
  },
  date: {
    fontSize: "13px",
    color: "#555",
    marginBottom: "4px",
  },
  spent: {
    fontWeight: "bold",
  },
};