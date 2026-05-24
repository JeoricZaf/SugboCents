(async function () {
  var ADD_FRIEND_SESSION_KEY = "sugbocents_pending_add_friend_code";

  if (window.StorageAPI && typeof window.StorageAPI.resolveAuthState === "function") {
    await window.StorageAPI.resolveAuthState();
  }

  var params = new URLSearchParams(window.location.search || "");
  var addFriend = String(params.get("addFriend") || "").trim();
  if (addFriend) {
    try { sessionStorage.setItem(ADD_FRIEND_SESSION_KEY, addFriend); } catch (_) {}
  }

  var hasSession = Boolean(window.StorageAPI && window.StorageAPI.getSession());
  if (hasSession) {
    window.location.replace(addFriend ? "profile.html" : "dashboard.html");
    return;
  }

  if (addFriend) {
    window.location.replace("login.html?addFriend=" + encodeURIComponent(addFriend));
    return;
  }

  window.location.replace("landing.html");
})();
