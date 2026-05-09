(function () {
  if (document.body.dataset.page !== "profile") { return; }

  var RARITY_COLORS = {
    bronze:  "#C2773A",
    silver:  "#6B7280",
    gold:    "#CA8A04",
    emerald: "#1f6b46",
    diamond: "#0891B2"
  };

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtJoinedDate(iso) {
    if (!iso) { return "Joined recently"; }
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return "Joined recently"; }
    return "Joined " + d.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  }

  // ── Resolve active-tier badges (same logic as stats.js) ───────
  function resolveActiveTierBadges(allBadges) {
    var seriesMap = {};
    var standalone = [];
    allBadges.forEach(function (b) {
      if (b.series) {
        if (!seriesMap[b.series]) { seriesMap[b.series] = []; }
        seriesMap[b.series].push(b);
      } else {
        standalone.push(b);
      }
    });

    var result = [];
    standalone.forEach(function (b) { result.push(b); });
    Object.keys(seriesMap).forEach(function (key) {
      var tiers = seriesMap[key].slice().sort(function (a, b) { return (a.tier || 0) - (b.tier || 0); });
      var active = null;
      for (var i = 0; i < tiers.length; i++) {
        if (tiers[i].unlockable && !tiers[i].claimed) { active = tiers[i]; break; }
      }
      if (!active) {
        for (var j = tiers.length - 1; j >= 0; j--) {
          if (tiers[j].claimed) { active = tiers[j]; break; }
        }
      }
      if (!active) { active = tiers[0]; }
      result.push(active);
    });
    return result;
  }

  // ── Render badge shelf (tile cards) ──────────────────────────
  function renderAchievementPreview(allBadges) {
    var el = document.getElementById("achievementPreview");
    if (!el) { return; }

    var display = resolveActiveTierBadges(allBadges);

    display.sort(function (a, b) {
      function score(x) {
        if (x.claimed) { return 1; }
        if (x.unlockable && !x.claimed) { return 2; }
        if (x.target > 0 && x.progress / x.target >= 0.3) { return 3; }
        return 4;
      }
      return score(a) - score(b);
    });

    var preview = display.slice(0, 6);

    if (preview.length === 0) {
      el.innerHTML = '<p class="text-sm font-semibold py-2" style="color:#617063">No achievements yet \u2014 start logging expenses!</p>';
      return;
    }

    el.innerHTML = preview.map(function (b) {
      var bg  = RARITY_COLORS[b.rarity] || RARITY_COLORS.bronze;
      var pct = (b.target > 0) ? Math.min(100, Math.round((b.progress / b.target) * 100)) : (b.claimed ? 100 : 0);
      var iconHtml = b.icon
        ? (b.icon.startsWith("bi-")
            ? '<i class="bi ' + escapeHtml(b.icon) + '" aria-hidden="true" style="font-size:1.5rem;color:white"></i>'
            : '<span style="font-size:1.5rem" aria-hidden="true">' + escapeHtml(b.icon) + '</span>')
        : '<span style="font-size:1.5rem" aria-hidden="true">\uD83C\uDFC5</span>';

      return '<div class="relative flex shrink-0 flex-col items-center gap-2 rounded-[1.7rem] p-3 text-center" ' +
        'style="min-height:7rem;min-width:7rem;background:#f8f5eb;outline:1px solid #ded7c6">' +
        '<div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"' +
          ' style="background:' + bg + ';box-shadow:0 4px 12px rgba(0,0,0,0.12)">' +
          iconHtml +
        '</div>' +
        '<p class="text-xs font-extrabold leading-tight" style="color:#102b1d;max-width:5.5rem">' + escapeHtml(b.name) + '</p>' +
        (pct > 0 && pct < 100
          ? '<div class="absolute bottom-2 left-3 right-3 h-1.5 rounded-full" style="background:#ded7c6">' +
              '<div class="h-full rounded-full" style="width:' + pct + '%;background:' + bg + '"></div>' +
            '</div>'
          : '') +
        (b.claimed ? '<div class="absolute right-2 top-2 h-5 w-5 rounded-full grid place-items-center text-white text-xs font-black" style="background:#164f33">\u2713</div>' : '') +
      '</div>';
    }).join("");
  }

  // ── Render weekly activity mini-map ───────────────────────────
  function renderProfileWeekMap() {
    var gridEl = document.getElementById("profileWeekMapGrid");
    var msgEl  = document.getElementById("profileWeekMapMsg");
    if (!gridEl) { return; }

    var expenses = window.StorageAPI.getExpenses ? window.StorageAPI.getExpenses() : [];

    // Build a set of date strings that have expenses
    var expenseDays = {};
    (expenses || []).forEach(function (e) {
      if (!e.timestamp) { return; }
      var d = new Date(e.timestamp);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      expenseDays[key] = true;
    });

    // Get this week's Mon-Sun
    var now   = new Date();
    var dow   = now.getDay(); // 0=Sun
    var daysSinceMon = (dow === 0) ? 6 : dow - 1;
    var monday = new Date(now);
    monday.setDate(now.getDate() - daysSinceMon);
    monday.setHours(0, 0, 0, 0);

    var todayKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    var DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
    var html = "";

    for (var i = 0; i < 7; i++) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + i);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      var isToday   = key === todayKey;
      var isFuture  = d > now && !isToday;
      var hasExpense = !!expenseDays[key];

      var dotStyle, dotContent;
      if (hasExpense) {
        dotStyle = "background:#164f33;box-shadow:0 2px 8px rgba(22,79,51,0.3)";
        dotContent = '<span style="font-size:0.75rem;color:white;font-weight:900">\u2713</span>';
      } else if (isToday) {
        dotStyle = "background:#F97316;box-shadow:0 2px 8px rgba(249,115,22,0.4)";
        dotContent = '<span style="font-size:0.75rem;color:white;font-weight:900">\u2022</span>';
      } else if (isFuture) {
        dotStyle = "background:#f4f0e5;outline:1.5px dashed #d8d1bd";
        dotContent = "";
      } else {
        dotStyle = "background:#e7e0cf";
        dotContent = "";
      }

      html += '<div class="flex flex-col items-center gap-1.5">' +
        '<div class="grid h-9 w-9 place-items-center rounded-full" style="' + dotStyle + '">' + dotContent + '</div>' +
        '<span class="text-xs font-extrabold uppercase" style="color:#' + (isToday ? "F97316" : "8b9490") + '">' + DAY_LABELS[i] + '</span>' +
      '</div>';
    }

    gridEl.innerHTML = html;

    // Message
    if (msgEl) {
      var daysLogged = Object.keys(expenseDays).filter(function (k) {
        var d2 = new Date(k);
        var mon2 = new Date(monday);
        mon2.setDate(monday.getDate() + 6);
        return d2 >= monday && d2 <= mon2;
      }).length;

      if (daysLogged === 0) {
        msgEl.textContent = "No expenses logged this week yet. Start tracking!";
      } else if (daysLogged < 4) {
        msgEl.textContent = "You\u2019ve logged " + daysLogged + " day" + (daysLogged > 1 ? "s" : "") + " this week. Keep it up!";
      } else if (daysLogged < 7) {
        msgEl.textContent = daysLogged + " days logged \u2014 almost a perfect week!";
      } else {
        msgEl.textContent = "\uD83C\uDF1F Perfect week! You logged expenses every day.";
      }
    }
  }

  // ── Render personal records ───────────────────────────────────
  function renderPersonalRecords() {
    var records = window.StorageAPI.getRecords ? window.StorageAPI.getRecords() : null;
    if (!records) { return; }

    var streakVal  = document.getElementById("profileLongestStreakVal");
    var streakDate = document.getElementById("profileLongestStreakDate");
    var xpVal      = document.getElementById("profileBestWeekXpVal");
    var xpDate     = document.getElementById("profileBestWeekXpDate");
    var savedVal   = document.getElementById("profileBestMonthSavedVal");
    var savedDate  = document.getElementById("profileBestMonthSavedDate");

    if (streakVal) {
      streakVal.textContent = (records.longestStreak.value || 0) + " days";
    }
    if (streakDate && records.longestStreak.date) {
      streakDate.textContent = "Achieved " + formatRecordDate(records.longestStreak.date);
    } else if (streakDate) {
      streakDate.textContent = "\u2014";
    }

    if (xpVal) {
      xpVal.textContent = (records.bestWeekXp.value || 0) + " XP";
    }
    if (xpDate && records.bestWeekXp.weekStart) {
      xpDate.textContent = "Week of " + formatRecordDate(records.bestWeekXp.weekStart);
    } else if (xpDate) {
      xpDate.textContent = "\u2014";
    }

    if (savedVal) {
      var saved = records.bestMonthSaved ? (records.bestMonthSaved.value || 0) : 0;
      savedVal.textContent = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(saved);
    }
    if (savedDate && records.bestMonthSaved && records.bestMonthSaved.month) {
      savedDate.textContent = formatRecordMonth(records.bestMonthSaved.month);
    } else if (savedDate) {
      savedDate.textContent = "\u2014";
    }
  }

  function formatRecordDate(isoOrKey) {
    if (!isoOrKey) { return ""; }
    var d = new Date(isoOrKey.length === 10 ? isoOrKey + "T12:00:00" : isoOrKey);
    if (isNaN(d.getTime())) { return isoOrKey; }
    return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  }

  function formatRecordMonth(key) {
    if (!key) { return ""; }
    var d = new Date(key.length === 7 ? key + "-01T12:00:00" : key);
    if (isNaN(d.getTime())) { return key; }
    return d.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  }

  // ── Main render ───────────────────────────────────────────────
  function render() {
    if (!window.StorageAPI) { return; }

    var user     = window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    if (!user) { return; }

    var info     = window.StorageAPI.getXpInfo     ? window.StorageAPI.getXpInfo()     : { level: 1, levelName: "Rookie Saver", xp: 0 };
    var streak   = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var sentimos = window.StorageAPI.getSentimosBalance ? window.StorageAPI.getSentimosBalance() : 0;
    var badges   = window.StorageAPI.getAchievements ? window.StorageAPI.getAchievements() : [];
    var claimed  = badges.filter(function (b) { return b.claimed; }).length;

    // Header
    var initial  = ((user.firstName || "U").charAt(0)).toUpperCase();
    var fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "SugboCents User";

    var initEl  = document.getElementById("profileInitial");
    var lvBadge = document.getElementById("profileLevelBadge");
    var nameEl  = document.getElementById("profileName");
    var lvName  = document.getElementById("profileLevelName");
    var joinedEl = document.getElementById("profileJoined");
    var senEl   = document.getElementById("profileSentimos");

    if (initEl)   { initEl.textContent   = initial; }
    if (lvBadge)  { lvBadge.textContent  = "Lv " + info.level; }
    if (nameEl)   { nameEl.textContent   = fullName; }
    if (lvName)   { lvName.textContent   = info.levelName; }
    if (joinedEl) { joinedEl.textContent = fmtJoinedDate(user.createdAt); }
    if (senEl)    { senEl.textContent    = sentimos + " \u20B5"; }

    // Statistics
    var statStreak = document.getElementById("statStreak");
    var statXp     = document.getElementById("statXp");
    var statLevel  = document.getElementById("statLevel");
    var statBadges = document.getElementById("statBadges");

    if (statStreak) { statStreak.textContent = streak; }
    if (statXp)     { statXp.textContent     = info.xp; }
    if (statLevel)  { statLevel.textContent  = info.level; }
    if (statBadges) { statBadges.textContent = claimed; }

    // Achievement preview (badge shelf)
    renderAchievementPreview(badges);

    // New sections
    renderProfileWeekMap();
    renderPersonalRecords();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var params = new URLSearchParams(window.location.search);
    var viewUid = params.get("uid");
    var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
    var myUid   = session && session.userId ? session.userId : null;

    // If viewing another user's public profile
    if (viewUid && viewUid !== myUid) {
      loadPublicProfile(viewUid);
      return;
    }

    // Own profile
    render();
    loadFriendsUI();
    window.addEventListener("sugbocents:dataChanged", function () { render(); });
    window.addEventListener("sugbocents:synced",      function () { render(); });
  });

  // ── Friends UI (own profile) ──────────────────────────────────

  function loadFriendsUI() {
    var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
    var myUid   = session && session.userId ? session.userId : null;
    if (!myUid) { return; }

    // Show friend code
    var codeEl = document.getElementById("friendCodeValue");
    if (codeEl) { codeEl.textContent = myUid; }

    // Copy button
    var copyBtn = document.getElementById("friendCodeCopy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(myUid).then(function () {
            copyBtn.textContent = "\u2713 Copied!";
            setTimeout(function () { copyBtn.textContent = "\uD83D\uDCCB Copy"; }, 2000);
          });
        } else {
          // Fallback
          var ta = document.createElement("textarea");
          ta.value = myUid;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          copyBtn.textContent = "\u2713 Copied!";
          setTimeout(function () { copyBtn.textContent = "\uD83D\uDCCB Copy"; }, 2000);
        }
      });
    }

    // Add friend form
    var addForm = document.getElementById("friendAddForm");
    if (addForm) {
      addForm.addEventListener("submit", function (e) {
        e.preventDefault();
        handleSendRequest(myUid);
      });
    }

    // Load friends and requests if Firebase is available
    if (!window.FirestoreService) { return; }
    loadFriendRequests(myUid);
    loadFriendsList(myUid);
  }

  function setAddStatus(msg, type) {
    var el = document.getElementById("friendAddStatus");
    if (!el) { return; }
    el.textContent = msg;
    el.className = "friend-add-status" + (type === "ok" ? " friend-add-status--ok" : type === "error" ? " friend-add-status--error" : "");
  }

  async function handleSendRequest(myUid) {
    var input = document.getElementById("friendAddInput");
    if (!input) { return; }
    var targetUid = (input.value || "").trim();
    if (!targetUid) { setAddStatus("Please enter a friend code.", "error"); return; }
    if (targetUid === myUid) { setAddStatus("That\u2019s your own code!", "error"); return; }
    if (!window.FirestoreService) { setAddStatus("Firebase not available.", "error"); return; }

    setAddStatus("Sending\u2026", "");
    try {
      var status = await window.FirestoreService.getFriendStatus(myUid, targetUid);
      if (status === "friend")          { setAddStatus("You\u2019re already friends!", "ok"); return; }
      if (status === "pending_sent")    { setAddStatus("Request already sent.", "");   return; }
      if (status === "pending_received") {
        // Auto-accept
        var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
        var user    = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
        var myName  = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "Friend";
        var profile = await window.FirestoreService.getPublicProfile(targetUid);
        var theirName = (profile && profile.displayName) || "Friend";
        await window.FirestoreService.acceptFriendRequest(myUid, targetUid, theirName, myName);
        setAddStatus("\uD83C\uDF89 You\u2019re now friends!", "ok");
        input.value = "";
        loadFriendRequests(myUid);
        loadFriendsList(myUid);
        return;
      }
      // Get my display name
      var user2   = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      var myName2 = user2 ? [user2.firstName, user2.lastName].filter(Boolean).join(" ") : "Friend";
      await window.FirestoreService.sendFriendRequest(myUid, targetUid, myName2);
      setAddStatus("Request sent \uD83D\uDC4B", "ok");
      input.value = "";
    } catch (err) {
      setAddStatus("Couldn\u2019t send request. Check the code and try again.", "error");
    }
  }

  async function loadFriendRequests(myUid) {
    if (!window.FirestoreService) { return; }
    var el = document.getElementById("friendRequestsList");
    var wrap = document.getElementById("friendRequestsWrap");
    if (!el) { return; }

    var requests = await window.FirestoreService.getFriendRequests(myUid);
    if (!requests || requests.length === 0) {
      if (wrap) { wrap.style.display = "none"; }
      return;
    }
    if (wrap) { wrap.style.display = ""; }

    var user    = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    var myName  = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "Friend";

    el.innerHTML = requests.map(function (r) {
      var name    = r.displayName || r.requesterId || "Someone";
      var initial = (name).charAt(0).toUpperCase();
      return (
        '<div class="friend-request-card" data-uid="' + escapeHtml(r.requesterId) + '">' +
          '<div class="friend-request-avatar">' + escapeHtml(initial) + '</div>' +
          '<div class="friend-request-body">' +
            '<div class="friend-request-name">' + escapeHtml(name) + '</div>' +
            '<div class="friend-request-uid">' + escapeHtml(r.requesterId || "") + '</div>' +
          '</div>' +
          '<div class="friend-request-actions">' +
            '<button class="friend-accept-btn" type="button" data-uid="' + escapeHtml(r.requesterId) + '" data-name="' + escapeHtml(name) + '" data-myname="' + escapeHtml(myName) + '">\u2713</button>' +
            '<button class="friend-decline-btn" type="button" data-uid="' + escapeHtml(r.requesterId) + '">\u2715</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    // Bind accept/decline
    el.querySelectorAll(".friend-accept-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var uid     = btn.dataset.uid;
        var theirName = btn.dataset.name;
        var myN     = btn.dataset.myname;
        btn.disabled = true;
        try {
          await window.FirestoreService.acceptFriendRequest(myUid, uid, theirName, myN);
          loadFriendRequests(myUid);
          loadFriendsList(myUid);
        } catch (e) { btn.disabled = false; }
      });
    });

    el.querySelectorAll(".friend-decline-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var uid = btn.dataset.uid;
        btn.disabled = true;
        try {
          await window.FirestoreService.declineFriendRequest(myUid, uid);
          loadFriendRequests(myUid);
        } catch (e) { btn.disabled = false; }
      });
    });
  }

  async function loadFriendsList(myUid) {
    if (!window.FirestoreService) { return; }
    var el    = document.getElementById("friendsList");
    var empty = document.getElementById("friendsEmptyMsg");
    if (!el) { return; }

    var friends = await window.FirestoreService.getFriends(myUid);
    if (!friends || friends.length === 0) {
      el.innerHTML = "";
      if (empty) { empty.style.display = ""; }
      return;
    }
    if (empty) { empty.style.display = "none"; }

    el.innerHTML = friends.map(function (f) {
      var name    = f.displayName || "Friend";
      var initial = (f.firstName || name || "F").charAt(0).toUpperCase();
      var streak  = f.streak || 0;
      return (
        '<a class="flex flex-col items-center gap-1.5 text-center no-underline" href="profile.html?uid=' + encodeURIComponent(f.uid) + '" title="' + escapeHtml(name) + '">' +
          '<div class="grid h-14 w-14 place-items-center rounded-full font-black text-white text-lg"' +
            ' style="background:#164f33;box-shadow:0 2px 8px rgba(22,79,51,0.25)">' +
            escapeHtml(initial) +
          '</div>' +
          '<p class="text-xs font-extrabold truncate" style="color:#102b1d;max-width:4rem">' + escapeHtml(name.split(" ")[0]) + '</p>' +
          '<p class="text-xs font-bold" style="color:#F97316">\uD83D\uDD25 ' + streak + '</p>' +
        '</a>'
      );
    }).join("");
  }

  // ── Public profile view ───────────────────────────────────────

  async function loadPublicProfile(targetUid) {
    // Hide own-friends UI, show public friend button
    var ownEl = document.getElementById("ownFriendsUI");
    var pubEl = document.getElementById("publicProfileFriendUI");
    if (ownEl) { ownEl.style.display = "none"; }
    if (pubEl) { pubEl.style.display = ""; }

    if (!window.FirestoreService) { render(); return; }

    // Fetch public profile
    var profile = await window.FirestoreService.getPublicProfile(targetUid);
    if (!profile) {
      // Could not load — fall back to showing own profile
      render();
      return;
    }

    // Render public profile fields
    var initEl  = document.getElementById("profileInitial");
    var nameEl  = document.getElementById("profileName");
    var lvBadge = document.getElementById("profileLevelBadge");
    var lvName  = document.getElementById("profileLevelName");
    var joinedEl = document.getElementById("profileJoined");

    var firstName  = profile.firstName || "";
    var lastName   = profile.lastName  || "";
    var fullName   = (profile.displayName) || [firstName, lastName].filter(Boolean).join(" ") || "SugboCents User";
    var initial    = (firstName || fullName || "?").charAt(0).toUpperCase();

    if (initEl)  { initEl.textContent  = initial; }
    if (nameEl)  { nameEl.textContent  = fullName; }
    if (lvBadge) { lvBadge.textContent = "Lv " + (profile.level || 1); }
    if (lvName)  { lvName.textContent  = profile.levelName || "Rookie Saver"; }
    if (joinedEl){ joinedEl.textContent = ""; }

    // Stats
    var statStreak = document.getElementById("statStreak");
    var statXp     = document.getElementById("statXp");
    var statLevel  = document.getElementById("statLevel");
    if (statStreak) { statStreak.textContent = profile.streak || 0; }
    if (statXp)     { statXp.textContent     = profile.xp || 0; }
    if (statLevel)  { statLevel.textContent  = profile.level || 1; }

    // Resolve Add Friend button state
    var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
    var myUid   = session && session.userId ? session.userId : null;
    var addBtn  = document.getElementById("publicProfileAddBtn");

    if (!addBtn || !myUid) { return; }

    var status = await window.FirestoreService.getFriendStatus(myUid, targetUid);

    if (status === "friend") {
      addBtn.textContent = "\u2713 Friends";
      addBtn.disabled = true;
    } else if (status === "pending_sent") {
      addBtn.textContent = "Request Sent";
      addBtn.disabled = true;
    } else if (status === "pending_received") {
      addBtn.textContent = "Accept Request";
      addBtn.disabled = false;
      addBtn.addEventListener("click", async function () {
        addBtn.disabled = true;
        var user   = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
        var myName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "Friend";
        var theirName = profile.displayName || fullName;
        try {
          await window.FirestoreService.acceptFriendRequest(myUid, targetUid, theirName, myName);
          addBtn.textContent = "\u2713 Friends";
        } catch (e) { addBtn.disabled = false; }
      });
    } else {
      addBtn.textContent = "Add Friend";
      addBtn.addEventListener("click", async function () {
        addBtn.disabled = true;
        var user2  = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
        var myName2 = user2 ? [user2.firstName, user2.lastName].filter(Boolean).join(" ") : "Friend";
        try {
          await window.FirestoreService.sendFriendRequest(myUid, targetUid, myName2);
          addBtn.textContent = "Request Sent";
        } catch (e) { addBtn.disabled = false; }
      });
    }
  }

})();

