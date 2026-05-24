/* eslint-disable */
// firebase-messaging-sw.js
// Required by the Firebase Cloud Messaging web SDK. Must live at site root so
// it registers on the default scope '/firebase-cloud-messaging-push-scope/'.
// Coexists with the app-shell service worker (sw.js) — different scopes, no conflict.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDP-udgzbQLSA36kU1UbgklPPj1VdlAv4w",
  authDomain: "sugbocents.firebaseapp.com",
  projectId: "sugbocents",
  appId: "1:408412999406:web:1c06ec4211f78ca6936dff",
  storageBucket: "sugbocents.firebasestorage.app",
  messagingSenderId: "408412999406"
});

var messaging = firebase.messaging();

// Background push handler — fires only when no SugboCents tab is focused.
messaging.onBackgroundMessage(function (payload) {
  var data = (payload && payload.data) || {};
  var title = data.title || "SugboCents";
  var options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.notificationId || data.eventId || undefined,
    data: {
      deepLink: data.deepLink || "/dashboard.html",
      eventId: data.eventId || "",
      notificationId: data.notificationId || "",
      type: data.type || ""
    }
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = (event.notification && event.notification.data) || {};
  var target = data.deepLink || "/dashboard.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var c = windowClients[i];
        try {
          c.postMessage({
            type: "sugbocents:notification-opened",
            eventId: data.eventId || "",
            notificationId: data.notificationId || "",
            deepLink: target
          });
        } catch (_) { /* noop */ }
        if ("focus" in c) {
          try { c.navigate(target); } catch (_) { /* cross-origin or unsupported */ }
          return c.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
      return null;
    })
  );
});
