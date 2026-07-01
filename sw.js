/**
 * MedCare | Service Worker — Offline-First Cache
 */
const CACHE_NAME = 'medcare-v55';
const DATA_CACHE_NAME = 'medcare-data-v55';
const BASE_PATH = self.location.hostname === 'harsha-e.github.io' ? '/Medical-PWA-v2' : '';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.local.json',
  '/manifest.github.json',
  '/assets/logo.webp',
  '/assets/Bg-Video.webm',
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
  '/views/install2.js',
  '/utils/CustomModals.js',
  '/services/PeerMesh.js',
  '/services/SyncBridge.js',
  '/services/DocLedger.js',
  '/workers/vision.worker.js',
  '/data/drug-graph.json',
  '/data/drug-index.json'
].map(path => BASE_PATH + path);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const data = event.data.json();
            if (data.type === 'missed_dose' || data.type === 'alert') {
                const title = data.title || 'MedCare Alert';
                const options = {
                    body: data.body || 'You have an important medication alert.',
                    icon: '/assets/logo.webp',
                    badge: '/assets/logo.webp',
                    vibrate: [200, 100, 200, 100, 200],
                    data: {
                        url: data.url || '/'
                    },
                    requireInteraction: true
                };
                event.waitUntil(self.registration.showNotification(title, options));
            }
        } catch (e) {
            console.error('Failed to parse push data:', e);
        }
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            let matchingClient = null;
            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.url === urlToOpen) {
                    matchingClient = windowClient;
                    break;
                }
            }
            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'show_notification') {
        const payload = event.data.payload;
        const title = payload.title || 'MedCare Alert';
        const options = {
            body: payload.body || 'You have an important medication alert.',
            icon: '/assets/logo.webp',
            badge: '/assets/logo.webp',
            vibrate: [200, 100, 200, 100, 200],
            data: {
                url: payload.url || '/'
            },
            requireInteraction: true
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});