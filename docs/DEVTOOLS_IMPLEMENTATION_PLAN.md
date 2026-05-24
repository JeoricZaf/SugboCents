# SugboCents Dev Tools — Production-Grade Implementation Plan

**Version:** 1.0  
**Date:** 2026-05-14  
**Status:** Handoff-ready for implementation  
**Scope:** All 15 audit-identified issues + global architecture improvements  
**Target AI:** Implementation agent following literal instructions  

---

## How to Read This Document

Every fix section is fully self-contained. Read sections in the order specified in
**Section 12 (Recommended Implementation Order)** to avoid breaking dependencies.
Each section includes exact file paths, exact function names, the broken behavior,
the target behavior, and granular step-by-step instructions. Do not skip steps or
infer missing details — follow each step as written.

---

## Table of Contents

- [Fix 1 — Frontend Route Guard (CRITICAL)](#fix-1--frontend-route-guard-critical)
- [Fix 2 — Brevo Secret Guard (CRITICAL)](#fix-2--brevo-secret-guard-critical)
- [Fix 3 — XP → Level Calculation in Backend (HIGH)](#fix-3--xp--level-calculation-in-backend-high)
- [Fix 4 — streakBrokenFlag in state-set-streak (HIGH)](#fix-4--streakbrokenflag-in-state-set-streak-high)
- [Fix 5 — state-clear-inbox Orphaned Counter (MEDIUM)](#fix-5--state-clear-inbox-orphaned-counter-medium)
- [Fix 6 — Failure Reasons Surface in parseResultSummary (MEDIUM)](#fix-6--failure-reasons-surface-in-parseresultsummary-medium)
- [Fix 7 — FCM Token Registration Failure Persistence (HIGH)](#fix-7--fcm-token-registration-failure-persistence-high)
- [Fix 8 — Dashboard UI Refresh After Dev State Changes (MEDIUM)](#fix-8--dashboard-ui-refresh-after-dev-state-changes-medium)
- [Fix 9 — Serialize edge-send-five + Diagnostic Output (MEDIUM)](#fix-9--serialize-edge-send-five--diagnostic-output-medium)
- [Fix 10 — Flow-D Polling Timeout + Diagnostics (MEDIUM)](#fix-10--flow-d-polling-timeout--diagnostics-medium)
- [Fix 11 — Quests Dev Tools Section (HIGH)](#fix-11--quests-dev-tools-section-high)
- [Fix 12 — Achievements Dev Tools Section (HIGH)](#fix-12--achievements-dev-tools-section-high)
- [Fix 13 — Sentimos / Streak-Freeze Dev Tools (MEDIUM)](#fix-13--sentimos--streak-freeze-dev-tools-medium)
- [Fix 14 — Master "Reset to Fresh Onboarding" Action (HIGH)](#fix-14--master-reset-to-fresh-onboarding-action-high)
- [Fix 15 — Streak / XP Input Upper-Bound Validation (MEDIUM)](#fix-15--streak--xp-input-upper-bound-validation-medium)
- [Section 11 — Global Architecture Recommendations](#section-11--global-architecture-recommendations)
- [Section 12 — Recommended Implementation Order](#section-12--recommended-implementation-order)
- [Section 13 — Demo Stability Strategy](#section-13--demo-stability-strategy)
- [Section 14 — Post-Implementation Verification Checklist](#section-14--post-implementation-verification-checklist)

---

## Fix 1 — Frontend Route Guard (CRITICAL)

### 1. Problem Summary

Any person who can guess the URL `dev-notifications.html` can open the full dev-tools
UI regardless of whether they are an authorized admin. While the backend callable
`assertAdmin()` blocks their server requests, the UI itself is fully visible and
clickable. This leaks the admin panel surface, creates user confusion (error toasts
appear for every button click), and is a security hygiene failure.

**User impact:** Non-admin users see internal tooling, receive confusing error toasts.  
**Production/demo impact:** A demos attendee or curious QA tester can stumble upon
the page and corrupt state by triggering callables that succeed against the backend
allowlist but return permission-denied errors visible in the UI.

### 2. Root Cause Analysis

`js/app.js` enforces `data-protected="true"` and `data-guest-only="true"` body
attributes, but has no handler for `data-dev-only="true"`. The relevant code block
(approximately line 400 in `app.js`) contains a comment:

```
if (needsAuth && document.body.dataset.devOnly === "true") {
  // Defense in depth: backend allowlist is authoritative.
  // dev-notifications.js performs devCheckAccess and redirects quickly
  // for non-allowlisted users.
}
```

This comment is aspirational, not functional. `dev-notifications.js` does run
`devCheckAccess` via a callable, but it only sets a `gateMessage()` string — it
does NOT redirect or hide the panel. The callable takes 500–1500 ms to resolve,
meaning the full panel is visible during that window even if the callable later
returns unauthorized.

### 3. Current Broken Flow

1. User (non-admin) navigates to `dev-notifications.html`.
2. `app.js` runs its route guard: checks `data-protected` → true, checks session →
   session exists (user is logged in) → no redirect.
3. The body attribute `data-dev-only="true"` is read but the handler is a no-op comment.
4. The full dev-tools panel HTML renders immediately.
5. `dev-notifications.js` fires `init()`, eventually calls `devCheckAccess` callable.
6. After 500–1500 ms network round-trip, `assertAdmin` throws `permission-denied`.
7. The catch block calls `gateMessage("Panel locked. Access denied.")` — writes to
   a small `<p id="devGateMessage">` element above the panel.
8. The panel remains fully visible and interactive.

### 4. Correct Target Behavior

**Before any async operation:**
- Immediately check the logged-in user's UID against the local admin list.
- If not admin: replace the `#devApp` inner content with an "Access Denied" message
  and return early. No buttons, inputs, or sections are accessible.
- If admin: render normally.

**After async devCheckAccess resolves:**
- If the backend also returns unauthorized (the UID was in local list but backend
  disagrees): show "Access denied" message and disable all actions.

**Edge cases:**
- User not logged in at all: `app.js` already redirects to `login.html` via
  `data-protected="true"`. No additional handling needed for this case.
- Local storage session cleared mid-session: normal session expiry flow handles it.
- Admin UID list mismatch: frontend list is a UI hint only; backend is authoritative.

### 5. Implementation Architecture

**Source of truth for UID:** `window.StorageAPI.getSession().userId`  
**Admin UID list:** Hardcoded constant array in `js/dev-notifications.js`  
**When check runs:** Synchronously at the top of `init()`, before any async work  
**Gating mechanism:** Replace `#devApp` innerHTML with access-denied markup  
**No new files required.** Edit `js/dev-notifications.js` only.

The backend `assertAdmin` remains the authoritative security gate. The frontend
gate is "defense in depth" UI protection only — it must never be treated as a
security boundary.

### 6. Step-by-Step Implementation Plan

**File to edit:** `js/dev-notifications.js`

**Step 1:** At the very top of the `init()` function (immediately after the IIFE
`ready(init)` is set up), add a synchronous admin check before any async work.
Locate the `init` function. It currently starts by bootstrapping Firebase. Add
the check before that.

The check should:
- Read `window.StorageAPI` → `getSession()` → `userId`.
- Compare against the constant array `DEV_ADMIN_UIDS` (defined in this file only,
  matching the value in `functions/dev-tools.js`).
- If not in the array: call a new helper `showAccessDenied()` and return immediately.

**Step 2:** Add the constant at the top of the IIFE (before `var state = {...}`):

```javascript
var DEV_ADMIN_UIDS_FE = ["7SSc9kHJTKOOlP9Zgo7bpvge9UC3"];
```

**Step 3:** Add the helper function `showAccessDenied()`:

```javascript
function showAccessDenied() {
  var app = byId("devApp");
  if (app) {
    app.innerHTML =
      '<div style="padding:3rem 1.5rem;text-align:center;max-width:480px;margin:0 auto">' +
        '<div style="font-size:2.5rem;margin-bottom:1rem">🔒</div>' +
        '<h2 style="font-weight:800;font-size:1.25rem;color:#164f33;margin-bottom:0.5rem">Access Denied</h2>' +
        '<p style="color:#617063;font-size:0.875rem">Dev Tools are restricted to authorized admins only.</p>' +
        '<a href="dashboard.html" style="display:inline-block;margin-top:1.5rem;padding:0.5rem 1.25rem;' +
          'background:#2b8259;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.875rem">' +
          'Go to Dashboard</a>' +
      '</div>';
  }
}
```

**Step 4:** Add the check at the start of `init()`:

```javascript
function init() {
  // ── Auth gate (synchronous, frontend defense-in-depth) ──────────────────
  var session = window.StorageAPI && window.StorageAPI.getSession
    ? window.StorageAPI.getSession()
    : null;
  var uid = session && session.userId ? String(session.userId) : "";
  if (!uid || DEV_ADMIN_UIDS_FE.indexOf(uid) === -1) {
    showAccessDenied();
    return;
  }
  state.uid = uid;
  // ... rest of existing init() continues unchanged ...
}
```

**Step 5:** Remove the dead comment block in `js/app.js` that references
`data-devOnly`. Locate:

```javascript
if (needsAuth && document.body.dataset.devOnly === "true") {
  // Defense in depth: backend allowlist is authoritative.
  // dev-notifications.js performs devCheckAccess and redirects quickly
  // for non-allowlisted users.
}
```

Replace the entire `if` block (including the comment body) with nothing — delete it
entirely. The gate is now handled in `dev-notifications.js` directly.

**Step 6:** In `dev-notifications.html`, ensure the `<body>` tag still has:
```html
data-protected="true" data-dev-only="true"
```
The `data-protected="true"` ensures `app.js` redirects unauthenticated visitors to
`login.html` before `dev-notifications.js` even runs.

### 7. Risks & Regression Concerns

- **Risk:** If `StorageAPI.getSession()` is called before `storage.js` finishes
  loading, `window.StorageAPI` will be undefined and the check will gate out even
  the admin. **Mitigation:** `storage.js` is loaded before `dev-notifications.js`
  in the HTML script order (`defer` scripts execute in DOM order). The check fires
  in DOMContentLoaded callback, by which time all `defer` scripts have run.
- **Risk:** If the admin rotates their UID (impossible with Firebase Auth, but
  possible if they switch test accounts), the frontend constant becomes stale.
  **Mitigation:** This is acceptable — the developer can update the constant.

### 8. Testing & Verification Plan

| Test | Steps | Expected |
|------|-------|----------|
| Non-admin sees denied | Log in as non-admin → visit dev-notifications.html | Access denied screen; no panel sections |
| Admin sees panel | Log in as admin UID → visit dev-notifications.html | Full panel renders |
| Unauthenticated redirect | Log out → visit dev-notifications.html | Redirected to login.html |
| No flicker | Admin login → visit page | Panel appears without flash of denied state |

### 9. Production Hardening Recommendations

- Log `console.warn("[DevTools] Access denied for uid:", uid)` in `showAccessDenied`
  to make unauthorized access attempts visible in browser dev tools.
- Consider adding the page to the Firebase Hosting `rewrites` as a protected path.

### 10. Completion Criteria

- [ ] Non-admin user sees "Access Denied" screen on `dev-notifications.html`.
- [ ] Admin user sees full panel.
- [ ] Unauthenticated user is redirected to `login.html`.
- [ ] No console errors on access-denied path.
- [ ] Dead comment block removed from `app.js`.

---

## Fix 2 — Brevo Secret Guard (CRITICAL)

### 1. Problem Summary

If `BREVO_API_KEY` is not configured in Firebase Secret Manager (e.g. after a fresh
Functions deploy, secret rotation, or a new project environment), calling
`BREVO_API_KEY.value()` in `sendEmail` will throw. The throw is caught by a generic
`try/catch` block which returns `{sent:0, reason:"brevo-error"}`. The dev panel
shows "Email sent=0" with no explanation. The developer has no way to distinguish
"Brevo rejected the email" from "the secret isn't configured at all."

**Production impact:** Email notifications are silently dead with no alerting.

### 2. Root Cause Analysis

In `functions/notifications.js`, the `sendEmail` function calls
`BREVO_API_KEY.value()` on line 213 inside a `try/catch` block. The value of a
`defineSecret` handle throws a runtime error if the secret is not accessible. This
error is swallowed by the same `catch` that catches actual Brevo API failures,
making the two cases indistinguishable to the caller.

Additionally, `BREVO_SENDER_EMAIL.value()` has the same problem two lines later.

### 3. Current Broken Flow

1. Dev tester clicks "Send test email to me".
2. `sendQuick("email")` → callable → `sendNotification` → `sendEmail`.
3. `sendEmail` passes the missing-email check.
4. The `devFlags` Brevo-simulation check passes.
5. `reserveEmailQuotaSlot()` passes (quota not exhausted).
6. Code reaches `BREVO_API_KEY.value()` → throws `Error: Secret not available`.
7. `catch (e)` logs to stderr, returns `{sent:0, reason:"brevo-error"}`.
8. Dev panel displays "Email sent=0" — same display as a real Brevo rejection.

### 4. Correct Target Behavior

Before attempting `BREVO_API_KEY.value()`, the function should explicitly validate
the resolved secret value:
- If blank/empty: return `{sent:0, reason:"brevo-not-configured"}` and log a
  `console.error` with a clear message including the environment.
- If valid: proceed to API call.
- If Brevo API throws: return `{sent:0, reason:"brevo-error", detail: e.message}`.

The dev panel's `parseResultSummary` (Fix 6) will then display the specific reason.

### 5. Implementation Architecture

**File to edit:** `functions/notifications.js`  
**Function to modify:** `sendEmail` (line 188)  
**No schema changes.** No new callables.

The validation reads the secret value, checks its length, and differentiates the
return reason so callers can act accordingly. The validation guard is placed
immediately before the `Brevo` import call to avoid unnecessary module loading.

### 6. Step-by-Step Implementation Plan

**File:** `functions/notifications.js`

**Step 1:** Locate `sendEmail` function (line ~188). After the `reserveEmailQuotaSlot`
check and before `const Brevo = require(...)`, add secret validation:

```javascript
  // Validate secrets before attempting to send
  let apiKey = "";
  let senderEmail = "";
  try {
    apiKey = BREVO_API_KEY.value();
    senderEmail = BREVO_SENDER_EMAIL.value();
  } catch (secretErr) {
    console.error("[sendEmail] Secret access failed — BREVO_API_KEY or BREVO_SENDER_EMAIL not configured.", secretErr && secretErr.message ? secretErr.message : secretErr);
    return { sent: 0, reason: "brevo-not-configured" };
  }
  if (!apiKey || apiKey.length < 10) {
    console.error("[sendEmail] BREVO_API_KEY is blank or too short. Configure it in Firebase Secret Manager.");
    return { sent: 0, reason: "brevo-not-configured" };
  }
  if (!senderEmail || !senderEmail.includes("@")) {
    console.error("[sendEmail] BREVO_SENDER_EMAIL is blank or invalid. Configure it in Firebase Secret Manager.");
    return { sent: 0, reason: "brevo-not-configured" };
  }
```

**Step 2:** Update the rest of `sendEmail` to use `apiKey` and `senderEmail`
local variables instead of calling `.value()` again:

Replace:
```javascript
  api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY.value());
```
With:
```javascript
  api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
```

Replace:
```javascript
  mail.sender = {
    name: "Tigom (SugboCents)",
    email: BREVO_SENDER_EMAIL.value()
  };
```
With:
```javascript
  mail.sender = {
    name: "Tigom (SugboCents)",
    email: senderEmail
  };
```

**Step 3:** In the existing `catch (e)` block at the end of `sendEmail`, improve
the return to include `detail`:

```javascript
  } catch (e) {
    console.error("[Notifications] Brevo send failed:", e && e.message ? e.message : e);
    return { sent: 0, reason: "brevo-error", detail: e && e.message ? String(e.message).slice(0, 200) : "unknown" };
  }
```

**Step 4:** Deploy the functions after making this change:
```
cd functions && npm install  (no new packages needed)
```
Then deploy via the project's normal deploy flow.

### 7. Risks & Regression Concerns

- The `.value()` call was previously inside the `try/catch`. By moving it before
  the `require("@getbrevo/brevo")` call, we must ensure that `Brevo` is still
  in scope inside the `try/catch` block further down. Since the require stays in
  place after the validation block, scope is unaffected.
- If secrets rotate between the validation read and the `.value()` call in the API
  setup: `.value()` is called twice. In practice, secrets are cached per function
  instance. This is safe.

### 8. Testing & Verification Plan

| Test | Steps | Expected |
|------|-------|----------|
| Secret configured | Deploy with valid secret → send test email | `sent=1` |
| Secret missing | Remove secret → deploy → send test email | `sent=0, reason:"brevo-not-configured"` logged to Cloud Functions stderr |
| Brevo API rejects | Valid secret but bad email format → send | `sent=0, reason:"brevo-error", detail:"..."` |
| Quota exhausted | Fill quota → send | `sent=0, reason:"daily-quota-guard"` |

### 9. Production Hardening Recommendations

- Add a Firebase Functions startup health-check that calls `.value()` on all secrets
  at cold-start and logs a warning if any are missing. This surfaces secret issues
  before users hit a broken flow.

### 10. Completion Criteria

- [ ] `sendEmail` returns `reason:"brevo-not-configured"` when secret is absent.
- [ ] `sendEmail` uses local `apiKey`/`senderEmail` variables, not repeated `.value()` calls.
- [ ] `detail` field included in `brevo-error` return.
- [ ] Cloud Functions logs show clear error message when secret is missing.

---

## Fix 3 — XP → Level Calculation in Backend (HIGH)

### 1. Problem Summary

`state-set-xp` writes only `{xp: N}` to Firestore. The `level` field is never
recomputed when XP changes via the dev tool. The dashboard XP chip shows the old
level. Level-up notifications, achievement unlocks keyed to level, and the resource
bar level name all remain stale. Gamification flows cannot be reliably tested.

### 2. Root Cause Analysis

The XP-to-level mapping exists in `js/storage.js` (`getLevelFromXp`, line 529) and
the `XP_LEVELS` table (line 193), but this logic is **client-side only**. The
backend callable `devSetUserState` (`functions/dev-tools.js`, line 625) calls
`sanitizeSetStatePatch` which accepts `xp` as a raw numeric field, then writes it
as-is with `merge:true`. There is no post-processing step that derives `level` from
`xp` — neither in `sanitizeSetStatePatch` nor in the callable itself.

The `allowed` keys object in `sanitizeSetStatePatch` (line 279) does not include
`level`, so even if the caller manually sends `level` it would throw
`"Unsupported patch key: level"`.

### 3. Current Broken Flow

1. Dev enters "500" in XP input, clicks "Set XP".
2. `setXpState()` in `dev-notifications.js` sends `{patch: {xp: 500}}`.
3. `devSetUserState` callable sanitizes: `{xp: 500}` is valid.
4. Firestore update: `users/{uid}` → `{xp: 500}` (merged).
5. `level` field in Firestore: **unchanged** (whatever it was before).
6. Dashboard reads `getXpInfo()` from StorageAPI → reads local user object → `xp:
   500, level: 1` (or whatever was cached).
7. XP chip shows `Lv. 1` even though 500 XP should be `Lv. 4 (Week Crusher)`.

### 4. Correct Target Behavior

When `xp` is included in the state patch:
- The backend should derive `level` and `levelName` using the same `XP_LEVELS` table
  used on the client.
- Both `xp` AND `level` are written to Firestore atomically.
- `nextLevelXp` and `levelName` are NOT stored — they are derived on read.
- The snapshot refresh in the dev panel will show the updated level.

**XP_LEVELS table (authoritative, must match `js/storage.js` line 193):**
```
Level 1: Rookie Saver      minXp: 0
Level 2: Budget Aware      minXp: 50
Level 3: Money Smart       minXp: 150
Level 4: Week Crusher      minXp: 350
Level 5: Streak Hunter     minXp: 700
Level 6: Finance Pro       minXp: 1200
Level 7: Budget Legend     minXp: 2000
```

### 5. Implementation Architecture

**File to edit:** `functions/dev-tools.js`  
**Function to modify:** `sanitizeSetStatePatch` (line 268) AND `devSetUserState` (line 625)  
**No schema changes.** The `level` field already exists on the user document.

Strategy: Add `level` to the `allowed` keys, but only allow it to be SET when `xp`
is also present in the patch. Better: post-process the patch in `devSetUserState`
after `sanitizeSetStatePatch` runs — if `xp` is in the applied patch, compute
`level` and add it to the Firestore write.

### 6. Step-by-Step Implementation Plan

**File:** `functions/dev-tools.js`

**Step 1:** Add the XP_LEVELS constant near the top of `dev-tools.js` (after the
`DEV_ADMIN_UIDS` constant, around line 20). This must be kept in sync with the
`storage.js` definition:

```javascript
const XP_LEVELS_BACKEND = [
  { level: 1, name: "Rookie Saver",   minXp: 0    },
  { level: 2, name: "Budget Aware",   minXp: 50   },
  { level: 3, name: "Money Smart",    minXp: 150  },
  { level: 4, name: "Week Crusher",   minXp: 350  },
  { level: 5, name: "Streak Hunter",  minXp: 700  },
  { level: 6, name: "Finance Pro",    minXp: 1200 },
  { level: 7, name: "Budget Legend",  minXp: 2000 }
];
```

**Step 2:** Add a helper function `getLevelFromXpBackend(xp)` after the constant:

```javascript
function getLevelFromXpBackend(xp) {
  var safe = Math.max(0, Math.floor(Number(xp) || 0));
  var result = XP_LEVELS_BACKEND[0];
  for (var i = 0; i < XP_LEVELS_BACKEND.length; i++) {
    if (safe >= XP_LEVELS_BACKEND[i].minXp) {
      result = XP_LEVELS_BACKEND[i];
    }
  }
  return result;
}
```

**Step 3:** Locate `sanitizeSetStatePatch` (line 268). Add `level` to the `allowed`
keys object:

```javascript
var allowed = {
  currentStreak: true,
  lastStreakLength: true,
  lastExpenseDate: true,
  lastLoginAt: true,
  weeklyBudget: true,
  xp: true,
  level: true,          // ← ADD THIS
  streakBrokenFlag: true
};
```

Add a `level` validation case inside the `keys.forEach` loop, after the
`weeklyBudget` case and before the final numeric fallthrough:

```javascript
if (k === "level") {
  // level is derived, never set directly — silently skip if present in raw patch
  // (devSetUserState post-processes this automatically when xp is provided)
  return;
}
```

**Step 4:** Locate `devSetUserState` callable (line 625). After
`const applied = sanitizeSetStatePatch(data.patch);`, add the level derivation:

```javascript
  const applied = sanitizeSetStatePatch(data.patch);

  // If xp was set, derive and include level atomically
  if ("xp" in applied) {
    var levelInfo = getLevelFromXpBackend(applied.xp);
    applied.level = levelInfo.level;
    // levelName is derived on read; do not persist it
  }

  await admin.firestore().collection("users").doc(uid).set(applied, { merge: true });
  await logDevAction(uid, "set-user-state", { applied: applied });
  return { patched: true, applied: applied };
```

**Step 5:** No frontend changes are required for this fix. The dashboard reads
`level` from the user object, which is now correctly written.

### 7. Risks & Regression Concerns

- If a future feature allows setting `level` independently of XP (e.g., to skip
  ahead for a demo), the current implementation silently ignores a standalone
  `level` key. That's correct behavior — level must always be derived from XP.
- XP_LEVELS_BACKEND must be kept in sync with `js/storage.js` XP_LEVELS. If the
  levels table changes in storage.js, this backend constant must also be updated.
  **Add a comment in both files:** `// SYNC: must match XP_LEVELS_BACKEND in functions/dev-tools.js`

### 8. Testing & Verification Plan

| Test | XP Input | Expected Level | Expected Level Name |
|------|----------|----------------|---------------------|
| Level 1 | 0 | 1 | Rookie Saver |
| Level 1 boundary | 49 | 1 | Rookie Saver |
| Level 2 | 50 | 2 | Budget Aware |
| Level 4 | 500 | 4 | Week Crusher |
| Level 7 | 2000 | 7 | Budget Legend |
| Level 7 overflow | 9999 | 7 | Budget Legend |

Verify via: dev tools → set XP → click Refresh → check `snapStreak` section. Then
navigate to dashboard → verify XP chip shows correct level name.

### 9. Production Hardening Recommendations

- Add a CI check that compares `XP_LEVELS` in `storage.js` against
  `XP_LEVELS_BACKEND` in `dev-tools.js` to detect desync.

### 10. Completion Criteria

- [ ] Setting XP to 500 in dev tools results in `level: 4` in Firestore.
- [ ] Dashboard XP chip shows "Lv. 4" after reload.
- [ ] Setting XP to 0 results in `level: 1`.
- [ ] Level is written atomically in the same Firestore merge as XP.

---

## Fix 4 — streakBrokenFlag in state-set-streak (HIGH)

### 1. Problem Summary

`state-set-streak` writes `currentStreak`, `lastStreakLength`, `lastExpenseDate`,
but never touches `streakBrokenFlag`. Setting streak to 0 should indicate a broken
streak (`streakBrokenFlag: true`); setting to any positive value should clear the
flag (`streakBrokenFlag: false`). The inconsistency causes the streak-broken
notification logic and any UI checks on this flag to produce wrong results during
testing.

### 2. Root Cause Analysis

In `js/dev-notifications.js`, the `setStreakState()` function builds the patch
object. The `sanitizeSetStatePatch` function in `functions/dev-tools.js` already
accepts `streakBrokenFlag` as an allowed key (it's in the `allowed` object at line
279), so this is purely a frontend omission — the patch simply never includes it.

### 3. Current Broken Flow

1. Dev enters `0` in streak input, clicks Apply.
2. `setStreakState()` sends `{currentStreak:0, lastStreakLength:0, lastExpenseDate: null}`.
3. Backend writes those three fields.
4. `streakBrokenFlag` stays at whatever value it had before (e.g., `false`).
5. Code that checks `if (user.streakBrokenFlag) sendBreakNotification()` never fires.
6. Streak-broken preset test is unreliable.

### 4. Correct Target Behavior

- Setting streak to 0: patch includes `streakBrokenFlag: true`.
- Setting streak to any positive value: patch includes `streakBrokenFlag: false`.
- Setting streak to 0: `lastExpenseDate` should be set to `null` (no active streak).
- Setting streak to N > 0: `lastExpenseDate` remains as yesterday (streak is active).

### 5. Implementation Architecture

**File to edit:** `js/dev-notifications.js`  
**Function to modify:** `setStreakState()`  
**No backend changes required.** The `sanitizeSetStatePatch` already allows
`streakBrokenFlag`.

### 6. Step-by-Step Implementation Plan

**File:** `js/dev-notifications.js`

**Step 1:** Locate `setStreakState()`. The current implementation builds a patch
object. Find the line that sets `lastExpenseDate`. Add `streakBrokenFlag` to the
same patch object:

Find:
```javascript
    var patch = {
      currentStreak: streak,
      lastStreakLength: streak,
      lastExpenseDate: streak > 0 ? todayLocalKeyOffset(-1) : null
    };
```

Replace with:
```javascript
    var patch = {
      currentStreak: streak,
      lastStreakLength: streak,
      lastExpenseDate: streak > 0 ? todayLocalKeyOffset(-1) : null,
      streakBrokenFlag: streak === 0
    };
```

That is the entire change required.

### 7. Risks & Regression Concerns

- None. `streakBrokenFlag` is an existing field; writing `false` when streak > 0
  correctly clears any previously set break flag. Writing `true` when streak = 0
  correctly sets it.

### 8. Testing & Verification Plan

| Test | Streak Input | Expected `streakBrokenFlag` |
|------|-------------|------------------------------|
| Break streak | 0 | true |
| Set active streak | 7 | false |
| High streak | 30 | false |

Verify: dev tools → set streak → Refresh → check snapshot for `streakBrokenFlag`.
Then trigger `streak-broken` preset — it should now fire correctly.

### 10. Completion Criteria

- [ ] Setting streak to 0 → `streakBrokenFlag: true` in Firestore.
- [ ] Setting streak to N > 0 → `streakBrokenFlag: false` in Firestore.
- [ ] Streak-broken cron simulator fires correctly after streak is set to 0.

---

## Fix 5 — state-clear-inbox Orphaned Counter (MEDIUM)

### 1. Problem Summary

`devClearInbox` deletes all documents in `users/{uid}/notifications` but does not
reset the `inboxUnreadCount` field on the parent user document. The bell badge in
the inbox drawer reads from this counter and continues to show the old unread count
until the page is reloaded (at which point the `onSnapshot` listener on the
notifications subcollection fires and correctly reports 0 unread).

Additionally, `notificationEvents` documents that track notification delivery
lifecycle are not cleaned up, leaving orphaned tracking records.

### 2. Root Cause Analysis

In `functions/dev-tools.js`, `devClearInbox` (line 580) iterates through the
notifications subcollection and batch-deletes documents. It does not update
`users/{uid}.inboxUnreadCount`. The inbox `onSnapshot` listener
(`users/{uid}/notifications` where `readAt == null`) fires correctly when docs are
deleted, but the bell badge may cache the counter from the user document field
rather than counting listener results — this depends on the `NotificationsAPI`
implementation.

### 3. Current Broken Flow

1. Dev clicks "Clear inbox" → confirm dialog → callable fires.
2. All notification docs deleted (batch operation).
3. `onSnapshot` fires → `setBellCount(0)` eventually called.
4. BUT `users/{uid}.inboxUnreadCount` field still shows old count.
5. If the bell badge reads `inboxUnreadCount` from the user document on next
   navigation, it shows the wrong value.
6. Snapshot refresh shows `snapUnread: 5` (stale).

### 4. Correct Target Behavior

After all notification docs are deleted:
1. The `users/{uid}` document is updated: `inboxUnreadCount: 0`.
2. The update uses `serverTimestamp()` for auditability.
3. The snapshot panel reflects `Inbox unread: 0` after refresh.

**Orphaned events:** Clean up `notificationEvents` docs for this uid that have no
matching notification doc (status != "delivered"). This is optional but recommended.

### 5. Implementation Architecture

**File to edit:** `functions/dev-tools.js`  
**Function to modify:** `devClearInbox` (line 580)  
**Firestore writes:** Add one `update` call to `users/{uid}` after batch deletes.

### 6. Step-by-Step Implementation Plan

**File:** `functions/dev-tools.js`

**Step 1:** Locate `devClearInbox` (exports, line 580). Find the line after the
last `await batch.commit()` inside the loop, before `logDevAction`. Add:

```javascript
  // Reset unread counter on user doc
  await admin.firestore().collection("users").doc(uid).update({
    inboxUnreadCount: 0,
    inboxUnreadUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
```

**Step 2:** (Optional, for cleanliness) After resetting the counter, clean up stale
`notificationEvents` documents for this user. This prevents the `notificationEvents`
collection from growing indefinitely during dev testing:

```javascript
  // Clean up undelivered notification events for this user
  try {
    var staleEventsSnap = await admin.firestore()
      .collection("notificationEvents")
      .where("uid", "==", uid)
      .where("status", "in", ["pending", "undelivered"])
      .limit(200)
      .get();
    if (!staleEventsSnap.empty) {
      var eventBatch = admin.firestore().batch();
      staleEventsSnap.docs.forEach(function (d) { eventBatch.delete(d.ref); });
      await eventBatch.commit();
    }
  } catch (_) {
    // Non-critical cleanup; ignore failure
  }
```

**Step 3:** Update the return value to include the reset info:

```javascript
  return { deleted: deleted, unreadReset: true };
```

### 7. Risks & Regression Concerns

- `update` will fail if the user document does not exist. Use `set({merge:true})`
  instead of `update` to be safe:
  ```javascript
  await admin.firestore().collection("users").doc(uid).set(
    { inboxUnreadCount: 0, inboxUnreadUpdatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  ```

### 10. Completion Criteria

- [ ] After "Clear inbox" action, snapshot shows `Inbox unread: 0` immediately after refresh.
- [ ] Bell badge shows 0 without requiring page reload.
- [ ] `users/{uid}.inboxUnreadCount` is 0 in Firestore.

---

## Fix 6 — Failure Reasons Surface in parseResultSummary (MEDIUM)

### 1. Problem Summary

`parseResultSummary()` in `js/dev-notifications.js` discards the `reason` field
from push/email sub-objects. When a notification fails to send (no FCM tokens,
quota exhausted, Brevo not configured, simulated failure), the dev panel shows
only `Push sent=0 | Email sent=0` with no indication of why. This makes debugging
opaque — the tester cannot distinguish a cap block from a missing token from a
misconfigured secret.

### 2. Root Cause Analysis

Current code (line 82):
```javascript
function parseResultSummary(result) {
  ...
  if (pushSent > 0 || emailSent > 0) {
    return "Push sent=" + pushSent + " | Email sent=" + emailSent;
  }
  if (result.reason) { return "Reason: " + String(result.reason); }
  return "Done";
}
```

The `result.push` and `result.email` sub-objects from `sendNotification` each
contain a `reason` field (`"no-tokens"`, `"daily-cap"`, `"daily-quota-guard"`,
`"brevo-not-configured"`, `"brevo-error"`, `"brevo-error-simulated"`,
`"missing-email"`). These are never read.

### 3. Correct Target Behavior

All status messages should include the reason for each channel:
- `Push sent=1 | Email sent=1`
- `Push sent=0 (no-tokens) | Email sent=0 (daily-quota-guard)`
- `Push sent=0 (daily-cap) | Email sent=0 (brevo-not-configured)`

### 4. Step-by-Step Implementation Plan

**File:** `js/dev-notifications.js`

**Step 1:** Locate `parseResultSummary` (line 82). Replace the entire function body:

```javascript
  function parseResultSummary(result) {
    if (!result) { return "No result"; }
    if (result.error) { return "Error: " + String(result.error); }
    if (result.skipped) { return "Skipped: " + String(result.skipped); }

    var pushSent   = Number(result.push  && result.push.sent  || 0);
    var emailSent  = Number(result.email && result.email.sent || 0);
    var pushReason = result.push  && result.push.reason  ? " (" + String(result.push.reason)  + ")" : "";
    var emailReason= result.email && result.email.reason ? " (" + String(result.email.reason) + ")" : "";
    var detail     = result.push  && result.push.detail  ? " [" + String(result.push.detail).slice(0, 80)  + "]"
                   : result.email && result.email.detail ? " [" + String(result.email.detail).slice(0, 80) + "]"
                   : "";

    if (result.push !== undefined || result.email !== undefined) {
      return "Push sent=" + pushSent + pushReason + " | Email sent=" + emailSent + emailReason + detail;
    }
    if (result.reason) { return "Reason: " + String(result.reason); }
    if (result.patched !== undefined) { return result.patched ? "Patched." : "Not patched."; }
    return "Done";
  }
```

**Step 2:** No backend changes required for this fix. The `reason` and `detail`
fields are already returned by `sendNotification` → `sendEmail` / `sendPush`.

### 10. Completion Criteria

- [ ] "Send test push" with no FCM tokens shows "Push sent=0 (no-tokens)".
- [ ] "Send test email" with Brevo not configured shows "Email sent=0 (brevo-not-configured)".
- [ ] "Send test push" with cap exhausted shows "Push sent=0 (daily-cap)".
- [ ] Successful send still shows "Push sent=1 | Email sent=1" without reason suffix.

---

## Fix 7 — FCM Token Registration Failure Persistence (HIGH)

### 1. Problem Summary

When FCM token registration fails (service worker not registered, browser
permission denied, push not supported), the failure is silent. The snapshot panel
shows `FCM tokens: 0` but gives no diagnostic for why. Testers waste time
investigating whether it's the push subscription, the browser, or the service
worker.

### 2. Root Cause Analysis

In `js/notifications.js`, `requestPermissionAndRegister()` catches all errors and
returns early, but does not write a diagnostic flag to local state or Firestore.
The `snapFcmCount` field in the dev panel snapshot comes from
`fcmTokens` subcollection — it correctly shows `0`, but there is no field like
`pushSetupFailure` to explain the cause.

### 3. Correct Target Behavior

After a failed registration attempt, write `pushSetupFailure: "reason-string"` to
`users/{uid}.notificationPrefs.pushSetupFailure` in Firestore (or localStorage
first, Firestore async). The dev panel snapshot should expose this field so a
developer immediately knows "the device never registered: permission-denied".

### 4. Step-by-Step Implementation Plan

**Files to edit:** `js/notifications.js`, `functions/dev-tools.js` (snapshot)

**Step 1:** In `js/notifications.js`, locate `requestPermissionAndRegister()`. In
the main failure branches, write a failure reason. The existing code structure
likely looks like:
```javascript
  try {
    // ... request permission, get token, store token
  } catch (err) {
    console.warn("[Notifications] Registration failed:", err);
  }
```

Add after the `console.warn`:
```javascript
    try {
      var failureReason = err && err.code ? String(err.code) : (err && err.message ? String(err.message).slice(0, 100) : "unknown");
      if (window.StorageAPI && window.StorageAPI.updateNotificationPrefs) {
        window.StorageAPI.updateNotificationPrefs({ pushEnabled: false, pushSetupFailure: failureReason });
      }
    } catch (_) {}
```

**Step 2:** In the `devGetSnapshot` callable in `functions/dev-tools.js` (line ~670),
after reading `prefs`, add the pushSetupFailure field to the snapshot return:

```javascript
  pushSetupFailure: String(prefs.pushSetupFailure || ""),
```

**Step 3:** In `js/dev-notifications.js`, in the `renderSnapshot(snapshot)` function,
add a row for this field. Find where other prefs are rendered (near `snapPushEnabled`):

```javascript
  setText("snapPushSetupFailure", snapshot.pushSetupFailure ? ("Failed: " + snapshot.pushSetupFailure) : "OK");
```

**Step 4:** In `dev-notifications.html`, add the row to the snapshot grid:
```html
<div class="dev-kv"><span>Push setup status</span><strong id="snapPushSetupFailure">-</strong></div>
```

### 10. Completion Criteria

- [ ] When push registration fails, `snapPushSetupFailure` shows the failure reason.
- [ ] When push registration succeeds, `snapPushSetupFailure` shows "OK".
- [ ] Refreshing snapshot shows current value without page reload.

---

## Fix 8 — Dashboard UI Refresh After Dev State Changes (MEDIUM)

### 1. Problem Summary

After any dev tool state-set action (streak, XP, budget), the Firestore document
is updated but the dashboard resource bar still shows the old values. This is
because the resource bar reads from `window.StorageAPI` (localStorage-backed
cache), not from Firestore. The dev callable writes Firestore; it does not update
localStorage.

### 2. Root Cause Analysis

`app.js` `renderResourceBar()` reads:
- `window.StorageAPI.getCurrentStreak()` → from localStorage
- `window.StorageAPI.getXpInfo()` → from localStorage user object
- `window.StorageAPI.getSentimosBalance()` → from localStorage

These are not subscribed to Firestore changes. When `devSetUserState` writes to
Firestore, there is no mechanism to propagate the change back to localStorage or
trigger a re-render. The dashboard would only update after a full page reload (which
pulls fresh data from Firestore into localStorage).

### 3. Correct Target Behavior

After any dev state-set action completes successfully:
1. If the dev panel is open in the same browser as the dashboard (same tab, or
   same browser session): the dashboard resource bar should re-render with new values
   within ~2 seconds.
2. The mechanism: dispatch a `CustomEvent` named `sugbocents:devStateChanged` on
   `window` with the applied patch as `detail`.
3. Any page that has `renderResourceBar` (or other state-dependent UI) can listen
   for this event and re-sync from Firestore.

Note: The dev panel and the dashboard are on separate HTML pages. A `CustomEvent`
dispatched from the dev panel will NOT automatically propagate to a dashboard tab.
The realistic scenario is: after dev state change, the tester switches to the
dashboard tab and reloads. The improvement here is primarily for the dev panel
itself (the snapshot auto-refreshes) and for single-page scenarios.

For multi-tab sync (dev panel open, dashboard open simultaneously), the proper
approach is to have the dashboard subscribe to a Firestore `onSnapshot` on the
user doc and update StorageAPI cache on change. That is a larger refactor scoped
to a future sprint (see Section 11). This fix focuses on the achievable partial
improvement.

### 4. Step-by-Step Implementation Plan

**Files to edit:** `js/dev-notifications.js`

**Step 1:** In `runSimpleStateAction()`, after the successful `setStatus` call,
dispatch the event:

```javascript
  async function runSimpleStateAction(statusId, fn, doneLabel) {
    setStatus(statusId, "Working...", "pending");
    try {
      var res = await fn();
      var data = res && res.data ? res.data : res;
      setStatus(statusId, doneLabel + " " + parseResultSummary(data), "ok");
      // Notify other components that dev state changed
      try {
        window.dispatchEvent(new CustomEvent("sugbocents:devStateChanged", {
          detail: { applied: data && data.applied ? data.applied : {} }
        }));
      } catch (_) {}
      await refreshSnapshot();
    } catch (err) {
      setStatus(statusId, "Failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }
```

**Step 2:** In `setStreakState()`, `setXpState()`, `setLastLoginState()`, and
`setBudgetState()` functions, after the `setStatus("ok")` call, also dispatch the
event. Find each function and add the dispatch pattern:

```javascript
      window.dispatchEvent(new CustomEvent("sugbocents:devStateChanged", {
        detail: { applied: res && res.data && res.data.applied ? res.data.applied : {} }
      }));
```

**Step 3:** In `js/app.js`, add a listener for this event that triggers
`renderResourceBar()` if the current page has a resource bar:

Find the `ready(init)` call or the main initialization block. Add:

```javascript
  window.addEventListener("sugbocents:devStateChanged", function () {
    if (document.getElementById("resourceBar") && window.StorageAPI) {
      // Re-sync user from Firestore then re-render resource bar
      // For immediate effect, try to read fresh data from FirestoreService
      if (window.FirestoreService && window.FirestoreService.getCurrentUser) {
        window.FirestoreService.getCurrentUser()
          .then(function (user) {
            if (user && window.StorageAPI.setCurrentUser) {
              window.StorageAPI.setCurrentUser(user);
            }
            renderResourceBar();
          })
          .catch(function () {
            renderResourceBar(); // render with stale data if fetch fails
          });
      } else {
        renderResourceBar();
      }
    }
  });
```

Note: `FirestoreService.getCurrentUser` may or may not exist. Check
`js/firestore-service.js` before implementing Step 3 — use whatever method
the service exposes to read the current user document. If no such method exists,
skip Step 3 and document it as a future enhancement.

### 10. Completion Criteria

- [ ] After "Set streak = 10" dev action, `renderResourceBar` is triggered.
- [ ] After "Set XP = 500" dev action, XP chip shows updated level after Firestore
  re-sync.
- [ ] No console errors from the event listener.

---

## Fix 9 — Serialize edge-send-five + Diagnostic Output (MEDIUM)

### 1. Problem Summary

The `edge-send-five` action sends 5 pushes using `await` in a sequential `for`
loop, which is correct for serialization. The real issue is the output: the result
shows `delivered=5, blocked=0` without revealing what the daily push cap is set to,
making it impossible to determine whether the test actually validated cap enforcement.
Additionally, if 5 succeed and the cap should have blocked at 1, the tester would
never know.

### 2. Root Cause Analysis

The result display string in `sendFivePushesRapidly()` is:
```
"Rapid send done. delivered=" + sent + ", blocked/failed=" + blocked
```
This doesn't include the cap limit, the current count, or the per-send reason. A
tester can't verify "cap enforcement works" without this information.

### 3. Step-by-Step Implementation Plan

**File:** `js/dev-notifications.js`

**Step 1:** Locate `sendFivePushesRapidly()`. Modify the inner loop to collect
per-send reasons:

```javascript
  async function sendFivePushesRapidly() {
    setStatus("devEdgeStatus", "Sending 5 pushes (serialized)...", "pending");
    var sent = 0;
    var blocked = 0;
    var reasons = [];

    for (var i = 0; i < 5; i++) {
      try {
        var res = await state.callables.sendTest({
          type: "dev-rapid-push",
          channel: "push",
          title: "Rapid push #" + (i + 1),
          body: "Burst test " + (i + 1),
          deepLink: "/dashboard.html",
          bypassDailyCap: false  // Explicitly false to test cap enforcement
        });
        var data = res && res.data ? res.data : {};
        var pushSent   = Number(data.push && data.push.sent   || 0);
        var pushReason = data.push && data.push.reason ? data.push.reason : (pushSent > 0 ? "ok" : "unknown");
        if (pushSent > 0) {
          sent += 1;
          reasons.push("#" + (i + 1) + ":ok");
        } else {
          blocked += 1;
          reasons.push("#" + (i + 1) + ":" + pushReason);
        }
      } catch (e) {
        blocked += 1;
        reasons.push("#" + (i + 1) + ":error");
      }
    }

    var summary = "Rapid send done. delivered=" + sent + ", blocked=" + blocked + " | " + reasons.join(", ");
    setStatus("devEdgeStatus", summary, blocked > 0 ? "ok" : "ok");
    await refreshSnapshot();
  }
```

### 10. Completion Criteria

- [ ] "Send 5 pushes rapidly" output includes per-send reason for each of the 5 sends.
- [ ] Cap-blocked sends show `#2:daily-cap` etc.
- [ ] Successful sends show `#1:ok`.

---

## Fix 10 — Flow-D Polling Timeout + Diagnostics (MEDIUM)

### 1. Problem Summary

`runFlowD()` polls the inbox for a `"weekly-digest"` type notification, but only
waits 8 seconds (8 iterations × 1 second). If the Cloud Function takes longer than
8 seconds due to cold start or Brevo latency, the flow reports `ok:false, found:false`
even though the notification will eventually appear. The failure message provides
no diagnostic info about what IS in the inbox.

### 2. Step-by-Step Implementation Plan

**File:** `js/dev-notifications.js`

**Step 1:** Locate the poll step inside `runFlowD()`. Replace:

```javascript
      {
        label: "Poll inbox for weekly-digest doc",
        run: async function () {
          if (!window.NotificationsAPI || !window.NotificationsAPI.getRecentInbox) {
            return { skipped: "NotificationsAPI unavailable" };
          }
          for (var i = 0; i < 8; i++) {
            var items = await window.NotificationsAPI.getRecentInbox(20);
            var found = (items || []).some(function (it) { return String(it.type || "") === "weekly-digest"; });
            if (found) {
              return { ok: true, found: true };
            }
            await sleep(1000);
          }
          return { ok: false, found: false };
        }
      }
```

With:

```javascript
      {
        label: "Poll inbox for weekly-digest doc (up to 20s)",
        run: async function () {
          if (!window.NotificationsAPI || !window.NotificationsAPI.getRecentInbox) {
            return { skipped: "NotificationsAPI unavailable" };
          }
          var lastItems = [];
          for (var i = 0; i < 20; i++) {
            lastItems = await window.NotificationsAPI.getRecentInbox(20);
            var found = (lastItems || []).some(function (it) {
              return String(it.type || "") === "weekly-digest";
            });
            if (found) {
              return { ok: true, found: true, attempts: i + 1 };
            }
            await sleep(1000);
          }
          // Return diagnostic info about what IS in the inbox
          var types = (lastItems || []).slice(0, 5).map(function (it) { return String(it.type || "?"); });
          return { ok: false, found: false, inboxSize: (lastItems || []).length, recentTypes: types.join(",") };
        }
      }
```

### 10. Completion Criteria

- [ ] Flow-D waits up to 20 seconds for the weekly-digest notification.
- [ ] On timeout, the result includes `inboxSize` and `recentTypes` diagnostic fields.
- [ ] On success, result includes the `attempts` count.

---

## Fix 11 — Quests Dev Tools Section (HIGH)

### 1. Problem Summary

The quests system (`js/quests.js`) has zero coverage in the dev panel. There is no
way to activate a specific quest, advance progress, trigger completion, claim the
reward, or reset the weekly quest pool from the dev panel. All of these require
manual browser console commands.

### 2. Root Cause Analysis

`js/storage.js` exposes `resetQuestState()`, `resetQuestSlot()`, `setCurrentQuest()`
for dev use, but these are localStorage-only operations. There are no Cloud Function
callables for quest manipulation and no dev panel UI for them.

### 3. Implementation Architecture

**New callable:** `devSetQuestState` in `functions/dev-tools.js`  
**New UI section:** in `dev-notifications.html`  
**New handler code:** in `js/dev-notifications.js`  
**Firestore path:** `users/{uid}.activeQuest`, `users/{uid}.questsCompleted`  
**No Firestore schema changes** (fields already exist from quests system)

### 4. Step-by-Step Implementation Plan

#### A. Backend callable — `functions/dev-tools.js`

**Step 1:** Add `devSetQuestState` callable after `devSetUserState`. This callable
accepts:
- `action: "activate"` — sets `activeQuest.id` and `activeQuest.progress = 0`
- `action: "progress"` — sets `activeQuest.progress = N`
- `action: "complete"` — sets `activeQuest.progress = activeQuest.target`, marks
  `activeQuest.completedAt = now`
- `action: "reset"` — clears `activeQuest` to null, resets `questPoolWeekKey`
- `action: "add-completed"` — increments `questsCompleted` by 1

```javascript
exports.devSetQuestState = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const action = String(data.action || "");
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  if (action === "activate") {
    var questId = String(data.questId || "q-log-3-days");
    var target  = Math.max(1, Math.floor(Number(data.target) || 3));
    await userRef.set({
      activeQuest: {
        id: questId,
        progress: 0,
        target: target,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: null,
        rewardXp: Math.floor(Number(data.rewardXp) || 30),
        rewardSentimos: Math.floor(Number(data.rewardSentimos) || 10)
      }
    }, { merge: true });
    await logDevAction(uid, "dev-quest-activate", { questId: questId, target: target });
    return { ok: true, action: action, questId: questId };
  }

  if (action === "progress") {
    var progressN = Math.max(0, Math.floor(Number(data.progress) || 1));
    await userRef.set({ activeQuest: { progress: progressN } }, { merge: true });
    await logDevAction(uid, "dev-quest-progress", { progress: progressN });
    return { ok: true, action: action, progress: progressN };
  }

  if (action === "complete") {
    var userSnap = await userRef.get();
    var user = userSnap.exists ? (userSnap.data() || {}) : {};
    var active = user.activeQuest || {};
    await userRef.set({
      activeQuest: Object.assign({}, active, {
        progress: active.target || 3,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }, { merge: true });
    await logDevAction(uid, "dev-quest-complete", {});
    return { ok: true, action: action };
  }

  if (action === "reset") {
    await userRef.set({
      activeQuest: null,
      questPoolWeekKey: admin.firestore.FieldValue.delete()
    }, { merge: true });
    await logDevAction(uid, "dev-quest-reset", {});
    return { ok: true, action: action };
  }

  if (action === "add-completed") {
    await userRef.set({
      questsCompleted: admin.firestore.FieldValue.increment(1)
    }, { merge: true });
    await logDevAction(uid, "dev-quest-add-completed", {});
    return { ok: true, action: action };
  }

  throw new HttpsError("invalid-argument", "Unknown action: " + action);
});
```

#### B. Frontend callable registration — `js/dev-notifications.js`

**Step 2:** In the `callables` object initialization block (where all other
callables are registered via `functions.httpsCallable(...)`), add:

```javascript
setQuestState: functions.httpsCallable("devSetQuestState"),
```

#### C. Frontend handler — `js/dev-notifications.js`

**Step 3:** In the click delegator, add handlers for the new quest actions:

```javascript
        if (action === "quest-activate") {
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({ action: "activate", questId: "q-log-3-days", target: 3, rewardXp: 30, rewardSentimos: 10 });
          }, "Quest activated.");
          return;
        }
        if (action === "quest-progress") {
          var p = Math.max(1, Math.floor(Number((byId("devQuestProgressInput") || {}).value) || 1));
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({ action: "progress", progress: p });
          }, "Quest progress set to " + p + ".");
          return;
        }
        if (action === "quest-complete") {
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({ action: "complete" });
          }, "Quest marked complete.");
          return;
        }
        if (action === "quest-reset") {
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({ action: "reset" });
          }, "Quest state reset.");
          return;
        }
```

#### D. HTML section — `dev-notifications.html`

**Step 4:** Add a new `<section>` block after the `devStateSection` and before
`devEdgeSection`:

```html
<section class="dev-section" id="devQuestSection">
  <h2 class="dev-section-title">Quests</h2>
  <div class="dev-grid dev-grid-3">
    <button class="dev-button" data-action="quest-activate" type="button">Activate Daily Quest</button>
    <button class="dev-button" data-action="quest-complete" type="button">Mark Quest Complete</button>
    <button class="dev-button secondary" data-action="quest-reset" type="button">Reset Quest State</button>
  </div>
  <div class="dev-row mt-2">
    <input id="devQuestProgressInput" class="dev-input" type="number" min="0" placeholder="Set progress (N)" />
    <button class="dev-button" data-action="quest-progress" type="button">Set Progress</button>
  </div>
  <p id="devQuestStatus" class="dev-status"></p>
</section>
```

### 10. Completion Criteria

- [ ] "Activate Daily Quest" creates `activeQuest` object in Firestore.
- [ ] "Set Progress" updates `activeQuest.progress` without touching other quest fields.
- [ ] "Mark Quest Complete" sets `progress == target` and `completedAt`.
- [ ] "Reset Quest State" clears `activeQuest` to null.
- [ ] Quests page reflects the changes after reload.

---

## Fix 12 — Achievements Dev Tools Section (HIGH)

### 1. Problem Summary

The achievements/badge system has zero dev panel coverage. There is no way to
unlock a badge, set badge progress toward a target, or trigger the claim flow
(which grants XP + sentimos) from the dev panel.

### 2. Step-by-Step Implementation Plan

#### A. Backend callable — `functions/dev-tools.js`

**Step 1:** Add `devSetAchievementState` callable:

```javascript
exports.devSetAchievementState = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const action = String(data.action || "");
  const badgeId = String(data.badgeId || "").trim();
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  if (!badgeId) {
    throw new HttpsError("invalid-argument", "badgeId is required.");
  }

  if (action === "unlock") {
    // Write to users/{uid}/achievements/{badgeId}
    await db.collection("users").doc(uid)
      .collection("achievements").doc(badgeId)
      .set({
        badgeId: badgeId,
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        claimed: false,
        progress: data.progress !== undefined ? Math.max(0, Number(data.progress) || 0) : null
      }, { merge: true });
    await logDevAction(uid, "dev-badge-unlock", { badgeId: badgeId });
    return { ok: true, action: action, badgeId: badgeId };
  }

  if (action === "set-progress") {
    var progressN = Math.max(0, Number(data.progress) || 0);
    await db.collection("users").doc(uid)
      .collection("achievements").doc(badgeId)
      .set({ progress: progressN }, { merge: true });
    await logDevAction(uid, "dev-badge-progress", { badgeId: badgeId, progress: progressN });
    return { ok: true, action: action, badgeId: badgeId, progress: progressN };
  }

  if (action === "claim") {
    // Mark claimed; does NOT grant XP/sentimos directly (those go through quests.js/achievements.js logic)
    await db.collection("users").doc(uid)
      .collection("achievements").doc(badgeId)
      .set({ claimed: true, claimedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await logDevAction(uid, "dev-badge-claim", { badgeId: badgeId });
    return { ok: true, action: action, badgeId: badgeId };
  }

  if (action === "reset") {
    await db.collection("users").doc(uid)
      .collection("achievements").doc(badgeId)
      .delete();
    await logDevAction(uid, "dev-badge-reset", { badgeId: badgeId });
    return { ok: true, action: action, badgeId: badgeId };
  }

  throw new HttpsError("invalid-argument", "Unknown action: " + action);
});
```

#### B. Frontend callable registration

**Step 2:** In `js/dev-notifications.js` callables block:

```javascript
setAchievementState: functions.httpsCallable("devSetAchievementState"),
```

#### C. Frontend handler

**Step 3:** In the click delegator, add:

```javascript
        if (action === "badge-unlock") {
          var badgeId = String((byId("devBadgeIdInput") || {}).value || "").trim();
          if (!badgeId) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "unlock", badgeId: badgeId });
          }, "Badge unlocked: " + badgeId);
          return;
        }
        if (action === "badge-set-progress") {
          var badgeId2 = String((byId("devBadgeIdInput") || {}).value || "").trim();
          var prog = Math.max(0, Math.floor(Number((byId("devBadgeProgressInput") || {}).value) || 0));
          if (!badgeId2) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "set-progress", badgeId: badgeId2, progress: prog });
          }, "Badge progress set.");
          return;
        }
        if (action === "badge-claim") {
          var badgeId3 = String((byId("devBadgeIdInput") || {}).value || "").trim();
          if (!badgeId3) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "claim", badgeId: badgeId3 });
          }, "Badge claimed: " + badgeId3);
          return;
        }
        if (action === "badge-reset") {
          var badgeId4 = String((byId("devBadgeIdInput") || {}).value || "").trim();
          if (!badgeId4) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "reset", badgeId: badgeId4 });
          }, "Badge reset: " + badgeId4);
          return;
        }
```

#### D. HTML section

**Step 4:** Add after the quests section:

```html
<section class="dev-section" id="devAchievementSection">
  <h2 class="dev-section-title">Achievements</h2>
  <p class="text-xs mb-2" style="color:#617063">
    Badge IDs: <code>badge-first-expense</code>, <code>badge-7-streak</code>,
    <code>badge-30-streak</code>, <code>level-up-2</code>, <code>level-up-5</code>
  </p>
  <div class="dev-row">
    <input id="devBadgeIdInput" class="dev-input" type="text" placeholder="Badge ID" />
    <input id="devBadgeProgressInput" class="dev-input" type="number" min="0" placeholder="Progress" style="max-width:100px" />
  </div>
  <div class="dev-grid dev-grid-3 mt-2">
    <button class="dev-button" data-action="badge-unlock" type="button">Unlock Badge</button>
    <button class="dev-button" data-action="badge-set-progress" type="button">Set Progress</button>
    <button class="dev-button" data-action="badge-claim" type="button">Claim Badge</button>
    <button class="dev-button danger" data-action="badge-reset" type="button">Reset Badge</button>
  </div>
  <p id="devAchievementStatus" class="dev-status"></p>
</section>
```

### 10. Completion Criteria

- [ ] "Unlock Badge" creates a doc in `users/{uid}/achievements/{badgeId}`.
- [ ] "Set Progress" updates `progress` field.
- [ ] "Claim Badge" marks `claimed: true`.
- [ ] "Reset Badge" deletes the achievement doc.
- [ ] `achievements.html` reflects changes after reload.

---

## Fix 13 — Sentimos / Streak-Freeze Dev Tools (MEDIUM)

### 1. Problem Summary

`setSentimosBalance` and `giveStreakFreezeCharge` exist in `storage.js` as dev-only
helpers but have no panel UI. Testers must use the browser console. This prevents
reliable shop/rewards flow testing.

### 2. Step-by-Step Implementation Plan

#### A. Backend callable — `functions/dev-tools.js`

Add `devSetSentimosState`:

```javascript
exports.devSetSentimosState = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  const action = String(data.action || "set-balance");

  if (action === "set-balance") {
    var amount = Math.max(0, Math.floor(Number(data.amount) || 0));
    await userRef.set({ sentimosBalance: amount }, { merge: true });
    await logDevAction(uid, "dev-sentimos-set-balance", { amount: amount });
    return { ok: true, sentimosBalance: amount };
  }

  if (action === "add-freeze") {
    var charges = Math.max(1, Math.min(10, Math.floor(Number(data.charges) || 1)));
    await userRef.set({
      streakFreezeCharges: admin.firestore.FieldValue.increment(charges)
    }, { merge: true });
    await logDevAction(uid, "dev-sentimos-add-freeze", { charges: charges });
    return { ok: true, charges: charges };
  }

  throw new HttpsError("invalid-argument", "Unknown action: " + action);
});
```

#### B. Frontend callable + handler + HTML

Follow the same pattern as Fix 11/12:

**In callables block:**
```javascript
setSentimosState: functions.httpsCallable("devSetSentimosState"),
```

**In click delegator:**
```javascript
        if (action === "sentimos-set-balance") {
          var bal = Math.max(0, Math.floor(Number((byId("devSentimosInput") || {}).value) || 0));
          await runSimpleStateAction("devSentimosStatus", function () {
            return state.callables.setSentimosState({ action: "set-balance", amount: bal });
          }, "Sentimos set to " + bal + ".");
          return;
        }
        if (action === "sentimos-add-freeze") {
          await runSimpleStateAction("devSentimosStatus", function () {
            return state.callables.setSentimosState({ action: "add-freeze", charges: 1 });
          }, "Streak freeze +1 added.");
          return;
        }
```

**In HTML (inside `devStateSection` or as a new section):**
```html
<section class="dev-section" id="devSentimosSection">
  <h2 class="dev-section-title">Sentimos & Shop</h2>
  <div class="dev-row">
    <input id="devSentimosInput" class="dev-input" type="number" min="0" placeholder="Set sentimos balance" />
    <button class="dev-button" data-action="sentimos-set-balance" type="button">Set Balance</button>
  </div>
  <div class="dev-grid dev-grid-2 mt-2">
    <button class="dev-button secondary" data-action="sentimos-add-freeze" type="button">Add Streak Freeze (+1)</button>
  </div>
  <p id="devSentimosStatus" class="dev-status"></p>
</section>
```

### 10. Completion Criteria

- [ ] "Set Balance" writes `sentimosBalance: N` to `users/{uid}`.
- [ ] "Add Streak Freeze" increments `streakFreezeCharges` by 1.
- [ ] Shop page and sentimos chip reflect changes after reload.

---

## Fix 14 — Master "Reset to Fresh Onboarding" Action (HIGH)

### 1. Problem Summary

There is no single-action way to reset an admin test account to a clean "new user"
state. This forces testers to manually undo all state changes between test runs,
which is error-prone and time-consuming. A "nuclear reset" action is the single
highest-value addition to the dev panel.

### 2. Correct Target Behavior

A single callable `devResetToFreshOnboarding` that:
1. Clears `expenses` array (or subcollection if applicable).
2. Resets XP to 0, level to 1.
3. Resets `currentStreak` to 0, `lastExpenseDate` to null, `streakBrokenFlag` to false.
4. Resets `weeklyBudget` to 0.
5. Resets `sentimosBalance` to 0, `streakFreezeCharges` to 0.
6. Clears `activeQuest` to null.
7. Resets `questsCompleted` to 0, `questPoolWeekKey` to null.
8. Deletes all `users/{uid}/achievements` subcollection docs.
9. Deletes all `users/{uid}/notifications` subcollection docs (calls clear-inbox logic).
10. Resets `inboxUnreadCount` to 0.
11. Resets `lapsedStagesSent` to null/deleted.
12. Resets `notificationPrefs` to defaults (does NOT change email).
13. Does NOT modify `email`, `firstName`, `lastName`, `uid`, `createdAt`.
14. Logs a single `devLog` entry: `"full-reset"`.

### 3. Step-by-Step Implementation Plan

#### A. Backend callable — `functions/dev-tools.js`

```javascript
exports.devResetToFreshOnboarding = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();
  const data = safeObj(request.data);
  if (data.confirm !== true) {
    throw new HttpsError("failed-precondition", "confirm:true is required for full reset.");
  }

  const userRef = db.collection("users").doc(uid);

  // 1. Reset scalar fields on user doc
  await userRef.set({
    xp: 0,
    level: 1,
    currentStreak: 0,
    lastStreakLength: 0,
    lastExpenseDate: null,
    streakBrokenFlag: false,
    weeklyBudget: 0,
    sentimosBalance: 0,
    streakFreezeCharges: 0,
    activeQuest: null,
    questsCompleted: 0,
    questPoolWeekKey: admin.firestore.FieldValue.delete(),
    lapsedStagesSent: admin.firestore.FieldValue.delete(),
    inboxUnreadCount: 0,
    notificationPrefs: {
      pushEnabled: true,
      emailEnabled: true,
      quietHoursStart: 22,
      quietHoursEnd: 8,
      setupDone: false,
      pushSetupFailure: admin.firestore.FieldValue.delete()
    },
    pendingDailyReward: null,
    resetAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // 2. Clear achievements subcollection
  var achSnap = await userRef.collection("achievements").get();
  if (!achSnap.empty) {
    for (var ai = 0; ai < achSnap.docs.length; ai += 400) {
      var achBatch = db.batch();
      achSnap.docs.slice(ai, ai + 400).forEach(function (d) { achBatch.delete(d.ref); });
      await achBatch.commit();
    }
  }

  // 3. Clear notifications subcollection
  var notifSnap = await userRef.collection("notifications").get();
  if (!notifSnap.empty) {
    for (var ni = 0; ni < notifSnap.docs.length; ni += 400) {
      var notifBatch = db.batch();
      notifSnap.docs.slice(ni, ni + 400).forEach(function (d) { notifBatch.delete(d.ref); });
      await notifBatch.commit();
    }
  }

  // 4. Delete stale notification log for today
  const dayKey = notif.todayKeyPH ? notif.todayKeyPH() : new Date().toISOString().slice(0, 10);
  await userRef.collection("notificationLog").doc(dayKey).delete().catch(function () {});

  await logDevAction(uid, "full-reset", { resetAt: new Date().toISOString() });
  return { ok: true, resetAt: new Date().toISOString() };
});
```

#### B. Frontend callable + handler + HTML

**In callables block:**
```javascript
fullReset: functions.httpsCallable("devResetToFreshOnboarding"),
```

**In click delegator:**
```javascript
        if (action === "state-full-reset") {
          if (!window.confirm("FULL RESET: This will clear all gamification, expenses, notifications, achievements and quests for your account. This cannot be undone. Proceed?")) {
            return;
          }
          await runSimpleStateAction("devStateStatus", function () {
            return state.callables.fullReset({ confirm: true });
          }, "Full reset complete. Reload dashboard to confirm.");
          return;
        }
```

**In HTML, inside `devStateSection`, at the bottom of the danger buttons grid:**
```html
<button class="dev-button danger" data-action="state-full-reset" type="button">Full reset (fresh onboarding)</button>
```

### 10. Completion Criteria

- [ ] "Full reset" clears XP, level, streak, quests, achievements, sentimos, inbox.
- [ ] User email, name, UID are preserved.
- [ ] `devLog` entry `"full-reset"` is created.
- [ ] Dashboard shows Level 1, Streak 0, 0 Sentimos after reload.
- [ ] Achievements page shows empty state after reload.

---

## Fix 15 — Streak / XP Input Upper-Bound Validation (MEDIUM)

### 1. Problem Summary

Dev tools accept any numeric value for streak and XP. Setting streak to 99999 or
XP to 9999999 can produce UI overflow, break chart rendering, and create data that
the production client doesn't handle gracefully.

### 2. Step-by-Step Implementation Plan

**File:** `js/dev-notifications.js`

**Step 1:** In `setStreakState()`, clamp the streak value:

```javascript
    var streak = Math.max(0, Math.min(365, Math.floor(getNumberInput("devStreakInput", 0))));
```

**Step 2:** In `setXpState()`, clamp the XP value:

```javascript
    var xp = Math.max(0, Math.min(99999, Math.floor(getNumberInput("devXpInput", 0))));
```

**File:** `functions/dev-tools.js`  
**Step 3:** In `sanitizeSetStatePatch`, add bounds inside the numeric fallthrough:

After `out[k] = Math.max(0, Math.floor(n));`, add per-key bounds:

```javascript
    if (k === "currentStreak" || k === "lastStreakLength") {
      out[k] = Math.max(0, Math.min(365, Math.floor(n)));
      return;
    }
    if (k === "xp") {
      out[k] = Math.max(0, Math.min(99999, Math.floor(n)));
      return;
    }
    out[k] = Math.max(0, Math.floor(n));
```

### 10. Completion Criteria

- [ ] Setting streak > 365 via dev panel is clamped to 365.
- [ ] Setting XP > 99999 via dev panel is clamped to 99999.
- [ ] Backend rejects out-of-range values with `invalid-argument` error.

---

## Section 11 — Global Architecture Recommendations

### 11.1 StorageAPI / Firestore Sync Split

**Problem:** The client reads from localStorage (via `StorageAPI`) but dev tools
write to Firestore. These are two separate data layers with no bridge. Any dev
tool that changes Firestore state will not be reflected in the dashboard until a
page reload forces a fresh Firestore read into localStorage.

**Recommendation:** Implement a `FirestoreService.subscribeCurrentUser(callback)`
function that opens an `onSnapshot` listener on `users/{uid}` and calls
`StorageAPI.setCurrentUser(data)` on every change. This would make all dev-tool
state changes immediately visible in the dashboard without reloads.

This is a Sprint 3+ refactor. It requires adding a listener subscription lifecycle
to every protected page and ensuring StorageAPI updates trigger re-renders.

### 11.2 Snapshot Panel: Replace Polling with onSnapshot

The 5-second poll in `startAutoRefresh()` should be replaced with:
- `onSnapshot` on `users/{uid}` → re-runs `renderSnapshot` on change
- `onSnapshot` on `users/{uid}/notificationLog/{dayKey}` → updates cap counts
- `onSnapshot` on `metrics/emailQuota_{dayKey}` → updates quota
- `onSnapshot` on `metrics/devFlags` → updates Brevo sim flag status

This eliminates stale reads and makes the panel feel truly reactive.

### 11.3 Cron Simulator Drift Prevention

Cron simulators use `forceMatch`, `forceSend`, `hourOverride`, `stageOverride` flags
that the real production cron does NOT pass. If production logic changes, the dev
tool might still report "ok" while the production cron silently breaks.

**Recommendation:** Add an integration test (even a manual one documented in
`docs/TESTING_PLAN.md`) that runs the REAL cron callable with NO overrides and
verifies the result against a known user state. This catches drift before deploy.

### 11.4 XP_LEVELS Table Desync Prevention

The XP_LEVELS table is defined in:
- `js/storage.js` (client)
- `functions/dev-tools.js` (backend, after Fix 3)

**Recommendation:** Extract to a shared constants file. Since this project has no
build step, a pragmatic approach is to keep both in sync manually and add a
comment: `// SYNC: Must match XP_LEVELS_BACKEND in functions/dev-tools.js`.
A CI check (e.g., a Node.js script that parses both files and compares the table)
would catch desync before deploy.

### 11.5 Missing Dev Tool Systems (Future Sprint)

Systems with zero dev tool coverage that should be addressed in future sprints:
- **Friends / Social:** Add friend, send request, block user, populate fake friends
- **Leaderboard:** Populate ranks, trigger rank notifications
- **Profile sync:** Force public profile denormalization
- **Chat / AI (Tigom):** Send test messages, trigger mood changes
- **Dark mode:** Toggle theme, verify sync
- **Onboarding flow:** Reset consent, force first-use tutorial

---

## Section 12 — Recommended Implementation Order

The order below minimizes risk of regressions and respects dependency chains.
Execute each phase completely before starting the next.

### Phase 1 — Security & Critical Path (implement first, deploy first)

1. **Fix 1** (Route Guard) — Prevents unauthorized UI access
2. **Fix 2** (Brevo Secret Guard) — Prevents silent email failures
3. **Fix 6** (parseResultSummary) — Required by all other fixes to show proper output

Rationale: Fix 1 is a security issue. Fix 2 is a production reliability issue.
Fix 6 makes the output of all subsequent fixes meaningful.

### Phase 2 — State Correctness (implement second, test before Phase 3)

4. **Fix 3** (XP→Level calculation) — Depends on Fix 6 to show correct output
5. **Fix 4** (streakBrokenFlag) — Simple addition; no dependencies
6. **Fix 5** (clear-inbox counter) — Backend-only; no dependencies
7. **Fix 15** (input clamping) — Backend + frontend; simple guard

Rationale: These fixes correct data model inconsistencies. They must be in place
before adding new features (Fixes 11–14) that write more data.

### Phase 3 — New Dev Features (implement after Phase 2 verified)

8. **Fix 11** (Quests) — New callable + UI section
9. **Fix 12** (Achievements) — New callable + UI section
10. **Fix 13** (Sentimos / Freeze) — New callable + UI section
11. **Fix 14** (Full Reset) — New callable + UI button; depends on knowing what fields exist

Rationale: New features should only be added after the data correctness issues
are fixed, otherwise the new tools would create inconsistent data.

### Phase 4 — UX & Polish (implement last)

12. **Fix 7** (FCM failure persistence) — Diagnostic improvement
13. **Fix 8** (Dashboard refresh) — UX improvement; no functional dependency
14. **Fix 9** (edge-send-five output) — Cosmetic improvement
15. **Fix 10** (Flow-D timeout) — Cosmetic improvement

### Deploy Checkpoints

- After Phase 1: Deploy functions (`functions/`) and frontend (`js/`). Verify live.
- After Phase 2: Deploy functions only (backend changes). Verify via dev panel.
- After Phase 3: Deploy functions + frontend. Full smoke test.
- After Phase 4: Deploy frontend only. Final verification.

---

## Section 13 — Demo Stability Strategy

### Before a Demo

1. Open dev panel → run **"Full reset (fresh onboarding)"** action.
2. Verify snapshot shows: XP=0, Level=1, Streak=0, Inbox unread=0.
3. Set a meaningful starting state using state manipulation tools:
   - Streak = 7 (makes demo visually interesting)
   - XP = 400 (nearly at Level 4 for a live level-up demo)
   - Budget = 1500
4. Run **"Activate Daily Quest"** to show a quest in progress.
5. Navigate to dashboard — verify resource bar shows correct values.

### During Demo

- Use "Quick Send" buttons to show push/email in real-time.
- Use "Preset States" → `budget-warning` to show a live notification demo.
- Use "Demo Flow A" for a pre-scripted onboarding sequence.

### Avoiding Stale State

- After each dev action, always click **"Refresh"** in the Snapshot section.
- Do not open two browser tabs running the same demo account simultaneously.
- Clear browser cache before demo to ensure fresh Firestore reads.

### Resetting Mid-Demo

If something breaks during a demo:
1. Full reset (from dev panel).
2. Re-apply starting state (steps 3–5 above).
3. Takes approximately 30 seconds.

---

## Section 14 — Post-Implementation Verification Checklist

The implementing AI should run through this checklist in order after all 15 fixes
are applied and deployed.

### Security

- [ ] Non-admin user sees "Access Denied" screen on `dev-notifications.html`
- [ ] Admin user sees full panel
- [ ] Unauthenticated user is redirected to `login.html`
- [ ] Dead comment removed from `app.js`

### Email Pipeline

- [ ] "Send test email" with valid Brevo secret succeeds and shows `Email sent=1`
- [ ] Removing secret and re-deploying causes `Email sent=0 (brevo-not-configured)`
- [ ] Failure reason shown in panel output (not just "Email sent=0")
- [ ] Brevo simulation flag blocks email and shows `Email sent=0 (brevo-error-simulated)`

### Push Pipeline

- [ ] "Send test push to me" delivers to device when FCM tokens exist
- [ ] "Push sent=0 (no-tokens)" shown when no tokens registered
- [ ] "Push sent=0 (daily-cap)" shown when cap exhausted
- [ ] Inbox bell badge increments after push without page reload

### State Manipulation

- [ ] Setting XP to 500 → Firestore shows `xp:500, level:4`
- [ ] Setting XP to 0 → Firestore shows `xp:0, level:1`
- [ ] Setting streak to 0 → Firestore shows `currentStreak:0, streakBrokenFlag:true`
- [ ] Setting streak to 7 → Firestore shows `currentStreak:7, streakBrokenFlag:false`
- [ ] Setting streak > 365 → clamped to 365
- [ ] Setting XP > 99999 → clamped to 99999

### Inbox / Reset

- [ ] "Clear inbox" → `inboxUnreadCount:0` in Firestore → bell shows 0 without reload
- [ ] "Reset caps" → today's notification log deleted
- [ ] "Full reset" → XP=0, level=1, streak=0, no quests, no achievements, empty inbox
- [ ] "Full reset" preserves email, firstName, lastName, uid

### New Features

- [ ] "Activate Daily Quest" → `activeQuest` object created in Firestore
- [ ] "Mark Quest Complete" → `activeQuest.completedAt` set
- [ ] "Reset Quest State" → `activeQuest: null`
- [ ] "Unlock Badge" → achievement doc created in subcollection
- [ ] "Set Progress" → `progress` field updated on achievement doc
- [ ] "Claim Badge" → `claimed: true` set
- [ ] "Set Balance" → `sentimosBalance: N` on user doc
- [ ] "Add Streak Freeze" → `streakFreezeCharges` incremented by 1

### UI Diagnostics

- [ ] All action results show reason suffix where applicable
- [ ] `edge-send-five` output shows per-send reason for each of the 5 sends
- [ ] Flow-D polling waits up to 20 seconds and returns diagnostic info on timeout
- [ ] FCM setup failure shown in snapshot when registration fails

### Cron Simulators

- [ ] Each cron simulator produces a `devLog` entry
- [ ] `weeklyDigestCron` with `forceBucket:true` successfully creates inbox notification
- [ ] `streakBrokenCron` with `forceBroken:true` fires after streak set to 0

### Deploy Health

- [ ] `functions/dev-tools.js` exports include all new callables
- [ ] `functions/index.js` imports/exports from `dev-tools.js` include new callables
- [ ] No TypeScript/linting errors in functions
- [ ] `sw.js` cache version bumped if any static assets changed
- [ ] Firebase deploy completes without errors

---

*End of Implementation Plan — Version 1.0*  
*Total estimated implementation time: ~4.5 hours*  
*Phase 1: 30 min | Phase 2: 45 min | Phase 3: 2 hr | Phase 4: 30 min | Testing: 45 min*
