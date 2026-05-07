import { useMemo } from "react";
import {
  MobileShell,
  MobileTopBar,
  MobileSection,
  MobileCard,
  MobileButton,
  MobileBadge,
  MobilePill,
  MobileBottomNav,
  MobileStatCard,
  MobileEmptyState,
} from "./MobileUi.jsx";

function getToneMeta(key) {
  if (key === "booking") {
    return {
      cardStyle: {
        background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
        borderColor: "#bfdbfe",
      },
      badgeTone: "primary",
      buttonTone: "primary",
      accentLabel: "Записи",
    };
  }

  if (key === "calendar") {
    return {
      cardStyle: {
        background: "linear-gradient(180deg, #ecfeff 0%, #ffffff 100%)",
        borderColor: "#a5f3fc",
      },
      badgeTone: "success",
      buttonTone: "secondary",
      accentLabel: "Календарь",
    };
  }

  if (key === "finance") {
    return {
      cardStyle: {
        background: "linear-gradient(180deg, #fefce8 0%, #ffffff 100%)",
        borderColor: "#fde68a",
      },
      badgeTone: "warning",
      buttonTone: "soft",
      accentLabel: "Финансы",
    };
  }

  return {
    cardStyle: {
      background: "linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)",
      borderColor: "#ddd6fe",
    },
    badgeTone: "danger",
    buttonTone: "primary",
    accentLabel: "Статистика",
  };
}

function getNavLabel(item) {
  const key = String(item?.key || "").trim();
  const fallback = String(item?.label || "").trim();

  if (key === "overview" || key === "home") return "Главная";
  if (key === "booking" || key === "bookings") return "Записи";
  if (key === "calendar") return "Календарь";
  if (key === "finance") return "Финансы";
  if (key === "stats") return "Статистика";

  return fallback || key || "Пункт";
}

function MobileAdminActionCard({ title, subtitle, href, actionLabel = "Открыть", toneKey = "stats" }) {
  const tone = getToneMeta(toneKey);

  return (
    <MobileCard
      title={title}
      subtitle={subtitle}
      style={{
        minHeight: 176,
        ...tone.cardStyle,
      }}
      footer={
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <MobileBadge tone={tone.badgeTone}>{tone.accentLabel}</MobileBadge>
            <MobilePill tone="neutral">{String(toneKey || "stats")}</MobilePill>
          </div>
          <MobileButton href={href} tone={tone.buttonTone}>
            {actionLabel}
          </MobileButton>
        </div>
      }
    />
  );
}

export default function MobileAdminTemplate({
  title,
  subtitle,
  roleLabel,
  identityLabel,
  contextLabel = "",
  cards = [],
  bottomNavItems = [],
  activeKey = "",
}) {
  const safeTitle = String(title || "").trim() || "Мобильная админка";
  const safeSubtitle = String(subtitle || "").trim();
  const safeRoleLabel = String(roleLabel || "").trim();
  const safeIdentityLabel = String(identityLabel || "").trim();
  const safeContextLabel = String(contextLabel || "").trim();
  const hasCards = Array.isArray(cards) && cards.length > 0;

  const todayStats = useMemo(() => {
    const stats = {
      booking: 0,
      calendar: 0,
      finance: 0,
      stats: 0,
    };

    for (const card of Array.isArray(cards) ? cards : []) {
      const key = String(card?.toneKey || card?.key || "").trim();
      if (key === "booking") stats.booking += 1;
      else if (key === "calendar") stats.calendar += 1;
      else if (key === "finance") stats.finance += 1;
      else if (key === "stats") stats.stats += 1;
    }

    return stats;
  }, [cards]);

  const navItems = useMemo(
    () =>
      Array.isArray(bottomNavItems)
        ? bottomNavItems.map((item) => ({
            ...item,
            label: getNavLabel(item),
          }))
        : [],
    [bottomNavItems]
  );

  return (
    <MobileShell>
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        display: "grid",
        gap: 16,
        paddingBottom: 24
      }}>
        <MobileTopBar
          title="TOTEM"
          subtitle="Кабинет"
          right={<MobileBadge tone="primary">{safeRoleLabel || "кабинет"}</MobileBadge>}
        />

        <section style={{
          borderRadius: 28,
          padding: 20,
          background: "linear-gradient(135deg, #111827 0%, #1d4ed8 52%, #6366f1 100%)",
          color: "#fff",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 16
          }}>
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.82
              }}>
                Мобильный кабинет
              </div>
              <h1 style={{ margin: "8px 0 8px", fontSize: 28, lineHeight: 1.05 }}>
                {safeTitle}
              </h1>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.92)" }}>
                {safeSubtitle || "Быстрый доступ к разделам кабинета мастера и салона."}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              {safeRoleLabel ? <MobileBadge tone="primary">{safeRoleLabel}</MobileBadge> : null}
              {safeContextLabel ? <MobilePill tone="neutral">{safeContextLabel}</MobilePill> : null}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontSize: 12,
              fontWeight: 700
            }}>
              Кабинет по роли
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontSize: 12,
              fontWeight: 700
            }}>
              Быстрый доступ
            </span>
            {safeIdentityLabel ? (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 32,
                padding: "0 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                fontSize: 12,
                fontWeight: 700
              }}>
                {safeIdentityLabel}
              </span>
            ) : null}
          </div>
        </section>

        <MobileSection title="Сегодня" subtitle="Короткий обзор ключевых разделов кабинета.">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}>
            <MobileStatCard
              label="Записи"
              value={todayStats.booking || 0}
              note="Быстрый доступ к записи"
              tone="primary"
            />
            <MobileStatCard
              label="Календарь"
              value={todayStats.calendar || 0}
              note="Планирование и слоты"
              tone="success"
            />
            <MobileStatCard
              label="Финансы"
              value={todayStats.finance || 0}
              note="Платежи и состояние"
              tone="warning"
            />
            <MobileStatCard
              label="Статистика"
              value={todayStats.stats || 0}
              note="Показатели кабинета"
              tone="danger"
            />
          </div>
        </MobileSection>

        {hasCards ? (
          <MobileSection title="Разделы кабинета" subtitle="Быстрые крупные карточки действий.">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}>
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
                  <MobileAdminActionCard
                    key={key}
                    title={cardTitle}
                    subtitle={cardSubtitle}
                    href={href}
                    actionLabel={actionLabel}
                    toneKey={toneKey}
                  />
                );
              })}
            </div>
          </MobileSection>
        ) : safeSubtitle ? (
          <MobileEmptyState
            title="Раздел временно недоступен"
            description={safeSubtitle}
            action={<MobilePill tone="warning">Проверьте ссылку или вернитесь назад.</MobilePill>}
          />
        ) : (
          <MobileEmptyState
            title="Нет доступных разделов"
            description="Проверьте конфигурацию кабинета или вернитесь назад."
          />
        )}
      </div>

      {navItems.length ? (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <MobileBottomNav items={navItems} activeKey={activeKey} />
        </div>
      ) : null}
    </MobileShell>
  );
}
