(async function () {
  if (window.StorageAPI && typeof window.StorageAPI.resolveAuthState === "function") {
    await window.StorageAPI.resolveAuthState();
  }

  var hasSession = Boolean(window.StorageAPI && window.StorageAPI.getSession());
  window.location.replace(hasSession ? "dashboard.html" : "landing.html");
})();
