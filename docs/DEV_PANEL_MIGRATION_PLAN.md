# Dev Panel Migration Plan — Consolidate Old `dev-tools.js` into New `dev-notifications.html`

> **Hand-off to implementer AI.** This plan runs AFTER both:
> 1. `docs/NOTIFICATIONS_CRITICAL_FIXES_PLAN.md` is merged and verified.
> 2. `docs/DEV_TESTING_PANEL_PLAN.md` is fully built and the new `/dev-notifications.html` route works end-to-end (snapshot + send test push + demo flows all pass).
>
> Do NOT start this migration until both prerequisites are green. If the new panel does not yet exist, stop and complete that build first.
>
> The end result: ONE consolidated dev panel at `/dev-notifications.html` (renamed in the UI to "Dev Tools"). The old floating 🔧 button and `js/dev-tools.js` file are deleted. All genuinely useful old features are ported as new panel sections.

---

## 0. Pre-flight Verification

Before writing any code, confirm the current state of the workspace by running these checks:

```powershell
Set-Location "c:\Users\PC\Downloads\SugboCents Web App"
Test-Path "dev-notifications.html"
Test-Path "js/dev-notifications.js"
Test-Path "functions/dev-tools.js"
Test-Path "js/dev-tools.js"
```

Expected results before starting this migration:
- `dev-notifications.html` → **True** (built by previous plan)
- `js/dev-notifications.js` → **True** (built by previous plan)
- `functions/dev-tools.js` → **True** (built by previous plan)
- `js/dev-tools.js` → **True** (the OLD panel, will be deleted at end)

If any of the first three is `False`, STOP. Complete `DEV_TESTING_PANEL_PLAN.md` first.

Also verify the four critical fixes are present in `functions/notifications.js`:

```powershell
Select-String -Path "functions/notifications.js" -Pattern "status: ""pending""" -SimpleMatch
Select-String -Path "functions/notifications.js" -Pattern "autoReadEmailInboxCron" -SimpleMatch
Select-String -Path "functions/notifications.js" -Pattern "loginAdvanced" -SimpleMatch
Select-String -Path "js/notifications.js" -Pattern "wireForegroundMessageListener" -SimpleMatch
```

All four must return at least one match. If any is missing, STOP and complete `NOTIFICATIONS_CRITICAL_FIXES_PLAN.md` first.

---

## 1. Audit of Old Panel — What Stays, What Goes

The old `js/dev-tools.js` exposes 26 scenarios via a floating 🔧 button on 4 pages. Decision matrix:

| # | Scenario key | Old behavior | Decision | Rationale |
|---|---|---|---|---|
| 1 | `ahead` | Set budget so spent = ~55% of expected | **PORT** | Budget health demo for stats page |
| 2 | `ontrack` | Set budget so spent = ~95% | **PORT** | Same |
| 3 | `warn` | Set budget so spent = ~118% | **PORT** | Same |
| 4 | `over` | Set budget so spent = ~130% | **PORT** | Same |
| 5 | `streak5` | Seed 5 days of expenses | **PORT** | Used by Demo Flow B in the new panel |
| 6 | `streak-risk` | Seed 5-day streak with no expense today | **PORT** | Critical for testing streak-at-risk push |
| 7 | `streak14` | Seed 14 days | **PORT** | Used for badge demo |
| 8 | `quest-reset` | Clear current active quest slot | **PORT** | Useful for re-demoing a quest flow |
| 9 | `quest-reset-all` | Clear quest slot + claim locks | **PORT** | Required before each quest demo |
| 10 | `quest-complete` | Force-complete current quest | **PORT** | Essential for demo |
| 11 | `quest-complete-claim` | Force-complete + auto-claim reward | **PORT** | Best one-click for quest demo |
| 12 | `lb-seed` | Seed 5 fake friends + your XP + 10 feed entries (one click) | **PORT** | Best leaderboard demo entry point |
| 13 | `lb-populate` | Seed 5 fake friends only | **DROP** | Subset of `lb-seed` — redundant |
| 14 | `lb-clear` | Delete fake friends from Firestore | **PORT** | Needed to clean up after demo |
| 15 | `lb-livefeed` | Seed feed entries only | **DROP** | Subset of `lb-seed` |
| 16 | `sentimos-set` | Set Sentimos balance | **PORT** | Used for shop demo |
| 17 | `xp-near-levelup` | Set XP to 1 below next level | **PORT** | Triggers level-up animation on next expense |
| 18 | `xp-set` | Set arbitrary XP | **PORT** | General-purpose |
| 19 | `achiev-trigger` | Force-unlock a chosen badge | **PORT** | Needed for badge demo |
| 20 | `weekly-reset` | Reset `weeklyXpStart` to current XP | **DROP** | `lb-seed` already handles weekly XP |
| 21 | `streak-freeze-demo` | 6-day streak + 2 freezes equipped | **PORT** | Cool demo for shop/streak feature |
| 22 | `onboard-reset` | Clear budget + onboarding flag | **PORT** | Demo onboarding flow |
| 23 | `onboard-step1` | Set budget, leave onboarding flag | **DROP** | Granular variant — covered by Demo Flow A |
| 24 | `onboard-complete` | Set budget + add expense | **DROP** | Same |
| 25 | `onboard-dismiss` | Set onboarding-dismissed flag | **DROP** | Same |
| 26 | `notif-refresh` | Display last 50 inbox notifications | **DROP** | New panel's snapshot section already does this live |
| — | `reset` (master) | Restore snapshot + clear dev expenses + clear fake friends | **PORT** | Critical safety net |

**Net result**: 16 scenarios ported, 10 dropped.

---

## 2. New Sections to Add to `dev-notifications.html`

Add these sections to the existing panel BELOW the demo flows section. Order matters — place them in this sequence after the existing Section "Demo flows":

1. **Snapshot & Restore** (master safety section — must be first of new sections)
2. **Onboarding & Budget Health**
3. **Streak Scenarios**
4. **Quest Scenarios**
5. **Gamification (XP / Sentimos / Badges)**
6. **Leaderboard & Friends**

Each section gets its own `<section class="dev-section">` block with a heading and a button grid identical to the existing panel's styling.

---

## 3. Section: Snapshot & Restore

**Why this is critical**
The old panel's "master reset" was the single most important safety feature. Without it, demos leave the user account in a broken state (fake budgets, fake streaks, fake friends linger). The new panel must not regress on this.

**HTML to add** (inside `dev-notifications.html`):

```html
<section class="dev-section" id="devSnapshotRestore">
  <h2 class="dev-sec-title">📸 Snapshot & Restore</h2>
  <p class="dev-hint">Always click <strong>Snapshot</strong> before running any scenario from the sections below. <strong>Restore</strong> brings everything back to your real state.</p>
  <div class="dev-grid dev-grid--2">
    <button class="dev-btn dev-btn--brand" data-action="snapshot-save">📸 Snapshot my state</button>
    <button class="dev-btn dev-btn--reset" data-action="snapshot-restore">↩ Restore everything</button>
  </div>
  <div class="dev-status" id="devSnapshotStatus"></div>
</section>
```

**JS handler** (in `js/dev-notifications.js`):

```javascript
async function handleSnapshotSave() {
  setSectionStatus("devSnapshotStatus", "⏳ Saving snapshot…", "ok");
  try {
    var res = await state.callables.snapshotSave();
    setSectionStatus("devSnapshotStatus",
      "✓ Snapshot saved at " + new Date(res.data.savedAt).toLocaleTimeString(),
      "ok");
  } catch (err) {
    setSectionStatus("devSnapshotStatus",
      "✗ " + (err && err.message ? err.message : "snapshot failed"), "err");
  }
}

async function handleSnapshotRestore() {
  if (!confirm("Restore all data to your last snapshot? This will overwrite current dev-test state.")) {
    return;
  }
  setSectionStatus("devSnapshotStatus", "⏳ Restoring…", "ok");
  try {
    var res = await state.callables.snapshotRestore();
    setSectionStatus("devSnapshotStatus",
      "✓ Restored — " + (res.data.itemsRestored || 0) + " items + " +
      (res.data.fakeFriendsCleared || 0) + " fake friends cleared.", "ok");
    await refreshSnapshot();
    window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
  } catch (err) {
    setSectionStatus("devSnapshotStatus",
      "✗ " + (err && err.message ? err.message : "restore failed"), "err");
  }
}
```

**New callables required** (add to `functions/dev-tools.js`):

| Name | Action |
|---|---|
| `devSnapshotSave` | Read caller's `users/{uid}` doc + `users/{uid}/expenses` (last 30) + active quest doc, write all to `users/{uid}/devSnapshot/main` with `savedAt` server timestamp. Returns `{ ok: true, savedAt }`. |
| `devSnapshotRestore` | Read `users/{uid}/devSnapshot/main`. Restore: `weeklyBudget`, `xp`, `currentStreak`, `lastStreakLength`, `sentimos`, `lastExpenseDate`, `notificationPrefs`, `weeklyXpStart`. Delete all expenses with `note` starting with `[DEV]`. Delete all fake-friend links from `friends/{uid}/friends/*` whose uid starts with `dev-friend-`. Returns `{ ok, itemsRestored, fakeFriendsCleared }`. |

**Constraints for the implementer**:
- The snapshot doc lives at `users/{uid}/devSnapshot/main` (a single doc, overwritten each save).
- Restore must be **idempotent** — calling it twice in a row produces the same final state.
- Restore must NOT delete the user's REAL expenses. Identify dev-seeded expenses by the literal `note` prefix `"[DEV]"`. Do NOT use any other heuristic.
- Restore must NOT clear `notificationLog`, `metrics`, or `notificationEvents` (those are managed by other dev callables).

---

## 4. Section: Onboarding & Budget Health

**HTML**:

```html
<section class="dev-section" id="devBudgetHealth">
  <h2 class="dev-sec-title">💸 Onboarding & Budget Health</h2>
  <p class="dev-hint">Seeds 1 dev expense today and adjusts your weekly budget so the dashboard renders the matching health pill.</p>
  <div class="dev-grid dev-grid--2">
    <button class="dev-btn dev-btn--green"  data-action="health-ahead">📈 Ahead of budget</button>
    <button class="dev-btn dev-btn--teal"   data-action="health-ontrack">✓ On track</button>
    <button class="dev-btn dev-btn--amber"  data-action="health-warn">⚠ Watch out</button>
    <button class="dev-btn dev-btn--red"    data-action="health-over">🔴 Over budget</button>
  </div>
  <div class="dev-divider"></div>
  <div class="dev-grid dev-grid--1">
    <button class="dev-btn dev-btn--blue" data-action="onboard-reset">🌱 Reset onboarding (clear budget + flag)</button>
  </div>
  <div class="dev-status" id="devBudgetHealthStatus"></div>
</section>
```

**Implementation note**: budget-health scenarios are pure client-side state manipulation through `StorageAPI` (the existing primitives in `js/storage.js` work fine). They do NOT need new callables. Port the four `healthScenario(...)` helpers from old `dev-tools.js` lines 209–240 verbatim into `js/dev-notifications.js` as private functions — change only the status display target to `devBudgetHealthStatus`.

The onboarding-reset is also pure client-side: clear `weeklyBudget` via `StorageAPI.saveWeeklyBudget(0)` and set `onboardingDismissed: false` via `StorageAPI.savePreferences`.

**Required `StorageAPI` access from the new panel**:
- `getWeeklyBudget`, `saveWeeklyBudget` (existing)
- `getBudgetSummary` (existing)
- `addExpense`, `getExpenses`, `removeExpense` (existing)
- `savePreferences` (existing)

These are all already available; no new StorageAPI methods needed.

**Helper to add to `js/dev-notifications.js`** (port from old):

```javascript
var DEV_TAG = "[DEV]";

function daysAgoTs(n, hour) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(typeof hour === "number" ? hour : 9, 0, 0, 0);
  return d.toISOString();
}

function daysElapsedThisWeek() {
  return ((new Date().getDay() + 6) % 7) + 1;
}

function addDevExpense(data) {
  if (!window.StorageAPI || !window.StorageAPI.addExpense) { return; }
  window.StorageAPI.addExpense(Object.assign({}, data, {
    note: DEV_TAG + " " + (data.category || ""),
    raw: true
  }));
}

function clearDevExpenses() {
  if (!window.StorageAPI || !window.StorageAPI.getExpenses) { return; }
  window.StorageAPI.getExpenses().filter(function (e) {
    return e.note && e.note.indexOf(DEV_TAG) === 0;
  }).forEach(function (e) {
    window.StorageAPI.removeExpense(e.id);
  });
}

function refreshUI() {
  window.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
}
```

These four helpers are reused by every section below.

---

## 5. Section: Streak Scenarios

**HTML**:

```html
<section class="dev-section" id="devStreaks">
  <h2 class="dev-sec-title">🔥 Streak Scenarios</h2>
  <p class="dev-hint">Seeds dev expenses to fake a streak history. Snapshot first.</p>
  <div class="dev-grid dev-grid--3">
    <button class="dev-btn dev-btn--orange" data-action="streak-5">🔥 5-day streak</button>
    <button class="dev-btn dev-btn--orange" data-action="streak-14">🏆 14-day streak</button>
    <button class="dev-btn dev-btn--amber"  data-action="streak-risk">⚡ At-risk (5d, no log today)</button>
  </div>
  <div class="dev-grid dev-grid--1">
    <button class="dev-btn dev-btn--purple" data-action="streak-freeze-demo">🧊 Streak Freeze demo (6d gap + 2 freezes)</button>
  </div>
  <div class="dev-status" id="devStreaksStatus"></div>
</section>
```

**JS** — port `scenarioStreak5`, `scenarioStreak14`, `scenarioAtRisk`, `scenarioStreakFreezeDemo` from old `dev-tools.js` (lines 245–280, 727–745) verbatim into `js/dev-notifications.js`. Replace the old `setStatus` calls with `setSectionStatus("devStreaksStatus", ...)`.

The `__devGiveStreakFreezes` StorageAPI hook already exists — use it as-is.

**Important — DO NOT use `window.__DEV_FORCE_AT_RISK = true` from the old panel**. That global was a hack used by some legacy chart code. Verify with grep first; if `__DEV_FORCE_AT_RISK` has zero references outside `dev-tools.js` after deletion, drop it from the ported code. If it does still have references in production code, keep the assignment — but file a follow-up to remove it.

```powershell
Select-String -Path "js","css","*.html" -Pattern "__DEV_FORCE_AT_RISK" -SimpleMatch -Recurse
```

---

## 6. Section: Quest Scenarios

**HTML**:

```html
<section class="dev-section" id="devQuests">
  <h2 class="dev-sec-title">🎯 Quest Scenarios</h2>
  <p class="dev-hint">Manipulate the active quest slot for testing the quest claim flow.</p>
  <div class="dev-grid dev-grid--2">
    <button class="dev-btn dev-btn--slate"  data-action="quest-reset">🔄 Clear active slot</button>
    <button class="dev-btn dev-btn--slate"  data-action="quest-reset-all">♻ Clear slot + claim locks</button>
    <button class="dev-btn dev-btn--green"  data-action="quest-complete">✓ Force-complete current quest</button>
    <button class="dev-btn dev-btn--brand"  data-action="quest-complete-claim">🎉 Force-complete + auto-claim</button>
  </div>
  <div class="dev-status" id="devQuestsStatus"></div>
</section>
```

**JS** — port `scenarioQuestReset`, `scenarioQuestResetAll`, `scenarioQuestForceComplete`, `scenarioQuestForceCompleteClaim` (old `dev-tools.js` lines 313–397) verbatim. Existing StorageAPI hooks `__devResetQuestSlot`, `__devResetAllQuests`, `setCurrentQuest`, `claimQuestReward` are already in place — no backend changes required.

---

## 7. Section: Gamification (XP / Sentimos / Badges)

**HTML**:

```html
<section class="dev-section" id="devGamification">
  <h2 class="dev-sec-title">⚡ Gamification</h2>

  <div class="dev-row">
    <input id="devXpInput" type="number" class="dev-input" placeholder="XP amount" min="0" />
    <button class="dev-btn dev-btn--indigo" data-action="xp-set">Set XP</button>
  </div>
  <div class="dev-grid dev-grid--1">
    <button class="dev-btn dev-btn--pulse" data-action="xp-near-levelup">⚡ Set XP to 1 below next level</button>
  </div>

  <div class="dev-divider"></div>

  <div class="dev-row">
    <input id="devSentimosInput" type="number" class="dev-input" placeholder="₵ Sentimos" min="0" />
    <button class="dev-btn dev-btn--indigo" data-action="sentimos-set">Set Sentimos</button>
  </div>

  <div class="dev-divider"></div>

  <div class="dev-row">
    <select id="devAchievSelect" class="dev-select">
      <!-- Options injected at render-time from DEMO_ACHIEVEMENTS -->
    </select>
    <button class="dev-btn dev-btn--brand" data-action="achiev-trigger">🏅 Unlock badge</button>
  </div>

  <div class="dev-status" id="devGamificationStatus"></div>
</section>
```

**JS**:

- Copy the `XP_LEVELS` and `DEMO_ACHIEVEMENTS` arrays from old `dev-tools.js` (lines 17–62) into `js/dev-notifications.js` near the top.
- Port `scenarioSetXp`, `scenarioXpNearLevelUp`, `scenarioSetSentimos`, `scenarioTriggerAchievement` (old lines 612–710) verbatim.
- On panel render, populate the `devAchievSelect` `<select>` element with options built from `DEMO_ACHIEVEMENTS`. Do NOT use `innerHTML` with raw label values — use `document.createElement("option")` for XSS safety even though the labels are hardcoded.

---

## 8. Section: Leaderboard & Friends

**HTML**:

```html
<section class="dev-section" id="devLeaderboard">
  <h2 class="dev-sec-title">🏆 Leaderboard & Friends</h2>
  <p class="dev-hint">Seeds 5 fake friends and a live feed via a server callable. Use Restore to clean up.</p>
  <div class="dev-grid dev-grid--1">
    <button class="dev-btn dev-btn--brand" data-action="lb-seed">🚀 Full leaderboard demo (one click)</button>
    <button class="dev-btn dev-btn--red"   data-action="lb-clear">🧹 Clear fake friends</button>
  </div>
  <div class="dev-status" id="devLeaderboardStatus"></div>
</section>
```

**Why this needs server callables (not client-side StorageAPI)**:
The old `lb-seed` writes to `users/{fakeUid}.publicProfile` and `friends/{uid}/friends/{fakeUid}` AND `global_feed/*`. Writing to OTHER users' docs from the client is a Firestore-rules anti-pattern that may be blocked by rules tightening. Move it server-side now to make it future-proof.

**New callables required** (add to `functions/dev-tools.js`):

| Name | Action |
|---|---|
| `devSeedLeaderboard` | (a) Set caller's `weeklyXpStart` so caller has weeklyXP ≈ 250 (rank 3 of 6). (b) For each of 5 fake friends `dev-friend-001..005`, write `users/{fakeUid}.publicProfile` with the same data the old panel wrote (see lines 31–44 of old `dev-tools.js`). (c) Write `friends/{uid}/friends/{fakeUid}` link docs. (d) Write 10 `global_feed` entries (2 per fake friend) with proper `audience` array. Returns `{ ok, friendsCreated, feedEntriesCreated }`. |
| `devClearLeaderboard` | Delete all `friends/{uid}/friends/dev-friend-*` link docs. Delete all `global_feed` entries authored by uids matching `dev-friend-*`. Returns `{ ok, friendsDeleted, feedEntriesDeleted }`. **Do NOT delete the `users/dev-friend-*` docs** — they are harmless and other users may have demoed against them. |

The fake-friend definitions (`DEV_FAKE_FRIENDS` array, old lines 31–44) and feed templates (old lines 818–828) move into `functions/dev-tools.js` as constants.

**Client-side wiring**:

```javascript
async function handleLbSeed() {
  setSectionStatus("devLeaderboardStatus", "⏳ Seeding leaderboard…", "ok");
  try {
    var res = await state.callables.seedLeaderboard();
    setSectionStatus("devLeaderboardStatus",
      "✓ Seeded " + res.data.friendsCreated + " friends + " +
      res.data.feedEntriesCreated + " feed entries.", "ok");
    refreshUI();
  } catch (err) {
    setSectionStatus("devLeaderboardStatus",
      "✗ " + (err && err.message ? err.message : "seed failed"), "err");
  }
}

async function handleLbClear() {
  if (!confirm("Remove all fake friends and demo feed entries?")) { return; }
  setSectionStatus("devLeaderboardStatus", "⏳ Clearing…", "ok");
  try {
    var res = await state.callables.clearLeaderboard();
    setSectionStatus("devLeaderboardStatus",
      "✓ Cleared " + res.data.friendsDeleted + " friends + " +
      res.data.feedEntriesDeleted + " feed entries.", "ok");
    refreshUI();
  } catch (err) {
    setSectionStatus("devLeaderboardStatus",
      "✗ " + (err && err.message ? err.message : "clear failed"), "err");
  }
}
```

---

## 9. Updates to `functions/dev-tools.js`

Add these four new callables to the existing dev-tools module. Each must call `assertAdmin(request)` as its first executable line, identical to the existing pattern.

```javascript
exports.devSnapshotSave = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  const expensesSnap = await db.collection("users").doc(uid)
    .collection("expenses")
    .orderBy("timestamp", "desc")
    .limit(60)
    .get();

  const questSnap = await db.collection("users").doc(uid)
    .collection("quests").doc("active").get();

  const payload = {
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
    weeklyBudget: userData.weeklyBudget || 0,
    xp: userData.xp || 0,
    currentStreak: userData.currentStreak || 0,
    lastStreakLength: userData.lastStreakLength || 0,
    sentimos: userData.sentimos || 0,
    lastExpenseDate: userData.lastExpenseDate || null,
    weeklyXpStart: userData.weeklyXpStart || 0,
    weeklyXpStartDate: userData.weeklyXpStartDate || null,
    notificationPrefs: userData.notificationPrefs || null,
    realExpenseIds: expensesSnap.docs
      .filter((d) => {
        const n = String((d.data() || {}).note || "");
        return n.indexOf("[DEV]") !== 0;
      })
      .map((d) => d.id),
    activeQuest: questSnap.exists ? questSnap.data() : null
  };

  await db.collection("users").doc(uid)
    .collection("devSnapshot").doc("main")
    .set(payload);

  await logDevAction(uid, "snapshot-save", { realExpenseCount: payload.realExpenseIds.length });
  return { ok: true, savedAt: new Date().toISOString() };
});

exports.devSnapshotRestore = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  const snap = await db.collection("users").doc(uid)
    .collection("devSnapshot").doc("main").get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "No snapshot found. Click Snapshot first.");
  }
  const s = snap.data() || {};

  // 1. Restore user-doc fields.
  const restorePatch = {
    weeklyBudget: s.weeklyBudget || 0,
    xp: s.xp || 0,
    currentStreak: s.currentStreak || 0,
    lastStreakLength: s.lastStreakLength || 0,
    sentimos: s.sentimos || 0,
    lastExpenseDate: s.lastExpenseDate || null,
    weeklyXpStart: s.weeklyXpStart || 0,
    weeklyXpStartDate: s.weeklyXpStartDate || null
  };
  if (s.notificationPrefs) {
    restorePatch.notificationPrefs = s.notificationPrefs;
  }
  await db.collection("users").doc(uid).set(restorePatch, { merge: true });

  // 2. Delete all dev-seeded expenses (note starts with "[DEV]").
  const expSnap = await db.collection("users").doc(uid).collection("expenses").get();
  const batch = db.batch();
  let removed = 0;
  expSnap.docs.forEach((doc) => {
    const note = String((doc.data() || {}).note || "");
    if (note.indexOf("[DEV]") === 0) {
      batch.delete(doc.ref);
      removed += 1;
    }
  });

  // 3. Delete fake-friend links.
  const friendsSnap = await db.collection("friends").doc(uid).collection("friends").get();
  let friendsCleared = 0;
  friendsSnap.docs.forEach((doc) => {
    if (doc.id.indexOf("dev-friend-") === 0) {
      batch.delete(doc.ref);
      friendsCleared += 1;
    }
  });

  // 4. Restore active quest if snapshot had one.
  if (s.activeQuest) {
    batch.set(db.collection("users").doc(uid).collection("quests").doc("active"), s.activeQuest);
  }

  await batch.commit();

  await logDevAction(uid, "snapshot-restore", {
    devExpensesRemoved: removed,
    fakeFriendsCleared: friendsCleared
  });
  return { ok: true, itemsRestored: removed + 1, fakeFriendsCleared };
});

exports.devSeedLeaderboard = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  // Constants ported from old dev-tools.js
  const DEV_FAKE_FRIENDS = [
    { uid: "dev-friend-001", displayName: "Carlos M.", firstName: "Carlos", streak: 14, questsCompleted: 8, weeklyXP: 320, level: 5, levelName: "Streak Hunter" },
    { uid: "dev-friend-002", displayName: "Mia R.",    firstName: "Mia",    streak: 8,  questsCompleted: 5, weeklyXP: 210, level: 3, levelName: "Money Smart" },
    { uid: "dev-friend-003", displayName: "Jake T.",   firstName: "Jake",   streak: 5,  questsCompleted: 3, weeklyXP: 150, level: 2, levelName: "Budget Aware" },
    { uid: "dev-friend-004", displayName: "Ana L.",    firstName: "Ana",    streak: 3,  questsCompleted: 2, weeklyXP: 80,  level: 2, levelName: "Budget Aware" },
    { uid: "dev-friend-005", displayName: "Ben C.",    firstName: "Ben",    streak: 1,  questsCompleted: 1, weeklyXP: 30,  level: 1, levelName: "Rookie Saver" }
  ];

  const FEED_TEMPLATES = [
    { emoji: "🍜", message: "{name} logged lunch for ₱85" },
    { emoji: "☕", message: "{name} grabbed coffee — staying in budget" },
    { emoji: "🚌", message: "{name} logged a commute expense" },
    { emoji: "🔥", message: "{name} is on a {streak}-day streak!" },
    { emoji: "⚡", message: "{name} gained {xp} XP this week" },
    { emoji: "✅", message: "{name} finished a weekly quest" },
    { emoji: "🏅", message: "{name} just unlocked a new badge" },
    { emoji: "💰", message: "{name} logged an expense under budget" }
  ];

  const now = new Date();
  const audience = [uid].concat(DEV_FAKE_FRIENDS.map((f) => f.uid));
  const batch = db.batch();

  DEV_FAKE_FRIENDS.forEach((f) => {
    const profile = {
      displayName: f.displayName, firstName: f.firstName,
      streak: f.streak, questsCompleted: f.questsCompleted,
      weeklyXP: f.weeklyXP, level: f.level, levelName: f.levelName,
      lastSyncedAt: now.toISOString()
    };
    batch.set(db.collection("users").doc(f.uid), { publicProfile: profile }, { merge: true });
    batch.set(db.collection("friends").doc(uid).collection("friends").doc(f.uid), {
      addedAt: now.toISOString(),
      displayName: f.displayName,
      publicProfile: profile
    });
  });

  let feedCount = 0;
  DEV_FAKE_FRIENDS.forEach((f, fi) => {
    for (let i = 0; i < 2; i++) {
      const tpl = FEED_TEMPLATES[(fi * 2 + i) % FEED_TEMPLATES.length];
      const msg = tpl.message
        .replace("{name}", f.firstName)
        .replace("{streak}", String(f.streak))
        .replace("{xp}", String(f.weeklyXP));
      batch.set(db.collection("global_feed").doc(), {
        type: "activity",
        emoji: tpl.emoji,
        message: msg,
        authorName: f.displayName,
        authorInitial: f.firstName.charAt(0).toUpperCase(),
        authorUid: f.uid,
        audience,
        timestamp: new Date(now.getTime() - (fi * 2 + i) * 8 * 60 * 1000).toISOString()
      });
      feedCount += 1;
    }
  });

  await batch.commit();
  await logDevAction(uid, "seed-leaderboard", { friendsCreated: DEV_FAKE_FRIENDS.length, feedEntriesCreated: feedCount });
  return { ok: true, friendsCreated: DEV_FAKE_FRIENDS.length, feedEntriesCreated: feedCount };
});

exports.devClearLeaderboard = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  // Delete all dev-friend-* link docs for this user.
  const linkSnap = await db.collection("friends").doc(uid).collection("friends").get();
  const batch = db.batch();
  let friendsDeleted = 0;
  linkSnap.docs.forEach((d) => {
    if (d.id.indexOf("dev-friend-") === 0) {
      batch.delete(d.ref);
      friendsDeleted += 1;
    }
  });

  // Delete dev-friend-authored feed entries.
  const feedSnap = await db.collection("global_feed")
    .where("authorUid", ">=", "dev-friend-")
    .where("authorUid", "<=", "dev-friend-\uf8ff")
    .limit(500)
    .get();
  let feedEntriesDeleted = 0;
  feedSnap.docs.forEach((d) => {
    batch.delete(d.ref);
    feedEntriesDeleted += 1;
  });

  await batch.commit();
  await logDevAction(uid, "clear-leaderboard", { friendsDeleted, feedEntriesDeleted });
  return { ok: true, friendsDeleted, feedEntriesDeleted };
});
```

**Required composite index** for the `devClearLeaderboard` feed query:

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "global_feed",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "authorUid", "order": "ASCENDING" }
  ]
}
```

If this is a single-field index, Firestore will auto-create it on first query — but pre-deploy it to avoid a runtime miss during the demo.

**Re-export the four new callables from `functions/index.js`**:

```javascript
exports.devSnapshotSave = dev.devSnapshotSave;
exports.devSnapshotRestore = dev.devSnapshotRestore;
exports.devSeedLeaderboard = dev.devSeedLeaderboard;
exports.devClearLeaderboard = dev.devClearLeaderboard;
```

---

## 10. Updates to `js/dev-notifications.js`

### 10.1 Add new callables to the `state.callables` map

Inside the existing `init()` function where callables are defined, add:

```javascript
state.callables.snapshotSave = functions.httpsCallable("devSnapshotSave");
state.callables.snapshotRestore = functions.httpsCallable("devSnapshotRestore");
state.callables.seedLeaderboard = functions.httpsCallable("devSeedLeaderboard");
state.callables.clearLeaderboard = functions.httpsCallable("devClearLeaderboard");
```

### 10.2 Add a single delegated event listener for the new sections

Use ONE event listener on `document.body` that routes by `data-action` attribute:

```javascript
document.body.addEventListener("click", function (e) {
  var btn = e.target.closest("button[data-action]");
  if (!btn) { return; }
  var action = btn.dataset.action;
  switch (action) {
    case "snapshot-save":        return handleSnapshotSave();
    case "snapshot-restore":     return handleSnapshotRestore();
    case "health-ahead":         return scenarioHealth(0.55, 80, "📈 Ahead", "ahead");
    case "health-ontrack":       return scenarioHealth(0.95, 80, "✓ On track", "ontrack");
    case "health-warn":          return scenarioHealth(1.18, 80, "⚠ Watch out", "warn");
    case "health-over":          return scenarioHealth(1.30, 100, "🔴 Over budget", "over");
    case "onboard-reset":        return scenarioOnboardingReset();
    case "streak-5":             return scenarioStreak5();
    case "streak-14":            return scenarioStreak14();
    case "streak-risk":          return scenarioAtRisk();
    case "streak-freeze-demo":   return scenarioStreakFreezeDemo();
    case "quest-reset":          return scenarioQuestReset();
    case "quest-reset-all":      return scenarioQuestResetAll();
    case "quest-complete":       return scenarioQuestForceComplete();
    case "quest-complete-claim": return scenarioQuestForceCompleteClaim();
    case "xp-set":               return scenarioSetXp();
    case "xp-near-levelup":      return scenarioXpNearLevelUp();
    case "sentimos-set":         return scenarioSetSentimos();
    case "achiev-trigger":       return scenarioTriggerAchievement();
    case "lb-seed":              return handleLbSeed();
    case "lb-clear":             return handleLbClear();
  }
});
```

Do NOT mix this with the existing per-section handlers in the new panel — those use direct `addEventListener` per button. Pick ONE pattern and keep it consistent. **Recommended: convert the existing panel sections to also use `data-action` delegation in a follow-up cleanup pass after this migration is verified.**

### 10.3 Helper function `setSectionStatus`

Add this helper near the top of the IIFE:

```javascript
function setSectionStatus(elId, msg, type) {
  var el = document.getElementById(elId);
  if (!el) { return; }
  el.textContent = msg;
  el.className = "dev-status dev-status--" + (type === "err" ? "err" : "ok");
  clearTimeout(el._devT);
  el._devT = setTimeout(function () {
    el.textContent = "";
    el.className = "dev-status";
  }, 8000);
}
```

---

## 11. CSS Additions

The new sections need the same button-variant classes the old panel used. Add to `css/dev-notifications.css`:

```css
.dev-section { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.dev-sec-title { font-size:14px; font-weight:800; color:#164f33; margin:0 0 6px; display:flex; align-items:center; gap:6px; }
.dev-hint { font-size:12px; color:#64748b; margin:0 0 10px; line-height:1.45; }

.dev-grid { display:grid; gap:6px; margin-bottom:6px; }
.dev-grid--1 { grid-template-columns:1fr; }
.dev-grid--2 { grid-template-columns:1fr 1fr; }
.dev-grid--3 { grid-template-columns:1fr 1fr 1fr; }

.dev-btn { border:none; border-radius:8px; padding:9px 10px; font-size:12px; font-weight:700; cursor:pointer; text-align:left; line-height:1.35; box-shadow:0 1px 3px rgba(0,0,0,.06); transition:filter 100ms, transform 80ms; }
.dev-btn:hover { filter:brightness(.95); }
.dev-btn:active { transform:scale(.97); }

.dev-btn--green  { background:#d1fae5; color:#065f46; }
.dev-btn--teal   { background:#ccfbf1; color:#0f4c44; }
.dev-btn--amber  { background:#fef3c7; color:#78350f; }
.dev-btn--red    { background:#fee2e2; color:#991b1b; }
.dev-btn--orange { background:#ffedd5; color:#7c2d12; }
.dev-btn--pulse  { background:#fef9c3; color:#713f12; }
.dev-btn--blue   { background:#dbeafe; color:#1e3a5f; }
.dev-btn--purple { background:#ede9fe; color:#4c1d95; }
.dev-btn--indigo { background:#e0e7ff; color:#312e81; }
.dev-btn--slate  { background:#f1f5f9; color:#334155; }
.dev-btn--brand  { background:linear-gradient(135deg,#1f6b46,#3aaa72); color:#fff; }
.dev-btn--reset  { background:linear-gradient(135deg,#164f33,#2b8259); color:#fff; }

.dev-row { display:flex; gap:6px; margin-bottom:6px; }
.dev-input,.dev-select { flex:1; background:#f8fafc; border:1.5px solid #d1fae5; border-radius:8px; padding:7px 9px; font-size:12px; font-family:inherit; color:#0f172a; min-width:0; }
.dev-input:focus,.dev-select:focus { outline:none; border-color:#2b8259; background:#fff; }

.dev-divider { height:1px; background:#e2f4e8; margin:10px 0; }
.dev-status { margin-top:8px; min-height:14px; font-size:12px; line-height:1.45; color:#94a3b8; }
.dev-status--ok { color:#15803d; font-weight:600; }
.dev-status--err { color:#b91c1c; font-weight:600; }
```

---

## 12. Page Title Rename

In `dev-notifications.html`:

```diff
- <title>Dev Tools — SugboCents</title>
+ <title>Dev Tools — SugboCents</title>
```

(Already correct in the spec — no change.)

In the page header inside `<main>`:

```diff
- <h1 class="text-2xl font-bold">🛠 Dev Notification Tools</h1>
- <p class="text-sm text-gray-600">Admin-only. All actions affect ONLY your own user account.</p>
+ <h1 class="text-2xl font-bold">🛠 Dev Tools</h1>
+ <p class="text-sm text-gray-600">Admin-only. All actions affect ONLY your own user account or seed harmless demo data.</p>
```

---

## 13. Smoke Test Checklist (run BEFORE deleting old panel)

Test the new consolidated panel with the OLD panel still in place. Confirm every ported feature works:

- [ ] Snapshot save → status confirms within 2s.
- [ ] Snapshot restore (with no real changes) → `itemsRestored: 0`, `fakeFriendsCleared: 0`.
- [ ] Health Ahead → dashboard health pill turns green.
- [ ] Health On Track → pill turns yellow-green.
- [ ] Health Watch Out → pill turns amber.
- [ ] Health Over → pill turns red.
- [ ] Onboarding reset → onboarding card reappears on dashboard.
- [ ] Streak 5 → profile shows 5-day streak.
- [ ] Streak 14 → profile shows 14-day streak.
- [ ] Streak at-risk → push notification fires within ~5s if you also click "Send streak-at-risk-soft" preset.
- [ ] Streak freeze demo → 6-day streak visible + 2 freezes in shop.
- [ ] Quest reset → quest slot clears.
- [ ] Quest force-complete → claim button activates.
- [ ] Quest force-complete-claim → reward applied + status shows XP/Sentimos delta.
- [ ] Set XP to 700 → profile shows Level 5.
- [ ] Set XP near level-up → profile shows current level still, but next expense triggers level-up modal.
- [ ] Set Sentimos to 500 → profile balance shows 500.
- [ ] Unlock badge "On Fire" → toast/modal appears.
- [ ] Leaderboard seed → leaderboard page shows you ranked ~3rd of 6.
- [ ] Leaderboard clear → fake friends gone.
- [ ] **Master Restore after running everything above** → state returns to baseline (real expenses preserved, dev expenses gone, fake friends gone, XP/Sentimos/streak back to snapshot values).

If ANY of the above fails, fix BEFORE proceeding to old-panel deletion.

---

## 14. Old Panel Deletion (only after §13 is fully green)

### 14.1 Files to delete

```powershell
Set-Location "c:\Users\PC\Downloads\SugboCents Web App"
Remove-Item "js/dev-tools.js"
```

### 14.2 Script tags to remove

Edit each of these four files and remove the `<script defer src="js/dev-tools.js"></script>` line:

- [`dashboard.html`](dashboard.html) line 576
- [`leaderboard.html`](leaderboard.html) line 322
- [`profile.html`](profile.html) line 328
- [`quests.html`](quests.html) line 229

(Line numbers may shift if other edits land first — search for the literal `dev-tools.js` string.)

### 14.3 Service Worker

Edit [`sw.js`](sw.js):

1. Bump cache version (was v155 after the testing-panel build):
   ```diff
   - const CACHE_NAME = "sugbocents-shell-v155";
   - const RUNTIME_CACHE = "sugbocents-runtime-v155";
   + const CACHE_NAME = "sugbocents-shell-v156";
   + const RUNTIME_CACHE = "sugbocents-runtime-v156";
   ```

2. If `js/dev-tools.js` was in `SHELL_FILES`, remove it:
   ```powershell
   Select-String -Path "sw.js" -Pattern "dev-tools.js" -SimpleMatch
   ```
   If a match exists, delete that line.

### 14.4 StorageAPI dev hooks — DO NOT delete

The `__devRestoreGamState`, `__devResetQuestSlot`, `__devResetAllQuests`, `__devSetSentimos`, `__devGiveStreakFreezes` exports in [`js/storage.js`](js/storage.js) are still required by the new panel. **Leave them in place.** If a future cleanup wants to remove them, that's a separate task — not part of this migration.

### 14.5 Verify nothing else depends on the old panel

```powershell
Set-Location "c:\Users\PC\Downloads\SugboCents Web App"
Select-String -Path "*.html","js/*.js","css/*.css" -Pattern "dev-tools.js","devToggleBtn","devPanel" -SimpleMatch -Recurse
```

Expected: zero matches after deletion. If any match remains in non-deleted files, investigate before deploying.

### 14.6 Check the `__DEV_FORCE_AT_RISK` global

```powershell
Select-String -Path "js","css","*.html" -Pattern "__DEV_FORCE_AT_RISK" -SimpleMatch -Recurse
```

If this returns ONLY matches inside the new panel's ported streak handlers, fine — those are the only writers, no readers, so it's a dead assignment. Remove the assignment lines from the ported scenarios.

If it returns matches in production code (e.g., `js/dashboard.js`, `js/spending-chart.js`), KEEP the assignment in the ported scenarios. File a follow-up to refactor that production dependency out — it's a code smell but not in scope here.

---

## 15. Deployment Order

1. Add new callables to `functions/dev-tools.js` and re-export from `functions/index.js`.
2. Deploy functions:
   ```powershell
   npx -y firebase-tools@latest deploy --only functions:devSnapshotSave,functions:devSnapshotRestore,functions:devSeedLeaderboard,functions:devClearLeaderboard
   ```
3. Add `firestore.indexes.json` entry for `global_feed.authorUid` and deploy:
   ```powershell
   npx -y firebase-tools@latest deploy --only firestore:indexes
   ```
4. Add the 6 new sections to `dev-notifications.html`, ported scenarios + helpers to `js/dev-notifications.js`, button-variant classes to `css/dev-notifications.css`.
5. Bump SW cache to v156. Deploy hosting:
   ```powershell
   npx -y firebase-tools@latest deploy --only hosting
   ```
6. Hard-refresh browser twice. Run the §13 smoke checklist on the new panel.
7. **Only after §13 is fully green**: delete `js/dev-tools.js`, remove the 4 script tags, deploy hosting again:
   ```powershell
   npx -y firebase-tools@latest deploy --only hosting
   ```

---

## 16. Out of Scope (do NOT do as part of this migration)

- Refactoring the existing dev panel sections to use `data-action` delegation (recommended follow-up but separate).
- Removing `__dev*` StorageAPI exports.
- Removing `__DEV_FORCE_AT_RISK` global from production code.
- Adding new dev features not present in old `dev-tools.js`.
- Mobile-optimizing the new panel.
- Restoring the old floating 🔧 button in any form.
- Building per-page mini-panels (everything lives at `/dev-notifications.html` now).

---

## 17. If Something Breaks

If any ported scenario fails:

1. **First check**: confirm the underlying StorageAPI hook still exists and works in isolation.
   ```javascript
   // In browser console while signed in:
   window.StorageAPI.__devRestoreGamState({ xp: 100, level: 2, streakCount: null });
   window.StorageAPI.getXpInfo(); // should return { xp: 100, level: 2 }
   ```
2. **Second check**: verify the new panel is loading the StorageAPI by checking `window.StorageAPI` in console after panel renders.
3. **Third check**: callable failures → check Cloud Functions logs:
   ```powershell
   npx -y firebase-tools@latest functions:log --only devSnapshotSave,devSnapshotRestore,devSeedLeaderboard,devClearLeaderboard --lines 30
   ```
4. **Do NOT** revert the old panel as a workaround. Fix forward — the old panel is on the chopping block regardless.

If after one full debugging cycle a scenario cannot be ported, document it in a `MIGRATION_BLOCKERS.md` file and ask the human before proceeding to old-panel deletion.

---

## 18. Final Sanity Check

After all 6 phases complete and before declaring done:

- [ ] `Test-Path "js/dev-tools.js"` → False
- [ ] No `<script defer src="js/dev-tools.js">` anywhere in the workspace
- [ ] Floating 🔧 button no longer appears on any page (test dashboard, leaderboard, profile, quests in incognito)
- [ ] `/dev-notifications.html` shows the 6 new sections + the original notification sections
- [ ] All 22 items in §13 smoke checklist pass
- [ ] Production crons still fire (check `firebase functions:log` for the last scheduled run)
- [ ] Non-allowlisted user opening `/dev-notifications.html` is redirected to `/dashboard.html`
- [ ] SW cache version is v156

Human reviews and signs off. Done.
