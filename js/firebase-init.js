(function () {
  var state = {
    mode: "pending",
    reason: "",
    app: null,
    auth: null
  };

  // Replace this object in production, or set window.__SUGBOCENTS_FIREBASE_CONFIG before this script runs.
  var defaultConfig = {
    apiKey: "AIzaSyDP-udgzbQLSA36kU1UbgklPPj1VdlAv4w",
    authDomain: "sugbocents.firebaseapp.com",
    projectId: "sugbocents",
    appId: "1:408412999406:web:1c06ec4211f78ca6936dff",
    storageBucket: "sugbocents.firebasestorage.app",
    messagingSenderId: "408412999406",
    measurementId: "G-FXMGCJWE8M"
  };

  var config = window.__SUGBOCENTS_FIREBASE_CONFIG || defaultConfig;

  function hasConfig(value) {
    return Boolean(value && value.apiKey && value.authDomain && value.projectId && value.appId);
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-sdk="' + url + '"]');
      if (existing) {
        resolve();
        return;
      }

      var script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.setAttribute("data-sdk", url);
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("Failed loading SDK: " + url));
      };
      document.head.appendChild(script);
    });
  }

  function setFallback(reason) {
    state.mode = "local-fallback";
    state.reason = reason;
    console.warn("[SugboCents] Firebase disabled, using local fallback:", reason);
  }

  var ready = Promise.resolve()
    .then(function () {
      if (window.location.protocol === "file:") {
        setFallback("file-protocol");
        return;
      }

      if (!hasConfig(config)) {
        setFallback("missing-config");
        return;
      }

      return loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js")
        .then(function () {
          return loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
        })
        .then(function () {
          if (!window.firebase) {
            throw new Error("Firebase SDK unavailable");
          }

          state.app = window.firebase.apps && window.firebase.apps.length
            ? window.firebase.app()
            : window.firebase.initializeApp(config);
          state.auth = window.firebase.auth();
          state.mode = "firebase";
          state.reason = "";
        });
    })
    .catch(function (error) {
      setFallback("init-error");
      console.error("[SugboCents] Firebase init error:", error);
    });

  window.FirebaseInit = {
    ready: ready,
    get mode() {
      return state.mode;
    },
    get reason() {
      return state.reason;
    },
    isFirebaseMode: function () {
      return state.mode === "firebase";
    },
    getAuth: function () {
      return state.auth;
    }
  };
})();
