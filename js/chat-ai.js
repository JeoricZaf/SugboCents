(function () {
  // AI layer — calls the Firebase Cloud Function proxy (Groq / Llama 3.1).
  // The API key lives in Secret Manager, never in the browser.
  var CLOUD_FN_URL = "https://us-central1-sugbocents.cloudfunctions.net/chat";

  // ── Client-side rate limiter (localStorage) ──────────────
  var RL_KEY        = "sc_ai_rl";
  var RL_MAX        = 20;              // max AI messages per window
  var RL_WINDOW_MS  = 60 * 60 * 1000; // 1 hour

  var rlMemory = { timestamps: [] };

  function getRateLimitData() {
    if (window.StorageAPI && window.StorageAPI.getPreferences) {
      var prefs = window.StorageAPI.getPreferences();
      var data = prefs && prefs.aiRateLimit ? prefs.aiRateLimit : null;
      if (data && Array.isArray(data.timestamps)) { return data; }
      return { timestamps: [] };
    }
    return rlMemory;
  }

  function saveRateLimitData(data) {
    if (window.StorageAPI && window.StorageAPI.savePreferences) {
      window.StorageAPI.savePreferences({ aiRateLimit: data });
      return;
    }
    rlMemory = data;
  }

  function checkRateLimit() {
    var now  = Date.now();
    var data = getRateLimitData();
    data.timestamps = data.timestamps.filter(function (t) {
      return now - t < RL_WINDOW_MS;
    });
    if (data.timestamps.length >= RL_MAX) {
      var oldest    = data.timestamps[0];
      var resetMins = Math.ceil((RL_WINDOW_MS - (now - oldest)) / 60000);
      return { allowed: false, resetMins: resetMins };
    }
    data.timestamps.push(now);
    saveRateLimitData(data);
    return { allowed: true };
  }

  function getRateLimitStatus() {
    var now  = Date.now();
    var data = getRateLimitData();
    var active = data.timestamps.filter(function (t) {
      return now - t < RL_WINDOW_MS;
    });
    return { used: active.length, max: RL_MAX };
  }

  function isAvailable() {
    // Key lives server-side -- always available as long as network exists.
    return true;
  }

  function buildSystemPrompt() {
    var base =
      "You are Tigom, a friendly budget buddy for SugboCents, " +
      "a Filipino personal budgeting app for students and young adults. " +
      "Respond in English by default. If the user uses Filipino, you can mirror lightly. " +
      "Keep responses SHORT (2-3 sentences), warm, and encouraging. " +
      "Be coach-like and direct when the user is off-track or over budget. " +
      "Currency is Philippine Peso (₱). Be practical, not preachy. " +
      "Never give long financial lectures.";

    if (!window.StorageAPI) { return base; }

    try {
      var fmt = function (n) {
        return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
      };
      var summary = window.StorageAPI.getBudgetSummary();
      var streak = window.StorageAPI.getCurrentStreak();
      var goals = window.StorageAPI.getGoals();
      var xpInfo = window.StorageAPI.getXpInfo();

      var ctx = "\n\nLive context about this user:";
      ctx += "\n- Weekly budget: " + fmt(summary.weeklyBudget);
      ctx += "\n- Spent this week: " + fmt(summary.totalSpentThisWeek) + " (" + summary.percentageSpent + "% used)";
      ctx += "\n- Remaining this week: " + fmt(summary.remaining);
      ctx += "\n- Consecutive logging streak: " + streak + " day(s)";
      ctx += "\n- XP Level: " + xpInfo.level + " – " + xpInfo.levelName + " (" + xpInfo.xp + " XP total)";

      var activeGoals = goals.filter(function (g) { return !g.completed; });
      if (activeGoals.length > 0) {
        ctx += "\n- Top active goal: " + activeGoals[0].name + " — " +
          fmt(activeGoals[0].savedAmount) + " saved of " + fmt(activeGoals[0].targetAmount) + " target";
      } else {
        ctx += "\n- No active savings goals set yet";
      }

      return base + ctx;
    } catch (e) {
      return base;
    }
  }

  async function send(userMessage, history) {
    // Client-side rate limit check before calling the Cloud Function
    var rl = checkRateLimit();
    if (!rl.allowed) {
      return {
        ok: false,
        rateLimited: true,
        error: "I'm taking a breather. You've asked a lot this hour. Try again in " + rl.resetMins + " min."
      };
    }

    try {
      var response = await fetch(CLOUD_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: history || [],
          systemPrompt: buildSystemPrompt()
        })
      });

      if (!response.ok) {
        var errData = {};
        try { errData = await response.json(); } catch (_) {}
        return { ok: false, error: errData.error || ("Server error " + response.status) };
      }

      var data = await response.json();
      if (data.error) { return { ok: false, error: data.error }; }
      if (!data.reply) { return { ok: false, error: "Empty reply from server." }; }
      return { ok: true, reply: data.reply };
    } catch (e) {
      return { ok: false, error: e.message || "Network error." };
    }
  }

  // Keyword-based fallback (used when offline or AI call fails)
  var KEYWORD_REPLIES = [
    { keys: ["hello", "hi", "hey"],                 reply: "Hey there! 👋 I'm Tigom, your budget buddy. How can I help?" },
    { keys: ["budget", "limit"],                     reply: "Your weekly budget is your spending limit. Want help setting a realistic one?" },
    { keys: ["goal", "goals"],                       reply: "Go to the Goals tab to create and track your savings goals! 🎯" },
    { keys: ["expense", "expenses"],                 reply: "Log expenses on the Dashboard or browse them in Activity." },
    { keys: ["streak", "streaks"],                   reply: "Streaks reward consistent daily logging. Keep it up! 🔥" },
    { keys: ["chart", "graph", "stats"],             reply: "Check the Stats tab to see your spending breakdown! 📊" },
    { keys: ["overspend", "over budget", "spent"],   reply: "Let's take a quick look at where the money went this week so we can adjust." },
    { keys: ["save", "saving", "savings"],           reply: "Small daily wins add up. Want me to suggest a simple savings goal?" },
    { keys: ["help", "tips", "advice"],             reply: "I can help with spending analysis, goals, and budget tips. Ask me anything!" },
    { keys: ["remaining", "left"],                   reply: "Want me to check how much budget you have left this week?" },
    { keys: ["thanks", "thank you", "ty"],           reply: "You're welcome! Keep saving, you've got this. 💪" },
    { keys: ["good", "great", "awesome"],            reply: "Glad to hear it! 😄 Your finances are looking up!" },
    { keys: ["bad", "terrible", "awful"],            reply: "Hang in there. Every peso saved counts. You can turn it around." }
  ];

  var MOOD_REPLIES = {
    happy:       ["You're doing well this week. Keep the momentum going.", "Nice pace. A few mindful choices keep you on track."],
    celebrating: ["You're crushing it! 🎉 Love the discipline this week.", "Great job staying on track. Your goals are closer than you think."],
    concerned:   ["Let's slow down a bit. Your budget is getting tight.", "Heads up — spending is high this week. Let's review your top categories."]
  };

  function getFallbackReply(userMessage, mascotState) {
    var lower = String(userMessage || "").toLowerCase();
    var i, j, entry;
    for (i = 0; i < KEYWORD_REPLIES.length; i++) {
      entry = KEYWORD_REPLIES[i];
      for (j = 0; j < entry.keys.length; j++) {
        if (lower.indexOf(entry.keys[j]) !== -1) { return entry.reply; }
      }
    }
    var arr = MOOD_REPLIES[mascotState] || MOOD_REPLIES.happy;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  window.ChatAI = {
    isAvailable: isAvailable,
    buildSystemPrompt: buildSystemPrompt,
    send: send,
    getFallbackReply: getFallbackReply,
    getRateLimitStatus: getRateLimitStatus
  };
})();
