// Cache version
const CACHE_VERSION = 'v2.1.0';
const CACHE_NAME = `mefen-cache-${CACHE_VERSION}`;

// Assets to cache
const assetsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/mosque_15418029.png',
  '/static/Naamloos.png',
  '/static/icon-512x512.png'
];

// Pre-cache during installation
self.addEventListener('install', (event) => {
  // Force waiting service worker to become active
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(assetsToCache))
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

// Firebase messaging setup
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Nieuwe Vrijwilliger';
  const notificationOptions = {
    body: payload.notification?.body || 'Er is een nieuwe vrijwilliger aanmelding.',
    icon: '/static/Naamloos.png',
    badge: '/static/icon-512x512.png',
    tag: 'volunteer-registration',
    requireInteraction: true, // Notificatie blijft zichtbaar tot er op geklikt wordt
    vibrate: [200, 100, 200], // Trilpatroon voor mobiele apparaten
    data: payload.data || {},
    actions: [
      {
        action: 'view_registration',
        title: 'Bekijk Aanmelding'
      }
    ]
  };

  // Toon de notificatie
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  const rootUrl = self.location.origin;
  event.notification.close();

  // Voeg de URL toe aan de notification data
  const urlToOpen = new URL('/volunteers', rootUrl).href;

  // Als er een specifieke action is geklikt
  if (event.action === 'view_registration') {
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(windowClients => {
        // Probeer eerst een bestaand venster te focussen
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Als er geen venster is, open een nieuwe
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  if (event.data) {
    const data = event.data.json();
    const title = data.notification?.title || 'Nieuwe Melding';
    const options = {
      ...data.notification,
      icon: '/static/Naamloos.png',
      badge: '/static/icon-512x512.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});