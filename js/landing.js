(function () {
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── reveal animations ─────────────────────────────────────
  var revealItems = document.querySelectorAll("[data-reveal]");

  if (prefersReducedMotion) {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: 0.01,
        rootMargin: "0px",
      }
    );

    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = String(Math.min(index * 20, 120)) + "ms";
      observer.observe(item);
    });
  }

  // ── live demo elements ────────────────────────────────────
  var loopRemainingValue = document.getElementById("loopRemainingValue");
  var loopLogs = document.getElementById("loopLogs");
  var loopActions = Array.prototype.slice
    .call(document.querySelectorAll(".loop-action"))
    .filter(Boolean);

  // If the demo UI isn't on the page, exit early.
  if (!loopRemainingValue || !loopLogs || !loopActions.length) {
    // still keep photo fallback below, so DON'T return here
  }

  // ── live demo state ───────────────────────────────────────
  var loopBudget = 2500;
  var loopSpend = 0;
  var loopStepIndex = 0;
  var loopEntries = [];
  var loopSlots = 4;

  var loopPlan = [
    { category: "Jeep", amount: 18 },
    { category: "Food", amount: 135 },
    { category: "Load", amount: 50 },
    { category: "Food", amount: 95 },
    { category: "Jeep", amount: 18 },
  ];

  var LOOP_INTERVAL_MS = 1450;
  var loopTimerId = null;

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value || 0));
  }

  function clearActiveLoopButtons() {
    loopActions.forEach(function (button) {
      button.classList.remove("is-active");
    });
  }

  function renderLoopLogs() {
    if (!loopLogs) return;

    loopLogs.innerHTML = "";
    var entriesToShow = loopEntries.slice(0, loopSlots);

    while (entriesToShow.length < loopSlots) {
      entriesToShow.push({ isPlaceholder: true });
    }

    entriesToShow.forEach(function (entry) {
      var item = document.createElement("li");

      if (entry.isPlaceholder) {
        item.className = "loop-log-item is-placeholder";
        item.innerHTML =
          '<span class="loop-log-category">Waiting for next entry</span>' +
          '<span class="loop-log-amount">--</span>';
      } else {
        item.className = "loop-log-item";
        item.innerHTML =
          '<span class="loop-log-category">' +
          entry.category +
          "</span>" +
          '<span class="loop-log-amount">-' +
          formatCurrency(entry.amount) +
          "</span>";
      }

      loopLogs.appendChild(item);
    });
  }

  function updateLoopSummary() {
    if (!loopRemainingValue) return;

    var remaining = Math.max(0, loopBudget - loopSpend);
    loopRemainingValue.textContent = formatCurrency(remaining);
    renderLoopLogs();
  }

  function highlightLoopAction(category) {
    clearActiveLoopButtons();
    loopActions.forEach(function (button) {
      if (button.getAttribute("data-loop-category") === category) {
        button.classList.add("is-active");
      }
    });
  }

  function playLoopStepOnce() {
    if (!loopRemainingValue || !loopLogs || !loopActions.length) {
      return;
    }

    // Reset loop when finished
    if (loopStepIndex >= loopPlan.length) {
      loopStepIndex = 0;
      loopSpend = 0;
      loopEntries = [];
      clearActiveLoopButtons();
      updateLoopSummary();
      return;
    }

    var step = loopPlan[loopStepIndex];
    loopStepIndex += 1;
    loopSpend += step.amount;
    loopEntries.unshift(step);
    highlightLoopAction(step.category);
    updateLoopSummary();
  }

  function stopLoop() {
    if (loopTimerId) {
      clearTimeout(loopTimerId);
      loopTimerId = null;
    }
  }

  function scheduleNextTick() {
    stopLoop();
    loopTimerId = setTimeout(function tick() {
      try {
        playLoopStepOnce();
      } catch (e) {
        // If something unexpected happens, stop the loop so it doesn't spam errors.
        stopLoop();
        return;
      }

      loopTimerId = setTimeout(tick, LOOP_INTERVAL_MS);
    }, LOOP_INTERVAL_MS);
  }

  function startLoop() {
    if (prefersReducedMotion) return;
    if (!loopRemainingValue || !loopLogs || !loopActions.length) return;
    if (loopTimerId) return; // already running

    // Ensure UI is in a known good state, then run first step quickly
    updateLoopSummary();
    playLoopStepOnce();

    scheduleNextTick();
  }

  // Start once on load
  startLoop();

  // Restart on tab/page restore (fixes "runs once then stops" in some environments)
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      startLoop();
    } else {
      stopLoop();
    }
  });

  window.addEventListener("pageshow", function (event) {
    // If page comes from bfcache, timers can be lost; restart the loop.
    if (event && event.persisted) {
      stopLoop();
      startLoop();
    }
  });

  // ── photo fallback for reviews ─────────────────────────────
  var memberPhotos = document.querySelectorAll("img.member-photo[data-fallback]");

  function applyPhotoFallback(photo) {
    var initials = photo.getAttribute("data-fallback") || "SC";
    var placeholder = document.createElement("span");
    placeholder.className = "review-avatar review-avatar-placeholder";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", "Placeholder photo");
    placeholder.textContent = initials;
    photo.replaceWith(placeholder);
  }

  memberPhotos.forEach(function (photo) {
    photo.addEventListener("error", function () {
      applyPhotoFallback(photo);
    });

    if (photo.complete && photo.naturalWidth === 0) {
      applyPhotoFallback(photo);
    }
  });
})();
