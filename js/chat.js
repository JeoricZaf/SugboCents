(function () {
  var MASCOT_IMGS = {
    happy:   "assets/images/mascot/mascot-happy.png",
    neutral: "assets/images/mascot/mascot-neutral.png",
    worried: "assets/images/mascot/mascot-sad.png",
    alarmed: "assets/images/mascot/mascot-shocked.png"
  };

  function getMascotState() {
    if (!window.StorageAPI) { return "neutral"; }
    var summary = window.StorageAPI.getBudgetSummary();
    var pct = summary.percentageSpent;
    if (pct >= 90) { return "alarmed"; }
    if (pct >= 65) { return "worried"; }
    if (pct >= 30) { return "neutral"; }
    return "happy";
  }

  function fmt(n) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
  }

  function fmtTime(isoStr) {
    var d = new Date(isoStr);
    return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtDate(isoStr) {
    var d = new Date(isoStr);
    var now = new Date();
    var todayKey = now.toDateString();
    var yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === todayKey) { return "Today"; }
    if (d.toDateString() === yest.toDateString()) { return "Yesterday"; }
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }

  function scrollToBottom() {
    var el = document.getElementById("chatMessages");
    if (el) { el.scrollTop = el.scrollHeight; }
  }

  function appendMsg(role, text, timestamp, skipStore) {
    var container = document.getElementById("chatMessages");
    if (!container) { return; }

    var msg = document.createElement("div");
    msg.className = "chat-msg chat-msg--" + (role === "user" ? "user" : "bot");

    if (role === "bot") {
      var avatarState = getMascotState();
      var avatar = document.createElement("img");
      avatar.src = MASCOT_IMGS[avatarState] || MASCOT_IMGS.neutral;
      avatar.alt = "Tigom";
      avatar.className = "chat-msg-avatar";
      msg.appendChild(avatar);
    }

    var inner = document.createElement("div");
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;

    if (timestamp) {
      var time = document.createElement("span");
      time.className = "chat-bubble-time";
      time.textContent = fmtTime(timestamp);
      bubble.appendChild(time);
    }

    inner.appendChild(bubble);
    msg.appendChild(inner);
    container.appendChild(msg);
    scrollToBottom();

    if (!skipStore && window.StorageAPI && window.StorageAPI.saveChatMessage) {
      window.StorageAPI.saveChatMessage(role, text);
    }
  }

  function addTypingIndicator() {
    var container = document.getElementById("chatMessages");
    if (!container) { return null; }
    var id = "chat-typing-" + Date.now();
    var msg = document.createElement("div");
    msg.id = id;
    msg.className = "chat-msg chat-msg--bot";

    var avatarState = getMascotState();
    var avatar = document.createElement("img");
    avatar.src = MASCOT_IMGS[avatarState] || MASCOT_IMGS.neutral;
    avatar.alt = "Tigom";
    avatar.className = "chat-msg-avatar";
    msg.appendChild(avatar);

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-typing";
    bubble.innerHTML = "<span></span><span></span><span></span>";

    var inner = document.createElement("div");
    inner.appendChild(bubble);
    msg.appendChild(inner);
    container.appendChild(msg);
    scrollToBottom();
    return id;
  }

  function removeTypingIndicator(id) {
    if (!id) { return; }
    var el = document.getElementById(id);
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }

  function addDateSeparator(label) {
    var container = document.getElementById("chatMessages");
    if (!container) { return; }
    var sep = document.createElement("div");
    sep.className = "chat-date-sep";
    sep.textContent = label;
    container.appendChild(sep);
  }

  function loadHistory() {
    if (!window.StorageAPI || !window.StorageAPI.getChatHistory) { return; }
    var history = window.StorageAPI.getChatHistory();
    if (!history || history.length === 0) {
      // First time — show a welcome greeting
      appendMsg("bot", "Hey there! 👋 I'm Tigom, your budget buddy. Ask me anything about your spending, goals, or budget — I'm here to help!", new Date().toISOString(), false);
      return;
    }

    var lastDateLabel = null;
    history.forEach(function (item) {
      var dateLabel = item.timestamp ? fmtDate(item.timestamp) : null;
      if (dateLabel && dateLabel !== lastDateLabel) {
        addDateSeparator(dateLabel);
        lastDateLabel = dateLabel;
      }
      appendMsg(item.role, item.text, item.timestamp, true); // skipStore = true (already in history)
    });
    scrollToBottom();
  }

  function buildConversationHistory() {
    if (!window.StorageAPI || !window.StorageAPI.getChatHistory) { return []; }
    var history = window.StorageAPI.getChatHistory();
    // Return last 6 entries as context
    return history.slice(-6);
  }

  function setInputState(disabled) {
    var input = document.getElementById("chatInput");
    var btn = document.getElementById("chatSendBtn");
    if (input) { input.disabled = disabled; }
    if (btn)   { btn.disabled = disabled; }
  }

  function sendMessage(text) {
    if (!text || !text.trim()) { return; }
    var trimmed = text.trim();
    appendMsg("user", trimmed, new Date().toISOString(), false);

    setInputState(true);
    var typingId = addTypingIndicator();

    if (window.ChatAI && window.ChatAI.isAvailable()) {
      var history = buildConversationHistory();
      window.ChatAI.send(trimmed, history).then(function (result) {
        removeTypingIndicator(typingId);
        setInputState(false);
        var reply;
        if (result.ok && result.reply) {
          reply = result.reply;
        } else {
          var state = getMascotState();
          reply = window.ChatAI.getFallbackReply(trimmed, state);
        }
        appendMsg("bot", reply, new Date().toISOString(), false);
        focusInput();
      }).catch(function () {
        removeTypingIndicator(typingId);
        setInputState(false);
        var fallback = window.ChatAI
          ? window.ChatAI.getFallbackReply(trimmed, getMascotState())
          : "Sorry, I'm having trouble connecting right now. Try again in a moment!";
        appendMsg("bot", fallback, new Date().toISOString(), false);
        focusInput();
      });
    } else {
      // Pure offline keyword fallback
      var state = getMascotState();
      var fallbackReply = window.ChatAI
        ? window.ChatAI.getFallbackReply(trimmed, state)
        : "I'm offline right now, but keep tracking those expenses! 💪";
      setTimeout(function () {
        removeTypingIndicator(typingId);
        setInputState(false);
        appendMsg("bot", fallbackReply, new Date().toISOString(), false);
        focusInput();
      }, 600);
    }
  }

  function focusInput() {
    var input = document.getElementById("chatInput");
    if (input) { input.focus(); }
  }

  function updateAvatarState() {
    var state = getMascotState();
    var avatarEl = document.getElementById("chatAvatarImg");
    if (avatarEl) { avatarEl.src = MASCOT_IMGS[state] || MASCOT_IMGS.neutral; }

    var subtitleEl = document.getElementById("chatSubtitle");
    if (subtitleEl) {
      var labels = {
        happy: "Doing great this week! 🎉",
        neutral: "On track — keep it up",
        worried: "Watch your spending ⚠️",
        alarmed: "Budget alert! 🚨"
      };
      subtitleEl.textContent = labels[state] || "Your budget buddy";
    }
  }

  function initClearButton() {
    var btn = document.getElementById("chatClearBtn");
    if (!btn) { return; }
    btn.addEventListener("click", function () {
      if (!confirm("Clear your full chat history? This cannot be undone.")) { return; }
      if (window.StorageAPI && window.StorageAPI.clearChatHistory) {
        window.StorageAPI.clearChatHistory();
      }
      var container = document.getElementById("chatMessages");
      if (container) { container.innerHTML = ""; }
      appendMsg("bot", "Chat cleared! I'm still here whenever you need me. 😊", new Date().toISOString(), false);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateAvatarState();
    loadHistory();
    initClearButton();

    var input = document.getElementById("chatInput");
    var sendBtn = document.getElementById("chatSendBtn");

    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        if (!input) { return; }
        var val = input.value;
        input.value = "";
        sendMessage(val);
      });
    }

    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          var val = input.value;
          input.value = "";
          sendMessage(val);
        }
      });
    }

    // Auto-update avatar when expenses change (e.g. if navigated back)
    window.addEventListener("sugbocents:synced", updateAvatarState);

    focusInput();
  });
})();
