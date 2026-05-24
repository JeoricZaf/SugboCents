# Notifications System — Production Hardening Plan

> **Audience:** AI implementer.
> **Pre-reads (mandatory):**
> 1. `docs/NOTIFICATIONS_IMPLEMENTATION_PLAN.md` — original spec.
> 2. `.github/copilot-instructions.md` — non-negotiable project conventions.
> 3. `js/storage.js` lines 2110–2200 — existing `getNotificationPrefs` / `setNotificationPrefs`.
>
> **Definition of done:** every numbered task below has an explicit acceptance test. The PR is not mergeable until ALL acceptance tests pass.
>
> **Conventions reminders (do not violate):**
> - Every browser JS file is a self-contained IIFE. Use `var`, not `let`/`const`.
> - UI persistence goes through `window.StorageAPI`. Never call `localStorage` directly from UI code.
> - HTML files use `<meta charset="UTF-8">`. Emojis must be real Unicode.
> - Currency formatted with `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`.
> - Bump `CACHE_NAME` and `RUNTIME_CACHE` in `sw.js` (currently `v152`) on any shell file change.
> - Time zone for all crons: `Asia/Manila`.

---

## Table of Contents

- [Task 1 — Fix duplicate FCM notifications](#task-1--fix-duplicate-fcm-notifications-critical-c1)
- [Task 2 — Fix `notificationEvents` Firestore rules so open-tracking works](#task-2--fix-notificationevents-firestore-rules-critical-c2)
- [Task 3 — Exempt streak last-call from daily push cap](#task-3--exempt-streak-last-call-from-daily-push-cap-critical-c3)
- [Task 4 — Make lapsed-user ladder resilient to missed cron runs](#task-4--make-lapsed-user-ladder-resilient-to-missed-cron-runs-critical-c4)
- [Task 5 — Persist email quota counter in Firestore](#task-5--persist-email-quota-counter-in-firestore-critical-c5)
- [Task 6 — Move inbox + event creation AFTER guards](#task-6--move-inbox--event-creation-after-guards-medium-m1)
- [Task 7 — Wrap per-user cron iterations in try/catch](#task-7--wrap-per-user-cron-iterations-in-trycatch-medium-m3)
- [Task 8 — Split weekly digest across 4 days (Brevo headroom)](#task-8--split-weekly-digest-across-4-days-brevo-headroom-scaling)
- [Task 9 — Smoke-test checklist](#task-9--smoke-test-checklist)

---

## Task 1 — Fix duplicate FCM notifications (CRITICAL, C1)

### Problem
On Chrome/Android, when an FCM message contains BOTH a `notification` payload and the SW's `onBackgroundMessage` calls `showNotification(...)` manually, the user sees the push **twice**.

### Root cause
`functions/notifications.js` `sendPush()` sends a payload with both `notification: {title, body}` and `data: {...}`. The browser auto-displays the `notification` block AND fires `onBackgroundMessage` which displays it again.

### Fix
Send **data-only messages**. The SW's `onBackgroundMessage` is the single source of truth for what the user sees.

### File: [`functions/notifications.js`](functions/notifications.js)

**Find** the `sendPush` function (around line 110):

```js
async function sendPush(uid, payload) {
  const db = admin.firestore();
  const tokensSnap = await db.collection("users").doc(uid).collection("fcmTokens").get();
  if (tokensSnap.empty) {
    return { sent: 0, reason: "no-tokens" };
  }

  const docs = tokensSnap.docs.filter((d) => !!(d.data() && d.data().token));
  const tokens = docs.map((d) => d.data().token);
  if (!tokens.length) {
    return { sent: 0, reason: "no-tokens" };
  }

  const message = {
    tokens,
    notification: {
      title: payload.title || "SugboCents",
      body: payload.body || ""
    },
    data: {
      type: payload.type || "generic",
      deepLink: payload.deepLink || "/dashboard.html",
      eventId: payload.eventId || "",
      notificationId: payload.notificationId || ""
    },
    webpush: {
      fcmOptions: {
        link: payload.deepLink || "/dashboard.html"
      }
    }
  };
```

**Replace the `message` object** with the data-only form:

```js
  const message = {
    tokens,
    data: {
      type: payload.type || "generic",
      title: String(payload.title || "SugboCents"),
      body: String(payload.body || ""),
      deepLink: payload.deepLink || "/dashboard.html",
      eventId: payload.eventId || "",
      notificationId: payload.notificationId || ""
    },
    webpush: {
      headers: {
        Urgency: "high"
      }
    }
  };
```

### File: [`sw.js`](sw.js)

**Verify** the `onBackgroundMessage` handler reads `title`/`body` from `payload.data` (not `payload.notification`). It already does this fallback chain — keep it as-is. Confirm by re-reading lines 71–95.

### Acceptance test
1. Bump `CACHE_NAME` and `RUNTIME_CACHE` in `sw.js` to `v153`.
2. Deploy: `npx -y firebase-tools@latest deploy --only functions:dailyReminderCron,hosting`.
3. On Chrome desktop: enable push, then in `functions:shell` run `dailyReminderCron()`.
4. **Expected**: exactly **1** notification toast, with the correct title and body.
5. Click it → opens the deep link `/dashboard.html`.

---

## Task 2 — Fix `notificationEvents` Firestore rules (CRITICAL, C2)

### Problem
`firestore.rules` line 214 blocks ALL writes to `notificationEvents`. The browser's `trackNotificationOpen()` writes `{ openedAt: serverTimestamp }` from the client → permission-denied → all open-tracking is silently lost.

### Decision
Allow the **owning user** to update **only the `openedAt` field** of their own event docs.

### File: [`firestore.rules`](firestore.rules)

**Find** (around line 214):

```
    match /notificationEvents/{eventId} {
      allow read, write: if false;
    }
```

**Replace with**:

```
    match /notificationEvents/{eventId} {
      // Server (admin SDK) bypasses these rules; clients are tightly scoped.
      allow read: if isAuthenticated() && resource.data.uid == request.auth.uid;
      allow update: if isAuthenticated()
                    && resource.data.uid == request.auth.uid
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["openedAt"])
                    && request.resource.data.openedAt is timestamp;
      allow create, delete: if false;
    }
```

### File: [`functions/notifications.js`](functions/notifications.js)

**Verify** `createEvent` writes `uid` into the doc (it already does — confirm around line 235). No change needed.

### Acceptance test
1. Deploy: `npx -y firebase-tools@latest deploy --only firestore:rules`.
2. Trigger any push to yourself, click the notification.
3. In Firestore Console → `notificationEvents/{eventId}` → `openedAt` should now be a non-null timestamp.
4. From a different user's session, attempt to update someone else's event doc → must fail with permission-denied.

---

## Task 3 — Exempt streak last-call from daily push cap (CRITICAL, C3)

### Problem
`PUSH_DAILY_CAP = 1`. The 6pm soft streak push consumes the daily slot, so the 10pm last-call (the highest-ROI message of the day) is **silently blocked** by `checkAndIncrementCap` returning `daily-cap`.

### Decision
Add an explicit `bypassDailyCap` flag on the payload. The 10pm last-call sets it. Weekly cap still applies (so a single user can't get spammed with 7 last-calls in a week).

### File: [`functions/notifications.js`](functions/notifications.js)

#### 3a. Update `sendNotification` to honor the flag

**Find** (around line 295):

```js
  if (wantsPush && !quiet) {
    const cap = await checkAndIncrementCap(uid, "push", payload.type || "generic", false);
    if (cap.allowed) {
      results.push = await sendPush(uid, Object.assign({}, payload, { eventId, notificationId }));
    } else {
      results.push = { sent: 0, reason: cap.reason };
    }
  } else if (wantsPush && quiet) {
    results.push = { sent: 0, reason: "quiet-hours" };
  }
```

**Replace with**:

```js
  if (wantsPush && !quiet) {
    const cap = await checkAndIncrementCap(
      uid,
      "push",
      payload.type || "generic",
      false,
      payload.bypassDailyCap === true
    );
    if (cap.allowed) {
      results.push = await sendPush(uid, Object.assign({}, payload, { eventId, notificationId }));
    } else {
      results.push = { sent: 0, reason: cap.reason };
    }
  } else if (wantsPush && quiet) {
    results.push = { sent: 0, reason: "quiet-hours" };
  }
```

#### 3b. Update `checkAndIncrementCap` signature

**Find** (around line 215):

```js
async function checkAndIncrementCap(uid, channel, type, isDigest) {
  const db = admin.firestore();
  const dayKey = todayKeyPH();
  const ref = db.collection("users").doc(uid).collection("notificationLog").doc(dayKey);

  const weeklyCount = await getWeeklyCount(uid, channel);
  const weeklyCap = channel === "push" ? PUSH_WEEKLY_CAP : (isDigest ? 9999 : EMAIL_WEEKLY_CAP_NON_DIGEST);
  if (weeklyCount >= weeklyCap) {
    return { allowed: false, reason: "weekly-cap" };
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { pushCount: 0, emailCount: 0, types: [] };
    const current = Number(channel === "push" ? data.pushCount : data.emailCount) || 0;
    const dailyCap = channel === "push" ? PUSH_DAILY_CAP : EMAIL_DAILY_CAP;

    if (current >= dailyCap) {
      return { allowed: false, reason: "daily-cap" };
    }
```

**Replace with**:

```js
async function checkAndIncrementCap(uid, channel, type, isDigest, bypassDailyCap) {
  const db = admin.firestore();
  const dayKey = todayKeyPH();
  const ref = db.collection("users").doc(uid).collection("notificationLog").doc(dayKey);

  const weeklyCount = await getWeeklyCount(uid, channel);
  const weeklyCap = channel === "push" ? PUSH_WEEKLY_CAP : (isDigest ? 9999 : EMAIL_WEEKLY_CAP_NON_DIGEST);
  if (weeklyCount >= weeklyCap) {
    return { allowed: false, reason: "weekly-cap" };
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { pushCount: 0, emailCount: 0, types: [] };
    const current = Number(channel === "push" ? data.pushCount : data.emailCount) || 0;
    const dailyCap = channel === "push" ? PUSH_DAILY_CAP : EMAIL_DAILY_CAP;

    if (current >= dailyCap && bypassDailyCap !== true) {
      return { allowed: false, reason: "daily-cap" };
    }
```

#### 3c. Set the flag on last-call

**Find** in `streakAtRiskCron` (around line 460):

```js
    await sendNotification(doc.id, {
      type: isLastCall ? "streak-at-risk-last" : "streak-at-risk-soft",
      channel: "push",
      title: isLastCall ? `⏰ 2 hours left, ${u.firstName || "friend"}` : "🔥 Streak in danger",
      body: isLastCall
        ? `Your ${streak}-day streak ends at midnight.`
        : `Your ${streak}-day streak is in danger. 30 seconds to save it.`,
      deepLink: "/dashboard.html?from=streak",
      allowQuietHourException: isLastCall
    });
```

**Replace with** (only the new line is `bypassDailyCap`):

```js
    await sendNotification(doc.id, {
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
```

### Acceptance test
1. Seed a test user with `currentStreak: 3`, `lastExpenseDate` = yesterday's PH date.
2. In `functions:shell`: simulate 6pm by hardcoding `nowInPHHour` to return 18, run `streakAtRiskCron()` → push fires, `notificationLog/{today}.pushCount` = 1.
3. Hardcode `nowInPHHour` to 22, run `streakAtRiskCron()` again → push **must still fire**, `pushCount` becomes 2.
4. Run a third arbitrary cron same day → daily cap correctly blocks it (push count stays at 2).
5. Revert the hardcoding.

---

## Task 4 — Make lapsed-user ladder resilient to missed cron runs (CRITICAL, C4)

### Problem
`lapsedUserCron` uses strict equality: `if (daysInactive === 3) stage = "d3";`. If the cron skips a day (Cloud Scheduler delay or transient Firestore error), the user lands on day 4 → the d3 stage is **never sent for that user**. Same for d7/d14/d30.

### Decision
Use range checks (`>=`) **plus** a per-user `lapsedStagesSent` map so we don't double-send if the cron retries the same day or runs across rollovers.

### File: [`functions/notifications.js`](functions/notifications.js)

**Find** the entire `lapsedUserCron` (around line 700):

```js
exports.lapsedUserCron = onSchedule({
  schedule: "0 9 * * *",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const doc of users.docs) {
    const u = doc.data() || {};
    const lastLogin = toDate(u.lastLoginAt);
    if (!lastLogin) { continue; }

    const daysInactive = Math.floor((now - lastLogin.getTime()) / dayMs);
    let stage = "";
    if (daysInactive === 3) { stage = "d3"; }
    else if (daysInactive === 7) { stage = "d7"; }
    else if (daysInactive === 14) { stage = "d14"; }
    else if (daysInactive === 30) { stage = "d30"; }
    if (!stage) { continue; }

    const copy = LAPSED_COPY[stage];
    await sendNotification(doc.id, {
      type: `lapsed-${stage}`,
      channel: stage === "d3" ? "both" : "email",
      title: copy.title,
      body: copy.body,
      subject: copy.subject,
      html: emailTemplate(`lapsed-${stage}`, { firstName: u.firstName || "friend" }),
      deepLink: "/dashboard.html"
    });
  }
});
```

**Replace with**:

```js
exports.lapsedUserCron = onSchedule({
  schedule: "0 9 * * *",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const doc of users.docs) {
    try {
      const u = doc.data() || {};
      const lastLogin = toDate(u.lastLoginAt);
      if (!lastLogin) { continue; }

      const daysInactive = Math.floor((now - lastLogin.getTime()) / dayMs);
      const sent = (u.lapsedStagesSent && typeof u.lapsedStagesSent === "object") ? u.lapsedStagesSent : {};

      // Choose the highest stage the user qualifies for that hasn't been sent.
      // Order matters: d30 first so a long-lapsed user doesn't get d3 today.
      let stage = "";
      if (daysInactive >= 30 && !sent.d30) { stage = "d30"; }
      else if (daysInactive >= 14 && !sent.d14) { stage = "d14"; }
      else if (daysInactive >= 7 && !sent.d7) { stage = "d7"; }
      else if (daysInactive >= 3 && !sent.d3) { stage = "d3"; }
      if (!stage) { continue; }

      const copy = LAPSED_COPY[stage];
      await sendNotification(doc.id, {
        type: `lapsed-${stage}`,
        channel: stage === "d3" ? "both" : "email",
        title: copy.title,
        body: copy.body,
        subject: copy.subject,
        html: emailTemplate(`lapsed-${stage}`, { firstName: u.firstName || "friend" }),
        deepLink: "/dashboard.html"
      });

      // Record that this stage has been sent so we never re-send.
      const stagesPatch = {};
      stagesPatch[`lapsedStagesSent.${stage}`] = admin.firestore.FieldValue.serverTimestamp();
      await doc.ref.update(stagesPatch);
    } catch (err) {
      console.error(`[lapsedUserCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
      // continue to next user
    }
  }
});
```

#### 4b. Reset on re-engagement

When a user logs in or logs an expense after being lapsed, clear `lapsedStagesSent` so future lapses are tracked fresh.

**File:** [`functions/notifications.js`](functions/notifications.js) — at the **top of `onExpenseWriteTrigger`** (around line 580), after the existing existence check, add:

```js
  // Re-engaged: clear lapsed-stage history so the ladder restarts on next inactivity.
  await db.collection("users").doc(uid).update({
    lapsedStagesSent: admin.firestore.FieldValue.delete()
  }).catch(() => {});
```

> Place it **after** `const userSnap = await db.collection("users").doc(uid).get();` so we don't double-fetch.

### Acceptance test
1. Seed user A with `lastLoginAt` = 5 days ago, no `lapsedStagesSent` field. Run `lapsedUserCron()` → must send `lapsed-d3` (proves `>=` works for late detection).
2. Same user, run `lapsedUserCron()` again same day → must NOT re-send (proves stage gate works).
3. Seed user B with `lastLoginAt` = 35 days ago and `lapsedStagesSent: { d3: <date>, d7: <date>, d14: <date> }`. Run cron → must send `d30` only.
4. Add an expense for user A → check Firestore: `lapsedStagesSent` field is gone.

---

## Task 5 — Persist email quota counter in Firestore (CRITICAL, C5)

### Problem
`functions/notifications.js` uses module-level `let emailsSentToday = 0` as the safety guard against blowing past Brevo's 300/day cap. Cloud Functions cold-starts and parallel instances **reset this to 0**, so during heavy fan-out (Sunday digest at scale) we can blow past Brevo's limit and get the account suspended.

### Decision
Replace the in-memory counter with a Firestore transaction on `metrics/emailQuota/{YYYY-MM-DD}`. Runs on every send (~1 extra read + 1 write).

### File: [`functions/notifications.js`](functions/notifications.js)

#### 5a. Delete the in-memory counter

**Find** (around line 25):

```js
let emailsSentToday = 0;
let emailsSentDate = "";
```

**Delete both lines.**

#### 5b. Add a Firestore-backed quota helper

**Add** this function near the top of the file (after `getDefaultPrefs` is fine, around line 90):

```js
async function reserveEmailQuotaSlot() {
  const db = admin.firestore();
  const dayKey = todayKeyPH();
  const ref = db.collection("metrics").doc(`emailQuota_${dayKey}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data().count || 0) : 0;
    if (current >= EMAIL_DAILY_QUOTA_GUARD) {
      return { allowed: false, current };
    }
    tx.set(ref, {
      count: current + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { allowed: true, current: current + 1 };
  });
}
```

#### 5c. Replace the guard inside `sendEmail`

**Find** (around line 165):

```js
async function sendEmail(uid, userDoc, payload) {
  const today = new Date().toISOString().slice(0, 10);
  if (emailsSentDate !== today) {
    emailsSentDate = today;
    emailsSentToday = 0;
  }
  if (emailsSentToday >= EMAIL_DAILY_QUOTA_GUARD) {
    return { sent: 0, reason: "daily-quota-guard" };
  }

  const email = String(userDoc.email || "").trim().toLowerCase();
  if (!email) {
    return { sent: 0, reason: "missing-email" };
  }
```

**Replace with**:

```js
async function sendEmail(uid, userDoc, payload) {
  const email = String(userDoc.email || "").trim().toLowerCase();
  if (!email) {
    return { sent: 0, reason: "missing-email" };
  }

  const slot = await reserveEmailQuotaSlot();
  if (!slot.allowed) {
    console.warn(`[sendEmail] daily quota guard hit at ${slot.current} — uid=${uid} type=${payload.type}`);
    return { sent: 0, reason: "daily-quota-guard" };
  }
```

#### 5d. Remove the in-memory increment after successful send

**Find** (still inside `sendEmail`, around line 200):

```js
  try {
    await api.sendTransacEmail(mail);
    emailsSentToday += 1;
    return { sent: 1 };
  } catch (e) {
```

**Replace with**:

```js
  try {
    await api.sendTransacEmail(mail);
    return { sent: 1 };
  } catch (e) {
```

> Note: We **reserve the slot before sending**. If Brevo returns an error, the slot is consumed but no email went out. This is a deliberately conservative trade-off — we'd rather under-send than blow past the quota.

### File: [`firestore.rules`](firestore.rules)

**Add** a new rules block (place it next to `notificationEvents`, around line 215):

```
    match /metrics/{docId} {
      // Server-only counters. Clients have no business reading or writing these.
      allow read, write: if false;
    }
```

### Acceptance test
1. Set `EMAIL_DAILY_QUOTA_GUARD = 3` temporarily for the test.
2. In `functions:shell`, fire 4 emails in a row to test users.
3. **Expected**: emails 1, 2, 3 send. Email 4 returns `{ sent: 0, reason: "daily-quota-guard" }`.
4. Verify `metrics/emailQuota_2026-MM-DD.count` in Firestore equals 3.
5. Revert `EMAIL_DAILY_QUOTA_GUARD = 95`.

---

## Task 6 — Move inbox + event creation AFTER guards (MEDIUM, M1)

### Problem
`sendNotification` writes the inbox doc and analytics event **before** checking prefs, quiet hours, and frequency caps. Result: a user with `pushEnabled:false, emailEnabled:false` still sees a phantom unread badge for every notification we never delivered. The bell counter lies.

### Decision
Compute "did we actually deliver something" first. Only write the inbox doc + event if at least one channel succeeded. Use a single `eventId` (generated locally with `db.collection("notificationEvents").doc().id`) so the push payload references it before the doc exists; we write the doc only if delivery succeeded.

### File: [`functions/notifications.js`](functions/notifications.js)

**Find** the entire `sendNotification` function (around line 265):

```js
async function sendNotification(uid, payload) {
  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return { error: "user-not-found" };
  }

  const userDoc = userSnap.data() || {};
  const prefs = Object.assign({}, getDefaultPrefs(), userDoc.notificationPrefs || {});
  const channel = payload.channel || "push";
  const wantsPush = (channel === "push" || channel === "both") && prefs.pushEnabled === true;
  const wantsEmail = (channel === "email" || channel === "both") && prefs.emailEnabled !== false;
  const quiet = isInQuietHours(prefs, !!payload.allowQuietHourException);

  const eventId = await createEvent(uid, payload);
  const notificationId = await addInboxNotification(uid, payload, eventId);

  const results = {
    eventId,
    notificationId,
    push: { sent: 0, reason: "disabled" },
    email: { sent: 0, reason: "disabled" }
  };

  if (wantsPush && !quiet) {
    const cap = await checkAndIncrementCap(uid, "push", payload.type || "generic", false, payload.bypassDailyCap === true);
    if (cap.allowed) {
      results.push = await sendPush(uid, Object.assign({}, payload, { eventId, notificationId }));
    } else {
      results.push = { sent: 0, reason: cap.reason };
    }
  } else if (wantsPush && quiet) {
    results.push = { sent: 0, reason: "quiet-hours" };
  }

  if (wantsEmail) {
    const cap = await checkAndIncrementCap(uid, "email", payload.type || "generic", payload.type === "weekly-digest");
    if (cap.allowed) {
      results.email = await sendEmail(uid, userDoc, payload);
    } else {
      results.email = { sent: 0, reason: cap.reason };
    }
  }

  return results;
}
```

> The exact pre-text may differ slightly after Task 3's edits — the structural shape is what matters. The replacement below assumes Task 3 has been applied.

**Replace with**:

```js
async function sendNotification(uid, payload) {
  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return { error: "user-not-found" };
  }

  const userDoc = userSnap.data() || {};
  const prefs = Object.assign({}, getDefaultPrefs(), userDoc.notificationPrefs || {});
  const channel = payload.channel || "push";
  const wantsPush = (channel === "push" || channel === "both") && prefs.pushEnabled === true;
  const wantsEmail = (channel === "email" || channel === "both") && prefs.emailEnabled !== false;
  const quiet = isInQuietHours(prefs, !!payload.allowQuietHourException);

  // Pre-allocate IDs (without writing yet) so the push payload can reference them.
  const eventRef = db.collection("notificationEvents").doc();
  const inboxRef = db.collection("users").doc(uid).collection("notifications").doc();
  const eventId = eventRef.id;
  const notificationId = inboxRef.id;

  const results = {
    eventId: null,
    notificationId: null,
    push: { sent: 0, reason: "disabled" },
    email: { sent: 0, reason: "disabled" }
  };

  // Push path
  if (wantsPush && !quiet) {
    const cap = await checkAndIncrementCap(
      uid,
      "push",
      payload.type || "generic",
      false,
      payload.bypassDailyCap === true
    );
    if (cap.allowed) {
      results.push = await sendPush(uid, Object.assign({}, payload, { eventId, notificationId }));
    } else {
      results.push = { sent: 0, reason: cap.reason };
    }
  } else if (wantsPush && quiet) {
    results.push = { sent: 0, reason: "quiet-hours" };
  }

  // Email path
  if (wantsEmail) {
    const cap = await checkAndIncrementCap(
      uid,
      "email",
      payload.type || "generic",
      payload.type === "weekly-digest",
      false
    );
    if (cap.allowed) {
      results.email = await sendEmail(uid, userDoc, payload);
    } else {
      results.email = { sent: 0, reason: cap.reason };
    }
  }

  // Only persist inbox + analytics if we actually delivered to at least one channel.
  const delivered = (Number(results.push.sent) || 0) > 0 || (Number(results.email.sent) || 0) > 0;
  if (delivered) {
    const channelLabel = (Number(results.push.sent) || 0) > 0
      ? ((Number(results.email.sent) || 0) > 0 ? "both" : "push")
      : "email";

    await eventRef.set({
      uid,
      type: payload.type || "generic",
      channel: channelLabel,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      openedAt: null,
      deepLink: payload.deepLink || "/dashboard.html"
    });

    await inboxRef.set({
      type: payload.type || "generic",
      title: payload.title || "SugboCents",
      body: payload.body || "",
      deepLink: payload.deepLink || "/dashboard.html",
      channel: channelLabel,
      eventId: eventId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      readAt: null
    });

    results.eventId = eventId;
    results.notificationId = notificationId;
  }

  return results;
}
```

#### 6b. Delete the now-unused helpers

**Find and delete** the `createEvent` function (around line 235) and the `addInboxNotification` function (around line 248). They are no longer called from anywhere.

> If a static analysis tool flags any other caller, you missed something — re-grep for `createEvent\(` and `addInboxNotification\(`.

### Acceptance test
1. Seed user with `notificationPrefs: { pushEnabled: false, emailEnabled: false }`.
2. Trigger `streakAtRiskCron()`.
3. **Expected**: `users/{uid}/notifications` collection gains **0 docs**. `notificationEvents` gains **0 docs**. The bell badge shows **0**.
4. Re-enable email, retrigger → 1 inbox doc, 1 event doc, badge increments.

---

## Task 7 — Wrap per-user cron iterations in try/catch (MEDIUM, M3)

### Problem
Every cron is a `for (const doc of users.docs) { await sendNotification(...) }` loop. If `sendNotification` throws once (network blip, malformed user doc, Brevo 5xx), **the entire cron run dies** and every user after that point gets nothing for the day.

### Decision
Wrap the per-user body in `try/catch`, log, continue. Already done for `lapsedUserCron` in Task 4. Apply the same pattern to the other 5 crons.

### File: [`functions/notifications.js`](functions/notifications.js)

For each cron listed below, find the `for (const doc of users.docs) {` line and wrap the body. Pattern:

```js
  for (const doc of users.docs) {
    try {
      // ... existing body unchanged ...
    } catch (err) {
      console.error(`[CRON_NAME_HERE] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
```

Apply to:

1. `onboardingCron` — replace `CRON_NAME_HERE` with `onboardingCron`.
2. `dailyReminderCron` — replace with `dailyReminderCron`.
3. `streakAtRiskCron` — replace with `streakAtRiskCron`.
4. `streakBrokenCron` — replace with `streakBrokenCron`.
5. `weeklyDigestCron` — the loop is `for (let i = start; i < end; i++)` — wrap the body the same way, log with `uid=${docs[i].id}`.

> Do NOT add try/catch to `onExpenseWriteTrigger`, `onUserWriteTrigger`, or `onLeaderboardChange` — they're single-event triggers and Cloud Functions handles their retries.

### Acceptance test
1. In `functions:shell`, monkey-patch `sendNotification` to `throw new Error("boom")` for `uid === "testUserA"`.
2. Run `streakAtRiskCron()` with a users collection containing `[testUserA, testUserB, testUserC]` all eligible.
3. **Expected**: testUserA logs the error, testUserB and testUserC still receive their pushes.

---

## Task 8 — Split weekly digest across 4 days (Brevo headroom, SCALING)

### Problem
At ~200 active users, Sunday's digest fan-out alone brushes against Brevo's 300/day cap. Currently split across Sun + Mon (50/50). Splitting across 4 days (Sun/Mon/Tue/Wed, ~25% each) gives 4× headroom on the daily cap without touching the monthly 9,000 quota or upgrading to a paid plan.

### Decision
Deterministic bucketing by `uid` hash → user always gets their digest on the same weekday → consistent UX. Bucket = `uid.charCodeAt(0) % 4`.

### File: [`functions/notifications.js`](functions/notifications.js)

#### 8a. Add a hash helper

**Add** near the other helpers (after `shiftDayKey`, around line 70):

```js
function digestBucketForUid(uid) {
  // 0..3 — used to spread weekly digest across Sun/Mon/Tue/Wed.
  if (!uid) { return 0; }
  let sum = 0;
  for (let i = 0; i < uid.length; i++) {
    sum = (sum + uid.charCodeAt(i)) >>> 0;
  }
  return sum % 4;
}
```

#### 8b. Update the cron schedule and bucket logic

**Find** the entire `weeklyDigestCron` (around line 640):

```js
exports.weeklyDigestCron = onSchedule({
  schedule: "0 19 * * 0,1",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL, GROQ_API_KEY]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();

  const now = new Date();
  const day = now.getDay();
  if (day !== 0 && day !== 1) { return; }

  const docs = users.docs.filter((doc) => {
    const data = doc.data() || {};
    const prefs = Object.assign({}, getDefaultPrefs(), data.notificationPrefs || {});
    return prefs.emailEnabled !== false;
  });

  const half = Math.ceil(docs.length / 2);
  const start = day === 0 ? 0 : half;
  const end = day === 0 ? half : docs.length;

  for (let i = start; i < end; i++) {
    const doc = docs[i];
    const u = doc.data() || {};
    const summary = await buildWeeklySummary(doc.id);
    const aiTip = await fetchGroqTip(summary);

    await sendNotification(doc.id, {
      type: "weekly-digest",
      channel: "email",
      title: "Weekly recap",
      body: summary.headline,
      subject: `Your week in ₱: ${summary.headline}`,
      html: emailTemplate("weekly-digest", {
        firstName: u.firstName || "friend",
        totalSpent: summary.totalSpent,
        topCategory: summary.topCategory,
        dayCount: summary.dayCount,
        aiTip
      }),
      deepLink: "/stats.html"
    });
  }
});
```

**Replace with**:

```js
exports.weeklyDigestCron = onSchedule({
  // Sun=0, Mon=1, Tue=2, Wed=3 — fires at 19:00 PH each of these days.
  schedule: "0 19 * * 0,1,2,3",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL, GROQ_API_KEY]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();

  const now = new Date();
  const dayPH = parseInt(new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(now), 10);
  // Map JS getDay() in PH timezone: Sun=0, Mon=1, Tue=2, Wed=3 — others early-exit.
  const phDayName = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(now);
  const dayMap = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3 };
  const targetBucket = dayMap[phDayName];
  if (typeof targetBucket !== "number") { return; }

  for (const doc of users.docs) {
    try {
      const u = doc.data() || {};
      const prefs = Object.assign({}, getDefaultPrefs(), u.notificationPrefs || {});
      if (prefs.emailEnabled === false) { continue; }
      if (digestBucketForUid(doc.id) !== targetBucket) { continue; }

      const summary = await buildWeeklySummary(doc.id);
      const aiTip = await fetchGroqTip(summary);

      await sendNotification(doc.id, {
        type: "weekly-digest",
        channel: "email",
        title: "Weekly recap",
        body: summary.headline,
        subject: `Your week in ₱: ${summary.headline}`,
        html: emailTemplate("weekly-digest", {
          firstName: u.firstName || "friend",
          totalSpent: summary.totalSpent,
          topCategory: summary.topCategory,
          dayCount: summary.dayCount,
          aiTip
        }),
        deepLink: "/stats.html"
      });
    } catch (err) {
      console.error(`[weeklyDigestCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
});
```

> Note: the unused `dayPH` line is intentionally removed in the replacement — only the named `phDayName` is used. Double-check your editor didn't keep both.

### Acceptance test
1. Hardcode `phDayName = "Sun"` for the test.
2. Run `weeklyDigestCron()` on a fixture of 8 users with uids `"a"` through `"h"`.
3. **Expected**: only users whose `digestBucketForUid(uid) === 0` receive the email. Approximately 25% of the set.
4. Repeat with `"Mon"`, `"Tue"`, `"Wed"` → each user appears in exactly **one** day's batch.
5. Hardcode `phDayName = "Thu"` → cron exits immediately, 0 sends.

---

## Task 9 — Smoke-test checklist

After all 8 tasks above are merged, run this end-to-end check before declaring done:

### Pre-flight
- [ ] `CACHE_NAME` and `RUNTIME_CACHE` in [`sw.js`](sw.js) bumped from `v152` to `v153`.
- [ ] `firebase deploy --only functions,firestore:rules,hosting` succeeds with zero warnings.
- [ ] Firestore composite indexes built (check Firebase Console → Firestore → Indexes):
  - `users` collection: `notificationPrefs.dailyReminderEnabled` (asc) + `notificationPrefs.dailyReminderHour` (asc) — already needed by `dailyReminderCron`.

### Functional
- [ ] **Push duplicate fix (Task 1):** trigger any push → exactly 1 toast on Android Chrome and Desktop Chrome.
- [ ] **Open tracking (Task 2):** click a notification → `notificationEvents/{eventId}.openedAt` is non-null within 5 seconds.
- [ ] **Last-call exemption (Task 3):** simulate 6pm + 10pm streak crons same day → both pushes fire.
- [ ] **Lapsed ladder (Task 4):** seed user 5-days lapsed → receives `lapsed-d3` (not skipped). `lapsedStagesSent.d3` is set. Re-running same day = no duplicate.
- [ ] **Email quota (Task 5):** with `EMAIL_DAILY_QUOTA_GUARD = 3`, fire 4 emails → exactly 3 deliver. Firestore `metrics/emailQuota_*.count` = 3.
- [ ] **Inbox-after-delivery (Task 6):** user with both channels off → inbox stays empty after a cron run.
- [ ] **Cron resilience (Task 7):** monkey-patch one user's send to throw → other users still receive.
- [ ] **Digest split (Task 8):** simulate Sun/Mon/Tue/Wed → users distributed roughly 25/25/25/25, each user in exactly one day.

### Regression
- [ ] Soft prompt still appears after first expense for new users.
- [ ] Settings toggles still persist.
- [ ] Bell badge count matches `where readAt == null` count.
- [ ] iOS PWA detection still hides push toggle correctly when not installed.
- [ ] No console errors on `dashboard.html`, `settings.html`, or `tigom.html` in production build.

### Out of scope (track as future work, do not fix here)
- Achievement-adjacent state (#7 in original plan) — only XP-near-level is implemented; "X% to badge" is not.
- `XP_LEVELS` constant duplicated between [`functions/notifications.js`](functions/notifications.js) and [`js/storage.js`](js/storage.js).
- Pagination of full-collection cron scans (`onboardingCron`, `streakAtRiskCron`, `streakBrokenCron`) — needed only above ~1k users.
- Inbox `onSnapshot` cleanup on logout in [`js/notifications.js`](js/notifications.js) — only matters for multi-account-per-tab use.
- Cloud Scheduler retry idempotency keys — defer until Brevo paid tier.

---

## Implementation order

Do them in this order so each task can be tested independently before the next:

1. **Task 2** (Firestore rules) — deploy rules first, no functions change.
2. **Task 1** (FCM payload) — bump SW cache, deploy functions + hosting together.
3. **Task 3** (last-call exemption) — functions only.
4. **Task 5** (email quota) — functions + rules. Test before moving on; this guards everything downstream.
5. **Task 6** (inbox after delivery) — functions only. Has the largest blast radius — test thoroughly.
6. **Task 4** (lapsed ladder) — functions only.
7. **Task 7** (try/catch wrap) — functions only.
8. **Task 8** (digest split) — functions only.

---

## Notes for the implementer

- **Do not** reformat unrelated code. Touch only the lines specified.
- **Do not** add docstrings, comments beyond what's already in the snippets, or "improvements".
- **Do not** rename existing variables.
- If you find an extra issue mid-work, **add it to a TODO comment** with `// TODO(notif-fixes-2):` prefix and keep going. Do not fix it in this PR.
- If a `find` snippet doesn't match exactly because Task N already changed it, that's expected — use the structural intent of the replacement. Do not guess.
- Run the smoke-test checklist top-to-bottom **after every task**, not just at the end. If a regression appears, stop and report which task caused it.
