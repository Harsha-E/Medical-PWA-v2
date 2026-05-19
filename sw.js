importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
    console.log(`[Service Worker] Workbox loaded successfully.`);
    
    // Force immediate control upon update
    workbox.core.skipWaiting();
    workbox.core.clientsClaim();

    // Precache core app shell
    workbox.routing.registerRoute(
        ({request}) => request.destination === 'document' || 
                       request.destination === 'style' || 
                       request.destination === 'script',
        new workbox.strategies.StaleWhileRevalidate({
            cacheName: 'medcare-app-shell-v1',
        })
    );

    // Cache CDNs (Dexie, TF.js, etc.)
    workbox.routing.registerRoute(
        ({url}) => url.origin === 'https://unpkg.com' || url.origin === 'https://cdn.jsdelivr.net' || url.origin === 'https://cdnjs.cloudflare.com',
        new workbox.strategies.CacheFirst({
            cacheName: 'medcare-cdn-cache-v1',
            plugins: [
                new workbox.expiration.ExpirationPlugin({
                    maxEntries: 20,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                }),
            ],
        })
    );
} else {
    console.error(`[Service Worker] Workbox failed to load.`);
}