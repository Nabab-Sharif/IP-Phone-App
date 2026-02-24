const CACHE_VERSION = 'v1';
const CACHE_NAME = `mnr-phone-${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {
                // Gracefully handle if some files can't be cached
                return Promise.resolve();
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip cross-origin requests and non-GET requests
    if (!request.url.startsWith(self.location.origin) || request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(request)
        .then((response) => {
            // Don't cache non-successful responses
            if (response.status !== 200) {
                return response;
            }

            // Clone response for cache storage
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
            });

            return response;
        })
        .catch(() => {
            // Fallback to cached version
            return caches.match(request).then((cached) => {
                if (cached) {
                    return cached;
                }

                // Return offline page or fallback response
                return new Response('Offline - Page not cached', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            });
        })
    );
});