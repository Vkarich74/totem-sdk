import { useEffect, useState } from "react";
import { getSalon, getMetrics } from "../api/publicApi";

export default function OwnerDashboard({ slug }) {
  const [salon, setSalon] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      const salonData = await getSalon(slug);
      const metricsData = await getMetrics(slug);

      setSalon(salonData);
      setMetrics(metricsData);
    }

    load();
  }, [slug]);

  if (!salon) {
    return <div style={{ padding: 40 }}>Загрузка...</div>;
  }

  const container = {
    maxWidth: 1200,
    margin: "40px auto",
    padding: "0 20px",
  };

  const card = {
    background: "white",
    padding: 30,
    borderRadius: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={container}>
        <div style={{ display: "flex", gap: 40 }}>

          {/* LEFT — SDK CORE (50%) */}
          <div style={{ flex: 1 }}>
            <div style={card}>
              <h2>{salon.name}</h2>
              <p style={{ opacity: 0.7 }}>{salon.description}</p>

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

          {/* RIGHT — CMS SLOT (50%) */}
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