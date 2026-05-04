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
