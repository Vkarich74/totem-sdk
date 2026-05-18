const CACHE_NAME = "totem-mobile-pwa-v3";
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
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

function isBypassedPathname(pathname) {
  return (
    pathname.startsWith("/internal") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/api")
  );
}

function isStaticAssetRequest(request) {
  if (request.destination && request.destination !== "document") {
    return true;
  }

  return /\/(?:assets|icons)\//.test(new URL(request.url).pathname) || /\.(?:js|mjs|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|map|json|webmanifest)$/.test(new URL(request.url).pathname);
}

function isAppAssetRequest(request) {
  return new URL(request.url).pathname.startsWith("/assets/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (isBypassedPathname(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch (error) {
          return fetch("/");
        }
      })()
    );
    return;
  }

  if (isAppAssetRequest(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);

        try {
          const response = await fetch(request);
          if (response && response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          if (cached) {
            return cached;
          }

          return fetch(request);
        }
      })()
    );
    return;
  }

  if (!isStaticAssetRequest(request)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      const networkPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        networkPromise.catch(() => null);
        return cached;
      }

      const fresh = await networkPromise;
      if (fresh) {
        return fresh;
      }

      return fetch(request);
    })()
  );
});
