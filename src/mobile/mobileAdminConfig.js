function normalizeRoleType(roleType) {
  const value = String(roleType || "").trim().toLowerCase();
  return value === "master" || value === "salon" ? value : "";
}

function normalizeSlug(slug) {
  return String(slug || "").trim();
}

function formatOwnerDisplayName(ownerName, ownerType) {
  const normalizedName = String(ownerName || "").trim();
  if (normalizedName) {
    return normalizedName;
  }

  const normalizedOwnerType = normalizeRoleType(ownerType);
  if (normalizedOwnerType === "master") {
    return "Кабинет мастера";
  }

  if (normalizedOwnerType === "salon") {
    return "Кабинет салона";
  }

  return "Кабинет";
}

const MOBILE_ADMIN_NAV_LABELS = {
  booking: "Букинг",
  calendar: "Календарь",
  finance: "Деньги",
  stats: "Статистика",
};

function buildCards(roleType, slug) {
  const encodedSlug = encodeURIComponent(slug);

  if (roleType === "master") {
    return [
      { key: "booking", title: "Букинг", subtitle: "Открыть записи", href: `#/master/${encodedSlug}/bookings`, actionLabel: "Открыть", toneKey: "booking" },
      { key: "calendar", title: "Календарь", subtitle: "План и расписание", href: `#/master/${encodedSlug}/schedule`, actionLabel: "Открыть", toneKey: "calendar" },
      { key: "finance", title: "Вывод денег", subtitle: "Финансы и выплаты", href: `#/master/${encodedSlug}/finance`, actionLabel: "Открыть", toneKey: "finance" },
      { key: "stats", title: "Статистика", subtitle: "Дашборд и метрики", href: `#/master/${encodedSlug}/dashboard`, actionLabel: "Открыть", toneKey: "stats" },
    ];
  }

  return [
    { key: "booking", title: "Букинг", subtitle: "Открыть записи", href: `#/salon/${encodedSlug}/bookings`, actionLabel: "Открыть", toneKey: "booking" },
    { key: "calendar", title: "Календарь", subtitle: "План и расписание", href: `#/salon/${encodedSlug}/calendar`, actionLabel: "Открыть", toneKey: "calendar" },
    { key: "finance", title: "Вывод денег", subtitle: "Финансы и выплаты", href: `#/salon/${encodedSlug}/finance`, actionLabel: "Открыть", toneKey: "finance" },
    { key: "stats", title: "Статистика", subtitle: "Дашборд и метрики", href: `#/salon/${encodedSlug}/dashboard`, actionLabel: "Открыть", toneKey: "stats" },
  ];
}

function buildBottomNavItems(cards) {
  return Array.isArray(cards)
    ? cards
        .filter((card) => Boolean(card?.key && card?.href && card?.title))
        .map((card) => ({
          key: card.key,
          label: MOBILE_ADMIN_NAV_LABELS[card.key] || card.title || card.key,
          href: card.href,
        }))
    : [];
}

export function getMobileAdminConfig(roleType, slug) {
  const normalizedRoleType = normalizeRoleType(roleType);
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedRoleType || !normalizedSlug) {
    return null;
  }

  const cards = buildCards(normalizedRoleType, normalizedSlug);

  return {
    roleType: normalizedRoleType,
    slug: normalizedSlug,
    roleLabel: normalizedRoleType === "master" ? "Мастер" : "Салон",
    identityLabel: formatOwnerDisplayName("", normalizedRoleType),
    cards,
    bottomNavItems: buildBottomNavItems(cards),
  };
}
