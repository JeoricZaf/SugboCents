# Leaderboard Bug Fix Plan

**Audit Date:** May 13, 2026
**Scope:** `js/leaderboard.js`, `js/firestore-service.js`, `js/storage.js`, `leaderboard.html`, `firestore.rules`

---

## Priority Matrix

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Cross-week weeklyXP bleed for offline friends | **Critical** | ☑ Implemented |
| 2 | Cross-week weeklyQuestsCompleted bleed | **Critical** | ☑ Implemented |
| 3 | Client-side score spoofing (no Firestore validation) | **Critical** | ☑ Implemented |
| 4 | Leaderboard cache not user-scoped | **Moderate** | ☑ Implemented |
| 5 | Dashboard widget missing debounce on Firestore reads | **Moderate** | ☑ Implemented |
| 6 | Movement indicator semantics: cache vs. week-over-week | **Moderate** | ☑ Implemented |
| 7 | `scheduleRender` silently drops update if guard is held | **Moderate** | ☑ Implemented |
| 8 | `syncPublicProfile` friend backfill capped at 20 | **Moderate** | ☑ Implemented |
| 9 | `resolveWeeklyQuestCount` fast paths are dead code | **Minor** | ☑ Implemented |
| 10 | IntersectionObserver accumulation memory leak | **Minor** | ☑ Implemented |
| 11 | `addExpense` syncPublicProfile omits weeklyQuestsCompleted | **Minor** | ☑ Implemented |
| 12 | Friend-edge rank poisoning via friends ACL + cached profile trust | **Critical** | ☑ Implemented |
| 13 | Duplicate-self rank distortion from missing UID dedupe | **Moderate** | ☑ Implemented |
| 14 | Tie-rank manipulation via mutable displayName tiebreak | **Moderate** | ☑ Implemented |
| 15 | Local-vs-global source-of-truth drift causes rank jumping | **Moderate** | ☑ Implemented |
| 16 | Live feed pipeline mismatch + stale audience cache drift | **Moderate** | ☑ Implemented |
| 17 | Empty Firestore expense sync branch preserves stale local state | **Moderate** | ☑ Implemented |

---

## Bug #1 — Cross-Week weeklyXP Bleed for Offline Friends

**Severity:** Critical

**Impact:** Every friend who doesn't open the app after Monday rollover retains last week's `weeklyXP` in their Firestore public profile indefinitely. Other users see an inflated score for those friends for the entire new week. 100% of inactive users are affected every Monday.

**File:** `js/firestore-service.js` → `syncPublicProfile()`

**Root Cause:** `syncPublicProfile` writes `weeklyXP` to Firestore only when called. The weekly XP reset logic runs correctly client-side during `addXpInternal`, but the public profile in Firestore is only ever updated when the app is open and actively syncing. There is no scheduled Cloud Function or Firestore trigger that zeros `weeklyXP` at Monday midnight for all users.

**Exploit Scenario:**
1. Week A ends. User B earned 400 weeklyXP — their public profile reads `weeklyXP: 400`.
2. Week B begins. User B does not open the app for 3 days.
3. User A opens the leaderboard. `getFriends()` reads User B's Firestore profile — still `weeklyXP: 400`.
4. `computeLeagueScore({ weeklyXP: 400 })` = 400 points awarded this week for nothing.
5. User A's real weekly XP is 150. User B ranks ahead despite being completely inactive.

**Fix Plan:**
- Add a scheduled Cloud Function (`onSchedule`) that fires every Monday at 00:01 PHT (UTC+8).
- The function queries all `users` collection docs and writes `publicProfile.weeklyXP = 0` and `publicProfile.weeklyQuestsCompleted = 0` via a batched write (500 docs per batch).
- Alternatively, add server-side week validation inside `syncPublicProfile`: compute `weekMondayKey` server-side and compare against a stored `weeklyXpStartDate` on the public profile — reset to 0 if the key is stale before writing.

---

## Bug #2 — Cross-Week weeklyQuestsCompleted Bleed

**Severity:** Critical

**Impact:** Same mechanism as Bug #1 but for quest completions. Each stale quest completion carries a 50-point bonus (`weeklyQuestsCompleted × 50`). A user who completed 5 quests last week and goes offline bleeds 250 phantom points into the new week. 100% of users who completed quests and don't sync at week start are affected.

**File:** `js/firestore-service.js` → `syncPublicProfile()`, lines ~213–224

**Root Cause:** The `syncPublicProfile` recalculation fallback for `weeklyQuestsCompleted` only runs when the received value is exactly falsy:
```js
var weeklyQuestsCompleted = Number(user.weeklyQuestsCompleted || 0);
if (!weeklyQuestsCompleted && Array.isArray(user.questHistory)) { // recalculate }
```
If the caller passes a stale non-zero value (as the leaderboard page does with `self.weeklyQuestsCompleted`), the falsy check is skipped and the stale value is written directly to Firestore. With no TTL or reset mechanism on the public profile field, it persists until the user opens the app again.

**Exploit Scenario:**
1. User B completes 4 quests in Week A.
2. Week B starts. User B is offline. Firestore public profile still reads `weeklyQuestsCompleted: 4`.
3. User A's leaderboard awards User B `4 × 50 = 200` phantom quest points for the new week.

**Fix Plan:**
- Addressed jointly with Bug #1 via the Monday reset Cloud Function.
- Additionally, inside `syncPublicProfile`, always re-derive `weeklyQuestsCompleted` from `questHistory` filtered to the current `weekMondayKey`, regardless of what the caller passes. Never trust the caller's pre-computed value for weekly fields.

---

## Bug #3 — Client-Side Score Spoofing

**Severity:** Critical

**Impact:** Any user can manipulate `xp`, `streak`, `weeklyQuestsCompleted`, and `level` in `localStorage`, trigger a `syncPublicProfile` call, and inject arbitrarily high scores into Firestore. Every friend of that user would see the spoofed rank. 100% of competitive rankings are undermined.

**File:** `firestore.rules` → `/users/{userId}` rule (line 75); `js/firestore-service.js` → `syncPublicProfile()` entire function

**Root Cause:** The Firestore security rule for user documents is:
```
allow create, update: if isOwner(userId);
```
There is no field-level validation on `publicProfile`. `syncPublicProfile` writes values from client-controlled localStorage inputs with only `Number()` and `String()` casting — no range checks, no server-enforced ceiling, no Cloud Function intermediary. The entire scoring formula lives in the browser.

**Exploit Scenario:**
1. User opens DevTools → `Application > Local Storage`.
2. Edits `user.xp = 999999`, `user.streak = 210` in the `sugbocents.v1` key.
3. Navigates to `leaderboard.html` — triggers `syncPublicProfile`.
4. `syncPublicProfile` calls `db.collection("users").doc(userId).set({ publicProfile: { xp: 999999, weeklyXP: 999999, streak: 210 } })`.
5. Firestore writes succeed (owner has write permission, no field-level deny rules).
6. All friends now see this user atop the leaderboard.

**Fix Plan:**
- Move score computation server-side: create a Cloud Function `computeLeagueScore(userId)` that reads gamification fields from the trusted `users/{userId}` document (not the public profile), recomputes the score, and writes it back to `publicProfile.weeklyXP` and `publicProfile.weeklyQuestsCompleted`.
- Add field-level validation to `firestore.rules` for the `publicProfile` map using `request.resource.data.publicProfile`:
  - `streak` must be a number between 0 and 365.
  - `weeklyXP` must be a number between 0 and a reasonable cap (e.g., 5000).
  - `weeklyQuestsCompleted` must be a number between 0 and 12 (max pool size).
  - `level` must be between 1 and 7.
- At minimum, add Firestore rules that reject writes where public profile fields exceed their theoretical maximum given the game design constants.

---

## Bug #4 — Leaderboard Cache Not User-Scoped

**Severity:** Moderate

**Impact:** On shared devices, User A's leaderboard data (friend names, initials, scores) persists in `localStorage` under a static key and is immediately rendered for User B when they log in. This exposes User A's social graph and score data to an unintended viewer.

**File:** `js/leaderboard.js` → `loadPlayersCache()` / `savePlayersCache()`, lines ~226–234

**Root Cause:** The cache key is a static string `"sugbocents_lb_players_v2"` with no user-ID suffix. It is written on every successful `renderLeaderboard()` call and read on the next page load without checking if the cached data belongs to the currently authenticated user.

**Exploit Scenario:**
1. User A opens leaderboard → `sugbocents_lb_players_v2` saved with their ranking.
2. User A logs out.
3. User B logs in, navigates to leaderboard.
4. Cache loaded immediately, showing User A's friends list with User A marked as "You".
5. ~600ms later, fresh data overwrites it — but User A's data was briefly visible.

**Fix Plan:**
- Append the authenticated user's UID to the cache key:
  - `PLAYERS_CACHE_KEY = "sugbocents_lb_players_v2_" + userId`
- Similarly scope `SNAPSHOT_KEY` with the user ID.
- On logout (auth state change), clear both scoped keys.

---

## Bug #5 — Dashboard Widget Missing Debounce on Firestore Reads

**Severity:** Moderate

**Impact:** Every `sugbocents:dataChanged` event fires a full `getFriends()` Firestore read. When a user rapidly adds expenses (e.g., quick-add 5 items), the dashboard widget can fire 5 Firestore reads in rapid succession. The `_lbFetching` guard is also reset before DOM rendering completes, creating a window where a second fetch can start mid-render.

**File:** `js/leaderboard.js` → `renderDashboardWidget()`, lines ~960–975; event listener attachment, lines ~1130–1135

**Root Cause:** The dashboard widget binds `renderDashboardWidget` directly to `sugbocents:dataChanged` with no debounce, contrasting with the leaderboard page's 1200ms `scheduleRender()` approach. Additionally, `_lbFetching = false` is set after `getFriends()` resolves but before `sortRanking()` and DOM mutations complete, creating a narrow concurrency window.

**Exploit Scenario:**
1. User rapid-taps 4 quick-add expenses.
2. 4 `sugbocents:dataChanged` events fire within ~200ms.
3. Guard blocks calls 2–4 while call 1 awaits `getFriends()`.
4. `getFriends()` resolves → `_lbFetching = false`.
5. Call #2 (queued via event) immediately starts a second `getFriends()`.
6. Both renders race to set `rowsEl.innerHTML` and `rankEl.textContent`.

**Fix Plan:**
- Apply the same 1200ms debounce pattern used on the full leaderboard page:
  ```js
  var _lbDashDebounceTimer = null;
  function scheduleDashRender() {
    if (_lbDashDebounceTimer) { clearTimeout(_lbDashDebounceTimer); }
    _lbDashDebounceTimer = setTimeout(renderDashboardWidget, 1200);
  }
  window.addEventListener("sugbocents:dataChanged", scheduleDashRender);
  window.addEventListener("sugbocents:synced", scheduleDashRender);
  ```
- Move `_lbFetching = false` to the `finally` block after all DOM mutations complete.

---

## Bug #6 — Movement Indicator Semantics: Cache vs. Week-over-Week

**Severity:** Moderate

**Impact:** The `↑` / `↓` arrows visually imply "you improved/fell since last week," but they actually compare against the LAST COMPLETED RENDER. On the first load of a new week, stale cache rank vs. live Firestore rank produces misleading movement arrows.

**File:** `js/leaderboard.js` → `saveSnapshot()` / `getMoveIndicator()`, lines ~194–210

**Root Cause:** `saveSnapshot(ranked)` is called on every successful `renderLeaderboard()`. On the next render (even 1.2 seconds later), `loadSnapshot()` reads the just-saved snapshot, meaning movement arrows compare "last render" vs. "this render" rather than "Monday start" vs. "now." The snapshot is never anchored to a specific week.

**Exploit Scenario:**
1. Monday: User at rank #3, snapshot saved as `{ userA: 3 }`.
2. User earns XP → debounced re-render fires at rank #2. Arrow shows `↑`. Snapshot saved as `{ userA: 2 }`.
3. Page refresh → cache render shows rank #2, fresh render also shows rank #2. No `↑` shown even though the user genuinely climbed since Monday.
4. On Wednesday, no arrow reflects the true weekly trajectory.

**Fix Plan:**
- Add a week key to the snapshot: `{ weekKey: "2026-05-11", ranks: { uid: rank } }`.
- On load, if `snapshot.weekKey !== currentMondayKey`, discard the snapshot entirely (week boundary crossed — no historical comparison possible).
- `saveSnapshot` only writes once per week (on Monday), preserving the start-of-week baseline for the whole 7-day period.

---

## Bug #7 — `scheduleRender` Silently Drops Updates When Guard Is Held

**Severity:** Moderate

**Impact:** If a `sugbocents:synced` event fires while a Firestore read inside `renderLeaderboard()` is in progress, the debounced re-render call hits the `_lbRendering` guard and is dropped with no retry. The user never sees the update from that sync cycle.

**File:** `js/leaderboard.js` → `scheduleRender()`, lines ~815–821; `renderLeaderboard()` guard, line ~497

**Root Cause:**
```js
function scheduleRender() {
  if (_lbDebounceTimer) { clearTimeout(_lbDebounceTimer); }
  _lbDebounceTimer = setTimeout(function () {
    _lbDebounceTimer = null;
    renderLeaderboard(); // _lbRendering guard silently drops this if in-flight
  }, 1200);
}
```
The `onSynced` handler correctly retries with `setTimeout(renderLeaderboard, 400)` when it detects `_lbRendering`, but `scheduleRender` — used for ALL subsequent events — does not.

**Exploit Scenario:**
1. Leaderboard loads, `renderLeaderboard()` in-flight, waiting on a slow `getFriends()` (3s timeout path).
2. User completes a quest on another tab → dispatches `sugbocents:synced`.
3. `scheduleRender()` fires, 1200ms passes, calls `renderLeaderboard()`.
4. `_lbRendering` still `true` (slow network) → call dropped silently.
5. Quest completion is never reflected on the leaderboard.

**Fix Plan:**
- In `scheduleRender`, after the 1200ms delay, check `_lbRendering` and retry with a short backoff instead of dropping:
  ```js
  _lbDebounceTimer = setTimeout(function () {
    _lbDebounceTimer = null;
    if (_lbRendering) {
      setTimeout(renderLeaderboard, 400);
    } else {
      renderLeaderboard();
    }
  }, 1200);
  ```

---

## Bug #8 — `syncPublicProfile` Friend Backfill Capped at 20

**Severity:** Moderate

**Impact:** When a user syncs their profile, the push that updates their fresh data into each friend's cached copy is silently limited to 20 documents. Any user with more than 20 friends will have their updated profile missed for friends beyond the cap. Those friends' leaderboards will show the stale profile until their 30-minute cache expires.

**File:** `js/firestore-service.js` → `syncPublicProfile()`, line ~244: `.limit(20).get()`

**Root Cause:** A hard `.limit(20)` Firestore query cap on the friend list backfill, with no pagination or cursor-based continuation. The 21st+ friend silently receives no profile push.

**Fix Plan:**
- Implement cursor-based pagination using `startAfter()` to process all friend documents in batches of 20, continuing until the snapshot is exhausted.
- Since this is a background fire-and-forget operation, the additional Firestore reads are acceptable.

---

## Bug #9 — `resolveWeeklyQuestCount` Fast Paths Are Dead Code

**Severity:** Minor

**Impact:** `weeklyQuestsCompleted` for the current user is always computed via a full `questHistory` array scan. The two O(1) fast-path checks never execute, making every leaderboard render O(n) on quest history length.

**File:** `js/leaderboard.js` → `resolveWeeklyQuestCount()`, lines ~121–130; `js/storage.js` → `getCurrentUser()`, lines ~780–790

**Root Cause:** `resolveWeeklyQuestCount(runtimeUser, ...)` checks `runtimeUser.weeklyQuestsCompleted` first. But `getCurrentUser()` returns an object without a `weeklyQuestsCompleted` field — only `questsCompleted` (all-time total) is returned. Similarly, `ensureGamificationFields` does not initialize a `weeklyQuestsCompleted` field. Both fast-path checks evaluate to `false` 100% of the time.

**Fix Plan:**
- Add `weeklyQuestsCompleted` to the object returned by `getCurrentUser()` in `storage.js`.
- Compute it using the same `questHistory` filter scoped to the current `weekMondayKey` and cache the result on the user object.
- This makes the fast path live and eliminates the repeated O(n) scan.

---

## Bug #10 — IntersectionObserver Accumulation Memory Leak

**Severity:** Minor

**Impact:** Every call to `renderPinnedSelf()` creates a new `IntersectionObserver` on `#lbSelfRow` without disconnecting any prior observers. After N re-renders, N observers fire on every scroll event.

**File:** `js/leaderboard.js` → `renderPinnedSelf()`, lines ~372–380

**Root Cause:** No `observer.disconnect()` call before creating a new observer; no reference to the previous instance stored for cleanup.

**Fix Plan:**
- Store the observer reference in a module-scoped variable (`var _selfRowObserver = null`).
- At the top of `renderPinnedSelf()`, call `_selfRowObserver && _selfRowObserver.disconnect()` before creating a new one.

---

## Bug #11 — `addExpense` Calls `syncPublicProfile` Without weeklyQuestsCompleted

**Severity:** Minor

**Impact:** Two call sites for `syncPublicProfile` use different strategies to derive `weeklyQuestsCompleted`: the leaderboard page passes a pre-computed value; `addExpense` in `storage.js` omits it entirely, forcing the fallback `questHistory` scan. Functional parity issue — both should derive the value the same way.

**File:** `js/storage.js` → `addExpense()`, lines ~1055–1075 vs. `js/firestore-service.js` → `syncPublicProfile()`, lines ~213–224

**Fix Plan:**
- In `addExpense`, compute and pass `weeklyQuestsCompleted` explicitly before calling `syncPublicProfile`, using the same `questHistory` filter already available in that scope.
- Remove the fallback recalculation inside `syncPublicProfile` — the caller should always supply the value.

---

## Bug #12 — Friend-Edge Rank Poisoning via Friends ACL + Cached Profile Trust

**Severity:** Critical

**Impact:** A malicious account can inject spoofed ranking fields (`weeklyXP`, `streak`, `weeklyQuestsCompleted`) into a victim's friend-edge document and appear artificially high on the victim's leaderboard without earning points.

**File:** `firestore.rules` → `match /friends/{userId}/friends/{friendId}`; `js/firestore-service.js` → `getFriends()`

**Root Cause:** Friend-edge rules currently allow either side to update a friend link document, and `getFriends()` trusts embedded cached `publicProfile` values when `displayName` exists and `lastSyncedAt` appears fresh.

**Exploit Scenario:**
1. Attacker writes a forged `publicProfile` into `friends/{victimUid}/friends/{attackerUid}`.
2. Victim opens leaderboard and `getFriends()` reads the forged cache-hit profile.
3. Leaderboard score computation uses spoofed fields and ranks attacker unfairly.

**Fix Plan:**
- Restrict friends subcollection writes so cross-side writes are only allowed for reciprocal edge creation without arbitrary profile field spoofing.
- In `getFriends()`, derive leaderboard-critical fields from `users/{uid}.publicProfile` and treat friend-edge cached profile as display-only fallback.

---

## Bug #13 — Duplicate-Self Rank Distortion from Missing UID Dedupe

**Severity:** Moderate

**Impact:** If self UID is already present in the fetched friend list, the renderer appends self again, creating duplicate identity rows and off-by-one rank displacement for all lower rows.

**File:** `js/leaderboard.js` → `renderLeaderboard()` and dashboard widget ranking assembly

**Root Cause:** Player arrays are built as `friends + self` without deduplicating by `uid`.

**Exploit Scenario:**
1. Friend list includes current UID due to stale/forged friend-edge or data anomaly.
2. Renderer appends self object unconditionally.
3. Ranked list contains duplicate self entries and shifts rank positions.

**Fix Plan:**
- Add a UID dedupe pass before sorting.
- Prefer self-owned row for duplicate UID collisions.

---

## Bug #14 — Tie-Rank Manipulation via Mutable `displayName` Tiebreak

**Severity:** Moderate

**Impact:** Users can reorder tied ranks by editing their name, leap-frogging tied competitors without earning additional points.

**File:** `js/leaderboard.js` → `sortRanking()`; `js/settings.js` / `js/storage.js` profile updates

**Root Cause:** Sorting uses mutable `displayName` as the deterministic tiebreak key.

**Exploit Scenario:**
1. Two players share equal `leagueScore`.
2. One user changes name to alphabetically earlier value.
3. Next render places them above the tied user.

**Fix Plan:**
- Replace name-based tiebreak with immutable UID-based ordering.
- Keep `displayName` only for visual rendering.

---

## Bug #15 — Local-vs-Global Source-of-Truth Drift Causes Rank Jumping

**Severity:** Moderate

**Impact:** The active user's row can be computed from fresh local state while peers are computed from Firestore snapshots, producing temporary local rank optimism/pessimism and visible rank jumps.

**File:** `js/leaderboard.js` → `getSelf()` + `renderLeaderboard()`

**Root Cause:** Self score derives from local StorageAPI while friend scores derive from cloud profiles in the same sort pass; sync is fire-and-forget.

**Exploit Scenario:**
1. User gains XP locally.
2. Leaderboard computes self rank from local values before cloud profile catch-up.
3. Fresh cloud re-render changes position abruptly.

**Fix Plan:**
- Align leaderboard score source to cloud profile for both self and friends whenever Firebase mode is active.
- Await/coordinate self profile sync before final rank calculation, with bounded timeout fallback.

---

## Bug #16 — Live Feed Pipeline Mismatch + Stale Audience Cache Drift

**Severity:** Moderate

**Impact:** Activity entries can fail to appear in leaderboard feed or be visible to stale audiences due to producer/consumer mismatch and unscoped friend-cache audience construction.

**File:** `js/storage.js` → global feed writer path; `js/firestore-service.js` → `writeGlobalFeedEntry()` and friend cache keying; `js/leaderboard.js` → `renderLiveFeed()`

**Root Cause:** Producer writes to `global_feed`, while leaderboard reads legacy per-user feed path; audience is built from static friend cache key not scoped per user.

**Exploit Scenario:**
1. User logs expense and writes `global_feed` entry.
2. Leaderboard reads legacy feed collection and misses the event.
3. Account switch with stale friend cache can route visibility to wrong audience set.

**Fix Plan:**
- Read feed from `getMyFeedEntries()` (global feed) in leaderboard.
- Scope friend-cache audience key by UID and clear on logout.

---

## Bug #17 — Empty Firestore Expense Sync Branch Preserves Stale Local State

**Severity:** Moderate

**Impact:** When cloud expenses become empty (e.g., clears or multi-device state changes), stale local expenses can persist and continue influencing streak/ranking projections.

**File:** `js/storage.js` → `syncFromFirestore()` expense merge block

**Root Cause:** Local expense replacement only runs when Firestore returns a non-empty array.

**Exploit Scenario:**
1. Device A clears all expenses and cloud state becomes empty.
2. Device B syncs and skips overwrite because remote array length is 0.
3. Device B retains stale local expenses and derived streak/rank behavior.

**Fix Plan:**
- Treat Firestore expenses array (including empty) as authoritative during sync.
- Replace local expense list whenever Firestore returns an array.

---

## Implementation Order

**Phase 1 — Critical (do these first, they undermine fair play):**
1. Bug #3 — Add Firestore field-level validation rules for `publicProfile`.
2. Bugs #1 + #2 — Add Monday reset Cloud Function; fix `syncPublicProfile` to always re-derive weekly fields server-side.
3. Bug #12 — Harden friend-edge write rules and stop trusting cached friend-edge profile fields for ranking.

**Phase 2 — Moderate (fix before any public demo):**
4. Bug #4 — Scope cache keys to user UID.
5. Bug #7 — Add guard-aware retry to `scheduleRender`.
6. Bug #5 — Add debounce to dashboard widget event listeners.
7. Bug #6 — Anchor snapshot to `weekMondayKey`.
8. Bug #8 — Paginate friend backfill past 20.
9. Bug #13 — Deduplicate ranking inputs by UID before sorting.
10. Bug #14 — Switch tie-breaker to immutable UID ordering.
11. Bug #15 — Unify leaderboard score source of truth to cloud profile in Firebase mode.
12. Bug #16 — Use global feed read path and user-scoped friend cache audience.
13. Bug #17 — Make Firestore expense sync authoritative even when remote list is empty.

**Phase 3 — Minor (polish pass):**
14. Bug #9 — Add `weeklyQuestsCompleted` to `getCurrentUser()` return value.
15. Bug #10 — Disconnect stale IntersectionObserver in `renderPinnedSelf`.
16. Bug #11 — Unify `weeklyQuestsCompleted` derivation across both `syncPublicProfile` call sites.
