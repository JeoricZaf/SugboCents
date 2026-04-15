(function () {
  function isLocalDevelopmentHost() {
    var host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function getPage() {
    return document.body.getAttribute("data-page") || "";
  }

  function hasStorageApi() {
    return Boolean(window.StorageAPI);
  }

  async function protectRoutes() {
    if (!hasStorageApi()) {
      return;
    }

    if (typeof window.StorageAPI.resolveAuthState === "function") {
      await window.StorageAPI.resolveAuthState();
    }

    var page = getPage();
    var needsAuth = document.body.getAttribute("data-protected") === "true";
    var guestOnly = document.body.getAttribute("data-guest-only") === "true";
    var session = window.StorageAPI.getSession();

    if (needsAuth && !session) {
      window.location.replace("login.html");
      return;
    }

    if (guestOnly && session) {
      window.location.replace("dashboard.html");
      return;
    }

    if (page === "dashboard" || page === "settings") {
      var user = window.StorageAPI.getCurrentUser();
      var welcome = document.getElementById("welcomeUser");
      if (welcome && user) {
        welcome.textContent = user.firstName ? "Hi, " + user.firstName : user.email;
      }
    }
  }

  function activateBottomNav() {
    var page = getPage();
    var links = document.querySelectorAll("[data-nav]");
    links.forEach(function (link) {
      if (link.getAttribute("data-nav") === page) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (isLocalDevelopmentHost()) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) {
          registration.unregister();
        });
      }).catch(function () {
        // Ignore unregister errors in local development.
      });
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        // Ignore registration errors on unsupported contexts (e.g., file://).
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    await protectRoutes();
    activateBottomNav();
    registerServiceWorker();
  });
})();

