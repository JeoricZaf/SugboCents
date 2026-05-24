(function () {
  var SOFT_PROMPT_KEY = "sugbocents.notif.softPromptShown";
  var DEFAULT_PREFS = {
    pushEnabled: false,
    emailEnabled: true,
    dailyReminderEnabled: false,
    dailyReminderHour: 20,
    socialEnabled: true,
    quietHoursStart: 21,
    quietHoursEnd: 8,
    setupDone: false,
    lastUpdated: null
  };

  var state = {
    initialized: false,
    drawerOpen: false,
    currentNotifications: [],
    unsubUnread: null,
    unsubList: null,
    foregroundListenerWired: false
  };

  function detectPlatform() {
    var ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) { return "android"; }
    if (/iPhone|iPad|iPod/i.test(ua)) { return "ios"; }
    return "desktop";
  }

  function isPushSupported() {
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  }

  function isIosUnsupported() {
    if (detectPlatform() !== "ios") { return false; }
    var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    return !standalone;
  }

  function ensureDrawerMarkup() {
    if (document.getElementById("notifDrawer")) { return; }

    var overlay = document.createElement("div");
    overlay.id = "notifDrawerOverlay";
    overlay.className = "notif-drawer-overlay";
    overlay.addEventListener("click", closeDrawer);

    var drawer = document.createElement("aside");
    drawer.id = "notifDrawer";
    drawer.className = "notif-drawer";
    drawer.setAttribute("aria-label", "Notifications inbox");
    drawer.innerHTML =
      '<div class="notif-drawer__header">' +
      '  <h2>Notifications</h2>' +
      '  <button id="notifDrawerClose" type="button" class="notif-drawer__close" aria-label="Close notifications">&times;</button>' +
      '</div>' +
      '<div class="notif-drawer__body">' +
      '  <div id="notifDrawerList" class="notif-drawer__list"></div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    var closeBtn = document.getElementById("notifDrawerClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeDrawer);
    }
  }

  function renderEmptyDrawer(message) {
    var list = document.getElementById("notifDrawerList");
    if (!list) { return; }
    list.innerHTML = '<p class="notif-drawer__empty">' + (message || "No notifications yet.") + '</p>';
  }

  function renderDrawerList(items) {
    var list = document.getElementById("notifDrawerList");
    if (!list) { return; }

    if (!Array.isArray(items) || items.length === 0) {
      renderEmptyDrawer("No notifications yet.");
      return;
    }

    list.innerHTML = items.map(function (item) {
      var title = escapeHtml(String(item.title || "SugboCents"));
      var body = escapeHtml(String(item.body || ""));
      var sentAt = item.sentAtDate ? item.sentAtDate.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }) : "Just now";
      var unreadCls = item.readAt ? "" : " notif-item--unread";
      return '' +
        '<button type="button" class="notif-item' + unreadCls + '" data-notif-id="' + escapeHtml(item.id) + '" data-deep-link="' + escapeHtml(item.deepLink || "dashboard.html") + '" data-event-id="' + escapeHtml(item.eventId || "") + '">' +
        '  <div class="notif-item__title">' + title + '</div>' +
        '  <div class="notif-item__body">' + body + '</div>' +
        '  <div class="notif-item__meta">' + escapeHtml(sentAt) + '</div>' +
        '</button>';
    }).join("");

    var buttons = list.querySelectorAll(".notif-item");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var notifId = String(btn.getAttribute("data-notif-id") || "");
        var deepLink = String(btn.getAttribute("data-deep-link") || "dashboard.html");
        var eventId = String(btn.getAttribute("data-event-id") || "");
        markNotificationRead(notifId).then(function () {
          if (eventId) { return trackNotificationOpen(eventId); }
        }).finally(function () {
          closeDrawer();
          window.location.href = deepLink.charAt(0) === "/" ? deepLink.slice(1) : deepLink;
        });
      });
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setBellCount(count) {
    var badge = document.getElementById("notifBellBadge");
    if (!badge) { return; }
    var safeCount = Number(count) || 0;
    if (safeCount <= 0) {
      badge.classList.add("is-hidden");
      badge.textContent = "";
      return;
    }
    badge.classList.remove("is-hidden");
    badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
  }

  function openDrawer() {
    ensureDrawerMarkup();
    var drawer = document.getElementById("notifDrawer");
    var overlay = document.getElementById("notifDrawerOverlay");
    if (!drawer || !overlay) { return; }
    state.drawerOpen = true;
    drawer.classList.add("is-open");
    overlay.classList.add("is-visible");
  }

  function closeDrawer() {
    var drawer = document.getElementById("notifDrawer");
    var overlay = document.getElementById("notifDrawerOverlay");
    if (!drawer || !overlay) { return; }
    state.drawerOpen = false;
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-visible");
  }

  function wireBell() {
    var bell = document.getElementById("notifBellButton");
    if (!bell || bell.dataset.bound === "1") { return; }
    bell.dataset.bound = "1";
    bell.addEventListener("click", function () {
      if (state.drawerOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  function getPrefs() {
    var source = window.StorageAPI && window.StorageAPI.getNotificationPrefs
      ? window.StorageAPI.getNotificationPrefs()
      : null;
    return Object.assign({}, DEFAULT_PREFS, source || {});
  }

  function updatePrefs(patch) {
    var next = Object.assign({}, getPrefs(), patch || {}, { lastUpdated: new Date().toISOString() });
    if (window.StorageAPI && window.StorageAPI.setNotificationPrefs) {
      return Promise.resolve(window.StorageAPI.setNotificationPrefs(next)).then(function () {
        return next;
      });
    }
    if (window.StorageAPI && window.StorageAPI.savePreferences) {
      window.StorageAPI.savePreferences({ notificationPrefs: next });
    }
    return Promise.resolve(next);
  }

  function getFirebaseState() {
    if (!window.FirebaseInit || !window.FirebaseInit.ready) {
      return Promise.resolve(null);
    }
    return window.FirebaseInit.ready.then(function () {
      var auth = window.FirebaseInit.getAuth ? window.FirebaseInit.getAuth() : null;
      var db = window.FirebaseInit.getDb ? window.FirebaseInit.getDb() : null;
      var messaging = window.FirebaseInit.getMessaging ? window.FirebaseInit.getMessaging() : null;
      var vapidKey = window.FirebaseInit.getVapidKey ? window.FirebaseInit.getVapidKey() : null;
      return {
        auth: auth,
        db: db,
        messaging: messaging,
        vapidKey: vapidKey
      };
    });
  }

  function makeTokenId(token) {
    try {
      return btoa(token).replace(/[^a-zA-Z0-9]/g, "").slice(0, 44);
    } catch (_) {
      return String(token || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 44);
    }
  }

  function saveTokenToFirestore(token) {
    return getFirebaseState().then(function (ctx) {
      if (!ctx || !ctx.db || !ctx.auth || !ctx.auth.currentUser || !token) {
        return null;
      }
      var uid = String(ctx.auth.currentUser.uid || "");
      if (!uid) { return null; }
      var tokenId = makeTokenId(token);
      return ctx.db.collection("users").doc(uid)
        .collection("fcmTokens").doc(tokenId)
        .set({
          token: token,
          platform: detectPlatform(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
  }

  function persistPushSetupFailure(reason) {
    var safeReason = String(reason || "unknown").slice(0, 100);
    return updatePrefs({
      pushEnabled: false,
      setupDone: true,
      pushSetupFailure: safeReason
    }).catch(function () {
      return null;
    });
  }

  function requestPermissionAndRegister() {
    if (!isPushSupported()) {
      return persistPushSetupFailure("unsupported").then(function () {
        return { ok: false, reason: "unsupported" };
      });
    }
    if (isIosUnsupported()) {
      return persistPushSetupFailure("ios-not-installed").then(function () {
        return { ok: false, reason: "ios-not-installed" };
      });
    }

    return Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") {
        return persistPushSetupFailure("permission-denied").then(function () {
          return { ok: false, reason: "denied" };
        });
      }

      return navigator.serviceWorker.ready
        .then(function (registration) {
          return getFirebaseState().then(function (ctx) {
            if (!ctx || !ctx.messaging || !ctx.vapidKey) {
              return persistPushSetupFailure("no-messaging").then(function () {
                return { ok: false, reason: "no-messaging" };
              });
            }
            return ctx.messaging.getToken({
              vapidKey: ctx.vapidKey,
              serviceWorkerRegistration: registration
            }).then(function (token) {
              if (!token) {
                return persistPushSetupFailure("no-token").then(function () {
                  return { ok: false, reason: "no-token" };
                });
              }
              return saveTokenToFirestore(token)
                .then(function () {
                  return updatePrefs({ pushEnabled: true, setupDone: true, pushSetupFailure: "" });
                })
                .then(function () {
                  return { ok: true, token: token };
                });
            });
          });
        })
        .catch(function (err) {
          console.warn("[Notifications] token registration failed:", err);
          var failureReason = err && err.code
            ? String(err.code)
            : String(err && err.message || err || "error").slice(0, 100);
          return persistPushSetupFailure(failureReason).then(function () {
            return { ok: false, reason: "error", error: String(err && err.message || err) };
          });
        });
    });
  }

  function wireForegroundMessageListener() {
    try {
      getFirebaseState().then(function (ctx) {
        if (!ctx || !ctx.messaging || typeof ctx.messaging.onMessage !== "function") {
          return;
        }
        if (state.foregroundListenerWired === true) {
          return;
        }
        state.foregroundListenerWired = true;

        ctx.messaging.onMessage(function (payload) {
          try {
            var data = (payload && payload.data) ? payload.data : {};
            var title = String(data.title || "SugboCents");
            var body = String(data.body || "");
            var deepLink = String(data.deepLink || "/dashboard.html");
            var eventId = String(data.eventId || "");
            var notificationId = String(data.notificationId || "");

            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              var n = new Notification(title, {
                body: body,
                icon: "/icons/icon-192.png",
                badge: "/icons/icon-192.png",
                tag: data.type || "sugbocents-notification",
                data: {
                  deepLink: deepLink,
                  eventId: eventId,
                  notificationId: notificationId,
                  type: data.type || ""
                }
              });
              n.onclick = function (ev) {
                ev.preventDefault();
                var route = deepLink && deepLink.charAt(0) === "/" ? deepLink.slice(1) : deepLink;
                try { window.focus(); } catch (_) {}
                try {
                  if (eventId) { trackNotificationOpen(eventId); }
                } catch (_) {}
                try { window.location.assign(route || "dashboard.html"); } catch (_) {}
                try { n.close(); } catch (_) {}
              };
              return;
            }

            showInAppToast({ title: title, body: body, deepLink: deepLink, eventId: eventId });
          } catch (err) {
            if (window.console && console.warn) {
              console.warn("[Notifications] foreground message handler error:", err);
            }
          }
        });
      }).catch(function (err) {
        if (window.console && console.warn) {
          console.warn("[Notifications] failed to wire foreground listener:", err);
        }
      });
    } catch (err) {
      if (window.console && console.warn) {
        console.warn("[Notifications] failed to wire foreground listener:", err);
      }
    }
  }

  function showInAppToast(opts) {
    try {
      var existing = document.getElementById("sugbocentsForegroundToast");
      if (existing && existing.parentNode) { existing.parentNode.removeChild(existing); }

      var toast = document.createElement("div");
      toast.id = "sugbocentsForegroundToast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.style.cssText = [
        "position:fixed",
        "top:16px",
        "right:16px",
        "max-width:320px",
        "padding:12px 14px",
        "border-radius:14px",
        "background:#1f6b46",
        "color:#fff",
        "box-shadow:0 8px 24px rgba(0,0,0,0.18)",
        "font-family:'Plus Jakarta Sans',sans-serif",
        "font-size:14px",
        "line-height:1.35",
        "z-index:99999",
        "cursor:pointer"
      ].join(";");
      toast.innerHTML =
        '<div style="font-weight:700;margin-bottom:2px;">' + escapeHtml(opts && opts.title ? opts.title : "SugboCents") + "</div>" +
        '<div style="opacity:0.92;">' + escapeHtml(opts && opts.body ? opts.body : "") + "</div>";

      toast.addEventListener("click", function () {
        var route = (opts && opts.deepLink) ? opts.deepLink : "/dashboard.html";
        route = route.charAt(0) === "/" ? route.slice(1) : route;
        try { if (opts && opts.eventId) { trackNotificationOpen(opts.eventId); } } catch (_) {}
        try { window.location.assign(route || "dashboard.html"); } catch (_) {}
      });

      document.body.appendChild(toast);
      setTimeout(function () {
        if (toast && toast.parentNode) { toast.parentNode.removeChild(toast); }
      }, 6000);
    } catch (_) {}
  }

  function showSoftPrompt() {
    if (sessionStorage.getItem(SOFT_PROMPT_KEY) === "1") {
      return Promise.resolve(false);
    }

    sessionStorage.setItem(SOFT_PROMPT_KEY, "1");

    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "notif-soft-prompt-overlay";
      overlay.innerHTML =
        '<div class="notif-soft-prompt-modal">' +
        '  <div class="notif-soft-prompt-icon">🐾</div>' +
        '  <h2>Let Tigom remind you?</h2>' +
        '  <p>We will send a quick nudge if your streak is at risk. No spam, promise.</p>' +
        '  <div class="notif-soft-prompt-actions">' +
        '    <button type="button" class="notif-soft-prompt-deny">Not now</button>' +
        '    <button type="button" class="notif-soft-prompt-allow">Yes, notify me</button>' +
        '  </div>' +
        '</div>';

      document.body.appendChild(overlay);

      function closeWith(choice) {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        resolve(choice);
      }

      var allowBtn = overlay.querySelector(".notif-soft-prompt-allow");
      var denyBtn = overlay.querySelector(".notif-soft-prompt-deny");
      if (allowBtn) {
        allowBtn.addEventListener("click", function () { closeWith(true); });
      }
      if (denyBtn) {
        denyBtn.addEventListener("click", function () { closeWith(false); });
      }
    });
  }

  function maybePromptAfterFirstExpense() {
    var prefs = getPrefs();
    var expenses = window.StorageAPI && window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    if (!Array.isArray(expenses) || expenses.length !== 1) {
      return Promise.resolve(false);
    }
    if (prefs.setupDone === true) {
      return Promise.resolve(false);
    }

    return showSoftPrompt().then(function (yes) {
      if (!yes) {
        return updatePrefs({ setupDone: true, pushEnabled: false }).then(function () {
          return false;
        });
      }
      return requestPermissionAndRegister().then(function () {
        return true;
      });
    });
  }

  function getActiveUid() {
    var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
    return session && session.userId ? String(session.userId) : "";
  }

  function trackNotificationOpen(eventId) {
    if (!eventId) { return Promise.resolve(false); }
    return getFirebaseState().then(function (ctx) {
      if (!ctx || !ctx.db) { return false; }
      return ctx.db.collection("notificationEvents").doc(String(eventId)).set({
        openedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function () {
        return true;
      }).catch(function () {
        return false;
      });
    });
  }

  function markNotificationRead(notifId) {
    var uid = getActiveUid();
    if (!uid || !notifId) { return Promise.resolve(false); }

    return getFirebaseState().then(function (ctx) {
      if (!ctx || !ctx.db) { return false; }
      return ctx.db.collection("users").doc(uid)
        .collection("notifications").doc(String(notifId))
        .set({ readAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
        .then(function () { return true; })
        .catch(function () { return false; });
    });
  }

  function normalizeSnapshotDoc(doc) {
    var data = doc.data() || {};
    var sentAtDate = null;
    if (data.sentAt && data.sentAt.toDate) {
      sentAtDate = data.sentAt.toDate();
    } else if (typeof data.sentAt === "string") {
      sentAtDate = new Date(data.sentAt);
    }
    return {
      id: doc.id,
      type: data.type || "",
      title: data.title || "SugboCents",
      body: data.body || "",
      deepLink: data.deepLink || "dashboard.html",
      eventId: data.eventId || "",
      readAt: data.readAt || null,
      sentAtDate: sentAtDate
    };
  }

  function subscribeInbox() {
    if (state.unsubUnread || state.unsubList) { return; }

    var uid = getActiveUid();
    if (!uid) {
      renderEmptyDrawer("Sign in to view notifications.");
      return;
    }

    getFirebaseState().then(function (ctx) {
      if (!ctx || !ctx.db) {
        renderEmptyDrawer("Notifications sync unavailable.");
        return;
      }

      var notifRef = ctx.db.collection("users").doc(uid).collection("notifications");

      state.unsubUnread = notifRef.where("readAt", "==", null).onSnapshot(function (snap) {
        setBellCount(snap.size || 0);
      }, function () {
        setBellCount(0);
      });

      state.unsubList = notifRef.orderBy("sentAt", "desc").limit(20).onSnapshot(function (snap) {
        state.currentNotifications = snap.docs.map(normalizeSnapshotDoc);
        renderDrawerList(state.currentNotifications);
      }, function () {
        renderEmptyDrawer("Unable to load notifications.");
      });
    });
  }

  function getRecentInbox(limit) {
    var uid = getActiveUid();
    if (!uid) { return Promise.resolve([]); }

    var max = Number(limit) > 0 ? Math.min(50, Number(limit)) : 20;
    return getFirebaseState().then(function (ctx) {
      if (!ctx || !ctx.db) { return []; }
      return ctx.db.collection("users").doc(uid)
        .collection("notifications")
        .orderBy("sentAt", "desc")
        .limit(max)
        .get()
        .then(function (snap) {
          return snap.docs.map(normalizeSnapshotDoc);
        })
        .catch(function () {
          return [];
        });
    });
  }

  function listenServiceWorkerOpenEvents() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.addEventListener) {
      return;
    }
    navigator.serviceWorker.addEventListener("message", function (event) {
      var data = event && event.data ? event.data : null;
      if (!data || data.type !== "sugbocents:notification-opened") {
        return;
      }
      if (data.eventId) {
        trackNotificationOpen(data.eventId);
      }
    });
  }

  function init() {
    if (state.initialized) { return; }
    state.initialized = true;

    wireBell();
    ensureDrawerMarkup();
    subscribeInbox();
    listenServiceWorkerOpenEvents();

    var bell = document.getElementById("notifBellButton");
    if (bell) {
      bell.classList.remove("is-hidden");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Foreground push handler - required so users with the app open still see notifications.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireForegroundMessageListener);
  } else {
    wireForegroundMessageListener();
  }

  window.NotificationsAPI = {
    DEFAULT_PREFS: DEFAULT_PREFS,
    detectPlatform: detectPlatform,
    isPushSupported: isPushSupported,
    isIosUnsupported: isIosUnsupported,
    getPrefs: getPrefs,
    updatePrefs: updatePrefs,
    showSoftPrompt: showSoftPrompt,
    requestPermissionAndRegister: requestPermissionAndRegister,
    maybePromptAfterFirstExpense: maybePromptAfterFirstExpense,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    getRecentInbox: getRecentInbox,
    markNotificationRead: markNotificationRead,
    trackNotificationOpen: trackNotificationOpen,
    isForegroundListenerWired: function () {
      return state.foregroundListenerWired === true;
    }
  };
})();
