/**
 * SugboCents Dev Test Panel
 * Comprehensive test scenarios for demo/presentation use.
 * Toggle with the 🔧 Dev button (fixed, bottom-left of any protected page).
 */
(function () {
  "use strict";

  var DEV_TAG            = "[DEV]";
  var SNAP_KEY_BUDGET    = "sugbocents.devtools.budget";
  var SNAP_KEY_GAM       = "sugbocents.devtools.gam";
  var SNAP_KEY_QUEST     = "sugbocents.devtools.quest";
  var FAKE_FRIENDS_KEY   = "sugbocents.devtools.fakefriends";

  // XP thresholds (mirrors XP_LEVELS in storage.js)
  var XP_LEVELS = [
    { level: 1, name: "Rookie Saver",  minXp: 0    },
    { level: 2, name: "Budget Aware",  minXp: 50   },
    { level: 3, name: "Money Smart",   minXp: 150  },
    { level: 4, name: "Week Crusher",  minXp: 350  },
    { level: 5, name: "Streak Hunter", minXp: 700  },
    { level: 6, name: "Finance Pro",   minXp: 1200 },
    { level: 7, name: "Budget Legend", minXp: 2000 }
  ];

  // Fake friends for leaderboard demo
  // Score formula: XP×1 + Quests×50 + Streak×10 (cap 21d)
  // Carlos: 320 + 8×50 + 14×10 = 860   → rank 1
  // Mia:    210 + 5×50 + 8×10  = 540   → rank 2
  // Jake:   150 + 3×50 + 5×10  = 350   → rank 3
  // Ana:     80 + 2×50 + 3×10  = 210   → rank 4
  // Ben:     30 + 1×50 + 1×10  =  90   → rank 5
  var DEV_FAKE_FRIENDS = [
    { uid: "dev-friend-001", displayName: "Carlos M.", firstName: "Carlos",
      streak: 14, questsCompleted: 8, weeklyXP: 320, level: 5, levelName: "Streak Hunter" },
    { uid: "dev-friend-002", displayName: "Mia R.",    firstName: "Mia",
      streak: 8,  questsCompleted: 5, weeklyXP: 210, level: 3, levelName: "Money Smart" },
    { uid: "dev-friend-003", displayName: "Jake T.",   firstName: "Jake",
      streak: 5,  questsCompleted: 3, weeklyXP: 150, level: 2, levelName: "Budget Aware" },
    { uid: "dev-friend-004", displayName: "Ana L.",    firstName: "Ana",
      streak: 3,  questsCompleted: 2, weeklyXP: 80,  level: 2, levelName: "Budget Aware" },
    { uid: "dev-friend-005", displayName: "Ben C.",    firstName: "Ben",
      streak: 1,  questsCompleted: 1, weeklyXP: 30,  level: 1, levelName: "Rookie Saver" }
  ];

  // A handful of impressive badge IDs to demo in the panel
  var DEMO_ACHIEVEMENTS = [
    { id: "on-fire",       label: "On Fire (Streak 3)" },
    { id: "consistent",    label: "Consistent (Streak 7)" },
    { id: "streak-master", label: "Streak Master (30)" },
    { id: "under-budget",  label: "Under Budget (Week)" },
    { id: "frugal",        label: "Frugal Week" },
    { id: "quest-1",       label: "First Quest" },
    { id: "quest-5",       label: "Quest Regular (5)" },
    { id: "first-step",    label: "First Step (1 log)" },
    { id: "budget-regular",label: "Budget Regular (25 logs)" },
    { id: "level-up-2",    label: "Budget Aware (Lvl 2)" },
    { id: "level-up-5",    label: "Streak Hunter (Lvl 5)" }
  ];

  // ── Time helpers ───────────────────────────────────────────────────────────

  function daysAgoTs(n, hour) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(typeof hour === "number" ? hour : 9, 0, 0, 0);
    return d.toISOString();
  }

  function daysElapsedThisWeek() {
    return ((new Date().getDay() + 6) % 7) + 1;
  }

  // ── Snapshot: save original state before first scenario ───────────────────

  function saveSnapshot() {
    if (localStorage.getItem(SNAP_KEY_BUDGET) !== null) { return; }

    var b = window.StorageAPI && window.StorageAPI.getWeeklyBudget
      ? window.StorageAPI.getWeeklyBudget() : 0;
    localStorage.setItem(SNAP_KEY_BUDGET, String(b));

    var xpInfo     = window.StorageAPI.getXpInfo     ? window.StorageAPI.getXpInfo()     : {};
    var streakData = window.StorageAPI.getStreakData  ? window.StorageAPI.getStreakData()  : {};
    var sentimos   = window.StorageAPI.getSentimos    ? window.StorageAPI.getSentimos()   : 0;
    localStorage.setItem(SNAP_KEY_GAM, JSON.stringify({
      xp:          Number(xpInfo.xp    || 0),
      level:       Number(xpInfo.level || 1),
      streakCount: Number(streakData.count || 0),
      sentimos:    Number(sentimos || 0)
    }));

    // Save current quest state so reset can fully restore it
    var quest = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    localStorage.setItem(SNAP_KEY_QUEST, JSON.stringify(quest || null));
  }

  function restoreSnapshot() {
    var rawB = localStorage.getItem(SNAP_KEY_BUDGET);
    if (rawB !== null) {
      if (window.StorageAPI && window.StorageAPI.saveWeeklyBudget) {
        window.StorageAPI.saveWeeklyBudget(parseFloat(rawB) || 0);
      }
      localStorage.removeItem(SNAP_KEY_BUDGET);
    }
    var rawG = localStorage.getItem(SNAP_KEY_GAM);
    if (rawG !== null) {
      try {
        var gam = JSON.parse(rawG);
        if (window.StorageAPI && window.StorageAPI.__devRestoreGamState) {
          window.StorageAPI.__devRestoreGamState(gam);
        }
        // Restore sentimos if saved
        if (typeof gam.sentimos === "number" && window.StorageAPI.__devSetSentimos) {
          window.StorageAPI.__devSetSentimos(gam.sentimos);
        }
      } catch (e) {}
      localStorage.removeItem(SNAP_KEY_GAM);
    }
    // Restore quest slot
    var rawQ = localStorage.getItem(SNAP_KEY_QUEST);
    if (rawQ !== null) {
      try {
        var savedQuest = JSON.parse(rawQ);
        if (window.StorageAPI && window.StorageAPI.setCurrentQuest) {
          window.StorageAPI.setCurrentQuest(savedQuest);
        }
      } catch (e) {}
      localStorage.removeItem(SNAP_KEY_QUEST);
    }
  }

  // ── Core helpers ──────────────────────────────────────────────────────────

  function addDev(data) {
    if (!window.StorageAPI || !window.StorageAPI.addExpense) { return; }
    window.StorageAPI.addExpense(Object.assign({}, data, {
      note: DEV_TAG + " " + (data.category || ""),
      raw: true
    }));
  }

  function clearDevExpenses() {
    if (!window.StorageAPI || !window.StorageAPI.getExpenses) { return; }
    window.StorageAPI.getExpenses().filter(function (e) {
      return e.note && e.note.indexOf(DEV_TAG) === 0;
    }).forEach(function (e) {
      window.StorageAPI.removeExpense(e.id);
    });
  }

  function refresh() {
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
  }

  function phpFmt(n) {
    return "\u20b1" + Math.round(n).toLocaleString("en-PH");
  }

  function setStatus(msg, type) {
    var el = document.getElementById("devStatus");
    if (!el) { return; }
    el.textContent = msg;
    el.className = "dev-status dev-status--" + (type === "err" ? "err" : "ok");
    clearTimeout(el._devT);
    el._devT = setTimeout(function () {
      el.textContent = "";
      el.className = "dev-status";
    }, 8000);
  }

  // ── Scenario: Reset ───────────────────────────────────────────────────────

  function scenarioReset() {
    clearDevExpenses();
    restoreSnapshot();
    window.__DEV_FORCE_AT_RISK = false;
    // Also reset quest slot so claim locks are lifted
    if (window.StorageAPI && window.StorageAPI.__devResetQuestSlot) {
      window.StorageAPI.__devResetQuestSlot();
    }
    // Clear fake friends from Firestore if any were seeded
    var rawFriends = localStorage.getItem(FAKE_FRIENDS_KEY);
    if (rawFriends) {
      var db  = getDb();
      var uid = getMyUid();
      if (db && uid) {
        try {
          var uids = JSON.parse(rawFriends) || [];
          uids.forEach(function (fUid) {
            db.collection("friends").doc(uid).collection("friends").doc(fUid).delete();
          });
          localStorage.removeItem(FAKE_FRIENDS_KEY);
        } catch (_) {}
      }
    }
    refresh();
    setStatus("\u2714 All data restored to original state.", "ok");
  }

  // ── Health scenarios ──────────────────────────────────────────────────────

  function getSpentThisWeek() {
    var summary = window.StorageAPI.getBudgetSummary
      ? window.StorageAPI.getBudgetSummary() : {};
    return summary.totalSpentThisWeek || 0;
  }

  function healthScenario(targetRatio, fallbackAmount, label, pillClass) {
    saveSnapshot();
    clearDevExpenses();

    var spent   = getSpentThisWeek();
    var elapsed = daysElapsedThisWeek();

    if (spent <= 0) {
      addDev({ amount: fallbackAmount, category: "food" });
      spent = getSpentThisWeek();
      if (spent <= 0) { spent = fallbackAmount; }
    }

    var budget = Math.ceil(spent * 7 / (elapsed * targetRatio));

    if (pillClass !== "over" && budget <= spent) {
      budget = Math.floor(spent * 1.05) + 1;
    }
    if (pillClass === "over" && budget >= spent) {
      budget = Math.max(1, Math.floor(spent * 0.85));
    }

    window.StorageAPI.saveWeeklyBudget(budget);
    window.__DEV_FORCE_AT_RISK = false;
    refresh();
    setStatus(label + " " + phpFmt(spent) + " spent vs " + phpFmt(budget) + " budget.", "ok");
  }

  function scenarioAhead()   { healthScenario(0.55, 80, "\ud83d\udcc8 Ahead:",      "ahead");   }
  function scenarioOnTrack() { healthScenario(0.95, 80, "\u2713 On track:",          "ontrack"); }
  function scenarioWarn()    { healthScenario(1.18, 80, "\u26a0\ufe0f Watch out:",   "warn");    }
  function scenarioOver()    { healthScenario(1.30, 100, "\ud83d\udd34 Over budget:", "over");   }

  // ── Streak scenarios ──────────────────────────────────────────────────────

  function scenarioStreak5() {
    saveSnapshot();
    clearDevExpenses();
    for (var i = 4; i >= 0; i--) {
      addDev({ amount: 55, category: "transport", timestamp: daysAgoTs(i, 8) });
    }
    window.__DEV_FORCE_AT_RISK = false;
    refresh();
    setStatus("\ud83d\udd25 5-day streak loaded (today included).", "ok");
  }

  function scenarioAtRisk() {
    saveSnapshot();
    clearDevExpenses();
    for (var i = 5; i >= 1; i--) {
      addDev({ amount: 55, category: "transport", timestamp: daysAgoTs(i, 8) });
    }
    window.__DEV_FORCE_AT_RISK = true;
    refresh();
    setStatus("\u26a1 At-risk: 5-day streak, no expense logged today.", "ok");
  }

  function scenarioStreak14() {
    saveSnapshot();
    clearDevExpenses();
    for (var i = 13; i >= 0; i--) {
      addDev({ amount: 60, category: "food", timestamp: daysAgoTs(i, 8) });
    }
    window.__DEV_FORCE_AT_RISK = false;
    refresh();
    setStatus("\ud83c\udfc6 14-day streak loaded.", "ok");
  }

  // ── Quest scenarios ───────────────────────────────────────────────────────

  function scenarioQuestReset() {
    if (!window.StorageAPI || !window.StorageAPI.__devResetQuestSlot) {
      setStatus("StorageAPI.__devResetQuestSlot not available.", "err");
      return;
    }
    var result = window.StorageAPI.__devResetQuestSlot();
    if (result.ok) {
      refresh();
      setStatus("\ud83d\udd04 Quest slot cleared. Track a quest from the Board to begin.", "ok");
    } else {
      setStatus("Quest reset failed \u2014 no active session?", "err");
    }
  }

  // Wipes the active quest slot AND all claim locks — every quest can be re-presented
  function scenarioQuestResetAll() {
    if (!window.StorageAPI || !window.StorageAPI.__devResetAllQuests) {
      setStatus("StorageAPI.__devResetAllQuests not available.", "err");
      return;
    }
    var result = window.StorageAPI.__devResetAllQuests();
    if (result.ok) {
      refresh();
      setStatus("\u267b Reset All Quests \u2014 slot cleared + all claim locks removed. Ready for presentation!", "ok");
    } else {
      setStatus("Full quest reset failed \u2014 no active session?", "err");
    }
  }

  function scenarioQuestForceComplete() {
    if (!window.StorageAPI) { return; }
    var quest = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    if (!quest) {
      setStatus("No active quest tracked. Track one from the Quest Board first.", "err");
      return;
    }
    if (quest.completedAt) {
      setStatus("Quest is already complete \u2014 claim the reward.", "ok");
      return;
    }
    if (Array.isArray(quest.conditions)) {
      quest.conditions.forEach(function (c) { c.progress = c.target; });
    }
    quest.completedAt = new Date().toISOString();
    if (window.StorageAPI.setCurrentQuest) {
      window.StorageAPI.setCurrentQuest(quest);
    }
    refresh();
    setStatus("\u2714 Quest forced complete \u2014 Claim button is now live!", "ok");
  }

  function scenarioQuestForceCompleteClaim() {
    if (!window.StorageAPI) { return; }
    var quest = window.StorageAPI.getCurrentQuest ? window.StorageAPI.getCurrentQuest() : null;
    if (!quest) {
      setStatus("No active quest. Track one from the Quest Board first.", "err");
      return;
    }
    // Force-complete conditions if not already done
    if (!quest.completedAt) {
      if (Array.isArray(quest.conditions)) {
        quest.conditions.forEach(function (c) { c.progress = c.target; });
      }
      quest.completedAt = new Date().toISOString();
      if (window.StorageAPI.setCurrentQuest) {
        window.StorageAPI.setCurrentQuest(quest);
      }
    }
    // Now claim the reward
    if (!window.StorageAPI.claimQuestReward) {
      setStatus("claimQuestReward not available on StorageAPI.", "err");
      return;
    }
    var result = window.StorageAPI.claimQuestReward(quest.id, quest);
    if (result && result.ok) {
      refresh();
      setStatus(
        "\ud83c\udf89 \"" + (result.title || quest.id) + "\" completed & claimed! " +
        "+" + (result.xpReward || 0) + " XP, +\u20b5" + (result.sentimosReward || 0) + " Sentimos.",
        "ok"
      );
    } else if (result && result.alreadyClaimed) {
      setStatus("Quest already claimed this period. Use Reset Slot to re-test.", "ok");
    } else {
      setStatus("Claim failed: " + (result ? result.error || "unknown" : "no response"), "err");
    }
  }

  // ── Full Leaderboard Seed (friends + your XP + live feed in one shot) ────

  function scenarioFullLbSeed() {
    var db  = getDb();
    var uid = getMyUid();
    if (!db) {
      setStatus("Firestore not available \u2014 sign in first.", "err");
      return;
    }
    if (!uid) {
      setStatus("No active user session found.", "err");
      return;
    }
    setStatus("\u23f3 Seeding full leaderboard (friends + XP + feed)\u2026", "ok");

    // Step 1: Set your weeklyXP to ~250 so you rank ~3rd (between Mia=540 and Jake=350)
    // We do this by setting weeklyXpStart = currentXp - 250.
    // This way getSelf() computes weeklyXP = xp - weeklyXpStart = 250.
    saveSnapshot();
    if (window.StorageAPI && window.StorageAPI.__devRestoreGamState) {
      var info = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { xp: 0, level: 1 };
      var currentXp = Math.max(250, Number(info.xp || 0));
      var mondayKey = (function () {
        var d = new Date();
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        d.setHours(0, 0, 0, 0);
        return d.getFullYear() + "-" +
          String(d.getMonth() + 1).padStart(2, "0") + "-" +
          String(d.getDate()).padStart(2, "0");
      }());
      window.StorageAPI.__devRestoreGamState({
        xp: currentXp,
        level: Number(info.level || 2),
        streakCount: null,
        weeklyXpStart: currentXp - 250,
        weeklyXpStartDate: mondayKey
      });
    }

    var now = new Date().toISOString();

    // Step 2: Write friends
    var friendPromises = DEV_FAKE_FRIENDS.map(function (f) {
      var profile = {
        displayName: f.displayName, firstName: f.firstName,
        streak: f.streak, questsCompleted: f.questsCompleted,
        weeklyXP: f.weeklyXP, level: f.level, levelName: f.levelName,
        lastSyncedAt: now
      };
      return Promise.all([
        db.collection("users").doc(f.uid).set({ publicProfile: profile }, { merge: true }),
        db.collection("friends").doc(uid).collection("friends").doc(f.uid)
          .set({ addedAt: now, displayName: f.displayName, publicProfile: profile })
      ]);
    });

    // Step 3: Seed live feed entries
    var audience = [uid].concat(DEV_FAKE_FRIENDS.map(function (f) { return f.uid; }));
    var FEED_TEMPLATES = [
      { emoji: "\uD83C\uDF5C", message: "{name} logged lunch for \u20b185" },
      { emoji: "\u2615",       message: "{name} grabbed coffee \u2014 staying in budget" },
      { emoji: "\uD83D\uDE8C", message: "{name} logged a commute expense" },
      { emoji: "\uD83D\uDD25", message: "{name} is on a {streak}-day streak!" },
      { emoji: "\u26A1",       message: "{name} gained {xp} XP this week" },
      { emoji: "\u2705",       message: "{name} finished a weekly quest" },
      { emoji: "\uD83C\uDFC5", message: "{name} just unlocked a new badge" },
      { emoji: "\uD83D\uDCB0", message: "{name} logged an expense under budget" }
    ];
    var feedTime = Date.now();
    var feedPromises = [];
    DEV_FAKE_FRIENDS.forEach(function (f, fi) {
      for (var i = 0; i < 2; i++) {
        var tpl = FEED_TEMPLATES[(fi * 2 + i) % FEED_TEMPLATES.length];
        var msg = tpl.message
          .replace("{name}",   f.firstName)
          .replace("{streak}", String(f.streak))
          .replace("{xp}",     String(f.weeklyXP));
        feedPromises.push(db.collection("global_feed").add({
          type: "activity", emoji: tpl.emoji, message: msg,
          authorName: f.displayName, authorInitial: f.firstName.charAt(0).toUpperCase(),
          authorUid: f.uid, audience: audience,
          timestamp: new Date(feedTime - (fi * 2 + i) * 8 * 60 * 1000).toISOString()
        }));
      }
    });

    Promise.all(friendPromises.concat(feedPromises)).then(function () {
      localStorage.setItem(FAKE_FRIENDS_KEY,
        JSON.stringify(DEV_FAKE_FRIENDS.map(function (f) { return f.uid; })));
      try {
        localStorage.setItem("sugbocents_friend_cache",
          JSON.stringify(DEV_FAKE_FRIENDS.map(function (f) { return f.uid; })));
      } catch (_) {}
      refresh();
      setStatus(
        "\u2714 Leaderboard seeded! You rank ~3rd among 6 players. " +
        "Open Leaderboard \u2014 Carlos leads, Mia is 2nd, you\u2019re in the hunt.",
        "ok"
      );
    }).catch(function (e) {
      setStatus("Seed failed: " + e.message, "err");
    });
  }

  // ── Leaderboard / Friends scenarios ──────────────────────────────────────

  function getMyUid() {
    var user = window.StorageAPI && window.StorageAPI.getCurrentUser
      ? window.StorageAPI.getCurrentUser() : null;
    return user ? (user.id || user.uid || null) : null;
  }

  function getDb() {
    if (window.FirebaseInit && window.FirebaseInit.getDb) {
      return window.FirebaseInit.getDb();
    }
    if (window.firebase && window.firebase.firestore) {
      return window.firebase.firestore();
    }
    return null;
  }

  function scenarioPopulateFriends() {
    var db  = getDb();
    var uid = getMyUid();
    if (!db) {
      setStatus("Firestore not available \u2014 sign in first.", "err");
      return;
    }
    if (!uid) {
      setStatus("No active user session found.", "err");
      return;
    }
    setStatus("\u23f3 Writing 5 friends to Firestore\u2026", "ok");
    var now = new Date().toISOString();
    var promises = DEV_FAKE_FRIENDS.map(function (f) {
      var profile = {
        displayName:     f.displayName,
        firstName:       f.firstName,
        streak:          f.streak,
        questsCompleted: f.questsCompleted,
        weeklyXP:        f.weeklyXP,
        level:           f.level,
        levelName:       f.levelName,
        lastSyncedAt:    now
      };
      // Write public profile to users/{fakeUid} (so getPublicProfile works)
      var profileWrite = db.collection("users").doc(f.uid).set(
        { publicProfile: profile }, { merge: true }
      );
      // Embed publicProfile directly in the friend link doc so getFriends()
      // serves it from cache immediately (no extra round-trip read)
      var friendLink = db.collection("friends").doc(uid)
        .collection("friends").doc(f.uid)
        .set({ addedAt: now, displayName: f.displayName, publicProfile: profile });
      return Promise.all([profileWrite, friendLink]);
    });
    Promise.all(promises).then(function () {
      localStorage.setItem(FAKE_FRIENDS_KEY,
        JSON.stringify(DEV_FAKE_FRIENDS.map(function (f) { return f.uid; })));
      // Cache UIDs so live feed writes build the audience array correctly
      try {
        var uids = DEV_FAKE_FRIENDS.map(function (f) { return f.uid; });
        localStorage.setItem("sugbocents_friend_cache", JSON.stringify(uids));
      } catch (_) {}
      refresh();
      setStatus("\u2714 5 friends added! Navigate to Leaderboard to see them.", "ok");
    }).catch(function (e) {
      setStatus("Firestore write failed: " + e.message, "err");
    });
  }

  function scenarioClearFriends() {
    var db  = getDb();
    var uid = getMyUid();
    if (!db || !uid) {
      setStatus("Firestore / session not available.", "err");
      return;
    }
    var raw = localStorage.getItem(FAKE_FRIENDS_KEY);
    if (!raw) {
      setStatus("No fake friends found to clear.", "err");
      return;
    }
    var uids;
    try { uids = JSON.parse(raw); } catch (e) { uids = []; }
    if (!uids.length) {
      setStatus("Nothing to clear.", "ok");
      return;
    }
    setStatus("\u23f3 Removing fake friends\u2026", "ok");
    var promises = uids.map(function (fUid) {
      return db.collection("friends").doc(uid).collection("friends").doc(fUid).delete();
    });
    Promise.all(promises).then(function () {
      localStorage.removeItem(FAKE_FRIENDS_KEY);
      refresh();
      setStatus("\u2714 Fake friends cleared from Firestore.", "ok");
    }).catch(function (e) {
      setStatus("Clear failed: " + e.message, "err");
    });
  }

  // ── Sentimos scenarios ────────────────────────────────────────────────────

  function scenarioSetSentimos() {
    var input = document.getElementById("devSentimosInput");
    var amount = input ? parseInt(input.value, 10) : NaN;
    if (isNaN(amount) || amount < 0) {
      setStatus("Enter a valid \u20b5 amount (0 or more).", "err");
      return;
    }
    if (!window.StorageAPI || !window.StorageAPI.__devSetSentimos) {
      setStatus("StorageAPI.__devSetSentimos not available.", "err");
      return;
    }
    var result = window.StorageAPI.__devSetSentimos(amount);
    if (result.ok) {
      refresh();
      setStatus("\u2714 Sentimos set to \u20b5" + amount + ".", "ok");
    } else {
      setStatus("Set sentimos failed \u2014 no active session?", "err");
    }
  }

  // ── XP / Level scenarios ──────────────────────────────────────────────────

  function scenarioXpNearLevelUp() {
    if (!window.StorageAPI || !window.StorageAPI.getXpInfo) {
      setStatus("StorageAPI.getXpInfo not available.", "err");
      return;
    }
    var info    = window.StorageAPI.getXpInfo();
    var curLvl  = Number(info.level || 1);
    var nextDef = null;
    for (var i = 0; i < XP_LEVELS.length; i++) {
      if (XP_LEVELS[i].level === curLvl + 1) { nextDef = XP_LEVELS[i]; break; }
    }
    if (!nextDef) {
      setStatus("Already at max level (7). Cannot level up further.", "ok");
      return;
    }
    saveSnapshot();
    var targetXp = nextDef.minXp - 1;
    // Directly patch via addXp delta approach
    var current  = Number(info.xp || 0);
    var delta    = targetXp - current;
    if (delta > 0) {
      window.StorageAPI.addXp(delta, "dev-near-level-up");
    } else if (delta < 0) {
      // Need to set lower — use internal helper
      if (window.StorageAPI.__devRestoreGamState) {
        window.StorageAPI.__devRestoreGamState({ xp: targetXp, level: curLvl, streakCount: null });
      }
    }
    refresh();
    setStatus("\u26a1 XP set to " + targetXp + ". Add one expense to trigger Level " + (curLvl + 1) + " (" + nextDef.name + ")!", "ok");
  }

  function scenarioSetXp() {
    var input  = document.getElementById("devXpInput");
    var amount = input ? parseInt(input.value, 10) : NaN;
    if (isNaN(amount) || amount < 0) {
      setStatus("Enter a valid XP amount (0 or more).", "err");
      return;
    }
    if (!window.StorageAPI || !window.StorageAPI.__devRestoreGamState) {
      setStatus("StorageAPI.__devRestoreGamState not available.", "err");
      return;
    }
    saveSnapshot();
    var info    = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : {};
    // Determine correct level for the new XP
    var newLevel = 1;
    for (var i = XP_LEVELS.length - 1; i >= 0; i--) {
      if (amount >= XP_LEVELS[i].minXp) { newLevel = XP_LEVELS[i].level; break; }
    }
    window.StorageAPI.__devRestoreGamState({ xp: amount, level: newLevel, streakCount: null });
    refresh();
    setStatus("\u26a1 XP set to " + amount + " \u2192 Level " + newLevel + " (" + (XP_LEVELS[newLevel - 1] || {}).name + ").", "ok");
  }

  // ── Achievement scenarios ─────────────────────────────────────────────────

  function scenarioTriggerAchievement() {
    var sel = document.getElementById("devAchievSelect");
    var id  = sel ? sel.value : "";
    if (!id) {
      setStatus("Select a badge first.", "err");
      return;
    }
    if (!window.StorageAPI || !window.StorageAPI.claimAchievement) {
      setStatus("StorageAPI.claimAchievement not available.", "err");
      return;
    }
    // Force-unlock: mark as unlocked then claim
    var achievements = window.StorageAPI.getAchievements ? window.StorageAPI.getAchievements() : [];
    var badge = null;
    for (var i = 0; i < achievements.length; i++) {
      if (achievements[i].id === id) { badge = achievements[i]; break; }
    }
    if (!badge) {
      setStatus("Badge '" + id + "' not found.", "err");
      return;
    }
    if (badge.claimed) {
      setStatus("Badge '" + badge.name + "' already claimed.", "ok");
      return;
    }
    var result = window.StorageAPI.claimAchievement(id);
    if (result && result.ok !== false) {
      if (window.GamificationUI && window.GamificationUI.maybeNotifyNewAchievements) {
        window.GamificationUI.maybeNotifyNewAchievements([id]);
      }
      refresh();
      setStatus("\ud83c\udfc5 Badge unlocked: " + badge.name + " (+" + (result.xpGranted || 15) + " XP, +\u20b5" + (result.sentimosGranted || 25) + ")", "ok");
    } else {
      setStatus("Claim failed. Badge may need progress first. Try Force-Complete a Quest first.", "err");
    }
  }

  // ── Weekly Reset Sim ──────────────────────────────────────────────────────

  function scenarioWeeklyReset() {
    if (!window.StorageAPI) { return; }
    saveSnapshot();
    var info = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : {};
    var curXp = Number(info.xp || 0);
    // Reset weeklyXpStart = current XP so weeklyXP shows 0 on leaderboard
    if (window.StorageAPI.__devRestoreGamState) {
      window.StorageAPI.__devRestoreGamState({
        xp: curXp, level: Number(info.level || 1), streakCount: null,
        weeklyXpStart: curXp, weeklyXpStartDate: (function () {
          var d = new Date();
          d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
          return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
        }())
      });
    }
    refresh();
    setStatus("\ud83d\uddd3 Weekly XP reset to 0 \u2014 leaderboard shows fresh week.", "ok");
  }

  // ── Streak Freeze Demo ────────────────────────────────────────────────────

  function scenarioStreakFreezeDemo() {
    var db  = getDb();
    var uid = getMyUid();
    if (!window.StorageAPI || !window.StorageAPI.__devGiveStreakFreezes) {
      setStatus("StorageAPI.__devGiveStreakFreezes not available.", "err");
      return;
    }
    saveSnapshot();
    clearDevExpenses();
    // Build a 6-day streak with a gap yesterday (so freeze is relevant today)
    for (var i = 7; i >= 2; i--) {
      addDev({ amount: 55, category: "food", timestamp: daysAgoTs(i, 9) });
    }
    // Skip day 1 (yesterday) — creating the at-risk gap
    window.StorageAPI.__devGiveStreakFreezes(2);
    window.__DEV_FORCE_AT_RISK = true;
    refresh();
    setStatus("\ud83e\uddca 6-day streak + gap day. 2 Freezes equipped. Use the Streak badge to activate.", "ok");
  }

  // ── Onboarding scenarios ──────────────────────────────────────────────────

  function scenarioOnboardingReset() {
    saveSnapshot();
    clearDevExpenses();
    if (window.StorageAPI.saveWeeklyBudget) { window.StorageAPI.saveWeeklyBudget(0); }
    if (window.StorageAPI.savePreferences) {
      window.StorageAPI.savePreferences({ onboardingDismissed: false });
    }
    refresh();
    setStatus("\ud83c\udf31 Onboarding reset \u2014 card visible, both steps pending.", "ok");
  }

  function scenarioOnboardingStep1() {
    saveSnapshot();
    clearDevExpenses();
    if (window.StorageAPI.saveWeeklyBudget) { window.StorageAPI.saveWeeklyBudget(2000); }
    if (window.StorageAPI.savePreferences) {
      window.StorageAPI.savePreferences({ onboardingDismissed: false });
    }
    refresh();
    setStatus("\u2714 Step 1 done: Budget set. Card shows step 1 checked, step 2 pending.", "ok");
  }

  function scenarioOnboardingComplete() {
    saveSnapshot();
    if (window.StorageAPI.saveWeeklyBudget) { window.StorageAPI.saveWeeklyBudget(2000); }
    if (window.StorageAPI.savePreferences) {
      window.StorageAPI.savePreferences({ onboardingDismissed: false });
    }
    addDev({ amount: 50, category: "food" });
    refresh();
    setStatus("\u2714\u2714 Both steps done \u2014 card should auto-hide.", "ok");
  }

  function scenarioOnboardingDismiss() {
    if (window.StorageAPI.savePreferences) {
      window.StorageAPI.savePreferences({ onboardingDismissed: true });
    }
    refresh();
    setStatus("\u2716 Onboarding dismissed \u2014 card hidden (even if steps incomplete).", "ok");
  }

  // ── Populate Live Feed ────────────────────────────────────────────────────

  function scenarioPopulateLiveFeed() {
    var db  = getDb();
    var uid = getMyUid();
    if (!db) {
      setStatus("Firestore not available \u2014 sign in first.", "err");
      return;
    }
    if (!uid) {
      setStatus("No active user session found.", "err");
      return;
    }

    var FEED_TEMPLATES = [
      { emoji: "\uD83C\uDF5C", message: "{name} logged lunch for \u20b185" },
      { emoji: "\u2615",       message: "{name} grabbed coffee \u2014 staying in budget" },
      { emoji: "\uD83D\uDE8C", message: "{name} logged a commute expense" },
      { emoji: "\uD83D\uDED2", message: "{name} did their grocery run" },
      { emoji: "\uD83D\uDD25", message: "{name} is on a {streak}-day streak!" },
      { emoji: "\u26A1",       message: "{name} gained {xp} XP this week" },
      { emoji: "\uD83C\uDFC5", message: "{name} just unlocked a new badge" },
      { emoji: "\uD83D\uDCCA", message: "{name} completed their daily log" },
      { emoji: "\u2705",       message: "{name} finished a weekly quest" },
      { emoji: "\uD83D\uDCB0", message: "{name} logged an expense under budget" }
    ];

    setStatus("\u23F3 Seeding live feed for fake friends\u2026", "ok");

    var now = Date.now();
    var promises = [];

    // Build audience = [myUid, ...all fake friend UIDs]
    var audience = [uid].concat(DEV_FAKE_FRIENDS.map(function (f) { return f.uid; }));

    DEV_FAKE_FRIENDS.forEach(function (f, fi) {
      // Write 2 feed entries per fake friend, staggered in time
      for (var i = 0; i < 2; i++) {
        var tpl = FEED_TEMPLATES[(fi * 2 + i) % FEED_TEMPLATES.length];
        var msg = tpl.message
          .replace("{name}",   f.firstName)
          .replace("{streak}", String(f.streak))
          .replace("{xp}",     String(f.weeklyXP));
        var entry = {
          type:          "activity",
          emoji:         tpl.emoji,
          message:       msg,
          authorName:    f.displayName,
          authorInitial: f.firstName.charAt(0).toUpperCase(),
          authorUid:     f.uid,
          audience:      audience,
          timestamp:     new Date(now - (fi * 3 + i) * 7 * 60 * 1000).toISOString()
        };
        // Write to global_feed (single-query architecture)
        promises.push(db.collection("global_feed").add(entry));
      }
    });

    Promise.all(promises).then(function () {
      setStatus("\u2714 Live feed seeded with " + promises.length + " entries. Open Leaderboard to see them.", "ok");
    }).catch(function (e) {
      setStatus("Feed seed failed: " + e.message, "err");
    });
  }

  // ── Scenario map ──────────────────────────────────────────────────────────

  var SCENARIO_MAP = {
    "ahead":                scenarioAhead,
    "ontrack":              scenarioOnTrack,
    "warn":                 scenarioWarn,
    "over":                 scenarioOver,
    "streak5":              scenarioStreak5,
    "streak-risk":          scenarioAtRisk,
    "streak14":             scenarioStreak14,
    "quest-reset":          scenarioQuestReset,
    "quest-reset-all":      scenarioQuestResetAll,
    "quest-complete":       scenarioQuestForceComplete,
    "quest-complete-claim": scenarioQuestForceCompleteClaim,
    "lb-seed":              scenarioFullLbSeed,
    "lb-populate":          scenarioPopulateFriends,
    "lb-clear":             scenarioClearFriends,
    "lb-livefeed":          scenarioPopulateLiveFeed,
    "sentimos-set":         scenarioSetSentimos,
    "xp-near-levelup":      scenarioXpNearLevelUp,
    "xp-set":               scenarioSetXp,
    "achiev-trigger":       scenarioTriggerAchievement,
    "weekly-reset":         scenarioWeeklyReset,
    "streak-freeze-demo":   scenarioStreakFreezeDemo,
    "onboard-reset":        scenarioOnboardingReset,
    "onboard-step1":        scenarioOnboardingStep1,
    "onboard-complete":     scenarioOnboardingComplete,
    "onboard-dismiss":      scenarioOnboardingDismiss,
    "reset":                scenarioReset
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("devToolsStyle")) { return; }
    var s = document.createElement("style");
    s.id = "devToolsStyle";
    s.textContent = [
      /* ── Toggle button ── */
      ".dev-toggle-btn{position:fixed;bottom:5.2rem;left:1rem;z-index:9999;",
      "background:linear-gradient(135deg,#1f6b46,#2b8259);color:#fff;border:none;border-radius:999px;",
      "padding:0.45rem 0.95rem;font-size:0.82rem;cursor:pointer;",
      "box-shadow:0 4px 14px rgba(31,107,70,.38);",
      "transition:opacity 150ms,transform 120ms;font-weight:700;",
      "display:flex;align-items:center;gap:.35rem;}",
      ".dev-toggle-btn:hover{opacity:.92;transform:scale(1.04);}",
      ".dev-toggle-label{transition:opacity 160ms ease;}",

      /* ── Panel shell ── */
      "#devPanel{position:fixed;bottom:8.8rem;left:1rem;z-index:9999;",
      "width:20rem;max-height:74vh;overflow-y:auto;",
      "background:#ffffff;color:#0f172a;border-radius:1.1rem;",
      "border:1.5px solid #d1fae5;",
      "box-shadow:0 16px 40px rgba(15,23,42,.14);",
      "font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;font-size:.75rem;}",
      "#devPanel::-webkit-scrollbar{width:4px;}",
      "#devPanel::-webkit-scrollbar-track{background:transparent;}",
      "#devPanel::-webkit-scrollbar-thumb{background:#bbf7d0;border-radius:2px;}",

      /* ── Panel header ── */
      ".dev-panel-hdr{display:flex;justify-content:space-between;align-items:center;",
      "background:linear-gradient(135deg,#164f33,#2b8259);",
      "border-radius:1rem 1rem 0 0;padding:.7rem .9rem;position:sticky;top:0;z-index:1;}",
      ".dev-panel-title{font-weight:800;font-size:.82rem;color:#fff;",
      "display:flex;align-items:center;gap:.4rem;}",
      ".dev-close-btn{background:rgba(255,255,255,.18);border:none;color:#fff;",
      "font-size:1rem;cursor:pointer;padding:.15rem .45rem;border-radius:.35rem;line-height:1;",
      "transition:background 120ms;}",
      ".dev-close-btn:hover{background:rgba(255,255,255,.32);}",

      /* ── Panel body ── */
      ".dev-panel-body{padding:.75rem .85rem .9rem;}",
      ".dev-hint{font-size:.67rem;color:#64748b;margin-bottom:.6rem;line-height:1.5;}",

      /* ── Section headers ── */
      ".dev-sec{font-size:.6rem;font-weight:800;letter-spacing:.09em;",
      "text-transform:uppercase;color:#1f6b46;",
      "background:#f0fdf4;border-left:3px solid #2b8259;",
      "border-radius:0 .3rem .3rem 0;",
      "padding:.25rem .5rem;margin:.65rem 0 .3rem;}",

      /* ── Grids ── */
      ".dev-grid{display:grid;gap:.3rem;margin-bottom:.5rem;}",
      ".dev-grid--2{grid-template-columns:1fr 1fr;}",
      ".dev-grid--3{grid-template-columns:1fr 1fr 1fr;}",

      /* ── Base button ── */
      ".dev-btn{border:none;border-radius:.45rem;padding:.44rem .45rem;",
      "font-size:.67rem;font-weight:700;cursor:pointer;text-align:left;",
      "transition:filter 100ms,transform 80ms,box-shadow 100ms;line-height:1.35;",
      "box-shadow:0 1px 3px rgba(0,0,0,.06);}",
      ".dev-btn:hover{filter:brightness(.95);box-shadow:0 2px 8px rgba(0,0,0,.1);}",
      ".dev-btn:active{transform:scale(.96);filter:brightness(.9);}",

      /* ── Button variants (light pastel, matching brand palette) ── */
      ".dev-btn--green{background:#d1fae5;color:#065f46;}",
      ".dev-btn--teal{background:#ccfbf1;color:#0f4c44;}",
      ".dev-btn--amber{background:#fef3c7;color:#78350f;}",
      ".dev-btn--red{background:#fee2e2;color:#991b1b;}",
      ".dev-btn--orange{background:#ffedd5;color:#7c2d12;}",
      ".dev-btn--pulse{background:#fef9c3;color:#713f12;}",
      ".dev-btn--blue{background:#dbeafe;color:#1e3a5f;}",
      ".dev-btn--purple{background:#ede9fe;color:#4c1d95;}",
      ".dev-btn--indigo{background:#e0e7ff;color:#312e81;}",
      ".dev-btn--sky{background:#e0f2fe;color:#0c4a6e;}",
      ".dev-btn--slate{background:#f1f5f9;color:#334155;}",
      ".dev-btn--brand{background:linear-gradient(135deg,#1f6b46,#3aaa72);color:#fff;",
      "box-shadow:0 2px 8px rgba(31,107,70,.25);}",
      ".dev-btn--brand:hover{filter:brightness(1.06);}",

      /* ── Rows & inputs ── */
      ".dev-divider{height:1px;background:#e2f4e8;margin:.55rem 0;}",
      ".dev-row{display:flex;gap:.3rem;margin-bottom:.5rem;}",
      ".dev-input{flex:1;background:#f8fafc;color:#0f172a;",
      "border:1.5px solid #d1fae5;",
      "border-radius:.45rem;padding:.38rem .5rem;font-size:.7rem;min-width:0;",
      "font-family:inherit;}",
      ".dev-input:focus{outline:none;border-color:#2b8259;background:#fff;}",
      ".dev-select{flex:1;background:#f8fafc;color:#0f172a;",
      "border:1.5px solid #d1fae5;",
      "border-radius:.45rem;padding:.38rem .4rem;font-size:.67rem;min-width:0;",
      "font-family:inherit;}",
      ".dev-select:focus{outline:none;border-color:#2b8259;background:#fff;}",

      /* ── Reset button ── */
      ".dev-btn--reset{width:100%;",
      "background:linear-gradient(135deg,#164f33,#2b8259);",
      "color:#fff;border:none;",
      "border-radius:.5rem;padding:.52rem .7rem;",
      "font-size:.72rem;font-weight:800;cursor:pointer;text-align:left;",
      "box-shadow:0 2px 10px rgba(22,79,51,.25);",
      "transition:filter 120ms,transform 80ms;",
      "display:flex;align-items:center;gap:.45rem;}",
      ".dev-btn--reset:hover{filter:brightness(1.1);}",
      ".dev-btn--reset:active{transform:scale(.98);}",

      /* ── Status ── */
      ".dev-status{margin-top:.55rem;min-height:.9rem;font-size:.67rem;",
      "line-height:1.45;color:#94a3b8;padding:.3rem .2rem;}",
      ".dev-status--ok{color:#15803d;font-weight:600;}",
      ".dev-status--err{color:#b91c1c;font-weight:600;}"
    ].join("");
    document.head.appendChild(s);
  }

  // ── Build achievement select options ─────────────────────────────────────

  function buildAchievOptions() {
    return DEMO_ACHIEVEMENTS.map(function (a) {
      return "<option value=\"" + a.id + "\">" + a.label + "</option>";
    }).join("");
  }

  // ── Panel HTML ────────────────────────────────────────────────────────────

  function buildPanel() {
    if (document.getElementById("devToggleBtn")) { return; }

    var root = document.createElement("div");
    root.id = "devToolsRoot";
    root.innerHTML =
      /* Toggle button */
      "<button id=\"devToggleBtn\" class=\"dev-toggle-btn\" title=\"Dev Test Panel\">" +
        "<span>\ud83d\udd27</span><span class=\"dev-toggle-label\">Dev Tools</span>" +
      "</button>" +

      /* Panel */
      "<div id=\"devPanel\" style=\"display:none\">" +

        /* Sticky header */
        "<div class=\"dev-panel-hdr\">" +
          "<span class=\"dev-panel-title\">\ud83d\udd27 Dev Test Panel</span>" +
          "<button id=\"devCloseBtn\" class=\"dev-close-btn\" aria-label=\"Close\">&times;</button>" +
        "</div>" +

        /* Body */
        "<div class=\"dev-panel-body\">" +
          "<p class=\"dev-hint\">Test scenarios. Data persists via StorageAPI + Firestore. Use Reset to restore original state.</p>" +

          /* ── Budget Health ── */
          "<div class=\"dev-sec\">\ud83d\udcca Budget Health</div>" +
          "<div class=\"dev-grid dev-grid--2\">" +
            "<button class=\"dev-btn dev-btn--green\"  data-dev=\"ahead\">\ud83d\udcc8 Ahead of Pace</button>" +
            "<button class=\"dev-btn dev-btn--teal\"   data-dev=\"ontrack\">\u2714 On Track</button>" +
            "<button class=\"dev-btn dev-btn--amber\"  data-dev=\"warn\">\u26a0\ufe0f Watch Out</button>" +
            "<button class=\"dev-btn dev-btn--red\"    data-dev=\"over\">\ud83d\udd34 Over Budget</button>" +
          "</div>" +

          /* ── Quests ── */
          "<div class=\"dev-sec\">\ud83d\uddfa Quests</div>" +
          "<p class=\"dev-hint\" style=\"margin-bottom:.35rem\">Flow: <strong>1.</strong> Reset Slot &rarr; <strong>2.</strong> Track a quest on /quests &rarr; <strong>3.</strong> Force Complete or Complete+Claim.</p>" +
          "<div class=\"dev-grid dev-grid--2\">" +
            "<button class=\"dev-btn dev-btn--slate\"  data-dev=\"quest-reset\">\ud83d\udd04 Reset Slot</button>" +
            "<button class=\"dev-btn dev-btn--indigo\" data-dev=\"quest-complete\">\u26a1 Force Complete</button>" +
          "</div>" +
          "<div class=\"dev-grid\">" +
            "<button class=\"dev-btn dev-btn--brand\"  data-dev=\"quest-complete-claim\">\ud83c\udf89 Force Complete + Claim Reward</button>" +
          "</div>" +
          "<div class=\"dev-grid\">" +
            "<button class=\"dev-btn dev-btn--red\"    data-dev=\"quest-reset-all\">\u267b Reset ALL Quests (slot + all claim locks)</button>" +
          "</div>" +

          /* ── Streak ── */
          "<div class=\"dev-sec\">\ud83d\udd25 Streak</div>" +
          "<div class=\"dev-grid dev-grid--3\">" +
            "<button class=\"dev-btn dev-btn--orange\" data-dev=\"streak5\">\ud83d\udd25 5-Day</button>" +
            "<button class=\"dev-btn dev-btn--pulse\"  data-dev=\"streak-risk\">\u26a1 At-Risk</button>" +
            "<button class=\"dev-btn dev-btn--orange\" data-dev=\"streak14\">\ud83c\udfc6 14-Day</button>" +
          "</div>" +
          "<div class=\"dev-grid\">" +
            "<button class=\"dev-btn dev-btn--sky\" data-dev=\"streak-freeze-demo\">\ud83e\uddca Give 2 Freezes + Gap Day</button>" +
          "</div>" +

          /* ── XP & Levels ── */
          "<div class=\"dev-sec\">\u26a1 XP &amp; Level</div>" +
          "<div class=\"dev-grid dev-grid--2\">" +
            "<button class=\"dev-btn dev-btn--amber\" data-dev=\"xp-near-levelup\">\ud83d\udd3a Near Level-Up</button>" +
            "<button class=\"dev-btn dev-btn--slate\" data-dev=\"weekly-reset\">\ud83d\uddd3 Reset Weekly XP</button>" +
          "</div>" +
          "<div class=\"dev-row\">" +
            "<input id=\"devXpInput\" class=\"dev-input\" type=\"number\" min=\"0\" max=\"9999\" placeholder=\"Set XP (e.g. 350)\">" +
            "<button class=\"dev-btn dev-btn--amber\" data-dev=\"xp-set\" style=\"white-space:nowrap\">\u26a1 Set XP</button>" +
          "</div>" +

          /* ── Sentimos ── */
          "<div class=\"dev-sec\">\ud83d\udcb0 Sentimos Wallet</div>" +
          "<div class=\"dev-row\">" +
            "<input id=\"devSentimosInput\" class=\"dev-input\" type=\"number\" min=\"0\" placeholder=\"Amount (e.g. 500)\">" +
            "<button class=\"dev-btn dev-btn--teal\" data-dev=\"sentimos-set\" style=\"white-space:nowrap\">\u2714 Set \u20b5</button>" +
          "</div>" +

          /* ── Achievements ── */
          "<div class=\"dev-sec\">\ud83c\udfc5 Unlock Achievement</div>" +
          "<div class=\"dev-row\">" +
            "<select id=\"devAchievSelect\" class=\"dev-select\">" +
              "<option value=\"\">-- pick badge --</option>" +
              buildAchievOptions() +
            "</select>" +
            "<button class=\"dev-btn dev-btn--purple\" data-dev=\"achiev-trigger\" style=\"white-space:nowrap\">\ud83c\udfc5 Unlock</button>" +
          "</div>" +

          /* ── Leaderboard ── */
          "<div class=\"dev-sec\">\ud83c\udfc6 Leaderboard &amp; Friends</div>" +
          "<p class=\"dev-hint\" style=\"margin-bottom:.35rem\">Writes to Firestore. Persists across reloads.</p>" +
          "<div class=\"dev-grid\">" +
            "<button class=\"dev-btn dev-btn--brand\" data-dev=\"lb-seed\">\ud83c\udfc6 Full LB Seed (friends + XP + feed)</button>" +
          "</div>" +
          "<div class=\"dev-grid dev-grid--2\">" +
            "<button class=\"dev-btn dev-btn--blue\" data-dev=\"lb-populate\">\ud83d\udc65 Add 5 Friends</button>" +
            "<button class=\"dev-btn dev-btn--slate\" data-dev=\"lb-clear\">\ud83d\uddd1 Clear Friends</button>" +
          "</div>" +
          "<div class=\"dev-grid\">" +
            "<button class=\"dev-btn dev-btn--sky\" data-dev=\"lb-livefeed\">\ud83d\udd25 Populate Live Feed</button>" +
          "</div>" +

          /* ── Onboarding ── */
          "<div class=\"dev-sec\">\ud83c\udf31 Onboarding Card</div>" +
          "<div class=\"dev-grid dev-grid--2\">" +
            "<button class=\"dev-btn dev-btn--green\"  data-dev=\"onboard-reset\">\ud83c\udf31 Reset (both pending)</button>" +
            "<button class=\"dev-btn dev-btn--teal\"   data-dev=\"onboard-step1\">\u2714 Step 1 done</button>" +
            "<button class=\"dev-btn dev-btn--amber\"  data-dev=\"onboard-complete\">\u2714\u2714 Both done</button>" +
            "<button class=\"dev-btn dev-btn--slate\"  data-dev=\"onboard-dismiss\">\u2716 Dismiss</button>" +
          "</div>" +

          "<div class=\"dev-divider\"></div>" +

          /* ── Reset ── */
          "<button class=\"dev-btn--reset\" data-dev=\"reset\">" +
            "<span>\ud83d\udd04</span>" +
            "<span>Reset: Restore All Original Data</span>" +
          "</button>" +
          "<div id=\"devStatus\" class=\"dev-status\"></div>" +
        "</div>" + /* end body */
      "</div>"; /* end panel */

    document.body.appendChild(root);

    document.getElementById("devToggleBtn").addEventListener("click", function () {
      var panel = document.getElementById("devPanel");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    document.getElementById("devCloseBtn").addEventListener("click", function () {
      document.getElementById("devPanel").style.display = "none";
    });

    root.querySelectorAll("[data-dev]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var fn = SCENARIO_MAP[btn.getAttribute("data-dev")];
        if (fn) { fn(); }
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    if (!window.StorageAPI) { return; }
    injectStyles();
    buildPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
