// Kids Schedule Pro — Service Worker
// Version bump this to force cache refresh
const CACHE = 'kids-schedule-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Quicksand:wght@500;600;700&display=swap'
];

// ── Install: cache all assets ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first, fallback to network ────
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin requests we don't care about
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses for our own files
        if (response.ok && event.request.url.includes(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        // Offline fallback — serve index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Push Notifications ─────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || '⭐ Kids Schedule', {
      body: data.body || 'Activity reminder!',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'kids-schedule',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: './' }
    })
  );
});

// ── Notification click: open the app ──────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('kids-schedule'));
      if (existing) return existing.focus();
      return clients.openWindow('./');
    })
  );
});
