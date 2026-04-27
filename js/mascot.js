(function () {
  // ── Mascot state definitions ─────────────────────────────
  var STATES = {
    happy:   { emoji: "😊", label: "Doing great!", cls: "mascot-happy" },
    neutral: { emoji: "🙂", label: "On track",     cls: "mascot-neutral" },
    worried: { emoji: "😟", label: "Heads up!",    cls: "mascot-worried" },
    alarmed: { emoji: "😱", label: "Budget alert!", cls: "mascot-alarmed" }
  };

  // ── Rule-based chatbot responses ─────────────────────────
  var RESPONSES = {
    happy: [
      "You're killing it this week! 🎉 Budget is in great shape.",
      "Love the discipline! Keep it up and you'll reach your goals fast.",
      "Great job! You still have plenty of budget left. Maybe add a goal?"
    ],
    neutral: [
      "You're doing okay, but keep an eye on spending.",
      "Halfway through your budget. Think before the next big expense!",
      "Not bad! A little mindfulness goes a long way."
    ],
    worried: [
      "⚠️ Budget is getting tight. Slow down on non-essentials.",
      "You've spent a good chunk already. Tread carefully!",
      "Consider reviewing your quick-add shortcuts to avoid overspending."
    ],
    alarmed: [
      "🚨 You're nearly out of budget! No more spending today.",
      "Budget critical! Check your recent expenses in Activity.",
      "Time to tighten up. Your goals may be at risk if spending continues."
    ]
  };

  var KEYWORD_REPLIES = [
    { keys: ["hello", "hi", "hey"],        reply: "Hey there! 👋 I'm Sugbo, your budget buddy. How can I help?" },
    { keys: ["budget"],                     reply: "Your weekly budget is your spending limit. Set it in Settings!" },
    { keys: ["goal", "goals"],              reply: "Go to the Tigom tab to create and track your savings goals! 🎯" },
    { keys: ["expense", "expenses"],        reply: "Log expenses on the Dashboard or browse them in Activity." },
    { keys: ["streak"],                     reply: "Streaks reward consistent saving. Complete goals to build yours! 🔥" },
    { keys: ["chart", "graph", "stats"],    reply: "Scroll down on the Dashboard to see your spending chart! 📊" },
    { keys: ["help"],                       reply: "I can help with budget tips, goals, and streaks. Just ask me anything!" },
    { keys: ["thanks", "thank you", "ty"],  reply: "You're welcome! Keep saving, you've got this. 💪" },
    { keys: ["good", "great", "awesome"],   reply: "Glad to hear it! 😄 Your finances are looking up!" },
    { keys: ["bad", "terrible", "awful"],   reply: "Hang in there! Every peso saved counts. You can turn it around." }
  ];

  // ── Compute mascot state from budget data ────────────────
  function getMascotState() {
    if (!window.StorageAPI) {
      return "neutral";
    }
    var summary = window.StorageAPI.getBudgetSummary();
    var pct = summary.percentageSpent;
    if (pct >= 90) { return "alarmed"; }
    if (pct >= 65) { return "worried"; }
    if (pct >= 30) { return "neutral"; }
    return "happy";
  }

  function getRandomReply(state) {
    var arr = RESPONSES[state] || RESPONSES.neutral;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getKeywordReply(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < KEYWORD_REPLIES.length; i++) {
      var entry = KEYWORD_REPLIES[i];
      for (var j = 0; j < entry.keys.length; j++) {
        if (lower.indexOf(entry.keys[j]) !== -1) {
          return entry.reply;
        }
      }
    }
    return null;
  }

  // ── Build DOM ────────────────────────────────────────────
  function buildWidget() {
    var state = getMascotState();
    var stateObj = STATES[state];

    // Floating action button
    var fab = document.createElement("button");
    fab.id = "mascotFab";
    fab.className = "mascot-fab " + stateObj.cls;
    fab.setAttribute("aria-label", "Open Sugbo assistant");
    fab.setAttribute("title", "Chat with Sugbo");
    fab.textContent = stateObj.emoji;
    document.body.appendChild(fab);

    // Chatbox
    var chatbox = document.createElement("div");
    chatbox.id = "mascotChatbox";
    chatbox.className = "mascot-chatbox hidden";
    chatbox.setAttribute("role", "dialog");
    chatbox.setAttribute("aria-label", "Sugbo assistant chat");

    var healthPct = getHealthPct();
    var healthCls = healthPct > 60 ? "" : (healthPct > 30 ? "health-warn" : "health-danger");

    chatbox.innerHTML =
      '<div class="mascot-chatbox-header">' +
        '<span class="mascot-avatar" id="mascotAvatarEmoji">' + stateObj.emoji + '</span>' +
        '<div>' +
          '<div class="mascot-name">Sugbo</div>' +
          '<div class="mascot-status" id="mascotStatusText">' + stateObj.label + '</div>' +
        '</div>' +
        '<button class="mascot-chatbox-close" id="mascotCloseBtn" aria-label="Close chat">✕</button>' +
      '</div>' +
      '<div class="mascot-health-bar-wrap">' +
        '<span class="mascot-health-label">Mood</span>' +
        '<div class="mascot-health-track">' +
          '<div class="mascot-health-fill ' + healthCls + '" id="mascotHealthFill" style="width:' + healthPct + '%"></div>' +
        '</div>' +
      '</div>' +
      '<div class="mascot-chatbox-body" id="mascotBody"></div>' +
      '<div class="mascot-chatbox-footer">' +
        '<input class="mascot-input" id="mascotInput" type="text" placeholder="Ask Sugbo…" maxlength="200" autocomplete="off" />' +
        '<button class="mascot-send-btn" id="mascotSendBtn" aria-label="Send">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
      '</div>';

    document.body.appendChild(chatbox);
  }

  function getHealthPct() {
    if (!window.StorageAPI) { return 100; }
    var summary = window.StorageAPI.getBudgetSummary();
    return Math.max(0, 100 - summary.percentageSpent);
  }

  // ── Chat functionality ────────────────────────────────────
  function addMessage(text, who) {
    var body = document.getElementById("mascotBody");
    if (!body) { return; }
    var msg = document.createElement("div");
    msg.className = "mascot-msg mascot-msg-" + who;
    var bubble = document.createElement("div");
    bubble.className = "mascot-bubble";
    bubble.textContent = text;
    msg.appendChild(bubble);
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function sendUserMessage(text) {
    if (!text.trim()) { return; }
    addMessage(text, "user");
    var state = getMascotState();
    var reply = getKeywordReply(text) || getRandomReply(state);
    setTimeout(function () {
      addMessage(reply, "bot");
    }, 500);
  }

  function openChat() {
    var chatbox = document.getElementById("mascotChatbox");
    var fab = document.getElementById("mascotFab");
    if (!chatbox) { return; }
    chatbox.classList.remove("hidden");
    fab.classList.add("mascot-bounce");
    setTimeout(function () { fab.classList.remove("mascot-bounce"); }, 600);

    // Post greeting if no messages yet
    var body = document.getElementById("mascotBody");
    if (body && body.children.length === 0) {
      var state = getMascotState();
      addMessage(getRandomReply(state), "bot");
    }

    var input = document.getElementById("mascotInput");
    if (input) { input.focus(); }

    updateMascotState();
  }

  function closeChat() {
    var chatbox = document.getElementById("mascotChatbox");
    if (chatbox) { chatbox.classList.add("hidden"); }
  }

  // ── Update mascot appearance ─────────────────────────────
  function updateMascotState() {
    var state = getMascotState();
    var stateObj = STATES[state];
    var fab = document.getElementById("mascotFab");
    var emoji = document.getElementById("mascotAvatarEmoji");
    var statusText = document.getElementById("mascotStatusText");
    var fill = document.getElementById("mascotHealthFill");

    if (fab) {
      fab.className = "mascot-fab " + stateObj.cls;
      fab.textContent = stateObj.emoji;
    }
    if (emoji) { emoji.textContent = stateObj.emoji; }
    if (statusText) { statusText.textContent = stateObj.label; }

    var pct = getHealthPct();
    if (fill) {
      fill.style.width = pct + "%";
      fill.className = "mascot-health-fill" +
        (pct > 60 ? "" : (pct > 30 ? " health-warn" : " health-danger"));
    }
  }

  // ── Draggable FAB ────────────────────────────────────────
  function makeDraggable(fab) {
    var isDragging = false;
    var startX, startY, origRight, origBottom;
    var moved = false;

    function onStart(clientX, clientY) {
      isDragging = true;
      moved = false;
      startX = clientX;
      startY = clientY;
      
      fab.style.transition = "none";
      
      var rect = fab.getBoundingClientRect();
      origRight  = window.innerWidth  - rect.right;
      origBottom = window.innerHeight - rect.bottom;
    }

    function onMove(clientX, clientY) {
      if (!isDragging) { return; }
      var dx = clientX - startX;
      var dy = clientY - startY;
      
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { moved = true; }
      
      var newRight  = Math.max(0, origRight  - dx);
      var newBottom = Math.max(0, origBottom - dy); 
      
      newRight  = Math.min(window.innerWidth  - fab.offsetWidth, newRight);
      newBottom = Math.min(window.innerHeight - fab.offsetHeight, newBottom);
      
      fab.style.right  = newRight  + "px";
      fab.style.bottom = newBottom + "px";
    }

    function onEnd() {
      if (!isDragging) { return; } 
      isDragging = false;
      
      if (!moved) {
        fab.style.transition = ""; 
        var chatbox = document.getElementById("mascotChatbox");
        if (chatbox && chatbox.classList.contains("hidden")) {
          openChat();
        } else {
          closeChat();
        }
      } else {
        // ── DISTANCE-BASED CORNER SNAPPING LOGIC ──
        
        var rect = fab.getBoundingClientRect();
        
        // 1. Calculate how far the widget's edges are from the screen's edges
        var distLeft = rect.left;
        var distRight = window.innerWidth - rect.right;
        var distTop = rect.top;
        var distBottom = window.innerHeight - rect.bottom;
        
        // 2. Figure out which quadrant the widget is in
        var isLeftHalf = distLeft < distRight;
        var isTopHalf = distTop < distBottom;
        
        var minDistX = isLeftHalf ? distLeft : distRight;
        var minDistY = isTopHalf ? distTop : distBottom;
        
        // 3. Calculate straight-line distance to the nearest corner
        var distanceToCorner = Math.sqrt((minDistX * minDistX) + (minDistY * minDistY));
        
        // 🎛️ SETTING: How close (in pixels) it needs to be to snap to the corner
        var snapThreshold = 150; 
        
        if (distanceToCorner <= snapThreshold) {
          // --> It's close to a corner: SNAP IT
          fab.style.transition = "right 0.3s ease-out, bottom 0.3s ease-out";
          
          var margin = 20; // 20px gap from the edge of the screen
          
          var targetRight = isLeftHalf ? (window.innerWidth - rect.width - margin) : margin;
          var targetBottom = isTopHalf ? (window.innerHeight - rect.height - margin) : margin;
          
          fab.style.right = targetRight + "px";
          fab.style.bottom = targetBottom + "px";
          
          // Clean up transition after animation completes
          setTimeout(function() {
             fab.style.transition = ""; 
          }, 300);
          
        } else {
          // --> It's far from a corner: LEAVE IT THERE
          fab.style.transition = "";
        }
      }
    }

    // Event Listeners
    fab.addEventListener("mousedown", function (e) {
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    });
    
    document.addEventListener("mousemove", function (e) {
      onMove(e.clientX, e.clientY);
    });
    
    document.addEventListener("mouseup", function () {
      onEnd();
    });

    fab.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    
    document.addEventListener("touchmove", function (e) {
      if (!isDragging) { return; }
      e.preventDefault(); 
      var t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: false });
    
    document.addEventListener("touchend", function () {
      onEnd();
    });
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    buildWidget();

    var fab = document.getElementById("mascotFab");
    var closeBtn = document.getElementById("mascotCloseBtn");
    var sendBtn = document.getElementById("mascotSendBtn");
    var input = document.getElementById("mascotInput");

    if (fab) { makeDraggable(fab); }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeChat);
    }

    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        var val = input ? input.value.trim() : "";
        if (val) {
          sendUserMessage(val);
          if (input) { input.value = ""; }
        }
      });
    }

    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var val = input.value.trim();
          if (val) {
            sendUserMessage(val);
            input.value = "";
          }
        }
      });
    }

    // Re-run state update when expenses change
    window.addEventListener("sugbocents:synced", updateMascotState);
  }

  document.addEventListener("DOMContentLoaded", function () {
    init();
  });

  window.MascotWidget = {
    update: updateMascotState
  };
})();
