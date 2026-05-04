(function () {
  // ── 1. Define your Conditions (Rules) Here ──────────────────────────
  // To add a new notification, just add a new block to this array!
  var NOTIFICATION_RULES =[
    {
      id: "evening_reminder",
      frequency: "daily", // 'daily', 'weekly', or 'always'
      check: function (now, storage) {
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

  var NotificationService = {
    
    requestPermission: function () {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "denied" && Notification.permission !== "granted") {
        return Notification.requestPermission();
      }
      return Promise.resolve(Notification.permission);
    },

    send: function (title, options) {
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(function (registration) {
          registration.showNotification(title, Object.assign({
            icon: "icons/icon-192.png",
            badge: "icons/icon-192.png",
            vibrate:[200, 100, 200]
          }, options));
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
      window.addEventListener("sugbocents:budget-changed", function (event) {
        var skipIfRemove = !!(event && event.detail && event.detail.reason === "remove");
        if (!window.StorageAPI || typeof window.StorageAPI.getBudgetSummary !== "function") { return; }
        syncBudgetState(window.StorageAPI.getBudgetSummary(), true, skipIfRemove);
        NotificationService.checkRules();
      });
      window.addEventListener("sugbocents:synced", function (event) {
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