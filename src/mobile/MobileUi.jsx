import React from "react";

const UI = {
  colors: {
    pageBg: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceAlt: "#F8FAFC",
    text: "#0F172A",
    muted: "#64748B",
    border: "#E5E7EB",
    primary: "#6C4CF1",
    primaryDark: "#5B4CF1",
    accent: "#14C8C8",
    accentSoft: "#ECFEFF",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",
    softPrimary: "#F5F3FF",
    softSurface: "#FFFFFF",
  },
  radius: {
    card: 20,
    button: 16,
    chip: 16,
    pill: 999,
    xl: 24,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  heights: {
    primaryButton: 56,
    secondaryButton: 48,
    chip: 32,
    touch: 44,
  },
  shadow: {
    soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.06)",
    medium: "0 12px 30px rgba(15, 23, 42, 0.08)",
    hero: "0 20px 40px rgba(108, 76, 241, 0.18)",
  },
  typography: {
    pageTitle: { fontSize: 30, lineHeight: 1.08, fontWeight: 800, letterSpacing: -0.4 },
    sectionTitle: { fontSize: 20, lineHeight: 1.15, fontWeight: 800, letterSpacing: -0.2 },
    cardTitle: { fontSize: 17, lineHeight: 1.25, fontWeight: 800, letterSpacing: -0.15 },
    body: { fontSize: 14, lineHeight: 1.55, fontWeight: 400 },
    caption: { fontSize: 12, lineHeight: 1.45, fontWeight: 600 },
    tiny: { fontSize: 11, lineHeight: 1.35, fontWeight: 600 },
  },
};

function mergeStyle(base, override) {
  return { ...base, ...(override || {}) };
}

function mergeClassName(className, extra) {
  return [className, extra].filter(Boolean).join(" ") || undefined;
}

function toneChip(kind = "neutral") {
  const palette = {
    neutral: {
      background: "#F8FAFC",
      color: UI.colors.text,
      borderColor: UI.colors.border,
    },
    primary: {
      background: UI.colors.softPrimary,
      color: UI.colors.primaryDark,
      borderColor: "#E4D7FF",
    },
    accent: {
      background: UI.colors.accentSoft,
      color: UI.colors.accent,
      borderColor: "#BFF7F7",
    },
    success: {
      background: "#DCFCE7",
      color: UI.colors.success,
      borderColor: "#BBF7D0",
    },
    warning: {
      background: "#FEF3C7",
      color: UI.colors.warning,
      borderColor: "#FDE68A",
    },
    danger: {
      background: "#FEE2E2",
      color: UI.colors.danger,
      borderColor: "#FECACA",
    },
  };

  return palette[kind] || palette.neutral;
}

function buttonTone(kind = "primary") {
  const palette = {
    primary: {
      background: UI.colors.primary,
      color: "#FFFFFF",
      borderColor: UI.colors.primary,
      boxShadow: "0 10px 22px rgba(108, 76, 241, 0.18)",
      minHeight: UI.heights.primaryButton,
    },
    secondary: {
      background: "#FFFFFF",
      color: UI.colors.text,
      borderColor: UI.colors.border,
      boxShadow: "none",
      minHeight: UI.heights.secondaryButton,
    },
    soft: {
      background: UI.colors.softPrimary,
      color: UI.colors.primaryDark,
      borderColor: "#E4D7FF",
      boxShadow: "none",
      minHeight: UI.heights.secondaryButton,
    },
    accent: {
      background: UI.colors.accentSoft,
      color: UI.colors.accent,
      borderColor: "#BFF7F7",
      boxShadow: "none",
      minHeight: UI.heights.secondaryButton,
    },
    danger: {
      background: "#FEE2E2",
      color: UI.colors.danger,
      borderColor: "#FECACA",
      boxShadow: "none",
      minHeight: UI.heights.secondaryButton,
    },
    ghost: {
      background: "transparent",
      color: UI.colors.text,
      borderColor: "transparent",
      boxShadow: "none",
      minHeight: UI.heights.secondaryButton,
    },
  };

  return palette[kind] || palette.primary;
}

function panelStyle(extra = {}) {
  return mergeStyle(
    {
      background: UI.colors.surface,
      border: `1px solid ${UI.colors.border}`,
      borderRadius: UI.radius.card,
      padding: UI.spacing.xl,
      boxShadow: UI.shadow.soft,
      boxSizing: "border-box",
    },
    extra
  );
}

function softRowStyle(extra = {}) {
  return mergeStyle(
    {
      background: UI.colors.surfaceAlt,
      border: `1px solid ${UI.colors.border}`,
      borderRadius: UI.radius.card,
      padding: UI.spacing.lg,
      boxSizing: "border-box",
    },
    extra
  );
}

function createActionHandler({ href, onClick, disabled }) {
  return (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    if (typeof onClick === "function") {
      onClick(event);
    }

    if (href && event.defaultPrevented) {
      return;
    }
  };
}

export function TotemAppFrame({ children, style, className }) {
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          minHeight: "100vh",
          background: UI.colors.pageBg,
          color: UI.colors.text,
          boxSizing: "border-box",
          padding: UI.spacing.lg,
        },
        style
      )}
    >
      {children}
    </div>
  );
}

export function MobileShell({ children, style, className }) {
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          minHeight: "100vh",
          background: UI.colors.pageBg,
          color: UI.colors.text,
          boxSizing: "border-box",
          padding: UI.spacing.lg,
        },
        style
      )}
    >
      {children}
    </div>
  );
}

export function TotemHeader({ title = "TOTEM", subtitle = "", location = "", status = "", right = null, style, className }) {
  return (
    <header
      className={className}
      style={mergeStyle(
        {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: UI.spacing.lg,
          width: "100%",
          boxSizing: "border-box",
        },
        style
      )}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: UI.spacing.md, minWidth: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(135deg, #6C4CF1 0%, #14C8C8 100%)",
            boxShadow: UI.shadow.medium,
            flex: "0 0 auto",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={UI.typography.sectionTitle}>{title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {subtitle ? (
              <span style={{ ...UI.typography.body, color: UI.colors.muted }}>
                {subtitle}
              </span>
            ) : null}
            {location ? <MobileLocationPill>{location}</MobileLocationPill> : null}
            {status ? <MobileBadge tone="primary">{status}</MobileBadge> : null}
          </div>
        </div>
      </div>
      {right}
    </header>
  );
}

export function MobileTopBar({ title = "Мобильная витрина", subtitle = "", right = null, style, className }) {
  return <TotemHeader className={className} title={title} subtitle={subtitle} right={right} style={style} />;
}

export function TotemLocationPill({ children = "Локация", style, className }) {
  return (
    <span
      className={className}
      style={mergeStyle(
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minHeight: UI.heights.chip,
          padding: "0 12px",
          borderRadius: UI.radius.pill,
          background: UI.colors.softPrimary,
          border: `1px solid #E4D7FF`,
          color: UI.colors.primaryDark,
          ...UI.typography.caption,
          whiteSpace: "nowrap",
        },
        style
      )}
    >
      {children}
    </span>
  );
}

export function TotemIconButton({
  children,
  href,
  onClick,
  disabled = false,
  title = "",
  ariaLabel = "",
  style,
  className,
  target,
  rel,
}) {
  const baseStyle = {
    width: 44,
    height: 44,
    borderRadius: UI.radius.button,
    border: `1px solid ${UI.colors.border}`,
    background: UI.colors.surface,
    color: UI.colors.text,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: UI.shadow.soft,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    textDecoration: "none",
    boxSizing: "border-box",
  };

  const resolvedStyle = mergeStyle(baseStyle, style);

  if (href) {
    return (
      <a
        className={className}
        href={disabled ? undefined : href}
        target={target}
        rel={rel || (target === "_blank" ? "noreferrer" : undefined)}
        aria-label={ariaLabel || title || "Кнопка"}
        title={title}
        onClick={createActionHandler({ href, onClick, disabled })}
        aria-disabled={disabled ? "true" : undefined}
        style={mergeStyle(resolvedStyle, disabled ? { pointerEvents: "none" } : null)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={className}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || title || "Кнопка"}
      style={resolvedStyle}
    >
      {children}
    </button>
  );
}

export function MobileHero({ title, subtitle = "", eyebrow = "TOTEM", actions = null, style, className }) {
  return (
    <section
      className={className}
      style={mergeStyle(
        {
          padding: UI.spacing.xl,
          borderRadius: UI.radius.card,
          background: "linear-gradient(135deg, #6C4CF1 0%, #5B4CF1 55%, #14C8C8 100%)",
          color: "#FFFFFF",
          boxShadow: UI.shadow.hero,
          boxSizing: "border-box",
        },
        style
      )}
    >
      <div style={{ ...UI.typography.tiny, opacity: 0.84, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {eyebrow}
      </div>
      <h1 style={{ ...UI.typography.pageTitle, margin: "10px 0 0" }}>{title}</h1>
      {subtitle ? (
        <div style={{ ...UI.typography.body, marginTop: 10, opacity: 0.94 }}>{subtitle}</div>
      ) : null}
      {actions ? <div style={{ marginTop: UI.spacing.lg, display: "flex", flexWrap: "wrap", gap: 12 }}>{actions}</div> : null}
    </section>
  );
}

export function TotemHeroBanner({ eyebrow = "TOTEM", title, subtitle = "", actions = null, highlights = null, style, className }) {
  return (
    <MobileHero
      className={className}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={
        <div style={{ display: "grid", gap: UI.spacing.md }}>
          {actions ? <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{actions}</div> : null}
          {highlights ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{highlights}</div> : null}
        </div>
      }
      style={style}
    />
  );
}

export function MobileSection({ title, subtitle = "", action = null, children, style, className }) {
  return (
    <section
      className={className}
      style={mergeStyle(
        {
          marginTop: UI.spacing.xl,
        },
        style
      )}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: UI.spacing.md }}>
        <div>
          <div style={UI.typography.sectionTitle}>{title}</div>
          {subtitle ? (
            <div style={{ ...UI.typography.body, color: UI.colors.muted, marginTop: 6 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {action}
      </div>
      <div style={{ marginTop: UI.spacing.md }}>{children}</div>
    </section>
  );
}

export function MobileCard({ title, subtitle = "", children, footer = null, style, className, eyebrow = null, actions = null }) {
  return (
    <div className={className} style={panelStyle(style)}>
      {eyebrow ? (
        <div style={{ ...UI.typography.tiny, color: UI.colors.primary, textTransform: "uppercase", letterSpacing: 0.7 }}>
          {eyebrow}
        </div>
      ) : null}
      {title ? <div style={{ ...UI.typography.cardTitle, marginTop: eyebrow ? 6 : 0 }}>{title}</div> : null}
      {subtitle ? (
        <div style={{ ...UI.typography.body, color: UI.colors.muted, marginTop: 6 }}>
          {subtitle}
        </div>
      ) : null}
      {actions ? <div style={{ marginTop: UI.spacing.md, display: "flex", flexWrap: "wrap", gap: 10 }}>{actions}</div> : null}
      {children ? <div style={{ marginTop: UI.spacing.md }}>{children}</div> : null}
      {footer ? <div style={{ marginTop: UI.spacing.md }}>{footer}</div> : null}
    </div>
  );
}

export function TotemSalonCard({
  name = "Салон",
  slug = "",
  city = "",
  badge = "",
  summary = "",
  chips = [],
  actions = [],
  footer = null,
  children = null,
  style,
  className,
}) {
  return (
    <MobileCard
      className={className}
      title={name}
      subtitle={slug || city ? [slug, city].filter(Boolean).join(" · ") : ""}
      style={style}
      actions={
        chips.length ? (
          <>
            {chips.map((chip, index) => (
              <MobileBadge key={`${slug || name}-chip-${index}`} tone={chip.tone || "neutral"}>
                {chip.label ?? chip}
              </MobileBadge>
            ))}
          </>
        ) : null
      }
      footer={
        <div style={{ display: "grid", gap: UI.spacing.md }}>
          {summary ? <div style={{ ...UI.typography.body, color: UI.colors.muted }}>{summary}</div> : null}
          {children}
          {actions.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {actions.map((action, index) =>
                action?.href ? (
                  <MobileButton
                    key={`${slug || name}-action-${index}`}
                    href={action.href}
                    tone={action.tone || "secondary"}
                    disabled={Boolean(action.disabled)}
                    onClick={action.onClick}
                    target={action.target}
                    rel={action.rel}
                  >
                    {action.label || "Открыть"}
                  </MobileButton>
                ) : (
                  <MobileButton
                    key={`${slug || name}-action-${index}`}
                    tone={action.tone || "secondary"}
                    disabled={Boolean(action.disabled)}
                    onClick={action.onClick}
                  >
                    {action.label || "Открыть"}
                  </MobileButton>
                )
              )}
            </div>
          ) : null}
          {footer}
          {badge ? <MobileBadge tone="primary">{badge}</MobileBadge> : null}
        </div>
      }
    />
  );
}

export function TotemServiceCard({
  name = "Услуга",
  price = "",
  duration = "",
  description = "",
  tags = [],
  actions = [],
  footer = null,
  style,
  className,
}) {
  return (
    <MobileCard
      className={className}
      title={name}
      subtitle={description}
      style={style}
      actions={
        tags.length ? (
          <>
            {tags.map((tag, index) => (
              <MobilePill key={`${name}-tag-${index}`} tone={tag.tone || "neutral"}>
                {tag.label ?? tag}
              </MobilePill>
            ))}
          </>
        ) : null
      }
      footer={
        <div style={{ display: "grid", gap: UI.spacing.md }}>
          {(price || duration) ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {price ? <MobileBadge tone="success">{price}</MobileBadge> : null}
              {duration ? <MobileBadge tone="neutral">{duration}</MobileBadge> : null}
            </div>
          ) : null}
          {actions.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {actions.map((action, index) => (
                <MobileButton
                  key={`${name}-service-action-${index}`}
                  href={action.href}
                  onClick={action.onClick}
                  tone={action.tone || "secondary"}
                  disabled={Boolean(action.disabled)}
                  target={action.target}
                  rel={action.rel}
                >
                  {action.label || "Открыть"}
                </MobileButton>
              ))}
            </div>
          ) : null}
          {footer}
        </div>
      }
    />
  );
}

export function TotemMasterCard({
  name = "Мастер",
  slug = "",
  city = "",
  subtitle = "",
  badges = [],
  actions = [],
  footer = null,
  avatar = "",
  style,
  className,
}) {
  const initials = String(avatar || name || "M")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <MobileCard
      className={className}
      title={name}
      subtitle={slug || city ? [slug ? `@${slug}` : "", city].filter(Boolean).join(" · ") : subtitle}
      style={style}
      actions={
        badges.length ? (
          <>
            {badges.map((badge, index) => (
              <MobileBadge key={`${slug || name}-badge-${index}`} tone={badge.tone || "neutral"}>
                {badge.label ?? badge}
              </MobileBadge>
            ))}
          </>
        ) : null
      }
      footer={
        <div style={{ display: "grid", gap: UI.spacing.md }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              aria-hidden="true"
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: "linear-gradient(135deg, #6C4CF1 0%, #14C8C8 100%)",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                boxShadow: UI.shadow.medium,
                flex: "0 0 auto",
              }}
            >
              {initials || "M"}
            </div>
            <div style={{ minWidth: 0 }}>
              {subtitle ? <div style={{ ...UI.typography.body, color: UI.colors.muted }}>{subtitle}</div> : null}
              {city ? <div style={{ ...UI.typography.caption, color: UI.colors.text }}>{city}</div> : null}
            </div>
          </div>
          {actions.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {actions.map((action, index) => (
                <MobileButton
                  key={`${slug || name}-master-action-${index}`}
                  href={action.href}
                  onClick={action.onClick}
                  tone={action.tone || "secondary"}
                  disabled={Boolean(action.disabled)}
                  target={action.target}
                  rel={action.rel}
                >
                  {action.label || "Открыть"}
                </MobileButton>
              ))}
            </div>
          ) : null}
          {footer}
        </div>
      }
    />
  );
}

export function TotemBookingCard({
  title = "Запись",
  subtitle = "Быстрый вход в запись и выбор времени.",
  actions = [],
  footer = null,
  children = null,
  style,
  className,
}) {
  return (
    <MobileCard
      className={className}
      eyebrow="Запись"
      title={title}
      subtitle={subtitle}
      style={style}
      actions={
        actions.length ? (
          <>
            {actions.map((action, index) => (
              <MobileButton
                key={`booking-action-${index}`}
                href={action.href}
                onClick={action.onClick}
                tone={action.tone || "primary"}
                disabled={Boolean(action.disabled)}
                target={action.target}
                rel={action.rel}
              >
                {action.label || "Перейти"}
              </MobileButton>
            ))}
          </>
        ) : null
      }
      footer={
        <div style={{ display: "grid", gap: UI.spacing.md }}>
          {children}
          {footer}
        </div>
      }
    />
  );
}

export function MobileButton({
  children,
  tone = "primary",
  href,
  onClick,
  type = "button",
  style,
  disabled = false,
  target,
  rel,
  className,
}) {
  const resolvedTone = buttonTone(tone);
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: resolvedTone.minHeight,
    padding: "0 16px",
    borderRadius: UI.radius.button,
    border: `1px solid ${resolvedTone.borderColor}`,
    background: resolvedTone.background,
    color: resolvedTone.color,
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    boxShadow: resolvedTone.boxShadow,
    boxSizing: "border-box",
    minWidth: 0,
    gap: 8,
    whiteSpace: "nowrap",
  };

  const resolvedStyle = mergeStyle(baseStyle, style);

  if (href) {
    return (
      <a
        className={className}
        href={disabled ? undefined : href}
        target={target}
        rel={rel || (target === "_blank" ? "noreferrer" : undefined)}
        onClick={createActionHandler({ href, onClick, disabled })}
        aria-disabled={disabled ? "true" : undefined}
        style={mergeStyle(resolvedStyle, disabled ? { pointerEvents: "none" } : null)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={className}
      type={type}
      onClick={onClick}
      style={resolvedStyle}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function MobileBadge({ children, tone = "neutral", style, className }) {
  const colors = toneChip(tone);
  return (
    <span
      className={className}
      style={mergeStyle(
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minHeight: UI.heights.chip,
          padding: "0 10px",
          borderRadius: UI.radius.pill,
          border: `1px solid ${colors.borderColor}`,
          background: colors.background,
          color: colors.color,
          ...UI.typography.caption,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
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

export function MobileSearchBox({
  value = "",
  placeholder = "Поиск",
  onChange,
  onSubmit,
  style,
  className,
  submitLabel = "Найти",
}) {
  return (
    <form
      className={className}
      onSubmit={onSubmit}
      style={mergeStyle(
        {
          display: "flex",
          gap: UI.spacing.sm,
          alignItems: "center",
          boxSizing: "border-box",
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
          minHeight: UI.heights.secondaryButton,
          padding: "0 14px",
          borderRadius: UI.radius.button,
          border: `1px solid ${UI.colors.border}`,
          background: UI.colors.surface,
          color: UI.colors.text,
          outline: "none",
          boxSizing: "border-box",
          boxShadow: UI.shadow.soft,
        }}
      />
      {onSubmit ? <MobileButton type="submit">{submitLabel}</MobileButton> : null}
    </form>
  );
}

export function TotemSearchBar({
  value = "",
  placeholder = "Найти салон, мастера или город",
  onChange,
  onSubmit,
  submitLabel = "Найти",
  style,
  className,
}) {
  return (
    <MobileSearchBox
      className={className}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      style={style}
    />
  );
}

export function MobileEmptyState({
  title = "Ничего не найдено",
  description = "Попробуйте изменить фильтр.",
  action = null,
  style,
  className,
  icon = null,
}) {
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          padding: UI.spacing.xl,
          borderRadius: UI.radius.card,
          background: UI.colors.surface,
          border: `1px dashed ${UI.colors.border}`,
          textAlign: "center",
          boxSizing: "border-box",
        },
        style
      )}
    >
      {icon ? (
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            margin: "0 auto 12px",
            background: UI.colors.softPrimary,
            color: UI.colors.primary,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          {icon}
        </div>
      ) : null}
      <div style={UI.typography.sectionTitle}>{title}</div>
      <div style={{ ...UI.typography.body, color: UI.colors.muted, marginTop: 8 }}>{description}</div>
      {action ? <div style={{ marginTop: UI.spacing.lg }}>{action}</div> : null}
    </div>
  );
}

export function TotemCategoryChip({
  children,
  active = false,
  href,
  onClick,
  disabled = false,
  tone = "neutral",
  style,
  className,
  target,
  rel,
}) {
  const colors = toneChip(active ? "primary" : tone);
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: UI.heights.chip,
    padding: "0 12px",
    borderRadius: UI.radius.chip,
    border: `1px solid ${active ? UI.colors.primary : colors.borderColor}`,
    background: active ? UI.colors.primary : colors.background,
    color: active ? "#FFFFFF" : colors.color,
    ...UI.typography.caption,
    textDecoration: "none",
    boxSizing: "border-box",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    whiteSpace: "nowrap",
  };

  const resolvedStyle = mergeStyle(baseStyle, style);

  if (href) {
    return (
      <a
        className={className}
        href={disabled ? undefined : href}
        target={target}
        rel={rel || (target === "_blank" ? "noreferrer" : undefined)}
        onClick={createActionHandler({ href, onClick, disabled })}
        aria-disabled={disabled ? "true" : undefined}
        style={mergeStyle(resolvedStyle, disabled ? { pointerEvents: "none" } : null)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={className}
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={resolvedStyle}
    >
      {children}
    </button>
  );
}

export function TotemCategoryRail({ items = [], activeKey = "", onSelect, style, className }) {
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        },
        style
      )}
    >
      {items.map((item, index) => {
        const key = String(item?.key ?? item?.label ?? index);
        const active = key === String(activeKey || "");
        return (
          <TotemCategoryChip
            key={key}
            active={active}
            href={item?.href}
            disabled={item?.disabled}
            onClick={item?.onClick || (onSelect ? () => onSelect(item) : undefined)}
            tone={item?.tone || "neutral"}
          >
            {item?.label || key}
          </TotemCategoryChip>
        );
      })}
    </div>
  );
}

export function TotemTrustStrip({ items = [], style, className }) {
  const normalized = items.length
    ? items
    : [
        { label: "Проверенные карточки", tone: "success" },
        { label: "Быстрая запись", tone: "primary" },
        { label: "Уведомления и напоминания", tone: "accent" },
      ];

  return (
    <div
      className={className}
      style={mergeStyle(
        {
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        },
        style
      )}
    >
      {normalized.map((item, index) => (
        <MobileBadge key={`${item.label || "trust"}-${index}`} tone={item.tone || "neutral"}>
          {item.label || item}
        </MobileBadge>
      ))}
    </div>
  );
}

export function TotemBookingStepper({ steps = [], activeIndex = 0, style, className }) {
  const normalized = steps.length
    ? steps
    : [
        { label: "Данные" },
        { label: "Мастер" },
        { label: "Услуга" },
        { label: "Время" },
        { label: "Подтверждение" },
      ];

  return (
    <div
      className={className}
      style={mergeStyle(
        {
          display: "grid",
          gap: 10,
        },
        style
      )}
    >
      {normalized.map((step, index) => {
        const active = index === activeIndex;
        const done = index < activeIndex;
        return (
          <div
            key={step.key || step.label || index}
            style={mergeStyle(softRowStyle(), {
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderColor: active ? UI.colors.primary : done ? "#D4E8FF" : UI.colors.border,
              background: active ? UI.colors.softPrimary : UI.colors.surface,
            })}
          >
            <MobileBadge tone={active ? "primary" : done ? "success" : "neutral"}>{index + 1}</MobileBadge>
            <div style={{ minWidth: 0 }}>
              <div style={UI.typography.cardTitle}>{step.label || `Шаг ${index + 1}`}</div>
              {step.description ? (
                <div style={{ ...UI.typography.body, color: UI.colors.muted, marginTop: 4 }}>
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

export function MobileStepper({ steps = [], activeIndex = 0, style, className }) {
  return <TotemBookingStepper className={className} steps={steps} activeIndex={activeIndex} style={style} />;
}

export function TotemDateStrip({ items = [], activeKey = "", onSelect, style, className }) {
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
          WebkitOverflowScrolling: "touch",
        },
        style
      )}
    >
      {items.map((item, index) => {
        const key = String(item?.key ?? item?.value ?? index);
        const active = key === String(activeKey || "");
        return (
          <TotemCategoryChip
            key={key}
            active={active}
            onClick={item?.onClick || (onSelect ? () => onSelect(item) : undefined)}
            href={item?.href}
            disabled={item?.disabled}
            tone={item?.tone || "neutral"}
          >
            {item?.label || item?.value || "Дата"}
          </TotemCategoryChip>
        );
      })}
    </div>
  );
}

export function TotemTimeGrid({ items = [], activeKey = "", onSelect, style, className }) {
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))",
          gap: 8,
        },
        style
      )}
    >
      {items.map((item, index) => {
        const key = String(item?.key ?? item?.value ?? index);
        const active = key === String(activeKey || "");
        return (
          <MobileButton
            key={key}
            tone={active ? "primary" : "secondary"}
            disabled={item?.disabled}
            onClick={item?.onClick || (onSelect ? () => onSelect(item) : undefined)}
            href={item?.href}
            style={{
              width: "100%",
              minWidth: 0,
              padding: "0 12px",
              justifyContent: "center",
            }}
          >
            {item?.label || item?.value || "Время"}
          </MobileButton>
        );
      })}
    </div>
  );
}

export function TotemBookingSummary({
  title = "Проверьте запись",
  rows = [],
  total = "",
  note = "",
  actions = null,
  style,
  className,
}) {
  return (
    <MobileCard className={className} title={title} style={style}>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row, index) => (
          <div
            key={row.key || row.label || index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div style={{ ...UI.typography.body, color: UI.colors.muted }}>{row.label || "Поле"}</div>
            <div style={{ ...UI.typography.body, fontWeight: 700, textAlign: "right" }}>
              {row.value || "—"}
            </div>
          </div>
        ))}
        {total ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              paddingTop: 8,
              borderTop: `1px solid ${UI.colors.border}`,
            }}
          >
            <div style={{ ...UI.typography.cardTitle }}>{total.label || "Итого"}</div>
            <div style={{ ...UI.typography.cardTitle, color: UI.colors.primary }}>{total.value || total}</div>
          </div>
        ) : null}
        {note ? <div style={{ ...UI.typography.body, color: UI.colors.muted }}>{note}</div> : null}
        {actions ? <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{actions}</div> : null}
      </div>
    </MobileCard>
  );
}

export function TotemSuccessCard({
  title = "Запись создана",
  subtitle = "Спасибо! Ваша запись сохранена.",
  details = [],
  actions = null,
  badge = "Готово",
  style,
  className,
}) {
  return (
    <MobileCard
      className={className}
      eyebrow="Успешно"
      title={title}
      subtitle={subtitle}
      actions={<MobileBadge tone="success">{badge}</MobileBadge>}
      style={mergeStyle({ borderColor: "#BBF7D0", background: "#F0FDF4" }, style)}
      footer={
        <div style={{ display: "grid", gap: 12 }}>
          {details.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {details.map((detail, index) => (
                <div
                  key={detail.key || detail.label || index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ ...UI.typography.body, color: UI.colors.muted }}>{detail.label || "Деталь"}</div>
                  <div style={{ ...UI.typography.body, fontWeight: 700, textAlign: "right" }}>
                    {detail.value || "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {actions ? <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{actions}</div> : null}
        </div>
      }
    />
  );
}

export function MobileBottomNav({ items = [], activeKey = "", style, className }) {
  return <TotemBottomTabs className={className} items={items} activeKey={activeKey} style={style} />;
}

export function TotemBottomTabs({ items = [], activeKey = "", style, className }) {
  const normalized = items.length
    ? items
    : [
        { key: "home", label: "Главная", href: "#" },
        { key: "city", label: "Город", href: "#" },
        { key: "booking", label: "Запись", href: "#" },
        { key: "help", label: "Помощь", href: "#" },
      ];

  return (
    <nav
      className={className}
      style={mergeStyle(
        {
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(normalized.length, 1)}, minmax(0, 1fr))`,
          gap: 8,
          padding: 10,
          borderRadius: UI.radius.card,
          background: "rgba(255,255,255,0.96)",
          border: `1px solid ${UI.colors.border}`,
          boxShadow: UI.shadow.medium,
          backdropFilter: "blur(18px)",
          boxSizing: "border-box",
        },
        style
      )}
    >
      {normalized.map((item) => {
        const active = String(item?.key || "") === String(activeKey || "");
        return (
          <a
            key={item.key || item.label}
            href={item.href || "#"}
            aria-current={active ? "page" : undefined}
            style={{
              minHeight: UI.heights.secondaryButton,
              padding: "10px 12px",
              borderRadius: UI.radius.button,
              background: active ? UI.colors.primary : UI.colors.surfaceAlt,
              color: active ? "#FFFFFF" : UI.colors.text,
              textDecoration: "none",
              textAlign: "center",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              boxSizing: "border-box",
              boxShadow: active ? "0 10px 22px rgba(108, 76, 241, 0.18)" : "none",
            }}
          >
            {item.label || item.key || "Пункт"}
          </a>
        );
      })}
    </nav>
  );
}

export function MobileStatCard({ label, value, note = "", tone = "neutral", style, className, icon = null }) {
  const colors = toneChip(tone);
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          padding: UI.spacing.xl,
          borderRadius: UI.radius.card,
          background: UI.colors.surface,
          border: `1px solid ${UI.colors.border}`,
          boxShadow: UI.shadow.soft,
          boxSizing: "border-box",
        },
        style
      )}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ ...UI.typography.caption, color: colors.color }}>{label}</div>
          <div style={{ fontSize: 30, lineHeight: 1.05, fontWeight: 900, marginTop: 6, color: UI.colors.text }}>
            {value}
          </div>
        </div>
        {icon ? (
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: colors.background,
              color: colors.color,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              flex: "0 0 auto",
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {note ? (
        <div style={{ ...UI.typography.body, color: UI.colors.muted, marginTop: 8 }}>{note}</div>
      ) : null}
    </div>
  );
}

export function TotemAdminMetricPanel({ title = "Показатели", subtitle = "", metrics = [], style, className }) {
  return (
    <MobileCard className={className} title={title} subtitle={subtitle} style={style}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
        }}
      >
        {metrics.map((metric, index) => (
          <MobileStatCard
            key={metric.key || metric.label || index}
            label={metric.label || "Показатель"}
            value={metric.value || "—"}
            note={metric.note || ""}
            tone={metric.tone || "neutral"}
            icon={metric.icon || null}
          />
        ))}
      </div>
    </MobileCard>
  );
}

export function TotemAdminActionGrid({ items = [], style, className }) {
  return (
    <div
      className={className}
      style={mergeStyle(
        {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        },
        style
      )}
    >
      {items.map((item, index) => {
        const body = (
          <>
            <div style={UI.typography.cardTitle}>{item.label || item.title || "Действие"}</div>
            {item.description ? (
              <div style={{ ...UI.typography.body, color: UI.colors.muted, marginTop: 6 }}>
                {item.description}
              </div>
            ) : null}
          </>
        );

        return item?.href ? (
          <MobileCard
            key={item.key || item.label || index}
            title=""
            subtitle=""
            footer={null}
            style={mergeStyle(panelStyle({ padding: UI.spacing.lg }), item.style)}
          >
            <div style={{ display: "grid", gap: 12 }}>
              {body}
              <MobileButton href={item.href} tone={item.tone || "secondary"} disabled={item.disabled} onClick={item.onClick}>
                {item.actionLabel || "Открыть"}
              </MobileButton>
            </div>
          </MobileCard>
        ) : (
          <MobileCard
            key={item.key || item.label || index}
            title=""
            subtitle=""
            style={mergeStyle(panelStyle({ padding: UI.spacing.lg }), item.style)}
          >
            <div style={{ display: "grid", gap: 12 }}>
              {body}
              <MobileButton tone={item.tone || "secondary"} disabled={item.disabled} onClick={item.onClick}>
                {item.actionLabel || "Открыть"}
              </MobileButton>
            </div>
          </MobileCard>
        );
      })}
    </div>
  );
}

export function TotemFinanceCard({
  title = "Финансы",
  amount = "",
  subtitle = "",
  note = "",
  badge = "",
  actions = null,
  style,
  className,
}) {
  return (
    <MobileCard
      className={className}
      eyebrow="Финансы"
      title={title}
      subtitle={subtitle}
      style={style}
      actions={badge ? <MobileBadge tone="primary">{badge}</MobileBadge> : null}
      footer={
        <div style={{ display: "grid", gap: 12 }}>
          {amount ? (
            <div style={{ fontSize: 32, lineHeight: 1.05, fontWeight: 900, color: UI.colors.text }}>
              {amount}
            </div>
          ) : null}
          {note ? <div style={{ ...UI.typography.body, color: UI.colors.muted }}>{note}</div> : null}
          {actions ? <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{actions}</div> : null}
        </div>
      }
    />
  );
}

export function TotemPayoutStatusCard({
  title = "Выплаты",
  status = "",
  amount = "",
  nextPayout = "",
  note = "",
  actions = null,
  style,
  className,
}) {
  const tone = /готов|paid|успеш/i.test(String(status || "")) ? "success" : /ожид|pending/i.test(String(status || "")) ? "warning" : "neutral";

  return (
    <MobileCard
      className={className}
      eyebrow="Выплаты"
      title={title}
      subtitle={note}
      style={style}
      actions={status ? <MobileBadge tone={tone}>{status}</MobileBadge> : null}
      footer={
        <div style={{ display: "grid", gap: 10 }}>
          {amount ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ ...UI.typography.body, color: UI.colors.muted }}>Сумма</div>
              <div style={{ ...UI.typography.cardTitle }}>{amount}</div>
            </div>
          ) : null}
          {nextPayout ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ ...UI.typography.body, color: UI.colors.muted }}>Следующая выплата</div>
              <div style={{ ...UI.typography.cardTitle }}>{nextPayout}</div>
            </div>
          ) : null}
          {actions ? <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{actions}</div> : null}
        </div>
      }
    />
  );
}
