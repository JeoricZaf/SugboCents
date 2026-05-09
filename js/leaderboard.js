(function () {
  // ── Constants ─────────────────────────────────────────────────
  var LEAGUES = [
    { key: "bronze",  name: "Rookie Saver",   color: "#9a6b45" },
    { key: "silver",  name: "Budget Keeper",  color: "#84919a" },
    { key: "gold",    name: "Spending Scout", color: "#EAB308" },
    { key: "emerald", name: "Frugal Fighter", color: "#2b8259" }
  ];

  var AVATAR_COLORS = {
    1: "#9a6b45",
    2: "#9a6b45",
    3: "#84919a",
    4: "#EAB308",
    5: "#EAB308",
    6: "#2b8259",
    7: "#2b8259"
  };

  var SNAPSHOT_KEY = "sugbocents_lb_snapshot";
  var PAGE = document.body.dataset.page;

  // ── Utilities ─────────────────────────────────────────────────

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getCurrentLeagueIndex() {
    if (!window.StorageAPI || !window.StorageAPI.getXpInfo) { return 1; }
    var info  = window.StorageAPI.getXpInfo();
    var level = info.level || 1;
    if (level >= 6) { return 3; }
    if (level >= 4) { return 2; }
    if (level >= 2) { return 1; }
    return 0;
  }

  function getWeekRange() {
    var now = new Date();
    var day = now.getDay();
    var monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    var opts = { month: "short", day: "numeric" };
    return monday.toLocaleDateString("en-PH", opts) + " \u2013 " +
           sunday.toLocaleDateString("en-PH", opts) + ", " + now.getFullYear();
  }

  function getCountdownText() {
    var now = new Date();
    var day = now.getDay();
    var daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    var nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    var diff    = nextMonday - now;
    var hours   = Math.floor(diff / (1000 * 60 * 60));
    var days    = Math.floor(hours / 24);
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days >= 1) { return "\u23F1 Resets in " + days + (days === 1 ? " day" : " days"); }
    if (hours >= 1) { return "\u23F1 Resets in " + hours + "h " + (minutes > 0 ? minutes + "m" : ""); }
    return "\u23F1 Resetting soon";
  }

  function getSelf() {
    if (!window.StorageAPI) { return null; }
    var user = window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    if (!user) { return null; }
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var info   = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { xp: 0, level: 1, levelName: "Rookie Saver" };
    var quests = 0;
    var weeklyXP = 0;
    try {
      var raw = localStorage.getItem("sugbocents_app");
      if (raw) {
        var parsed = JSON.parse(raw);
        var session = parsed.session;
        if (session && session.userId && Array.isArray(parsed.users)) {
          var u = parsed.users.find(function (x) { return x.id === session.userId; }) || {};
          var now = new Date();
          var dayOfWeek = now.getDay();
          var mondayKey = (function () {
            var d = new Date(now);
            d.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
            d.setHours(0, 0, 0, 0);
            return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          }());
          var weeklyXpStart = (u.weeklyXpStartDate === mondayKey) ? (u.weeklyXpStart || 0) : (info.xp || 0);
          weeklyXP = Math.max(0, (info.xp || 0) - weeklyXpStart);
          quests = u.questsCompleted || 0;
        }
      }
    } catch (e) {}

    var firstName = user.firstName || "You";
    var lastInitial = user.lastName ? user.lastName.charAt(0).toUpperCase() + "." : "";
    var displayName = [firstName, lastInitial].filter(Boolean).join(" ");

    return {
      uid:             user.id,
      displayName:     displayName,
      initial:         (firstName || "Y").charAt(0).toUpperCase(),
      streak:          streak,
      questsCompleted: quests,
      weeklyXP:        weeklyXP,
      level:           info.level || 1,
      isSelf:          true
    };
  }

  function sortRanking(players) {
    return players.slice().sort(function (a, b) {
      if (b.streak !== a.streak) { return b.streak - a.streak; }
      if (b.questsCompleted !== a.questsCompleted) { return b.questsCompleted - a.questsCompleted; }
      return (b.weeklyXP || 0) - (a.weeklyXP || 0);
    });
  }

  function getMoveIndicator(uid, currentRank, snapshot) {
    if (!snapshot || !uid || snapshot[uid] === undefined) { return "same"; }
    var prev = snapshot[uid];
    if (currentRank < prev) { return "up"; }
    if (currentRank > prev) { return "down"; }
    return "same";
  }

  function loadSnapshot() {
    try {
      var raw = localStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveSnapshot(ranking) {
    var snap = {};
    ranking.forEach(function (p) { if (p.uid) { snap[p.uid] = p.rank; } });
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap)); } catch (e) {}
  }

  function avatarColor(level) {
    return AVATAR_COLORS[level] || "#2b8259";
  }

  function renderMoveHtml(move) {
    if (move === "up")   { return '<span style="color:#2b8259;font-size:0.75rem;font-weight:900" aria-label="Moved up">\u2191</span>'; }
    if (move === "down") { return '<span style="color:#b91c1c;font-size:0.75rem;font-weight:900" aria-label="Moved down">\u2193</span>'; }
    return '';
  }

  // ── Row rendering ─────────────────────────────────────────────

  function renderRows(ranking, selfUid, snapshot) {
    var rowsEl = document.getElementById("lbRows");
    if (!rowsEl) { return; }
    if (!ranking || ranking.length === 0) { rowsEl.style.display = "none"; return; }

    var html = "";

    ranking.forEach(function (player) {
      var globalRank = player.rank;
      var move = getMoveIndicator(player.uid, globalRank, snapshot);
      var avatarBg = avatarColor(player.level || 1);
      var isSelf = player.isSelf;

      var rowBg    = isSelf ? "background:#edf7ef;outline:2px solid rgba(43,130,89,0.30)" : "background:#faf8f1";
      var href     = (player.uid && !isSelf) ? "profile.html?uid=" + encodeURIComponent(player.uid) : null;
      var tag      = href ? "a" : "div";
      var hrefAttr = href ? ' href="' + escHtml(href) + '"' : "";

      html += (
        '<' + tag + hrefAttr +
          ' class="flex items-center gap-4 rounded-3xl px-3 py-3"' +
          ' style="' + rowBg + ';text-decoration:none;color:inherit"' +
          (isSelf ? ' id="lbSelfRow"' : '') + '>' +
          '<div style="width:1.75rem;text-align:center;font-family:&#39;Sora&#39;,sans-serif;font-size:1.25rem;font-weight:900;color:#102b1d;flex-shrink:0">' + globalRank + '</div>' +
          '<div style="width:3rem;height:3rem;border-radius:9999px;background:' + avatarBg + ';display:grid;place-items:center;font-size:0.875rem;font-weight:900;color:white;flex-shrink:0;font-family:&#39;Sora&#39;,sans-serif" aria-hidden="true">' + escHtml(player.initial) + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<p style="font-weight:800;color:#102b1d;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
              escHtml(player.displayName) +
              (isSelf ? '<span style="font-size:0.7rem;font-weight:700;color:#2b8259;margin-left:0.35rem">(You)</span>' : '') +
            '</p>' +
            '<p style="font-size:0.75rem;font-weight:600;color:#6a746c;margin:0.1rem 0 0">' + (isSelf ? 'Your public rank' : 'Friend') + '</p>' +
          '</div>' +
          (isSelf ? '<span style="color:#164f33;font-weight:900">&#9664;</span>' : '') +
          renderMoveHtml(move) +
          '<div style="border-radius:9999px;background:#fff7ed;padding:0.25rem 0.75rem;font-size:0.875rem;font-weight:900;color:#9a3412;outline:1px solid rgba(249,115,22,0.3);flex-shrink:0">\uD83D\uDD25 ' + (player.streak || 0) + '</div>' +
        '</' + tag + '>'
      );
    });

    rowsEl.innerHTML = html;
    rowsEl.style.display = "";
  }

  // ── Pinned self card ──────────────────────────────────────────

  function renderPinnedSelf(self, ranking, snapshot) {
    var el    = document.getElementById("lbPinnedSelf");
    var inner = document.getElementById("lbPinnedSelfInner");
    if (!el || !inner || !self) { return; }

    var selfInRanking = ranking.find(function (p) { return p.isSelf; });
    if (!selfInRanking) { el.style.display = "none"; return; }

    var rank = selfInRanking.rank;
    var move = getMoveIndicator(self.uid, rank, snapshot);
    var moveHtml = renderMoveHtml(move);

    inner.innerHTML = (
      '<div style="width:1.75rem;text-align:center;font-size:1.1rem;font-weight:900;color:white;flex-shrink:0">' + rank + '</div>' +
      '<div style="width:2.5rem;height:2.5rem;border-radius:9999px;background:rgba(255,255,255,0.25);display:grid;place-items:center;font-size:0.875rem;font-weight:900;color:white;flex-shrink:0">' + escHtml(self.initial) + '</div>' +
      '<div style="min-width:0;flex:1">' +
        '<p style="font-weight:800;color:white;margin:0;font-size:0.875rem">You (#' + rank + ' of ' + ranking.length + ')</p>' +
        '<p style="font-size:0.7rem;color:rgba(255,255,255,0.75);margin:0.1rem 0 0;font-weight:600">' +
          '\uD83D\uDD25 ' + (self.streak || 0) + ' &nbsp;\u26A1 ' + (self.weeklyXP || 0) + ' XP' +
        '</p>' +
      '</div>' +
      moveHtml
    );

    var selfRowEl = document.getElementById("lbSelfRow");
    if (selfRowEl && "IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          el.style.display = entry.isIntersecting ? "none" : "";
        });
      }, { threshold: 0.5 });
      observer.observe(selfRowEl);
    } else {
      el.style.display = "";
    }
  }

  // ── Empty state ───────────────────────────────────────────────

  function renderEmptyState() {
    var el = document.getElementById("lbEmpty");
    if (!el) { return; }

    var ghostHtml = "";
    for (var i = 1; i <= 6; i++) {
      ghostHtml += (
        '<div class="flex items-center gap-4 rounded-3xl px-3 py-3" style="background:#faf8f1;opacity:0.45" aria-hidden="true">' +
          '<div style="width:1.75rem;text-align:center;font-size:1.1rem;font-weight:900;color:#102b1d;flex-shrink:0">' + i + '</div>' +
          '<div style="width:3rem;height:3rem;border-radius:9999px;background:#e2e8f0;display:grid;place-items:center;font-size:0.875rem;font-weight:900;color:#94a3b8;flex-shrink:0">' + String.fromCharCode(64 + i) + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div style="background:#f1f5f9;border-radius:4px;width:80px;height:13px;margin-bottom:6px"></div>' +
            '<div style="background:#f1f5f9;border-radius:4px;width:120px;height:10px"></div>' +
          '</div>' +
        '</div>'
      );
    }

    el.innerHTML = (
      '<div style="position:relative">' +
        '<div class="space-y-3">' + ghostHtml + '</div>' +
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:2rem;background:rgba(247,243,232,0.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)">' +
          '<div style="text-align:center;padding:1.5rem 2rem;border-radius:2rem;background:white;box-shadow:0 8px 32px rgba(0,0,0,0.12);outline:1px solid #ded7c6">' +
            '<div style="font-size:2rem;margin-bottom:0.5rem">\uD83D\uDC65</div>' +
            '<p style="font-family:\"Sora\",sans-serif;font-size:1.25rem;font-weight:900;color:#102b1d;margin:0 0 0.25rem">No friends yet</p>' +
            '<p style="font-size:0.8rem;font-weight:600;color:#617063;margin:0 0 1rem">Invite someone to compete this week \uD83D\uDD25</p>' +
            '<a href="profile.html" style="display:inline-block;border-radius:9999px;background:#164f33;color:white;padding:0.5rem 1.25rem;font-size:0.875rem;font-weight:900;text-decoration:none">Add a Friend \u2192</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Shields row ───────────────────────────────────────────────

  function renderShields(leagueIndex) {
    var el = document.getElementById("lbShieldsRow");
    if (!el) { return; }

    // Shield sizes: sm=faded past/future, md=adjacent, lg=active
    var sizes = [
      { w: "3.5rem", h: "4rem",  fontSize: "0.7rem"  },  // sm
      { w: "5rem",   h: "6rem",  fontSize: "0.85rem" },  // md
      { w: "7rem",   h: "8rem",  fontSize: "1rem"    },  // lg (active)
      { w: "4.5rem", h: "5.5rem",fontSize: "0.8rem"  },  // between
    ];

    el.innerHTML = LEAGUES.map(function (league, i) {
      var isActive = (i === leagueIndex);
      var dist     = Math.abs(i - leagueIndex);
      var opacity  = isActive ? "1" : "0.45";
      var bgColor  = league.color;

      // Size based on distance from active (matches reference sm/md/lg)
      var w, h, fs;
      if (isActive)       { w = "7rem";   h = "8rem";   fs = "1rem";    }
      else if (dist === 1){ w = "5rem";   h = "6rem";   fs = "0.875rem";}
      else                { w = "3.5rem"; h = "4rem";   fs = "0.75rem"; }

      var clipPath = "polygon(50% 0, 100% 18%, 86% 100%, 50% 84%, 14% 100%, 0 18%)";

      return (
        '<div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;opacity:' + opacity + '" aria-label="' + escHtml(league.name) + '">' +
          '<div style="width:' + w + ';height:' + h + ';background:' + bgColor + ';clip-path:' + clipPath + ';display:grid;place-items:center;font-family:\'Sora\',sans-serif;font-size:' + fs + ';font-weight:900;color:white;text-align:center;padding:0 0.25rem;box-shadow:0 4px 12px rgba(0,0,0,0.15)">' +
            escHtml(league.name.split(" ")[0]) +
          '</div>' +
          '<p style="font-size:0.75rem;font-weight:800;color:#102b1d;margin:0;max-width:6rem;text-align:center;font-family:\'Plus Jakarta Sans\',sans-serif">' + escHtml(league.name) + '</p>' +
        '</div>'
      );
    }).join("");
  }

  function renderHeader() {
    var leagueIndex = getCurrentLeagueIndex();
    var nameEl  = document.getElementById("lbLeagueName");
    var countEl = document.getElementById("lbCountdown");
    renderShields(leagueIndex);
    if (nameEl)  { nameEl.textContent  = LEAGUES[leagueIndex] ? LEAGUES[leagueIndex].name : "Budget Keeper"; }
    if (countEl) { countEl.textContent = getCountdownText(); }
  }

  // ── Full leaderboard page ─────────────────────────────────────

  if (PAGE === "leaderboard") {

    function showSection(id) {
      ["lbLoading", "lbRows", "lbEmpty", "lbNoFirebase"].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) { el.style.display = (s === id) ? "" : "none"; }
      });
    }

    function loadLocalUser() {
      try {
        var raw = localStorage.getItem("sugbocents_app");
        if (!raw) { return null; }
        var parsed = JSON.parse(raw);
        if (!parsed.session || !parsed.session.userId) { return null; }
        var users = Array.isArray(parsed.users) ? parsed.users : [];
        return users.find(function (u) { return u.id === parsed.session.userId; }) || null;
      } catch (e) { return null; }
    }

    async function renderLeaderboard() {
      renderHeader();

      var isFirebase = window.FirestoreService &&
                       window.FirebaseInit &&
                       window.FirebaseInit.isFirebaseMode &&
                       window.FirebaseInit.isFirebaseMode();

      var self = getSelf();
      if (!self) { showSection("lbNoFirebase"); return; }

      if (!isFirebase) {
        // Local mode: show just self in empty leaderboard
        renderEmptyState();
        showSection("lbEmpty");
        return;
      }

      showSection("lbLoading");

      var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
      if (!session || !session.userId) { showSection("lbNoFirebase"); return; }
      var myUserId = session.userId;
      self.uid = myUserId;

      // Sync own public profile
      var localUser = loadLocalUser();
      if (localUser && window.FirestoreService.syncPublicProfile) {
        var xpInfo = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : { level: 1, levelName: "Rookie Saver" };
        window.FirestoreService.syncPublicProfile(myUserId, {
          firstName: localUser.firstName || "",
          lastName:  localUser.lastName  || "",
          streak:    self.streak,
          questsCompleted: self.questsCompleted,
          xp:              xpInfo.xp || 0,
          weeklyXpStart:   localUser.weeklyXpStart || 0,
          weeklyXpStartDate: localUser.weeklyXpStartDate || null,
          level:     xpInfo.level,
          levelName: xpInfo.levelName
        });
      }

      var friends = await window.FirestoreService.getFriends(myUserId);

      if (friends.length === 0) {
        renderEmptyState();
        showSection("lbEmpty");
        return;
      }

      var allPlayers = friends.map(function (f) {
        return {
          uid:            f.uid,
          displayName:    f.displayName || "Friend",
          initial:        (f.firstName || f.displayName || "F").charAt(0).toUpperCase(),
          streak:         Number(f.streak  || 0),
          questsCompleted:Number(f.questsCompleted || 0),
          weeklyXP:       Number(f.weeklyXP || 0),
          level:          Number(f.level   || 1),
          isSelf:         false
        };
      });
      allPlayers.push(Object.assign({}, self));

      var ranked = sortRanking(allPlayers).map(function (p, i) {
        return Object.assign({}, p, { rank: i + 1 });
      });

      var snapshot = loadSnapshot();
      saveSnapshot(ranked);

      renderRows(ranked, myUserId, snapshot);
      showSection("lbRows");
      renderPinnedSelf(self, ranked, snapshot);
    }

    document.addEventListener("DOMContentLoaded", function () {
      renderLeaderboard();
      setInterval(function () {
        var countEl = document.getElementById("lbCountdown");
        if (countEl) { countEl.textContent = getCountdownText(); }
      }, 60000);
      window.addEventListener("sugbocents:dataChanged", renderLeaderboard);
      window.addEventListener("sugbocents:synced",      renderLeaderboard);
    });
  }

  // ── Dashboard widget ──────────────────────────────────────────

  if (PAGE === "dashboard") {

    async function renderDashboardWidget() {
      var countEl = document.getElementById("lbDashV3Countdown");
      if (countEl) { countEl.textContent = getCountdownText(); }

      var self = getSelf();
      if (!self) { return; }

      var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
      var myUserId = session && session.userId ? session.userId : null;

      var emptyEl = document.getElementById("lbDashV3Empty");
      var rowsEl  = document.getElementById("lbDashV3Rows");
      var jaEl    = document.getElementById("lbDashV3JustAhead");
      var rankEl  = document.getElementById("lbDashV3RankChip");

      var isFirebase = myUserId && window.FirestoreService &&
                       window.FirebaseInit && window.FirebaseInit.isFirebaseMode &&
                       window.FirebaseInit.isFirebaseMode();

      if (!isFirebase) {
        if (emptyEl) { emptyEl.style.display = ""; }
        if (rowsEl)  { rowsEl.style.display  = "none"; }
        if (jaEl)    { jaEl.style.display     = "none"; }
        return;
      }

      var friends = await window.FirestoreService.getFriends(myUserId);

      if (friends.length === 0) {
        if (emptyEl) { emptyEl.style.display = ""; }
        if (rowsEl)  { rowsEl.style.display  = "none"; }
        if (jaEl)    { jaEl.style.display     = "none"; }
        return;
      }

      if (emptyEl) { emptyEl.style.display = "none"; }
      if (rowsEl)  { rowsEl.style.display  = ""; }

      var allPlayers = friends.map(function (f) {
        return {
          uid:            f.uid,
          displayName:    f.displayName || "Friend",
          initial:        (f.firstName || f.displayName || "F").charAt(0).toUpperCase(),
          streak:         Number(f.streak  || 0),
          questsCompleted:Number(f.questsCompleted || 0),
          weeklyXP:       Number(f.weeklyXP || 0),
          level:          Number(f.level   || 1),
          isSelf:         false
        };
      });
      allPlayers.push(Object.assign({}, self, { uid: myUserId }));

      var ranked = sortRanking(allPlayers).map(function (p, i) {
        return Object.assign({}, p, { rank: i + 1 });
      });

      var selfInRanking = ranked.find(function (p) { return p.isSelf; });
      var selfRank = selfInRanking ? selfInRanking.rank : ranked.length;

      if (rankEl) { rankEl.textContent = "#" + selfRank + " of " + ranked.length; }

      if (jaEl) {
        if (selfRank === 1) {
          jaEl.textContent = "\uD83D\uDD25 You're leading the pack this week!";
          jaEl.style.display = "";
        } else {
          var aheadPlayer = ranked[selfRank - 2];
          if (aheadPlayer) {
            var xpGap = Math.max(0, (aheadPlayer.weeklyXP || 0) - (self.weeklyXP || 0));
            jaEl.textContent = "\uD83D\uDD25 " + xpGap + " XP away from overtaking " + aheadPlayer.displayName;
            jaEl.style.display = "";
          }
        }
      }

      var MEDALS = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
      var top3 = ranked.slice(0, 3);
      var rowHtml = top3.map(function (p) {
        var rankDisplay = MEDALS[p.rank - 1] || String(p.rank);
        var rowCls = "lb-dash-v3-row" + (p.isSelf ? " lb-dash-v3-row--self" : "");
        var colClass = avatarColorClass(p.level || 1);
        return (
          '<div class="' + rowCls + '">' +
            '<span class="lb-dash-v3-rank">' + rankDisplay + '</span>' +
            '<div class="lb-dash-v3-avatar ' + colClass + '">' + escHtml(p.initial) + '</div>' +
            '<span class="lb-dash-v3-name">' + escHtml(p.displayName) + (p.isSelf ? '<span style="font-size:0.6rem;color:var(--brand-700,#2b8259);font-weight:700;"> (You)</span>' : '') + '</span>' +
            '<span class="lb-dash-v3-score">\u26A1 ' + (p.weeklyXP || 0) + '</span>' +
          '</div>'
        );
      }).join("");

      if (selfRank > 3 && selfInRanking) {
        rowHtml += (
          '<div class="lb-dash-v3-row lb-dash-v3-row--self">' +
            '<span class="lb-dash-v3-rank">' + selfRank + '</span>' +
            '<div class="lb-dash-v3-avatar">' + escHtml(self.initial) + '</div>' +
            '<span class="lb-dash-v3-name">You</span>' +
            '<span class="lb-dash-v3-score">\u26A1 ' + (self.weeklyXP || 0) + '</span>' +
          '</div>'
        );
      }

      if (rowsEl) { rowsEl.innerHTML = rowHtml; }
    }

    document.addEventListener("DOMContentLoaded", function () {
      renderDashboardWidget();
      window.addEventListener("sugbocents:dataChanged", renderDashboardWidget);
      window.addEventListener("sugbocents:synced",      renderDashboardWidget);
    });
  }

})();
