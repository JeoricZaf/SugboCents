(function () {
  "use strict";

  var initialized = false;
  var overbudgetActive = false;

  function hasNotificationApi() {
    return "Notification" in window;
  }

  function getSummary() {
    if (!window.StorageAPI || typeof window.StorageAPI.getBudgetSummary !== "function") {
      return null;
    }
    return window.StorageAPI.getBudgetSummary();
  }

  function isEnabled() {
    if (!window.StorageAPI || typeof window.StorageAPI.getPreferences !== "function") {
      return true;
    }

    var prefs = window.StorageAPI.getPreferences() || {};
    return prefs.budgetNotifications !== false;
  }

  function isOverbudget(summary) {
    return !!(summary && summary.weeklyBudget > 0 && summary.remaining < 0);
  }

  function buildOverbudgetMessage() {
    return {
      title: "You are overbudget",
      body: "You are overbudget"
    };
  }

  function sendNotification(message) {
    if (!hasNotificationApi() || Notification.permission !== "granted") {
      return false;
    }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (registration) {
          if (registration && registration.showNotification) {
            registration.showNotification(message.title, {
              body: message.body,
              tag: "sugbocents-overbudget",
              renotify: true,
              icon: "icons/icon-192.png",
              badge: "icons/icon-192.png"
            });
            return;
          }
          new Notification(message.title, {
            body: message.body,
            tag: "sugbocents-overbudget",
            renotify: true,
            icon: "icons/icon-192.png",
            badge: "icons/icon-192.png"
          });
        });
      } else {
        new Notification(message.title, {
          body: message.body,
          tag: "sugbocents-overbudget",
          renotify: true,
          icon: "icons/icon-192.png",
          badge: "icons/icon-192.png"
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function requestPermission() {
    if (!hasNotificationApi()) {
      return Promise.resolve("unsupported");
    }

    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return Promise.resolve(Notification.permission);
    }

    try {
      return Promise.resolve(Notification.requestPermission()).then(function (permission) {
        return permission;
      });
    } catch (error) {
      return Promise.resolve(Notification.permission);
    }
  }

  function evaluateBudgetNotifications() {
    if (!window.StorageAPI || typeof window.StorageAPI.getCurrentUser !== "function") {
      overbudgetActive = false;
      return;
    }

    if (!isEnabled()) {
      overbudgetActive = false;
      return;
    }

    if (!window.StorageAPI.getCurrentUser()) {
      overbudgetActive = false;
      return;
    }

    var summary = getSummary();
    if (!summary || summary.weeklyBudget <= 0) {
      overbudgetActive = false;
      return;
    }

    var currentlyOverbudget = isOverbudget(summary);
    if (!currentlyOverbudget) {
      overbudgetActive = false;
      return;
    }

    if (overbudgetActive) {
      return;
    }

    overbudgetActive = true;

    if (!hasNotificationApi()) {
      return;
    }

    if (Notification.permission === "granted") {
      sendNotification(buildOverbudgetMessage());
      return;
    }
  }

  function init() {
    if (initialized) {
      return;
    }
    initialized = true;

    evaluateBudgetNotifications();
    window.addEventListener("sugbocents:dataChanged", evaluateBudgetNotifications);
    window.addEventListener("sugbocents:synced", evaluateBudgetNotifications);
  }

  window.NotificationService = {
    init: init,
    requestPermission: requestPermission,
    send: sendNotification,
    checkBudgetState: evaluateBudgetNotifications
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
