/**
 * motion.js — SugboCents Motion System Engine
 *
 * Companion JS to css/motion.css. Provides:
 *   - Page enter/exit transitions
 *   - Navigation link interception with exit animation
 *   - IntersectionObserver-based scroll reveals
 *   - Animated number counters
 *   - Progress bar animation utility
 *   - Toast notification system
 *   - Validation shake
 *   - Button ripple effect
 *   - Confetti / particle burst for celebrations
 *   - Nav icon micro-bounce on activation
 *
 * Exposes: window.MotionSystem (public API)
 *
 * Pattern: vanilla IIFE, no modules, no frameworks.
 * Follows SugboCents JS conventions (see js-instructions.md).
 */
(function () {
  "use strict";

  /* ── Reduced-motion detection ─────────────────────────────────────────── */
  var mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  var prefersReducedMotion = mql.matches;
  if (mql.addEventListener) {
    mql.addEventListener("change", function (e) {
      prefersReducedMotion = e.matches;
    });
  }

  /* ── Internal pages list (skip external / hash navigation) ──────────── */
  var INTERNAL_PAGES = [
    "index.html", "landing.html", "login.html", "register.html",
    "dashboard.html", "activity.html", "stats.html", "shop.html",
    "leaderboard.html", "profile.html", "achievements.html",
    "quests.html", "tigom.html", "settings.html", "chat.html"
  ];

  /* ─────────────────────────────────────────────────────────────────────────
     1. PAGE ENTER ANIMATION
     Adds .sc-entering to #pageContent or <main> once content is visible.
     Hooks into the MutationObserver pattern used by app.js:
     app.js sets pageContent display:block — we watch for that.
  ───────────────────────────────────────────────────────────────────────── */
  function initPageEntry() {
    if (prefersReducedMotion) { return; }

    var content = document.getElementById("pageContent");

    if (content) {
      /* Dashboard-style page: wait for display:block reveal */
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === "style" &&
              content.style.display !== "none") {
            triggerEnter(content);
            mo.disconnect();
            return;
          }
        }
      });

      if (content.style.display && content.style.display !== "none") {
        /* Already visible (e.g. navigating back with bfcache) */
        triggerEnter(content);
      } else {
        mo.observe(content, { attributes: true, attributeFilter: ["style"] });
      }
      return;
    }

    /* Non-dashboard page: animate <main> directly */
    var main = document.querySelector("main");
    if (main) { triggerEnter(main); }
  }

  function triggerEnter(el) {
    el.classList.add("sc-entering");
    el.addEventListener("animationend", function onEnd() {
      el.classList.remove("sc-entering");
      el.removeEventListener("animationend", onEnd);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     2. NAVIGATION EXIT TRANSITION
     Intercepts internal <a> clicks, plays a brief exit animation, then
     navigates. Direction (forward / back) is stored in sessionStorage so
     the *entering* page can apply the correct slide direction.
  ───────────────────────────────────────────────────────────────────────── */

  /* Simple page hierarchy for directional transitions */
  var PAGE_ORDER = [
    "landing.html", "login.html", "register.html", "dashboard.html",
    "quests.html", "activity.html", "stats.html", "profile.html",
    "achievements.html", "leaderboard.html", "tigom.html",
    "shop.html", "chat.html", "settings.html"
  ];

  function pageIndex(href) {
    var name = href.split("/").pop().split("?")[0];
    return PAGE_ORDER.indexOf(name);
  }

  function currentPageName() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function initNavigationTransitions() {
    /* Apply direction from previous navigation */
    var dir = sessionStorage.getItem("sc_nav_dir");
    if (dir) {
      sessionStorage.removeItem("sc_nav_dir");
      document.body.classList.add("sc-dir-" + dir);
      /* Remove after enter animation completes */
      setTimeout(function () {
        document.body.classList.remove("sc-dir-" + dir);
      }, 450);
    }

    if (prefersReducedMotion) { return; }

    document.addEventListener("click", function (e) {
      var link = e.target.closest("a[href]");
      if (!link) { return; }

      var href = link.getAttribute("href");
      if (!href) { return; }

      /* Skip: external, hash, special protocols, modifier keys, _blank */
      if (href.charAt(0) === "#" ||
          href.indexOf("://") !== -1 ||
          href.indexOf("//") === 0 ||
          href.indexOf("mailto:") === 0 ||
          href.indexOf("tel:") === 0 ||
          link.hasAttribute("download") ||
          link.target === "_blank" ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      /* Only intercept internal page navigations */
      var hrefBase = href.split("/").pop().split("?")[0];
      var isInternal = INTERNAL_PAGES.some(function (p) {
        return hrefBase === p || href === p || href === "./" + p;
      });
      if (!isInternal) { return; }

      e.preventDefault();

      /* Determine direction */
      var fromIdx = pageIndex(currentPageName());
      var toIdx   = pageIndex(hrefBase);
      var dir = "forward";
      if (fromIdx !== -1 && toIdx !== -1 && toIdx < fromIdx) { dir = "back"; }
      sessionStorage.setItem("sc_nav_dir", dir);

      /* Play exit animation */
      document.body.classList.add("sc-page-exiting");

      /* Navigate after exit duration (--dur-base = 300ms) */
      setTimeout(function () {
        window.location.href = href;
      }, 220);
    }, true /* capture phase — runs before other click handlers */);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     3. SCROLL REVEAL — IntersectionObserver
     Adds .revealed to elements with class .reveal when they enter viewport.
     Supports data-reveal-delay="NNN" for per-element delay (ms).
  ───────────────────────────────────────────────────────────────────────── */
  var revealObserver = null;

  function observeEl(el) {
    if (!revealObserver) { return; }
    revealObserver.observe(el);
  }

  function initScrollReveal() {
    var allReveal = document.querySelectorAll(".reveal");
    if (!allReveal.length) { return; }

    /* Fallback: browser without IntersectionObserver */
    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      allReveal.forEach(function (el) { el.classList.add("revealed"); });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el    = entry.target;
        var delay = parseInt(el.dataset.revealDelay, 10) || 0;
        var reveal = function () { el.classList.add("revealed"); };
        if (delay > 0) { setTimeout(reveal, delay); } else { reveal(); }
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.07, rootMargin: "0px 0px -24px 0px" });

    allReveal.forEach(observeEl);

    /* Re-observe new .reveal elements added after initial load */
    window.addEventListener("sugbocents:dataChanged", function () {
      document.querySelectorAll(".reveal:not(.revealed)").forEach(observeEl);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     4. ANIMATED NUMBER COUNTER
     Smoothly interpolates a number from start → end using rAF.
     Accepts optional formatter function.
  ───────────────────────────────────────────────────────────────────────── */
  function animateCounter(el, fromVal, toVal, durationMs, formatter) {
    fromVal    = Number(fromVal) || 0;
    toVal      = Number(toVal)   || 0;
    durationMs = durationMs      || 500;
    formatter  = formatter       || null;

    if (prefersReducedMotion || fromVal === toVal) {
      el.textContent = formatter ? formatter(toVal) : toVal;
      return;
    }

    var startTime = null;
    var range = toVal - fromVal;

    function step(ts) {
      if (!startTime) { startTime = ts; }
      var progress = Math.min((ts - startTime) / durationMs, 1);
      /* Ease-out-cubic */
      var eased   = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(fromVal + range * eased);
      el.textContent = formatter ? formatter(current) : current;
      if (progress < 1) { requestAnimationFrame(step); }
    }

    requestAnimationFrame(step);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5. PROGRESS BAR ANIMATION
     Smoothly fills a progress bar to targetPct using rAF.
  ───────────────────────────────────────────────────────────────────────── */
  function animateProgressBar(el, targetPct, durationMs) {
    targetPct  = Math.min(100, Math.max(0, Number(targetPct)  || 0));
    durationMs = durationMs || 600;

    if (prefersReducedMotion) {
      el.style.width = targetPct + "%";
      return;
    }

    var startPct  = parseFloat(el.style.width) || 0;
    var range     = targetPct - startPct;
    var startTime = null;

    function step(ts) {
      if (!startTime) { startTime = ts; }
      var progress = Math.min((ts - startTime) / durationMs, 1);
      var eased    = 1 - Math.pow(1 - progress, 3);
      el.style.width = (startPct + range * eased) + "%";
      if (progress < 1) { requestAnimationFrame(step); }
    }

    requestAnimationFrame(step);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     6. TOAST NOTIFICATION SYSTEM
     Usage: MotionSystem.toast("Message", "success" | "error" | "warn" | "info")
  ───────────────────────────────────────────────────────────────────────── */
  var _toastEl    = null;
  var _toastTimer = null;
  var TOAST_DURATION_DEFAULT = 3200;

  var TOAST_ICONS = {
    success: '<svg class="sc-toast__checkmark" viewBox="0 0 24 24" aria-hidden="true"><path class="sc-toast__checkmark-path" d="M4.5 12.5l5 5 10-10"/></svg>',
    error:   '<span aria-hidden="true" style="font-size:1rem;line-height:1">✕</span>',
    warn:    '<span aria-hidden="true" style="font-size:1rem;line-height:1">⚠</span>',
    info:    '<span aria-hidden="true" style="font-size:1rem;line-height:1">ℹ</span>'
  };

  function showToast(message, type, durationMs) {
    type       = type       || "info";
    durationMs = durationMs || TOAST_DURATION_DEFAULT;

    /* Dismiss any existing toast immediately */
    _dismissToastNow();
    clearTimeout(_toastTimer);

    var toast = document.createElement("div");
    toast.className = "sc-toast sc-toast--" + type;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");

    /* Content: icon + message */
    var icon = TOAST_ICONS[type] || "";
    toast.innerHTML = icon + '<span class="sc-toast__msg">' + _escapeHtml(message) + "</span>";

    /* Click to dismiss */
    toast.addEventListener("click", dismissToast);

    document.body.appendChild(toast);
    _toastEl = toast;

    _toastTimer = setTimeout(dismissToast, durationMs);
  }

  function dismissToast() {
    if (!_toastEl) { return; }
    var el = _toastEl;
    _toastEl = null;
    clearTimeout(_toastTimer);
    el.classList.add("sc-toast-exiting");
    el.addEventListener("animationend", function () {
      if (el.parentNode) { el.parentNode.removeChild(el); }
    }, { once: true });
  }

  function _dismissToastNow() {
    if (!_toastEl) { return; }
    if (_toastEl.parentNode) { _toastEl.parentNode.removeChild(_toastEl); }
    _toastEl = null;
  }

  function _escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ─────────────────────────────────────────────────────────────────────────
     7. VALIDATION SHAKE
     Briefly shakes an element to signal an invalid action.
  ───────────────────────────────────────────────────────────────────────── */
  function shakeElement(el) {
    if (!el || prefersReducedMotion) { return; }
    el.classList.remove("sc-is-shaking");
    /* Force reflow to restart animation if already shaking */
    void el.offsetWidth;
    el.classList.add("sc-is-shaking");
    el.addEventListener("animationend", function () {
      el.classList.remove("sc-is-shaking");
    }, { once: true });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     8. BUTTON RIPPLE EFFECT
     Call directly: MotionSystem.ripple(el, mouseEvent)
     Or auto-wire: add .btn-ripple to any button
  ───────────────────────────────────────────────────────────────────────── */
  function addRipple(el, event) {
    if (!el || prefersReducedMotion) { return; }
    var ripple = document.createElement("span");
    ripple.className = "sc-ripple-el";
    var rect = el.getBoundingClientRect();
    ripple.style.left = (event.clientX - rect.left)  + "px";
    ripple.style.top  = (event.clientY - rect.top)   + "px";
    el.appendChild(ripple);
    ripple.addEventListener("animationend", function () {
      if (ripple.parentNode) { ripple.parentNode.removeChild(ripple); }
    }, { once: true });
  }

  function initRippleButtons() {
    if (prefersReducedMotion) { return; }
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".btn-ripple");
      if (!btn) { return; }
      addRipple(btn, e);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     9. CONFETTI BURST
     Fires a burst of colorful particles for level-ups, milestones, etc.
     Options: { count, x, y }
  ───────────────────────────────────────────────────────────────────────── */
  var CONFETTI_COLORS = [
    "#3aaa72", "#1f6b46", "#2b8259",   /* Brand greens */
    "#fbbf24", "#f97316",              /* Amber / orange */
    "#60a5fa", "#818cf8",              /* Blue / indigo */
    "#f472b6", "#34d399"               /* Pink / teal */
  ];

  function burstConfetti(options) {
    if (prefersReducedMotion) { return; }
    options = options || {};
    var count   = options.count || 65;
    var originX = (options.x != null) ? options.x : window.innerWidth  * 0.5;
    var originY = (options.y != null) ? options.y : window.innerHeight * 0.28;

    var container = document.createElement("div");
    container.className = "sc-confetti-container";
    document.body.appendChild(container);

    for (var i = 0; i < count; i++) {
      var piece = document.createElement("div");
      piece.className = "sc-confetti-piece";

      var color  = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      var size   = Math.random() * 7 + 5;                        /* 5–12 px   */
      var spread = (Math.random() - 0.5) * window.innerWidth * 0.9;
      var delay  = Math.random() * 0.5;                          /* 0–500 ms  */
      var dur    = Math.random() * 1.4 + 1.8;                   /* 1.8–3.2 s */
      var radius = Math.random() > 0.55 ? "50%" : "2px";

      piece.style.cssText =
        "left:"              + (originX + spread) + "px;" +
        "top:"               + originY             + "px;" +
        "width:"             + size                + "px;" +
        "height:"            + size                + "px;" +
        "background:"        + color               + ";"   +
        "border-radius:"     + radius              + ";"   +
        "animation-duration:"+ dur                 + "s;"  +
        "animation-delay:"   + delay               + "s;";

      container.appendChild(piece);
    }

    /* Remove container once all pieces finish */
    setTimeout(function () {
      if (container.parentNode) { container.parentNode.removeChild(container); }
    }, 3800);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     10. NAV ICON MICRO-BOUNCE
     Bottom nav icons get a spring pop when the user taps them.
  ───────────────────────────────────────────────────────────────────────── */
  function initNavBounce() {
    if (prefersReducedMotion) { return; }
    document.addEventListener("click", function (e) {
      var link = e.target.closest(".nav-link, .ds-bottom-nav__item");
      if (!link) { return; }
      var icon = link.querySelector(".nav-icon, .ds-bottom-nav__icon");
      if (!icon) { return; }

      icon.style.animation = "none";
      void icon.offsetWidth;                               /* reflow */
      icon.style.animation =
        "sc-pop-in 220ms cubic-bezier(0.34,1.56,0.64,1)";
      icon.addEventListener("animationend", function () {
        icon.style.animation = "";
      }, { once: true });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     11. STAGGER LIST ITEMS
     Apply entrance animation with staggered delays to list children.
     Usage: MotionSystem.stagger(containerEl, ".expense-row", 55)
  ───────────────────────────────────────────────────────────────────────── */
  function staggerList(container, selector, delayMs) {
    if (!container || prefersReducedMotion) { return; }
    delayMs = delayMs || 55;
    var items = container.querySelectorAll(selector);
    items.forEach(function (item, idx) {
      item.style.animationDelay = (idx * delayMs) + "ms";
      item.classList.add("animate-slide-up");
      item.addEventListener("animationend", function () {
        item.style.animationDelay = "";
        item.classList.remove("animate-slide-up");
        /* Ensure item stays visible after animation */
        item.style.opacity = "1";
      }, { once: true });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     12. XP BAR SHINE TRIGGER
     Call after updating an XP bar to flash the shine sweep.
  ───────────────────────────────────────────────────────────────────────── */
  function flashProgressShine(barEl) {
    if (!barEl || prefersReducedMotion) { return; }
    barEl.classList.remove("sc-gaining");
    void barEl.offsetWidth;                                      /* reflow */
    barEl.classList.add("sc-gaining");
    barEl.addEventListener("animationend", function () {
      barEl.classList.remove("sc-gaining");
    }, { once: true });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INIT — wires everything on DOMContentLoaded
  ───────────────────────────────────────────────────────────────────────── */
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onReady);
    } else {
      onReady();
    }
  }

  function onReady() {
    initPageEntry();
    initNavigationTransitions();
    initScrollReveal();
    initRippleButtons();
    initNavBounce();
  }

  init();

  /* ─────────────────────────────────────────────────────────────────────────
     PUBLIC API — window.MotionSystem
  ───────────────────────────────────────────────────────────────────────── */
  window.MotionSystem = {
    /* Counter & progress */
    animateCounter:     animateCounter,
    animateProgressBar: animateProgressBar,
    flashProgressShine: flashProgressShine,

    /* Feedback */
    toast:        showToast,
    dismissToast: dismissToast,
    shake:        shakeElement,

    /* Visual effects */
    confetti: burstConfetti,
    ripple:   addRipple,
    stagger:  staggerList,

    /* Scroll reveal (allows external code to observe new elements) */
    observeReveal: observeEl,

    /* Query */
    isReducedMotion: function () { return prefersReducedMotion; }
  };

}());
