(function () {
  var APP_KEY = "sugbocents.v1";

  var DEFAULT_QUICK_ADD_ITEMS = [
    { id: "qa_jeep",   category: "transport",    label: "Jeep",           emoji: "🚌", amount: 18,  color: "#d8efe2" },
    { id: "qa_food",   category: "food",         label: "Food",           emoji: "🍽️", amount: 120, color: "#ffedd5" },
    { id: "qa_load",   category: "utilities",    label: "Load",           emoji: "⚡", amount: 50,  color: "#dbeafe" },
    { id: "qa_school", category: "education",    label: "School Supplies",emoji: "📚", amount: 80,  color: "#f3e8ff" },
    { id: "qa_laundry",category: "personal_care",label: "Laundry",        emoji: "🧺", amount: 60,  color: "#fee2e2" }
  ];

  var EXPENSE_CATEGORIES = [
    { id: "transport",    label: "Transport",       emoji: "🚌", color: "#d8efe2" },
    { id: "food",         label: "Food & Drinks",   emoji: "🍽️", color: "#ffedd5" },
    { id: "groceries",    label: "Groceries",       emoji: "🛒", color: "#d1fae5" },
    { id: "education",    label: "Education",       emoji: "📚", color: "#f3e8ff" },
    { id: "shopping",     label: "Shopping",        emoji: "🛍️", color: "#fce7f3" },
    { id: "health",       label: "Health",          emoji: "💊", color: "#fee2e2" },
    { id: "entertainment",label: "Entertainment",   emoji: "🎬", color: "#fef3c7" },
    { id: "utilities",    label: "Utilities & Bills",emoji: "⚡", color: "#dbeafe" },
    { id: "personal_care",label: "Personal Care",   emoji: "🧴", color: "#ede9fe" },
    { id: "others",       label: "Others",          emoji: "📋", color: "#e2e8f0" }
  ];

  var LEGACY_CATEGORY_MAP = {
    "jeep": "transport", "jeepney": "transport",
    "food": "food", "lunch": "food", "dinner": "food", "breakfast": "food",
    "merienda": "food", "snack": "food", "coffee": "food", "drinks": "food",
    "groceries": "groceries", "grocery": "groceries",
    "load": "utilities", "laundry": "personal_care",
    "school supplies": "education", "school": "education", "tuition": "education",
    "shopping": "shopping", "clothes": "shopping",
    "health": "health", "medicine": "health", "medical": "health",
    "entertainment": "entertainment", "movie": "entertainment",
    "utilities": "utilities", "bills": "utilities",
    "personal care": "personal_care"
  };

  // ── Sprint 3: Weekly Quest Pool ──────────────────────────
  var QUESTS = [
    {
      id: "quest-log5-budget3",
      title: "Disciplined Week",
      description: "Log expenses 5 days and stay under budget on at least 3",
      icon: "\u26A1",
      conditions: [
        { type: "log_days", target: 5 },
        { type: "under_budget_days", target: 3 }
      ],
      xpReward: 150,
      sentimosReward: 50
    },
    {
      id: "quest-log7",
      title: "Logging Habit",
      description: "Log at least 1 expense every day for 7 days",
      icon: "\uD83D\uDCC5",
      conditions: [
        { type: "log_days", target: 7 }
      ],
      xpReward: 200,
      sentimosReward: 50
    },
    {
      id: "quest-budget-every-day",
      title: "Budget Warrior",
      description: "Stay under your daily budget every day this week",
      icon: "\uD83D\uDEE1\uFE0F",
      conditions: [
        { type: "no_overspend_days", target: 7 }
      ],
      xpReward: 175,
      sentimosReward: 50
    },
    {
      id: "quest-early-riser",
      title: "Early Riser",
      description: "Log before noon on 3 different days",
      icon: "\uD83C\uDF05",
      conditions: [
        { type: "log_days_before_noon", target: 3 }
      ],
      xpReward: 100,
      sentimosReward: 50
    },
    {
      id: "quest-big-logger",
      title: "Big Logger",
      description: "Log 10 or more expenses this week",
      icon: "\uD83D\uDCCB",
      conditions: [
        { type: "log_count", target: 10 }
      ],
      xpReward: 120,
      sentimosReward: 50
    },
    {
      id: "quest-night-owl",
      title: "Night Owl",
      description: "Log after 9 PM on 2 different days",
      icon: "\uD83C\uDF19",
      conditions: [
        { type: "log_days_after_9pm", target: 2 }
      ],
      xpReward: 100,
      sentimosReward: 50
    },
    {
      id: "quest-frugal-run",
      title: "Frugal Run",
      description: "Spend 50% or less of your weekly budget",
      icon: "\uD83D\uDCB0",
      conditions: [
        { type: "frugal_week", target: 1 }
      ],
      xpReward: 175,
      sentimosReward: 50
    },
    {
      id: "quest-15-logs",
      title: "Expense Marathon",
      description: "Log 15 or more expenses this week",
      icon: "\uD83C\uDFC3",
      conditions: [
        { type: "log_count", target: 15 }
      ],
      xpReward: 160,
      sentimosReward: 60
    },
    {
      id: "quest-5-budget-days",
      title: "Five-Day Discipline",
      description: "Stay under your daily budget on 5 different days",
      icon: "\uD83D\uDEE1\uFE0F",
      conditions: [
        { type: "under_budget_days", target: 5 }
      ],
      xpReward: 150,
      sentimosReward: 50
    },
    {
      id: "quest-combo-week",
      title: "Balanced Week",
      description: "Log 5 days this week and stay under budget on 3 of them",
      icon: "\u2696\uFE0F",
      conditions: [
        { type: "log_days", target: 5 },
        { type: "under_budget_days", target: 3 }
      ],
      xpReward: 180,
      sentimosReward: 60
    },
    {
      id: "quest-variety-week",
      title: "Variety Pack",
      description: "Log expenses in at least 4 different categories this week",
      icon: "\uD83C\uDFAF",
      conditions: [
        { type: "category_diversity_week", target: 4 }
      ],
      xpReward: 140,
      sentimosReward: 50
    },
    {
      id: "quest-xp-200",
      title: "XP Grinder",
      description: "Earn 200 XP this week by logging and staying on budget",
      icon: "\u26A1",
      conditions: [
        { type: "xp_earned_week", target: 200 }
      ],
      xpReward: 200,
      sentimosReward: 75
    }
  ];

  var XP_LOG_DAILY_CAP = 25;

  var AVATAR_PRESETS = [
    "🐯", "🐼", "🦊", "🐸",
    "🐨", "🦁", "🐰", "🐹",
    "🐻", "🐵", "🦄", "🐧"
  ];

  // Minimal daily quest specs for cross-page badge computation.
  // Mirrors DAILY_QUEST_STORAGE_CONDITIONS in quests.js — keep in sync if daily quests change.
  var DAILY_QUEST_SPECS_INTERNAL = [
    { id: "daily-first-log",    condType: "log_count_today",      target: 1 },
    { id: "daily-triple-log",   condType: "log_count_today",      target: 3 },
    { id: "daily-categories",   condType: "category_count_today", target: 3 }
  ];

  // SYNC: must match XP_LEVELS_BACKEND in functions/dev-tools.js
  var XP_LEVELS = [
    { level: 1, name: "Rookie Saver", minXp: 0 },
    { level: 2, name: "Budget Aware", minXp: 50 },
    { level: 3, name: "Money Smart", minXp: 150 },
    { level: 4, name: "Week Crusher", minXp: 350 },
    { level: 5, name: "Streak Hunter", minXp: 700 },
    { level: 6, name: "Finance Pro", minXp: 1200 },
    { level: 7, name: "Budget Legend", minXp: 2000 }
  ];
  // Achievement IDs follow GAMIFICATION_DESIGN_V1.md + Phase 2 expansion.
  // Each badge carries: series (grouping key), tier (1-based), totalTiers, rarity, threshold (number overlay on art).
  // Standalone badges (no series) omit series/tier/totalTiers.
  var ACHIEVEMENTS = [
    // ── Logging (series: "expense-count") ────────────────────
    { id: "first-step",        name: "First Step",        description: "Log your first expense",                   icon: "bi-pencil-square",         type: "expense_count",    target: 1,    category: "Logging",  series: "expense-count",    tier: 1, totalTiers: 4, rarity: "bronze",  threshold: 1    },
    { id: "getting-started",   name: "Getting Started",   description: "Log 5 expenses",                           icon: "bi-check2-circle",          type: "expense_count",    target: 5,    category: "Logging",  series: "expense-count",    tier: 2, totalTiers: 4, rarity: "bronze",  threshold: 5    },
    { id: "budget-regular",    name: "Budget Regular",    description: "Log 25 expenses",                          icon: "bi-journal-check",          type: "expense_count",    target: 25,   category: "Logging",  series: "expense-count",    tier: 3, totalTiers: 4, rarity: "silver",  threshold: 25   },
    { id: "century",           name: "Century Club",      description: "Log 100 expenses",                         icon: "bi-list-check",             type: "expense_count",    target: 100,  category: "Logging",  series: "expense-count",    tier: 4, totalTiers: 4, rarity: "gold",    threshold: 100  },
    // ── Logging (standalone) ─────────────────────────────────
    { id: "variety-pro",       name: "Category Explorer", description: "Use all 10 expense categories",            icon: "bi-grid-fill",              type: "category_variety", target: 10,   category: "Logging",  rarity: "silver",  threshold: 10   },
    // ── Streaks (series: "streak") ────────────────────────────
    { id: "on-fire",           name: "On Fire",           description: "Reach a 3-day streak",                     icon: "bi-fire",                   type: "streak",           target: 3,    category: "Streak",   series: "streak",           tier: 1, totalTiers: 3, rarity: "bronze",  threshold: 3    },
    { id: "consistent",        name: "Consistent",        description: "Reach a 7-day streak",                     icon: "bi-calendar-check-fill",    type: "streak",           target: 7,    category: "Streak",   series: "streak",           tier: 2, totalTiers: 3, rarity: "silver",  threshold: 7    },
    { id: "streak-master",     name: "Streak Master",     description: "Reach a 30-day streak",                    icon: "bi-trophy-fill",            type: "streak",           target: 30,   category: "Streak",   series: "streak",           tier: 3, totalTiers: 3, rarity: "gold",    threshold: 30   },
    // ── Streak Diamonds (series: "streak-diamond") ────────────
    { id: "streak-diamond-7",  name: "First Diamond",     description: "Reach a 7-day streak",                     icon: "bi-gem",                    type: "streak_diamonds",  target: 7,    category: "Streak",   series: "streak-diamond",   tier: 1, totalTiers: 3, rarity: "gold",    threshold: 7    },
    { id: "streak-diamond-42", name: "Six-Week Run",      description: "Reach a 42-day streak",                    icon: "bi-gem",                    type: "streak_diamonds",  target: 42,   category: "Streak",   series: "streak-diamond",   tier: 2, totalTiers: 3, rarity: "emerald", threshold: 42   },
    { id: "streak-diamond-100",name: "Century Flame",     description: "Reach a 100-day streak",                   icon: "bi-gem",                    type: "streak_diamonds",  target: 100,  category: "Streak",   series: "streak-diamond",   tier: 3, totalTiers: 3, rarity: "diamond", threshold: 100  },
    // ── Budget ────────────────────────────────────────────────
    { id: "under-budget",      name: "Under Budget",      description: "Finish a week under budget",               icon: "bi-check-circle-fill",      type: "budget_week",      target: 1,    category: "Budget",   rarity: "silver",  threshold: 1    },
    { id: "frugal",            name: "Frugal Week",       description: "Spend \u226450% of weekly budget",          icon: "bi-piggy-bank",             type: "budget_frugal",    target: 1,    category: "Budget",   rarity: "gold",    threshold: 1    },
    { id: "budget-blitz",      name: "Budget Blitz",      description: "Finish 5 weeks under budget",              icon: "bi-shield-check",           type: "budget_weeks_total",target: 5,   category: "Budget",   rarity: "gold",    threshold: 5    },
    // ── Missions (series: "mission") ──────────────────────────
    { id: "mission-5",         name: "Getting Going",     description: "Complete 5 daily missions",                icon: "bi-check2",                 type: "mission_count",    target: 5,    category: "Missions", series: "mission",          tier: 1, totalTiers: 4, rarity: "bronze",  threshold: 5    },
    { id: "mission-25",        name: "On a Roll",         description: "Complete 25 daily missions",               icon: "bi-check2-circle",          type: "mission_count",    target: 25,   category: "Missions", series: "mission",          tier: 2, totalTiers: 4, rarity: "silver",  threshold: 25   },
    { id: "mission-100",       name: "Mission Machine",   description: "Complete 100 daily missions",              icon: "bi-check2-all",             type: "mission_count",    target: 100,  category: "Missions", series: "mission",          tier: 3, totalTiers: 4, rarity: "gold",    threshold: 100  },
    { id: "mission-365",       name: "Daily Legend",      description: "Complete 365 daily missions",              icon: "bi-trophy-fill",            type: "mission_count",    target: 365,  category: "Missions", series: "mission",          tier: 4, totalTiers: 4, rarity: "emerald", threshold: 365  },
    // ── Quests (series: "quest") ──────────────────────────────
    { id: "quest-1",           name: "First Quest",       description: "Complete your first weekly quest",         icon: "bi-map",                    type: "quest_count",      target: 1,    category: "Quests",   series: "quest",            tier: 1, totalTiers: 3, rarity: "silver",  threshold: 1    },
    { id: "quest-5",           name: "Quest Regular",     description: "Complete 5 weekly quests",                 icon: "bi-map-fill",               type: "quest_count",      target: 5,    category: "Quests",   series: "quest",            tier: 2, totalTiers: 3, rarity: "gold",    threshold: 5    },
    { id: "quest-streak-3",    name: "Quest Streak",      description: "Complete 3 quests in a row",               icon: "bi-lightning-fill",         type: "quest_streak",     target: 3,    category: "Quests",   series: "quest",            tier: 3, totalTiers: 3, rarity: "emerald", threshold: 3    },
    // ── Savings ───────────────────────────────────────────────
    { id: "saved-1000",        name: "First Thousand",    description: "Save \u20B11,000 toward any goal",          icon: "bi-piggy-bank-fill",        type: "savings_total",    target: 1000, category: "Goals",    series: "savings",          tier: 1, totalTiers: 2, rarity: "gold",    threshold: 1000 },
    { id: "saved-5000",        name: "Five K Club",       description: "Save \u20B15,000 across all goals",         icon: "bi-safe2-fill",             type: "savings_total",    target: 5000, category: "Goals",    series: "savings",          tier: 2, totalTiers: 2, rarity: "emerald", threshold: 5000 },
    // ── Goals ─────────────────────────────────────────────────
    { id: "goal-setter",       name: "Goal Setter",       description: "Create your first savings goal",           icon: "bi-flag-fill",              type: "goal_count",       target: 1,    category: "Goals",    rarity: "bronze",  threshold: 1    },
    { id: "goal-achiever",     name: "Goal Achiever",     description: "Complete 3 savings goals",                 icon: "bi-trophy",                 type: "goals_completed",  target: 3,    category: "Goals",    rarity: "gold",    threshold: 3    },
    // ── Misc ──────────────────────────────────────────────────
    { id: "early-bird",        name: "Early Bird",        description: "Log an expense before 7 AM",               icon: "bi-sunrise",                type: "time_of_day",      target: 1,    category: "Misc",     rarity: "bronze",  threshold: 1    },
    { id: "night-owl",         name: "Night Owl",         description: "Log an expense after 10 PM",               icon: "bi-moon-stars-fill",        type: "time_of_day",      target: 1,    category: "Misc",     rarity: "bronze",  threshold: 1    },
    // ── XP / Level (series: "level") ─────────────────────────
    { id: "level-up-2",        name: "Budget Aware",      description: "Reach Level 2",                            icon: "bi-arrow-up-circle-fill",   type: "level",            target: 2,    category: "XP",       series: "level",            tier: 1, totalTiers: 2, rarity: "bronze",  threshold: 2    },
    { id: "level-up-5",        name: "Streak Hunter",     description: "Reach Level 5",                            icon: "bi-lightning-charge-fill",  type: "level",            target: 5,    category: "XP",       series: "level",            tier: 2, totalTiers: 2, rarity: "silver",  threshold: 5    }
  ];

  function normalizeLegacyCategory(raw) {
    if (!raw) { return "others"; }
    var lower = String(raw).toLowerCase().trim();
    // Already a valid id
    for (var i = 0; i < EXPENSE_CATEGORIES.length; i++) {
      if (EXPENSE_CATEGORIES[i].id === lower) { return lower; }
    }
    // Map from known legacy labels
    if (LEGACY_CATEGORY_MAP[lower]) { return LEGACY_CATEGORY_MAP[lower]; }
    return "others";
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(APP_KEY);
      if (!raw) {
        return { users: [], session: null };
      }

      var parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        session: parsed.session || null
      };
    } catch (error) {
      return { users: [], session: null };
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(APP_KEY, JSON.stringify(store));
      return { ok: true };
    } catch (error) {
      var isQuotaError = error && (
        error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error.code === 22 ||
        error.code === 1014
      );

      if (!isQuotaError) {
        return { ok: false, error: "storage-write-failed" };
      }

      var compacted = JSON.parse(JSON.stringify(store || {}));
      var users = Array.isArray(compacted.users) ? compacted.users : [];
      var changed = false;

      function compactUserThreads(user) {
        if (!user || !user.preferences || !Array.isArray(user.preferences.chatThreads)) {
          return false;
        }
        var threads = user.preferences.chatThreads.slice();
        if (threads.length === 0) { return false; }

        var oldestIndex = -1;
        var oldestTime = null;
        for (var i = 0; i < threads.length; i++) {
          var thread = threads[i];
          if (!thread || !Array.isArray(thread.messages)) { continue; }
          if (thread.messages.length === 0) { continue; }
          var t = String(thread.updatedAt || thread.createdAt || "");
          if (oldestTime === null || t < oldestTime) {
            oldestTime = t;
            oldestIndex = i;
          }
        }

        if (oldestIndex === -1) {
          if (threads.length <= 1) { return false; }
          threads.pop();
          user.preferences.chatThreads = threads;
          return true;
        }

        var target = Object.assign({}, threads[oldestIndex]);
        target.messages = [];
        target.updatedAt = new Date().toISOString();
        threads[oldestIndex] = target;
        user.preferences.chatThreads = threads;
        return true;
      }

      var sessionUserId = compacted && compacted.session ? compacted.session.userId : null;
      if (sessionUserId) {
        for (var a = 0; a < users.length; a++) {
          if (users[a] && users[a].id === sessionUserId) {
            changed = compactUserThreads(users[a]) || changed;
            break;
          }
        }
      }

      if (!changed) {
        for (var b = 0; b < users.length; b++) {
          if (compactUserThreads(users[b])) {
            changed = true;
            break;
          }
        }
      }

      if (!changed) {
        return { ok: false, error: "storage-full" };
      }

      try {
        localStorage.setItem(APP_KEY, JSON.stringify(compacted));
        return { ok: true, compacted: true };
      } catch (_) {
        return { ok: false, error: "storage-full" };
      }
    }
  }

  function sanitizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function sanitizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function sanitizeDisplayName(value) {
    var cleaned = String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^A-Za-z0-9._\- ]/g, "");
    if (cleaned.length > 24) {
      cleaned = cleaned.slice(0, 24).trim();
    }
    return cleaned;
  }

  function getFallbackDisplayName(firstName, lastName, email) {
    var fromNames = sanitizeName([firstName, lastName].filter(Boolean).join(" "));
    if (fromNames) { return fromNames; }
    if (email) {
      return String(email).split("@")[0].slice(0, 24);
    }
    return "SugboCents User";
  }

  function normalizeAvatar(value) {
    var avatar = String(value || "").trim();
    if (!avatar) { return ""; }
    if (AVATAR_PRESETS.indexOf(avatar) === -1) { return ""; }
    return avatar;
  }

  function sanitizeAmount(amount) {
    var value = Number(amount);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getManilaDateParts(input) {
    var d = input ? new Date(input) : new Date();
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(d);

    var out = { year: "1970", month: "01", day: "01" };
    parts.forEach(function (part) {
      if (part.type === "year") { out.year = part.value; }
      if (part.type === "month") { out.month = part.value; }
      if (part.type === "day") { out.day = part.value; }
    });
    return out;
  }

  function getManilaWeekday(input) {
    var d = input ? new Date(input) : new Date();
    var token = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short"
    }).format(d);
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[token] === undefined ? 1 : map[token];
  }

  function getManilaDayKey(input) {
    var p = getManilaDateParts(input);
    return p.year + "-" + p.month + "-" + p.day;
  }

  function getManilaMondayKey(input) {
    var p = getManilaDateParts(input);
    var dayIndex = getManilaWeekday(input);
    var diff = dayIndex === 0 ? -6 : 1 - dayIndex;
    var utcDate = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), 12, 0, 0));
    utcDate.setUTCDate(utcDate.getUTCDate() + diff);
    return utcDate.getUTCFullYear() + "-" +
      String(utcDate.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(utcDate.getUTCDate()).padStart(2, "0");
  }

  function getLocalDateKey(input) {
    return getManilaDayKey(input);
  }

  function ensureGamificationFields(user) {
    if (!user) { return; }
    if (!Array.isArray(user.unlockedAchievements)) { user.unlockedAchievements = []; }
    if (!Array.isArray(user.notifiedAchievements)) { user.notifiedAchievements = []; }
    if (!Array.isArray(user.pendingAchievementClaims)) { user.pendingAchievementClaims = []; }
    if (typeof user.xp !== "number") { user.xp = 0; }
    if (!user.dailyXpLog || typeof user.dailyXpLog !== "object") {
      user.dailyXpLog = { dateKey: getLocalDateKey(), xpFromLogging: 0 };
    }
    if (typeof user.level !== "number") { user.level = 1; }
    // Sprint 3 quest fields
    if (user.activeQuest === undefined) { user.activeQuest = null; }
    if (!Array.isArray(user.questHistory)) { user.questHistory = []; }
    if (typeof user.questsCompleted !== "number") { user.questsCompleted = 0; }
    if (typeof user.missionsCompleted !== "number") { user.missionsCompleted = 0; }
    if (user.lastMissionCreditedDate === undefined) { user.lastMissionCreditedDate = null; }
    if (user.monthlyChallenge === undefined) { user.monthlyChallenge = null; }
    if (typeof user.weeklyXpStart !== "number") { user.weeklyXpStart = user.totalXp || user.xp || 0; }
    if (!user.weeklyXpStartDate) { user.weeklyXpStartDate = null; }
    if (typeof user.questStateLastUpdated !== "string") { user.questStateLastUpdated = nowIso(); }
    // Sprint 3 Phase 4: Sentimos currency
    if (typeof user.sentimos !== "number") { user.sentimos = 0; }
    if (!Array.isArray(user.sentimosLog)) { user.sentimosLog = []; }
    if (typeof user.streakFreezeCount !== "number") { user.streakFreezeCount = 0; }
    if (typeof user.streakFreezeActive !== "boolean") { user.streakFreezeActive = false; }
    if (typeof user.streakBrokenFlag !== "boolean") { user.streakBrokenFlag = false; }
    if (typeof user.lastStreakLength !== "number") { user.lastStreakLength = 0; }
    // Sprint 3 Phase 2: Budget weeks counter
    if (typeof user.underBudgetWeeksCount !== "number") { user.underBudgetWeeksCount = 0; }
    if (user.lastBudgetWeekCreditedKey === undefined) { user.lastBudgetWeekCreditedKey = null; }
    // Sprint 3 Phase 2: Personal Records
    if (!user.records || typeof user.records !== "object") {
      user.records = {
        longestStreak: { value: 0, date: null },
        bestWeekXp:    { value: 0, weekStart: null },
        bestMonthSaved: { value: 0, month: null }
      };
    }
    if (!user.preferences || typeof user.preferences !== "object") {
      user.preferences = {};
    }
    if (typeof user.displayName !== "string") {
      user.displayName = getFallbackDisplayName(user.firstName, user.lastName, user.email);
    }
    user.displayName = sanitizeDisplayName(user.displayName) || getFallbackDisplayName(user.firstName, user.lastName, user.email);
    if (typeof user.avatar !== "string") {
      user.avatar = "";
    }
    user.avatar = normalizeAvatar(user.avatar);
    var prefStreakNotifications = (typeof user.preferences.streakNotifications === "boolean")
      ? user.preferences.streakNotifications
      : undefined;
    var prefStreakWeeklySummary = (typeof user.preferences.streakWeeklySummary === "boolean")
      ? user.preferences.streakWeeklySummary
      : undefined;
    var prefStreakEnabled = (typeof user.preferences.streakEnabled === "boolean")
      ? user.preferences.streakEnabled
      : undefined;
    if (typeof user.streakNotifications !== "boolean") {
      user.streakNotifications = (prefStreakNotifications !== undefined) ? prefStreakNotifications : true;
    }
    if (typeof user.streakWeeklySummary !== "boolean") {
      user.streakWeeklySummary = (prefStreakWeeklySummary !== undefined) ? prefStreakWeeklySummary : true;
    }
    if (typeof user.streakEnabled !== "boolean") {
      user.streakEnabled = (prefStreakEnabled !== undefined) ? prefStreakEnabled : true;
    }
    if (user.clearedQuestAt === undefined) { user.clearedQuestAt = null; }
    if (!Array.isArray(user.claimedQuestIds)) { user.claimedQuestIds = []; }
    // Holds a completed-but-unclaimed daily quest that expired at midnight so reward is never lost
    if (user.pendingDailyReward === undefined) { user.pendingDailyReward = null; }
  }

  function getLevelFromXp(xp) {
    var levelInfo = XP_LEVELS[0];
    for (var i = 0; i < XP_LEVELS.length; i++) {
      if (xp >= XP_LEVELS[i].minXp) {
        levelInfo = XP_LEVELS[i];
      }
    }
    return levelInfo;
  }

  function getXpInfoFromUser(user) {
    ensureGamificationFields(user);
    var xp = Math.max(0, Number(user.xp) || 0);
    var current = getLevelFromXp(xp);
    var currentIdx = XP_LEVELS.findIndex(function (l) { return l.level === current.level; });
    var next = currentIdx >= XP_LEVELS.length - 1 ? current : XP_LEVELS[currentIdx + 1];
    var range = Math.max(1, next.minXp - current.minXp);
    var progress = currentIdx >= XP_LEVELS.length - 1 ? 100 : Math.round(((xp - current.minXp) / range) * 100);
    return {
      xp: xp,
      level: current.level,
      levelName: current.name,
      xpForLevel: current.minXp,
      xpForNext: next.minXp,
      progressPct: Math.max(0, Math.min(100, progress))
    };
  }

  function getCurrentStreakFromExpenses(expenses) {
    var set = {};
    (expenses || []).forEach(function (e) {
      set[getLocalDateKey(e.timestamp)] = true;
    });
    var today = new Date();
    var todayKey = getLocalDateKey(today);
    var y = new Date(today);
    y.setDate(today.getDate() - 1);
    var yesterdayKey = getLocalDateKey(y);
    if (!set[todayKey] && !set[yesterdayKey]) { return 0; }
    var cursor = set[todayKey] ? new Date(today) : new Date(y);
    var count = 0;
    while (set[getLocalDateKey(cursor)]) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function getMostRecentStreakLengthFromExpenses(expenses) {
    var daySet = {};
    var latestKey = "";
    (expenses || []).forEach(function (e) {
      var key = getLocalDateKey(e.timestamp);
      daySet[key] = true;
      if (!latestKey || key > latestKey) {
        latestKey = key;
      }
    });
    if (!latestKey) { return 0; }

    var cursor = new Date(latestKey + "T12:00:00");
    var count = 0;
    while (daySet[getLocalDateKey(cursor)]) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function getThisWeekTotal(expenses) {
    var mondayKey = getCurrentWeekMondayKey();
    return expenses.reduce(function (sum, e) {
      return getManilaMondayKey(e.timestamp) === mondayKey ? sum + (Number(e.amount) || 0) : sum;
    }, 0);
  }

  function getCurrentWeekMondayKey() {
    return getManilaMondayKey(new Date());
  }

  function getWeeklyQuestCountFromHistory(questHistory, mondayKey) {
    if (!Array.isArray(questHistory)) { return 0; }
    var monday = new Date(mondayKey + "T00:00:00");
    var nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    return questHistory.reduce(function (count, q) {
      if (!q || !q.completedAt) { return count; }
      var d = new Date(q.completedAt);
      return (d >= monday && d < nextMonday) ? count + 1 : count;
    }, 0);
  }

  function _countQuestStreak(questHistory) {
    // Count consecutive completed weeks (no missed week) from most recent
    var sorted = (questHistory || [])
      .filter(function (q) { return q.completedAt; })
      .slice()
      .sort(function (a, b) { return new Date(b.completedAt) - new Date(a.completedAt); });
    if (sorted.length === 0) { return 0; }
    var count = 1;
    for (var i = 1; i < sorted.length; i++) {
      var prev = getManilaMondayKey(sorted[i - 1].assignedAt || sorted[i - 1].completedAt);
      var curr = getManilaMondayKey(sorted[i].assignedAt || sorted[i].completedAt);
      var prevDate = new Date(prev + "T12:00:00Z");
      var currDate = new Date(curr + "T12:00:00Z");
      var diff = Math.round((prevDate - currDate) / (7 * 24 * 3600 * 1000));
      if (diff === 1) { count++; } else { break; }
    }
    return count;
  }

  function buildAchievementState(user) {
    ensureGamificationFields(user);
    var expenses = Array.isArray(user.expenses) ? user.expenses : [];
    var expenseCount = expenses.length;
    var streak = getCurrentStreakFromExpenses(expenses);
    var levelInfo = getXpInfoFromUser(user);
    var weeklyBudget = Number(user.weeklyBudget) || 0;
    var weekTotal = getThisWeekTotal(expenses);
    var goalsCount = Array.isArray(user.goals) ? user.goals.length : 0;
    var goalsCompleted = Array.isArray(user.goals) ? user.goals.filter(function (g) { return g.completed; }).length : 0;
    var hasEarlyExpense = expenses.some(function (e) {
      return new Date(e.timestamp).getHours() < 7;
    });
    var hasLateExpense = expenses.some(function (e) {
      return new Date(e.timestamp).getHours() >= 22;
    });
    // Unique categories used across all expenses
    var usedCategories = {};
    expenses.forEach(function (e) { if (e.category) { usedCategories[e.category] = true; } });
    var uniqueCategoriesCount = Object.keys(usedCategories).length;
    // Savings total across all goals
    var savingsTotal = Array.isArray(user.goals) ? user.goals.reduce(function (s, g) { return s + (Number(g.savedAmount) || 0); }, 0) : 0;

    return ACHIEVEMENTS.map(function (a) {
      var progress = 0;
      var unlockable = false;
      if (a.type === "expense_count") {
        progress = expenseCount;
        unlockable = progress >= a.target;
      } else if (a.type === "streak" || a.type === "streak_diamonds") {
        progress = streak;
        unlockable = progress >= a.target;
      } else if (a.type === "level") {
        progress = levelInfo.level;
        unlockable = progress >= a.target;
      } else if (a.type === "time_of_day") {
        if (a.id === "early-bird") { progress = hasEarlyExpense ? 1 : 0; }
        else if (a.id === "night-owl") { progress = hasLateExpense ? 1 : 0; }
        unlockable = progress >= 1;
      } else if (a.type === "budget_week") {
        progress = (weeklyBudget > 0 && weekTotal > 0 && weekTotal < weeklyBudget) ? 1 : 0;
        unlockable = progress >= 1;
      } else if (a.type === "budget_frugal") {
        progress = (weeklyBudget > 0 && weekTotal > 0 && weekTotal <= weeklyBudget * 0.5) ? 1 : 0;
        unlockable = progress >= 1;
      } else if (a.type === "goal_count") {
        progress = goalsCount;
        unlockable = progress >= a.target;
      } else if (a.type === "goals_completed") {
        progress = goalsCompleted;
        unlockable = progress >= a.target;
      } else if (a.type === "category_variety") {
        progress = uniqueCategoriesCount;
        unlockable = progress >= a.target;
      } else if (a.type === "mission_count") {
        progress = user.missionsCompleted || 0;
        unlockable = progress >= a.target;
      } else if (a.type === "quest_count") {
        progress = user.questsCompleted || 0;
        unlockable = progress >= a.target;
      } else if (a.type === "quest_streak") {
        progress = _countQuestStreak(user.questHistory);
        unlockable = progress >= a.target;
      } else if (a.type === "savings_total") {
        progress = savingsTotal;
        unlockable = progress >= a.target;
      } else if (a.type === "budget_weeks_total") {
        progress = user.underBudgetWeeksCount || 0;
        unlockable = progress >= a.target;
      }

      var claimed = user.unlockedAchievements.indexOf(a.id) !== -1;
      var notified = user.notifiedAchievements.indexOf(a.id) !== -1;
      var pendingClaim = user.pendingAchievementClaims.indexOf(a.id) !== -1;
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        target: a.target,
        progress: progress,
        unlockable: unlockable,
        claimed: claimed,
        notified: notified,
        pendingClaim: pendingClaim,
        series: a.series || null,
        tier: a.tier || null,
        totalTiers: a.totalTiers || null,
        rarity: a.rarity || "bronze",
        threshold: a.threshold || a.target
      };
    });
  }

  function touchQuestState(user) {
    if (!user) { return; }
    user.questStateLastUpdated = nowIso();
  }

  function syncGamificationFields(userId, user) {
    if (!window.FirestoreService) { return; }
    ensureGamificationFields(user);
    var xpInfo = getXpInfoFromUser(user);
    var streakPrefs = getStreakPreferencesFromUser(user);
    var fallbackDisplayName = getFallbackDisplayName(user.firstName, user.lastName, user.email);
    var displayName = sanitizeDisplayName(user.displayName) || fallbackDisplayName;
    var avatar = normalizeAvatar(user.avatar);
    var displayNameLower = displayName.toLowerCase();
    window.FirestoreService.setUserDoc(userId, {
      xp: user.xp,
      level: xpInfo.level,
      sentimos: user.sentimos || 0,
      sentimosLog: Array.isArray(user.sentimosLog) ? user.sentimosLog.slice(0, 50) : [],
      streakFreezeCount: Number(user.streakFreezeCount || 0),
      unlockedAchievements: user.unlockedAchievements,
      notifiedAchievements: user.notifiedAchievements,
      dailyXpLog: user.dailyXpLog,
      activeQuest: user.activeQuest || null,
      questHistory: Array.isArray(user.questHistory) ? user.questHistory.slice(0, 100) : [],
      questsCompleted: Number(user.questsCompleted || 0),
      claimedQuestIds: Array.isArray(user.claimedQuestIds) ? user.claimedQuestIds.slice(0, 200) : [],
      pendingDailyReward: user.pendingDailyReward || null,
      questStateLastUpdated: String(user.questStateLastUpdated || nowIso()),
      displayName: displayName,
      avatar: avatar || null,
      streakNotifications: streakPrefs.streakNotifications,
      streakWeeklySummary: streakPrefs.streakWeeklySummary,
      streakEnabled: streakPrefs.streakEnabled,
      publicProfile: {
        displayName: displayName,
        displayNameLower: displayNameLower,
        avatar: avatar || null
      }
    });
  }

  function getUserById(store, userId) {
    return store.users.find(function (user) {
      return user.id === userId;
    }) || null;
  }

  async function syncFromFirestore(userId) {
    if (!window.FirestoreService) {
      return;
    }

    // Fetch all Firestore data FIRST (before touching localStorage).
    // This is critical: loading the store before the awaits captures a stale
    // snapshot that can be seconds old by the time Firestore returns, silently
    // overwriting any local quest progress, expense additions, or XP changes
    // the user made while the round-trip was in flight.
    var firestoreUser     = await window.FirestoreService.getUserDoc(userId);
    var page = document.body ? String(document.body.getAttribute("data-page") || "") : "";
    var expenseLimit = page === "activity" ? null : 200;
    var firestoreExpenses = await window.FirestoreService.getExpenseDocs(userId, expenseLimit);
    var firestoreQuickAdd = await window.FirestoreService.getQuickAddItemDocs(userId);

    // Load the store NOW — after all awaits — so we get the freshest local
    // state (including any quest completions triggered during the fetch).
    var store = loadStore();
    var user = getUserById(store, userId);
    if (!user) {
      return;
    }
    ensureGamificationFields(user);

    if (firestoreUser) {
      if (typeof firestoreUser.weeklyBudget === "number") {
        user.weeklyBudget = sanitizeAmount(firestoreUser.weeklyBudget);
      }
      if (firestoreUser.firstName) {
        user.firstName = sanitizeName(firestoreUser.firstName);
      }
      if (firestoreUser.lastName) {
        user.lastName = sanitizeName(firestoreUser.lastName);
      }
      if (typeof firestoreUser.displayName === "string") {
        user.displayName = sanitizeDisplayName(firestoreUser.displayName);
      }
      if (typeof firestoreUser.avatar === "string") {
        user.avatar = normalizeAvatar(firestoreUser.avatar);
      }
      if (typeof firestoreUser.xp === "number") {
        user.xp = Math.max(0, Math.floor(firestoreUser.xp));
      }
      if (typeof firestoreUser.level === "number") {
        user.level = Math.max(1, Math.floor(firestoreUser.level));
      }
      if (Array.isArray(firestoreUser.unlockedAchievements)) {
        user.unlockedAchievements = firestoreUser.unlockedAchievements.slice();
      }
      if (Array.isArray(firestoreUser.notifiedAchievements)) {
        user.notifiedAchievements = firestoreUser.notifiedAchievements.slice();
      }
      if (firestoreUser.dailyXpLog && typeof firestoreUser.dailyXpLog === "object") {
        user.dailyXpLog = firestoreUser.dailyXpLog;
      }
      if (typeof firestoreUser.emailOptIn === "boolean") {
        user.preferences = user.preferences || {};
        user.preferences.emailOptIn = firestoreUser.emailOptIn;
      }
      if (typeof firestoreUser.lastEmailSentAt === "string") {
        user.preferences = user.preferences || {};
        user.preferences.lastEmailSentAt = firestoreUser.lastEmailSentAt;
      }
      if (typeof firestoreUser.streakNotifications === "boolean") {
        user.streakNotifications = firestoreUser.streakNotifications;
      }
      if (typeof firestoreUser.streakWeeklySummary === "boolean") {
        user.streakWeeklySummary = firestoreUser.streakWeeklySummary;
      }
      if (typeof firestoreUser.streakEnabled === "boolean") {
        user.streakEnabled = firestoreUser.streakEnabled;
      }
      if (firestoreUser.publicProfile && typeof firestoreUser.publicProfile === "object") {
        if (typeof firestoreUser.publicProfile.displayName === "string") {
          user.displayName = sanitizeDisplayName(firestoreUser.publicProfile.displayName);
        }
        if (typeof firestoreUser.publicProfile.avatar === "string") {
          user.avatar = normalizeAvatar(firestoreUser.publicProfile.avatar);
        }
      }

      var remoteQuestStamp = String(firestoreUser.questStateLastUpdated || "");
      var localQuestStamp = String(user.questStateLastUpdated || "");
      var shouldUseRemoteQuestState = !!remoteQuestStamp && (!localQuestStamp || remoteQuestStamp >= localQuestStamp);
      if (shouldUseRemoteQuestState) {
        if (firestoreUser.activeQuest === null || (firestoreUser.activeQuest && typeof firestoreUser.activeQuest === "object")) {
          user.activeQuest = firestoreUser.activeQuest;
        }
        if (Array.isArray(firestoreUser.questHistory)) {
          user.questHistory = firestoreUser.questHistory.slice();
        }
        if (typeof firestoreUser.questsCompleted === "number") {
          user.questsCompleted = Math.max(0, Math.floor(firestoreUser.questsCompleted));
        }
        if (Array.isArray(firestoreUser.claimedQuestIds)) {
          user.claimedQuestIds = firestoreUser.claimedQuestIds.slice();
        }
        if (firestoreUser.pendingDailyReward === null || (firestoreUser.pendingDailyReward && typeof firestoreUser.pendingDailyReward === "object")) {
          user.pendingDailyReward = firestoreUser.pendingDailyReward;
        }
        user.questStateLastUpdated = remoteQuestStamp;
      }

      if (typeof firestoreUser.sentimos === "number") {
        user.sentimos = Math.max(0, Math.floor(firestoreUser.sentimos));
      }
      if (Array.isArray(firestoreUser.sentimosLog)) {
        user.sentimosLog = firestoreUser.sentimosLog.slice(0, 50);
      }
      if (typeof firestoreUser.streakFreezeCount === "number") {
        user.streakFreezeCount = Math.max(0, Math.floor(firestoreUser.streakFreezeCount));
      }
    }

    if (Array.isArray(firestoreExpenses)) {
      // Firestore expenses are authoritative even when the remote list is empty.
      user.expenses = firestoreExpenses.slice();
    }

    if (Array.isArray(firestoreQuickAdd) && firestoreQuickAdd.length > 0) {
      user.quickAddItems = firestoreQuickAdd;
    }

    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:synced"));
  }

  function ensureLocalUserFromSession(sessionUser) {
    if (!sessionUser || !sessionUser.id) {
      return;
    }

    var store = loadStore();
    var existing = getUserById(store, sessionUser.id);
    var firstName = "";
    var lastName = "";
    var displayName = sanitizeDisplayName(sessionUser.displayName);

    if (displayName) {
      var parts = displayName.split(" ");
      firstName = sanitizeName(parts.shift());
      lastName = sanitizeName(parts.join(" "));
    }

    var resolvedDisplayName = displayName || getFallbackDisplayName(firstName, lastName, sessionUser.email);

    if (!existing) {
      var newFriendCode = generateFriendCode(firstName || sessionUser.id);
      store.users.push({
        id: sessionUser.id,
        firstName: firstName,
        lastName: lastName,
        username: resolvedDisplayName,
        displayName: resolvedDisplayName,
        avatar: "",
        email: sanitizeEmail(sessionUser.email),
        password: "",
        weeklyBudget: 0,
        expenses: [],
        quickAddItems: [],
        xp: 0,
        level: 1,
        unlockedAchievements: [],
        notifiedAchievements: [],
        dailyXpLog: { dateKey: getLocalDateKey(), xpFromLogging: 0 },
        goals: [],
        preferences: {},
        friendCode: newFriendCode,
        createdAt: nowIso()
      });

      if (window.FirestoreService) {
        // Never push local default counters/budget on first local bootstrap.
        // Existing cloud users may already have real values from another device.
        window.FirestoreService.claimFriendCode(sessionUser.id, newFriendCode).catch(function () {});
      }
    } else {
      // Ensure existing Firebase users who pre-date shortcodes get a code assigned
      if (!existing.friendCode) {
        existing.friendCode = generateFriendCode(existing.firstName || firstName || "user");
        if (window.FirestoreService && window.FirestoreService.claimFriendCode) {
          window.FirestoreService.claimFriendCode(sessionUser.id, existing.friendCode).catch(function () {});
        }
      }
      if (sessionUser.email) {
        existing.email = sanitizeEmail(sessionUser.email);
      }
      if (resolvedDisplayName) {
        existing.username = resolvedDisplayName;
        if (!existing.displayName) {
          existing.displayName = resolvedDisplayName;
        }
        if (!existing.firstName) {
          existing.firstName = firstName;
        }
        if (!existing.lastName) {
          existing.lastName = lastName;
        }
      }
    }

    store.session = {
      userId: sessionUser.id,
      createdAt: nowIso(),
      provider: "firebase"
    };
    saveStore(store);

    if (window.FirestoreService && window.FirestoreService.seedUserDoc) {
      window.FirestoreService.seedUserDoc(sessionUser.id, {
        firstName: firstName,
        lastName: lastName,
        email: sanitizeEmail(sessionUser.email)
      }).catch(function () {});
    }
  }

  function clearSession() {
    var store = loadStore();
    store.session = null;
    saveStore(store);
    try {
      localStorage.removeItem("sugbocents_friend_cache"); // legacy key
      localStorage.removeItem("sugbocents_lb_players_v2"); // legacy key
      localStorage.removeItem("sugbocents_lb_snapshot"); // legacy key
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (key && (
          key.indexOf("sugbocents_friend_cache_") === 0 ||
          key.indexOf("sugbocents_lb_players_v3_") === 0 ||
          key.indexOf("sugbocents_lb_snapshot_v2_") === 0
        )) {
          localStorage.removeItem(key);
        }
      }
    } catch (_) {}
  }

  function isFirebaseAuthEnabled() {
    return Boolean(
      window.FirebaseInit &&
      window.FirebaseInit.isFirebaseMode &&
      window.FirebaseInit.isFirebaseMode() &&
      window.FirebaseAuthService
    );
  }

  function resolveAuthState() {
    if (!window.FirebaseInit || !window.FirebaseInit.ready) {
      return Promise.resolve();
    }

    return window.FirebaseInit.ready.then(function () {
      if (!isFirebaseAuthEnabled() || !window.FirebaseAuthService.onAuthStateChanged) {
        return;
      }

      return new Promise(function (resolve) {
        var resolved = false;
        var cleanedUp = false;
        var cleanupTimer = null;
        function cleanup() {
          if (cleanedUp) { return; }
          cleanedUp = true;
          if (cleanupTimer) {
            clearTimeout(cleanupTimer);
            cleanupTimer = null;
          }
          try { unsubscribe(); } catch (_) {}
        }
        var unsubscribe = window.FirebaseAuthService.onAuthStateChanged(function (user) {
          if (user) {
            ensureLocalUserFromSession(user);
          } else {
            clearSession();
          }

          var currentSession = loadStore();
          var currentUserId = currentSession.session ? currentSession.session.userId : null;
          var syncPromise = (user && currentUserId && window.FirestoreService)
            ? syncFromFirestore(currentUserId)
            : Promise.resolve();
          syncPromise.then(function () {
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }).catch(function () {
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve();
            }
          });
        });

        setTimeout(function () {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 1200);

        // Keep the listener alive briefly after fallback resolve so slow devices
        // can still complete first auth sync and hydrate cloud-backed data.
        cleanupTimer = setTimeout(function () {
          cleanup();
        }, 15000);
      });
    }).catch(function () {
      // Ignore init errors and keep local fallback behavior.
    });
  }

  function getSession() {
    var store = loadStore();
    return store.session;
  }

  function getCurrentUser() {
    var store = loadStore();
    if (!store.session || !store.session.userId) {
      return null;
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return null;
    }

    var firstName = sanitizeName(user.firstName);
    var lastName = sanitizeName(user.lastName);
    ensureGamificationFields(user);
    var fallbackDisplayName = getFallbackDisplayName(firstName, lastName, user.email);
    var displayName = sanitizeDisplayName(user.displayName) || fallbackDisplayName;
    var avatar = normalizeAvatar(user.avatar);
    var mondayKey = getCurrentWeekMondayKey();
    var weeklyQuestsCompleted = getWeeklyQuestCountFromHistory(user.questHistory, mondayKey);

    return {
      id: user.id,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      username: displayName,
      displayName: displayName,
      avatar: avatar,
      weeklyBudget: user.weeklyBudget || 0,
      expenses: Array.isArray(user.expenses) ? user.expenses : [],
      xp: user.xp || 0,
      level: user.level || 1,
      unlockedAchievements: user.unlockedAchievements.slice(),
      friendCode: user.friendCode || null,
      // Gamification fields required by leaderboard.js getSelf()
      questsCompleted: user.questsCompleted || 0,
      weeklyQuestsCompleted: weeklyQuestsCompleted,
      weeklyXpStart: typeof user.weeklyXpStart === "number" ? user.weeklyXpStart : 0,
      weeklyXpStartDate: user.weeklyXpStartDate || null,
      createdAt: user.createdAt || null
    };
  }

  // ── Friend Code ─────────────────────────────────────────────────────
  // Generates a NAME#NNNN friend shortcode (e.g. carlos#4821)
  // Stored all-lowercase; displayed with first letter capitalized in the UI.
  function generateFriendCode(firstName) {
    var name = String(firstName || "user").toLowerCase().replace(/[^a-z]/g, "").slice(0, 10) || "user";
    var digits = String(1000 + Math.floor(Math.random() * 9000));
    return name + "#" + digits;
  }

  function registerUserLocal(input, legacyPassword) {
    var payload = typeof input === "object" && input !== null
      ? input
      : { email: input, password: legacyPassword };

    var firstName = sanitizeName(payload.firstName);
    var lastName = sanitizeName(payload.lastName);
    var cleanEmail = sanitizeEmail(payload.email);
    var cleanPassword = String(payload.password || "");

    if (!firstName || !lastName) {
      return { ok: false, error: "First and last name are required." };
    }

    if (!cleanEmail) {
      return { ok: false, error: "Email is required." };
    }

    if (!cleanPassword) {
      return { ok: false, error: "Password is required." };
    }

    var username = [firstName, lastName].join(" ");
    var store = loadStore();

    var exists = store.users.some(function (user) {
      return sanitizeEmail(user.email) === cleanEmail;
    });

    if (exists) {
      return { ok: false, error: "Email is already registered." };
    }

    var newUser = {
      id: "user_" + Date.now(),
      firstName: firstName,
      lastName: lastName,
      username: username,
      displayName: username,
      avatar: "",
      email: cleanEmail,
      password: cleanPassword,
      weeklyBudget: 0,
      expenses: [],
      quickAddItems: [],
      xp: 0,
      level: 1,
      unlockedAchievements: [],
      notifiedAchievements: [],
      dailyXpLog: { dateKey: getLocalDateKey(), xpFromLogging: 0 },
      goals: [],
      preferences: {},
      friendCode: generateFriendCode(firstName),
      createdAt: nowIso()
    };

    store.users.push(newUser);
    store.session = { userId: newUser.id, createdAt: nowIso(), provider: "local" };
    saveStore(store);

    return {
      ok: true,
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email
      }
    };
  }

  function loginUserLocal(email, password) {
    var cleanEmail = sanitizeEmail(email);
    var cleanPassword = String(password);
    var store = loadStore();

    var user = store.users.find(function (candidate) {
      return sanitizeEmail(candidate.email) === cleanEmail && String(candidate.password) === cleanPassword;
    });

    if (!user) {
      return { ok: false, error: "Incorrect email or password." };
    }

    store.session = { userId: user.id, createdAt: nowIso(), provider: "local" };
    saveStore(store);
    return { ok: true, user: { id: user.id, email: user.email } };
  }

  async function registerUser(input, legacyPassword) {
    var payload = typeof input === "object" && input !== null
      ? input
      : { email: input, password: legacyPassword };

    if (!isFirebaseAuthEnabled() || !window.FirebaseAuthService.registerUser) {
      return registerUserLocal(payload, legacyPassword);
    }

    var result = await window.FirebaseAuthService.registerUser(payload);
    if (!result.ok) {
      return result;
    }

    ensureLocalUserFromSession({
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName
    });

    var user = getCurrentUser();
    if (window.FirestoreService && result.user && result.user.id) {
      window.FirestoreService.setUserDoc(result.user.id, {
        createdAt: user && user.createdAt ? user.createdAt : nowIso(),
        lastLoginAt: nowIso(),
        weeklyBudget: user && user.weeklyBudget ? user.weeklyBudget : 0,
        expenseCount: user && Array.isArray(user.expenses) ? user.expenses.length : 0,
        currentStreak: user && user.expenses ? getCurrentStreakFromExpenses(user.expenses) : 0
      });
    }
    return {
      ok: true,
      user: user || result.user
    };
  }

  async function loginUser(email, password) {
    if (!isFirebaseAuthEnabled() || !window.FirebaseAuthService.loginUser) {
      return loginUserLocal(email, password);
    }

    var result = await window.FirebaseAuthService.loginUser(email, password);
    if (!result.ok) {
      return result;
    }

    ensureLocalUserFromSession({
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName
    });

    if (window.FirestoreService && result.user && result.user.id) {
      window.FirestoreService.setUserDoc(result.user.id, {
        lastLoginAt: nowIso()
      });
    }

    return { ok: true, user: getCurrentUser() || result.user };
  }

  async function logout() {
    if (isFirebaseAuthEnabled() && window.FirebaseAuthService.logout) {
      await window.FirebaseAuthService.logout();
    }
    clearSession();
  }

  function saveWeeklyBudget(amount) {
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    user.weeklyBudget = Math.max(0, sanitizeAmount(amount));
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));

    if (window.FirestoreService) {
      window.FirestoreService.setUserDoc(store.session.userId, { weeklyBudget: user.weeklyBudget });
    }

    return { ok: true, weeklyBudget: user.weeklyBudget };
  }

  function getWeeklyBudget() {
    var user = getCurrentUser();
    return user ? sanitizeAmount(user.weeklyBudget) : 0;
  }

  function addExpense(data) {
    var amount = sanitizeAmount(data && data.amount);
    if (amount <= 0) {
      return { ok: false, error: "Expense amount must be greater than zero." };
    }

    var rawCategory = String((data && data.category) || "");
    var isRaw = !!(data && data.raw);
    var categoryId = isRaw ? rawCategory : normalizeLegacyCategory(rawCategory);

    var note = data && data.note ? String(data.note).trim() : "";
    if (!isRaw && categoryId === "others" && !note) {
      return { ok: false, error: "A description is required for Others expenses." };
    }

    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }
    ensureGamificationFields(user);
    var beforeUnlockable = buildAchievementState(user)
      .filter(function (a) { return a.unlockable && !a.claimed; })
      .map(function (a) { return a.id; });

    var entry = {
      id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      amount: amount,
      category: categoryId,
      timestamp: (data && data.timestamp) ? String(data.timestamp) : nowIso(),
      note: note
    };
    if (data && data.categoryId) {
      entry.categoryId = String(data.categoryId);
    }

    if (!Array.isArray(user.expenses)) {
      user.expenses = [];
    }

    var streakBeforeLog = getCurrentStreakFromExpenses(user.expenses || []);
    var lastClosedStreak = getMostRecentStreakLengthFromExpenses(user.expenses || []);
    var shouldMarkStreakBroken = streakBeforeLog === 0 && lastClosedStreak >= 2;

    // First expense of the day earns a bonus (10 XP vs 5 XP) — daily opening hook.
    var todayDateKey = getLocalDateKey();
    var isFirstLogToday = !user.expenses.some(function (e) {
      return e.timestamp && getLocalDateKey(e.timestamp) === todayDateKey;
    });

    user.expenses.unshift(entry);
    var xpToAward = isFirstLogToday ? 10 : 5;
    var xpAwarded = addXpInternal(user, xpToAward, "expense_log");
    // Sentimos: ₵5 per expense + ₵2 first-of-day bonus
    addSentimosInternal(user, 5, "expense");
    if (isFirstLogToday) { addSentimosInternal(user, 2, "first-log-bonus"); }
    // Streak milestone Sentimos rewards
    var newStreak = getCurrentStreakFromExpenses(user.expenses);
    user.streakBrokenFlag = shouldMarkStreakBroken;
    if (shouldMarkStreakBroken) {
      user.lastStreakLength = lastClosedStreak;
    }
    var STREAK_MILESTONES = { 7: 10, 14: 20, 30: 50, 100: 100 };
    if (STREAK_MILESTONES[newStreak]) {
      addSentimosInternal(user, STREAK_MILESTONES[newStreak], "streak-" + newStreak);
    }
    // Update longestStreak record
    if (!user.records) { user.records = { longestStreak: { value: 0, date: null }, bestWeekXp: { value: 0, weekStart: null }, bestMonthSaved: { value: 0, month: null } }; }
    if (newStreak > (user.records.longestStreak.value || 0)) {
      user.records.longestStreak = { value: newStreak, date: getLocalDateKey() };
    }
    var afterUnlockable = buildAchievementState(user)
      .filter(function (a) { return a.unlockable && !a.claimed; })
      .map(function (a) { return a.id; });
    var newUnlockables = afterUnlockable.filter(function (id) {
      return beforeUnlockable.indexOf(id) === -1;
    });
    saveStore(store);
    // Sprint 3: Update quest progress BEFORE dispatching so the UI always sees
    // accurate quest state in the single dataChanged event that follows.
    updateQuestProgress();
    updateDailyQuestProgressInternal(store, user);
    // Update cross-page badge count for ALL quests (not just the tracked one).
    _computeAndCacheQuestBadge(user);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));

    if (window.FirestoreService) {
      window.FirestoreService.addExpenseDoc(store.session.userId, entry);
      syncGamificationFields(store.session.userId, user);
      var currentStreak = getCurrentStreakFromExpenses(user.expenses || []);
      var xpInfoForSync = getXpInfoFromUser(user);
      var weeklyQuestCount = getWeeklyQuestCountFromHistory(user.questHistory, getCurrentWeekMondayKey());
      var budgetSummary = getBudgetSummary();
      window.FirestoreService.setUserDoc(store.session.userId, {
        weeklyBudget: user.weeklyBudget || 0,
        expenseCount: Array.isArray(user.expenses) ? user.expenses.length : 0,
        weekSpent: Number(budgetSummary.totalSpentThisWeek || 0),
        currentStreak: currentStreak,
        streakBrokenFlag: user.streakBrokenFlag === true,
        lastStreakLength: Number(user.lastStreakLength || 0),
        lastExpenseDate: getManilaDayKey(entry.timestamp || nowIso()),
        lastLoginAt: nowIso()
      });
      window.FirestoreService.syncPublicProfile(store.session.userId, {
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        streak: currentStreak,
        questsCompleted: user.questsCompleted || 0,
        weeklyQuestsCompleted: weeklyQuestCount,
        xp: user.xp || 0,
        weeklyXpStart: user.weeklyXpStart || 0,
        weeklyXpStartDate: user.weeklyXpStartDate || null,
        level: xpInfoForSync.level,
        levelName: xpInfoForSync.levelName,
        friendCode: user.friendCode || null
      });
      // Write a feed entry so friends see this activity on the leaderboard live feed
      if (window.FirestoreService.writeGlobalFeedEntry) {
        var CAT_EMOJI = {
          food: "🍜", transport: "🚌", coffee: "☕", groceries: "🛒",
          shopping: "🛍️", bills: "💡", entertainment: "🎮", health: "💊",
          education: "📚", others: "📊"
        };
        var catEmoji = CAT_EMOJI[entry.category] || "📊";
        var firstName = user.firstName || "Someone";
        window.FirestoreService.writeGlobalFeedEntry(store.session.userId, {
          type:          "expense",
          emoji:         catEmoji,
          message:       firstName + " logged an expense",
          authorName:    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Friend",
          authorInitial: (user.firstName || "?").charAt(0).toUpperCase()
        });
      }
    }

    return {
      ok: true,
      expense: entry,
      xpAwarded: xpAwarded,
      newlyUnlockableAchievements: newUnlockables
    };
  }

  function getExpenses(limit) {
    var user = getCurrentUser();
    var expenses = user ? user.expenses : [];
    if (!Array.isArray(expenses)) {
      return [];
    }

    // Normalize legacy categories in-memory (never writes to storage)
    var normalized = expenses.map(function (e) {
      var catId = normalizeLegacyCategory(e.category);
      if (catId === e.category) { return e; }
      return Object.assign({}, e, { category: catId });
    });

    var sorted = normalized.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    if (typeof limit === "number" && limit > 0) {
      return sorted.slice(0, limit);
    }

    return sorted;
  }

  function getExpenseCategories() {
    return EXPENSE_CATEGORIES.slice();
  }

  function getBudgetSummary() {
    var weeklyBudget = getWeeklyBudget();
    var allExpenses = getExpenses();

    // Filter to current week only (Monday-start, matching spending-chart.js logic)
    var now = new Date();
    var dayOfWeek = now.getDay();
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);

    var totalSpentThisWeek = allExpenses.reduce(function (sum, expense) {
      var d = new Date(expense.timestamp);
      if (d >= weekStart && d < weekEnd) {
        return sum + sanitizeAmount(expense.amount);
      }
      return sum;
    }, 0);

    totalSpentThisWeek = sanitizeAmount(totalSpentThisWeek);
    var remaining = sanitizeAmount(weeklyBudget - totalSpentThisWeek);
    var percentageSpent = weeklyBudget > 0
      ? Math.min(100, Math.round((totalSpentThisWeek / weeklyBudget) * 100))
      : 0;

    return {
      weeklyBudget: weeklyBudget,
      totalSpentThisWeek: totalSpentThisWeek,
      remaining: remaining,
      percentageSpent: percentageSpent
    };
  }

  // ── AI Context ────────────────────────────────────────────────────
  // Returns a strictly typed, sanitized snapshot of the current user's
  // real financial + gamification state for the chat AI to ground its
  // replies on. Every value is computed from existing StorageAPI data —
  // no defaults, no fake numbers. Missing/unset fields are reported as
  // `null` and listed under `missing[]` so the server prompt can tell
  // the LLM "you don't have this info, do not invent it".
  //
  // SECURITY NOTE: This object travels client → Cloud Function as a
  // structured JSON payload (NOT a free-text systemPrompt). The server
  // re-validates every field against a whitelist before it builds the
  // system prompt, so prompt-injection via these values is impossible
  // (numbers are coerced to numbers, strings are length-capped, the
  // goals array is cardinality-capped). See functions/index.js → chat.
  function getAiContext() {
    var user = getCurrentUser();
    if (!user) {
      return { hasData: false, missing: ["user"] };
    }

    var missing = [];

    var budgetSummary = getBudgetSummary();
    var weeklyBudget = Number(budgetSummary.weeklyBudget) || 0;
    var totalSpentThisWeek = Number(budgetSummary.totalSpentThisWeek) || 0;
    var remaining = Number(budgetSummary.remaining) || 0;
    var percentageSpent = Number(budgetSummary.percentageSpent) || 0;

    if (weeklyBudget <= 0) { missing.push("weeklyBudget"); }

    var streak = 0;
    try { streak = Number(getCurrentStreak()) || 0; } catch (_) { streak = 0; }

    var levelInfo = { level: 1, levelName: "Sentimo", xp: 0 };
    try {
      var info = getXpInfo();
      if (info && typeof info === "object") {
        levelInfo.level = Number(info.level) || 1;
        levelInfo.levelName = String(info.levelName || "Sentimo");
        levelInfo.xp = Number(info.xp) || 0;
      }
    } catch (_) { /* keep defaults */ }

    // Top spending category this week
    var weekStart = new Date();
    var dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - ((dayOfWeek + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    var allExpenses = Array.isArray(user.expenses) ? user.expenses : [];
    var weekExpenses = allExpenses.filter(function (e) {
      var d = new Date(e.timestamp);
      return d >= weekStart && d < weekEnd;
    });
    var byCat = {};
    weekExpenses.forEach(function (e) {
      var cat = String(e.category || "other");
      byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
    });
    var topCategory = null;
    var topCategoryAmount = 0;
    Object.keys(byCat).forEach(function (cat) {
      if (byCat[cat] > topCategoryAmount) {
        topCategory = cat;
        topCategoryAmount = byCat[cat];
      }
    });
    if (!topCategory) { missing.push("topCategory"); }

    // Goals — cap at 5 to keep payload small
    var goals = [];
    try {
      var rawGoals = getGoals();
      if (Array.isArray(rawGoals) && rawGoals.length > 0) {
        goals = rawGoals.slice(0, 5).map(function (g) {
          var target = Number(g.targetAmount || g.target || 0) || 0;
          var saved = Number(g.savedAmount || g.saved || 0) || 0;
          var pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
          return {
            name: String(g.name || g.title || "Goal").slice(0, 40),
            target: target,
            saved: saved,
            percent: pct,
            completed: Boolean(g.completed)
          };
        });
      }
    } catch (_) { goals = []; }
    if (goals.length === 0) { missing.push("goals"); }

    var firstName = String(user.firstName || "").slice(0, 30);
    if (!firstName) { missing.push("firstName"); }

    return {
      hasData: true,
      firstName: firstName || null,
      currency: "PHP",
      weeklyBudget: weeklyBudget,
      totalSpentThisWeek: totalSpentThisWeek,
      remaining: remaining,
      percentageSpent: percentageSpent,
      expenseCountThisWeek: weekExpenses.length,
      topCategory: topCategory,
      topCategoryAmount: topCategoryAmount,
      currentStreak: streak,
      level: levelInfo.level,
      levelName: levelInfo.levelName,
      goals: goals,
      missing: missing
    };
  }

  function addXpInternal(user, amount, source) {
    ensureGamificationFields(user);
    var grant = Math.max(0, Math.floor(Number(amount) || 0));
    if (grant <= 0) { return 0; }
    var prevLevel = user.level;
    user.xp = Math.max(0, Number(user.xp || 0) + grant);
    user.level = getLevelFromXp(user.xp).level;
    // Level-up Sentimos reward
    if (user.level > prevLevel) {
      addSentimosInternal(user, 75, "level-up");
    }
    // Update personal record: bestWeekXp
    var now = new Date();
    var weekMondayKey = getLocalDateKey((function () {
      var d = new Date(now);
      var day = d.getDay();
      d.setDate(d.getDate() - ((day + 6) % 7));
      d.setHours(0, 0, 0, 0);
      return d;
    }()));
    if (!user.records) { user.records = { longestStreak: { value: 0, date: null }, bestWeekXp: { value: 0, weekStart: null }, bestMonthSaved: { value: 0, month: null } }; }
    if (!user.weeklyXpStartDate || user.weeklyXpStartDate !== weekMondayKey) {
      user.weeklyXpStart = user.xp - grant;
      user.weeklyXpStartDate = weekMondayKey;
    }
    var weekXp = Math.max(0, user.xp - (user.weeklyXpStart || 0));
    if (weekXp > (user.records.bestWeekXp.value || 0)) {
      user.records.bestWeekXp = { value: weekXp, weekStart: weekMondayKey };
    }
    return grant;
  }

  // ── Sprint 3 Phase 4: Sentimos Currency ──────────────────

  function addSentimosInternal(user, amount, source) {
    ensureGamificationFields(user);
    var grant = Math.max(0, Math.floor(Number(amount) || 0));
    if (grant <= 0) { return 0; }
    user.sentimos = (user.sentimos || 0) + grant;
    user.sentimosLog.unshift({ amount: grant, source: source || "unknown", type: "earn", date: nowIso() });
    if (user.sentimosLog.length > 50) { user.sentimosLog = user.sentimosLog.slice(0, 50); }
    return grant;
  }

  function getSentimosBalance() {
    var store = loadStore();
    if (!store.session) { return 0; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return 0; }
    ensureGamificationFields(user);
    return user.sentimos || 0;
  }

  function addSentimos(amount, source) {
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No active session." }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }
    var granted = addSentimosInternal(user, amount, source || "manual");
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    if (window.FirestoreService && window.FirestoreService.syncPublicProfile) {
      window.FirestoreService.syncPublicProfile(store.session.userId, user);
    }
    return { ok: true, newBalance: user.sentimos, granted: granted };
  }

  function spendSentimos(amount, reason) {
    var cost = Math.max(0, Math.floor(Number(amount) || 0));
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No active session." }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }
    ensureGamificationFields(user);
    if ((user.sentimos || 0) < cost) {
      return { ok: false, error: "Insufficient Sentimos.", balance: user.sentimos || 0 };
    }
    user.sentimos = (user.sentimos || 0) - cost;
    user.sentimosLog.unshift({ amount: cost, source: reason || "spend", type: "spend", date: nowIso() });
    if (user.sentimosLog.length > 50) { user.sentimosLog = user.sentimosLog.slice(0, 50); }
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true, newBalance: user.sentimos };
  }

  function getSentimosLog() {
    var store = loadStore();
    if (!store.session) { return []; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return []; }
    ensureGamificationFields(user);
    return user.sentimosLog.slice(0, 10);
  }

  function getStreakFreezeCount() {
    var store = loadStore();
    if (!store.session) { return 0; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return 0; }
    ensureGamificationFields(user);
    return user.streakFreezeCount || 0;
  }

  function activateStreakFreeze() {
    var FREEZE_COST = 50;
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No active session." }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }
    ensureGamificationFields(user);
    if ((user.streakFreezeCount || 0) >= 2) {
      return { ok: false, error: "Already at maximum freezes (2)." };
    }
    if ((user.sentimos || 0) < FREEZE_COST) {
      return { ok: false, error: "Insufficient Sentimos.", balance: user.sentimos || 0, cost: FREEZE_COST };
    }
    user.sentimos = (user.sentimos || 0) - FREEZE_COST;
    user.sentimosLog.unshift({ amount: FREEZE_COST, source: "streak-freeze", type: "spend", date: nowIso() });
    user.streakFreezeCount = (user.streakFreezeCount || 0) + 1;
    user.streakFreezeActive = true;
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true, newBalance: user.sentimos, freezeCount: user.streakFreezeCount };
  }

  function useStreakFreeze() {
    // Consume one equipped freeze to protect a broken streak
    var store = loadStore();
    if (!store.session) { return { ok: false }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false }; }
    ensureGamificationFields(user);
    if ((user.streakFreezeCount || 0) <= 0) { return { ok: false, error: "No freeze equipped." }; }
    user.streakFreezeCount = Math.max(0, (user.streakFreezeCount || 0) - 1);
    user.streakFreezeActive = user.streakFreezeCount > 0;
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true, newCount: user.streakFreezeCount };
  }

  // ── Sprint 3 Phase 2: Personal Records ───────────────────

  function getRecords() {
    var store = loadStore();
    if (!store.session) { return null; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return null; }
    ensureGamificationFields(user);
    // Update longestStreak record in real-time
    var currentStreak = getCurrentStreakFromExpenses(Array.isArray(user.expenses) ? user.expenses : []);
    if (currentStreak > (user.records.longestStreak.value || 0)) {
      user.records.longestStreak = { value: currentStreak, date: getLocalDateKey() };
      saveStore(store);
    }
    return JSON.parse(JSON.stringify(user.records));
  }

  function addXp(amount, source) {
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No active session." }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }
    var awarded = addXpInternal(user, amount, source || "manual");
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    syncGamificationFields(store.session.userId, user);
    return { ok: true, awarded: awarded, xpInfo: getXpInfoFromUser(user) };
  }

  function getXpInfo() {
    var store = loadStore();
    if (!store.session) { return getXpInfoFromUser({}); }
    var user = getUserById(store, store.session.userId);
    if (!user) { return getXpInfoFromUser({}); }
    return getXpInfoFromUser(user);
  }

  function getCurrentStreak() {
    var expenses = getExpenses();
    return getCurrentStreakFromExpenses(expenses);
  }

  function getAchievements() {
    var store = loadStore();
    if (!store.session) { return []; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return []; }
    return buildAchievementState(user);
  }

  function checkNewAchievements() {
    var store = loadStore();
    if (!store.session) { return []; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return []; }
    return buildAchievementState(user).filter(function (a) {
      return a.unlockable && !a.claimed && !a.notified;
    });
  }

  function markAchievementsNotified(ids) {
    if (!Array.isArray(ids) || ids.length === 0) { return { ok: true }; }
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No active session." }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }
    ensureGamificationFields(user);
    ids.forEach(function (id) {
      if (user.notifiedAchievements.indexOf(id) === -1) {
        user.notifiedAchievements.push(id);
      }
    });
    saveStore(store);
    syncGamificationFields(store.session.userId, user);
    return { ok: true };
  }

  function getClaimAchievementEndpoint() {
    return "https://us-central1-sugbocents.cloudfunctions.net/claimAchievement";
  }

  async function callClaimAchievementServer(achievementId) {
    if (!(window.FirebaseInit && window.FirebaseInit.isFirebaseMode && window.FirebaseInit.isFirebaseMode())) {
      return { ok: false, error: "firebase_unavailable" };
    }

    var auth = window.FirebaseInit.getAuth ? window.FirebaseInit.getAuth() : null;
    var firebaseUser = auth && auth.currentUser ? auth.currentUser : null;
    if (!firebaseUser || !firebaseUser.getIdToken) {
      return { ok: false, error: "unauthenticated" };
    }

    try {
      var idToken = await firebaseUser.getIdToken();
      var response = await fetch(getClaimAchievementEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + idToken
        },
        body: JSON.stringify({ id: achievementId })
      });

      var payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }

      if (!response.ok) {
        return {
          ok: false,
          error: (payload && payload.error) ? payload.error : "claim_failed"
        };
      }

      return payload && payload.ok
        ? payload
        : { ok: false, error: (payload && payload.error) ? payload.error : "claim_failed" };
    } catch (_) {
      return { ok: false, error: "network_error" };
    }
  }

  function removePendingAchievementClaim(user, achievementId) {
    if (!user || !Array.isArray(user.pendingAchievementClaims)) { return; }
    var idx = user.pendingAchievementClaims.indexOf(achievementId);
    if (idx !== -1) {
      user.pendingAchievementClaims.splice(idx, 1);
    }
  }

  async function claimAchievement(id) {
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No active session." }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }
    ensureGamificationFields(user);
    var all = buildAchievementState(user);
    var achievement = all.filter(function (a) { return a.id === id; })[0];
    if (!achievement) { return { ok: false, error: "Achievement not found." }; }
    if (!achievement.unlockable) { return { ok: false, error: "Achievement not yet unlocked." }; }
    if (achievement.claimed) { return { ok: false, error: "Achievement already claimed." }; }

    if (user.pendingAchievementClaims.indexOf(id) !== -1) {
      return { ok: false, error: "Achievement claim already in progress." };
    }

    user.pendingAchievementClaims.push(id);
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));

    var isFirebaseMode = window.FirebaseInit && window.FirebaseInit.isFirebaseMode && window.FirebaseInit.isFirebaseMode();
    if (!isFirebaseMode) {
      removePendingAchievementClaim(user, id);
      user.unlockedAchievements.push(id);
      var localXpAwarded = addXpInternal(user, 15, "achievement_claim");
      addSentimosInternal(user, 25, "badge-" + id);
      saveStore(store);
      window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
      syncGamificationFields(store.session.userId, user);
      return { ok: true, xpAwarded: localXpAwarded, xpInfo: getXpInfoFromUser(user) };
    }

    var serverResult = await callClaimAchievementServer(id);
    if (!serverResult || !serverResult.ok) {
      removePendingAchievementClaim(user, id);
      saveStore(store);
      window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
      return {
        ok: false,
        error: (serverResult && serverResult.error) ? serverResult.error : "Claim failed. Please try again."
      };
    }

    removePendingAchievementClaim(user, id);
    if (user.unlockedAchievements.indexOf(id) === -1) {
      user.unlockedAchievements.push(id);
    }
    if (typeof serverResult.newXp === "number") {
      user.xp = Math.max(0, Math.floor(serverResult.newXp));
    }
    if (typeof serverResult.newLevel === "number") {
      user.level = Math.max(1, Math.floor(serverResult.newLevel));
    }

    // Sentimos reward remains client-side but now runs only after server-validated claim success.
    addSentimosInternal(user, 25, "badge-" + id);

    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    syncGamificationFields(store.session.userId, user);

    return {
      ok: true,
      xpAwarded: Number(serverResult.awardedXp || 15),
      xpInfo: getXpInfoFromUser(user)
    };
  }

  async function resetCurrentUserData() {
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    var userId = store.session.userId;

    // ── 1. Preserve immutable identity fields ─────────────────────────────────
    // Everything else is destroyed so the account behaves like a brand-new sign-up.
    var preserved = {
      id:          user.id,
      firstName:   user.firstName,
      lastName:    user.lastName,
      email:       user.email,
      friendCode:  user.friendCode,
      displayName: user.displayName,
      avatar:      user.avatar,
      createdAt:   user.createdAt
    };

    // ── 2. Wipe ALL user fields locally ───────────────────────────────────────
    // Explicitly null every known gamification / social / state field. Listing
    // each one (rather than blasting the whole object) keeps the contract
    // auditable and avoids accidentally nuking identity fields above.
    var defaultDailyXpLog = { dateKey: getLocalDateKey(), xpFromLogging: 0 };
    Object.assign(user, preserved, {
      // Core financial
      weeklyBudget:                0,
      expenses:                    [],
      quickAddItems:               [],
      goals:                       [],
      preferences:                 {},
      // XP / level
      xp:                          0,
      totalXp:                     0,
      level:                       1,
      dailyXpLog:                  defaultDailyXpLog,
      // Achievements
      unlockedAchievements:        [],
      notifiedAchievements:        [],
      pendingAchievementClaims:    [],
      // Streaks
      streakCount:                 0,
      lastMilestone:               null,
      streakFreezeCount:           0,
      streakFreezeActive:          false,
      streakBrokenFlag:            false,
      lastStreakLength:            0,
      streakNotifications:         true,
      streakWeeklySummary:         true,
      streakEnabled:               true,
      // Quests
      activeQuest:                 null,
      questHistory:                [],
      questsCompleted:             0,
      missionsCompleted:           0,
      lastMissionCreditedDate:     null,
      monthlyChallenge:            null,
      clearedQuestAt:              null,
      claimedQuestIds:             [],
      pendingDailyReward:          null,
      questStateLastUpdated:       nowIso(),
      // Weekly XP tracker
      weeklyXpStart:               0,
      weeklyXpStartDate:           null,
      // Budget weeks
      underBudgetWeeksCount:       0,
      lastBudgetWeekCreditedKey:   null,
      // Sentimos currency
      sentimos:                    0,
      sentimosLog:                 [],
      // Personal records
      records: {
        longestStreak:  { value: 0, date: null },
        bestWeekXp:     { value: 0, weekStart: null },
        bestMonthSaved: { value: 0, month: null }
      }
    });
    // Re-apply defaults to backfill anything not enumerated above.
    ensureGamificationFields(user);
    // Pin the starter "Log 1 expense today" daily quest so a reset behaves
    // exactly like a brand-new account — see getCurrentQuest() for the
    // matching auto-pin path on first dashboard render.
    user.activeQuest = _buildStarterDailyQuest();
    touchQuestState(user);
    saveStore(store);

    // ── 3. Wipe Firestore: user doc fields + subcollections + social graph ───
    if (window.FirestoreService) {
      try {
        // 3a. Reset all stored fields on the user doc (merge:true with explicit
        //     null/empty defaults so leftover server-side fields are overwritten).
        await window.FirestoreService.setUserDoc(userId, {
          weeklyBudget:               0,
          quickAddItems:              [],
          goals:                      [],
          preferences:                {},
          xp:                         0,
          totalXp:                    0,
          level:                      1,
          dailyXpLog:                 defaultDailyXpLog,
          unlockedAchievements:       [],
          notifiedAchievements:       [],
          pendingAchievementClaims:   [],
          streakCount:                0,
          lastMilestone:              null,
          streakFreezeCount:          0,
          streakFreezeActive:         false,
          streakBrokenFlag:           false,
          lastStreakLength:           0,
          questHistory:               [],
          questsCompleted:            0,
          missionsCompleted:          0,
          lastMissionCreditedDate:    null,
          monthlyChallenge:           null,
          clearedQuestAt:             null,
          claimedQuestIds:            [],
          pendingDailyReward:         null,
          // activeQuest + questStateLastUpdated reflect the starter quest that
          // was pinned locally above — pushing null here would overwrite it on
          // the server and cause syncFromFirestore to wipe it on the next load.
          activeQuest:                user.activeQuest || null,
          questStateLastUpdated:      String(user.questStateLastUpdated || nowIso()),
          weeklyXpStart:              0,
          weeklyXpStartDate:          null,
          underBudgetWeeksCount:      0,
          lastBudgetWeekCreditedKey:  null,
          sentimos:                   0,
          sentimosLog:                [],
          records: {
            longestStreak:  { value: 0, date: null },
            bestWeekXp:     { value: 0, weekStart: null },
            bestMonthSaved: { value: 0, month: null }
          }
        });
      } catch (e) {
        console.warn("[StorageAPI] resetCurrentUserData user doc reset error:", e);
      }

      // 3b. Delete the expenses subcollection.
      try {
        if (window.FirestoreService.clearExpenseDocs) {
          await window.FirestoreService.clearExpenseDocs(userId);
        }
      } catch (e) {
        console.warn("[StorageAPI] resetCurrentUserData clearExpenseDocs error:", e);
      }

      // 3c. Wipe quickAdd subcollection / field.
      try {
        if (window.FirestoreService.setQuickAddItems) {
          await window.FirestoreService.setQuickAddItems(userId, []);
        }
      } catch (e) {
        console.warn("[StorageAPI] resetCurrentUserData setQuickAddItems error:", e);
      }

      // 3d. Re-sync the public profile so leaderboard / friend cards see XP=0, level=1.
      try {
        if (window.FirestoreService.syncPublicProfile) {
          await window.FirestoreService.syncPublicProfile(userId, user);
        }
      } catch (e) {
        console.warn("[StorageAPI] resetCurrentUserData syncPublicProfile error:", e);
      }

      // 3e. Purge social graph: friends (bidirectional), incoming requests,
      //     outgoing requests, and the friend feed.
      try {
        if (window.FirestoreService.purgeAllUserSocialData) {
          await window.FirestoreService.purgeAllUserSocialData(userId);
        }
      } catch (e) {
        console.warn("[StorageAPI] resetCurrentUserData purgeAllUserSocialData error:", e);
      }
    }

    // ── 4. Clear ALL non-store localStorage caches scoped to this user ────────
    // These caches survive a partial reset and cause stale UI (leaderboard
    // rank, friend list, prefetch flags, dev-tools snapshots, etc.).
    try {
      var legacyKeys = [
        "sugbocents_friend_cache",
        "sugbocents_lb_players_v2",
        "sugbocents_lb_snapshot",
        "sugbocents_unclaimed_quests"
      ];
      legacyKeys.forEach(function (k) {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      var prefixes = [
        "sugbocents_friend_cache_",
        "sugbocents_friend_profiles_",
        "sugbocents_lb_players_v3_",
        "sugbocents_lb_snapshot_v2_",
        "sugbocents_friends_prefetched_",
        "sugbocents.devtools."   // dev snapshots: budget, gam, quest, fakefriends
      ];
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) { continue; }
        for (var p = 0; p < prefixes.length; p++) {
          if (k.indexOf(prefixes[p]) === 0) { toRemove.push(k); break; }
        }
      }
      toRemove.forEach(function (k) {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    } catch (e) {
      console.warn("[StorageAPI] resetCurrentUserData localStorage cleanup error:", e);
    }

    // ── 5. Tell every listening view to re-render from scratch ────────────────
    try {
      window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
      window.dispatchEvent(new CustomEvent("sugbocents:userReset", { detail: { userId: userId } }));
    } catch (_) {}

    return { ok: true };
  }

  function removeExpense(expenseId) {
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }

    var user = getUserById(store, store.session.userId);
    if (!user || !Array.isArray(user.expenses)) {
      return { ok: false, error: "User not found." };
    }

    var idx = -1;
    for (var i = 0; i < user.expenses.length; i++) {
      if (user.expenses[i].id === expenseId) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      return { ok: false, error: "Expense not found." };
    }

    user.expenses.splice(idx, 1);
    saveStore(store);
    // Re-compute quest progress after deletion to prevent ghost progress
    // (stored progress counters must reflect the current expense list).
    updateQuestProgress();
    updateDailyQuestProgressInternal(store, user);
    // Update cross-page badge count for ALL quests after deletion.
    _computeAndCacheQuestBadge(user);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));

    if (window.FirestoreService && window.FirestoreService.deleteExpenseDoc) {
      window.FirestoreService.deleteExpenseDoc(store.session.userId, expenseId);
    }

    return { ok: true };
  }

  function getQuickAddItems() {
    var store = loadStore();
    if (!store.session) {
      return [];
    }

    var user = getUserById(store, store.session.userId);
    if (!user || !Array.isArray(user.quickAddItems)) {
      return [];
    }

    return user.quickAddItems.slice();
  }

  function saveQuickAddItems(items) {
    if (!Array.isArray(items)) {
      return { ok: false, error: "Items must be an array." };
    }

    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    user.quickAddItems = items;
    saveStore(store);

    if (window.FirestoreService && window.FirestoreService.setQuickAddItems) {
      window.FirestoreService.setQuickAddItems(store.session.userId, items);
    }

    return { ok: true };
  }

  // ── Sprint 2: Profile ────────────────────────────────────

  function updateUserProfile(data) {
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }
    var previousFallback = getFallbackDisplayName(user.firstName, user.lastName, user.email);
    if (data && data.firstName !== undefined) {
      user.firstName = sanitizeName(data.firstName);
    }
    if (data && data.lastName !== undefined) {
      user.lastName = sanitizeName(data.lastName);
    }
    if (data && data.username !== undefined) {
      user.username = sanitizeName(data.username);
    }
    if (!user.displayName || sanitizeDisplayName(user.displayName) === sanitizeDisplayName(previousFallback)) {
      user.displayName = getFallbackDisplayName(user.firstName, user.lastName, user.email);
    }
    user.displayName = sanitizeDisplayName(user.displayName) || getFallbackDisplayName(user.firstName, user.lastName, user.email);
    saveStore(store);
    if (window.FirestoreService) {
      window.FirestoreService.setUserDoc(store.session.userId, {
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        publicProfile: {
          displayName: user.displayName,
          displayNameLower: user.displayName.toLowerCase()
        }
      });
      syncGamificationFields(store.session.userId, user);
      if (window.FirestoreService.syncPublicProfile) {
        window.FirestoreService.syncPublicProfile(store.session.userId, user);
      }
    }
    return { ok: true };
  }

  // ── Sprint 2: Preferences ────────────────────────────────

  function getPreferences() {
    var store = loadStore();
    if (!store.session) {
      return {};
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return {};
    }
    ensureGamificationFields(user);
    var prefs = user.preferences ? Object.assign({}, user.preferences) : {};
    var streakPrefs = getStreakPreferencesFromUser(user);
    prefs.streakNotifications = streakPrefs.streakNotifications;
    prefs.streakWeeklySummary = streakPrefs.streakWeeklySummary;
    prefs.streakEnabled = streakPrefs.streakEnabled;
    return prefs;
  }

  function getStreakPreferencesFromUser(user) {
    ensureGamificationFields(user);
    return {
      streakNotifications: user.streakNotifications !== false,
      streakWeeklySummary: user.streakWeeklySummary !== false,
      streakEnabled: user.streakEnabled !== false
    };
  }

  function getStreakPreferences() {
    var store = loadStore();
    if (!store.session) {
      return {
        streakNotifications: true,
        streakWeeklySummary: true,
        streakEnabled: true
      };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return {
        streakNotifications: true,
        streakWeeklySummary: true,
        streakEnabled: true
      };
    }
    return getStreakPreferencesFromUser(user);
  }

  function getAvatarPresets() {
    return AVATAR_PRESETS.slice();
  }

  function getDefaultNotificationPrefs() {
    return {
      pushEnabled: false,
      emailEnabled: true,
      dailyReminderEnabled: false,
      dailyReminderHour: 20,
      socialEnabled: true,
      quietHoursStart: 21,
      quietHoursEnd: 8,
      setupDone: false,
      lastUpdated: null
    };
  }

  function getNotificationPrefs() {
    var store = loadStore();
    if (!store.session) {
      return Object.assign({}, getDefaultNotificationPrefs());
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return Object.assign({}, getDefaultNotificationPrefs());
    }
    var prefs = user.notificationPrefs;
    if (!prefs && user.preferences && typeof user.preferences.notificationPrefs === "object") {
      prefs = user.preferences.notificationPrefs;
    }
    return Object.assign({}, getDefaultNotificationPrefs(), prefs || {});
  }

  function setNotificationPrefs(prefs) {
    if (!prefs || typeof prefs !== "object") {
      return Promise.resolve({ ok: false, error: "Notification preferences must be an object." });
    }

    var store = loadStore();
    if (!store.session) {
      return Promise.resolve({ ok: false, error: "No active session." });
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return Promise.resolve({ ok: false, error: "User not found." });
    }

    if (!user.preferences) {
      user.preferences = {};
    }

    var next = Object.assign({}, getDefaultNotificationPrefs(), user.notificationPrefs || {}, prefs || {});
    user.notificationPrefs = next;
    user.preferences.notificationPrefs = next;

    var saveResult = saveStore(store);
    if (!saveResult || !saveResult.ok) {
      return Promise.resolve(saveResult || { ok: false, error: "storage-write-failed" });
    }

    if (window.FirestoreService) {
      window.FirestoreService.setUserDoc(store.session.userId, {
        notificationPrefs: next,
        preferences: user.preferences
      });
    }

    return Promise.resolve({ ok: true, prefs: next });
  }

  function savePreferences(prefs) {
    if (typeof prefs !== "object" || prefs === null) {
      return { ok: false, error: "Preferences must be an object." };
    }
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }
    if (!user.preferences) {
      user.preferences = {};
    }
    ensureGamificationFields(user);
    var keys = Object.keys(prefs);
    var profileIdentityChanged = false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = prefs[key];
      if (key === "streakNotifications" || key === "streakWeeklySummary" || key === "streakEnabled") {
        var boolValue = value === true;
        user[key] = boolValue;
        user.preferences[key] = boolValue;
      } else if (key === "displayName") {
        var nextDisplayName = sanitizeDisplayName(value);
        if (!nextDisplayName) {
          nextDisplayName = getFallbackDisplayName(user.firstName, user.lastName, user.email);
        }
        user.displayName = nextDisplayName;
        user.username = nextDisplayName;
        user.preferences.displayName = nextDisplayName;
        profileIdentityChanged = true;
      } else if (key === "avatar") {
        var nextAvatar = normalizeAvatar(value);
        user.avatar = nextAvatar;
        user.preferences.avatar = nextAvatar;
        profileIdentityChanged = true;
      } else {
        user.preferences[key] = value;
      }
    }
    var saveResult = saveStore(store);
    if (!saveResult || !saveResult.ok) {
      return saveResult || { ok: false, error: "storage-write-failed" };
    }

    if (window.FirestoreService) {
      var cloudPatch = { preferences: user.preferences };
      if (Object.prototype.hasOwnProperty.call(prefs, "emailOptIn")) {
        cloudPatch.emailOptIn = user.preferences.emailOptIn === true;
      }
      if (Object.prototype.hasOwnProperty.call(prefs, "lastEmailSentAt")) {
        cloudPatch.lastEmailSentAt = typeof user.preferences.lastEmailSentAt === "string"
          ? user.preferences.lastEmailSentAt
          : null;
      }
      if (Object.prototype.hasOwnProperty.call(prefs, "streakNotifications")) {
        cloudPatch.streakNotifications = user.streakNotifications === true;
      }
      if (Object.prototype.hasOwnProperty.call(prefs, "streakWeeklySummary")) {
        cloudPatch.streakWeeklySummary = user.streakWeeklySummary === true;
      }
      if (Object.prototype.hasOwnProperty.call(prefs, "streakEnabled")) {
        cloudPatch.streakEnabled = user.streakEnabled === true;
      }
      if (profileIdentityChanged) {
        var fallbackDisplayName = getFallbackDisplayName(user.firstName, user.lastName, user.email);
        var safeDisplayName = sanitizeDisplayName(user.displayName) || fallbackDisplayName;
        cloudPatch.displayName = safeDisplayName;
        cloudPatch.avatar = normalizeAvatar(user.avatar) || null;
        cloudPatch.publicProfile = {
          displayName: safeDisplayName,
          displayNameLower: safeDisplayName.toLowerCase(),
          avatar: normalizeAvatar(user.avatar) || null
        };
      }
      window.FirestoreService.setUserDoc(store.session.userId, cloudPatch);
      if (profileIdentityChanged && window.FirestoreService.syncPublicProfile) {
        window.FirestoreService.syncPublicProfile(store.session.userId, user);
      }
    }

    return { ok: true };
  }

  // ── Sprint 3 Phase 5: Weekly Email Preferences ──────────

  function getEmailOptIn() {
    var prefs = getPreferences();
    return prefs.emailOptIn === true;
  }

  function setEmailOptIn(enabled) {
    var next = enabled === true;
    var result = savePreferences({ emailOptIn: next });
    if (!result.ok) { return result; }
    return { ok: true, emailOptIn: next };
  }

  function getLastEmailSentAt() {
    var prefs = getPreferences();
    return typeof prefs.lastEmailSentAt === "string" ? prefs.lastEmailSentAt : null;
  }

  function setLastEmailSentAt(isoString) {
    var parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "Invalid timestamp." };
    }
    var normalized = parsed.toISOString();
    var result = savePreferences({ lastEmailSentAt: normalized });
    if (!result.ok) { return result; }
    return { ok: true, lastEmailSentAt: normalized };
  }

  // ── Sprint 2: Goals ──────────────────────────────────────

  function getGoals() {
    var store = loadStore();
    if (!store.session) {
      return [];
    }
    var user = getUserById(store, store.session.userId);
    if (!user || !Array.isArray(user.goals)) {
      return [];
    }
    return user.goals.slice();
  }

  function addGoal(data) {
    if (!data || !data.name) {
      return { ok: false, error: "Goal name is required." };
    }
    var targetAmount = sanitizeAmount(data.targetAmount);
    if (targetAmount <= 0) {
      return { ok: false, error: "Target amount must be greater than zero." };
    }
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }
    var goal = {
      id: "goal_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: sanitizeName(data.name),
      targetAmount: targetAmount,
      savedAmount: 0,
      deadline: data.deadline ? String(data.deadline) : "",
      createdAt: nowIso(),
      completed: false
    };
    if (!Array.isArray(user.goals)) {
      user.goals = [];
    }
    user.goals.unshift(goal);
    saveStore(store);
    return { ok: true, goal: goal };
  }

  function updateGoalProgress(goalId, savedAmount) {
    var amount = sanitizeAmount(savedAmount);
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user || !Array.isArray(user.goals)) {
      return { ok: false, error: "User not found." };
    }
    var goal = null;
    for (var i = 0; i < user.goals.length; i++) {
      if (user.goals[i].id === goalId) {
        goal = user.goals[i];
        break;
      }
    }
    if (!goal) {
      return { ok: false, error: "Goal not found." };
    }
    goal.savedAmount = Math.max(0, amount);
    goal.completed = goal.savedAmount >= goal.targetAmount;
    saveStore(store);
    return { ok: true, goal: goal };
  }

  function deleteGoal(goalId) {
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user || !Array.isArray(user.goals)) {
      return { ok: false, error: "User not found." };
    }
    var idx = -1;
    for (var i = 0; i < user.goals.length; i++) {
      if (user.goals[i].id === goalId) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      return { ok: false, error: "Goal not found." };
    }
    user.goals.splice(idx, 1);
    saveStore(store);
    return { ok: true };
  }

  // ── Sprint 2: Streak ─────────────────────────────────────

  function getStreakData() {
    var store = loadStore();
    if (!store.session) {
      return { count: 0, lastMilestone: null };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { count: 0, lastMilestone: null };
    }
    return {
      count: user.streakCount || 0,
      lastMilestone: user.lastMilestone || null
    };
  }

  function incrementStreak() {
    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }
    user.streakCount = (user.streakCount || 0) + 1;
    user.lastMilestone = nowIso();
    saveStore(store);
    return { ok: true, count: user.streakCount };
  }

  // ── AI Chatbot ───────────────────────────────────────────

  function makeThreadId() {
    return "thread_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  }

  function sanitizeThreadTitle(title) {
    var next = String(title || "").trim();
    if (!next) { return "New chat"; }
    if (next.length > 40) { next = next.slice(0, 40).trim(); }
    return next;
  }

  function cloneMessage(msg) {
    return {
      role: String(msg.role || ""),
      text: String(msg.text || ""),
      timestamp: msg.timestamp || nowIso()
    };
  }

  function cloneMessages(messages) {
    if (!Array.isArray(messages)) { return []; }
    return messages.map(cloneMessage);
  }

  function cloneThread(thread) {
    return {
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt || thread.createdAt,
      messages: cloneMessages(thread.messages)
    };
  }

  function getLastMessageTimestamp(thread) {
    if (!thread || !Array.isArray(thread.messages) || thread.messages.length === 0) {
      return null;
    }
    var last = thread.messages[thread.messages.length - 1];
    return last && last.timestamp ? last.timestamp : null;
  }

  function ensureChatThreads() {
    var session = getSession();
    if (!session) {
      return { chatThreads: [], activeChatThreadId: null };
    }

    var prefs = getPreferences();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads : null;

    if (threads && threads.length > 0) {
      var activeId = prefs.activeChatThreadId || null;
      if (activeId) {
        var hasActive = false;
        for (var i = 0; i < threads.length; i++) {
          if (threads[i].id === activeId) {
            hasActive = true;
            break;
          }
        }
        if (!hasActive) {
          activeId = null;
          savePreferences({ activeChatThreadId: null });
        }
      } else {
        activeId = threads[0].id;
      }
      prefs.activeChatThreadId = activeId;
      return prefs;
    }

    var legacy = Array.isArray(prefs.chatHistory) ? prefs.chatHistory.slice() : [];
    var createdAt = nowIso();
    var updatedAt = legacy.length ? (legacy[legacy.length - 1].timestamp || createdAt) : createdAt;
    var title = legacy.length
      ? "Chat " + new Date(createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
      : "New chat";
    var thread = {
      id: makeThreadId(),
      title: title,
      createdAt: createdAt,
      updatedAt: updatedAt,
      messages: legacy
    };

    savePreferences({
      chatThreads: [thread],
      activeChatThreadId: thread.id,
      chatHistory: []
    });

    prefs.chatThreads = [thread];
    prefs.activeChatThreadId = thread.id;
    prefs.chatHistory = [];
    return prefs;
  }

  function getChatThreads() {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads : [];
    return threads.map(function (thread) {
      var cloned = cloneThread(thread);
      var last = getLastMessageTimestamp(thread);
      cloned.messageCount = Array.isArray(thread.messages) ? thread.messages.length : 0;
      cloned.lastMessage = null;
      if (thread.messages && thread.messages.length > 0) {
        cloned.lastMessage = cloneMessage(thread.messages[thread.messages.length - 1]);
      }
      cloned.updatedAt = thread.updatedAt || last || thread.createdAt;
      delete cloned.messages;
      return cloned;
    });
  }

  function getActiveChatThreadId() {
    var prefs = ensureChatThreads();
    return prefs.activeChatThreadId || null;
  }

  function setActiveChatThread(threadId) {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads : [];
    for (var i = 0; i < threads.length; i++) {
      if (threads[i].id === threadId) {
        savePreferences({ activeChatThreadId: threadId });
        return { ok: true };
      }
    }
    return { ok: false, error: "Thread not found." };
  }

  function getActiveChatThread() {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads : [];
    var activeId = prefs.activeChatThreadId;
    var active = null;
    for (var i = 0; i < threads.length; i++) {
      if (threads[i].id === activeId) {
        active = threads[i];
        break;
      }
    }
    if (!active && activeId) {
      savePreferences({ activeChatThreadId: null });
    }
    return active ? cloneThread(active) : null;
  }

  function createChatThread(title) {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads.slice() : [];
    var thread = {
      id: makeThreadId(),
      title: sanitizeThreadTitle(title),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      messages: []
    };
    threads.unshift(thread);
    var saveResult = savePreferences({ chatThreads: threads, activeChatThreadId: thread.id });
    if (!saveResult || !saveResult.ok) {
      return saveResult || { ok: false, error: "storage-write-failed" };
    }
    return { ok: true, thread: cloneThread(thread) };
  }

  function deleteChatThread(threadId) {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads.slice() : [];
    var next = [];
    var removed = false;
    for (var i = 0; i < threads.length; i++) {
      if (threads[i].id === threadId) {
        removed = true;
      } else {
        next.push(threads[i]);
      }
    }
    if (!removed) { return { ok: false, error: "Thread not found." }; }

    if (next.length === 0) {
      var fresh = {
        id: makeThreadId(),
        title: "New chat",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        messages: []
      };
      var freshSave = savePreferences({ chatThreads: [fresh], activeChatThreadId: fresh.id });
      if (!freshSave || !freshSave.ok) {
        return freshSave || { ok: false, error: "storage-write-failed" };
      }
      return { ok: true, activeThreadId: fresh.id };
    }

    var activeId = prefs.activeChatThreadId;
    var nextActive = activeId === threadId ? next[0].id : activeId;
    var saveResult = savePreferences({ chatThreads: next, activeChatThreadId: nextActive });
    if (!saveResult || !saveResult.ok) {
      return saveResult || { ok: false, error: "storage-write-failed" };
    }
    return { ok: true, activeThreadId: nextActive };
  }

  function getChatHistory() {
    var thread = getActiveChatThread();
    return thread && Array.isArray(thread.messages) ? thread.messages.slice() : [];
  }

  function saveChatMessage(role, text) {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads.slice() : [];
    var activeId = prefs.activeChatThreadId;
    var updatedThreads = [];
    var saved = false;

    for (var i = 0; i < threads.length; i++) {
      var thread = threads[i];
      if (thread.id !== activeId) {
        updatedThreads.push(thread);
        continue;
      }

      var messages = Array.isArray(thread.messages) ? cloneMessages(thread.messages) : [];
      messages.push({ role: String(role), text: String(text), timestamp: nowIso() });
      if (messages.length > 50) { messages = messages.slice(-50); }
      updatedThreads.push({
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: nowIso(),
        messages: messages
      });
      saved = true;
    }

    if (!saved) {
      var fallback = {
        id: makeThreadId(),
        title: "New chat",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        messages: [{ role: String(role), text: String(text), timestamp: nowIso() }]
      };
      updatedThreads.unshift(fallback);
      activeId = fallback.id;
    }

    return savePreferences({ chatThreads: updatedThreads, activeChatThreadId: activeId });
  }

  function clearChatHistory() {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads.slice() : [];
    var activeId = prefs.activeChatThreadId;
    var updatedThreads = [];
    var cleared = false;

    for (var i = 0; i < threads.length; i++) {
      var thread = threads[i];
      if (thread.id === activeId) {
        updatedThreads.push({
          id: thread.id,
          title: thread.title,
          createdAt: thread.createdAt,
          updatedAt: nowIso(),
          messages: []
        });
        cleared = true;
      } else {
        updatedThreads.push(thread);
      }
    }

    if (!cleared) {
      return { ok: false, error: "Thread not found." };
    }
    var saveResult = savePreferences({ chatThreads: updatedThreads, activeChatThreadId: activeId });
    if (!saveResult || !saveResult.ok) {
      return saveResult || { ok: false, error: "storage-write-failed" };
    }
    return { ok: true };
  }

  function updateChatThreadTitle(threadId, title) {
    var prefs = ensureChatThreads();
    var threads = Array.isArray(prefs.chatThreads) ? prefs.chatThreads.slice() : [];
    var found = false;
    for (var i = 0; i < threads.length; i++) {
      if (threads[i].id === threadId) {
        threads[i] = Object.assign({}, threads[i], { title: sanitizeThreadTitle(title) });
        found = true;
        break;
      }
    }
    if (!found) { return { ok: false, error: "Thread not found." }; }
    var saveResult = savePreferences({ chatThreads: threads });
    if (!saveResult || !saveResult.ok) {
      return saveResult || { ok: false, error: "storage-write-failed" };
    }
    return { ok: true };
  }

  function seedDemoData() {
    var store = loadStore();
    if (!store.session || !store.session.userId) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }

    var now = new Date();
    function daysAgo(d, h, m) {
      var dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString();
    }

    var expenses = [
      // ── Today ──────────────────────────────────────────────
      { id: "demo_1",  amount: 18,  category: "transport",     timestamp: daysAgo(0, 7,  10), note: "Jeepney to school" },
      { id: "demo_2",  amount: 120, category: "food",          timestamp: daysAgo(0, 12, 30), note: "Lunch" },
      { id: "demo_3",  amount: 50,  category: "utilities",     timestamp: daysAgo(0, 18,  0), note: "Mobile load" },
      // ── Yesterday ──────────────────────────────────────────
      { id: "demo_4",  amount: 18,  category: "transport",     timestamp: daysAgo(1, 6,  45), note: "Early jeepney" },   // early-bird
      { id: "demo_5",  amount: 85,  category: "food",          timestamp: daysAgo(1, 13,  0), note: "Lunch combo" },
      { id: "demo_6",  amount: 30,  category: "food",          timestamp: daysAgo(1, 22, 30), note: "Midnight snack" },  // night-owl
      // ── 2 days ago ─────────────────────────────────────────
      { id: "demo_7",  amount: 18,  category: "transport",     timestamp: daysAgo(2, 8,   0), note: "" },
      { id: "demo_8",  amount: 200, category: "groceries",     timestamp: daysAgo(2, 15,  0), note: "Weekly groceries" },
      // ── 4 days ago ─────────────────────────────────────────
      { id: "demo_9",  amount: 80,  category: "education",     timestamp: daysAgo(4, 9,   0), note: "Printed modules" },
      { id: "demo_10", amount: 18,  category: "transport",     timestamp: daysAgo(4, 17, 30), note: "Jeepney home" },
      // ── 5 days ago ─────────────────────────────────────────
      { id: "demo_11", amount: 150, category: "food",          timestamp: daysAgo(5, 12,  0), note: "Lunch with friends" },
      { id: "demo_12", amount: 65,  category: "personal_care", timestamp: daysAgo(5, 16,  0), note: "Laundry" },
      // ── 7 days ago ─────────────────────────────────────────
      { id: "demo_13", amount: 18,  category: "transport",     timestamp: daysAgo(7, 7,  30), note: "" },
      { id: "demo_14", amount: 300, category: "shopping",      timestamp: daysAgo(7, 14,  0), note: "New school bag" },
      // ── 8 days ago ─────────────────────────────────────────
      { id: "demo_15", amount: 18,  category: "transport",     timestamp: daysAgo(8, 8,   0), note: "" },
      { id: "demo_16", amount: 100, category: "food",          timestamp: daysAgo(8, 12, 30), note: "Lunch" },
      // ── 10 days ago ────────────────────────────────────────
      { id: "demo_17", amount: 500, category: "education",     timestamp: daysAgo(10, 10, 0), note: "Photocopied readings" },
      { id: "demo_18", amount: 18,  category: "transport",     timestamp: daysAgo(10, 17, 0), note: "" },
      // ── 12 days ago ────────────────────────────────────────
      { id: "demo_19", amount: 80,  category: "food",          timestamp: daysAgo(12, 13, 0), note: "Merienda" },
      { id: "demo_20", amount: 180, category: "groceries",     timestamp: daysAgo(12, 16, 30), note: "" },
      // ── 14 days ago ────────────────────────────────────────
      { id: "demo_21", amount: 18,  category: "transport",     timestamp: daysAgo(14, 7,  0), note: "" },
      { id: "demo_22", amount: 120, category: "health",        timestamp: daysAgo(14, 11, 0), note: "Vitamins" },
      // ── 15 days ago ────────────────────────────────────────
      { id: "demo_23", amount: 18,  category: "transport",     timestamp: daysAgo(15, 8, 30), note: "" },
      { id: "demo_24", amount: 250, category: "entertainment", timestamp: daysAgo(15, 19, 0), note: "Movie + snacks" },
      // ── 18 days ago ────────────────────────────────────────
      { id: "demo_25", amount: 90,  category: "food",          timestamp: daysAgo(18, 12, 0), note: "" },
      { id: "demo_26", amount: 50,  category: "utilities",     timestamp: daysAgo(18, 17, 0), note: "Load" },
      // ── 20 days ago ────────────────────────────────────────
      { id: "demo_27", amount: 18,  category: "transport",     timestamp: daysAgo(20, 7, 45), note: "" },
      { id: "demo_28", amount: 400, category: "shopping",      timestamp: daysAgo(20, 14, 0), note: "Shoes on sale" },
      // ── 25 days ago ────────────────────────────────────────
      { id: "demo_29", amount: 18,  category: "transport",     timestamp: daysAgo(25, 8,  0), note: "" },
      { id: "demo_30", amount: 60,  category: "food",          timestamp: daysAgo(25, 13, 0), note: "" },
      // ── 30 days ago ────────────────────────────────────────
      { id: "demo_31", amount: 200, category: "education",     timestamp: daysAgo(30, 10, 0), note: "Notebook and pens" },
      { id: "demo_32", amount: 18,  category: "transport",     timestamp: daysAgo(30, 17, 30), note: "" }
    ];

    var goals = [
      {
        id: "goal_demo_1",
        name: "New Laptop Fund",
        targetAmount: 15000,
        savedAmount: 3500,
        deadline: "",
        createdAt: daysAgo(30, 12, 0),
        completed: false
      },
      {
        id: "goal_demo_2",
        name: "Sem Break Trip",
        targetAmount: 5000,
        savedAmount: 1200,
        deadline: "",
        createdAt: daysAgo(15, 12, 0),
        completed: false
      }
    ];

    user.weeklyBudget   = 1500;
    user.expenses       = expenses;
    user.goals          = goals;
    user.xp             = 175;
    user.level          = 3;
    // Pre-claim the two most basic badges so the grid shows all three states
    user.unlockedAchievements = ["first-step", "getting-started"];
    user.notifiedAchievements = ["first-step", "getting-started"];
    ensureGamificationFields(user);

    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:synced"));
    return { ok: true };
  }

  // ── Dev-only: restore gamification snapshot (used by Dev Tools restore flows) ──
  function devRestoreGamState(snapshot) {
    if (!snapshot) { return { ok: false }; }
    var store = loadStore();
    if (!store.session) { return { ok: false }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false }; }
    if (typeof snapshot.xp === "number")          { user.xp = Math.max(0, snapshot.xp); }
    if (typeof snapshot.level === "number")       { user.level = Math.max(1, snapshot.level); }
    if (typeof snapshot.streakCount === "number") { user.streakCount = Math.max(0, snapshot.streakCount); }
    if (snapshot.dailyXpLog && typeof snapshot.dailyXpLog === "object") {
      user.dailyXpLog = snapshot.dailyXpLog;
    }
    if (typeof snapshot.weeklyXpStart === "number") { user.weeklyXpStart = Math.max(0, snapshot.weeklyXpStart); }
    if (typeof snapshot.weeklyXpStartDate === "string") { user.weeklyXpStartDate = snapshot.weeklyXpStartDate; }
    saveStore(store);
    if (window.FirestoreService) {
      syncGamificationFields(store.session.userId, user);
    }
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true };
  }

  // ── Dev-only: reset ALL quest state — slot + ALL claim locks ─────────────
  function devResetAllQuests() {
    var store = loadStore();
    if (!store.session) { return { ok: false }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false }; }
    ensureGamificationFields(user);
    user.activeQuest     = null;
    user.claimedQuestIds = [];   // wipe ALL claim locks (daily + weekly) so every quest can be re-tested
    delete user.clearedQuestAt;
    touchQuestState(user);
    saveStore(store);
    localStorage.setItem("sugbocents_unclaimed_quests", "0");
    window.dispatchEvent(new CustomEvent("sugbocents:questBadgeUpdate", { detail: { count: 0 } }));
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true };
  }

  // ── Dev-only: reset quest slot (clears active quest + claim locks) ─────────
  function devResetQuestSlot() {
    var store = loadStore();
    if (!store.session) { return { ok: false }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false }; }
    ensureGamificationFields(user);
    user.activeQuest     = null;
    user.claimedQuestIds = [];
    user.clearedQuestAt  = null;
    touchQuestState(user);
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true };
  }

  // ── Dev-only: set sentimos balance directly ───────────────────────────────
  function devSetSentimos(amount) {
    var store = loadStore();
    if (!store.session) { return { ok: false }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false }; }
    ensureGamificationFields(user);
    user.sentimos = Math.max(0, Number(amount) || 0);
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true };
  }

  // ── Dev-only: give streak freeze charges ─────────────────────────────────
  function devGiveStreakFreezes(count) {
    var store = loadStore();
    if (!store.session) { return { ok: false }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false }; }
    ensureGamificationFields(user);
    user.streakFreezeCount  = Math.min(2, Math.max(0, Number(count) || 2));
    user.streakFreezeActive = user.streakFreezeCount > 0;
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return { ok: true };
  }

  // ── Sprint 3: Weekly Quests ───────────────────────────────

  function getIsoWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getWeekMondayDate(date) {
    var mondayKey = getManilaMondayKey(date || new Date());
    return new Date(mondayKey + "T00:00:00+08:00");
  }

  function _buildFreshQuest(weekNum) {
    var idx = weekNum % QUESTS.length;
    var template = QUESTS[idx];
    var now = new Date();
    var monday = getWeekMondayDate(now);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    var quest = {
      id: template.id,
      title: template.title,
      description: template.description,
      icon: template.icon,
      conditions: template.conditions.map(function (c) {
        return { type: c.type, target: c.target, progress: 0 };
      }),
      xpReward: template.xpReward,
      sentimosReward: template.sentimosReward,
      assignedAt: monday.toISOString(),
      expiresAt: sunday.toISOString(),
      completedAt: null
    };
    return quest;
  }

  // Starter daily quest — pinned automatically for brand-new accounts and after
  // a full data reset. Mirrors the canonical "daily-first-log" definition in
  // quests.js so the dashboard / quests page render the exact same card. We
  // duplicate the literals here (rather than import from quests.js) because
  // storage.js loads before quests.js and must work on pages where quests.js
  // is not loaded at all (e.g. settings.html during reset).
  function _buildStarterDailyQuest() {
    var now = new Date();
    var endOfDay = new Date(getManilaDayKey(now) + "T23:59:59.999+08:00");
    return {
      id: "daily-first-log",
      type: "daily",
      title: "First Log",
      description: "Log at least 1 expense today",
      icon: "\uD83D\uDCDD",
      xpReward: 10,
      sentimosReward: 10,
      conditions: [{ type: "log_count_today", target: 1, progress: 0 }],
      assignedAt: now.toISOString(),
      expiresAt: endOfDay.toISOString(),
      completedAt: null
    };
  }

  function getCurrentQuest() {
    var store = loadStore();
    if (!store.session) { return null; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return null; }
    ensureGamificationFields(user);

    var now = new Date();
    var weekNum = getIsoWeekNumber(now);
    var mondayKey = getLocalDateKey(getWeekMondayDate(now));

    // Check if active daily quest has expired (different day)
    if (user.activeQuest && user.activeQuest.type === "daily") {
      var todayKey = getLocalDateKey(now);
      var assignedKey = getLocalDateKey(new Date(user.activeQuest.assignedAt));
      if (assignedKey !== todayKey) {
        var expiredDailyQuest = user.activeQuest;
        // If completed but not yet claimed, preserve in pending slot so the reward is never silently lost
        if (expiredDailyQuest.completedAt) {
          var expiredClaimKey = expiredDailyQuest.id + ":" + getLocalDateKey(new Date(expiredDailyQuest.assignedAt));
          if (user.claimedQuestIds.indexOf(expiredClaimKey) === -1) {
            user.pendingDailyReward = expiredDailyQuest;
          }
        }
        user.questHistory.unshift(expiredDailyQuest);
        user.activeQuest = null;
        user.clearedQuestAt = null;
        touchQuestState(user);
        saveStore(store);
        return null;
      }
      return user.activeQuest;
    }

    // Check if active quest is valid for this week
    if (user.activeQuest) {
      // Use getWeekMondayDate so a quest tracked on Tuesday/Wednesday/etc. maps to
      // the same Monday key as the current week — without this, any non-Monday
      // assignedAt would never equal mondayKey and the quest gets immediately archived.
      var questMondayKey = getLocalDateKey(getWeekMondayDate(new Date(user.activeQuest.assignedAt)));
      if (questMondayKey === mondayKey) {
        return user.activeQuest;
      }
      // Quest is from a previous week — archive it, clear slot, reset cleared flag
      user.questHistory.unshift(user.activeQuest);
      user.activeQuest = null;
      user.clearedQuestAt = null;
      touchQuestState(user);
      saveStore(store);
      return null; // Let user choose from the new week's pool
    }

    // User explicitly cleared/abandoned their quest — respect that, don't auto-assign.
    if (user.clearedQuestAt) { return null; }

    // Truly-fresh account: no active quest, no history, no claimed keys, no
    // cleared flag. This matches a brand-new sign-up OR a full data reset.
    // Auto-pin the starter "Log at least 1 expense today" daily quest so the
    // user immediately sees the completion hooray UI after their first log.
    // Any other state (has history, has claim keys, or explicitly cleared)
    // falls through to the empty state below — users must pick their own.
    var hasHistory     = Array.isArray(user.questHistory) && user.questHistory.length > 0;
    var hasClaimedKeys = Array.isArray(user.claimedQuestIds) && user.claimedQuestIds.length > 0;
    if (!hasHistory && !hasClaimedKeys) {
      user.activeQuest = _buildStarterDailyQuest();
      touchQuestState(user);
      saveStore(store);
      // Immediately reconcile progress against any expenses already logged today
      // so the pinned card reflects reality (e.g. user logged 1 expense before
      // dashboard render, quest should already be completed).
      updateDailyQuestProgressInternal(store, user);
      return user.activeQuest;
    }

    // Has history or claim keys but no active quest — slot is intentionally empty.
    return null;
  }

  function getQuestHistory() {
    var store = loadStore();
    if (!store.session) { return []; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return []; }
    ensureGamificationFields(user);
    return user.questHistory.slice();
  }

  function setCurrentQuest(questObj) {
    var store = loadStore();
    if (!store.session) { return; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return; }
    ensureGamificationFields(user);

    if (questObj === null || questObj === undefined) {
      user.activeQuest = null;
      user.clearedQuestAt = new Date().toISOString();
    } else {
      // Guard: preserve completedAt when the same quest is being re-saved without it
      // (e.g., a stale UI copy is passed in). Only allow completedAt to be cleared
      // when a brand-new quest with a different id is being tracked.
      if (user.activeQuest &&
          user.activeQuest.completedAt &&
          user.activeQuest.id === questObj.id &&
          !questObj.completedAt) {
        questObj = Object.assign({}, questObj, { completedAt: user.activeQuest.completedAt });
      }
      user.activeQuest = questObj;
      delete user.clearedQuestAt;
    }
    touchQuestState(user);
    saveStore(store);

    // Recompute quest progress immediately after equipping so the dashboard
    // renders persisted, up-to-date progress instead of a fresh 0/N snapshot.
    // Critical for daily quests too: if a user already logged 2 expenses today
    // and then pins "Log 3 expenses today", the card should show 2/3 — not 0/3.
    if (questObj) {
      if (questObj.type === "daily") {
        updateDailyQuestProgressInternal(store, user);
      } else {
        updateQuestProgress();
      }
    }

    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
  }

  // Generate a per-period claim key for a quest (daily resets daily, weekly resets weekly)
  function getQuestClaimKey(questId, questType) {
    var now = new Date();
    if (questType === "daily") {
      return questId + ":" + getLocalDateKey(now);
    }
    // Weekly key — use Monday date of current week
    var monday = getWeekMondayDate(now);
    return questId + ":" + getLocalDateKey(monday);
  }

  function isQuestClaimed(questId, questType) {
    var store = loadStore();
    if (!store.session) { return false; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return false; }
    ensureGamificationFields(user);
    var key = getQuestClaimKey(questId, questType || "weekly");
    return user.claimedQuestIds.indexOf(key) !== -1;
  }

  function claimQuestReward(questId, questDef) {
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No session" }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, alreadyClaimed: true }; }
    ensureGamificationFields(user);

    // Backward-compat: called with no args → use activeQuest
    if (!questId && user.activeQuest) {
      questId  = user.activeQuest.id;
      questDef = user.activeQuest;
    }
    if (!questId || !questDef) { return { ok: false, error: "No quest specified" }; }

    var questType = questDef.type || "weekly";
    // For daily quests, use the quest's own assignedAt date for the claim key so that
    // a completed-but-unclaimed quest that expired at midnight can still be claimed the
    // next day (the key is tied to when the quest ran, not when the user claims).
    var claimKey;
    if (questType === "daily" && questDef.assignedAt) {
      claimKey = questId + ":" + getLocalDateKey(new Date(questDef.assignedAt));
    } else {
      claimKey = getQuestClaimKey(questId, questType);
    }

    // Prevent double-claim
    if (user.claimedQuestIds.indexOf(claimKey) !== -1) { return { ok: false, alreadyClaimed: true }; }

    // Mark claimed BEFORE awarding — prevents double-grant on rapid clicks
    user.claimedQuestIds.push(claimKey);
    // Clear pending slot if this was the pending daily reward
    if (user.pendingDailyReward && user.pendingDailyReward.id === questId) {
      user.pendingDailyReward = null;
    }
    touchQuestState(user);
    saveStore(store);

    var defaultSentimos = questType === "daily" ? 10 : 25;
    var result = {
      ok: true,
      title: questDef.title || "",
      xpReward: questDef.xpReward || 0,
      sentimosReward: questDef.sentimosReward !== undefined ? questDef.sentimosReward : defaultSentimos
    };

    // Award XP and Sentimos
    addXpInternal(user, result.xpReward, "quest-complete");
    addSentimosInternal(user, result.sentimosReward, "quest-" + questId);
    user.questsCompleted = (user.questsCompleted || 0) + 1;

    // Archive and clear activeQuest slot if this was the tracked quest
    if (user.activeQuest && user.activeQuest.id === questId) {
      var questArchive = Object.assign({}, user.activeQuest, {
        completedAt: user.activeQuest.completedAt || new Date().toISOString(),
        rewardClaimed: true
      });
      user.questHistory.unshift(questArchive);
      user.activeQuest = null;
    }

    touchQuestState(user);
    saveStore(store);
    if (store.session && window.FirestoreService && window.FirestoreService.syncPublicProfile) {
      window.FirestoreService.syncPublicProfile(store.session.userId, user);
    }
    // Re-compute badge count immediately so the nav badge reflects the claim.
    _computeAndCacheQuestBadge(user);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    return result;
  }

  function _completeQuestInternal(store, user, quest) {
    quest.completedAt = new Date().toISOString();
    addXpInternal(user, quest.xpReward, "quest-complete");
    addSentimosInternal(user, quest.sentimosReward || 25, "quest-" + quest.id);
    user.questsCompleted = (user.questsCompleted || 0) + 1;
    user.questHistory.unshift(Object.assign({}, quest));
    user.activeQuest = null;
    touchQuestState(user);
    saveStore(store);
    if (store.session && window.FirestoreService && window.FirestoreService.syncPublicProfile) {
      window.FirestoreService.syncPublicProfile(store.session.userId, user);
    }
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    if (window.GamificationUI && window.GamificationUI.queueModal) {
      window.GamificationUI.queueModal({
        type: "quest-complete",
        title: "Quest Complete!",
        body: "You finished \u201c" + quest.title + "\u201d",
        xpGained: quest.xpReward,
        reward: "\u20B1" + quest.xpReward + " XP earned",
        forwardCopy: "New quest unlocks Monday. Keep logging!",
        cta: "AWESOME"
      });
    }
  }

  function updateDailyQuestProgressInternal(store, user) {
    if (!user.activeQuest) { return; }
    if (user.activeQuest.type !== "daily") { return; }
    if (user.activeQuest.completedAt) { return; }

    var now = new Date();
    var todayKey = getLocalDateKey(now);
    var assignedKey = getLocalDateKey(new Date(user.activeQuest.assignedAt));
    if (assignedKey !== todayKey) {
      // Expired daily — archive and clear (getCurrentQuest will also handle this)
      user.questHistory.unshift(user.activeQuest);
      user.activeQuest = null;
      user.clearedQuestAt = null;
      touchQuestState(user);
      saveStore(store);
      return;
    }

    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    var todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    var expenses   = Array.isArray(user.expenses) ? user.expenses : [];

    // Daily-quest semantics are "log N expenses TODAY" — count from midnight,
    // regardless of when the quest was pinned. Using assignedAt as a cutoff
    // would exclude expenses logged before the user tapped "Track", making
    // progress appear to reset on every pin.
    var todayExp   = expenses.filter(function (e) {
      var d = new Date(e.timestamp);
      return d >= todayStart && d < todayEnd;
    });

    var cond = user.activeQuest.conditions && user.activeQuest.conditions[0];
    if (!cond) { return; }

    var newProgress = 0;
    switch (cond.type) {
      case "log_count_today":
        newProgress = Math.min(cond.target, todayExp.length);
        break;
      case "category_count_today": {
        var cats = {};
        todayExp.forEach(function (e) { cats[e.category || "others"] = true; });
        newProgress = Math.min(cond.target, Object.keys(cats).length);
        break;
      }
      default:
        newProgress = cond.progress || 0;
    }

    cond.progress = newProgress;

    if (cond.progress >= cond.target) {
      // Note: caller (addExpense / removeExpense) dispatches dataChanged after this returns.
      user.activeQuest.completedAt = new Date().toISOString();
      touchQuestState(user);
      saveStore(store);
      window.dispatchEvent(new CustomEvent("sugbocents:questCompleted", {
        detail: {
          title: user.activeQuest.title,
          xpReward: user.activeQuest.xpReward || 0,
          sentimosReward: user.activeQuest.sentimosReward || 10,
          questId: user.activeQuest.id
        }
      }));
    } else {
      // If progress dropped below target (e.g., an expense was deleted), un-complete the quest.
      if (user.activeQuest.completedAt) { user.activeQuest.completedAt = null; }
      touchQuestState(user);
      saveStore(store);
    }
  }

  function updateQuestProgress() {
    var store = loadStore();
    if (!store.session) { return; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return; }
    ensureGamificationFields(user);

    // Only update if user has an active, incomplete quest for this week
    if (!user.activeQuest) { return; }

    var now = new Date();
    var mondayKey = getLocalDateKey(getWeekMondayDate(now));
    // Use getWeekMondayDate so a quest tracked on Tuesday/Wednesday/etc. maps to
    // the same Monday key as the current week.
    var questMondayKey = getLocalDateKey(getWeekMondayDate(new Date(user.activeQuest.assignedAt)));

    if (questMondayKey !== mondayKey) {
      // Quest is from a previous week — archive it
      user.questHistory.unshift(user.activeQuest);
      user.activeQuest = null;
      user.clearedQuestAt = null;
      touchQuestState(user);
      saveStore(store);
      return;
    }

    if (user.activeQuest.completedAt) { return; } // Already complete, waiting for claim
    if (user.activeQuest.type === "daily") { return; } // Daily quests handled by updateDailyQuestProgressInternal

    var expenses = Array.isArray(user.expenses) ? user.expenses : [];
    var weeklyBudget = user.weeklyBudget || 0;
    var monday = getWeekMondayDate(now);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Forward-looking: only count expenses logged after the quest was assigned
    var questAssignedAt = user.activeQuest.assignedAt ? new Date(user.activeQuest.assignedAt) : monday;
    var weekCutoff = questAssignedAt > monday ? questAssignedAt : monday;

    var weekExpenses = expenses.filter(function (e) {
      var d = new Date(e.timestamp);
      return d >= weekCutoff && d <= sunday;
    });

    // Count unique log days
    var logDays = {};
    weekExpenses.forEach(function (e) {
      logDays[getLocalDateKey(e.timestamp)] = true;
    });
    var logDaysCount = Object.keys(logDays).length;

    // Count total expense count this week
    var logCount = weekExpenses.length;

    // Count days logged before noon
    var daysBeforeNoon = {};
    weekExpenses.forEach(function (e) {
      var d = new Date(e.timestamp);
      if (d.getHours() < 12) { daysBeforeNoon[getLocalDateKey(e.timestamp)] = true; }
    });
    var logDaysBeforeNoon = Object.keys(daysBeforeNoon).length;

    // Count days logged after 9pm
    var daysAfter9pm = {};
    weekExpenses.forEach(function (e) {
      var d = new Date(e.timestamp);
      if (d.getHours() >= 21) { daysAfter9pm[getLocalDateKey(e.timestamp)] = true; }
    });
    var logDaysAfter9pm = Object.keys(daysAfter9pm).length;

    // Under budget days (requires budget set)
    var underBudgetDays = 0;
    var noOverspendDays = 0;
    if (weeklyBudget > 0) {
      var dailySlice = weeklyBudget / 7;
      var spendByDay = {};
      weekExpenses.forEach(function (e) {
        var dk = getLocalDateKey(e.timestamp);
        spendByDay[dk] = (spendByDay[dk] || 0) + (Number(e.amount) || 0);
      });
      Object.keys(spendByDay).forEach(function (dk) {
        if (spendByDay[dk] <= dailySlice) {
          underBudgetDays += 1;
          noOverspendDays += 1;
        }
      });
    }

    // Frugal week: total spent ≤ 50% of weekly budget
    var totalSpentThisWeek = weekExpenses.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
    var frugalWeek = weeklyBudget > 0 && totalSpentThisWeek <= weeklyBudget * 0.5 ? 1 : 0;

    // Category diversity this week
    var weekCategories = {};
    weekExpenses.forEach(function (e) { weekCategories[e.category || "others"] = true; });
    var categoryDiversityCount = Object.keys(weekCategories).length;

    // XP earned this week — reset weekly snapshot on new week
    var weekMondayKey = getLocalDateKey(monday);
    if (user.weeklyXpStartDate !== weekMondayKey) {
      user.weeklyXpStart = user.xp || 0;
      user.weeklyXpStartDate = weekMondayKey;
    }
    var xpEarnedThisWeek = Math.max(0, (user.xp || 0) - (user.weeklyXpStart || 0));

    var progressMap = {
      "log_days": logDaysCount,
      "log_count": logCount,
      "under_budget_days": underBudgetDays,
      "no_overspend_days": noOverspendDays,
      "log_days_before_noon": logDaysBeforeNoon,
      "log_days_after_9pm": logDaysAfter9pm,
      "frugal_week": frugalWeek,
      "category_diversity_week": categoryDiversityCount,
      "xp_earned_week": xpEarnedThisWeek
    };

    var oldProgress = user.activeQuest.conditions.map(function (c) { return c.progress; });

    user.activeQuest.conditions.forEach(function (c) {
      var newVal = Math.min(c.target, progressMap[c.type] || 0);
      c.progress = newVal;
    });

    var anyTick = user.activeQuest.conditions.some(function (c, i) { return c.progress !== oldProgress[i]; });

    var allMet = user.activeQuest.conditions.every(function (c) {
      return c.progress >= c.target;
    });

    if (allMet) {
      // Mark as completed — user claims rewards via claimQuestReward()
      // Note: caller (addExpense / removeExpense) dispatches dataChanged after this returns.
      user.activeQuest.completedAt = new Date().toISOString();
      touchQuestState(user);
      saveStore(store);
      window.dispatchEvent(new CustomEvent("sugbocents:questCompleted", {
        detail: {
          title: user.activeQuest.title,
          xpReward: user.activeQuest.xpReward || 0,
          sentimosReward: user.activeQuest.sentimosReward || 25,
          questId: user.activeQuest.id
        }
      }));
    } else {
      // If progress dropped below target (e.g., an expense was deleted), un-complete the quest.
      if (user.activeQuest.completedAt) { user.activeQuest.completedAt = null; }
      touchQuestState(user);
      saveStore(store);
      if (anyTick) {
        var questSnap = JSON.parse(JSON.stringify(user.activeQuest));
        window.dispatchEvent(new CustomEvent("sugbocents:questProgressTick", { detail: questSnap }));
      }
    }
  }

  // Returns the most recent completed-but-unclaimed daily quest that expired at midnight,
  // so the UI can still show a Claim button the next day.
  function getPendingDailyReward() {
    var store = loadStore();
    if (!store.session) { return null; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return null; }
    ensureGamificationFields(user);
    if (!user.pendingDailyReward) { return null; }
    var q = user.pendingDailyReward;
    // Verify not already claimed (uses the assignedAt date so it matches claimQuestReward's key)
    var claimKey = q.id + ":" + getLocalDateKey(new Date(q.assignedAt));
    if (user.claimedQuestIds.indexOf(claimKey) !== -1) {
      user.pendingDailyReward = null;
      touchQuestState(user);
      saveStore(store);
      return null;
    }
    return q;
  }

  function checkQuestBadge() {
    var store = loadStore();
    if (!store.session) { return 0; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return 0; }
    ensureGamificationFields(user);
    var count = 0;

    // Check active quest (completed but not yet claimed)
    if (user.activeQuest && user.activeQuest.completedAt) {
      var qt = user.activeQuest.type || "weekly";
      var questId = user.activeQuest.id;
      var now = new Date();
      var periodKey;
      if (qt === "daily") {
        // Use assignedAt date to match claimQuestReward's key
        var assignedDate = user.activeQuest.assignedAt ? new Date(user.activeQuest.assignedAt) : now;
        periodKey = questId + ":" + getLocalDateKey(assignedDate);
      } else {
        periodKey = questId + ":" + getLocalDateKey(getWeekMondayDate(now));
      }
      if (user.claimedQuestIds.indexOf(periodKey) === -1) { count += 1; }
    }

    // Also count a pending daily reward that expired without being claimed
    if (user.pendingDailyReward && user.pendingDailyReward.completedAt) {
      var pr = user.pendingDailyReward;
      var prKey = pr.id + ":" + getLocalDateKey(new Date(pr.assignedAt));
      if (user.claimedQuestIds.indexOf(prKey) === -1) { count += 1; }
    }

    return count;
  }

  function creditDailyMission() {
    var store = loadStore();
    if (!store.session) { return; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return; }
    ensureGamificationFields(user);
    var key = getLocalDateKey();
    if (user.lastMissionCreditedDate === key) { return; }
    user.lastMissionCreditedDate = key;
    user.missionsCompleted = (user.missionsCompleted || 0) + 1;
    addSentimosInternal(user, 10, "mission-day");
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    // Check achievements after mission increment
    checkNewAchievementsForUser(user);
  }

  function checkNewAchievementsForUser(user) {
    return buildAchievementState(user).filter(function (a) {
      return a.unlockable && !a.claimed && !a.notified;
    });
  }

  // Computes the completed+unclaimed quest count across ALL daily and weekly pool quests
  // and writes it to localStorage so the nav badge is accurate on every page — not just
  // when the user visits quests.html (where dispatchQuestBadge runs).
  function _computeAndCacheQuestBadge(user) {
    try {
      ensureGamificationFields(user);
      var now = new Date();
      var todayKey = getLocalDateKey(now);
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      var todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
      var expenses = Array.isArray(user.expenses) ? user.expenses : [];
      var weeklyBudget = user.weeklyBudget || 0;

      var todayExp = expenses.filter(function (e) {
        var d = new Date(e.timestamp); return d >= todayStart && d < todayEnd;
      });
      var todayCount = todayExp.length;
      var todayCats = {};
      todayExp.forEach(function (e) { todayCats[e.category || "others"] = true; });
      var todayCatCount = Object.keys(todayCats).length;

      var count = 0;

      // ── Daily quests ──────────────────────────────────────
      DAILY_QUEST_SPECS_INTERNAL.forEach(function (spec) {
        var met = false;
        if (spec.condType === "log_count_today")      { met = todayCount >= spec.target; }
        else if (spec.condType === "category_count_today") { met = todayCatCount >= spec.target; }
        if (met) {
          var claimKey = spec.id + ":" + todayKey;
          if (user.claimedQuestIds.indexOf(claimKey) === -1) { count++; }
        }
      });

      // ── Weekly quests (5-quest rotating pool) ─────────────
      var monday = getWeekMondayDate(now);
      var mondayKey = getLocalDateKey(monday);
      // Use the same assignedAt boundary that updateQuestProgress uses so
      // the badge never claims completion before the tracker agrees.
      var questAssignedAt = (user.activeQuest && user.activeQuest.assignedAt)
        ? new Date(user.activeQuest.assignedAt)
        : monday;
      var weekCutoff = questAssignedAt > monday ? questAssignedAt : monday;
      var weekExp = expenses.filter(function (e) { return new Date(e.timestamp) >= weekCutoff; });

      var logDays = {};
      weekExp.forEach(function (e) { logDays[getLocalDateKey(e.timestamp)] = true; });
      var logDaysCount = Object.keys(logDays).length;
      var logCount = weekExp.length;

      var daysBeforeNoon = {};
      weekExp.forEach(function (e) {
        var h = new Date(e.timestamp).getHours();
        if (h < 12) { daysBeforeNoon[getLocalDateKey(e.timestamp)] = true; }
      });
      var logDaysBeforeNoon = Object.keys(daysBeforeNoon).length;

      var daysAfter9pm = {};
      weekExp.forEach(function (e) {
        var h = new Date(e.timestamp).getHours();
        if (h >= 21) { daysAfter9pm[getLocalDateKey(e.timestamp)] = true; }
      });
      var logDaysAfter9pm = Object.keys(daysAfter9pm).length;

      var underBudgetDays = 0; var noOverspendDays = 0;
      if (weeklyBudget > 0) {
        var dailySlice = weeklyBudget / 7;
        var spendByDay = {};
        weekExp.forEach(function (e) {
          var dk = getLocalDateKey(e.timestamp);
          spendByDay[dk] = (spendByDay[dk] || 0) + (Number(e.amount) || 0);
        });
        Object.keys(spendByDay).forEach(function (dk) {
          if (spendByDay[dk] <= dailySlice) { underBudgetDays++; noOverspendDays++; }
        });
      }

      var totalSpent = weekExp.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
      var frugalMet = weeklyBudget > 0 && totalSpent <= weeklyBudget * 0.5 ? 1 : 0;
      var weekCats = {};
      weekExp.forEach(function (e) { weekCats[e.category || "others"] = true; });
      var catCount = Object.keys(weekCats).length;
      var xpEarned = Math.max(0, (user.xp || 0) - (user.weeklyXpStart || 0));

      var wMap = {
        "log_days": logDaysCount, "log_count": logCount,
        "under_budget_days": underBudgetDays, "no_overspend_days": noOverspendDays,
        "log_days_before_noon": logDaysBeforeNoon, "log_days_after_9pm": logDaysAfter9pm,
        "frugal_week": frugalMet, "category_diversity_week": catCount, "xp_earned_week": xpEarned
      };

      var weekIndex = Math.floor(monday.getTime() / (7 * 24 * 3600 * 1000));
      var offset = (weekIndex * 5) % QUESTS.length;
      for (var qi = 0; qi < 5; qi++) {
        var q = QUESTS[(offset + qi) % QUESTS.length];
        var allMet = q.conditions.every(function (c) { return (wMap[c.type] || 0) >= c.target; });
        if (allMet) {
          var wClaimKey = q.id + ":" + mondayKey;
          if (user.claimedQuestIds.indexOf(wClaimKey) === -1) { count++; }
        }
      }

      try { localStorage.setItem("sugbocents_unclaimed_quests", String(count)); } catch (_) {}
      window.dispatchEvent(new CustomEvent("sugbocents:questBadgeUpdate", { detail: { count: count } }));
    } catch (_) {}
  }

  window.StorageAPI = {
    resolveAuthState: resolveAuthState,
    getSession: getSession,
    getCurrentUser: getCurrentUser,
    registerUser: registerUser,
    loginUser: loginUser,
    logout: logout,
    saveWeeklyBudget: saveWeeklyBudget,
    getWeeklyBudget: getWeeklyBudget,
    addExpense: addExpense,
    getExpenses: getExpenses,
    getBudgetSummary: getBudgetSummary,
    getAiContext: getAiContext,
    resetCurrentUserData: resetCurrentUserData,
    removeExpense: removeExpense,
    getQuickAddItems: getQuickAddItems,
    saveQuickAddItems: saveQuickAddItems,
    updateUserProfile: updateUserProfile,
    getPreferences: getPreferences,
    getAvatarPresets: getAvatarPresets,
    getStreakPreferences: getStreakPreferences,
    getNotificationPrefs: getNotificationPrefs,
    setNotificationPrefs: setNotificationPrefs,
    savePreferences: savePreferences,
    getEmailOptIn: getEmailOptIn,
    setEmailOptIn: setEmailOptIn,
    getLastEmailSentAt: getLastEmailSentAt,
    setLastEmailSentAt: setLastEmailSentAt,
    getGoals: getGoals,
    addGoal: addGoal,
    updateGoalProgress: updateGoalProgress,
    deleteGoal: deleteGoal,
    getStreakData: getStreakData,
    incrementStreak: incrementStreak,
    getExpenseCategories: getExpenseCategories,
    addXp: addXp,
    getXpInfo: getXpInfo,
    getCurrentStreak: getCurrentStreak,
    getAchievements: getAchievements,
    checkNewAchievements: checkNewAchievements,
    markAchievementsNotified: markAchievementsNotified,
    claimAchievement: claimAchievement,
    getChatThreads: getChatThreads,
    getActiveChatThreadId: getActiveChatThreadId,
    setActiveChatThread: setActiveChatThread,
    getActiveChatThread: getActiveChatThread,
    createChatThread: createChatThread,
    deleteChatThread: deleteChatThread,
    getChatHistory: getChatHistory,
    saveChatMessage: saveChatMessage,
    clearChatHistory: clearChatHistory,
    updateChatThreadTitle: updateChatThreadTitle,
    getCurrentQuest: getCurrentQuest,
    getQuestHistory: getQuestHistory,
    setCurrentQuest: setCurrentQuest,
    claimQuestReward: claimQuestReward,
    isQuestClaimed: isQuestClaimed,
    checkQuestBadge: checkQuestBadge,
    getPendingDailyReward: getPendingDailyReward,
    updateQuestProgress: updateQuestProgress,
    creditDailyMission: creditDailyMission,
    getManilaDayKey: getManilaDayKey,
    getManilaMondayKey: getManilaMondayKey,
    // Sprint 3 Phase 4: Sentimos
    getSentimosBalance: getSentimosBalance,
    addSentimos: addSentimos,
    spendSentimos: spendSentimos,
    getSentimosLog: getSentimosLog,
    getStreakFreezeCount: getStreakFreezeCount,
    activateStreakFreeze: activateStreakFreeze,
    useStreakFreeze: useStreakFreeze,
    // Sprint 3 Phase 2: Records
    getRecords: getRecords,
    seedDemoData: seedDemoData,
    __devRestoreGamState:  devRestoreGamState,
    __devResetQuestSlot:   devResetQuestSlot,
    __devResetAllQuests:   devResetAllQuests,
    __devSetSentimos:      devSetSentimos,
    __devGiveStreakFreezes: devGiveStreakFreezes
  };
})();


