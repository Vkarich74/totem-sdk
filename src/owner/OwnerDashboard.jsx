import { useEffect, useState } from "react";
import { getSalon, getMetrics } from "../api/publicApi";

export default function OwnerDashboard({ slug }) {
  const [salon, setSalon] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        const salonData = await getSalon(slug);
        const metricsData = await getMetrics(slug);

        setSalon(salonData);
        setMetrics(metricsData);
      } catch (e) {
        console.error("OwnerDashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return <div style={{ padding: 40 }}>Загрузка Owner Dashboard...</div>;
  }

  if (!salon) {
    return <div style={{ padding: 40 }}>Салон не найден</div>;
  }

  const container = {
    maxWidth: 1200,
    margin: "40px auto",
    padding: "0 20px",
  };

  const card = {
    background: "#ffffff",
    padding: 30,
    borderRadius: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={container}>
        <div style={{ display: "flex", gap: 40 }}>

          {/* LEFT — SDK CORE */}
          <div style={{ flex: 1 }}>
            <div style={card}>
              <h2>{salon.name}</h2>
              <p style={{ opacity: 0.7 }}>{salon.description || "Описание отсутствует"}</p>

              <hr style={{ margin: "20px 0" }} />

              <p>
                <strong>Мастеров:</strong> {metrics?.masters || 0}
              </p>
              <p>
                <strong>Завершённых записей:</strong> {metrics?.completed || 0}
              </p>

              <div style={{ marginTop: 20 }}>
                <a href="#/bookings">Перейти к записям</a>
              </div>
            </div>
          </div>

          {/* RIGHT — CMS SLOT */}
          <div style={{ flex: 1 }}>
            <div style={card}>
              <div
                dangerouslySetInnerHTML={{
                  __html: window.SALON_CMS_HTML || "<p>Контент не задан.</p>",
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}