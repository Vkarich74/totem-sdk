import "./core/dev-bootstrap.js"

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

function resolveContext() {

  // MASTER MODE (priority)
  if (window.MASTER_SLUG && typeof window.MASTER_SLUG === "string") {
    return {
      mode: "master",
      slug: window.MASTER_SLUG
    };
  }

  // SALON MODE
  if (window.SALON_SLUG && typeof window.SALON_SLUG === "string") {
    return {
      mode: "salon",
      slug: window.SALON_SLUG
    };
  }

  // 🔥 ДОБАВЛЕНО: HASH ROUTER SUPPORT
  const hash = window.location.hash || "";
  const hashPath = hash.replace(/^#/, "");
  const hashParts = hashPath.split("/").filter(Boolean);

  if (hashParts.length >= 2 && hashParts[0] === "master") {
    return {
      mode: "master",
      slug: hashParts[1]
    };
  }

  if (hashParts.length >= 2 && hashParts[0] === "salon") {
    return {
      mode: "salon",
      slug: hashParts[1]
    };
  }

  if (hashParts.length >= 1 && hashParts[0] === "mobile") {
    return {
      mode: "mobile",
      slug: null
    };
  }

  if (hashParts.length >= 3 && hashParts[0] === "client") {
    return {
      mode: "client",
      slug: null
    };
  }
  // 🔥 КОНЕЦ ДОБАВЛЕНИЯ

  // Detect from URL (fallback)
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);

  if (parts.length >= 2 && parts[0] === "master") {
    return {
      mode: "master",
      slug: parts[1]
    };
  }

  if (parts.length >= 2 && parts[0] === "salon") {
    return {
      mode: "salon",
      slug: parts[1]
    };
  }

  if (parts.length >= 1 && parts[0] === "mobile") {
    return {
      mode: "mobile",
      slug: null
    };
  }

  if (parts.length >= 3 && parts[0] === "client") {
    return {
      mode: "client",
      slug: null
    };
  }

  return null;
}

const ctx = resolveContext();

const isAuthRoute = window.location.hash.startsWith("#/auth");

if (!ctx && !isAuthRoute) {
  console.error("TOTEM SDK: Unable to resolve platform context.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App
      slug={ctx ? ctx.slug : null}
      mode={ctx ? ctx.mode : null}
    />
  </React.StrictMode>
);
