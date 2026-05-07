import { useMemo } from "react";
import MobileAdminTemplate from "./MobileAdminTemplate.jsx";
import { getMobileAdminConfig } from "./mobileAdminConfig.js";

function getActiveKeyFromHash() {
  if (typeof window === "undefined") {
    return "stats";
  }

  const hash = String(window.location.hash || "").toLowerCase();
  if (hash.includes("/bookings")) return "booking";
  if (hash.includes("/calendar") || hash.includes("/schedule")) return "calendar";
  if (hash.includes("/finance")) return "finance";
  return "stats";
}

function getRouteContextFromHash() {
  if (typeof window === "undefined") {
    return { roleType: "", slug: "" };
  }

  const hash = String(window.location.hash || "").replace(/^#\/?/, "");
  const parts = hash.split("?")[0].split("/").filter(Boolean);
  const roleType = String(parts[2] || "").trim().toLowerCase();
  const slug = String(parts[3] || "").trim();

  if ((roleType === "master" || roleType === "salon") && slug) {
    return { roleType, slug };
  }

  return { roleType: "", slug: "" };
}

export default function MobileLiteAdminPage({ roleType = "", slug = "" }) {
  const activeKey = getActiveKeyFromHash();
  const routeContext = getRouteContextFromHash();
  const resolvedRoleType = String(roleType || routeContext.roleType || "").trim().toLowerCase();
  const resolvedSlug = String(slug || routeContext.slug || "").trim();
  const config = useMemo(() => getMobileAdminConfig(resolvedRoleType, resolvedSlug), [resolvedRoleType, resolvedSlug]);

  if (!config) {
    return (
      <MobileAdminTemplate
        title="Мобильная админка"
        subtitle="Не удалось определить роль или slug кабинета."
        roleLabel=""
        identityLabel=""
        cards={[]}
        bottomNavItems={[]}
        activeKey={activeKey}
      />
    );
  }

  return (
    <MobileAdminTemplate
      title="Мобильный кабинет"
      subtitle={config.subtitle}
      roleLabel={config.roleLabel}
      identityLabel={config.identityLabel}
      contextLabel={resolvedSlug}
      cards={config.cards}
      bottomNavItems={config.bottomNavItems}
      activeKey={activeKey}
    />
  );
}
