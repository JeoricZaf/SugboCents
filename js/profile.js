(function () {
  if (document.body.dataset.page !== "profile") { return; }

  function renderHeader() {
    if (!window.StorageAPI) { return; }
    var info = window.StorageAPI.getXpInfo();
    var streak = window.StorageAPI.getCurrentStreak ? window.StorageAPI.getCurrentStreak() : 0;
    var levelEl = document.getElementById("profileLevel");
    var streakEl = document.getElementById("profileStreak");
    var barEl = document.getElementById("profileXpBar");
    var xpEl = document.getElementById("profileXpValue");
    if (levelEl) { levelEl.textContent = "Lv. " + info.level + " - " + info.levelName; }
    if (barEl) { barEl.style.width = info.progressPct + "%"; }
    if (xpEl) { xpEl.textContent = info.xp + " XP"; }
    if (streakEl) {
      streakEl.classList.remove("streak-chip--cold", "streak-chip--warm", "streak-chip--hot", "streak-chip--week");
      if (streak <= 0) {
        streakEl.classList.add("streak-chip--cold");
        streakEl.textContent = "🔥 No streak yet";
      } else if (streak < 3) {
        streakEl.classList.add("streak-chip--warm");
        streakEl.textContent = "🔥 " + streak + "-day streak";
      } else if (streak < 7) {
        streakEl.classList.add("streak-chip--hot");
        streakEl.textContent = "🔥 " + streak + "-day streak";
      } else {
        streakEl.classList.add("streak-chip--week");
        streakEl.textContent = "🔥 " + streak + "-day streak";
      }
    }

    document.body.classList.add("profile-ready");
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderHeader();
    window.addEventListener("sugbocents:synced", function () {
      renderHeader();
    });
  });
})();
