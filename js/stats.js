(function () {
  if (document.body.dataset.page !== "stats") { return; }

  // ── helpers ───────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── XP widget (full, for Profile page) ───────────────────
  function renderXpWidget() {
    if (!window.StorageAPI || !window.StorageAPI.getXpInfo) { return; }
    var info   = window.StorageAPI.getXpInfo();
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var levelEl = document.getElementById("xpLevel");
    var barEl   = document.getElementById("xpBar");
    var trackEl = document.getElementById("xpBarTrack");
    var valueEl = document.getElementById("xpValue");
    var nextEl  = document.getElementById("xpNextLabel");
    var chipEl  = document.getElementById("xpStreakChip");
    if (levelEl) {
      levelEl.innerHTML = '<i class="bi bi-arrow-up-circle-fill" aria-hidden="true"></i> Lv. ' + info.level + ' \u2014 ' + info.levelName;
    }
    if (barEl)   { barEl.style.width = info.progressPct + "%"; }
    if (trackEl) { trackEl.setAttribute("aria-valuenow", info.progressPct); }
    if (valueEl) { valueEl.textContent = info.xp + " XP"; }
    if (nextEl) {
      var remaining = info.xpForNext - info.xp;
      nextEl.textContent = info.progressPct >= 100 ? "Max level!" : remaining + " XP to next level";
    }
    if (chipEl) {
      chipEl.className = "streak-chip" + (streak === 0 ? " streak-chip--cold" : streak >= 7 ? " streak-chip--hot streak-chip--week" : streak >= 3 ? " streak-chip--hot" : " streak-chip--warm");
      chipEl.innerHTML = '<i class="bi bi-fire" aria-hidden="true"></i> ' + (streak === 0 ? "No streak yet" : streak + "-day streak");
    }
  }

  // ── Badge grid (categorized, Duolingo-style) ──────────────
  var BADGE_CATEGORY_ORDER = ["Logging", "Streak", "Budget", "Misc", "Goals", "XP"];

  function badgeProgressLabel(badge) {
    switch (badge.type) {
      case "expense_count":
      case "streak":
      case "goal_count":
      case "level":
        return badge.progress + " / " + badge.target;
      case "time_of_day":
        return badge.id === "early-bird" ? "Log before 7 AM" : "Log after 10 PM";
      case "budget_week":
        return "Finish week under budget";
      case "budget_frugal":
        return "Spend \u226450% of budget";
      default:
        return "Locked";
    }
  }

  function badgeProgressPct(badge) {
    if (badge.target && badge.target > 0 &&
        (badge.type === "expense_count" || badge.type === "streak" ||
         badge.type === "goal_count"    || badge.type === "level")) {
      return Math.min(100, Math.round((badge.progress / badge.target) * 100));
    }
    return 0;
  }

  function renderBadgeGrid() {
    var gridEl     = document.getElementById("badgeGrid");
    var progressEl = document.getElementById("badgeProgress");
    if (!gridEl || !window.StorageAPI) { return; }

    var allBadges    = window.StorageAPI.getAchievements ? window.StorageAPI.getAchievements() : [];
    var claimedCount = allBadges.filter(function (b) { return b.claimed; }).length;
    if (progressEl) {
      progressEl.textContent = claimedCount + " / " + allBadges.length + " badges";
    }

    var grouped = {};
    BADGE_CATEGORY_ORDER.forEach(function (cat) { grouped[cat] = []; });
    allBadges.forEach(function (b) {
      var cat = b.category || "Misc";
      if (!grouped[cat]) { grouped[cat] = []; }
      grouped[cat].push(b);
    });

    var html = "";
    BADGE_CATEGORY_ORDER.forEach(function (cat) {
      var group = grouped[cat];
      if (!group || group.length === 0) { return; }
      html += '<div class="badge-category-group">'
        + '<h3 class="badge-category-label">' + escapeHtml(cat) + '</h3>'
        + '<div class="badge-grid">';

      group.forEach(function (badge) {
        if (badge.claimed) {
          // ── Claimed ──────────────────────────────────────────────
          html += '<div class="badge-card badge-card--claimed">'
            + '<div class="badge-icon-wrap badge-icon-wrap--claimed">'
            +   '<i class="bi ' + escapeHtml(badge.icon) + '" aria-hidden="true"></i>'
            + '</div>'
            + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
            + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
            + '<p class="badge-status badge-status--claimed">'
            +   '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Claimed'
            + '</p>'
            + '</div>';

        } else if (badge.unlockable) {
          // ── Ready to claim ────────────────────────────────────────
          html += '<div class="badge-card badge-card--unlockable">'
            + '<div class="badge-icon-wrap badge-icon-wrap--unlockable">'
            +   '<i class="bi ' + escapeHtml(badge.icon) + '" aria-hidden="true"></i>'
            + '</div>'
            + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
            + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
            + '<p class="badge-status badge-status--ready">'
            +   '<i class="bi bi-stars" aria-hidden="true"></i> Ready to claim!'
            + '</p>'
            + '<button type="button" class="badge-claim-btn" data-badge-id="' + escapeHtml(badge.id) + '">'
            +   'Claim +15 XP'
            + '</button>'
            + '</div>';

        } else {
          // ── Locked ─── show progress bar for countable types ──────
          var pct   = badgeProgressPct(badge);
          var label = badgeProgressLabel(badge);
          var hasBar = pct > 0;
          html += '<div class="badge-card badge-card--locked">'
            + '<div class="badge-icon-wrap badge-icon-wrap--locked">'
            +   '<i class="bi bi-lock-fill" aria-hidden="true"></i>'
            + '</div>'
            + '<p class="badge-name badge-name--locked">' + escapeHtml(badge.name) + '</p>'
            + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>';

          if (hasBar) {
            html += '<div class="badge-progress-track" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + escapeHtml(badge.name) + ' progress">'
              + '<div class="badge-progress-fill" style="width:' + pct + '%"></div>'
              + '</div>';
          }

          html += '<p class="badge-status badge-status--locked">' + escapeHtml(label) + '</p>'
            + '</div>';
        }
      });

      html += '</div></div>';
    });

    gridEl.innerHTML = html;

    gridEl.querySelectorAll(".badge-claim-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-badge-id");
        if (!id || !window.StorageAPI.claimAchievement) { return; }
        var result = window.StorageAPI.claimAchievement(id);
        if (result.ok) {
          renderBadgeGrid();
          renderXpWidget();
        }
      });
    });
  }

  // ── init ──────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    renderXpWidget();
    renderBadgeGrid();

    window.addEventListener("sugbocents:synced", function () {
      renderXpWidget();
      renderBadgeGrid();
    });
  });
})();

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
    return null; // "all"
  }

  function filterByPeriod(expenses) {
    var start = getPeriodStart(activePeriod);
    if (!start) { return expenses; }
    return expenses.filter(function (e) {
      return new Date(e.timestamp) >= start;
    });
  }

  // ── stat cards ────────────────────────────────────────────
  function renderStatCards(expenses) {
    var totalEl   = document.getElementById("statsTotal");
    var countEl   = document.getElementById("statsCount");
    var topCatEl  = document.getElementById("statsTopCat");
    if (!totalEl || !countEl || !topCatEl) { return; }

    var total = expenses.reduce(function (s, e) { return s + Number(e.amount || 0); }, 0);
    totalEl.textContent = formatPhp(total);
    countEl.textContent = String(expenses.length);

    // find top category by spend
    var catTotals = {};
    expenses.forEach(function (e) {
      var key = e.category || "others";
      catTotals[key] = (catTotals[key] || 0) + Number(e.amount || 0);
    });

    var topCat = null;
    var topAmt = 0;
    Object.keys(catTotals).forEach(function (k) {
      if (catTotals[k] > topAmt) { topAmt = catTotals[k]; topCat = k; }
    });

    if (topCat) {
      var cats = window.StorageAPI ? (window.StorageAPI.getExpenseCategories ? window.StorageAPI.getExpenseCategories() : []) : [];
      var meta = cats.filter(function (c) { return c.id === topCat; })[0];
      topCatEl.textContent = meta ? (meta.emoji + " " + meta.label) : topCat;
    } else {
      topCatEl.textContent = "—";
    }
  }

  // ── category breakdown ────────────────────────────────────
  function renderCategoryBreakdown(expenses) {
    var container = document.getElementById("categoryBreakdown");
    if (!container) { return; }

    if (!expenses.length) {
      container.innerHTML = '<p class="p-4 text-sm text-slate-400">No data for this period.</p>';
      return;
    }

    var cats = window.StorageAPI && window.StorageAPI.getExpenseCategories
      ? window.StorageAPI.getExpenseCategories()
      : [];
    var catMap = {};
    cats.forEach(function (c) { catMap[c.id] = c; });

    // Tally amounts per category key (predefined id or raw quick-add label)
    var catTotals = {};
    var catOrder  = [];
    expenses.forEach(function (e) {
      var key = e.category || "others";
      if (!catTotals[key]) {
        catTotals[key] = 0;
        catOrder.push(key);
      }
      catTotals[key] += Number(e.amount || 0);
    });

    // Sort descending by amount
    catOrder.sort(function (a, b) { return catTotals[b] - catTotals[a]; });

    var grandTotal = Object.keys(catTotals).reduce(function (s, k) { return s + catTotals[k]; }, 0);

    container.innerHTML = "";
    catOrder.forEach(function (key) {
      var meta   = catMap[key] || { id: key, label: key, emoji: "", color: "#e2e8f0" };
      var amt    = catTotals[key];
      var pct    = grandTotal > 0 ? Math.round((amt / grandTotal) * 100) : 0;

      var row = document.createElement("div");
      row.className = "cat-breakdown-row";

      var chip = document.createElement("span");
      chip.className = "cat-breakdown-chip";
      chip.style.background = meta.color || "#e2e8f0";
      chip.textContent = meta.emoji || (meta.label || "?").slice(0, 2).toUpperCase();

      var info = document.createElement("div");
      info.className = "cat-breakdown-info";

      var labelRow = document.createElement("div");
      labelRow.className = "cat-breakdown-label-row";
      labelRow.innerHTML =
        '<span class="cat-breakdown-label">' + escapeHtml(meta.label || key) + '</span>' +
        '<span class="cat-breakdown-amount">' + escapeHtml(formatPhp(amt)) + '</span>';

      var track = document.createElement("div");
      track.className = "cat-breakdown-bar-track";
      var fill = document.createElement("div");
      fill.className = "cat-breakdown-bar-fill";
      fill.style.width = pct + "%";
      fill.style.background = meta.color || "var(--brand-700)";
      track.appendChild(fill);

      info.appendChild(labelRow);
      info.appendChild(track);

      row.appendChild(chip);
      row.appendChild(info);
      container.appendChild(row);
    });
  }

  // ── re-render everything ──────────────────────────────────
  function renderAll() {
    if (!window.StorageAPI) { return; }
    var all      = window.StorageAPI.getExpenses();
    var filtered = filterByPeriod(all);
    renderStatCards(filtered);
    renderCategoryBreakdown(filtered);
  }

  // ── wire period chips ─────────────────────────────────────
  function wirePeriodChips() {
    var chips = document.querySelectorAll("[data-stats-period]");
    chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activePeriod = btn.getAttribute("data-stats-period");
        chips.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderAll();
      });
    });
  }

  // ── XP widget (full, for Profile page) ───────────────────
  function renderXpWidget() {
    if (!window.StorageAPI || !window.StorageAPI.getXpInfo) { return; }
    var info   = window.StorageAPI.getXpInfo();
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var levelEl  = document.getElementById("xpLevel");
    var barEl    = document.getElementById("xpBar");
    var trackEl  = document.getElementById("xpBarTrack");
    var valueEl  = document.getElementById("xpValue");
    var nextEl   = document.getElementById("xpNextLabel");
    var chipEl   = document.getElementById("xpStreakChip");
    if (levelEl) {
  // ── init ──────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    wirePeriodChips();
    renderAll();
    renderXpWidget();
    renderBadgeGrid();

    window.addEventListener("sugbocents:synced", function () {
      renderAll();
      renderXpWidget();
      renderBadgeGrid();
    });
  });
})();\u2014 ' + info.levelName;
    }
    if (barEl)   { barEl.style.width = info.progressPct + "%"; }
    if (trackEl) { trackEl.setAttribute("aria-valuenow", info.progressPct); }
    if (valueEl) { valueEl.textContent = info.xp + " XP"; }
    if (nextEl) {
      var remaining = info.xpForNext - info.xp;
      nextEl.textContent = info.progressPct >= 100 ? "Max level!" : remaining + " XP to next level";
    }
    if (chipEl) {
      chipEl.className = "streak-chip" + (streak === 0 ? " streak-chip--cold" : streak >= 7 ? " streak-chip--hot streak-chip--week" : streak >= 3 ? " streak-chip--hot" : " streak-chip--warm");
      chipEl.innerHTML = '<i class="bi bi-fire" aria-hidden="true"></i> ' + (streak === 0 ? "No streak yet" : streak + "-day streak");
    }
  }

  // ── Badge grid (categorized, Duolingo-style) ──────────────
  var BADGE_CATEGORY_ORDER = ["Logging", "Streak", "Budget", "Misc", "Goals", "XP"];

  function renderBadgeGrid() {
    var gridEl     = document.getElementById("badgeGrid");
    var progressEl = document.getElementById("badgeProgress");
    if (!gridEl || !window.StorageAPI) { return; }

    var allBadges    = window.StorageAPI.getAchievements ? window.StorageAPI.getAchievements() : [];
    var claimedCount = allBadges.filter(function (b) { return b.claimed; }).length;
    if (progressEl) {
      progressEl.textContent = claimedCount + " / " + allBadges.length + " badges";
    }

    var grouped = {};
    BADGE_CATEGORY_ORDER.forEach(function (cat) { grouped[cat] = []; });
    allBadges.forEach(function (b) {
      var cat = b.category || "Misc";
      if (!grouped[cat]) { grouped[cat] = []; }
      grouped[cat].push(b);
    });

    var html = "";
    BADGE_CATEGORY_ORDER.forEach(function (cat) {
      var group = grouped[cat];
      if (!group || group.length === 0) { return; }
      html += '<div class="badge-category-group">'
        + '<h3 class="badge-category-label">' + escapeHtml(cat) + '</h3>'
        + '<div class="badge-grid">';
      group.forEach(function (badge) {
        if (badge.claimed) {
          html += '<div class="badge-card badge-card--claimed">'
            + '<div class="badge-icon-wrap badge-icon-wrap--claimed"><i class="bi ' + escapeHtml(badge.icon) + '" aria-hidden="true"></i></div>'
            + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
            + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
            + '<p class="badge-status badge-status--claimed"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Claimed</p>'
            + '</div>';
        } else if (badge.unlockable) {
          html += '<div class="badge-card badge-card--unlockable">'
            + '<div class="badge-icon-wrap badge-icon-wrap--unlockable"><i class="bi ' + escapeHtml(badge.icon) + '" aria-hidden="true"></i></div>'
            + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
            + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
            + '<button type="button" class="badge-claim-btn" data-badge-id="' + escapeHtml(badge.id) + '">Claim +15 XP</button>'
            + '</div>';
        } else {
          html += '<div class="badge-card badge-card--locked">'
            + '<div class="badge-icon-wrap badge-icon-wrap--locked"><i class="bi bi-lock-fill" aria-hidden="true"></i></div>'
            + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
            + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
            + '<p class="badge-status badge-status--locked">' + badge.progress + ' / ' + badge.target + '</p>'
            + '</div>';
        }
      });
      html += '</div></div>';
    });

    gridEl.innerHTML = html;

    gridEl.querySelectorAll(".badge-claim-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-badge-id");
        if (!id || !window.StorageAPI.claimAchievement) { return; }
        var result = window.StorageAPI.claimAchievement(id);
        if (result.ok) {
          renderBadgeGrid();
          renderXpWidget();
        }
      });
    });
  }
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

  // ── init ──────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    wirePeriodChips();
    renderAll();
    renderXpMiniBar();

    window.addEventListener("sugbocents:synced", function () {
      renderAll();
      renderXpMiniBar();
    });
  });
})();
