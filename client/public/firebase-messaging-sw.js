// Cache version
const CACHE_VERSION = 'v2.1.0'; // Updated version number
const CACHE_NAME = `mefen-cache-${CACHE_VERSION}`;

// Assets to cache
const assetsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/Naamloos.png',
  '/static/logo192.png',
  '/static/logo512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(assetsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('mefen-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Firebase messaging setup
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  messagingSenderId: 'your-messaging-sender-id',
  appId: 'your-app-id',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title || 'Nieuwe Vrijwilliger Aanmelding';
  const notificationOptions = {
    body: payload.notification.body || 'Er heeft zich een nieuwe vrijwilliger aangemeld.',
    icon: '/static/Naamloos.png',
    badge: '/static/icon-512x512.png',
    tag: 'volunteer-registration',
    data: payload.data,
    actions: [{
      action: 'view_registration',
      title: 'Bekijk Aanmelding'
    }]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  const rootUrl = self.location.origin;
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      // Als we een open venster hebben, focus daar op
      for (let client of windowClients) {
        if (client.url === rootUrl + '/volunteers' && 'focus' in client) {
          return client.focus();
        }
      }
      // Anders open een nieuw venster
      if (clients.openWindow) {
        return clients.openWindow('/volunteers');
      }
    })
  );
});