# Developer Notification Testing Panel — Implementation Plan

> **Hand-off to implementer AI.** Build this AFTER the four critical fixes in `NOTIFICATIONS_CRITICAL_FIXES_PLAN.md` are merged and verified. This panel is the primary test surface for the notification + email system AND the live demo control room for the school presentation.
>
> Read this entire document before writing a single line of code. Every section matters. Do not improvise — when something is unspecified, ask the human, do not guess.

---

## 1. Goals (in priority order)

1. **Deterministic notification triggering** — fire any of the 13 notification states on demand, regardless of the user's current state, time of day, or cron schedule.
2. **Live state inspection** — see current FCM token, prefs, today's caps, today's email quota, and the last 20 dispatched events without leaving the page.
3. **State manipulation** — reset caps, clear inbox, set fake streak/lastLoginAt/lapsedStagesSent values for testing.
4. **Demo orchestration** — pre-baked one-click "demo flow" recipes that fire a sequence of notifications with controlled timing.
5. **Hard security boundary** — no other user can invoke any of these endpoints, even if they discover the URL.

---

## 2. Non-Goals (do NOT build these)

- Editing other users' data.
- A general-purpose admin console (this is notification-only).
- Statistics dashboards / charts.
- Email template editor.
- Production analytics.

If the implementer is tempted to add anything outside these goals, stop and ask.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  dev-notifications.html (NEW route)                     │
│  ─ data-protected="true"                                │
│  ─ data-dev-only="true"  (NEW route attribute)          │
│  ─ Loads js/dev-notifications.js                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  js/dev-notifications.js (NEW, IIFE)                    │
│  ─ Reads current uid from FirebaseAuthService           │
│  ─ Calls callable Cloud Functions                       │
│  ─ Subscribes to /devLog onSnapshot for live output     │
│  ─ Reads /users/{uid}, /metrics/*, /notificationLog/*   │
│    via FirestoreService (server-side allowlist still    │
│    enforces who can call dev functions)                 │
└────────────────────┬────────────────────────────────────┘
                     │ httpsCallable
                     ▼
┌─────────────────────────────────────────────────────────┐
│  functions/dev-tools.js (NEW MODULE)                    │
│  ─ DEV_ADMIN_UIDS allowlist (hardcoded)                 │
│  ─ Every callable verifies request.auth.uid is allowed  │
│  ─ Wraps existing sendNotification + cron handlers      │
│  ─ Writes to /devLog/{autoId} for client display        │
└─────────────────────────────────────────────────────────┘
```

**Hard rule**: every callable in `dev-tools.js` must have this allowlist guard as its FIRST executable line:

```javascript
if (!request.auth || !request.auth.uid || DEV_ADMIN_UIDS.indexOf(request.auth.uid) === -1) {
  throw new HttpsError("permission-denied", "Not authorized for dev tools.");
}
```

No exceptions. No env-flag bypass. No `if (debug)` shortcut.

---

## 4. Files to Create

| Path | Purpose |
|---|---|
| [`dev-notifications.html`](dev-notifications.html) | The dev panel page (root level, same as other HTML pages) |
| [`js/dev-notifications.js`](js/dev-notifications.js) | Page IIFE — UI wiring, callable invocations, live state display |
| [`css/dev-notifications.css`](css/dev-notifications.css) | Page-specific styles |
| [`functions/dev-tools.js`](functions/dev-tools.js) | Backend callables and DEV_ADMIN_UIDS allowlist |

## 5. Files to Modify

| Path | Change |
|---|---|
| [`functions/index.js`](functions/index.js) | Re-export the dev callables |
| [`functions/notifications.js`](functions/notifications.js) | **Refactor**: extract each cron's per-user inner loop into an exported helper so dev-tools can invoke it for a single uid without duplicating logic |
| [`firestore.rules`](firestore.rules) | Add `/devLog/{logId}` rules — server-only writes, owner-scoped reads |
| [`js/app.js`](js/app.js) | Recognize `data-dev-only="true"` route attribute and redirect non-allowlisted users to `/dashboard.html` |
| [`sw.js`](sw.js) | Bump cache version AND add `dev-notifications.html`, `js/dev-notifications.js`, `css/dev-notifications.css` to the SHELL_FILES array |

## 6. Files to NOT Modify

- Any production cron handler logic (only refactor extraction is allowed; semantics must be byte-identical).
- `js/notifications.js` — the dev panel must use the public `NotificationsAPI` and callables; it must NOT reach into private state.
- `firestore.indexes.json` — no new queries are needed in this plan.

---

## 7. The Allowlist

**Where**: [`functions/dev-tools.js`](functions/dev-tools.js), top of file:

```javascript
// Hardcoded allowlist of UIDs that may invoke any dev tooling callable.
// Add YOUR Firebase Auth uid here before deploying. Find it in Firebase Console
// → Authentication → Users → Copy the user UID for your account.
const DEV_ADMIN_UIDS = [
  // "REPLACE_ME_WITH_YOUR_FIREBASE_UID"
];
```

**Implementer instruction**: leave this array empty in the committed code. The human user will paste their uid in before deploying. Add a comment block above it:

```javascript
// SECURITY-CRITICAL: this list controls who can fire push notifications,
// reset caps, manipulate user state, and impersonate cron behavior for
// arbitrary uids. Never commit a real uid to a public branch. Never log
// the contents of this array. Never expose it through any API response.
```

**Client-side mirror**: do NOT mirror this list in `js/dev-notifications.js`. The page renders the UI for everyone who navigates to it; the security boundary is enforced server-side only. The page should however hide the panel UI behind a single "Verify access" button that calls a `devCheckAccess` callable — if that returns `{authorized: false}`, redirect to `/dashboard.html`.

---

## 8. Backend — `functions/dev-tools.js`

### 8.1 Setup

```javascript
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const notif = require("./notifications");
const { emailTemplate } = require("./templates");

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = defineSecret("BREVO_SENDER_EMAIL");
const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

const REGION = "us-central1";

const DEV_ADMIN_UIDS = [
  // populate before deploy
];

function assertAdmin(request) {
  if (!request.auth || !request.auth.uid || DEV_ADMIN_UIDS.indexOf(request.auth.uid) === -1) {
    throw new HttpsError("permission-denied", "Not authorized for dev tools.");
  }
  return request.auth.uid;
}

async function logDevAction(uid, action, details) {
  try {
    await admin.firestore().collection("devLog").add({
      uid,
      action,
      details: details || null,
      ts: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (_) { /* non-fatal */ }
}
```

### 8.2 Callables to expose (exactly these — no more, no fewer)

| Callable name | Input | Action |
|---|---|---|
| `devCheckAccess` | none | Returns `{ authorized: true, uid }` or throws permission-denied. **Used by client to gate UI.** |
| `devSendTestNotification` | `{ type, channel, title, body, deepLink, allowQuietHourException, bypassDailyCap }` | Wraps `sendNotification(uid, payload)` for the caller's own uid. Returns the full result object PLUS the `_meta` enrichment described below. |
| `devTriggerPresetState` | `{ preset }` where preset is one of the 13 production states | Calls `sendNotification` with the EXACT payload that the corresponding cron would have built (use the helpers extracted from notifications.js — see §10). Returns full result + `_meta`. |
| `devRunCronForSelf` | `{ cronName, overrides }` where `cronName` is one of `dailyReminderCron`, `streakAtRiskCron`, `streakBrokenCron`, `weeklyDigestCron`, `lapsedUserCron`, `onboardingCron` | Runs that cron's per-user logic ONLY for the caller's uid, using `overrides` to fake `nowInPHHour`, `todayKeyPH`, etc. Returns the result. |
| `devResetDailyCaps` | none | Deletes `users/{uid}/notificationLog/{todayKeyPH()}`. Returns `{ deleted: true }`. |
| `devResetEmailQuota` | none | Deletes `metrics/emailQuota_{todayKeyPH()}`. Returns `{ deleted: true, dayKey }`. |
| `devClearInbox` | `{ confirm: true }` (must be literally true) | Batch-deletes all docs in `users/{uid}/notifications`. Returns `{ deleted: <count> }`. |
| `devMarkAllInboxRead` | none | Batch-updates `readAt = serverTimestamp()` for all unread inbox docs of caller. Returns `{ updated: <count> }`. |
| `devSetUserState` | `{ patch }` where `patch` is an allowlisted object | Whitelist of allowed keys: `currentStreak`, `lastStreakLength`, `lastExpenseDate`, `lastLoginAt`, `weeklyBudget`, `xp`, `streakBrokenFlag`. **Reject any other key.** Writes patch to `users/{uid}` with merge. Returns `{ patched: true, applied: patch }`. |
| `devClearLapsedStages` | none | Sets `users/{uid}.lapsedStagesSent` to `FieldValue.delete()`. Returns `{ cleared: true }`. |
| `devSimulateBrevoFailure` | `{ enabled: boolean }` | Writes `metrics/devFlags.simulateBrevoFailureUid = uid` (or deletes). The next `sendEmail` call for that uid must consult this flag and return `{sent: 0, reason: "brevo-error-simulated"}`. **Requires modifying `sendEmail` in notifications.js — see §11.** |
| `devGetSnapshot` | none | Returns one fat object: `{ uid, prefs, fcmTokens: [{tokenIdPrefix, lastSeen}], notificationLogToday, emailQuotaToday, lapsedStagesSent, currentStreak, lastExpenseDate, lastLoginAt, recentEvents: [...last 20 from notificationEvents WHERE uid == caller], inboxUnreadCount }`. |

### 8.3 The `_meta` enrichment

Every notification-firing callable returns the standard `sendNotification` result PLUS:

```javascript
{
  ...sendNotificationResult,
  _meta: {
    uid,
    type: payload.type,
    requestedChannel: payload.channel,
    quietHoursActive: <boolean>,
    capBefore: { pushCount, emailCount },
    capAfter: { pushCount, emailCount },
    weeklyCountBefore: { push, email },
    tookMs: <number>,
    timestamp: new Date().toISOString()
  }
}
```

Implementer should pull `capBefore` from a Firestore read **before** calling `sendNotification` and `capAfter` from a read after, NOT from the in-flight transaction (race-free for a non-concurrent dev panel).

### 8.4 Export to `functions/index.js`

Add to the existing notif export block:

```javascript
const dev = require("./dev-tools");
exports.devCheckAccess = dev.devCheckAccess;
exports.devSendTestNotification = dev.devSendTestNotification;
exports.devTriggerPresetState = dev.devTriggerPresetState;
exports.devRunCronForSelf = dev.devRunCronForSelf;
exports.devResetDailyCaps = dev.devResetDailyCaps;
exports.devResetEmailQuota = dev.devResetEmailQuota;
exports.devClearInbox = dev.devClearInbox;
exports.devMarkAllInboxRead = dev.devMarkAllInboxRead;
exports.devSetUserState = dev.devSetUserState;
exports.devClearLapsedStages = dev.devClearLapsedStages;
exports.devSimulateBrevoFailure = dev.devSimulateBrevoFailure;
exports.devGetSnapshot = dev.devGetSnapshot;
```

---

## 9. The 13 Preset Notification States

Implement these exact preset keys for `devTriggerPresetState({ preset })`. Each must use the SAME payload shape that the production cron uses — copy from `notifications.js`, do NOT reword copy.

| Preset key | Production source | Channel |
|---|---|---|
| `onboarding-activate-d1` | `onboardingCron` ageDays=1 branch | both |
| `onboarding-activate-d3` | `onboardingCron` ageDays=3 branch | email |
| `onboarding-no-budget` | `onboardingCron` no-budget branch | push |
| `onboarding-welcome` | `onUserWriteTrigger` new-user branch | email |
| `daily-reminder` | `dailyReminderCron` | push |
| `streak-at-risk-soft` | `streakAtRiskCron` 6pm branch | push |
| `streak-at-risk-last` | `streakAtRiskCron` 10pm branch (with `bypassDailyCap: true`, `allowQuietHourException: true`) | push |
| `streak-broken` | `streakBrokenCron` | email |
| `budget-warning` | `onExpenseWriteTrigger` 80% branch | both |
| `budget-exceeded` | `onExpenseWriteTrigger` 100% branch | push |
| `achievement-near` | `onExpenseWriteTrigger` XP near branch | push |
| `weekly-digest` | `weeklyDigestCron` (with real Groq tip) | email |
| `lapsed-d3` / `lapsed-d7` / `lapsed-d14` / `lapsed-d30` | `lapsedUserCron` per stage | d3=both, others=email |

For numeric-dependent presets (`streak-at-risk-soft` needs a streak number, `budget-warning` needs a pct, etc.), the callable should read the user's current state and substitute, OR accept an optional `overrides` field.

---

## 10. Refactor of `functions/notifications.js`

To make presets DRY, extract each cron's per-user inner block into a named, exported helper. The cron itself becomes a thin loop calling the helper.

**Pattern**:

```javascript
// Before:
exports.streakAtRiskCron = onSchedule(..., async () => {
  // ... loop over users ...
  for (const doc of users.docs) {
    try {
      const u = doc.data() || {};
      // ... 20 lines of logic ...
      await sendNotification(doc.id, { ...payload... });
    } catch (err) { ... }
  }
});

// After:
async function processStreakAtRiskForUser(uid, userDoc, opts) {
  const hour = (opts && typeof opts.hourOverride === "number") ? opts.hourOverride : nowInPHHour();
  const isLastCall = hour >= 22;
  const today = (opts && opts.todayKeyOverride) || todayKeyPH();
  const u = userDoc;
  const streak = Number(u.currentStreak || (u.publicProfile && u.publicProfile.streak) || 0);
  if (streak < 2) { return { skipped: "streak<2" }; }
  if (String(u.lastExpenseDate || "") === today) { return { skipped: "expense-today" }; }
  return sendNotification(uid, {
    type: isLastCall ? "streak-at-risk-last" : "streak-at-risk-soft",
    channel: "push",
    title: isLastCall ? `⏰ 2 hours left, ${u.firstName || "friend"}` : "🔥 Streak in danger",
    body: isLastCall
      ? `Your ${streak}-day streak ends at midnight.`
      : `Your ${streak}-day streak is in danger. 30 seconds to save it.`,
    deepLink: "/dashboard.html?from=streak",
    allowQuietHourException: isLastCall,
    bypassDailyCap: isLastCall
  });
}

exports.processStreakAtRiskForUser = processStreakAtRiskForUser;

exports.streakAtRiskCron = onSchedule(..., async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();
  for (const doc of users.docs) {
    try {
      await processStreakAtRiskForUser(doc.id, doc.data() || {});
    } catch (err) {
      console.error(`[streakAtRiskCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
});
```

Apply the same extraction to:

- `onboardingCron` → `processOnboardingForUser(uid, userDoc, opts)` where `opts.ageDaysOverride` allows fake aging.
- `dailyReminderCron` → `processDailyReminderForUser(uid, userDoc, opts)`.
- `streakAtRiskCron` → `processStreakAtRiskForUser`.
- `streakBrokenCron` → `processStreakBrokenForUser`.
- `weeklyDigestCron` → `processWeeklyDigestForUser`.
- `lapsedUserCron` → `processLapsedForUser(uid, userDoc, opts)` where `opts.daysInactiveOverride` allows fake aging.
- `onExpenseWriteTrigger` budget+achievement logic → `processExpenseWriteForUser(uid, userDoc)`.

**Critical**: the production cron behavior MUST be byte-identical after refactor. Run the smoke tests in §13 before and after.

---

## 11. Brevo Failure Simulation Hook

Modify `sendEmail` in `functions/notifications.js` to consult a flag doc:

```javascript
async function sendEmail(uid, userDoc, payload) {
  const email = String(userDoc.email || "").trim().toLowerCase();
  if (!email) {
    return { sent: 0, reason: "missing-email" };
  }

  // Dev-tools simulation hook (no-op when flag is absent).
  try {
    const flagSnap = await admin.firestore().collection("metrics").doc("devFlags").get();
    if (flagSnap.exists) {
      const flag = flagSnap.data() || {};
      if (flag.simulateBrevoFailureUid === uid) {
        return { sent: 0, reason: "brevo-error-simulated" };
      }
    }
  } catch (_) { /* non-fatal */ }

  // ... existing reserveEmailQuotaSlot + Brevo call ...
}
```

The `metrics/devFlags` doc is gated by Firestore rules to server-only access (see §13).

---

## 12. Frontend — `dev-notifications.html` and `js/dev-notifications.js`

### 12.1 HTML structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dev Tools — SugboCents</title>
  <link rel="manifest" href="manifest.json" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/dev-notifications.css" />
</head>
<body class="bg-gray-50" data-protected="true" data-dev-only="true">
  <main id="devApp" class="max-w-4xl mx-auto p-4 hidden">
    <header class="mb-4">
      <h1 class="text-2xl font-bold">🛠 Dev Notification Tools</h1>
      <p class="text-sm text-gray-600">Admin-only. All actions affect ONLY your own user account.</p>
    </header>

    <section id="devSnapshot" class="mb-6"></section>
    <section id="devQuickSend" class="mb-6"></section>
    <section id="devPresets" class="mb-6"></section>
    <section id="devCronSim" class="mb-6"></section>
    <section id="devStateMgmt" class="mb-6"></section>
    <section id="devEdgeCases" class="mb-6"></section>
    <section id="devDemoFlows" class="mb-6"></section>
    <section id="devLog" class="mb-6"></section>
  </main>

  <div id="devGate" class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <p class="text-gray-700 mb-3">Verifying access…</p>
      <div class="text-sm text-gray-400" id="devGateMessage"></div>
    </div>
  </div>

  <!-- Firebase scripts loaded BEFORE app scripts (same pattern as dashboard.html) -->
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-functions-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"></script>
  <script src="js/firebase-init.js"></script>
  <script src="js/firebase-auth-service.js"></script>
  <script src="js/firestore-service.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/app.js"></script>
  <script src="js/notifications.js"></script>
  <script src="js/dev-notifications.js"></script>
</body>
</html>
```

### 12.2 `js/dev-notifications.js` IIFE skeleton

```javascript
(function () {
  "use strict";

  var state = {
    authorized: false,
    uid: null,
    callables: {},
    snapshot: null,
    devLogUnsub: null
  };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else { fn(); }
  }

  ready(init);

  async function init() {
    try {
      var ctx = window.FirebaseInit && window.FirebaseInit.getContext
        ? window.FirebaseInit.getContext()
        : null;
      if (!ctx) { return showGateMessage("Firebase not initialized"); }

      var functions = window.firebase.functions();
      state.callables = {
        checkAccess: functions.httpsCallable("devCheckAccess"),
        sendTest: functions.httpsCallable("devSendTestNotification"),
        triggerPreset: functions.httpsCallable("devTriggerPresetState"),
        runCron: functions.httpsCallable("devRunCronForSelf"),
        resetCaps: functions.httpsCallable("devResetDailyCaps"),
        resetQuota: functions.httpsCallable("devResetEmailQuota"),
        clearInbox: functions.httpsCallable("devClearInbox"),
        markAllRead: functions.httpsCallable("devMarkAllInboxRead"),
        setState: functions.httpsCallable("devSetUserState"),
        clearLapsed: functions.httpsCallable("devClearLapsedStages"),
        simBrevoFail: functions.httpsCallable("devSimulateBrevoFailure"),
        snapshot: functions.httpsCallable("devGetSnapshot")
      };

      // Wait for auth.
      var auth = window.firebase.auth();
      auth.onAuthStateChanged(async function (user) {
        if (!user) { return; /* app.js handles redirect */ }
        state.uid = user.uid;
        try {
          var res = await state.callables.checkAccess();
          if (!res || !res.data || res.data.authorized !== true) {
            return showGateMessage("Not authorized. Redirecting…", function () {
              window.location.replace("/dashboard.html");
            });
          }
          state.authorized = true;
          revealPanel();
          await refreshSnapshot();
          subscribeDevLog();
        } catch (err) {
          showGateMessage("Access check failed: " + (err && err.message ? err.message : "unknown"), function () {
            setTimeout(function () { window.location.replace("/dashboard.html"); }, 2000);
          });
        }
      });
    } catch (err) {
      showGateMessage("Init error: " + (err && err.message ? err.message : "unknown"));
    }
  }

  function showGateMessage(msg, after) {
    var el = document.getElementById("devGateMessage");
    if (el) { el.textContent = msg; }
    if (typeof after === "function") { after(); }
  }

  function revealPanel() {
    var gate = document.getElementById("devGate");
    var app = document.getElementById("devApp");
    if (gate) { gate.classList.add("hidden"); }
    if (app) { app.classList.remove("hidden"); }
    renderQuickSend();
    renderPresets();
    renderCronSim();
    renderStateMgmt();
    renderEdgeCases();
    renderDemoFlows();
  }

  // ... section render functions and click handlers below ...

  // EXPORTED: nothing. The page is self-contained.
})();
```

### 12.3 Section: Snapshot (top of page, refreshes every 5 seconds)

Display these fields in a clean grid. Use vanilla DOM, no template strings of innerHTML for user-controlled values (XSS guard).

| Field | Source |
|---|---|
| Your UID | `state.uid` (truncate to 12 chars + "…") |
| Email enabled | `snapshot.prefs.emailEnabled` |
| Push enabled | `snapshot.prefs.pushEnabled` |
| FCM tokens registered | `snapshot.fcmTokens.length` |
| FCM token preview | first token's first 16 chars + "…" |
| Today push count | `snapshot.notificationLogToday.pushCount` |
| Today email count | `snapshot.notificationLogToday.emailCount` |
| Today email quota | `snapshot.emailQuotaToday.count / 95` |
| Current streak | `snapshot.currentStreak` |
| Last expense date | `snapshot.lastExpenseDate` |
| Last login | `snapshot.lastLoginAt` |
| Lapsed stages sent | `Object.keys(snapshot.lapsedStagesSent || {}).join(", ")` |
| Inbox unread | `snapshot.inboxUnreadCount` |
| Foreground listener wired | `window.NotificationsAPI && state.foregroundListenerWired === true` (need to expose a getter) |

Add a `[Refresh]` button. Auto-refresh every 5s while page is visible.

### 12.4 Section: Quick Send

Three buttons:
- `[Send test push to me]` → `devSendTestNotification({ type: "dev-test-push", channel: "push", title: "Dev test push", body: "Triggered " + new Date().toLocaleTimeString(), deepLink: "/dashboard.html" })`
- `[Send test email to me]` → channel `email`, custom subject/body
- `[Send test BOTH]` → channel `both`

Plus three checkbox modifiers that apply to whichever button is clicked next:
- `[ ] Bypass daily cap` (`bypassDailyCap: true`)
- `[ ] Bypass quiet hours` (`allowQuietHourException: true`)
- `[ ] Force foreground` (no payload change — just reminds the user "keep this tab focused")

### 12.5 Section: Presets — 13 buttons

One button per preset key from §9. Layout in a 3-column grid. Each click → `devTriggerPresetState({ preset: "<key>" })` → render result + `_meta` to the dev log.

### 12.6 Section: Cron simulators

Six buttons, each calls `devRunCronForSelf({ cronName: "...", overrides: {...} })`:

| Button | cronName | overrides |
|---|---|---|
| Run dailyReminderCron NOW | `dailyReminderCron` | `{ hourOverride: <current PH hour>, forceMatch: true }` |
| Run streakAtRiskCron at 6pm | `streakAtRiskCron` | `{ hourOverride: 18 }` |
| Run streakAtRiskCron at 10pm | `streakAtRiskCron` | `{ hourOverride: 22 }` |
| Run streakBrokenCron | `streakBrokenCron` | `{}` |
| Run weeklyDigestCron (force my bucket) | `weeklyDigestCron` | `{ forceBucket: true }` |
| Run lapsedUserCron (force d3 stage) | `lapsedUserCron` | `{ stageOverride: "d3" }` |
| Run lapsedUserCron (force d7) | `lapsedUserCron` | `{ stageOverride: "d7" }` |
| Run lapsedUserCron (force d14) | `lapsedUserCron` | `{ stageOverride: "d14" }` |
| Run lapsedUserCron (force d30) | `lapsedUserCron` | `{ stageOverride: "d30" }` |

The backend's `devRunCronForSelf` must respect each `overrides` field. Implementer must add the override branches to each `process*ForUser` helper from §10.

### 12.7 Section: State manipulation

Form inputs:
- Set my streak: `[ number input ]` `[Apply]` → `devSetUserState({ patch: { currentStreak: <n>, lastStreakLength: <n>, lastExpenseDate: <yesterdayKey> } })`
- Set my lastLoginAt: `[ days-ago input ]` `[Apply]` → computes ISO and patches.
- Set my weeklyBudget: `[ number input ]` `[Apply]`.
- Set my XP: `[ number input ]` `[Apply]`.
- `[Reset today's push/email caps]` → `devResetDailyCaps`.
- `[Reset today's email quota]` → `devResetEmailQuota`.
- `[Mark all my notifications as read]` → `devMarkAllInboxRead`.
- `[Clear my inbox]` → confirm dialog → `devClearInbox({ confirm: true })`.
- `[Clear my lapsedStagesSent]` → `devClearLapsedStages`.

Every action posts the result to the dev log section.

### 12.8 Section: Edge case simulators

- `[Simulate Brevo failure for next email]` toggle → `devSimulateBrevoFailure({ enabled: true/false })`. Show current state.
- `[Send 5 pushes rapidly]` → fires `devSendTestNotification` 5 times in a tight loop. The user should observe the daily cap kick in.
- `[Send broken deep-link]` → sends with `deepLink: "/this-route-does-not-exist.html"` to verify SW notificationclick fallback.

### 12.9 Section: Demo flows (one-click recipes for the school presentation)

Each demo flow is an async sequence with status updates rendered live.

- `[Demo Flow A — New user onboarding]`:
  1. `devClearInbox({confirm:true})`
  2. `devResetDailyCaps()`
  3. `devTriggerPresetState({ preset: "onboarding-welcome" })` — wait 3s
  4. `devTriggerPresetState({ preset: "onboarding-activate-d1" })`

- `[Demo Flow B — Streak journey]`:
  1. `devSetUserState({ patch: { currentStreak: 5, lastStreakLength: 5, lastExpenseDate: "<yesterdayKey>" } })`
  2. `devResetDailyCaps()`
  3. `devTriggerPresetState({ preset: "streak-at-risk-soft" })` — wait 4s
  4. `devTriggerPresetState({ preset: "streak-at-risk-last" })` — wait 4s
  5. `devTriggerPresetState({ preset: "streak-broken" })`

- `[Demo Flow C — Budget escalation]`:
  1. `devSetUserState({ patch: { weeklyBudget: 1000 } })`
  2. `devResetDailyCaps()`
  3. `devTriggerPresetState({ preset: "budget-warning" })` — wait 4s
  4. `devTriggerPresetState({ preset: "budget-exceeded" })`

- `[Demo Flow D — Weekly digest preview]`:
  1. `devResetEmailQuota()` (in case caps are tight)
  2. `devTriggerPresetState({ preset: "weekly-digest" })` — show "check your email" status
  3. Poll Firestore inbox for the new doc and render it inline as confirmation

Display each step's status with a small spinner, then ✅ when complete. Show the elapsed ms.

### 12.10 Section: Dev log (live tail)

Subscribe to `db.collection("devLog").where("uid", "==", state.uid).orderBy("ts", "desc").limit(30)` via `onSnapshot`. Render each entry with action name, timestamp, and a collapsible JSON preview of `details`.

Add a `[Clear my dev log]` button that batch-deletes the user's own devLog entries.

---

## 13. Firestore Rules

Add to [`firestore.rules`](firestore.rules) inside the `match /databases/{database}/documents` block, alongside the existing `metrics` rule:

```
match /devLog/{logId} {
  // Server (admin SDK) writes; only the entry owner can read or delete their own entries.
  allow read, delete: if isAuthenticated() && resource.data.uid == request.auth.uid;
  allow create, update: if false;
}

match /metrics/devFlags {
  // Already covered by the catch-all `metrics/{docId}` rule (read,write: if false).
  // Listed here only for documentation. Do NOT add an explicit rule —
  // the existing wildcard already blocks all client access.
}
```

Verify the existing wildcard `match /metrics/{docId} { allow read, write: if false; }` still covers `devFlags`. If yes, no rule change needed for it.

---

## 14. Route Protection in `js/app.js`

Find the existing `data-protected="true"` redirect logic. Add a sibling check:

```javascript
// After confirming auth and finding the page is protected, also check dev-only.
if (document.body.dataset.devOnly === "true") {
  // Defense in depth — backend allowlist is authoritative, this just hides the page faster.
  // The page itself will call devCheckAccess and redirect if not authorized; this line
  // adds nothing actionable until we expose a client-side admin flag, but documenting the
  // pattern for future extension.
}
```

Implementer should leave this stub in place. No client-side allowlist is needed because the backend `devCheckAccess` call gates the UI within ~500ms of page load.

---

## 15. Service Worker Update

Bump cache version and add the new files:

```javascript
const CACHE_NAME = "sugbocents-shell-v155";
const RUNTIME_CACHE = "sugbocents-runtime-v155";

const SHELL_FILES = [
  // ... existing entries ...
  "/dev-notifications.html",
  "/js/dev-notifications.js",
  "/css/dev-notifications.css"
];
```

(Version starts at v155 because Round-3 critical fixes bumped to v154.)

---

## 16. Styling

[`css/dev-notifications.css`](css/dev-notifications.css) should add:

- `.dev-section` — bordered card with padding 16px, margin-bottom 16px, rounded 14px, white background.
- `.dev-button` — green primary using `--brand-700`, padding 8px 14px, rounded.
- `.dev-button.secondary` — outline variant.
- `.dev-button.danger` — red for destructive actions (clear inbox).
- `.dev-log-entry` — monospace font, 12px, light gray border-bottom.
- `.dev-snapshot-grid` — CSS grid 2 cols on mobile, 4 cols on md+.
- `.dev-status-pending` — pulsing dot.
- `.dev-status-ok` — green check.
- `.dev-status-fail` — red X.

Use the existing brand tokens from [`css/style.css`](css/style.css). Do NOT redefine `--brand-*` variables.

---

## 17. Testing the Panel Itself

Before declaring done, run this checklist:

- [ ] Open `dev-notifications.html` while signed-out → app.js redirects to `/login.html`.
- [ ] Open while signed in as a NON-allowlisted user → page shows "Verifying access…" then redirects to `/dashboard.html` within 2s.
- [ ] Open while signed in as an allowlisted user → panel reveals.
- [ ] Snapshot section populates with real data.
- [ ] `[Send test push to me]` → push arrives → click → deep-link works.
- [ ] `[Run streakAtRiskCron at 10pm]` → push arrives even if 6pm sim already consumed cap.
- [ ] `[Reset today's caps]` → snapshot pushCount returns to 0.
- [ ] `[Demo Flow B — Streak journey]` runs end-to-end with 3 notifications arriving in sequence.
- [ ] `[Simulate Brevo failure]` toggle → next email send returns `brevo-error-simulated` and no email arrives.
- [ ] `[Clear inbox]` confirm dialog appears; clicking it batch-deletes; bell badge goes to 0.
- [ ] Dev log live-tail shows every action within 1s of completion.
- [ ] Sign out → page reloads → returns to gate.
- [ ] Production crons still fire correctly on schedule (refactor did not break them — verify with `firebase functions:log`).

---

## 18. Security Review Checklist (DO BEFORE FIRST DEPLOY)

- [ ] `DEV_ADMIN_UIDS` allowlist contains only the human user's uid.
- [ ] `DEV_ADMIN_UIDS` is NOT mirrored in any client JS file.
- [ ] Every callable in `dev-tools.js` calls `assertAdmin(request)` as the first line.
- [ ] `devSetUserState` rejects any key not in the allowlist.
- [ ] `devClearInbox` requires `{ confirm: true }` to proceed.
- [ ] `metrics/devFlags` is blocked from all client reads/writes by the existing rule.
- [ ] `devLog` rules permit only owner reads and server writes.
- [ ] No callable returns the contents of `DEV_ADMIN_UIDS` or any other secret.
- [ ] No callable accepts a `targetUid` parameter — every action operates on `request.auth.uid` only.
- [ ] The page contains a visible "ADMIN ONLY — affects only your account" banner.

---

## 19. Deployment Order

1. Refactor `notifications.js` to extract `process*ForUser` helpers. Deploy and verify production crons still fire (`firebase functions:log --lines 30`).
2. Add `firestore.rules` changes for `devLog`. Deploy rules: `firebase deploy --only firestore:rules`.
3. Create `functions/dev-tools.js`. Add re-exports to `functions/index.js`. Deploy: `firebase deploy --only functions`.
4. Create the HTML/JS/CSS files. Bump SW cache. Deploy hosting: `firebase deploy --only hosting`.
5. Add your uid to `DEV_ADMIN_UIDS`. Re-deploy functions: `firebase deploy --only functions:devCheckAccess,functions:devSendTestNotification` (and the rest).
6. Hard-refresh browser twice.
7. Run §17 checklist.

---

## 20. Out of Scope (DO NOT BUILD)

- Editing other users' data.
- Creating/deleting user accounts.
- Editing email templates.
- Reading other users' inbox or events.
- Bulk operations across users.
- Public sharing of dev panel link.
- Dark mode for the dev panel (out of scope for v1).
- Mobile-optimized layout (desktop-only is fine for v1; demo will use a laptop).

If asked to add any of the above, push back and refer to this document.

---

## 21. If Stuck

If at any point the implementer is uncertain about:
- A function signature → re-read §8.2.
- The cron refactor pattern → re-read §10 example.
- A security boundary → default to "deny" and ask the human.
- UI placement → keep it ugly but functional. Demo polish comes second.
- Whether to expose a feature → if it's not in §8.2 or §12, don't build it.

If the implementer wants to add anything outside this plan, **stop and ask the human** before writing code.

---

## 22. Estimated Order of Operations

1. Backend refactor (extract helpers in `notifications.js`) — ~1 hour.
2. `functions/dev-tools.js` with all 12 callables — ~2 hours.
3. Firestore rules + index file checks — ~15 min.
4. HTML scaffold + CSS — ~30 min.
5. JS panel wiring (sections one at a time, in §12 order) — ~3 hours.
6. Demo flow recipes — ~30 min.
7. SW cache bump + hosting deploy — ~15 min.
8. Smoke testing per §17 — ~1 hour.

Total: roughly half a working day. Do NOT shortcut the security review.
