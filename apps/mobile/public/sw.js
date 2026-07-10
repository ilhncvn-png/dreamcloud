// DreamCloud Service Worker v1
// Caches the application shell for offline access.
// Never caches API responses or authenticated user data.

const CACHE_VERSION = 'v1';
const CACHE_NAME = `dreamcloud-shell-${CACHE_VERSION}`;

const SHELL_URLS = ['/', '/index.html', '/favicon.ico', '/manifest.json', '/icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept API requests — always go to the network.
  if (url.hostname === 'api.dreamclaude.org') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (
          response.ok &&
          (url.pathname.startsWith('/_expo/') ||
            url.pathname.startsWith('/assets/') ||
            url.pathname === '/favicon.ico' ||
            url.pathname === '/manifest.json' ||
            url.pathname === '/icon.png')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });

      // Return cached version immediately, update in background.
      // For navigation requests with no cache, wait for network.
      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }

      return networkFetch.catch(() => {
        // Offline fallback: return the shell for navigation requests.
        if (event.request.mode === 'navigate') {
          return caches
            .match('/index.html')
            .then((shell) => shell ?? new Response('Offline', { status: 503 }));
        }
        return new Response('', { status: 503 });
      });
    }),
  );
});
