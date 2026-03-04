import { Outlet, useNavigate } from "react-router-dom";

export default function OwnerLayout() {
  const navigate = useNavigate();

  const wrapper = {
    maxWidth: 1400,
    margin: "40px auto",
    padding: "0 20px",
    fontFamily: "system-ui, sans-serif",
  };

  const layout = {
    display: "flex",
    gap: 30,
  };

  const sidebar = {
    flex: "0 0 20%",
    background: "#fff",
    padding: 20,
    borderRadius: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  };

  const content = {
    flex: "0 0 55%",
  };

  const cms = {
    flex: "0 0 25%",
    background: "#fff",
    padding: 20,
    borderRadius: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  };

  const button = {
    display: "block",
    width: "100%",
    padding: 10,
    marginBottom: 10,
    cursor: "pointer",
  };

  return (
    <div style={wrapper}>
      <div style={layout}>

        {/* LEFT MENU */}
        <div style={sidebar}>
          <button style={button} onClick={() => navigate("/owner")}>
            Dashboard
          </button>

          <button style={button} onClick={() => navigate("/owner/calendar")}>
            Календарь
          </button>

          <button style={button} onClick={() => navigate("/owner/masters")}>
            Мастера
          </button>

          <button style={button} onClick={() => navigate("/owner/clients")}>
            Клиенты
          </button>

          <button style={button} onClick={() => navigate("/owner/bookings")}>
            Записи
          </button>
        </div>

        {/* CENTER SDK */}
        <div style={content}>
          <Outlet />
        </div>

        {/* RIGHT CMS */}
        <div style={cms}>
          <div
            dangerouslySetInnerHTML={{
              __html:
                window.SALON_CMS_HTML ||
                "<p>Информация владельцу.</p>",
            }}
          />
        </div>

      </div>
    </div>
  );
}