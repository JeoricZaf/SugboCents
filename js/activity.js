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
    allBtn.className = "filter-chip" + (activeCategory === "all" ? " active" : "");
    allBtn.textContent = "All";
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
      btn.className = "filter-chip" + (cat.id === activeCategory ? " active" : "");
      btn.textContent = cat.label;
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
      btn.className = "filter-chip" + (label === activeCategory ? " active" : "");
      btn.textContent = label;
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
    var chipBg = meta.color || "#e2e8f0";

    var SYSTEM_NOTES = { "Quick add": true, "One-time": true };
    var noteText = (expense.note && !SYSTEM_NOTES[expense.note])
      ? " · " + escapeHtml(expense.note)
      : "";

    var li = document.createElement("li");
    li.className = "expense-row";

    var chipEl = document.createElement("span");
    chipEl.className = "expense-chip";
    chipEl.style.background = chipBg;
    chipEl.textContent = meta.emoji || (meta.label || "?").slice(0, 2).toUpperCase();

    var infoEl = document.createElement("span");
    infoEl.className = "min-w-0 flex-1";
    infoEl.innerHTML =
      '<span class="expense-title">' + escapeHtml(meta.label || expense.category) + "</span>" +
      '<span class="expense-meta block">' + escapeHtml(formatTime(expense.timestamp)) + noteText + "</span>";

    var amtEl = document.createElement("span");
    amtEl.className = "expense-amount";
    amtEl.textContent = "-" + formatPhp(expense.amount);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "expense-delete-btn";
    delBtn.setAttribute("aria-label", "Remove expense");
    delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener("click", (function (exp) {
      return function () { showUndoToast(exp); };
    }(expense)));

    li.appendChild(chipEl);
    li.appendChild(infoEl);
    li.appendChild(amtEl);
    li.appendChild(delBtn);
    return li;
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
      section.className = "activity-date-group";

      var isExpanded = !!expandedGroupKeys[group.key];
      var shouldCollapse = group.items.length > DAY_COLLAPSE_LIMIT;
      var visibleItems = shouldCollapse && !isExpanded
        ? group.items.slice(0, DAY_COLLAPSE_LIMIT)
        : group.items;
      var hiddenCount = group.items.length - DAY_COLLAPSE_LIMIT;

      var header = document.createElement("div");
      header.className = "activity-date-header";

      var labelEl = document.createElement("p");
      labelEl.className = "activity-date-label";
      labelEl.textContent = group.label;
      header.appendChild(labelEl);

      if (shouldCollapse) {
        var topToggleBtn = document.createElement("button");
        topToggleBtn.type = "button";
        topToggleBtn.className = "activity-group-toggle-btn activity-group-toggle-btn--top";
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

      var ul = document.createElement("ul");
      ul.className = "card-panel divide-y divide-slate-100";
      visibleItems.forEach(function (exp) { ul.appendChild(buildExpenseRow(exp)); });

      section.appendChild(ul);

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

  // ── wire period chips ─────────────────────────────────────
  function wirePeriodChips() {
    var chips = document.querySelectorAll("[data-period]");
    chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activePeriod   = btn.getAttribute("data-period");
        activeCategory = "all";
        resetExpandedGroups();
        chips.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderAll();
      });
    });
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

  // ── init ──────────────────────────────────────────────────
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

  // ── init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.StorageAPI) { return; }

    buildCategoryMap();
    allExpenses = window.StorageAPI.getExpenses();

    wirePeriodChips();
    wireSearch();
    renderAll();
    renderXpMiniBar();

    window.addEventListener("sugbocents:synced", function () {
      buildCategoryMap();
      allExpenses    = window.StorageAPI.getExpenses();
      activePeriod   = "all";
      activeCategory = "all";
      resetExpandedGroups();
      renderAll();
      renderXpMiniBar();
    });
  });
})();
