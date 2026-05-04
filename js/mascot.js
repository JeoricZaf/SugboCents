(function () {
  // ── Mascot state definitions ─────────────────────────────
  var STATES = {
    happy:       { img: "assets/images/mascot/mascot-happy.png",    label: "Doing great!",                           cls: "mascot-happy"       },
    neutral:     { img: "assets/images/mascot/mascot-neutral.png",   label: "On track",                               cls: "mascot-neutral"     },
    worried:     { img: "assets/images/mascot/mascot-sad.png",       label: "Heads up!",                              cls: "mascot-worried"     },
    alarmed:     { img: "assets/images/mascot/mascot-shocked.png",   label: "Budget alert!",                          cls: "mascot-alarmed"     },
    // Extended states — celebrating PLACEHOLDER: swap mascot-happy.png → mascot-celebrating.png when asset is ready
    celebrating: { img: "assets/images/mascot/mascot-happy.png",    label: "You leveled up! 🎉",              cls: "mascot-celebrating" },
    streak:      { img: "assets/images/mascot/mascot-happy.png",    labelFn: function (n) { return "🔥 " + n + "-day streak!"; }, cls: "mascot-streak"      },
    encouraging: { img: "assets/images/mascot/mascot-sad.png",      label: "Don\u2019t forget to log \uD83D\uDCDD",  cls: "mascot-encouraging" }
  };

  // Tracks whether the panel iframe is currently showing a pending-new-chat state
  var isPanelNewPending = false;



  // ── Helper: did the user log an expense today? ─────────────
  function hasLoggedToday() {
    if (!window.StorageAPI || !window.StorageAPI.getExpenses) { return false; }
    var todayStr = new Date().toISOString().slice(0, 10);
    var recent = window.StorageAPI.getExpenses(30);
    return recent.some(function (e) {
      return e.timestamp && String(e.timestamp).slice(0, 10) === todayStr;
    });
  }

  // ── Compute mascot state from data + overrides ───────────
  var STREAK_MILESTONES = [7, 14, 30, 60, 100];

  function getMascotState() {
    // 1. Timed override (e.g., set by gamification.js on level-up)
    if (window._mascotOverrideState) {
      var ov = window._mascotOverrideState;
      if (ov.expires > Date.now()) { return ov.key; }
      window._mascotOverrideState = null; // expired — clear
    }

    if (!window.StorageAPI) { return "neutral"; }

    // 2. Streak milestone: celebrate when user hits a milestone
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    if (streak > 0 && STREAK_MILESTONES.indexOf(streak) !== -1 && hasLoggedToday()) {
      return "streak";
    }

    // 3. Encouraging: no expense logged today and it's past 1 PM
    if (!hasLoggedToday() && new Date().getHours() >= 13) {
      return "encouraging";
    }

    // 4. Budget-based states
    var summary = window.StorageAPI.getBudgetSummary();
    var pct = summary.percentageSpent;
    if (pct >= 90) { return "alarmed"; }
    if (pct >= 65) { return "worried"; }
    if (pct >= 30) { return "neutral"; }
    return "happy";
  }

  // ── Build DOM ────────────────────────────────────────────
  function buildWidget() {
    // Don't render on the chat page itself
    if (document.body.getAttribute("data-page") === "chat") { return; }

    var state = getMascotState();
    var stateObj = STATES[state];

    // Floating action button
    var fab = document.createElement("button");
    fab.id = "mascotFab";
    fab.className = "mascot-fab " + stateObj.cls;
    fab.setAttribute("aria-label", "Open Sugbo assistant");
    fab.setAttribute("title", "Chat with Sugbo");
    fab.innerHTML = '<img src="' + stateObj.img + '" class="mascot-fab-img" alt="Sugbo" draggable="false" />';
    document.body.appendChild(fab);

    // Side panel overlay
    var overlay = document.createElement("div");
    overlay.id = "mascotPanelOverlay";
    overlay.className = "mascot-panel-overlay";
    overlay.innerHTML =
      '<div class="mascot-panel" id="mascotPanel">' +
        '<div class="mascot-panel-header">' +
          '<img id="mascotPanelAvatar" class="mascot-panel-header-avatar" src="' + stateObj.img + '" alt="Sugbo" draggable="false" />' +
          '<div class="mascot-panel-header-info">' +
            '<div class="mascot-panel-header-title">Sugbo</div>' +
            '<div class="mascot-panel-header-sub" id="mascotPanelStatus">' + stateObj.label + '</div>' +
          '</div>' +
          '<button class="mascot-panel-new" id="mascotPanelNew" aria-label="New chat" title="New chat">' +
            '<i class="bi bi-pencil-square" aria-hidden="true" style="font-size:0.8rem;"></i>' +
          '</button>' +
          '<button class="mascot-panel-expand" id="mascotPanelExpand" aria-label="Open full chat page" title="Open full chat">' +
            '<i class="bi bi-box-arrow-up-right" aria-hidden="true" style="font-size:0.8rem;"></i>' +
          '</button>' +
          '<button class="mascot-panel-close" id="mascotPanelClose" aria-label="Close chat">' +
            '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>' +
          '</button>' +
        '</div>' +
        '<iframe class="mascot-panel-frame" id="mascotPanelFrame" src="" title="Chat with Sugbo" allowfullscreen></iframe>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  // ── Panel open / close ────────────────────────────────────
  function getPanelSrc() {
    // If the user hasn't chatted in >6 hours, open a fresh chat
    var SIX_HOURS = 6 * 60 * 60 * 1000;
    if (window.StorageAPI && window.StorageAPI.getPreferences) {
      var prefs = window.StorageAPI.getPreferences();
      if (prefs && prefs.lastChatAt) {
        var elapsed = Date.now() - new Date(prefs.lastChatAt).getTime();
        if (elapsed > SIX_HOURS) { return "chat.html?new=1"; }
      } else {
        // No chat history at all — open fresh
        return "chat.html";
      }
    }
    return "chat.html";
  }

  function openPanel() {
    var overlay = document.getElementById("mascotPanelOverlay");
    var frame = document.getElementById("mascotPanelFrame");
    if (!overlay) { return; }
    if (frame) {
      var src = getPanelSrc();
      // Reload only if not already showing a live session (same base URL)
      var currentBase = (frame.src || "").split("?")[0];
      var targetBase = (new URL(src, window.location.href)).href.split("?")[0];
      if (!frame.getAttribute("data-loaded") || currentBase !== targetBase || src.indexOf("new=1") !== -1) {
        frame.src = src;
        frame.setAttribute("data-loaded", "1");
      }
      isPanelNewPending = src.indexOf("new=1") !== -1;
    }
    overlay.classList.add("is-open");
    var fab = document.getElementById("mascotFab");
    if (fab) {
      fab.classList.add("mascot-bounce");
      setTimeout(function () { fab.classList.remove("mascot-bounce"); }, 600);
    }
  }

  function closePanel() {
    var overlay = document.getElementById("mascotPanelOverlay");
    if (overlay) { overlay.classList.remove("is-open"); }
    isPanelNewPending = false;
  }



  // ── Update mascot appearance (with image fade) ──────────
  function updateMascotState() {
    var state    = getMascotState();
    var stateObj = STATES[state] || STATES.neutral;
    var fab      = document.getElementById("mascotFab");
    var panelAvatar = document.getElementById("mascotPanelAvatar");
    var panelStatus = document.getElementById("mascotPanelStatus");

    // Resolve dynamic label (e.g., streak count)
    var streakCount = window.StorageAPI && window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var label = stateObj.labelFn ? stateObj.labelFn(streakCount) : stateObj.label;

    if (fab) {
      fab.className = "mascot-fab " + stateObj.cls;
      var fabImg = fab.querySelector(".mascot-fab-img");
      if (fabImg) {
        if (fabImg.getAttribute("data-state") !== state) {
          // Fade out, swap image, fade in
          fabImg.setAttribute("data-state", state);
          fabImg.style.opacity = "0";
          var tmpImg = new window.Image();
          var newSrc = stateObj.img;
          tmpImg.onload = function () {
            fabImg.src = newSrc;
            fabImg.style.opacity = "1";
          };
          tmpImg.onerror = function () {
            fabImg.src = STATES.happy.img; // fallback if asset missing
            fabImg.style.opacity = "1";
          };
          tmpImg.src = newSrc;
        }
      }
    }
    if (panelAvatar) { panelAvatar.src = stateObj.img; }
    if (panelStatus) { panelStatus.textContent = label; }
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
        var panelOverlay = document.getElementById("mascotPanelOverlay");
        if (panelOverlay && panelOverlay.classList.contains("is-open")) {
          closePanel();
        } else {
          openPanel();
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
    var panelClose = document.getElementById("mascotPanelClose");
    var overlay = document.getElementById("mascotPanelOverlay");

    if (!fab) { return; }
    makeDraggable(fab);

    if (panelClose) {
      panelClose.addEventListener("click", closePanel);
    }
    var panelExpand = document.getElementById("mascotPanelExpand");
    if (panelExpand) {
      panelExpand.addEventListener("click", function () {
        window.location.href = isPanelNewPending ? "chat.html?new=1" : "chat.html";
      });
    }
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) { closePanel(); }
      });
    }

    // Listen for close message from iframe
    window.addEventListener("message", function (event) {
      if (event && event.data && event.data.type === "sugbocents:closeChat") {
        closePanel();
      }
      // iframe signals a message was sent — no longer a pending new chat
      if (event && event.data && event.data.type === "sugbocents:messageSent") {
        isPanelNewPending = false;
      }
    });

    var panelNew = document.getElementById("mascotPanelNew");
    if (panelNew) {
      panelNew.addEventListener("click", function () {
        var frame = document.getElementById("mascotPanelFrame");
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage({ type: "sugbocents:newChat" }, "*");
          isPanelNewPending = true;
        }
      });
    }

    window.addEventListener("sugbocents:synced", updateMascotState);
    window.addEventListener("sugbocents:dataChanged", updateMascotState);
  }

  document.addEventListener("DOMContentLoaded", function () {
    init();
    // Auto-open panel when returning from chat.html via back button
    if (window.location.hash === "#chat") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(openPanel, 150);
    }
  });

  window.MascotWidget = {
    update: updateMascotState,
    open: openPanel,
    close: closePanel
  };
})();



//MASCTOT ANIMATIONS IN DASHBOARD-------------------------------
document.addEventListener("DOMContentLoaded", function() {
  var mascotImg = document.getElementById("dashboardMascotImg");
  var speechBubble = document.getElementById("mascotSpeechBubble");
  
  if (!mascotImg || !speechBubble) return; // Exit if not on the dashboard

  // 📝 Update these paths with your actual GIF files!
  var fullBodyGifs = [
    "assets/images/mascot/fullbody-wave.gif",
    "assets/images/mascot/fullbody-sleepy.gif",
    "assets/images/mascot/fullbody-shocked.gif",
    "assets/images/mascot/fullbody-confused.gif",
    "assets/images/mascot/fullbody-dance.gif"
  ];
  
  // 💬 Random encouraging messages
  var encouragingMessages =[
    "You've got this! 💪",
    "Every peso counts! Keep it up. ❤️",
    "I'm so proud of your progress! 🌟",
    "Let's crush those savings goals today! 🎯",
    "Looking good! Keep making smart choices. 🧠",
    "Your financial future is looking bright! ☀️",
    "Small steps lead to big savings! 🚀"
  ];

  var bubbleTimeout;

  function interactWithMascot(isClick) {
    // 1. Pick a random GIF
    var randomGif = fullBodyGifs[Math.floor(Math.random() * fullBodyGifs.length)];
    
    // Force the GIF to restart its animation by adding a unique timestamp
    mascotImg.src = randomGif + "?t=" + new Date().getTime();

    // 2. show the speech bubble if the user clicked him or refresh
    
      var randomMsg = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
      speechBubble.textContent = randomMsg;
      
      // Reset the animation so it pops up nicely even if clicked rapidly
      speechBubble.classList.remove("show-bubble");
      void speechBubble.offsetWidth; // Magic trick to trigger a DOM reflow
      speechBubble.classList.add("show-bubble");

      // Hide the bubble automatically after 4 seconds
      clearTimeout(bubbleTimeout);
      bubbleTimeout = setTimeout(function() {
        speechBubble.classList.remove("show-bubble");
      }, 4000);
    
  }

  // Play a random animation when the dashboard first loads (No speech bubble)
  interactWithMascot();

  // Play a random animation AND show a speech bubble when clicked
  mascotImg.addEventListener("click", function() {
    interactWithMascot(true);
  });
});