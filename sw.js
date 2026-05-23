/**
 * MedCare | Service Worker — Offline-First Cache
 */

const CACHE_NAME = 'medcare-v2';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './core/db.js',
  './core/router.js',
  './core/state.js',
  './core/firebase.js',
  './core/GhostFluid.js',
  './components/navbar.js',
  './views/splash.js',
  './views/landing.js',
  './views/login.js',
  './views/register.js',
  './views/onboarding.js',
  './views/dashboard.js',
  './views/medications.js',
  './views/add-medication.js',
  './views/interaction-checker.js',
  './views/scan.js',
  './views/reports.js',
  './views/settings.js',
  './views/medical-history.js',
  './views/family-profiles.js',
  './views/emergency.js',
  './views/appointments.js',
  './views/admin.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isExternal = url.origin !== self.location.origin;

  if (isExternal) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});