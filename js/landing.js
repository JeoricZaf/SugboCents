(function () {
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealItems = document.querySelectorAll("[data-reveal]");

  if (prefersReducedMotion) {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    }, {
      threshold: 0.01,
      rootMargin: "0px"
    });

    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = String(Math.min(index * 20, 120)) + "ms";
      observer.observe(item);
    });
  }

  var loopRemainingValue = document.getElementById("loopRemainingValue");
  var loopLogs = document.getElementById("loopLogs");
  var loopActions = Array.prototype.slice.call(document.querySelectorAll(".loop-action"));

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
    { category: "Jeep", amount: 18 }
  ];

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
  }

  function clearActiveLoopButtons() {
    loopActions.forEach(function (button) {
      button.classList.remove("is-active");
    });
  }

  function renderLoopLogs() {
    if (!loopLogs) {
      return;
    }

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
          '<span class="loop-log-category">' + entry.category + '</span>' +
          '<span class="loop-log-amount">-' + formatCurrency(entry.amount) + '</span>';
      }
      loopLogs.appendChild(item);
    });
  }

  function updateLoopSummary() {
    if (!loopRemainingValue) {
      return;
    }

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

  function playLoopStep() {
    if (!loopRemainingValue || !loopLogs || !loopActions.length) {
      return;
    }

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

  updateLoopSummary();
  playLoopStep();

  if (!prefersReducedMotion && loopRemainingValue && loopLogs && loopActions.length) {
    window.setInterval(playLoopStep, 1450);
  }
})();
