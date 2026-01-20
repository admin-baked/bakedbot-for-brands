/* eslint-disable */
// BakedBot PWA Service Worker
// Provides offline functionality and caching

const CACHE_NAME = 'bakedbot-v2'; // Bump version to invalidate old caches
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
];

// Paths that should NEVER be cached (dynamic content)
const NO_CACHE_PATHS = [
  '/api/',
  '/dashboard/',
  '/_next/webpack-hmr', // HMR for dev
];

// Check if a URL is a dynamic brand page (single segment after root)
function isDynamicBrandPage(url) {
  const path = new URL(url).pathname;
  // Match patterns like /brandname, /ecstaticedibles, etc.
  // But NOT /dashboard, /api, /pricing, /_next, etc.
  const staticPaths = ['dashboard', 'api', 'pricing', 'checkout', 'onboarding', 'brand-login', 'claim', '_next', 'static'];
  const segments = path.split('/').filter(Boolean);

  // Single segment path that's not a known static path = likely a brand page
  if (segments.length === 1 && !staticPaths.includes(segments[0])) {
    return true;
  }
  // Also match /brandname/collection patterns
  if (segments.length >= 1 && !staticPaths.includes(segments[0])) {
    return true;
  }
  return false;
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // Network-first strategy for API calls
  if (url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Network-first (no cache) for dashboard and dynamic brand pages
  if (url.includes('/dashboard/') || isDynamicBrandPage(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Return the response directly without caching
          return response;
        })
        .catch(() => {
          // On network failure for navigation, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL).then((offlineResp) => offlineResp || new Response('', { status: 503 }));
          }
          return new Response('', { status: 503 });
        })
    );
    return;
  }

  // Cache-first strategy for truly static assets only
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((networkResponse) => {
        // Only treat actual network errors or 5xx server errors as offline
        if (!networkResponse || networkResponse.status >= 500 || networkResponse.type === 'error') {
          return caches.match(OFFLINE_URL).then((offlineResp) => offlineResp || new Response('', { status: 503 }));
        }

        // Only cache truly static assets (not HTML pages)
        const contentType = networkResponse.headers.get('content-type') || '';
        const shouldCache = contentType.includes('javascript') ||
                           contentType.includes('css') ||
                           contentType.includes('image') ||
                           contentType.includes('font') ||
                           url.includes('/manifest.json');

        if (shouldCache) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL).then((offlineResp) => offlineResp || new Response('', { status: 503 }));
        }
        return new Response('', { status: 503 });
      });
    })
  );
});

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'BakedBot Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
