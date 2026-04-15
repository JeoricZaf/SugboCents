(function () {
  var APP_KEY = "sugbocents.v1";

  var DEFAULT_QUICK_ADD_ITEMS = [
    { id: "qa_jeep",   category: "Jeep",            emoji: "🚌", amount: 18,  color: "#d8efe2" },
    { id: "qa_food",   category: "Food",             emoji: "🍜", amount: 120, color: "#ffedd5" },
    { id: "qa_load",   category: "Load",             emoji: "📱", amount: 50,  color: "#dbeafe" },
    { id: "qa_school", category: "School Supplies",  emoji: "📚", amount: 80,  color: "#f3e8ff" },
    { id: "qa_laundry",category: "Laundry",          emoji: "🧺", amount: 60,  color: "#fee2e2" }
  ];

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
        createdAt: nowIso()
      });

      if (window.FirestoreService) {
        window.FirestoreService.setUserDoc(sessionUser.id, {
          firstName: firstName,
          lastName: lastName,
          email: sanitizeEmail(sessionUser.email),
          weeklyBudget: 0,
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

    return {
      id: user.id,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      username: sanitizeName(user.username) || [firstName, lastName].filter(Boolean).join(" "),
      weeklyBudget: user.weeklyBudget || 0,
      expenses: Array.isArray(user.expenses) ? user.expenses : []
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

    var store = loadStore();
    if (!store.session) {
      return { ok: false, error: "No active session." };
    }

    var user = getUserById(store, store.session.userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    var entry = {
      id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      amount: amount,
      category: String((data && data.category) || "Other"),
      timestamp: nowIso(),
      note: data && data.note ? String(data.note) : ""
    };

    if (!Array.isArray(user.expenses)) {
      user.expenses = [];
    }

    user.expenses.unshift(entry);
    saveStore(store);

    if (window.FirestoreService) {
      window.FirestoreService.addExpenseDoc(store.session.userId, entry);
    }

    return { ok: true, expense: entry };
  }

  function getExpenses(limit) {
    var user = getCurrentUser();
    var expenses = user ? user.expenses : [];
    if (!Array.isArray(expenses)) {
      return [];
    }

    var sorted = expenses.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    if (typeof limit === "number" && limit > 0) {
      return sorted.slice(0, limit);
    }

    return sorted;
  }

  function getBudgetSummary() {
    var weeklyBudget = getWeeklyBudget();
    var expenses = getExpenses();
    var totalSpentThisWeek = expenses.reduce(function (sum, expense) {
      return sum + sanitizeAmount(expense.amount);
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
    saveStore(store);

    if (window.FirestoreService) {
      try {
        await window.FirestoreService.clearExpenseDocs(userId);
        await window.FirestoreService.setUserDoc(userId, { weeklyBudget: 0, quickAddItems: [] });
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
    saveQuickAddItems: saveQuickAddItems
  };
})();

