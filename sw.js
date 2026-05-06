const CACHE_NAME = "sugbocents-shell-v91";
const SHELL_FILES = [
  "./",
  "index.html",
  "landing.html",
  "login.html",
  "register.html",
  "dashboard.html",
  "activity.html",
  "stats.html",
  "profile.html",
  "badges.html",
  "tigom.html",
  "settings.html",
  "chat.html",
  "css/style.css",
  "css/landing.css",
  "css/dark-mode.css",
  "css/spending-chart.css",
  "css/stats.css",
  "css/mascot.css",
  "css/tigom.css",
  "js/firebase-init.js",
  "js/firebase-auth-service.js",
  "js/firestore-service.js",
  "js/app.js",
  "js/gamification.js",
  "js/profile.js",
  "js/badges.js",
  "js/storage.js",
  "js/auth.js",
  "js/dark-mode.js",
  "js/dashboard.js",
  "js/dashboard-stats.js",
  "js/activity.js",
  "js/stats.js",
  "js/spending-chart.js",
  "js/mascot.js",
  "js/tigom.js",
  "js/settings.js",
  "js/landing.js",
  "js/index-redirect.js",
  "js/chat-ai.js",
  "js/chat.js",
  "manifest.json",
  "assets/images/reviews/Savion_Review.png",
  "assets/images/reviews/Julian_Review.jpg",
  "assets/images/reviews/Oliver_Review.jpg",
  "assets/images/reviews/Jon_Review.jpg",
  "assets/images/reviews/Jeoric_Review.png",
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
