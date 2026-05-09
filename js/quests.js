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
    "xp_earned_week":         "Earn"
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
    "xp_earned_week":         "XP"
  };

  // ── Daily Quest Definitions ────────────────────────────────

  var DAILY_QUEST_DEFS = [
    {
      id: "daily-first-log",
      title: "First Log",
      description: "Log at least 1 expense today",
      icon: "\uD83D\uDCDD",
      xpReward: 10,
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
      compute: function (todayExp, weeklyBudget) {
        if (!weeklyBudget || weeklyBudget <= 0) { return { progress: 0, target: 1, unavailable: true }; }
        var dailyLimit = weeklyBudget / 7;
        var spent = todayExp.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
        return { progress: spent <= dailyLimit ? 1 : 0, target: 1 };
      }
    }
  ];

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

    var now      = new Date();
    var today    = new Date(now); today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    var todayExp = expenses.filter(function (e) {
      var d = new Date(e.timestamp);
      return d >= today && d < tomorrow;
    });

    var msLeft = tomorrow.getTime() - now.getTime();
    var hLeft  = Math.ceil(msLeft / 3600000);
    var allDone = DAILY_QUEST_DEFS.every(function (def) {
      var r = def.compute(todayExp, weeklyBudget);
      return (r.progress >= r.target) || r.unavailable;
    });

    if (timerEl) {
      timerEl.textContent = allDone ? "All done today \u2713" : "";
    }

    container.innerHTML = "";

    DAILY_QUEST_DEFS.forEach(function (def) {
      var result        = def.compute(todayExp, weeklyBudget);
      var isDone        = !result.unavailable && result.progress >= result.target;
      var isUnavailable = Boolean(result.unavailable);
      var pct           = isUnavailable ? 0 : Math.min(100, Math.round((result.progress / result.target) * 100));

      var card = document.createElement("div");
      card.className = "relative rounded-[2rem] p-5" + (isUnavailable ? " opacity-50" : "");
      card.style.background = isDone ? "#f0fdf4" : "#ffffff";
      card.style.boxShadow  = isDone
        ? "0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(43,130,89,0.25)"
        : "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px #ded7c6";

      var rewardHtml;
      if (isDone) {
        rewardHtml =
          "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#edf7ef;color:#164f33;box-shadow:0 0 0 1px rgba(43,130,89,0.3)\">\u2713</div>";
      } else {
        rewardHtml =
          "<div class=\"shrink-0 rounded-full px-3 py-2 text-center text-sm font-black\" style=\"background:#f0fdfa;color:#0f766e;box-shadow:0 0 0 1px rgba(13,148,136,0.25);line-height:1.3\">" +
            "\u26A1<br><span style=\"font-size:0.6rem\">+" + def.xpReward + "</span><br><span style=\"font-size:0.58rem\">XP</span>" +
          "</div>";
      }

      var barLabel = isUnavailable ? "Set budget first" : (result.progress + " / " + result.target);
      var barColor = isDone ? "#2b8259" : "#EAB308";

      card.innerHTML =
        "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr auto\">" +
          "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;box-shadow:0 0 0 1px #cfe2d3\" aria-hidden=\"true\">" + def.icon + "</div>" +
          "<div class=\"min-w-0\">" +
            "<h3 class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#102b1d\">" + def.title + "</h3>" +
            "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + def.description + "</p>" +
          "</div>" +
          rewardHtml +
        "</div>" +
        "<div class=\"mt-5\">" +
          "<div class=\"relative overflow-hidden rounded-full\" style=\"height:1.25rem;background:#e7e0cf\">" +
            "<div class=\"h-full rounded-full\" style=\"width:" + pct + "%;background:" + barColor + ";transition:width 0.7s\"></div>" +
            "<span class=\"absolute inset-0 flex items-center justify-center text-xs font-black\" style=\"color:#102b1d\">" + barLabel + "</span>" +
          "</div>" +
        "</div>" +
        "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
          "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">+" + def.xpReward + " XP</p>" +
        "</div>";

      if (!isDone && !isUnavailable) {
        card.style.cursor = "pointer";
        card.addEventListener("click", function () { window.location.href = "dashboard.html"; });
        card.title = "Tap to log on the dashboard";
      }

      container.appendChild(card);
    });
  }

  // ── Weekly Quest Section ───────────────────────────────────

  function renderWeeklyQuestSection() {
    var container = document.getElementById("weeklyQuestSection");
    if (!container || !window.StorageAPI) { return; }
    container.innerHTML = "";

    var quest  = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    var now    = new Date();
    var isDone = Boolean(quest && quest.completedAt);

    if (!quest) {
      var loading = document.createElement("div");
      loading.className = "relative rounded-[2rem] p-5 opacity-60";
      loading.style.background = "#ffffff";
      loading.style.boxShadow  = "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px #ded7c6";
      loading.innerHTML =
        "<div class=\"grid items-center gap-4\" style=\"grid-template-columns:3rem 1fr\">" +
          "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#f1f5f9;box-shadow:0 0 0 1px #e2e8f0\">\uD83D\uDD12</div>" +
          "<div>" +
            "<p class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#94a3b8\">Loading quest\u2026</p>" +
            "<div class=\"mt-3 relative overflow-hidden rounded-full\" style=\"height:1.25rem;background:#e7e0cf\">" +
              "<span class=\"absolute inset-0 flex items-center justify-center text-xs font-black\" style=\"color:#94a3b8\">0 / 1</span>" +
            "</div>" +
          "</div>" +
        "</div>";
      container.appendChild(loading);
      return;
    }

    // Build condition progress bars
    var condsBarHtml = "";
    quest.conditions.forEach(function (c) {
      var pct  = Math.min(100, Math.round((c.progress / c.target) * 100));
      var done = c.progress >= c.target;
      var labelBase = COND_LABELS[c.type] || c.type;
      var unit      = COND_UNITS[c.type] || "";
      var label     = (c.target > 1 && unit) ? (labelBase + " " + c.target + " " + unit) : labelBase;
      condsBarHtml +=
        "<div style=\"margin-top:0.75rem\">" +
          "<p class=\"text-xs font-semibold\" style=\"color:#475569;margin-bottom:0.3rem\">" + label.trim() + "</p>" +
          "<div class=\"relative overflow-hidden rounded-full\" style=\"height:1.25rem;background:#e7e0cf\">" +
            "<div class=\"h-full rounded-full\" style=\"width:" + pct + "%;background:" + (done ? "#2b8259" : "#EAB308") + ";transition:width 0.7s\"></div>" +
            "<span class=\"absolute inset-0 flex items-center justify-center text-xs font-black\" style=\"color:#102b1d\">" + c.progress + " / " + c.target + "</span>" +
          "</div>" +
        "</div>";
    });

    var rewardHtml;
    if (isDone) {
      rewardHtml = "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#edf7ef;color:#164f33;box-shadow:0 0 0 1px rgba(43,130,89,0.3)\">\u2713 Done</div>";
    } else {
      rewardHtml = "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#f0fdfa;color:#0f766e;box-shadow:0 0 0 1px rgba(13,148,136,0.25)\">\u20B5" + quest.sentimosReward + "</div>";
    }

    var claimBtnHtml = "";
    if (isDone) {
      claimBtnHtml =
        "<button type=\"button\" class=\"animate-glow rounded-full text-sm font-black text-white\" " +
        "style=\"background:#0D9488;padding:0.5rem 1.25rem;box-shadow:0 8px 16px rgba(13,148,136,0.2)\">" +
        "Claim</button>";
    }

    var card = document.createElement("div");
    card.className = "relative rounded-[2rem] p-5";
    card.style.background = isDone ? "#f0fdf4" : "#ffffff";
    card.style.boxShadow  = isDone
      ? "0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(43,130,89,0.25)"
      : "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px #ded7c6";
    card.style.cursor = "pointer";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Open quest details");

    card.innerHTML =
      "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr auto\">" +
        "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;box-shadow:0 0 0 1px #cfe2d3\" aria-hidden=\"true\">" + (quest.icon || "\u26A1") + "</div>" +
        "<div class=\"min-w-0\">" +
          "<h3 class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#102b1d\">" + quest.title + "</h3>" +
          condsBarHtml +
        "</div>" +
        rewardHtml +
      "</div>" +
      "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
        "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">+" + quest.xpReward + " XP</p>" +
        claimBtnHtml +
      "</div>";

    card.addEventListener("click", function () { openQuestDetailSheet(quest); });
    card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { openQuestDetailSheet(quest); } });
    container.appendChild(card);
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

  function computeAllQuestProgress(expenses, weeklyBudget) {
    var weekStart = getWeekStart();
    var now       = new Date();

    // Filter to this week's expenses
    var weekExp = expenses.filter(function (e) {
      return new Date(e.timestamp) >= weekStart;
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
    // opts: { tracked, showTrackBtn, showClaimBtn, compact }
    opts = opts || {};
    var allDone = computedConditions.every(function (c) { return c.progress >= c.target; });

    // Overall progress for the first / primary condition
    var primaryCond = computedConditions[0] || { progress: 0, target: 1 };
    var overallPct  = Math.min(100, Math.round(
      (computedConditions.reduce(function (s, c) { return s + c.progress; }, 0) /
       computedConditions.reduce(function (s, c) { return s + c.target;   }, 0)) * 100
    ));
    var barColor = allDone ? "#2b8259" : "#EAB308";

    // Reward badge
    var rewardHtml;
    if (allDone && opts.tracked) {
      rewardHtml = "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.3)\">\u2713 Done</div>";
    } else if (opts.tracked) {
      rewardHtml = "<div class=\"shrink-0 rounded-full px-3 py-1 text-xs font-black\" style=\"background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.4)\">\uD83D\uDCCC TRACKING</div>";
    } else {
      rewardHtml = "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#f0fdfa;color:#0f766e;outline:1px solid rgba(13,148,136,0.25)\">\u20B5" + qDef.sentimosReward + "</div>";
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
    var claimHtml = "";
    if (allDone && opts.showClaimBtn) {
      claimHtml = "<button type=\"button\" class=\"quest-claim-btn rounded-full text-sm font-black text-white\" style=\"background:#0D9488;padding:0.5rem 1.25rem;outline:none;cursor:pointer\">\u20B5 Claim " + qDef.sentimosReward + "</button>";
    }
    var trackHtml = "";
    if (!opts.tracked && opts.showTrackBtn) {
      trackHtml = "<button type=\"button\" class=\"quest-track-btn rounded-full text-sm font-black\" style=\"background:transparent;color:#164f33;padding:0.4rem 1rem;outline:1px solid #164f33;cursor:pointer\" data-quest-id=\"" + qDef.id + "\">Track \u2192</button>";
    }

    var footerRight = claimHtml || trackHtml;
    var footerHtml =
      "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
        "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">+" + qDef.xpReward + " XP</p>" +
        footerRight +
      "</div>";

    var bgColor = allDone ? "#f0fdf4" : "#ffffff";
    var shadow  = allDone
      ? "0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(43,130,89,0.25)"
      : "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px #ded7c6";

    return (
      "<div class=\"relative rounded-[2rem] p-5\" style=\"background:" + bgColor + ";box-shadow:" + shadow + "\">" +
        "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr auto\">" +
          "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;outline:1px solid #cfe2d3\" aria-hidden=\"true\">" + qDef.icon + "</div>" +
          "<div class=\"min-w-0\">" +
            "<h3 class=\"font-display text-lg font-black\" style=\"color:#102b1d\">" + qDef.title + "</h3>" +
            "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + qDef.description + "</p>" +
            condsHtml +
          "</div>" +
          rewardHtml +
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
    var progressMap  = computeAllQuestProgress(expenses, weeklyBudget);

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
    var qDef = null;
    for (var i = 0; i < WEEKLY_QUEST_DEFS.length; i++) {
      if (WEEKLY_QUEST_DEFS[i].id === activeQuest.id) { qDef = WEEKLY_QUEST_DEFS[i]; break; }
    }
    if (!qDef) { qDef = { id: activeQuest.id, title: activeQuest.title, icon: activeQuest.icon || "\u26A1", description: activeQuest.description || "", conditions: activeQuest.conditions || [], xpReward: activeQuest.xpReward || 0, sentimosReward: activeQuest.sentimosReward || 0 }; }

    var computedConds = progressMap[qDef.id] || (activeQuest.conditions || []).map(function (c) {
      return { type: c.type, target: c.target, progress: c.progress || 0 };
    });
    var allDone = computedConds.every(function (c) { return c.progress >= c.target; });

    var nextMon = new Date(getWeekStart());
    nextMon.setDate(nextMon.getDate() + 7);
    var daysLeft = Math.ceil((nextMon.getTime() - new Date().getTime()) / 86400000);

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
      // Completed — green-tinted card matching page style
      cardHtml =
        "<div class=\"relative rounded-[2rem] p-5\" style=\"background:#f0fdf4;box-shadow:0 1px 4px rgba(0,0,0,0.05),0 0 0 2px rgba(43,130,89,0.25)\">" +
          "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr auto\">" +
            "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;outline:1px solid #cfe2d3\" aria-hidden=\"true\">" + qDef.icon + "</div>" +
            "<div class=\"min-w-0\">" +
              "<h3 class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#102b1d\">" + qDef.title + "</h3>" +
              "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + qDef.description + "</p>" +
              condsHtml +
            "</div>" +
            "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#edf7ef;color:#164f33;outline:1px solid rgba(43,130,89,0.3)\">\u2713 Done</div>" +
          "</div>" +
          "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
            "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">+" + qDef.xpReward + " XP</p>" +
            "<button type=\"button\" id=\"questClaimBtn\" class=\"rounded-full text-sm font-black text-white\" style=\"background:#164f33;padding:0.5rem 1.25rem;border:none;cursor:pointer\">\u26A1 Claim Reward</button>" +
          "</div>" +
        "</div>";
    } else {
      // In-progress — white card matching page style, clickable for details
      cardHtml =
        "<div class=\"relative rounded-[2rem] p-5\" style=\"background:#ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.06),0 0 0 1px #ded7c6;cursor:pointer\" role=\"button\" tabindex=\"0\" id=\"activeQuestCard\">" +
          "<div class=\"mb-3 flex items-center gap-2\">" +
            "<span class=\"text-xs font-black\" style=\"background:#edf7ef;color:#164f33;padding:0.2rem 0.6rem;border-radius:999px;outline:1px solid rgba(43,130,89,0.3)\">\uD83D\uDCCC Tracking</span>" +
            "<span class=\"text-xs font-semibold\" style=\"color:#617063\">" + (daysLeft <= 1 ? "Resets tomorrow" : daysLeft + " days left") + "</span>" +
          "</div>" +
          "<div class=\"grid items-start gap-4\" style=\"grid-template-columns:3rem 1fr auto\">" +
            "<div class=\"grid h-12 w-12 place-items-center rounded-2xl text-2xl\" style=\"background:#edf7ef;outline:1px solid #cfe2d3\" aria-hidden=\"true\">" + qDef.icon + "</div>" +
            "<div class=\"min-w-0\">" +
              "<h3 class=\"text-lg font-black\" style=\"font-family:'Sora',sans-serif;color:#102b1d\">" + qDef.title + "</h3>" +
              "<p class=\"mt-1 text-sm font-semibold\" style=\"color:#617063\">" + qDef.description + "</p>" +
              condsHtml +
            "</div>" +
            "<div class=\"shrink-0 rounded-full px-3 py-2 text-sm font-black\" style=\"background:#f0fdfa;color:#0f766e;outline:1px solid rgba(13,148,136,0.25)\">\u20B5" + qDef.sentimosReward + "</div>" +
          "</div>" +
          "<div class=\"mt-4 flex items-center justify-between gap-3\">" +
            "<p class=\"text-xs font-extrabold uppercase\" style=\"letter-spacing:0.16em;color:#6b756c\">+" + qDef.xpReward + " XP</p>" +
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
        var exp2 = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
        var sum2 = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
        openChangeQuestSheet(computeAllQuestProgress(exp2, sum2.weeklyBudget || 0), sum2.weeklyBudget || 0);
      });
    }
    var activeCard = document.getElementById("activeQuestCard");
    if (activeCard) {
      activeCard.addEventListener("click", function () {
        var questForSheet = Object.assign({}, qDef, { conditions: computedConds, expiresAt: nextMon.toISOString(), completedAt: null });
        openQuestDetailSheet(questForSheet);
      });
      activeCard.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { activeCard.click(); } });
    }
    var claimBtn = document.getElementById("questClaimBtn");
    if (claimBtn) {
      claimBtn.addEventListener("click", function () {
        if (window.StorageAPI && window.StorageAPI.claimQuestReward) {
          window.StorageAPI.claimQuestReward();
        }
        window.StorageAPI.setCurrentQuest(null);
        window.dispatchEvent(new Event("sugbocents:dataChanged"));
        // Auto-assign next uncompleted quest from this week's pool
        var pool  = getWeeklyQuestPool();
        var exp3  = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
        var sum3  = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
        var pMap  = computeAllQuestProgress(exp3, sum3.weeklyBudget || 0);
        var nextQ = null;
        for (var pi = 0; pi < pool.length; pi++) {
          if (pool[pi].id === qDef.id) { continue; }
          var pconds = pMap[pool[pi].id] || pool[pi].conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; });
          if (!pconds.every(function (c) { return c.progress >= c.target; })) { nextQ = pool[pi]; break; }
        }
        if (nextQ) {
          trackQuest(nextQ);
        } else {
          renderQuestPage();
        }
        var ex = document.getElementById("questCompleteToast");
        if (ex) { ex.remove(); }
        var toast = document.createElement("div");
        toast.id = "questCompleteToast";
        toast.style.cssText = "position:fixed;bottom:5.5rem;left:50%;transform:translateX(-50%);background:#164f33;color:white;padding:0.65rem 1.25rem;border-radius:999px;font-size:0.85rem;font-weight:800;z-index:9999;box-shadow:0 8px 24px rgba(22,79,51,0.3);white-space:nowrap;transition:opacity 0.4s;";
        toast.textContent = "\uD83C\uDF89 Quest complete! " + (nextQ ? "Now tracking \u201C" + nextQ.title + "\u201D" : "Slot is open for a new quest");
        document.body.appendChild(toast);
        setTimeout(function () { toast.style.opacity = "0"; setTimeout(function () { toast.remove(); }, 450); }, 3500);
      });
    }
  }

  // ── Abandon Quest ───────────────────────────────────────────────────────────

  function abandonQuest() {
    if (!window.StorageAPI || !window.StorageAPI.setCurrentQuest) { return; }
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
      openReplaceQuestSheet(current, questDef);
    } else {
      trackQuest(questDef);
    }
  }

  function openReplaceQuestSheet(currentQuest, newQDef) {
    if (!window.AppShell) { trackQuest(newQDef); return; }
    var sheetId = "replaceQuestSheet";
    var existing = document.getElementById(sheetId);
    if (existing) { existing.remove(); }

    var sheet = document.createElement("div");
    sheet.id = sheetId;
    sheet.className = "bottom-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Replace quest confirmation");
    sheet.innerHTML =
      "<div class=\"sheet-handle\"></div>" +
      "<div class=\"sheet-header\">" +
        "<h2 class=\"sheet-title\">Switch quests?</h2>" +
        "<button type=\"button\" class=\"sheet-close-btn\" aria-label=\"Close\">&times;</button>" +
      "</div>" +
      "<div class=\"sheet-body\">" +
        "<div class=\"rounded-[1.25rem] p-4 mb-4\" style=\"background:#fef9ec;outline:1px solid #f3e2a0\">" +
          "<p class=\"text-sm font-extrabold\" style=\"color:#92400e\">Replace \u201C" + currentQuest.title + "\u201D with \u201C" + newQDef.title + "\u201D?</p>" +
          "<p class=\"mt-1 text-xs font-semibold\" style=\"color:#b45309\">Progress on your current quest will be paused until you re-equip it.</p>" +
        "</div>" +
        "<div class=\"flex flex-col gap-3\">" +
          "<button type=\"button\" id=\"replaceQuestConfirmBtn\" class=\"w-full rounded-full text-sm font-black text-white\" style=\"background:#0D9488;padding:0.75rem;border:none;cursor:pointer\">Yes, track \u201C" + newQDef.title + "\u201D</button>" +
          "<button type=\"button\" id=\"replaceQuestCancelBtn\" class=\"w-full rounded-full text-sm font-black\" style=\"background:transparent;color:#617063;padding:0.75rem;border:1.5px solid #ded7c6;cursor:pointer\">Keep current quest</button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(sheet);

    sheet.querySelector(".sheet-close-btn").addEventListener("click", function () { window.AppShell.closeAllSheets(); });
    document.getElementById("replaceQuestCancelBtn").addEventListener("click", function () { window.AppShell.closeAllSheets(); });
    document.getElementById("replaceQuestConfirmBtn").addEventListener("click", function () {
      window.AppShell.closeAllSheets();
      trackQuest(newQDef);
    });

    window.AppShell.openSheet(sheetId);
  }

  function trackQuest(questDef) {
    if (!window.StorageAPI || !window.StorageAPI.setCurrentQuest) { return; }
    // Attach progress data before setting
    var expenses     = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var summary      = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var weeklyBudget = summary.weeklyBudget || 0;
    var progressMap  = computeAllQuestProgress(expenses, weeklyBudget);
    var computedConds = progressMap[questDef.id] || questDef.conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; });

    var questToSave = Object.assign({}, questDef, {
      conditions: computedConds,
      assignedAt: new Date().toISOString(),
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

  function openChangeQuestSheet(progressMap, weeklyBudget) {
    if (!window.AppShell) { return; }
    var sheetId = "changeQuestSheet";

    if (!document.getElementById(sheetId)) {
      var sheet = document.createElement("div");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Choose a quest to track");
      sheet.innerHTML =
        "<div class=\"sheet-handle\"></div>" +
        "<div class=\"sheet-header\">" +
          "<h2 class=\"sheet-title\">Choose a quest</h2>" +
          "<button type=\"button\" class=\"sheet-close-btn\" aria-label=\"Close\">&times;</button>" +
        "</div>" +
        "<p class=\"sheet-body\" style=\"font-size:0.8rem;color:#617063;margin-bottom:0.75rem;padding-bottom:0\">Progress counts for all quests \u2014 tracking pins one to your dashboard.</p>" +
        "<div id=\"changeQuestList\" class=\"sheet-body\" style=\"padding-top:0;display:flex;flex-direction:column;gap:0.75rem\"></div>";
      document.body.appendChild(sheet);
      sheet.querySelector(".sheet-close-btn").addEventListener("click", function () { window.AppShell.closeAllSheets(); });
    }

    var activeQuest = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    var activeId    = activeQuest ? activeQuest.id : null;
    var listEl      = document.getElementById("changeQuestList");
    if (!listEl) { return; }
    listEl.innerHTML = "";

    getWeeklyQuestPool().forEach(function (qDef) {
      var computedConds = progressMap[qDef.id] || qDef.conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; });
      var allDone    = computedConds.every(function (c) { return c.progress >= c.target; });
      var isTracking = qDef.id === activeId;
      var overallPct = Math.min(100, Math.round(
        (computedConds.reduce(function (s, c) { return s + c.progress; }, 0) /
         computedConds.reduce(function (s, c) { return s + c.target;   }, 0)) * 100
      ));
      var barColor = allDone ? "#2b8259" : "#EAB308";

      var row = document.createElement("div");
      row.style.cssText = "background:" + (isTracking ? "#f0fdf4" : "#ffffff") + ";border-radius:1.25rem;padding:0.875rem 1rem;outline:1px solid " + (isTracking ? "rgba(43,130,89,0.35)" : "#ded7c6") + ";display:flex;align-items:center;gap:0.875rem;";

      var actionHtml;
      if (isTracking) {
        actionHtml = "<span style=\"font-size:0.75rem;font-weight:800;background:#edf7ef;color:#164f33;padding:0.3rem 0.7rem;border-radius:999px;white-space:nowrap;outline:1px solid rgba(43,130,89,0.3)\">\uD83D\uDCCC Tracking</span>";
      } else {
        actionHtml = "<button type=\"button\" style=\"font-size:0.75rem;font-weight:800;background:transparent;color:#164f33;padding:0.3rem 0.7rem;border-radius:999px;outline:1px solid #164f33;cursor:pointer;white-space:nowrap\" data-quest-id=\"" + qDef.id + "\">Track \u2192</button>";
      }

      row.innerHTML =
        "<div style=\"font-size:1.5rem;flex-shrink:0\">" + qDef.icon + "</div>" +
        "<div style=\"min-width:0;flex:1\">" +
          "<p style=\"font-size:0.875rem;font-weight:800;color:#102b1d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + qDef.title + "</p>" +
          "<p style=\"font-size:0.72rem;font-weight:600;color:#617063;margin-top:0.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + qDef.description + "</p>" +
          "<div style=\"margin-top:0.4rem;position:relative;overflow:hidden;border-radius:999px;height:0.625rem;background:#e7e0cf\">" +
            "<div style=\"height:100%;border-radius:999px;background:" + barColor + ";width:" + overallPct + "%;transition:width 0.7s\"></div>" +
          "</div>" +
        "</div>" +
        actionHtml;

      // Wire track button
      var trackBtn = row.querySelector("[data-quest-id]");
      if (trackBtn) {
        trackBtn.addEventListener("click", function () { maybeTrackQuest(qDef); });
      }

      listEl.appendChild(row);
    });

    window.AppShell.openSheet(sheetId);
  }

  // ── Weekly Quest Catalog — 5 quests per week, rotating pool ─────────────────

  function renderWeeklyQuestCatalog() {
    var section = document.getElementById("weeklyQuestCatalog");
    if (!section || !window.StorageAPI) { return; }

    var expenses     = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];
    var summary      = window.StorageAPI.getBudgetSummary ? window.StorageAPI.getBudgetSummary() : {};
    var weeklyBudget = summary.weeklyBudget || 0;
    var progressMap  = computeAllQuestProgress(expenses, weeklyBudget);
    var activeQuest  = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    var activeId     = activeQuest ? activeQuest.id : null;
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
      var computedConds = progressMap[qDef.id] || qDef.conditions.map(function (c) { return { type: c.type, target: c.target, progress: 0 }; });
      var isTracked     = qDef.id === activeId;
      var allDone       = computedConds.every(function (c) { return c.progress >= c.target; });

      var wrapper = document.createElement("div");
      wrapper.innerHTML = buildQuestCardHtml(qDef, computedConds, {
        tracked: isTracked,
        showTrackBtn: !isTracked && !allDone,
        showClaimBtn: false
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

  // ── Main render ────────────────────────────────────────────

  function renderQuestPage() {
    if (!window.StorageAPI) { return; }
    updateDailyResetPill();
    updateWeeklyResetPill();
    renderActiveQuestSpotlight();
    renderDailyQuestsSection();
    renderWeeklyQuestCatalog();
    renderLockedQuestsSection();
  }

  // ── Init ───────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") !== "quests") { return; }
    renderQuestPage();
    setInterval(updateDailyResetPill, 1000);
    window.addEventListener("sugbocents:dataChanged", renderQuestPage);
    window.addEventListener("sugbocents:synced", renderQuestPage);
  });

})();
