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
      return;
    }

    empty.classList.add("hidden");

    var html = "";
    goals.forEach(function (goal) {
      var pct = goal.targetAmount > 0
        ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
        : 0;

      var deadlineHtml = goal.deadline
        ? '<p class="goal-card-deadline">🗓 Target: ' + escapeHtml(goal.deadline) + '</p>'
        : "";

      var badgeHtml = goal.completed
        ? '<span class="goal-badge-completed">✅ Done</span>'
        : "";

      html +=
        '<div class="goal-card' + (goal.completed ? " goal-completed" : "") + '" data-goal-id="' + escapeHtml(goal.id) + '">' +
          '<div class="goal-card-header">' +
            '<div>' +
              '<p class="goal-card-name">' + escapeHtml(goal.name) + '</p>' +
              deadlineHtml +
            '</div>' +
            badgeHtml +
          '</div>' +
          '<div class="goal-amounts">' +
            '<span class="goal-saved">' + formatPhp(goal.savedAmount) + '</span>' +
            '<span class="goal-target"> / ' + formatPhp(goal.targetAmount) + '</span>' +
          '</div>' +
          '<div class="goal-progress-track">' +
            '<div class="goal-progress-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<p class="goal-progress-label">' + pct + '% saved</p>' +
          '<div class="goal-card-actions">' +
            '<button class="goal-add-btn" data-action="add-progress" data-id="' + escapeHtml(goal.id) + '" data-name="' + escapeHtml(goal.name) + '" data-saved="' + goal.savedAmount + '" data-target="' + goal.targetAmount + '">+ Add savings</button>' +
            '<button class="goal-delete-btn" data-action="delete" data-id="' + escapeHtml(goal.id) + '" aria-label="Delete goal">Delete</button>' +
          '</div>' +
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
    var modalCurrent = document.getElementById("progressModalCurrent");
    var amountInput = document.getElementById("progressAmount");

    activeGoalId = goalId;

    if (modalTitle) {
      modalTitle.textContent = "Add savings to \u201c" + goalName + "\u201d";
    }
    if (modalCurrent) {
      modalCurrent.textContent = "Current: " + formatPhp(savedAmount) + " / " + formatPhp(targetAmount);
    }
    if (amountInput) { amountInput.value = ""; }
    if (modal) { modal.classList.remove("hidden"); }
    if (amountInput) { amountInput.focus(); }
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
    var streak = window.StorageAPI ? window.StorageAPI.getStreakData() : { count: 0 };
    var streakEl = document.getElementById("tigomStreakCount");
    if (streakEl) { streakEl.textContent = streak.count; }
  }

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    initCreateForm();
    initProgressModal();
    initGoalListEvents();
    renderGoals();
    updateSummaryStats();

    window.addEventListener("sugbocents:synced", function () {
      renderGoals();
      updateSummaryStats();
    });
  });
})();
