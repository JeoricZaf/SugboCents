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
    localStorage.setItem(APP_KEY, JSON.stringify(store));
  }

  function sanitizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function sanitizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function sanitizeAmount(amount) {
    var value = Number(amount);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getLocalDateKey(input) {
    var d = input ? new Date(input) : new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function ensureGamificationFields(user) {
    if (!user) { return; }
    if (!Array.isArray(user.unlockedAchievements)) { user.unlockedAchievements = []; }
    if (!Array.isArray(user.notifiedAchievements)) { user.notifiedAchievements = []; }
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
    // Sprint 3 Phase 4: Sentimos currency
    if (typeof user.sentimos !== "number") { user.sentimos = 0; }
    if (!Array.isArray(user.sentimosLog)) { user.sentimosLog = []; }
    if (typeof user.streakFreezeCount !== "number") { user.streakFreezeCount = 0; }
    if (typeof user.streakFreezeActive !== "boolean") { user.streakFreezeActive = false; }
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

  function getThisWeekTotal(expenses) {
    var now = new Date();
    var dayOfWeek = now.getDay();
    var monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return expenses.reduce(function (sum, e) {
      return new Date(e.timestamp) >= monday ? sum + (Number(e.amount) || 0) : sum;
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
      var prev = new Date(sorted[i - 1].assignedAt);
      var curr = new Date(sorted[i].assignedAt);
      var diff = Math.round((prev - curr) / (7 * 24 * 3600 * 1000));
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
        series: a.series || null,
        tier: a.tier || null,
        totalTiers: a.totalTiers || null,
        rarity: a.rarity || "bronze",
        threshold: a.threshold || a.target
      };
    });
  }

  function syncGamificationFields(userId, user) {
    if (!window.FirestoreService) { return; }
    ensureGamificationFields(user);
    var xpInfo = getXpInfoFromUser(user);
    window.FirestoreService.setUserDoc(userId, {
      xp: user.xp,
      level: xpInfo.level,
      unlockedAchievements: user.unlockedAchievements,
      notifiedAchievements: user.notifiedAchievements,
      dailyXpLog: user.dailyXpLog
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

    var store = loadStore();
    var user = getUserById(store, userId);
    if (!user) {
      return;
    }

    var firestoreUser = await window.FirestoreService.getUserDoc(userId);
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
    }

    var firestoreExpenses = await window.FirestoreService.getExpenseDocs(userId);
    if (Array.isArray(firestoreExpenses) && firestoreExpenses.length > 0) {
      // Smart merge: Firestore is ground truth for confirmed records.
      // Also preserve any local-only entries (pending cloud writes from offline
      // usage or slow connections) so they are not silently discarded.
      var fsIdSet = {};
      firestoreExpenses.forEach(function (e) { if (e && e.id) { fsIdSet[e.id] = true; } });
      var pendingLocal = Array.isArray(user.expenses)
        ? user.expenses.filter(function (e) { return e && e.id && !fsIdSet[e.id]; })
        : [];
      user.expenses = firestoreExpenses.concat(pendingLocal);
    }

    var firestoreQuickAdd = await window.FirestoreService.getQuickAddItemDocs(userId);
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
    var displayName = sanitizeName(sessionUser.displayName);

    if (displayName) {
      var parts = displayName.split(" ");
      firstName = sanitizeName(parts.shift());
      lastName = sanitizeName(parts.join(" "));
    }

    if (!existing) {
      store.users.push({
        id: sessionUser.id,
        firstName: firstName,
        lastName: lastName,
        username: displayName,
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
        createdAt: nowIso()
      });

      if (window.FirestoreService) {
        window.FirestoreService.setUserDoc(sessionUser.id, {
          firstName: firstName,
          lastName: lastName,
          email: sanitizeEmail(sessionUser.email),
      weeklyBudget: 0,
      xp: 0,
      level: 1,
      unlockedAchievements: [],
      notifiedAchievements: [],
      dailyXpLog: { dateKey: getLocalDateKey(), xpFromLogging: 0 },
          createdAt: nowIso()
        });
      }
    } else {
      if (sessionUser.email) {
        existing.email = sanitizeEmail(sessionUser.email);
      }
      if (displayName) {
        existing.username = displayName;
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
  }

  function clearSession() {
    var store = loadStore();
    store.session = null;
    saveStore(store);
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
            if (!resolved) {
              resolved = true;
              unsubscribe();
              resolve();
            }
          });
        });

        setTimeout(function () {
          if (!resolved) {
            resolved = true;
            unsubscribe();
            resolve();
          }
        }, 1200);
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

    return {
      id: user.id,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      username: sanitizeName(user.username) || [firstName, lastName].filter(Boolean).join(" "),
      weeklyBudget: user.weeklyBudget || 0,
      expenses: Array.isArray(user.expenses) ? user.expenses : [],
      xp: user.xp || 0,
      level: user.level || 1,
      unlockedAchievements: user.unlockedAchievements.slice()
    };
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
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    // Sprint 3: Update quest progress after each expense
    updateQuestProgress();

    if (window.FirestoreService) {
      window.FirestoreService.addExpenseDoc(store.session.userId, entry);
      syncGamificationFields(store.session.userId, user);
      var currentStreak = getCurrentStreakFromExpenses(user.expenses || []);
      var xpInfoForSync = getXpInfoFromUser(user);
      window.FirestoreService.syncPublicProfile(store.session.userId, {
        firstName: user.firstName,
        lastName: user.lastName,
        streak: currentStreak,
        questsCompleted: user.questsCompleted || 0,
        xp: user.xp || 0,
        weeklyXpStart: user.weeklyXpStart || 0,
        weeklyXpStartDate: user.weeklyXpStartDate || null,
        level: xpInfoForSync.level,
        levelName: xpInfoForSync.levelName
      });
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

  function claimAchievement(id) {
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
    user.unlockedAchievements.push(id);
    var xpAwarded = addXpInternal(user, 15, "achievement_claim");
    addSentimosInternal(user, 25, "badge-" + id);
    saveStore(store);
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
    syncGamificationFields(store.session.userId, user);
    return { ok: true, xpAwarded: xpAwarded, xpInfo: getXpInfoFromUser(user) };
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
    user.weeklyBudget = 0;
    user.expenses = [];
    user.quickAddItems = [];
    user.goals = [];
    user.preferences = {};
    user.xp = 0;
    user.level = 1;
    user.unlockedAchievements = [];
    user.notifiedAchievements = [];
    user.dailyXpLog = { dateKey: getLocalDateKey(), xpFromLogging: 0 };
    user.streakCount = 0;
    user.lastMilestone = null;
    saveStore(store);

    if (window.FirestoreService) {
      try {
        await window.FirestoreService.clearExpenseDocs(userId);
        await window.FirestoreService.setUserDoc(userId, {
          weeklyBudget: 0,
          quickAddItems: [],
          goals: [],
          preferences: {},
          xp: 0,
          level: 1,
          unlockedAchievements: [],
          notifiedAchievements: [],
          dailyXpLog: { dateKey: getLocalDateKey(), xpFromLogging: 0 },
          streakCount: 0,
          lastMilestone: null
        });
        await window.FirestoreService.setQuickAddItems(userId, []);
      } catch (e) {
        console.warn("[StorageAPI] resetCurrentUserData Firebase error:", e);
      }
    }

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
    if (data && data.firstName !== undefined) {
      user.firstName = sanitizeName(data.firstName);
    }
    if (data && data.lastName !== undefined) {
      user.lastName = sanitizeName(data.lastName);
    }
    if (data && data.username !== undefined) {
      user.username = sanitizeName(data.username);
    }
    saveStore(store);
    if (window.FirestoreService) {
      window.FirestoreService.setUserDoc(store.session.userId, {
        firstName: user.firstName,
        lastName: user.lastName
      });
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
    return user.preferences ? Object.assign({}, user.preferences) : {};
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
    var keys = Object.keys(prefs);
    for (var i = 0; i < keys.length; i++) {
      user.preferences[keys[i]] = prefs[keys[i]];
    }
    saveStore(store);
    return { ok: true };
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
      var activeId = prefs.activeChatThreadId || threads[0].id;
      var hasActive = false;
      for (var i = 0; i < threads.length; i++) {
        if (threads[i].id === activeId) {
          hasActive = true;
          break;
        }
      }
      if (!hasActive) {
        activeId = threads[0].id;
        savePreferences({ activeChatThreadId: activeId });
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
    if (!active && threads.length > 0) {
      active = threads[0];
      savePreferences({ activeChatThreadId: active.id });
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
    savePreferences({ chatThreads: threads, activeChatThreadId: thread.id });
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
      savePreferences({ chatThreads: [fresh], activeChatThreadId: fresh.id });
      return { ok: true, activeThreadId: fresh.id };
    }

    var activeId = prefs.activeChatThreadId;
    var nextActive = activeId === threadId ? next[0].id : activeId;
    savePreferences({ chatThreads: next, activeChatThreadId: nextActive });
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
    return savePreferences({ chatThreads: updatedThreads, activeChatThreadId: activeId });
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
    return savePreferences({ chatThreads: threads });
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

  // ── Dev-only: restore gamification snapshot (used by dev-tools.js Reset) ──
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
    saveStore(store);
    if (window.FirestoreService) {
      syncGamificationFields(store.session.userId, user);
    }
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
    var d = new Date(date);
    var day = d.getDay();
    var diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
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

  function getCurrentQuest() {
    var store = loadStore();
    if (!store.session) { return null; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return null; }
    ensureGamificationFields(user);

    var now = new Date();
    var weekNum = getIsoWeekNumber(now);
    var mondayKey = getLocalDateKey(getWeekMondayDate(now));

    // Check if active quest is valid for this week
    if (user.activeQuest) {
      var questMondayKey = getLocalDateKey(new Date(user.activeQuest.assignedAt));
      if (questMondayKey === mondayKey) {
        return user.activeQuest;
      }
      // Quest is from a previous week — archive it
      user.questHistory.unshift(user.activeQuest);
      user.activeQuest = null;
    }

    // Assign a fresh quest for this week
    user.activeQuest = _buildFreshQuest(weekNum);
    saveStore(store);
    return user.activeQuest;
  }

  function getQuestHistory() {
    var store = loadStore();
    if (!store.session) { return []; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return []; }
    ensureGamificationFields(user);
    return user.questHistory.slice();
  }

  function _completeQuestInternal(store, user, quest) {
    quest.completedAt = new Date().toISOString();
    addXpInternal(user, quest.xpReward, "quest-complete");
    addSentimosInternal(user, quest.sentimosReward || 25, "quest-" + quest.id);
    user.questsCompleted = (user.questsCompleted || 0) + 1;
    user.questHistory.unshift(Object.assign({}, quest));
    user.activeQuest = null;
    saveStore(store);
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

  function updateQuestProgress() {
    var store = loadStore();
    if (!store.session) { return; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return; }
    ensureGamificationFields(user);

    // Ensure quest is assigned
    var now = new Date();
    var weekNum = getIsoWeekNumber(now);
    var mondayKey = getLocalDateKey(getWeekMondayDate(now));

    if (!user.activeQuest) {
      user.activeQuest = _buildFreshQuest(weekNum);
    } else {
      var questMondayKey = getLocalDateKey(new Date(user.activeQuest.assignedAt));
      if (questMondayKey !== mondayKey) {
        user.questHistory.unshift(user.activeQuest);
        user.activeQuest = _buildFreshQuest(weekNum);
      }
    }

    if (user.activeQuest.completedAt) { return; }

    var expenses = Array.isArray(user.expenses) ? user.expenses : [];
    var weeklyBudget = user.weeklyBudget || 0;
    var monday = getWeekMondayDate(now);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    var weekExpenses = expenses.filter(function (e) {
      var d = new Date(e.timestamp);
      return d >= monday && d <= sunday;
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
      var allGood = true;
      Object.keys(spendByDay).forEach(function (dk) {
        if (spendByDay[dk] <= dailySlice) {
          underBudgetDays += 1;
        } else {
          allGood = false;
        }
      });
      noOverspendDays = allGood ? logDaysCount : 0;
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
      user.weeklyXpStart = user.totalXp || user.xp || 0;
      user.weeklyXpStartDate = weekMondayKey;
    }
    var xpEarnedThisWeek = Math.max(0, ((user.totalXp || user.xp || 0) - (user.weeklyXpStart || 0)));

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
      _completeQuestInternal(store, user, user.activeQuest);
    } else {
      saveStore(store);
      if (anyTick) {
        var questSnap = JSON.parse(JSON.stringify(user.activeQuest));
        window.dispatchEvent(new CustomEvent("sugbocents:questProgressTick", { detail: questSnap }));
      }
    }
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
    resetCurrentUserData: resetCurrentUserData,
    removeExpense: removeExpense,
    getQuickAddItems: getQuickAddItems,
    saveQuickAddItems: saveQuickAddItems,
    updateUserProfile: updateUserProfile,
    getPreferences: getPreferences,
    savePreferences: savePreferences,
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
    updateQuestProgress: updateQuestProgress,
    creditDailyMission: creditDailyMission,
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
    __devRestoreGamState: devRestoreGamState
  };
})();

