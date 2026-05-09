(function () {

  // ── undo toast state ─────────────────────────────────────
  var pendingDelete     = null; // { id, data }
  var pendingDeleteTimer = null;
  var UNDO_DELAY_MS     = 4000;

  // ── expense log rate limiter (localStorage) ──────────────
  var EXP_RL_KEY       = "sc_exp_rl";
  var EXP_RL_MAX       = 100;              // max expense logs per window
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

  // ════════════════════════════════════════════════════════
  // BUDGET HEALTH ENGINE
  // Architecture mirrors the proposal: constants → pure math
  // functions → state evaluators → DOM appliers → orchestrator.
  // The orchestrator (updateBudgetCard) is the only function
  // that touches the DOM or calls StorageAPI.
  // ════════════════════════════════════════════════════════

  // ── 1. Threshold constants ────────────────────────────────
  var BUDGET_CONSTANTS = {
    // Mid-week deviation thresholds (actualPct - expectedPct)
    DEVIATION_HAPPY_MAX:   -15,  // <= -15 → happy
    DEVIATION_NEUTRAL_MAX:  10,  // <= +10 → neutral
    DEVIATION_WORRIED_MAX:  25,  // <= +25 → worried  (> 25 → alarmed)

    // Early-week guard (elapsed time ratio < EARLY_WEEK_THRESHOLD)
    // Deviation math is too noisy this early; use absolute pct instead
    EARLY_WEEK_THRESHOLD:   0.15, // ~day 1 (15% of 7 days ≈ 25 hours)
    EARLY_WEEK_WORRIED_MIN: 30,
    EARLY_WEEK_ALARMED_MIN: 50,

    // Late-week guard (elapsed time ratio > LATE_WEEK_THRESHOLD)
    // Time can't be recovered; switch back to absolute pct
    LATE_WEEK_THRESHOLD:    0.85, // ~day 6-7
    LATE_WEEK_WORRIED_MIN:  80,
    LATE_WEEK_ALARMED_MIN:  95
  };

  // ── 2a. Pure math — expected pace ────────────────────────
  // Returns expected spend percentage (0-100) for this exact moment
  // in the week using continuous time, not whole days.
  function getExpectedPace(weekStart, weekEnd, now) {
    var totalMs   = weekEnd - weekStart;
    var elapsedMs = now - weekStart;
    var ratio     = Math.max(0, Math.min(1, elapsedMs / totalMs));
    return ratio * 100;
  }

  // ── 2b. Pure math — budget health snapshot ───────────────
  // Single source of truth. All UI components read from this object.
  // Returns BudgetHealthSnapshot:
  //   { actualPct, expectedPct, deviation,
  //     elapsedRatio, daysLeft,
  //     isEarlyWeek, isLateWeek, isOverBudget,
  //     noBudget, summary }
  function calculateBudgetHealth(summary, now) {
    if (!summary || summary.weeklyBudget <= 0) {
      return {
        actualPct: 0, expectedPct: 0, deviation: 0,
        elapsedRatio: 0, daysLeft: 7,
        isEarlyWeek: true, isLateWeek: false, isOverBudget: false,
        noBudget: true, summary: summary
      };
    }

    var dow       = now.getDay();
    var diffToMon = (dow === 0) ? -6 : 1 - dow;
    var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
    var weekEnd   = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7, 0, 0, 0, 0);

    var totalMs      = weekEnd - weekStart;
    var elapsedMs    = now - weekStart;
    var elapsedRatio = Math.max(0, Math.min(1, elapsedMs / totalMs));
    var daysLeft     = Math.max(1, Math.min(7, Math.ceil((weekEnd - now) / (1000 * 60 * 60 * 24))));

    var actualPct   = summary.percentageSpent; // 0-100, clamped by storage.js
    var expectedPct = getExpectedPace(weekStart, weekEnd, now);
    var deviation   = actualPct - expectedPct;

    return {
      actualPct:    actualPct,
      expectedPct:  expectedPct,
      deviation:    deviation,
      elapsedRatio: elapsedRatio,
      daysLeft:     daysLeft,
      isEarlyWeek:  elapsedRatio < BUDGET_CONSTANTS.EARLY_WEEK_THRESHOLD,
      isLateWeek:   elapsedRatio > BUDGET_CONSTANTS.LATE_WEEK_THRESHOLD,
      isOverBudget: actualPct >= 100,
      noBudget:     false,
      summary:      summary
    };
  }

  // ── 3a. State evaluator — mascot ─────────────────────────
  // Pure function. Takes snapshot, returns { mood, title, message }.
  function determineMascotState(snapshot) {
    if (snapshot.noBudget) {
      return {
        mood:    "neutral",
        title:   "Set a budget",
        message: "Head to Settings to set your weekly budget. Tigom will keep watch."
      };
    }

    var mood;
    var pct = snapshot.actualPct;

    if (snapshot.isOverBudget) {
      mood = "alarmed";
    } else if (snapshot.isEarlyWeek) {
      mood = pct >= BUDGET_CONSTANTS.EARLY_WEEK_ALARMED_MIN ? "alarmed"
           : pct >= BUDGET_CONSTANTS.EARLY_WEEK_WORRIED_MIN ? "worried"
           : "happy";
    } else if (snapshot.isLateWeek) {
      mood = pct >= BUDGET_CONSTANTS.LATE_WEEK_ALARMED_MIN  ? "alarmed"
           : pct >= BUDGET_CONSTANTS.LATE_WEEK_WORRIED_MIN  ? "worried"
           : pct >= 30                                       ? "neutral"
           : "happy";
    } else {
      var dev = snapshot.deviation;
      mood = dev > BUDGET_CONSTANTS.DEVIATION_WORRIED_MAX  ? "alarmed"
           : dev > BUDGET_CONSTANTS.DEVIATION_NEUTRAL_MAX  ? "worried"
           : dev > BUDGET_CONSTANTS.DEVIATION_HAPPY_MAX    ? "neutral"
           : "happy";
    }

    var titles = {
      alarmed: "Ay nako!",
      worried: "Careful lang",
      neutral: "Nice pace",
      happy:   "Fresh week!"
    };
    var messages = {
      alarmed: "Almost at the limit. Tiny spends muna, kaya pa.",
      worried: "Budget is getting tight. Tigom says check before you tap.",
      neutral: "Steady lang. You still have room to move this week.",
      happy:   "Fresh week energy. You\u2019re giving future-you a favor."
    };

    return { mood: mood, title: titles[mood], message: messages[mood] };
  }

  // ── 3b. State evaluator — UI status level ────────────────
  // Returns "good" | "warning" | "danger".
  // Both the progress bar and the donut ring consume this so they
  // can never disagree with each other or with the mascot.
  function determineUIStatus(snapshot) {
    var mood = determineMascotState(snapshot).mood;
    if (mood === "alarmed") return "danger";
    if (mood === "worried") return "warning";
    return "good";
  }

  // ── 4a. DOM applier — progress bar ───────────────────────
  function applyProgressBarUI(status, snapshot) {
    var el = document.getElementById("budgetProgress");
    if (!el) return;
    el.style.width = snapshot.actualPct + "%";
    el.classList.remove("pct-warn", "pct-danger");
    if (status === "danger")  el.classList.add("pct-danger");
    if (status === "warning") el.classList.add("pct-warn");
  }

  // ── 4b. DOM applier — donut ring ─────────────────────────
  function applyDonutUI(status, snapshot) {
    var pctEl   = document.getElementById("budgetDonutPct");
    var ringEl  = document.querySelector(".budget-donut-ring");
    if (pctEl) pctEl.textContent = Math.round(snapshot.actualPct) + "%";
    if (!ringEl) return;
    var color = status === "danger"  ? "#b91c1c"
              : status === "warning" ? "#EAB308"
              : "#2b8259";
    var deg = Math.min(snapshot.actualPct, 100) * 3.6;
    ringEl.style.background = "conic-gradient(" + color + " " + deg + "deg, #e7e0cf 0deg)";
  }

  // ── 4c. DOM applier — mascot faces ───────────────────────
  // Accepts a MascotState object from determineMascotState().
  function applyMascotUI(mascotState) {
    var titleEl = document.getElementById("tigomSaysTitle");
    var msgEl   = document.getElementById("tigomSaysMsg");
    if (titleEl) titleEl.textContent = mascotState.title;
    if (msgEl)   msgEl.textContent   = mascotState.message;

    applyTigomFaceMood(
      document.getElementById("tigomCardMouth"),
      document.getElementById("tigomCardLeftEye"),
      document.getElementById("tigomCardRightEye"),
      mascotState.mood
    );
    applyTigomFaceMood(
      document.getElementById("heroTigomMouth"),
      document.getElementById("heroTigomLeftEye"),
      document.getElementById("heroTigomRightEye"),
      mascotState.mood
    );
  }

  // ── 5. Orchestrator ───────────────────────────────────────
  // Replaces the old updateBudgetCard monolith.
  // 1) Reads data from StorageAPI
  // 2) Calls pure math functions
  // 3) Calls state evaluators
  // 4) Passes results to dedicated DOM appliers
  // No threshold logic lives here.
  function updateBudgetCard() {
    if (!window.StorageAPI) { return; }

    var summary = window.StorageAPI.getBudgetSummary();
    // Adjust for optimistic pending-delete
    if (pendingDelete && pendingDelete.data) {
      var adj = Number(pendingDelete.data.amount) || 0;
      summary.totalSpentThisWeek = Math.max(0, summary.totalSpentThisWeek - adj);
      summary.remaining          = summary.weeklyBudget - summary.totalSpentThisWeek;
      summary.percentageSpent    = summary.weeklyBudget > 0
        ? Math.min(100, Math.round((summary.totalSpentThisWeek / summary.weeklyBudget) * 100))
        : 0;
    }

    var remainingEl  = document.getElementById("remainingAmount");
    if (!remainingEl) { return; }

    // ── Math layer ────────────────────────────────────────
    var now      = new Date();
    var snapshot = calculateBudgetHealth(summary, now);
    var status   = determineUIStatus(snapshot);
    var mascot   = determineMascotState(snapshot);

    // ── Text fields ───────────────────────────────────────
    var summaryEl    = document.getElementById("budgetSummary");
    var labelEl      = document.getElementById("progressLabel");
    var weekLabelEl  = document.getElementById("budgetWeekLabel");
    var healthLineEl = document.getElementById("budgetHealthLine");

    remainingEl.textContent = formatPhp(summary.remaining);
    if (summaryEl) summaryEl.textContent = summary.weeklyBudget > 0
      ? formatPhp(summary.totalSpentThisWeek) + " of " + formatPhp(summary.weeklyBudget) + " spent"
      : "Set your weekly budget in Settings.";
    if (labelEl) labelEl.textContent = Math.round(snapshot.actualPct) + "% used \u00b7 " +
      snapshot.daysLeft + " day" + (snapshot.daysLeft === 1 ? "" : "s") + " left";
    if (healthLineEl) healthLineEl.classList.add("hidden");

    if (weekLabelEl) {
      var dow2 = now.getDay();
      var wS   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((dow2 + 6) % 7));
      var wE   = new Date(wS.getFullYear(), wS.getMonth(), wS.getDate() + 7);
      var mon  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      weekLabelEl.textContent = mon[wS.getMonth()] + " " + wS.getDate() +
        " \u2013 " + mon[new Date(wE.getTime() - 1).getMonth()] + " " + new Date(wE.getTime() - 1).getDate();
    }

    // ── UI appliers (all share the same snapshot / status) ─
    applyProgressBarUI(status, snapshot);
    applyDonutUI(status, snapshot);
    applyMascotUI(mascot);
    renderPaceBanner(snapshot, status);
  }

  // Legacy shim — updateTigomMood was called directly in a few
  // other places (e.g. after expense log). Route them through the
  // new architecture by re-computing from fresh data.
  function updateTigomMood() {
    if (!window.StorageAPI) { return; }
    var summary  = window.StorageAPI.getBudgetSummary();
    var snapshot = calculateBudgetHealth(summary, new Date());
    var mascot   = determineMascotState(snapshot);
    applyMascotUI(mascot);
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

        // Snapshot position BEFORE addExpense, which fires sugbocents:dataChanged
        // synchronously and causes renderQuickAddButtons() to detach this element.
        var btnRect = button.getBoundingClientRect();

        var result = window.StorageAPI.addExpense({
          amount: item.amount,
          category: dlabel,
          note: dlabel,
          raw: true,
          categoryId: catId || undefined
        });

        if (!result.ok) { return; }

        if (window.GamificationUI && result.xpAwarded > 0) {
          window.GamificationUI.showXpPopup(result.xpAwarded, btnRect);
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

  // Auto-emoji + category assignment when user types a shortcut name
  var SHORTCUT_KEYWORD_MAP = {
    "coffee": { emoji: "☕",  cat: "food" },
    "cafe":   { emoji: "☕",  cat: "food" },
    "milk tea":{ emoji: "🧋", cat: "food" },
    "boba":   { emoji: "🧋",  cat: "food" },
    "food":   { emoji: "🍔",  cat: "food" },
    "lunch":  { emoji: "🍔",  cat: "food" },
    "dinner": { emoji: "🍔",  cat: "food" },
    "merienda":{ emoji: "🍜", cat: "food" },
    "snack":  { emoji: "🍜",  cat: "food" },
    "pizza":  { emoji: "🍕",  cat: "food" },
    "rice":   { emoji: "🍚",  cat: "food" },
    "breakfast":{ emoji: "🍳",cat: "food" },
    "jeepney":{ emoji: "🚌",  cat: "transport" },
    "jeep":   { emoji: "🚌",  cat: "transport" },
    "bus":    { emoji: "🚌",  cat: "transport" },
    "commute":{ emoji: "🚶",  cat: "transport" },
    "taxi":   { emoji: "🚗",  cat: "transport" },
    "grab":   { emoji: "🚗",  cat: "transport" },
    "uber":   { emoji: "🚗",  cat: "transport" },
    "tricycle":{ emoji: "🛵", cat: "transport" },
    "grocery":{ emoji: "🛍️", cat: "groceries" },
    "groceries":{ emoji: "🛍️",cat: "groceries" },
    "market": { emoji: "🛍️", cat: "groceries" },
    "medicine":{ emoji: "💊", cat: "health" },
    "meds":   { emoji: "💊",  cat: "health" },
    "clinic": { emoji: "💊",  cat: "health" },
    "gym":    { emoji: "🏋️", cat: "health" },
    "school": { emoji: "📚",  cat: "education" },
    "tuition":{ emoji: "📚",  cat: "education" },
    "books":  { emoji: "📚",  cat: "education" },
    "load":   { emoji: "📱",  cat: "utilities" },
    "data":   { emoji: "📱",  cat: "utilities" },
    "wifi":   { emoji: "💡",  cat: "utilities" },
    "electricity":{ emoji: "💡", cat: "utilities" },
    "water":  { emoji: "💧",  cat: "utilities" },
    "gas":    { emoji: "⛽",   cat: "utilities" },
    "laundry":{ emoji: "👕",  cat: "personal_care" },
    "haircut":{ emoji: "💈",  cat: "personal_care" },
    "salon":  { emoji: "💄",  cat: "personal_care" },
    "shopping":{ emoji: "🛍️",cat: "shopping" },
    "clothes":{ emoji: "👕",  cat: "shopping" },
    "movie":  { emoji: "🎬",  cat: "entertainment" },
    "games":  { emoji: "🎮",  cat: "entertainment" },
    "concert":  { emoji: "🎵",  cat: "entertainment" },

    // ── Filipino / Bisaya / Cebuano terms ─────────────────────────────────
    "ulam":      { emoji: "🍚",  cat: "food" },
    "kanin":     { emoji: "🍚",  cat: "food" },
    "kape":      { emoji: "☕",  cat: "food" },
    "meryenda":  { emoji: "🍜",  cat: "food" },
    "baon":      { emoji: "🍱",  cat: "food" },
    "lechon":    { emoji: "🍖",  cat: "food" },
    "inihaw":    { emoji: "🍖",  cat: "food" },
    "softdrinks":{ emoji: "🥤",  cat: "food" },
    "bote":      { emoji: "🍺",  cat: "food" },
    "palengke":  { emoji: "🛍️", cat: "groceries" },
    "tindahan":  { emoji: "🛍️", cat: "groceries" },
    "pasahe":    { emoji: "🚌",  cat: "transport" },
    "byahe":     { emoji: "🚌",  cat: "transport" },
    "linya":     { emoji: "🚌",  cat: "transport" },
    "carwash":   { emoji: "🚗",  cat: "transport" },
    "parking":   { emoji: "🚗",  cat: "transport" },
    "parkingo":  { emoji: "🚗",  cat: "transport" },
    "gamot":     { emoji: "💊",  cat: "health" },
    "ospital":   { emoji: "💊",  cat: "health" },
    "tubig":     { emoji: "💧",  cat: "utilities" },
    "kuryente":  { emoji: "💡",  cat: "utilities" },
    "eskwela":   { emoji: "📚",  cat: "education" },
    "libro":     { emoji: "📚",  cat: "education" },
    "sine":      { emoji: "🎬",  cat: "entertainment" },
    "sinehan":   { emoji: "🎬",  cat: "entertainment" },
    "pabili":    { emoji: "🛍️", cat: "shopping" },
    "alcohol":   { emoji: "🧴",  cat: "personal_care" }
  };

  // Preset suggestion chips shown when the name field is empty
  var SHORTCUT_QUICK_SUGGESTIONS = [
    { name: "Coffee",   emoji: "☕",  cat: "food",          amount: 75  },
    { name: "Jeepney",  emoji: "🚌",  cat: "transport",     amount: 18  },
    { name: "Lunch",    emoji: "🍔",  cat: "food",          amount: 120 },
    { name: "Load",     emoji: "📱",  cat: "utilities",     amount: 50  },
    { name: "Gym",      emoji: "🏋️", cat: "health",        amount: 150 },
    { name: "Laundry",  emoji: "👕",  cat: "personal_care", amount: 60  },
    { name: "Grab",     emoji: "🚗",  cat: "transport",     amount: 80  },
    { name: "Snack",    emoji: "🍜",  cat: "food",          amount: 45  },
    { name: "Grocery",  emoji: "🛍️", cat: "groceries",     amount: 200 },
    { name: "Movie",    emoji: "🎬",  cat: "entertainment", amount: 180 }
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
  // Tracks whether the user manually picked an emoji (prevents AI override)
  var userPickedEmoji   = false;

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

    var qaEmojiBtn    = document.getElementById("qaModalEmojiBtn");
    var qaPickerPanel = document.getElementById("qaPickerPanel");
    var chipsContainer = document.getElementById("qaModalCategoryChips");

    // ── Build emoji picker grid ──────────────────────────────────────────
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
          userPickedEmoji = true; // lock: AI won't override a manual pick
          if (qaEmojiBtn) { qaEmojiBtn.textContent = emoji; }
          if (qaPickerPanel) {
            qaPickerPanel.classList.remove("qa-picker-panel--open");
            qaPickerPanel.setAttribute("aria-hidden", "true");
            if (qaEmojiBtn) { qaEmojiBtn.setAttribute("aria-expanded", "false"); }
          }
        });
        qaModalEmojiGrid.appendChild(btn);
      });
    }

    // ── Toggle picker panel ──────────────────────────────────────────────
    if (qaEmojiBtn && qaPickerPanel) {
      qaEmojiBtn.addEventListener("click", function () {
        var isOpen = qaPickerPanel.classList.contains("qa-picker-panel--open");
        if (isOpen) {
          qaPickerPanel.classList.remove("qa-picker-panel--open");
          qaPickerPanel.setAttribute("aria-hidden", "true");
          qaEmojiBtn.setAttribute("aria-expanded", "false");
        } else {
          qaPickerPanel.classList.add("qa-picker-panel--open");
          qaPickerPanel.setAttribute("aria-hidden", "false");
          qaEmojiBtn.setAttribute("aria-expanded", "true");
        }
      });
    }

    // ── Build category chips + populate hidden select ────────────────────
    if (window.StorageAPI && window.StorageAPI.getExpenseCategories) {
      var cats = window.StorageAPI.getExpenseCategories();
      cats.forEach(function (c) {
        if (chipsContainer) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "qa-category-chip";
          chip.setAttribute("data-cat", c.id);
          chip.textContent = c.emoji + " " + c.label;
          chip.addEventListener("click", function () {
            chipsContainer.querySelectorAll(".qa-category-chip").forEach(function (ch) {
              ch.classList.remove("qa-category-chip--active");
            });
            chip.classList.add("qa-category-chip--active");
            if (qaModalCategoryId) { qaModalCategoryId.value = c.id; }
          });
          chipsContainer.appendChild(chip);
        }
        if (qaModalCategoryId) {
          var opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.label;
          qaModalCategoryId.appendChild(opt);
        }
      });
    }

    // ── Helper: apply emoji + category to all UI elements ────────────────
    function applyEmojiAndCat(emoji, catId) {
      if (qaModalEmoji) { qaModalEmoji.value = emoji; }
      if (qaEmojiBtn)   { qaEmojiBtn.textContent = emoji; }
      if (qaModalEmojiGrid) {
        qaModalEmojiGrid.querySelectorAll(".emoji-option").forEach(function (b) {
          b.classList.toggle("emoji-option--selected", b.getAttribute("data-emoji") === emoji);
        });
      }
      if (catId) {
        if (qaModalCategoryId) { qaModalCategoryId.value = catId; }
        if (chipsContainer) {
          chipsContainer.querySelectorAll(".qa-category-chip").forEach(function (ch) {
            ch.classList.toggle("qa-category-chip--active", ch.getAttribute("data-cat") === catId);
          });
        }
      }
    }

    // ── Suggestion chip builder ──────────────────────────────────────────
    function buildSugChip(sug) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "qa-suggestion-chip-sm";
      chip.textContent = sug.emoji + " " + sug.name;
      chip.addEventListener("click", function () {
        qaModalCategory.value = sug.name;
        if (qaModalAmount && !qaModalAmount.value) { qaModalAmount.value = String(sug.amount || ""); }
        applyEmojiAndCat(sug.emoji, sug.cat || "");
        var sugEl = document.getElementById("qaNameSuggestions");
        if (sugEl) { sugEl.innerHTML = ""; }
      });
      return chip;
    }

    // ── Debounced AI emoji: fires 800ms after user stops typing ─────────
    var EMOJI_SUGGEST_URL = "https://us-central1-sugbocents.cloudfunctions.net/emojiSuggest";
    var emojiDebounceTimer = null;

    function callAiEmoji(nameVal) {
      if (!nameVal || userPickedEmoji) { return; }
      if (qaEmojiBtn) {
        qaEmojiBtn.classList.add("qa-emoji-btn--loading");
        qaEmojiBtn.setAttribute("aria-busy", "true");
      }
      fetch(EMOJI_SUGGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameVal })
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        if (qaEmojiBtn) {
          qaEmojiBtn.classList.remove("qa-emoji-btn--loading");
          qaEmojiBtn.removeAttribute("aria-busy");
        }
        if (!data || !data.emoji) { return; }
        // Don't apply if user manually picked while we were waiting
        if (userPickedEmoji) { return; }
        var resolvedCat = (data.category === "other") ? "others" : (data.category || "");
        applyEmojiAndCat(data.emoji, resolvedCat);
        if (qaEmojiBtn) {
          qaEmojiBtn.classList.add("qa-emoji-btn--ai");
          setTimeout(function () { qaEmojiBtn.classList.remove("qa-emoji-btn--ai"); }, 1800);
        }
      }).catch(function () {
        if (qaEmojiBtn) {
          qaEmojiBtn.classList.remove("qa-emoji-btn--loading");
          qaEmojiBtn.removeAttribute("aria-busy");
        }
      });
    }

    if (qaModalCategory) {
      qaModalCategory.addEventListener("input", function () {
        var nameVal = (qaModalCategory.value || "").toLowerCase().trim();
        var rawVal  = (qaModalCategory.value || "").trim();

        // Changing the name unlocks AI override
        userPickedEmoji = false;

        // Suggestion chips
        var sugEl = document.getElementById("qaNameSuggestions");
        if (sugEl) {
          sugEl.innerHTML = "";
          if (nameVal.length === 0) {
            SHORTCUT_QUICK_SUGGESTIONS.forEach(function (s) { sugEl.appendChild(buildSugChip(s)); });
          } else {
            var filtered = SHORTCUT_QUICK_SUGGESTIONS.filter(function (s) {
              return s.name.toLowerCase().indexOf(nameVal) === 0;
            });
            filtered.slice(0, 6).forEach(function (s) { sugEl.appendChild(buildSugChip(s)); });
          }
        }

        // Cancel any pending AI call
        if (emojiDebounceTimer) { clearTimeout(emojiDebounceTimer); emojiDebounceTimer = null; }

        // Require at least 2 chars before calling AI
        if (rawVal.length < 2) { return; }

        // 800ms debounce — fires after user pauses typing
        emojiDebounceTimer = setTimeout(function () {
          emojiDebounceTimer = null;
          callAiEmoji(rawVal);
        }, 800);
      });

      // Also fire immediately on blur if debounce is still pending (e.g. user tabbed away)
      qaModalCategory.addEventListener("blur", function () {
        var rawVal = (qaModalCategory.value || "").trim();
        if (!rawVal || rawVal.length < 2) { return; }
        if (emojiDebounceTimer) {
          clearTimeout(emojiDebounceTimer);
          emojiDebounceTimer = null;
          callAiEmoji(rawVal);
        }
      });
    }

    // ── Close x , Save, Delete ───────────────────────────────────────────
    var closeBtn = document.getElementById("qaModalClose");
    if (closeBtn) { closeBtn.addEventListener("click", closeModal); }
    document.getElementById("qaModalSave").addEventListener("click", saveModal);
    if (qaModalDeleteBtn) {
      qaModalDeleteBtn.addEventListener("click", function () {
        var itemId = qaModalItemIdEl.value;
        if (itemId) { deleteQuickAddItem(itemId); }
      });
    }
    // Backdrop click intentionally does NOT close
  }

  function openQaModal(item) {
    // Reset manual-pick lock so AI can suggest for this new session
    userPickedEmoji = false;

    document.getElementById("qaModalTitle").textContent = item ? "Edit shortcut" : "New shortcut";
    qaModalItemIdEl.value = item ? (item.id || "") : "";
    qaModalCategory.value = item ? (item.label || item.category || "") : "";
    qaModalAmount.value   = item ? String(item.amount || "") : "";

    var predId = item ? (item.label ? item.category : (item.categoryId || "")) : "";
    if (qaModalCategoryId) { qaModalCategoryId.value = predId; }

    // Activate matching category chip
    var chipsContainer = document.getElementById("qaModalCategoryChips");
    if (chipsContainer) {
      chipsContainer.querySelectorAll(".qa-category-chip").forEach(function (ch) {
        ch.classList.toggle("qa-category-chip--active",
          ch.getAttribute("data-cat") === predId && predId !== "");
      });
    }

    // Pre-select emoji
    var storedEmoji = item ? (item.emoji || "") : "";
    if (storedEmoji === "\u2022" || storedEmoji === "\u00b7" || storedEmoji.trim() === "") {
      storedEmoji = "";
    }
    var targetEmoji = storedEmoji || EMOJI_PRESETS[0];
    if (qaModalEmoji) { qaModalEmoji.value = targetEmoji; }

    var qaEmojiBtn = document.getElementById("qaModalEmojiBtn");
    if (qaEmojiBtn) { qaEmojiBtn.textContent = targetEmoji; }

    if (qaModalEmojiGrid) {
      qaModalEmojiGrid.querySelectorAll(".emoji-option").forEach(function (btn) {
        btn.classList.toggle("emoji-option--selected",
          btn.getAttribute("data-emoji") === targetEmoji);
      });
    }

    // Collapse picker panel
    var qaPickerPanel = document.getElementById("qaPickerPanel");
    if (qaPickerPanel) {
      qaPickerPanel.classList.remove("qa-picker-panel--open");
      qaPickerPanel.setAttribute("aria-hidden", "true");
      if (qaEmojiBtn) { qaEmojiBtn.setAttribute("aria-expanded", "false"); }
    }

    qaModalCatErr.textContent = "";
    qaModalAmtErr.textContent = "";

    if (qaModalDeleteBtn) {
      qaModalDeleteBtn.style.display = item ? "inline-flex" : "none";
    }

    // Suggestion chips (new item only)
    var sugEl = document.getElementById("qaNameSuggestions");
    if (sugEl) {
      sugEl.innerHTML = "";
      if (!item) {
        SHORTCUT_QUICK_SUGGESTIONS.forEach(function (s) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "qa-suggestion-chip-sm";
          chip.textContent = s.emoji + " " + s.name;
          chip.addEventListener("click", (function (sg) {
            return function () {
              qaModalCategory.value = sg.name;
              if (qaModalAmount && !qaModalAmount.value) { qaModalAmount.value = String(sg.amount || ""); }
              if (qaModalEmoji) { qaModalEmoji.value = sg.emoji; }
              var cb = document.getElementById("qaModalEmojiBtn");
              if (cb) { cb.textContent = sg.emoji; }
              if (qaModalCategoryId) { qaModalCategoryId.value = sg.cat || ""; }
              if (qaModalEmojiGrid) {
                qaModalEmojiGrid.querySelectorAll(".emoji-option").forEach(function (b) {
                  b.classList.toggle("emoji-option--selected",
                    b.getAttribute("data-emoji") === sg.emoji);
                });
              }
              var cc = document.getElementById("qaModalCategoryChips");
              if (cc) {
                cc.querySelectorAll(".qa-category-chip").forEach(function (c) {
                  c.classList.toggle("qa-category-chip--active",
                    c.getAttribute("data-cat") === (sg.cat || ""));
                });
              }
              sugEl.innerHTML = "";
            };
          }(s)));
          sugEl.appendChild(chip);
        });
      }
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
    var modal          = document.getElementById("customLogModal");
    var amountEl       = document.getElementById("customLogAmount");
    var categoryEl     = document.getElementById("customLogCategory");
    var noteEl         = document.getElementById("customLogNote");
    var amountErrEl    = document.getElementById("customLogAmountError");
    var noteErrEl      = document.getElementById("customLogNoteError");
    var catErrEl       = document.getElementById("customLogCategoryError");
    var chipsContainer = document.getElementById("customLogCategoryChips");
    var closeBtn       = document.getElementById("customLogClose");
    var saveBtn        = document.getElementById("customLogSave");
    var triggerBtn     = document.getElementById("logOneTimeBtn");

    if (!modal || !triggerBtn) { return; }

    updateLogOnceXpBadge();

    // Reliable closure variable — avoids hidden-select value sync issues
    var selectedCatId = "";

    // ── Category chip helper ──────────────────────────────────────────────
    function setCustomLogChip(catId) {
      selectedCatId = catId || "";
      if (!chipsContainer) { return; }
      var chips = chipsContainer.querySelectorAll(".qa-category-chip");
      for (var i = 0; i < chips.length; i++) {
        if (chips[i].dataset.catId === catId) {
          chips[i].classList.add("qa-category-chip--active");
        } else {
          chips[i].classList.remove("qa-category-chip--active");
        }
      }
    }

    // ── Build category chips ──────────────────────────────────────────────
    if (chipsContainer && window.StorageAPI && window.StorageAPI.getExpenseCategories) {
      var cats = window.StorageAPI.getExpenseCategories();
      cats.forEach(function (c) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "qa-category-chip";
        chip.dataset.catId = c.id;
        chip.textContent = c.emoji + " " + c.label;
        chip.addEventListener("click", function () {
          customLogUserPickedCat = true;
          setCustomLogChip(c.id);
          if (catErrEl) { catErrEl.textContent = ""; }
        });
        chipsContainer.appendChild(chip);
      });
    }

    // ── AI category suggestion state ─────────────────────────────────────
    var customLogUserPickedCat = false;
    var customLogAiTimer       = null;
    var CUSTOM_LOG_SUGGEST_URL = "https://us-central1-sugbocents.cloudfunctions.net/emojiSuggest";

    function callCustomLogAi(noteVal) {
      if (!noteVal || customLogUserPickedCat) { return; }
      if (chipsContainer) { chipsContainer.style.opacity = "0.5"; }
      fetch(CUSTOM_LOG_SUGGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: noteVal })
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        if (chipsContainer) { chipsContainer.style.opacity = ""; }
        if (!data || !data.category) { return; }
        if (customLogUserPickedCat) { return; }
        var catId = data.category === "other" ? "others" : data.category;
        setCustomLogChip(catId);
        if (catErrEl) { catErrEl.textContent = ""; }
      }).catch(function () {
        if (chipsContainer) { chipsContainer.style.opacity = ""; }
      });
    }

    // Debounced AI trigger on note input
    if (noteEl) {
      noteEl.addEventListener("input", function () {
        var rawVal = (noteEl.value || "").trim();
        customLogUserPickedCat = false; // note changed, unlock AI
        if (customLogAiTimer) { clearTimeout(customLogAiTimer); customLogAiTimer = null; }
        if (rawVal.length < 2) { return; }
        customLogAiTimer = setTimeout(function () {
          customLogAiTimer = null;
          callCustomLogAi(rawVal);
        }, 800);
      });

      // Fire immediately on blur if debounce is still pending
      noteEl.addEventListener("blur", function () {
        var rawVal = (noteEl.value || "").trim();
        if (!rawVal || rawVal.length < 2) { return; }
        if (customLogAiTimer) {
          clearTimeout(customLogAiTimer);
          customLogAiTimer = null;
          callCustomLogAi(rawVal);
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", function () { modal.classList.add("hidden"); });
    }

    triggerBtn.addEventListener("click", function () {
      // Budget gate
      if (!window.StorageAPI.getWeeklyBudget || window.StorageAPI.getWeeklyBudget() <= 0) {
        var gate = document.getElementById("budgetGateModal");
        if (gate) { gate.classList.remove("hidden"); }
        return;
      }
      // Reset state on every open
      customLogUserPickedCat = false;
      selectedCatId = "";
      if (customLogAiTimer) { clearTimeout(customLogAiTimer); customLogAiTimer = null; }
      amountEl.value = "";
      setCustomLogChip("");
      noteEl.value = "";
      if (amountErrEl) { amountErrEl.textContent = ""; }
      if (noteErrEl)   { noteErrEl.textContent = ""; }
      if (catErrEl)    { catErrEl.textContent = ""; }
      modal.classList.remove("hidden");
      noteEl.focus();
    });

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var amt   = Number(amountEl.value);
        var catId = selectedCatId;
        var note  = (noteEl.value || "").trim().slice(0, 80);
        var valid = true;

        if (!note) {
          if (noteErrEl) { noteErrEl.textContent = "Please name this expense."; }
          valid = false;
        } else {
          if (noteErrEl) { noteErrEl.textContent = ""; }
        }

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

        // Snapshot position BEFORE addExpense fires sugbocents:dataChanged synchronously.
        var saveBtnRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

        var result = window.StorageAPI.addExpense({
          amount: amt,
          category: catMeta.label,
          categoryId: catMeta.id,
          note: note,
          raw: true
        });

        if (!result.ok) { return; }

        // Show XP popup BEFORE hiding modal so saveBtn is still in-viewport
        if (window.GamificationUI && result.xpAwarded > 0) {
          window.GamificationUI.showXpPopup(result.xpAwarded, saveBtnRect || saveBtn);
          window.GamificationUI.maybeNotifyNewAchievements(result.newlyUnlockableAchievements || []);
        }

        modal.classList.add("hidden");

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
          conditionEl.textContent = "Reach a " + target.target + "-day streak: " + gap + " more day" + (gap !== 1 ? "s" : "") + " to go";
        } else if (target.type === "budget_week") {
          conditionEl.textContent = "Finish a week under budget to unlock";
        } else if (target.type === "budget_frugal") {
          conditionEl.textContent = "Spend \u226450% of your budget this week";
        } else if (target.type === "level") {
          conditionEl.textContent = "Reach Level " + target.target + ", " + gap + " level" + (gap !== 1 ? "s" : "") + " away";
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
        "streak-badge--orange", "streak-badge--orange-glow", "streak-badge--crimson",
        "streak-badge--at-risk"
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

      // At-risk overlay: streak exists but user hasn't logged today and it's after 17:00
      if (streak > 0) {
        var nowHourStreak = new Date().getHours();
        var todayKeyStreak = (function () {
          var d = new Date();
          return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
        }());
        var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
        var loggedTodayStreak = expenses.some(function (e) {
          if (!e.timestamp) { return false; }
          var ed = new Date(e.timestamp);
          var dk = ed.getFullYear() + "-" + String(ed.getMonth() + 1).padStart(2, "0") + "-" + String(ed.getDate()).padStart(2, "0");
          return dk === todayKeyStreak;
        });
        if (window.__DEV_FORCE_AT_RISK || (!loggedTodayStreak && nowHourStreak >= 17)) {
          greetingStreakEl.classList.add("streak-badge--at-risk");
          greetingStreakEl.setAttribute("aria-label", "Streak at risk! Log an expense before midnight to keep your " + streak + "-day streak.");
        }
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
        desc: "Log before noon for the Early Bird badge. Still time!",
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
        desc: "You\u2019ve been away. Log today and start fresh.",
        btn: "Get Back On Track",
        showBtn: true,
        scrollTo: "quickAddGrid",
        navigate: null
      },
      "in-progress": {
        icon: "\u26A1",
        desc: "Logged today and on track. Great work!",
        btn: "Log Anyway",
        showBtn: true,
        scrollTo: "quickAddGrid",
        navigate: null
      },
      // Reference: Monzo/Revolut links to spending breakdown, NOT the budget card already on screen
      "pace-warning": {
        icon: "\u26A0\uFE0F",
        desc: "You\u2019re close to your limit. " + remainingPhp + " left this week.",
        btn: "Review spending",
        showBtn: true,
        scrollTo: null,
        navigate: "activity.html"
      },
      // Reference: Duolingo streak-break screen = acknowledge setback + forward path, warm not punishing
      "over-budget": {
        icon: "\uD83D\uDD04",
        desc: "You\u2019ve gone over budget this week. That\u2019s okay. Logging helps you understand why.",
        btn: "See where it went",
        showBtn: true,
        scrollTo: null,
        navigate: "activity.html"
      },
      "perfect": {
        icon: "\u2705",
        desc: "Mission complete! You\u2019re winning today.",
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

    // Credit daily mission when user has logged today
    if (loggedToday && window.StorageAPI && window.StorageAPI.creditDailyMission) {
      window.StorageAPI.creditDailyMission();
    }

    // Sprint 3: inject week map and quest row into the mission card
    renderWeekMap(card);
    renderQuestRow(card);
  }

  // ── Week Map (Sprint 3 Phase 1) ───────────────────────────

  function getLocalDateKeyDash(input) {
    var d = input ? new Date(input) : new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function renderWeekMap(container) {
    // Remove previous map if re-rendering
    var existing = container.querySelector(".week-map");
    if (existing) { existing.remove(); }

    if (!window.StorageAPI) { return; }
    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];

    var now = new Date();
    var dayOfWeek = now.getDay(); // 0=Sun
    var todayIdx = (dayOfWeek + 6) % 7; // 0=Mon

    // Monday of this week
    var monday = new Date(now);
    monday.setDate(now.getDate() - todayIdx);
    monday.setHours(0, 0, 0, 0);

    var nowHour = now.getHours();

    // Build logged-day set for this week
    var loggedSet = {};
    expenses.forEach(function (e) {
      if (!e.timestamp) { return; }
      var dk = getLocalDateKeyDash(e.timestamp);
      loggedSet[dk] = true;
    });

    var dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    var nodesHtml = "";
    var labelsHtml = "";
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + i);
      var dk = getLocalDateKeyDash(d);
      var logged = !!loggedSet[dk];
      var isToday = (i === todayIdx);
      var isPast = (i < todayIdx);
      var isFuture = (i > todayIdx);
      var isDay7 = (i === 6);

      var nodeClass;
      var nodeExtra = "";

      if (isDay7 && !isFuture) {
        // Check if all 7 days are logged
        var allLogged = true;
        for (var j = 0; j < 7; j++) {
          var dd = new Date(monday);
          dd.setDate(monday.getDate() + j);
          if (!loggedSet[getLocalDateKeyDash(dd)]) { allLogged = false; break; }
        }
        nodeClass = allLogged ? "week-node week-node--reward-lit" : "week-node week-node--reward";
      } else if (isPast && logged) {
        nodeClass = "week-node week-node--completed";
      } else if (isPast && !logged) {
        nodeClass = "week-node week-node--future";
      } else if (isToday && logged) {
        nodeClass = "week-node week-node--active-logged";
      } else if (isToday && !logged && nowHour >= 17) {
        nodeClass = "week-node week-node--at-risk";
      } else if (isToday && !logged) {
        nodeClass = "week-node week-node--active-empty";
      } else {
        nodeClass = "week-node week-node--future";
      }

      nodesHtml += "<div class=\"" + nodeClass + "\" aria-label=\"" + dayLabels[i] + "\"></div>";
      labelsHtml += "<span>" + dayLabels[i] + "</span>";
    }

    // Week log count caption
    var weekLoggedCount = 0;
    for (var n = 0; n < 7; n++) {
      var dn = new Date(monday);
      dn.setDate(monday.getDate() + n);
      if (loggedSet[getLocalDateKeyDash(dn)]) { weekLoggedCount++; }
    }
    var captionText = weekLoggedCount + " of 7 days logged this week";

    var mapEl = document.createElement("div");
    mapEl.className = "week-map";
    mapEl.innerHTML =
      "<div class=\"week-map__line\"></div>" +
      "<div class=\"week-map__nodes\">" + nodesHtml + "</div>" +
      "<div class=\"week-map__labels\">" + labelsHtml + "</div>" +
      "<p class=\"week-map__caption\">" + captionText + "</p>";

    container.appendChild(mapEl);
  }

  // ── Quest Row (Sprint 3 Phase 1) ──────────────────────────

  function openQuestDetailSheet(quest) {
    var sheetId = "questDetailSheet";
    if (!document.getElementById(sheetId)) {
      var sheet = document.createElement("div");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Quest details");
      sheet.innerHTML =
        "<div class=\"sheet-handle\"></div>" +
        "<div class=\"sheet-header\"><h2 class=\"sheet-title\" id=\"questSheetTitle\"></h2>" +
        "<button type=\"button\" class=\"sheet-close-btn\" aria-label=\"Close\">&times;</button></div>" +
        "<div id=\"questSheetBody\" class=\"sheet-body\"></div>";
      document.body.appendChild(sheet);
      sheet.querySelector(".sheet-close-btn").addEventListener("click", function () {
        if (window.AppShell) { window.AppShell.closeAllSheets(); }
      });
    }

    var titleEl = document.getElementById("questSheetTitle");
    var bodyEl = document.getElementById("questSheetBody");
    if (titleEl) { titleEl.textContent = (quest.icon || "\u26A1") + " " + quest.title; }

    if (bodyEl && quest) {
      var now = new Date();
      var daysLeft = Math.ceil((new Date(quest.expiresAt) - now) / 86400000);
      var condLabels = {
        "log_days": "Log expenses on",
        "log_count": "Log",
        "under_budget_days": "Stay under budget on",
        "no_overspend_days": "No overspending for",
        "log_days_before_noon": "Log before noon on",
        "log_days_after_9pm": "Log after 9 PM on",
        "frugal_week": "Spend \u226450% of weekly budget"
      };
      var condUnits = {
        "log_days": "days",
        "log_count": "expenses",
        "under_budget_days": "days",
        "no_overspend_days": "days",
        "log_days_before_noon": "days",
        "log_days_after_9pm": "days",
        "frugal_week": ""
      };

      var condsHtml = "<ul class=\"quest-sheet-cond-list\">";
      quest.conditions.forEach(function (c) {
        var pct = Math.min(100, Math.round((c.progress / c.target) * 100));
        var done = c.progress >= c.target;
        var label = (condLabels[c.type] || c.type) + " " + (c.target > 1 ? c.target + " " + (condUnits[c.type] || "") : "");
        condsHtml +=
          "<li class=\"quest-sheet-cond\">" +
          "<div class=\"quest-sheet-cond-label\"><span>" + label.trim() + "</span><span class=\"quest-sheet-cond-count\">" + c.progress + " / " + c.target + "</span></div>" +
          "<div class=\"quest-sheet-bar-track\"><div class=\"quest-sheet-bar-fill" + (done ? " quest-sheet-bar-fill--done" : "") + "\" style=\"width:" + pct + "%\"></div></div>" +
          "</li>";
      });
      condsHtml += "</ul>";

      bodyEl.innerHTML =
        condsHtml +
        "<div class=\"quest-sheet-reward\">" +
          "<span>\u26A1 +" + quest.xpReward + " XP</span>" +
          "<span>\u00B7</span>" +
          "<span>\u20B5" + quest.sentimosReward + " Sentimos (Phase 4)</span>" +
        "</div>" +
        "<p style=\"font-size:0.72rem;color:#94a3b8;margin-top:0.65rem;\">" + (daysLeft > 0 ? daysLeft + " day" + (daysLeft !== 1 ? "s" : "") + " left" : "Expires today") + " \u00B7 Resets Monday</p>";
    }

    if (window.AppShell) { window.AppShell.openSheet(sheetId); }
  }

  function renderQuestRow(container) {
    var existing = container.querySelector(".quest-divider, .quest-row, .quest-row--locked, .quest-section-header");
    while (existing) { existing.remove(); existing = container.querySelector(".quest-divider, .quest-row, .quest-row--locked, .quest-section-header"); }

    if (!window.StorageAPI || !window.StorageAPI.getCurrentQuest) { return; }
    var quest = window.StorageAPI.getCurrentQuest();

    // Icon class map by primary condition type
    var iconClassMap = {
      "log_days":             "quest-icon-circle--bolt",
      "log_count":            "quest-icon-circle--box",
      "under_budget_days":    "quest-icon-circle--target",
      "no_overspend_days":    "quest-icon-circle--shield",
      "log_days_before_noon": "quest-icon-circle--clock",
      "log_days_after_9pm":   "quest-icon-circle--clock",
      "frugal_week":          "quest-icon-circle--target"
    };

    if (!quest) {
      var hdrEl = document.createElement("div");
      hdrEl.className = "quest-section-header";
      hdrEl.innerHTML = "<span class=\"quest-section-header__title\">THIS WEEK'S QUEST</span>";
      container.appendChild(hdrEl);
      var lockEl = document.createElement("div");
      lockEl.className = "quest-row--locked";
      lockEl.innerHTML = "<span aria-hidden=\"true\">\uD83D\uDD12</span><p>New quest unlocks Monday</p>";
      container.appendChild(lockEl);
      return;
    }

    // Section header with countdown timer
    var now = new Date();
    var daysLeft = Math.max(0, Math.ceil((new Date(quest.expiresAt) - now) / 86400000));
    var isDone = quest.completedAt !== null;
    var timerText = isDone ? "Complete! \u2713" : ("\u23F1 " + daysLeft + " day" + (daysLeft !== 1 ? "s" : "") + " left");

    var sectionHdr = document.createElement("div");
    sectionHdr.className = "quest-section-header";
    sectionHdr.innerHTML =
      "<span class=\"quest-section-header__title\">THIS WEEK'S QUEST</span>" +
      "<span class=\"quest-section-header__timer\">" + timerText + "</span>";
    container.appendChild(sectionHdr);

    // Primary condition for display
    var primaryCond = quest.conditions[0];
    var pct = isDone ? 100 : Math.min(100, Math.round((primaryCond.progress / primaryCond.target) * 100));
    var primaryType = primaryCond ? primaryCond.type : "log_days";
    var iconClass = iconClassMap[primaryType] || "quest-icon-circle--bolt";

    var rowEl = document.createElement("div");
    rowEl.className = "quest-row";

    rowEl.innerHTML =
      "<div class=\"quest-row__header\">" +
        "<div class=\"quest-row__title-group\">" +
          "<div class=\"quest-icon-circle " + iconClass + "\" aria-hidden=\"true\">" + (quest.icon || "\u26A1") + "</div>" +
          "<span class=\"quest-row__title\">" + quest.title + "</span>" +
        "</div>" +
        "<span class=\"quest-card__reward" + (isDone ? " quest-card__reward--done" : "") + "\">\u20B5" + quest.sentimosReward + "</span>" +
      "</div>" +
      "<div class=\"quest-bar-wrap\" role=\"button\" tabindex=\"0\" aria-label=\"View quest details\">" +
        "<div class=\"quest-bar-fill" + (isDone ? " quest-bar-fill--done" : "") + "\" style=\"width:" + pct + "%\"></div>" +
        "<span class=\"quest-bar-label" + (isDone ? " quest-bar-label--done" : "") + "\">" + primaryCond.progress + " / " + primaryCond.target + "</span>" +
      "</div>";

    if (!isDone) {
      var nextEl = document.createElement("div");
      nextEl.className = "quest-row--locked";
      nextEl.innerHTML = "<span aria-hidden=\"true\">\uD83D\uDD12</span><p>Next quest unlocks Monday after completion</p>";
      rowEl.appendChild(nextEl);
    }

    container.appendChild(rowEl);

    // Tap to open detail sheet
    var barEl = rowEl.querySelector(".quest-bar-wrap");
    if (barEl) {
      barEl.addEventListener("click", function () { openQuestDetailSheet(quest); });
      barEl.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { openQuestDetailSheet(quest); } });
    }
  }

  // ── Quest Progress Toast ──────────────────────────────────

  var _questToastTimer = null;

  function showQuestToast(quest) {
    if (!quest) { return; }
    var toast = document.getElementById("questProgressToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "questProgressToast";
      toast.className = "quest-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    var primaryCond = quest.conditions[0];
    var progressText = primaryCond ? (primaryCond.progress + " / " + primaryCond.target) : "";
    toast.innerHTML = "<span class=\"quest-toast__icon\">⚡</span>" +
      "<strong>" + quest.title + "</strong>&nbsp;&mdash;&nbsp;" + progressText;
    toast.classList.add("is-visible");
    if (_questToastTimer) { clearTimeout(_questToastTimer); }
    _questToastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3000);
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
      var displayLabel = catMeta ? catMeta.label : (expense.category || "Expense");
      var icon = (catMeta && catMeta.emoji) ? catMeta.emoji
               : (match && match.emoji) ? match.emoji
               : "\uD83D\uDCB8";

      // Build note · time sub-label (note first, then relative time)
      var subParts = [];
      if (expense.note && expense.note !== "Quick add") { subParts.push(escapeHtml(expense.note)); }
      subParts.push(formatRelativeTime(expense.timestamp));
      var subText = subParts.join(" \u00B7 ");

      var li = document.createElement("li");
      li.className = "expense-row";

      var chipEl = document.createElement("div");
      chipEl.className = "expense-chip";
      chipEl.setAttribute("aria-hidden", "true");
      chipEl.textContent = icon;

      var infoEl = document.createElement("div");
      infoEl.className = "expense-info";
      infoEl.innerHTML =
        '<span class="expense-title">' + escapeHtml(displayLabel) + "</span>" +
        '<span class="expense-meta">' + subText + "</span>";

      var amtEl = document.createElement("span");
      amtEl.className = "expense-amount";
      amtEl.textContent = formatPhp(expense.amount);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "expense-delete-btn";
      delBtn.setAttribute("aria-label", "Remove " + escapeHtml(displayLabel) + " expense");
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

      // Snapshot position BEFORE addExpense fires sugbocents:dataChanged synchronously.
      var logBtnRect = logBtn ? logBtn.getBoundingClientRect() : null;

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
        window.GamificationUI.showXpPopup(result.xpAwarded, logBtnRect || logBtn);
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

  // ── Pace banner DOM applier ───────────────────────────────
  // Accepts a BudgetHealthSnapshot + UIStatusLevel.
  // Banner states map 1-to-1 with mascot mood — one snapshot drives both.
  function renderPaceBanner(snapshot, status) {
    var banner = document.getElementById("paceBanner");
    if (!banner) { return; }
    if (!snapshot || snapshot.noBudget) {
      banner.style.display = "none";
      return;
    }

    var summary  = snapshot.summary;
    var user     = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    var firstName = (user && user.firstName) ? user.firstName : "";
    var nameTag  = firstName ? ", " + firstName : "";

    var daysLeft = snapshot.daysLeft;
    var daysWord = daysLeft === 1 ? "day" : "days";
    var avgDailyTarget = summary.weeklyBudget / 7;
    var spentDays = Math.max(1, Math.round(snapshot.elapsedRatio * 7) || 1);
    var avgDailyActual = summary.totalSpentThisWeek / spentDays;
    var diff = Math.abs(Math.round(avgDailyActual - avgDailyTarget));

    // Derive mood from status so banner always matches the mascot
    var mood = status === "danger" ? "alarmed"
             : status === "warning" ? "worried"
             : snapshot.deviation !== null && snapshot.deviation <= BUDGET_CONSTANTS.DEVIATION_HAPPY_MAX ? "happy"
             : "neutral";

    var title, msg, bannerClass, statText;

    if (mood === "alarmed") {
      if (snapshot.isOverBudget) {
        var over = Math.round(summary.totalSpentThisWeek - summary.weeklyBudget);
        title = "Over budget this week";
        bannerClass = "pace-banner--over";
        statText = formatPhp(over) + " over limit";
        msg = "You\u2019ve spent " + formatPhp(summary.totalSpentThisWeek) + " against a " +
          formatPhp(summary.weeklyBudget) + " budget" + nameTag +
          ". Try holding off on non-essentials for the rest of the week. Your streak is still safe as long as you keep logging.";
      } else {
        title = "Budget at risk";
        bannerClass = "pace-banner--over";
        statText = formatPhp(diff) + " above daily target";
        msg = "At your current pace" + nameTag + ", you\u2019re on track to exceed your " +
          formatPhp(summary.weeklyBudget) + " budget before the week ends. " +
          formatPhp(summary.remaining) + " left with " + daysLeft + " " + daysWord + " to go.";
      }
    } else if (mood === "worried") {
      title = "Spending above pace";
      bannerClass = "pace-banner--warn";
      statText = formatPhp(diff) + " above daily target";
      msg = "Your daily average is " + formatPhp(Math.round(avgDailyActual)) + " against a target of " +
        formatPhp(Math.round(avgDailyTarget)) + nameTag +
        ". With " + formatPhp(summary.remaining) + " left and " + daysLeft + " " + daysWord +
        " to go, slowing down a little now keeps the rest of your week comfortable.";
    } else if (mood === "neutral") {
      title = "Right on pace";
      bannerClass = "pace-banner--on-track";
      statText = daysLeft + " " + daysWord + " left";
      msg = "You\u2019ve spent " + formatPhp(summary.totalSpentThisWeek) + " of " +
        formatPhp(summary.weeklyBudget) + " with " + daysLeft + " " + daysWord + " remaining" + nameTag +
        ". You\u2019re right where you should be. Keep logging and this week stays clean.";
    } else {
      title = "Ahead of pace";
      bannerClass = "pace-banner--ahead";
      statText = formatPhp(diff) + " under daily target";
      msg = "Your daily average of " + formatPhp(Math.round(avgDailyActual)) + " is below your " +
        formatPhp(Math.round(avgDailyTarget)) + " target" + nameTag +
        ". You have " + formatPhp(summary.remaining) + " left with " + daysLeft + " " + daysWord +
        " to go. Future-you is grateful.";
    }

    banner.className = "pace-banner " + bannerClass;
    banner.style.display = "";
    banner.innerHTML =
      "<div class=\"pace-banner__body\">" +
        "<div class=\"pace-banner__head\">" +
          "<p class=\"pace-banner__title\">" + title + "</p>" +
          "<span class=\"pace-banner__stat\">" + statText + "</span>" +
        "</div>" +
        "<p class=\"pace-banner__msg\">" + msg + "</p>" +
      "</div>";
  }

  // ── Hero greeting ────────────────────────────────────────
  function updateHeroGreeting() {
    var el = document.getElementById("heroGreeting");
    if (!el) return;
    var user = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    var firstName = (user && user.firstName) ? user.firstName : (user && user.email ? user.email.split("@")[0] : "there");
    var hour = new Date().getHours();
    var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    el.textContent = greeting + ", " + firstName;
  }

  // ── Week map ──────────────────────────────────────────────
  function renderWeekMap() {
    var grid = document.getElementById("weekMapGrid");
    var msg = document.getElementById("weekMapMsg");
    if (!grid) return;

    // Get start of current week (Monday)
    var now = new Date();
    var dayOfWeek = now.getDay(); // 0=Sun
    var diffToMon = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);

    var user = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    var expenses = (user && user.expenses) ? user.expenses : [];

    // Build a set of logged date strings "YYYY-MM-DD"
    var loggedDates = {};
    expenses.forEach(function (e) {
      if (e.timestamp) {
        var d = new Date(e.timestamp);
        var key = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
        loggedDates[key] = true;
      }
    });

    var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var html = "";
    var loggedCount = 0;
    var todayStr = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();

    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      var dStr = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
      var isToday = (dStr === todayStr);
      var logged = !!loggedDates[dStr];
      var isPast = d < now && !isToday;
      if (logged) loggedCount++;

      var dotClass, label;
      if (logged && isToday) {
        dotClass = "week-map-dot week-map-dot--today";
        label = "\u2713";
      } else if (logged && isPast) {
        dotClass = "week-map-dot week-map-dot--done";
        label = "\u2713";
      } else if (isToday) {
        dotClass = "week-map-dot week-map-dot--today";
        label = "!";
      } else if (isPast) {
        dotClass = "week-map-dot week-map-dot--future";
        label = "\u2715";
      } else {
        dotClass = "week-map-dot week-map-dot--future";
        label = days[i][0];
      }

      html += "<div class=\"week-map-node\">" +
        "<div class=\"" + dotClass + "\" aria-label=\"" + days[i] + (logged ? " - logged" : isToday ? " - today" : "") + "\">" + label + "</div>" +
        "<span class=\"week-map-label\">" + days[i] + "</span>" +
        "</div>";
    }
    grid.innerHTML = html;

    if (msg) {
      if (loggedCount === 7) {
        msg.textContent = "\uD83C\uDF89 Perfect week! You logged every day.";
      } else if (loggedCount === 0) {
        msg.textContent = "Log your first expense today to start your streak path.";
      } else {
        msg.textContent = loggedCount + " of 7 days logged this week. Keep going!";
      }
    }
  }

  // ── Active quest ──────────────────────────────────────────
  function renderActiveQuest() {
    var titleEl = document.getElementById("activeQuestTitle");
    var descEl = document.getElementById("activeQuestDesc");
    var rewardEl = document.getElementById("activeQuestReward");
    var barEl = document.getElementById("activeQuestBar");
    var barLabelEl = document.getElementById("activeQuestBarLabel");
    if (!titleEl) return;

    // Primary: read the tracked quest from StorageAPI.getCurrentQuest()
    var activeQuest = null;
    try {
      if (window.StorageAPI && window.StorageAPI.getCurrentQuest) {
        activeQuest = window.StorageAPI.getCurrentQuest();
      }
    } catch (e) {}

    // Fallback: legacy getActiveQuests / getQuests
    if (!activeQuest) {
      try {
        var quests = [];
        if (window.StorageAPI && window.StorageAPI.getActiveQuests) {
          quests = window.StorageAPI.getActiveQuests() || [];
        } else if (window.StorageAPI && window.StorageAPI.getQuests) {
          quests = (window.StorageAPI.getQuests() || []).filter(function (q) { return !q.completed; });
        }
        activeQuest = quests.length > 0 ? quests[0] : null;
      } catch (e) {}
    }

    if (activeQuest) {
      if (titleEl) titleEl.textContent = (activeQuest.icon ? activeQuest.icon + " " : "") + (activeQuest.title || "Active Quest");
      if (descEl) descEl.textContent = activeQuest.description || "";
      var reward = activeQuest.xpReward || activeQuest.reward || 50;
      if (rewardEl) rewardEl.textContent = "\u26A1 +" + reward + " XP";
      // Use live computed progress from first condition
      var primaryCond = (activeQuest.conditions && activeQuest.conditions[0]) ? activeQuest.conditions[0] : null;
      var current = primaryCond ? (primaryCond.progress || 0) : (activeQuest.current || activeQuest.progress || 0);
      var target  = primaryCond ? (primaryCond.target || 1) : (activeQuest.target || activeQuest.goal || 7);
      var unit    = primaryCond ? (primaryCond.type === "log_count" ? "expenses" : primaryCond.type === "log_days" || primaryCond.type === "under_budget_days" || primaryCond.type === "no_overspend_days" ? "days" : "") : (activeQuest.unit || "days");
      var pct = Math.min(Math.round((current / target) * 100), 100);
      if (barEl) { barEl.style.width = pct + "%"; barEl.style.background = pct >= 100 ? "#2b8259" : "#EAB308"; }
      if (barLabelEl) barLabelEl.textContent = current + " / " + target + (unit ? " " + unit : "");
    } else {
      // No tracked quest — show streak goal as fallback
      var streak = 0;
      try {
        if (window.StorageAPI && window.StorageAPI.getCurrentStreak) {
          streak = window.StorageAPI.getCurrentStreak() || 0;
        }
      } catch (e) {}
      if (titleEl) titleEl.textContent = "7-Day Streak";
      if (descEl) descEl.textContent = "Log an expense every day this week.";
      if (rewardEl) rewardEl.textContent = "\u26A1 +100 XP";
      var s = Math.min(streak, 7);
      var spct = Math.round((s / 7) * 100);
      if (barEl) { barEl.style.width = spct + "%"; barEl.style.background = "#EAB308"; }
      if (barLabelEl) barLabelEl.textContent = s + " / 7 days";
    }
  }

  // ── Tigom mood ───────────────────────────────────────────
  // Applies a mood shape to a single Tigom face (mouth + eyes).
  // Mirrors the TigomFace component in the redesign reference exactly.
  function applyTigomFaceMood(mouthEl, leftEyeEl, rightEyeEl, mood) {
    // Eye size: alarmed = h-3 w-3 (0.75rem), others = h-2.5 w-2.5 (0.625rem)
    var eyeSize = mood === "alarmed" ? "0.75rem" : "0.625rem";
    if (leftEyeEl) { leftEyeEl.style.height = eyeSize; leftEyeEl.style.width = eyeSize; leftEyeEl.style.background = "#102b1d"; }
    if (rightEyeEl) { rightEyeEl.style.height = eyeSize; rightEyeEl.style.width = eyeSize; rightEyeEl.style.background = "#102b1d"; }

    if (!mouthEl) return;
    // Always reset all border/bg/dimension properties before applying state
    mouthEl.style.borderTop = "none";
    mouthEl.style.borderBottom = "none";
    mouthEl.style.borderLeft = "none";
    mouthEl.style.borderRight = "none";
    mouthEl.style.background = "transparent";
    mouthEl.style.borderRadius = "";
    mouthEl.style.height = "1rem";
    mouthEl.style.width = "2rem";
    mouthEl.style.bottom = "26%";
    mouthEl.style.transform = "translateX(-50%)";

    if (mood === "happy") {
      // Smile: rounded-b-full border-bottom — bottom[26%]
      mouthEl.style.borderBottom = "4px solid #102b1d";
      mouthEl.style.borderRadius = "0 0 9999px 9999px";
      mouthEl.style.bottom = "26%";
    } else if (mood === "neutral") {
      // Flat line: solid fill, h-1 — bottom[27%]
      mouthEl.style.background = "#102b1d";
      mouthEl.style.height = "0.25rem";
      mouthEl.style.borderRadius = "9999px";
      mouthEl.style.bottom = "27%";
    } else if (mood === "worried") {
      // Frown: rounded-t-full border-top — bottom[22%]
      mouthEl.style.borderTop = "4px solid #102b1d";
      mouthEl.style.borderRadius = "9999px 9999px 0 0";
      mouthEl.style.bottom = "22%";
    } else if (mood === "alarmed") {
      // Open mouth: solid circle h-4 w-4 — bottom[22%]
      mouthEl.style.background = "#102b1d";
      mouthEl.style.height = "1rem";
      mouthEl.style.width = "1rem";
      mouthEl.style.borderRadius = "9999px";
      mouthEl.style.bottom = "22%";
    }
  }

  // updateTigomMood is now a no-arg shim for backward-compat.
  // The real logic is in applyMascotUI (called by updateBudgetCard).
  // Any legacy call sites will re-derive from fresh StorageAPI data.
  function updateTigomMood() {
    if (!window.StorageAPI) { return; }
    var summary  = window.StorageAPI.getBudgetSummary();
    var snapshot = calculateBudgetHealth(summary, new Date());
    var mascot   = determineMascotState(snapshot);
    applyMascotUI(mascot);
  }

  // ── Sidebar user info ────────────────────────────────────
  function updateSidebarUser() {
    var nameEl = document.getElementById("sidebarName");
    var avatarEl = document.getElementById("sidebarAvatar");
    if (!nameEl && !avatarEl) return;
    var user = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    if (!user) return;
    var firstName = user.firstName || "";
    var lastName = user.lastName || "";
    var fullName = (firstName + " " + lastName).trim() || user.email || "User";
    if (nameEl) nameEl.textContent = fullName;
    if (avatarEl) {
      var initials = (firstName ? firstName[0] : "") + (lastName ? lastName[0] : "");
      if (!initials && user.email) initials = user.email[0].toUpperCase();
      avatarEl.textContent = initials.toUpperCase() || "U";
    }
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
      updateHeroGreeting();
      renderWeekMap();
      renderActiveQuest();
      updateSidebarUser();

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
        renderWeekMap();
        renderActiveQuest();
        updateHeroGreeting();
        updateSidebarUser();

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
        renderWeekMap();
        renderActiveQuest();
        updateHeroGreeting();

        renderRecentExpenses();
        updateLogOnceXpBadge();
        renderQuickAddButtons();
      });

      // Quest progress toast — fires after each expense that ticks quest progress
      window.addEventListener("sugbocents:questProgressTick", function (e) {
        showQuestToast(e.detail);
      });







    }

    if (page === "settings") {
      initSettingsPage();
    }
  });
})();
