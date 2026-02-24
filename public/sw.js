const CACHE_VERSION = 'v1';
const CACHE_NAME = `mnr-phone-${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/favicon.ico'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch((error) => {
                console.warn('Some assets failed to cache:', error);
                return Promise.resolve();
            });
        }).then(() => {
            console.log('Service Worker installed');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => {
                    console.log('Deleting old cache:', name);
                    return caches.delete(name);
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request).then((cached) => {
                    if (cached) {
                        return cached;
                    }
                    // Return index.html as fallback for SPA
                    return caches.match('/index.html');
                });
            })
        );
        return;
    }

    // Handle all other requests
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

                // Return offline response based on request type
                if (request.destination === 'image') {
                    return new Response(
                        '<svg role="img" aria-label="Offline" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect fill="#ddd" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#999">Offline</text></svg>', {
                            headers: { 'Content-Type': 'image/svg+xml' }
                        }
                    );
                }

                return new Response('Offline - Content not available', {
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