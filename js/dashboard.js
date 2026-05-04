(function () {

  // ── undo toast state ─────────────────────────────────────
  var pendingDelete     = null; // { id, data }
  var pendingDeleteTimer = null;
  var UNDO_DELAY_MS     = 4000;

  // ── expense log rate limiter (localStorage) ──────────────
  var EXP_RL_KEY       = "sc_exp_rl";
  var EXP_RL_MAX       = 30;               // max expense logs per window
  var EXP_RL_WINDOW_MS = 60 * 60 * 1000;  // 1 hour

  function checkExpenseRateLimit() {
    var now = Date.now();
    var data;
    try { data = JSON.parse(localStorage.getItem(EXP_RL_KEY)) || { timestamps: [] }; }
    catch (_) { data = { timestamps: [] }; }
    data.timestamps = data.timestamps.filter(function (t) { return now - t < EXP_RL_WINDOW_MS; });
    if (data.timestamps.length >= EXP_RL_MAX) {
      var resetMins = Math.ceil((EXP_RL_WINDOW_MS - (now - data.timestamps[0])) / 60000);
      return { allowed: false, resetMins: resetMins };
    }
    data.timestamps.push(now);
    try { localStorage.setItem(EXP_RL_KEY, JSON.stringify(data)); } catch (_) {}
    return { allowed: true };
  }

  // ── helpers ─────────────────────────────────────────────
  function formatPhp(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function formatRelativeTime(isoString) {
    var then = new Date(isoString).getTime();
    var now = Date.now();
    var deltaMinutes = Math.max(1, Math.round((now - then) / 60000));

    if (deltaMinutes < 60) {
      return deltaMinutes + " min ago";
    }

    var deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24) {
      return deltaHours + " hr ago";
    }

    var deltaDays = Math.round(deltaHours / 24);
    return deltaDays + " day" + (deltaDays > 1 ? "s" : "") + " ago";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── greeting ─────────────────────────────────────────────
  // renderGreeting() removed — target elements (#greetingTitle, #greetingDate) no longer exist in dashboard.html
  function renderGreeting() {}

  function updateBudgetCard() {
    if (!window.StorageAPI) {
      return;
    }

    var summary = window.StorageAPI.getBudgetSummary();
    // Adjust for optimistic pending-delete
    if (pendingDelete && pendingDelete.data) {
      var adj = Number(pendingDelete.data.amount) || 0;
      summary.totalSpentThisWeek = Math.max(0, summary.totalSpentThisWeek - adj);
      summary.remaining = summary.weeklyBudget - summary.totalSpentThisWeek;
      summary.percentageSpent = summary.weeklyBudget > 0
        ? Math.min(100, Math.round((summary.totalSpentThisWeek / summary.weeklyBudget) * 100))
        : 0;
    }
    var remainingEl   = document.getElementById("remainingAmount");
    var summaryEl     = document.getElementById("budgetSummary");
    var progressEl    = document.getElementById("budgetProgress");
    var labelEl       = document.getElementById("progressLabel");
    var weekLabelEl   = document.getElementById("budgetWeekLabel");
    var healthLineEl  = document.getElementById("budgetHealthLine");
    var budgetCardEl  = document.getElementById("budgetCard");

    if (!remainingEl) {
      return;
    }

    remainingEl.textContent = formatPhp(summary.remaining);

    if (summary.weeklyBudget > 0) {
      summaryEl.textContent = formatPhp(summary.totalSpentThisWeek) + " of " + formatPhp(summary.weeklyBudget) + " spent";
    } else {
      summaryEl.textContent = "Set your weekly budget in Settings.";
    }

    var pct = summary.percentageSpent;
    progressEl.style.width = pct + "%";

    // Days left in week (Mon–Sun)
    var now2 = new Date();
    var dow2 = now2.getDay();
    var weekStart2 = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() - ((dow2 + 6) % 7));
    var weekEnd2   = new Date(weekStart2.getFullYear(), weekStart2.getMonth(), weekStart2.getDate() + 7);
    var daysLeftNum = Math.ceil((weekEnd2 - now2) / (1000 * 60 * 60 * 24));
    daysLeftNum = Math.max(1, Math.min(7, daysLeftNum));

    labelEl.textContent = pct + "% used \u00b7 " + daysLeftNum + " day" + (daysLeftNum === 1 ? "" : "s") + " left";

    // Health line — computed from avg daily spend vs remaining budget / remaining days
    if (healthLineEl && summary.weeklyBudget > 0) {
      var avgDailyTarget = summary.weeklyBudget / 7;
      var spentDays = 7 - daysLeftNum + 1;
      var avgDailyActual = spentDays > 0 ? summary.totalSpentThisWeek / spentDays : 0;
      if (pct >= 100) {
        healthLineEl.textContent = "Over budget this week";
      } else if (avgDailyActual > avgDailyTarget * 1.1) {
        healthLineEl.textContent = "Watch out \u2014 spending above daily pace";
      } else if (avgDailyActual > avgDailyTarget * 0.9) {
        healthLineEl.textContent = "On track \u2014 right on pace";
      } else {
        healthLineEl.textContent = "Ahead of pace \u2014 " + formatPhp(Math.round(avgDailyTarget - avgDailyActual)) + " under avg/day";
      }
    } else if (healthLineEl) {
      healthLineEl.textContent = "";
    }

    // colour-adaptive bar fill
    progressEl.classList.remove("pct-warn", "pct-danger");
    if (pct >= 80) {
      progressEl.classList.add("pct-danger");
    } else if (pct >= 60) {
      progressEl.classList.add("pct-warn");
    }

    // State-based card background
    if (budgetCardEl) {
      budgetCardEl.classList.remove("budget-card--caution", "budget-card--warning", "budget-card--danger");
      if (pct >= 90) {
        budgetCardEl.classList.add("budget-card--danger");
      } else if (pct >= 65) {
        budgetCardEl.classList.add("budget-card--warning");
      } else if (pct >= 50) {
        budgetCardEl.classList.add("budget-card--caution");
      }
    }

    // week range label
    if (weekLabelEl) {
      var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      weekLabelEl.textContent = months[weekStart2.getMonth()] + " " + weekStart2.getDate() +
        " \u2013 " + months[new Date(weekEnd2.getTime() - 1).getMonth()] + " " + new Date(weekEnd2.getTime() - 1).getDate();
    }
  }

  // ── update quick summary stats ───────────────────────────
  function updateQuickSummaryStats() {
    if (!window.StorageAPI) { return; }

    var summary = window.StorageAPI.getBudgetSummary();
    var spent = summary.totalSpentThisWeek || 0;
    var remaining = summary.remaining || 0;
    var avgDaily = 0;

    var user = window.StorageAPI.getCurrentUser();
    if (user && Array.isArray(user.expenses)) {
      var now = new Date();
      var day = now.getDay();
      var weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((day + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);
      var weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      weekEnd.setHours(0, 0, 0, 0);
      var weekExpenses = user.expenses.filter(function (exp) {
        var d = new Date(exp.timestamp);
        return d >= weekStart && d < weekEnd;
      });
      avgDaily = weekExpenses.length > 0 ? spent / 7 : 0;
    }

    var spentEl     = document.getElementById("dashQuickSpent");
    var avgEl       = document.getElementById("dashQuickAvg");
    var remainingEl = document.getElementById("dashQuickRemaining");

    if (spentEl)     { spentEl.textContent = formatPhp(spent); }
    if (avgEl)       { avgEl.textContent = formatPhp(avgDaily); }
    if (remainingEl) {
      remainingEl.textContent = formatPhp(Math.max(0, remaining));
      remainingEl.className = remaining >= 0
        ? "text-sm font-bold text-emerald-600"
        : "text-sm font-bold text-red-600";
    }
  }

  // ── quick-add grid ───────────────────────────────────────
  // Emoji fallback map for items that were created before emoji picker existed
  var CATEGORY_EMOJI_MAP = {
    "jeepney": "🚌", "transportation": "🚌", "commute": "🚌", "bus": "🚌",
    "food": "🍔", "meal": "🍔", "lunch": "🍔", "dinner": "🍔", "breakfast": "🍳",
    "coffee": "☕", "cafe": "☕", "milk tea": "🧋",
    "load": "📱", "data": "📱", "phone": "📱",
    "laundry": "👕",
    "school": "📚", "tuition": "📚", "books": "📚",
    "gym": "🏋️",
    "snack": "🍜",
    "water": "💧",
    "gas": "⛽", "gasoline": "⛽",
    "medicine": "💊", "health": "💊", "meds": "💊",
    "taxi": "🚗", "grab": "🚗", "car": "🚗",
    "grocery": "🛍️", "groceries": "🛍️", "market": "🛍️",
    "rent": "🏠", "utilities": "💡", "electricity": "💡",
    "others": "💼", "miscellaneous": "💼"
  };

  function getItemEmoji(item) {
    var stored = item.emoji;
    if (stored && stored !== "\u2022" && stored !== "\u00b7" && stored.trim().length > 0) {
      return stored;
    }
    var key = String(item.label || item.category || "").toLowerCase().trim();
    return CATEGORY_EMOJI_MAP[key] || "💸";
  }

  function renderQuickAddButtons() {
    var grid = document.getElementById("quickAddGrid");
    if (!grid || !window.StorageAPI) { return; }

    var items = window.StorageAPI.getQuickAddItems();
    grid.innerHTML = "";

    // Determine first-log-of-day for XP pill text
    var today = new Date();
    var todayKey = today.getFullYear() + "-" +
      String(today.getMonth() + 1).padStart(2, "0") + "-" +
      String(today.getDate()).padStart(2, "0");
    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var loggedToday = expenses.some(function (e) {
      if (!e.timestamp) { return false; }
      var d = new Date(e.timestamp);
      var dk = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      return dk === todayKey;
    });
    var xpLabel     = loggedToday ? "⚡ +5 XP"  : "⚡ +10 XP";
    var xpBonusCls  = loggedToday ? "" : " quest-tile-xp--bonus";

    // Responsive column count — 2 cols for ≤4 tiles + Add, 3 cols for 5+
    var totalCells = items.length + 1; // +1 for "Add" cell
    grid.style.gridTemplateColumns = totalCells <= 4 ? "1fr 1fr" : "1fr 1fr 1fr";

    if (items.length === 0) {
      var SUGGESTIONS = [
        { label: "Jeepney", amount: 18,  color: "#d8efe2" },
        { label: "Food",    amount: 120, color: "#ffedd5" },
        { label: "Load",    amount: 50,  color: "#dbeafe" },
        { label: "Laundry", amount: 60,  color: "#fee2e2" },
        { label: "School",  amount: 80,  color: "#f3e8ff" },
        { label: "Coffee",  amount: 75,  color: "#fef9c3" }
      ];

      var emptyWrap = document.createElement("div");
      emptyWrap.style.gridColumn = "1 / -1";
      emptyWrap.innerHTML =
        '<p class="text-sm font-semibold text-ink mb-1">Add your first shortcut</p>' +
        '<p class="text-xs text-slate-500 mb-3">Tap a suggestion or use the Add button above.</p>' +
        '<div class="qa-suggestions"></div>';
      grid.appendChild(emptyWrap);

      var suggestRow = emptyWrap.querySelector(".qa-suggestions");
      SUGGESTIONS.forEach(function (sug) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "qa-suggestion-chip";
        chip.style.background = sug.color;
        chip.textContent = sug.label;
        chip.addEventListener("click", function () {
          openQaModal({ id: "", category: sug.label, emoji: "", amount: sug.amount, color: sug.color });
        });
        suggestRow.appendChild(chip);
      });
      return;
    }

    items.forEach(function (item) {
      var wrap = document.createElement("div");
      wrap.className = "quest-tile-wrap";

      var button = document.createElement("button");
      button.type = "button";
      button.className = "quest-tile-btn";
      button.style.background = item.color || "#e2e8f0";
      button.setAttribute("data-qa-id", item.id || "");

      var emoji       = getItemEmoji(item);
      var displayLabel = escapeHtml(item.label || item.category || "?");
      var amountText   = formatPhp(item.amount);

      button.innerHTML =
        '<span class="quest-tile-emoji" aria-hidden="true">' + emoji + '</span>' +
        '<span class="quest-tile-label">' + displayLabel + '</span>' +
        '<span class="quest-tile-amount">' + amountText + '</span>' +
        '<span class="quest-tile-xp' + xpBonusCls + '">' + xpLabel + '</span>';

      button.addEventListener("click", function () {
        // Budget gate
        if (!window.StorageAPI.getWeeklyBudget || window.StorageAPI.getWeeklyBudget() <= 0) {
          var gate = document.getElementById("budgetGateModal");
          if (gate) {
            gate.classList.remove("hidden");
            var cancel = document.getElementById("budgetGateCancel");
            if (cancel) { cancel.focus(); }
          }
          return;
        }

        var dlabel = item.label || item.category;
        var catId  = item.label ? item.category : (item.categoryId || "");

        var qaRl = checkExpenseRateLimit();
        if (!qaRl.allowed) {
          var xpEl = button.querySelector(".quest-tile-xp");
          if (xpEl) { xpEl.textContent = "Slow down!"; }
          setTimeout(function () {
            var xpEl2 = button.querySelector(".quest-tile-xp");
            if (xpEl2) { xpEl2.textContent = xpLabel; }
          }, 2000);
          return;
        }

        var result = window.StorageAPI.addExpense({
          amount: item.amount,
          category: dlabel,
          note: dlabel,
          raw: true,
          categoryId: catId || undefined
        });

        if (!result.ok) { return; }

        if (window.GamificationUI && result.xpAwarded > 0) {
          window.GamificationUI.showXpPopup(result.xpAwarded, button);
          window.GamificationUI.maybeNotifyNewAchievements(result.newlyUnlockableAchievements || []);
        }

        updateBudgetCard();
        renderXpWidget();
        renderTodayMission();
        renderBadgeTeaser();
        renderRecentExpenses();

        if (window.SpendingChart) { window.SpendingChart.update(); }

        button.classList.add("qa-pulse");
        setTimeout(function () { button.classList.remove("qa-pulse"); }, 500);
      });

      // Options (⋯) button — edit shortcut
      var optBtn = document.createElement("button");
      optBtn.type = "button";
      optBtn.className = "qa-option-btn";
      optBtn.setAttribute("aria-label", "Edit " + escapeHtml(item.label || item.category));
      optBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
      optBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openQaModal(item);
      });

      wrap.appendChild(button);
      wrap.appendChild(optBtn);
      grid.appendChild(wrap);
    });

    // "Add shortcut" cell — always last
    var addWrap = document.createElement("div");
    addWrap.className = "quest-tile-wrap";
    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "quest-tile-btn quest-tile-btn--add-new";
    addBtn.setAttribute("aria-label", "Add new shortcut");
    addBtn.innerHTML =
      '<span class="quest-tile-emoji" aria-hidden="true" style="font-size:1.4rem;color:var(--brand-700)">+</span>' +
      '<span class="quest-tile-label" style="color:var(--brand-700)">Add</span>';
    addBtn.addEventListener("click", function () { openQaModal(null); });
    addWrap.appendChild(addBtn);
    grid.appendChild(addWrap);
  }

  function deleteQuickAddItem(itemId) {
    if (!window.StorageAPI) {
      return;
    }

    var items = window.StorageAPI.getQuickAddItems();
    var updated = items.filter(function (i) {
      return i.id !== itemId;
    });

    window.StorageAPI.saveQuickAddItems(updated);
    closeModal();
    renderQuickAddButtons();
  }

  // ── modal ────────────────────────────────────────────────
  var EMOJI_PRESETS = [
    "🍔","🍜","🍕","🌮","🍳","☕","🧋","🍺",
    "🚌","🚶","🚗","🛵","🏍️","✈️","🚂","🚲",
    "💊","🏋️","🎮","📱","💡","👕","📚","🛍️",
    "🏠","💈","🐾","🎬","💄","🌐","🎵","💼"
  ];

  var qaModal           = null;
  var qaModalItemIdEl   = null;
  var qaModalEmoji      = null;
  var qaModalEmojiGrid  = null;
  var qaModalCategory   = null;
  var qaModalCategoryId = null;
  var qaModalAmount     = null;
  var qaModalCatErr     = null;
  var qaModalAmtErr     = null;
  var qaModalDeleteBtn  = null;
  var dashboardAccountMenu = null;

  function initModal() {
    qaModal           = document.getElementById("qaModal");
    qaModalItemIdEl   = document.getElementById("qaModalItemId");
    qaModalEmoji      = document.getElementById("qaModalEmoji");
    qaModalEmojiGrid  = document.getElementById("qaModalEmojiGrid");
    qaModalCategory   = document.getElementById("qaModalCategory");
    qaModalCategoryId = document.getElementById("qaModalCategoryId");
    qaModalAmount     = document.getElementById("qaModalAmount");
    qaModalCatErr     = document.getElementById("qaModalCategoryError");
    qaModalAmtErr     = document.getElementById("qaModalAmountError");
    qaModalDeleteBtn  = document.getElementById("qaModalDelete");

    // Build emoji picker grid
    if (qaModalEmojiGrid && qaModalEmoji) {
      EMOJI_PRESETS.forEach(function (emoji) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "emoji-option";
        btn.textContent = emoji;
        btn.setAttribute("data-emoji", emoji);
        btn.addEventListener("click", function () {
          qaModalEmojiGrid.querySelectorAll(".emoji-option").forEach(function (b) {
            b.classList.remove("emoji-option--selected");
          });
          btn.classList.add("emoji-option--selected");
          qaModalEmoji.value = emoji;
        });
        qaModalEmojiGrid.appendChild(btn);
      });
    }

    // Populate predefined category select
    if (qaModalCategoryId && window.StorageAPI && window.StorageAPI.getExpenseCategories) {
      var cats = window.StorageAPI.getExpenseCategories();
      cats.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.emoji + " " + c.label;
        qaModalCategoryId.appendChild(opt);
      });
    }

    document.getElementById("qaModalCancel").addEventListener("click", closeModal);
    document.getElementById("qaModalSave").addEventListener("click", saveModal);

    if (qaModalDeleteBtn) {
      qaModalDeleteBtn.addEventListener("click", function () {
        var itemId = qaModalItemIdEl.value;
        if (itemId) {
          deleteQuickAddItem(itemId);
        }
      });
    }
    // Backdrop click intentionally does NOT close — user must use Cancel
  }

  function openQaModal(item) {
    document.getElementById("qaModalTitle").textContent = item ? "Edit shortcut" : "New shortcut";
    qaModalItemIdEl.value  = item ? (item.id || "") : "";
    qaModalCategory.value  = item ? (item.label || item.category || "") : "";
    qaModalAmount.value    = item ? String(item.amount || "") : "";
    if (qaModalCategoryId) {
      var predId = item ? (item.label ? item.category : (item.categoryId || "")) : "";
      qaModalCategoryId.value = predId;
    }

    // Pre-select emoji in picker
    if (qaModalEmojiGrid && qaModalEmoji) {
      var storedEmoji = item ? (item.emoji || "") : "";
      // Treat legacy bullet placeholder as no selection
      if (storedEmoji === "\u2022" || storedEmoji === "\u00b7" || storedEmoji.trim() === "") {
        storedEmoji = "";
      }
      var targetEmoji = storedEmoji || EMOJI_PRESETS[0];
      qaModalEmoji.value = targetEmoji;
      qaModalEmojiGrid.querySelectorAll(".emoji-option").forEach(function (btn) {
        if (btn.getAttribute("data-emoji") === targetEmoji) {
          btn.classList.add("emoji-option--selected");
        } else {
          btn.classList.remove("emoji-option--selected");
        }
      });
    }

    qaModalCatErr.textContent = "";
    qaModalAmtErr.textContent = "";

    // show Delete button only when editing an existing item
    if (qaModalDeleteBtn) {
      qaModalDeleteBtn.style.display = item ? "inline-flex" : "none";
    }

    qaModal.classList.remove("hidden");
    qaModalCategory.focus();
  }

  function closeModal() {
    qaModal.classList.add("hidden");
  }

  function saveModal() {
    var cat    = (qaModalCategory.value || "").trim();
    var amt    = Number(qaModalAmount.value);
    var itemId = qaModalItemIdEl.value;
    var emojiVal = (qaModalEmoji && qaModalEmoji.value) ? qaModalEmoji.value : EMOJI_PRESETS[0];

    var valid = true;

    if (!cat) {
      qaModalCatErr.textContent = "Name is required.";
      valid = false;
    } else {
      qaModalCatErr.textContent = "";
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      qaModalAmtErr.textContent = "Enter a valid amount greater than 0.";
      valid = false;
    } else {
      qaModalAmtErr.textContent = "";
    }

    if (!valid) {
      return;
    }

    var items = window.StorageAPI.getQuickAddItems();
    var COLORS = ["#d8efe2", "#ffedd5", "#dbeafe", "#f3e8ff", "#fee2e2", "#fef9c3", "#e0f2fe"];

    var catId = qaModalCategoryId ? (qaModalCategoryId.value || "") : "";

    if (itemId) {
      items = items.map(function (i) {
        if (i.id === itemId) {
          return { id: i.id, category: cat, categoryId: catId || undefined, emoji: emojiVal, amount: amt, color: i.color || COLORS[0] };
        }
        return i;
      });
    } else {
      var newId = "qa_custom_" + Date.now();
      var color = COLORS[items.length % COLORS.length];
      items.push({ id: newId, category: cat, categoryId: catId || undefined, emoji: emojiVal, amount: amt, color: color });
    }

    window.StorageAPI.saveQuickAddItems(items);
    closeModal();
    renderQuickAddButtons();
  }

  function initDashboardAccountMenu() {
    dashboardAccountMenu = document.getElementById("dashboardAccountMenu");
    var sidebarTrigger = document.getElementById("dashboardSettingsTriggerSidebar");
    if (!dashboardAccountMenu) { return; }

    function hideMenu() {
      dashboardAccountMenu.classList.add("hidden");
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("keydown", onMenuKeydown);
    }

    function onDocumentClick(event) {
      if (!dashboardAccountMenu.contains(event.target)) {
        hideMenu();
      }
    }

    function onMenuKeydown(event) {
      if (event.key === "Escape") {
        hideMenu();
      }
    }

    function openMenu(triggerEl) {
      if (!triggerEl) { return; }
      var rect = triggerEl.getBoundingClientRect();
      var menuWidth = 180;
      var left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
      var top = rect.bottom + 8;
      dashboardAccountMenu.style.left = left + "px";
      dashboardAccountMenu.style.top = top + "px";
      dashboardAccountMenu.classList.remove("hidden");
      document.addEventListener("click", onDocumentClick, true);
      document.addEventListener("keydown", onMenuKeydown);
    }

    function toggleMenu(triggerEl) {
      if (dashboardAccountMenu.classList.contains("hidden")) {
        openMenu(triggerEl);
      } else {
        hideMenu();
      }
    }

    [sidebarTrigger].forEach(function (trigger) {
      if (!trigger) { return; }
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleMenu(trigger);
      });
    });
  }

  // ── custom log modal ─────────────────────────────────────
  function updateLogOnceXpBadge() {
    var badge = document.getElementById("logOnceXpBadge");
    if (!badge || !window.StorageAPI) { return; }
    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var today = new Date();
    var todayKey = today.getFullYear() + "-" +
      String(today.getMonth() + 1).padStart(2, "0") + "-" +
      String(today.getDate()).padStart(2, "0");
    var loggedToday = expenses.some(function (e) {
      if (!e.timestamp) { return false; }
      var d = new Date(e.timestamp);
      var dk = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      return dk === todayKey;
    });
    badge.textContent = loggedToday ? "\u26a1 +5 XP" : "\u26a1 +10 XP";
  }

  function initCustomLogModal() {
    var modal       = document.getElementById("customLogModal");
    var amountEl    = document.getElementById("customLogAmount");
    var categoryEl  = document.getElementById("customLogCategory");
    var noteEl      = document.getElementById("customLogNote");
    var amountErrEl = document.getElementById("customLogAmountError");
    var catErrEl    = document.getElementById("customLogCategoryError");
    var cancelBtn   = document.getElementById("customLogCancel");
    var saveBtn     = document.getElementById("customLogSave");
    var triggerBtn  = document.getElementById("logOneTimeBtn");

    if (!modal || !triggerBtn) { return; }

    updateLogOnceXpBadge();

    // Populate categories
    if (categoryEl && window.StorageAPI && window.StorageAPI.getExpenseCategories) {
      var cats = window.StorageAPI.getExpenseCategories();
      cats.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.emoji + " " + c.label;
        categoryEl.appendChild(opt);
      });
    }

    triggerBtn.addEventListener("click", function () {
      // Budget gate
      if (!window.StorageAPI.getWeeklyBudget || window.StorageAPI.getWeeklyBudget() <= 0) {
        var gate = document.getElementById("budgetGateModal");
        if (gate) { gate.classList.remove("hidden"); }
        return;
      }
      amountEl.value = "";
      categoryEl.value = "";
      noteEl.value = "";
      if (amountErrEl) { amountErrEl.textContent = ""; }
      if (catErrEl)    { catErrEl.textContent = ""; }
      modal.classList.remove("hidden");
      amountEl.focus();
    });

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () { modal.classList.add("hidden"); });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var amt   = Number(amountEl.value);
        var catId = categoryEl.value;
        var note  = (noteEl.value || "").trim().slice(0, 80);
        var valid = true;

        if (!Number.isFinite(amt) || amt <= 0) {
          if (amountErrEl) { amountErrEl.textContent = "Enter a valid amount greater than 0."; }
          valid = false;
        } else {
          if (amountErrEl) { amountErrEl.textContent = ""; }
        }

        if (!catId) {
          if (catErrEl) { catErrEl.textContent = "Please select a category."; }
          valid = false;
        } else {
          if (catErrEl) { catErrEl.textContent = ""; }
        }

        if (!valid) { return; }

        var allCats = window.StorageAPI.getExpenseCategories ? window.StorageAPI.getExpenseCategories() : [];
        var catMeta = null;
        for (var ci = 0; ci < allCats.length; ci++) {
          if (allCats[ci].id === catId) { catMeta = allCats[ci]; break; }
        }
        catMeta = catMeta || { label: catId, id: catId };

        var rl = checkExpenseRateLimit();
        if (!rl.allowed) { return; }

        var result = window.StorageAPI.addExpense({
          amount: amt,
          category: catMeta.label,
          categoryId: catMeta.id,
          note: note || catMeta.label,
          raw: true
        });

        if (!result.ok) { return; }

        modal.classList.add("hidden");

        if (window.GamificationUI && result.xpAwarded > 0) {
          window.GamificationUI.showXpPopup(result.xpAwarded, triggerBtn);
          window.GamificationUI.maybeNotifyNewAchievements(result.newlyUnlockableAchievements || []);
        }

        updateBudgetCard();
        renderXpWidget();
        renderTodayMission();
        renderBadgeTeaser();
        renderRecentExpenses();
        updateLogOnceXpBadge();
        renderQuickAddButtons();

        if (window.SpendingChart) { window.SpendingChart.update(); }
        window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
      });
    }
  }

  // ── week at a glance KPIs ──────────────────────────────
  function renderWeekAtGlance() {
    var grid = document.getElementById("weekAtGlance");
    if (!grid || !window.StorageAPI) { return; }

    var now       = new Date();
    var today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var tomorrow  = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var dow       = now.getDay(); // 0=Sun
    var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((dow + 6) % 7));
    var weekEnd   = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);

    var allExpenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var summary     = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var cats        = window.StorageAPI.getExpenseCategories ? window.StorageAPI.getExpenseCategories() : [];
    var catMap = {};
    cats.forEach(function (c) { catMap[c.id] = c; });

    var todaySpend = 0;
    var weekCount  = 0;
    var catTotals  = {};
    allExpenses.forEach(function (e) {
      var d = new Date(e.timestamp);
      if (d >= today && d < tomorrow) {
        todaySpend += Number(e.amount || 0);
      }
      if (d >= weekStart && d < weekEnd) {
        weekCount++;
        var key = e.categoryId || e.category || "others";
        catTotals[key] = (catTotals[key] || 0) + Number(e.amount || 0);
      }
    });

    var weeklyBudget    = summary.weeklyBudget || 0;
    var dailyBudget     = weeklyBudget > 0 ? weeklyBudget / 7 : 0;
    var overDailyBudget = dailyBudget > 0 && todaySpend > dailyBudget;

    // Top category this week
    var topCatKey = null, topCatAmt = 0;
    Object.keys(catTotals).forEach(function (k) {
      if (catTotals[k] > topCatAmt) { topCatAmt = catTotals[k]; topCatKey = k; }
    });
    var topCatMeta = topCatKey ? (catMap[topCatKey] || { label: topCatKey, emoji: "\u{1F4B8}" }) : null;

    // Days left in week (Mon–Sun)
    var daysLeft = Math.ceil((weekEnd - now) / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(1, Math.min(7, daysLeft));

    var CARDS = [
      {
        id: "kpiSpentToday",
        label: "Spent Today",
        value: todaySpend > 0 ? formatPhp(todaySpend) : formatPhp(0),
        sub: dailyBudget > 0 ? ("of " + formatPhp(Math.round(dailyBudget)) + "/day") : "no budget set",
        mod: overDailyBudget ? " week-kpi-card--danger" : (todaySpend > 0 ? " week-kpi-card--active" : "")
      },
      {
        id: "kpiWeekCount",
        label: "Expenses",
        value: String(weekCount),
        sub: weekCount === 1 ? "logged this week" : "logged this week",
        mod: weekCount > 0 ? " week-kpi-card--active" : ""
      },
      {
        id: "kpiTopCat",
        label: "Top Category",
        value: topCatMeta ? ((topCatMeta.emoji || "\u{1F4B8}") + "\u00a0" + escapeHtml(topCatMeta.label || topCatKey)) : "\u2014",
        sub: topCatMeta ? formatPhp(topCatAmt) + " spent" : "no data yet",
        mod: ""
      },
      {
        id: "kpiDaysLeft",
        label: "Days Left",
        value: String(daysLeft),
        sub: daysLeft === 1 ? "day until reset" : "days until reset",
        mod: daysLeft <= 2 ? " week-kpi-card--warn" : ""
      }
    ];

    grid.innerHTML = "";
    CARDS.forEach(function (c) {
      var div = document.createElement("div");
      div.id = c.id;
      div.className = "week-kpi-card" + (c.mod || "");
      div.innerHTML =
        '<p class="week-kpi-label">' + escapeHtml(c.label) + '</p>' +
        '<p class="week-kpi-value">' + c.value + '</p>' +
        '<p class="week-kpi-sub">' + escapeHtml(c.sub) + '</p>';
      grid.appendChild(div);
    });
  }

  // ── badge teaser ─────────────────────────────────────────
  function renderBadgeTeaser() {
    var section      = document.getElementById("badgeTeaserSection");
    var targetEl     = document.getElementById("badgeTeaserTarget");
    var nameEl       = document.getElementById("badgeTeaserName");
    var journeyEl    = document.getElementById("badgeTeaserJourney");
    var conditionEl  = document.getElementById("badgeTeaserCondition");
    var progressWrap = document.getElementById("badgeTeaserProgressWrap");
    var progressFill = document.getElementById("badgeTeaserProgressFill");
    var claimBtn     = document.getElementById("badgeTeaserClaimBtn");
    var moreEl       = document.getElementById("badgeTeaserMore");
    if (!section || !window.StorageAPI || !window.StorageAPI.getAchievements) { return; }

    var all = window.StorageAPI.getAchievements();
    if (!all || all.length === 0) { section.classList.add("hidden"); return; }

    // A-2: Smart selection — show the badge closest to being earned.
    // Priority: (1) unlockable+unclaimed, (2) highest progress ratio, (3) easiest to start
    var unclaimed = all.filter(function (a) { return !a.claimed; });
    if (unclaimed.length === 0) { section.classList.add("hidden"); return; }

    var unlockable   = unclaimed.filter(function (a) { return a.unlockable; });
    var withProgress = unclaimed.filter(function (a) { return a.progress > 0 && !a.unlockable; });
    var noProgress   = unclaimed.filter(function (a) { return a.progress === 0; });

    withProgress.sort(function (a, b) {
      var rA = a.target > 0 ? a.progress / a.target : 0;
      var rB = b.target > 0 ? b.progress / b.target : 0;
      return rB - rA; // highest completion ratio first
    });
    noProgress.sort(function (a, b) { return a.target - b.target; }); // easiest target first

    var target = unlockable[0] || withProgress[0] || noProgress[0];

    // Category \u2192 CSS modifier class
    var catClassMap = {
      "Logging": "badge-target--logging",
      "Streak":  "badge-target--streak",
      "Budget":  "badge-target--budget",
      "Misc":    "badge-target--misc",
      "Goals":   "badge-target--goals",
      "XP":      "badge-target--xp"
    };
    var catClass = catClassMap[target.category] || "";

    // Populate target badge (64px, category-tinted)
    if (targetEl) {
      targetEl.className = "badge-target" + (catClass ? " " + catClass : "");
      targetEl.innerHTML = '<i class="bi ' + escapeHtml(target.icon) + '" aria-hidden="true"></i>';
      targetEl.setAttribute("aria-label", target.name);
    }

    if (nameEl) { nameEl.textContent = target.name; }

    // Journey framing line — "On your way to <next level>"
    var levelLadder = ["Rookie Saver", "Budget Aware", "Money Smart", "Week Crusher", "Streak Hunter", "Finance Pro", "Budget Legend"];
    if (journeyEl && window.StorageAPI.getXpInfo) {
      var xpInfo = window.StorageAPI.getXpInfo();
      var nextLevelName = levelLadder[xpInfo.level] || null; // level is 1-indexed; ladder[1] = "Budget Aware"
      if (nextLevelName) {
        journeyEl.textContent = "On your way to " + nextLevelName + " \u2192";
        journeyEl.classList.remove("hidden");
      } else {
        journeyEl.classList.add("hidden");
      }
    }

    // A-3: Type-specific, gap-focused condition text — unambiguous and action-oriented
    if (conditionEl) {
      if (target.unlockable) {
        conditionEl.textContent = "Ready to claim!";
      } else {
        var gap = Math.max(0, target.target - target.progress);
        if (target.type === "expense_count") {
          conditionEl.textContent = "Log " + gap + " more expense" + (gap !== 1 ? "s" : "") + " to unlock this";
        } else if (target.type === "streak") {
          conditionEl.textContent = "Reach a " + target.target + "-day streak \u2014 " + gap + " more day" + (gap !== 1 ? "s" : "") + " to go";
        } else if (target.type === "budget_week") {
          conditionEl.textContent = "Finish a week under budget to unlock";
        } else if (target.type === "budget_frugal") {
          conditionEl.textContent = "Spend \u226450% of your budget this week";
        } else if (target.type === "level") {
          conditionEl.textContent = "Reach Level " + target.target + " \u2014 " + gap + " level" + (gap !== 1 ? "s" : "") + " away";
        } else if (target.type === "goal_count") {
          conditionEl.textContent = "Create your first savings goal to unlock";
        } else {
          conditionEl.textContent = target.description;
        }
      }
    }

    // Progress bar OR Claim button
    if (target.unlockable) {
      if (progressWrap) { progressWrap.classList.add("hidden"); }
      if (claimBtn) {
        claimBtn.classList.remove("hidden");
        claimBtn.onclick = function () {
          if (window.StorageAPI.claimAchievement) {
            window.StorageAPI.claimAchievement(target.id);
          }
          renderBadgeTeaser();
        };
      }
    } else {
      if (claimBtn) { claimBtn.classList.add("hidden"); }
      if (progressWrap) { progressWrap.classList.remove("hidden"); }
      if (progressFill) {
        var pct = target.target > 0 ? Math.min(100, Math.round((target.progress / target.target) * 100)) : 0;
        progressFill.style.width = pct + "%";
      }
    }

    // "X more badges to earn" count link
    if (moreEl) {
      var moreCount = unclaimed.length - 1;
      if (moreCount > 0) {
        // A-1: Achievements live in stats.html (Profile page), NOT tigom.html (Goals/savings)
        moreEl.innerHTML = "+ " + moreCount + " more badge" + (moreCount !== 1 ? "s" : "") + " to earn \u00b7 <a href=\"stats.html\" class=\"badge-more-link-anchor\">View all \u2192</a>";
        moreEl.classList.remove("hidden");
      } else {
        moreEl.classList.add("hidden");
      }
    }

    section.classList.remove("hidden");
  }

  // ── spending breakdown ───────────────────────────────────
  // renderSpendingBreakdown() removed — replaced by renderTopCategories() in Phase F.
  // Target element #spendingBreakdown no longer exists in dashboard.html.
  function renderSpendingBreakdown() {}

  function renderXpWidget() {
    if (!window.StorageAPI) { return; }
    var xpLevelNameEl  = document.getElementById("xpLevelName");
    var xpLevelBadgeEl = document.getElementById("xpLevelBadge");
    var greetingStreakEl = document.getElementById("greetingStreakBadge");
    var streakCountEl  = document.getElementById("streakBadgeCount");
    var xpBarEl        = document.getElementById("xpBar");
    var xpValueEl      = document.getElementById("xpValue");
    var xpNextEl       = document.getElementById("xpNextLabel");
    var barTrack       = document.querySelector(".xp-bar-hero .xp-bar-track");

    var xpInfo = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { xp: 0, level: 1, levelName: "Rookie Saver", xpForNext: 50, progressPct: 0 };
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;

    if (xpLevelNameEl) { xpLevelNameEl.textContent = xpInfo.levelName || "Rookie Saver"; }
    if (xpLevelBadgeEl) { xpLevelBadgeEl.textContent = "Lv. " + xpInfo.level; }
    if (xpValueEl) { xpValueEl.textContent = xpInfo.xp + " XP"; }
    if (xpNextEl) {
      if (!xpInfo.xpForNext) { xpNextEl.textContent = "Max level reached!"; }
      else if (xpInfo.xp === 0) { xpNextEl.textContent = "Log your first expense to earn XP"; }
      else { xpNextEl.textContent = (xpInfo.xpForNext - xpInfo.xp) + " XP to next level"; }
    }
    if (xpBarEl) { xpBarEl.style.width = (xpInfo.progressPct || 0) + "%"; }
    if (barTrack) { barTrack.setAttribute("aria-valuenow", String(xpInfo.progressPct || 0)); }

    // Streak badge
    if (greetingStreakEl) {
      greetingStreakEl.classList.remove(
        "streak-badge--cold", "streak-badge--amber",
        "streak-badge--orange", "streak-badge--orange-glow", "streak-badge--crimson"
      );
      greetingStreakEl.setAttribute("aria-label", "Daily streak: " + streak + (streak === 1 ? " day" : " days"));

      if (streak <= 0) {
        greetingStreakEl.classList.add("streak-badge--cold");
        if (streakCountEl) { streakCountEl.textContent = "Start"; }
      } else if (streak < 7) {
        greetingStreakEl.classList.add("streak-badge--amber");
        if (streakCountEl) { streakCountEl.textContent = streak; }
      } else if (streak < 14) {
        greetingStreakEl.classList.add("streak-badge--orange");
        if (streakCountEl) { streakCountEl.textContent = streak; }
      } else if (streak < 30) {
        greetingStreakEl.classList.add("streak-badge--orange-glow");
        if (streakCountEl) { streakCountEl.textContent = streak; }
      } else {
        greetingStreakEl.classList.add("streak-badge--crimson");
        if (streakCountEl) { streakCountEl.textContent = streak; }
      }
    }
  }

  // ── today's mission ─────────────────────────────────────────
  function renderTodayMission() {
    var card    = document.getElementById("todayMissionCard");
    var msgEl   = document.getElementById("todayMissionMsg");
    var iconEl  = document.getElementById("todayMissionIcon");
    var btnEl   = document.getElementById("todayMissionBtn");
    if (!card || !msgEl || !window.StorageAPI) { return; }

    var now   = new Date();
    var today = new Date(now);
    today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    var expenses    = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var loggedToday = expenses.some(function (e) {
      var d = new Date(e.timestamp);
      return d >= today && d < tomorrow;
    });

    var streak  = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var summary = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var pct     = summary.percentageSpent || 0;
    var nowHour = now.getHours();

    // Last expense date for comeback detection
    var sortedExp    = expenses.slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    var lastExpTs    = sortedExp.length ? new Date(sortedExp[0].timestamp) : null;
    var daysSinceLast = lastExpTs ? Math.floor((now.getTime() - lastExpTs.getTime()) / 86400000) : Infinity;

    // Priority: perfect → over-budget → pace-warning → in-progress → early-bird → at-risk → comeback → none
    // Reference: Duolingo uses warm orange for setbacks (not red) — over-budget placed high but styled empathetically
    var state;
    if      (loggedToday && pct < 50)                                       { state = "perfect"; }
    else if (loggedToday && pct >= 100)                                     { state = "over-budget"; }
    else if (loggedToday && pct >= 80)                                      { state = "pace-warning"; }
    else if (loggedToday)                                                   { state = "in-progress"; }
    else if (!loggedToday && nowHour < 12 && expenses.length > 0)          { state = "early-bird"; }
    else if (!loggedToday && streak >= 1)                                   { state = "at-risk"; }
    else if (!loggedToday && daysSinceLast >= 2 && expenses.length > 0)    { state = "comeback"; }
    else                                                                    { state = "none"; }

    var streakLabel  = streak > 0 ? streak + "-day" : "";
    // Remaining for pace-warning (Monzo/Revolut: show concrete number, not vague warning)
    var remainingPhp = formatPhp(Math.max(0, summary.remaining || 0));

    var configs = {
      "none": {
        icon: "\uD83D\uDCCB",
        desc: "Log your first expense today to start your journey.",
        btn: "Log Now",
        showBtn: true,
        scrollTo: "quickAddGrid",
        navigate: null
      },
      "early-bird": {
        icon: "\uD83C\uDF05",
        desc: "Log before noon for the Early Bird badge \u2014 you\u2019ve still got time!",
        btn: "Log Now",
        showBtn: true,
        scrollTo: "quickAddGrid",
        navigate: null
      },
      "at-risk": {
        icon: "\uD83D\uDD25",
        desc: "Log an expense today to protect your " + streakLabel + " streak!",
        btn: "Protect Streak",
        showBtn: true,
        scrollTo: "quickAddGrid",
        navigate: null
      },
      "comeback": {
        icon: "\uD83D\uDCAA",
        desc: "You\u2019ve been away \u2014 log today and start fresh.",
        btn: "Get Back On Track",
        showBtn: true,
        scrollTo: "quickAddGrid",
        navigate: null
      },
      "in-progress": {
        icon: "\u26A1",
        desc: "Logged today and on track \u2014 great work!",
        btn: "Log Anyway",
        showBtn: true,
        scrollTo: "quickAddGrid",
        navigate: null
      },
      // Reference: Monzo/Revolut links to spending breakdown, NOT the budget card already on screen
      "pace-warning": {
        icon: "\u26A0\uFE0F",
        desc: "You\u2019re close to your limit \u2014 " + remainingPhp + " left this week.",
        btn: "Review spending",
        showBtn: true,
        scrollTo: null,
        navigate: "activity.html"
      },
      // Reference: Duolingo streak-break screen = acknowledge setback + forward path, warm not punishing
      "over-budget": {
        icon: "\uD83D\uDD04",
        desc: "You\u2019ve gone over budget this week \u2014 that\u2019s okay. Logging helps you understand why.",
        btn: "See where it went",
        showBtn: true,
        scrollTo: null,
        navigate: "activity.html"
      },
      "perfect": {
        icon: "\u2705",
        desc: "Mission complete \u2014 you\u2019re winning today!",
        btn: "Done \u2713",
        showBtn: false,
        scrollTo: null,
        navigate: null
      }
    };

    var cfg = configs[state] || configs["none"];
    card.className = "today-mission-card today-mission-card--" + state;
    if (iconEl) { iconEl.textContent = cfg.icon; }
    msgEl.textContent = cfg.desc;

    if (btnEl) {
      btnEl.textContent = cfg.btn;
      btnEl.style.display = cfg.showBtn ? "" : "none";
      btnEl.onclick = null;
      if (cfg.showBtn) {
        if (cfg.navigate) {
          (function (url) {
            btnEl.onclick = function () { window.location.href = url; };
          }(cfg.navigate));
        } else if (cfg.scrollTo) {
          (function (targetId) {
            btnEl.onclick = function () {
              var el = document.getElementById(targetId);
              if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); }
            };
          }(cfg.scrollTo));
        }
      }
    }

    // card is no longer interactive
    card.style.cursor = "";
    card.removeAttribute("tabindex");
    card.onclick   = null;
    card.onkeydown = null;
  }

  // ── Stats Block (Phase F) ─────────────────────────────────

  // Shared helper: Mon-start week range for a given Date
  function getWeekRange(now) {
    var dow = now.getDay();
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((dow + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return { start: weekStart, end: weekEnd };
  }

  // renderWeekChallenge — Stats Block A+C hybrid
  // Reference: Peloton status position (pill), Strava PR framing (vs last week delta),
  // Finch variable reward (CTA text changes based on week state)
  function renderWeekChallenge() {
    var statusPill = document.getElementById("weekStatusPill");
    var vsLastWeek = document.getElementById("vsLastWeek");
    var ctaText    = document.getElementById("seeStatsCtaText");
    if (!window.StorageAPI) { return; }

    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var now      = new Date();
    var wr       = getWeekRange(now);
    var summary  = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var pct      = summary.percentageSpent || 0;
    var budget   = summary.weeklyBudget || 0;

    // This week's total
    var thisWeekTotal = expenses
      .filter(function (e) { var d = new Date(e.timestamp); return d >= wr.start && d < wr.end; })
      .reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

    // Last week's range
    var lastWrStart = new Date(wr.start); lastWrStart.setDate(wr.start.getDate() - 7);
    var lastWrEnd   = new Date(wr.end);   lastWrEnd.setDate(wr.end.getDate() - 7);
    // Last week: same point in the week (up to and including same day-of-week)
    var todayDayIdx      = (now.getDay() + 6) % 7; // 0=Mon .. 6=Sun
    var lastWeekCutoff   = new Date(lastWrStart);
    lastWeekCutoff.setDate(lastWrStart.getDate() + todayDayIdx);
    lastWeekCutoff.setHours(23, 59, 59, 999);

    var lastWeekExps = expenses.filter(function (e) {
      var d = new Date(e.timestamp); return d >= lastWrStart && d < lastWrEnd;
    });
    var hasLastWeekData = lastWeekExps.length > 0;
    var lastWeekSameDayTotal = lastWeekExps
      .filter(function (e) { return new Date(e.timestamp) <= lastWeekCutoff; })
      .reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

    // Status pill — Peloton leaderboard-position concept: one answer to "am I winning this week?"
    var pillState = "default";
    if (budget > 0) {
      if      (pct >= 100) { pillState = "over-budget"; }
      else if (pct >= 80)  { pillState = "watch-out"; }
      else                 { pillState = "on-pace"; }
    }

    if (statusPill) {
      statusPill.className = "week-status-pill";
      if (pillState === "default") {
        statusPill.classList.add("hidden");
      } else {
        statusPill.classList.remove("hidden");
        var pillLabels = {
          "on-pace":     "On pace \u2713",
          "watch-out":   "Watch out",
          "over-budget": "Over budget"
        };
        statusPill.textContent = pillLabels[pillState];
        statusPill.classList.add("week-status-pill--" + pillState);
      }
    }

    // vs Last Week delta — Strava PR framing: compete with your past self, new record every week
    if (vsLastWeek) {
      var thisWeekHasData = thisWeekTotal > 0;
      if (!thisWeekHasData) {
        vsLastWeek.classList.add("hidden");
      } else if (!hasLastWeekData) {
        vsLastWeek.innerHTML = '<span class="vs-delta--neutral">\uD83C\uDF1F First week tracking \u2014 you\u2019re building your baseline!</span>';
        vsLastWeek.classList.remove("hidden");
      } else {
        var delta    = thisWeekTotal - lastWeekSameDayTotal;
        var absDelta = Math.abs(delta);
        var pctDelta = lastWeekSameDayTotal > 0 ? Math.round((absDelta / lastWeekSameDayTotal) * 100) : 0;
        var pctSuffix = pctDelta > 0 ? " (" + pctDelta + "%)" : "";
        if (delta < 0) {
          vsLastWeek.innerHTML = '<span class="vs-delta--better">\u25BC ' + formatPhp(absDelta) + ' less than last week at this point' + pctSuffix + '</span>';
        } else if (delta > 0) {
          vsLastWeek.innerHTML = '<span class="vs-delta--worse">\u25B2 ' + formatPhp(absDelta) + ' more than last week at this point' + pctSuffix + '</span>';
        } else {
          vsLastWeek.innerHTML = '<span class="vs-delta--neutral">Same pace as last week</span>';
        }
        vsLastWeek.classList.remove("hidden");
      }
    }

    // Dynamic CTA text — Finch variable reward: text shifts based on week state
    // Different every day depending on your pace, creates an itch to check back
    if (ctaText) {
      var ctaMap = {
        "on-pace":     "You\u2019re on a roll \u2014 see your full trend \u2192",
        "watch-out":   "Check where your budget is going \u2192",
        "over-budget": "See exactly where it went \u2192",
        "default":     "See full stats \u2192"
      };
      ctaText.textContent = ctaMap[pillState] || ctaMap["default"];
    }
  }

  function renderDailySpendBar() {
    var container = document.getElementById("dailyBarChart");
    if (!container || !window.StorageAPI) { return; }

    var expenses     = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var weeklyBudget = window.StorageAPI.getWeeklyBudget ? window.StorageAPI.getWeeklyBudget() : 0;
    var dailyLimit   = weeklyBudget > 0 ? weeklyBudget / 7 : 0;
    var now          = new Date();
    var wr           = getWeekRange(now);
    var DAY_LABELS   = ["M", "T", "W", "T", "F", "S", "S"];
    var dayTotals    = [0, 0, 0, 0, 0, 0, 0];
    var todayDayIdx  = (now.getDay() + 6) % 7;

    expenses.forEach(function (e) {
      var d = new Date(e.timestamp);
      if (d >= wr.start && d < wr.end) {
        var idx = (d.getDay() + 6) % 7;
        dayTotals[idx] += parseFloat(e.amount) || 0;
      }
    });

    var maxAmount = Math.max.apply(null, dayTotals);
    if (dailyLimit > 0) { maxAmount = Math.max(maxAmount, dailyLimit * 1.2); }
    if (maxAmount < 1)  { maxAmount = 1; }

    container.innerHTML = "";

    // Budget reference line
    if (dailyLimit > 0) {
      var refPct        = (dailyLimit / maxAmount) * 100;
      var containerH   = 6.5; // rem — must match CSS
      var paddingB     = 1.2; // rem — must match CSS padding-bottom
      var barAreaH     = containerH - paddingB;
      var refBottomRem = paddingB + (refPct / 100) * barAreaH;
      var refLine      = document.createElement("div");
      refLine.className = "daily-bar-ref-line";
      refLine.style.bottom = refBottomRem.toFixed(3) + "rem";
      var refLbl = document.createElement("span");
      refLbl.className = "daily-bar-ref-label";
      refLbl.textContent = "daily limit";
      refLine.appendChild(refLbl);
      container.appendChild(refLine);
    }

    dayTotals.forEach(function (amount, i) {
      var isEmpty  = amount === 0;
      var isFuture = i > todayDayIdx;
      var isToday  = i === todayDayIdx;

      var col = document.createElement("div");
      col.className = "daily-bar-col";
      col.setAttribute("data-day-idx", String(i));

      // Amount label above bar (consistent spacer even when zero)
      var amtLabel = document.createElement("span");
      if (amount > 0 && !isFuture) {
        var amtDisplay = amount >= 1000
          ? "\u20b1" + (amount / 1000).toFixed(1) + "k"
          : "\u20b1" + Math.round(amount);
        amtLabel.className = "daily-bar-amount" + (dailyLimit > 0 && amount > dailyLimit ? " daily-bar-amount--over" : "");
        amtLabel.textContent = amtDisplay;
      } else {
        amtLabel.className = "daily-bar-amount daily-bar-amount--hidden";
        amtLabel.textContent = "\u20b10";
      }
      col.appendChild(amtLabel);

      // Bar
      var heightPct = (isEmpty || isFuture) ? 4 : Math.max(6, Math.round((amount / maxAmount) * 100));
      var bar = document.createElement("div");
      var barClass = "daily-bar";
      if (isEmpty || isFuture) {
        barClass += " daily-bar--empty";
      } else if (dailyLimit > 0 && amount > dailyLimit) {
        barClass += " daily-bar--over";
      } else if (dailyLimit > 0 && amount > dailyLimit * 0.8) {
        barClass += " daily-bar--warn";
      } else {
        barClass += " daily-bar--good";
      }
      if (isToday) { barClass += " daily-bar--today"; }
      bar.className = barClass;
      bar.style.height = heightPct + "%";

      // Day label
      var dayLabel = document.createElement("span");
      dayLabel.className = "daily-bar-day" + (isToday ? " daily-bar-day--today" : "");
      dayLabel.textContent = DAY_LABELS[i];

      col.appendChild(bar);
      col.appendChild(dayLabel);

      // Tap to highlight
      col.addEventListener("click", function () {
        var wasActive = col.classList.contains("daily-bar-col--active");
        container.querySelectorAll(".daily-bar-col").forEach(function (c) {
          c.classList.remove("daily-bar-col--active");
        });
        if (!wasActive) { col.classList.add("daily-bar-col--active"); }
      });

      container.appendChild(col);
    });

    // Dismiss tap-highlight when clicking outside the chart (registered once)
    if (!container.dataset.tapListenerAdded) {
      container.dataset.tapListenerAdded = "1";
      document.addEventListener("click", function (e) {
        if (!container.contains(e.target)) {
          container.querySelectorAll(".daily-bar-col").forEach(function (c) {
            c.classList.remove("daily-bar-col--active");
          });
        }
      });
    }
  }

  function renderTopCategories() {
    var container = document.getElementById("topCatBars");
    if (!container || !window.StorageAPI) { return; }

    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var now      = new Date();
    var wr       = getWeekRange(now);
    var weekExps = expenses.filter(function (e) { var d = new Date(e.timestamp); return d >= wr.start && d < wr.end; });

    if (weekExps.length === 0) { container.innerHTML = ""; return; }

    var catTotals = {};
    weekExps.forEach(function (e) {
      var cat = e.categoryId || e.category || "Other";
      catTotals[cat] = (catTotals[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    var sorted   = Object.keys(catTotals).map(function (k) { return { cat: k, total: catTotals[k] }; });
    sorted.sort(function (a, b) { return b.total - a.total; });
    var top3     = sorted.slice(0, 3);
    var maxTotal = top3[0] ? top3[0].total : 1;

    container.innerHTML = "";
    top3.forEach(function (item) {
      var pct = Math.round((item.total / maxTotal) * 100);
      var row = document.createElement("div");
      row.className = "cat-bar-row";
      row.innerHTML =
        '<span class="cat-bar-label" title="' + escapeHtml(item.cat) + '">' + escapeHtml(item.cat) + '</span>' +
        '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="cat-bar-value">' + formatPhp(item.total) + '</span>';
      container.appendChild(row);
    });
  }

  // -- recent expenses ------------------------------------------
  function renderRecentExpenses() {
    if (!window.StorageAPI) {
      return;
    }

    var list  = document.getElementById("recentExpenseList");
    var empty = document.getElementById("emptyExpenseState");
    if (!list || !empty) {
      return;
    }

    var expenses = window.StorageAPI.getExpenses(5);
    // Optimistically hide any pending-delete item
    if (pendingDelete) {
      expenses = expenses.filter(function (e) { return e.id !== pendingDelete.id; });
    }
    var qaItems  = window.StorageAPI.getQuickAddItems();
    var categories = window.StorageAPI.getExpenseCategories ? window.StorageAPI.getExpenseCategories() : [];
    var categoryMap = {};
    categories.forEach(function (c) { categoryMap[c.id] = c; });
    list.innerHTML = "";

    if (!expenses.length) {
      empty.classList.remove("hidden");
      list.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    list.classList.remove("hidden");

    expenses.forEach(function (expense) {
      var effectiveCategoryId = expense.categoryId || expense.category;
      var catMeta = categoryMap[effectiveCategoryId] || null;
      var match  = qaItems.find(function (item) { return item.category === expense.category; });
      var chipBg = catMeta ? (catMeta.color || "#e2e8f0") : (match ? (match.color || "#e2e8f0") : "#e2e8f0");
      var displayLabel = catMeta ? catMeta.label : expense.category;
      var initials = (catMeta ? (catMeta.emoji || catMeta.label) : (expense.category || "?")).slice(0, 2).toUpperCase();

      var li = document.createElement("li");
      li.className = "expense-row";

      var chipEl = document.createElement("span");
      chipEl.className = "expense-chip";
      chipEl.style.background = chipBg;
      chipEl.textContent = initials;

      var infoEl = document.createElement("span");
      infoEl.innerHTML =
        '<span class="expense-title">' + escapeHtml(displayLabel) + "</span>" +
        '<span class="expense-meta block">' + formatRelativeTime(expense.timestamp) +
        (expense.note && expense.note !== "Quick add" ? " · " + escapeHtml(expense.note) : "") +
        "</span>";

      var amtEl = document.createElement("span");
      amtEl.className = "expense-amount";
      amtEl.textContent = "-" + formatPhp(expense.amount);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "expense-delete-btn";
      delBtn.setAttribute("aria-label", "Remove expense");
      delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      delBtn.addEventListener("click", (function (exp) {
        return function () {
          showUndoToast(exp);
        };
      }(expense)));

      li.appendChild(chipEl);
      li.appendChild(infoEl);
      li.appendChild(amtEl);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }

  // ── log one-time expense ─────────────────────────────────
  function initLogExpense() {
    var pickerEl  = document.getElementById("logCategoryPicker");
    var amtInput  = document.getElementById("logExpenseAmount");
    var noteInput = document.getElementById("logExpenseNote");
    var dateInput = document.getElementById("logExpenseDate");
    var logBtn    = document.getElementById("logExpenseBtn");
    var errEl     = document.getElementById("logExpenseError");

    if (!logBtn || !pickerEl) {
      return;
    }

    var selectedCategory = "food";

    function updateNoteLabel() {
      if (!noteInput) { return; }
      if (selectedCategory === "others") {
        noteInput.placeholder = "Description (required)";
        noteInput.setAttribute("aria-required", "true");
      } else {
        noteInput.placeholder = "Note (optional)";
        noteInput.removeAttribute("aria-required");
      }
    }

    function renderCategoryPicker() {
      if (!window.StorageAPI || !window.StorageAPI.getExpenseCategories) { return; }
      var cats = window.StorageAPI.getExpenseCategories();
      pickerEl.innerHTML = "";
      cats.forEach(function (cat) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "log-cat-chip" + (cat.id === selectedCategory ? " active" : "");
        btn.setAttribute("aria-pressed", cat.id === selectedCategory ? "true" : "false");
        btn.setAttribute("data-category", cat.id);
        btn.textContent = cat.label;
        btn.addEventListener("click", function () {
          selectedCategory = cat.id;
          renderCategoryPicker();
          updateNoteLabel();
        });
        pickerEl.appendChild(btn);
      });
    }

    renderCategoryPicker();
    updateNoteLabel();

    logBtn.addEventListener("click", function () {
      // Budget gate
      if (!window.StorageAPI.getWeeklyBudget || window.StorageAPI.getWeeklyBudget() <= 0) {
        var gate = document.getElementById("budgetGateModal");
        if (gate) {
          gate.classList.remove("hidden");
          var cancel = document.getElementById("budgetGateCancel");
          if (cancel) { cancel.focus(); }
        }
        return;
      }

      var amt  = Number(amtInput.value);
      var note = noteInput ? (noteInput.value || "").trim() : "";

      errEl.textContent = "";
      errEl.classList.add("hidden");

      if (!Number.isFinite(amt) || amt <= 0) {
        errEl.textContent = "Enter a valid amount greater than 0.";
        errEl.classList.remove("hidden");
        amtInput.focus();
        return;
      }

      if (selectedCategory === "others" && !note) {
        errEl.textContent = "A description is required for Others expenses.";
        errEl.classList.remove("hidden");
        if (noteInput) { noteInput.focus(); }
        return;
      }

      // Rate limit check
      var expRl = checkExpenseRateLimit();
      if (!expRl.allowed) {
        errEl.textContent = "Too many expenses logged. Try again in " + expRl.resetMins + " min.";
        errEl.classList.remove("hidden");
        return;
      }

      var result = window.StorageAPI.addExpense({
        amount: amt,
        category: selectedCategory,
        note: note,
        timestamp: (dateInput && dateInput.value)
          ? (function () {
              var d = new Date(dateInput.value + "T12:00:00");
              return d.toISOString();
            }())
          : undefined
      });

      if (!result.ok) {
        errEl.textContent = result.error || "Could not log expense.";
        errEl.classList.remove("hidden");
        return;
      }

      if (window.GamificationUI && result.xpAwarded > 0) {
        window.GamificationUI.showXpPopup(result.xpAwarded, logBtn);
        window.GamificationUI.maybeNotifyNewAchievements(result.newlyUnlockableAchievements || []);
      }
      amtInput.value  = "";
      if (noteInput) { noteInput.value = ""; }
      if (dateInput) { dateInput.value = ""; }
      updateBudgetCard();
      updateQuickSummaryStats();
      renderXpWidget();
      renderRecentExpenses();
      renderDashboardStats();
      if (window.SpendingChart) { window.SpendingChart.update(); }

      // brief visual confirmation on the button
      logBtn.textContent = "\u2713 Logged";
      logBtn.disabled = true;
      setTimeout(function () {
        logBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log';
        logBtn.disabled = false;
      }, 1200);
    });

    // Allow Enter key in amount/note fields to submit
    [amtInput, noteInput].forEach(function (el) {
      if (!el) { return; }
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          logBtn.click();
        }
      });
    });
  }

  // ── undo toast ───────────────────────────────────────────
  function showUndoToast(expense) {
    // If another delete is pending, commit it immediately
    if (pendingDelete) {
      commitDelete();
    }

    pendingDelete = { id: expense.id, data: expense };

    // Optimistically hide from list
    updateBudgetCard();
    renderTodayMission();
    renderBadgeTeaser();
    renderRecentExpenses();
    renderWeekAtGlance();

    if (window.SpendingChart) { window.SpendingChart.update(); }

    var toast   = document.getElementById("undoToast");
    var undoBtn = document.getElementById("undoToastBtn");

    if (toast) {
      toast.classList.remove("hidden");
    }

    pendingDeleteTimer = setTimeout(function () {
      commitDelete();
    }, UNDO_DELAY_MS);

    if (undoBtn) {
      undoBtn.onclick = function () {
        cancelDelete();
      };
    }
  }

  function commitDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    window.StorageAPI.removeExpense(pendingDelete.id);
    pendingDelete = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    updateBudgetCard();
    renderTodayMission();
    renderBadgeTeaser();
    renderRecentExpenses();
    renderWeekAtGlance();

    if (window.SpendingChart) { window.SpendingChart.update(); }
  }

  function cancelDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    pendingDelete = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    updateBudgetCard();
    renderTodayMission();
    renderBadgeTeaser();
    renderRecentExpenses();
    renderWeekAtGlance();

    if (window.SpendingChart) { window.SpendingChart.update(); }
  }

  // ── streak card ─────────────────────────────────────────
  function renderStreakCard() {
    var countEl = document.getElementById("streakCount");
    var descEl = document.getElementById("streakDescription");
    if (!countEl) {
      return;
    }

    var streakCount = 0;
    if (window.StorageAPI && typeof window.StorageAPI.getStreakData === "function") {
      streakCount = Number(window.StorageAPI.getStreakData().count || 0);
    }

    countEl.textContent = String(streakCount);
    if (descEl) {
      descEl.textContent = streakCount > 0
        ? "You've hit your save goals " + streakCount + " time" + (streakCount !== 1 ? "s" : "") + "."
        : "This will track completed save-goal milestones once enabled.";
    }
  }

  // ── category stats ───────────────────────────────────────
  var CATEGORY_STAT_COLORS = {
    "transport":     { bg: "#d8efe2", text: "#14532d", emoji: "🚌" },
    "food":          { bg: "#ffedd5", text: "#7c2d12", emoji: "🍽️" },
    "groceries":     { bg: "#d1fae5", text: "#065f46", emoji: "🛒" },
    "education":     { bg: "#f3e8ff", text: "#4c1d95", emoji: "📚" },
    "shopping":      { bg: "#fce7f3", text: "#831843", emoji: "🛍️" },
    "health":        { bg: "#fee2e2", text: "#7f1d1d", emoji: "💊" },
    "entertainment": { bg: "#fef3c7", text: "#78350f", emoji: "🎬" },
    "utilities":     { bg: "#dbeafe", text: "#1e3a5f", emoji: "⚡" },
    "personal_care": { bg: "#ede9fe", text: "#4c1d95", emoji: "🧴" },
    "others":        { bg: "#e2e8f0", text: "#1e293b", emoji: "📋" }
  };

  var STAT_FALLBACK_COLORS = [
    { bg: "#d8efe2", text: "#14532d" },
    { bg: "#ffedd5", text: "#7c2d12" },
    { bg: "#dbeafe", text: "#1e3a5f" },
    { bg: "#fee2e2", text: "#7f1d1d" },
    { bg: "#f3e8ff", text: "#4c1d95" }
  ];

  function renderCategoryStats() {
    var grid = document.getElementById("categoryStatsGrid");
    var empty = document.getElementById("categoryStatsEmpty");
    if (!grid || !empty) { return; }

    if (!window.StorageAPI) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    var user = window.StorageAPI.getCurrentUser();
    if (!user || !Array.isArray(user.expenses) || user.expenses.length === 0) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    var now = new Date();
    var dayOfWeek = now.getDay();
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    var totals = {};
    user.expenses.forEach(function (exp) {
      var d = new Date(exp.timestamp);
      if (d >= weekStart && d < weekEnd) {
        var cat = exp.category || "Other";
        totals[cat] = (totals[cat] || 0) + (Number(exp.amount) || 0);
      }
    });

    var categories = Object.keys(totals).sort(function (a, b) {
      return totals[b] - totals[a];
    });

    if (categories.length === 0) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");

    var html = "";
    var totalSpent = categories.reduce(function (s, c) { return s + totals[c]; }, 0);

    categories.forEach(function (cat, idx) {
      var amount = totals[cat];
      var pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
      var colorInfo = CATEGORY_STAT_COLORS[cat] || STAT_FALLBACK_COLORS[idx % STAT_FALLBACK_COLORS.length];
      var emoji = (CATEGORY_STAT_COLORS[cat] && CATEGORY_STAT_COLORS[cat].emoji) ? CATEGORY_STAT_COLORS[cat].emoji : "\uD83D\uDCB8";

      html +=
        '<div class="card-panel p-3" style="background:' + colorInfo.bg + '; border-radius: 1.1rem;">' +
          '<div class="flex items-center gap-2 mb-1.5">' +
            '<span style="font-size:1.2rem;">' + emoji + '</span>' +
            '<p class="text-xs font-bold" style="color:' + colorInfo.text + '; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">' + escapeHtml(cat) + '</p>' +
          '</div>' +
          '<p class="text-base font-extrabold" style="color:' + colorInfo.text + ';">' + formatPhp(amount) + '</p>' +
          '<p class="text-xs mt-0.5" style="color:' + colorInfo.text + '; opacity:0.7;">' + pct + '% of week</p>' +
        '</div>';
    });

    grid.innerHTML = html;
  }

  // ── settings page ────────────────────────────────────────
  function initSettingsPage() {
    if (!window.StorageAPI) {
      return;
    }

    var form          = document.getElementById("budgetForm");
    var budgetInput   = document.getElementById("weeklyBudget");
    var budgetError   = document.getElementById("weeklyBudgetError");
    var budgetSavedMsg = document.getElementById("budgetSavedMessage");
    var logoutButton  = document.getElementById("logoutButton");
    var resetButton   = document.getElementById("resetAppButton");
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
          budgetSavedMsg.textContent = "\u2713 Saved";
          budgetSavedMsg.className = "text-xs font-semibold text-emerald-700";
          budgetSavedMsg.classList.remove("hidden");
          setTimeout(function () { budgetSavedMsg.classList.add("hidden"); }, 3000);
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        window.StorageAPI.logout();
        window.location.replace("landing.html");
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        var confirmed = window.confirm("Clear your budget and expenses? This cannot be undone.");
        if (!confirmed) {
          return;
        }

        resetButton.disabled = true;
        resetButton.textContent = "Clearing\u2026";

        window.StorageAPI.resetCurrentUserData().then(function (result) {
          resetButton.disabled = false;
          resetButton.textContent = "Clear my data";

          if (!actionMessage) {
            return;
          }

          if (!result.ok) {
            actionMessage.textContent = result.error || "Unable to clear data.";
            actionMessage.className = "text-sm mt-3 text-red-700";
            actionMessage.classList.remove("hidden");
            return;
          }

          if (budgetInput) {
            budgetInput.value = "";
          }

          actionMessage.textContent = "\u2713 Data cleared. Reloading\u2026";
          actionMessage.className = "text-sm mt-3 font-semibold text-emerald-700";
          actionMessage.classList.remove("hidden");

          // Reload so the UI reflects empty state & firebase sync is clean
          setTimeout(function () {
            window.location.reload();
          }, 1500);
        });
      });
    }
  }

  // ── spending stats section ─────────────────────────────────
  var _dashStatsPeriod = "week";

  function getDashPeriodStart(period) {
    var now = new Date();
    if (period === "today")  { return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
    if (period === "week") {
      var diff = (now.getDay() + 6) % 7;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    }
    if (period === "month")  { return new Date(now.getFullYear(), now.getMonth(), 1); }
    return null; // "all"
  }

  function renderDashboardStats() {
    if (!window.StorageAPI) { return; }
    var allExpenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var start = getDashPeriodStart(_dashStatsPeriod);
    var filtered = start
      ? allExpenses.filter(function (e) { return new Date(e.timestamp) >= start; })
      : allExpenses;

    // stat cards
    var totalEl  = document.getElementById("statsTotal");
    var countEl  = document.getElementById("statsCount");
    var topCatEl = document.getElementById("statsTopCat");
    if (totalEl) {
      var total = filtered.reduce(function (s, e) { return s + Number(e.amount || 0); }, 0);
      totalEl.textContent = formatPhp(total);
    }
    if (countEl)  { countEl.textContent = String(filtered.length); }
    if (topCatEl) {
      var catTotals = {};
      filtered.forEach(function (e) {
        var k = e.category || "others";
        catTotals[k] = (catTotals[k] || 0) + Number(e.amount || 0);
      });
      var topCat = null, topAmt = 0;
      Object.keys(catTotals).forEach(function (k) {
        if (catTotals[k] > topAmt) { topAmt = catTotals[k]; topCat = k; }
      });
      if (topCat) {
        var cats = window.StorageAPI.getExpenseCategories ? window.StorageAPI.getExpenseCategories() : [];
        var meta = cats.filter(function (c) { return c.id === topCat; })[0];
        topCatEl.textContent = meta ? (meta.emoji + " " + meta.label) : topCat;
      } else {
        topCatEl.textContent = "\u2014";
      }
    }

    // category breakdown
    var breakdown = document.getElementById("categoryBreakdown");
    if (!breakdown) { return; }
    if (!filtered.length) {
      breakdown.innerHTML = '<p class="p-4 text-sm text-slate-400">No data for this period.</p>';
      return;
    }
    var cats = window.StorageAPI.getExpenseCategories ? window.StorageAPI.getExpenseCategories() : [];
    var catMap = {};
    cats.forEach(function (c) { catMap[c.id] = c; });
    var totalsMap = {}, order = [];
    filtered.forEach(function (e) {
      var k = e.category || "others";
      if (!totalsMap[k]) { totalsMap[k] = 0; order.push(k); }
      totalsMap[k] += Number(e.amount || 0);
    });
    order.sort(function (a, b) { return totalsMap[b] - totalsMap[a]; });
    var grand = order.reduce(function (s, k) { return s + totalsMap[k]; }, 0);
    breakdown.innerHTML = "";
    order.forEach(function (key) {
      var m   = catMap[key] || { label: key, emoji: "", color: "#e2e8f0" };
      var amt = totalsMap[key];
      var pct = grand > 0 ? Math.round((amt / grand) * 100) : 0;
      var row = document.createElement("div");
      row.className = "cat-breakdown-row";
      var chip = document.createElement("span");
      chip.className = "cat-breakdown-chip";
      chip.style.background = m.color || "#e2e8f0";
      chip.textContent = m.emoji || (m.label || "?").slice(0, 2).toUpperCase();
      var info = document.createElement("div");
      info.className = "cat-breakdown-info";
      var labelRow = document.createElement("div");
      labelRow.className = "cat-breakdown-label-row";
      var lbl = document.createElement("span");
      lbl.className = "cat-breakdown-label";
      lbl.textContent = m.label || key;
      var amtSpan = document.createElement("span");
      amtSpan.className = "cat-breakdown-amount";
      amtSpan.textContent = formatPhp(amt);
      labelRow.appendChild(lbl);
      labelRow.appendChild(amtSpan);
      var track = document.createElement("div");
      track.className = "cat-breakdown-bar-track";
      var fill = document.createElement("div");
      fill.className = "cat-breakdown-bar-fill";
      fill.style.width = pct + "%";
      fill.style.background = m.color || "var(--brand-700)";
      track.appendChild(fill);
      info.appendChild(labelRow);
      info.appendChild(track);
      row.appendChild(chip);
      row.appendChild(info);
      breakdown.appendChild(row);
    });
  }

  function wireDashboardStats() {
    var chips = document.querySelectorAll("[data-dash-period]");
    chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        _dashStatsPeriod = btn.getAttribute("data-dash-period");
        chips.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderDashboardStats();
      });
    });
  }

  // ── init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");

    if (page === "dashboard") {
      renderQuickAddButtons();
      updateBudgetCard();
      renderXpWidget();
      renderTodayMission();
      renderBadgeTeaser();
      renderRecentExpenses();
      renderWeekAtGlance();
      renderWeekChallenge();
      renderDailySpendBar();
      renderTopCategories();

      initModal();
      initDashboardAccountMenu();
      initCustomLogModal();

      // Budget-gate modal cancel
      var budgetGateCancel = document.getElementById("budgetGateCancel");
      if (budgetGateCancel) {
        budgetGateCancel.addEventListener("click", function () {
          var gate = document.getElementById("budgetGateModal");
          if (gate) { gate.classList.add("hidden"); }
        });
      }

      window.addEventListener("sugbocents:synced", function () {
        updateBudgetCard();
        renderXpWidget();
        renderTodayMission();
        renderBadgeTeaser();
        renderRecentExpenses();
        renderWeekAtGlance();
        renderWeekChallenge();
        renderDailySpendBar();
        renderTopCategories();

        renderQuickAddButtons();
        updateLogOnceXpBadge();
        if (window.SpendingChart) { window.SpendingChart.update(); }
      });

      window.addEventListener("sugbocents:dataChanged", function () {
        updateBudgetCard();
        renderXpWidget();
        renderTodayMission();
        renderBadgeTeaser();
        renderWeekAtGlance();
        renderWeekChallenge();
        renderDailySpendBar();
        renderTopCategories();

        renderRecentExpenses();
        updateLogOnceXpBadge();
        renderQuickAddButtons();
      });







    }

    if (page === "settings") {
      initSettingsPage();
    }
  });
})();
