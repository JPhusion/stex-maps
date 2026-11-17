// Offline support for STEX Maps.
// App files: try the network first (so updates show up), fall back to the saved copy.
// Logos and fonts: use the saved copy if there is one.
// The Google Sheet roster is not touched here; the app keeps its own last copy.
const CACHE = 'stex-maps-v3';
const SHELL = ['./', 'index.html', 'data.js', 'exhibitors.js', 'map.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'docs.google.com') return;
  const cacheFirst = /filestackcontent\.com|fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com/.test(url.hostname);
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(new Request(req.url, { cache: 'no-cache' })).then(res => {   // always check GitHub for a newer version
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
    );
  } else if (cacheFirst) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }))
    );
  }
});
