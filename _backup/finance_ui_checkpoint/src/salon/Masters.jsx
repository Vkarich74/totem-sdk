// src/salon/Masters.jsx
import { useEffect, useState } from "react";
import { fetchSalonMasters } from "../api/salonMasters";

const SALON_SLUG = "totem-demo-salon";

export default function Masters() {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSalonMasters(SALON_SLUG);
      setMasters(data);
    } catch (err) {
      console.error("SALON_MASTERS_LOAD_ERROR", err);
      setError("Ошибка загрузки мастеров");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Мастера</h2>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && masters.length === 0 && (
        <p>Мастеров нет.</p>
      )}

      {!loading &&
        !error &&
        masters.map((master) => (
          <MasterCard key={master.id} master={master} />
        ))}
    </div>
  );
}

function MasterCard({ master }) {
  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <strong>{master.name}</strong>
        <span
          style={{
            ...styles.status,
            backgroundColor: master.active ? "#16a34a" : "#dc2626",
          }}
        >
          {master.active ? "Активен" : "Не активен"}
        </span>
      </div>

      <div style={styles.slug}>Slug: {master.slug}</div>
    </div>
  );
}

const styles = {
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
  slug: {
    fontSize: "13px",
    color: "#555",
  },
};