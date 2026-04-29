(function () {
  // AI layer — calls the Firebase Cloud Function proxy (Groq / Llama 3.1).
  // The API key lives in Secret Manager, never in the browser.
  var CLOUD_FN_URL = "https://us-central1-sugbocents.cloudfunctions.net/chat";

  function isAvailable() {
    // Key lives server-side -- always available as long as network exists.
    return true;
  }

  function buildSystemPrompt() {
    var base =
      "You are Tigom, a friendly and encouraging savings mascot for SugboCents, " +
      "a Filipino personal budgeting app for students and young adults. " +
      "Keep responses SHORT (2-3 sentences max), conversational, warm, and motivating. " +
      "Occasionally use Filipino-friendly expressions (like 'kaya mo yan!' or 'grabe ang galing mo!'). " +
      "Currency is Philippine Peso (₱). Always stay positive and practical. " +
      "Never give long financial lectures — keep it friendly and brief.";

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
    { keys: ["hello", "hi", "hey"],         reply: "Hey there! 👋 I'm Tigom, your budget buddy. How can I help?" },
    { keys: ["budget"],                      reply: "Your weekly budget is your spending limit. Set it in Settings!" },
    { keys: ["goal", "goals"],               reply: "Go to the Goals tab to create and track your savings goals! 🎯" },
    { keys: ["expense", "expenses"],         reply: "Log expenses on the Dashboard or browse them in Activity." },
    { keys: ["streak"],                      reply: "Streaks reward consistent daily logging. Keep it up! 🔥" },
    { keys: ["chart", "graph", "stats"],     reply: "Check the Stats tab to see your spending breakdown! 📊" },
    { keys: ["help"],                        reply: "I can help with budget tips, goals, and streaks. Just ask me anything!" },
    { keys: ["thanks", "thank you", "ty"],   reply: "You're welcome! Keep saving, you've got this. 💪" },
    { keys: ["good", "great", "awesome"],    reply: "Glad to hear it! 😄 Your finances are looking up!" },
    { keys: ["bad", "terrible", "awful"],    reply: "Hang in there! Every peso saved counts. You can turn it around." }
  ];

  var MOOD_REPLIES = {
    happy:   ["You're killing it this week! 🎉 Budget is in great shape.", "Love the discipline! Keep it up and you'll reach your goals fast."],
    neutral: ["You're doing okay, but keep an eye on spending.", "Not bad! A little mindfulness goes a long way."],
    worried: ["⚠️ Budget is getting tight. Slow down on non-essentials.", "Consider reviewing your expenses to avoid overspending."],
    alarmed: ["🚨 You're nearly out of budget! No more spending today.", "Budget critical! Check your recent expenses in Activity."]
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
    var arr = MOOD_REPLIES[mascotState] || MOOD_REPLIES.neutral;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  window.ChatAI = {
    isAvailable: isAvailable,
    buildSystemPrompt: buildSystemPrompt,
    send: send,
    getFallbackReply: getFallbackReply
  };
})();
