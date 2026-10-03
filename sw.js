// Versioning the cache allows us to easily push updates later.
// Change this string (e.g., to 'tx-parser-cache-v2') to force clients to clear the old cache.
const CACHE_NAME = 'tx-parser-cache-v1';

// A list of all core application files and external CDN libraries needed for offline operation.
const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://nonsenseian.github.io/nonsenseian_logo.png',
  'https://nonsenseian.github.io/global-components.js?v=2',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// 1. INSTALL EVENT: Triggered the first time the user visits the page.
// We use this to pre-cache all the critical assets listed above.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 2. FETCH EVENT: Intercepts all network requests made by the app.
// We use a "Cache First, falling back to Network" strategy.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the file is in the cache, return it immediately (Offline Mode).
        if (response) {
          return response; 
        }
        
        // If it's not in the cache, try fetching it from the internet.
        return fetch(event.request).then(
          function(response) {
            // Ensure we only cache valid, successful responses.
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // We must clone the response because it's a stream that can only be consumed once.
            // One copy goes to the cache, the other goes back to the browser.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Prevent caching Google Charts (gstatic.com) as it relies on dynamic modules 
                // that break if partially cached. Also ensure we only cache http/https requests.
                if (!event.request.url.includes('gstatic.com') && event.request.url.startsWith('http')) {
                   cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});

// 3. ACTIVATE EVENT: Triggered when the service worker starts up.
// We use this to clean up any old, outdated caches left behind by previous versions.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
