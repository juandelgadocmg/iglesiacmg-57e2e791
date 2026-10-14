// Unregister any active service worker registrations
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (var i = 0; i < registrations.length; i++) {
      registrations[i].unregister();
    }
  }).catch(function() {});
}
if ('caches' in window) {
  caches.keys().then(function(keys) {
    keys.forEach(function(key) { caches.delete(key); });
  }).catch(function() {});
}
