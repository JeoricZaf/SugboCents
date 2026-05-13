(function () {
  "use strict";

  // ── Condition metadata (weekly) ────────────────────────────

  var COND_LABELS = {
    "log_days":               "Log expenses on",
    "log_count":              "Log",
    "under_budget_days":      "Stay under budget on",
    "no_overspend_days":      "No overspending for",
    "log_days_before_noon":   "Log before noon on",
    "log_days_after_9pm":     "Log after 9 PM on",
    "frugal_week":            "Spend \u226450% of weekly budget",
    "category_diversity_week":"Log in at least",
    "xp_earned_week":         "Earn",
    "log_count_today":        "Log expenses",
    "category_count_today":   "Log in categories",
    "under_daily_budget":     "Stay under daily budget"
  };

  var COND_UNITS = {
    "log_days":               "days",
    "log_count":              "expenses",
    "under_budget_days":      "days",
    "no_overspend_days":      "days",
    "log_days_before_noon":   "days",
    "log_days_after_9pm":     "days",
    "frugal_week":            "",
    "category_diversity_week":"categories",
    "xp_earned_week":         "XP",
    "log_count_today":        "today",
    "category_count_today":   "today",
    "under_daily_budget":     ""
  };

  // ── Daily Quest Definitions ────────────────────────────────

  var DAILY_QUEST_DEFS = [
    {
      id: "daily-first-log",
      title: "First Log",
      description: "Log at least 1 expense today",
      icon: "\uD83D\uDCDD",
      xpReward: 10,
      sentimosReward: 10,
      compute: function (todayExp) {
        return { progress: Math.min(1, todayExp.length), target: 1 };
      }
    },
    {
      id: "daily-triple-log",
      title: "Triple Log",
      description: "Log 3 expenses today",
      icon: "\uD83D\uDCCB",
      xpReward: 20,
      sentimosReward: 10,
      compute: function (todayExp) {
        return { progress: Math.min(3, todayExp.length), target: 3 };
      }
    },
    {
      id: "daily-categories",
      title: "Category Mix",
      description: "Log in 3 different categories today",
      icon: "\uD83C\uDFAF",
      xpReward: 25,
      sentimosReward: 10,
      compute: function (todayExp) {
        var cats = {};
        todayExp.forEach(function (e) { cats[e.category || "others"] = true; });
        return { progress: Math.min(3, Object.keys(cats).length), target: 3 };
      }
    },
    {
      id: "daily-under-budget",
      title: "Daily Saver",
      description: "Stay under your daily budget today",
      icon: "\uD83D\uDEE1\uFE0F",
      xpReward: 20,
      sentimosReward: 10,
      compute: function (todayExp, weeklyBudget) {
        if (!weeklyBudget || weeklyBudget <= 0) { return { progress: 0, target: 1, unavailable: true }; }
        var dailyLimit = weeklyBudget / 7;
        var spent = todayExp.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
        return { progress: spent <= dailyLimit ? 1 : 0, target: 1 };
      }
    }
  ];

  // ── Daily quest storage condition map ─────────────────────

  var DAILY_QUEST_STORAGE_CONDITIONS = {
    "daily-first-log":    { type: "log_count_today",      target: 1 },
    "daily-triple-log":   { type: "log_count_today",      target: 3 },
    "daily-categories":   { type: "category_count_today", target: 3 },
    "daily-under-budget": { type: "under_daily_budget",   target: 1 }
  };

  function trackDailyQuest(def) {
    if (!window.StorageAPI || !window.StorageAPI.setCurrentQuest) { return; }
    var cond = DAILY_QUEST_STORAGE_CONDITIONS[def.id] || { type: "log_count_today", target: 1 };
    var now = new Date();
    // Use 23:59:59.999 (end-of-day) rather than the following midnight so quest
    // completion that fires just before midnight doesn't race against expiry.
    var endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    var questObj = {
      id: def.id, type: "daily", title: def.title, description: def.description,
      icon: def.icon, xpReward: def.xpReward, sentimosReward: def.sentimosReward || 10,
      conditions: [{ type: cond.type, target: cond.target, progress: 0 }],
      assignedAt: now.toISOString(), expiresAt: endOfDay.toISOString(), completedAt: null
    };
    window.StorageAPI.setCurrentQuest(questObj);
    if (window.AppShell && window.AppShell.closeAllSheets) { window.AppShell.closeAllSheets(); }
    showSimpleToast("\uD83D\uDCCC Tracking: " + def.title);
    renderQuestPage();
  }

  function maybeTrackDailyQuest(def) {
    var current = window.StorageAPI && window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    if (current && current.id !== def.id) {
      openReplaceQuestSheet(current, def, function () { trackDailyQuest(def); });
    } else {
      trackDailyQuest(def);
    }
  }

  // ── Locked quests (Coming next section) ───────────────────

  var LOCKED_QUEST_DEFS = [
    {
      icon: "\uD83D\uDD50",
      title: "Early Bird",
      description: "Log your first expense before noon, 3 days in a row.",
      xp: 125,
      reward: 30,
      total: 3
    },
    {
      icon: "\uD83C\uDFAF",
      title: "Frugal Run",
      description: "Spend 50% or less of your weekly budget.",
      xp: 175,
      reward: 50,
      total: 1
    }
  ];

  // ── Helpers ────────────────────────────────────────────────

  function getNextMondayDate() {
    var now = new Date();
    var day = now.getDay();
    var daysUntil;
    if (day === 0) { daysUntil = 1; }
    else if (day === 1) { daysUntil = 7; }
    else { daysUntil = 8 - day; }
    var next = new Date(now);
    next.setDate(now.getDate() + daysUntil);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  function formatLockedUnlockLabel() {
    var nextMon  = getNextMondayDate();
    var now      = new Date();
    var daysLeft = Math.ceil((nextMon.getTime() - now.getTime()) / 86400000);
    var dateLabel = nextMon.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    if (daysLeft === 1) { return "Next quest unlocks tomorrow (Mon, " + dateLabel + ")"; }
    if (daysLeft === 7) { return "New quest assigned every Monday \u2014 next: " + dateLabel; }
    return "Next quest unlocks Mon, " + dateLabel + " (in " + daysLeft + " days)";
  }

  // ── Daily reset pill (live countdown) ──────────────────

  function updateDailyResetPill() {
    var pill = document.getElementById("dailyResetPill");
    if (!pill) { return; }
    var now      = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    var msLeft   = midnight.getTime() - now.getTime();
    if (msLeft <= 0) { pill.textContent = "Resetting\u2026"; return; }
    var h = Math.floor(msLeft / 3600000);
    var m = Math.floor((msLeft % 3600000) / 60000);
    var s = Math.floor((msLeft % 60000) / 1000);
    if (h > 0) {
      pill.textContent = h + "h " + m + "m left";
    } else if (m > 0) {
      pill.textContent = m + "m " + s + "s left";
    } else {
      pill.textContent = s + "s left";
    }
  }

  // ── Weekly reset pill ──────────────────────────────────────

  function updateWeeklyResetPill() {
    var pill = document.getElementById("weeklyResetPill");
    if (!pill) { return; }
    var now = new Date();
    var day = now.getDay();
    var daysUntilMon;
    if (day === 0) { daysUntilMon = 1; }
    else if (day === 1) { daysUntilMon = 7; }
    else { daysUntilMon = 8 - day; }
    if (daysUntilMon === 1) {
      pill.textContent = "Resets tomorrow";
    } else {
      pill.textContent = "Resets in " + daysUntilMon + " days";
    }
  }

  // ── Daily Quests Section ───────────────────────────────────

  function renderDailyQuestsSection() {
    var container = document.getElementById("dailyQuestsContainer");
    var timerEl   = document.getElementById("dailyQuestsTimer");
    if (!container || !window.StorageAPI) { return; }

    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var summary  = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var weeklyBudget = summary.weeklyBudget || 0;
    var activeQuest  = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    var trackedDailyId = (activeQuest && activeQuest.type === "daily") ? activeQuest.id : null;

    var now      = new Date();
    var today    = new Date(now); today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    var todayExp = expenses.filter(function (e) {
      var d = new Date(e.timestamp);
      return d >= today && d < tomorrow;
    });

    // Forward-looking cutoff: only count expenses logged after the quest was assigned
    var assignedAtCutoff = (activeQuest && activeQuest.type === "daily" && activeQuest.assignedAt)
      ? new Date(activeQuest.assignedAt)
      : today;

    var allDone = DAILY_QUEST_DEFS.every(function (def) {
      var isCl = window.StorageAPI.isQuestClaimed ? window.StorageAPI.isQuestClaimed(def.id, "daily") : false;
      if (isCl) { return true; }
      var r = def.compute(todayExp, weeklyBudget);
      return (r.progress >= r.target) || r.unavailable;
    });

    if (timerEl) {
      timerEl.textContent = allDone ? "All done today \u2713" : "";
    }

    container.innerHTML = "";

    // ── Pending daily reward (completed yesterday, not yet claimed) ────────────
    // If the user completed a daily quest but closed the app before claiming,
    // the reward is preserved in storage and shown here so it is never lost.
    if (window.StorageAPI.getPendingDailyReward) {
      var pendingReward = window.StorageAPI.getPendingDailyReward();
      if (pendingReward) {
        var pendingCard = document.createElement("div");
        pendingCard.style.cssText = "margin-bottom:0.85rem;background:#fffbeb;border-radius:1.5rem;padding:1rem 1.25rem;outline:2px solid #fbbf24;";
        pendingCard.innerHTML =
          "<p style=\"font-size:0.68rem;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#92400e;margin:0 0 0.5rem 0\">&#127381; Unclaimed Reward</p>" +
          "<div style=\"display:flex;align-items:center;justify-content:space-between;gap:1rem\">" +
            "<div style=\"min-width:0\">" +
              "<p style=\"font-size:0.95rem;font-weight:800;color:#102b1d;margin:0\">" +
                (pendingReward.icon || "\u26A1") + " " + escapeHtml(pendingReward.title || "") +
              "</p>" +
              "<p style=\"font-size:0.78rem;color:#617063;margin:0.15rem 0 0 0\">" +
                "Completed yesterday \u00B7 +" + (pendingReward.xpReward || 0) + " XP \u00B7 +\u20B5" + (pendingReward.sentimosReward || 10) +
              "</p>" +
            "</div>" +
            "<button type=\"button\" class=\"pending-daily-claim-btn\" style=\"flex-shrink:0;background:#d97706;color:white;border:none;border-radius:999px;padding:0.5rem 1.1rem;font-size:0.82rem;font-weight:800;cursor:pointer\">Claim</button>" +
          "</div>";
        var pendingClaimBtn = pendingCard.querySelector(".pending-daily-claim-btn");
        if (pendingClaimBtn) {
          (function (pr) {
            pendingClaimBtn.addEventListener("click", function () {
              if (!window.StorageAPI || !window.StorageAPI.claimQuestReward) { return; }
              var claimResult = window.StorageAPI.claimQuestReward(pr.id, pr);
              if (claimResult && claimResult.ok) {
                dispatchQuestBadge();
                showQuestCelebrationModal({ title: claimResult.title, xpReward: claimResult.xpReward, sentimosReward: claimResult.sentimosReward, claimedQuestId: pr.id });
              } else if (claimResult && claimResult.alreadyClaimed) {
                showSimpleToast("\u2713 Already claimed!", "#475569");
                renderQuestPage();
              }
            });
          }(pendingReward));
        }
        container.appendChild(pendingCard);
      }
    }

    DAILY_QUEST_DEFS.forEach(function (def) {
      var isTracked = def.id === trackedDailyId;
      var isClaimed = window.StorageAPI.isQuestClaimed ? window.StorageAPI.isQuestClaimed(def.id, "daily") : false;
      var isUnavailable = false;
      var progress, target, result;

      if (isClaimed) {
        // Permanently lock into completed visual state
        result   = def.compute(todayExp, weeklyBudget);
        target   = result.target;
        progress = target;
      } else if (isTracked) {
        if (activeQuest.completedAt) {
          // Quest already marked complete in storage — trust the stored progress rather than
          // recomputing. The forward-looking filter can desync when expenses span the
          // assignedAt boundary, producing a lower count and hiding the Claim button.
          var storedCond = activeQuest.conditions && activeQuest.conditions[0];
          target   = storedCond ? storedCond.target : 3;
          progress = target;
        } else {
          // Forward-looking: only expenses logged at or after assignedAt count
          var trackedExp = expenses.filter(function (e) {
            var d = new Date(e.timestamp);
            return d >= assignedAtCutoff && d < tomorrow;
          });
          result        = def.compute(trackedExp, weeklyBudget);
          isUnavailable = Boolean(result.unavailable);
          progress      = result.progress;
          target        = result.target;
        }
      } else {
        result        = def.compute(todayExp, weeklyBudget);
        isUnavailable = Boolean(result.unavailable);
        progress      = result.progress;
        target        = result.target;
      }

      var isDone = isClaimed || (!isUnavailable && progress >= target);
      var computedCond  = [{ type: (DAILY_QUEST_STORAGE_CONDITIONS[def.id] || {}).type || "log_count_today", target: target, progress: progress }];

      // Build a qDef-compatible object for buildQuestCardHtml
      var qDefForCard = {
        id: def.id,
        icon: def.icon,
        title: def.title,
        description: def.description,
        xpReward: def.xpReward,
        sentimosReward: def.sentimosReward || 10
      };

      var showTrackBtn = !isClaimed && !isTracked && !isDone && !isUnavailable;
      var showClaimBtn = !isClaimed && isDone;

      var cardHtml = buildQuestCardHtml(qDefForCard, computedCond, {
        tracked: isTracked,
        showTrackBtn: showTrackBtn,
        showClaimBtn: showClaimBtn,
        claimed: isClaimed
      });

      var wrapper = document.createElement("div");
      if (isUnavailable) { wrapper.style.opacity = "0.5"; }
      wrapper.innerHTML = cardHtml;
      var card = wrapper.firstChild;
      if (!card) { container.appendChild(wrapper); return; }

      var trackBtn = card.querySelector(".quest-track-btn");
      if (trackBtn) {
        trackBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          maybeTrackDailyQuest(def);
        });
      }

      var claimBtn = card.querySelector(".quest-claim-btn");
      if (claimBtn) {
        claimBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!window.StorageAPI || !window.StorageAPI.claimQuestReward) { return; }
          var result2 = window.StorageAPI.claimQuestReward(qDefForCard.id, Object.assign({ type: "daily" }, qDefForCard));
          if (!result2 || !result2.ok) {
            if (result2 && result2.alreadyClaimed) { showSimpleToast("\u2713 Reward already claimed!", "#475569"); }
            return;
          }
          dispatchQuestBadge();
          showQuestCelebrationModal({ title: result2.title, xpReward: result2.xpReward, sentimosReward: result2.sentimosReward, claimedQuestId: def.id });
        });
      }

      container.appendChild(card);
    });
  }

  // ── Locked Quests Section ─────────────────────────────────

  function renderLockedQuestsSection() {
    var container = document.getElementById("lockedQuestsContainer");
    if (!container) { return; }
    container.innerHTML = "";

    LOCKED_QUEST_DEFS.forEach(function (q) {
      var card = document.createElement("div");
      card.className = "relative rounded-[2rem] p-5";
      card.style.background = "#ffffff";
      card.style.boxShadow  = "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px #ded7c6";
      card.style.opacity    = "0.4";
      card.style.filter     = "blur(0.4px)";

      card.innerHTML =
        "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr auto\">" +
          "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;box-shadow:0 0 0 1px #cfe2d3\" aria-hidden=\"true\">" + q.icon + "</div>" +
          "<div class=\"min-w-0\">" +
            "<h3 class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#102b1d\">" + q.title + "</h3>" +
            "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + q.description + "</p>" +
          "</div>" +
          "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#f0fdfa;color:#0f766e;box-shadow:0 0 0 1px rgba(13,148,136,0.25)\">\u20B5" + q.reward + "</div>" +
        "</div>" +
        "<div class=\"mt-5\">" +
          "<div class=\"relative overflow-hidden rounded-full\" style=\"height:1.25rem;background:#e7e0cf\">" +
            "<span class=\"absolute inset-0 flex items-center justify-center text-xs font-black\" style=\"color:#102b1d\">0 / " + q.total + " days</span>" +
          "</div>" +
        "</div>" +
        "<div class=\"mt-4\">" +
          "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">+" + q.xp + " XP</p>" +
        "</div>" +
        "<div class=\"absolute inset-0 grid place-items-center rounded-[2rem]\" style=\"background:rgba(247,243,232,0.45)\">" +
          "<div class=\"rounded-full px-4 py-2 text-sm font-black text-white\" style=\"background:#102b1d\">Locked</div>" +
        "</div>";

      container.appendChild(card);
    });
  }

  // ── Quest Detail Bottom Sheet ──────────────────────────────

  function openQuestDetailSheet(quest) {
    if (!window.AppShell) { return; }
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
        window.AppShell.closeAllSheets();
      });
    }

    var titleEl = document.getElementById("questSheetTitle");
    var bodyEl  = document.getElementById("questSheetBody");
    if (titleEl) { titleEl.textContent = (quest.icon || "\u26A1") + " " + quest.title; }

    if (bodyEl && quest) {
      var now      = new Date();
      var daysLeft = Math.ceil((new Date(quest.expiresAt) - now) / 86400000);
      var isDone   = Boolean(quest.completedAt);

      var condsHtml = "<ul class=\"quest-sheet-cond-list\">";
      quest.conditions.forEach(function (c) {
        var pct  = Math.min(100, Math.round((c.progress / c.target) * 100));
        var done = c.progress >= c.target;
        var labelBase = COND_LABELS[c.type] || c.type;
        var unit = COND_UNITS[c.type] || "";
        var label = (c.target > 1 && unit) ? (labelBase + " " + c.target + " " + unit) : labelBase;
        condsHtml +=
          "<li class=\"quest-sheet-cond\">" +
            "<div class=\"quest-sheet-cond-label\"><span>" + label.trim() + "</span>" +
            "<span class=\"quest-sheet-cond-count\">" + c.progress + " / " + c.target + "</span></div>" +
            "<div class=\"quest-sheet-bar-track\"><div class=\"quest-sheet-bar-fill" +
              (done ? " quest-sheet-bar-fill--done" : "") +
              "\" style=\"width:" + pct + "%\"></div></div>" +
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
        "<p style=\"font-size:0.72rem;color:#94a3b8;margin-top:0.65rem;\">" +
          (isDone ? "Quest completed! \u2713" : (daysLeft > 0 ? daysLeft + " day" + (daysLeft !== 1 ? "s" : "") + " left" : "Expires today")) +
          " \u00B7 New quest every Monday" +
        "</p>" +
        (isDone
          ? "<div style=\"margin-top:0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:0.625rem;padding:0.65rem 0.875rem;font-size:0.82rem;color:#166534;font-weight:600;\">" +
              "\u2705 Quest complete! " + formatLockedUnlockLabel() + "." +
            "</div>"
          : ""
        );
    }

    window.AppShell.openSheet(sheetId);
  }

  // ── All 12 weekly quest definitions (mirrors storage.js QUESTS) ────────────

  var WEEKLY_QUEST_DEFS = [
    { id: "quest-log5-budget3",  title: "Disciplined Week",    description: "Log expenses 5 days and stay under budget on at least 3",   icon: "\u26A1",         conditions: [{ type: "log_days", target: 5 }, { type: "under_budget_days", target: 3 }],     xpReward: 150, sentimosReward: 50 },
    { id: "quest-log7",          title: "Logging Habit",       description: "Log at least 1 expense every day for 7 days",                icon: "\uD83D\uDCC5",   conditions: [{ type: "log_days", target: 7 }],                                               xpReward: 200, sentimosReward: 50 },
    { id: "quest-budget-every-day", title: "Budget Warrior",   description: "Stay under your daily budget every day this week",           icon: "\uD83D\uDEE1\uFE0F", conditions: [{ type: "no_overspend_days", target: 7 }],                                   xpReward: 175, sentimosReward: 50 },
    { id: "quest-early-riser",   title: "Early Riser",         description: "Log before noon on 3 different days",                        icon: "\uD83C\uDF05",   conditions: [{ type: "log_days_before_noon", target: 3 }],                                   xpReward: 100, sentimosReward: 50 },
    { id: "quest-big-logger",    title: "Big Logger",          description: "Log 10 or more expenses this week",                          icon: "\uD83D\uDCCB",   conditions: [{ type: "log_count", target: 10 }],                                             xpReward: 120, sentimosReward: 50 },
    { id: "quest-night-owl",     title: "Night Owl",           description: "Log after 9 PM on 2 different days",                         icon: "\uD83C\uDF19",   conditions: [{ type: "log_days_after_9pm", target: 2 }],                                     xpReward: 100, sentimosReward: 50 },
    { id: "quest-frugal-run",    title: "Frugal Run",          description: "Spend 50% or less of your weekly budget",                    icon: "\uD83D\uDCB0",   conditions: [{ type: "frugal_week", target: 1 }],                                            xpReward: 175, sentimosReward: 50 },
    { id: "quest-15-logs",       title: "Expense Marathon",    description: "Log 15 or more expenses this week",                          icon: "\uD83C\uDFC3",   conditions: [{ type: "log_count", target: 15 }],                                             xpReward: 160, sentimosReward: 60 },
    { id: "quest-5-budget-days", title: "Five-Day Discipline", description: "Stay under your daily budget on 5 different days",           icon: "\uD83D\uDEE1\uFE0F", conditions: [{ type: "under_budget_days", target: 5 }],                                   xpReward: 150, sentimosReward: 50 },
    { id: "quest-combo-week",    title: "Balanced Week",       description: "Log 5 days this week and stay under budget on 3 of them",    icon: "\u2696\uFE0F",   conditions: [{ type: "log_days", target: 5 }, { type: "under_budget_days", target: 3 }],     xpReward: 180, sentimosReward: 60 },
    { id: "quest-variety-week",  title: "Variety Pack",        description: "Log expenses in at least 4 different categories this week",  icon: "\uD83C\uDFAF",   conditions: [{ type: "category_diversity_week", target: 4 }],                                xpReward: 140, sentimosReward: 50 },
    { id: "quest-xp-200",        title: "XP Grinder",          description: "Earn 200 XP this week by logging and staying on budget",     icon: "\u26A1",         conditions: [{ type: "xp_earned_week", target: 200 }],                                       xpReward: 200, sentimosReward: 75 }
  ];

  // ── Compute progress for ALL weekly quests from expense history ─────────────

  function getWeekStart() {
    var now  = new Date();
    var day  = now.getDay(); // 0=Sun 1=Mon
    var diff = (day === 0) ? -6 : 1 - day;
    var mon  = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  // ── Weekly quest pool (5 per week, rotates every Monday) ─────────────────────

  function getWeeklyQuestPool() {
    var weekStart = getWeekStart();
    var weekIndex = Math.floor(weekStart.getTime() / (7 * 24 * 3600 * 1000));
    var offset    = (weekIndex * 5) % WEEKLY_QUEST_DEFS.length;
    var pool      = [];
    for (var i = 0; i < 5; i++) {
      pool.push(WEEKLY_QUEST_DEFS[(offset + i) % WEEKLY_QUEST_DEFS.length]);
    }
    return pool;
  }

  function computeAllQuestProgress(expenses, weeklyBudget, assignedAt) {
    var weekStart = getWeekStart();
    var now       = new Date();

    // Use assignedAt as the cutoff if it is more recent than weekStart (forward-looking)
    var cutoff = weekStart;
    if (assignedAt) {
      var atDate = new Date(assignedAt);
      if (!isNaN(atDate.getTime()) && atDate > weekStart) { cutoff = atDate; }
    }

    // Filter to this week's expenses (or from assignedAt if it's more recent)
    var weekExp = expenses.filter(function (e) {
      return new Date(e.timestamp) >= cutoff;
    });

    // Build per-day buckets
    var byDay = {};
    weekExp.forEach(function (e) {
      var d = new Date(e.timestamp);
      var key = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
      if (!byDay[key]) { byDay[key] = []; }
      byDay[key].push(e);
    });

    var dailyLimit = weeklyBudget > 0 ? weeklyBudget / 7 : 0;

    // Count metrics
    var totalCount    = weekExp.length;
    var totalSpent    = weekExp.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
    var logDays       = Object.keys(byDay).length;
    var underBudgetDays = 0;
    var noOverspendDays = 0;
    var beforeNoonDays  = {};
    var after9pmDays    = {};
    var categories      = {};

    Object.keys(byDay).forEach(function (key) {
      var dayExps = byDay[key];
      var daySpent = dayExps.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
      if (dailyLimit > 0 && daySpent <= dailyLimit)  { underBudgetDays++; }
      if (dailyLimit > 0 && daySpent <= dailyLimit)  { noOverspendDays++; }
      dayExps.forEach(function (e) {
        var h = new Date(e.timestamp).getHours();
        if (h < 12)  { beforeNoonDays[key] = true; }
        if (h >= 21) { after9pmDays[key]   = true; }
        if (e.category) { categories[e.category] = true; }
      });
    });

    var beforeNoonCount = Object.keys(beforeNoonDays).length;
    var after9pmCount   = Object.keys(after9pmDays).length;
    var categoryCount   = Object.keys(categories).length;
    var frugalMet       = weeklyBudget > 0 && totalSpent <= weeklyBudget * 0.5 ? 1 : 0;
    // XP earned this week: approximate from logged expenses × 5 capped at daily cap
    var xpEarned = Math.min(logDays * 25, totalCount * 5);

    var progressMap = {};
    WEEKLY_QUEST_DEFS.forEach(function (q) {
      progressMap[q.id] = q.conditions.map(function (c) {
        var prog = 0;
        if (c.type === "log_days")               { prog = Math.min(c.target, logDays); }
        else if (c.type === "log_count")         { prog = Math.min(c.target, totalCount); }
        else if (c.type === "under_budget_days") { prog = Math.min(c.target, underBudgetDays); }
        else if (c.type === "no_overspend_days") { prog = Math.min(c.target, noOverspendDays); }
        else if (c.type === "log_days_before_noon") { prog = Math.min(c.target, beforeNoonCount); }
        else if (c.type === "log_days_after_9pm")   { prog = Math.min(c.target, after9pmCount); }
        else if (c.type === "frugal_week")           { prog = frugalMet; }
        else if (c.type === "category_diversity_week") { prog = Math.min(c.target, categoryCount); }
        else if (c.type === "xp_earned_week")        { prog = Math.min(c.target, xpEarned); }
        return { type: c.type, target: c.target, progress: prog };
      });
    });
    return progressMap;
  }

  // ── Quest card HTML builder (shared between spotlight + catalog) ─────────────

  function buildQuestCardHtml(qDef, computedConditions, opts) {
    // opts: { tracked, showTrackBtn, showClaimBtn, compact, claimed }
    opts = opts || {};
    var allDone = opts.claimed || computedConditions.every(function (c) { return c.progress >= c.target; });

    // Overall progress for the first / primary condition
    var primaryCond = computedConditions[0] || { progress: 0, target: 1 };
    var overallPct  = Math.min(100, Math.round(
      (computedConditions.reduce(function (s, c) { return s + c.progress; }, 0) /
       computedConditions.reduce(function (s, c) { return s + c.target;   }, 0)) * 100
    ));
    var barColor = allDone ? "#2b8259" : "#EAB308";

    // Reward badge removed from header grid (now grouped in footer)

    // Inline tracking state chip (below description)
    var trackingChip = "";
    if (opts.claimed) {
      trackingChip = "<span style=\"display:inline-block;margin-top:0.4rem;background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.3);border-radius:999px;padding:0.15rem 0.6rem;font-size:0.7rem;font-weight:900\">\u2713 Claimed</span>";
    } else if (opts.tracked && allDone) {
      trackingChip = "<span style=\"display:inline-block;margin-top:0.4rem;background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.3);border-radius:999px;padding:0.15rem 0.6rem;font-size:0.7rem;font-weight:900\">\u2713 Done</span>";
    } else if (opts.tracked) {
      trackingChip = "<span style=\"display:inline-block;margin-top:0.4rem;background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.3);border-radius:999px;padding:0.15rem 0.6rem;font-size:0.7rem;font-weight:900\">\uD83D\uDCCC Tracking</span>";
    }

    // Condition bars
    var condsHtml = "";
    computedConditions.forEach(function (c) {
      var pct  = Math.min(100, Math.round((c.progress / c.target) * 100));
      var done = c.progress >= c.target;
      var labelBase = COND_LABELS[c.type] || c.type;
      var unit      = COND_UNITS[c.type]  || "";
      var label     = (c.target > 1 && unit) ? (labelBase + " " + c.target + " " + unit) : labelBase;
      condsHtml +=
        "<div style=\"margin-top:" + (opts.compact ? "0.5rem" : "0.75rem") + "\">" +
          (computedConditions.length > 1
            ? "<p class=\"text-xs font-semibold\" style=\"color:#475569;margin-bottom:0.3rem\">" + label.trim() + "</p>"
            : "") +
          "<div class=\"relative overflow-hidden rounded-full\" style=\"height:1.25rem;background:#e7e0cf\">" +
            "<div class=\"h-full rounded-full\" style=\"width:" + pct + "%;background:" + (done ? "#2b8259" : "#EAB308") + ";transition:width 0.7s\"></div>" +
            "<span class=\"absolute inset-0 flex items-center justify-center text-xs font-black\" style=\"color:#102b1d\">" + c.progress + " / " + c.target + "</span>" +
          "</div>" +
        "</div>";
    });

    // Footer row
    var claimedBadgeHtml = "";
    if (opts.claimed) {
      claimedBadgeHtml = "<span class=\"rounded-full text-sm font-black\" style=\"background:#edf7ef;color:#164f33;padding:0.4rem 1rem;outline:1px solid rgba(43,130,89,0.3)\">\u2713 Claimed</span>";
    }
    var claimHtml = "";
    if (!opts.claimed && allDone && opts.showClaimBtn) {
      claimHtml = "<button type=\"button\" class=\"quest-claim-btn rounded-full text-sm font-black text-white\" style=\"background:#0D9488;padding:0.5rem 1.25rem;outline:none;cursor:pointer;border:none\">Claim</button>";
    }
    var trackHtml = "";
    if (!opts.claimed && !opts.tracked && opts.showTrackBtn) {
      trackHtml = "<button type=\"button\" class=\"quest-track-btn rounded-full text-sm font-black\" style=\"background:transparent;color:#164f33;padding:0.4rem 1rem;outline:1px solid #164f33;cursor:pointer;border:none\" data-quest-id=\"" + qDef.id + "\">Track \u2192</button>";
    }

    var footerRight = claimedBadgeHtml || claimHtml || trackHtml;
    var footerHtml =
      "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
        "<div class=\"flex items-center gap-2\">" +
          "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">\u26A1 +" + qDef.xpReward + " XP</p>" +
          "<span style=\"color:#d1d5db;font-size:0.75rem\">\u00B7</span>" +
          "<p class=\"text-xs font-extrabold\" style=\"color:#0f766e\">+\u20B5" + qDef.sentimosReward + "</p>" +
        "</div>" +
        footerRight +
      "</div>";

    var bgColor = allDone ? "#f0fdf4" : "#ffffff";
    var shadow  = allDone
      ? "0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(43,130,89,0.25)"
      : "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px #ded7c6";

    return (
      "<div class=\"relative rounded-[2rem] p-5\" style=\"background:" + bgColor + ";box-shadow:" + shadow + "\">" +
        "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr\">" +
          "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;outline:1px solid #cfe2d3\" aria-hidden=\"true\">" + qDef.icon + "</div>" +
          "<div class=\"min-w-0\">" +
            "<h3 class=\"font-display text-lg font-black\" style=\"color:#102b1d\">" + qDef.title + "</h3>" +
            "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + qDef.description + "</p>" +
            trackingChip +
            condsHtml +
          "</div>" +
        "</div>" +
        footerHtml +
      "</div>"
    );
  }

  // ── Difficulty dots helper ──────────────────────────────────────────────────

  function buildDifficultyDots(xpReward) {
    var count = xpReward <= 100 ? 1 : xpReward <= 125 ? 2 : xpReward <= 160 ? 3 : xpReward <= 175 ? 4 : 5;
    var html = "";
    for (var i = 0; i < 5; i++) {
      html += "<span style=\"display:inline-block;width:0.45rem;height:0.45rem;border-radius:50%;background:" + (i < count ? "#EAB308" : "rgba(255,255,255,0.25)") + ";margin-right:0.2rem\"></span>";
    }
    return html;
  }

  function buildDifficultyDotsDark(xpReward) {
    var count = xpReward <= 100 ? 1 : xpReward <= 125 ? 2 : xpReward <= 160 ? 3 : xpReward <= 175 ? 4 : 5;
    var html = "";
    for (var i = 0; i < 5; i++) {
      html += "<span style=\"display:inline-block;width:0.4rem;height:0.4rem;border-radius:50%;background:" + (i < count ? "#EAB308" : "#e7e0cf") + ";margin-right:0.2rem\"></span>";
    }
    return html;
  }

  // ── Inline Tigom mascot (scaled for spotlight card) ────────────────────────

  function buildTigomHtml(mood) {
    // mood: "happy" | "neutral" | "worried" — same styles as dashboard applyTigomFaceMood
    var mouthStyle;
    if (mood === "happy") {
      mouthStyle = "position:absolute;bottom:26%;left:50%;transform:translateX(-50%);height:1rem;width:2rem;border-bottom:4px solid rgba(255,255,255,0.85);border-radius:0 0 9999px 9999px";
    } else if (mood === "worried") {
      mouthStyle = "position:absolute;bottom:22%;left:50%;transform:translateX(-50%);height:1rem;width:2rem;border-top:4px solid rgba(255,255,255,0.85);border-radius:9999px 9999px 0 0";
    } else {
      mouthStyle = "position:absolute;bottom:27%;left:50%;transform:translateX(-50%);height:0.25rem;width:2rem;background:rgba(255,255,255,0.85);border-radius:9999px";
    }
    return (
      "<div style=\"position:relative;height:3.5rem;width:3.5rem;flex-shrink:0\" aria-hidden=\"true\">" +
        "<div style=\"position:absolute;left:0.3rem;top:0;height:1rem;width:1rem;border-radius:50%;background:rgba(255,255,255,0.25)\"></div>" +
        "<div style=\"position:absolute;right:0.3rem;top:0;height:1rem;width:1rem;border-radius:50%;background:rgba(255,255,255,0.25)\"></div>" +
        "<div style=\"position:absolute;inset:0.25rem;border-radius:38% 38% 44% 44%;background:rgba(255,255,255,0.18);box-shadow:inset 0 -6px 0 rgba(0,0,0,0.1)\"></div>" +
        "<div style=\"position:absolute;left:27%;top:36%;height:0.625rem;width:0.625rem;border-radius:50%;background:rgba(255,255,255,0.7)\"></div>" +
        "<div style=\"position:absolute;right:27%;top:36%;height:0.625rem;width:0.625rem;border-radius:50%;background:rgba(255,255,255,0.7)\"></div>" +
        "<div style=\"position:absolute;left:31%;top:39%;height:0.5rem;width:0.5rem;border-radius:50%;background:rgba(255,255,255,0.95)\"></div>" +
        "<div style=\"position:absolute;right:31%;top:39%;height:0.5rem;width:0.5rem;border-radius:50%;background:rgba(255,255,255,0.95)\"></div>" +
        "<div style=\"" + mouthStyle + "\"></div>" +
        "<div style=\"position:absolute;bottom:-0.25rem;left:50%;transform:translateX(-50%);height:1.1rem;width:1.4rem;border-radius:50%;background:rgba(247,243,232,0.95);display:flex;align-items:center;justify-content:center;font-size:0.5rem;font-weight:900;color:#164f33\">\u20B1</div>" +
      "</div>"
    );
  }

  // ── Active Quest Spotlight ──────────────────────────────────────────────────

  function renderActiveQuestSpotlight() {
    var section = document.getElementById("activeQuestSpotlight");
    if (!section || !window.StorageAPI) { return; }

    var activeQuest  = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    var expenses     = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var summary      = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var weeklyBudget = summary.weeklyBudget || 0;
    var progressMap  = computeAllQuestProgress(expenses, weeklyBudget, activeQuest ? activeQuest.assignedAt : null);

    var headerHtml =
      "<div class=\"mb-4\">" +
        "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.2em;color:#6b756c\">Active Quest</p>" +
        "<h2 class=\"font-display text-2xl font-extrabold tracking-tight\" style=\"color:#102b1d\">Equipped Quest</h2>" +
      "</div>";

    if (!activeQuest) {
      section.innerHTML =
        headerHtml +
        "<div class=\"rounded-[2rem] p-6\" style=\"border:2px dashed rgba(43,130,89,0.35);background:rgba(237,247,239,0.4)\">" +
          "<div class=\"flex flex-col items-center gap-4 py-4 text-center\">" +
            "<div class=\"grid h-16 w-16 place-items-center rounded-2xl text-4xl\" style=\"background:rgba(22,79,51,0.08);outline:1px dashed rgba(43,130,89,0.35)\">\uD83D\uDCC2</div>" +
            "<div>" +
              "<p class=\"font-display text-xl font-black\" style=\"color:#102b1d\">No quest equipped</p>" +
              "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">Track a quest from the pool below \u2014 it\u2019ll appear here and on your dashboard.</p>" +
            "</div>" +
            "<button type=\"button\" id=\"scrollToCatalogBtn\" class=\"rounded-full text-sm font-black text-white\" style=\"background:#164f33;padding:0.65rem 1.5rem;border:none;cursor:pointer\">Browse quests \u2193</button>" +
          "</div>" +
        "</div>";
      var scrollBtn = document.getElementById("scrollToCatalogBtn");
      if (scrollBtn) {
        scrollBtn.addEventListener("click", function () {
          var catalog = document.getElementById("weeklyQuestCatalog");
          if (catalog) { catalog.scrollIntoView({ behavior: "smooth" }); }
        });
      }
      return;
    }

    // Find definition
    var isDaily = activeQuest.type === "daily";
    var qDef = null;
    if (isDaily) {
      // Daily quest — use data from activeQuest directly (already has progress).
      // Include type:"daily" and assignedAt so claimQuestReward uses the correct
      // daily claim key (questId:today) instead of defaulting to "weekly" (questId:monday).
      qDef = { type: "daily", assignedAt: activeQuest.assignedAt, id: activeQuest.id, title: activeQuest.title, icon: activeQuest.icon || "\u26A1", description: activeQuest.description || "", conditions: activeQuest.conditions || [], xpReward: activeQuest.xpReward || 0, sentimosReward: activeQuest.sentimosReward !== undefined ? activeQuest.sentimosReward : 10 };
    } else {
      for (var i = 0; i < WEEKLY_QUEST_DEFS.length; i++) {
        if (WEEKLY_QUEST_DEFS[i].id === activeQuest.id) { qDef = WEEKLY_QUEST_DEFS[i]; break; }
      }
      if (!qDef) { qDef = { id: activeQuest.id, title: activeQuest.title, icon: activeQuest.icon || "\u26A1", description: activeQuest.description || "", conditions: activeQuest.conditions || [], xpReward: activeQuest.xpReward || 0, sentimosReward: activeQuest.sentimosReward || 0 }; }
    }

    var computedConds;
    if (isDaily) {
      // Forward-looking: recompute daily progress from assignedAt cutoff
      var dailyDef = null;
      for (var di = 0; di < DAILY_QUEST_DEFS.length; di++) {
        if (DAILY_QUEST_DEFS[di].id === activeQuest.id) { dailyDef = DAILY_QUEST_DEFS[di]; break; }
      }
      if (dailyDef && activeQuest.assignedAt) {
        var assignedAtDate = new Date(activeQuest.assignedAt);
        var todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        var fwdExp = expenses.filter(function (e) {
          var d = new Date(e.timestamp);
          return d >= assignedAtDate && d <= todayEnd;
        });
        var dRes = dailyDef.compute(fwdExp, weeklyBudget);
        computedConds = [{ type: (activeQuest.conditions[0] || {}).type || "log_count_today", target: dRes.target, progress: dRes.progress }];
      } else {
        computedConds = (activeQuest.conditions || []).map(function (c) {
          return { type: c.type, target: c.target, progress: c.progress || 0 };
        });
      }
    } else {
      computedConds = progressMap[qDef.id] || (activeQuest.conditions || []).map(function (c) {
        return { type: c.type, target: c.target, progress: c.progress || 0 };
      });
    }
    var allDone = computedConds.every(function (c) { return c.progress >= c.target; });
    if (activeQuest.completedAt) { allDone = true; }

    // Claimed-state lock: permanently override to 100% if already claimed
    var isClaimed = window.StorageAPI.isQuestClaimed ? window.StorageAPI.isQuestClaimed(qDef.id, isDaily ? "daily" : "weekly") : false;
    if (isClaimed) {
      computedConds = computedConds.map(function (c) { return { type: c.type, target: c.target, progress: c.target }; });
      allDone = true;
    }
    // completedAt lock: lock bars to 100% so the display matches authoritative storage state
    // (recomputed progress can desync from stored progress when the forward-looking filter
    // excludes expenses that storage counted, producing a lower number in the bars).
    if (activeQuest.completedAt && !isClaimed) {
      computedConds = computedConds.map(function (c) { return { type: c.type, target: c.target, progress: c.target }; });
    }

    var nextMon = new Date(getWeekStart());
    nextMon.setDate(nextMon.getDate() + 7);
    var daysLeft = Math.ceil((nextMon.getTime() - new Date().getTime()) / 86400000);
    var timeLeftLabel = isDaily ? "Resets tonight" : (daysLeft <= 1 ? "Resets tomorrow" : daysLeft + " days left");

    // Build condition bars (page-style — matching daily quests)
    var condsHtml = "";
    computedConds.forEach(function (c) {
      var pct  = Math.min(100, Math.round((c.progress / c.target) * 100));
      var done = c.progress >= c.target;
      var labelBase = COND_LABELS[c.type] || c.type;
      var unit      = COND_UNITS[c.type]  || "";
      var label     = (c.target > 1 && unit) ? (labelBase + " " + c.target + " " + unit) : labelBase;
      condsHtml +=
        "<div style=\"margin-top:0.75rem\">" +
          (computedConds.length > 1
            ? "<p class=\"text-xs font-semibold\" style=\"color:#475569;margin-bottom:0.3rem\">" + label.trim() + "</p>"
            : "") +
          "<div class=\"relative overflow-hidden rounded-full\" style=\"height:1.25rem;background:#e7e0cf\">" +
            "<div class=\"h-full rounded-full\" style=\"width:" + pct + "%;background:" + (done ? "#2b8259" : "#EAB308") + ";transition:width 0.7s\"></div>" +
            "<span class=\"absolute inset-0 flex items-center justify-center text-xs font-black\" style=\"color:#102b1d\">" + c.progress + " / " + c.target + "</span>" +
          "</div>" +
        "</div>";
    });

    var cardHtml;
    if (allDone) {
      // Completed — green-tinted card; show Claimed badge if already claimed
      var spotlightDoneChip = isClaimed
        ? "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.3)\">\u2713 Claimed</div>"
        : "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.3)\">\u2713 Done</div>";
      var spotlightActionHtml = isClaimed
        ? "<span class=\"rounded-full text-sm font-black\" style=\"background:#edf7ef;color:#164f33;padding:0.4rem 1.25rem;outline:1px solid rgba(43,130,89,0.3)\">\u2713 Claimed</span>"
        : "<button type=\"button\" id=\"questClaimBtn\" class=\"rounded-full text-sm font-black text-white\" style=\"background:#164f33;padding:0.5rem 1.25rem;border:none;cursor:pointer\">\u26A1 Claim Reward</button>";
      cardHtml =
        "<div class=\"relative rounded-[2rem] p-5\" style=\"background:#f0fdf4;box-shadow:0 1px 4px rgba(0,0,0,0.05),0 0 0 2px rgba(43,130,89,0.25)\">" +
          "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr auto\">" +
            "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;outline:1px solid #cfe2d3\" aria-hidden=\"true\">" + qDef.icon + "</div>" +
            "<div class=\"min-w-0\">" +
              "<h3 class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#102b1d\">" + qDef.title + "</h3>" +
              "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + qDef.description + "</p>" +
              condsHtml +
            "</div>" +
            spotlightDoneChip +
          "</div>" +
          "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
            "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">+" + qDef.xpReward + " XP \u00B7 +\u20B5" + qDef.sentimosReward + "</p>" +
            spotlightActionHtml +
          "</div>" +
        "</div>";
    } else {
      // In-progress — white card matching page style, clickable for details
      cardHtml =
        "<div class=\"relative rounded-[2rem] p-5\" style=\"background:#ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.06),0 0 0 1px #ded7c6;cursor:pointer\" role=\"button\" tabindex=\"0\" id=\"activeQuestCard\">" +
          "<div class=\"mb-3 flex items-center gap-2\">" +
            "<span class=\"text-xs font-black\" style=\"background:#edf7ef;color:#164f33;padding:0.2rem 0.6rem;border-radius:999px;outline:1px solid rgba(43,130,89,0.3)\">\uD83D\uDCCC Tracking</span>" +
            "<span class=\"text-xs font-semibold\" style=\"color:#617063\">" + timeLeftLabel + "</span>" +
          "</div>" +
          "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr\">" +
            "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;outline:1px solid #cfe2d3\" aria-hidden=\"true\">" + qDef.icon + "</div>" +
            "<div class=\"min-w-0\">" +
              "<h3 class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#102b1d\">" + qDef.title + "</h3>" +
              "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + qDef.description + "</p>" +
              condsHtml +
            "</div>" +
          "</div>" +
          "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
            "<div class=\"flex items-center gap-2\">" +
              "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">\u26A1 +" + qDef.xpReward + " XP</p>" +
              "<span style=\"color:#d1d5db;font-size:0.75rem\">&middot;</span>" +
              "<p class=\"text-xs font-extrabold\" style=\"color:#0f766e\">+\u20B5" + qDef.sentimosReward + "</p>" +
            "</div>" +
            "<div class=\"flex items-center gap-2\">" +
              "<button type=\"button\" id=\"questAbandonBtn\" class=\"rounded-full text-xs font-black\" style=\"background:transparent;color:#617063;padding:0.4rem 0.85rem;outline:1px solid #d1d5db;cursor:pointer;border:none\">Abandon</button>" +
              "<button type=\"button\" id=\"questChangeBtn\" class=\"rounded-full text-xs font-black\" style=\"background:transparent;color:#164f33;padding:0.4rem 0.85rem;outline:1px solid #164f33;cursor:pointer;border:none\">Change \u2192</button>" +
            "</div>" +
          "</div>" +
        "</div>";
    }

    section.innerHTML = headerHtml + cardHtml;

    // Wire buttons
    var abandonBtn = document.getElementById("questAbandonBtn");
    if (abandonBtn) {
      abandonBtn.addEventListener("click", function (e) { e.stopPropagation(); abandonQuest(); });
    }
    var changeBtn = document.getElementById("questChangeBtn");
    if (changeBtn) {
      changeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openChangeQuestSheet();
      });
    }
    var activeCard = document.getElementById("activeQuestCard");
    if (activeCard && !isDaily) {
      activeCard.addEventListener("click", function () {
        var questForSheet = Object.assign({}, qDef, { conditions: computedConds, expiresAt: nextMon.toISOString(), completedAt: null });
        openQuestDetailSheet(questForSheet);
      });
      activeCard.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { activeCard.click(); } });
    }
    var claimBtn = document.getElementById("questClaimBtn");
    if (claimBtn) {
      claimBtn.addEventListener("click", function () {
        if (!window.StorageAPI || !window.StorageAPI.claimQuestReward) { return; }
        var result = window.StorageAPI.claimQuestReward(qDef.id, qDef);
        if (!result || !result.ok) {
          if (result && result.alreadyClaimed) {
            showSimpleToast("\u2713 Reward already claimed!", "#475569");
          }
          return;
        }
        dispatchQuestBadge();
        // Show the celebration modal — auto-suggest next quest is handled inside "Continue"
        showQuestCelebrationModal({
          title: result.title,
          xpReward: result.xpReward,
          sentimosReward: result.sentimosReward,
          claimedQuestId: qDef.id
        });
      });
    }
  }

  // ── Utility helpers ─────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showSimpleToast(message, bgColor) {
    bgColor = bgColor || "#164f33";
    var existing = document.getElementById("questSimpleToast");
    if (existing) { existing.remove(); }
    var toast = document.createElement("div");
    toast.id = "questSimpleToast";
    toast.style.cssText = "position:fixed;bottom:5.5rem;left:50%;transform:translateX(-50%);background:" + bgColor + ";color:white;padding:0.65rem 1.25rem;border-radius:999px;font-size:0.85rem;font-weight:800;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);white-space:nowrap;transition:opacity 0.4s;";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = "0"; setTimeout(function () { toast.remove(); }, 450); }, 3000);
  }

  // ── Quest Celebration Modal (1:1 match with App.tsx CelebrationModal) ────────

  function showQuestCelebrationModal(data) {
    // data: { title, xpReward, sentimosReward, claimedQuestId }
    var existing = document.getElementById("questCelebrationModal");
    if (existing) { existing.remove(); }

    // Inject keyframes once (confetti bounce + Tigom float)
    if (!document.getElementById("questConfettiStyles")) {
      var styleEl = document.createElement("style");
      styleEl.id = "questConfettiStyles";
      styleEl.textContent =
        "@keyframes questConfettiBounce{" +
          "0%,100%{transform:translateY(0) scale(1);opacity:1}" +
          "50%{transform:translateY(-14px) scale(1.15);opacity:0.9}" +
        "}" +
        "@keyframes questTigomFloat{" +
          "0%,100%{transform:translateY(0)}" +
          "50%{transform:translateY(-8px)}" +
        "}";
      document.head.appendChild(styleEl);
    }

    var modal = document.createElement("div");
    modal.id = "questCelebrationModal";
    // z-index 9990 ensures it sits above all overlays (center-modal-overlay is 860)
    modal.style.cssText = "position:fixed;inset:0;z-index:9990;background:#164f33;display:grid;place-items:center;padding:1.5rem;text-align:center;color:white;overflow:auto;";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Quest complete celebration");

    var dotBase = "position:absolute;border-radius:50%;animation:questConfettiBounce 1.8s ease-in-out infinite;";

    // Tigom mascot at lg size (6rem × 6rem) with float animation — matches TigomFace size="lg"
    var tigomInnerHtml = buildTigomHtml("happy");
    var tigomWrapHtml =
      "<div style=\"display:flex;justify-content:center;margin:0 auto 1.5rem auto\">" +
        "<div style=\"" +
          "width:6rem;height:6rem;" +
          "position:relative;" +
          "animation:questTigomFloat 3s ease-in-out infinite;" +
          "flex-shrink:0" +
        "\">" +
          // Re-render at the correct size by scaling the 3.5rem Tigom up to fill 6rem
          "<div style=\"" +
            "transform:scale(" + (96 / 56).toFixed(4) + ");" +
            "transform-origin:top left;" +
            "position:absolute;top:0;left:0;width:3.5rem;height:3.5rem" +
          "\">" +
            tigomInnerHtml +
          "</div>" +
        "</div>" +
      "</div>";

    modal.innerHTML =
      // 3 confetti dots matching brief: yellow top-left, teal top-right, white bottom-left
      "<div style=\"" + dotBase + "top:2.5rem;left:2rem;width:1.25rem;height:1.25rem;background:#EAB308;animation-delay:0s\"></div>" +
      "<div style=\"" + dotBase + "top:6rem;right:2.5rem;width:1rem;height:1rem;background:#0D9488;animation-delay:0.3s\"></div>" +
      "<div style=\"" + dotBase + "bottom:5rem;left:3.5rem;width:1rem;height:1rem;background:white;animation-delay:0.6s\"></div>" +
      // Content (max-w-md = 28rem)
      "<div style=\"max-width:28rem;width:100%\">" +
        tigomWrapHtml +
        // Label — 0.875rem, tracking-[0.28em] matches brief `text-sm font-extrabold uppercase tracking-[0.28em]`
        "<p style=\"font-size:0.875rem;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin:0 0 0.75rem 0\">" +
          "Celebration moment" +
        "</p>" +
        // Title — font-display text-5xl (3rem) font-black tracking-tight
        "<h2 style=\"font-family:'Sora',sans-serif;font-size:3rem;font-weight:900;letter-spacing:-0.02em;line-height:1.1;margin:0 0 1rem 0\">" +
          "Quest complete!" +
        "</h2>" +
        // Subtitle — text-lg (1.125rem) font-semibold text-white/78
        "<p style=\"font-size:1.125rem;font-weight:600;color:rgba(255,255,255,0.78);margin:0 0 1.5rem 0\">" +
          escapeHtml(data.title) + " is claimed. Tigom added the reward to your shop balance." +
        "</p>" +
        // Reward — font-display text-4xl (2.25rem) font-black text-[#EAB308]; format: +XP XP · +₵N
        "<p style=\"font-family:'Sora',sans-serif;font-size:2.25rem;font-weight:900;color:#EAB308;margin:0 0 2rem 0\">" +
          "+" + data.xpReward + " XP \u00B7 +\u20B5" + data.sentimosReward +
        "</p>" +
        // Continue button — rounded-2xl (1rem) bg-white text-[#164f33] px-5 py-4
        "<button type=\"button\" id=\"celebrationContinueBtn\" " +
          "style=\"display:block;width:100%;background:white;color:#164f33;border:none;border-radius:1rem;padding:1rem 1.25rem;font-size:0.875rem;font-weight:900;cursor:pointer;font-family:inherit;\">" +
          "Continue" +
        "</button>" +
      "</div>";

    document.body.appendChild(modal);

    document.getElementById("celebrationContinueBtn").addEventListener("click", function () {
      modal.remove();

      // Auto-suggest next quest: daily first, then weekly
      var freshExp = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
      var freshSum = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
      var wb = freshSum.weeklyBudget || 0;
      var now = new Date();
      var todayKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
      var todayE = freshExp.filter(function (e) { return e.timestamp && e.timestamp.slice(0, 10) === todayKey; });

      // Search daily quests first
      var nextQ = null;
      var nextQType = null;
      for (var di = 0; di < DAILY_QUEST_DEFS.length; di++) {
        var dDef = DAILY_QUEST_DEFS[di];
        if (dDef.id === data.claimedQuestId) { continue; }
        var dResult = dDef.compute(todayE, wb);
        var isDone = (dResult.progress || 0) >= (dResult.target || 1);
        var isClaimed = window.StorageAPI.isQuestClaimed ? window.StorageAPI.isQuestClaimed(dDef.id, "daily") : false;
        if (!isDone && !isClaimed) { nextQ = dDef; nextQType = "daily"; break; }
      }

      // Fallback to weekly pool
      if (!nextQ) {
        var pool = getWeeklyQuestPool();
        var pMap = computeAllQuestProgress(freshExp, wb);
        for (var pi = 0; pi < pool.length; pi++) {
          if (pool[pi].id === data.claimedQuestId) { continue; }
          var pconds = pMap[pool[pi].id] || pool[pi].conditions.map(function (c) {
            return { type: c.type, target: c.target, progress: 0 };
          });
          var wDone = pconds.every(function (c) { return c.progress >= c.target; });
          var wClaimed = window.StorageAPI.isQuestClaimed ? window.StorageAPI.isQuestClaimed(pool[pi].id, "weekly") : false;
          if (!wDone && !wClaimed) { nextQ = pool[pi]; nextQType = "weekly"; break; }
        }
      }

      if (nextQ) {
        if (nextQType === "daily") {
          trackDailyQuest(nextQ);
        } else {
          trackQuest(nextQ);
        }
      } else {
        renderQuestPage();
      }
    });

    // Focus the continue button for accessibility
    setTimeout(function () {
      var btn = document.getElementById("celebrationContinueBtn");
      if (btn) { btn.focus(); }
    }, 50);
  }

  // ── Abandon Quest ───────────────────────────────────────────────────────────

  function abandonQuest() {
    if (!window.StorageAPI || !window.StorageAPI.setCurrentQuest) { return; } // guard — setCurrentQuest is now exported
    var existing = document.getElementById("questAbandonToast");
    if (existing) { existing.remove(); }
    window.StorageAPI.setCurrentQuest(null);
    window.dispatchEvent(new Event("sugbocents:dataChanged"));
    renderQuestPage();
    var toast = document.createElement("div");
    toast.id = "questAbandonToast";
    toast.style.cssText = "position:fixed;bottom:5.5rem;left:50%;transform:translateX(-50%);background:#475569;color:white;padding:0.65rem 1.25rem;border-radius:999px;font-size:0.85rem;font-weight:800;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);white-space:nowrap;transition:opacity 0.4s;";
    toast.textContent = "\uD83D\uDCC2 Quest abandoned \u2014 slot is open again";
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = "0"; setTimeout(function () { toast.remove(); }, 450); }, 3000);
  }

  // ── Track quest + toast ─────────────────────────────────────────────────────

  function maybeTrackQuest(questDef) {
    // If another quest is already tracked, show replace-confirmation sheet first
    var current = window.StorageAPI && window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    if (current && current.id !== questDef.id) {
      openReplaceQuestSheet(current, questDef, function () { trackQuest(questDef); });
    } else {
      trackQuest(questDef);
    }
  }

  function closeReplaceQuestModal() {
    var ov = document.getElementById("replaceQuestModal");
    if (!ov) { return; }
    ov.classList.remove("is-open");
    setTimeout(function () { if (ov.parentNode) { ov.parentNode.removeChild(ov); } }, 230);
  }

  function openReplaceQuestSheet(currentQuest, newQDef, onConfirmFn) {
    // Remove any stale instance (center modal or old bottom-sheet)
    var stale = document.getElementById("replaceQuestModal") || document.getElementById("replaceQuestSheet");
    if (stale) { stale.parentNode.removeChild(stale); }

    var overlay = document.createElement("div");
    overlay.id = "replaceQuestModal";
    overlay.className = "center-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Replace quest confirmation");

    var card = document.createElement("div");
    card.className = "center-modal-card";

    var reassuranceText = currentQuest.completedAt
      ? "Your reward for \u201c" + escapeHtml(currentQuest.title) + "\u201d is still claimable from the Quests page after switching."
      : "Your progress is saved \u2014 you can re-track any time.";

    card.innerHTML =
      // Header
      "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem\">" +
        "<h2 style=\"font-family:'Sora',sans-serif;font-size:1.15rem;font-weight:800;color:#102b1d;margin:0\">Switch quest?</h2>" +
        "<button type=\"button\" id=\"replaceQuestCloseBtn\" style=\"background:none;border:none;font-size:1.4rem;color:#94a3b8;cursor:pointer;padding:0.25rem 0.5rem;border-radius:999px;line-height:1\">&times;</button>" +
      "</div>" +
      // Currently tracking
      "<p style=\"font-size:0.7rem;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#617063;margin-bottom:0.5rem\">Currently tracking</p>" +
      "<div style=\"border-radius:1.25rem;padding:1rem;display:flex;align-items:center;gap:0.875rem;background:#ffffff;outline:1px solid #ded7c6;margin-bottom:0.875rem\">" +
        "<span style=\"font-size:1.4rem;flex-shrink:0\">" + (currentQuest.icon || "\u26A1") + "</span>" +
        "<div style=\"min-width:0\">" +
          "<p style=\"font-size:0.875rem;font-weight:800;color:#102b1d;margin:0\">" + escapeHtml(currentQuest.title) + "</p>" +
          "<p style=\"font-size:0.78rem;font-weight:600;color:#617063;margin:0.15rem 0 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + escapeHtml(currentQuest.description || "") + "</p>" +
        "</div>" +
      "</div>" +
      "<div style=\"text-align:center;color:#9ca3af;font-size:1.2rem;margin-bottom:0.875rem;line-height:1\">&#8595;</div>" +
      // Switch to
      "<p style=\"font-size:0.7rem;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#617063;margin-bottom:0.5rem\">Switch to</p>" +
      "<div style=\"border-radius:1.25rem;padding:1rem;display:flex;align-items:center;gap:0.875rem;background:#f0fdf4;outline:1px solid rgba(43,130,89,0.3);margin-bottom:1rem\">" +
        "<span style=\"font-size:1.4rem;flex-shrink:0\">" + (newQDef.icon || "\u26A1") + "</span>" +
        "<div style=\"min-width:0\">" +
          "<p style=\"font-size:0.875rem;font-weight:800;color:#102b1d;margin:0\">" + escapeHtml(newQDef.title) + "</p>" +
          "<p style=\"font-size:0.78rem;font-weight:600;color:#617063;margin:0.15rem 0 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + escapeHtml(newQDef.description || "") + "</p>" +
        "</div>" +
      "</div>" +
      "<p style=\"font-size:0.78rem;font-weight:500;color:#9ca3af;font-style:italic;text-align:center;margin-bottom:1.25rem\">" + reassuranceText + "</p>" +
      "<div style=\"display:flex;flex-direction:column;gap:0.75rem\">" +
        "<button type=\"button\" id=\"replaceQuestConfirmBtn\" class=\"w-full rounded-full text-sm font-black text-white\" style=\"background:#164f33;padding:0.75rem;border:none;cursor:pointer\">Yes, switch to \u201C" + escapeHtml(newQDef.title) + "\u201D \u2192</button>" +
        "<button type=\"button\" id=\"replaceQuestCancelBtn\" class=\"w-full rounded-full text-sm font-black\" style=\"background:transparent;color:#617063;padding:0.75rem;border:1.5px solid #ded7c6;cursor:pointer\">Keep tracking \u201C" + escapeHtml(currentQuest.title) + "\u201D</button>" +
      "</div>";

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Wire buttons
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { closeReplaceQuestModal(); } });
    document.getElementById("replaceQuestCloseBtn").addEventListener("click", closeReplaceQuestModal);
    document.getElementById("replaceQuestCancelBtn").addEventListener("click", closeReplaceQuestModal);
    document.getElementById("replaceQuestConfirmBtn").addEventListener("click", function () {
      closeReplaceQuestModal();
      if (onConfirmFn) { onConfirmFn(); } else { trackQuest(newQDef); }
    });

    // Entrance animation
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add("is-open"); });
    });
  }

  function trackQuest(questDef) {
    if (!window.StorageAPI || !window.StorageAPI.setCurrentQuest) { return; }
    // Use the Monday of the current week as assignedAt so that all expenses logged
    // this week count toward the quest — tracking mid-week must NOT silently discard
    // Mon/Tue/Wed progress just because the user only picked the quest on Thursday.
    var questToSave = Object.assign({}, questDef, {
      conditions: questDef.conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; }),
      assignedAt: getWeekStart().toISOString(),
      expiresAt: (function () { var m = getWeekStart(); m.setDate(m.getDate() + 7); return m.toISOString(); }()),
      completedAt: null
    });
    window.StorageAPI.setCurrentQuest(questToSave);

    // Notify dashboard to update its quest widget
    window.dispatchEvent(new Event("sugbocents:dataChanged"));

    if (window.AppShell && window.AppShell.closeAllSheets) { window.AppShell.closeAllSheets(); }
    showTrackingToast(questDef.title);
    renderQuestPage();
  }

  function showTrackingToast(title) {
    var existing = document.getElementById("questTrackToast");
    if (existing) { existing.remove(); }
    var toast = document.createElement("div");
    toast.id = "questTrackToast";
    toast.style.cssText = "position:fixed;bottom:5.5rem;left:50%;transform:translateX(-50%);background:#164f33;color:white;padding:0.65rem 1.25rem;border-radius:999px;font-size:0.85rem;font-weight:800;z-index:9999;box-shadow:0 8px 24px rgba(22,79,51,0.3);white-space:nowrap;transition:opacity 0.4s;";
    toast.textContent = "\uD83D\uDCCC Now tracking \u201C" + title + "\u201D on your dashboard";
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "0";
      setTimeout(function () { toast.remove(); }, 450);
    }, 3000);
  }

  // ── Change Quest Bottom Sheet ───────────────────────────────────────────────

  function closeChangeQuestModal() {
    var overlay = document.getElementById("changeQuestModal");
    if (!overlay) { return; }
    overlay.classList.remove("is-open");
    setTimeout(function () { if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); } }, 230);
  }

  function buildChangeQuestRow(icon, title, description, pct, barColor, isTracking, onTrackFn) {
    var row = document.createElement("div");
    row.style.cssText = "background:" + (isTracking ? "#f0fdf4" : "#ffffff") + ";border-radius:1.25rem;padding:0.875rem 1rem;outline:1px solid " + (isTracking ? "rgba(43,130,89,0.35)" : "#ded7c6") + ";display:flex;align-items:center;gap:0.875rem;";

    var actionHtml;
    if (isTracking) {
      actionHtml = "<span style=\"flex-shrink:0;font-size:0.75rem;font-weight:800;background:#edf7ef;color:#164f33;padding:0.3rem 0.7rem;border-radius:999px;white-space:nowrap;outline:1px solid rgba(43,130,89,0.3)\">\uD83D\uDCCC Tracking</span>";
    } else {
      actionHtml = "<button type=\"button\" class=\"change-quest-track-btn\" style=\"flex-shrink:0;font-size:0.75rem;font-weight:800;background:transparent;color:#164f33;padding:0.3rem 0.7rem;border-radius:999px;outline:1px solid #164f33;cursor:pointer;white-space:nowrap\">Track \u2192</button>";
    }

    row.innerHTML =
      "<div style=\"font-size:1.5rem;flex-shrink:0\">" + icon + "</div>" +
      "<div style=\"min-width:0;flex:1\">" +
        "<p style=\"font-size:0.875rem;font-weight:800;color:#102b1d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + escapeHtml(title) + "</p>" +
        "<p style=\"font-size:0.72rem;font-weight:600;color:#617063;margin-top:0.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + escapeHtml(description) + "</p>" +
        "<div style=\"margin-top:0.4rem;overflow:hidden;border-radius:999px;height:0.5rem;background:#e7e0cf\">" +
          "<div style=\"height:100%;border-radius:999px;background:" + barColor + ";width:" + pct + "%;transition:width 0.7s\"></div>" +
        "</div>" +
      "</div>" +
      actionHtml;

    if (!isTracking && onTrackFn) {
      var btn = row.querySelector(".change-quest-track-btn");
      if (btn) { btn.addEventListener("click", function (e) { e.stopPropagation(); onTrackFn(); }); }
    }
    return row;
  }

  function openChangeQuestSheet() {
    // Remove any stale instance
    var stale = document.getElementById("changeQuestModal");
    if (stale) { stale.parentNode.removeChild(stale); }

    // Always fetch fresh data
    var freshExp     = window.StorageAPI && window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var freshSummary = window.StorageAPI && window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var weeklyBudget = freshSummary.weeklyBudget || 0;
    var progressMap  = computeAllQuestProgress(freshExp, weeklyBudget);
    var activeQuest  = window.StorageAPI && window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    var activeId     = activeQuest ? activeQuest.id : null;

    // Build today's expenses for daily progress
    var todayKey = (function () {
      var n = new Date();
      return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
    }());
    var todayExp = freshExp.filter(function (e) {
      return e.timestamp && e.timestamp.slice(0, 10) === todayKey;
    });

    // Build overlay + card
    var overlay = document.createElement("div");
    overlay.id = "changeQuestModal";
    overlay.className = "center-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Choose a quest to track");

    var card = document.createElement("div");
    card.className = "center-modal-card";

    // Header
    var header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem;";
    header.innerHTML =
      "<h2 style=\"font-family:'Sora',sans-serif;font-size:1.15rem;font-weight:800;color:#102b1d;margin:0\">Choose a quest</h2>" +
      "<button type=\"button\" id=\"changeQuestCloseBtn\" style=\"background:none;border:none;font-size:1.4rem;color:#94a3b8;cursor:pointer;padding:0.25rem 0.5rem;border-radius:999px;line-height:1\">&times;</button>";
    card.appendChild(header);

    var subtitle = document.createElement("p");
    subtitle.style.cssText = "font-size:0.8rem;font-weight:500;color:#617063;margin:0 0 1.25rem 0;";
    subtitle.textContent = "Progress counts for all quests \u2014 tracking pins one to your dashboard.";
    card.appendChild(subtitle);

    // ── Daily Quests Section ──
    var dailyLabel = document.createElement("p");
    dailyLabel.style.cssText = "font-size:0.68rem;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#617063;margin:0 0 0.6rem 0;";
    dailyLabel.textContent = "Daily Quests";
    card.appendChild(dailyLabel);

    var dailyList = document.createElement("div");
    dailyList.style.cssText = "display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1.25rem;";

    DAILY_QUEST_DEFS.forEach(function (def) {
      var result   = def.compute(todayExp, weeklyBudget);
      var progress = result.progress || 0;
      var target   = result.target || 1;
      var pct      = Math.min(100, Math.round((progress / target) * 100));
      var allDone  = progress >= target;
      var isTracking = def.id === activeId;
      var barColor = allDone ? "#2b8259" : "#EAB308";

      var onTrack = (function (d) {
        return function () {
          closeChangeQuestModal();
          maybeTrackDailyQuest(d);
        };
      }(def));

      dailyList.appendChild(buildChangeQuestRow(def.icon, def.title, def.description, pct, barColor, isTracking, allDone ? null : onTrack));
    });
    card.appendChild(dailyList);

    // ── Weekly Quests Section ──
    var weeklyLabel = document.createElement("p");
    weeklyLabel.style.cssText = "font-size:0.68rem;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#617063;margin:0 0 0.6rem 0;";
    weeklyLabel.textContent = "Weekly Quests";
    card.appendChild(weeklyLabel);

    var weeklyList = document.createElement("div");
    weeklyList.style.cssText = "display:flex;flex-direction:column;gap:0.6rem;";

    getWeeklyQuestPool().forEach(function (qDef) {
      var computedConds = progressMap[qDef.id] || qDef.conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; });
      var allDone    = computedConds.every(function (c) { return c.progress >= c.target; });
      var isTracking = qDef.id === activeId;
      var pct        = Math.min(100, Math.round(
        (computedConds.reduce(function (s, c) { return s + c.progress; }, 0) /
         computedConds.reduce(function (s, c) { return s + c.target;   }, 0)) * 100
      ));
      var barColor = allDone ? "#2b8259" : "#EAB308";

      var onTrack = (function (q) {
        return function () {
          closeChangeQuestModal();
          maybeTrackQuest(q);
        };
      }(qDef));

      weeklyList.appendChild(buildChangeQuestRow(qDef.icon, qDef.title, qDef.description, pct, barColor, isTracking, allDone ? null : onTrack));
    });
    card.appendChild(weeklyList);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Close on overlay background click
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { closeChangeQuestModal(); } });
    document.getElementById("changeQuestCloseBtn").addEventListener("click", closeChangeQuestModal);

    // Trigger entrance animation on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add("is-open"); });
    });
  }

  // ── Weekly Quest Catalog — 5 quests per week, rotating pool ─────────────────

  function renderWeeklyQuestCatalog() {
    var section = document.getElementById("weeklyQuestCatalog");
    if (!section || !window.StorageAPI) { return; }

    var expenses     = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var summary      = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var weeklyBudget = summary.weeklyBudget || 0;
    var activeQuest  = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    var activeId     = activeQuest ? activeQuest.id : null;
    // General progress map uses weekStart as cutoff (for non-tracked quests)
    var progressMap  = computeAllQuestProgress(expenses, weeklyBudget);
    // Forward-looking progress map for the actively tracked weekly quest only
    var activeAssignedAt = (activeQuest && activeQuest.type !== "daily") ? activeQuest.assignedAt : null;
    var progressMapTracked = activeAssignedAt
      ? computeAllQuestProgress(expenses, weeklyBudget, activeAssignedAt)
      : progressMap;
    var pool         = getWeeklyQuestPool();

    section.innerHTML =
      "<div class=\"mb-5\">" +
        "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.2em;color:#6b756c\">Weekly Quest Board</p>" +
        "<h2 class=\"font-display text-2xl font-extrabold tracking-tight\" style=\"color:#102b1d\">This week\u2019s quests</h2>" +
        "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">5 quests this week \u00B7 Track one to pin it to your dashboard.</p>" +
      "</div>" +
      "<div id=\"weeklyQuestCards\" class=\"space-y-4\"></div>";

    var listEl = document.getElementById("weeklyQuestCards");
    if (!listEl) { return; }

    var nextMon = new Date(getWeekStart());
    nextMon.setDate(nextMon.getDate() + 7);

    pool.forEach(function (qDef) {
      var isTracked = qDef.id === activeId;
      var isClaimed = window.StorageAPI.isQuestClaimed ? window.StorageAPI.isQuestClaimed(qDef.id, "weekly") : false;
      // Use forward-looking map for the active quest, general map for the rest
      var pMap = isTracked ? progressMapTracked : progressMap;
      var computedConds = pMap[qDef.id] || qDef.conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; });
      // Lock claimed quests into permanently completed visual state
      if (isClaimed) {
        computedConds = computedConds.map(function (c) { return { type: c.type, target: c.target, progress: c.target }; });
      }
      // completedAt lock: trust storage's authoritative completion flag so the
      // Claim button appears even if the recomputed bars are slightly behind.
      if (isTracked && activeQuest && activeQuest.completedAt && !isClaimed) {
        computedConds = computedConds.map(function (c) { return { type: c.type, target: c.target, progress: c.target }; });
      }
      var allDone = isClaimed || (isTracked && activeQuest && Boolean(activeQuest.completedAt)) || computedConds.every(function (c) { return c.progress >= c.target; });

      var wrapper = document.createElement("div");
      wrapper.innerHTML = buildQuestCardHtml(qDef, computedConds, {
        tracked: isTracked,
        showTrackBtn: !isClaimed && !isTracked && !allDone,
        showClaimBtn: !isClaimed && allDone,
        claimed: isClaimed
      });
      var card = wrapper.firstChild;
      if (!card) { return; }
      card.style.cursor = "pointer";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      var trackBtn = card.querySelector(".quest-track-btn");
      if (trackBtn) {
        trackBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          maybeTrackQuest(qDef);
        });
      }

      var claimBtnInCatalog = card.querySelector(".quest-claim-btn");
      if (claimBtnInCatalog) {
        claimBtnInCatalog.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!window.StorageAPI || !window.StorageAPI.claimQuestReward) { return; }
          var result = window.StorageAPI.claimQuestReward(qDef.id, qDef);
          if (!result || !result.ok) {
            if (result && result.alreadyClaimed) { showSimpleToast("\u2713 Reward already claimed!", "#475569"); }
            return;
          }
          dispatchQuestBadge();
          showQuestCelebrationModal({ title: result.title, xpReward: result.xpReward, sentimosReward: result.sentimosReward, claimedQuestId: qDef.id });
        });
      }

      card.addEventListener("click", function () {
        var questForSheet = Object.assign({}, qDef, {
          conditions: computedConds,
          expiresAt: nextMon.toISOString(),
          completedAt: allDone ? new Date().toISOString() : null
        });
        openQuestDetailSheet(questForSheet);
      });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { card.click(); } });

      listEl.appendChild(card);
    });
  }

  // ── Badge count helper ─────────────────────────────────────────────────────
  // Computes completed-but-unclaimed count across ALL daily + weekly pool quests,
  // caches it to localStorage for cross-page persistence, and dispatches the event.

  function dispatchQuestBadge() {
    if (!window.StorageAPI || !window.StorageAPI.isQuestClaimed) { return; }
    var now = new Date();
    var todayKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    var freshExp = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var freshSummary = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var wb = freshSummary.weeklyBudget || 0;
    var todayE = freshExp.filter(function (e) { return e.timestamp && e.timestamp.slice(0, 10) === todayKey; });
    var count = 0;

    DAILY_QUEST_DEFS.forEach(function (def) {
      var r = def.compute(todayE, wb);
      if (!r.unavailable && r.progress >= r.target && !window.StorageAPI.isQuestClaimed(def.id, "daily")) { count++; }
    });

    var pmap = computeAllQuestProgress(freshExp, wb);
    getWeeklyQuestPool().forEach(function (qDef) {
      var conds = pmap[qDef.id] || qDef.conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; });
      if (conds.every(function (c) { return c.progress >= c.target; }) && !window.StorageAPI.isQuestClaimed(qDef.id, "weekly")) { count++; }
    });

    try { localStorage.setItem("sugbocents_unclaimed_quests", String(count)); } catch (_) {}
    window.dispatchEvent(new CustomEvent("sugbocents:questBadgeUpdate", { detail: { count: count } }));
  }

  // ── Main render ────────────────────────────────────────────

  function renderQuestPage() {
    if (!window.StorageAPI) { return; }
    updateDailyResetPill();
    updateWeeklyResetPill();
    renderActiveQuestSpotlight();
    renderDailyQuestsSection();
    renderWeeklyQuestCatalog();
    renderLockedQuestsSection();
    dispatchQuestBadge();
  }

  // ── Init ───────────────────────────────────────────────────

  var _notifiedCompleteIds = {};

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") !== "quests") { return; }
    renderQuestPage();
    setInterval(updateDailyResetPill, 1000);
    window.addEventListener("sugbocents:dataChanged", renderQuestPage);
    window.addEventListener("sugbocents:synced", renderQuestPage);

    // Tracked quest completion — show in-page toast (only once per quest)
    window.addEventListener("sugbocents:questCompleted", function (e) {
      var qid = e.detail && e.detail.questId;
      if (!qid || _notifiedCompleteIds[qid]) { return; }
      _notifiedCompleteIds[qid] = true;
      showSimpleToast("🎉 Quest complete! Scroll down to claim your reward.", "#0f766e");
    });
  });

})();
