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

  function fmtDate(isoOrKey) {
    if (!isoOrKey) { return "—"; }
    var d = new Date(isoOrKey.length === 10 ? isoOrKey + "T00:00:00" : isoOrKey);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function fmtMonth(isoKey) {
    if (!isoKey) { return "—"; }
    var d = new Date(isoKey.slice(0, 7) + "-01T00:00:00");
    return d.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
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

  // ── Personal Records ──────────────────────────────────────
  function renderPersonalRecords() {
    var el = document.getElementById("personalRecords");
    if (!el || !window.StorageAPI) { return; }
    var records = window.StorageAPI.getRecords ? window.StorageAPI.getRecords() : null;
    if (!records) { el.innerHTML = ""; return; }
    var streak = records.longestStreak || {};
    var weekXp = records.bestWeekXp || {};
    var saved  = records.bestMonthSaved || {};

    el.innerHTML =
      '<div class="record-card record-card--streak">' +
        '<span class="record-card__number">' + (streak.value || 0) + '</span>' +
        '<span class="record-card__label">Longest Streak</span>' +
        '<span class="record-card__date">' + (streak.date ? fmtDate(streak.date) : "No streak yet") + '</span>' +
      '</div>' +
      '<div class="record-card record-card--xp">' +
        '<span class="record-card__number">' + (weekXp.value || 0) + ' XP</span>' +
        '<span class="record-card__label">Best Week</span>' +
        '<span class="record-card__date">' + (weekXp.weekStart ? "Wk of " + fmtDate(weekXp.weekStart) : "No data yet") + '</span>' +
      '</div>' +
      '<div class="record-card record-card--savings">' +
        '<span class="record-card__number">\u20B1' + (saved.value ? saved.value.toLocaleString("en-PH") : "0") + '</span>' +
        '<span class="record-card__label">Best Month Saved</span>' +
        '<span class="record-card__date">' + (saved.month ? fmtMonth(saved.month) : "No data yet") + '</span>' +
      '</div>';
  }

  // ── Badge grid (Duolingo-style rarity system) ─────────────

  // Rarity tier → background color
  var RARITY_COLORS = {
    bronze:  "#C2773A",
    silver:  "#6B7280",
    gold:    "#CA8A04",
    emerald: "#1f6b46",
    diamond: "#0891B2"
  };

  // Category display order
  var BADGE_CATEGORY_ORDER = ["Logging", "Streak", "Budget", "Missions", "Quests", "Goals", "Misc", "XP"];

  function getBadgeVisClass(badge) {
    if (badge.claimed || badge.unlockable) { return "badge-card--unlocked"; }
    if (badge.target > 0 && badge.progress / badge.target >= 0.5) { return "badge-card--locked-near"; }
    return "badge-card--locked-far";
  }

  function getBadgeSortScore(badge) {
    // Sort priority: 1=unclaimed unlockable, 2=claimed, 3=locked near, 4=locked far
    if (badge.unlockable && !badge.claimed) { return 1; }
    if (badge.claimed) { return 2; }
    if (badge.target > 0 && badge.progress / badge.target >= 0.5) { return 3; }
    return 4;
  }

  // For a tiered series, show only the "active" tier card
  // Active = first unclaimed+unlockable tier, or if all claimed = last tier, or first tier if none unlocked
  function resolveActiveTierBadges(allBadges) {
    // Group by series
    var seriesMap = {};
    var standalone = [];
    allBadges.forEach(function (b) {
      if (b.series) {
        if (!seriesMap[b.series]) { seriesMap[b.series] = []; }
        seriesMap[b.series].push(b);
      } else {
        standalone.push(b);
      }
    });

    var result = [];
    // Add standalone badges as-is
    standalone.forEach(function (b) { result.push(b); });

    // For each series, pick the active badge to display
    Object.keys(seriesMap).forEach(function (seriesKey) {
      var tiers = seriesMap[seriesKey].slice().sort(function (a, b) { return (a.tier || 0) - (b.tier || 0); });
      // Find first unclaimed+unlockable
      var active = null;
      for (var i = 0; i < tiers.length; i++) {
        if (tiers[i].unlockable && !tiers[i].claimed) { active = tiers[i]; break; }
      }
      // If none unclaimed-unlockable, find last claimed
      if (!active) {
        for (var j = tiers.length - 1; j >= 0; j--) {
          if (tiers[j].claimed) { active = tiers[j]; break; }
        }
      }
      // If nothing claimed, show first tier
      if (!active) { active = tiers[0]; }
      // Carry "tier" display context from the series
      active = Object.assign({}, active, {
        _seriesTiers: tiers,
        _displayTier: active.tier,
        _totalTiers: active.totalTiers
      });
      result.push(active);
    });
    return result;
  }

  function renderBadgeCard(badge) {
    var visClass  = getBadgeVisClass(badge);
    var isPending = badge.unlockable && !badge.claimed;
    var isMaxed   = badge.claimed && badge.tier && badge.tier === badge.totalTiers;
    var rarityBg  = RARITY_COLORS[badge.rarity] || RARITY_COLORS.bronze;
    var threshold = badge.threshold || badge.target;

    // State-specific card classes
    var cardClasses = "badge-card " + visClass;
    if (isPending)  { cardClasses += " badge-card--claim-pending"; }
    if (isMaxed)    { cardClasses += " badge-card--maxed"; }

    // Tier label (always shown for tiered badges)
    var tierLabel = "";
    if (badge.tier && badge.totalTiers) {
      tierLabel = '<span class="badge-card__tier">' + badge.tier + " of " + badge.totalTiers + '</span>';
    }

    // Progress bar (for locked badges with countable progress)
    var progressBar = "";
    var countableTypes = ["expense_count", "streak", "streak_diamonds", "level", "goal_count", "goals_completed", "category_variety", "mission_count", "quest_count", "quest_streak", "savings_total", "budget_weeks_total"];
    if (!badge.claimed && countableTypes.indexOf(badge.type || "") !== -1 && badge.target > 0) {
      var pct = Math.min(100, Math.round((badge.progress / badge.target) * 100));
      if (pct > 0) {
        progressBar = '<div class="badge-progress-track" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
          '<div class="badge-progress-fill" style="width:' + pct + '%"></div></div>';
      }
    }

    // Action button / status
    var actionHtml = "";
    if (isPending) {
      actionHtml = '<button type="button" class="badge-claim-btn" data-badge-id="' + escapeHtml(badge.id) + '">' +
        'Claim +15 XP +\u20B525' +
        '</button>';
    } else if (badge.claimed) {
      actionHtml = '<span class="badge-status badge-status--claimed">\u2713 Claimed</span>';
    }

    return '<div class="' + cardClasses + '" data-badge-id="' + escapeHtml(badge.id) + '">' +
      '<div class="badge-card__art" style="background:' + rarityBg + '">' +
        '<i class="bi ' + escapeHtml(badge.icon) + ' badge-card__icon" aria-hidden="true"></i>' +
        '<span class="badge-card__number">' + threshold + '</span>' +
      '</div>' +
      '<p class="badge-card__name">' + escapeHtml(badge.name) + '</p>' +
      tierLabel +
      progressBar +
      actionHtml +
      '</div>';
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

    // Resolve active tier badges (show one card per series)
    var displayBadges = resolveActiveTierBadges(allBadges);

    // Group by category
    var grouped = {};
    BADGE_CATEGORY_ORDER.forEach(function (cat) { grouped[cat] = []; });
    displayBadges.forEach(function (b) {
      var cat = b.category || "Misc";
      if (!grouped[cat]) { grouped[cat] = []; }
      grouped[cat].push(b);
    });

    // Sort within each category
    Object.keys(grouped).forEach(function (cat) {
      grouped[cat].sort(function (a, b) {
        var sa = getBadgeSortScore(a);
        var sb = getBadgeSortScore(b);
        if (sa !== sb) { return sa - sb; }
        // Within same priority: rarity ascending (bronze < silver < gold < emerald < diamond)
        var rarityOrder = { bronze: 0, silver: 1, gold: 2, emerald: 3, diamond: 4 };
        return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
      });
    });

    var lockedFarCount = displayBadges.filter(function (b) {
      return !b.claimed && !b.unlockable && (b.target === 0 || b.progress / b.target < 0.5);
    }).length;

    var html = "";
    BADGE_CATEGORY_ORDER.forEach(function (cat) {
      var group = grouped[cat];
      if (!group || group.length === 0) { return; }
      html += '<div class="badge-category-group">' +
        '<h3 class="badge-category-label">' + escapeHtml(cat) + '</h3>' +
        '<div class="badge-grid">';
      group.forEach(function (badge) { html += renderBadgeCard(badge); });
      html += '</div></div>';
    });

    if (lockedFarCount > 0) {
      html += '<p class="badge-more-hint">+ ' + lockedFarCount + ' more badge' + (lockedFarCount > 1 ? 's' : '') + ' to unlock \u2192</p>';
    }

    gridEl.innerHTML = html;

    // Wire claim buttons to open claim sheet
    gridEl.querySelectorAll(".badge-claim-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-badge-id");
        openClaimSheet(id, allBadges);
      });
    });
  }

  // ── Claim Sheet ───────────────────────────────────────────
  function openClaimSheet(badgeId, allBadges) {
    var badge = allBadges.find(function (b) { return b.id === badgeId; });
    if (!badge || !badge.unlockable || badge.claimed) { return; }

    var rarityBg = RARITY_COLORS[badge.rarity] || RARITY_COLORS.bronze;
    var threshold = badge.threshold || badge.target;
    var tierLabel = (badge.tier && badge.totalTiers) ? badge.tier + " of " + badge.totalTiers : "";

    var sheetId = "badgeClaimSheet";
    var sheet = document.getElementById(sheetId);
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Claim badge");
      document.body.appendChild(sheet);
    }
    sheet.innerHTML =
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-header">' +
        '<h2 class="sheet-title">Claim Badge</h2>' +
        '<button type="button" class="sheet-close-btn" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="sheet-body badge-claim-body">' +
        '<div class="badge-claim-art" style="background:' + rarityBg + '">' +
          '<i class="bi ' + escapeHtml(badge.icon) + '" aria-hidden="true"></i>' +
          '<span class="badge-claim-number">' + threshold + '</span>' +
        '</div>' +
        '<h3 class="badge-claim-name">' + escapeHtml(badge.name) + '</h3>' +
        (tierLabel ? '<p class="badge-claim-tier">' + escapeHtml(badge.category) + ' \u00b7 ' + tierLabel + '</p>' : '') +
        '<p class="badge-claim-desc">' + escapeHtml(badge.description) + '</p>' +
        '<div class="badge-claim-reward">' +
          '<span class="badge-claim-reward-pill">+15 XP \u26a1</span>' +
          '<span class="badge-claim-reward-pill badge-claim-reward-pill--sentimos">+\u20B525</span>' +
        '</div>' +
        '<button type="button" class="btn-primary badge-claim-confirm-btn" data-badge-id="' + escapeHtml(badgeId) + '">CLAIM BADGE</button>' +
      '</div>';

    sheet.querySelector(".sheet-close-btn").addEventListener("click", closeClaimSheet);
    sheet.querySelector(".badge-claim-confirm-btn").addEventListener("click", async function () {
      var id = this.getAttribute("data-badge-id");
      if (!id || !window.StorageAPI.claimAchievement) { return; }
      var result = await window.StorageAPI.claimAchievement(id);
      if (result.ok) {
        closeClaimSheet();
        renderBadgeGrid();
        renderXpWidget();
        // Show XP popup if GamificationUI exists
        if (window.GamificationUI && window.GamificationUI.showXpPopup) {
          window.GamificationUI.showXpPopup(result.xpAwarded, null);
        }
      }
    });

    if (window.AppShell && window.AppShell.openSheet) {
      window.AppShell.openSheet(sheetId);
    } else {
      sheet.classList.add("is-open");
    }
  }

  function closeClaimSheet() {
    if (window.AppShell && window.AppShell.closeAllSheets) {
      window.AppShell.closeAllSheets();
    } else {
      var sheet = document.getElementById("badgeClaimSheet");
      if (sheet) { sheet.classList.remove("is-open"); }
    }
  }

  // ── init ──────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    renderXpWidget();
    renderPersonalRecords();
    renderBadgeGrid();

    window.addEventListener("sugbocents:synced", function () {
      renderXpWidget();
      renderPersonalRecords();
      renderBadgeGrid();
    });
    window.addEventListener("sugbocents:dataChanged", function () {
      renderXpWidget();
      renderPersonalRecords();
      renderBadgeGrid();
    });
  });
})();
