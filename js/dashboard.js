(function () {

  // ── undo toast state ─────────────────────────────────────
  var pendingDelete     = null; // { id, data }
  var pendingDeleteTimer = null;
  var UNDO_DELAY_MS     = 4000;

  // ── helpers ─────────────────────────────────────────────
  function formatPhp(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function formatRelativeTime(isoString) {
    var then = new Date(isoString).getTime();
    var now = Date.now();
    var deltaMinutes = Math.max(1, Math.round((now - then) / 60000));

    if (deltaMinutes < 60) {
      return deltaMinutes + " min ago";
    }

    var deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24) {
      return deltaHours + " hr ago";
    }

    var deltaDays = Math.round(deltaHours / 24);
    return deltaDays + " day" + (deltaDays > 1 ? "s" : "") + " ago";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── greeting ─────────────────────────────────────────────
  function renderGreeting() {
    var titleEl = document.getElementById("greetingTitle");
    var dateEl  = document.getElementById("greetingDate");
    if (!titleEl || !dateEl) {
      return;
    }

    var user = window.StorageAPI ? window.StorageAPI.getCurrentUser() : null;
    var name = user && user.firstName ? user.firstName : null;

    titleEl.textContent = name ? "Welcome back, " + name + "!" : "Welcome back.";

    var now = new Date();
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    dateEl.textContent = days[now.getDay()] + ", " + months[now.getMonth()] + " " + now.getDate();
  }
  function updateBudgetCard() {
    if (!window.StorageAPI) {
      return;
    }

    var summary = window.StorageAPI.getBudgetSummary();
    // Adjust for optimistic pending-delete
    if (pendingDelete && pendingDelete.data) {
      var adj = Number(pendingDelete.data.amount) || 0;
      summary.totalSpentThisWeek = Math.max(0, summary.totalSpentThisWeek - adj);
      summary.remaining = summary.weeklyBudget - summary.totalSpentThisWeek;
      summary.percentageSpent = summary.weeklyBudget > 0
        ? Math.min(100, Math.round((summary.totalSpentThisWeek / summary.weeklyBudget) * 100))
        : 0;
    }
    var remainingEl   = document.getElementById("remainingAmount");
    var summaryEl     = document.getElementById("budgetSummary");
    var progressEl    = document.getElementById("budgetProgress");
    var labelEl       = document.getElementById("progressLabel");
    var weekLabelEl   = document.getElementById("budgetWeekLabel");

    if (!remainingEl) {
      return;
    }

    remainingEl.textContent = formatPhp(summary.remaining);

    if (summary.weeklyBudget > 0) {
      summaryEl.textContent = formatPhp(summary.totalSpentThisWeek) + " of " + formatPhp(summary.weeklyBudget) + " spent";
    } else {
      summaryEl.textContent = "Set your weekly budget in Settings.";
    }

    var pct = summary.percentageSpent;
    progressEl.style.width = pct + "%";
    labelEl.textContent = pct + "% spent";

    // colour-adaptive bar
    progressEl.classList.remove("pct-warn", "pct-danger");
    if (pct >= 80) {
      progressEl.classList.add("pct-danger");
    } else if (pct >= 60) {
      progressEl.classList.add("pct-warn");
    }

    // week range label
    if (weekLabelEl) {
      var now = new Date();
      var day = now.getDay();
      var startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((day + 6) % 7));
      var endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      weekLabelEl.textContent = months[startOfWeek.getMonth()] + " " + startOfWeek.getDate() + " \u2013 " +
        months[endOfWeek.getMonth()] + " " + endOfWeek.getDate();
    }
  }

  // ── quick-add grid ───────────────────────────────────────
  function renderQuickAddButtons() {
    var grid = document.getElementById("quickAddGrid");
    if (!grid || !window.StorageAPI) {
      return;
    }

    var items = window.StorageAPI.getQuickAddItems();
    grid.innerHTML = "";

    if (items.length === 0) {
      var SUGGESTIONS = [
        { label: "Jeepney",  amount: 18,  color: "#d8efe2" },
        { label: "Food",     amount: 120, color: "#ffedd5" },
        { label: "Load",     amount: 50,  color: "#dbeafe" },
        { label: "Laundry",  amount: 60,  color: "#fee2e2" },
        { label: "School",   amount: 80,  color: "#f3e8ff" },
        { label: "Coffee",   amount: 75,  color: "#fef9c3" }
      ];

      var emptyWrap = document.createElement("div");
      emptyWrap.className = "col-span-2";
      emptyWrap.innerHTML =
        '<p class="text-sm font-semibold text-ink mb-1">Add your first shortcut</p>' +
        '<p class="text-xs text-slate-500 mb-3">Tap a suggestion or use the Add button above.</p>' +
        '<div class="qa-suggestions"></div>';
      grid.appendChild(emptyWrap);

      var suggestRow = emptyWrap.querySelector(".qa-suggestions");
      SUGGESTIONS.forEach(function (sug) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "qa-suggestion-chip";
        chip.style.background = sug.color;
        chip.textContent = sug.label;
        chip.addEventListener("click", function () {
          openQaModal({ id: "", category: sug.label, emoji: "", amount: sug.amount, color: sug.color });
        });
        suggestRow.appendChild(chip);
      });
      return;
    }

    items.forEach(function (item) {
      var wrap = document.createElement("div");
      wrap.className = "quick-add-wrap";

      var button = document.createElement("button");
      button.type = "button";
      button.className = "quick-add";
      button.style.background = item.color || "#e2e8f0";
      button.setAttribute("data-qa-id", item.id || "");
      var abbrev = escapeHtml((item.category || "?").slice(0, 2).toUpperCase());
      button.innerHTML =
        '<span class="qa-initial">' + abbrev + "</span>" +
        "<span>" +
        '<span class="block text-sm font-bold">' + escapeHtml(item.category) + "</span>" +
        '<span class="block text-xs text-slate-500 mt-0.5">' + formatPhp(item.amount) + "</span>" +
        "</span>";

      button.addEventListener("click", function () {
        var result = window.StorageAPI.addExpense({
          amount: item.amount,
          category: item.category,
          note: "Quick add"
        });

        if (!result.ok) {
          return;
        }

        updateBudgetCard();
        renderRecentExpenses();
        if (window.SpendingChart) { window.SpendingChart.update(); }

        // brief visual feedback: pulse the button
        button.classList.add("qa-pulse");
        setTimeout(function () { button.classList.remove("qa-pulse"); }, 500);
      });

      // options (⋯) button — always visible on touch, hover on pointer devices
      var optBtn = document.createElement("button");
      optBtn.type = "button";
      optBtn.className = "qa-option-btn";
      optBtn.setAttribute("aria-label", "Edit " + escapeHtml(item.category));
      optBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
      optBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openQaModal(item);
      });

      wrap.appendChild(button);
      wrap.appendChild(optBtn);
      grid.appendChild(wrap);
    });
  }

  function deleteQuickAddItem(itemId) {
    if (!window.StorageAPI) {
      return;
    }

    var items = window.StorageAPI.getQuickAddItems();
    var updated = items.filter(function (i) {
      return i.id !== itemId;
    });

    window.StorageAPI.saveQuickAddItems(updated);
    closeModal();
    renderQuickAddButtons();
  }

  // ── modal ────────────────────────────────────────────────
  var qaModal          = null;
  var qaModalItemIdEl  = null;
  var qaModalCategory  = null;
  var qaModalAmount    = null;
  var qaModalCatErr    = null;
  var qaModalAmtErr    = null;
  var qaModalDeleteBtn = null;

  function initModal() {
    qaModal         = document.getElementById("qaModal");
    qaModalItemIdEl = document.getElementById("qaModalItemId");
    qaModalCategory = document.getElementById("qaModalCategory");
    qaModalAmount   = document.getElementById("qaModalAmount");
    qaModalCatErr   = document.getElementById("qaModalCategoryError");
    qaModalAmtErr   = document.getElementById("qaModalAmountError");
    qaModalDeleteBtn = document.getElementById("qaModalDelete");

    document.getElementById("qaModalCancel").addEventListener("click", closeModal);
    document.getElementById("qaModalSave").addEventListener("click", saveModal);

    if (qaModalDeleteBtn) {
      qaModalDeleteBtn.addEventListener("click", function () {
        var itemId = qaModalItemIdEl.value;
        if (itemId) {
          deleteQuickAddItem(itemId);
        }
      });
    }
    // Backdrop click intentionally does NOT close — user must use Cancel
  }

  function openQaModal(item) {
    document.getElementById("qaModalTitle").textContent = item ? "Edit shortcut" : "New shortcut";
    qaModalItemIdEl.value  = item ? (item.id || "") : "";
    qaModalCategory.value  = item ? (item.category || "") : "";
    qaModalAmount.value    = item ? String(item.amount || "") : "";

    qaModalCatErr.textContent = "";
    qaModalAmtErr.textContent = "";

    // show Delete button only when editing an existing item
    if (qaModalDeleteBtn) {
      qaModalDeleteBtn.style.display = item ? "inline-flex" : "none";
    }

    qaModal.classList.remove("hidden");
    qaModalCategory.focus();
  }

  function closeModal() {
    qaModal.classList.add("hidden");
  }

  function saveModal() {
    var cat    = (qaModalCategory.value || "").trim();
    var amt    = Number(qaModalAmount.value);
    var itemId = qaModalItemIdEl.value;

    var valid = true;

    if (!cat) {
      qaModalCatErr.textContent = "Name is required.";
      valid = false;
    } else {
      qaModalCatErr.textContent = "";
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      qaModalAmtErr.textContent = "Enter a valid amount greater than 0.";
      valid = false;
    } else {
      qaModalAmtErr.textContent = "";
    }

    if (!valid) {
      return;
    }

    var items = window.StorageAPI.getQuickAddItems();
    var COLORS = ["#d8efe2", "#ffedd5", "#dbeafe", "#f3e8ff", "#fee2e2", "#fef9c3", "#e0f2fe"];

    if (itemId) {
      items = items.map(function (i) {
        if (i.id === itemId) {
          return { id: i.id, category: cat, emoji: "\u2022", amount: amt, color: i.color || COLORS[0] };
        }
        return i;
      });
    } else {
      var newId = "qa_custom_" + Date.now();
      var color = COLORS[items.length % COLORS.length];
      items.push({ id: newId, category: cat, emoji: "\u2022", amount: amt, color: color });
    }

    window.StorageAPI.saveQuickAddItems(items);
    closeModal();
    renderQuickAddButtons();
  }

  // ── recent expenses ──────────────────────────────────────
  function renderRecentExpenses() {
    if (!window.StorageAPI) {
      return;
    }

    var list  = document.getElementById("recentExpenseList");
    var empty = document.getElementById("emptyExpenseState");
    if (!list || !empty) {
      return;
    }

    var expenses = window.StorageAPI.getExpenses(5);
    // Optimistically hide any pending-delete item
    if (pendingDelete) {
      expenses = expenses.filter(function (e) { return e.id !== pendingDelete.id; });
    }
    var qaItems  = window.StorageAPI.getQuickAddItems();
    list.innerHTML = "";

    if (!expenses.length) {
      empty.classList.remove("hidden");
      list.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    list.classList.remove("hidden");

    expenses.forEach(function (expense) {
      var match  = qaItems.find(function (item) { return item.category === expense.category; });
      var chipBg = match ? (match.color || "#e2e8f0") : "#e2e8f0";
      var initials = (expense.category || "?").slice(0, 2).toUpperCase();

      var li = document.createElement("li");
      li.className = "expense-row";

      var chipEl = document.createElement("span");
      chipEl.className = "expense-chip";
      chipEl.style.background = chipBg;
      chipEl.textContent = initials;

      var infoEl = document.createElement("span");
      infoEl.innerHTML =
        '<span class="expense-title">' + escapeHtml(expense.category) + "</span>" +
        '<span class="expense-meta block">' + formatRelativeTime(expense.timestamp) +
        (expense.note && expense.note !== "Quick add" ? " · " + escapeHtml(expense.note) : "") +
        "</span>";

      var amtEl = document.createElement("span");
      amtEl.className = "expense-amount";
      amtEl.textContent = "-" + formatPhp(expense.amount);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "expense-delete-btn";
      delBtn.setAttribute("aria-label", "Remove expense");
      delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      delBtn.addEventListener("click", (function (exp) {
        return function () {
          showUndoToast(exp);
        };
      }(expense)));

      li.appendChild(chipEl);
      li.appendChild(infoEl);
      li.appendChild(amtEl);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }

  // ── log one-time expense ─────────────────────────────────
  function initLogExpense() {
    var amtInput  = document.getElementById("logExpenseAmount");
    var descInput = document.getElementById("logExpenseDesc");
    var logBtn    = document.getElementById("logExpenseBtn");
    var errEl     = document.getElementById("logExpenseError");

    if (!logBtn) {
      return;
    }

    logBtn.addEventListener("click", function () {
      var amt  = Number(amtInput.value);
      var desc = (descInput.value || "").trim();

      errEl.textContent = "";
      errEl.classList.add("hidden");

      if (!Number.isFinite(amt) || amt <= 0) {
        errEl.textContent = "Enter a valid amount greater than 0.";
        errEl.classList.remove("hidden");
        amtInput.focus();
        return;
      }

      if (!desc) {
        errEl.textContent = "Enter a description.";
        errEl.classList.remove("hidden");
        descInput.focus();
        return;
      }

      var result = window.StorageAPI.addExpense({
        amount: amt,
        category: desc,
        note: "One-time"
      });

      if (!result.ok) {
        errEl.textContent = result.error || "Could not log expense.";
        errEl.classList.remove("hidden");
        return;
      }

      amtInput.value  = "";
      descInput.value = "";
      updateBudgetCard();
      renderRecentExpenses();
      if (window.SpendingChart) { window.SpendingChart.update(); }

      // brief visual confirmation on the button
      logBtn.textContent = "\u2713 Logged";
      logBtn.disabled = true;
      setTimeout(function () {
        logBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log';
        logBtn.disabled = false;
      }, 1200);
    });

    // Allow Enter key in either field to submit
    [amtInput, descInput].forEach(function (el) {
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          logBtn.click();
        }
      });
    });
  }

  // ── undo toast ───────────────────────────────────────────
  function showUndoToast(expense) {
    // If another delete is pending, commit it immediately
    if (pendingDelete) {
      commitDelete();
    }

    pendingDelete = { id: expense.id, data: expense };

    // Optimistically hide from list
    updateBudgetCard();
    renderRecentExpenses();
    if (window.SpendingChart) { window.SpendingChart.update(); }

    var toast   = document.getElementById("undoToast");
    var undoBtn = document.getElementById("undoToastBtn");

    if (toast) {
      toast.classList.remove("hidden");
    }

    pendingDeleteTimer = setTimeout(function () {
      commitDelete();
    }, UNDO_DELAY_MS);

    if (undoBtn) {
      undoBtn.onclick = function () {
        cancelDelete();
      };
    }
  }

  function commitDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    window.StorageAPI.removeExpense(pendingDelete.id);
    pendingDelete = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    updateBudgetCard();
    renderRecentExpenses();
    if (window.SpendingChart) { window.SpendingChart.update(); }
  }

  function cancelDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    pendingDelete = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    updateBudgetCard();
    renderRecentExpenses();
    if (window.SpendingChart) { window.SpendingChart.update(); }
  }

  // ── settings page ────────────────────────────────────────
  function initSettingsPage() {
    if (!window.StorageAPI) {
      return;
    }

    var form          = document.getElementById("budgetForm");
    var budgetInput   = document.getElementById("weeklyBudget");
    var budgetError   = document.getElementById("weeklyBudgetError");
    var budgetSavedMsg = document.getElementById("budgetSavedMessage");
    var logoutButton  = document.getElementById("logoutButton");
    var resetButton   = document.getElementById("resetAppButton");
    var actionMessage = document.getElementById("settingsActionMessage");

    if (budgetInput) {
      budgetInput.value = String(window.StorageAPI.getWeeklyBudget() || "");
    }

    if (form && budgetInput && budgetError) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        budgetError.textContent = "";
        budgetInput.classList.remove("is-invalid");

        var amount = Number(budgetInput.value);
        if (!Number.isFinite(amount) || amount < 0) {
          budgetError.textContent = "Enter a valid amount (0 or more).";
          budgetInput.classList.add("is-invalid");
          return;
        }

        var result = window.StorageAPI.saveWeeklyBudget(amount);
        if (!result.ok) {
          budgetError.textContent = result.error || "Could not save budget.";
          budgetInput.classList.add("is-invalid");
          return;
        }

        if (budgetSavedMsg) {
          budgetSavedMsg.textContent = "\u2713 Saved";
          budgetSavedMsg.className = "text-xs font-semibold text-emerald-700";
          budgetSavedMsg.classList.remove("hidden");
          setTimeout(function () { budgetSavedMsg.classList.add("hidden"); }, 3000);
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        window.StorageAPI.logout();
        window.location.replace("landing.html");
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        var confirmed = window.confirm("Clear your budget and expenses? This cannot be undone.");
        if (!confirmed) {
          return;
        }

        resetButton.disabled = true;
        resetButton.textContent = "Clearing\u2026";

        window.StorageAPI.resetCurrentUserData().then(function (result) {
          resetButton.disabled = false;
          resetButton.textContent = "Clear my data";

          if (!actionMessage) {
            return;
          }

          if (!result.ok) {
            actionMessage.textContent = result.error || "Unable to clear data.";
            actionMessage.className = "text-sm mt-3 text-red-700";
            actionMessage.classList.remove("hidden");
            return;
          }

          if (budgetInput) {
            budgetInput.value = "";
          }

          actionMessage.textContent = "\u2713 Data cleared. Reloading\u2026";
          actionMessage.className = "text-sm mt-3 font-semibold text-emerald-700";
          actionMessage.classList.remove("hidden");

          // Reload so the UI reflects empty state & firebase sync is clean
          setTimeout(function () {
            window.location.reload();
          }, 1500);
        });
      });
    }
  }

  // ── init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");

    if (page === "dashboard") {
      renderGreeting();
      renderQuickAddButtons();
      updateBudgetCard();
      renderRecentExpenses();
      initModal();
      initLogExpense();

      window.addEventListener("sugbocents:synced", function () {
        renderGreeting();
        updateBudgetCard();
        renderRecentExpenses();
        renderQuickAddButtons();
        if (window.SpendingChart) { window.SpendingChart.update(); }
      });

      var addNewBtn = document.getElementById("addNewQaBtn");
      if (addNewBtn) {
        addNewBtn.addEventListener("click", function () {
          openQaModal(null);
        });
      }
    }

    if (page === "settings") {
      initSettingsPage();
    }
  });
})();
