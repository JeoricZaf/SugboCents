# Notifications — Critical Fixes Plan (Round 3)

> **Hand-off to implementer AI.** This document covers ONLY the bugs that directly affect the usability of the notification + email system today. Performance optimizations, bounce handling, and other tech-debt items are intentionally excluded — they will be handled in a later pass.
>
> Apply tasks in order. Do not skip steps. After all 4 fixes, bump the service worker cache version and run the smoke checklist at the end.

---

## Pre-flight

- Branch: work directly on the current branch.
- Do **not** modify any file outside the list at the bottom of each task.
- Do **not** introduce new dependencies, new ES module imports, or new build steps.
- All JS files remain IIFEs using `var`. UI persistence must continue to go through `window.StorageAPI`.
- After every task, run `npm run lint` (if present) or at minimum visually scan diff for typos. Do not commit until all 4 tasks pass the smoke checklist.

---

## Task 1 — Add foreground push handler (CRITICAL: pushes are currently silent when app is open)

**Why this matters**
FCM web SDK calls `messaging.onBackgroundMessage` only when no SugboCents tab is focused. When the user has SugboCents open in a tab, FCM calls `messaging.onMessage` instead. We currently have **no `onMessage` handler**, so foreground pushes vanish silently. The user gets no toast, no sound, no visual feedback — only the bell badge updates a few hundred ms later via the Firestore `onSnapshot` listener. To the user this looks like the system is broken.

**File to edit**
[`js/notifications.js`](js/notifications.js)

**Where to add**
Inside the IIFE, after the `requestPermissionAndRegister` function and before the `getPrefs` function. Search for the comment block that begins permission/registration and add a new function `wireForegroundMessageListener`, then call it once at the end of the IIFE bootstrap (where other initial wiring happens — typically the bottom of the file inside the auto-run block).

**Exact code to add**

```javascript
function wireForegroundMessageListener() {
  try {
    var ctx = window.FirebaseInit && window.FirebaseInit.getContext
      ? window.FirebaseInit.getContext()
      : null;
    if (!ctx || !ctx.messaging || typeof ctx.messaging.onMessage !== "function") {
      return;
    }
    if (state.foregroundListenerWired === true) {
      return;
    }
    state.foregroundListenerWired = true;

    ctx.messaging.onMessage(function (payload) {
      try {
        var data = (payload && payload.data) ? payload.data : {};
        var title = String(data.title || "SugboCents");
        var body = String(data.body || "");
        var deepLink = String(data.deepLink || "/dashboard.html");
        var eventId = String(data.eventId || "");
        var notificationId = String(data.notificationId || "");

        // Prefer the OS notification surface if permission is granted — looks identical to background pushes.
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          var n = new Notification(title, {
            body: body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: data.type || "sugbocents-notification",
            data: { deepLink: deepLink, eventId: eventId, notificationId: notificationId, type: data.type || "" }
          });
          n.onclick = function (ev) {
            ev.preventDefault();
            try { window.focus(); } catch (_) {}
            try {
              if (eventId) { trackNotificationOpen(eventId); }
            } catch (_) {}
            try { window.location.assign(deepLink); } catch (_) {}
            try { n.close(); } catch (_) {}
          };
          return;
        }

        // Fallback: in-app toast for browsers/sessions without OS notification permission.
        showInAppToast({ title: title, body: body, deepLink: deepLink, eventId: eventId });
      } catch (err) {
        if (window.console && console.warn) {
          console.warn("[Notifications] foreground message handler error:", err);
        }
      }
    });
  } catch (err) {
    if (window.console && console.warn) {
      console.warn("[Notifications] failed to wire foreground listener:", err);
    }
  }
}

function showInAppToast(opts) {
  try {
    var existing = document.getElementById("sugbocentsForegroundToast");
    if (existing && existing.parentNode) { existing.parentNode.removeChild(existing); }

    var toast = document.createElement("div");
    toast.id = "sugbocentsForegroundToast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.style.cssText = [
      "position:fixed",
      "top:16px",
      "right:16px",
      "max-width:320px",
      "padding:12px 14px",
      "border-radius:14px",
      "background:#1f6b46",
      "color:#fff",
      "box-shadow:0 8px 24px rgba(0,0,0,0.18)",
      "font-family:'Plus Jakarta Sans',sans-serif",
      "font-size:14px",
      "line-height:1.35",
      "z-index:99999",
      "cursor:pointer"
    ].join(";");
    toast.innerHTML =
      '<div style="font-weight:700;margin-bottom:2px;">' + escapeHtml(opts.title || "SugboCents") + "</div>" +
      '<div style="opacity:0.92;">' + escapeHtml(opts.body || "") + "</div>";

    toast.addEventListener("click", function () {
      try { if (opts.eventId) { trackNotificationOpen(opts.eventId); } } catch (_) {}
      try { window.location.assign(opts.deepLink || "/dashboard.html"); } catch (_) {}
    });

    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast && toast.parentNode) { toast.parentNode.removeChild(toast); }
    }, 6000);
  } catch (_) { /* swallow — toast is best-effort */ }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

**Wiring the call**

Find the bottom of the IIFE where `window.NotificationsAPI = { ... };` is exported. Immediately **before** that export, add:

```javascript
// Foreground push handler — required so users with the app open still see notifications.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireForegroundMessageListener);
} else {
  wireForegroundMessageListener();
}
```

If `state` does not yet exist in the IIFE scope (it should — it's used elsewhere), do NOT create a new one; the listener-wired flag should live on the existing `state` object. If for some reason there is no `state` object, declare a `var state = {};` near the top of the IIFE.

**Acceptance**
1. Open `dashboard.html` in Chrome with the tab focused.
2. From a second device or the future dev panel, send a push to your uid.
3. **Native OS notification must appear** within 1–2 seconds, identical in appearance to a background push.
4. Click the notification → browser focuses the tab and navigates to the deep-link.
5. Bell badge decrements after marking the inbox doc read.

**Files touched**: [`js/notifications.js`](js/notifications.js) only.

---

## Task 2 — Eliminate the open-tracking race (CRITICAL: open tracking silently fails on fast clicks)

**Why this matters**
In `sendNotification`, the FCM push is dispatched **before** the `notificationEvents/{eventId}` document is written to Firestore. If the user clicks the notification within ~50–200 ms (entirely possible on a fast device), the client tries to update a document that does not yet exist. Firestore security rules require `resource.data.uid == request.auth.uid` for the update to succeed — but `resource.data` is null for a non-existent doc, so the write is rejected. Open tracking is silently lost for a fraction of clicks. As FCM gets faster the failure rate grows.

**File to edit**
[`functions/notifications.js`](functions/notifications.js)

**Where**
Inside the `sendNotification` function, the block that currently looks like this (around line 286 onward):

```javascript
  // Pre-allocate IDs (without writing yet) so the push payload can reference them.
  const eventRef = db.collection("notificationEvents").doc();
  const inboxRef = db.collection("users").doc(uid).collection("notifications").doc();
  const eventId = eventRef.id;
  const notificationId = inboxRef.id;
```

… and the matching final block that writes both docs only `if (delivered)`.

**The fix**
Write a minimal `notificationEvents` stub **before** the push goes out (so the doc exists with the correct `uid` if the user clicks instantly), and then do the conditional final-state writes after delivery resolves. The inbox doc still only writes if delivered.

**Exact replacement**

Replace the existing pre-allocate block + the delivery-conditional write block in `sendNotification` so the function reads as follows (only the changed sections shown — keep the surrounding code identical):

```javascript
  // Pre-allocate IDs and immediately reserve the notificationEvents row with uid
  // so that fast clicks (which happen before sendPush resolves) pass the security rule.
  const eventRef = db.collection("notificationEvents").doc();
  const inboxRef = db.collection("users").doc(uid).collection("notifications").doc();
  const eventId = eventRef.id;
  const notificationId = inboxRef.id;

  await eventRef.set({
    uid,
    type: payload.type || "generic",
    channel: payload.channel || "push",
    deepLink: payload.deepLink || "/dashboard.html",
    sentAt: null,            // filled in on delivery
    openedAt: null,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
```

Then leave the existing push/email dispatch code unchanged. **Replace the final `if (delivered) { ... }` block** with this:

```javascript
  const delivered = (Number(results.push.sent) || 0) > 0 || (Number(results.email.sent) || 0) > 0;
  if (delivered) {
    const channelLabel = (Number(results.push.sent) || 0) > 0
      ? ((Number(results.email.sent) || 0) > 0 ? "both" : "push")
      : "email";

    await eventRef.set({
      channel: channelLabel,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "delivered"
    }, { merge: true });

    await inboxRef.set({
      type: payload.type || "generic",
      title: payload.title || "SugboCents",
      body: payload.body || "",
      deepLink: payload.deepLink || "/dashboard.html",
      channel: channelLabel,
      eventId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      readAt: null
    });

    results.eventId = eventId;
    results.notificationId = notificationId;
  } else {
    // Mark the pre-allocated event row as undelivered so it doesn't pollute analytics.
    await eventRef.set({
      status: "undelivered",
      undeliveredReason: JSON.stringify({
        push: results.push.reason || null,
        email: results.email.reason || null
      })
    }, { merge: true });
  }

  return results;
```

**Acceptance**
1. Trigger any push notification.
2. Within Firestore Console, confirm a `notificationEvents/{id}` doc is created with `status: "pending"` BEFORE the push arrives, then transitions to `status: "delivered"` shortly after.
3. Click a notification within 1 second of arrival → `openedAt` is filled successfully (no rule rejection in browser console).
4. When delivery fails (e.g., quiet hours block + email disabled), event doc still exists with `status: "undelivered"`. **No inbox doc is created.**
5. Existing inbox semantics are unchanged.

**Files touched**: [`functions/notifications.js`](functions/notifications.js) only. Firestore rules already permit this — no rule changes needed because admin SDK bypasses rules and the client only updates `openedAt`.

---

## Task 3 — Reset `lapsedStagesSent` on login, not only on expense (HIGH: users get stuck in the lapsed ladder)

**Why this matters**
`lapsedStagesSent` is currently cleared only inside `onExpenseWriteTrigger`. A user who logs back in but doesn't immediately add an expense never has the field cleared. If they lapse again, the `lapsedUserCron` checks `!sent.dN` and skips them — they never receive the d3 nudge again. The whole re-engagement ladder fails for any returning user who browses without expensing.

**This task has two parts**: a server-side trigger AND a client-side login hook (defense in depth).

### Part A — Server side: clear on `lastLoginAt` change

**File to edit**
[`functions/notifications.js`](functions/notifications.js)

**Where**
Inside `onUserWriteTrigger`. Find the function definition (around line 700+ in the current file). Currently it handles the new-user branch (`if (!beforeExists)`). Add a sibling branch that runs on UPDATE when `lastLoginAt` advances.

**Exact code to add**

After the existing `if (!beforeExists) { ... await sendNotification(...welcome...); return; }` block (and before the function's closing brace), add:

```javascript
  // On any user-doc update where lastLoginAt advanced AND the user has lapsed-stage history,
  // clear the ladder so a subsequent re-lapse will re-trigger the d3 nudge.
  try {
    const beforeData = (event.data.before && event.data.before.exists) ? event.data.before.data() : {};
    const beforeLogin = toDate(beforeData.lastLoginAt);
    const afterLogin = toDate(afterData.lastLoginAt);
    const loginAdvanced = !!afterLogin && (!beforeLogin || afterLogin.getTime() > beforeLogin.getTime());

    if (loginAdvanced && afterData.lapsedStagesSent && typeof afterData.lapsedStagesSent === "object") {
      await event.data.after.ref.update({
        lapsedStagesSent: admin.firestore.FieldValue.delete()
      });
    }
  } catch (err) {
    console.error(`[onUserWriteTrigger] lapsed reset failed for uid=${event.params.uid}:`, err && err.message ? err.message : err);
  }
```

Also, **fix the wasteful blanket delete in `onExpenseWriteTrigger`**. Find this line (currently runs on every expense):

```javascript
  await db.collection("users").doc(uid).update({
    lapsedStagesSent: admin.firestore.FieldValue.delete()
  }).catch(() => {});
```

Replace with a guarded version (uses the already-fetched `userSnap`):

```javascript
  // Only delete when the field actually exists — avoids one wasted write per expense for active users.
  if (userSnap.exists) {
    const _u = userSnap.data() || {};
    if (_u.lapsedStagesSent && typeof _u.lapsedStagesSent === "object" && Object.keys(_u.lapsedStagesSent).length > 0) {
      await db.collection("users").doc(uid).update({
        lapsedStagesSent: admin.firestore.FieldValue.delete()
      }).catch(() => {});
    }
  }
```

> **Important**: the existing code already does `const userSnap = await db.collection("users").doc(uid).get();` at the top of the trigger. Move the lapsed-clear block to AFTER that fetch (it may already be after — confirm). Do NOT add a second `get()`.

### Part B — Client side: write `lastLoginAt` on every authenticated session start

**File to edit**
[`js/firebase-auth-service.js`](js/firebase-auth-service.js) (or whichever file owns the `onAuthStateChanged` callback that runs once per session — search for `onAuthStateChanged` and pick the first listener that fires for protected pages).

**Where**
Inside the `onAuthStateChanged` callback, after the user is confirmed signed-in and **once per browser session** (gate with `sessionStorage`), write `lastLoginAt` to the user doc.

**Exact code to add**

```javascript
// Stamp lastLoginAt once per browser session so the lapsed-ladder reset can fire server-side.
try {
  if (user && user.uid && !sessionStorage.getItem("sugbocents:lastLoginStamped")) {
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
} catch (_) { /* non-fatal */ }
```

If `FirestoreService.setUserDoc` writes serverTimestamp via a special sentinel, prefer that. Otherwise the ISO string is fine — `toDate()` in the trigger handles both.

**Acceptance**
1. Set a test user's `lapsedStagesSent` to `{ d3: <timestamp>, d7: <timestamp> }` in Firestore Console.
2. Sign in as that user in the browser.
3. Within ~5 seconds, the user doc's `lapsedStagesSent` field is **deleted** (verify in Firestore Console).
4. The user did NOT have to add an expense for this to happen.
5. For active users, adding an expense no longer writes to `lapsedStagesSent` (no log entry; field stays absent). Verify in Firestore Console that an expense write does NOT bump the user doc's update time when the field is already absent.

**Files touched**: [`functions/notifications.js`](functions/notifications.js), [`js/firebase-auth-service.js`](js/firebase-auth-service.js).

---

## Task 4 — Auto-mark email-only inbox notifications as read after a grace period (HIGH: bell badge accumulates forever)

**Why this matters**
Email-only notifications (weekly digest, lapsed d7/d14/d30, streak-broken) write an inbox doc the user can never naturally clear because they read the email outside the app. After a few weeks the bell badge climbs to "99+" and becomes meaningless. Users start ignoring it, defeating the purpose of the inbox.

**Decision**: auto-mark email-only inbox docs as read 24 hours after delivery. They remain visible in the drawer (history) but stop incrementing the badge.

**File to edit**
[`functions/notifications.js`](functions/notifications.js)

**Where**
Add a new scheduled function next to the other crons. Place it after `lapsedUserCron`.

**Exact code to add**

```javascript
exports.autoReadEmailInboxCron = onSchedule({
  schedule: "30 * * * *", // hourly at :30 (offset from other crons to spread load)
  timeZone: TZ,
  region: REGION
}, async () => {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  // Use a collectionGroup query to scan all users' inbox in one pass.
  const snap = await db.collectionGroup("notifications")
    .where("channel", "==", "email")
    .where("readAt", "==", null)
    .where("sentAt", "<=", cutoff)
    .limit(500)
    .get();

  if (snap.empty) {
    return;
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      readAt: admin.firestore.FieldValue.serverTimestamp(),
      autoReadReason: "email-grace-period-24h"
    });
  });
  await batch.commit();
  console.log(`[autoReadEmailInboxCron] auto-read ${snap.size} email inbox docs`);
});
```

**Required: composite index**

This query needs a Firestore composite index on the `notifications` collection group:

- `channel` Ascending
- `readAt` Ascending
- `sentAt` Ascending

**Add to [`firestore.indexes.json`](firestore.indexes.json)** under the `indexes` array (create the file if it does not exist; if it does, add this entry):

```json
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "channel", "order": "ASCENDING" },
    { "fieldPath": "readAt", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "ASCENDING" }
  ]
}
```

If `firestore.indexes.json` does not exist in the repo, create it with this full content:

```json
{
  "indexes": [
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "channel", "order": "ASCENDING" },
        { "fieldPath": "readAt", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then ensure [`firebase.json`](firebase.json) has a `firestore.indexes` entry pointing at this file:

```json
"firestore": {
  "rules": "firestore.rules",
  "indexes": "firestore.indexes.json"
}
```

Deploy the index with:

```powershell
Set-Location "c:\Users\PC\Downloads\SugboCents Web App"
npx -y firebase-tools@latest deploy --only firestore:indexes
```

Wait for the index to finish building (visible in Firebase Console → Firestore → Indexes) before relying on the cron output.

**Export**

Make sure the new function is exported from [`functions/index.js`](functions/index.js). Find the existing `notif` re-exports block (around line 1220) and add:

```javascript
exports.autoReadEmailInboxCron = notif.autoReadEmailInboxCron;
```

**Acceptance**
1. Send an email-only notification (e.g., weekly digest preview) to a test user.
2. Confirm the inbox doc has `channel: "email"`, `readAt: null`, `sentAt: <recent>`.
3. Manually edit `sentAt` in Firestore Console to a timestamp 25 hours ago.
4. Trigger the cron (Firebase Console → Functions → autoReadEmailInboxCron → "Run now") — or wait for the next :30 of the hour.
5. Verify the doc now has `readAt: <timestamp>` and `autoReadReason: "email-grace-period-24h"`.
6. Bell badge listener (`where readAt == null`) no longer counts this doc.
7. The doc still appears in the drawer's history list.

**Files touched**: [`functions/notifications.js`](functions/notifications.js), [`functions/index.js`](functions/index.js), [`firestore.indexes.json`](firestore.indexes.json) (create if missing), possibly [`firebase.json`](firebase.json) (only if `firestore.indexes` entry is missing).

---

## Service Worker Cache Bump

After all 4 tasks are merged, bump the cache version.

**File**: [`sw.js`](sw.js)

```diff
- const CACHE_NAME = "sugbocents-shell-v153";
- const RUNTIME_CACHE = "sugbocents-runtime-v153";
+ const CACHE_NAME = "sugbocents-shell-v154";
+ const RUNTIME_CACHE = "sugbocents-runtime-v154";
```

No other SW changes are required for these 4 tasks.

---

## Deployment Order

1. Deploy Firestore indexes first (Task 4): `firebase deploy --only firestore:indexes`. Wait until status is "Enabled" in console.
2. Deploy Cloud Functions: `firebase deploy --only functions:autoReadEmailInboxCron,functions:onUserWriteTrigger,functions:onExpenseWriteTrigger,functions:weeklyDigestCron` (or simply `--only functions` if you've staged this in isolation).
3. Deploy hosting (sw.js + js changes): `firebase deploy --only hosting`.
4. Hard-refresh the browser to pick up the new service worker (`Ctrl+Shift+R` twice on Chrome).

---

## Smoke Checklist (run all 8 before declaring done)

- [ ] **T1** — Open dashboard with tab focused → trigger any push → native notification appears.
- [ ] **T1** — Click foreground notification → focuses tab, navigates to deep-link, marks inbox doc read.
- [ ] **T1** — Background push (tab closed) still works exactly as before.
- [ ] **T2** — Trigger push → `notificationEvents/{id}` exists with `status: "pending"` then transitions to `"delivered"`.
- [ ] **T2** — Trigger send into quiet hours with no email enabled → doc exists with `status: "undelivered"`, no inbox doc.
- [ ] **T3** — Sign in as a user with seeded `lapsedStagesSent` → field is deleted within 5 seconds, no expense required.
- [ ] **T3** — Active user adds expense → user doc's `lapsedStagesSent` field stays absent, no needless write.
- [ ] **T4** — Email-only inbox doc with `sentAt` 25h old → cron run marks it read; bell badge stops counting it.

---

## Out of Scope (explicitly do NOT touch in this round)

- Brevo bounce/complaint webhook handling.
- Cron pagination for large user bases.
- Cloud Scheduler retry idempotency keys for `weeklyDigestCron`.
- Welcome email + d1 onboarding overlap.
- `metrics/emailQuota_*` doc TTL/cleanup.
- XP_LEVELS duplication between client and server.
- `subscribeInbox` listener teardown on logout.

These will be addressed after the dev testing panel is built (separate plan).

---

## If Something Goes Wrong

If any task fails its acceptance check:

1. Revert that task's diff only (do not roll back successful tasks).
2. Comment in the PR with the exact error message and the Firebase Functions log lines (`firebase functions:log --only <fnName> --lines 50`).
3. Do not proceed to the dev testing panel until all 4 tasks pass.
