import { Outlet, Link } from "react-router-dom";

export default function AuthLayout(){
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
          padding: "24px 24px 0 24px",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>
            TOTEM Auth
          </div>

          <Link
            to="/"
            style={{
              color: "#374151",
              textDecoration: "none",
              fontSize: "14px"
            }}
          >
            На главную
          </Link>
        </div>

        <div
          style={{
            marginBottom: "16px",
            fontSize: "14px",
            color: "#6b7280",
            lineHeight: 1.5
          }}
        >
          Вход и восстановление доступа в кабинет салона или мастера.
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}
