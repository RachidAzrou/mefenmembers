const CACHE_NAME = 'mefen-volunteerapp-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/logo.svg',
  '/static/Naamloos.png',
  '/static/123.jpg',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  '/src/pages/login.tsx',
  '/src/pages/register.tsx', // Add register page
  '/src/pages/volunteers.tsx',
  '/src/pages/materials.tsx',
  '/src/pages/planning.tsx',
  '/src/pages/import-export.tsx' // Add import/export page
];

// Pre-cache during installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  // Force activation
  self.skipWaiting();
});

// Cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Return cached response
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it can only be used once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Add response to cache
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // Return a fallback response if network request fails
          return new Response('Offline content not available');
        });
      })
  );
});

// Clean up old caches during activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients
  self.clients.claim();
});