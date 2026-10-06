export function pickNotificationText(notification, field, locale, fallback = "") {
  const language = /^en(?:-|$)/i.test(String(locale || "")) ? "en" : "ru";
  const other = language === "en" ? "ru" : "en";
  for (const key of [field + "_" + language, field + "_" + other, field]) {
    const value = notification?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}
