import React from "react";
import { mobileTokens } from "./mobileDesignTokens.js";

function mergeStyle(base, override) {
  return { ...base, ...(override || {}) };
}

function chipStyle(kind = "neutral") {
  const palette = {
    neutral: {
      background: mobileTokens.colors.surfaceAlt,
      color: mobileTokens.colors.text,
      borderColor: mobileTokens.colors.border,
    },
    primary: {
      background: mobileTokens.colors.accentSoft,
      color: mobileTokens.colors.primarySoft,
      borderColor: "#bfdbfe",
    },
    success: {
      background: "#dcfce7",
      color: mobileTokens.statusColors.active,
      borderColor: "#bbf7d0",
    },
    warning: {
      background: "#fef3c7",
      color: mobileTokens.statusColors.warning,
      borderColor: "#fde68a",
    },
    danger: {
      background: "#fee2e2",
      color: mobileTokens.statusColors.error,
      borderColor: "#fecaca",
    },
  };

  return palette[kind] || palette.neutral;
}

export function MobileShell({ children, style }) {
  return (
    <div
      style={mergeStyle(
        {
          minHeight: "100vh",
          background: mobileTokens.colors.pageBg,
          color: mobileTokens.colors.text,
          padding: mobileTokens.spacing.lg,
          boxSizing: "border-box",
        },
        style
      )}
    >
      {children}
    </div>
  );
}

export function MobileTopBar({ title = "Мобильная витрина", subtitle = "", right = null, style }) {
  return (
    <div
      style={mergeStyle(
        {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: mobileTokens.spacing.lg,
          marginBottom: mobileTokens.spacing.xl,
        },
        style
      )}
    >
      <div>
        <div style={mobileTokens.typography.pageTitle}>{title}</div>
        {subtitle ? (
          <div style={{ ...mobileTokens.typography.body, color: mobileTokens.colors.textMuted, marginTop: 6 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {right}
    </div>
  );
}

export function MobileHero({ title, subtitle = "", eyebrow = "TOTEM", actions = null, style }) {
  return (
    <section
      style={mergeStyle(
        {
          padding: mobileTokens.spacing.xl,
          borderRadius: mobileTokens.radius.xl,
          background: mobileTokens.gradients.hero,
          color: "#ffffff",
          boxShadow: mobileTokens.shadow.lg,
        },
        style
      )}
    >
      <div style={{ ...mobileTokens.typography.caption, opacity: 0.84, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {eyebrow}
      </div>
      <h1 style={{ ...mobileTokens.typography.pageTitle, margin: "10px 0 0" }}>{title}</h1>
      {subtitle ? (
        <div style={{ ...mobileTokens.typography.body, marginTop: 10, opacity: 0.92 }}>{subtitle}</div>
      ) : null}
      {actions ? <div style={{ marginTop: mobileTokens.spacing.lg }}>{actions}</div> : null}
    </section>
  );
}

export function MobileSection({ title, subtitle = "", action = null, children, style }) {
  return (
    <section
      style={mergeStyle(
        {
          marginTop: mobileTokens.spacing.xl,
        },
        style
      )}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: mobileTokens.spacing.md }}>
        <div>
          <div style={mobileTokens.typography.sectionTitle}>{title}</div>
          {subtitle ? (
            <div style={{ ...mobileTokens.typography.body, color: mobileTokens.colors.textMuted, marginTop: 4 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {action}
      </div>
      <div style={{ marginTop: mobileTokens.spacing.md }}>{children}</div>
    </section>
  );
}

export function MobileCard({ title, subtitle = "", children, footer = null, style }) {
  return (
    <div
      style={mergeStyle(
        {
          background: mobileTokens.colors.surface,
          border: `1px solid ${mobileTokens.colors.border}`,
          borderRadius: mobileTokens.radius.lg,
          padding: mobileTokens.spacing.lg,
          boxShadow: mobileTokens.shadow.sm,
        },
        style
      )}
    >
      {title ? <div style={mobileTokens.typography.cardTitle}>{title}</div> : null}
      {subtitle ? (
        <div style={{ ...mobileTokens.typography.body, color: mobileTokens.colors.textMuted, marginTop: 6 }}>
          {subtitle}
        </div>
      ) : null}
      {children ? <div style={{ marginTop: mobileTokens.spacing.md }}>{children}</div> : null}
      {footer ? <div style={{ marginTop: mobileTokens.spacing.md }}>{footer}</div> : null}
    </div>
  );
}

export function MobileButton({ children, tone = "primary", href, onClick, type = "button", style, disabled = false }) {
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: mobileTokens.touchTargets.minHeight,
    padding: "0 16px",
    borderRadius: mobileTokens.radius.pill,
    border: "1px solid transparent",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };

  const tones = {
    primary: { background: mobileTokens.colors.primary, color: "#ffffff" },
    secondary: { background: mobileTokens.colors.surface, color: mobileTokens.colors.text, borderColor: mobileTokens.colors.border },
    soft: { background: mobileTokens.colors.accentSoft, color: mobileTokens.colors.primarySoft },
    danger: { background: "#fee2e2", color: mobileTokens.colors.danger },
  };

  const resolved = mergeStyle(baseStyle, tones[tone] || tones.primary);

  if (href) {
    return (
      <a href={href} style={mergeStyle(resolved, style)}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} style={mergeStyle(resolved, style)} disabled={disabled}>
      {children}
    </button>
  );
}

export function MobileBadge({ children, tone = "neutral", style }) {
  const colors = chipStyle(tone);
  return (
    <span
      style={mergeStyle(
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: mobileTokens.radius.pill,
          border: `1px solid ${colors.borderColor}`,
          background: colors.background,
          color: colors.color,
          ...mobileTokens.typography.caption,
        },
        style
      )}
    >
      {children}
    </span>
  );
}

export function MobilePill(props) {
  return <MobileBadge {...props} />;
}

export function MobileSearchBox({ value = "", placeholder = "Поиск", onChange, onSubmit, style }) {
  return (
    <form
      onSubmit={onSubmit}
      style={mergeStyle(
        {
          display: "flex",
          gap: mobileTokens.spacing.sm,
          alignItems: "center",
        },
        style
      )}
    >
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          flex: 1,
          minHeight: mobileTokens.touchTargets.minHeight,
          padding: "0 14px",
          borderRadius: mobileTokens.radius.pill,
          border: `1px solid ${mobileTokens.colors.border}`,
          background: mobileTokens.colors.surface,
          color: mobileTokens.colors.text,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </form>
  );
}

export function MobileEmptyState({ title = "Ничего не найдено", description = "Попробуйте изменить фильтр.", action = null, style }) {
  return (
    <div
      style={mergeStyle(
        {
          padding: mobileTokens.spacing.xl,
          borderRadius: mobileTokens.radius.lg,
          background: mobileTokens.colors.surface,
          border: `1px dashed ${mobileTokens.colors.border}`,
          textAlign: "center",
        },
        style
      )}
    >
      <div style={mobileTokens.typography.sectionTitle}>{title}</div>
      <div style={{ ...mobileTokens.typography.body, color: mobileTokens.colors.textMuted, marginTop: 8 }}>
        {description}
      </div>
      {action ? <div style={{ marginTop: mobileTokens.spacing.lg }}>{action}</div> : null}
    </div>
  );
}

export function MobileBottomNav({ items = [], activeKey = "", style }) {
  return (
    <nav
      style={mergeStyle(
        {
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
          gap: 8,
          padding: 8,
          borderRadius: mobileTokens.radius.xl,
          background: mobileTokens.colors.surface,
          border: `1px solid ${mobileTokens.colors.border}`,
          boxShadow: mobileTokens.shadow.md,
        },
        style
      )}
    >
      {items.map((item) => {
        const active = String(item?.key || "") === String(activeKey || "");
        return (
          <a
            key={item.key || item.label}
            href={item.href || "#"}
            style={{
              minHeight: 44,
              padding: "10px 12px",
              borderRadius: mobileTokens.radius.md,
              background: active ? mobileTokens.colors.primary : mobileTokens.colors.surfaceAlt,
              color: active ? "#ffffff" : mobileTokens.colors.text,
              textDecoration: "none",
              textAlign: "center",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {item.label || item.key || "Пункт"}
          </a>
        );
      })}
    </nav>
  );
}

export function MobileStepper({ steps = [], activeIndex = 0, style }) {
  return (
    <div
      style={mergeStyle(
        {
          display: "grid",
          gap: 8,
        },
        style
      )}
    >
      {steps.map((step, index) => {
        const active = index === activeIndex;
        return (
          <div
            key={step.key || step.label || index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: mobileTokens.radius.md,
              border: `1px solid ${active ? mobileTokens.colors.accent : mobileTokens.colors.border}`,
              background: active ? mobileTokens.colors.accentSoft : mobileTokens.colors.surface,
            }}
          >
            <MobileBadge tone={active ? "primary" : "neutral"}>{index + 1}</MobileBadge>
            <div>
              <div style={mobileTokens.typography.cardTitle}>{step.label || `Шаг ${index + 1}`}</div>
              {step.description ? (
                <div style={{ ...mobileTokens.typography.body, color: mobileTokens.colors.textMuted, marginTop: 4 }}>
                  {step.description}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MobileStatCard({ label, value, note = "", tone = "neutral", style }) {
  const colors = chipStyle(tone);
  return (
    <div
      style={mergeStyle(
        {
          padding: mobileTokens.spacing.lg,
          borderRadius: mobileTokens.radius.lg,
          background: mobileTokens.colors.surface,
          border: `1px solid ${mobileTokens.colors.border}`,
        },
        style
      )}
    >
      <div style={{ ...mobileTokens.typography.caption, color: colors.color }}>{label}</div>
      <div style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {note ? (
        <div style={{ ...mobileTokens.typography.body, color: mobileTokens.colors.textMuted, marginTop: 6 }}>
          {note}
        </div>
      ) : null}
    </div>
  );
}
