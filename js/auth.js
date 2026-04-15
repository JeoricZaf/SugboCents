(function () {
  function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function setFieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    var error = document.getElementById(fieldId + "Error");
    if (!field || !error) {
      return;
    }

    field.classList.toggle("is-invalid", Boolean(message));
    error.textContent = message || "";
  }

  function setFormError(formErrorId, message) {
    var formError = document.getElementById(formErrorId);
    if (formError) {
      formError.textContent = message || "";
    }
  }

  function handleLogin() {
    var form = document.getElementById("loginForm");
    if (!form || !window.StorageAPI) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var email = document.getElementById("loginEmail").value.trim();
      var password = document.getElementById("loginPassword").value;

      setFieldError("loginEmail", "");
      setFieldError("loginPassword", "");
      setFormError("loginFormError", "");

      var hasError = false;

      if (!email) {
        setFieldError("loginEmail", "Email is required.");
        hasError = true;
      } else if (!isEmailValid(email)) {
        setFieldError("loginEmail", "Please enter a valid email address.");
        hasError = true;
      }

      if (!password) {
        setFieldError("loginPassword", "Password is required.");
        hasError = true;
      }

      if (hasError) {
        return;
      }

      var loginButton = document.getElementById("loginSubmit");
      if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";
      }

      var result = await window.StorageAPI.loginUser(email, password);
      if (!result.ok) {
        setFormError("loginFormError", result.error || "Unable to login. Try again.");
        if (loginButton) {
          loginButton.disabled = false;
          loginButton.textContent = "Login";
        }
        return;
      }

      window.location.replace("dashboard.html");
    });
  }

  function handleRegister() {
    var form = document.getElementById("registerForm");
    if (!form || !window.StorageAPI) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var firstName = document.getElementById("registerFirstName").value.trim();
      var lastName = document.getElementById("registerLastName").value.trim();
      var email = document.getElementById("registerEmail").value.trim();
      var password = document.getElementById("registerPassword").value;
      var confirmPassword = document.getElementById("registerConfirmPassword").value;

      setFieldError("registerFirstName", "");
      setFieldError("registerLastName", "");
      setFieldError("registerEmail", "");
      setFieldError("registerPassword", "");
      setFieldError("registerConfirmPassword", "");
      setFormError("registerFormError", "");

      var hasError = false;

      if (!firstName) {
        setFieldError("registerFirstName", "First name is required.");
        hasError = true;
      }

      if (!lastName) {
        setFieldError("registerLastName", "Last name is required.");
        hasError = true;
      }

      if (!email) {
        setFieldError("registerEmail", "Email is required.");
        hasError = true;
      } else if (!isEmailValid(email)) {
        setFieldError("registerEmail", "Please enter a valid email address.");
        hasError = true;
      }

      if (!password) {
        setFieldError("registerPassword", "Password is required.");
        hasError = true;
      } else if (password.length < 8) {
        setFieldError("registerPassword", "Password must be at least 8 characters.");
        hasError = true;
      }

      if (!confirmPassword) {
        setFieldError("registerConfirmPassword", "Please confirm your password.");
        hasError = true;
      } else if (password !== confirmPassword) {
        setFieldError("registerConfirmPassword", "Passwords do not match.");
        hasError = true;
      }

      if (hasError) {
        return;
      }

      var registerButton = document.getElementById("registerSubmit");
      if (registerButton) {
        registerButton.disabled = true;
        registerButton.textContent = "Creating account...";
      }

      var result = await window.StorageAPI.registerUser({
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password
      });
      if (!result.ok) {
        setFormError("registerFormError", result.error || "Unable to create account.");
        if (registerButton) {
          registerButton.disabled = false;
          registerButton.textContent = "Create account";
        }
        return;
      }

      window.location.replace("dashboard.html");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    handleLogin();
    handleRegister();
  });
})();

