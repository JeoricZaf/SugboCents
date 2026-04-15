(function () {
  var QUICK_ADD_ITEMS = [
    { category: "Jeep", emoji: "ðŸšŒ", amount: 18, color: "#d8efe2" },
    { category: "Food", emoji: "ðŸœ", amount: 120, color: "#ffedd5" },
    { category: "Load", emoji: "ðŸ“±", amount: 50, color: "#dbeafe" },
    { category: "School Supplies", emoji: "ðŸ“š", amount: 80, color: "#f3e8ff" },
    { category: "Laundry", emoji: "ðŸ§º", amount: 60, color: "#fee2e2" }
  ];

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

  function updateBudgetCard() {
    if (!window.StorageAPI) {
      return;
    }

    var summary = window.StorageAPI.getBudgetSummary();
    var remainingEl = document.getElementById("remainingAmount");
    var summaryEl = document.getElementById("budgetSummary");
    var progressEl = document.getElementById("budgetProgress");
    var progressLabel = document.getElementById("progressLabel");

    if (!remainingEl || !summaryEl || !progressEl || !progressLabel) {
      return;
    }

    remainingEl.textContent = formatPhp(summary.remaining);

    if (summary.weeklyBudget > 0) {
      summaryEl.textContent = formatPhp(summary.totalSpentThisWeek) + " spent of " + formatPhp(summary.weeklyBudget);
    } else {
      summaryEl.textContent = "Set your weekly budget in Settings.";
    }

    progressEl.style.width = summary.percentageSpent + "%";
    progressLabel.textContent = summary.percentageSpent + "% spent";
  }

  function renderQuickAddButtons() {
    var grid = document.getElementById("quickAddGrid");
    if (!grid || !window.StorageAPI) {
      return;
    }

    grid.innerHTML = "";

    QUICK_ADD_ITEMS.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "quick-add";
      button.style.background = item.color;
      button.innerHTML =
        '<span class="quick-emoji">' + item.emoji + "</span>" +
        '<span><span class="block text-sm">' + item.category + "</span>" +
        '<span class="block text-xs text-slate-600">' + formatPhp(item.amount) + "</span></span>";

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
      });

      grid.appendChild(button);
    });
  }

  function renderRecentExpenses() {
    if (!window.StorageAPI) {
      return;
    }

    var list = document.getElementById("recentExpenseList");
    var empty = document.getElementById("emptyExpenseState");
    if (!list || !empty) {
      return;
    }

    var expenses = window.StorageAPI.getExpenses(10);
    list.innerHTML = "";

    if (!expenses.length) {
      empty.classList.remove("hidden");
      list.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    list.classList.remove("hidden");

    expenses.forEach(function (expense) {
      var quickMatch = QUICK_ADD_ITEMS.find(function (item) {
        return item.category === expense.category;
      });

      var emoji = quickMatch ? quickMatch.emoji : "ðŸ’¸";
      var chipBg = quickMatch ? quickMatch.color : "#e2e8f0";

      var item = document.createElement("li");
      item.className = "expense-row";
      item.innerHTML =
        '<span class="expense-chip" style="background:' + chipBg + '">' + emoji + "</span>" +
        '<span><span class="expense-title">' + expense.category + "</span>" +
        '<span class="expense-meta">' + formatRelativeTime(expense.timestamp) + "</span></span>" +
        '<span class="expense-amount">-' + formatPhp(expense.amount) + "</span>";

      list.appendChild(item);
    });
  }

  function initSettingsPage() {
    if (!window.StorageAPI) {
      return;
    }

    var form = document.getElementById("budgetForm");
    var budgetInput = document.getElementById("weeklyBudget");
    var budgetError = document.getElementById("weeklyBudgetError");
    var logoutButton = document.getElementById("logoutButton");
    var resetButton = document.getElementById("resetAppButton");
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

        if (actionMessage) {
          actionMessage.textContent = "Weekly budget saved.";
          actionMessage.className = "text-sm mt-3 text-emerald-700";
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        window.StorageAPI.logout();
        window.location.replace("login.html");
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        var confirmed = window.confirm("Clear your budget and expenses? This cannot be undone.");
        if (!confirmed) {
          return;
        }

        var result = window.StorageAPI.resetCurrentUserData();
        if (!actionMessage) {
          return;
        }

        if (!result.ok) {
          actionMessage.textContent = result.error || "Unable to clear data.";
          actionMessage.className = "text-sm mt-3 text-red-700";
          return;
        }

        if (budgetInput) {
          budgetInput.value = "";
        }

        actionMessage.textContent = "Your account data has been cleared.";
        actionMessage.className = "text-sm mt-3 text-emerald-700";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");

    if (page === "dashboard") {
      renderQuickAddButtons();
      updateBudgetCard();
      renderRecentExpenses();
    }

    if (page === "settings") {
      initSettingsPage();
    }
  });
})();

