(function () {
  if (document.body.dataset.page !== "activity") { return; }

  // ── undo toast state ──────────────────────────────────────
  var pendingDelete      = null;
  var pendingDeleteTimer = null;
  var UNDO_DELAY_MS      = 4000;

  // ── filter state ──────────────────────────────────────────
  var activePeriod   = "all";
  var activeCategory = "all";
  var searchQuery    = "";
  var allExpenses    = [];
  var expandedGroupKeys = {};
  var DAY_COLLAPSE_LIMIT = 5;

  // ── category lookup ───────────────────────────────────────
  var categoryMap = {};

  function buildCategoryMap() {
    if (!window.StorageAPI || !window.StorageAPI.getExpenseCategories) { return; }
    var cats = window.StorageAPI.getExpenseCategories();
    cats.forEach(function (c) { categoryMap[c.id] = c; });
  }

  function getCategoryMeta(id) {
    return categoryMap[id] || { id: id, label: id, emoji: "", color: "#e2e8f0" };
  }

  // ── period boundary helpers ───────────────────────────────
  function getPeriodBounds(period) {
    var now = new Date();
    if (period === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    if (period === "week") {
      var day  = now.getDay();
      var diff = (day + 6) % 7;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    }
    if (period === "month") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return null;
  }

  // ── filter pipeline ───────────────────────────────────────
  function applyFilters(expenses) {
    var result = expenses;

    // 1. Period
    if (activePeriod !== "all") {
      var periodStart = getPeriodBounds(activePeriod);
      if (periodStart) {
        result = result.filter(function (e) {
          return new Date(e.timestamp) >= periodStart;
        });
      }
    }

    // 2. Category
    if (activeCategory !== "all") {
      result = result.filter(function (e) {
        return e.category === activeCategory;
      });
    }

    // 3. Search (note + category label, case-insensitive)
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function (e) {
        var meta   = getCategoryMeta(e.category);
        var inNote = String(e.note || "").toLowerCase().indexOf(q) !== -1;
        var inCat  = meta.label.toLowerCase().indexOf(q) !== -1;
        return inNote || inCat;
      });
    }

    // 4. Sort (always newest first)
    result = result.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return result;
  }

  // ── helpers ───────────────────────────────────────────────
  function formatPhp(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDateLabel(isoString) {
    var date      = new Date(isoString);
    var today     = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    function key(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }

    if (key(date) === key(today))     { return "Today"; }
    if (key(date) === key(yesterday)) { return "Yesterday"; }

    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[date.getMonth()] + " " + date.getDate();
  }

  function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }

  // ── group expenses by date label ──────────────────────────
  function getDateKey(isoString) {
    var d = new Date(isoString);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function groupByDate(expenses) {
    var groups   = [];
    var keyMap = {};
    expenses.forEach(function (expense) {
      var dayKey = getDateKey(expense.timestamp);
      var label = formatDateLabel(expense.timestamp);
      if (!keyMap[dayKey]) {
        keyMap[dayKey] = [];
        groups.push({ key: dayKey, label: label, items: keyMap[dayKey] });
      }
      keyMap[dayKey].push(expense);
    });
    return groups;
  }

  function applyCatChipStyle(btn, isActive) {
    btn.style.background = isActive ? "#164f33" : "#f4f0e5";
    btn.style.color      = isActive ? "white"   : "#526257";
    btn.style.borderRadius = "9999px";
    btn.style.padding    = "0.375rem 0.75rem";
    btn.style.fontSize   = "0.75rem";
    btn.style.fontWeight = "800";
    btn.style.border     = "none";
    btn.style.cursor     = "pointer";
    btn.style.transition = "background 0.15s";
  }

  // ── render category filter chips ──────────────────────────
  function renderCategoryChips(periodOnly) {
    var bar = document.getElementById("categoryFilter");
    if (!bar) { return; }

    var present = {};
    periodOnly.forEach(function (e) { present[e.category] = true; });

    var cats = window.StorageAPI ? window.StorageAPI.getExpenseCategories() : [];

    bar.innerHTML = "";

    var allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.textContent = "All";
    applyCatChipStyle(allBtn, activeCategory === "all");
    allBtn.addEventListener("click", function () {
      activeCategory = "all";
      resetExpandedGroups();
      renderAll();
    });
    bar.appendChild(allBtn);

    cats.forEach(function (cat) {
      if (!present[cat.id]) { return; }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cat.label;
      applyCatChipStyle(btn, cat.id === activeCategory);
      btn.addEventListener("click", function () {
        activeCategory = cat.id;
        resetExpandedGroups();
        renderAll();
      });
      bar.appendChild(btn);
    });

    // Chips for quick-add shortcut labels (non-predefined category values)
    var seenRaw = {};
    periodOnly.forEach(function (e) {
      if (e.category && !categoryMap[e.category] && !seenRaw[e.category]) {
        seenRaw[e.category] = true;
      }
    });
    Object.keys(seenRaw).forEach(function (label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      applyCatChipStyle(btn, label === activeCategory);
      btn.addEventListener("click", function () {
        activeCategory = label;
        resetExpandedGroups();
        renderAll();
      });
      bar.appendChild(btn);
    });
  }

  // ── build a single expense row ────────────────────────────
  function buildExpenseRow(expense) {
    var meta   = getCategoryMeta(expense.category);
    var chipBg = meta.color || "#f4f0e5";

    var SYSTEM_NOTES = { "Quick add": true, "One-time": true };
    var noteText = (expense.note && !SYSTEM_NOTES[expense.note])
      ? " \u00B7 " + escapeHtml(expense.note)
      : "";

    var row = document.createElement("div");
    row.className = "flex items-center gap-3 py-3.5";

    var iconEl = document.createElement("div");
    iconEl.className = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl";
    iconEl.style.background = chipBg;
    iconEl.textContent = meta.emoji || (meta.label || "?").charAt(0).toUpperCase();

    var infoEl = document.createElement("div");
    infoEl.className = "min-w-0 flex-1";
    infoEl.innerHTML =
      '<p class="text-sm font-extrabold" style="color:#102b1d">' + escapeHtml(meta.label || expense.category) + '</p>' +
      '<p class="text-xs font-semibold" style="color:#6c756e">' + escapeHtml(formatTime(expense.timestamp)) + noteText + '</p>';

    var amtEl = document.createElement("span");
    amtEl.className = "shrink-0 font-display text-base font-black";
    amtEl.style.color = "#102b1d";
    amtEl.textContent = "\u2212" + formatPhp(expense.amount);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition";
    delBtn.style.color = "#b0b8b0";
    delBtn.setAttribute("aria-label", "Remove expense");
    delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener("click", (function (exp) {
      return function () { showUndoToast(exp); };
    }(expense)));

    row.appendChild(iconEl);
    row.appendChild(infoEl);
    row.appendChild(amtEl);
    row.appendChild(delBtn);
    return row;
  }

  // ── render expense list ───────────────────────────────────
  function renderList(filtered) {
    var listEl  = document.getElementById("activityList");
    var emptyEl = document.getElementById("emptyActivity");
    var countEl = document.getElementById("activityCount");
    if (!listEl || !emptyEl) { return; }

    var visible = pendingDelete
      ? filtered.filter(function (e) { return e.id !== pendingDelete.id; })
      : filtered;

    if (countEl) {
      countEl.textContent = visible.length
        ? "Showing " + visible.length + " expense" + (visible.length !== 1 ? "s" : "")
        : "";
    }

    listEl.innerHTML = "";

    if (!visible.length) {
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    var groups = groupByDate(visible);
    groups.forEach(function (group) {
      var section = document.createElement("div");
      section.className = "mb-4";

      var isExpanded = !!expandedGroupKeys[group.key];
      var shouldCollapse = group.items.length > DAY_COLLAPSE_LIMIT;
      var visibleItems = shouldCollapse && !isExpanded
        ? group.items.slice(0, DAY_COLLAPSE_LIMIT)
        : group.items;
      var hiddenCount = group.items.length - DAY_COLLAPSE_LIMIT;

      // Date header
      var header = document.createElement("div");
      header.className = "mb-2 flex items-center justify-between";

      var labelEl = document.createElement("h2");
      labelEl.className = "text-sm font-black";
      labelEl.style.color = "#102b1d";
      labelEl.textContent = group.label;
      header.appendChild(labelEl);

      if (shouldCollapse) {
        var topToggleBtn = document.createElement("button");
        topToggleBtn.type = "button";
        topToggleBtn.className = "text-xs font-bold";
        topToggleBtn.style.color = "#164f33";
        topToggleBtn.textContent = isExpanded ? "See less" : ("See " + hiddenCount + " more");
        topToggleBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        topToggleBtn.addEventListener("click", function () {
          if (expandedGroupKeys[group.key]) {
            delete expandedGroupKeys[group.key];
          } else {
            expandedGroupKeys[group.key] = true;
          }
          renderAll();
        });
        header.appendChild(topToggleBtn);
      }
      section.appendChild(header);

      // Expense rows container
      var rowsEl = document.createElement("div");
      rowsEl.className = "divide-y rounded-[1.5rem] bg-white px-4";
      rowsEl.style.outline = "1px solid #ded7c6";
      rowsEl.style.borderColor = "#f0ece0";
      visibleItems.forEach(function (exp) { rowsEl.appendChild(buildExpenseRow(exp)); });
      section.appendChild(rowsEl);

      listEl.appendChild(section);
    });
  }

  function resetExpandedGroups() {
    expandedGroupKeys = {};
  }

  // ── combined re-render ────────────────────────────────────
  function renderAll() {
    var periodOnly = allExpenses.filter(function (e) {
      if (activePeriod === "all") { return true; }
      var start = getPeriodBounds(activePeriod);
      return start ? new Date(e.timestamp) >= start : true;
    });

    renderCategoryChips(periodOnly);

    var filtered = applyFilters(allExpenses);
    renderList(filtered);
  }

  // ── undo toast ────────────────────────────────────────────
  function showUndoToast(expense) {
    if (pendingDelete) { commitDelete(); }

    pendingDelete = { id: expense.id, data: expense };
    renderAll();

    var toast   = document.getElementById("undoToast");
    var undoBtn = document.getElementById("undoToastBtn");
    if (toast)   { toast.classList.remove("hidden"); }

    pendingDeleteTimer = setTimeout(commitDelete, UNDO_DELAY_MS);
    if (undoBtn) { undoBtn.onclick = cancelDelete; }
  }

  function commitDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    window.StorageAPI.removeExpense(pendingDelete.id);
    allExpenses = allExpenses.filter(function (e) { return e.id !== pendingDelete.id; });
    pendingDelete      = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    renderAll();
  }

  function cancelDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    pendingDelete      = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    renderAll();
  }

  // ── weekly summary hero ──────────────────────────────────
  function renderWeeklySummary() {
    if (!window.StorageAPI) { return; }

    // Compute this week's Monday
    var now   = new Date();
    var dow   = now.getDay(); // 0=Sun
    var daysSinceMon = (dow === 0) ? 6 : dow - 1;
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceMon);
    weekStart.setHours(0, 0, 0, 0);

    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var weekExpenses = expenses.filter(function (e) {
      return e.timestamp && new Date(e.timestamp) >= weekStart;
    });
    var weekTotal = weekExpenses.reduce(function (s, e) { return s + Number(e.amount || 0); }, 0);

    var user = window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    var budget = (user && user.weeklyBudget) ? Number(user.weeklyBudget) : 0;

    var info   = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { xp: 0 };
    var weekXp = (user && typeof user.weeklyXpStart === "number") ? Math.max(0, info.xp - user.weeklyXpStart) : 0;
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;

    var fmtPHP = function (amt) {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amt);
    };

    var spentEl    = document.getElementById("activityWeekSpent");
    var budgetEl   = document.getElementById("activityWeekBudget");
    var progressEl = document.getElementById("activityWeekProgress");
    var logsEl     = document.getElementById("activityLogsCount");
    var xpEl       = document.getElementById("activityWeekXpVal");
    var streakEl   = document.getElementById("activityWeekStreakVal");

    if (spentEl)    { spentEl.textContent    = fmtPHP(weekTotal); }
    if (budgetEl)   { budgetEl.textContent   = fmtPHP(budget); }
    if (progressEl) {
      var pct = budget > 0 ? Math.min(100, Math.round((weekTotal / budget) * 100)) : 0;
      progressEl.style.width = pct + "%";
      progressEl.style.background = pct >= 90 ? "rgba(252,165,82,0.9)" : "rgba(255,255,255,0.85)";
    }
    if (logsEl)     { logsEl.textContent     = weekExpenses.length; }
    if (xpEl)       { xpEl.textContent       = "+" + weekXp; }
    if (streakEl)   { streakEl.textContent   = streak + " \uD83D\uDD25"; }
  }

  // ── tab switcher ─────────────────────────────────────────
  function wireTabSwitcher() {
    var btnExpenses = document.getElementById("tabExpenses");
    var btnActivity = document.getElementById("tabActivity");
    var panelExp    = document.getElementById("expensesTabPanel");
    var panelAct    = document.getElementById("activityTabPanel");

    if (!btnExpenses || !btnActivity) { return; }

    function activateTab(tab) {
      if (tab === "expenses") {
        btnExpenses.style.background = "white";
        btnExpenses.style.color      = "#102b1d";
        btnExpenses.style.boxShadow  = "0 1px 4px rgba(0,0,0,0.1)";
        btnActivity.style.background = "";
        btnActivity.style.color      = "#657064";
        btnActivity.style.boxShadow  = "";
        if (panelExp) { panelExp.style.display = ""; }
        if (panelAct) { panelAct.style.display = "none"; }
      } else {
        btnActivity.style.background = "white";
        btnActivity.style.color      = "#102b1d";
        btnActivity.style.boxShadow  = "0 1px 4px rgba(0,0,0,0.1)";
        btnExpenses.style.background = "";
        btnExpenses.style.color      = "#657064";
        btnExpenses.style.boxShadow  = "";
        if (panelAct) { panelAct.style.display = ""; }
        if (panelExp) { panelExp.style.display = "none"; }
        renderActivityFeed();
      }
    }

    btnExpenses.addEventListener("click", function () { activateTab("expenses"); });
    btnActivity.addEventListener("click", function () { activateTab("activity"); });
  }

  // ── activity feed ─────────────────────────────────────────
  function renderActivityFeed() {
    var feedEl = document.getElementById("activityFeedList");
    if (!feedEl || !window.StorageAPI) { return; }

    var events = [];

    // Add recent expenses as events
    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var recent   = expenses.slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); }).slice(0, 10);
    recent.forEach(function (e) {
      var meta = getCategoryMeta(e.category);
      events.push({
        icon: meta.emoji || "\uD83D\uDCB8",
        title: meta.label || e.category,
        detail: formatPhp(e.amount) + " spent",
        time: new Date(e.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) + " \u00B7 " + formatTime(e.timestamp),
        featured: false
      });
    });

    // Add level info as a featured event
    if (window.StorageAPI.getXpInfo) {
      var info2 = window.StorageAPI.getXpInfo();
      events.unshift({
        icon: "\u26A1",
        title: info2.levelName + " \u2014 Level " + info2.level,
        detail: info2.xp + " XP total \u00B7 " + info2.progressPct + "% to next level",
        time: "Current status",
        featured: true
      });
    }

    if (events.length === 0) {
      feedEl.innerHTML = '<div class="rounded-[2rem] bg-white p-5 text-center shadow-sm" style="outline:1px solid #ded7c6">' +
        '<p class="font-display text-base font-black" style="color:#102b1d">No activity yet</p>' +
        '<p class="mt-1 text-sm font-semibold" style="color:#617063">Start logging expenses to see your feed.</p>' +
        '</div>';
      return;
    }

    feedEl.innerHTML = events.map(function (ev) {
      var bg = ev.featured ? "#edf7ef" : "white";
      var outline = ev.featured ? "" : "outline:1px solid #ded7c6";
      return '<div class="flex items-center gap-4 rounded-[2rem] p-5 shadow-sm" style="background:' + bg + ';' + outline + '">' +
        '<div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">' + ev.icon + '</div>' +
        '<div class="min-w-0 flex-1">' +
          '<p class="font-display text-base font-black" style="color:#102b1d">' + escapeHtml(ev.title) + '</p>' +
          '<p class="text-sm font-semibold" style="color:#617063">' + escapeHtml(ev.detail) + '</p>' +
          '<p class="mt-1 text-xs font-bold uppercase tracking-[0.16em]" style="color:#7b837b">' + escapeHtml(ev.time) + '</p>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  // ── wire period chips ─────────────────────────────────────
  function applyPeriodChipStyles() {
    var chips = document.querySelectorAll("[data-period]");
    chips.forEach(function (b) {
      var isActive = b.getAttribute("data-period") === activePeriod;
      b.style.background = isActive ? "#164f33" : "#f4f0e5";
      b.style.color      = isActive ? "white"   : "#526257";
    });
  }

  function wirePeriodChips() {
    var chips = document.querySelectorAll("[data-period]");
    chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activePeriod   = btn.getAttribute("data-period");
        activeCategory = "all";
        resetExpandedGroups();
        applyPeriodChipStyles();
        renderAll();
      });
    });
    applyPeriodChipStyles();
  }

  // ── wire search ───────────────────────────────────────────
  function wireSearch() {
    var searchEl = document.getElementById("activitySearch");
    if (!searchEl) { return; }
    searchEl.addEventListener("input", function () {
      searchQuery = (searchEl.value || "").trim().toLowerCase();
      resetExpandedGroups();
      renderAll();
    });
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
      levelEl.innerHTML = '<i class="bi bi-arrow-up-circle-fill" aria-hidden="true"></i> Lv. ' + info.level + ' \u2014 ' + info.levelName;
    }
    if (fillEl)   { fillEl.style.width = info.progressPct + "%"; }
    if (trackEl)  { trackEl.setAttribute("aria-valuenow", info.progressPct); }
    if (streakEl) {
      var cls = "xp-mini-streak" + (streak >= 7 ? " xp-mini-streak--week" : streak >= 3 ? " xp-mini-streak--hot" : streak >= 1 ? " xp-mini-streak--warm" : "");
      streakEl.className = cls;
      streakEl.innerHTML = '<i class="bi bi-fire" aria-hidden="true"></i> ' + (streak === 0 ? "0" : streak);
    }
  }

  // ── init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.StorageAPI) { return; }

    buildCategoryMap();
    allExpenses = window.StorageAPI.getExpenses();

    wireTabSwitcher();
    wirePeriodChips();
    wireSearch();
    renderWeeklySummary();
    renderAll();
    renderXpMiniBar();

    window.addEventListener("sugbocents:synced", function () {
      buildCategoryMap();
      allExpenses    = window.StorageAPI.getExpenses();
      activePeriod   = "all";
      activeCategory = "all";
      resetExpandedGroups();
      applyPeriodChipStyles();
      renderWeeklySummary();
      renderAll();
      renderXpMiniBar();
    });

    window.addEventListener("sugbocents:dataChanged", function () {
      allExpenses = window.StorageAPI.getExpenses();
      renderWeeklySummary();
      renderAll();
    });
  });
})();
