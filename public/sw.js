// Dummy Service Worker to clear any legacy PWA registrations
self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    self.registration.unregister().then(function() {
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        // Do not force reload, just allow direct network requests
      });
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Always fetch directly from network without caching
  event.respondWith(fetch(event.request));
});
