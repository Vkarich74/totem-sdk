import "./core/dev-bootstrap.js"

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/*
Resolve platform mode

MASTER MODE priority
SALON MODE fallback
*/

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

  // Detect from URL

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

  return null;
}

const ctx = resolveContext();

if (!ctx) {
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