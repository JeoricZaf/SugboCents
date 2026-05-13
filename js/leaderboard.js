(function () {
  // ── Constants ─────────────────────────────────────────────────
  var LEAGUES = [
    { key: "bronze",   name: "Rookie Saver",   color: "#9a6b45" },
    { key: "silver",   name: "Budget Keeper",  color: "#84919a" },
    { key: "gold",     name: "Spending Scout", color: "#EAB308" },
    { key: "emerald",  name: "Frugal Fighter", color: "#2b8259" },
    { key: "sapphire", name: "Savings Sage",   color: "#2563EB" },
    { key: "amethyst", name: "Wealth Warden",  color: "#7C3AED" },
    { key: "diamond",  name: "Budget Legend",  color: "#67E8F9" }
  ];

  var AVATAR_COLORS = {
    1: "#9a6b45",
    2: "#84919a",
    3: "#EAB308",
    4: "#2b8259",
    5: "#2563EB",
    6: "#7C3AED",
    7: "#67E8F9"
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
    if (level >= 7) { return 6; }
    if (level >= 6) { return 5; }
    if (level >= 5) { return 4; }
    if (level >= 4) { return 3; }
    if (level >= 3) { return 2; }
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
    var quests = user.questsCompleted || 0;
    var weeklyXP = 0;
    var now = new Date();
    var dayOfWeek = now.getDay();
    var mondayKey = (function () {
      var d = new Date(now);
      d.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      d.setHours(0, 0, 0, 0);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }());
    var weeklyXpStart = (user.weeklyXpStartDate === mondayKey) ? (user.weeklyXpStart || 0) : (info.xp || 0);
    weeklyXP = Math.max(0, (info.xp || 0) - weeklyXpStart);

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

  // ── League Score: transparent, weighted ranking formula ─────
  // Score = XP×1 + Quests×50 + Streak×10 (streak capped at 21 days)
  // This is the single source of truth for rank position.
  function computeLeagueScore(player) {
    var streakPts = Math.min(player.streak || 0, 21) * 10;
    var questPts  = (player.questsCompleted || 0) * 50;
    var xpPts     = (player.weeklyXP || 0);
    return streakPts + questPts + xpPts;
  }

  function sortRanking(players) {
    return players.slice().sort(function (a, b) {
      var scoreDiff = (b.leagueScore || 0) - (a.leagueScore || 0);
      if (scoreDiff !== 0) { return scoreDiff; }
      // Deterministic tiebreaker — alphabetical, no rank-swap on reload
      return (a.displayName || "").localeCompare(b.displayName || "");
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

  // ── Players cache — full ranked array for instant stale-while-revalidate ──
  var PLAYERS_CACHE_KEY = "sugbocents_lb_players_v2";

  function loadPlayersCache() {
    try {
      var raw = localStorage.getItem(PLAYERS_CACHE_KEY);
      if (!raw) { return null; }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) { return null; }
  }

  function savePlayersCache(ranked) {
    try { localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(ranked)); } catch (e) {}
  }
  // ──────────────────────────────────────────────────────────────────────────

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

    var selfInRanking = ranking.find(function (p) { return p.isSelf; });
    var selfRank = selfInRanking ? selfInRanking.rank : null;

    // Wrap rows in lb-rows-v3 (connects visually beneath the podium)
    var html = '<div class="lb-rows-v3">';

    ranking.forEach(function (player) {
      var globalRank = player.rank;
      var move = getMoveIndicator(player.uid, globalRank, snapshot);
      var isSelf = player.isSelf;
      var href = (player.uid && !isSelf) ? "profile.html?uid=" + encodeURIComponent(player.uid) : null;
      var tag = href ? "a" : "div";
      var hrefAttr = href ? ' href="' + escHtml(href) + '"' : "";

      // ── "Just Ahead" / "Leading" motivational banner before own row ──────
      if (isSelf) {
        if (selfRank === 1) {
          html += (
            '<div class="lb-just-ahead">' +
              '<span class="lb-just-ahead__icon">\uD83D\uDD25</span>' +
              '<span class="lb-just-ahead__text">You\'re leading the pack this week!</span>' +
            '</div>'
          );
        } else if (selfRank > 1) {
          var aheadPlayer = ranking[selfRank - 2]; // 0-indexed: player directly above
          if (aheadPlayer) {
            var scoreGap = Math.max(0, (aheadPlayer.leagueScore || 0) - (player.leagueScore || 0));
            var aheadMsg = scoreGap > 0
              ? scoreGap + ' pts away from overtaking ' + escHtml(aheadPlayer.displayName)
              : 'You\u2019re tied with ' + escHtml(aheadPlayer.displayName) + ' \u2014 keep logging!';
            html += (
              '<div class="lb-just-ahead">' +
                '<span class="lb-just-ahead__icon">\uD83D\uDD25</span>' +
                '<span class="lb-just-ahead__text">' + aheadMsg + '</span>' +
              '</div>'
            );
          }
        }
      }

      // ── Rank color class ─────────────────────────────────────────────────
      var rankColorClass = globalRank === 1 ? " lb-v3-rank--gold" : globalRank === 2 ? " lb-v3-rank--silver" : globalRank === 3 ? " lb-v3-rank--bronze" : "";

      // ── Avatar tier class ────────────────────────────────────────────────
      var level = player.level || 1;
      var avatarTierClass = level >= 7 ? " lb-v3-avatar--diamond" :
                            level >= 6 ? " lb-v3-avatar--emerald" :
                            level >= 4 ? " lb-v3-avatar--gold" :
                            level >= 3 ? " lb-v3-avatar--silver" : " lb-v3-avatar--bronze";

      // ── Movement symbol ──────────────────────────────────────────────────
      var moveSymbol = move === "up" ? "\u2191" : move === "down" ? "\u2193" : "";
      var moveClass  = "lb-v3-move lb-v3-move--" + move;

      var rowClass = "lb-row-v3" + (isSelf ? " lb-row-v3--self" : "");

      html += (
        '<' + tag + hrefAttr +
          ' class="' + rowClass + '"' +
          ' style="text-decoration:none;color:inherit"' +
          (isSelf ? ' id="lbSelfRow"' : '') + '>' +
          '<div class="lb-v3-rank-cell">' +
            '<span class="lb-v3-rank' + rankColorClass + '">' + (isSelf ? '\u25B6' : globalRank) + '</span>' +
            (moveSymbol ? '<span class="' + moveClass + '">' + moveSymbol + '</span>' : '') +
          '</div>' +
          '<div class="lb-v3-avatar' + avatarTierClass + '" aria-hidden="true">' + escHtml(player.initial) + '</div>' +
          '<div class="lb-v3-info">' +
            '<p class="lb-v3-name">' +
              escHtml(player.displayName) +
              (isSelf ? '<span class="lb-v3-you-tag">You</span>' : '') +
            '</p>' +
            '<div class="lb-v3-stats">' +
              '<span class="lb-v3-stat lb-v3-stat--score" title="League Score = XP + Quests\u00d750 + Streak\u00d710 (cap 21d)">\u2B50 ' + (player.leagueScore || 0) + '</span>' +
              '<span class="lb-v3-stat lb-v3-stat--streak">\uD83D\uDD25 ' + (player.streak || 0) + '</span>' +
              '<span class="lb-v3-stat lb-v3-stat--quests">\u2705 ' + (player.questsCompleted || 0) + '</span>' +
              '<span class="lb-v3-stat lb-v3-stat--xp">\u26A1 ' + (player.weeklyXP || 0) + '</span>' +
            '</div>' +
          '</div>' +
        '</' + tag + '>'
      );

      // ── Promotion Zone divider after rank 3 ─────────────────────────────
      if (globalRank === 3 && ranking.length > 3) {
        html += (
          '<div class="lb-zone-divider lb-zone-divider--promotion" aria-hidden="true">' +
            '<div class="lb-zone-divider__line"></div>' +
            '<span class="lb-zone-divider__text">Promotion Zone \u2191</span>' +
            '<div class="lb-zone-divider__line"></div>' +
          '</div>'
        );
      }
    });

    html += '</div>';
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

    var rank  = selfInRanking.rank;
    var move  = getMoveIndicator(self.uid, rank, snapshot);
    var moveHtml = renderMoveHtml(move);
    var score = selfInRanking.leagueScore || 0;

    inner.innerHTML = (
      '<div style="width:1.75rem;text-align:center;font-size:1.1rem;font-weight:900;color:white;flex-shrink:0">' + rank + '</div>' +
      '<div style="width:2.5rem;height:2.5rem;border-radius:9999px;background:rgba(255,255,255,0.25);display:grid;place-items:center;font-size:0.875rem;font-weight:900;color:white;flex-shrink:0">' + escHtml(self.initial) + '</div>' +
      '<div style="min-width:0;flex:1">' +
        '<p style="font-weight:800;color:white;margin:0;font-size:0.875rem">You \u2014 #' + rank + ' of ' + ranking.length + '</p>' +
        '<p style="font-size:0.7rem;color:rgba(255,255,255,0.75);margin:0.1rem 0 0;font-weight:600">' +
          '\u2B50 ' + score + ' pts &nbsp;\uD83D\uDD25 ' + (self.streak || 0) + ' &nbsp;\u26A1 ' + (self.weeklyXP || 0) + ' XP' +
        '</p>' +
      '</div>' +
      moveHtml
    );

    // Only show the dock when the user's own row has scrolled out of view.
    // Fall back to always-visible on browsers without IntersectionObserver.
    var selfRow = document.getElementById("lbSelfRow");
    if (selfRow && typeof IntersectionObserver !== "undefined") {
      el.style.display = "none"; // hidden by default; observer reveals it
      new IntersectionObserver(function (entries) {
        el.style.display = entries[0].isIntersecting ? "none" : "";
      }, { threshold: 0.5 }).observe(selfRow);
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

  // ── Podium (top 3 visual) ─────────────────────────────────────

  function renderPodium(ranking) {
    var el = document.getElementById("lbPodium");
    if (!el) { return; }

    // Need at least 2 players to show a meaningful podium
    if (!ranking || ranking.length < 2) { el.style.display = "none"; return; }

    var top3 = ranking.filter(function (p) { return p.rank <= 3; });

    function slotHtml(player, slotNum) {
      if (!player) { return ""; }
      var medals = { 1: "\uD83D\uDC51", 2: "\uD83E\uDD48", 3: "\uD83E\uDD49" };
      var slotClass = "lb-podium-slot lb-podium-slot--" +
        (slotNum === 1 ? "first" : slotNum === 2 ? "second" : "third") +
        (player.isSelf ? " lb-podium-slot--self" : "");
      var avatarBg = avatarColor(player.level || 1);
      return (
        '<div class="' + slotClass + '">' +
          '<div class="lb-podium-medal">' + medals[slotNum] + '</div>' +
          '<div class="lb-podium-avatar" style="background:' + avatarBg + '">' + escHtml(player.initial) + '</div>' +
          '<p class="lb-podium-name">' +
            escHtml(player.displayName) +
            (player.isSelf ? '<span style="font-size:0.55rem;color:var(--brand-700,#2b8259);display:block"> (You)</span>' : '') +
          '</p>' +
          '<div class="lb-podium-stats">' +
            '<span class="lb-podium-stat">\uD83D\uDD25 ' + (player.streak || 0) + '</span>' +
            '<span class="lb-podium-stat">\u2705 ' + (player.questsCompleted || 0) + '</span>' +
            '<span class="lb-podium-stat">\u26A1 ' + (player.weeklyXP || 0) + '</span>' +
          '</div>' +
          '<div class="lb-podium-bar"></div>' +
          '<p class="lb-podium-rank-label">' + (slotNum === 1 ? "1st" : slotNum === 2 ? "2nd" : "3rd") + '</p>' +
        '</div>'
      );
    }

    // CSS uses order:1(2nd-left) order:2(1st-center) order:3(3rd-right)
    var slot1 = top3.find(function (p) { return p.rank === 1; });
    var slot2 = top3.find(function (p) { return p.rank === 2; });
    var slot3 = top3.find(function (p) { return p.rank === 3; });

    el.innerHTML = (
      '<div class="lb-podium">' +
        (slot2 ? slotHtml(slot2, 2) : '') +
        (slot1 ? slotHtml(slot1, 1) : '') +
        (slot3 ? slotHtml(slot3, 3) : '') +
      '</div>'
    );
    el.style.display = "";
  }

  function renderShields(leagueIndex) {
    var el = document.getElementById("lbShieldsRow");
    if (!el) { return; }

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
    var rangeEl = document.getElementById("lbWeekRange");
    renderShields(leagueIndex);
    if (nameEl)  { nameEl.textContent  = LEAGUES[leagueIndex] ? LEAGUES[leagueIndex].name : "Budget Keeper"; }
    if (countEl) { countEl.textContent = getCountdownText(); }
    if (rangeEl) { rangeEl.textContent = getWeekRange(); }
  }

  // ── Full leaderboard page ─────────────────────────────────────

  if (PAGE === "leaderboard") {

    var _lbRendering = false; // concurrency guard — prevents parallel async runs

    function showSection(id) {
      ["lbLoading", "lbRows", "lbEmpty", "lbNoFirebase"].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) { el.style.display = (s === id) ? "" : "none"; }
      });
      // Hide podium unless the full rankings are being shown
      var podiumEl = document.getElementById("lbPodium");
      if (podiumEl && id !== "lbRows") { podiumEl.style.display = "none"; }
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
      // Guard: skip if a render is already in-flight (prevents DOM races on rapid events)
      if (_lbRendering) { return; }
      _lbRendering = true;

      try {
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

        var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
        if (!session || !session.userId) { showSection("lbNoFirebase"); return; }
        var myUserId = session.userId;
        self.uid = myUserId;

        // ── Stale-while-revalidate: serve last known ranking instantly ──────
        // If we have cached player data, render it now (~5ms, no Firestore wait).
        // Fresh data will silently overwrite it once getFriends resolves.
        var cachedPlayers = loadPlayersCache();
        if (cachedPlayers) {
          var cachedSnapshot = loadSnapshot();
          renderPodium(cachedPlayers);
          renderRows(cachedPlayers, myUserId, cachedSnapshot);
          showSection("lbRows");
          renderPinnedSelf(self, cachedPlayers, cachedSnapshot);
        } else {
          // No cache yet — show the content skeleton while fetching
          showSection("lbLoading");
        }

        // ── Fire-and-forget: sync our public profile ─────────────────────────
        // syncPublicProfile writes to Firestore so friends see our fresh XP/streak.
        // We do NOT await it — getFriends reads OTHER people's profiles, not ours,
        // so blocking on this write only delays the user with no benefit.
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

        // Keep feed skeleton visible while waiting for the friends list.
        // renderLiveFeed will be called with the real friend UIDs once getFriends resolves.

        var friends = await window.FirestoreService.getFriends(myUserId);

        if (friends.length === 0) {
          renderLiveFeed([]); // show "no friends" feed empty state
          renderEmptyState();
          showSection("lbEmpty");
          return;
        }

        var allPlayers = friends.map(function (f) {
          var p = {
            uid:            f.uid,
            displayName:    f.displayName || "Friend",
            initial:        (f.firstName || f.displayName || "F").charAt(0).toUpperCase(),
            streak:         Number(f.streak  || 0),
            questsCompleted:Number(f.questsCompleted || 0),
            weeklyXP:       Number(f.weeklyXP || 0),
            level:          Number(f.level   || 1),
            isSelf:         false
          };
          p.leagueScore = computeLeagueScore(p);
          return p;
        });
        var selfWithScore = Object.assign({}, self);
        selfWithScore.leagueScore = computeLeagueScore(selfWithScore);
        allPlayers.push(selfWithScore);

        var ranked = sortRanking(allPlayers).map(function (p, i) {
          return Object.assign({}, p, { rank: i + 1 });
        });

        var snapshot = loadSnapshot();
        saveSnapshot(ranked);
        savePlayersCache(ranked); // persist for next page open

        renderPodium(ranked);
        renderRows(ranked, myUserId, snapshot);
        showSection("lbRows");
        renderPinnedSelf(self, ranked, snapshot);

        // Fetch friends-only feed entries after the ranking data is ready.
        // Explicitly exclude own UID so the feed never shows the current user's logs.
        var friendUids = friends
          .map(function (f) { return f.uid; })
          .filter(function (uid) { return uid !== myUserId; });
        renderLiveFeed(friendUids);

      } catch (e) {
        console.error("[Leaderboard] renderLeaderboard error:", e);
        // Fall back to empty state so the user is never trapped on "Loading…"
        renderEmptyState();
        showSection("lbEmpty");
      } finally {
        _lbRendering = false;
      }
    }

    // ── Live Feed ─────────────────────────────────────────────

    function relativeTime(isoString) {
      if (!isoString) { return ""; }
      var then = new Date(isoString);
      if (isNaN(then.getTime())) { return ""; }
      var diffMs  = Date.now() - then.getTime();
      var diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1)  { return "just now"; }
      if (diffMin < 60) { return diffMin + "m ago"; }
      var diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24)  { return diffHr + "h ago"; }
      return Math.floor(diffHr / 24) + "d ago";
    }

    // friendUids — array of friend UIDs to fetch feed entries from (must NOT include own UID).
    async function renderLiveFeed(friendUids) {
      var feedEl = document.getElementById("lbLiveFeed");
      if (!feedEl) { return; }

      // Show skeleton while fetching
      feedEl.innerHTML =
        '<div style="padding:0.75rem 0;display:flex;flex-direction:column;gap:0.6rem">' +
        [1, 2, 3].map(function () {
          return '<div style="display:flex;align-items:center;gap:0.6rem">' +
            '<div style="width:2rem;height:2rem;background:#ece7da;border-radius:50%;flex-shrink:0;animation:pulse 1.4s ease-in-out infinite"></div>' +
            '<div style="flex:1;height:0.7rem;background:#ece7da;border-radius:0.4rem;animation:pulse 1.4s ease-in-out infinite"></div>' +
          '</div>';
        }).join("") +
        '</div>';

      // No friends — show invite prompt instead of a confusing empty state
      if (!friendUids || friendUids.length === 0) {
        feedEl.innerHTML =
          '<div class="rounded-3xl px-4 py-3 text-sm font-bold" style="background:#faf8f1;color:#334438">' +
          'Add friends to see their activity here \uD83D\uDC65' +
          '</div>';
        return;
      }

      if (!window.FirestoreService || !window.FirestoreService.getFriendsFeedEntries) {
        feedEl.innerHTML = '';
        return;
      }

      // Fetch at most 5 entries total across all friends, newest first.
      var entries = await window.FirestoreService.getFriendsFeedEntries(friendUids, 5);

      if (!entries || entries.length === 0) {
        feedEl.innerHTML =
          '<div class="rounded-3xl px-4 py-3 text-sm font-bold" style="background:#faf8f1;color:#334438">' +
          'No activity yet \u2014 friends will show up here as they log expenses \uD83D\uDD25' +
          '</div>';
        return;
      }

      // Take the 5 most recent entries (getFriendsFeedEntries already sorts + slices,
      // but enforce the cap here as a safety net).
      feedEl.innerHTML = entries.slice(0, 5).map(function (e) {
        var initial = String(e.authorInitial || (e.authorName || "?").charAt(0)).toUpperCase();
        var name    = escHtml(e.authorName || "Friend");
        var msg     = escHtml(e.message   || "logged activity");
        var emoji   = escHtml(e.emoji     || "\uD83D\uDCCA");
        var time    = relativeTime(e.timestamp);
        return (
          '<div style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.5rem 0;border-bottom:1px solid #f0ebe0">' +
            '<div style="width:2rem;height:2rem;border-radius:50%;background:#164f33;display:grid;place-items:center;flex-shrink:0;font-size:0.75rem;font-weight:900;color:white;font-family:\'Sora\',sans-serif">' +
              initial +
            '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<p style="margin:0;font-size:0.8rem;font-weight:700;color:#102b1d;line-height:1.3">' +
                emoji + '\u00a0' + msg +
              '</p>' +
              '<p style="margin:0.15rem 0 0;font-size:0.7rem;font-weight:600;color:#8a9e90">' +
                name + (time ? ' \u00b7 ' + time : '') +
              '</p>' +
            '</div>' +
          '</div>'
        );
      }).join("");
    } // end renderLiveFeed

    // ── Debounced re-render ────────────────────────────────────
    // Events like sugbocents:dataChanged fire on every expense/XP/quest tick.
    // Debounce at 1200ms so rapid sequential events collapse into one render.
    var _lbDebounceTimer = null;
    function scheduleRender() {
      if (_lbDebounceTimer) { clearTimeout(_lbDebounceTimer); }
      _lbDebounceTimer = setTimeout(function () {
        _lbDebounceTimer = null;
        renderLeaderboard();
      }, 1200);
    }

    document.addEventListener("DOMContentLoaded", function () {
      var isFirebaseAvailable = window.FirebaseInit &&
                                window.FirebaseInit.isFirebaseMode &&
                                window.FirebaseInit.isFirebaseMode();

      if (isFirebaseAvailable) {
        var hasCachedData = loadPlayersCache() !== null;

        if (hasCachedData) {
          // Instant cache render — data visible in ~5ms before Firebase auth settles.
          // The guard releases after getFriends resolves (~600ms).
          renderLeaderboard();
        } else {
          // First visit (no cache): show the skeleton + header while waiting for auth
          renderHeader();
          showSection("lbLoading");
        }

        // Once Firebase auth + Firestore sync complete, fetch fresh data.
        var didInitialFreshRender = false;
        var onSynced = function () {
          if (didInitialFreshRender) { return; }
          didInitialFreshRender = true;
          window.removeEventListener("sugbocents:synced", onSynced);
          // If a cache render is still in-flight, wait briefly for the guard to release
          if (_lbRendering) {
            setTimeout(renderLeaderboard, 400);
          } else {
            renderLeaderboard();
          }
        };
        window.addEventListener("sugbocents:synced", onSynced);

        // Safety fallback: if synced never fires within 3s, render anyway
        setTimeout(function () {
          if (!didInitialFreshRender) {
            didInitialFreshRender = true;
            window.removeEventListener("sugbocents:synced", onSynced);
            if (_lbRendering) {
              setTimeout(renderLeaderboard, 400);
            } else {
              renderLeaderboard();
            }
          }
        }, 3000);

      } else {
        // Local mode: no Firebase, render immediately
        renderLeaderboard();
      }

      // Countdown tick — doesn't need a full re-render
      setInterval(function () {
        var countEl = document.getElementById("lbCountdown");
        if (countEl) { countEl.textContent = getCountdownText(); }
      }, 60000);

      // Subsequent data changes: debounced so rapid events (expense add + XP grant)
      // collapse into a single re-render instead of 2–5 Firestore round-trips.
      window.addEventListener("sugbocents:dataChanged", scheduleRender);
      // sugbocents:synced after the initial one: also debounced
      window.addEventListener("sugbocents:synced", scheduleRender);
    });
  }

  // ── Dashboard widget ──────────────────────────────────────────

  if (PAGE === "dashboard") {

    var _lbFetching = false; // debounce: prevent simultaneous fetches

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

      // Guard: skip if a fetch is already in-flight
      if (_lbFetching) { return; }
      _lbFetching = true;

      // Show skeleton while fetching
      if (emptyEl) { emptyEl.style.display = "none"; }
      if (rowsEl) {
        rowsEl.style.display = "";
        rowsEl.innerHTML = [1, 2, 3].map(function () {
          return '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0;border-bottom:1px solid #f0ebe0">' +
            '<div style="width:1.5rem;height:1rem;background:#ece7da;border-radius:0.4rem;animation:pulse 1.4s ease-in-out infinite"></div>' +
            '<div style="width:2rem;height:2rem;background:#ece7da;border-radius:50%;animation:pulse 1.4s ease-in-out infinite"></div>' +
            '<div style="flex:1;height:0.75rem;background:#ece7da;border-radius:0.4rem;animation:pulse 1.4s ease-in-out infinite"></div>' +
            '<div style="width:2.5rem;height:0.75rem;background:#ece7da;border-radius:0.4rem;animation:pulse 1.4s ease-in-out infinite"></div>' +
          '</div>';
        }).join("");
      }

      var friends;
      try {
        friends = await window.FirestoreService.getFriends(myUserId);
      } catch (e) {
        _lbFetching = false;
        if (emptyEl) { emptyEl.style.display = ""; }
        if (rowsEl)  { rowsEl.style.display  = "none"; }
        if (jaEl)    { jaEl.style.display     = "none"; }
        return;
      }
      _lbFetching = false;

      if (friends.length === 0) {
        if (emptyEl) { emptyEl.style.display = ""; }
        if (rowsEl)  { rowsEl.style.display  = "none"; }
        if (jaEl)    { jaEl.style.display     = "none"; }
        return;
      }

      if (emptyEl) { emptyEl.style.display = "none"; }
      if (rowsEl)  { rowsEl.style.display  = ""; }

      var allPlayers = friends.map(function (f) {
        var p = {
          uid:            f.uid,
          displayName:    f.displayName || "Friend",
          initial:        (f.firstName || f.displayName || "F").charAt(0).toUpperCase(),
          streak:         Number(f.streak  || 0),
          questsCompleted:Number(f.questsCompleted || 0),
          weeklyXP:       Number(f.weeklyXP || 0),
          level:          Number(f.level   || 1),
          isSelf:         false
        };
        p.leagueScore = computeLeagueScore(p);
        return p;
      });
      var selfDash = Object.assign({}, self, { uid: myUserId });
      selfDash.leagueScore = computeLeagueScore(selfDash);
      allPlayers.push(selfDash);

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
            var scoreGap = Math.max(0, (aheadPlayer.leagueScore || 0) - ((selfInRanking && selfInRanking.leagueScore) || 0));
            jaEl.textContent = scoreGap > 0
              ? "\u2B50 " + scoreGap + " pts from overtaking " + aheadPlayer.displayName
              : "\uD83D\uDD25 Tied with " + aheadPlayer.displayName + " \u2014 log more!";
            jaEl.style.display = "";
          }
        }
      }

      var MEDALS = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
      var top3 = ranked.slice(0, 3);
      var rowHtml = top3.map(function (p) {
        var rankDisplay = MEDALS[p.rank - 1] || String(p.rank);
        var rowCls = "lb-dash-v3-row" + (p.isSelf ? " lb-dash-v3-row--self" : "");
        var avatarBgColor = avatarColor(p.level || 1);
        return (
          '<div class="' + rowCls + '">' +
            '<span class="lb-dash-v3-rank">' + rankDisplay + '</span>' +
            '<div class="lb-dash-v3-avatar" style="background:' + avatarBgColor + '">' + escHtml(p.initial) + '</div>' +
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
