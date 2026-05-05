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

export default function MobileLiteAdminPage({ roleType = "", slug = "" }) {
  const activeKey = getActiveKeyFromHash();
  const config = useMemo(() => getMobileAdminConfig(roleType, slug), [roleType, slug]);

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
      title="Мобильная админка"
      subtitle="Быстрый доступ к ключевым разделам кабинета без лишней навигации."
      roleLabel={config.roleLabel}
      identityLabel={config.identityLabel}
      cards={config.cards}
      bottomNavItems={config.bottomNavItems}
      activeKey={activeKey}
    />
  );
}
