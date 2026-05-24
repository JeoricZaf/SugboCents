# Profile & Social System — Fix & Feature Plan (Hand-off Ready)

> **Audience**: A junior/lower-tier AI (or developer) implementing this end-to-end.
> **Scope**: Profile page + Friends + Leaderboard + Settings + Gamification sync + Firestore rules.
> **Out of scope**: Notifications (push/email/in-app inbox) — owned by another team member, do NOT touch.
> **Stack reminder**: Vanilla HTML/CSS/JS PWA. Tailwind via CDN. Firebase Auth + Firestore. No build step. Every JS file is an IIFE. All persistence goes through `window.StorageAPI`.

---

## ⚠️ Read this first — non-negotiable rules

Before editing **any** file, re-read:
- [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- [.github/instructions/javascript.instructions.md](../.github/instructions/javascript.instructions.md)
- [.github/instructions/html-pages.instructions.md](../.github/instructions/html-pages.instructions.md)
- [.github/instructions/service-worker.instructions.md](../.github/instructions/service-worker.instructions.md)
- [.github/instructions/styling.instructions.md](../.github/instructions/styling.instructions.md)

Hard rules:
1. **Never** call `localStorage` directly from UI code. Always go through `window.StorageAPI` ([js/storage.js](../js/storage.js)).
2. **Every** JS file is `(function () { ... })();`. No ES modules, no `import`/`export`.
3. Use `var` in browser-side JS (not `let`/`const`). Cloud Functions code may use `const`/`let` to match `functions/index.js`.
4. Currency is PHP. Format with `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`.
5. All HTML uses `<meta charset="UTF-8">`. Emoji must be real Unicode, never mojibake.
6. **Bump the service worker cache version** in [sw.js](../sw.js) every time a shell file changes (current `sugbocents-shell-vN` → `vN+1`). Also add any new file to the `SHELL_FILES` array.
7. Validate every change with `get_errors` before marking a step complete.
8. Do not invent new tech (no React, no bundlers, no frameworks). Plain DOM API only.
9. Tigom voice: warm, slightly cheeky, encouraging. Use ₱ and occasional emoji (🐾🔥💚). Never punitive.

---

## 📋 What this plan delivers

A **working, polished, trustworthy** profile and friends system. Specifically:

| Area | Today | After this plan |
|---|---|---|
| Settings toggles | 3 are fake (don't save) | All persist + reflected in behavior |
| Friend request UX | Buried 3+ taps deep | Discoverable; live count on Profile nav |
| Friend remove | API exists, no UI | Confirm dialog on profile + leaderboard rows |
| Friend block | Not implemented | Block/unblock with rules enforcement |
| Public profile | One-shot read, frozen data | Live updates via `onSnapshot` |
| Friend search | Friend code only | Name search + QR + share-link deep link |
| Friend profile detail | Top-line stats only | Tabs: Overview / Achievements / Streak / Weekly chart |
| Friend activity on dashboard | Invisible (only on leaderboard) | Top-3 widget that animates on new entries |
| Avatars & display name | Initials, name-only | Editable display name + preset avatar stickers |
| Achievement claim | Client-only, double-claim possible | Server-validated via Cloud Function |
| Quest progress | localStorage only, lost on device switch | Synced to Firestore |
| Firestore rules | 3 known holes | Locked down |
| Stale `publicProfile` copies | Embedded snapshots go stale | Denormalizer keeps `displayName` fresh |

---

## 🗺️ How this document is organized

The work is split into **5 Phases**. Each phase is independently shippable. **Complete phases in order.** Within a phase, steps are also ordered.

- **Phase 1** — Trust restoration (small, high-leverage correctness fixes)
- **Phase 2** — Server-authoritative gamification + claim validation
- **Phase 3** — Realtime profile + friends UX upgrade
- **Phase 4** — Friend discovery (search, QR, share link) + identity (display name, avatars)
- **Phase 5** — Friend profile detail view + dashboard activity widget

Every step has a **"Definition of Done"** checklist. A step is **not** complete until every box can be ticked by manual test.

## ✅ Implementation Status Snapshot (May 14, 2026)

Use this as the handoff checkpoint for future chats.

- [x] **Phase 1 — Trust Restoration**
- [x] Step 1.1 — Wire the three dead Settings toggles
- [x] Step 1.2 — Friend Remove UI
- [x] Step 1.3 — Duplicate Friend Request Guard
- [x] Step 1.4 — Auto-create user doc on registration
- [x] Step 1.5 — Race-fix accept flow
- [x] Step 1.6 — Tighten Firestore rules
- [x] Step 1.7 — Bump SW cache
- [ ] **Phase 2 — Server-Authoritative Gamification**
- [ ] Step 2.1 — claimAchievement Cloud Function
- [ ] Step 2.2 — Sync quest progress to Firestore
- [ ] Step 2.3 — Server-stamped daily/weekly boundaries
- [x] **Phase 3 — Realtime Profile + Friends UX Upgrade**
- [x] Step 3.1 — Realtime listeners (onSnapshot)
- [x] Step 3.2 — Friend Request Count Badge on Profile Nav
- [x] Step 3.3 — Inline Accept Action on Profile
- [x] Step 3.4 — Empty / Loading / Offline States
- [x] Step 3.5 — Bump SW cache
- [x] **Phase 4 — Friend Discovery + Identity**
- [x] Step 4.1 — Editable Display Name
- [x] Step 4.2 — Friend Search by Name
- [x] Step 4.3 — QR Code + Share Link
- [x] Step 4.4 — Preset Avatar Stickers (emoji-avatar V1)
- [x] Step 4.5 — displayName Denormalizer Cloud Function
- [x] Step 4.6 — Bump SW cache
- [ ] **Phase 5 — Friend Profile Detail View + Activity Widget**
- [ ] Step 5.1 — Friend Profile Tabs
- [ ] Step 5.2 — Friend Activity Widget on Dashboard
- [ ] Step 5.3 — Final SW cache bump

## 🧾 Completed Change Rundown (for Next Chat)

- Phase 1.1: Added streak preference persistence (`streakNotifications`, `streakWeeklySummary`, `streakEnabled`) in storage + settings initial-state wiring.
- Phase 1.2: Added remove-friend action menus and confirmation flows on both profile and leaderboard, with Firestore remove calls wired.
- Phase 1.3: Added duplicate request guards (`already_pending`, `incoming_pending`) in friend request service and surfaced messages in UI.
- Phase 1.4: Added/used `seedUserDoc` during register/login to ensure user docs exist before social actions.
- Phase 1.5: Added explicit in-flight accept state (`Accepting...`) and awaited list/request refreshes to prevent flicker/race artifacts.
- Phase 1.6: Tightened rules for friend-edge creation and global feed audience constraints.
- Phase 3.1: Added realtime Firestore subscriptions for profile, friends, requests, and leaderboard updates, with cleanup unsubscribers.
- Phase 3.2: Added live Profile nav pending-request badge updates.
- Phase 3.3: Added inline Accept/Decline request actions on profile cards with decline service method.
- Phase 3.4: Added loading, empty, and offline states (including cached fallback rendering + retry behavior) for social lists.
- Phase 4.1: Added editable display name with validation/counter and persistence; propagated displayName in rendering/sync paths.
- Phase 4.2: Added name-prefix search API + profile search dropdown with debounce, friend-state aware buttons, and inline add/accept actions.
- Phase 4.3: Added QR modal/share-link flow and deep-link handoff across index redirect, auth flow, and profile auto-consume.
- Phase 4.4: Added avatar picker (emoji preset V1) + avatar persistence and rendering across sidebar/profile/leaderboard.
- Phase 4.5: Added `onPublicProfileWrite` Cloud Function denormalizer to push displayName/avatar updates into friend edge snapshots.
- Phase 4.6: Added Firestore index config wiring and bumped service worker shell cache version.

### Remaining Scope

- Phase 2 in full.
- Phase 5 in full.

---

## 🧭 Universal "Definition of Done" rules

For every step in this document, a step is only "done" when **all** of these are true:
- [ ] Code compiles with no diagnostics (`get_errors` returns clean for every file you touched).
- [ ] Manual test scenario in the step passes in a real browser, not just by reading code.
- [ ] If you touched a shell file (HTML/CSS/JS used by the PWA), `sw.js` cache version was bumped and the new file path was added to `SHELL_FILES` if it's new.
- [ ] If you touched [js/storage.js](../js/storage.js), the change is documented in a one-line comment above the new method explaining what it stores.
- [ ] No `localStorage.setItem` / `localStorage.getItem` calls outside [js/storage.js](../js/storage.js) and [js/dark-mode.js](../js/dark-mode.js) (the only allowed exceptions).
- [ ] No new `console.error` left in production code paths (use `try/catch` and silently degrade).
- [ ] Firestore rules deployed (`npx -y firebase-tools@latest deploy --only firestore:rules`) if you touched [firestore.rules](../firestore.rules).
- [ ] Cloud Functions deployed (`npx -y firebase-tools@latest deploy --only functions`) if you touched [functions/index.js](../functions/index.js).
- [ ] No emoji mojibake in any file you touched.

---

# PHASE 1 — Trust Restoration

**Goal**: Fix the "broken promises" that make users distrust the app. Small wins, big perception shift.
**Time budget**: ~3–4 hours.

## Step 1.1 — Wire the three dead Settings toggles

### What's broken
[js/settings.js](../js/settings.js) lines ~115–155 contain three `wireVisualToggle(...)` calls for `streakReminderTrack`, `streakWeeklyTrack`, and `streakEnabledTrack`. Each callback calls `window.StorageAPI.savePreferences({ key: value })`, but **`savePreferences()` in [js/storage.js](../js/storage.js) does not handle these keys**, so the value is silently dropped. The toggle slides visually but does nothing on reload.

### Why we're fixing this
A toggle that pretends to work is the worst kind of bug — it actively trains users to distrust the app. Fixing this is a 30-minute change that restores trust in the Settings page.

### How to implement
1. Open [js/storage.js](../js/storage.js). Search for `savePreferences`. Find the function (a method on `StorageAPI`).
2. Identify the existing handled keys (e.g., `weeklyBudget`, `firstName`, `compactExpenses`). Note the pattern — it usually merges into `user` and saves the store.
3. Add handlers for these three new keys, persisting them onto the `user` object:
   - `streakNotifications` — boolean — default `true`
   - `streakWeeklySummary` — boolean — default `true`
   - `streakEnabled` — boolean — default `true`
4. In the same file, add a `getStreakPreferences()` helper that returns `{ streakNotifications, streakWeeklySummary, streakEnabled }` with defaults applied for missing keys. Expose it on `window.StorageAPI`.
5. In [js/settings.js](../js/settings.js), at the top of the wiring block, **read** the saved values via `getStreakPreferences()` and pass them as the initial state to `wireVisualToggle` (replace the hardcoded `true`/`false` defaults).
6. In [js/storage.js](../js/storage.js) `syncGamificationFields()`, add these three keys to the Firestore-synced fields list so they survive device switches.

### Definition of Done
- [ ] Toggle each of the 3 switches → reload page → switch state is preserved.
- [ ] Open Firestore console → user doc has `streakNotifications`, `streakWeeklySummary`, `streakEnabled` as booleans.
- [ ] Toggle on Device A → on Device B (same account), after a sync trigger (logging an expense), the values match.
- [ ] No console errors on Settings page load.

> Note: These preferences are *persisted* by this step. The actual notification *behavior* they control is owned by the notifications team — you do not need to wire any reminder logic. Storage only.

---

## Step 1.2 — Friend Remove UI

### What's broken
[js/firestore-service.js](../js/firestore-service.js) line ~475 exports `removeFriend()`. **No UI calls it.** Users physically cannot unfriend anyone without devtools.

### Why we're fixing this
Basic safety hygiene. Every social platform must allow disengagement. Without it, abuse becomes impossible to escape.

### How to implement
1. In [js/profile.js](../js/profile.js), find `loadFriendsList()` (renders friend cards, around line 460+).
2. On each friend card, append a small overflow `⋯` button (use existing icon SVG or a Bootstrap Icon class consistent with the page).
3. Clicking `⋯` opens an inline action sheet (use the existing modal/bottom-sheet pattern from this page if there is one — otherwise a simple absolute-positioned `<div>` styled with Tailwind). Options:
   - "View profile" (navigates to `profile.html?uid=...`)
   - "Remove friend" (red text)
4. Clicking "Remove friend" opens a confirmation dialog: "Remove [Name] from your friends? Their activity will no longer appear in your feed."
   - Buttons: **Cancel** (secondary) / **Remove** (destructive, brand-red).
5. On confirm, call `window.FirestoreService.removeFriend(myUid, friendUid)`. On success: re-render the friends list, show a toast "Removed [Name]".
6. **Critical companion fix**: In [js/firestore-service.js](../js/firestore-service.js) `removeFriend()`, after the batch commit, **invalidate the friend cache** by calling `localStorage.removeItem(getFriendCacheKey(userId))`. Without this, [js/firestore-service.js](../js/firestore-service.js) `writeGlobalFeedEntry()` keeps broadcasting your activity to the removed friend for up to 24 hours.
7. Reuse the same UI on leaderboard friend rows ([js/leaderboard.js](../js/leaderboard.js) `renderRows()` around line 430). Same overflow menu, same confirm dialog.

### UI Specifics
- **Overflow button**: 32×32 px tap target, neutral grey icon, hover/active subtle bg.
- **Action sheet**: white card, 12 px border radius, soft shadow, 8 px padding per row, 14 px font.
- **Confirm dialog**: centered modal, 320 px max width, 24 px padding, brand-red destructive button (`#c0392b` or your existing `--danger` token), close-on-backdrop-tap, close-on-Escape.
- Match dark-mode by reading `document.documentElement.dataset.darkMode === "true"`.

### Definition of Done
- [ ] On profile.html, every friend card shows a `⋯` button.
- [ ] Tapping it opens the action sheet; tapping outside dismisses it.
- [ ] "Remove friend" → confirm dialog → confirm → friend disappears from the list **immediately** (not after reload).
- [ ] Firestore: both sides of the friend edge are deleted (check `friends/{me}/friends/{them}` AND `friends/{them}/friends/{me}` in console).
- [ ] `localStorage` no longer has the removed friend in the friend-cache key.
- [ ] Same flow works on leaderboard rows.
- [ ] Cancel button does nothing destructive.
- [ ] Works in dark mode.

---

## Step 1.3 — Duplicate Friend Request Guard

### What's broken
[js/firestore-service.js](../js/firestore-service.js) `sendFriendRequest()` only checks if the users are already friends. It does NOT check for an existing pending request. Two rapid clicks → two writes; spammy and confusing on the receiver side.

### How to implement
1. In `sendFriendRequest(myUserId, targetUserId, ...)`, after the existing "already friends" check and before the `set` call, add:
   - Read `friends/{targetUserId}/requests/{myUserId}` (the pending request doc).
   - If `exists` → return `{ ok: false, error: "already_pending", message: "You've already sent a request to this person." }`.
2. Also check the reverse: `friends/{myUserId}/requests/{targetUserId}` — if it exists, the *other* person already sent you a request. Return `{ ok: false, error: "incoming_pending", message: "They've already sent you a request — accept it instead." }` so the UI can react.
3. In [js/profile.js](../js/profile.js) where `sendFriendRequest` is called, handle the two new error codes by surfacing the friendly `message` via `setAddStatus(...)`.

### Definition of Done
- [ ] Add a friend → click "Add" again immediately → second click shows "You've already sent a request..." instead of writing again.
- [ ] User A sends to User B → User B types A's friend code and clicks Add → message says "They've already sent you a request — accept it instead."
- [ ] No duplicate docs in Firestore.

---

## Step 1.4 — Auto-create user doc on registration

### What's broken
Firebase Auth registers a user, but `users/{uid}` is not written until the first expense save. Friend lookups against fresh users return null silently → "Add Friend" appears to succeed but the receiver shows no record.

### How to implement
1. Open [js/firebase-auth-service.js](../js/firebase-auth-service.js). Find the registration success path.
2. Immediately after auth registration succeeds, call a new helper in [js/firestore-service.js](../js/firestore-service.js): `seedUserDoc(uid, { firstName, lastName, email })`.
3. In `firestore-service.js`, implement `seedUserDoc()`:
   - Use `set` with `{ merge: true }` on `users/{uid}` so it never overwrites an existing doc.
   - Write minimal fields: `firstName`, `lastName`, `email`, `createdAt: new Date().toISOString()`, `publicProfile: { displayName: <firstName + lastName>, displayNameLower: <lowercase>, level: 1, xp: 0, currentStreak: 0, weeklyXP: 0 }`.
4. Also call `seedUserDoc()` on **first successful login** (in case the user was created before this fix) — guarded by a `set merge` so it's idempotent.

### Definition of Done
- [ ] Register a brand-new test account → check Firestore → `users/{uid}` doc exists with the seeded fields **before** any expense is logged.
- [ ] From a second account, look up the new user by friend code → public profile loads (not null).
- [ ] Existing users still work — re-login does not erase any fields.

---

## Step 1.5 — Race-fix accept flow

### What's broken
[js/profile.js](../js/profile.js) auto-accept path (~line 380) fires `loadFriendRequests()` and `loadFriendsList()` without `await`. Firestore replication lag makes the friends list briefly render empty.

### How to implement
1. Make `loadFriendRequests` and `loadFriendsList` return their promises (they probably already are async — just `return` them).
2. In the auto-accept code path, do `await Promise.all([loadFriendRequests(myUid), loadFriendsList(myUid)])` before clearing the input and showing the toast.
3. Add a small "Accepting…" disabled state on the Add button during the await.

### Definition of Done
- [ ] Send a request from Account A. On Account B, type A's code and click Add (auto-accept fires).
- [ ] Friends list shows A *immediately* — never blank, never flickering.
- [ ] Add button is disabled with "Accepting..." text while in flight.

---

## Step 1.6 — Tighten Firestore rules

### What's broken
See the audit (`/memories/session/plan.md`) — three holes:
1. `users/{uid}` is fully readable to any authenticated user (leaks any private fields placed there).
2. `friends/{userId}/friends/{friendId}` allows either party to write unilaterally with no matching pending request.
3. `global_feed` create doesn't validate audience membership — anyone can broadcast to arbitrary UIDs.

### How to implement
1. Open [firestore.rules](../firestore.rules). Add helper:
   ```
   function isFriendOf(a, b) {
     return exists(/databases/$(database)/documents/friends/$(a)/friends/$(b));
   }
   function hasPendingFrom(target, requester) {
     return exists(/databases/$(database)/documents/friends/$(target)/requests/$(requester));
   }
   ```
2. **Friend edge rule** — replace existing:
   ```
   match /friends/{friendId} {
     allow read: if isOwner(userId) || isOwner(friendId);
     allow create: if (isOwner(userId) && hasPendingFrom(userId, friendId))
                    || (isOwner(friendId) && hasPendingFrom(friendId, userId));
     allow update: if false;
     allow delete: if isOwner(userId) || isOwner(friendId);
   }
   ```
3. **Global feed audience guard** — replace `create`:
   ```
   allow create: if isAuthenticated()
     && request.resource.data.authorUid == request.auth.uid
     && request.auth.uid in request.resource.data.audience
     && request.resource.data.audience.size() <= 100;
   ```
4. **Public profile narrowing** — long-term split is in Phase 2; for Phase 1 just verify nothing private is being written into `users/{uid}` top-level. Audit by searching the codebase for `db.collection("users").doc(...).set(` and `.update(` and confirm no PII (email, payment info) goes outside an explicit `private` map. If anything sensitive is at the top level, move it into `users/{uid}/private/data` and add: `match /users/{userId}/private/{doc} { allow read, write: if isOwner(userId); }`
5. Deploy: `npx -y firebase-tools@latest deploy --only firestore:rules`.

### Definition of Done
- [ ] Rules deployed without errors.
- [ ] Manual test (using the Firestore Rules Playground or a second account):
  - [ ] Without a pending request, a write to `friends/{x}/friends/{y}` is **denied**.
  - [ ] With a pending request, the same write **succeeds**.
  - [ ] Creating a `global_feed` doc with `audience` not including yourself is **denied**.
  - [ ] Existing flows (send request, accept, write expense feed entry to your friends) all still work end-to-end.

---

## Step 1.7 — Bump SW cache

After Phase 1, in [sw.js](../sw.js), bump `sugbocents-shell-vN` by 1. Add no new file paths (Phase 1 doesn't introduce new files unless you created a new modal partial — if you did, add it).

---

# PHASE 2 — Server-Authoritative Gamification

**Goal**: Stop trusting the client for XP, achievements, and quest state. Make device-switching reliable; make double-claim impossible.
**Time budget**: ~5–7 hours.

## Step 2.1 — `claimAchievement` Cloud Function

### What's broken
[js/storage.js](../js/storage.js) line ~1495 awards XP locally based on `unlockedAchievements.includes(id)`. Two browser tabs can race and both pass the check → +30 XP for one badge. No server validates the claim.

### Why we're fixing this
Foundational integrity. Without server validation, future leaderboards / sentimos economy / shop is exploitable. We fix this once and never worry again.

### How to implement
1. Open [functions/index.js](../functions/index.js). Add a new HTTPS callable function `claimAchievement` that:
   - Takes `{ id: string }`.
   - Reads the caller's `users/{uid}` doc.
   - Looks up the achievement definition (you'll need to mirror the criteria map from [js/gamification.js](../js/gamification.js) — copy it into a small constant in `functions/index.js`).
   - Verifies eligibility (XP threshold met, expenses count met, etc.).
   - Verifies it's not already in `unlockedAchievements`.
   - Uses a Firestore transaction to add the achievement, increment XP, and update level — all atomically.
   - Returns `{ ok: true, awardedXp, newLevel }` or `{ ok: false, error }`.
2. Add rate limit: max 10 claims/min per uid (use the existing rate-limit pattern in `functions/index.js` for `chat`/`emojiSuggest`).
3. In [js/storage.js](../js/storage.js), change `claimAchievement(id)` to:
   - Optimistically mark a "pending" flag on the local achievement.
   - Call the Cloud Function.
   - On success: write the server-returned XP/level into local store; emit `sugbocents:dataChanged`.
   - On failure: revert pending flag, surface error via toast.
4. Deploy: `npx -y firebase-tools@latest deploy --only functions:claimAchievement`.

### Definition of Done
- [ ] Open same account in two browser tabs.
- [ ] In tab A, trigger an achievement. In tab B before tab A finishes, trigger the same achievement.
- [ ] Final XP gain = single award (not double).
- [ ] Cloud Functions log shows one successful and one rejected claim.
- [ ] Offline → trigger achievement → reconnect → claim eventually succeeds (or surfaces a clean retry path).

---

## Step 2.2 — Sync quest progress to Firestore

### What's broken
[js/storage.js](../js/storage.js) `syncGamificationFields()` (~line 618) syncs `xp`, `level`, `unlockedAchievements`, `notifiedAchievements`. It does NOT sync `activeQuest`, `questHistory`, `questsCompleted`, daily/weekly quest state, streak freeze counts, or sentimos log. Clear browser data → all quests gone. Switch device → quest state reverts.

### How to implement
1. In `syncGamificationFields()`, add to the synced field list: `activeQuest`, `questHistory`, `questsCompleted`, `dailyQuestState`, `weeklyQuestState`, `streakFreezeCount`, `sentimosLog` (verify exact key names by searching [js/quests.js](../js/quests.js) and [js/storage.js](../js/storage.js)).
2. In the merge-from-Firestore path (`syncFromFirestore()` ~line 637), apply the same fields back to local store. **Use last-write-wins by `lastUpdated` timestamp** — if the local copy has a more recent `lastUpdated`, keep local.
3. Add a `lastUpdated` ISO timestamp on every quest mutation in [js/quests.js](../js/quests.js).
4. Bump SW cache version.

### Definition of Done
- [ ] Complete a quest on Device A → log out → log in on Device B → quest is marked complete.
- [ ] Clear localStorage on Device A → reload → log in → quest history reappears from Firestore.
- [ ] No conflicts when both devices online simultaneously (later write wins).

---

## Step 2.3 — Server-stamped daily/weekly boundaries

### What's broken
Daily quest reset and streak break detection use **local time** ([js/quests.js](../js/quests.js) ~line 50, [js/app.js](../js/app.js) ~line 45). Travel + multi-device users break streaks unfairly.

### How to implement
1. Standardize on **Asia/Manila** (`Asia/Manila`, UTC+8, no DST) as the canonical timezone for all day/week boundaries.
2. In [js/storage.js](../js/storage.js), add a helper `getManilaDayKey(date)` that returns `YYYY-MM-DD` in Manila time regardless of device timezone. Use `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" })`.
3. Replace every `new Date().toISOString().slice(0, 10)`-style day key in [js/quests.js](../js/quests.js), [js/app.js](../js/app.js), [js/leaderboard.js](../js/leaderboard.js), and [js/storage.js](../js/storage.js) with `StorageAPI.getManilaDayKey(...)`.
4. Same for week-Monday key — `getManilaMondayKey(date)`.

### Definition of Done
- [ ] Change device timezone to e.g. UTC-8 → log an expense → daily quest progress matches what Manila time would show.
- [ ] Streak does not break when crossing timezones during the day.

---

# PHASE 3 — Realtime Profile + Friends UX Upgrade

**Goal**: Make the app feel "alive". Friend changes appear without reload. Inbox is discoverable.
**Time budget**: ~5–6 hours.

## Step 3.1 — Realtime listeners (`onSnapshot`)

### What's broken
[js/profile.js](../js/profile.js) `loadPublicProfile()` and friend list fetches are one-shot. Data is frozen at navigation time.

### How to implement
1. In [js/firestore-service.js](../js/firestore-service.js), add new methods:
   - `onPublicProfileChange(uid, callback) → unsubscribe` using `db.collection("users").doc(uid).onSnapshot(...)` and invoking `callback(data.publicProfile)`.
   - `onFriendsChange(myUid, callback) → unsubscribe` on the friends subcollection.
   - `onFriendRequestsChange(myUid, callback) → unsubscribe` on the requests subcollection.
2. In [js/profile.js](../js/profile.js):
   - Replace the one-shot `loadFriendsList`/`loadFriendRequests` calls with subscriptions.
   - Store the unsubscribe functions in a module-scoped array.
   - On `pagehide` / `beforeunload`, call all unsubscribes to prevent leaks.
3. Same for [js/leaderboard.js](../js/leaderboard.js) live feed rows.

### Definition of Done
- [ ] Open profile.html on Device A. From Device B (different account that's a friend), accept a pending request → Device A shows the new friend within ~2 seconds, **no reload**.
- [ ] Friend's level/streak updates within ~2 seconds when they earn XP elsewhere.
- [ ] Closing the page does not leak listeners (verify via Chrome DevTools → Performance → memory).

---

## Step 3.2 — Friend Request Count Badge on Profile Nav

### What we're adding
A small numeric pill on the Profile sidebar/bottom nav link showing pending friend request count. Like the existing quest badge in [js/app.js](../js/app.js) ~line 559 (`.quest-nav-badge`).

### Why
Discovery. Today, requests are invisible until you randomly open Profile. A live count makes them findable.

### How to implement
1. In [js/app.js](../js/app.js), add a `.profile-nav-badge` element next to the Profile nav link. Hidden by default.
2. Subscribe via `FirestoreService.onFriendRequestsChange(myUid, ...)` once on app boot (after auth resolves). Update badge count + visibility.
3. Reuse the styling pattern from `.quest-nav-badge` (red circle, white text, small font, top-right corner).

### Definition of Done
- [ ] When a friend request arrives, badge appears on Profile nav within ~2 seconds across all open pages.
- [ ] Accepting/declining a request decrements the badge live.
- [ ] Badge hides at zero.
- [ ] Works on both desktop sidebar and mobile bottom nav.
- [ ] Persists styling in dark mode.

---

## Step 3.3 — Inline Accept Action on Profile

### What we're adding
Each pending request card on profile.html should have **Accept** (primary brand-green) and **Decline** (secondary outline) buttons inline. Today the accept flow only fires automatically when you re-enter the friend's code in the Add input — not discoverable.

### How to implement
1. In [js/profile.js](../js/profile.js) `loadFriendRequests` render path, append two buttons per request card.
2. Accept → `FirestoreService.acceptFriendRequest(...)`.
3. Decline → new method in [js/firestore-service.js](../js/firestore-service.js) `declineFriendRequest(myUid, requesterUid)` that deletes `friends/{myUid}/requests/{requesterUid}` only.
4. After either action, no manual reload — the realtime listener (Step 3.1) updates the list.
5. Confirm dialog on Decline: "Decline request from [Name]? They won't be notified."

### UI specifics
- Card layout: avatar (32 px) | name + "wants to connect" | [Decline] [Accept]
- Buttons: pill shape, 36 px tall, 12 px horizontal padding.
- Accept = `--brand-700` background, white text.
- Decline = transparent, `--brand-700` border, `--brand-700` text.

### Definition of Done
- [ ] Pending request shows clear Accept/Decline buttons.
- [ ] Accept → both users become friends within ~2 sec.
- [ ] Decline → request disappears, requester is not notified, requester does NOT become a friend.
- [ ] Re-sending after decline works.
- [ ] Works in dark mode.

---

## Step 3.4 — Empty / Loading / Offline States

### What's broken
[js/profile.js](../js/profile.js) `loadFriendsUI` hangs forever when offline. No skeleton, no retry button, no message.

### How to implement
1. Add three render states to friend list and request list:
   - **Loading**: Tailwind skeleton (3 rows of grey pulsing bars).
   - **Empty (friends)**: illustration/emoji `🐾` + "No friends yet — share your code below."
   - **Empty (requests)**: hidden entirely (don't show empty section).
   - **Offline**: "You're offline. Showing cached data." with a small retry button.
2. Detect offline via `navigator.onLine` and listen to `online`/`offline` events.
3. On offline, fall back to the cached friend UID list (`getFriendCacheKey()` already in storage); render minimal cards with cached `displayName` only, dim the level/XP placeholders.

### Definition of Done
- [ ] First load shows skeleton for ~half a second, then real content.
- [ ] New account with no friends shows the empty state and CTA.
- [ ] Disable wifi → reload profile → "You're offline" banner + cached friends visible.
- [ ] Re-enable wifi → tap retry → live data flows back in.

---

## Step 3.5 — Bump SW cache

After Phase 3, bump `sugbocents-shell-vN`. Add any new partial files.

---

# PHASE 4 — Friend Discovery + Identity

**Goal**: Make adding friends frictionless. Make profiles feel like *you*.
**Time budget**: ~6–8 hours.

## Step 4.1 — Editable Display Name

### What we're adding
A `displayName` field on `users/{uid}.publicProfile` that the user can edit, separate from `firstName`/`lastName`. Default is `"<firstName> <lastName>"`.

### Why
Identity expression. Today everyone is "Carlos Dela Cruz" with no personality. People want nicknames.

### How to implement
1. In [settings.html](../settings.html), add an "Display Name" text input to the Profile section.
2. Wire it in [js/settings.js](../js/settings.js) — on blur or save, call `StorageAPI.savePreferences({ displayName: value })`.
3. In [js/storage.js](../js/storage.js):
   - Handle the `displayName` key in `savePreferences`.
   - In `syncGamificationFields()` and the public profile sync path, write `publicProfile.displayName` and `publicProfile.displayNameLower` (lowercase, trimmed — for prefix search in Step 4.2).
4. Update everywhere that renders a user's name to prefer `publicProfile.displayName` if present, else `firstName + " " + lastName`. Files: [js/profile.js](../js/profile.js), [js/leaderboard.js](../js/leaderboard.js), [js/app.js](../js/app.js) sidebar avatar block.
5. Validation: max 24 chars, allow letters/numbers/spaces/`._-`, strip emojis (V1 — emoji avatars come in Step 4.4).

### UI specifics
- Input: 240 px wide, 14 px font, brand-focus ring, character counter `12/24` below.
- Save state: small "Saved ✓" affordance for 1.5 sec on success.

### Definition of Done
- [ ] Set display name in Settings → reload → name persists.
- [ ] Profile, leaderboard, and sidebar all show the new name.
- [ ] Friend on another account sees the updated name (via Step 4.5 denormalizer or fallback to fresh fetch).
- [ ] Empty/whitespace defaults back to `firstName + lastName`.

---

## Step 4.2 — Friend Search by Name

### What we're adding
A search input on profile.html that lets users type a name and find people, instead of requiring a friend code.

### How to implement
1. In [profile.html](../profile.html) Friends section, above the Add-by-code input, add a Search input with debounce (300 ms).
2. In [js/firestore-service.js](../js/firestore-service.js), add `searchUsersByName(prefix) → array of public profiles`:
   - Use Firestore range query: `where("publicProfile.displayNameLower", ">=", prefix.toLowerCase()).where("publicProfile.displayNameLower", "<", prefix.toLowerCase() + "\uf8ff").limit(10)`.
   - This requires a Firestore composite index — add it to [firestore.indexes.json](../firestore.indexes.json) (create the file if missing) and deploy.
3. Render results as a dropdown list under the search input. Each row: avatar, display name, friend code in muted text, and an Add button (or "Friends ✓" / "Pending" state if applicable).
4. Reuse `getFriendStatus` to compute the right button state per result.

### UI specifics
- Search input: full-width, 40 px tall, magnifier icon prefix.
- Results dropdown: max 320 px tall, scrollable, white card with shadow.
- Empty results: "No one found. Try their friend code instead."

### Definition of Done
- [ ] Type 2+ characters → see matching users within ~500 ms.
- [ ] Add button works inline.
- [ ] Already-friends show "Friends ✓" disabled.
- [ ] Pending shows "Pending" disabled.
- [ ] Self does not appear in results.
- [ ] Index deployed (verify in Firestore console → Indexes).

---

## Step 4.3 — QR Code + Share Link

### What we're adding
Two more ways to add a friend: scan a QR code in person, or tap a share link.

### Why
Mobile-native pattern. Asking "what's your friend code" by voice is high-friction; flashing a QR is instant.

### How to implement
1. **QR generation**: Use a tiny vanilla QR library (e.g., `qrcode-generator` via CDN — verify it's small, no dependencies). Add to [profile.html](../profile.html) script tags.
2. Add a "Show my QR" button in the My Code card that opens a modal containing the QR encoding the share link `https://<your-domain>/index.html?addFriend=<friendCode>` (substitute actual production domain).
3. Below the QR: large display of the friend code + Copy button.
4. **Share link handler** in [js/index-redirect.js](../js/index-redirect.js): on page load, read `?addFriend=` query param. If present and user is logged in, store it in `sessionStorage` then redirect to profile.html. On profile.html, on load, check `sessionStorage` for the pending add-friend code, prefill the Add-by-code input, and auto-submit.
5. If not logged in, redirect to login first; preserve the `?addFriend=` param through the redirect chain.

### UI specifics
- QR modal: white card, 280 px square QR, 24 px padding, brand-green close button.
- QR contrast: black on white only — never inverted in dark mode (QR scanners need contrast).

### Definition of Done
- [ ] Tap "Show my QR" → modal opens with a scannable QR.
- [ ] Scan with phone camera → opens browser to share link → if logged in, profile.html opens with the friend's code prefilled and the request fires automatically.
- [ ] Not-logged-in flow: scan → land on login → after login, redirected to profile.html with code prefilled.
- [ ] Copy button copies the friend code (not the URL).

---

## Step 4.4 — Preset Avatar Stickers

### What we're adding
A small library (12–16) of preset avatar stickers users can pick instead of the auto-initial. Tigom variants + emoji-style faces.

### Why
Identity expression continued. Initials are anonymous. Avatars create attachment.

### How to implement
1. Place SVG/PNG sticker files in `assets/images/avatars/` (e.g., `tigom-default.svg`, `tigom-sleepy.svg`, `tigom-cheer.svg`, `face-01.svg` … `face-12.svg`). For V1, just emoji works too — store the emoji string as the avatar value.
2. Add an avatar picker on Settings: a grid of 4 columns × 3-4 rows showing the options. Selected option has a brand-green ring.
3. Persist via `StorageAPI.savePreferences({ avatar: "tigom-default" })`. Sync to `publicProfile.avatar`.
4. In all avatar render sites ([js/profile.js](../js/profile.js), [js/leaderboard.js](../js/leaderboard.js), [js/app.js](../js/app.js) sidebar):
   - If `avatar` is set → render the sticker.
   - Else → fall back to initial.
5. Avatar size variants: 32 / 48 / 96 px depending on context.

### UI specifics
- Picker grid: 64 px tap targets, 12 px gap, brand-green selection ring (3 px).
- Sticker container: circular crop with `border-radius: 50%`, soft shadow on hover.

### Definition of Done
- [ ] Select an avatar in Settings → reload → it persists.
- [ ] Profile page header shows it.
- [ ] Friends and leaderboard rows show the friend's chosen avatar.
- [ ] Picker selection state visually clear in light + dark mode.

---

## Step 4.5 — `displayName` Denormalizer Cloud Function

### What we're fixing
Embedded `publicProfile` snapshots in `friends/{me}/friends/{them}` go stale when the friend updates their name. Today no back-fill exists.

### How to implement
1. New Cloud Function `onPublicProfileWrite` in [functions/index.js](../functions/index.js):
   - Triggered on `users/{uid}` write.
   - Compares `before.publicProfile.displayName` and `after.publicProfile.displayName` (also `avatar` from Step 4.4).
   - If changed: read the user's friend list (from `friends/{uid}/friends/*`), then for each friend, update `friends/{friendUid}/friends/{uid}.publicProfile.displayName` and `.avatar`.
   - Use a batched write (chunks of 500).
2. Deploy.

### Definition of Done
- [ ] Account A changes display name → Account B (friend) sees the new name on their leaderboard/profile within ~5 sec without any client action.
- [ ] Function logs show successful runs with no exceptions.

---

## Step 4.6 — Bump SW cache

After Phase 4, bump cache. Add any new asset paths under `assets/images/avatars/` to `SHELL_FILES` if you want them precached (recommended for the 12 default stickers).

---

# PHASE 5 — Friend Profile Detail View + Activity Widget

**Goal**: Give the social loop somewhere to land. Make friend progress feel rich. Surface friend activity on the dashboard.
**Time budget**: ~6–8 hours.

## Step 5.1 — Friend Profile Tabs

### What we're adding
When viewing `profile.html?uid=<friendUid>`, render the friend's profile with **four tabs**:
1. **Overview** — current top-line stats (already exists).
2. **Achievements** — grid of unlocked badges with dates.
3. **Streak** — current streak + history bar (last 30 days as small bars: green = logged, grey = missed).
4. **Weekly** — weekly XP chart (last 8 weeks bar chart).

### Why
The social comparison loop ends after one screen today. Tabs give friends something to explore — drives return visits and friendly competition.

### How to implement
1. In [profile.html](../profile.html), add a `<div data-public-only>` block containing tab nav + 4 tab panels (initially only Overview visible).
2. Tab nav: 4 segmented buttons, brand-green underline on active. Match the existing chip/tab pattern from other pages if one exists — search for `data-tab` or similar across the codebase.
3. In [js/profile.js](../js/profile.js) `loadPublicProfile`:
   - Fetch additional fields from `users/{uid}`: `unlockedAchievements`, `expenses` (last 30 days only — limit + orderBy timestamp desc), `weeklyHistory` (last 8 weeks).
   - For weekly history: if not already a stored field, derive from expenses on read (store as `publicProfile.weeklyHistory` going forward — write in `syncPublicProfile`).
4. Render each tab. Reuse existing achievement card markup from [achievements.html](../achievements.html) for visual consistency.
5. Streak history bar: 30 small vertical divs, green if there's an expense that day, neutral grey otherwise.
6. Weekly chart: simple inline SVG bar chart, 8 bars, brand-green fill, value labels on hover (mobile: always visible below).

### UI specifics
- Tabs: 44 px tap targets, swipe-friendly on mobile.
- Streak bar row: 30 × (8 px wide × 24 px tall) bars, 2 px gap.
- Weekly chart: 240 px wide, 80 px tall, axis labels in muted text.

### Definition of Done
- [ ] Visiting a friend's profile shows 4 tabs.
- [ ] Each tab renders without console errors.
- [ ] Streak history accurately reflects which days the friend logged.
- [ ] Weekly chart shows last 8 weeks (gracefully handles new accounts with <8 weeks of history).
- [ ] All tabs respect Firestore rules (no leaks of private data).
- [ ] Works in dark mode.

---

## Step 5.2 — Friend Activity Widget on Dashboard

### What we're adding
A card on dashboard.html showing the **3 most recent friend activity events** (logged expense, leveled up, completed quest, unlocked achievement). Tap → leaderboard live feed.

### Why
Friend activity is currently invisible unless users open leaderboard. A passive surface on dashboard creates the "alive" feeling.

### How to implement
1. In [dashboard.html](../dashboard.html), add a new `<section data-friend-activity>` between existing budget card and recent expenses card.
2. New file [js/friend-activity-widget.js](../js/friend-activity-widget.js) (IIFE):
   - On boot, subscribe via `FirestoreService.onFriendFeedChange(myUid, callback)` (new method — `onSnapshot` on `global_feed where audience array-contains myUid orderBy timestamp desc limit 3`).
   - Render the 3 most recent entries.
   - Card layout: avatar + "Carlos logged ₱150 lunch" + relative time ("2m ago"). Tap entry → leaderboard with that entry highlighted.
   - "See all activity →" link at the bottom → leaderboard.
3. Add `friend-activity-widget.js` to:
   - [dashboard.html](../dashboard.html) `<script>` tags (after `firestore-service.js`).
   - [sw.js](../sw.js) `SHELL_FILES` array.
4. New entries should animate in (slide-down + fade) — respect `prefers-reduced-motion`.

### UI specifics
- Card: same 16 px border radius / shadow as other dashboard cards.
- Empty state: "No friend activity yet. Add a friend to see what they're up to!" with a button → profile.html.
- Loading: skeleton 3 rows.

### Definition of Done
- [ ] Dashboard shows the widget.
- [ ] When a friend logs an expense, the widget updates within ~3 sec without reload.
- [ ] Animation runs on new entries (and is suppressed under `prefers-reduced-motion`).
- [ ] Tapping an entry deep-links to leaderboard.
- [ ] Empty state appears for users with 0 friends and points them to profile.

---

## Step 5.3 — Final SW cache bump

After Phase 5, bump `sugbocents-shell-vN` once more. Verify all new files are in `SHELL_FILES`.

---

# 🧪 Final System-Wide Smoke Test

After all 5 phases, run this end-to-end test with **two real accounts (A and B)** in two browsers:

1. [ ] Register account A → Firestore has `users/{A}` doc immediately.
2. [ ] Register account B → same.
3. [ ] On A, search for B by name → tap Add → Firestore shows pending request.
4. [ ] On B, profile nav badge shows `1` within ~2 sec.
5. [ ] On B, accept the request inline → no reload needed.
6. [ ] On A, friends list shows B within ~2 sec.
7. [ ] On A, change display name → on B's leaderboard, A's new name appears within ~5 sec.
8. [ ] On A, change avatar → reflected on B within ~5 sec.
9. [ ] On A, log an expense → B's dashboard widget shows it within ~3 sec.
10. [ ] On A, unlock an achievement → claim → check Firestore → exactly one award (no double).
11. [ ] In two A tabs, claim same achievement simultaneously → only one succeeds.
12. [ ] On A, complete a quest → log out → log in on a new device → quest stays completed.
13. [ ] On A, change device timezone to UTC-8 → log expense at "9 AM Manila" local → daily quest credits the correct Manila day.
14. [ ] On B, view A's profile → all 4 tabs render → streak history matches A's actual log days.
15. [ ] On A, remove B → friend cache cleared → next A activity does NOT appear in B's feed.
16. [ ] On A, scan B's QR code → friend request fires.
17. [ ] On A, tap share link to B → after login flow, request fires.
18. [ ] Disable wifi on A → profile shows "offline" banner + cached data → no infinite spinner.
19. [ ] Toggle each Settings switch → reload → switches persist.
20. [ ] Try to write `friends/{A}/friends/{X}` directly via Firestore console as A without a pending request from X → write **denied** by rules.

If all 20 pass, the system is ready to ship.

---

# 📌 Things explicitly excluded from this plan

- **Notifications** (push, email, in-app inbox) — owned by another team member.
- **Friend-to-friend chat / DMs** — separate feature, future sprint.
- **Block / mute** — design pending; do not implement yet.
- **Sentimos gifting between friends** — separate feature.
- **Public profile URLs** (`/u/<handle>`) — future SEO work.
- **Refactoring `js/storage.js` into modules** — too risky right now; do as a separate dedicated sprint.

---

# 🆘 If you get stuck

Common pitfalls and how to recover:
- **"Storage method missing"** — Check [.github/instructions/javascript.instructions.md](../.github/instructions/javascript.instructions.md) and use the "add-storage-method" prompt in `.github/prompts/`.
- **Service worker not updating** — Bump the cache version in [sw.js](../sw.js); also unregister the SW in DevTools → Application → Service Workers → Unregister, then hard reload.
- **Firestore rules deny a legit write** — Open Firebase console → Firestore → Rules Playground; paste the failing path and auth uid to see which clause denies it.
- **Composite index missing** — Firebase will print a console error with a direct URL to create the index. Click it, wait ~minute, retry.
- **Mojibake in emoji** — Re-save the file as UTF-8 without BOM. Search for known mojibake sequences (`ðŸ`) and replace with the real Unicode character.
- **Two pages disagree about a user's data** — You're missing an `onSnapshot` listener somewhere; convert the one-shot read.

---

**End of plan.** Implement Phase 1 → test → Phase 2 → test → … in order. Do not skip phases.
