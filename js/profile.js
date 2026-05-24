(function () {
  if (document.body.dataset.page !== "profile") { return; }

  var RARITY_COLORS = {
    bronze:  "#C2773A",
    silver:  "#6B7280",
    gold:    "#CA8A04",
    emerald: "#1f6b46",
    diamond: "#0891B2"
  };

  var socialUnsubscribers = [];
  var friendsNetworkBound = false;
  var ADD_FRIEND_SESSION_KEY = "sugbocents_pending_add_friend_code";
  var PUBLIC_PROFILE_TABS = ["overview", "achievements", "streak", "weekly"];
  var publicProfileState = {
    activeTab: "overview",
    profile: null,
    entries: [],
    targetUid: null,
    myUid: null
  };

  function getManilaDayKey(value) {
    if (window.StorageAPI && window.StorageAPI.getManilaDayKey) {
      return window.StorageAPI.getManilaDayKey(value || new Date());
    }
    var d = new Date(value || new Date());
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function getPublicFeedTimeLabel(iso) {
    if (!iso) { return "recent"; }
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return "recent"; }
    return d.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function setPublicProfileTab(tab) {
    if (PUBLIC_PROFILE_TABS.indexOf(tab) === -1) { return; }
    publicProfileState.activeTab = tab;
    updatePublicProfileTabButtons();
    renderPublicProfileTabContent();
  }

  function updatePublicProfileTabButtons() {
    var wrap = document.getElementById("publicProfileTabs");
    if (!wrap) { return; }
    var active = publicProfileState.activeTab;
    wrap.querySelectorAll("[data-public-tab]").forEach(function (btn) {
      var tab = btn.getAttribute("data-public-tab");
      var isActive = tab === active;
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.style.background = isActive ? "#164f33" : "#ffffff";
      btn.style.color = isActive ? "#ffffff" : "#164f33";
      btn.style.border = isActive ? "1px solid #164f33" : "1px solid #d8d1bd";
    });
  }

  function bindPublicProfileTabs() {
    var wrap = document.getElementById("publicProfileTabs");
    if (!wrap) { return; }
    wrap.querySelectorAll("[data-public-tab]").forEach(function (btn) {
      if (btn.getAttribute("data-bound") === "1") { return; }
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-public-tab") || "overview";
        setPublicProfileTab(tab);
      });
    });
    updatePublicProfileTabButtons();
  }

  function buildPublicWeeklySeries(entries) {
    var map = {};
    var points = [];
    var now = new Date();
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(now.getDate() - i);
      var key = getManilaDayKey(d);
      map[key] = 0;
      points.push({
        key: key,
        label: d.toLocaleDateString("en-PH", { weekday: "short" })
      });
    }

    (entries || []).forEach(function (entry) {
      if (!entry || !entry.timestamp) { return; }
      var key = getManilaDayKey(entry.timestamp);
      if (typeof map[key] === "number") {
        map[key] += 1;
      }
    });

    return points.map(function (p) {
      return { label: p.label, value: map[p.key] || 0 };
    });
  }

  function renderPublicProfileTabContent() {
    var root = document.getElementById("publicProfileTabContent");
    if (!root) { return; }
    var profile = publicProfileState.profile || {};
    var entries = Array.isArray(publicProfileState.entries) ? publicProfileState.entries : [];
    var active = publicProfileState.activeTab || "overview";
    var displayName = String(profile.displayName || "Friend");

    if (active === "achievements") {
      var milestones = [
        { label: "Quest Finisher", value: Number(profile.questsCompleted || 0), targets: [5, 20, 50], color: "#164f33" },
        { label: "Streak Keeper", value: Number(profile.streak || 0), targets: [3, 7, 14], color: "#F97316" },
        { label: "XP Sprinter", value: Number(profile.weeklyXP || 0), targets: [120, 250, 400], color: "#EAB308" }
      ];
      root.innerHTML = milestones.map(function (m) {
        var next = m.targets.find(function (t) { return m.value < t; });
        var cap = next || m.targets[m.targets.length - 1];
        var pct = Math.min(100, Math.round((m.value / cap) * 100));
        var rank = m.value >= m.targets[2] ? "Legend" : (m.value >= m.targets[1] ? "Pro" : (m.value >= m.targets[0] ? "Starter" : "Locked"));
        return (
          '<div class="mb-3 rounded-2xl bg-white p-3" style="outline:1px solid #ded7c6">' +
            '<div class="mb-1.5 flex items-center justify-between gap-2">' +
              '<p class="text-sm font-extrabold" style="color:#102b1d">' + escapeHtml(m.label) + '</p>' +
              '<span class="text-xs font-black" style="color:#617063">' + rank + '</span>' +
            '</div>' +
            '<p class="text-xs font-bold" style="color:#617063">' + m.value + (next ? (' / ' + next) : ' / ' + cap) + '</p>' +
            '<div class="mt-2 h-2 overflow-hidden rounded-full" style="background:#ece6d8"><div style="width:' + pct + '%;height:100%;background:' + m.color + ';transition:width 260ms ease"></div></div>' +
          '</div>'
        );
      }).join("");
      return;
    }

    if (active === "streak") {
      var streak = Number(profile.streak || 0);
      var streakMood = streak >= 14 ? "on fire" : (streak >= 7 ? "steady" : "building");
      var recent = entries.slice(0, 5).map(function (entry) {
        var line = escapeHtml((entry.message || "Shared an update").slice(0, 72));
        return '<li class="py-1.5 text-xs font-semibold" style="color:#617063">' + line + ' <span style="color:#8b9490">· ' + escapeHtml(getPublicFeedTimeLabel(entry.timestamp)) + '</span></li>';
      }).join("");
      root.innerHTML =
        '<div class="rounded-2xl bg-white p-4" style="outline:1px solid #ded7c6">' +
          '<p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Current streak</p>' +
          '<p class="mt-1 font-display text-3xl font-black" style="color:#F97316">' + streak + ' days</p>' +
          '<p class="mt-1 text-sm font-semibold" style="color:#617063">Momentum: ' + streakMood + '</p>' +
        '</div>' +
        '<div class="mt-3 rounded-2xl bg-white p-4" style="outline:1px solid #ded7c6">' +
          '<p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Recent updates</p>' +
          (recent ? ('<ul class="mt-1">' + recent + '</ul>') : '<p class="mt-2 text-sm font-semibold" style="color:#617063">No recent public updates yet.</p>') +
        '</div>';
      return;
    }

    if (active === "weekly") {
      var series = buildPublicWeeklySeries(entries);
      var maxVal = Math.max.apply(null, series.map(function (x) { return x.value; }).concat([1]));
      root.innerHTML =
        '<div class="rounded-2xl bg-white p-4" style="outline:1px solid #ded7c6">' +
          '<p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Past 7 days</p>' +
          '<div class="mt-3 grid grid-cols-7 gap-1.5">' +
            series.map(function (pt) {
              var h = Math.max(8, Math.round((pt.value / maxVal) * 64));
              return '<div class="flex flex-col items-center gap-1"><div class="w-full rounded-t-md" style="height:' + h + 'px;background:#2b8259"></div><span class="text-[0.62rem] font-black" style="color:#617063">' + escapeHtml(pt.label.charAt(0)) + '</span></div>';
            }).join("") +
          '</div>' +
          '<p class="mt-3 text-xs font-semibold" style="color:#617063">Bars show how often ' + escapeHtml(displayName.split(" ")[0]) + ' appeared in your friend activity feed this week.</p>' +
        '</div>';
      return;
    }

    var latest = entries[0] || null;
    root.innerHTML =
      '<div class="grid gap-3 sm:grid-cols-2">' +
        '<div class="rounded-2xl bg-white p-3" style="outline:1px solid #ded7c6"><p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Level</p><p class="mt-1 text-2xl font-black" style="color:#102b1d">' + Number(profile.level || 1) + '</p><p class="text-xs font-bold" style="color:#617063">' + escapeHtml(String(profile.levelName || "Rookie Saver")) + '</p></div>' +
        '<div class="rounded-2xl bg-white p-3" style="outline:1px solid #ded7c6"><p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Weekly XP</p><p class="mt-1 text-2xl font-black" style="color:#EAB308">' + Number(profile.weeklyXP || 0) + '</p><p class="text-xs font-bold" style="color:#617063">This week</p></div>' +
        '<div class="rounded-2xl bg-white p-3" style="outline:1px solid #ded7c6"><p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Total quests</p><p class="mt-1 text-2xl font-black" style="color:#164f33">' + Number(profile.questsCompleted || 0) + '</p><p class="text-xs font-bold" style="color:#617063">Completed</p></div>' +
        '<div class="rounded-2xl bg-white p-3" style="outline:1px solid #ded7c6"><p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Current streak</p><p class="mt-1 text-2xl font-black" style="color:#F97316">' + Number(profile.streak || 0) + '</p><p class="text-xs font-bold" style="color:#617063">days</p></div>' +
      '</div>' +
      '<div class="mt-3 rounded-2xl bg-white p-3" style="outline:1px solid #ded7c6">' +
        '<p class="text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Latest activity</p>' +
        (latest
          ? '<p class="mt-1 text-sm font-bold" style="color:#102b1d">' + escapeHtml(latest.emoji || "📊") + ' ' + escapeHtml((latest.message || "Shared an update").slice(0, 96)) + '</p><p class="text-xs font-semibold" style="color:#617063">' + escapeHtml(getPublicFeedTimeLabel(latest.timestamp)) + '</p>'
          : '<p class="mt-1 text-sm font-semibold" style="color:#617063">No public activity visible yet.</p>') +
      '</div>';
  }

  async function loadPublicProfileFeed(myUid, targetUid) {
    if (!window.FirestoreService || !myUid || !targetUid) {
      publicProfileState.entries = [];
      renderPublicProfileTabContent();
      return;
    }

    var nextEntries = [];
    try {
      if (window.FirestoreService.getMyFeedEntries) {
        var feed = await window.FirestoreService.getMyFeedEntries(myUid, 60);
        nextEntries = (feed || []).filter(function (entry) {
          var authorUid = String(entry.authorUid || entry.authorId || "");
          return authorUid === String(targetUid);
        });
      }
      if ((!nextEntries || nextEntries.length === 0) && window.FirestoreService.getFriendsFeedEntries) {
        nextEntries = await window.FirestoreService.getFriendsFeedEntries([targetUid], 25);
      }
    } catch (_) {
      nextEntries = [];
    }

    nextEntries = (nextEntries || []).slice().sort(function (a, b) {
      return String(b.timestamp || "").localeCompare(String(a.timestamp || ""));
    }).slice(0, 40);

    publicProfileState.entries = nextEntries;
    renderPublicProfileTabContent();
  }

  function getDisplayNameFromUser(user) {
    if (!user) { return "SugboCents User"; }
    var preferred = String(user.displayName || user.username || "").trim();
    if (preferred) { return preferred; }
    var fallback = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return fallback || "SugboCents User";
  }

  function getAvatarMarkup(avatar, initial, sizePx, bgColor) {
    var safeInitial = escapeHtml((initial || "?").charAt(0).toUpperCase());
    var safeAvatar = String(avatar || "").trim();
    var bg = bgColor || "#164f33";
    if (safeAvatar) {
      return '<div class="grid place-items-center rounded-full" style="width:' + sizePx + 'px;height:' + sizePx + 'px;background:' + bg + ';box-shadow:0 2px 8px rgba(15,23,42,0.15);font-size:' + Math.max(18, Math.round(sizePx * 0.48)) + 'px">' + escapeHtml(safeAvatar) + '</div>';
    }
    return '<div class="grid place-items-center rounded-full font-black text-white" style="width:' + sizePx + 'px;height:' + sizePx + 'px;background:' + bg + ';box-shadow:0 2px 8px rgba(15,23,42,0.15);font-size:' + Math.max(14, Math.round(sizePx * 0.34)) + 'px">' + safeInitial + '</div>';
  }

  function addSocialSubscription(unsubscribe) {
    if (typeof unsubscribe !== "function") { return; }
    socialUnsubscribers.push(unsubscribe);
  }

  function clearSocialSubscriptions() {
    while (socialUnsubscribers.length) {
      var unsubscribe = socialUnsubscribers.pop();
      try { unsubscribe(); } catch (_) {}
    }
  }

  function ensureFriendsOfflineBanner() {
    var wrap = document.getElementById("friendsListWrap");
    if (!wrap) { return null; }
    var existing = document.getElementById("friendsOfflineBanner");
    if (existing) { return existing; }

    var banner = document.createElement("div");
    banner.id = "friendsOfflineBanner";
    banner.style.cssText = "display:none;margin-bottom:0.75rem;border-radius:0.95rem;padding:0.75rem 0.9rem;background:#fff4e5;color:#8a4b0f;border:1px solid rgba(217,119,6,0.25);font-size:0.82rem;font-weight:700;align-items:center;justify-content:space-between;gap:0.75rem";
    banner.innerHTML =
      '<span>You\'re offline. Showing cached data.</span>' +
      '<button id="friendsOfflineRetry" type="button" style="border:0;border-radius:9999px;background:#164f33;color:#fff;padding:0.28rem 0.7rem;font-size:0.72rem;font-weight:800">Retry</button>';

    wrap.parentNode.insertBefore(banner, wrap);
    return banner;
  }

  function setFriendsOfflineBannerVisible(isVisible) {
    var banner = ensureFriendsOfflineBanner();
    if (!banner) { return; }
    banner.style.display = isVisible ? "flex" : "none";
  }

  function renderRequestsLoadingState() {
    var wrap = document.getElementById("friendRequestsWrap");
    var el = document.getElementById("friendRequestsList");
    if (!wrap || !el) { return; }
    wrap.style.display = "";
    el.innerHTML = [1, 2, 3].map(function () {
      return '<div style="display:flex;align-items:center;gap:0.65rem;padding:0.55rem 0;border-bottom:1px solid #f1ece0">' +
        '<div class="sk sk-circle" style="width:2rem;height:2rem;flex-shrink:0"></div>' +
        '<div style="flex:1"><div class="sk" style="width:8rem;height:0.7rem;margin-bottom:0.4rem"></div><div class="sk" style="width:5.5rem;height:0.55rem"></div></div>' +
        '<div class="sk" style="width:3.8rem;height:1.6rem;border-radius:9999px"></div>' +
      '</div>';
    }).join("");
  }

  function renderFriendsLoadingState() {
    var el = document.getElementById("friendsList");
    var empty = document.getElementById("friendsEmptyMsg");
    if (!el) { return; }
    if (empty) { empty.style.display = "none"; }
    el.innerHTML = [1, 2, 3].map(function () {
      return '<div class="flex flex-col items-center gap-1.5 text-center" style="width:5.2rem">' +
        '<div class="sk sk-circle" style="width:3.5rem;height:3.5rem"></div>' +
        '<div class="sk" style="width:3.6rem;height:0.55rem"></div>' +
        '<div class="sk" style="width:2.5rem;height:0.5rem"></div>' +
      '</div>';
    }).join("");
  }

  function renderOfflineFriends(myUid) {
    var el = document.getElementById("friendsList");
    var empty = document.getElementById("friendsEmptyMsg");
    if (!el || !window.FirestoreService || !window.FirestoreService.getCachedFriends) { return; }

    var cachedFriends = window.FirestoreService.getCachedFriends(myUid);
    if (!cachedFriends || cachedFriends.length === 0) {
      el.innerHTML = "";
      if (empty) {
        empty.textContent = "\uD83D\uDC3E Offline and no cached friends yet.";
        empty.style.display = "";
      }
      return;
    }

    if (empty) { empty.style.display = "none"; }
    el.innerHTML = cachedFriends.map(function (f) {
      var name = f.displayName || "Friend";
      var initial = (f.firstName || name || "F").charAt(0).toUpperCase();
      var avatar = String(f.avatar || "").trim();
      return (
        '<a class="flex flex-col items-center gap-1.5 text-center no-underline" style="width:5.2rem;opacity:0.78" href="profile.html?uid=' + encodeURIComponent(f.uid) + '" title="' + escapeHtml(name) + '">' +
          (avatar
            ? '<div class="grid h-14 w-14 place-items-center rounded-full text-[1.6rem]" style="background:#64748b">' + escapeHtml(avatar) + '</div>'
            : '<div class="grid h-14 w-14 place-items-center rounded-full font-black text-white text-lg" style="background:#64748b">' + escapeHtml(initial) + '</div>') +
          '<p class="text-xs font-extrabold truncate" style="color:#475569;max-width:4rem">' + escapeHtml(name.split(" ")[0]) + '</p>' +
          '<p class="text-xs font-bold" style="color:#94a3b8">\u26A1 cached</p>' +
        '</a>'
      );
    }).join("");
  }

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
    var fullName = getDisplayNameFromUser(user);
    var initial  = (fullName || "U").charAt(0).toUpperCase();
    var avatar = String(user.avatar || "").trim();

    var initEl  = document.getElementById("profileInitial");
    var lvBadge = document.getElementById("profileLevelBadge");
    var nameEl  = document.getElementById("profileName");
    var lvName  = document.getElementById("profileLevelName");
    var joinedEl = document.getElementById("profileJoined");
    var senEl   = document.getElementById("profileSentimos");

    if (initEl)   {
      initEl.textContent = avatar || initial;
      initEl.style.fontSize = avatar ? "2.25rem" : "1.9rem";
      initEl.style.lineHeight = "1";
    }
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

  window.addEventListener("pagehide", clearSocialSubscriptions);
  window.addEventListener("beforeunload", clearSocialSubscriptions);

  // ── Friends UI (own profile) ──────────────────────────────────

  function bindFriendsRealtime(myUid) {
    if (!window.FirestoreService || !myUid) { return; }

    clearSocialSubscriptions();

    if (window.FirestoreService.onFriendRequestsChange) {
      addSocialSubscription(window.FirestoreService.onFriendRequestsChange(myUid, function () {
        if (navigator.onLine === false) { return; }
        loadFriendRequests(myUid, false);
      }));
    }

    if (window.FirestoreService.onFriendsChange) {
      addSocialSubscription(window.FirestoreService.onFriendsChange(myUid, function () {
        if (navigator.onLine === false) { return; }
        loadFriendsList(myUid, false);
      }));
    }
  }

  function bindFriendsNetworkState(myUid) {
    if (friendsNetworkBound) { return; }
    friendsNetworkBound = true;

    function syncOfflineUi() {
      var isOffline = navigator.onLine === false;
      setFriendsOfflineBannerVisible(isOffline);
      if (isOffline) {
        renderOfflineFriends(myUid);
      }
    }

    window.addEventListener("offline", syncOfflineUi);
    window.addEventListener("online", function () {
      setFriendsOfflineBannerVisible(false);
      if (window.FirestoreService) {
        Promise.all([loadFriendRequests(myUid, false), loadFriendsList(myUid, false)]).catch(function () {});
      }
    });

    var retryBtn = document.getElementById("friendsOfflineRetry");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        if (navigator.onLine === false) {
          syncOfflineUi();
          return;
        }
        setFriendsOfflineBannerVisible(false);
        Promise.all([loadFriendRequests(myUid, false), loadFriendsList(myUid, false)]).catch(function () {});
      });
    }

    syncOfflineUi();
  }

  function initQrModal(myUid) {
    var qrBtn = document.getElementById("friendCodeQrBtn");
    var modal = document.getElementById("friendQrModal");
    var qrHost = document.getElementById("friendQrCode");
    var codeLabel = document.getElementById("friendQrCodeValue");
    var closeBtn = document.getElementById("friendQrClose");
    var copyBtn = document.getElementById("friendQrCopyCode");
    if (!qrBtn || !modal || !qrHost || !codeLabel) { return; }

    function getShareLink(friendCode) {
      var hasHttpOrigin = /^https?:/i.test(window.location.protocol || "");
      var base = hasHttpOrigin ? window.location.origin : "https://sugbocents.web.app";
      return base.replace(/\/$/, "") + "/index.html?addFriend=" + encodeURIComponent(friendCode);
    }

    function closeModal() {
      modal.style.display = "none";
      modal.classList.add("hidden");
    }

    qrBtn.addEventListener("click", function () {
      var selfUser = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      var friendCode = (selfUser && selfUser.friendCode) ? selfUser.friendCode : myUid;
      if (!friendCode) { return; }

      codeLabel.textContent = friendCode;
      qrHost.innerHTML = "";

      if (window.QRCode) {
        new window.QRCode(qrHost, {
          text: getShareLink(friendCode),
          width: 280,
          height: 280,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : undefined
        });
      }

      modal.style.display = "flex";
      modal.classList.remove("hidden");
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }
    modal.addEventListener("click", function (evt) {
      if (evt.target === modal) { closeModal(); }
    });
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var toCopy = codeLabel.textContent || "";
        if (!toCopy) { return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(toCopy).then(function () {
            copyBtn.textContent = "Copied ✓";
            setTimeout(function () { copyBtn.textContent = "Copy code"; }, 1800);
          });
          return;
        }
        var ta = document.createElement("textarea");
        ta.value = toCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copyBtn.textContent = "Copied ✓";
        setTimeout(function () { copyBtn.textContent = "Copy code"; }, 1800);
      });
    }
  }

  function consumePendingAddCode(myUid) {
    try {
      var pending = sessionStorage.getItem(ADD_FRIEND_SESSION_KEY);
      if (!pending) {
        var params = new URLSearchParams(window.location.search || "");
        pending = String(params.get("addFriend") || "").trim();
      }
      if (!pending) { return; }
      sessionStorage.removeItem(ADD_FRIEND_SESSION_KEY);
      if (window.location.search && window.history && window.history.replaceState) {
        var cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }
      var input = document.getElementById("friendAddInput");
      if (input) {
        input.value = pending;
      }
      setTimeout(function () {
        handleSendRequest(myUid, pending);
      }, 40);
    } catch (_) {}
  }

  function initFriendSearch(myUid) {
    var input = document.getElementById("friendSearchInput");
    var results = document.getElementById("friendSearchResults");
    if (!input || !results || !window.FirestoreService) { return; }

    var timer = null;
    var searchToken = 0;

    function hideResults() {
      results.style.display = "none";
      results.innerHTML = "";
    }

    function getMyDisplayName() {
      var user = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      return user ? getDisplayNameFromUser(user) : "Friend";
    }

    async function renderResults(query) {
      if (!window.FirestoreService.searchUsersByName) { return; }
      var token = ++searchToken;
      results.style.display = "block";
      results.innerHTML = '<div style="padding:0.75rem 0.85rem;font-size:0.78rem;font-weight:700;color:#64748b">Searching…</div>';

      var people = await window.FirestoreService.searchUsersByName(query, myUid);
      if (token !== searchToken) { return; }

      if (!people || people.length === 0) {
        results.innerHTML = '<div style="padding:0.75rem 0.85rem;font-size:0.78rem;font-weight:700;color:#64748b">No one found. Try their friend code instead.</div>';
        return;
      }

      var statusRows = await Promise.all(people.map(async function (p) {
        var status = await window.FirestoreService.getFriendStatus(myUid, p.uid);
        return { person: p, status: status };
      }));
      if (token !== searchToken) { return; }

      results.innerHTML = statusRows.map(function (row) {
        var p = row.person;
        var name = p.displayName || "Friend";
        var code = p.friendCode || "No code";
        var avatar = String(p.avatar || "").trim();
        var initial = (name || "F").charAt(0).toUpperCase();
        var actionLabel = "Add";
        var action = "add";
        var disabled = "";
        if (row.status === "friend") {
          actionLabel = "Friends ✓";
          action = "none";
          disabled = "disabled";
        } else if (row.status === "pending_sent") {
          actionLabel = "Pending";
          action = "none";
          disabled = "disabled";
        } else if (row.status === "pending_received") {
          actionLabel = "Accept";
          action = "accept";
        }

        return (
          '<div class="friend-search-row" style="display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0.65rem;border-bottom:1px solid #f2ede2">' +
            (avatar
              ? '<div style="width:2.1rem;height:2.1rem;border-radius:9999px;background:#164f33;display:grid;place-items:center;font-size:1.15rem">' + escapeHtml(avatar) + '</div>'
              : '<div style="width:2.1rem;height:2.1rem;border-radius:9999px;background:#164f33;color:#fff;display:grid;place-items:center;font-size:0.82rem;font-weight:900">' + escapeHtml(initial) + '</div>') +
            '<div style="flex:1;min-width:0">' +
              '<p style="margin:0;font-size:0.82rem;font-weight:800;color:#102b1d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(name) + '</p>' +
              '<p style="margin:0.1rem 0 0;font-size:0.72rem;font-weight:700;color:#6b756c">' + escapeHtml(code) + '</p>' +
            '</div>' +
            '<button type="button" class="friend-search-action" data-action="' + action + '" data-uid="' + escapeHtml(p.uid) + '" data-name="' + escapeHtml(name) + '" ' + disabled + ' style="border:' + (disabled ? '1px solid #d8d1bd' : '0') + ';background:' + (disabled ? '#fff' : '#164f33') + ';color:' + (disabled ? '#617063' : '#fff') + ';border-radius:9999px;padding:0.38rem 0.7rem;font-size:0.72rem;font-weight:800">' + actionLabel + '</button>' +
          '</div>'
        );
      }).join("");

      results.querySelectorAll(".friend-search-action").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var action = btn.getAttribute("data-action") || "";
          var targetUid = btn.getAttribute("data-uid") || "";
          var targetName = btn.getAttribute("data-name") || "Friend";
          if (!targetUid || action === "none") { return; }

          btn.disabled = true;
          if (action === "accept") {
            try {
              await window.FirestoreService.acceptFriendRequest(myUid, targetUid, targetName, getMyDisplayName());
              await Promise.all([loadFriendRequests(myUid, false), loadFriendsList(myUid, false)]);
              renderResults(input.value.trim());
              return;
            } catch (_) {
              btn.disabled = false;
              return;
            }
          }

          try {
            var sendResult = await window.FirestoreService.sendFriendRequest(myUid, targetUid, getMyDisplayName());
            if (!sendResult || !sendResult.ok) {
              btn.disabled = false;
              return;
            }
            setAddStatus("Request sent", "ok");
            renderResults(input.value.trim());
          } catch (_) {
            btn.disabled = false;
          }
        });
      });
    }

    input.addEventListener("input", function () {
      var value = String(input.value || "").trim();
      if (timer) { clearTimeout(timer); }
      if (value.length < 2) {
        hideResults();
        return;
      }
      timer = setTimeout(function () {
        renderResults(value).catch(function () {
          results.style.display = "block";
          results.innerHTML = '<div style="padding:0.75rem 0.85rem;font-size:0.78rem;font-weight:700;color:#b91c1c">Could not search right now.</div>';
        });
      }, 300);
    });

    document.addEventListener("click", function (evt) {
      if (evt.target === input || results.contains(evt.target)) { return; }
      hideResults();
    });
  }

  async function loadFriendsUI() {
    var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
    var myUid   = session && session.userId ? session.userId : null;
    if (!myUid) { return; }

    // Show friend code (NAME#NNNN) — fallback to raw UID for legacy users
    var codeEl = document.getElementById("friendCodeValue");
    if (codeEl) {
      var selfUser = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      var displayCode = (selfUser && selfUser.friendCode) ? selfUser.friendCode : myUid;
      // Capitalise the name portion for display (carlos#4821 → Carlos#4821)
      displayCode = displayCode.replace(/^([a-z])/i, function (c) { return c.toUpperCase(); });
      codeEl.textContent = displayCode;
    }

    // Copy button — copy the friendly code, not the raw UID
    var copyBtn = document.getElementById("friendCodeCopy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var selfUser = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
        var codeToCopy = (selfUser && selfUser.friendCode) ? selfUser.friendCode : myUid;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(codeToCopy).then(function () {
            copyBtn.textContent = "\u2713 Copied!";
            setTimeout(function () { copyBtn.textContent = "\uD83D\uDCCB Copy"; }, 2000);
          });
        } else {
          // Fallback
          var ta = document.createElement("textarea");
          ta.value = codeToCopy;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          copyBtn.textContent = "\u2713 Copied!";
          setTimeout(function () { copyBtn.textContent = "\uD83D\uDCCB Copy"; }, 2000);
        }
      });
    }

    initQrModal(myUid);

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

    initFriendSearch(myUid);
    consumePendingAddCode(myUid);

    ensureFriendsOfflineBanner();
    bindFriendsNetworkState(myUid);
    bindFriendsRealtime(myUid);

    if (navigator.onLine === false) {
      setFriendsOfflineBannerVisible(true);
      renderOfflineFriends(myUid);
      return;
    }

    setFriendsOfflineBannerVisible(false);
    await Promise.all([loadFriendRequests(myUid, true), loadFriendsList(myUid, true)]).catch(function (err) { console.warn("[profile] loadFriendsUI error:", err); });
    loadSentRequests(myUid, true);
    bindSentRequestsRealtime(myUid);
  }

  function setAddStatus(msg, type) {
    var el = document.getElementById("friendAddStatus");
    if (!el) { return; }
    el.textContent = msg;
    el.className = "friend-add-status" + (type === "ok" ? " friend-add-status--ok" : type === "error" ? " friend-add-status--error" : "");
  }

  function setAddButtonBusy(label, busy) {
    var form = document.getElementById("friendAddForm");
    if (!form) { return; }
    var btn = form.querySelector("button[type=\"submit\"]");
    if (!btn) { return; }

    var defaultLabel = btn.getAttribute("data-default-label");
    if (!defaultLabel) {
      defaultLabel = btn.textContent || "Add";
      btn.setAttribute("data-default-label", defaultLabel);
    }

    if (busy) {
      btn.disabled = true;
      btn.textContent = label || "Working...";
      btn.style.opacity = "0.75";
      btn.style.cursor = "not-allowed";
      return;
    }

    btn.disabled = false;
    btn.textContent = defaultLabel;
    btn.style.opacity = "";
    btn.style.cursor = "";
  }

  function showConfirmDialog(title, message, confirmLabel) {
    return new Promise(function (resolve) {
      var isDark = document.documentElement.dataset.darkMode === "true" || document.documentElement.classList.contains("dark-mode");
      var overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,0.42);display:grid;place-items:center;padding:1rem";

      var panelBg = isDark ? "#0f172a" : "#ffffff";
      var panelText = isDark ? "#e2e8f0" : "#102b1d";
      var panelSub = isDark ? "#94a3b8" : "#617063";

      overlay.innerHTML =
        '<div role="dialog" aria-modal="true" style="width:min(100%,20rem);border-radius:1rem;background:' + panelBg + ';padding:1.25rem;box-shadow:0 16px 40px rgba(15,23,42,0.25)">' +
          '<p style="margin:0 0 0.5rem;font-size:1rem;font-weight:800;color:' + panelText + '">' + escapeHtml(title) + '</p>' +
          '<p style="margin:0 0 1rem;font-size:0.875rem;font-weight:600;color:' + panelSub + ';line-height:1.4">' + escapeHtml(message) + '</p>' +
          '<div style="display:flex;justify-content:flex-end;gap:0.5rem">' +
            '<button type="button" data-confirm-cancel style="border:1px solid #cbd5e1;background:transparent;color:' + panelText + ';border-radius:9999px;padding:0.5rem 0.9rem;font-size:0.8rem;font-weight:800">Cancel</button>' +
            '<button type="button" data-confirm-ok style="border:0;background:#c0392b;color:#fff;border-radius:9999px;padding:0.5rem 1rem;font-size:0.8rem;font-weight:900">' + escapeHtml(confirmLabel || "Confirm") + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      var done = false;
      function finalize(result) {
        if (done) { return; }
        done = true;
        document.removeEventListener("keydown", onKeyDown);
        if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
        resolve(result);
      }

      function onKeyDown(evt) {
        if (evt.key === "Escape") { finalize(false); }
      }

      document.addEventListener("keydown", onKeyDown);
      overlay.addEventListener("click", function (evt) {
        if (evt.target === overlay) { finalize(false); }
      });

      var cancelBtn = overlay.querySelector("[data-confirm-cancel]");
      var okBtn = overlay.querySelector("[data-confirm-ok]");
      if (cancelBtn) { cancelBtn.addEventListener("click", function () { finalize(false); }); }
      if (okBtn) {
        okBtn.addEventListener("click", function () { finalize(true); });
        okBtn.focus();
      }
    });
  }

  async function handleSendRequest(myUid, rawOverride) {
    var input = document.getElementById("friendAddInput");
    if (!input && !rawOverride) { return; }
    var rawInput = String(rawOverride || (input ? input.value : "") || "").trim();
    if (!rawInput) { setAddStatus("Please enter a friend code.", "error"); return; }
    if (!window.FirestoreService) { setAddStatus("Firebase not available.", "error"); return; }

    // Resolve NAME#NNNN shortcode to UID before proceeding
    var targetUid = rawInput;
    if (/^[a-zA-Z]+#\d{4}$/.test(rawInput)) {
      setAddStatus("Looking up code\u2026", "");
      var resolved = await window.FirestoreService.findUserByCode(rawInput);
      if (!resolved || !resolved.uid) {
        setAddStatus("No user found with that code. Double-check and try again.", "error");
        return;
      }
      targetUid = resolved.uid;
    }

    if (targetUid === myUid) { setAddStatus("That's your own code!", "error"); return; }

    setAddStatus("Sending...", "");
    setAddButtonBusy("Sending...", true);
    try {
      var status = await window.FirestoreService.getFriendStatus(myUid, targetUid);
      if (status === "friend")          { setAddStatus("You're already friends!", "ok"); return; }
      if (status === "pending_sent")    { setAddStatus("Request already sent.", ""); return; }
      if (status === "pending_received") {
        setAddButtonBusy("Accepting...", true);
        var user = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
        var myName = getDisplayNameFromUser(user);
        var profile = await window.FirestoreService.getPublicProfile(targetUid);
        var theirName = (profile && profile.displayName) || "Friend";
        await window.FirestoreService.acceptFriendRequest(myUid, targetUid, theirName, myName);
        await Promise.all([loadFriendRequests(myUid, false), loadFriendsList(myUid, false)]);
        setAddStatus("You're now friends!", "ok");
        if (input) { input.value = ""; }
        return;
      }

      var user2 = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      var myName2 = user2 ? [user2.firstName, user2.lastName].filter(Boolean).join(" ") : "Friend";
      var requestResult = await window.FirestoreService.sendFriendRequest(myUid, targetUid, myName2);
      if (!requestResult || requestResult.ok !== true) {
        if (requestResult && (requestResult.error === "already_pending" || requestResult.error === "incoming_pending")) {
          setAddStatus(requestResult.message || "Request is already pending.", "");
        } else {
          setAddStatus("Couldn't send request. Check the code and try again.", "error");
        }
        return;
      }

      setAddStatus("Request sent", "ok");
      if (input) { input.value = ""; }
    } catch (err) {
      setAddStatus("Couldn't send request. Check the code and try again.", "error");
    } finally {
      setAddButtonBusy("", false);
    }
  }

  async function loadFriendRequests(myUid, showLoading) {
    if (!window.FirestoreService) { return; }
    var el = document.getElementById("friendRequestsList");
    var wrap = document.getElementById("friendRequestsWrap");
    if (!el) { return; }

    if (showLoading) {
      renderRequestsLoadingState();
    }

    var requests = [];
    try {
      requests = await window.FirestoreService.getFriendRequests(myUid);
    } catch (e) {
      console.warn("[profile] getFriendRequests error:", e);
      if (wrap && el) {
        wrap.style.display = "";
        el.innerHTML = '<button type="button" class="friend-retry-chip" style="display:block;width:100%;padding:0.5rem 0.75rem;border-radius:0.75rem;border:1px solid #fde68a;background:#fef3c7;color:#92400e;font-size:0.78rem;font-weight:700;text-align:left;cursor:pointer">&#x26A0;&#xFE0F; Couldn\u2019t load requests \u2014 tap to retry</button>';
        var retryBtn = el.querySelector(".friend-retry-chip");
        if (retryBtn) { retryBtn.addEventListener("click", function () { loadFriendRequests(myUid, true); }); }
      }
      return;
    }

    if (!requests || requests.length === 0) {
      if (wrap) { wrap.style.display = "none"; }
      return;
    }
    if (wrap) { wrap.style.display = ""; }

    var user = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
    var myName = getDisplayNameFromUser(user);

    el.innerHTML = requests.map(function (r) {
      var requesterUid = r.requesterId || r.uid || "";
      var name = r.displayName || requesterUid || "Someone";
      var initial = name.charAt(0).toUpperCase();
      return (
        '<div class="friend-request-card" data-uid="' + escapeHtml(requesterUid) + '">' +
          '<div class="friend-request-avatar">' + escapeHtml(initial) + '</div>' +
          '<div class="friend-request-body">' +
            '<div class="friend-request-name">' + escapeHtml(name) + '</div>' +
            '<div class="friend-request-uid">' + escapeHtml(requesterUid) + '</div>' +
          '</div>' +
          '<div class="friend-request-actions">' +
            '<button class="friend-accept-btn" type="button" data-uid="' + escapeHtml(requesterUid) + '" data-name="' + escapeHtml(name) + '" data-myname="' + escapeHtml(myName) + '">\u2713</button>' +
            '<button class="friend-decline-btn" type="button" data-uid="' + escapeHtml(requesterUid) + '">\u2715</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    var countEl = document.getElementById("friendRequestsCount");
    if (countEl) {
      if (requests.length > 0) {
        countEl.textContent = String(requests.length);
        countEl.style.display = "";
      } else {
        countEl.style.display = "none";
      }
    }

    el.querySelectorAll(".friend-accept-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var uid = btn.dataset.uid;
        var theirName = btn.dataset.name;
        var myN = btn.dataset.myname;
        btn.disabled = true;
        try {
          await window.FirestoreService.acceptFriendRequest(myUid, uid, theirName, myN);
          await Promise.all([loadFriendRequests(myUid, false), loadFriendsList(myUid, false)]);
          var friendsEl = document.getElementById("friendsList");
          if (friendsEl) {
            var newAvatar = friendsEl.querySelector('a[href*="uid=' + encodeURIComponent(uid) + '"]');
            if (newAvatar) {
              newAvatar.classList.add("friend-accept-bounce");
              setTimeout(function () { newAvatar.classList.remove("friend-accept-bounce"); }, 700);
            }
          }
        } catch (e) {
          btn.disabled = false;
        }
      });
    });

    el.querySelectorAll(".friend-decline-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var uid = btn.dataset.uid;
        var card = btn.closest(".friend-request-card");
        var nameEl = card ? card.querySelector(".friend-request-name") : null;
        var reqName = nameEl ? String(nameEl.textContent || "").trim() : "this user";
        var shouldDecline = await showConfirmDialog(
          "Decline request",
          "Decline request from " + reqName + "? They won't be notified.",
          "Decline"
        );
        if (!shouldDecline) { return; }

        btn.disabled = true;
        try {
          await window.FirestoreService.declineFriendRequest(myUid, uid);
          await loadFriendRequests(myUid, false);
        } catch (e) {
          btn.disabled = false;
        }
      });
    });
  }

  function renderSentRequestEmpty() {
    var wrap    = document.getElementById("sentRequestsWrap");
    var list    = document.getElementById("sentRequestsList");
    var countEl = document.getElementById("sentRequestsCount");
    if (wrap)    { wrap.style.display = "none"; }
    if (list)    { list.innerHTML = ""; }
    if (countEl) { countEl.style.display = "none"; }
  }

  async function loadSentRequests(myUid, showLoading) {
    if (!window.FirestoreService || !window.FirestoreService.getSentRequests) {
      renderSentRequestEmpty();
      return;
    }
    if (navigator.onLine === false) {
      renderSentRequestEmpty();
      return;
    }

    if (showLoading) {
      var skWrap = document.getElementById("sentRequestsWrap");
      var skList = document.getElementById("sentRequestsList");
      if (skWrap && skList) {
        skWrap.style.display = "";
        skList.innerHTML = '<div style="height:2.2rem;border-radius:0.75rem;background:#f0ede6;opacity:0.6"></div>';
      }
    }

    var rows = [];
    try {
      rows = await window.FirestoreService.getSentRequests(myUid);
    } catch (e) {
      console.warn("[profile] getSentRequests error:", e);
      var retryWrap = document.getElementById("sentRequestsWrap");
      var retryList = document.getElementById("sentRequestsList");
      if (retryWrap && retryList) {
        retryWrap.style.display = "";
        retryList.innerHTML = '<button type="button" class="friend-retry-chip" style="display:block;width:100%;padding:0.5rem 0.75rem;border-radius:0.75rem;border:1px solid #fde68a;background:#fef3c7;color:#92400e;font-size:0.78rem;font-weight:700;text-align:left;cursor:pointer">&#x26A0;&#xFE0F; Couldn\u2019t load sent requests \u2014 tap to retry</button>';
        var retryBtn = retryList.querySelector(".friend-retry-chip");
        if (retryBtn) { retryBtn.addEventListener("click", function () { loadSentRequests(myUid, true); }); }
      }
      return;
    }

    var wrap    = document.getElementById("sentRequestsWrap");
    var list    = document.getElementById("sentRequestsList");
    var countEl = document.getElementById("sentRequestsCount");
    if (!wrap || !list) { return; }

    if (!rows || rows.length === 0) {
      // Option C: show placeholder only when incoming-requests section is also empty
      var incomingWrap = document.getElementById("friendRequestsWrap");
      var hasIncoming = incomingWrap && incomingWrap.style.display !== "none";
      if (!hasIncoming && wrap && list) {
        wrap.style.display = "";
        list.innerHTML = '<p style="padding:0.3rem 0;font-size:0.75rem;font-weight:600;color:#a3a8a4">No pending sent requests.</p>';
        if (countEl) { countEl.style.display = "none"; }
      } else {
        renderSentRequestEmpty();
      }
      return;
    }

    wrap.style.display = "";
    if (countEl) {
      countEl.textContent = String(rows.length);
      countEl.style.display = "";
    }

    list.innerHTML = rows.map(function (row) {
      var name    = String(row.targetDisplayName || "Friend");
      var initial = (name.charAt(0) || "?").toUpperCase();
      var safeUid = escapeHtml(row.targetUid);
      return (
        '<div class="flex items-center gap-3 rounded-2xl px-3 py-2" style="background:#faf8f1;outline:1px solid #ded7c6">' +
          '<div class="grid h-9 w-9 place-items-center rounded-full text-sm font-black text-white" style="background:#6b756c">' + escapeHtml(initial) + '</div>' +
          '<div class="min-w-0 flex-1">' +
            '<p class="truncate text-sm font-extrabold" style="color:#102b1d">' + escapeHtml(name) + '</p>' +
            '<p class="text-[0.7rem] font-bold" style="color:#617063">Waiting for response\u2026</p>' +
          '</div>' +
          '<button type="button" class="sent-cancel-btn shrink-0 rounded-full px-3 py-1.5 text-xs font-black" data-uid="' + safeUid + '" data-name="' + escapeHtml(name) + '" style="background:#ffffff;color:#dc2626;border:1px solid #f3c4c4">Cancel</button>' +
        '</div>'
      );
    }).join("");

    list.querySelectorAll(".sent-cancel-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var uid  = btn.dataset.uid;
        var name = btn.dataset.name || "Request";
        if (!uid) { return; }
        btn.disabled = true;
        btn.textContent = "Cancelling\u2026";
        try {
          var result = await window.FirestoreService.cancelSentRequest(myUid, uid);
          if (result && result.ok) {
            setAddStatus("Cancelled request to " + name + ".", "ok");
            return;
          }
          setAddStatus("Couldn\u2019t cancel right now. Try again.", "error");
          btn.disabled = false;
          btn.textContent = "Cancel";
        } catch (_) {
          setAddStatus("Couldn\u2019t cancel right now. Try again.", "error");
          btn.disabled = false;
          btn.textContent = "Cancel";
        }
      });
    });
  }

  function bindSentRequestsRealtime(myUid) {
    if (!window.FirestoreService || !window.FirestoreService.onSentRequestsChange) { return; }
    var unsubscribe = window.FirestoreService.onSentRequestsChange(myUid, function () {
      loadSentRequests(myUid, false);
    });
    addSocialSubscription(unsubscribe);
  }

  function closeFriendActionSheets() {
    var el = document.getElementById("friendsList");
    if (!el) { return; }
    el.querySelectorAll(".friend-action-sheet").forEach(function (s) {
      s.style.display = "none";
    });
  }

  var _friendMenuDismissBound = false;

  async function loadFriendsList(myUid, showLoading) {
    if (!window.FirestoreService) { return; }
    var el = document.getElementById("friendsList");
    var empty = document.getElementById("friendsEmptyMsg");
    if (!el) { return; }

    if (showLoading) {
      renderFriendsLoadingState();
    }

    if (navigator.onLine === false) {
      setFriendsOfflineBannerVisible(true);
      renderOfflineFriends(myUid);
      return;
    }

    setFriendsOfflineBannerVisible(false);

    var friends = [];
    try {
      friends = await window.FirestoreService.getFriends(myUid);
    } catch (e) {
      console.warn("[profile] getFriends error:", e);
      if (el) {
        el.innerHTML = '<button type="button" class="friend-retry-chip" style="display:block;width:100%;padding:0.5rem 0.75rem;border-radius:0.75rem;border:1px solid #fde68a;background:#fef3c7;color:#92400e;font-size:0.78rem;font-weight:700;text-align:left;cursor:pointer">&#x26A0;&#xFE0F; Couldn\u2019t load friends \u2014 tap to retry</button>';
        var retryBtn = el.querySelector(".friend-retry-chip");
        if (retryBtn) { retryBtn.addEventListener("click", function () { loadFriendsList(myUid, true); }); }
      }
      return;
    }

    if (!friends || friends.length === 0) {
      el.innerHTML = "";
      if (empty) {
        empty.textContent = "\uD83D\uDC3E No friends yet \u2014 share your code below.";
        empty.style.display = "";
      }
      var inlineElZ = document.getElementById("friendsCountInline");
      if (inlineElZ) { inlineElZ.style.display = "none"; }
      return;
    }
    if (empty) { empty.style.display = "none"; }

    var inlineEl = document.getElementById("friendsCountInline");
    if (inlineEl) {
      inlineEl.textContent = "\u00B7 " + friends.length;
      inlineEl.style.display = "";
    }

    el.innerHTML = friends.map(function (f) {
      var name = f.displayName || [f.firstName, f.lastName].filter(Boolean).join(" ") || "Friend";
      var initial = (name || "F").charAt(0).toUpperCase();
      var avatar = String(f.avatar || "").trim();
      var streak = f.streak || 0;
      return (
        '<div class="relative flex flex-col items-center gap-1.5 text-center" style="width:5.2rem">' +
          '<a class="flex flex-col items-center gap-1.5 text-center no-underline" href="profile.html?uid=' + encodeURIComponent(f.uid) + '" title="' + escapeHtml(name) + '">' +
            (avatar
              ? '<div class="grid h-14 w-14 place-items-center rounded-full text-[1.7rem]" style="background:#164f33;box-shadow:0 2px 8px rgba(22,79,51,0.25)">' + escapeHtml(avatar) + '</div>'
              : '<div class="grid h-14 w-14 place-items-center rounded-full font-black text-white text-lg" style="background:#164f33;box-shadow:0 2px 8px rgba(22,79,51,0.25)">' + escapeHtml(initial) + '</div>') +
            '<p class="text-xs font-extrabold truncate" style="color:#102b1d;max-width:4rem">' + escapeHtml(name.split(" ")[0]) + '</p>' +
            '<p class="text-xs font-bold" style="color:#F97316">\uD83D\uDD25 ' + streak + '</p>' +
          '</a>' +
          '<button type="button" class="friend-menu-btn" data-uid="' + escapeHtml(f.uid) + '" data-name="' + escapeHtml(name) + '" aria-label="More actions for ' + escapeHtml(name) + '" style="position:absolute;top:-0.1rem;right:-0.1rem;width:1.8rem;height:1.8rem;border-radius:9999px;border:1px solid #d8d1bd;background:#fff;color:#64748b;font-size:1rem;font-weight:900;line-height:1;display:grid;place-items:center">\u22EF</button>' +
          '<div class="friend-action-sheet" style="display:none;position:absolute;top:2rem;right:0;min-width:9.2rem;max-width:calc(100vw - 1.5rem);background:#fff;border:1px solid #e2e8f0;border-radius:0.75rem;box-shadow:0 16px 36px rgba(15,23,42,0.18);z-index:20;padding:0.25rem">' +
            '<button type="button" class="friend-action-view" data-uid="' + escapeHtml(f.uid) + '" style="display:block;width:100%;border:0;background:transparent;text-align:left;padding:0.45rem 0.55rem;border-radius:0.5rem;font-size:0.85rem;font-weight:700;color:#334155">View profile</button>' +
            '<button type="button" class="friend-action-remove" data-uid="' + escapeHtml(f.uid) + '" data-name="' + escapeHtml(name) + '" style="display:block;width:100%;border:0;background:transparent;text-align:left;padding:0.45rem 0.55rem;border-radius:0.5rem;font-size:0.85rem;font-weight:800;color:#c0392b">Remove friend</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    if (!_friendMenuDismissBound) {
      document.addEventListener("click", function () {
        closeFriendActionSheets();
      });
      _friendMenuDismissBound = true;
    }

    el.querySelectorAll(".friend-action-sheet").forEach(function (sheet) {
      sheet.addEventListener("click", function (evt) {
        evt.stopPropagation();
      });
    });

    el.querySelectorAll(".friend-menu-btn").forEach(function (btn) {
      btn.addEventListener("click", function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var parent = btn.parentNode;
        if (!parent) { return; }
        var sheet = parent.querySelector(".friend-action-sheet");
        if (!sheet) { return; }
        var wasOpen = sheet.style.display === "block";
        closeFriendActionSheets();
        sheet.style.display = wasOpen ? "none" : "block";
      });
    });

    el.querySelectorAll(".friend-action-view").forEach(function (btn) {
      btn.addEventListener("click", function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var uid = btn.dataset.uid;
        closeFriendActionSheets();
        if (uid) { window.location.href = "profile.html?uid=" + encodeURIComponent(uid); }
      });
    });

    el.querySelectorAll(".friend-action-remove").forEach(function (btn) {
      btn.addEventListener("click", async function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        closeFriendActionSheets();

        var uid = btn.dataset.uid;
        var name = btn.dataset.name || "this friend";
        if (!uid) { return; }

        var shouldRemove = await showConfirmDialog(
          "Remove friend",
          "Remove " + name + " from your friends? Their activity will no longer appear in your feed.",
          "Remove"
        );
        if (!shouldRemove) { return; }

        btn.disabled = true;
        try {
          var result = await window.FirestoreService.removeFriend(myUid, uid);
          if (result && result.ok) {
            setAddStatus("Removed " + name + ".", "ok");
            await loadFriendsList(myUid, false);
            return;
          }
          setAddStatus("Couldn't remove friend right now.", "error");
          btn.disabled = false;
        } catch (_) {
          setAddStatus("Couldn't remove friend right now.", "error");
          btn.disabled = false;
        }
      });
    });
  }

  // ── Public profile view ───────────────────────────────────────

  function renderPublicProfileData(profile) {
    // Render public profile fields
    var initEl  = document.getElementById("profileInitial");
    var nameEl  = document.getElementById("profileName");
    var lvBadge = document.getElementById("profileLevelBadge");
    var lvName  = document.getElementById("profileLevelName");
    var joinedEl = document.getElementById("profileJoined");

    var firstName  = profile.firstName || "";
    var lastName   = profile.lastName  || "";
    var fullName   = (profile.displayName) || [firstName, lastName].filter(Boolean).join(" ") || "SugboCents User";
    var initial    = (fullName || "?").charAt(0).toUpperCase();
    var avatar = String(profile.avatar || "").trim();

    if (initEl)  {
      initEl.textContent = avatar || initial;
      initEl.style.fontSize = avatar ? "2.25rem" : "1.9rem";
      initEl.style.lineHeight = "1";
    }
    if (nameEl)  { nameEl.textContent  = fullName; }
    if (lvBadge) { lvBadge.textContent = "Lv " + (profile.level || 1); }
    if (lvName)  { lvName.textContent  = profile.levelName || "Rookie Saver"; }
    if (joinedEl){ joinedEl.textContent = ""; }

    // Stats
    var statStreak = document.getElementById("statStreak");
    var statXp     = document.getElementById("statXp");
    var statLevel  = document.getElementById("statLevel");
    var statBadges = document.getElementById("statBadges");
    if (statStreak) { statStreak.textContent = profile.streak || 0; }
    if (statXp)     { statXp.textContent     = profile.weeklyXP || profile.xp || 0; }
    if (statLevel)  { statLevel.textContent  = profile.questsCompleted || 0; }
    if (statBadges) { statBadges.textContent = profile.weeklyQuestsCompleted || 0; }
  }

  async function refreshPublicProfileFriendButton(myUid, targetUid, profile) {
    var addBtn  = document.getElementById("publicProfileAddBtn");
    if (!addBtn || !myUid || !window.FirestoreService) { return; }

    var fullName = (profile && profile.displayName) || "Friend";
    var status = await window.FirestoreService.getFriendStatus(myUid, targetUid);

    if (status === "friend") {
      addBtn.textContent = "\u2713 Friends";
      addBtn.disabled = true;
      addBtn.onclick = null;
      return;
    }

    if (status === "pending_sent") {
      addBtn.textContent = "Request Sent";
      addBtn.disabled = true;
      addBtn.onclick = null;
      return;
    }

    if (status === "pending_received") {
      addBtn.textContent = "Accept Request";
      addBtn.disabled = false;
      addBtn.onclick = async function () {
        addBtn.disabled = true;
        var user   = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
        var myName = getDisplayNameFromUser(user);
        try {
          await window.FirestoreService.acceptFriendRequest(myUid, targetUid, fullName, myName);
          addBtn.textContent = "\u2713 Friends";
          addBtn.disabled = true;
          addBtn.onclick = null;
        } catch (_) {
          addBtn.disabled = false;
        }
      };
      return;
    }

    addBtn.textContent = "Add Friend";
    addBtn.disabled = false;
    addBtn.onclick = async function () {
      addBtn.disabled = true;
      var user2  = window.StorageAPI && window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      var myName2 = getDisplayNameFromUser(user2);
      try {
        var sendResult = await window.FirestoreService.sendFriendRequest(myUid, targetUid, myName2);
        if (sendResult && sendResult.ok) {
          addBtn.textContent = "Request Sent";
          addBtn.onclick = null;
          return;
        }
        addBtn.disabled = false;
      } catch (_) {
        addBtn.disabled = false;
      }
    };
  }

  async function loadPublicProfile(targetUid) {
    // Hide own-friends UI, show public friend button
    var ownEl = document.getElementById("ownFriendsUI");
    var pubEl = document.getElementById("publicProfileFriendUI");
    var detailsEl = document.getElementById("publicProfileDetailSection");
    if (ownEl) { ownEl.style.display = "none"; }
    if (pubEl) { pubEl.style.display = ""; }
    if (detailsEl) { detailsEl.style.display = ""; }

    publicProfileState.activeTab = "overview";
    publicProfileState.profile = null;
    publicProfileState.entries = [];
    publicProfileState.targetUid = targetUid;
    bindPublicProfileTabs();
    updatePublicProfileTabButtons();
    renderPublicProfileTabContent();

    if (!window.FirestoreService) { render(); return; }

    clearSocialSubscriptions();

    // Resolve Add Friend button state
    var session = window.StorageAPI && window.StorageAPI.getSession ? window.StorageAPI.getSession() : null;
    var myUid   = session && session.userId ? session.userId : null;
    publicProfileState.myUid = myUid;

    var activeProfile = null;

    async function applyProfile(profile) {
      if (!profile) {
        render();
        return;
      }
      activeProfile = profile;
      publicProfileState.profile = profile;
      renderPublicProfileData(profile);
      renderPublicProfileTabContent();
      if (myUid) {
        await refreshPublicProfileFriendButton(myUid, targetUid, profile);
        await loadPublicProfileFeed(myUid, targetUid);
      }
    }

    // Fetch public profile
    var profile = await window.FirestoreService.getPublicProfile(targetUid);
    await applyProfile(profile);

    if (window.FirestoreService.onPublicProfileChange) {
      addSocialSubscription(window.FirestoreService.onPublicProfileChange(targetUid, function (nextProfile) {
        if (!nextProfile) { return; }
        applyProfile(nextProfile).catch(function () {});
      }));
    }

    if (myUid && window.FirestoreService.onFriendsChange) {
      addSocialSubscription(window.FirestoreService.onFriendsChange(myUid, function () {
        if (!activeProfile) { return; }
        refreshPublicProfileFriendButton(myUid, targetUid, activeProfile).catch(function () {});
      }));
    }

    if (myUid && window.FirestoreService.onFriendRequestsChange) {
      addSocialSubscription(window.FirestoreService.onFriendRequestsChange(myUid, function () {
        if (!activeProfile) { return; }
        refreshPublicProfileFriendButton(myUid, targetUid, activeProfile).catch(function () {});
      }));
    }

    if (myUid && window.FirestoreService.onFriendFeedChange) {
      addSocialSubscription(window.FirestoreService.onFriendFeedChange(myUid, function (entries) {
        var filtered = (entries || []).filter(function (entry) {
          var authorUid = String(entry.authorUid || entry.authorId || "");
          return authorUid === String(targetUid);
        }).slice(0, 40);
        publicProfileState.entries = filtered;
        renderPublicProfileTabContent();
      }, 60));
    }
  }

})();

