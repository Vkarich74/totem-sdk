import MobileBottomNav from "./MobileBottomNav.jsx";

function getCardTone(key) {
  if (key === "booking") return { background: "#eff6ff", border: "#bfdbfe", accent: "#1d4ed8" };
  if (key === "calendar") return { background: "#ecfeff", border: "#a5f3fc", accent: "#0f766e" };
  if (key === "finance") return { background: "#fefce8", border: "#fde68a", accent: "#a16207" };
  return { background: "#f5f3ff", border: "#ddd6fe", accent: "#7c3aed" };
}

function MobileAdminCard({ title, subtitle, href, actionLabel = "Открыть", toneKey = "stats" }) {
  const tone = getCardTone(toneKey);

  return (
    <a
      href={href}
      style={{
        ...cardStyle,
        background: tone.background,
        borderColor: tone.border,
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: tone.accent,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{subtitle}</div>
        <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.45, wordBreak: "break-word" }}>{href}</div>
      </div>
      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: tone.accent }}>{actionLabel}</div>
    </a>
  );
}

export default function MobileAdminTemplate({
  title,
  subtitle,
  roleLabel,
  identityLabel,
  cards = [],
  bottomNavItems = [],
  activeKey = "",
}) {
  const safeTitle = String(title || "").trim() || "Мобильная админка";
  const safeSubtitle = String(subtitle || "").trim();
  const safeRoleLabel = String(roleLabel || "").trim();
  const safeIdentityLabel = String(identityLabel || "").trim();
  const hasCards = Array.isArray(cards) && cards.length > 0;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div style={badgeRowStyle}>
            <span style={badgeStyle}>{safeTitle}</span>
            {safeRoleLabel ? <span style={roleBadgeStyle}>{safeRoleLabel}</span> : null}
          </div>
          <h1 style={titleStyle}>{safeTitle}</h1>
          {safeSubtitle ? <p style={subtitleStyle}>{safeSubtitle}</p> : null}
          {safeIdentityLabel ? <div style={slugPillStyle}>{safeIdentityLabel}</div> : null}
        </header>

        {hasCards ? (
          <section style={gridStyle}>
            {cards.map((card) => {
              const key = String(card?.key || "").trim();
              const href = String(card?.href || "").trim();
              const cardTitle = String(card?.title || "").trim();
              const cardSubtitle = String(card?.subtitle || "").trim();
              const actionLabel = String(card?.actionLabel || "Открыть").trim();
              const toneKey = String(card?.toneKey || key || "stats").trim();

              if (!key || !href || !cardTitle || !cardSubtitle) {
                return null;
              }

              return (
                <MobileAdminCard
                  key={key}
                  title={cardTitle}
                  subtitle={cardSubtitle}
                  href={href}
                  actionLabel={actionLabel}
                  toneKey={toneKey}
                />
              );
            })}
          </section>
        ) : (
          <section style={emptyStyle}>Нет доступных разделов.</section>
        )}
      </div>

      <MobileBottomNav items={bottomNavItems} activeKey={activeKey} />
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  padding: "20px 16px 96px",
  boxSizing: "border-box",
};

const containerStyle = {
  maxWidth: 720,
  margin: "0 auto",
  display: "grid",
  gap: 16,
};

const headerStyle = {
  display: "grid",
  gap: 10,
  padding: 20,
  borderRadius: 20,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const badgeRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 800,
};

const roleBadgeStyle = {
  ...badgeStyle,
  background: "#ede9fe",
  color: "#6d28d9",
};

const slugPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#374151",
  fontSize: 12,
  fontWeight: 700,
};

const titleStyle = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.1,
  color: "#111827",
};

const subtitleStyle = {
  margin: 0,
  color: "#4b5563",
  fontSize: 15,
  lineHeight: 1.55,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

const emptyStyle = {
  border: "1px dashed #cbd5e1",
  borderRadius: 18,
  padding: 20,
  color: "#64748b",
  background: "#fff",
  fontSize: 14,
};

const cardStyle = {
  minHeight: 160,
  padding: 18,
  borderRadius: 18,
  border: "1px solid transparent",
  textDecoration: "none",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};
