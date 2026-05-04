/**
 * gamification.js — GamificationUI
 * XP float popup + Duolingo-style full-screen celebration modals.
 * Loaded only on dashboard.html (data-page="dashboard").
 */
(function () {
  // ── XP Float Popup ─────────────────────────────────────────────────────────
  function showXpPopup(amount, anchorEl) {
    var xp = Math.max(0, Math.floor(Number(amount) || 0));
    if (!xp || !anchorEl) { return; }
    var parent = anchorEl.parentElement || document.body;
    var computed = window.getComputedStyle(parent);
    if (computed.position === "static") { parent.style.position = "relative"; }
    var popup = document.createElement("span");
    popup.className = "xp-float-popup";
    popup.innerHTML = "+" + xp + " XP <i class=\"bi bi-lightning-charge-fill\" aria-hidden=\"true\"></i>";
    parent.appendChild(popup);
    popup.addEventListener("animationend", function () {
      if (popup.parentNode) { popup.parentNode.removeChild(popup); }
    });
  }

  // ── Celebration Modal ───────────────────────────────────────────────────────
  var _modalQueue    = [];
  var _modalOpen     = false;
  var _previousFocus = null;
  var _activeConfig  = null;

  function buildModalEl() {
    var el = document.createElement("div");
    el.id = "celebrationBackdrop";
    el.className = "celebration-backdrop";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "celebrationTitle");
    el.innerHTML =
      '<div class="celebration-card" id="celebrationCard">' +
        '<button type="button" class="celebration-close" id="celebrationClose" aria-label="Close">' +
          '<i class="bi bi-x-lg" aria-hidden="true"></i>' +
        '</button>' +
        '<div class="celebration-icon" id="celebrationIcon"></div>' +
        '<p class="celebration-super" id="celebrationSuper"></p>' +
        '<h2 class="celebration-title" id="celebrationTitle"></h2>' +
        '<p class="celebration-desc" id="celebrationDesc"></p>' +
        '<div class="celebration-xp-bar-wrap hidden" id="celebrationXpWrap">' +
          '<div class="celebration-xp-bar-track">' +
            '<div class="celebration-xp-bar-fill" id="celebrationXpFill" style="width:0%"></div>' +
          '</div>' +
          '<p class="celebration-xp-hint" id="celebrationXpHint"></p>' +
        '</div>' +
        '<button type="button" class="btn-primary celebration-cta" id="celebrationCta">Continue</button>' +
      '</div>';
    return el;
  }

  function getOrCreateBackdrop() {
    var existing = document.getElementById("celebrationBackdrop");
    if (existing) { return existing; }
    var el = buildModalEl();
    document.body.appendChild(el);
    el.addEventListener("click", function (e) {
      var tgt = e.target;
      if (!(tgt instanceof Element)) { return; }
      if (tgt === el) { closeModal(); return; }
      if (tgt.closest("#celebrationClose")) { closeModal(); return; }
      if (tgt.closest("#celebrationCta")) {
        var href = _activeConfig && _activeConfig.href;
        closeModal();
        if (href) { window.location.href = href; }
        return;
      }
    });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModal(); }
    });
    return el;
  }

  function openModal(config) {
    _previousFocus = document.activeElement;
    var backdrop = getOrCreateBackdrop();
    var card     = document.getElementById("celebrationCard");
    var iconEl   = document.getElementById("celebrationIcon");
    var superEl  = document.getElementById("celebrationSuper");
    var titleEl  = document.getElementById("celebrationTitle");
    var descEl   = document.getElementById("celebrationDesc");
    var xpWrap   = document.getElementById("celebrationXpWrap");
    var xpFill   = document.getElementById("celebrationXpFill");
    var xpHint   = document.getElementById("celebrationXpHint");
    var ctaEl    = document.getElementById("celebrationCta");

    // Reset animation classes so they replay
    if (card)   { card.classList.remove("celebration-card--in"); }
    if (iconEl) { iconEl.classList.remove("celebration-icon--pop"); }

    // Populate — user-supplied strings go through textContent only
    if (iconEl)  { iconEl.innerHTML = '<i class="bi ' + config.iconClass + ' celebration-icon-bi" aria-hidden="true"></i>'; }
    if (superEl) { superEl.textContent = config.superText; }
    if (titleEl) { titleEl.textContent = config.title; }
    if (descEl)  { descEl.textContent  = config.desc; }
    if (ctaEl)   { ctaEl.textContent   = config.cta || "Continue"; }

    // XP bar (level-up variant)
    if (xpWrap) {
      if (config.showXpBar && config.xpPct !== undefined) {
        xpWrap.classList.remove("hidden");
        if (xpFill) { xpFill.style.width = Math.min(100, config.xpPct) + "%"; }
        if (xpHint) { xpHint.textContent = config.xpHint || ""; }
      } else {
        xpWrap.classList.add("hidden");
      }
    }

    _activeConfig = config;
    backdrop.classList.add("celebration-visible");
    _modalOpen = true;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (card)   { card.classList.add("celebration-card--in"); }
        if (iconEl) { iconEl.classList.add("celebration-icon--pop"); }
      });
    });

    setTimeout(function () { if (ctaEl) { ctaEl.focus(); } }, 120);
  }

  function closeModal() {
    var backdrop = document.getElementById("celebrationBackdrop");
    if (backdrop) {
      backdrop.classList.remove("celebration-visible");
      var card = document.getElementById("celebrationCard");
      if (card) { card.classList.remove("celebration-card--in"); }
    }
    _activeConfig = null;
    _modalOpen = false;
    if (_previousFocus && _previousFocus.focus) {
      try { _previousFocus.focus(); } catch (e) { /* ignore */ }
    }
    _previousFocus = null;
    setTimeout(function () {
      if (_modalQueue.length > 0) { openModal(_modalQueue.shift()); }
    }, 180);
  }

  function queueModal(config) {
    if (!_modalOpen && _modalQueue.length === 0) {
      openModal(config);
    } else {
      _modalQueue.push(config);
    }
  }

  // ── Notify: show modal(s) for newly unlockable achievements ───────────────
  function maybeNotifyNewAchievements(ids) {
    if (!Array.isArray(ids) || ids.length === 0) { return; }
    if (!window.StorageAPI || !window.StorageAPI.getAchievements) { return; }

    var all = window.StorageAPI.getAchievements();
    var badges = ids.map(function (id) {
      return all.filter(function (a) { return a.id === id; })[0] || null;
    }).filter(Boolean);

    if (badges.length === 0) { return; }

    if (window.StorageAPI.markAchievementsNotified) {
      window.StorageAPI.markAchievementsNotified(ids);
    }

    // Batch if 3 or more fire at once
    if (badges.length >= 3) {
      queueModal({
        iconClass: "bi-trophy-fill",
        superText: "Achievement unlocked",
        title: badges.length + " new badges!",
        desc: badges.map(function (b) { return b.name; }).join(", ") + "\n\nHead to Profile to claim your XP!",
        cta: "See Achievements",
        href: "stats.html",
        showXpBar: false
      });
      return;
    }

    badges.forEach(function (badge) {
      queueModal({
        iconClass: badge.icon || "bi-award-fill",
        superText: "Achievement unlocked",
        title: badge.name,
        desc: badge.description + "\n\nHead to Profile to claim your +15 XP!",
        cta: "See Achievements",
        href: "stats.html",
        showXpBar: false
      });
    });
  }

  // ── Level-up notification ──────────────────────────────────────────────────
  function notifyLevelUp(prevLevel, newLevel, newLevelName) {
    if (!newLevel || newLevel <= prevLevel) { return; }
    // Signal the mascot FAB to celebrate for 8 seconds
    window._mascotOverrideState = { key: "celebrating", expires: Date.now() + 8000 };
    if (window.MascotWidget && window.MascotWidget.update) { window.MascotWidget.update(); }
    var xpInfo = window.StorageAPI ? window.StorageAPI.getXpInfo() : null;
    queueModal({
      iconClass: "bi-rocket-takeoff-fill",
      superText: "Level Up!",
      title: "Level " + newLevel,
      desc: newLevelName,
      cta: "Let\u2019s go!",
      showXpBar: !!xpInfo,
      xpPct: xpInfo ? xpInfo.progressPct : 0,
      xpHint: xpInfo ? xpInfo.xp + " XP" : ""
    });
  }

  window.GamificationUI = {
    showXpPopup: showXpPopup,
    maybeNotifyNewAchievements: maybeNotifyNewAchievements,
    notifyLevelUp: notifyLevelUp,
    queueModal: queueModal
  };
})();

