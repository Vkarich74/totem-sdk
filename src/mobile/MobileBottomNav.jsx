export default function MobileBottomNav({ items = [], activeKey = "" }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <nav style={navStyle} aria-label="Мобильная навигация">
      <div style={innerStyle}>
        {items.map((item) => {
          const key = String(item?.key || "").trim();
          const label = String(item?.label || "").trim();
          const href = String(item?.href || "").trim();
          const isActive = key && String(activeKey || "") === key;

          if (!key || !label || !href) {
            return null;
          }

          return (
            <a
              key={key}
              href={href}
              style={{
                ...itemStyle,
                color: isActive ? "#111827" : "#6b7280",
                fontWeight: isActive ? 800 : 600,
              }}
            >
              <span style={labelStyle}>{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

const navStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  background: "#ffffff",
  borderTop: "1px solid #e5e7eb",
  padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
  boxSizing: "border-box",
  maxWidth: "none",
};

const innerStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(44px, 1fr))",
  gap: 8,
  width: "100%",
};

const itemStyle = {
  minHeight: 44,
  padding: "8px 10px",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 13,
  lineHeight: 1.2,
  textAlign: "center",
};
