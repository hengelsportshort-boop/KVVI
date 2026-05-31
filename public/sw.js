const CACHE = 'kvvi-v1';
const STATIC_CACHE = 'kvvi-static-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  const isNavigation = request.mode === 'navigate';
  const isStatic =
    url.pathname.startsWith('/_astro/') ||
    /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname);
  const isApi = url.pathname.startsWith('/api/');

  if (isNavigation) {
    event.respondWith(navStrategy(request));
  } else if (isApi) {
    return;
  } else if (isStatic) {
    event.respondWith(cacheFirst(request));
  }
});

async function navStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}
