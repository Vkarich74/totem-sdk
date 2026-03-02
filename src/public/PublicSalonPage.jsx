import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { getSalon, getMasters, getMetrics } from "../api/publicApi";
import { setMeta, setCanonical, setJSONLD } from "../api/seo";
import Skeleton from "../layout/Skeleton";

export default function PublicSalonPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [salon, setSalon] = useState(null);
  const [masters, setMasters] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNotFound(false);

      try {
        const salonData = await getSalon(slug);

        if (!salonData) {
          setNotFound(true);
          return;
        }

        const mastersData = await getMasters(slug);
        const metricsData = await getMetrics(slug);

        setSalon(salonData);
        setMasters(mastersData);
        setMetrics(metricsData);

        const description =
          salonData.description ||
          "Профессиональные услуги красоты. Онлайн запись без звонков.";

        document.title = `${salonData.name} | Онлайн запись`;

        setMeta("description", description);
        setMeta("og:title", salonData.name, true);
        setMeta("og:description", description, true);
        setMeta("og:type", "website", true);
        setCanonical(window.location.href);

        setJSONLD({
          "@context": "https://schema.org",
          "@type": "BeautySalon",
          name: salonData.name,
          description: description,
          url: window.location.href,
        });
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) return <Skeleton />;

  if (notFound || !salon) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <h1>404</h1>
        <p>Салон не найден</p>
      </div>
    );
  }

  const container = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 20px",
  };

  const ctaStyle = {
    padding: "16px 32px",
    borderRadius: 10,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
  };

  const goToBooking = () => {
    navigate(`/room/book?salon=${slug}`);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>
      {/* HERO */}
      <section
        style={{
          padding: "100px 0",
          background: "linear-gradient(135deg,#111,#333)",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={container}>
          <h1 style={{ fontSize: 36 }}>{salon.name}</h1>

          <p style={{ opacity: 0.85, maxWidth: 600, margin: "20px auto" }}>
            {salon.description ||
              "Профессиональные услуги красоты. Онлайн запись без звонков."}
          </p>

          <button
            onClick={goToBooking}
            style={{ ...ctaStyle, background: "white" }}
          >
            Записаться онлайн
          </button>
        </div>
      </section>

      {/* MASTERS */}
      <section style={{ padding: "80px 0", background: "#f5f5f5" }}>
        <div style={container}>
          <h2 style={{ textAlign: "center", marginBottom: 40 }}>
            Наши мастера
          </h2>

          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            }}
          >
            {masters.length === 0 && (
              <div style={{ textAlign: "center", opacity: 0.6 }}>
                Мастера пока не добавлены
              </div>
            )}

            {masters.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "white",
                  padding: 24,
                  borderRadius: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                <h3>{m.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section style={{ padding: "80px 0", textAlign: "center" }}>
        <div style={container}>
          <h2>Нам доверяют</h2>
          <div style={{ marginTop: 30 }}>
            <strong>{masters.length}</strong> мастеров •{" "}
            <strong>{metrics?.completed || 0}</strong> завершённых записей
          </div>
        </div>
      </section>

      {/* STICKY CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "white",
          padding: 16,
          boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <button
          onClick={goToBooking}
          style={{
            ...ctaStyle,
            width: "100%",
            background: "#111",
            color: "white",
          }}
        >
          Записаться онлайн
        </button>
      </div>
    </div>
  );
}