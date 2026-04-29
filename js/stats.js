(function () {
  // ── Color palette ─────────────────────────────────────────
  var CATEGORY_COLORS = {
    "transport": "#d8efe2",
    "food": "#ffedd5",
    "groceries": "#d1fae5",
    "education": "#f3e8ff",
    "shopping": "#fce7f3",
    "health": "#fee2e2",
    "entertainment": "#fef3c7",
    "utilities": "#dbeafe",
    "personal_care": "#ede9fe",
    "others": "#e2e8f0"
  };

  var DEFAULT_COLORS = [
    "#d8efe2", "#ffedd5", "#d1fae5", "#f3e8ff",
    "#fce7f3", "#fee2e2", "#fef3c7", "#dbeafe",
    "#ede9fe", "#e2e8f0"
  ];

  // ── helpers ─────────────────────────────────────────────
  function formatPhp(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function capitalizeFirstLetter(str) {
    return String(str || "").charAt(0).toUpperCase() + String(str || "").slice(1);
  }

  function getWeekStartAndEnd() {
    var now = new Date();
    var day = now.getDay();
    var startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((day + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    var endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(0, 0, 0, 0);
    return { start: startOfWeek, end: endOfWeek };
  }

  function getPreviousWeekStartAndEnd() {
    var current = getWeekStartAndEnd();
    var prevStart = new Date(current.start);
    prevStart.setDate(prevStart.getDate() - 7);
    var prevEnd = new Date(current.start);
    prevEnd.setHours(0, 0, 0, 0);
    return { start: prevStart, end: prevEnd };
  }

  function getDayName(index) {
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days[index];
  }

  // ── Get expenses for a date range ─────────────────────────
  function getExpensesForRange(startDate, endDate) {
    if (!window.StorageAPI) {
      return [];
    }
    var user = window.StorageAPI.getCurrentUser();
    if (!user || !Array.isArray(user.expenses)) {
      return [];
    }
    return user.expenses.filter(function (exp) {
      var d = new Date(exp.timestamp);
      return d >= startDate && d < endDate;
    });
  }

  // ── Aggregate by category ────────────────────────────────
  function aggregateByCategory(expenses) {
    var agg = {};
    expenses.forEach(function (exp) {
      var cat = exp.category || "others";
      if (!agg[cat]) {
        agg[cat] = 0;
      }
      agg[cat] += Number(exp.amount) || 0;
    });
    return agg;
  }

  // ── Aggregate by day of week ─────────────────────────────
  function aggregateByDay(expenses, weekStart) {
    var dailyTotals = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    expenses.forEach(function (exp) {
      var d = new Date(exp.timestamp);
      var daysFromStart = Math.floor((d - weekStart) / (1000 * 60 * 60 * 24));
      if (daysFromStart >= 0 && daysFromStart < 7) {
        dailyTotals[daysFromStart] += Number(exp.amount) || 0;
      }
    });
    return dailyTotals;
  }

  // ── Render Summary Metrics ───────────────────────────────
  function renderSummaryMetrics() {
    var metricsContainer = document.getElementById("summaryMetricsContainer");
    if (!metricsContainer) return;

    if (!window.StorageAPI) {
      metricsContainer.innerHTML = '<p>Loading...</p>';
      return;
    }

    var weekRange = getWeekStartAndEnd();
    var thisWeekExpenses = getExpensesForRange(weekRange.start, weekRange.end);
    var budget = window.StorageAPI.getWeeklyBudget();
    var totalSpent = thisWeekExpenses.reduce(function (sum, exp) {
      return sum + (Number(exp.amount) || 0);
    }, 0);
    var remaining = budget - totalSpent;
    var pctSpent = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
    
    // Calculate days left in week
    var now = new Date();
    var endOfWeek = new Date(weekRange.end);
    var daysLeft = Math.ceil((endOfWeek - now) / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(0, daysLeft);

    var avgDaily = thisWeekExpenses.length > 0 ? totalSpent / 7 : 0;

    var html = '<div class="metrics-grid">' +
      '<div class="metric-card">' +
      '<div class="metric-label">This Week Total</div>' +
      '<div class="metric-value">' + formatPhp(totalSpent) + '</div>' +
      '</div>' +
      '<div class="metric-card">' +
      '<div class="metric-label">Budget Remaining</div>' +
      '<div class="metric-value ' + (remaining >= 0 ? 'positive' : 'negative') + '">' + formatPhp(Math.max(0, remaining)) + '</div>' +
      '</div>' +
      '<div class="metric-card">' +
      '<div class="metric-label">Days Left</div>' +
      '<div class="metric-value">' + daysLeft + ' days</div>' +
      '</div>' +
      '<div class="metric-card">' +
      '<div class="metric-label">Daily Average</div>' +
      '<div class="metric-value">' + formatPhp(avgDaily) + '</div>' +
      '</div>' +
      '</div>';

    metricsContainer.innerHTML = html;
  }

  // ── Render Progress Donut Chart ──────────────────────────
  function renderProgressDonut() {
    var container = document.getElementById("progressDonutContainer");
    if (!container) return;

    if (!window.StorageAPI) {
      container.innerHTML = '<p>Loading...</p>';
      return;
    }

    var summary = window.StorageAPI.getBudgetSummary();
    var pct = summary.percentageSpent || 0;
    var budget = summary.weeklyBudget || 0;
    var spent = summary.totalSpentThisWeek || 0;
    var remaining = summary.remaining || 0;

    // Determine color based on percentage
    var fillColor = "#86efac"; // green
    if (pct > 70 && pct <= 90) fillColor = "#fde68a"; // amber
    if (pct > 90) fillColor = "#fca5a5"; // red

    var radius = 45;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - pct / 100);

    var html = '<div class="donut-wrapper">' +
      '<svg viewBox="0 0 120 120" class="donut-svg">' +
      '<circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" stroke-width="8" />' +
      '<circle cx="60" cy="60" r="45" fill="none" stroke="' + fillColor + '" stroke-width="8" ' +
      'stroke-dasharray="' + circumference + '" ' +
      'stroke-dashoffset="' + offset + '" ' +
      'stroke-linecap="round" style="transform: rotate(-90deg); transform-origin: 60px 60px; transition: stroke-dashoffset 0.5s ease;" />' +
      '<text x="60" y="55" text-anchor="middle" font-size="18" font-weight="700" fill="#1f6b46">' + pct + '%</text>' +
      '<text x="60" y="72" text-anchor="middle" font-size="11" fill="#64748b">Spent</text>' +
      '</svg>' +
      '<div class="donut-info">' +
      '<div class="info-row">' +
      '<span class="info-label">Spent:</span> <span class="info-value">' + formatPhp(spent) + '</span>' +
      '</div>' +
      '<div class="info-row">' +
      '<span class="info-label">Remaining:</span> <span class="info-value ' + (remaining >= 0 ? 'positive' : 'negative') + '">' + formatPhp(Math.max(0, remaining)) + '</span>' +
      '</div>' +
      '<div class="info-row">' +
      '<span class="info-label">Budget:</span> <span class="info-value">' + formatPhp(budget) + '</span>' +
      '</div>' +
      '</div>' +
      '</div>';

    container.innerHTML = html;
  }

  // ── Render Category Breakdown ────────────────────────────
  function renderCategoryBreakdown() {
    var container = document.getElementById("categoryBreakdownContainer");
    if (!container) return;

    if (!window.StorageAPI) {
      container.innerHTML = '<p>Loading...</p>';
      return;
    }

    var weekRange = getWeekStartAndEnd();
    var expenses = getExpensesForRange(weekRange.start, weekRange.end);
    var byCategory = aggregateByCategory(expenses);
    var categories = Object.keys(byCategory).sort(function (a, b) {
      return byCategory[b] - byCategory[a];
    });

    if (categories.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="material-icons">pie_chart</span> No expenses this week</div>';
      return;
    }

    var total = Object.keys(byCategory).reduce(function (sum, cat) {
      return sum + byCategory[cat];
    }, 0);

    var budget = window.StorageAPI.getWeeklyBudget() || 0;

    var html = '<div class="category-list">';
    categories.forEach(function (cat) {
      var amount = byCategory[cat];
      var pctOfTotal = total > 0 ? Math.round((amount / total) * 100) : 0;
      var pctOfBudget = budget > 0 ? Math.round((amount / budget) * 100) : 0;
      var color = CATEGORY_COLORS[cat] || DEFAULT_COLORS[categories.indexOf(cat) % DEFAULT_COLORS.length];

      html += '<div class="category-item">' +
        '<div class="category-bar-wrapper">' +
        '<div class="category-color-dot" style="background: ' + color + '"></div>' +
        '<div class="category-info">' +
        '<div class="category-name">' + escapeHtml(capitalizeFirstLetter(cat)) + '</div>' +
        '<div class="category-breakdown">' +
        '<span class="breakdown-amount">' + formatPhp(amount) + '</span>' +
        '<span class="breakdown-pct">' + pctOfTotal + '% of spending</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="category-bar">' +
        '<div class="category-bar-fill" style="width: ' + pctOfTotal + '%; background: ' + color + '"></div>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }

  // ── Render Daily Spending Trend ──────────────────────────
  function renderDailyTrend() {
    var container = document.getElementById("dailyTrendContainer");
    if (!container) return;

    if (!window.StorageAPI) {
      container.innerHTML = '<p>Loading...</p>';
      return;
    }

    var weekRange = getWeekStartAndEnd();
    var expenses = getExpensesForRange(weekRange.start, weekRange.end);
    var dailyTotals = aggregateByDay(expenses, weekRange.start);

    var maxDaily = Math.max.apply(Math, dailyTotals);
    maxDaily = Math.max(maxDaily, 1);

    var avgDaily = dailyTotals.reduce(function (sum, val) {
      return sum + val;
    }, 0) / 7;

    var highestDay = 0;
    var highestAmount = 0;
    dailyTotals.forEach(function (amount, idx) {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestDay = idx;
      }
    });

    // Build sparkline bars
    var svgHeight = 120;
    var svgWidth = 280;
    var barsHtml = '';

    for (var i = 0; i < 7; i++) {
      var pctHeight = (dailyTotals[i] / maxDaily) * 100;
      var barHeight = Math.max(3, (pctHeight / 100) * 90);
      var barY = 110 - barHeight;
      var barX = 10 + (i * 38);
      var barColor = i === highestDay ? "#1f6b46" : "#86efac";

      barsHtml += '<rect x="' + barX + '" y="' + barY + '" width="30" height="' + barHeight + '" fill="' + barColor + '" rx="2" />' +
        '<text x="' + (barX + 15) + '" y="' + (110 + 14) + '" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">' +
        getDayName(i) + '</text>';
    }

    var html = '<div class="trend-wrapper">' +
      '<svg viewBox="0 0 280 130" class="trend-svg" preserveAspectRatio="xMidYMid meet">' +
      barsHtml +
      '</svg>' +
      '<div class="trend-stats">' +
      '<div class="trend-stat">' +
      '<span class="stat-label">Daily Average:</span>' +
      '<span class="stat-value">' + formatPhp(avgDaily) + '</span>' +
      '</div>' +
      '<div class="trend-stat">' +
      '<span class="stat-label">Highest Day:</span>' +
      '<span class="stat-value">' + getDayName(highestDay) + ' (' + formatPhp(highestAmount) + ')</span>' +
      '</div>' +
      '</div>' +
      '</div>';

    container.innerHTML = html;
  }

  // ── Render Week-over-Week Comparison ─────────────────────
  function renderWeekComparison() {
    var container = document.getElementById("weekComparisonContainer");
    if (!container) return;

    if (!window.StorageAPI) {
      container.innerHTML = '<p>Loading...</p>';
      return;
    }

    var thisWeek = getWeekStartAndEnd();
    var lastWeek = getPreviousWeekStartAndEnd();

    var thisWeekExpenses = getExpensesForRange(thisWeek.start, thisWeek.end);
    var lastWeekExpenses = getExpensesForRange(lastWeek.start, lastWeek.end);

    var thisWeekTotal = thisWeekExpenses.reduce(function (sum, exp) {
      return sum + (Number(exp.amount) || 0);
    }, 0);

    var lastWeekTotal = lastWeekExpenses.reduce(function (sum, exp) {
      return sum + (Number(exp.amount) || 0);
    }, 0);

    var delta = thisWeekTotal - lastWeekTotal;
    var deltaPct = lastWeekTotal > 0 ? Math.round((delta / lastWeekTotal) * 100) : 0;
    var trendLabel = delta <= 0 ? "less" : "more";
    var trendClass = delta <= 0 ? "positive" : "negative";
    var trendColor = delta <= 0 ? "#10b981" : "#ef4444";
    var trendIcon = delta <= 0 ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + trendColor + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + trendColor + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>';

    // Calculate bar heights - max height will be for the larger amount
    var maxAmount = Math.max(thisWeekTotal, lastWeekTotal) || 1;
    var barHeight = 100;
    var thisWeekHeight = (thisWeekTotal / maxAmount) * barHeight;
    var lastWeekHeight = (lastWeekTotal / maxAmount) * barHeight;

    // SVG dimensions with more headroom for text
    var svgWidth = 280;
    var svgHeight = 240;
    var barWidth = 50;
    var gap = 30;
    var chartBottomY = 160;
    var topPadding = 20;

    // Calculate X positions for centered bars
    var totalBarsWidth = (barWidth * 2) + gap;
    var centerOffset = (svgWidth - totalBarsWidth) / 2;
    var thisWeekX = centerOffset;
    var lastWeekX = thisWeekX + barWidth + gap;

    var html = '<div class="week-comparison-wrapper">' +
      '<svg class="week-comparison-svg" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" preserveAspectRatio="xMidYMid meet">' +
      '<rect x="' + thisWeekX + '" y="' + (chartBottomY - thisWeekHeight) + '" width="' + barWidth + '" height="' + thisWeekHeight + '" fill="#d1fae5" stroke="#10b981" stroke-width="1.5" rx="4" />' +
      '<rect x="' + lastWeekX + '" y="' + (chartBottomY - lastWeekHeight) + '" width="' + barWidth + '" height="' + lastWeekHeight + '" fill="#fce7f3" stroke="#ec4899" stroke-width="1.5" rx="4" />' +
      '<text x="' + (thisWeekX + barWidth / 2) + '" y="' + (chartBottomY + 25) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b">This Week</text>' +
      '<text x="' + (lastWeekX + barWidth / 2) + '" y="' + (chartBottomY + 25) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b">Last Week</text>' +
      '<text x="' + (thisWeekX + barWidth / 2) + '" y="' + Math.max(topPadding + 14, chartBottomY - thisWeekHeight - 6) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#10b981">' + formatPhp(thisWeekTotal) + '</text>' +
      '<text x="' + (lastWeekX + barWidth / 2) + '" y="' + Math.max(topPadding + 14, chartBottomY - lastWeekHeight - 6) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#ec4899">' + formatPhp(lastWeekTotal) + '</text>' +
      '</svg>' +
      '<div class="week-comparison-delta ' + trendClass + '">' +
      '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
      '<div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">' + trendIcon + '</div>' +
      '<div>' +
      '<div class="delta-amount">' + (delta > 0 ? "+" : "") + formatPhp(Math.abs(delta)) + '</div>' +
      '<div class="delta-percent">' + (deltaPct > 0 ? "+" : "") + deltaPct + '% ' + trendLabel + ' than last week</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    container.innerHTML = html;
  }

  // ── Public API ───────────────────────────────────────────
  window.StatsPage = {
    init: function () {
      renderSummaryMetrics();
      renderProgressDonut();
      renderCategoryBreakdown();
      renderDailyTrend();
      renderWeekComparison();

      // Listen for storage updates
      window.addEventListener("sugbocents:synced", function () {
        renderSummaryMetrics();
        renderProgressDonut();
        renderCategoryBreakdown();
        renderDailyTrend();
        renderWeekComparison();
      });

      window.addEventListener("sugbocents:expenseAdded", function () {
        renderSummaryMetrics();
        renderProgressDonut();
        renderCategoryBreakdown();
        renderDailyTrend();
        renderWeekComparison();
      });
    }
  };

  // ── Auto-init on DOMContentLoaded ──────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("summaryMetricsContainer")) {
      window.StatsPage.init();
    }
  });

})();
