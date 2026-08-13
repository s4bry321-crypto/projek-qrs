// Service worker minimal: syarat teknis supaya browser mengizinkan "Install App".
// Belum melakukan caching offline yang berat - cukup untuk lolos syarat PWA installable.
const CACHE_NAME = 'pesan-qr-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: selalu coba ambil data terbaru (penting karena app ini sangat real-time),
// baru fallback ke cache kalau benar-benar offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
