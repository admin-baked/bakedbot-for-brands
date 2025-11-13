
// This is a self-destructing service worker.
// Its purpose is to unregister any old, lingering service workers
// that might be causing caching issues with stale configurations.

self.addEventListener('install', (event) => {
  // Skip waiting to become the active service worker immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Once active, unregister itself and then reload all clients
  // to ensure they are using the latest, non-service-worker-controlled assets.
  event.waitUntil(
    self.registration.unregister()
      .then(() => {
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach(client => client.navigate(client.url));
      })
  );
});
