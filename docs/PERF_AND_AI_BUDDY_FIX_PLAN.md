# Performance & AI Buddy Consistency — Implementation Plan

**Audience:** AI coding agent generating actual code changes.
**Stack reminder:** Vanilla HTML/CSS/JS multi-page app. No framework. Tailwind via CDN. Firebase Auth + Firestore. PWA with service worker (`sw.js`). Each `*.html` page is a full reload — there is no SPA router. UI code goes through `window.StorageAPI` (`js/storage.js`), Firestore code goes through `window.FirestoreService` (`js/firestore-service.js`). All JS files are IIFEs.

---

## Issue 1 — Latency & Data Fetching

### 1.A Root-cause Analysis

#### A1. Leaderboard "30 second lag" — classic N+1 read amplification
`js/leaderboard.js → renderLeaderboard()` calls `FirestoreService.getFriends(myUserId)`. Inside `js/firestore-service.js → getFriends()`:

1. `1` read on `friends/{uid}/friends` (list of friends).
2. For **every** friend doc, a **separate** `getPublicProfile(friendUid)` call → `1` read on `users/{friendUid}`.
3. For **every** friend, a **write-back** `set({ publicProfile }, { merge:true })` to refresh the cached embedded copy.

Result for `N` friends: **`1 + N` reads + `N` writes** = `2N + 1` round-trips. At ~80–250 ms per Firestore round-trip on mobile, 15 friends = ~30 s. This is the dominant contributor.

The code **already stores a denormalized `publicProfile` inside each `friends/{uid}/friends/{friendUid}` document** (see `acceptFriendRequest` and the back-fill in `getFriends`) — but `getFriends` ignores it and re-fetches anyway. The cache is being written but never read.

Also: `renderLeaderboard()` does a `Promise.race([syncPromise, setTimeout(1200)])` **before** even starting the friend fetch. That adds up to 1.2 s of dead time on cold loads.

The dashboard widget (`#lbDashV3Rows` in `dashboard.html`) re-runs the same `renderLeaderboard()` flow because `js/leaderboard.js` is loaded on the dashboard page — paying the full N+1 cost twice in some flows.

#### A2. Site-wide 10–20 s page transitions
- The app is **not** an SPA. Every nav click is a full document load that re-parses Tailwind CDN (`https://cdn.tailwindcss.com` — ~300 KB JIT runtime, **render-blocking**), Google Fonts, Bootstrap Icons, and ~10 local `<script src>` tags loaded in **blocking** order at the bottom of each page.
- No `defer` / `async` / `type="module"` on app scripts.
- `js/leaderboard.js` (~30 KB+) is loaded on `dashboard.html` even though only a widget is needed.
- Service worker (`sw.js`) is cache-first **shell** strategy, but the project rule requires bumping `sugbocents-shell-vN` on every change. If the version is stale or the shell list is out of sync, browsers re-download every asset on each navigation.
- No Firestore offline persistence enabled → every page does a cold network hit.
- `app.js → revealPageContent()` likely waits on auth state before unhiding `#pageContent`; if the Firebase Auth handshake takes 1–3 s on cold load, the user perceives a blank skeleton until then.

#### A3. Other contributors observed
- `getExpenseDocs` runs a full `orderBy("timestamp","desc").get()` on every dashboard open with no `limit()`.
- No composite indexes declared in `firestore.indexes.json` for queries that need them (e.g. global_feed audience filter).
- `renderLeaderboard` runs a back-fill `set()` for every friend on every page load even when nothing changed.

---

### 1.B Fixes — Step-by-step

> **Order matters.** Steps 1–3 alone should drop the leaderboard from ~30 s to <1 s. Steps 4–7 cut perceived page transition cost by 60–80 %.

---

#### **Step 1 — Eliminate the N+1 in `getFriends()` (the big win)**
**File:** `js/firestore-service.js`

Rewrite `getFriends(userId)` to **read the embedded `publicProfile` from the friend doc itself** instead of fetching `users/{friendUid}` per friend.

Pseudocode:
```js
async function getFriends(userId) {
  if (!isFirestoreEnabled() || !userId) { return []; }
  var db = window.FirebaseInit.getDb();
  var snap = await db.collection("friends").doc(userId)
                     .collection("friends").get();
  if (snap.empty) { return []; }

  // 1 read total. Use the embedded snapshot — it is kept fresh by syncPublicProfile().
  var results = snap.docs.map(function (doc) {
    var data = doc.data() || {};
    var fallbackName = data.displayName
      || (data.publicProfile && data.publicProfile.displayName)
      || "Friend";
    return Object.assign(
      { uid: doc.id },
      normalizePublicProfile(data.publicProfile, fallbackName)
    );
  });

  // Cache UIDs + light profile for global_feed and dashboard widget.
  cacheFriendUids(userId, results);

  // Background revalidation — DO NOT await. Refresh stale embedded copies
  // via Firestore `in` queries (10 IDs per query, max).
  revalidateFriendProfilesInBackground(userId, results);

  return results;
}
```

Add helper `revalidateFriendProfilesInBackground(userId, friends)`:
- Filter to friends whose `publicProfile.lastSyncedAt` is older than **15 minutes** OR whose `weekMondayKey` is not the current Monday (stale week data).
- Chunk those UIDs into groups of 10 and run `db.collection("users").where(firebase.firestore.FieldPath.documentId(), "in", chunk).get()` — **1 read per 10 friends** instead of 1 per friend.
- For each returned doc, write back `friends/{userId}/friends/{friendUid} { publicProfile: normalized }` only if the data actually changed (compare hash of relevant fields). Skip the write otherwise.
- Wrap in `try/catch`. Never throw to the caller.
- After successful refresh, dispatch `window.dispatchEvent(new CustomEvent("sugbocents:friendsRefreshed"))` so leaderboard can re-render with fresh numbers.

**Why this fixes the 30 s lag:** `2N + 1` Firestore round-trips become **1 round-trip** for the user-visible render. Background refresh runs `ceil(N/10)` reads off the critical path.

---

#### **Step 2 — Render leaderboard from cache first, no awaiting**
**File:** `js/leaderboard.js → renderLeaderboard()`

1. Remove the blocking `await Promise.race([syncPromise, setTimeout(1200)])`. Make `syncPublicProfile()` **fire-and-forget** (`.catch(noop)`), no `await`.
2. The existing `loadPlayersCache(myUserId)` path is correct — keep it. Just make sure it renders **before** any `await` and that the await chain runs after the first paint.
3. Subscribe to the `sugbocents:friendsRefreshed` event from Step 1 and call a lightweight re-render path that re-uses the cached self profile (no extra fetch).
4. Do not call `getPublicProfile(myUserId)` separately for self — read from the local `StorageAPI.getXpInfo()` + cached `getCurrentUser()` (already in memory). Self data should never trigger a network read on render.

---

#### **Step 3 — Dashboard leaderboard widget: dedicated minimal path**
**Files:** `js/leaderboard.js`, `dashboard.html`

1. Add a new exported function `renderDashboardLeaderboardWidget()` that:
   - Reads cached friends via the new `FirestoreService.getCachedFriends(userId)` (already exists — use it).
   - Renders only **top 5 + self** into `#lbDashV3Rows` synchronously.
   - Triggers `getFriends()` once, in the background, then re-renders if the result changed.
2. Remove `<script src="js/leaderboard.js"></script>` from `dashboard.html` if the dashboard widget is migrated to its own tiny module. Otherwise add a guard inside `leaderboard.js` so the full-page render path only runs when `document.body.dataset.page === "leaderboard"` (it already does — verify and keep), and the dashboard branch only does the cache-first widget path.
3. Preload friend UIDs once on app boot in `app.js` (not on every page) and broadcast via `CustomEvent`.

---

#### **Step 4 — Enable Firestore offline persistence**
**File:** `js/firebase-init.js`

After initializing Firestore, call:
```js
db.enablePersistence({ synchronizeTabs: true })
  .catch(function (err) {
    // 'failed-precondition' = multi-tab without sync; 'unimplemented' = browser unsupported. Both safe to ignore.
  });
```
This makes repeated reads of the same docs (very common across page transitions) hit local IndexedDB instead of the network — typically a **~10× speedup** on warm navigations.

---

#### **Step 5 — Defer non-critical scripts; remove Tailwind CDN runtime**
**Files:** all `*.html` pages

1. Add `defer` to **every** local `<script src="js/...">` tag. They will execute in document order *after* HTML parse — eliminating render-blocking.
2. Move third-party `<script src="https://cdn.tailwindcss.com">` to a build-time CSS export OR keep it but mark it `defer` AND inline a small critical-CSS block in `<head>` covering the above-the-fold layout (`.app-shell`, `.resource-bar`, top nav, skeleton). This stops the multi-second flash where the Tailwind JIT runtime parses the page.
3. Replace `<link href="https://fonts.googleapis.com/css2?...">` with `<link rel="preconnect">` + `<link rel="preload" as="style">` and add `font-display: swap` to the existing `:root` font stack so the page renders in the system font and swaps in.
4. Remove `js/leaderboard.js` from pages that don't need it (`profile.html`, `activity.html`, `settings.html`, `shop.html`, `achievements.html`, `quests.html`, `tigom.html`, `chat.html`, `stats.html`).

---

#### **Step 6 — Bound the recent-expense query**
**File:** `js/firestore-service.js → getExpenseDocs()`

Add an optional `limit` parameter, defaulting to `200`. Dashboard "recent expenses" only shows the latest few; the activity page can request the full list explicitly.

```js
async function getExpenseDocs(userId, limit) {
  ...
  var q = db.collection("users").doc(userId).collection("expenses")
            .orderBy("timestamp", "desc");
  if (typeof limit === "number" && limit > 0) { q = q.limit(limit); }
  var snapshot = await q.get();
  ...
}
```
Update callers in `js/storage.js` to pass `limit` where appropriate.

---

#### **Step 7 — Service-worker version bump and route-level caching**
**File:** `sw.js`

1. Bump `CACHE_NAME` to `sugbocents-shell-v<next>`. Confirm the shell file list contains every file currently shipped.
2. Add a network-first-with-fallback handler for HTML navigations so a slow network does not block the cached shell:
   ```js
   self.addEventListener("fetch", function (e) {
     if (e.request.mode === "navigate") {
       e.respondWith(
         fetch(e.request).catch(function () { return caches.match("/index.html"); })
       );
       return;
     }
     // existing cache-first for static assets
   });
   ```
3. Add `firebasestorage.googleapis.com` and `fonts.gstatic.com` to a stale-while-revalidate cache so font/icon downloads stop blocking subsequent navs.

---

#### **Step 8 — Backend: Firestore indexes**
**File:** `firestore.indexes.json`

Declare composite indexes for:
- `expenses` collection group: `(timestamp DESC)` — already implicit; add explicitly if any `where + orderBy` query is added.
- `global_feed`: `(audience array-contains, timestamp DESC)` for the friends-only feed query in `renderLiveFeed`.
- Any future `users` query that filters by `publicProfile.weekMondayKey` and orders by `publicProfile.weeklyXP DESC` for global rankings.

After editing, deploy with `npx -y firebase-tools@latest deploy --only firestore:indexes`.

---

#### **Step 9 — (Optional, for true scale) Cloud Function aggregator**
**File:** `functions/index.js`

If friend counts ever exceed ~50, add an HTTPS callable `getLeaderboardSnapshot({ userId })` that:
- Reads `friends/{userId}/friends` server-side.
- Batches `users` reads with `getAll(...refs)`.
- Returns a single JSON payload of ranked rows.
- Uses Cloud Function memory cache keyed by `userId + weekMondayKey` with a 30 s TTL.

Client-side: `FirestoreService.getLeaderboardSnapshot(userId)` calls the function with `firebase.functions().httpsCallable("getLeaderboardSnapshot")`. Falls back to the client-side path if the function errors. **Defer until friends/user routinely > 50.**

---

### 1.C Why these fixes resolve the 30 s lag — quantified

| Fix | Before (15 friends) | After |
|---|---|---|
| `getFriends` N+1 → 1 read | 31 round-trips (~5–30 s) | 1 round-trip (~80–250 ms) |
| Background revalidate via `in` query | 0 | 2 reads, off critical path |
| Remove 1.2 s `Promise.race` block | +1.2 s blocked | 0 |
| Firestore `enablePersistence` | every read hits network | warm reads from IndexedDB (~5 ms) |
| Cache-first dashboard widget | full re-fetch | instant render from `localStorage` |

End-to-end leaderboard time-to-interactive on a warm load drops from `~30 s` to **`<300 ms`**. Cold load (no cache) drops to roughly **`one Firestore RTT + render`** (~400 ms).

---

## Issue 2 — AI Buddy Component Consistency

### 2.A Standardization Plan

The AI Buddy is currently **copy-pasted HTML** (`<!-- FLOATING TIGOM CHAT FAB -->`) in `dashboard.html`, `activity.html`, `leaderboard.html`, `quests.html`. Missing on `profile.html`, `goals` (does not exist as a separate page; the goals UI lives inside `tigom.html` / dashboard widget — confirm scope with user if "Goals" must be a standalone page), `settings.html`, and missing on `achievements.html`, `shop.html`, `tigom.html`, `chat.html`, `stats.html`.

**`activity.html` special case:** The FAB is present in the HTML, but `js/mascot.js` is also loaded on this page. `mascot.js → buildWidget()` injects a second floating button (`#mascotFab`) at the same bottom-right position, which visually covers the FAB. The old mascot widget must be suppressed on `activity.html` — either by removing `<script src="js/mascot.js">` from that page, or by extending the `buildWidget()` guard to also skip `data-page="activity"`.

**Strategy (matches existing project pattern):** since this is a multi-page vanilla app with no layout wrapper, the equivalent of a "Global Layout" is the `app.js` runtime that auto-injects shared chrome (it already does this for `#resourceBar` and bottom sheets via `injectResourceBar()`). The AI Buddy must follow the same pattern.

---

### 2.B Implementation — Step-by-step

#### **Step 1 — Remove all hand-written FAB HTML**
**Files:** `dashboard.html`, `leaderboard.html`, `quests.html`

Delete every `<!-- FLOATING TIGOM CHAT FAB -->` block and the `<a href="chat.html" class="fixed z-30 ...">…</a>` element that follows it. The element will be injected globally instead.

**`activity.html` — do NOT delete the FAB HTML yet.** Instead, remove the overlap source:
- In `activity.html`, extend the `mascot.js` page guard (inside `js/mascot.js → buildWidget()`) to skip rendering when `data-page === "activity"`, **or** remove `<script src="js/mascot.js"></script>` from `activity.html` entirely (preferred — `activity.html` has no chat panel or mascot-state display that requires the old widget; the inline FAB already handles navigation to `chat.html`).
- After the old mascot widget is gone, `activity.html`'s existing inline FAB is the correct element. It will be migrated to the global injector in Step 2 along with the other pages.

---

#### **Step 2 — Add `injectAiBuddy()` to `js/app.js`**
**File:** `js/app.js`

Add a function that mirrors the existing `injectResourceBar()` pattern:

```js
function injectAiBuddy() {
  // Skip if not a protected page (don't show on landing/login/register).
  if (document.body.getAttribute("data-protected") !== "true") { return; }
  // Don't render on the chat page itself — would be redundant.
  if (document.body.getAttribute("data-page") === "chat") { return; }
  // Idempotent.
  if (document.getElementById("aiBuddyFab")) { return; }

  var fab = document.createElement("a");
  fab.id = "aiBuddyFab";
  fab.href = "chat.html";
  fab.className = "sc-chat-fab";  // existing class in css/style.css line ~5856
  fab.setAttribute("aria-label", "Open Tigom AI chat");
  fab.innerHTML = '<!-- existing inner SVG/markup pulled from dashboard.html -->';

  document.body.appendChild(fab);
}
```

Call `injectAiBuddy()` from the same DOM-ready / auth-resolved block that already calls `injectResourceBar()`.

---

#### **Step 3 — State / props passed to the FAB**

Because this is vanilla JS, "props" are just data attributes the FAB reads via `StorageAPI`. The FAB itself is stateless (it's a link), but if the design needs a notification dot or mood color it should subscribe to the existing event bus:

```js
window.addEventListener("sugbocents:dataChanged", updateAiBuddyState);
window.addEventListener("sugbocents:moodChanged", updateAiBuddyState);

function updateAiBuddyState() {
  var fab = document.getElementById("aiBuddyFab");
  if (!fab || !window.StorageAPI) { return; }
  var mood = window.StorageAPI.getTigomMood ? window.StorageAPI.getTigomMood() : "neutral";
  fab.dataset.mood = mood;  // CSS targets [data-mood="happy"], etc.
  // optional unread-tip badge:
  var unread = window.StorageAPI.getAiUnreadCount ? window.StorageAPI.getAiUnreadCount() : 0;
  fab.dataset.unread = unread > 0 ? String(unread) : "";
}
```

Add the matching CSS in `css/style.css` (same file that already has `.sc-chat-fab`):
```css
.sc-chat-fab[data-mood="stressed"] { outline-color: rgba(217,72,72,0.45); }
.sc-chat-fab[data-mood="happy"]    { outline-color: rgba(43,130,89,0.55); }
.sc-chat-fab[data-unread]:not([data-unread=""])::after {
  content: attr(data-unread);
  position: absolute; top: -4px; right: -4px;
  background: #d94848; color: #fff; font-size: 0.65rem; font-weight: 900;
  padding: 0.15rem 0.4rem; border-radius: 9999px;
}
```

---

#### **Step 4 — Verify pages**
After Step 1–3, the FAB must auto-appear on every page where `data-protected="true"` is set on `<body>`:
`dashboard, profile, activity, settings, quests, leaderboard, achievements, shop, tigom, stats`.
It must **not** appear on `landing, login, register, chat`.

---

#### **Step 5 — Bump service-worker cache version**
**File:** `sw.js`

Bump `CACHE_NAME` to the next version (project rule). The HTML files have changed (FAB removed) and `app.js` + `style.css` have changed.

---

## Acceptance Criteria

### Performance
- [ ] Leaderboard page TTFI ≤ **1 s** on a warm load with 15+ friends (was 30 s).
- [ ] Dashboard leaderboard widget renders within **300 ms** of page paint.
- [ ] Network panel shows **1 Firestore read** for `getFriends` on warm cache (was N+1).
- [ ] Repeat navigation between dashboard ↔ leaderboard ↔ profile is < 1 s with service worker warm.
- [ ] No render-blocking scripts in `<head>` other than the dark-mode boot inline script.

### AI Buddy
- [ ] Single source of truth: only one `<a id="aiBuddyFab">` element exists in the DOM at any time.
- [ ] FAB visible on `profile, activity, settings, achievements, shop, tigom, stats` (all the previously-missing pages).
- [ ] FAB hidden on `landing, login, register, chat`.
- [ ] FAB updates `data-mood` reactively when `sugbocents:dataChanged` fires.
- [ ] No `<!-- FLOATING TIGOM CHAT FAB -->` comment remains in any HTML file.

---

## File-Change Summary

| File | Change |
|---|---|
| `js/firestore-service.js` | Rewrite `getFriends`; add background revalidate helper; add `limit` to `getExpenseDocs` |
| `js/leaderboard.js` | Remove 1.2 s blocking race; subscribe to `friendsRefreshed`; add `renderDashboardLeaderboardWidget` |
| `js/firebase-init.js` | Call `db.enablePersistence({ synchronizeTabs: true })` |
| `js/app.js` | Add `injectAiBuddy()` + `updateAiBuddyState()`; call from DOM-ready block |
| `js/storage.js` | Pass `limit` through any `getExpenseDocs` callers |
| `dashboard.html`, `activity.html`, `leaderboard.html`, `quests.html` | Delete inline FAB markup |
| All `*.html` | Add `defer` to `<script src="js/…">` tags; drop `js/leaderboard.js` from non-leaderboard pages |
| `css/style.css` | Add `.sc-chat-fab[data-mood]` and `[data-unread]` rules |
| `sw.js` | Bump `CACHE_NAME`; add `navigate` network-first handler |
| `firestore.indexes.json` | Declare indexes for `global_feed.audience` etc. |
| `functions/index.js` | (Optional) `getLeaderboardSnapshot` callable for >50 friends |
