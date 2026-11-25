const CACHE_NAME = "totem-mobile-pwa-v5";
const OWN_CACHE = /^totem-mobile-pwa-v[0-9]+$/;
const DEFAULT_NOTIFICATION_ICON = "/icons/icon-192.png";

function safeJsonParse(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeNotificationPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
    ? rawPayload
    : {};

  return {
    notification_uid: String(payload.notification_uid || "").trim() || null,
    title: String(payload.title || "").trim() || "TOTEM",
    body: String(payload.body || "").trim() || "",
    action_type: String(payload.action_type || "").trim() || null,
    action_url: String(payload.action_url || "").trim() || null,
    target_type: String(payload.target_type || "").trim() || null,
    target_id: String(payload.target_id || "").trim() || null,
    payload_json: payload.payload_json && typeof payload.payload_json === "object" && !Array.isArray(payload.payload_json)
      ? payload.payload_json
      : {},
    created_at: String(payload.created_at || "").trim() || null,
  };
}

function getNotificationIconUrl() {
  return DEFAULT_NOTIFICATION_ICON;
}

function resolveSafeOpenUrl(actionUrl) {
  const fallbackUrl = "/m/app";
  const safeActionUrl = String(actionUrl || "").trim();

  if (!safeActionUrl) {
    return fallbackUrl;
  }

  if (safeActionUrl.startsWith("#/")) {
    return `/${safeActionUrl}`;
  }

  if (safeActionUrl.startsWith("/")) {
    return safeActionUrl;
  }

  try {
    const parsed = new URL(safeActionUrl, self.location.origin);

    if (parsed.origin !== self.location.origin) {
      return fallbackUrl;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

async function focusOrOpenUrl(url) {
  const clientsList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const targetUrl = new URL(url, self.location.origin).href;

  for (const client of clientsList) {
    try {
      const clientUrl = new URL(client.url);

      if (client.url === targetUrl || clientUrl.href === targetUrl) {
        if (typeof client.focus === "function") {
          return client.focus();
        }
      }
    } catch {
      /* no-op */
    }
  }

  return self.clients.openWindow(url);
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const payload = normalizeNotificationPayload(safeJsonParse(event.data && typeof event.data.text === "function" ? event.data.text() : ""));
      const title = payload.title || "TOTEM";
      const body = payload.body || "";
      const actionUrl = resolveSafeOpenUrl(payload.action_url);

      await self.registration.showNotification(title, {
        body,
        icon: getNotificationIconUrl(),
        badge: getNotificationIconUrl(),
        data: {
          notification_uid: payload.notification_uid,
          action_url: actionUrl,
          action_type: payload.action_type,
          target_type: payload.target_type,
          target_id: payload.target_id,
          payload_json: payload.payload_json,
        },
      });
    })().catch(() => null)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const data = event.notification && event.notification.data ? event.notification.data : {};
      const url = resolveSafeOpenUrl(data.action_url);
      return focusOrOpenUrl(url);
    })().catch(() => focusOrOpenUrl("/m/app"))
  );
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => OWN_CACHE.test(name) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// G5-03: Cache Storage is shared between all accounts on this origin.
// Cache only immutable, content-hashed Vite assets. Never cache application
// data, arbitrary destinations, authenticated requests, or foreign origins.
function isImmutableAsset(request, url) {
  return url.origin === self.location.origin &&
    !url.search && !url.hash &&
    !request.headers.has("authorization") &&
    !request.headers.has("range") &&
    /^\/assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf)$/.test(url.pathname);
}

function canStore(response, request) {
  if (!response || !response.ok || response.status !== 200 ||
      response.type !== "basic" || response.redirected ||
      response.url !== request.url) return false;
  const directives = (response.headers.get("cache-control") || "")
    .toLowerCase().split(",").map(value => value.trim());
  return directives.includes("public") && directives.includes("immutable") &&
    !directives.some(value => /^(?:private|no-store|no-cache)(?:\s*=|$)/.test(value)) &&
    (response.headers.get("vary") || "").toLowerCase().split(",")
      .every(value => ["", "accept-encoding"].includes(value.trim()));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin ||
      request.headers.has("authorization") || request.headers.has("range")) return;

  // Preserve network-only SPA navigation, without intercepting API paths.
  if (/^\/(?:internal|public|api)(?:\/|$)/.test(url.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => fetch("/")));
    return;
  }
  if (!isImmutableAsset(request, url)) return;
  event.respondWith((async () => {
    let cache;
    try { cache = await caches.open(CACHE_NAME); } catch { return fetch(request); }
    let response;
    try {
      response = await fetch(request);
    } catch (error) {
      const cached = await cache.match(request).catch(() => undefined);
      if (canStore(cached, request)) return cached;
      throw error;
    }
    try {
      if (canStore(response, request)) await cache.put(request, response.clone());
      else await cache.delete(request);
    } catch { /* Cache failure must not replace a successful network response. */ }
    return response;
  })());
});
