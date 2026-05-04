(function () {
  function showMessage(elId, text, isError) {
    var el = document.getElementById(elId);
    if (!el) { return; }
    el.textContent = text;
    el.className = "text-sm mt-2 font-semibold " + (isError ? "text-red-600" : "text-emerald-700");
    el.classList.remove("hidden");
    setTimeout(function () { el.classList.add("hidden"); }, 3200);
  }

  // ── Profile basics ───────────────────────────────────────
  function initProfileSection() {
    var form = document.getElementById("profileForm");
    if (!form) { return; }

    var user = window.StorageAPI ? window.StorageAPI.getCurrentUser() : null;
    if (user) {
      var firstNameEl = document.getElementById("profileFirstName");
      var lastNameEl  = document.getElementById("profileLastName");
      if (firstNameEl) { firstNameEl.value = user.firstName || ""; }
      if (lastNameEl)  { lastNameEl.value  = user.lastName  || ""; }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstNameEl = document.getElementById("profileFirstName");
      var lastNameEl  = document.getElementById("profileLastName");
      var firstNameErr = document.getElementById("profileFirstNameError");
      var lastNameErr  = document.getElementById("profileLastNameError");

      var firstName = firstNameEl ? firstNameEl.value.trim() : "";
      var lastName  = lastNameEl  ? lastNameEl.value.trim()  : "";

      if (firstNameErr) { firstNameErr.textContent = ""; }
      if (lastNameErr)  { lastNameErr.textContent  = ""; }

      var valid = true;
      if (!firstName) {
        if (firstNameErr) { firstNameErr.textContent = "First name is required."; }
        if (firstNameEl)  { firstNameEl.classList.add("is-invalid"); }
        valid = false;
      } else {
        if (firstNameEl) { firstNameEl.classList.remove("is-invalid"); }
      }
      if (!lastName) {
        if (lastNameErr) { lastNameErr.textContent = "Last name is required."; }
        if (lastNameEl)  { lastNameEl.classList.add("is-invalid"); }
        valid = false;
      } else {
        if (lastNameEl) { lastNameEl.classList.remove("is-invalid"); }
      }
      if (!valid) { return; }

      var result = window.StorageAPI
        ? window.StorageAPI.updateUserProfile({ firstName: firstName, lastName: lastName })
        : { ok: false, error: "StorageAPI not available." };

      if (!result.ok) {
        showMessage("profileSaveMsg", result.error, true);
        return;
      }

      showMessage("profileSaveMsg", "Profile updated!", false);
    });
  }

  // ── Streak preferences ───────────────────────────────────
  function initStreakSection() {
    var prefs = window.StorageAPI ? window.StorageAPI.getPreferences() : {};

    var toggleStreak = document.getElementById("streakEnabled");
    var toggleNotif  = document.getElementById("streakNotifications");
    var toggleWeek   = document.getElementById("streakWeeklySummary");

    if (toggleStreak) {
      toggleStreak.checked = prefs.streakEnabled !== false; // default true
      toggleStreak.addEventListener("change", function () {
        if (window.StorageAPI) {
          window.StorageAPI.savePreferences({ streakEnabled: toggleStreak.checked });
        }
        showMessage("streakSaveMsg", "Streak preference saved.", false);
      });
    }

    if (toggleNotif) {
      toggleNotif.checked = prefs.streakNotifications === true; // default false
      toggleNotif.addEventListener("change", function () {
        if (window.StorageAPI) {
          window.StorageAPI.savePreferences({ streakNotifications: toggleNotif.checked });
        }
        showMessage("streakSaveMsg", "Notification preference saved.", false);
      });
    }

    if (toggleWeek) {
      toggleWeek.checked = prefs.streakWeeklySummary !== false; // default true
      toggleWeek.addEventListener("change", function () {
        if (window.StorageAPI) {
          window.StorageAPI.savePreferences({ streakWeeklySummary: toggleWeek.checked });
        }
        showMessage("streakSaveMsg", "Weekly summary preference saved.", false);
      });
    }
  } // <--- ADDED CLOSING BRACKET HERE

  // ── Display preferences ──────────────────────────────────
  function initDisplaySection() {
    var prefs = window.StorageAPI ? window.StorageAPI.getPreferences() : {};

    var compactToggle = document.getElementById("compactExpenses");
    if (compactToggle) {
      compactToggle.checked = prefs.compactExpenses === true;
      compactToggle.addEventListener("change", function () {
        if (window.StorageAPI) {
          window.StorageAPI.savePreferences({ compactExpenses: compactToggle.checked });
        }
        showMessage("displaySaveMsg", "Display preference saved.", false);
      });
    }
  }
// ── Notifications ───────────────────────────────────────
  function initNotificationsSection() {
    var btn = document.getElementById("enableNotificationsBtn");
    var disableBtn = document.getElementById("disableNotificationsBtn");
    var msg = document.getElementById("enableNotificationsMsg");
    if (!btn || !disableBtn || !msg) { return; }

    function setMessage(text, isError, persist) {
      msg.textContent = text;
      msg.className = "text-sm mt-3 font-semibold " + (isError ? "text-red-600" : "text-emerald-700");
      msg.classList.remove("hidden");
      if (persist) { return; }
      setTimeout(function () { msg.classList.add("hidden"); }, 3200);
    }

    function updateState() {
      if (!("Notification" in window)) {
        btn.disabled = true;
        btn.textContent = "Notifications not supported";
        setMessage("This browser does not support notifications.", true);
        return;
      }
      if (Notification.permission === "granted") {
        btn.disabled = true;
        btn.textContent = "Notifications enabled";
        disableBtn.classList.remove("hidden");
        // Only hide the message if it's not our "persist" instruction message
        if (msg.textContent.indexOf("browser settings") === -1) {
          msg.classList.add("hidden");
        }
        return;
      }
      if (Notification.permission === "denied") {
        btn.disabled = true;
        btn.textContent = "Notifications blocked";
        setMessage("You blocked notifications in your browser settings.", true);
        disableBtn.classList.add("hidden");
        return;
      }

      btn.disabled = false;
      btn.textContent = "Enable notifications";
      disableBtn.classList.add("hidden");
      if (msg.textContent.indexOf("browser settings") === -1) {
        msg.classList.add("hidden");
      }
    }

    updateState();

    // 1. Fallback listeners for when user switches tabs/windows
    function onVisibilityChange() {
      if (!document.hidden) { updateState(); }
    }
    window.addEventListener("focus", updateState);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 2. NEW: Permissions API Listener (Triggers instantly when changed in browser)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then(function(permissionStatus) {
        permissionStatus.onchange = function() {
          updateState();
        };
      }).catch(function() { 
        // Ignore errors on older browsers that don't support this
      });
    }

    // Button clicks
    btn.addEventListener("click", function () {
      if (!("Notification" in window)) {
        setMessage("This browser does not support notifications.", true);
        return;
      }
      if (!window.NotificationService) {
        setMessage("Notification service is unavailable.", true);
        return;
      }
      var req = window.NotificationService.requestPermission();
      if (req && typeof req.then === "function") {
        req.then(updateState).catch(function () {
          setTimeout(updateState, 200);
        });
        return;
      }
      setTimeout(updateState, 200);
    });

    disableBtn.addEventListener("click", function () {
      setMessage("To disable notifications, click the lock icon in your browser address bar and block notifications.", false, true);
    });
  }

  function initBudgetAndAccountSection() {
    if (!window.StorageAPI) { return; }
    var form = document.getElementById("budgetForm");
    var budgetInput = document.getElementById("weeklyBudget");
    var budgetError = document.getElementById("weeklyBudgetError");
    var budgetSavedMsg = document.getElementById("budgetSavedMessage");
    var logoutButton = document.getElementById("logoutButton");
    var resetButton = document.getElementById("resetAppButton");
    var actionMessage = document.getElementById("settingsActionMessage");

    if (budgetInput) {
      budgetInput.value = String(window.StorageAPI.getWeeklyBudget() || "");
    }

    if (form && budgetInput && budgetError) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        budgetError.textContent = "";
        budgetInput.classList.remove("is-invalid");
        var amount = Number(budgetInput.value);
        if (!Number.isFinite(amount) || amount < 0) {
          budgetError.textContent = "Enter a valid amount (0 or more).";
          budgetInput.classList.add("is-invalid");
          return;
        }
        var result = window.StorageAPI.saveWeeklyBudget(amount);
        if (!result.ok) {
          budgetError.textContent = result.error || "Could not save budget.";
          budgetInput.classList.add("is-invalid");
          return;
        }
        if (budgetSavedMsg) {
          budgetSavedMsg.textContent = "✓ Saved";
          budgetSavedMsg.className = "text-xs font-semibold text-emerald-700";
          budgetSavedMsg.classList.remove("hidden");
          setTimeout(function () { budgetSavedMsg.classList.add("hidden"); }, 2500);
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        Promise.resolve(window.StorageAPI.logout()).then(function () {
          window.location.replace("landing.html");
        });
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        var modal = document.getElementById("resetConfirmModal");
        if (modal) {
          modal.classList.remove("hidden");
          var okBtn = document.getElementById("resetConfirmOk");
          if (okBtn) { okBtn.focus(); }
        }
      });
    }

    var resetConfirmCancel = document.getElementById("resetConfirmCancel");
    if (resetConfirmCancel) {
      resetConfirmCancel.addEventListener("click", function () {
        var modal = document.getElementById("resetConfirmModal");
        if (modal) { modal.classList.add("hidden"); }
      });
    }

    var resetConfirmOk = document.getElementById("resetConfirmOk");
    if (resetConfirmOk) {
      resetConfirmOk.addEventListener("click", function () {
        var modal = document.getElementById("resetConfirmModal");
        if (modal) { modal.classList.add("hidden"); }
        resetButton.disabled = true;
        resetButton.textContent = "Clearing…";
        window.StorageAPI.resetCurrentUserData().then(function (result) {
          resetButton.disabled = false;
          resetButton.textContent = "Clear my data";
          if (!actionMessage) { return; }
          if (!result.ok) {
            actionMessage.textContent = result.error || "Unable to clear data.";
            actionMessage.className = "text-sm mt-3 text-red-700";
            actionMessage.classList.remove("hidden");
            return;
          }
          if (budgetInput) { budgetInput.value = ""; }
          actionMessage.textContent = "\u2713 All data reset.";
          actionMessage.className = "text-sm mt-3 font-semibold text-emerald-700";
          actionMessage.classList.remove("hidden");
          setTimeout(function () { window.location.reload(); }, 900);
        }).catch(function () {
          resetButton.disabled = false;
          resetButton.textContent = "Clear my data";
          if (actionMessage) {
            actionMessage.textContent = "Unable to clear data.";
            actionMessage.className = "text-sm mt-3 text-red-700";
            actionMessage.classList.remove("hidden");
          }
        });
      });
    }
  }

  // ── XP mini bar ──────────────────────────────────────────
  function renderXpMiniBar() {
    if (!window.StorageAPI || !window.StorageAPI.getXpInfo) { return; }
    var info   = window.StorageAPI.getXpInfo();
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var levelEl  = document.getElementById("xpMiniLevel");
    var fillEl   = document.getElementById("xpMiniFill");
    var trackEl  = document.getElementById("xpMiniTrack");
    var streakEl = document.getElementById("xpMiniStreak");
    if (levelEl) {
      levelEl.innerHTML = '<i class="bi bi-arrow-up-circle-fill" aria-hidden="true"></i> Lv. ' + info.level + ' — ' + info.levelName;
    }
    if (fillEl)   { fillEl.style.width = info.progressPct + "%"; }
    if (trackEl)  { trackEl.setAttribute("aria-valuenow", info.progressPct); }
    if (streakEl) {
      var cls = "xp-mini-streak" + (streak >= 7 ? " xp-mini-streak--week" : streak >= 3 ? " xp-mini-streak--hot" : streak >= 1 ? " xp-mini-streak--warm" : "");
      streakEl.className = cls;
      streakEl.innerHTML = '<i class="bi bi-fire" aria-hidden="true"></i> ' + (streak === 0 ? "0" : streak);
    }
  }

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    initProfileSection();
    initStreakSection();
    initDisplaySection();
    initNotificationsSection();
    initBudgetAndAccountSection();
    renderXpMiniBar();

    // ── Demo seed button ─────────────────────────────────────
    var seedBtn = document.getElementById("seedDemoBtn");
    var seedMsg = document.getElementById("seedDemoMsg");
    if (seedBtn) {
      seedBtn.addEventListener("click", function () {
        if (!window.StorageAPI || !window.StorageAPI.seedDemoData) { return; }
        seedBtn.disabled = true;
        seedBtn.textContent = "Loading…";
        var result = window.StorageAPI.seedDemoData();
        seedBtn.disabled = false;
        seedBtn.innerHTML = '<i class="bi bi-magic" aria-hidden="true"></i> Load Demo Data';
        if (seedMsg) {
          if (result.ok) {
            seedMsg.textContent = "\u2713 Demo data loaded! Head to the Dashboard to explore.";
            seedMsg.className = "text-sm mt-3 font-semibold text-emerald-700";
          } else {
            seedMsg.textContent = result.error || "Could not load demo data.";
            seedMsg.className = "text-sm mt-3 text-red-600";
          }
          seedMsg.classList.remove("hidden");
        }
      });
    }

  });
})();