// White-Clover Dental Clinic — service worker
// Bump this whenever the caching strategy or shell assets change so old
// clients pick up the new cache instead of serving stale files forever.
const CACHE_VERSION = 'wc-shell-v2';
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.png',
  '/logo.png',
  '/logo-small.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Fetch each shell asset with cache: 'no-store' rather than
      // caches.addAll(), which uses the browser's default HTTP cache mode —
      // on hosts that send long-lived Cache-Control on these files, addAll
      // could silently precache an already-stale copy straight from disk
      // cache instead of what's actually live right now.
      Promise.all(
        SHELL_ASSETS.map((url) =>
          fetch(url, { cache: 'no-store' }).then((response) => {
            if (response.ok) return cache.put(url, response);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Everything else (API calls to the
  // backend, cross-origin requests, POST/PUT/DELETE) goes straight to the
  // network untouched — patient data should never be served stale.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // API calls live under /api on the same origin in production; never cache them.
  if (new URL(request.url).pathname.startsWith('/api')) {
    return;
  }

  // Full-page navigations: always go to the network for a fresh copy (so
  // the install-prompt capture script and any other fix is never served
  // stale from the browser's own HTTP cache), falling back to the cached
  // shell only when actually offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() =>
        caches.match('/').then((res) => res || caches.match(request))
      )
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts emitted by the Vite build, plus the
  // icons above): stale-while-revalidate so the app still works offline and
  // quietly picks up new versions in the background when online.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
