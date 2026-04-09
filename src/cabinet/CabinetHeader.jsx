function getPublicTarget(slug) {
  const safeSlug = String(slug || "").trim();

  if (!safeSlug) {
    return "/";
  }

  const hash = String(window.location.hash || "");
  const pathname = String(window.location.pathname || "");

  const normalizedHash = hash.replace(/^#\/?/, "");
  const hashParts = normalizedHash.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (hashParts[0] === "master" || pathParts[0] === "master") {
    return `/master/${safeSlug}`;
  }

  if (hashParts[0] === "salon" || pathParts[0] === "salon") {
    return `/salon/${safeSlug}`;
  }

  const storedMasterSlug =
    window.MASTER_SLUG ||
    window.localStorage.getItem("totem_master_slug") ||
    window.sessionStorage.getItem("totem_master_slug");

  if (storedMasterSlug && storedMasterSlug === safeSlug) {
    return `/master/${safeSlug}`;
  }

  return `/salon/${safeSlug}`;
}

export default function CabinetHeader({ slug, onLogout }) {
  function handleLogoClick() {
    window.location.href = getPublicTarget(slug);
  }

  return (
    <div
      style={{
        height: "50px",
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "#fafafa",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontWeight: "600",
          cursor: "pointer",
        }}
        onClick={handleLogoClick}
      >
        TOTEM
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "#555",
          }}
        >
          {slug}
        </div>

        <button
          onClick={onLogout}
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}