(function () {
  var WRAPPED_EMAIL_URL = "https://us-central1-sugbocents.cloudfunctions.net/sendWrappedEmail";

  function showMessage(elId, text, isError) {
    var el = document.getElementById(elId);
    if (!el) { return; }
    el.textContent = text;
    el.className = "text-sm mt-2 font-semibold " + (isError ? "text-red-600" : "text-emerald-700");
    el.classList.remove("hidden");
    setTimeout(function () { el.classList.add("hidden"); }, 3200);
  }

  function formatPhp(amount) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount) || 0);
  }

  function getCurrentWeekRange() {
    var today = new Date();
    var day = today.getDay();
    var mondayOffset = (day + 6) % 7;
    var monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday: monday, sunday: sunday };
  }

  function buildWeekLabel(monday, sunday) {
    var start = monday.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    var end = sunday.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    return start + " - " + end;
  }

  function toCategoryLabel(categoryId) {
    var map = {
      transport: "Transport",
      food: "Food",
      groceries: "Groceries",
      health: "Health",
      education: "Education",
      utilities: "Utilities",
      personal_care: "Personal Care",
      shopping: "Shopping",
      entertainment: "Entertainment",
      others: "Others",
      other: "Others"
    };
    var clean = String(categoryId || "others").toLowerCase();
    return map[clean] || "Others";
  }

  function buildWeeklyReportData() {
    if (!window.StorageAPI) { return null; }
    var expenses = window.StorageAPI.getExpenses();
    var weekRange = getCurrentWeekRange();

    var weeklyExpenses = expenses.filter(function (entry) {
      var ts = new Date(entry.timestamp);
      return ts >= weekRange.monday && ts <= weekRange.sunday;
    });

    var totalSpent = 0;
    var categoryCounts = {};
    weeklyExpenses.forEach(function (entry) {
      var amount = Number(entry.amount) || 0;
      if (amount < 0) { amount = 0; }
      totalSpent += amount;
      var cat = String(entry.category || "others").toLowerCase();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    var topCategoryKey = "others";
    Object.keys(categoryCounts).forEach(function (key) {
      if ((categoryCounts[key] || 0) > (categoryCounts[topCategoryKey] || 0)) {
        topCategoryKey = key;
      }
    });

    var user = window.StorageAPI.getCurrentUser() || {};
    var xpInfo = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { levelName: "Rookie Saver" };

    return {
      totalSpent: Number(totalSpent.toFixed(2)),
      weeklyBudget: Number(Number(user.weeklyBudget || 0).toFixed(2)),
      topCategory: toCategoryLabel(topCategoryKey),
      expenseCount: weeklyExpenses.length,
      streak: Number(window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0),
      level: String(xpInfo.levelName || "Rookie Saver"),
      weekLabel: buildWeekLabel(weekRange.monday, weekRange.sunday)
    };
  }

  function setSendButtonState(button, isLoading) {
    if (!button) { return; }
    button.disabled = isLoading;
    button.textContent = isLoading ? "Sending report..." : "📩 Send me this week's report";
    button.style.opacity = isLoading ? "0.7" : "1";
    button.style.cursor = isLoading ? "not-allowed" : "pointer";
  }

  function renderWeeklyReportMeta() {
    if (!window.StorageAPI) { return; }
    var metaEl = document.getElementById("weeklyReportMeta");
    var coolEl = document.getElementById("weeklyReportCooldown");
    if (!metaEl || !coolEl) { return; }

    var lastSentAt = window.StorageAPI.getLastEmailSentAt ? window.StorageAPI.getLastEmailSentAt() : null;
    if (!lastSentAt) {
      metaEl.textContent = "Last sent: Never";
      coolEl.textContent = "Tip: Server limit is up to 5 sends/day per network.";
      return;
    }

    var sentDate = new Date(lastSentAt);
    if (Number.isNaN(sentDate.getTime())) {
      metaEl.textContent = "Last sent: Unknown";
      coolEl.textContent = "Tip: Server limit is up to 5 sends/day per network.";
      return;
    }

    metaEl.textContent = "Last sent: " + sentDate.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    var todayKey = new Date().toDateString();
    coolEl.textContent = sentDate.toDateString() === todayKey
      ? "Cooldown hint: You already sent a report today. Daily max is 5 sends per network."
      : "Tip: Server limit is up to 5 sends/day per network.";
  }

  function sanitizeDisplayNameInput(value) {
    var cleaned = String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^A-Za-z0-9._\- ]/g, "");
    if (cleaned.length > 24) {
      cleaned = cleaned.slice(0, 24).trim();
    }
    return cleaned;
  }

  function getFallbackDisplayName(user) {
    if (!user) { return "SugboCents User"; }
    var full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    if (full) { return full; }
    if (user.email) { return String(user.email).split("@")[0].slice(0, 24); }
    return "SugboCents User";
  }

  function getAvatarOptions() {
    if (window.StorageAPI && window.StorageAPI.getAvatarPresets) {
      var options = window.StorageAPI.getAvatarPresets();
      if (Array.isArray(options) && options.length) { return options; }
    }
    return ["🐯", "🐼", "🦊", "🐸", "🐨", "🦁", "🐰", "🐹", "🐻", "🐵", "🦄", "🐧"];
  }

  // ── Profile basics ───────────────────────────────────────
  function initProfileSection() {
    var form = document.getElementById("profileForm");
    if (!form) { return; }

    var firstNameEl = document.getElementById("profileFirstName");
    var lastNameEl = document.getElementById("profileLastName");
    var displayNameEl = document.getElementById("profileDisplayName");
    var displayNameErr = document.getElementById("profileDisplayNameError");
    var displayNameCounter = document.getElementById("displayNameCounter");
    var avatarGrid = document.getElementById("avatarPickerGrid");

    var user = window.StorageAPI ? window.StorageAPI.getCurrentUser() : null;
    var selectedAvatar = user && user.avatar ? String(user.avatar) : "";

    function updateCounter() {
      if (!displayNameCounter || !displayNameEl) { return; }
      displayNameCounter.textContent = String((displayNameEl.value || "").length) + "/24";
    }

    function setDisplayNameError(message) {
      if (!displayNameErr || !displayNameEl) { return; }
      if (message) {
        displayNameErr.textContent = message;
        displayNameErr.classList.remove("hidden");
        displayNameEl.classList.add("is-invalid");
        return;
      }
      displayNameErr.textContent = "";
      displayNameErr.classList.add("hidden");
      displayNameEl.classList.remove("is-invalid");
    }

    function renderAvatarPicker() {
      if (!avatarGrid) { return; }
      var options = getAvatarOptions();
      avatarGrid.innerHTML = options.map(function (avatar) {
        var isSelected = avatar === selectedAvatar;
        return (
          '<button type="button" class="avatar-option" data-avatar="' + avatar + '" style="height:4rem;width:4rem;border-radius:9999px;border:' + (isSelected ? "3px solid #2b8259" : "1px solid #d8d1bd") + ';background:#faf8f1;display:grid;place-items:center;font-size:1.55rem;box-shadow:' + (isSelected ? "0 0 0 3px rgba(43,130,89,0.15)" : "none") + '">' + avatar + '</button>'
        );
      }).join("");

      avatarGrid.querySelectorAll(".avatar-option").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var nextAvatar = String(btn.getAttribute("data-avatar") || "");
          selectedAvatar = nextAvatar;
          renderAvatarPicker();
          if (window.StorageAPI && window.StorageAPI.savePreferences) {
            var result = window.StorageAPI.savePreferences({ avatar: nextAvatar });
            if (!result || result.ok === false) {
              showMessage("profileSaveMsg", (result && result.error) || "Couldn't save avatar.", true);
              return;
            }
            showMessage("profileSaveMsg", "Avatar updated ✓", false);
          }
        });
      });
    }

    function saveDisplayNameIfNeeded() {
      if (!displayNameEl || !window.StorageAPI || !window.StorageAPI.savePreferences) {
        return { ok: true };
      }
      var raw = displayNameEl.value || "";
      var sanitized = sanitizeDisplayNameInput(raw);
      displayNameEl.value = sanitized;
      updateCounter();
      setDisplayNameError("");
      var result = window.StorageAPI.savePreferences({ displayName: sanitized });
      if (!result || result.ok === false) {
        setDisplayNameError((result && result.error) || "Couldn't save display name.");
        return { ok: false, error: (result && result.error) || "save-failed" };
      }
      return { ok: true };
    }

    if (user) {
      if (firstNameEl) { firstNameEl.value = user.firstName || ""; }
      if (lastNameEl)  { lastNameEl.value  = user.lastName  || ""; }
      if (displayNameEl) {
        displayNameEl.value = user.displayName || user.username || getFallbackDisplayName(user);
      }
    }

    renderAvatarPicker();
    updateCounter();

    if (displayNameEl) {
      displayNameEl.addEventListener("input", function () {
        updateCounter();
        setDisplayNameError("");
      });
      displayNameEl.addEventListener("blur", function () {
        if (!displayNameEl.value.trim()) {
          displayNameEl.value = user ? getFallbackDisplayName(window.StorageAPI.getCurrentUser() || user) : "SugboCents User";
        }
        saveDisplayNameIfNeeded();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

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

      var displayResult = saveDisplayNameIfNeeded();
      if (!displayResult.ok) {
        showMessage("profileSaveMsg", displayResult.error || "Couldn't save display name.", true);
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
    var prefs = {};
    if (window.StorageAPI && window.StorageAPI.getStreakPreferences) {
      prefs = window.StorageAPI.getStreakPreferences() || {};
    } else if (window.StorageAPI && window.StorageAPI.getPreferences) {
      prefs = window.StorageAPI.getPreferences() || {};
    }

    // Streak risk reminder → streakNotifications
    var notifChecked = prefs.streakNotifications !== false;
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

  function initNotificationSection() {
    if (!window.NotificationsAPI) { return; }

    var prefs = window.NotificationsAPI.getPrefs ? window.NotificationsAPI.getPrefs() : {};

    var pushInput = document.getElementById("notifPushToggle");
    var emailInput = document.getElementById("notifEmailToggle");
    var dailyInput = document.getElementById("notifDailyToggle");
    var socialInput = document.getElementById("notifSocialToggle");
    var dailyHour = document.getElementById("notifDailyHour");
    var quietStart = document.getElementById("notifQuietStart");
    var quietEnd = document.getElementById("notifQuietEnd");
    var iosNote = document.getElementById("notifIosNote");

    function buildHourOptions(selectEl, selectedHour) {
      if (!selectEl) { return; }
      var selected = Number(selectedHour);
      if (!Number.isFinite(selected)) { selected = 0; }
      var html = "";
      for (var h = 0; h < 24; h++) {
        var labelHour = (h % 12) || 12;
        var period = h < 12 ? "AM" : "PM";
        var selectedAttr = h === selected ? " selected" : "";
        html += '<option value="' + h + '"' + selectedAttr + '>' + labelHour + ':00 ' + period + '</option>';
      }
      selectEl.innerHTML = html;
    }

    function savePatch(patch, okMessage) {
      window.NotificationsAPI.updatePrefs(patch).then(function () {
        showMessage("streakSaveMsg", okMessage || "Notification preference saved.", false);
      }).catch(function () {
        showMessage("streakSaveMsg", "Couldn't save notification preference.", true);
      });
    }

    function applyTrackState(trackId, thumbId, checked) {
      var track = document.getElementById(trackId);
      var thumb = document.getElementById(thumbId);
      if (!track || !thumb) { return; }
      track.style.background = checked ? "#2b8259" : "#cbd5e1";
      thumb.style.transform = checked ? "translateX(1.25rem)" : "translateX(0)";
    }

    buildHourOptions(dailyHour, prefs.dailyReminderHour);
    buildHourOptions(quietStart, prefs.quietHoursStart);
    buildHourOptions(quietEnd, prefs.quietHoursEnd);

    if (pushInput) { pushInput.checked = prefs.pushEnabled === true; }
    if (emailInput) { emailInput.checked = prefs.emailEnabled !== false; }
    if (dailyInput) { dailyInput.checked = prefs.dailyReminderEnabled === true; }
    if (socialInput) { socialInput.checked = prefs.socialEnabled !== false; }

    wireVisualToggle("notifPushTrack", "notifPushThumb", "notifPushToggle", true, false, function (checked) {
      if (!checked) {
        savePatch({ pushEnabled: false, setupDone: true }, "Push notifications disabled.");
        return;
      }
      window.NotificationsAPI.requestPermissionAndRegister().then(function (result) {
        if (result && result.ok) {
          showMessage("streakSaveMsg", "Push notifications enabled.", false);
          return;
        }
        if (pushInput) { pushInput.checked = false; }
        applyTrackState("notifPushTrack", "notifPushThumb", false);
        showMessage("streakSaveMsg", "Push permission not granted.", true);
      }).catch(function () {
        if (pushInput) { pushInput.checked = false; }
        applyTrackState("notifPushTrack", "notifPushThumb", false);
        showMessage("streakSaveMsg", "Couldn't enable push right now.", true);
      });
    });

    wireVisualToggle("notifEmailTrack", "notifEmailThumb", "notifEmailToggle", true, false, function (checked) {
      savePatch({ emailEnabled: checked, setupDone: true }, "Email reminder preference saved.");
    });

    wireVisualToggle("notifDailyTrack", "notifDailyThumb", "notifDailyToggle", true, false, function (checked) {
      savePatch({ dailyReminderEnabled: checked, setupDone: true }, "Daily reminder preference saved.");
    });

    wireVisualToggle("notifSocialTrack", "notifSocialThumb", "notifSocialToggle", true, false, function (checked) {
      savePatch({ socialEnabled: checked, setupDone: true }, "Social alert preference saved.");
    });

    if (dailyHour) {
      dailyHour.addEventListener("change", function () {
        savePatch({ dailyReminderHour: Number(dailyHour.value), setupDone: true }, "Daily reminder time saved.");
      });
    }
    if (quietStart) {
      quietStart.addEventListener("change", function () {
        savePatch({ quietHoursStart: Number(quietStart.value), setupDone: true }, "Quiet hours start saved.");
      });
    }
    if (quietEnd) {
      quietEnd.addEventListener("change", function () {
        savePatch({ quietHoursEnd: Number(quietEnd.value), setupDone: true }, "Quiet hours end saved.");
      });
    }

    if (iosNote && window.NotificationsAPI.isIosUnsupported && window.NotificationsAPI.isIosUnsupported()) {
      iosNote.classList.remove("hidden");
    }
  }

  function initWeeklyReportSection() {
    var sendBtn = document.getElementById("sendReportBtn");
    var toggleInput = document.getElementById("emailOptInToggle");

    if (!sendBtn || !toggleInput || !window.StorageAPI) { return; }

    toggleInput.checked = window.StorageAPI.getEmailOptIn ? window.StorageAPI.getEmailOptIn() : false;
    wireVisualToggle("emailOptInTrack", "emailOptInThumb", "emailOptInToggle", true, false, function (checked) {
      var result = window.StorageAPI.setEmailOptIn
        ? window.StorageAPI.setEmailOptIn(checked)
        : window.StorageAPI.savePreferences({ emailOptIn: checked });
      if (!result || result.ok === false) {
        showMessage("weeklyReportMsg", (result && result.error) || "Couldn't save report preference.", true);
        return;
      }
      showMessage("weeklyReportMsg", "Weekly report preference saved.", false);
    });

    renderWeeklyReportMeta();

    sendBtn.addEventListener("click", async function () {
      var user = window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      if (!user || !user.email) {
        showMessage("weeklyReportMsg", "No email found on your account.", true);
        return;
      }

      var weeklyData = buildWeeklyReportData();
      if (!weeklyData) {
        showMessage("weeklyReportMsg", "Unable to prepare weekly report data.", true);
        return;
      }

      setSendButtonState(sendBtn, true);
      try {
        var response = await fetch(WRAPPED_EMAIL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            firstName: user.firstName || "Saver",
            weeklyData: weeklyData
          })
        });

        var data = {};
        try {
          data = await response.json();
        } catch (_) {}

        if (!response.ok || !data.success) {
          showMessage("weeklyReportMsg", data.error || "Couldn't send - try again.", true);
          return;
        }

        if (window.StorageAPI.setLastEmailSentAt) {
          window.StorageAPI.setLastEmailSentAt(new Date().toISOString());
        }
        renderWeeklyReportMeta();
        showMessage("weeklyReportMsg", "Report sent to your email \u2713", false);
      } catch (e) {
        showMessage("weeklyReportMsg", "Couldn't send - try again.", true);
      } finally {
        setSendButtonState(sendBtn, false);
      }
    });
  }

  function initDevToolsShortcut() {
    var shortcut = document.getElementById("devToolsShortcut");
    if (!shortcut) { return; }

    if (!window.FirebaseInit || !window.FirebaseInit.ready) { return; }

    window.FirebaseInit.ready.then(function () {
      if (!window.firebase || !window.firebase.functions) { return; }
      var callable = window.firebase.functions().httpsCallable("devCheckAccess");
      return callable().then(function (res) {
        if (res && res.data && res.data.authorized === true) {
          shortcut.classList.remove("hidden");
        }
      }).catch(function () {
        // Non-allowlisted users keep this shortcut hidden.
      });
    }).catch(function () {
      // Ignore bootstrap failures for this optional shortcut.
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
    initNotificationSection();
    initWeeklyReportSection();
    initBudgetAndAccountSection();
    initDevToolsShortcut();

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
