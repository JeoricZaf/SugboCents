/**
 * SugboCents Dev Test Panel
 * Budget-math scenarios: health pill states are triggered by adjusting the
 * weeklyBudget relative to real spending (no fake expenses injected for health).
 * Streak scenarios still inject tagged dev expenses for date-based logic.
 * All injected expenses are tagged [DEV] so Reset can remove only those.
 *
 * Toggle with the 🔧 button at the bottom-left of the dashboard.
 */
(function () {
  "use strict";

  var DEV_TAG         = "[DEV]";
  var SNAP_KEY_BUDGET = "sugbocents.devtools.budget";
  var SNAP_KEY_GAM    = "sugbocents.devtools.gam";

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
    localStorage.setItem(SNAP_KEY_GAM, JSON.stringify({
      xp:          Number(xpInfo.xp    || 0),
      level:       Number(xpInfo.level || 1),
      streakCount: Number(streakData.count || 0)
    }));
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
      } catch (e) {}
      localStorage.removeItem(SNAP_KEY_GAM);
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
    }, 6000);
  }

  // ── Scenario: Reset ───────────────────────────────────────────────────────

  function scenarioReset() {
    clearDevExpenses();
    restoreSnapshot();
    window.__DEV_FORCE_AT_RISK = false;
    refresh();
    setStatus("Dev state cleared. Budget and XP restored.", "ok");
  }

  // ── Health scenarios: budget-math only, zero dev expenses ─────────────────
  //
  // We compute what weeklyBudget makes current totalSpentThisWeek land
  // in the target band — no fake data injected, XP unchanged.

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

    // avgActual = spent/elapsed, avgTarget = budget/7
    // We want avgActual / avgTarget = targetRatio
    // so budget = spent * 7 / (elapsed * targetRatio)
    var budget = Math.ceil(spent * 7 / (elapsed * targetRatio));

    // Guard: for ahead/on-track/warn the budget must still be > spent (not "over")
    if (pillClass !== "over" && budget <= spent) {
      budget = Math.floor(spent * 1.05) + 1;
    }
    // Guard: for "over" budget must be < spent
    if (pillClass === "over" && budget >= spent) {
      budget = Math.max(1, Math.floor(spent * 0.85));
    }

    window.StorageAPI.saveWeeklyBudget(budget);
    window.__DEV_FORCE_AT_RISK = false;
    refresh();
    setStatus(label + " " + phpFmt(spent) + " spent vs " + phpFmt(budget) + " budget.", "ok");
  }

  function scenarioAhead() {
    healthScenario(0.55, 80, "📈 Ahead:", "ahead");
  }

  function scenarioOnTrack() {
    healthScenario(0.95, 80, "\u2713 On track:", "ontrack");
  }

  function scenarioWarn() {
    healthScenario(1.18, 80, "\u26a0\ufe0f Watch out:", "warn");
  }

  function scenarioOver() {
    healthScenario(1.30, 100, "\ud83d\udd34 Over budget:", "over");
  }

  // ── Streak scenarios: inject tagged dev expenses ───────────────────────────

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

  // ── Scenario map ──────────────────────────────────────────────────────────

  var SCENARIO_MAP = {
    "ahead":       scenarioAhead,
    "ontrack":     scenarioOnTrack,
    "warn":        scenarioWarn,
    "over":        scenarioOver,
    "streak5":     scenarioStreak5,
    "streak-risk": scenarioAtRisk,
    "streak14":    scenarioStreak14,
    "reset":       scenarioReset
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("devToolsStyle")) { return; }
    var s = document.createElement("style");
    s.id = "devToolsStyle";
    s.textContent = [
      ".dev-toggle-btn{position:fixed;bottom:5.2rem;left:1rem;z-index:9999;",
      "background:#111827;color:#f9fafb;border:none;border-radius:999px;",
      "padding:0.45rem 0.85rem;font-size:0.88rem;cursor:pointer;",
      "box-shadow:0 2px 10px rgba(0,0,0,.45);opacity:.82;",
      "transition:opacity 150ms,transform 120ms;font-weight:600;}",
      ".dev-toggle-btn:hover{opacity:1;transform:scale(1.04);}",
      "#devPanel{position:fixed;bottom:8.8rem;left:1rem;z-index:9999;",
      "width:17rem;background:#111827;color:#e5e7eb;border-radius:.75rem;",
      "box-shadow:0 10px 30px rgba(0,0,0,.55);padding:.9rem;",
      "font-family:system-ui,sans-serif;font-size:.75rem;}",
      ".dev-panel-hdr{display:flex;justify-content:space-between;align-items:center;",
      "margin-bottom:.4rem;}",
      ".dev-panel-title{font-weight:700;font-size:.8rem;color:#f3f4f6;}",
      ".dev-close-btn{background:none;border:none;color:#6b7280;",
      "font-size:1.15rem;cursor:pointer;padding:0;line-height:1;}",
      ".dev-close-btn:hover{color:#f9fafb;}",
      ".dev-hint{font-size:.67rem;color:#6b7280;margin-bottom:.7rem;line-height:1.45;}",
      ".dev-sec{font-size:.62rem;font-weight:700;letter-spacing:.07em;",
      "text-transform:uppercase;color:#4b5563;margin-bottom:.3rem;}",
      ".dev-grid{display:grid;gap:.28rem;margin-bottom:.65rem;}",
      ".dev-grid--2{grid-template-columns:1fr 1fr;}",
      ".dev-grid--3{grid-template-columns:1fr 1fr 1fr;}",
      ".dev-btn{border:none;border-radius:.38rem;padding:.42rem .4rem;",
      "font-size:.68rem;font-weight:600;cursor:pointer;text-align:left;",
      "transition:filter 100ms,transform 80ms;line-height:1.3;}",
      ".dev-btn:hover{filter:brightness(1.12);}",
      ".dev-btn:active{transform:scale(.96);}",
      ".dev-btn--green{background:#14532d;color:#bbf7d0;}",
      ".dev-btn--teal{background:#134e4a;color:#99f6e4;}",
      ".dev-btn--amber{background:#78350f;color:#fde68a;}",
      ".dev-btn--red{background:#7f1d1d;color:#fecaca;}",
      ".dev-btn--orange{background:#7c2d12;color:#fed7aa;}",
      ".dev-btn--pulse{background:#713f12;color:#fef3c7;}",
      ".dev-divider{height:1px;background:#1f2937;margin:.45rem 0;}",
      ".dev-btn--reset{width:100%;background:#374151;color:#d1d5db;",
      "border-radius:.38rem;padding:.42rem .55rem;border:none;",
      "font-size:.68rem;font-weight:700;cursor:pointer;text-align:left;",
      "transition:background 120ms,filter 100ms;}",
      ".dev-btn--reset:hover{background:#4b5563;}",
      ".dev-status{margin-top:.45rem;min-height:.9rem;font-size:.67rem;",
      "line-height:1.4;color:#6b7280;}",
      ".dev-status--ok{color:#86efac;}",
      ".dev-status--err{color:#fca5a5;}"
    ].join("");
    document.head.appendChild(s);
  }

  // ── Panel HTML ────────────────────────────────────────────────────────────

  function buildPanel() {
    if (document.getElementById("devToggleBtn")) { return; }

    var root = document.createElement("div");
    root.id = "devToolsRoot";
    root.innerHTML =
      "<button id=\"devToggleBtn\" class=\"dev-toggle-btn\" title=\"Dev Test Panel\">\ud83d\udd27 Dev</button>" +
      "<div id=\"devPanel\" style=\"display:none\">" +
        "<div class=\"dev-panel-hdr\">" +
          "<span class=\"dev-panel-title\">\ud83d\udd27 Dev Scenarios</span>" +
          "<button id=\"devCloseBtn\" class=\"dev-close-btn\" aria-label=\"Close\">&times;</button>" +
        "</div>" +
        "<p class=\"dev-hint\">Health states adjust your budget to match your real spending. Streak states inject tagged expenses. Reset restores everything.</p>" +

        "<div class=\"dev-sec\">Budget Health Pill</div>" +
        "<div class=\"dev-grid dev-grid--2\">" +
          "<button class=\"dev-btn dev-btn--green\"  data-dev=\"ahead\">\ud83d\udcc8 Ahead of Pace</button>" +
          "<button class=\"dev-btn dev-btn--teal\"   data-dev=\"ontrack\">\u2713 On Track</button>" +
          "<button class=\"dev-btn dev-btn--amber\"  data-dev=\"warn\">\u26a0\ufe0f Watch Out</button>" +
          "<button class=\"dev-btn dev-btn--red\"    data-dev=\"over\">\ud83d\udd34 Over Budget</button>" +
        "</div>" +

        "<div class=\"dev-sec\">Streak Badge</div>" +
        "<div class=\"dev-grid dev-grid--3\">" +
          "<button class=\"dev-btn dev-btn--orange\" data-dev=\"streak5\">\ud83d\udd25 5-Day</button>" +
          "<button class=\"dev-btn dev-btn--pulse\"  data-dev=\"streak-risk\">\u26a1 At-Risk</button>" +
          "<button class=\"dev-btn dev-btn--orange\" data-dev=\"streak14\">\ud83c\udfc6 14-Day</button>" +
        "</div>" +

        "<div class=\"dev-divider\"></div>" +
        "<button class=\"dev-btn--reset\" data-dev=\"reset\">\ud83d\udd04 Reset: Restore Original Data</button>" +
        "<div id=\"devStatus\" class=\"dev-status\"></div>" +
      "</div>";

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
    if (!document.getElementById("budgetCard") && !document.getElementById("quickAddGrid")) {
      return;
    }
    injectStyles();
    buildPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
