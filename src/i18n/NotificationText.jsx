import { useMarketContext } from "../market/MarketContext.jsx";
import { resolveUiValue } from "./uiMessages.js";
import { pickNotificationText } from "./notificationText.js";

export function NotificationText({ notification, field, fallback = "" }) {
  const market = useMarketContext();
  return pickNotificationText(notification, field, market.locale, resolveUiValue(fallback, market));
}

const known = {
  priority: new Set(["low", "normal", "high", "urgent"]),
  target: new Set(["global", "client", "salon", "master", "salon_admin", "master_admin", "owner", "auth_user"]),
  action: new Set(["booking", "payment", "money", "message"]),
};
export function NotificationLabel({ kind, value }) {
  const market = useMarketContext();
  return known[kind]?.has(value) ? market.t("notifications." + kind + "." + value) : String(value ?? "—");
}
