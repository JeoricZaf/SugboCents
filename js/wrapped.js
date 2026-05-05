/**
 * wrapped.js — Weekly Wrapped Summary Generator
 * Generates gamified weekly stats, patterns, and achievements.
 * Loaded on wrapped.html only (data-page="wrapped")
 */
(function () {
  if (document.body.dataset.page !== "wrapped") { return; }

  // ── Cache Update Listeners ──────────────────────────────────────
  var updateInterval = null;

  // ── Utility Functions ────────────────────────────────────────────
  function formatPhp(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function getDayName(date) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  function getHourPeriod(hour) {
    if (hour < 12) return "Morning (12 AM - 12 PM)";
    if (hour < 17) return "Afternoon (12 PM - 5 PM)";
    if (hour < 21) return "Evening (5 PM - 9 PM)";
    return "Night (9 PM - 12 AM)";
  }

  function getWeekWindow(now) {
    var day = now.getDay();
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((day + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);
    return { start: weekStart, end: weekEnd };
  }

  function formatDateRange(start, end) {
    var formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return formatter.format(start) + " - " + formatter.format(end);
  }

  // Category icon mapping (Material Icons)
  var MATERIAL_ICON_MAP = {
    "transport": "directions_bus",
    "food": "restaurant",
    "groceries": "shopping_cart",
    "education": "school",
    "shopping": "shopping_bag",
    "health": "local_hospital",
    "entertainment": "movie",
    "utilities": "electric_bolt",
    "personal_care": "spa",
    "others": "category"
  };

  function getCategoryIcon(categoryId) {
    return MATERIAL_ICON_MAP[categoryId] || "category";
  }

  // Badge icon mapping (Material Icons)
  var BADGE_ICON_MAP = {
    "bi-pencil-square": "edit",
    "bi-check2-circle": "check_circle",
    "bi-journal-check": "done_all",
    "bi-list-check": "task_alt",
    "bi-fire": "local_fire_department",
    "bi-calendar-check-fill": "event_available",
    "bi-trophy-fill": "emoji_events",
    "bi-check-circle-fill": "verified",
    "bi-piggy-bank": "savings",
    "bi-sunrise": "wb_twilight",
    "bi-moon-stars-fill": "nights_stay",
    "bi-flag-fill": "flag",
    "bi-arrow-up-circle-fill": "trending_up",
    "bi-lightning-charge-fill": "flash_on"
  };

  function getMaterialIcon(bootstrapClass) {
    if (!bootstrapClass) return "emoji_events";
    return BADGE_ICON_MAP[bootstrapClass] || "emoji_events";
  }

  // ── Data Collection ─────────────────────────────────────────────
  function collectWeeklyStats() {
    if (!window.StorageAPI) {
      console.error("StorageAPI not available");
      return null;
    }

    var now = new Date();
    var weekWindow = getWeekWindow(now);
    var allExpenses = window.StorageAPI.getExpenses() || [];
    var categories = window.StorageAPI.getExpenseCategories ? window.StorageAPI.getExpenseCategories() : [];
    var xpInfo = window.StorageAPI.getXpInfo ? window.StorageAPI.getXpInfo() : {};
    var currentStreak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var allAchievements = window.StorageAPI.getAchievements ? window.StorageAPI.getAchievements() : [];
    var unlockedAchievements = allAchievements.filter(function (a) {
      return a.claimed || a.unlockable;
    });

    // Filter expenses for this week
    var weekExpenses = allExpenses.filter(function (expense) {
      var d = new Date(expense.timestamp);
      return d >= weekWindow.start && d < weekWindow.end;
    });

    // Calculate stats
    var totalSpent = weekExpenses.reduce(function (sum, expense) {
      return sum + (Number(expense.amount) || 0);
    }, 0);

    // Category breakdown
    var categoryMap = {};
    weekExpenses.forEach(function (expense) {
      var catId = expense.category || "others";
      if (!categoryMap[catId]) {
        categoryMap[catId] = { amount: 0, count: 0 };
      }
      categoryMap[catId].amount += Number(expense.amount) || 0;
      categoryMap[catId].count += 1;
    });

    // Find top category
    var topCategory = null;
    var topAmount = 0;
    Object.keys(categoryMap).forEach(function (catId) {
      if (categoryMap[catId].amount > topAmount) {
        topAmount = categoryMap[catId].amount;
        topCategory = catId;
      }
    });

    var topCategoryObj = categories.find(function (c) { return c.id === topCategory; }) || categories[0];

    // Find patterns
    var dayMap = {};
    var hourMap = {};
    weekExpenses.forEach(function (expense) {
      var d = new Date(expense.timestamp);
      var dayName = getDayName(d);
      var hour = d.getHours();

      if (!dayMap[dayName]) {
        dayMap[dayName] = 0;
      }
      dayMap[dayName] += 1;

      if (!hourMap[hour]) {
        hourMap[hour] = 0;
      }
      hourMap[hour] += 1;
    });

    // Busiest day
    var busiestDay = "Monday";
    var busiestCount = 0;
    Object.keys(dayMap).forEach(function (day) {
      if (dayMap[day] > busiestCount) {
        busiestCount = dayMap[day];
        busiestDay = day;
      }
    });

    // Peak hour
    var peakHour = 12;
    var peakCount = 0;
    Object.keys(hourMap).forEach(function (hour) {
      if (hourMap[hour] > peakCount) {
        peakCount = hourMap[hour];
        peakHour = parseInt(hour, 10);
      }
    });

    var peakTime = new Date();
    peakTime.setHours(peakHour);
    var peakTimeStr = peakTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    // Average per day
    var daysWithExpenses = Object.keys(dayMap).length || 1;
    var avgPerDay = totalSpent / daysWithExpenses;

    // Calculate XP from this week's logging
    var weeklyXp = weekExpenses.length * 5; // 5 XP per expense

    // Get badges unlocked this week
    var weekBadges = unlockedAchievements.filter(function (badge) {
      var badgeDate = new Date(badge.unlockedAt || badge.timestamp || 0);
      return badgeDate >= weekWindow.start && badgeDate < weekWindow.end;
    });

    return {
      dateRange: formatDateRange(weekWindow.start, weekWindow.end),
      weekWindow: weekWindow,
      totalSpent: totalSpent,
      expenseCount: weekExpenses.length,
      topCategory: topCategoryObj,
      topAmount: topAmount,
      busiestDay: busiestDay,
      peakTime: peakTimeStr,
      avgPerDay: avgPerDay,
      currentStreak: currentStreak,
      weeklyXp: weeklyXp,
      currentLevel: xpInfo.level || 1,
      levelName: xpInfo.levelName || "Rookie Saver",
      xpProgress: {
        current: xpInfo.xp || 0,
        levelMin: xpInfo.xpForLevel || 0,
        levelMax: xpInfo.xpForNext || 100,
        progressPct: xpInfo.progressPct || 0
      },
      weekBadges: weekBadges,
      allUnlockedBadges: unlockedAchievements
    };
  }

  // ── Motivational Messages ────────────────────────────────────────
  function getMotivationalMessage(stats) {
    var messages = [
      {
        text: "You're a money master! Keep this momentum going!",
        subtext: "Your consistent tracking is the first step to financial freedom."
      },
      {
        text: "Every peso counts, and you're counting them all!",
        subtext: "Your awareness is building better financial habits."
      },
      {
        text: "Week after week, you're getting better!",
        subtext: "This dedication will pay off long-term."
      },
      {
        text: "You're crushing your financial goals!",
        subtext: "Keep up the amazing work!"
      },
      {
        text: "Your streak is proof of your commitment!",
        subtext: "One day at a time, one expense at a time."
      }
    ];

    if (stats.expenseCount === 0) {
      return {
        text: "Ready to start tracking?",
        subtext: "Log your first expense and begin your savings journey!"
      };
    }

    if (stats.currentStreak >= 7) {
      return {
        text: "You're on a legendary streak!",
        subtext: "Your consistency is inspiring and your wallet will thank you!"
      };
    }

    if (stats.weeklyXp >= 50) {
      return {
        text: "XP Champion this week!",
        subtext: "Your active engagement is paying off in experience points!"
      };
    }

    var randomMsg = messages[Math.floor(Math.random() * messages.length)];
    return randomMsg;
  }

  // ── DOM Rendering ───────────────────────────────────────────────
  function renderWrapped(stats) {
    // Date range
    var subtitle = document.getElementById("wrappedSubtitle");
    if (subtitle) {
      subtitle.textContent = stats.dateRange;
    }

    // Summary stats
    var totalSpentEl = document.getElementById("totalSpent");
    if (totalSpentEl) {
      totalSpentEl.textContent = formatPhp(stats.totalSpent);
    }

    var expenseCountEl = document.getElementById("expenseCount");
    if (expenseCountEl) {
      expenseCountEl.textContent = stats.expenseCount;
    }

    // Top category
    var topCategoryIconEl = document.getElementById("topCategoryIcon");
    if (topCategoryIconEl) {
      topCategoryIconEl.textContent = getCategoryIcon(stats.topCategory.id);
    }

    var topCategoryNameEl = document.getElementById("topCategoryName");
    if (topCategoryNameEl) {
      topCategoryNameEl.textContent = stats.topCategory.label || "N/A";
    }

    var topCategoryAmountEl = document.getElementById("topCategoryAmount");
    if (topCategoryAmountEl) {
      topCategoryAmountEl.textContent = formatPhp(stats.topAmount);
    }

    // Patterns
    var busiestDayEl = document.getElementById("busiestDay");
    if (busiestDayEl) {
      busiestDayEl.textContent = stats.busiestDay;
    }

    var peakTimeEl = document.getElementById("peakTime");
    if (peakTimeEl) {
      peakTimeEl.textContent = stats.peakTime;
    }

    var avgPerDayEl = document.getElementById("avgPerDay");
    if (avgPerDayEl) {
      avgPerDayEl.textContent = formatPhp(stats.avgPerDay);
    }

    // Gamification
    var currentStreakEl = document.getElementById("currentStreak");
    if (currentStreakEl) {
      var streakText = stats.currentStreak + " day" + (stats.currentStreak !== 1 ? "s" : "");
      currentStreakEl.textContent = streakText;
    }

    var weeklyXpEl = document.getElementById("weeklyXp");
    if (weeklyXpEl) {
      weeklyXpEl.textContent = stats.weeklyXp + " XP";
    }

    // Level
    var currentLevelEl = document.getElementById("currentLevel");
    if (currentLevelEl) {
      currentLevelEl.textContent = stats.currentLevel;
    }

    var levelNameEl = document.getElementById("levelName");
    if (levelNameEl) {
      levelNameEl.textContent = stats.levelName;
    }

    var levelProgressFillEl = document.getElementById("levelProgressFill");
    if (levelProgressFillEl) {
      levelProgressFillEl.style.width = stats.xpProgress.progressPct + "%";
    }

    var progressTextEl = document.getElementById("progressText");
    if (progressTextEl) {
      var current = stats.xpProgress.current;
      var max = stats.xpProgress.levelMax;
      progressTextEl.textContent = current + " / " + max + " XP to next level";
    }

    // Badges
    renderBadges(stats.weekBadges);

    // Motivational message
    var motivation = getMotivationalMessage(stats);
    var motivationalTextEl = document.getElementById("motivationalText");
    if (motivationalTextEl) {
      motivationalTextEl.textContent = motivation.text;
    }

    var motivationalSubtextEl = document.getElementById("motivationalSubtext");
    if (motivationalSubtextEl) {
      motivationalSubtextEl.textContent = motivation.subtext;
    }
  }

  function renderBadges(weekBadges) {
    var badgesContainer = document.getElementById("badgesContainer");
    var badgesTitle = document.getElementById("badgesTitle");

    if (!badgesContainer) return;

    if (weekBadges.length === 0) {
      badgesContainer.innerHTML = '<div class="empty-state"><span class="material-icons" style="font-size: 28px; color: var(--brand-800); margin-bottom: 0.5rem; display: block;">emoji_events</span><p style="margin: 0; font-weight: 600; margin-bottom: 0.25rem;">No badges yet</p><p style="margin: 0; font-size: 0.7rem; color: #7a8a7e;">Keep logging expenses to unlock achievements!</p></div>';
      if (badgesTitle) {
        badgesTitle.textContent = "New Badges Unlocked";
      }
      return;
    }

    if (badgesTitle) {
      badgesTitle.innerHTML = '<span class="material-icons" style="vertical-align: middle; margin-right: 0.5rem;">emoji_events</span>New Badges Unlocked';
    }

    badgesContainer.innerHTML = "";
    weekBadges.forEach(function (badge) {
      var badgeEl = document.createElement("div");
      badgeEl.className = "badge-item";
      var materialIcon = getMaterialIcon(badge.icon);
      badgeEl.innerHTML =
        '<div class="badge-icon">' +
          '<span class="material-icons">' + materialIcon + '</span>' +
        '</div>' +
        '<div class="badge-info">' +
          '<p class="badge-name">' + (badge.name || "Achievement") + '</p>' +
          '<p class="badge-desc">' + (badge.description || "") + '</p>' +
        '</div>';
      badgesContainer.appendChild(badgeEl);
    });
  }

  // ── Share & Download ────────────────────────────────────────────
  function setupActionButtons() {
    var shareBtn = document.getElementById("shareBtn");
    var downloadBtn = document.getElementById("downloadBtn");

    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        var title = "My Week Wrapped";
        var text = "Check out my savings summary for this week! I logged " +
          document.getElementById("expenseCount").textContent + " expenses and earned " +
          document.getElementById("weeklyXp").textContent + ".";
        var url = window.location.href;

        if (navigator.share) {
          navigator.share({
            title: title,
            text: text,
            url: url
          }).catch(function (err) {
            console.log("Share cancelled or failed:", err);
          });
        } else {
          // Fallback: copy to clipboard
          var shareText = title + "\n" + text + "\n" + url;
          navigator.clipboard.writeText(shareText).then(function () {
            alert("Copied to clipboard! Share it anywhere.");
          }).catch(function () {
            alert("Your Week Wrapped summary:\n" + shareText);
          });
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        var wrappedContainer = document.querySelector(".wrapped-container");
        if (!wrappedContainer) {
          alert("Could not find wrapped content to download.");
          return;
        }

        if (typeof html2canvas !== "undefined") {
          html2canvas(wrappedContainer, { scale: 2 }).then(function (canvas) {
            var link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = "SugboCents-Wrapped-" + new Date().toISOString().slice(0, 10) + ".png";
            link.click();
          }).catch(function (err) {
            console.error("Download failed:", err);
            alert("Download feature requires additional setup.");
          });
        } else {
          alert("Right-click on the page and select 'Save as' to download as PDF or image.");
        }
      });
    }
  }

  // ── Sidebar Setup ────────────────────────────────────────────────
  function setupSidebar() {
    // Let app.js handle the active state via data-nav attributes
    // No need to manually set active here
  }

  // ── Dynamic Update Trigger ──────────────────────────────────────
  function startAutoUpdate() {
    // Update stats every 2 seconds for real-time reflection
    updateInterval = setInterval(function () {
      var stats = collectWeeklyStats();
      if (stats) {
        renderWrapped(stats);
      }
    }, 2000);
  }

  function stopAutoUpdate() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    var stats = collectWeeklyStats();

    if (stats) {
      renderWrapped(stats);
      setupActionButtons();
      setupSidebar();
      startAutoUpdate();
    } else {
      console.error("Failed to collect wrapped stats");
    }
  }

  // Cleanup on page unload
  window.addEventListener("beforeunload", stopAutoUpdate);
  window.addEventListener("pagehide", stopAutoUpdate);

  // Wait for DOM to be fully ready and StorageAPI to be available
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }

})();
