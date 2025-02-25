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
  messagingSenderId: 'your-messaging-sender-id',
  projectId: 'your-project-id',
  apiKey: 'your-api-key',
  appId: 'your-app-id',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/static/Naamloos.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});