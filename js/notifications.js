(function () {
  var REGISTER_PUSH_URL = "https://us-central1-sugbocents.cloudfunctions.net/registerPush";
  var UNREGISTER_PUSH_URL = "https://us-central1-sugbocents.cloudfunctions.net/unregisterPush";

  /** Public VAPID key — must match `VAPID_PUBLIC_KEY` in functions/index.js. */
  var SUGBOCENTS_VAPID_PUBLIC_KEY =
    "BHK7yVDGF3avSKamFtdbSGW4X-ji34xM78R53OkuKQW_6cQnYP2183CmuX1Yn2GAHx7RhZmspiT2b0S60FGzsKM";

  function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function postJsonWithCors(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(t || res.statusText);
        });
      }
      return res.json();
    });
  }

  // ── 1. Define your Conditions (Rules) Here ──────────────────────────
  // To add a new notification, just add a new block to this array!
  var NOTIFICATION_RULES =[
    {
      id: "evening_reminder",
      frequency: "daily", // 'daily', 'weekly', or 'always'
      check: function (now, storage) {
        var prefs = storage.getPreferences ? storage.getPreferences() : {};
        if (prefs.streakNotifications !== true) {
          return false;
        }
        // Condition: It's past 8 PM (20:00) and no expenses were logged today.
        if (now.getHours() < 20) return false; 
        
        var todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        var expenses = storage.getExpenses();
        var loggedToday = expenses.some(function(e) { 
          return new Date(e.timestamp) >= todayStart; 
        });
        
        return !loggedToday; // Fire if NOT logged today
      },
      getMessage: function (storage) {
        return {
          title: "Don't forget to log! 📝",
          body: "It's getting late. Take a second to log your expenses today to keep your streak alive."
        };
      }
    },
    {
      id: "budget_negative",
      frequency: "state",
      check: function (now, storage) {
        var summary = storage.getBudgetSummary();
        return summary.weeklyBudget > 0 && summary.remaining < 0;
      },
      getMessage: function (storage) {
        var summary = storage.getBudgetSummary();
        var overspent = Math.abs(summary.remaining);
        return {
          title: "Budget exceeded! 💸",
          body: "You are over budget by ₱" + overspent.toFixed(2) + " this week."
        };
      }
    },
    {
      id: "budget_warning_80",
      frequency: "state",
      check: function (now, storage) {
        var summary = storage.getBudgetSummary();
        return (summary.percentageSpent >= 80 && summary.remaining >= 0 && summary.weeklyBudget > 0);
      },
      getMessage: function (storage) {
        var summary = storage.getBudgetSummary();
        var remaining = Math.max(0, summary.remaining);
        return {
          title: "Heads up! ⚠️",
          body: "You've used " + summary.percentageSpent + "% of your weekly budget. You have ₱" + remaining.toFixed(2) + " left this week."
        };
      }
    },
    {
      id: "goal_milestone",
      frequency: "daily",
      check: function (now, storage) {
        // Example condition: Do they have exactly 100 XP? (Just an example)
        var xpInfo = storage.getXpInfo ? storage.getXpInfo() : { xp: 0 };
        return xpInfo.xp >= 100 && xpInfo.xp < 115;
      },
      getMessage: function (storage) {
        return {
          title: "XP Milestone! 🌟",
          body: "You reached 100 XP! Sugbo is proud of you."
        };
      }
    }
  ];


  // ── 2. The Engine (Handles tracking & sending) ──────────────────────
  var _notificationInitDone = false;
  var BUDGET_STATE_KEY = "sc_budget_state";

  function getBudgetState(summary) {
    if (!summary || summary.weeklyBudget <= 0) {
      return "normal";
    }
    if (summary.remaining < 0) {
      return "negative";
    }
    if (summary.percentageSpent >= 80) {
      return "warning";
    }
    return "normal";
  }

  function sendBudgetStateNotification(state, storage) {
    var rule = null;
    for (var i = 0; i < NOTIFICATION_RULES.length; i++) {
      if (state === "warning" && NOTIFICATION_RULES[i].id === "budget_warning_80") {
        rule = NOTIFICATION_RULES[i];
        break;
      }
      if (state === "negative" && NOTIFICATION_RULES[i].id === "budget_negative") {
        rule = NOTIFICATION_RULES[i];
        break;
      }
    }

    if (!rule) { return false; }

    var msg = rule.getMessage(storage);
    NotificationService.send(msg.title, { body: msg.body });
    return true;
  }

  function storeBudgetState(summary) {
    localStorage.setItem(BUDGET_STATE_KEY, getBudgetState(summary));
  }

  function syncBudgetState(summary, shouldNotify, skipIfRemove) {
    var currentState = getBudgetState(summary);
    if (shouldNotify && !skipIfRemove && (currentState === "warning" || currentState === "negative")) {
      sendBudgetStateNotification(currentState, window.StorageAPI);
    }

    storeBudgetState(summary);
  }

  function scheduleSubscribeOfflinePush() {
    setTimeout(function () {
      subscribeOfflinePushInner().catch(function (e) {
        console.warn("[SugboCents] Offline push subscribe failed:", e && e.message ? e.message : e);
      });
    }, 400);
  }

  function subscribeOfflinePushInner() {
    if (!SUGBOCENTS_VAPID_PUBLIC_KEY) {
      return Promise.resolve();
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return Promise.resolve();
    }
    if (Notification.permission !== "granted") {
      return Promise.resolve();
    }
    if (!window.FirebaseInit || !window.FirebaseInit.isFirebaseMode || !window.FirebaseInit.isFirebaseMode()) {
      return Promise.resolve();
    }
    if (!window.FirebaseAuthService || typeof window.FirebaseAuthService.getIdToken !== "function") {
      return Promise.resolve();
    }

    return window.FirebaseAuthService.getIdToken().then(function (idToken) {
      if (!idToken) {
        return null;
      }
      var streakPref = false;
      if (window.StorageAPI && window.StorageAPI.getPreferences) {
        streakPref = window.StorageAPI.getPreferences().streakNotifications === true;
      }
      return navigator.serviceWorker.ready.then(function (registration) {
        var key = urlBase64ToUint8Array(SUGBOCENTS_VAPID_PUBLIC_KEY);
        return registration.pushManager.getSubscription().then(function (existing) {
          if (existing) {
            return postJsonWithCors(REGISTER_PUSH_URL, {
              idToken: idToken,
              subscription: existing.toJSON(),
              streakNotifications: streakPref
            });
          }
          return registration.pushManager
            .subscribe({ userVisibleOnly: true, applicationServerKey: key })
            .then(function (sub) {
              return postJsonWithCors(REGISTER_PUSH_URL, {
                idToken: idToken,
                subscription: sub.toJSON(),
                streakNotifications: streakPref
              });
            });
        });
      });
    });
  }

  var NotificationService = {
    
    requestPermission: function () {
      if (!("Notification" in window)) {
        return Promise.resolve("denied");
      }
      if (Notification.permission === "denied") {
        return Promise.resolve("denied");
      }
      if (Notification.permission === "granted") {
        scheduleSubscribeOfflinePush();
        return Promise.resolve("granted");
      }
      return Notification.requestPermission().then(function (result) {
        if (result === "granted") {
          scheduleSubscribeOfflinePush();
        }
        return result;
      });
    },

    subscribeOfflinePush: function () {
      return subscribeOfflinePushInner();
    },

    unregisterOfflinePush: function () {
      if (!("serviceWorker" in navigator)) {
        return Promise.resolve();
      }
      if (!window.FirebaseAuthService || typeof window.FirebaseAuthService.getIdToken !== "function") {
        return Promise.resolve();
      }
      return window.FirebaseAuthService.getIdToken().then(function (idToken) {
        return navigator.serviceWorker.ready.then(function (registration) {
          return registration.pushManager.getSubscription().then(function (sub) {
            if (!sub) {
              return null;
            }
            var endpoint = sub.endpoint;
            var chain = Promise.resolve();
            if (idToken) {
              chain = postJsonWithCors(UNREGISTER_PUSH_URL, { idToken: idToken, endpoint: endpoint }).catch(
                function (e) {
                  console.warn("[SugboCents] unregisterPush:", e);
                }
              );
            }
            return chain.then(function () {
              return sub.unsubscribe();
            });
          });
        });
      });
    },

    send: function (title, options) {
      if (Notification.permission === "granted") {
        var notificationOptions = Object.assign({
          icon: "icons/icon-192.png",
          badge: "icons/icon-192.png",
          vibrate:[200, 100, 200],
          tag: "sugbocents-app-notification", // The tag is what merges/replaces notifications
          renotify: true // Ensures it vibrates/sounds again even if it just replaced an old one
        }, options);

        navigator.serviceWorker.ready.then(function (registration) {
          // Simply show the new notification. 
          // The OS will instantly replace the old one because the `tag` matches.
          return registration.showNotification(title, notificationOptions);
        });
      }
    },

    getWeekString: function (date) {
      var d = new Date(date);
      var diff = (d.getDay() + 6) % 7; // Monday start
      d.setDate(d.getDate() - diff);
      return "Week-" + d.toDateString();
    },

    checkRules: function () {
      if (Notification.permission !== "granted") { return; }
      if (!window.StorageAPI) { return; }

      var now = new Date();
      var todayStr = now.toDateString();
      var weekStr = this.getWeekString(now);
      
      // Load history so we don't spam
      var sentLog = JSON.parse(localStorage.getItem("sc_notifs_log") || "{}");
      var logChanged = false;

      // Evaluate every rule
      NOTIFICATION_RULES.forEach(function (rule) {
        var lastSent = sentLog[rule.id];
        var canFire = false;

        // 1. Check Frequency
        if (rule.frequency === "daily" && lastSent !== todayStr) canFire = true;
        if (rule.frequency === "weekly" && lastSent !== weekStr) canFire = true;
        if (rule.frequency === "always") canFire = true;
        if (rule.frequency === "state") return;

        // 2. Check Custom Condition
        if (canFire && rule.check(now, window.StorageAPI)) {
          var msg = rule.getMessage(window.StorageAPI);
          
          NotificationService.send(msg.title, { body: msg.body });
          
          // 3. Update Log
          sentLog[rule.id] = (rule.frequency === "weekly") ? weekStr : (rule.frequency === "state" ? (rule.id === "budget_negative" ? "negative" : "warning") : todayStr);
          logChanged = true;
        }
      });

      if (logChanged) {
        localStorage.setItem("sc_notifs_log", JSON.stringify(sentLog));
      }
    },

    init: function () {
      if (_notificationInitDone) { return; }
      _notificationInitDone = true;
      storeBudgetState(window.StorageAPI ? window.StorageAPI.getBudgetSummary() : null);
      this.checkRules(); // Check immediately on load
      if (Notification.permission === "granted") {
        scheduleSubscribeOfflinePush();
      }
      window.addEventListener("sugbocents:budget-changed", function (event) {
        var skipIfRemove = !!(event && event.detail && event.detail.reason === "remove");
        if (!window.StorageAPI || typeof window.StorageAPI.getBudgetSummary !== "function") { return; }
        syncBudgetState(window.StorageAPI.getBudgetSummary(), true, skipIfRemove);
        NotificationService.checkRules();
      });
      window.addEventListener("sugbocents:synced", function (event) {
        if (Notification.permission === "granted") {
          scheduleSubscribeOfflinePush();
        }
        var skipIfRemove = !!(event && event.detail && event.detail.reason === "remove");
        if (!window.StorageAPI || typeof window.StorageAPI.getBudgetSummary !== "function") { return; }
        syncBudgetState(window.StorageAPI.getBudgetSummary(), false, skipIfRemove);
        NotificationService.checkRules();
      });
      // Check every 2 minutes while app is open
      setInterval(this.checkRules.bind(this), 2 * 60 * 1000); 
    }
  };

  window.NotificationService = NotificationService;

  function maybeInitNotificationService() {
    if (!window.StorageAPI || typeof window.StorageAPI.getCurrentUser !== "function") { return; }
    if (!window.StorageAPI.getCurrentUser()) { return; }
    NotificationService.init();
  }

  document.addEventListener("DOMContentLoaded", function() {
    // Try immediately, then retry after auth/session sync settles.
    maybeInitNotificationService();
    window.addEventListener("sugbocents:synced", maybeInitNotificationService);
    setTimeout(maybeInitNotificationService, 800);
    setTimeout(maybeInitNotificationService, 2500);
  });

})();