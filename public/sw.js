// Service Worker for Bobby's Coin Flip PWA
// Uses 2025 Service Worker API standards and Workbox concepts

const CACHE_NAME = 'bobbys-coin-flip-v1.0.0';
const RUNTIME_CACHE = 'bobbys-runtime-cache-v1.0.0';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/game.html', 
  '/leaderboard.html',
  '/profile.html',
  '/multiplayer.html',
  '/css/style.css',
  '/js/auth.js',
  '/js/game.js',
  '/js/leaderboard.js', 
  '/js/profile.js',
  '/js/multiplayer.js',
  '/manifest.json',
  // External dependencies
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap'
];

// Runtime caching patterns
const RUNTIME_STRATEGIES = {
  // API calls - Network First (always try fresh data)
  api: {
    pattern: /^https?:\/\/.*\/api\/.*/,
    strategy: 'NetworkFirst',
    networkTimeoutSeconds: 3
  },
  
  // Static assets - Cache First  
  static: {
    pattern: /\.(?:js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2)$/,
    strategy: 'CacheFirst',
    maxEntries: 50,
    maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
  },
  
  // HTML pages - Network First with fallback
  pages: {
    pattern: /\.html$|\/$/,
    strategy: 'NetworkFirst',
    networkTimeoutSeconds: 3
  }
};

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Install event triggered');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting to activate immediately');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event triggered');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Taking control of all clients');
        return self.clients.claim();
      })
  );
});

// Fetch event: Apply caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(handleFetch(request));
});

// Main fetch handler with caching strategies
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // API requests - Network First
    if (RUNTIME_STRATEGIES.api.pattern.test(request.url)) {
      return await networkFirst(request, RUNTIME_CACHE);
    }
    
    // Static assets - Cache First
    if (RUNTIME_STRATEGIES.static.pattern.test(request.url)) {
      return await cacheFirst(request, RUNTIME_CACHE);
    }
    
    // HTML pages - Network First with offline fallback
    if (RUNTIME_STRATEGIES.pages.pattern.test(request.url) || url.pathname === '/') {
      return await networkFirstWithFallback(request);
    }
    
    // Default: Network First for everything else
    return await networkFirst(request, RUNTIME_CACHE);
    
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return await getOfflineFallback(request);
  }
}

// Network First strategy
async function networkFirst(request, cacheName = CACHE_NAME, timeout = 3000) {
  const cache = await caches.open(cacheName);
  
  try {
    // Try network with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      // Cache successful responses
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache First strategy  
async function cacheFirst(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(error => {
      console.log('[SW] Background cache update failed:', error);
    });
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First with offline fallback
async function networkFirstWithFallback(request) {
  try {
    return await networkFirst(request, CACHE_NAME);
  } catch (error) {
    // Return offline fallback page
    return await getOfflineFallback(request);
  }
}

// Get offline fallback response
async function getOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  
  // For HTML requests, try to return the main page
  if (request.headers.get('accept').includes('text/html')) {
    return await cache.match('/') || await cache.match('/index.html');
  }
  
  // For API requests, return a JSON error response
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Offline - API unavailable',
        offline: true 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
  
  // For other resources, throw error
  throw new Error('No offline fallback available');
}

// Background sync for failed API calls (when supported)
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  self.addEventListener('sync', event => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync-game-data') {
      event.waitUntil(syncGameData());
    }
  });
}

// Sync game data when back online
async function syncGameData() {
  try {
    // This would sync any pending game data when back online
    console.log('[SW] Syncing game data...');
    // Implementation would depend on your offline storage strategy
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handler (for future use)
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New update available!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'general',
      renotify: true,
      requireInteraction: false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Bobby\'s Coin Flip', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing window or open new one
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
  );
});

console.log('[SW] Service Worker loaded and ready');