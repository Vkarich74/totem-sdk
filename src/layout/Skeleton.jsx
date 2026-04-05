export default function Skeleton() {
  const container = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 20px",
  };

  const shimmer = {
    background: "linear-gradient(90deg,#eee,#ddd,#eee)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>

      <section style={{ padding: "100px 0" }}>
        <div style={container}>
          <div style={{ ...shimmer, height: 40, width: 300, margin: "0 auto 20px auto", borderRadius: 6 }} />
          <div style={{ ...shimmer, height: 20, width: 500, margin: "0 auto", borderRadius: 6 }} />
        </div>
      </section>

      <section style={{ padding: "60px 0" }}>
        <div style={container}>
          <div style={{ ...shimmer, height: 30, width: 200, marginBottom: 30, borderRadius: 6 }} />

          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            <div style={{ ...shimmer, height: 120, borderRadius: 12 }} />
            <div style={{ ...shimmer, height: 120, borderRadius: 12 }} />
            <div style={{ ...shimmer, height: 120, borderRadius: 12 }} />
          </div>
        </div>
      </section>
    </div>
  );
}