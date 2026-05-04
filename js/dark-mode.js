(function () {
  'use strict';

  window.DarkModeToggle = {
    init: function () {
      this.darkModeToggle = document.getElementById('darkModeToggle');
      this.darkModeToggleMobile = document.getElementById('darkModeToggleMobile');
      
      // Load saved preference first
      this.loadPreference();

      // Attach event listeners
      if (this.darkModeToggle) {
        this.darkModeToggle.addEventListener('click', this.toggle.bind(this));
      }
      if (this.darkModeToggleMobile) {
        this.darkModeToggleMobile.addEventListener('click', this.toggle.bind(this));
      }

      // Listen for storage changes (multi-tab sync)
      window.addEventListener('storage', this.onStorageChange.bind(this));
    },

    toggle: function () {
      var isDarkMode = document.documentElement.classList.contains('dark-mode');
      if (isDarkMode) {
        this.disable();
      } else {
        this.enable();
      }
    },

    enable: function () {
      document.documentElement.classList.add('dark-mode');
      this.updateToggleIcon(true);
      this.savePreference(true);
      this.rerenderChart();
    },

    disable: function () {
      document.documentElement.classList.remove('dark-mode');
      this.updateToggleIcon(false);
      this.savePreference(false);
      this.rerenderChart();
    },

    rerenderChart: function () {
      // Re-render spending chart if it exists on the page
      if (window.SpendingChart && typeof window.SpendingChart.update === 'function') {
        window.SpendingChart.update();
      }
    },

    updateToggleIcon: function (isDarkMode) {
      // Update desktop button
      if (this.darkModeToggle) {
        if (isDarkMode) {
          this.darkModeToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        } else {
          this.darkModeToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        }
        // Also update visual state for CSS-based toggle (if present)
        try {
          this.darkModeToggle.classList.toggle('dark-on', !!isDarkMode);
          this.darkModeToggle.setAttribute('aria-pressed', !!isDarkMode ? 'true' : 'false');
        } catch (e) {}
      }

      // Update mobile button
      if (this.darkModeToggleMobile) {
        if (isDarkMode) {
          this.darkModeToggleMobile.innerHTML = '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span class="nav-text">Dark</span>';
        } else {
          this.darkModeToggleMobile.innerHTML = '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span class="nav-text">Dark</span>';
        }
        try {
          this.darkModeToggleMobile.setAttribute('aria-pressed', !!isDarkMode ? 'true' : 'false');
        } catch (e) {}
      }
    },

    loadPreference: function () {
      var isDarkMode = false;
      try {
        if (window.StorageAPI && typeof window.StorageAPI.getPreferences === 'function') {
          var prefs = window.StorageAPI.getPreferences() || {};
          isDarkMode = prefs.darkModeEnabled === true;
        } else {
          isDarkMode = localStorage.getItem('darkModeEnabled') === 'true';
        }
      } catch (e) {
        isDarkMode = localStorage.getItem('darkModeEnabled') === 'true';
      }

      if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        this.updateToggleIcon(true);
      } else {
        document.documentElement.classList.remove('dark-mode');
        this.updateToggleIcon(false);
      }
    },

    savePreference: function (isDarkMode) {
      try {
        if (window.StorageAPI && typeof window.StorageAPI.savePreferences === 'function') {
          window.StorageAPI.savePreferences({ darkModeEnabled: isDarkMode });
        } else {
          localStorage.setItem('darkModeEnabled', isDarkMode ? 'true' : 'false');
        }
      } catch (e) {
        localStorage.setItem('darkModeEnabled', isDarkMode ? 'true' : 'false');
      }

      // Notify other parts of the app about the change
      try {
        window.dispatchEvent(new CustomEvent('sugbocents:preferencesChanged', { detail: { key: 'darkModeEnabled', value: isDarkMode } }));
      } catch (e) {
        // ignore
      }
    },

    onStorageChange: function (e) {
      if (e.key === 'darkModeEnabled') {
        var isDarkMode = e.newValue === 'true';
        if (isDarkMode) {
          this.enable();
        } else {
          this.disable();
        }
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.DarkModeToggle.init();
    });
  } else {
    window.DarkModeToggle.init();
  }
})();
