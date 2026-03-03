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
        const res = await fetch(`${API}/public/salons/${slug}/masters`);
        const data = await res.json();

        if (!res.ok) throw new Error("Ошибка загрузки мастеров");

        setMasters(data.masters || []);
      } catch (e) {
        setError(e.message);
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
        </div>
      ))}
    </div>
  );
}