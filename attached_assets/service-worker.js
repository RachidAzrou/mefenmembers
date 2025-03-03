const cacheName = 'sufuf-app-cache-v4.4'; // Zorg ervoor dat deze versie altijd wordt verhoogd wanneer je nieuwe veranderingen uitbrengt
const assets = [
const assets = [
  '/',
  '/index.html',
  '/imam.html',
  '/vrijwilliger.html',
  '/styles.css',
  '/images/logo.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
];

// Tijdens de installatie voeg je de assets toe aan de cache
self.addEventListener('install', (event) => {
  self.skipWaiting();  // Forceer de nieuwe service worker om direct te activeren
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Tijdens de activatie kun je de oude caches opruimen
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [cacheName];  // Nieuwe cache naam die je wilt behouden
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (!cacheWhitelist.includes(cache)) {
            // Verwijder alle oude caches die niet meer nodig zijn
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Het ophalen van de resources wordt eerst uit de cache gehaald, en als ze niet beschikbaar zijn, wordt er een fetch-request uitgevoerd
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cacheResponse) => {
      return cacheResponse || fetch(event.request); // Als niet in cache, haal het op van het netwerk
    })
  );
});
