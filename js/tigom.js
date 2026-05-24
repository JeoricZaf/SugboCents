(function () {
  var phpFmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

  function formatPhp(amount) {
    return phpFmt.format(Number(amount) || 0);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Render goal list ─────────────────────────────────────
  function renderGoals() {
    var list = document.getElementById("goalList");
    var empty = document.getElementById("goalEmpty");
    if (!list || !empty) { return; }

    var goals = window.StorageAPI ? window.StorageAPI.getGoals() : [];

    if (goals.length === 0) {
      list.innerHTML = "";
      empty.classList.remove("hidden");
      empty.style.display = "";
      return;
    }

    empty.classList.add("hidden");
    empty.style.display = "none";

    var html = "";
    goals.forEach(function (goal) {
      var pct = goal.targetAmount > 0
        ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
        : 0;

      var deadlineText = goal.deadline
        ? 'TARGET: ' + escapeHtml(goal.deadline).toUpperCase()
        : 'TARGET: —';

      var doneBadge = goal.completed
        ? '<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.25rem 0.75rem;border-radius:9999px;font-size:0.75rem;font-weight:900;background:#edf7ef;color:#164f33">&#10003; Done</span>'
        : '';

      html +=
        '<div style="background:#fff;border-radius:2rem;padding:1.25rem;outline:1px solid #ded7c6;box-shadow:0 1px 3px rgba(0,0,0,0.06)" data-goal-id="' + escapeHtml(goal.id) + '">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">' +
            '<div>' +
              '<h2 style="font-family:\'Sora\',ui-sans-serif,system-ui,sans-serif;font-size:1.5rem;font-weight:900;color:#102b1d;margin:0">' + escapeHtml(goal.name) + '</h2>' +
              '<p style="margin:0.25rem 0 0;font-size:0.875rem;font-weight:700;color:#617063">' + formatPhp(goal.savedAmount) + ' / ' + formatPhp(goal.targetAmount) + '</p>' +
            '</div>' +
            doneBadge +
          '</div>' +
          '<div style="margin-top:1.25rem">' +
            '<div style="position:relative;overflow:hidden;border-radius:9999px;background:#e7e0cf;height:0.75rem">' +
              '<div style="height:100%;border-radius:9999px;background:#2b8259;transition:width 0.7s;width:' + pct + '%"></div>' +
            '</div>' +
            '<p style="margin-top:0.5rem;font-size:0.75rem;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#6b756c">' + deadlineText + '</p>' +
          '</div>' +
          '<button data-action="add-progress" data-id="' + escapeHtml(goal.id) + '" data-name="' + escapeHtml(goal.name) + '" data-saved="' + goal.savedAmount + '" data-target="' + goal.targetAmount + '"' +
            (goal.completed ? ' disabled' : '') +
            ' style="margin-top:1.25rem;width:100%;border-radius:1rem;padding:0.75rem 1rem;font-size:0.875rem;font-weight:900;color:#fff;border:none;cursor:' + (goal.completed ? 'default' : 'pointer') + ';background:' + (goal.completed ? '#9a9f98' : '#164f33') + '">' +
            'Add &#8369;500' +
          '</button>' +
          '<button data-action="delete" data-id="' + escapeHtml(goal.id) + '" aria-label="Delete goal"' +
            ' style="margin-top:0.5rem;width:100%;border-radius:1rem;padding:0.5rem 1rem;font-size:0.75rem;font-weight:700;color:#617063;border:none;cursor:pointer;background:transparent;text-decoration:underline">' +
            'Delete goal' +
          '</button>' +
        '</div>';
    });

    list.innerHTML = html;
  }

  // ── Create goal form ─────────────────────────────────────
  function initCreateForm() {
    var form = document.getElementById("createGoalForm");
    if (!form) { return; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("goalName");
      var target = document.getElementById("goalTarget");
      var deadline = document.getElementById("goalDeadline");
      var error = document.getElementById("createGoalError");

      if (error) { error.textContent = ""; error.classList.add("hidden"); }

      var nameVal = name ? name.value.trim() : "";
      var targetVal = target ? parseFloat(target.value) : 0;

      if (!nameVal) {
        if (name) { name.classList.add("is-invalid"); }
        if (error) { error.textContent = "Goal name is required."; error.classList.remove("hidden"); }
        return;
      }

      if (!targetVal || targetVal <= 0) {
        if (target) { target.classList.add("is-invalid"); }
        if (error) { error.textContent = "Target amount must be greater than zero."; error.classList.remove("hidden"); }
        return;
      }

      if (name) { name.classList.remove("is-invalid"); }
      if (target) { target.classList.remove("is-invalid"); }

      var deadlineVal = deadline ? deadline.value : "";

      var result = window.StorageAPI.addGoal({
        name: nameVal,
        targetAmount: targetVal,
        deadline: deadlineVal
      });

      if (!result.ok) {
        if (error) { error.textContent = result.error; error.classList.remove("hidden"); }
        return;
      }

      // Reset form
      form.reset();
      // Close the modal
      var backdrop = document.getElementById("goalModalBackdrop");
      if (backdrop) { backdrop.classList.add("hidden"); }

      renderGoals();
      updateSummaryStats();

      // Show success feedback
      var btn = document.getElementById("createGoalBtn");
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = "✅ Goal added!";
        btn.disabled = true;
        setTimeout(function () {
          btn.textContent = orig;
          btn.disabled = false;
        }, 1800);
      }
    });
  }

  // ── Progress modal ───────────────────────────────────────
  var activeGoalId = null;

  function openProgressModal(goalId, goalName, savedAmount, targetAmount) {
    var modal = document.getElementById("progressModal");
    var modalTitle = document.getElementById("progressModalTitle");
    var amountInput = document.getElementById("progressAmount");

    activeGoalId = goalId;

    if (modalTitle) {
      modalTitle.textContent = "Add to \u201c" + goalName + "\u201d";
    }
    if (amountInput) { amountInput.value = ""; }
    if (modal) { modal.classList.remove("hidden"); }
    if (amountInput) { setTimeout(function(){ amountInput.focus(); }, 50); }
  }

  function closeProgressModal() {
    var modal = document.getElementById("progressModal");
    if (modal) { modal.classList.add("hidden"); }
    activeGoalId = null;
  }

  function initProgressModal() {
    var modal = document.getElementById("progressModal");
    var cancelBtn = document.getElementById("progressModalCancel");
    var saveBtn = document.getElementById("progressModalSave");
    var amountInput = document.getElementById("progressAmount");
    var progressError = document.getElementById("progressModalError");

    if (cancelBtn) {
      cancelBtn.addEventListener("click", closeProgressModal);
    }

    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) { closeProgressModal(); }
      });
    }

    // Also handle backdrop click for goal add modal
    var goalBackdrop = document.getElementById("goalModalBackdrop");
    if (goalBackdrop) {
      goalBackdrop.addEventListener("click", function(e) {
        if (e.target === goalBackdrop) { goalBackdrop.classList.add("hidden"); }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        if (!activeGoalId) { return; }

        var val = amountInput ? parseFloat(amountInput.value) : 0;
        if (progressError) { progressError.textContent = ""; progressError.classList.add("hidden"); }

        if (!val || val <= 0) {
          if (progressError) { progressError.textContent = "Enter a valid amount."; progressError.classList.remove("hidden"); }
          return;
        }

        // Get current saved amount and add to it
        var goals = window.StorageAPI.getGoals();
        var goal = null;
        for (var i = 0; i < goals.length; i++) {
          if (goals[i].id === activeGoalId) { goal = goals[i]; break; }
        }
        if (!goal) { closeProgressModal(); return; }

        var newSaved = (goal.savedAmount || 0) + val;
        var result = window.StorageAPI.updateGoalProgress(activeGoalId, newSaved);

        if (!result.ok) {
          if (progressError) { progressError.textContent = result.error; progressError.classList.remove("hidden"); }
          return;
        }

        closeProgressModal();
        renderGoals();
        updateSummaryStats();

        // increment streak if goal was just completed
        if (result.goal && result.goal.completed) {
          if (window.StorageAPI.incrementStreak) {
            window.StorageAPI.incrementStreak();
          }
        }
      });
    }
  }

  // ── Goal list event delegation ────────────────────────────
  function initGoalListEvents() {
    var list = document.getElementById("goalList");
    if (!list) { return; }

    list.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) { return; }

      var action = btn.getAttribute("data-action");
      var id = btn.getAttribute("data-id");

      if (action === "delete") {
        if (!id) { return; }
        var goals = window.StorageAPI ? window.StorageAPI.getGoals() : [];
        var goal = null;
        for (var i = 0; i < goals.length; i++) {
          if (goals[i].id === id) { goal = goals[i]; break; }
        }
        var name = goal ? goal.name : "this goal";
        if (!window.confirm("Delete \u201c" + name + "\u201d? This cannot be undone.")) { return; }
        if (window.StorageAPI) { window.StorageAPI.deleteGoal(id); }
        renderGoals();
        updateSummaryStats();
      }

      if (action === "add-progress") {
        var goalName = btn.getAttribute("data-name") || "";
        var saved    = parseFloat(btn.getAttribute("data-saved")) || 0;
        var tgt      = parseFloat(btn.getAttribute("data-target")) || 0;
        openProgressModal(id, goalName, saved, tgt);
      }
    });
  }

  // ── Summary stats ────────────────────────────────────────
  function updateSummaryStats() {
    var goals = window.StorageAPI ? window.StorageAPI.getGoals() : [];
    var totalGoals = goals.length;
    var completedGoals = goals.filter(function (g) { return g.completed; }).length;
    var totalSaved = goals.reduce(function (s, g) { return s + (g.savedAmount || 0); }, 0);

    var totalEl = document.getElementById("statTotalGoals");
    var doneEl  = document.getElementById("statCompletedGoals");
    var savedEl = document.getElementById("statTotalSaved");

    if (totalEl) { totalEl.textContent = totalGoals; }
    if (doneEl)  { doneEl.textContent  = completedGoals; }
    if (savedEl) { savedEl.textContent = formatPhp(totalSaved); }

    // Streak
    var streak = window.StorageAPI ? window.StorageAPI.getCurrentStreak() : 0;
    var streakEl = document.getElementById("tigomStreakCount");
    if (streakEl) { streakEl.textContent = streak; }
  }

  // ── XP Widget ─────────────────────────────────────────────
  function renderXpWidget() {
    if (!window.StorageAPI || !window.StorageAPI.getXpInfo) { return; }
    var info   = window.StorageAPI.getXpInfo();
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var levelEl  = document.getElementById("xpLevel");
    var barEl    = document.getElementById("xpBar");
    var trackEl  = document.getElementById("xpBarTrack");
    var valueEl  = document.getElementById("xpValue");
    var chipEl   = document.getElementById("xpStreakChip");
    if (levelEl) {
      levelEl.innerHTML = '<i class="bi bi-arrow-up-circle-fill" aria-hidden="true"></i> Lv. ' + info.level + ' — ' + info.levelName;
    }
    if (barEl)    { barEl.style.width = info.progressPct + "%"; }
    if (trackEl)  { trackEl.setAttribute("aria-valuenow", info.progressPct); }
    if (valueEl)  { valueEl.textContent = info.xp + " XP"; }
    if (chipEl) {
      chipEl.className = "streak-chip" + (streak === 0 ? " streak-chip--cold" : streak >= 7 ? " streak-chip--hot streak-chip--week" : streak >= 3 ? " streak-chip--hot" : " streak-chip--warm");
      chipEl.innerHTML = '<i class="bi bi-fire" aria-hidden="true"></i> ' + (streak === 0 ? 'No streak yet' : streak + '-day streak');
    }
  }

  // ── Badge Grid ────────────────────────────────────────────
  function renderBadgeGrid() {
    var gridEl     = document.getElementById("badgeGrid");
    var progressEl = document.getElementById("badgeProgress");
    if (!gridEl || !window.StorageAPI) { return; }

    var allBadges  = window.StorageAPI.getAchievements ? window.StorageAPI.getAchievements() : [];
    var claimedCount = allBadges.filter(function (b) { return b.claimed; }).length;

    if (progressEl) {
      progressEl.textContent = claimedCount + " / " + allBadges.length + " badges";
    }

    var html = "";
    allBadges.forEach(function (badge) {
      if (badge.claimed) {
        html += '<div class="badge-card badge-card--claimed">'
          + '<div class="badge-icon-wrap badge-icon-wrap--claimed"><i class="bi ' + escapeHtml(badge.icon) + '" aria-hidden="true"></i></div>'
          + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
          + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
          + '<p class="badge-status badge-status--claimed"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Claimed</p>'
          + '</div>';
      } else if (badge.unlockable) {
        html += '<div class="badge-card badge-card--unlockable">'
          + '<div class="badge-icon-wrap badge-icon-wrap--unlockable"><i class="bi ' + escapeHtml(badge.icon) + '" aria-hidden="true"></i></div>'
          + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
          + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
          + '<button type="button" class="badge-claim-btn" data-badge-id="' + escapeHtml(badge.id) + '">Claim +15 XP</button>'
          + '</div>';
      } else {
        var pct = badge.target > 0 ? Math.min(100, Math.round((badge.progress / badge.target) * 100)) : 0;
        html += '<div class="badge-card badge-card--locked">'
          + '<div class="badge-icon-wrap badge-icon-wrap--locked"><i class="bi bi-lock-fill" aria-hidden="true"></i></div>'
          + '<p class="badge-name">' + escapeHtml(badge.name) + '</p>'
          + '<p class="badge-desc">' + escapeHtml(badge.description) + '</p>'
          + '<p class="badge-status badge-status--locked">' + badge.progress + ' / ' + badge.target + '</p>'
          + '</div>';
      }
    });

    gridEl.innerHTML = html;

    gridEl.querySelectorAll(".badge-claim-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var id = btn.getAttribute("data-badge-id");
        if (!id || !window.StorageAPI.claimAchievement) { return; }
        await window.StorageAPI.claimAchievement(id);
        renderBadgeGrid();
        renderXpWidget();
        updateSummaryStats();
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    initCreateForm();
    initProgressModal();
    initGoalListEvents();
    renderGoals();
    updateSummaryStats();
    renderXpMiniBar();

    window.addEventListener("sugbocents:synced", function () {
      renderGoals();
      updateSummaryStats();
      renderXpMiniBar();
    });
  });
})();
