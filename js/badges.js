(function () {
  if (document.body.dataset.page !== "badges") { return; }

  function renderAchievements() {
    if (!window.StorageAPI || !window.StorageAPI.getAchievements) { return; }
    var grid = document.getElementById("achievementGrid");
    if (!grid) { return; }
    var achievements = window.StorageAPI.getAchievements();
    grid.innerHTML = "";
    achievements.forEach(function (a) {
      var card = document.createElement("div");
      card.className = "achievement-card";
      if (a.claimed) { card.classList.add("is-claimed"); }
      else if (a.unlockable) { card.classList.add("is-unlockable"); }
      else { card.classList.add("is-locked"); }

      var title = document.createElement("p");
      title.className = "achievement-title";
      title.textContent = a.name;
      var desc = document.createElement("p");
      desc.className = "achievement-desc";
      desc.textContent = a.description;
      var prog = document.createElement("p");
      prog.className = "achievement-progress";
      prog.textContent = "Progress: " + Math.min(a.progress, a.target) + "/" + a.target;
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(prog);

      if (a.unlockable && !a.claimed) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-primary w-full mt-2";
        btn.textContent = "Claim (+15 XP)";
        btn.addEventListener("click", function () {
          var result = window.StorageAPI.claimAchievement(a.id);
          if (result.ok) {
            renderAchievements();
          }
        });
        card.appendChild(btn);
      }
      grid.appendChild(card);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderAchievements();
    window.addEventListener("sugbocents:synced", renderAchievements);
  });
})();
