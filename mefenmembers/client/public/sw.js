const CACHE_NAME = 'mefen-memberapp-v1.1.0'; // Updated version number and name
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/membership_7548050.png',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  '/src/pages/login.tsx',
  '/src/pages/register.tsx',
  '/src/pages/members.tsx',
  '/src/pages/members-list.tsx',
  '/src/pages/dashboard.tsx',
  '/src/pages/export.tsx'
];

// Pre-cache during installation
self.addEventListener('install', (event) => {
  // Force waiting service worker to become active
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Clean up old caches during activation
self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Always try network first, then fall back to cache
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response because it can only be used once
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Add response to cache
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Return cached response if network fails
            return response || new Response('Offline content not available');
          });
      })
  );
});