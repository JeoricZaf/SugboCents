(function () {
  if (document.body.dataset.page !== "shop") { return; }

  function render() {
    if (!window.StorageAPI) { return; }
    var balance     = window.StorageAPI.getSentimosBalance ? window.StorageAPI.getSentimosBalance() : 0;
    var freezeCount = window.StorageAPI.getStreakFreezeCount ? window.StorageAPI.getStreakFreezeCount() : 0;

    var balEl   = document.getElementById("shopBalance");
    var eqEl    = document.getElementById("freezeEquipped");
    var btn     = document.getElementById("buyFreezeBtn");
    var msgEl   = document.getElementById("freezeMsg");

    if (balEl)   { balEl.textContent = balance + " \u20B5"; }
    if (eqEl)    { eqEl.textContent = freezeCount + " / 2 equipped"; }

    if (btn) {
      var atMax = freezeCount >= 2;
      btn.disabled = atMax;
      btn.style.opacity = atMax ? "0.4" : "1";
      btn.title = atMax ? "Maximum freezes equipped" : "";
    }
    if (msgEl)   { msgEl.style.display = "none"; msgEl.textContent = ""; }
  }

  function handleBuyFreeze() {
    if (!window.StorageAPI || !window.StorageAPI.activateStreakFreeze) { return; }
    var result = window.StorageAPI.activateStreakFreeze();
    var msgEl  = document.getElementById("freezeMsg");
    if (result.ok) {
      render();
      if (msgEl) { msgEl.style.display = "none"; }
    } else {
      if (msgEl) {
        msgEl.textContent = result.error || "Purchase failed.";
        msgEl.style.display = "block";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    var btn = document.getElementById("buyFreezeBtn");
    if (btn) { btn.addEventListener("click", handleBuyFreeze); }
    window.addEventListener("sugbocents:dataChanged", render);
    window.addEventListener("sugbocents:synced", render);
  });
})();
