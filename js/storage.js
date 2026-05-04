(function () {
  var APP_KEY = "sugbocents.v1";
  var AUTH_DISABLED = false; // Set to true to bypass auth and use a built-in demo session.
  var DEMO_USER_ID = "demo_user";
  var DEMO_USER_EMAIL = "demo@sugbocents.local";

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
  // Achievement IDs follow GAMIFICATION_DESIGN_V1.md + user-requested expansion.
  // Savings badges (saver-seed, triple-digits) are Phase 5 — not included until savings feature ships.
  var ACHIEVEMENTS = [
    // ── Logging ───────────────────────────────────────────────
    { id: "first-step",      name: "First Step",      description: "Log your first expense",          icon: "bi-pencil-square",         type: "expense_count", target: 1,   category: "Logging" },
    { id: "getting-started", name: "Getting Started", description: "Log 5 expenses",                  icon: "bi-check2-circle",          type: "expense_count", target: 5,   category: "Logging" },
    { id: "budget-regular",  name: "Budget Regular",  description: "Log 25 expenses",                 icon: "bi-journal-check",          type: "expense_count", target: 25,  category: "Logging" },
    { id: "century",         name: "Century Club",    description: "Log 100 expenses",                icon: "bi-list-check",             type: "expense_count", target: 100, category: "Logging" },
    // ── Streaks ───────────────────────────────────────────────
    { id: "on-fire",         name: "On Fire",         description: "Reach a 3-day streak",            icon: "bi-fire",                   type: "streak",        target: 3,   category: "Streak" },
    { id: "consistent",      name: "Consistent",      description: "Reach a 7-day streak",            icon: "bi-calendar-check-fill",    type: "streak",        target: 7,   category: "Streak" },
    { id: "streak-master",   name: "Streak Master",   description: "Reach a 30-day streak",           icon: "bi-trophy-fill",            type: "streak",        target: 30,  category: "Streak" },
    // ── Budget ────────────────────────────────────────────────
    { id: "under-budget",    name: "Under Budget",    description: "Finish a week under budget",      icon: "bi-check-circle-fill",      type: "budget_week",   target: 1,   category: "Budget" },
    { id: "frugal",          name: "Frugal Week",     description: "Spend \u226450% of weekly budget", icon: "bi-piggy-bank",             type: "budget_frugal", target: 1,   category: "Budget" },
    // ── Misc ──────────────────────────────────────────────────
    { id: "early-bird",      name: "Early Bird",      description: "Log an expense before 7 AM",      icon: "bi-sunrise",                type: "time_of_day",   target: 1,   category: "Misc" },
    { id: "night-owl",       name: "Night Owl",       description: "Log an expense after 10 PM",      icon: "bi-moon-stars-fill",        type: "time_of_day",   target: 1,   category: "Misc" },
    // ── Goals ─────────────────────────────────────────────────
    { id: "goal-setter",     name: "Goal Setter",     description: "Create your first savings goal",  icon: "bi-flag-fill",              type: "goal_count",    target: 1,   category: "Goals" },
    // ── XP / Level ───────────────────────────────────────────
    { id: "level-up-2",      name: "Budget Aware",    description: "Reach Level 2",                   icon: "bi-arrow-up-circle-fill",   type: "level",         target: 2,   category: "XP" },
    { id: "level-up-5",      name: "Streak Hunter",   description: "Reach Level 5",                   icon: "bi-lightning-charge-fill",  type: "level",         target: 5,   category: "XP" }
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
      var parsed = raw ? JSON.parse(raw) : { users: [], session: null };
      var store = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        session: parsed.session || null
      };

      if (AUTH_DISABLED) {
        var demoUser = store.users.find(function (user) {
          return user.id === DEMO_USER_ID || sanitizeEmail(user.email) === DEMO_USER_EMAIL;
        });

        if (!demoUser) {
          demoUser = {
            id: DEMO_USER_ID,
            firstName: "Demo",
            lastName: "User",
            username: "Demo User",
            email: DEMO_USER_EMAIL,
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
          };
          store.users.push(demoUser);
        }

        if (!store.session || !getUserById(store, store.session.userId)) {
          store.session = {
            userId: demoUser.id,
            createdAt: nowIso(),
            provider: "local"
          };
        }

        localStorage.setItem(APP_KEY, JSON.stringify(store));
      }

      return store;
    } catch (error) {
      var fallback = { users: [], session: null };

      if (AUTH_DISABLED) {
        fallback.users.push({
          id: DEMO_USER_ID,
          firstName: "Demo",
          lastName: "User",
          username: "Demo User",
          email: DEMO_USER_EMAIL,
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
        fallback.session = {
          userId: DEMO_USER_ID,
          createdAt: nowIso(),
          provider: "local"
        };
      }

      return fallback;
    }
  }

  function saveStore(store) {
    localStorage.setItem(APP_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("sugbocents:synced"));
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

  function dispatchStorageEvent(eventName, detail) {
    if (!window || typeof window.dispatchEvent !== "function") {
      return;
    }
    window.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
  }

  function notifyBudgetChange(reason) {
    var detail = { reason: reason || "update" };
    dispatchStorageEvent("sugbocents:budget-changed", detail);
    dispatchStorageEvent("sugbocents:synced", detail);
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

  function getSaveGoalsStreak(goals) {
    if (!Array.isArray(goals) || goals.length === 0) { return 0; }
    
    var set = {};
    goals.forEach(function (goal) {
      if (goal && goal.completed && goal.completedAt) {
        set[getLocalDateKey(goal.completedAt)] = true;
      }
    });
    
    var today = new Date();
    var todayKey = getLocalDateKey(today);
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    var yesterdayKey = getLocalDateKey(yesterday);
    
    if (!set[todayKey] && !set[yesterdayKey]) { return 0; }
    
    var cursor = set[todayKey] ? new Date(today) : new Date(yesterday);
    var count = 0;
    while (set[getLocalDateKey(cursor)]) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
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
    var hasEarlyExpense = expenses.some(function (e) {
      return new Date(e.timestamp).getHours() < 7;
    });
    var hasLateExpense = expenses.some(function (e) {
      return new Date(e.timestamp).getHours() >= 22;
    });

    return ACHIEVEMENTS.map(function (a) {
      var progress = 0;
      var unlockable = false;
      if (a.type === "expense_count") {
        progress = expenseCount;
        unlockable = progress >= a.target;
      } else if (a.type === "streak") {
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
        notified: notified
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
      user.expenses = firestoreExpenses;
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
          lastRecommendationTip: null,
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
    // Return immediately so sidebar loads from localStorage instantly.
    // Firebase sync happens in the background and updates localStorage when new data arrives.
    initFirebaseSync();
    return Promise.resolve();
  }

  function initFirebaseSync() {
    if (!window.FirebaseInit || !window.FirebaseInit.ready) {
      return;
    }

    window.FirebaseInit.ready.then(function () {
      if (!isFirebaseAuthEnabled() || !window.FirebaseAuthService.onAuthStateChanged) {
        return;
      }

      // Set up permanent listener (never unsubscribe) so Firebase updates flow in continuously.
      window.FirebaseAuthService.onAuthStateChanged(function (user) {
        if (user) {
          ensureLocalUserFromSession(user);
        } else {
          clearSession();
        }

        var currentSession = loadStore();
        var currentUserId = currentSession.session ? currentSession.session.userId : null;
        if (user && currentUserId && window.FirestoreService) {
          syncFromFirestore(currentUserId);
        }
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
        lastRecommendationTip: null,
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

    if (window.FirestoreService) {
      window.FirestoreService.setUserDoc(store.session.userId, { weeklyBudget: user.weeklyBudget });
    }

    notifyBudgetChange("update");

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

    user.expenses.unshift(entry);
    var xpAwarded = addXpInternal(user, 5, "expense_log");
    var afterUnlockable = buildAchievementState(user)
      .filter(function (a) { return a.unlockable && !a.claimed; })
      .map(function (a) { return a.id; });
    var newUnlockables = afterUnlockable.filter(function (id) {
      return beforeUnlockable.indexOf(id) === -1;
    });
    saveStore(store);

    if (window.FirestoreService) {
      window.FirestoreService.addExpenseDoc(store.session.userId, entry);
      syncGamificationFields(store.session.userId, user);
    }

    notifyBudgetChange("add");

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
    user.xp = Math.max(0, Number(user.xp || 0) + grant);
    user.level = getLevelFromXp(user.xp).level;
    return grant;
  }

  function addXp(amount, source) {
    var store = loadStore();
    if (!store.session) { return { ok: false, error: "No active session." }; }
    var user = getUserById(store, store.session.userId);
    if (!user) { return { ok: false, error: "User not found." }; }
    var awarded = addXpInternal(user, amount, source || "manual");
    saveStore(store);
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
    saveStore(store);
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
      user.lastRecommendationTip = null;
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

    if (window.FirestoreService && window.FirestoreService.deleteExpenseDoc) {
      window.FirestoreService.deleteExpenseDoc(store.session.userId, expenseId);
    }

    notifyBudgetChange("remove");

    return { ok: true };
  }

  function restoreExpense(expense) {
    if (!expense || !expense.id) {
      return { ok: false, error: "Invalid expense." };
    }

    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    if (!Array.isArray(user.expenses)) {
      user.expenses = [];
    }

    user.expenses.unshift(expense);
    saveStore(store);

    if (window.FirestoreService && window.FirestoreService.addExpenseDoc) {
      window.FirestoreService.addExpenseDoc(store.session.userId, expense);
    }

    return { ok: true, expense: expense };
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

  // ── Sprint 3: AI recommendation tip cache ───────────────

  function getLastRecommendationTip() {
    var store = loadStore();
    if (!store.session) {
      return null;
    }
    var user = getUserById(store, store.session.userId);
    if (!user || !user.lastRecommendationTip) {
      return null;
    }
    try {
      return JSON.parse(JSON.stringify(user.lastRecommendationTip));
    } catch (error) {
      return null;
    }
  }

  function saveLastRecommendationTip(tip) {
    if (!tip || typeof tip !== "object") {
      return { ok: false, error: "Tip must be an object." };
    }

    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }
    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    try {
      user.lastRecommendationTip = JSON.parse(JSON.stringify(tip));
    } catch (error) {
      return { ok: false, error: "Unable to save tip." };
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
      updatedAt: nowIso(),
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
    var wasCompleted = !!goal.completed;
    goal.savedAmount = Math.max(0, amount);
    goal.completed = goal.savedAmount >= goal.targetAmount;
    if (!wasCompleted && goal.completed) {
      goal.completedAt = nowIso();
    }
    goal.updatedAt = nowIso();
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

  function getChatHistory() {
    var prefs = getPreferences();
    return Array.isArray(prefs.chatHistory) ? prefs.chatHistory.slice() : [];
  }

  function saveChatMessage(role, text) {
    var history = getChatHistory();
    history.push({ role: String(role), text: String(text), timestamp: nowIso() });
    if (history.length > 50) { history = history.slice(-50); }
    return savePreferences({ chatHistory: history });
  }

  function clearChatHistory() {
    return savePreferences({ chatHistory: [] });
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
    notifyBudgetChange();
    return { ok: true };
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
    getSaveGoalsStreak: getSaveGoalsStreak,
    getAchievements: getAchievements,
    checkNewAchievements: checkNewAchievements,
    markAchievementsNotified: markAchievementsNotified,
    claimAchievement: claimAchievement,
    getChatHistory: getChatHistory,
    saveChatMessage: saveChatMessage,
    clearChatHistory: clearChatHistory,
    seedDemoData: seedDemoData,
    getLastRecommendationTip: getLastRecommendationTip,
    saveLastRecommendationTip: saveLastRecommendationTip
  };
})();

