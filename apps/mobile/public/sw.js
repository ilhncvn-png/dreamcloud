// DreamCloud Service Worker v4
// Navigation: network-first (never serve stale index.html — prevents React hydration mismatch).
// Immutable assets (/_expo/, /assets/): cache-first (content-addressed, safe to cache forever).
// API and auth: always bypassed.

const CACHE_VERSION = 'v4';
const CACHE_NAME = `dreamcloud-shell-${CACHE_VERSION}`;

const IMMUTABLE_PREFIXES = ['/_expo/', '/assets/'];
const STATIC_ASSETS = ['/favicon.ico', '/icon.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  // Do NOT pre-cache index.html — it contains pre-rendered HTML that must stay fresh.
  event.waitUntil(Promise.resolve());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept API or auth requests.
  if (url.hostname === 'api.dreamclaude.org') return;

  const isImmutable =
    IMMUTABLE_PREFIXES.some((p) => url.pathname.startsWith(p)) ||
    STATIC_ASSETS.includes(url.pathname);

  if (isImmutable) {
    // Cache-first: content-addressed assets never change for a given URL.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Navigation requests (index.html and all HTML pages): network-first.
  // The pre-rendered HTML must match the JS bundle — always fetch fresh.
  // Only fall back to a minimal offline page if the network is completely unreachable.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>DreamCloud — Offline</title>' +
              '<meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<style>body{margin:0;background:#060614;color:rgba(232,232,255,.7);font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}h1{font-size:1.2rem;letter-spacing:.1em}</style>' +
              '</head><body><h1>DreamCloud<br><small style="opacity:.4;font-size:.6em">İnternet bağlantısı yok</small></h1></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
      ),
    );
    return;
  }
});
