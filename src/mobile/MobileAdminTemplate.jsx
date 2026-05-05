import { useMemo } from "react";
import {
  MobileShell,
  MobileTopBar,
  MobileHero,
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

  if (key === "overview" || key === "home") return "Обзор";
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
        minHeight: 168,
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
  cards = [],
  bottomNavItems = [],
  activeKey = "",
}) {
  const safeTitle = String(title || "").trim() || "Мобильная админка";
  const safeSubtitle = String(subtitle || "").trim();
  const safeRoleLabel = String(roleLabel || "").trim();
  const safeIdentityLabel = String(identityLabel || "").trim();
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
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
        <MobileTopBar
          title="TOTEM"
          subtitle="Кабинет"
          right={<MobileBadge tone="primary">{safeRoleLabel || "кабинет"}</MobileBadge>}
        />

        <MobileHero
          eyebrow="Мобильный кабинет"
          title="Мобильный кабинет"
          subtitle={safeSubtitle || "Быстрый доступ к разделам кабинета мастера и салона."}
          actions={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {safeIdentityLabel ? <MobilePill tone="neutral">{safeIdentityLabel}</MobilePill> : null}
              {safeRoleLabel ? <MobilePill tone="primary">{safeRoleLabel}</MobilePill> : null}
            </div>
          }
        />

        <MobileSection title="Сегодня" subtitle="Короткий обзор ключевых разделов кабинета.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
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
            <div style={{ display: "grid", gap: 12 }}>
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
        <MobileBottomNav items={navItems} activeKey={activeKey} />
      ) : null}
    </MobileShell>
  );
}
