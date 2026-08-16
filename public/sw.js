// Service worker minimal: syarat teknis supaya browser mengizinkan "Install App".
// CACHE_NAME dinaikkan versinya supaya browser yang masih pegang service worker
// lama otomatis update dan buang cache lama begitu ada deploy baru.
const CACHE_NAME = 'pesan-qr-v2';

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Untuk navigasi (buka halaman baru / refresh), WAJIB selalu ambil fresh
  // dari network dengan cache:'no-store' - supaya index.html tidak pernah
  // nyangkut di cache HTTP biasa. Ini penyebab paling umum kenapa perubahan
  // baru tidak muncul walau sudah deploy ulang.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Untuk request lain (JS/CSS/gambar): network-first, fallback ke cache
  // kalau offline.
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
