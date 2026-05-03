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

    // Populate sidebar user widget on all protected pages
    var user = window.StorageAPI.getCurrentUser();
    if (user) {
      var sidebarName = document.getElementById("sidebarName");
      var sidebarAvatar = document.getElementById("sidebarAvatar");
      if (sidebarName) {
        sidebarName.textContent = user.firstName ? user.firstName + (user.lastName ? " " + user.lastName : "") : user.email;
      }
      if (sidebarAvatar) {
        var initials = user.firstName ? user.firstName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "U");
        if (user.lastName) {
          initials += user.lastName.charAt(0).toUpperCase();
        }
        sidebarAvatar.textContent = initials;
      }
      document.body.classList.add("sidebar-ready");
    } else {
      document.body.classList.remove("sidebar-ready");
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

  function initSidebarToggle() {
    var toggleBtn = document.getElementById("sidebarToggle");
    if (!toggleBtn) {
      return;
    }

    // State is already applied by the inline <script> in <head> (no DOMContentLoaded needed).
    // Just wire the click handler to toggle the class on <html>.
    toggleBtn.addEventListener("click", function () {
      var isCollapsed = document.documentElement.classList.toggle("sidebar-collapsed");
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "true" : "false");
    });
  }

  function initSidebarTooltip() {
    // Only relevant on desktop where the sidebar exists.
    if (window.innerWidth < 1024) { return; }

    // Single tooltip div appended to <body> — escapes sidebar overflow:hidden entirely.
    var tip = document.createElement("div");
    tip.className = "sidebar-tooltip";
    document.body.appendChild(tip);

    function showTip(text, rect) {
      tip.textContent = text;
      tip.style.top = (rect.top + rect.height / 2) + "px";
      tip.style.left = (rect.right + 10) + "px";
      tip.classList.add("is-visible");
    }

    function hideTip() {
      tip.classList.remove("is-visible");
    }

    // Nav links — only show tooltip when sidebar is collapsed.
    var navLinks = document.querySelectorAll(".sidebar-nav-link[data-tooltip]");
    navLinks.forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        if (!document.documentElement.classList.contains("sidebar-collapsed")) { return; }
        showTip(link.dataset.tooltip, link.getBoundingClientRect());
      });
      link.addEventListener("mouseleave", hideTip);
    });

    // User row tooltip — only when collapsed.
    var userRow = document.querySelector(".sidebar-user");
    if (userRow) {
      userRow.addEventListener("mouseenter", function () {
        if (!document.documentElement.classList.contains("sidebar-collapsed")) { return; }
        showTip("Account settings", userRow.getBoundingClientRect());
      });
      userRow.addEventListener("mouseleave", hideTip);
    }

    // Toggle button — always show (collapsed or expanded).
    var toggleBtn = document.getElementById("sidebarToggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("mouseenter", function () {
        var isCollapsed = document.documentElement.classList.contains("sidebar-collapsed");
        showTip(isCollapsed ? "Open sidebar" : "Close sidebar", toggleBtn.getBoundingClientRect());
      });
      toggleBtn.addEventListener("mouseleave", hideTip);
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    await protectRoutes();
    activateBottomNav();
    initSidebarToggle();
    initSidebarTooltip();
    registerServiceWorker();
  });
})();

