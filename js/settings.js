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
  }

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

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    initProfileSection();
    initStreakSection();
    initDisplaySection();
    initDarkToggleUI();
  });

  // ── Dark toggle UI sync (keep visual state in sync with dark-mode.js)
  function initDarkToggleUI() {
    var btn = document.getElementById('darkModeToggle');
    if (!btn) { return; }

    function sync() {
      var isDark = document.documentElement.classList.contains('dark-mode');
      btn.classList.toggle('dark-on', isDark);
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }

    // Initial sync
    sync();

    // Keep in sync across storage events (dark-mode.js writes `darkModeEnabled` to localStorage)
    window.addEventListener('storage', function (e) {
      if (e.key === 'darkModeEnabled') { sync(); }
    });

    // Custom event from StorageAPI-backed preference saves
    window.addEventListener('sugbocents:preferencesChanged', function (e) {
      if (e && e.detail && e.detail.key === 'darkModeEnabled') { sync(); }
    });

    // Observe <html> class changes as another fallback
    try {
      var mo = new MutationObserver(function () { sync(); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } catch (err) {
      // ignore in older browsers
    }
  }
})();
