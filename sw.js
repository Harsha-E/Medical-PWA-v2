/**
 * MedCare | Service Worker — Offline-First Cache
 */

const CACHE_NAME = 'medcare-v5';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/assets/logo.jpeg',
  '/core/db.js',
  '/core/router.js',
  '/core/state.js',
  '/core/firebase.js',
  '/core/GhostFluid.js',
  '/components/navbar.js',
  '/views/splash.js',
  '/views/landing.js',
  '/views/login.js',
  '/views/register.js',
  '/views/onboarding.js',
  '/views/dashboard.js',
  '/views/medications.js',
  '/views/add-medication.js',
  '/views/interaction-checker.js',
  '/views/scan.js',
  '/views/reports.js',
  '/views/settings.js',
  '/views/medical-history.js',
  '/views/family-profiles.js',
  '/views/emergency.js',
  '/views/appointments.js',
  '/views/admin.js'
];

self.addEventListener('install', (event) => {
  console.log('[SW] install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isExternal = requestUrl.origin !== self.location.origin;

  if (isExternal) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      caches.match('/index.html').then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      return cachedResponse || networkFetch;
    })
  );
});