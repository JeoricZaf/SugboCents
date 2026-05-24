importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

try {
  firebase.initializeApp({
    apiKey: "AIzaSyDP-udgzbQLSA36kU1UbgklPPj1VdlAv4w",
    authDomain: "sugbocents.firebaseapp.com",
    projectId: "sugbocents",
    appId: "1:408412999406:web:1c06ec4211f78ca6936dff",
    storageBucket: "sugbocents.firebasestorage.app",
    messagingSenderId: "408412999406"
  });
} catch (_) {
  // Firebase app may already be initialized in this worker scope.
}

const CACHE_NAME = "sugbocents-shell-v166";
const RUNTIME_CACHE = "sugbocents-runtime-v166";
const SHELL_FILES = [
  "./",
  "index.html",
  "firebase-messaging-sw.js",
  "landing.html",
  "login.html",
  "register.html",
  "dashboard.html",
  "activity.html",
  "stats.html",
  "shop.html",
  "leaderboard.html",
  "profile.html",
  "achievements.html",
  "quests.html",
  "dev-notifications.html",
  "tigom.html",
  "settings.html",
  "chat.html",
  "css/style.css",
  "css/motion.css",
  "css/landing.css",
  "css/dark-mode.css",
  "css/spending-chart.css",
  "css/stats.css",
  "css/mascot.css",
  "css/tigom.css",
  "js/chrome.js",
  "js/firebase-init.js",
  "js/firebase-auth-service.js",
  "js/firestore-service.js",
  "js/motion.js",
  "js/app.js",
  "js/notifications.js",
  "js/gamification.js",
  "js/quests.js",
  "js/storage.js",
  "js/auth.js",
  "js/dark-mode.js",
  "js/dashboard.js",
  "js/activity.js",
  "js/stats.js",
  "js/spending-chart.js",
  "js/mascot.js",
  "js/tigom.js",
  "js/settings.js",
  "js/landing.js",
  "js/index-redirect.js",
  "js/shop.js",
  "js/leaderboard.js",
  "js/profile.js",
  "js/achievements.js",
  "js/chat-ai.js",
  "js/chat.js",
  "js/dev-notifications.js",
  "manifest.json",
  "css/dev-notifications.css",
  "assets/images/reviews/Savion_Review.png",
  "assets/images/reviews/Julian_Review.jpg",
  "assets/images/reviews/Oliver_Review.jpg",
  "assets/images/reviews/Jon_Review.jpg",
  "assets/images/reviews/Jeoric_Review.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

const RUNTIME_HOSTS = {
  "fonts.gstatic.com": true,
  "firebasestorage.googleapis.com": true
};

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(function (payload) {
    const data = payload && payload.data ? payload.data : {};
    const title = (payload && payload.notification && payload.notification.title) || data.title || "SugboCents";
    const options = {
      body: (payload && payload.notification && payload.notification.body) || data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.type || "sugbocents-notification",
      data: {
        deepLink: data.deepLink || "/dashboard.html",
        type: data.type || "",
        eventId: data.eventId || "",
        notificationId: data.notificationId || ""
      }
    };
    return self.registration.showNotification(title, options);
  });
} catch (_) {
  // Messaging may not be available in local fallback mode.
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const payload = event.notification && event.notification.data ? event.notification.data : {};
  const deepLink = payload.deepLink || "/dashboard.html";
  const eventId = payload.eventId || "";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      clientList.forEach(function (client) {
        if (eventId && client && client.postMessage) {
          client.postMessage({
            type: "sugbocents:notification-opened",
            eventId: eventId
          });
        }
      });

      for (let i = 0; i < clientList.length; i++) {
        const c = clientList[i];
        if (c && "focus" in c) {
          if (c.url && c.url.indexOf(deepLink.replace(/^\//, "")) !== -1) {
            return c.focus();
          }
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(deepLink);
      }
      return null;
    })
  );
});

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
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function cacheFirst(event) {
  return caches.match(event.request).then((cached) => {
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
  });
}

function staleWhileRevalidate(event) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(event.request).then((cached) => {
      const networkRequest = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cached || Response.error());

      if (cached) {
        return cached;
      }
      return networkRequest;
    })
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }

  const url = new URL(event.request.url);
  if (RUNTIME_HOSTS[url.hostname]) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  event.respondWith(cacheFirst(event));
});
