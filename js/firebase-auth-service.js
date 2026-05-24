(function () {
  function normalizeError(error, fallbackMessage) {
    var code = error && error.code ? String(error.code) : "";

    if (code === "auth/email-already-in-use") {
      return "Email is already registered.";
    }

    if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }

    if (code === "auth/weak-password") {
      return "Password must be at least 6 characters.";
    }

    if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
      return "Incorrect email or password.";
    }

    if (code === "auth/too-many-requests") {
      return "Too many attempts. Please try again later.";
    }

    return fallbackMessage || "Something went wrong. Please try again.";
  }

  function sanitizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function buildDisplayName(firstName, lastName) {
    return [sanitizeName(firstName), sanitizeName(lastName)].filter(Boolean).join(" ");
  }

  function getAuthOrThrow() {
    if (!window.FirebaseInit || !window.FirebaseInit.isFirebaseMode()) {
      throw new Error("Firebase auth is not enabled.");
    }

    var auth = window.FirebaseInit.getAuth();
    if (!auth) {
      throw new Error("Firebase auth is not ready.");
    }

    return auth;
  }

  async function registerUser(payload) {
    try {
      await window.FirebaseInit.ready;
      var auth = getAuthOrThrow();

      var email = String(payload.email || "").trim();
      var password = String(payload.password || "");
      var firstName = sanitizeName(payload.firstName);
      var lastName = sanitizeName(payload.lastName);
      var displayName = buildDisplayName(payload.firstName, payload.lastName);

      var credential = await auth.createUserWithEmailAndPassword(email, password);

      if (credential.user && displayName) {
        await credential.user.updateProfile({
          displayName: displayName
        });
      }

      if (window.FirestoreService && window.FirestoreService.seedUserDoc) {
        await window.FirestoreService.seedUserDoc(credential.user.uid, {
          firstName: firstName,
          lastName: lastName,
          email: email
        });
      }

      return {
        ok: true,
        user: {
          id: credential.user.uid,
          email: credential.user.email || email,
          displayName: displayName
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: normalizeError(error, "Unable to create account.")
      };
    }
  }

  async function loginUser(email, password) {
    try {
      await window.FirebaseInit.ready;
      var auth = getAuthOrThrow();
      var credential = await auth.signInWithEmailAndPassword(String(email || "").trim(), String(password || ""));

      var displayName = credential.user.displayName || "";
      var parts = String(displayName).trim().split(/\s+/).filter(Boolean);
      var firstName = parts.length ? sanitizeName(parts[0]) : "";
      var lastName = parts.length > 1 ? sanitizeName(parts.slice(1).join(" ")) : "";

      if (window.FirestoreService && window.FirestoreService.seedUserDoc) {
        await window.FirestoreService.seedUserDoc(credential.user.uid, {
          firstName: firstName,
          lastName: lastName,
          email: credential.user.email || String(email || "").trim()
        });
      }

      return {
        ok: true,
        user: {
          id: credential.user.uid,
          email: credential.user.email || "",
          displayName: displayName
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: normalizeError(error, "Unable to login.")
      };
    }
  }

  async function logout() {
    try {
      await window.FirebaseInit.ready;
      var auth = getAuthOrThrow();
      await auth.signOut();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: normalizeError(error, "Unable to logout.")
      };
    }
  }

  function onAuthStateChanged(callback) {
    if (!window.FirebaseInit) {
      return function () {};
    }

    var unsubscribe = function () {};

    window.FirebaseInit.ready.then(function () {
      if (!window.FirebaseInit.isFirebaseMode()) {
        callback(null);
        return;
      }

      var auth = window.FirebaseInit.getAuth();
      if (!auth) {
        callback(null);
        return;
      }

      unsubscribe = auth.onAuthStateChanged(function (user) {
        if (!user) {
          callback(null);
          return;
        }

        // Stamp lastLoginAt once per browser session so the lapsed-ladder reset can fire server-side.
        try {
          if (user.uid && !sessionStorage.getItem("sugbocents:lastLoginStamped")) {
            sessionStorage.setItem("sugbocents:lastLoginStamped", "1");
            if (window.FirestoreService && typeof window.FirestoreService.setUserDoc === "function") {
              window.FirestoreService.setUserDoc(user.uid, {
                lastLoginAt: new Date().toISOString()
              }).catch(function (err) {
                if (window.console && console.warn) {
                  console.warn("[Auth] failed to stamp lastLoginAt:", err);
                }
              });
            }
          }
        } catch (_) {}

        callback({
          id: user.uid,
          email: user.email || "",
          displayName: user.displayName || ""
        });
      });
    });

    return function () {
      unsubscribe();
    };
  }

  window.FirebaseAuthService = {
    registerUser: registerUser,
    loginUser: loginUser,
    logout: logout,
    onAuthStateChanged: onAuthStateChanged
  };
})();
