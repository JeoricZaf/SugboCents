(function () {
  function isLocalDevelopmentHost() {
    var host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function getPage() {
    return document.body.getAttribute("data-page") || "";
  }

  function hasStorageApi() {
    return Boolean(window.StorageAPI);
  }

  // ── Resource Bar ─────────────────────────────────────────

  function renderResourceBar() {
    var bar = document.getElementById("resourceBar");
    if (!bar || !window.StorageAPI) { return; }

    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var xpInfo = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { level: 1 };
    var sentimosBalance = window.StorageAPI.getSentimosBalance ? window.StorageAPI.getSentimosBalance() : 0;

    // At-risk logic: streak > 0, after 17:00, no log today
    var atRisk = false;
    if (streak > 0) {
      var nowHour = new Date().getHours();
      if (nowHour >= 17 && window.StorageAPI.getExpenses) {
        var expenses = window.StorageAPI.getExpenses();
        var todayKey = (function () {
          var d = new Date();
          return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        }());
        var loggedToday = expenses.some(function (e) {
          if (!e.timestamp) { return false; }
          var ed = new Date(e.timestamp);
          return ed.getFullYear() + "-" + String(ed.getMonth() + 1).padStart(2, "0") + "-" + String(ed.getDate()).padStart(2, "0") === todayKey;
        });
        if (!loggedToday) { atRisk = true; }
      }
    }

    var streakAtRiskClass = atRisk ? " rb-chip--at-risk" : "";

    bar.innerHTML =
      "<button class=\"rb-chip rb-chip--streak" + streakAtRiskClass + "\" id=\"streakChip\" aria-label=\"Streak: " + streak + " days\" type=\"button\">" +
        "<span class=\"rb-chip__label\">STREAK</span>" +
        "<span class=\"rb-chip__value\">\uD83D\uDD25 " + streak + "</span>" +
        "<span class=\"rb-chip__sublabel\">" + (atRisk ? "Log before midnight" : (streak === 0 ? "Start logging" : "days alive")) + "</span>" +
      "</button>" +
      "<button class=\"rb-chip rb-chip--sentimos\" id=\"sentimosChip\" aria-label=\"Sentimos balance: " + sentimosBalance + "\" type=\"button\">" +
        "<span class=\"rb-chip__label\">SENTIMOS</span>" +
        "<span class=\"rb-chip__value\">\u20B5 " + sentimosBalance + "</span>" +
        "<span class=\"rb-chip__sublabel\">shop balance</span>" +
      "</button>" +
      "<button class=\"rb-chip rb-chip--level\" id=\"xpChip\" aria-label=\"Level " + xpInfo.level + "\" type=\"button\">" +
        "<span class=\"rb-chip__label\">LEVEL</span>" +
        "<span class=\"rb-chip__value\">Lv. " + xpInfo.level + "</span>" +
        "<span class=\"rb-chip__sublabel\">" + (xpInfo.levelName || "Budget Keeper") + "</span>" +
      "</button>";

    // Wire chip taps
    var sChip = document.getElementById("streakChip");
    var xChip = document.getElementById("xpChip");
    var senChip = document.getElementById("sentimosChip");
    if (sChip)   { sChip.addEventListener("click", openStreakSheet); }
    if (xChip)   { xChip.addEventListener("click", openXpSheet); }
    if (senChip) { senChip.addEventListener("click", openSentimosSheet); }
  }

  function openSentimosSheet() {
    var sheetId = "sentimosSheet";
    var balance = window.StorageAPI && window.StorageAPI.getSentimosBalance ? window.StorageAPI.getSentimosBalance() : 0;
    var log = window.StorageAPI && window.StorageAPI.getSentimosLog ? window.StorageAPI.getSentimosLog() : [];

    var logHtml = "";
    if (log.length === 0) {
      logHtml = "<p class=\"text-xs text-slate-400 text-center py-3\">No transactions yet. Log expenses to earn \u20B5!</p>";
    } else {
      logHtml = log.map(function (entry) {
        var sign = entry.type === "spend" ? "\u2212" : "+";
        var cls  = entry.type === "spend" ? "sentimos-log-spend" : "sentimos-log-earn";
        var label = (entry.source || "").replace(/-/g, " ");
        var date  = entry.date ? new Date(entry.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "";
        return '<div class="sentimos-log-row">' +
          '<span class="sentimos-log-source">' + label + (date ? " \u00b7 " + date : "") + '</span>' +
          '<span class="' + cls + '">' + sign + entry.amount + ' \u20B5</span>' +
          '</div>';
      }).join("");
    }

    var freezeCount = window.StorageAPI && window.StorageAPI.getStreakFreezeCount ? window.StorageAPI.getStreakFreezeCount() : 0;

    if (!document.getElementById(sheetId)) {
      var sheet = document.createElement("div");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Sentimos balance");
      document.body.appendChild(sheet);
    }
    var sheet = document.getElementById(sheetId);
    sheet.innerHTML =
      "<div class=\"sheet-handle\"></div>" +
      "<div class=\"sheet-header\"><h2 class=\"sheet-title\">\u20B5 Sentimos</h2>" +
      "<button type=\"button\" class=\"sheet-close-btn\" aria-label=\"Close\">&times;</button></div>" +
      "<div class=\"sheet-body\">" +
        "<div class=\"sentimos-sheet-hero\">" +
          "<div class=\"sentimos-sheet-balance\">" + balance + " \u20B5</div>" +
          "<div class=\"sentimos-sheet-label\">Your Sentimos balance</div>" +
          (freezeCount > 0 ? "<div class=\"mt-2 text-xs text-teal-600 font-semibold\">\u2744\ufe0f " + freezeCount + " streak freeze" + (freezeCount > 1 ? "s" : "") + " equipped</div>" : "") +
        "</div>" +
        "<div class=\"px-1\">" +
          "<h3 class=\"text-xs font-bold text-slate-400 uppercase tracking-wider mb-2\">Recent Activity</h3>" +
          logHtml +
        "</div>" +
        "<a href=\"shop.html\" class=\"shop-cta shop-cta--full mt-4\" style=\"text-decoration:none;\">" +
          "<i class=\"bi bi-shop\" aria-hidden=\"true\"></i> Visit Shop" +
        "</a>" +
      "</div>";
    sheet.querySelector(".sheet-close-btn").addEventListener("click", closeAllSheets);
    openSheet(sheetId);
  }

  function injectResourceBar() {
    var needsAuth = document.body.getAttribute("data-protected") === "true";
    if (!needsAuth) { return; }
    if (document.getElementById("resourceBar")) { return; }

    var bar = document.createElement("div");
    bar.id = "resourceBar";
    bar.className = "resource-bar";
    bar.setAttribute("aria-label", "Your stats");

    // Insert at top of app-main > main, or at top of body
    var main = document.querySelector(".app-main main") || document.querySelector("main") || document.body;
    main.insertBefore(bar, main.firstChild);
  }

  // ── Bottom Sheets ─────────────────────────────────────────

  function ensureSheetOverlay() {
    if (document.getElementById("sheetOverlay")) { return; }
    var overlay = document.createElement("div");
    overlay.id = "sheetOverlay";
    overlay.className = "sheet-overlay";
    overlay.addEventListener("click", closeAllSheets);
    document.body.appendChild(overlay);
  }

  function closeAllSheets() {
    document.querySelectorAll(".bottom-sheet.is-open").forEach(function (s) {
      s.classList.remove("is-open");
    });
    var overlay = document.getElementById("sheetOverlay");
    if (overlay) { overlay.classList.remove("is-visible"); }
  }

  function openSheet(id) {
    ensureSheetOverlay();
    closeAllSheets();
    var sheet = document.getElementById(id);
    if (sheet) {
      sheet.classList.add("is-open");
      var overlay = document.getElementById("sheetOverlay");
      if (overlay) { overlay.classList.add("is-visible"); }
    }
  }

  function buildStreakSheetContent() {
    if (!window.StorageAPI) { return "<p>No data.</p>"; }
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];

    // Build 7-dot week row
    var now = new Date();
    var dayOfWeek = now.getDay();
    var monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    var days = ["M", "T", "W", "T", "F", "S", "S"];
    var dots = "";
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + i);
      var dk = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      var logged = expenses.some(function (e) {
        if (!e.timestamp) { return false; }
        var ed = new Date(e.timestamp);
        return ed.getFullYear() + "-" + String(ed.getMonth() + 1).padStart(2, "0") + "-" + String(ed.getDate()).padStart(2, "0") === dk;
      });
      var isToday = i === ((dayOfWeek + 6) % 7);
      var dotClass = logged ? "week-dot week-dot--logged" : (isToday ? "week-dot week-dot--today" : "week-dot");
      dots += "<div class=\"week-dot-col\"><div class=\"" + dotClass + "\"></div><span>" + days[i] + "</span></div>";
    }

    var nextMilestone = streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : streak < 30 ? 30 : streak < 100 ? 100 : null;
    var milestoneBar = nextMilestone ? ("<div class=\"sheet-milestone-row\"><span class=\"sheet-milestone-label\">Next milestone: " + nextMilestone + " days</span><div class=\"sheet-milestone-track\"><div class=\"sheet-milestone-fill\" style=\"width:" + Math.round((streak / nextMilestone) * 100) + "%\"></div></div></div>") : "<p class=\"sheet-milestone-label\">You've hit all milestones! Incredible!</p>";

    return "<div class=\"sheet-streak-hero\">" +
      "<span class=\"sheet-streak-flame\">\uD83D\uDD25</span>" +
      "<span class=\"sheet-streak-count\">" + streak + "</span>" +
      "<span class=\"sheet-streak-label\">" + (streak === 1 ? "day streak" : "day streak") + "</span>" +
    "</div>" +
    "<div class=\"week-dot-row\">" + dots + "</div>" +
    milestoneBar;
  }

  function buildXpSheetContent() {
    if (!window.StorageAPI) { return "<p>No data.</p>"; }
    var xpInfo = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { xp: 0, level: 1, levelName: "Rookie Saver", progressPct: 0, xpForNext: 50 };
    var toNext = xpInfo.xpForNext ? (xpInfo.xpForNext - xpInfo.xp) + " XP to next level" : "Max level reached!";

    return "<div class=\"sheet-xp-hero\">" +
      "<span class=\"sheet-xp-level\">\u26A1 Lv.\u202F" + xpInfo.level + "</span>" +
      "<span class=\"sheet-xp-name\">" + (xpInfo.levelName || "Rookie Saver") + "</span>" +
    "</div>" +
    "<div class=\"sheet-xp-bar-wrap\">" +
      "<div class=\"sheet-xp-bar-track\"><div class=\"sheet-xp-bar-fill\" style=\"width:" + (xpInfo.progressPct || 0) + "%\"></div></div>" +
      "<div class=\"sheet-xp-labels\"><span>" + xpInfo.xp + " XP</span><span>" + toNext + "</span></div>" +
    "</div>";
  }

  function openStreakSheet() {
    var sheetId = "streakDetailSheet";
    if (!document.getElementById(sheetId)) {
      var sheet = document.createElement("div");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Streak details");
      sheet.innerHTML =
        "<div class=\"sheet-handle\"></div>" +
        "<div class=\"sheet-header\"><h2 class=\"sheet-title\">\uD83D\uDD25 Your Streak</h2>" +
        "<button type=\"button\" class=\"sheet-close-btn\" aria-label=\"Close\">&times;</button></div>" +
        "<div id=\"streakSheetBody\" class=\"sheet-body\"></div>";
      document.body.appendChild(sheet);
      sheet.querySelector(".sheet-close-btn").addEventListener("click", closeAllSheets);
    }
    var body = document.getElementById("streakSheetBody");
    if (body) { body.innerHTML = buildStreakSheetContent(); }
    openSheet(sheetId);
  }

  function openXpSheet() {
    var sheetId = "xpProgressSheet";
    if (!document.getElementById(sheetId)) {
      var sheet = document.createElement("div");
      sheet.id = sheetId;
      sheet.className = "bottom-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "XP Progress");
      sheet.innerHTML =
        "<div class=\"sheet-handle\"></div>" +
        "<div class=\"sheet-header\"><h2 class=\"sheet-title\">\u26A1 XP Progress</h2>" +
        "<button type=\"button\" class=\"sheet-close-btn\" aria-label=\"Close\">&times;</button></div>" +
        "<div id=\"xpSheetBody\" class=\"sheet-body\"></div>";
      document.body.appendChild(sheet);
      sheet.querySelector(".sheet-close-btn").addEventListener("click", closeAllSheets);
    }
    var body = document.getElementById("xpSheetBody");
    if (body) { body.innerHTML = buildXpSheetContent(); }
    openSheet(sheetId);
  }

  // Expose globally so dashboard.js can call them
  window.AppShell = {
    openStreakSheet: openStreakSheet,
    openXpSheet: openXpSheet,
    openSentimosSheet: openSentimosSheet,
    closeAllSheets: closeAllSheets,
    openSheet: openSheet,
    renderResourceBar: renderResourceBar
  };

  async function protectRoutes() {
    if (!hasStorageApi()) {
      return;
    }

    if (typeof window.StorageAPI.resolveAuthState === "function") {
      await window.StorageAPI.resolveAuthState();
    }

    var page = getPage();
    var needsAuth = document.body.getAttribute("data-protected") === "true";
    var guestOnly = document.body.getAttribute("data-guest-only") === "true";
    var session = window.StorageAPI.getSession();

    if (needsAuth && !session) {
      window.location.replace("login.html");
      return;
    }

    if (guestOnly && session) {
      window.location.replace("dashboard.html");
      return;
    }

    // Populate sidebar user widget on all protected pages
    var user = window.StorageAPI.getCurrentUser();
    if (user) {
      var sidebarName = document.getElementById("sidebarName");
      var sidebarAvatar = document.getElementById("sidebarAvatar");
      if (sidebarName) {
        sidebarName.textContent = user.firstName ? user.firstName + (user.lastName ? " " + user.lastName : "") : user.email;
      }
      if (sidebarAvatar) {
        var initials = user.firstName ? user.firstName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "U");
        if (user.lastName) {
          initials += user.lastName.charAt(0).toUpperCase();
        }
        sidebarAvatar.textContent = initials;
      }
      document.body.classList.add("sidebar-ready");
    } else {
      document.body.classList.remove("sidebar-ready");
    }
  }

  function activateBottomNav() {
    var page = getPage();
    var links = document.querySelectorAll("[data-nav]");
    links.forEach(function (link) {
      if (link.getAttribute("data-nav") === page) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (isLocalDevelopmentHost()) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) {
          registration.unregister();
        });
      }).catch(function () {
        // Ignore unregister errors in local development.
      });
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        // Ignore registration errors on unsupported contexts (e.g., file://).
      });
    });
  }

  function initSidebarToggle() {
    var toggleBtn = document.getElementById("sidebarToggle");
    if (!toggleBtn) {
      return;
    }

    // State is already applied by the inline <script> in <head> (no DOMContentLoaded needed).
    // Just wire the click handler to toggle the class on <html>.
    toggleBtn.addEventListener("click", function () {
      var isCollapsed = document.documentElement.classList.toggle("sidebar-collapsed");
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "true" : "false");
    });
  }

  function initSidebarTooltip() {
    // Only relevant on desktop where the sidebar exists.
    if (window.innerWidth < 1024) { return; }

    // Single tooltip div appended to <body> — escapes sidebar overflow:hidden entirely.
    var tip = document.createElement("div");
    tip.className = "sidebar-tooltip";
    document.body.appendChild(tip);

    function showTip(text, rect) {
      tip.textContent = text;
      tip.style.top = (rect.top + rect.height / 2) + "px";
      tip.style.left = (rect.right + 10) + "px";
      tip.classList.add("is-visible");
    }

    function hideTip() {
      tip.classList.remove("is-visible");
    }

    // Nav links — only show tooltip when sidebar is collapsed.
    var navLinks = document.querySelectorAll(".sidebar-nav-link[data-tooltip]");
    navLinks.forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        if (!document.documentElement.classList.contains("sidebar-collapsed")) { return; }
        showTip(link.dataset.tooltip, link.getBoundingClientRect());
      });
      link.addEventListener("mouseleave", hideTip);
    });

    // User row tooltip — only when collapsed.
    var userRow = document.querySelector(".sidebar-user");
    if (userRow) {
      userRow.addEventListener("mouseenter", function () {
        if (!document.documentElement.classList.contains("sidebar-collapsed")) { return; }
        showTip("Account settings", userRow.getBoundingClientRect());
      });
      userRow.addEventListener("mouseleave", hideTip);
    }

    // Toggle button — always show (collapsed or expanded).
    var toggleBtn = document.getElementById("sidebarToggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("mouseenter", function () {
        var isCollapsed = document.documentElement.classList.contains("sidebar-collapsed");
        showTip(isCollapsed ? "Open sidebar" : "Close sidebar", toggleBtn.getBoundingClientRect());
      });
      toggleBtn.addEventListener("mouseleave", hideTip);
    }
  }


  document.addEventListener("DOMContentLoaded", async function () {
    await protectRoutes();
    activateBottomNav();
    injectResourceBar();
    renderResourceBar();
    initSidebarToggle();
    initSidebarTooltip();
    registerServiceWorker();

    // Re-render resource bar on any data change
    window.addEventListener("sugbocents:dataChanged", function () {
      renderResourceBar();
    });
  });
})();

