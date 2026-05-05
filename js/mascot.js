(function () {
  var MASCOT_FAB_POS_KEY = "sugbocents:mascot-fab-pos";
  var MASCOT_CHAT_POS_KEY = "sugbocents:mascot-chat-pos";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getBottomObstructionHeight() {
    var nav = document.querySelector(".bottom-nav");
    if (!nav) { return 0; }
    var style = window.getComputedStyle(nav);
    if (style.display === "none" || style.visibility === "hidden") { return 0; }
    return nav.offsetHeight || 0;
  }

  function readSavedPos(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) { return null; }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.right !== "number" || typeof parsed.bottom !== "number") {
        return null;
      }
      return { right: parsed.right, bottom: parsed.bottom };
    } catch (_err) {
      return null;
    }
  }

  function savePos(key, right, bottom) {
    try {
      localStorage.setItem(key, JSON.stringify({ right: right, bottom: bottom }));
    } catch (_err) {
      // Ignore storage errors silently.
    }
  }

  function applySavedPos(el, key) {
    if (!el) { return; }
    var saved = readSavedPos(key);
    if (!saved) { return; }

    var minBottom = getBottomObstructionHeight();
    var maxRight = Math.max(0, window.innerWidth - el.offsetWidth);
    var maxBottom = Math.max(minBottom, window.innerHeight - el.offsetHeight);
    var right = clamp(saved.right, 0, maxRight);
    var bottom = clamp(saved.bottom, minBottom, maxBottom);

    el.style.right = right + "px";
    el.style.bottom = bottom + "px";
  }

  function persistCurrentPos(el, key) {
    if (!el) { return; }
    var rect = el.getBoundingClientRect();
    var right = window.innerWidth - rect.right;
    var bottom = window.innerHeight - rect.bottom;
    savePos(key, Math.max(0, right), Math.max(0, bottom));
  }

  function keepInViewport(el, key) {
    if (!el) { return; }
    var rect = el.getBoundingClientRect();
    var minBottom = getBottomObstructionHeight();
    var maxRight = Math.max(0, window.innerWidth - rect.width);
    var maxBottom = Math.max(minBottom, window.innerHeight - rect.height);
    var right = clamp(window.innerWidth - rect.right, 0, maxRight);
    var bottom = clamp(window.innerHeight - rect.bottom, minBottom, maxBottom);
    el.style.right = right + "px";
    el.style.bottom = bottom + "px";
    savePos(key, right, bottom);
  }

  // ── Mascot state definitions ─────────────────────────────
  var STATES = {
    happy:   { img: "assets/images/mascot/mascot-happy.png",   label: "Doing great!",  cls: "mascot-happy" },
    neutral: { img: "assets/images/mascot/mascot-neutral.png",  label: "On track",      cls: "mascot-neutral" },
    worried: { img: "assets/images/mascot/mascot-sad.png",      label: "Heads up!",     cls: "mascot-worried" },
    alarmed: { img: "assets/images/mascot/mascot-shocked.png",  label: "Budget alert!", cls: "mascot-alarmed" }
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
  function getBudgetSummaryForMascot() {
    if (window.SugboCentsBudgetPreview) {
      return window.SugboCentsBudgetPreview;
    }
    if (!window.StorageAPI) {
      return null;
    }
    return window.StorageAPI.getBudgetSummary();
  }

  function getMascotState() {
    var summary = getBudgetSummaryForMascot();
    if (!summary) {
      return "neutral";
    }
    if (summary.remaining < 0) { return "alarmed"; }
    var pct = summary.percentageSpent;
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
    
    // --> ADDED: Insert the image instead of textContent
    fab.innerHTML = '<img src="' + stateObj.img + '" class="mascot-fab-img" alt="Sugbo" draggable="false" />';
    
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
        // --> ADDED: Use an <img> tag for the chatbox avatar
        '<img class="mascot-avatar" id="mascotAvatarImg" src="' + stateObj.img + '" alt="Sugbo" draggable="false" />' +
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
        '<input class="mascot-input" id="mascotInput" type="text" placeholder="Ask Tigom…" maxlength="200" autocomplete="off" />' +
        '<button class="mascot-send-btn" id="mascotSendBtn" aria-label="Send">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="mascot-chatbox-fullchat">' +
        '<a href="chat.html" class="mascot-fullchat-link">Open full conversation →</a>' +
      '</div>';

    document.body.appendChild(chatbox);
  }

  function getHealthPct() {
    var summary = getBudgetSummaryForMascot();
    if (!summary) { return 100; }
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

  function addTypingIndicator() {
    var body = document.getElementById("mascotBody");
    if (!body) { return null; }
    var id = "mascot-typing-" + Date.now();
    var msg = document.createElement("div");
    msg.id = id;
    msg.className = "mascot-msg mascot-msg-bot";
    var bubble = document.createElement("div");
    bubble.className = "mascot-bubble mascot-typing";
    bubble.innerHTML = "<span></span><span></span><span></span>";
    msg.appendChild(bubble);
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    if (!id) { return; }
    var el = document.getElementById(id);
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }

  function sendUserMessage(text) {
    if (!text.trim()) { return; }
    addMessage(text, "user");
    var state = getMascotState();

    if (window.ChatAI && window.ChatAI.isAvailable()) {
      var typingId = addTypingIndicator();
      // Build short history from visible messages for context
      var history = [];
      var body = document.getElementById("mascotBody");
      if (body) {
        var msgs = body.querySelectorAll(".mascot-msg");
        var start = Math.max(0, msgs.length - 7); // last few messages
        for (var i = start; i < msgs.length - 1; i++) {
          var role = msgs[i].classList.contains("mascot-msg-user") ? "user" : "bot";
          var bubbleEl = msgs[i].querySelector(".mascot-bubble");
          if (bubbleEl && !bubbleEl.classList.contains("mascot-typing")) {
            history.push({ role: role, text: bubbleEl.textContent });
          }
        }
      }
      window.ChatAI.send(text, history).then(function (result) {
        removeTypingIndicator(typingId);
        if (result.ok && result.reply) {
          addMessage(result.reply, "bot");
        } else {
          addMessage(window.ChatAI.getFallbackReply(text, state), "bot");
        }
      }).catch(function () {
        removeTypingIndicator(typingId);
        addMessage(window.ChatAI.getFallbackReply(text, state), "bot");
      });
    } else {
      var reply = getKeywordReply(text) || getRandomReply(state);
      setTimeout(function () {
        addMessage(reply, "bot");
      }, 500);
    }
  }

  function openChat() {
    console.log("[MASCOT] openChat() called");
    var chatbox = document.getElementById("mascotChatbox");
    var fab = document.getElementById("mascotFab");
    if (!chatbox) { 
      console.error("[MASCOT] openChat: chatbox element not found!");
      return; 
    }
    console.log("[MASCOT] Removing 'hidden' class from chatbox");
    chatbox.classList.remove("hidden");
    fab.classList.add("mascot-bounce");
    setTimeout(function () { fab.classList.remove("mascot-bounce"); }, 600);

    // Post greeting if no messages yet
    var body = document.getElementById("mascotBody");
    if (body && body.children.length === 0) {
      var state = getMascotState();
      if (window.ChatAI && window.ChatAI.isAvailable()) {
        var typingId = addTypingIndicator();
        window.ChatAI.send("Hi! Give me a quick, friendly greeting and one tip about my budget this week.", []).then(function (result) {
          removeTypingIndicator(typingId);
          addMessage(result.ok ? result.reply : getRandomReply(getMascotState()), "bot");
        }).catch(function () {
          removeTypingIndicator(typingId);
          addMessage(getRandomReply(getMascotState()), "bot");
        });
      } else {
        addMessage(getRandomReply(state), "bot");
      }
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
    var avatarImg = document.getElementById("mascotAvatarImg"); // Changed to target the image
    var statusText = document.getElementById("mascotStatusText");
    var fill = document.getElementById("mascotHealthFill");

    if (fab) {
      fab.className = "mascot-fab " + stateObj.cls;
      // Update the FAB image source safely
      var fabImg = fab.querySelector('.mascot-fab-img');
      if (fabImg) {
        fabImg.src = stateObj.img;
      }
    }
    
    // Update Chatbox Avatar image
    if (avatarImg) { avatarImg.src = stateObj.img; }
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
      console.log("[MASCOT] FAB: mousedown/touchstart detected");
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
      var minBottom = getBottomObstructionHeight();
      
      newRight  = Math.min(window.innerWidth  - fab.offsetWidth, newRight);
      newBottom = clamp(newBottom, minBottom, window.innerHeight - fab.offsetHeight);
      
      fab.style.right  = newRight  + "px";
      fab.style.bottom = newBottom + "px";
    }

    function onEnd() {
      if (!isDragging) { return; } 
      isDragging = false;
      console.log("[MASCOT] FAB: mouseup/touchend - moved:", moved);
      
      if (!moved) {
        console.log("[MASCOT] FAB: Attempting to open/close chat");
        fab.style.transition = ""; 
        var chatbox = document.getElementById("mascotChatbox");
        if (chatbox && chatbox.classList.contains("hidden")) {
          console.log("[MASCOT] Calling openChat()");
          openChat();
        } else {
          console.log("[MASCOT] Calling closeChat()");
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
          var bottomObstruction = getBottomObstructionHeight();
          
          var targetRight = isLeftHalf ? (window.innerWidth - rect.width - margin) : margin;
          var targetBottom = isTopHalf
            ? (window.innerHeight - rect.height - margin)
            : (margin + bottomObstruction);
          targetBottom = Math.max(bottomObstruction, targetBottom);
          
          fab.style.right = targetRight + "px";
          fab.style.bottom = targetBottom + "px";
          savePos(MASCOT_FAB_POS_KEY, targetRight, targetBottom);
          
          // Clean up transition after animation completes
          setTimeout(function() {
             fab.style.transition = ""; 
          }, 300);
          
        } else {
          // --> It's far from a corner: LEAVE IT THERE
          fab.style.transition = "";
          persistCurrentPos(fab, MASCOT_FAB_POS_KEY);
        }
      }
    }



        // Event Listeners
        fab.addEventListener("mousedown", function (e) {
          console.log("[MASCOT] FAB mousedown event fired");
          e.preventDefault();
          onStart(e.clientX, e.clientY);
        });
        
        document.addEventListener("mousemove", function (e) {
          onMove(e.clientX, e.clientY);
        });
        
        document.addEventListener("mouseup", function () {
          console.log("[MASCOT] Document mouseup event fired");
          onEnd();
        });

        fab.addEventListener("touchstart", function (e) {
          console.log("[MASCOT] FAB touchstart event fired");
          e.preventDefault(); // Prevents double-firing (synthetic mouse events) on mobile
          var t = e.touches[0];
          onStart(t.clientX, t.clientY);
        }, { passive: false });
        
        document.addEventListener("touchmove", function (e) {
          if (!isDragging) { return; }
          e.preventDefault(); 
          var t = e.touches[0];
          onMove(t.clientX, t.clientY);
        }, { passive: false });
        
        document.addEventListener("touchend", function () {
          console.log("[MASCOT] Document touchend event fired");
          onEnd();
        });
      }


      

  // ── Draggable Chatbox ─────────────────────────────────────
      function makeChatboxDraggable(chatbox) {
        // Only grab the header to drag, so the user can still type and scroll inside the chat!
        var handle = chatbox.querySelector(".mascot-chatbox-header");
        if (!handle) return;

        var isDragging = false;
        var startX, startY, origRight, origBottom;

        function onStart(clientX, clientY, target) {
          // Do not start dragging if the user clicked the close button
          if (target && target.closest('#mascotCloseBtn')) {
            return;
          }
          
          isDragging = true;
          startX = clientX;
          startY = clientY;
          
          chatbox.style.transition = "none";
          
          var rect = chatbox.getBoundingClientRect();
          origRight  = window.innerWidth  - rect.right;
          origBottom = window.innerHeight - rect.bottom;
        }

        function onMove(clientX, clientY) {
          if (!isDragging) { return; }
          
          var dx = clientX - startX;
          var dy = clientY - startY;
          
          var newRight  = Math.max(0, origRight  - dx);
          var newBottom = Math.max(0, origBottom - dy); 
          var minBottom = getBottomObstructionHeight();
          
          // Keep the chatbox from being dragged completely off the screen
          newRight  = Math.min(window.innerWidth  - chatbox.offsetWidth, newRight);
          newBottom = clamp(newBottom, minBottom, window.innerHeight - chatbox.offsetHeight);
          
          chatbox.style.right  = newRight  + "px";
          chatbox.style.bottom = newBottom + "px";
        }

        function onEnd() {
          if (!isDragging) { return; } 
          isDragging = false;
          chatbox.style.transition = ""; 
          // No corner snapping here! It just stays exactly where dropped.
          persistCurrentPos(chatbox, MASCOT_CHAT_POS_KEY);
        }

        // Event Listeners for the Header
        handle.addEventListener("mousedown", function (e) {
          if (e.target.closest('#mascotCloseBtn')) return;
          e.preventDefault(); // Prevents text highlighting while dragging
          onStart(e.clientX, e.clientY, e.target);
        });
        
        document.addEventListener("mousemove", function (e) {
          onMove(e.clientX, e.clientY);
        });
        
        document.addEventListener("mouseup", function () {
          onEnd();
        });

      handle.addEventListener("touchstart", function (e) {
          if (e.target.closest('#mascotCloseBtn')) return;
          e.preventDefault(); // Prevents double-firing when tapping/dragging the header
          var t = e.touches[0];
          onStart(t.clientX, t.clientY, e.target);
        }, { passive: false });
        
        document.addEventListener("touchmove", function (e) {
          if (!isDragging) { return; }
          e.preventDefault(); // Stops the page from scrolling on mobile
          var t = e.touches[0];
          onMove(t.clientX, t.clientY);
        }, { passive: false });
        
        document.addEventListener("touchend", function () {
          onEnd();
        });
      }


  // ── Init ─────────────────────────────────────────────────
  function init() {
    console.log("[MASCOT] init() starting");
    buildWidget();
    console.log("[MASCOT] buildWidget() completed");

    var fab = document.getElementById("mascotFab");
    console.log("[MASCOT] FAB element found:", !!fab);
    var chatbox = document.getElementById("mascotChatbox"); // <-- ADD THIS
    console.log("[MASCOT] Chatbox element found:", !!chatbox);
    var closeBtn = document.getElementById("mascotCloseBtn");
    var sendBtn = document.getElementById("mascotSendBtn");
    var input = document.getElementById("mascotInput");

    if (fab) { 
      console.log("[MASCOT] Calling makeDraggable(fab)");
      makeDraggable(fab); 
    }

    if (chatbox) { makeChatboxDraggable(chatbox); } // <-- ADD THIS

    applySavedPos(fab, MASCOT_FAB_POS_KEY);
    applySavedPos(chatbox, MASCOT_CHAT_POS_KEY);

    window.addEventListener("resize", function () {
      keepInViewport(fab, MASCOT_FAB_POS_KEY);
      keepInViewport(chatbox, MASCOT_CHAT_POS_KEY);
    });

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

    // Re-run state update when budget-related data changes
    window.addEventListener("sugbocents:budget-changed", updateMascotState);
    window.addEventListener("sugbocents:synced", updateMascotState);
  }

  document.addEventListener("DOMContentLoaded", function () {
    console.log("[MASCOT] DOMContentLoaded fired, calling init()");
    init();
  });

  window.MascotWidget = {
    update: updateMascotState
  };

  function updateMascotDisplay() {
    var state = getMascotState();
    var stateObj = STATES[state];
    var fab = document.getElementById("mascotFab");
    if (fab) {
      fab.className = "mascot-fab " + stateObj.cls;
      var img = fab.querySelector(".mascot-fab-img");
      if (img) {
        img.src = stateObj.img;
      }
    }
  }

  // Public API
  window.MascotAPI = {
    buildWidget: buildWidget,
    getMascotState: getMascotState,
    updateMascotDisplay: updateMascotDisplay,
    getRandomReply: getRandomReply,
    getKeywordReply: getKeywordReply,
  };
})();



//MASCTOT ANIMATIONS IN DASHBOARD-------------------------------
document.addEventListener("DOMContentLoaded", function() {
  var mascotImg = document.getElementById("dashboardMascotImg");
  var speechBubble = document.getElementById("mascotSpeechBubble");
  var mascotWrapper = mascotImg ? mascotImg.closest(".dashboard-mascot-wrapper") : null;

  if (!mascotImg || !speechBubble || !mascotWrapper) return; // Exit if not on the dashboard

  var fullBodyGifs = {
    wave: "assets/images/mascot/fullbody-wave.gif",
    sleepy: "assets/images/mascot/fullbody-sleepy.gif",
    shocked: "assets/images/mascot/fullbody-shocked.gif",
    confused: "assets/images/mascot/fullbody-confused.gif",
    dance: "assets/images/mascot/fullbody-dance.gif"
  };

  var encouragingMessages = [
    "You've got this!",
    "Every peso counts. Keep it up!",
    "I'm proud of your progress.",
    "Let's crush those savings goals today!",
    "Keep making smart choices."
  ];

  var alarmMessage = "Budget exceeded. Stop spending for now and check your latest expenses.";
  var bubbleTimeout = null;
  var flashTimeout = null;
  var lastBudgetState = null;
  var alarmShown = false;

  function getBudgetState() {
    if (window.MascotAPI && typeof window.MascotAPI.getMascotState === "function") {
      return window.MascotAPI.getMascotState();
    }
    if (window.StorageAPI && typeof window.StorageAPI.getBudgetSummary === "function") {
      var summary = window.StorageAPI.getBudgetSummary();
      if (summary && summary.remaining < 0) { return "alarmed"; }
    }
    return "neutral";
  }

  function setMascotImage(src) {
    mascotImg.src = src + "?t=" + new Date().getTime();
  }

  function hideBubble() {
    speechBubble.classList.remove("show-bubble", "mascot-alert-bubble");
  }

  function showBubble(message, isAlert) {
    speechBubble.textContent = message;
    speechBubble.classList.remove("show-bubble", "mascot-alert-bubble");
    void speechBubble.offsetWidth;
    if (isAlert) {
      speechBubble.classList.add("mascot-alert-bubble");
    }
    speechBubble.classList.add("show-bubble");

    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(function() {
      hideBubble();
    }, isAlert ? 4200 : 4000);
  }

  function getOrCreateAlarmOverlay() {
    var overlay = document.getElementById("mascotAlarmOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mascotAlarmOverlay";
      overlay.className = "mascot-alarm-overlay";
      overlay.innerHTML =
        '<div class="mascot-alarm-card">' +
          '<img src="' + fullBodyGifs.shocked + '" alt="Alert Mascot" draggable="false" />' +
          '<h2>Budget Exceeded!</h2>' +
          '<p>' + alarmMessage + '</p>' +
        '</div>';
      document.body.appendChild(overlay);

      overlay.addEventListener("click", function() {
        hideAlarmOverlay();
      });
    }
    return overlay;
  }

  function showAlarmOverlay() {
    var overlay = getOrCreateAlarmOverlay();
    overlay.classList.remove("hidden");
    void overlay.offsetWidth; // force reflow
    overlay.classList.add("show");

    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(function() {
      hideAlarmOverlay();
    }, 4000);
  }

  function hideAlarmOverlay() {
    var overlay = document.getElementById("mascotAlarmOverlay");
    if (overlay) {
      overlay.classList.remove("show");
      setTimeout(function() {
        if (!overlay.classList.contains("show")) {
          overlay.classList.add("hidden");
        }
      }, 350);
    }
  }

  function playRandomMascot() {
    var choices = [fullBodyGifs.wave, fullBodyGifs.sleepy, fullBodyGifs.confused, fullBodyGifs.dance];
    var randomGif = choices[Math.floor(Math.random() * choices.length)];
    setMascotImage(randomGif);
    mascotWrapper.classList.remove("dashboard-alert-active");
    hideBubble();
  }

  function playAlertMascot(forceFlash) {
    if (forceFlash !== false) {
      showAlarmOverlay();
    }
    mascotWrapper.classList.add("dashboard-alert-active");
    setMascotImage(fullBodyGifs.shocked);
    showBubble(alarmMessage, true);
    alarmShown = true;
  }

  function syncMascotToBudget(force) {
    var state = getBudgetState();
    var shouldFlash = force || lastBudgetState !== state;

    if (state === "alarmed") {
      mascotWrapper.classList.add("dashboard-alert-active");
      setMascotImage(fullBodyGifs.shocked);
      if (shouldFlash || !alarmShown) {
        playAlertMascot(shouldFlash);
      }
    } else {
      alarmShown = false;
      mascotWrapper.classList.remove("dashboard-alert-active");
      if (shouldFlash) {
        playRandomMascot();
      }
    }

    lastBudgetState = state;
  }

  function interactWithMascot(isClick) {
    var state = getBudgetState();

    if (state === "alarmed") {
      playAlertMascot(isClick !== false);
      return;
    }

    playRandomMascot();

    if (isClick) {
      var randomMsg = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
      showBubble(randomMsg, false);
    }
  }

  syncMascotToBudget(true);

  mascotImg.addEventListener("click", function() {
    interactWithMascot(true);
  });

  window.addEventListener("sugbocents:budget-changed", function() {
    syncMascotToBudget(false);
  });

  window.addEventListener("sugbocents:synced", function() {
    syncMascotToBudget(false);
  });
});