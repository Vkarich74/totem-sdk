const CACHE_NAME = "totem-mobile-pwa-v2";

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

function isAppEntryAssetRequest(request) {
  return new URL(request.url).pathname === "/assets/index.js";
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

  if (isAppEntryAssetRequest(request)) {
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
