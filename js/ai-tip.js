(function () {
  var API_KEY = "REPLACE_WITH_GEMINI_API_KEY";
  var MODEL_NAME = "gemini-2.0-flash";
  var TIP_CACHE_MS = 6 * 60 * 60 * 1000;
  var REQUEST_TIMEOUT_MS = 8000;

  var state = {
    tip: null,
    refreshTimer: null
  };

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

  function getWeekStart(date) {
    var now = date || new Date();
    var day = now.getDay();
    var diff = (day + 6) % 7;
    var start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function getWeekEnd(start) {
    var end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);
    return end;
  }

  function getExpenseCategories() {
    if (!window.StorageAPI || !window.StorageAPI.getExpenseCategories) {
      return [];
    }
    return window.StorageAPI.getExpenseCategories() || [];
  }

  function getCategoryLabel(categoryId) {
    var categories = getExpenseCategories();
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === categoryId) {
        return categories[i].label || categoryId;
      }
    }
    return categoryId || "Other";
  }

  function buildTipContext() {
    if (!window.StorageAPI) {
      return null;
    }

    var expenses = [];
    if (window.StorageAPI.getExpenses) {
      expenses = window.StorageAPI.getExpenses() || [];
    } else {
      var user = window.StorageAPI.getCurrentUser ? window.StorageAPI.getCurrentUser() : null;
      expenses = user && Array.isArray(user.expenses) ? user.expenses : [];
    }

    var weeklyBudget = 0;
    if (window.StorageAPI.getWeeklyBudget) {
      weeklyBudget = Number(window.StorageAPI.getWeeklyBudget() || 0) || 0;
    }

    var weekStart = getWeekStart(new Date());
    var weekEnd = getWeekEnd(weekStart);

    var weekExpenses = expenses.filter(function (exp) {
      var d = new Date(exp.timestamp);
      return d >= weekStart && d < weekEnd;
    });

    var spentThisWeek = weekExpenses.reduce(function (sum, exp) {
      return sum + (Number(exp.amount) || 0);
    }, 0);

    var now = new Date();
    var daysElapsed = Math.max(1, Math.floor((now - weekStart) / (1000 * 60 * 60 * 24)) + 1);
    var dailyAvg = spentThisWeek / daysElapsed;

    var totals = {};
    weekExpenses.forEach(function (exp) {
      var cat = exp.category || "others";
      totals[cat] = (totals[cat] || 0) + (Number(exp.amount) || 0);
    });

    var topCategoryId = null;
    var topCategoryAmount = 0;
    Object.keys(totals).forEach(function (cat) {
      if (totals[cat] > topCategoryAmount) {
        topCategoryAmount = totals[cat];
        topCategoryId = cat;
      }
    });

    var topCategory = topCategoryId
      ? { id: topCategoryId, label: getCategoryLabel(topCategoryId), amount: topCategoryAmount }
      : null;

    return {
      weeklyBudget: weeklyBudget,
      spentThisWeek: spentThisWeek,
      remaining: weeklyBudget > 0 ? weeklyBudget - spentThisWeek : 0,
      daysElapsed: daysElapsed,
      dailyAvg: dailyAvg,
      expenseCount: weekExpenses.length,
      topCategory: topCategory,
      weekStartIso: weekStart.toISOString()
    };
  }

  function buildFallbackTip(context) {
    var tip = {
      title: "Keep a steady pace",
      body: "Stay close to your usual daily average to finish the week strong.",
      source: "local",
      timestamp: Date.now(),
      context: context
    };

    if (!context) {
      return tip;
    }

    if (!context.weeklyBudget) {
      tip.title = "Set a weekly budget";
      tip.body = "Add a weekly budget in Settings so Tigom can pace your spending.";
      return tip;
    }

    if (context.expenseCount === 0) {
      tip.title = "Log your first expense";
      tip.body = "A single log helps Tigom spot your weekly pace and patterns.";
      return tip;
    }

    if (context.spentThisWeek > context.weeklyBudget) {
      tip.title = "Recover this week";
      tip.body = "You are over budget. Try one low spend day and log it to stabilize.";
      return tip;
    }

    if (context.remaining <= context.weeklyBudget * 0.2) {
      tip.title = "Protect the last stretch";
      tip.body = "Only " + formatPhp(Math.max(0, context.remaining)) + " left. Keep today lean to stay under budget.";
      return tip;
    }

    if (context.topCategory && context.topCategory.amount >= context.spentThisWeek * 0.4) {
      tip.title = "Tame " + context.topCategory.label;
      tip.body = "Your " + context.topCategory.label.toLowerCase() + " spending leads this week. Try a low cost swap today.";
      return tip;
    }

    tip.body = "Your daily average is " + formatPhp(context.dailyAvg) + ". Staying near it keeps you on track.";
    return tip;
  }

  function buildPrompt(context) {
    var topLabel = context.topCategory ? context.topCategory.label : "None";
    var topAmount = context.topCategory ? formatPhp(context.topCategory.amount) : formatPhp(0);
    var budgetInfo = context.weeklyBudget > 0 ? formatPhp(context.weeklyBudget) : "Not set";
    var remainingInfo = context.weeklyBudget > 0 ? formatPhp(Math.max(0, context.remaining)) : "Not set";

    return [
      "You are Tigom, a friendly budget coach for college students in Cebu.",
      "Give exactly one actionable tip based on the stats below.",
      "Output format must be:",
      "Title: <short title>",
      "Body: <1-2 sentence tip>",
      "Keep the title under 6 words. Avoid emojis.",
      "Stats:",
      "Weekly budget: " + budgetInfo,
      "Spent this week: " + formatPhp(context.spentThisWeek),
      "Remaining: " + remainingInfo,
      "Days elapsed: " + context.daysElapsed,
      "Weekly logs: " + context.expenseCount,
      "Daily average: " + formatPhp(context.dailyAvg),
      "Top category: " + topLabel + " (" + topAmount + ")"
    ].join("\n");
  }

  function parseAiResponse(text) {
    var clean = String(text || "").trim();
    if (!clean) {
      return null;
    }

    var titleMatch = clean.match(/Title:\s*(.+)/i);
    var bodyMatch = clean.match(/Body:\s*([\s\S]+)/i);

    if (titleMatch && bodyMatch) {
      return {
        title: titleMatch[1].trim(),
        body: bodyMatch[1].trim()
      };
    }

    var lines = clean.split(/\n+/).filter(function (line) { return line.trim(); });
    if (lines.length >= 2) {
      return { title: lines[0].trim(), body: lines.slice(1).join(" ").trim() };
    }

    return { title: "Tip", body: clean };
  }

  function fetchGeminiTip(context) {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_NAME + ":generateContent?key=" + API_KEY;
    var body = {
      contents: [{
        role: "user",
        parts: [{ text: buildPrompt(context) }]
      }]
    };

    var controller = new AbortController();
    var timeout = setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    }).then(function (response) {
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error("AI request failed");
      }
      return response.json();
    }).then(function (data) {
      var text = "";
      if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        text = data.candidates[0].content.parts.map(function (part) {
          return part.text || "";
        }).join("\n");
      }
      var parsed = parseAiResponse(text);
      if (!parsed || !parsed.title || !parsed.body) {
        throw new Error("AI response empty");
      }
      return parsed;
    });
  }

  function hasApiKey() {
    return API_KEY && API_KEY.indexOf("REPLACE") !== 0;
  }

  function shouldUseAi(context) {
    if (!context || !hasApiKey()) {
      return false;
    }
    if (navigator && navigator.onLine === false) {
      return false;
    }
    return context.expenseCount > 0;
  }

  function getCachedTip() {
    if (!window.StorageAPI || !window.StorageAPI.getRecommendationTip) {
      return null;
    }
    return window.StorageAPI.getRecommendationTip();
  }

  function saveTip(tip) {
    if (!window.StorageAPI || !window.StorageAPI.saveRecommendationTip) {
      return;
    }
    window.StorageAPI.saveRecommendationTip(tip);
  }

  function isTipFresh(tip) {
    return tip && tip.timestamp && (Date.now() - tip.timestamp < TIP_CACHE_MS);
  }

  function renderTip(tip) {
    var card = document.querySelector(".ai-tip-card");
    var titleEl = document.getElementById("aiTipTitle");
    var bodyEl = document.getElementById("aiTipBody");
    var sourceEl = document.getElementById("aiTipSource");
    var whyBtn = document.getElementById("aiTipWhyBtn");
    var refreshBtn = document.getElementById("aiTipRefreshBtn");

    if (card) {
      card.classList.remove("ai-tip-card--loading");
    }

    if (!tip) {
      if (titleEl) { titleEl.textContent = "Tip unavailable"; }
      if (bodyEl) { bodyEl.textContent = "Check your connection or try again later."; }
      if (sourceEl) { sourceEl.textContent = "Offline"; }
      if (refreshBtn) { refreshBtn.disabled = false; }
      return;
    }

    state.tip = tip;

    if (titleEl) { titleEl.textContent = tip.title; }
    if (bodyEl) { bodyEl.textContent = tip.body; }
    if (sourceEl) {
      sourceEl.textContent = tip.source === "ai" ? "AI tip" : "Smart tip";
      if (tip.source === "ai") {
        sourceEl.classList.remove("ai-tip-source--local");
      } else {
        sourceEl.classList.add("ai-tip-source--local");
      }
    }
    if (whyBtn) { whyBtn.disabled = false; }
    if (refreshBtn) { refreshBtn.disabled = false; }
  }

  function renderLoading() {
    var card = document.querySelector(".ai-tip-card");
    var titleEl = document.getElementById("aiTipTitle");
    var bodyEl = document.getElementById("aiTipBody");
    var sourceEl = document.getElementById("aiTipSource");
    var whyBtn = document.getElementById("aiTipWhyBtn");
    var refreshBtn = document.getElementById("aiTipRefreshBtn");

    if (card) {
      card.classList.add("ai-tip-card--loading");
    }
    if (titleEl) { titleEl.textContent = "Generating tip"; }
    if (bodyEl) { bodyEl.textContent = "Tigom is crafting advice based on your latest logs."; }
    if (sourceEl) { sourceEl.textContent = "Working"; }
    if (whyBtn) { whyBtn.disabled = true; }
    if (refreshBtn) { refreshBtn.disabled = true; }
  }

  function buildWhySummary(context) {
    if (!context) {
      return "This tip is based on your recent logs and goals.";
    }
    if (!context.weeklyBudget) {
      return "You do not have a weekly budget set yet, so the tip focuses on getting started.";
    }
    if (context.expenseCount === 0) {
      return "There are no expenses logged this week, so the tip helps you start tracking.";
    }
    if (context.spentThisWeek > context.weeklyBudget) {
      return "You are over budget this week, so the tip focuses on slowing spending.";
    }
    if (context.remaining <= context.weeklyBudget * 0.2) {
      return "You are close to your weekly limit, so the tip protects your remaining budget.";
    }
    return "This tip is based on your weekly spend, pace, and top category.";
  }

  function buildWhySignals(context) {
    var signals = [];
    if (!context) {
      return signals;
    }

    signals.push({ label: "Spent this week", value: formatPhp(context.spentThisWeek) });

    if (context.weeklyBudget) {
      signals.push({ label: "Budget remaining", value: formatPhp(Math.max(0, context.remaining)) });
    } else {
      signals.push({ label: "Budget", value: "Not set" });
    }

    if (context.topCategory) {
      signals.push({
        label: "Top category",
        value: context.topCategory.label + " (" + formatPhp(context.topCategory.amount) + ")"
      });
    } else {
      signals.push({ label: "Weekly logs", value: String(context.expenseCount) });
    }

    return signals.slice(0, 3);
  }

  function renderWhy(tip) {
    var summaryEl = document.getElementById("aiTipWhySummary");
    var listEl = document.getElementById("aiTipWhySignals");
    if (!summaryEl || !listEl) {
      return;
    }

    var context = tip ? tip.context : null;
    summaryEl.textContent = buildWhySummary(context);

    var signals = buildWhySignals(context);
    var html = signals.map(function (item) {
      return (
        '<div class="ai-tip-why-item">' +
          '<span class="ai-tip-why-label">' + escapeHtml(item.label) + '</span>' +
          '<span class="ai-tip-why-value">' + escapeHtml(item.value) + '</span>' +
        '</div>'
      );
    }).join("");

    listEl.innerHTML = html;
  }

  function openWhyModal() {
    var modal = document.getElementById("aiTipWhyModal");
    if (!modal) {
      return;
    }
    if (state.tip) {
      renderWhy(state.tip);
    }
    modal.classList.remove("hidden");
  }

  function closeWhyModal() {
    var modal = document.getElementById("aiTipWhyModal");
    if (!modal) {
      return;
    }
    modal.classList.add("hidden");
  }

  function wireModal() {
    var whyBtn = document.getElementById("aiTipWhyBtn");
    var refreshBtn = document.getElementById("aiTipRefreshBtn");
    var closeBtn = document.getElementById("aiTipWhyClose");
    var ctaBtn = document.getElementById("aiTipWhyCta");

    if (whyBtn) {
      whyBtn.addEventListener("click", function () {
        if (!state.tip) {
          return;
        }
        openWhyModal();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeWhyModal);
    }

    if (ctaBtn) {
      ctaBtn.addEventListener("click", closeWhyModal);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        loadTip({ forceRefresh: true });
      });
    }
  }

  function loadTip(options) {
    var opts = options || {};
    var cached = getCachedTip();
    if (cached && isTipFresh(cached) && !opts.forceRefresh) {
      renderTip(cached);
      return;
    }

    var context = buildTipContext();
    if (!shouldUseAi(context)) {
      var fallback = buildFallbackTip(context);
      saveTip(fallback);
      renderTip(fallback);
      return;
    }

    renderLoading();
    fetchGeminiTip(context).then(function (aiResult) {
      var tip = {
        title: aiResult.title,
        body: aiResult.body,
        source: "ai",
        timestamp: Date.now(),
        context: context
      };
      saveTip(tip);
      renderTip(tip);
    }).catch(function () {
      var fallback = buildFallbackTip(context);
      saveTip(fallback);
      renderTip(fallback);
    });
  }

  function scheduleTipRefresh() {
    if (state.refreshTimer) {
      clearTimeout(state.refreshTimer);
    }
    state.refreshTimer = setTimeout(function () {
      loadTip();
    }, 350);
  }

  function initAiTip() {
    if (!document.body || document.body.getAttribute("data-page") !== "dashboard") {
      return;
    }

    var tipCard = document.querySelector(".ai-tip-card");
    if (!tipCard) {
      return;
    }

    wireModal();
    loadTip();

    window.addEventListener("sugbocents:dataChanged", scheduleTipRefresh);
    window.addEventListener("sugbocents:synced", scheduleTipRefresh);
  }

  document.addEventListener("DOMContentLoaded", initAiTip);
})();
