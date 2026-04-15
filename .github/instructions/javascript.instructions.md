---
description: "Use when editing JavaScript files. Covers JS coding patterns, IIFE structure, and StorageAPI rules for the SugboCents project."
applyTo: "**/*.js"
---
# JavaScript Conventions

- Every JS file is a **self-contained IIFE**: `(function () { ... })();`
- No ES modules, no `import`/`export`, no `require()`
- Expose public APIs on `window` (e.g., `window.StorageAPI`)
- **Never call `localStorage` directly** in UI files — always go through `window.StorageAPI`
- Use `var` declarations (project convention for broad browser compat)
- Format currency with `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`
- Use `async/await` for Firebase calls; wrap in try/catch
- Sanitize all user input before storage (see `sanitizeEmail`, `sanitizeName`, `sanitizeAmount` in `js/storage.js`)
