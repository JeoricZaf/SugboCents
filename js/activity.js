(function () {
  if (document.body.dataset.page !== "activity") { return; }

  // ── undo toast state ──────────────────────────────────────
  var pendingDelete      = null;
  var pendingDeleteTimer = null;
  var UNDO_DELAY_MS      = 4000;

  // ── filter state ──────────────────────────────────────────
  var activeFilter = "All";
  var allExpenses  = [];

  // ── helpers ───────────────────────────────────────────────
  function formatPhp(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDateLabel(isoString) {
    var date      = new Date(isoString);
    var today     = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    function key(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }

    if (key(date) === key(today))     { return "Today"; }
    if (key(date) === key(yesterday)) { return "Yesterday"; }

    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[date.getMonth()] + " " + date.getDate();
  }

  function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }

  // ── group expenses by date label ──────────────────────────
  function groupByDate(expenses) {
    var groups   = [];
    var labelMap = {};
    expenses.forEach(function (expense) {
      var label = formatDateLabel(expense.timestamp);
      if (!labelMap[label]) {
        labelMap[label] = [];
        groups.push({ label: label, items: labelMap[label] });
      }
      labelMap[label].push(expense);
    });
    return groups;
  }

  // ── render expense list ───────────────────────────────────
  function renderList() {
    var listEl  = document.getElementById("activityList");
    var emptyEl = document.getElementById("emptyActivity");
    var countEl = document.getElementById("activityCount");
    if (!listEl || !emptyEl) { return; }

    var filtered = activeFilter === "All"
      ? allExpenses
      : allExpenses.filter(function (e) { return e.category === activeFilter; });

    // Optimistically hide pending-delete row
    if (pendingDelete) {
      filtered = filtered.filter(function (e) { return e.id !== pendingDelete.id; });
    }

    if (countEl) {
      countEl.textContent = filtered.length
        ? "Showing " + filtered.length + " expense" + (filtered.length !== 1 ? "s" : "")
        : "";
    }

    listEl.innerHTML = "";

    if (!filtered.length) {
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    var qaItems = window.StorageAPI.getQuickAddItems ? window.StorageAPI.getQuickAddItems() : [];
    var groups  = groupByDate(filtered);

    groups.forEach(function (group) {
      var section  = document.createElement("div");
      section.className = "activity-date-group";

      var labelEl  = document.createElement("p");
      labelEl.className = "activity-date-label";
      labelEl.textContent = group.label;
      section.appendChild(labelEl);

      var ul = document.createElement("ul");
      ul.className = "card-panel divide-y divide-slate-100";

      group.items.forEach(function (expense) {
        var match   = qaItems.find(function (item) { return item.category === expense.category; });
        var chipBg  = match ? (match.color || "#e2e8f0") : "#e2e8f0";
        var initials = (expense.category || "?").slice(0, 2).toUpperCase();

        var li = document.createElement("li");
        li.className = "expense-row";

        var chipEl = document.createElement("span");
        chipEl.className = "expense-chip";
        chipEl.style.background = chipBg;
        chipEl.textContent = initials;

        var infoEl = document.createElement("span");
        infoEl.className = "min-w-0 flex-1";
        var noteText = expense.note && expense.note !== "Quick add" && expense.note !== "One-time"
          ? " · " + escapeHtml(expense.note) : "";
        infoEl.innerHTML =
          '<span class="expense-title">' + escapeHtml(expense.category) + "</span>" +
          '<span class="expense-meta block">' + formatTime(expense.timestamp) + noteText + "</span>";

        var amtEl = document.createElement("span");
        amtEl.className = "expense-amount";
        amtEl.textContent = "-" + formatPhp(expense.amount);

        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "expense-delete-btn";
        delBtn.setAttribute("aria-label", "Remove expense");
        delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.addEventListener("click", (function (exp) {
          return function () { showUndoToast(exp); };
        }(expense)));

        li.appendChild(chipEl);
        li.appendChild(infoEl);
        li.appendChild(amtEl);
        li.appendChild(delBtn);
        ul.appendChild(li);
      });

      section.appendChild(ul);
      listEl.appendChild(section);
    });
  }

  // ── render filter chips ───────────────────────────────────
  function renderFilterChips() {
    var bar = document.getElementById("categoryFilter");
    if (!bar) { return; }

    var seen       = {};
    var categories = [];
    allExpenses.forEach(function (e) {
      if (!seen[e.category]) {
        seen[e.category] = true;
        categories.push(e.category);
      }
    });

    bar.innerHTML = "";
    var chips = ["All"].concat(categories);
    chips.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-chip" + (cat === activeFilter ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", function () {
        activeFilter = cat;
        renderFilterChips();
        renderList();
      });
      bar.appendChild(btn);
    });
  }

  // ── undo toast ────────────────────────────────────────────
  function showUndoToast(expense) {
    if (pendingDelete) { commitDelete(); }

    pendingDelete = { id: expense.id, data: expense };
    renderList();

    var toast   = document.getElementById("undoToast");
    var undoBtn = document.getElementById("undoToastBtn");
    if (toast)   { toast.classList.remove("hidden"); }

    pendingDeleteTimer = setTimeout(commitDelete, UNDO_DELAY_MS);
    if (undoBtn) { undoBtn.onclick = cancelDelete; }
  }

  function commitDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    window.StorageAPI.removeExpense(pendingDelete.id);
    allExpenses = allExpenses.filter(function (e) { return e.id !== pendingDelete.id; });
    pendingDelete      = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    renderFilterChips();
    renderList();
  }

  function cancelDelete() {
    if (!pendingDelete) { return; }
    clearTimeout(pendingDeleteTimer);
    pendingDelete      = null;
    pendingDeleteTimer = null;
    var toast = document.getElementById("undoToast");
    if (toast) { toast.classList.add("hidden"); }
    renderList();
  }

  // ── init ──────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.StorageAPI) { return; }

    allExpenses = window.StorageAPI.getExpenses();
    renderFilterChips();
    renderList();

    // Re-render after Firestore sync
    window.addEventListener("sugbocents:synced", function () {
      allExpenses  = window.StorageAPI.getExpenses();
      activeFilter = "All";
      renderFilterChips();
      renderList();
    });
  });
})();
