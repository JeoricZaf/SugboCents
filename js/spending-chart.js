(function () {
  var initialPeriodEl = document.getElementById("chartPeriod");
  if (initialPeriodEl) {
    initialPeriodEl.style.visibility = "hidden";
  }

  // ── Color palette for chart bars ─────────────────────
  var CATEGORY_COLORS = {
    "transport":     "#d8efe2",
    "food":          "#ffedd5",
    "groceries":     "#d1fae5",
    "education":     "#f3e8ff",
    "shopping":      "#fce7f3",
    "health":        "#fee2e2",
    "entertainment": "#fef3c7",
    "utilities":     "#dbeafe",
    "personal_care": "#ede9fe",
    "others":        "#e2e8f0"
  };

  var DEFAULT_COLORS = [
    "#d8efe2", "#ffedd5", "#dbeafe", "#fee2e2",
    "#f3e8ff", "#fef9c3", "#e2e8f0", "#ddd6fe"
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

  function getWeekStartAndEnd() {
    var now = new Date();
    var day = now.getDay();
    var startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((day + 6) % 7));
    var endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return { start: startOfWeek, end: endOfWeek };
  }

  function formatWeekRange(start, end) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[start.getMonth()] + " " + start.getDate() + " \u2013 " +
           months[end.getMonth()] + " " + end.getDate();
  }

  // ── aggregate expenses by category ───────────────────────
  function aggregateExpensesByCategory() {
    if (!window.StorageAPI) {
      return {};
    }

    var user = window.StorageAPI.getCurrentUser();
    if (!user || !Array.isArray(user.expenses)) {
      return {};
    }

    var now = new Date();
    var dayOfWeek = now.getDay();
    var weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    weekStartDate.setHours(0, 0, 0, 0);

    var weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 7);
    weekEndDate.setHours(0, 0, 0, 0);

    var aggregated = {};

    user.expenses.forEach(function (exp) {
      var expDate = new Date(exp.timestamp);
      if (expDate >= weekStartDate && expDate < weekEndDate) {
        var cat = exp.category || "Other";
        if (!aggregated[cat]) {
          aggregated[cat] = 0;
        }
        aggregated[cat] += Number(exp.amount) || 0;
      }
    });

    return aggregated;
  }

  // ── render bar chart ────────────────────────────────────
  function renderChart() {
    var container = document.getElementById("spendingChartContainer");
    if (!container) {
      return;
    }

    // Update the period label with the actual week range
    var periodEl = document.getElementById("chartPeriod");
    if (periodEl) {
      var weekRange = getWeekStartAndEnd();
      periodEl.textContent = formatWeekRange(weekRange.start, weekRange.end);
      periodEl.style.visibility = "visible";
    }

    var data = aggregateExpensesByCategory();
    var categories = Object.keys(data).sort(function (a, b) {
      return data[b] - data[a];
    });

    if (categories.length === 0) {
      container.innerHTML =
        '<div class="spending-chart-empty">' +
        '<div class="spending-chart-empty-icon">\uD83D\uDCCA</div>' +
        '<div class="spending-chart-empty-text">No expenses this week</div>' +
        '</div>';
      return;
    }

    var maxAmount = Math.max.apply(Math, categories.map(function (cat) {
      return data[cat];
    }));
    maxAmount = Math.max(maxAmount, 1);

    var isMobile = window.innerWidth < 1024;
    var chartHtml = '<div class="spending-chart-canvas-wrapper" data-layout="' +
      (isMobile ? 'vertical' : 'horizontal') + '">';

    if (isMobile) {
      // Vertical layout (bottom-to-top) for mobile
      var verticalAmountFontSize = "6px";

      var svgWidth = categories.length * 45 + 20;
      chartHtml += '<svg class="spending-chart-svg" viewBox="0 0 ' + svgWidth + ' 270" preserveAspectRatio="xMinYMid meet">';

      var xPos = 15;
      categories.forEach(function (cat, idx) {
        var amount = data[cat];
        var heightPercent = (amount / maxAmount) * 100;
        var barHeight = Math.max(10, (heightPercent / 100) * 180);
        var barY = 230 - barHeight;

        var color = CATEGORY_COLORS[cat] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

        // Bar
        chartHtml += '<rect x="' + (xPos + 2) + '" y="' + barY + '" width="32" height="' + barHeight + '" fill="' + color + '" rx="3" ry="3" />';

        // Category label below bar with dynamic sizing and wrapping
        var categoryFontSize = "8px";
        var categoryText = escapeHtml(cat);
        var textLength = categoryText.length;

        if (textLength > 16) {
          categoryFontSize = "5px";
        } else if (textLength > 12) {
          categoryFontSize = "6px";
        }

        var words = categoryText.split(" ");
        var line1 = "";
        var line2 = "";

        if (words.length > 1) {
          line1 = words[0];
          line2 = words.slice(1).join(" ");
        } else {
          line1 = categoryText;
        }

        chartHtml += '<text x="' + (xPos + 18) + '" y="250" font-weight="600" text-anchor="middle" fill="#0f172a" style="font-size: ' + categoryFontSize + ';">';
        chartHtml += line1;
        if (line2) {
          chartHtml += '<tspan x="' + (xPos + 18) + '" dy="10">' + line2 + '</tspan>';
        }
        chartHtml += '</text>';

        // Amount label on bar
        if (barHeight > 25) {
          chartHtml += '<text x="' + (xPos + 18) + '" y="' + (barY + barHeight / 2 + 3) + '" font-weight="700" text-anchor="middle" fill="#1f6b46" style="font-size: ' + verticalAmountFontSize + ';">';
          chartHtml += formatPhp(amount);
          chartHtml += '</text>';
        }

        xPos += 45;
      });
    } else {
      // Horizontal layout (left-to-right) for desktop
      var svgHeight = categories.length * 35 + 15;
      chartHtml += '<svg class="spending-chart-svg" viewBox="0 0 500 ' + svgHeight + '" preserveAspectRatio="xMinYMid meet">';

      var yPos = 10;
      categories.forEach(function (cat, idx) {
        var amount = data[cat];
        var widthPercent = (amount / maxAmount) * 100;
        var barWidth = Math.max(15, (widthPercent / 100) * 380);

        var color = CATEGORY_COLORS[cat] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

        // Category label (left)
        chartHtml += '<text x="5" y="' + (yPos + 13) + '" font-weight="600" fill="#0f172a" style="font-size: 8px;">';
        chartHtml += escapeHtml(cat.substring(0, 20));
        chartHtml += '</text>';

        // Bar
        chartHtml += '<rect x="110" y="' + (yPos + 2) + '" width="' + barWidth + '" height="18" fill="' + color + '" rx="3" ry="3" />';

        // Amount label on bar
        if (barWidth > 40) {
          chartHtml += '<text x="' + (110 + barWidth / 2) + '" y="' + (yPos + 13) + '" font-weight="700" text-anchor="middle" fill="#1f6b46" style="font-size: 7px;">';
          chartHtml += formatPhp(amount);
          chartHtml += '</text>';
        }

        yPos += 35;
      });
    }

    chartHtml += '</svg></div>';

    var legendHtml = '<div class="spending-chart-legend">';
    categories.forEach(function (cat, idx) {
      var amount = data[cat];
      var color = CATEGORY_COLORS[cat] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
      legendHtml += '<div class="legend-item" style="background:' + color + '40; border-radius: 6px; padding: 6px 10px;">' +
        '<div class="legend-label-group">' +
        '<span class="legend-category" style="font-weight: 600;">' + escapeHtml(cat) + '</span>' +
        '<span class="legend-amount" style="margin-left: 6px;">' + formatPhp(amount) + '</span>' +
        '</div>' +
        '</div>';
    });
    legendHtml += '</div>';

    container.innerHTML = chartHtml + legendHtml;
  }

  // ── public API ───────────────────────────────────────────
  window.SpendingChart = {
    init: function () {
      renderChart();
      window.addEventListener("resize", function () {
        renderChart();
      });
    },
    update: function () {
      renderChart();
    }
  };

  // ── auto-init if container exists ──────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("spendingChartContainer")) {
      window.SpendingChart.init();
    }
  });

})();
