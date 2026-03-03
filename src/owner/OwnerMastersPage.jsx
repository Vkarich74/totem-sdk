import { useEffect, useState } from "react";

const API = "https://api.totemv.com";

export default function OwnerMastersPage({ slug }) {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API}/internal/salons/${slug}/masters`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error("Ошибка загрузки мастеров");
        }

        const data = await res.json();

        // internal endpoint возвращает массив
        setMasters(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Ошибка");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return <div>Загрузка мастеров...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  if (masters.length === 0) {
    return <div>Мастеров нет</div>;
  }

  return (
    <div>
      <h2>Мастера</h2>

      {masters.map((m) => (
        <div
          key={m.id}
          style={{
            padding: 12,
            marginBottom: 10,
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        >
          <strong>{m.name}</strong>
          <div style={{ fontSize: 12, color: "#666" }}>
            Статус: {m.status}
          </div>
        </div>
      ))}
    </div>
  );
}