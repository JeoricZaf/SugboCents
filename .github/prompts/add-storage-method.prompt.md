---
description: "Add a new StorageAPI method to js/storage.js with proper sanitization and session checks."
agent: "agent"
argument-hint: "Describe the data operation (e.g., save weekly goal)"
---
Add a new method to the `window.StorageAPI` object in `js/storage.js`.

## Rules
1. Follow the existing IIFE pattern — define the function inside the closure, expose it on `window.StorageAPI`
2. Always check for an active session before mutating user data: `if (!store.session) return { ok: false, error: "No active session." }`
3. Use the existing helpers: `sanitizeEmail()`, `sanitizeName()`, `sanitizeAmount()`, `nowIso()`, `getUserById()`
4. Return `{ ok: true, ... }` on success, `{ ok: false, error: "..." }` on failure
5. Call `saveStore(store)` after mutations
6. Do NOT call `localStorage` directly — use `loadStore()` and `saveStore()`

Reference [js/storage.js](js/storage.js) for the full current implementation.
