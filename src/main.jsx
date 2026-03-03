import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/**
 * Determine salon slug:
 * 1. window.SALON_SLUG (if injected by Odoo page)
 * 2. From URL path: /salon/<slug>
 */

function resolveSlug() {
  // Priority 1: explicit global
  if (window.SALON_SLUG && typeof window.SALON_SLUG === "string") {
    return window.SALON_SLUG;
  }

  // Priority 2: parse from pathname
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);

  // Expect: /salon/<slug>
  if (parts.length >= 2 && parts[0] === "salon") {
    return parts[1];
  }

  return null;
}

const slug = resolveSlug();

if (!slug) {
  console.error("TOTEM SDK: Unable to resolve salon slug.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App slug={slug} />
  </React.StrictMode>
);