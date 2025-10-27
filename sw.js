/* === NEEDLEX FINAL – Service Worker (Offline Modus) === */

const CACHE_NAME = "needlex-cache-v1";
const URLS_TO_CACHE = [
  "index.html",
  "about.html",
  "contact.html",
  "article.html",
  "admin.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "data/articles.json",
  "assets/logo.svg"
];

// Installationsphase → Dateien werden vorgeladen
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[ServiceWorker] Caching Seiten & Dateien");
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Aktivierungsphase → Alte Caches löschen
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch → Wenn offline, Inhalte aus Cache laden
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request)
        .then(networkResponse => {
          // Neue Ressourcen in Cache speichern
          if (event.request.url.startsWith("http")) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, networkResponse.clone())
            );
          }
          return networkResponse;
        })
        .catch(() => caches.match("index.html"));
    })
  );
});
