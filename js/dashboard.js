(function () {

  // ── undo toast state ─────────────────────────────────────
  var pendingDelete     = null; // { id, data }
  var pendingDeleteTimer = null;
  var UNDO_DELAY_MS     = 4000;

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

  function maybePromptNotifications() {
    if (!window.StorageAPI || !window.StorageAPI.getCurrentUser || !window.StorageAPI.getCurrentUser()) { return; }
    if (!window.NotificationService || !("Notification" in window)) { return; }
    if (Notification.permission !== "default") { return; }
    if (!window.StorageAPI.getSession || !window.StorageAPI.getPreferences || !window.StorageAPI.savePreferences) { return; }

    var session = window.StorageAPI.getSession();
    if (!session || !session.createdAt) { return; }

    var prefs = window.StorageAPI.getPreferences() || {};
    if (prefs.notifPromptedSessionId === session.createdAt) { return; }

    window.NotificationService.requestPermission();
    window.StorageAPI.savePreferences({ notifPromptedSessionId: session.createdAt });
  }

  // ── AI tip card ─────────────────────────────────────────
  var currentTip = null;
  var tipRefreshTimer = null;
  var tipIsLoading = false;
  var TIP_CACHE_MS = 6 * 60 * 60 * 1000;

  var aiTipWhyModal = null;
  var aiTipWhySummary = null;
  var aiTipWhySignals = null;
  var aiTipWhyClose = null;
  var aiTipWhyBtn = null;

  function getWeekWindow(now) {
    var day = now.getDay();
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((day + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);
    return { start: weekStart, end: weekEnd };
  }

  function buildRecommendationStats() {
    if (!window.StorageAPI) {
      return null;
    }

    var summary = window.StorageAPI.getBudgetSummary();
    var expenses = window.StorageAPI.getExpenses();
    var now = new Date();
    var weekWindow = getWeekWindow(now);

    var weekExpenses = expenses.filter(function (expense) {
      var d = new Date(expense.timestamp);
      return d >= weekWindow.start && d < weekWindow.end;
    });

    var categories = window.StorageAPI.getExpenseCategories
      ? window.StorageAPI.getExpenseCategories()
      : [];
    var categoryMap = {};
    categories.forEach(function (cat) {
      categoryMap[cat.id] = cat.label;
    });

    var totals = {};
    weekExpenses.forEach(function (expense) {
      var catId = expense.category || "others";
      totals[catId] = (totals[catId] || 0) + (Number(expense.amount) || 0);
    });

    var topCategoryId = "";
    var topCategoryAmount = 0;
    Object.keys(totals).forEach(function (catId) {
      if (totals[catId] > topCategoryAmount) {
        topCategoryAmount = totals[catId];
        topCategoryId = catId;
      }
    });

    var dayMs = 24 * 60 * 60 * 1000;
    var dayIndex = Math.floor((now - weekWindow.start) / dayMs);
    if (!Number.isFinite(dayIndex) || dayIndex < 0) {
      dayIndex = 0;
    }
    if (dayIndex > 6) {
      dayIndex = 6;
    }

    var daysInWeek = dayIndex + 1;
    var daysRemaining = 7 - daysInWeek;
    var expectedDaily = summary.weeklyBudget > 0 ? summary.weeklyBudget / 7 : 0;
    var avgDaily = daysInWeek > 0 ? summary.totalSpentThisWeek / daysInWeek : 0;

    var dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    weekExpenses.forEach(function (expense) {
      var d = new Date(expense.timestamp);
      var idx = Math.floor((d - weekWindow.start) / dayMs);
      if (idx >= 0 && idx < 7) {
        dailyTotals[idx] += Number(expense.amount) || 0;
      }
    });

    function sumRange(startIdx, endIdx) {
      var sum = 0;
      for (var i = startIdx; i <= endIdx; i++) {
        sum += dailyTotals[i] || 0;
      }
      return sum;
    }

    var last3Start = Math.max(0, dayIndex - 2);
    var last3Total = sumRange(last3Start, dayIndex);
    var prevEnd = last3Start - 1;
    var prevStart = Math.max(0, prevEnd - 2);
    var prev3Total = prevEnd >= 0 ? sumRange(prevStart, prevEnd) : 0;

    var trend = "steady";
    if (prev3Total === 0 && last3Total > 0) {
      trend = "up";
    } else if (prev3Total > 0) {
      var ratio = last3Total / prev3Total;
      if (ratio >= 1.15) {
        trend = "up";
      } else if (ratio <= 0.85) {
        trend = "down";
      }
    }

    var topCategoryLabel = topCategoryId
      ? (categoryMap[topCategoryId] || topCategoryId)
      : "";
    var topCategoryShare = summary.totalSpentThisWeek > 0
      ? topCategoryAmount / summary.totalSpentThisWeek
      : 0;

    return {
      weeklyBudget: summary.weeklyBudget || 0,
      totalSpentThisWeek: summary.totalSpentThisWeek || 0,
      remaining: summary.remaining || 0,
      percentageSpent: summary.percentageSpent || 0,
      avgDaily: avgDaily,
      expectedDaily: expectedDaily,
      daysInWeek: daysInWeek,
      daysRemaining: daysRemaining,
      topCategoryId: topCategoryId,
      topCategoryLabel: topCategoryLabel,
      topCategoryAmount: topCategoryAmount,
      topCategoryShare: topCategoryShare,
      trend: trend
    };
  }

  function buildTipSignals(stats) {
    if (!stats) {
      return [];
    }

    var signals = [];

    if (stats.weeklyBudget > 0) {
      signals.push("Weekly budget: " + formatPhp(stats.weeklyBudget));
    }
    signals.push("Spent this week: " + formatPhp(stats.totalSpentThisWeek));

    if (stats.topCategoryLabel) {
      signals.push("Top category: " + stats.topCategoryLabel + " (" + formatPhp(stats.topCategoryAmount) + ")");
    }
    if (stats.avgDaily > 0) {
      signals.push("Average daily spending: " + formatPhp(stats.avgDaily));
    }
    if (signals.length < 4) {
      signals.push("Days left this week: " + stats.daysRemaining);
    }

    return signals.slice(0, 4);
  }

  function buildWhyFromStats(stats, mode) {
    if (!stats) {
      return {
        summary: "We do not have enough data yet to personalize this tip.",
        signals: []
      };
    }

    var summary = "This tip uses your weekly budget and recent spending to keep your pace on track.";

    switch (mode) {
      case "budget_missing":
        summary = "Weekly budget is not set yet, so this tip focuses on creating a baseline.";
        break;
      case "no_spend":
        summary = "Your weekly budget is " + formatPhp(stats.weeklyBudget) +
          " and spending this week is " + formatPhp(stats.totalSpentThisWeek) + ".";
        break;
      case "over_budget":
        summary = "You have spent " + formatPhp(stats.totalSpentThisWeek) +
          " against a " + formatPhp(stats.weeklyBudget) +
          " budget, with " + (stats.topCategoryLabel || "your top category") + " leading.";
        break;
      case "early_high":
        summary = "You have used " + stats.percentageSpent + "% of " +
          formatPhp(stats.weeklyBudget) + " with " + stats.daysRemaining + " days left.";
        break;
      case "top_category":
        summary = (stats.topCategoryLabel || "Your top category") + " is " +
          formatPhp(stats.topCategoryAmount) + " of " +
          formatPhp(stats.totalSpentThisWeek) + " this week.";
        break;
      case "avg_high":
        summary = "Daily average is " + formatPhp(stats.avgDaily) +
          " versus a target of " + formatPhp(stats.expectedDaily) + ".";
        break;
      case "trend_up":
        summary = "Spending in the last few days is higher than earlier this week.";
        break;
      default:
        summary = "You have " + formatPhp(stats.remaining) + " left with " +
          stats.daysRemaining + " days to go.";
        break;
    }

    return {
      summary: summary,
      signals: buildTipSignals(stats)
    };
  }

  function buildFallbackTip(stats) {
    var mode = "steady";
    var title = "Keep a small buffer";
    var body = "Set aside a small buffer for surprises and use the rest for planned needs.";

    if (!stats) {
      mode = "no_data";
      title = "Start with a simple plan";
      body = "Set a weekly budget and log a few expenses to unlock more personalized tips.";
    } else if (stats.weeklyBudget <= 0) {
      mode = "budget_missing";
      title = "Set a weekly budget";
      body = "Add a weekly budget so we can track your pace and keep spending in check.";
    } else if (stats.totalSpentThisWeek <= 0) {
      mode = "no_spend";
      title = "Start with a daily cap";
      body = "Try a daily cap of " + formatPhp(stats.expectedDaily) + " to stay on track once spending begins.";
    } else if (stats.remaining < 0) {
      mode = "over_budget";
      title = stats.topCategoryLabel
        ? "Pause on " + stats.topCategoryLabel
        : "Pause on your top category";
      body = "You are over budget this week. Cut back on " +
        (stats.topCategoryLabel || "your top category") +
        " for the rest of the week.";
    } else if (stats.percentageSpent >= 80 && stats.daysInWeek <= 4) {
      mode = "early_high";
      title = "Slow down early";
      body = "You have used " + stats.percentageSpent +
        "% of your weekly budget with " + stats.daysRemaining +
        " days left. Aim for " + formatPhp(stats.expectedDaily) + " per day.";
    } else if (stats.topCategoryShare >= 0.45 && stats.topCategoryLabel) {
      mode = "top_category";
      title = "Cap " + stats.topCategoryLabel;
      body = "That category is " + Math.round(stats.topCategoryShare * 100) +
        "% of your week. Set a small cap there to free up room for essentials.";
    } else if (stats.avgDaily > stats.expectedDaily * 1.1) {
      mode = "avg_high";
      title = "Lower the daily pace";
      body = "Your daily average is " + formatPhp(stats.avgDaily) +
        ". Aim for " + formatPhp(stats.expectedDaily) + " to stay within budget.";
    } else if (stats.trend === "up") {
      mode = "trend_up";
      title = "Plan one low-cost day";
      body = "Recent spending is higher than earlier this week. A low-cost day can reset your pace.";
    } else {
      mode = "steady";
      var buffer = Math.max(0, stats.remaining * 0.2);
      title = "Keep a small buffer";
      body = "Set aside " + formatPhp(buffer) + " as a buffer and use the rest for planned needs.";
    }

    return {
      id: "tip_" + Date.now(),
      createdAt: new Date().toISOString(),
      source: "fallback",
      title: title,
      body: body,
      why: buildWhyFromStats(stats, mode)
    };
  }

  function normalizeTip(tip, stats, sourceDefault) {
    var data = tip && typeof tip === "object" ? tip : {};
    var title = String(data.title || "").trim();
    var body = String(data.body || "").trim();
    var createdAt = data.createdAt || new Date().toISOString();
    var source = data.source || sourceDefault || "ai";
    var id = data.id || "tip_" + Date.now();

    if (!title) {
      title = "Weekly spending check-in";
    }
    if (!body) {
      body = "Review your budget and plan a small buffer for the week.";
    }

    var why = data.why && typeof data.why === "object"
      ? data.why
      : buildWhyFromStats(stats, "steady");
    if (!why.summary) {
      why.summary = buildWhyFromStats(stats, "steady").summary;
    }
    if (!Array.isArray(why.signals)) {
      why.signals = buildWhyFromStats(stats, "steady").signals;
    }

    return {
      id: id,
      createdAt: createdAt,
      source: source,
      title: title,
      body: body,
      why: {
        summary: why.summary,
        signals: why.signals
      }
    };
  }

  function setTipLoadingState() {
    var titleEl = document.getElementById("aiTipTitle");
    var bodyEl = document.getElementById("aiTipBody");
    var sourceEl = document.getElementById("aiTipSource");

    if (titleEl) {
      titleEl.textContent = "Loading tip...";
    }
    if (bodyEl) {
      bodyEl.textContent = "Checking your latest spending pattern.";
    }
    if (sourceEl) {
      sourceEl.textContent = "Checking";
      sourceEl.classList.remove("is-ai", "is-fallback");
    }
    if (aiTipWhyBtn) {
      aiTipWhyBtn.disabled = true;
    }
  }

  function renderTipCard(tip) {
    var titleEl = document.getElementById("aiTipTitle");
    var bodyEl = document.getElementById("aiTipBody");
    var sourceEl = document.getElementById("aiTipSource");

    if (titleEl) {
      titleEl.textContent = tip && tip.title ? tip.title : "No tip available";
    }
    if (bodyEl) {
      bodyEl.textContent = tip && tip.body ? tip.body : "Add a budget and log expenses to unlock tips.";
    }
    if (sourceEl) {
      var isAi = tip && tip.source === "ai";
      sourceEl.textContent = isAi ? "AI-generated" : "Fallback";
      sourceEl.classList.remove("is-ai", "is-fallback");
      sourceEl.classList.add(isAi ? "is-ai" : "is-fallback");
    }
    if (aiTipWhyBtn) {
      aiTipWhyBtn.disabled = !(tip && tip.why);
    }
  }

  function openWhyModal(tip) {
    if (!aiTipWhyModal || !aiTipWhySummary || !aiTipWhySignals) {
      return;
    }
    if (!tip || !tip.why) {
      return;
    }

    aiTipWhySummary.textContent = tip.why.summary || "";
    aiTipWhySignals.innerHTML = "";
    (tip.why.signals || []).forEach(function (signal) {
      var li = document.createElement("li");
      li.textContent = signal;
      aiTipWhySignals.appendChild(li);
    });

    aiTipWhyModal.classList.remove("hidden");
    if (aiTipWhyClose) {
      aiTipWhyClose.focus();
    }
  }

  function closeWhyModal() {
    if (!aiTipWhyModal) {
      return;
    }
    aiTipWhyModal.classList.add("hidden");
  }

  function isTipFresh(tip) {
    if (!tip || !tip.createdAt) {
      return false;
    }
    var created = new Date(tip.createdAt).getTime();
    if (!Number.isFinite(created)) {
      return false;
    }
    return Date.now() - created < TIP_CACHE_MS;
  }

  function fetchAiTip(stats) {
    if (!stats) {
      return Promise.reject(new Error("No stats available."));
    }
    if (window.location.protocol === "file:") {
      return Promise.reject(new Error("File mode."));
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return Promise.reject(new Error("Offline."));
    }

    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, 6000);

    return fetch("/api/ai/recommendation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ stats: stats }),
      signal: controller.signal
    }).then(function (response) {
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error("AI request failed.");
      }
      return response.json();
    }).then(function (data) {
      var tip = data && (data.tip || data);
      if (!tip || typeof tip !== "object") {
        throw new Error("Invalid AI tip payload.");
      }
      return tip;
    }).catch(function (error) {
      clearTimeout(timeoutId);
      throw error;
    });
  }

  function loadTip(options) {
    if (!window.StorageAPI) {
      renderTipCard(null);
      return Promise.resolve(null);
    }

    var opts = options || {};
    var cached = window.StorageAPI.getLastRecommendationTip
      ? window.StorageAPI.getLastRecommendationTip()
      : null;

    if (!opts.forceRefresh && cached && isTipFresh(cached)) {
      currentTip = cached;
      renderTipCard(currentTip);
      return Promise.resolve(currentTip);
    }

    if (tipIsLoading) {
      return Promise.resolve(currentTip);
    }

    tipIsLoading = true;
    setTipLoadingState();

    var stats = buildRecommendationStats();

    function finalizeTip(tip) {
      currentTip = tip;
      renderTipCard(currentTip);
      if (window.StorageAPI.saveLastRecommendationTip) {
        window.StorageAPI.saveLastRecommendationTip(currentTip);
      }
      tipIsLoading = false;
      return currentTip;
    }

    return fetchAiTip(stats).then(function (aiTip) {
      var normalized = normalizeTip(aiTip, stats, "ai");
      return finalizeTip(normalized);
    }).catch(function () {
      var fallback = buildFallbackTip(stats);
      return finalizeTip(fallback);
    });
  }

  function scheduleTipRefresh() {
    if (tipRefreshTimer) {
      clearTimeout(tipRefreshTimer);
    }
    tipRefreshTimer = setTimeout(function () {
      loadTip({ forceRefresh: true });
    }, 200);
  }

  function initAiTip() {
    aiTipWhyModal = document.getElementById("aiTipWhyModal");
    aiTipWhySummary = document.getElementById("aiTipWhySummary");
    aiTipWhySignals = document.getElementById("aiTipWhySignals");
    aiTipWhyClose = document.getElementById("aiTipWhyClose");
    aiTipWhyBtn = document.getElementById("aiTipWhyBtn");

    if (aiTipWhyBtn) {
      aiTipWhyBtn.addEventListener("click", function () {
        openWhyModal(currentTip);
      });
    }

    if (aiTipWhyClose) {
      aiTipWhyClose.addEventListener("click", closeWhyModal);
    }

    if (aiTipWhyModal) {
      aiTipWhyModal.addEventListener("click", function (event) {
        if (event.target === aiTipWhyModal) {
          closeWhyModal();
        }
      });
    }

    loadTip();
  }

  // ── greeting ─────────────────────────────────────────────
  function renderGreeting() {
    var titleEl = document.getElementById("greetingTitle");
    var dateEl  = document.getElementById("greetingDate");
    if (!titleEl || !dateEl) {
      return;
    }

    var user = window.StorageAPI ? window.StorageAPI.getCurrentUser() : null;
    var name = user && user.firstName ? user.firstName : null;

    titleEl.textContent = name ? "Welcome back, " + name + "!" : "Welcome back.";

    var now = new Date();
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    dateEl.textContent = days[now.getDay()] + ", " + months[now.getMonth()] + " " + now.getDate();
  }
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

    window.SugboCentsBudgetPreview = summary;
    var remainingEl   = document.getElementById("remainingAmount");
    var summaryEl     = document.getElementById("budgetSummary");
    var progressEl    = document.getElementById("budgetProgress");
    var labelEl       = document.getElementById("progressLabel");
    var weekLabelEl   = document.getElementById("budgetWeekLabel");

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
    labelEl.textContent = pct + "% spent";

    // colour-adaptive bar
    progressEl.classList.remove("pct-warn", "pct-danger");
    if (pct >= 80) {
      progressEl.classList.add("pct-danger");
    } else if (pct >= 60) {
      progressEl.classList.add("pct-warn");
    }

    // week range label
    if (weekLabelEl) {
      var now = new Date();
      var day = now.getDay();
      var startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((day + 6) % 7));
      var endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      weekLabelEl.textContent = months[startOfWeek.getMonth()] + " " + startOfWeek.getDate() + " \u2013 " +
        months[endOfWeek.getMonth()] + " " + endOfWeek.getDate();
    }

    if (window.MascotWidget && window.MascotWidget.update) {
      window.MascotWidget.update();
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
  function renderQuickAddButtons() {
    var grid = document.getElementById("quickAddGrid");
    if (!grid || !window.StorageAPI) {
      return;
    }

    var items = window.StorageAPI.getQuickAddItems();
    grid.innerHTML = "";

    if (items.length === 0) {
      var SUGGESTIONS = [
        { label: "Jeepney",  amount: 18,  color: "#d8efe2" },
        { label: "Food",     amount: 120, color: "#ffedd5" },
        { label: "Load",     amount: 50,  color: "#dbeafe" },
        { label: "Laundry",  amount: 60,  color: "#fee2e2" },
        { label: "School",   amount: 80,  color: "#f3e8ff" },
        { label: "Coffee",   amount: 75,  color: "#fef9c3" }
      ];

      var emptyWrap = document.createElement("div");
      emptyWrap.className = "col-span-2";
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
      wrap.className = "quick-add-wrap";

      var button = document.createElement("button");
      button.type = "button";
      button.className = "quick-add";
      button.style.background = item.color || "#e2e8f0";
      button.setAttribute("data-qa-id", item.id || "");
      var displayLabel = item.label || item.category;
      var abbrev = escapeHtml((displayLabel || "?").slice(0, 2).toUpperCase());
      button.innerHTML =
        '<span class="qa-initial">' + abbrev + "</span>" +
        "<span>" +
        '<span class="block text-sm font-bold">' + escapeHtml(displayLabel) + "</span>" +
        '<span class="block text-xs text-slate-500 mt-0.5">' + formatPhp(item.amount) + "</span>" +
        "</span>";

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

        var result = window.StorageAPI.addExpense({
          amount: item.amount,
          category: dlabel,
          note: dlabel,
          raw: true,
          categoryId: catId || undefined
        });

        if (!result.ok) {
          return;
        }

        maybePromptNotifications();

        if (window.GamificationUI && result.xpAwarded > 0) {
          window.GamificationUI.showXpPopup(result.xpAwarded, button);
          window.GamificationUI.maybeNotifyNewAchievements(result.newlyUnlockableAchievements || []);
        }
        updateBudgetCard();
        updateQuickSummaryStats();
        renderXpWidget();
        renderRecentExpenses();
        renderDashboardStats();
        if (window.SpendingChart) { window.SpendingChart.update(); }
        scheduleTipRefresh();

        // brief visual feedback: pulse the button
        button.classList.add("qa-pulse");
        setTimeout(function () { button.classList.remove("qa-pulse"); }, 500);
      });

      // options (⋯) button — always visible on touch, hover on pointer devices
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
  var qaModal           = null;
  var qaModalItemIdEl   = null;
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
    qaModalCategory   = document.getElementById("qaModalCategory");
    qaModalCategoryId = document.getElementById("qaModalCategoryId");
    qaModalAmount     = document.getElementById("qaModalAmount");
    qaModalCatErr     = document.getElementById("qaModalCategoryError");
    qaModalAmtErr     = document.getElementById("qaModalAmountError");
    qaModalDeleteBtn  = document.getElementById("qaModalDelete");

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
          return { id: i.id, category: cat, categoryId: catId || undefined, emoji: "\u2022", amount: amt, color: i.color || COLORS[0] };
        }
        return i;
      });
    } else {
      var newId = "qa_custom_" + Date.now();
      var color = COLORS[items.length % COLORS.length];
      items.push({ id: newId, category: cat, categoryId: catId || undefined, emoji: "\u2022", amount: amt, color: color });
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

  function renderXpWidget() {
    if (!window.StorageAPI) { return; }
    var xpLevelEl = document.getElementById("xpLevel");
    var xpStreakEl = document.getElementById("xpStreakChip");
    var xpBarEl = document.getElementById("xpBar");
    var xpValueEl = document.getElementById("xpValue");
    var barTrack = document.querySelector(".xp-bar-track");
    if (!xpLevelEl || !xpStreakEl || !xpBarEl || !xpValueEl) { return; }
    var xpInfo = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { xp: 0, level: 1, levelName: "Rookie Saver", progressPct: 0 };
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    xpLevelEl.textContent = "Lv. " + xpInfo.level + " - " + xpInfo.levelName;
    xpValueEl.textContent = xpInfo.xp + " XP";
    xpBarEl.style.width = xpInfo.progressPct + "%";
    if (barTrack) { barTrack.setAttribute("aria-valuenow", String(xpInfo.progressPct)); }
    xpStreakEl.classList.remove("streak-chip--cold", "streak-chip--warm", "streak-chip--hot", "streak-chip--week");
    if (streak <= 0) {
      xpStreakEl.classList.add("streak-chip--cold");
      xpStreakEl.textContent = "🔥 No streak yet";
    } else if (streak < 3) {
      xpStreakEl.classList.add("streak-chip--warm");
      xpStreakEl.textContent = "🔥 " + streak + "-day streak";
    } else if (streak < 7) {
      xpStreakEl.classList.add("streak-chip--hot");
      xpStreakEl.textContent = "🔥 " + streak + "-day streak";
    } else {
      xpStreakEl.classList.add("streak-chip--week");
      xpStreakEl.textContent = "🔥 " + streak + "-day streak";
    }
  }

  // ── recent expenses ──────────────────────────────────────
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

      maybePromptNotifications();

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
      scheduleTipRefresh();

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

    pendingDelete = { id: expense.id, data: expense, removed: false };

    try {
      window.StorageAPI.removeExpense(expense.id);
      pendingDelete.removed = true;
    } catch (e) {
      // Keep the toast visible even if the optimistic delete fails.
    }

    // Optimistically hide from list
    updateBudgetCard();
    updateQuickSummaryStats();
    renderRecentExpenses();
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
    if (!pendingDelete.removed) {
      window.StorageAPI.removeExpense(pendingDelete.id);
    }
    pendingDelete = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    updateBudgetCard();
    updateQuickSummaryStats();
    renderRecentExpenses();
    if (window.SpendingChart) { window.SpendingChart.update(); }
    scheduleTipRefresh();
  }

  function cancelDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);

    if (pendingDelete.removed && pendingDelete.data) {
      window.StorageAPI.restoreExpense(pendingDelete.data);
    }

    pendingDelete = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    updateBudgetCard();
    updateQuickSummaryStats();
    renderRecentExpenses();
    if (window.SpendingChart) { window.SpendingChart.update(); }
    scheduleTipRefresh();
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
      renderGreeting();
      renderQuickAddButtons();
      updateBudgetCard();
      updateQuickSummaryStats();
      renderXpWidget();
      renderRecentExpenses();
      renderCategoryStats();
      wireDashboardStats();
      renderDashboardStats();
      initModal();
      initDashboardAccountMenu();
      initLogExpense();

      // Budget-gate modal cancel
      var budgetGateCancel = document.getElementById("budgetGateCancel");
      if (budgetGateCancel) {
        budgetGateCancel.addEventListener("click", function () {
          var gate = document.getElementById("budgetGateModal");
          if (gate) { gate.classList.add("hidden"); }
        });
      }
      initAiTip();

      window.addEventListener("sugbocents:synced", function () {
        renderGreeting();
        updateBudgetCard();
        updateQuickSummaryStats();
        renderXpWidget();
        renderRecentExpenses();
        renderQuickAddButtons();
        renderCategoryStats();
        renderDashboardStats();
        loadTip({ forceRefresh: true });
        if (window.SpendingChart) { window.SpendingChart.update(); }
      });

      var addNewBtn = document.getElementById("addNewQaBtn");
      if (addNewBtn) {
        addNewBtn.addEventListener("click", function () {
          openQaModal(null);
        });
      }
    }

    if (page === "settings") {
      initSettingsPage();
    }
  });
})();
