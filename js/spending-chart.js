(function () {
  // ── Color palette for chart bars ─────────────────────
  var CATEGORY_COLORS = {
    "Jeep": "#d8efe2",
    "Food": "#ffedd5",
    "Load": "#dbeafe",
    "Laundry": "#fee2e2",
    "School Supplies": "#f3e8ff",
    "Coffee": "#fef9c3",
    "Other": "#e2e8f0"
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

  // ── render pie chart ────────────────────────────────────
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
    }

    var data = aggregateExpensesByCategory();
    var categories = Object.keys(data).sort(function (a, b) {
      return data[b] - data[a];
    });

    if (categories.length === 0) {
      container.innerHTML =
        '<div class="spending-chart-empty">' +
        '<div class="spending-chart-empty-icon"><span class="material-icons">pie_chart</span></div>' +
        '<div class="spending-chart-empty-text">No expenses this week</div>' +
        '</div>';
      return;
    }

    var total = categories.reduce(function (sum, cat) {
      return sum + data[cat];
    }, 0);

    // Calculate pie slices
    var slices = [];
    var currentAngle = 0;

    categories.forEach(function (cat, idx) {
      var amount = data[cat];
      var percentage = (amount / total) * 100;
      var sliceAngle = (amount / total) * 360;
      var color = CATEGORY_COLORS[cat] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

      slices.push({
        category: cat,
        amount: amount,
        percentage: percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
        color: color
      });

      currentAngle += sliceAngle;
    });

    // Render pie chart
    var svgWidth = 400;
    var svgHeight = 360;
    var centerX = svgWidth / 2;
    var centerY = 120;
    var radius = 110;

    var chartHtml = '<div class="spending-pie-wrapper">';
    chartHtml += '<svg class="spending-pie-svg" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" preserveAspectRatio="xMidYMid meet">';

    // Draw pie slices
    slices.forEach(function (slice) {
      var startRad = (slice.startAngle - 90) * Math.PI / 180;
      var endRad = (slice.endAngle - 90) * Math.PI / 180;

      var x1 = centerX + radius * Math.cos(startRad);
      var y1 = centerY + radius * Math.sin(startRad);
      var x2 = centerX + radius * Math.cos(endRad);
      var y2 = centerY + radius * Math.sin(endRad);

      var largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

      var pathData = 'M ' + centerX + ' ' + centerY +
        ' L ' + x1 + ' ' + y1 +
        ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 +
        ' Z';

      chartHtml += '<path d="' + pathData + '" fill="' + slice.color + '" stroke="#ffffff" stroke-width="2" class="pie-slice" />';
    });

    chartHtml += '</svg>';

    // Legend
    chartHtml += '<div class="pie-legend">';
    slices.forEach(function (slice) {
      chartHtml += '<div class="legend-item">' +
        '<div class="legend-color" style="background: ' + slice.color + '"></div>' +
        '<div class="legend-info">' +
        '<div class="legend-category">' + escapeHtml(slice.category) + '</div>' +
        '<div class="legend-amount">' + formatPhp(slice.amount) + ' (' + Math.round(slice.percentage) + '%)</div>' +
        '</div>' +
        '</div>';
    });
    chartHtml += '</div>';

    chartHtml += '</div>';

    container.innerHTML = chartHtml;
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
