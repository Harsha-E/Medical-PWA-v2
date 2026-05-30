/**
 * MedCare | Service Worker — Offline-First Cache
 */

const CACHE_NAME = 'medcare-v8';

const BASE_PATH = self.location.hostname === 'harsha-e.github.io' ? '/Medical-PWA-v2' : '';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.local.json',
  '/manifest.github.json',
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
  '/views/admin.js',
  '/views/install.js',
  '/services/PeerMesh.js',
  '/services/SyncBridge.js',
  '/services/DocLedger.js',
  '/workers/vision.worker.js',
  '/vendor/peerjs.min.js',
  '/vendor/yjs.mjs',
  '/vendor/fuse.min.js',
  '/vendor/qrcode.min.js',
  '/vendor/mediapipe/vision_bundle.mjs',
  '/vendor/mediapipe/wasm/vision_wasm_internal.js',
  '/vendor/mediapipe/wasm/vision_wasm_internal.wasm',
  '/vendor/mediapipe/efficientdet_lite0.tflite',
  '/vendor/tesseract/tesseract.min.js',
  '/vendor/tesseract/worker.min.js',
  '/vendor/tesseract/tesseract-core.wasm.js',
  '/vendor/tesseract/eng.traineddata'
].map(path => BASE_PATH + path);

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
      caches.match(`${BASE_PATH}/index.html`).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => caches.match(`${BASE_PATH}/index.html`));
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