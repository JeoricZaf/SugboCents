const CACHE_NAME = "sugbocents-shell-v31";
const SHELL_FILES = [
  "./",
  "index.html",
  "landing.html",
  "login.html",
  "register.html",
  "dashboard.html",
  "activity.html",
  "stats.html",
  "tigom.html",
  "settings.html",
  "css/style.css",
  "css/landing.css",
  "js/firebase-init.js",
  "js/firebase-auth-service.js",
  "js/firestore-service.js",
  "js/app.js",
  "js/storage.js",
  "js/auth.js",
  "js/dashboard.js",
  "js/landing.js",
  "js/index-redirect.js",
  "manifest.json",
  "assets/images/reviews/Savion_Review.png",
  "assets/images/reviews/Julian_Review.jpg",
  "assets/images/reviews/Oliver_Review.jpg",
  "assets/images/reviews/Jon_Review.jpg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
