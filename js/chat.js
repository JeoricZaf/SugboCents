(function () {
  var MASCOT_IMGS = {
    happy: "assets/images/mascot/mascot-happy.png",
    thinking: "assets/images/mascot/mascot-neutral.png",
    celebrating: "assets/images/mascot/mascot-happy.png",
    concerned: "assets/images/mascot/mastcot-sad.png"
  };

  var SUGGESTIONS = [
    { icon: "bi-bar-chart-fill", label: "Analyze my spending",   prompt: "Analyze my spending this week." },
    { icon: "bi-wallet2",        label: "Help me budget",        prompt: "Help me build a simple budget for this month." },
    { icon: "bi-fire",           label: "Show my streak",        prompt: "What's my spending streak right now?" },
    { icon: "bi-bullseye",       label: "Suggest a goal",        prompt: "Suggest a savings goal I can start this month." }
  ];

  var currentAvatarState = "happy";
  var activeThreadId = null;
  var isSidebarOpen = false;
  var isOffline = false;
  var pendingDeleteThreadId = null;
  var isPendingNewThread = false;

  function fmt(n) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
  }

  function fmtTime(isoStr) {
    var d = new Date(isoStr);
    return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtShortDate(isoStr) {
    if (!isoStr) { return ""; }
    var d = new Date(isoStr);
    var now = new Date();
    var todayKey = now.toDateString();
    var yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === todayKey) { return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }); }
    if (d.toDateString() === yest.toDateString()) { return "Yesterday"; }
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }

  function formatThreadMeta(thread) {
    var count = thread && typeof thread.messageCount === "number" ? thread.messageCount : 0;
    var countLabel = count === 1 ? "1 msg" : count + " msgs";
    var timeLabel = fmtShortDate(thread && thread.updatedAt ? thread.updatedAt : null);
    return timeLabel ? countLabel + " · " + timeLabel : countLabel;
  }

  function getBudgetMoodState() {
    if (!window.StorageAPI || !window.StorageAPI.getBudgetSummary) { return "happy"; }
    var summary = window.StorageAPI.getBudgetSummary();
    var pct = summary && typeof summary.percentageSpent === "number" ? summary.percentageSpent : 0;
    if (pct >= 85) { return "concerned"; }
    if (pct <= 30) { return "celebrating"; }
    return "happy";
  }

  function getReplyMoodState(text) {
    var base = getBudgetMoodState();
    var lower = String(text || "").toLowerCase();
    if (/(over budget|overspend|too much|limit|alert|risk|tight)/.test(lower)) {
      return "concerned";
    }
    if (/(great|nice|awesome|congrats|streak|saved|goal|progress|well done)/.test(lower)) {
      return "celebrating";
    }
    return base;
  }

  function setAvatarState(state, subtitleOverride) {
    currentAvatarState = state || "happy";
    var avatarEl = document.getElementById("chatAvatarImg");
    if (avatarEl) {
      var nextSrc = MASCOT_IMGS[currentAvatarState] || MASCOT_IMGS.happy;
      avatarEl.classList.add("is-fading");
      setTimeout(function () {
        avatarEl.src = nextSrc;
        avatarEl.classList.remove("is-fading");
      }, 120);
    }

    var subtitleEl = document.getElementById("chatSubtitle");
    if (subtitleEl) {
      if (subtitleOverride) {
        subtitleEl.textContent = subtitleOverride;
        return;
      }
      var labels = {
        happy: "On track — keep it up",
        thinking: "Sugbo is analyzing...",
        celebrating: "Doing great this week! 🎉",
        concerned: "Let's keep spending in check"
      };
      subtitleEl.textContent = labels[currentAvatarState] || "Your budget buddy";
    }
  }

  function getMessageContainer() {
    return document.getElementById("chatMessages");
  }

  function scrollToBottom() {
    var el = getMessageContainer();
    if (el) { el.scrollTop = el.scrollHeight; }
  }

  function clearWelcomeBlock() {
    var block = document.getElementById("chatWelcomeBlock");
    if (block && block.parentNode) { block.parentNode.removeChild(block); }
    var container = getMessageContainer();
    if (container) { container.classList.remove("is-empty"); }
  }

  function renderWelcomeBlock() {
    var container = getMessageContainer();
    if (!container || document.getElementById("chatWelcomeBlock")) { return; }
    container.classList.add("is-empty");

    var block = document.createElement("div");
    block.id = "chatWelcomeBlock";
    block.className = "chat-welcome-block";

    var msg = document.createElement("div");
    msg.className = "chat-msg chat-msg--bot";

    var avatar = document.createElement("img");
    avatar.src = MASCOT_IMGS.happy;
    avatar.alt = "Sugbo";
    avatar.className = "chat-msg-avatar";
    msg.appendChild(avatar);

    var inner = document.createElement("div");
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bubble--welcome";
    bubble.id = "chatWelcomeText";
    bubble.textContent = "Hi! I\u2019m Sugbo, your budget buddy. Ask me anything about your finances.";
    inner.appendChild(bubble);
    msg.appendChild(inner);
    block.appendChild(msg);

    var suggestions = document.createElement("div");
    suggestions.className = "chat-suggestions";
    SUGGESTIONS.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-suggestion-btn";
      btn.innerHTML = '<i class="bi ' + item.icon + '" aria-hidden="true"></i>' + item.label;
      btn.addEventListener("click", function () {
        clearWelcomeBlock();
        sendMessage(item.prompt);
      });
      suggestions.appendChild(btn);
    });
    block.appendChild(suggestions);

    container.appendChild(block);
    scrollToBottom();
  }

  function updateWelcomePersonalization() {
    var textEl = document.getElementById("chatWelcomeText");
    if (!textEl || !window.StorageAPI || !window.StorageAPI.getBudgetSummary) { return; }
    var summary = window.StorageAPI.getBudgetSummary();
    if (!summary) { return; }
    if (!summary.weeklyBudget || summary.weeklyBudget <= 0) {
      textEl.textContent = "Set a weekly budget in Settings so I can give you personalized tips.";
      return;
    }
    var spent = fmt(summary.totalSpentThisWeek || 0);
    var weekly = fmt(summary.weeklyBudget || 0);
    var remaining = summary.remaining || 0;
    var remainingText = remaining >= 0
      ? "You have " + fmt(remaining) + " left. Let's keep it steady!"
      : "You're over by " + fmt(Math.abs(remaining)) + ". Let's tighten up.";
    textEl.textContent = "You've spent " + spent + " this week out of " + weekly + ". " + remainingText;
  }

  function getChatShell() {
    return document.querySelector(".chat-app-main");
  }

  function openThreadDrawer() {
    var shell = getChatShell();
    if (!shell) { return; }
    shell.classList.add("is-sidebar-open");
    isSidebarOpen = true;
  }

  function closeThreadDrawer() {
    var shell = getChatShell();
    if (!shell) { return; }
    shell.classList.remove("is-sidebar-open");
    isSidebarOpen = false;
  }

  function toggleThreadDrawer() {
    if (isSidebarOpen) {
      closeThreadDrawer();
    } else {
      openThreadDrawer();
    }
  }

  function initThreadDrawer() {
    var toggleBtn = document.getElementById("chatSidebarToggle");
    var overlay = document.getElementById("chatSidebarOverlay");
    var closeBtn = document.getElementById("chatSidebarClose");

    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        toggleThreadDrawer();
      });
    }
    if (overlay) {
      overlay.addEventListener("click", function () {
        closeThreadDrawer();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeThreadDrawer();
      });
    }
  }

  function renderThreadSidebar() {
    var list = document.getElementById("chatHistoryList");
    if (!list || !window.StorageAPI || !window.StorageAPI.getChatThreads) { return; }

    var threads = window.StorageAPI.getChatThreads();
    activeThreadId = window.StorageAPI.getActiveChatThreadId
      ? window.StorageAPI.getActiveChatThreadId()
      : activeThreadId;

    list.innerHTML = "";

    if (!threads || threads.length === 0) {
      var empty = document.createElement("div");
      empty.className = "chat-history-empty";
      empty.textContent = "No conversations yet \u2014 start one below.";
      list.appendChild(empty);
      return;
    }

    threads.sort(function (a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });

    threads.forEach(function (thread) {
      var row = document.createElement("div");
      row.className = "chat-thread-row" + (thread.id === activeThreadId ? " is-active" : "");

      var main = document.createElement("button");
      main.type = "button";
      main.className = "chat-thread-main";

      var title = document.createElement("div");
      title.className = "chat-thread-title";
      title.textContent = thread.title || "New chat";

      var meta = document.createElement("div");
      meta.className = "chat-thread-meta";
      meta.textContent = formatThreadMeta(thread);

      main.appendChild(title);
      main.appendChild(meta);
      main.addEventListener("click", function () {
        if (thread.id !== activeThreadId) {
          setActiveThread(thread.id);
        }
        closeThreadDrawer();
      });

      var del = document.createElement("button");
      del.type = "button";
      del.className = "chat-thread-delete";
      del.setAttribute("aria-label", "Delete conversation");
      del.innerHTML = '<i class="bi bi-trash" aria-hidden="true"></i>';
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        pendingDeleteThreadId = thread.id;
        var modal = document.getElementById("chatClearModal");
        if (modal) { modal.classList.remove("hidden"); }
      });

      row.appendChild(main);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function setActiveThread(threadId) {
    isPendingNewThread = false;
    if (window.StorageAPI && window.StorageAPI.setActiveChatThread) {
      var result = window.StorageAPI.setActiveChatThread(threadId);
      if (!result || !result.ok) { return; }
    }
    loadActiveThread();
  }

  function loadActiveThread() {
    var container = getMessageContainer();
    if (container) { container.innerHTML = ""; }
    clearWelcomeBlock();

    // ?new=1 or compose button — show empty welcome, don't load any thread
    if (isPendingNewThread) {
      renderWelcomeBlock();
      renderThreadSidebar();
      return;
    }

    if (!window.StorageAPI || !window.StorageAPI.getActiveChatThread) {
      renderWelcomeBlock();
      return;
    }

    var thread = window.StorageAPI.getActiveChatThread();
    activeThreadId = thread ? thread.id : null;

    if (!thread || !thread.messages || thread.messages.length === 0) {
      renderWelcomeBlock();
      renderThreadSidebar();
      return;
    }

    thread.messages.forEach(function (item) {
      appendMsg(item.role, item.text, item.timestamp, true, getBudgetMoodState());
    });

    appendResumeSeparator(thread.updatedAt || thread.createdAt);
    scrollToBottom();
    renderThreadSidebar();
  }

  function appendMsg(role, text, timestamp, skipStore, avatarState) {
    var container = getMessageContainer();
    if (!container) { return; }
    container.classList.remove("is-empty");

    var msg = document.createElement("div");
    msg.className = "chat-msg chat-msg--" + (role === "user" ? "user" : "bot");

    if (role === "bot") {
      var avatar = document.createElement("img");
      avatar.src = MASCOT_IMGS[avatarState || currentAvatarState] || MASCOT_IMGS.happy;
      avatar.alt = "Sugbo";
      avatar.className = "chat-msg-avatar";
      msg.appendChild(avatar);
    }

    var inner = document.createElement("div");
    inner.className = "chat-msg-body";
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
      renderThreadSidebar();
    }
  }

  function addTypingIndicator() {
    var container = getMessageContainer();
    if (!container) { return null; }
    var id = "chat-typing-" + Date.now();
    var msg = document.createElement("div");
    msg.id = id;
    msg.className = "chat-msg chat-msg--bot";

    var avatar = document.createElement("img");
    avatar.src = MASCOT_IMGS.thinking;
    avatar.alt = "Sugbo";
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

  // ── Rate limit indicator (Step 7) ───────────────────────
  function updateRateIndicator() {
    var span = document.getElementById("chatRateCount");
    if (!span) { return; }
    if (!window.ChatAI || !window.ChatAI.getRateLimitStatus) {
      span.textContent = "";
      return;
    }
    var status = window.ChatAI.getRateLimitStatus();
    var used = status.used || 0;
    var max = status.max || 20;
    span.textContent = used + "/" + max + " this hour";
    span.classList.remove("rate-warn", "rate-limit");
    if (used >= max) {
      span.classList.add("rate-limit");
    } else if (used >= 12) {
      span.classList.add("rate-warn");
    }
  }

  // ── Scroll-to-bottom button (Step 8) ────────────────────
  function initScrollBtn() {
    var btn = document.getElementById("chatScrollBtn");
    var messages = document.getElementById("chatMessages");
    if (!btn || !messages) { return; }
    messages.addEventListener("scroll", function () {
      var atBottom = messages.scrollTop + messages.clientHeight >= messages.scrollHeight - 50;
      if (atBottom) {
        btn.classList.add("hidden");
      } else {
        btn.classList.remove("hidden");
      }
    });
    btn.addEventListener("click", function () {
      messages.scrollTop = messages.scrollHeight;
      btn.classList.add("hidden");
    });
  }

  function appendResumeSeparator(isoStr) {
    var container = getMessageContainer();
    if (!container) { return; }
    var label = "Continuing from ";
    if (isoStr) {
      var d = new Date(isoStr);
      var now = new Date();
      var yest = new Date(now); yest.setDate(now.getDate() - 1);
      if (d.toDateString() === now.toDateString()) {
        label += d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
      } else if (d.toDateString() === yest.toDateString()) {
        label += "yesterday";
      } else {
        label += d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
      }
    } else {
      label += "earlier";
    }
    var sep = document.createElement("div");
    sep.className = "chat-resume-sep";
    sep.textContent = label;
    container.appendChild(sep);
  }

  function loadHistory() {
    loadActiveThread();
  }

  function buildConversationHistory() {
    if (!window.StorageAPI || !window.StorageAPI.getActiveChatThread) { return []; }
    var thread = window.StorageAPI.getActiveChatThread();
    if (!thread || !Array.isArray(thread.messages)) { return []; }
    return thread.messages.slice(-6);
  }

  function setInputState(disabled) {
    var input = document.getElementById("chatInput");
    var btn = document.getElementById("chatSendBtn");
    var shouldDisable = disabled || isOffline;
    if (input) { input.disabled = shouldDisable; }
    if (btn) { btn.disabled = shouldDisable; }
  }

  function sendMessage(text) {
    if (isOffline) { return; }
    if (!text || !text.trim()) { return; }
    clearWelcomeBlock();

    // Create the thread now (deferred from clicking "+ New chat")
    if (isPendingNewThread && window.StorageAPI && window.StorageAPI.createChatThread) {
      var newResult = window.StorageAPI.createChatThread();
      if (newResult && newResult.ok && newResult.thread) {
        activeThreadId = newResult.thread.id;
      }
      isPendingNewThread = false;
    }

    // Record last chat activity for time-based panel open logic
    if (window.StorageAPI && window.StorageAPI.savePreferences) {
      window.StorageAPI.savePreferences({ lastChatAt: new Date().toISOString() });
    }

    // Notify parent frame that a message was sent (clears isPanelNewPending)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "sugbocents:messageSent" }, "*");
    }

    var trimmed = text.trim();
    appendMsg("user", trimmed, new Date().toISOString(), false);

    if (window.StorageAPI && window.StorageAPI.getPreferences && window.StorageAPI.savePreferences) {
      var _prefs = window.StorageAPI.getPreferences();
      if (!_prefs.chatPersonalized) { window.StorageAPI.savePreferences({ chatPersonalized: true }); }
    }

    // Step 9: Auto-name thread from first user message
    if (window.StorageAPI && window.StorageAPI.updateChatThreadTitle && activeThreadId) {
      var _thread = window.StorageAPI.getActiveChatThread();
      if (_thread && (_thread.title === "New chat" || !_thread.title)) {
        var autoTitle = trimmed.slice(0, 35) + (trimmed.length > 35 ? "\u2026" : "");
        window.StorageAPI.updateChatThreadTitle(activeThreadId, autoTitle);
        renderThreadSidebar();
      }
    }

    updateRateIndicator();
    setInputState(true);
    setAvatarState("thinking");
    var typingId = addTypingIndicator();

    if (window.ChatAI && window.ChatAI.isAvailable()) {
      var history = buildConversationHistory();
      window.ChatAI.send(trimmed, history).then(function (result) {
        removeTypingIndicator(typingId);
        setInputState(false);

        var reply;
        var replyState = getBudgetMoodState();

        if (result.ok && result.reply) {
          reply = result.reply;
          replyState = getReplyMoodState(reply);
        } else if (result.rateLimited) {
          reply = "⏳ " + result.error + " Check your dashboard while you wait.";
          replyState = "concerned";
        } else if (result.error) {
          reply = "I'm having trouble responding right now. Try again in a bit.";
          replyState = "concerned";
        } else {
          reply = window.ChatAI.getFallbackReply(trimmed, getBudgetMoodState());
        }

        setAvatarState(replyState);
        appendMsg("bot", reply, new Date().toISOString(), false, replyState);
        updateRateIndicator();
        focusInput();
      }).catch(function () {
        removeTypingIndicator(typingId);
        setInputState(false);
        var fallback = window.ChatAI
          ? window.ChatAI.getFallbackReply(trimmed, getBudgetMoodState())
          : "Sorry, I'm having trouble connecting right now. Try again in a moment!";
        setAvatarState(getBudgetMoodState());
        appendMsg("bot", fallback, new Date().toISOString(), false, getBudgetMoodState());
        updateRateIndicator();
        focusInput();
      });
    } else {
      var fallbackReply = window.ChatAI
        ? window.ChatAI.getFallbackReply(trimmed, getBudgetMoodState())
        : "I'm offline right now, but keep tracking those expenses! 💪";
      setTimeout(function () {
        removeTypingIndicator(typingId);
        setInputState(false);
        setAvatarState(getBudgetMoodState());
        appendMsg("bot", fallbackReply, new Date().toISOString(), false, getBudgetMoodState());
        updateRateIndicator();
        focusInput();
      }, 600);
    }
  }

  function focusInput() {
    var input = document.getElementById("chatInput");
    if (input) { input.focus(); }
  }

  function initDeleteModal() {
    var modal = document.getElementById("chatClearModal");
    var cancelBtn = document.getElementById("chatClearModalCancel");
    var confirmBtn = document.getElementById("chatClearModalConfirm");

    function hideModal() {
      if (modal) { modal.classList.add("hidden"); }
      pendingDeleteThreadId = null;
    }
    function doDelete() {
      var id = pendingDeleteThreadId;
      hideModal();
      if (!id) { return; }
      if (window.StorageAPI && window.StorageAPI.deleteChatThread) {
        window.StorageAPI.deleteChatThread(id);
      }
      loadActiveThread();
      renderThreadSidebar();
    }

    if (cancelBtn) { cancelBtn.addEventListener("click", hideModal); }
    if (confirmBtn) { confirmBtn.addEventListener("click", doDelete); }
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) { hideModal(); }
      });
    }
  }

  function initThreadActions() {
    initThreadDrawer();

    var newBtn = document.getElementById("chatNewThreadBtn");
    if (!newBtn) { return; }
    newBtn.addEventListener("click", function () {
      if (!window.StorageAPI) { return; }
      // Don't navigate away if already on an empty (unsaved) thread
      var currentThread = window.StorageAPI.getActiveChatThread
        ? window.StorageAPI.getActiveChatThread()
        : null;
      var currentHasMessages = currentThread && currentThread.messages && currentThread.messages.length > 0;
      if (!currentHasMessages && !isPendingNewThread) {
        closeThreadDrawer();
        return;
      }
      // Enforce 20-thread limit
      var threads = window.StorageAPI.getChatThreads ? window.StorageAPI.getChatThreads() : [];
      if (threads.length >= 20) {
        showInfoToast("You've reached the 20-chat limit. Delete an older conversation to start a new one.");
        closeThreadDrawer();
        return;
      }
      // Defer actual thread creation until the user sends their first message
      isPendingNewThread = true;
      activeThreadId = null;
      var container = getMessageContainer();
      if (container) { container.innerHTML = ""; }
      renderWelcomeBlock();
      renderThreadSidebar();
      closeThreadDrawer();
    });
  }

  function initEmbeddedMode() {
    if (window.self === window.top) { return; }
    document.body.classList.add("chat-embedded");

    // Hide the non-functional thread hamburger (sidebar is hidden in embedded mode)
    var toggle = document.getElementById("chatSidebarToggle");
    if (toggle) { toggle.style.display = "none"; }

    var backBtn = document.querySelector(".chat-page-back");
    if (!backBtn) { return; }
    backBtn.setAttribute("aria-label", "Close chat");
    backBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.parent) {
        window.parent.postMessage({ type: "sugbocents:closeChat" }, "*");
      }
    });
  }

  // Read URL params — runs in both full-page and embedded contexts
  function initFromParams() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") { isPendingNewThread = true; }
  }

  // Wire the back button on the full chat page (history.back with fallback)
  function initBackBtn() {
    var backBtn = document.getElementById("chatBackBtn");
    if (!backBtn) { return; }
    backBtn.addEventListener("click", function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "dashboard.html";
      }
    });
  }

  function ensureConnectionLayer() {
    var wrap = document.querySelector(".chat-page-wrap");
    if (!wrap) { return null; }
    var existing = document.getElementById("chatConnectionLayer");
    if (existing) { return existing; }

    var layer = document.createElement("div");
    layer.id = "chatConnectionLayer";
    layer.className = "chat-connection-layer";
    layer.innerHTML =
      '<div class="chat-connection-card">' +
        '<div class="chat-connection-spinner"></div>' +
        '<div class="chat-connection-title">Trying to connect...</div>' +
        '<div class="chat-connection-sub">Hang tight while Sugbo reconnects.</div>' +
      '</div>';
    wrap.appendChild(layer);
    return layer;
  }

  function showInfoToast(msg) {
    var existing = document.getElementById("chatInfoToast");
    if (existing) { existing.remove(); }
    var toast = document.createElement("div");
    toast.id = "chatInfoToast";
    toast.className = "chat-info-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) { toast.remove(); } }, 4000);
  }

  function setOfflineState(nextOffline) {
    isOffline = nextOffline;
    var layer = ensureConnectionLayer();
    if (layer) {
      if (isOffline) {
        layer.classList.add("is-visible");
      } else {
        layer.classList.remove("is-visible");
      }
    }
    setInputState(isOffline);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setAvatarState(getBudgetMoodState());
    initFromParams();
    initEmbeddedMode();
    initBackBtn();
    loadHistory();
    initDeleteModal();
    initThreadActions();
    initScrollBtn();
    updateRateIndicator();

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
        if (e.key === "Enter") {
          e.preventDefault();
          var val = input.value;
          input.value = "";
          sendMessage(val);
        }
      });
    }

    // Handle messages from parent frame (new chat trigger from compose button)
    window.addEventListener("message", function (event) {
      if (!event || !event.data || event.data.type !== "sugbocents:newChat") { return; }
      var currentThread = window.StorageAPI && window.StorageAPI.getActiveChatThread
        ? window.StorageAPI.getActiveChatThread()
        : null;
      var hasMessages = currentThread && currentThread.messages && currentThread.messages.length > 0;
      if (!hasMessages && !isPendingNewThread) { return; } // already on empty
      var threads = window.StorageAPI && window.StorageAPI.getChatThreads ? window.StorageAPI.getChatThreads() : [];
      if (threads.length >= 20) {
        showInfoToast("You\u2019ve reached the 20-chat limit. Delete an older conversation to start a new one.");
        return;
      }
      isPendingNewThread = true;
      activeThreadId = null;
      var container = getMessageContainer();
      if (container) { container.innerHTML = ""; }
      renderWelcomeBlock();
      renderThreadSidebar();
    });

    setOfflineState(!navigator.onLine);
    window.addEventListener("offline", function () { setOfflineState(true); });
    window.addEventListener("online", function () {
      setOfflineState(false);
      setAvatarState(getBudgetMoodState());
    });

    window.addEventListener("sugbocents:synced", function () {
      setAvatarState(getBudgetMoodState());
      renderThreadSidebar();
    });
  });
})();