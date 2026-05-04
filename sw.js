const CACHE_NAME = "sugbocents-shell-v57";
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
  "js/notifications.js",
  "manifest.json",
  "assets/images/reviews/Savion_Review.png",
  "assets/images/reviews/Julian_Review.jpg",
  "assets/images/reviews/Oliver_Review.jpg",
  "assets/images/reviews/Jon_Review.jpg",
  "assets/images/reviews/Jeoric_Review.png",
  "assets/images/mascot/fullbody-confused.gif",
  "assets/images/mascot/fullbody-dance.gif",
  "assets/images/mascot/fullbody-shocked.gif",
  "assets/images/mascot/fullbody-sleepy.gif",
  "assets/images/mascot/fullbody-wave.gif",
  "assets/images/mascot/mascot-happy.png",
  "assets/images/mascot/mascot-neutral.png",
  "assets/images/mascot/mascot-shocked.png",
  "assets/images/mascot/mascot-sad.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache files individually so one failure doesn't block the whole install
      return Promise.all(
        SHELL_FILES.map((file) =>
          cache.add(file).catch((error) => {
            console.warn("[ServiceWorker] Failed to cache " + file + ":", error);
          })
        )
      );
    })
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

  const url = new URL(event.request.url);
  const isHttp = url.protocol === "http:" || url.protocol === "https:";
  const isSameOrigin = url.origin === self.location.origin;
  const canCache = isHttp && isSameOrigin;
  const isDocument = event.request.mode === "navigate" || event.request.destination === "document";
  const isScript = event.request.destination === "script" || /\/js\/.+\.js$/i.test(url.pathname);

  function maybeCache(request, response) {
    if (!canCache || !response || response.status !== 200) {
      return;
    }
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
  }

  // Network-first for HTML and JS so app logic updates are not stuck on stale cache.
  if (isDocument || isScript) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          maybeCache(event.request, response);
          return response;
        })
        .catch(() => caches.match(event.request))
    );
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

        maybeCache(event.request, response);
        return response;
      });
    })
  );
});


//NOTIFICATIONS
self.addEventListener("push", (event) => {
  let payload = {
    title: "SugboCents",
    body: "You have a new budget update.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    url: "/dashboard.html"
  };

  if (event.data) {
    try {
      payload = Object.assign(payload, event.data.json());
    } catch (error) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: { url: payload.url },
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // Close the notification

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // If the dashboard is already open in a tab, focus it
      for (const client of clientList) {
        if (client.url.includes("dashboard.html") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window to the dashboard
      if (clients.openWindow) {
        var targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : "/dashboard.html";
        return clients.openWindow(targetUrl);
      }
    })
  );
});