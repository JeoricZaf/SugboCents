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

  // ── Gentle controls (custom visual toggles) ─────────────
  function wireVisualToggle(trackId, thumbId, inputId, onValue, offValue, onChange) {
    var track = document.getElementById(trackId);
    var thumb = document.getElementById(thumbId);
    var input = document.getElementById(inputId);
    if (!track || !thumb || !input) { return; }

    function applyState(checked) {
      track.style.background = checked ? "#2b8259" : "#cbd5e1";
      thumb.style.transform   = checked ? "translateX(1.25rem)" : "translateX(0)";
    }

    applyState(input.checked);

    track.addEventListener("click", function () {
      input.checked = !input.checked;
      applyState(input.checked);
      onChange(input.checked);
    });
  }

  // ── Streak preferences ───────────────────────────────────
  function initStreakSection() {
    var prefs = window.StorageAPI ? window.StorageAPI.getPreferences() : {};

    // Streak risk reminder → streakNotifications
    var notifChecked = prefs.streakNotifications === true;
    var notifInput = document.getElementById("streakReminderInput");
    if (notifInput) { notifInput.checked = notifChecked; }
    wireVisualToggle("streakReminderTrack", "streakReminderThumb", "streakReminderInput",
      true, false, function (checked) {
        if (window.StorageAPI) { window.StorageAPI.savePreferences({ streakNotifications: checked }); }
        showMessage("streakSaveMsg", "Preference saved.", false);
      }
    );

    // Weekly quest recap → streakWeeklySummary
    var weekChecked = prefs.streakWeeklySummary !== false;
    var weekInput = document.getElementById("weeklyQuestInput");
    if (weekInput) { weekInput.checked = weekChecked; }
    wireVisualToggle("weeklyQuestTrack", "weeklyQuestThumb", "weeklyQuestInput",
      true, false, function (checked) {
        if (window.StorageAPI) { window.StorageAPI.savePreferences({ streakWeeklySummary: checked }); }
        showMessage("streakSaveMsg", "Preference saved.", false);
      }
    );

    // Enable streak tracking → streakEnabled
    var streakChecked = prefs.streakEnabled !== false;
    var streakInput = document.getElementById("streakEnabled");
    if (streakInput) { streakInput.checked = streakChecked; }
    wireVisualToggle("streakTrackingTrack", "streakTrackingThumb", "streakEnabled",
      true, false, function (checked) {
        if (window.StorageAPI) { window.StorageAPI.savePreferences({ streakEnabled: checked }); }
        showMessage("streakSaveMsg", "Streak tracking preference saved.", false);
      }
    );
  }

  // ── Display preferences ──────────────────────────────────
  function initDisplaySection() {
    // Dark mode is handled by dark-mode.js; compact expenses preference retained
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

  function initBudgetNotificationSection() {
    if (!window.StorageAPI) { return; }

    var button = document.getElementById("budgetNotifEnableBtn");
    var message = document.getElementById("budgetNotifMsg");
    if (!button) { return; }

    function refreshLabel() {
      if (!window.Notification) {
        button.textContent = "Unsupported";
        button.disabled = true;
        if (message) {
          message.textContent = "Your browser does not support notifications.";
          message.className = "mt-2 text-xs font-semibold text-red-700";
          message.classList.remove("hidden");
        }
        return;
      }

      if (Notification.permission === "granted") {
        button.textContent = "Enabled";
      } else if (Notification.permission === "denied") {
        button.textContent = "Blocked";
      } else {
        button.textContent = "Enable";
      }
    }

    refreshLabel();

    button.addEventListener("click", function () {
      if (!window.NotificationService || !window.NotificationService.requestPermission) {
        showMessage("budgetNotifMsg", "Notification service is unavailable.", true);
        return;
      }

      window.NotificationService.requestPermission().then(function (permission) {
        if (permission === "granted") {
          window.StorageAPI.savePreferences({ budgetNotifications: true });
          refreshLabel();
          showMessage("budgetNotifMsg", "Budget notifications enabled.", false);
          if (window.NotificationService.checkBudgetState) {
            window.NotificationService.checkBudgetState();
          }
          return;
        }

        if (permission === "denied") {
          window.StorageAPI.savePreferences({ budgetNotifications: false });
          refreshLabel();
          showMessage("budgetNotifMsg", "Notifications are blocked in this browser.", true);
          return;
        }

        showMessage("budgetNotifMsg", "Notification permission was not changed.", true);
      });
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



  // ── Init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    initProfileSection();
    initStreakSection();
    initDisplaySection();
    initBudgetNotificationSection();
    initBudgetAndAccountSection();

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
        seedBtn.innerHTML = '&#10024; Load demo data';
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
