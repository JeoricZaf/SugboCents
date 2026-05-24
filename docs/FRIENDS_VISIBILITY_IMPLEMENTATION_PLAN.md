# Friends Visibility & Outgoing Requests — Implementation Plan

**Status:** Ready for handoff
**Owner:** Lower-tier AI implementer
**Estimated touch:** 7 files, ~250 lines net
**Out of scope:** Notifications system (separate plan), cross-device push, friend suggestions, blocking/reporting

---

## 1. Why this exists

The friends functionality on `profile.html` works but is **invisible**:

1. The mobile bottom-nav badge for incoming requests does not render correctly (it appears as a third text line under "Profile" instead of as a dot on the icon).
2. There is no visible **friend count** anywhere on the page.
3. There is no way to see, track, or cancel **outgoing (sent) friend requests** — once you click "Add", the request goes into a black hole until the recipient accepts or declines.

This plan fixes all three in two phases.

---

## 2. Definition of Done (overall)

A user must be able to:

- [ ] See a red dot with count on the Profile tab in the mobile bottom nav whenever they have incoming friend requests
- [ ] See "Barkada list · 7" (or similar) showing their total friend count, updated live
- [ ] See a "Sent Requests" section listing every friend request they've made that is still pending
- [ ] Cancel any outgoing request with one tap; both Firestore documents are deleted atomically
- [ ] See sent-request cards disappear in real time when the recipient accepts or declines
- [ ] Hear a meaningful screen-reader announcement (`aria-label`) on the Profile nav badge when count > 0

---

## 3. Architecture overview

### Existing data model
Friend requests live at `friends/{targetUserId}/requests/{requesterId}` — meaning the **target** owns the inbox. There is no symmetric record on the sender's side. That's why outgoing requests are invisible today.

### New data model
Add a sender-owned mirror at `users/{senderId}/sentRequests/{targetId}` written atomically alongside the inbox doc.

```
users/{userId}/sentRequests/{targetId}
  ├─ targetDisplayName: string
  └─ sentAt: ISO string
```

When the target accepts or declines, they delete BOTH their own inbox doc AND the sender's `sentRequests` doc in the same batch.

### Why this approach (not Cloud Function trigger)
A Cloud Function `onWrite` trigger could mirror writes server-side, but:
- Adds deployment dependency (the lower-tier AI may not have Functions deploy access)
- 1–3s latency on the sender's UI listener
- More moving parts to debug

The cross-user delete is permitted by a single Firestore rule (`isOwner(targetId)`) — simpler.

---

## 4. Files affected

| # | File | Change type |
|---|---|---|
| 1 | `css/style.css` | Add nav badge context rule |
| 2 | `js/app.js` | Add `position:relative` + `aria-label` update in `injectProfileBadgeSpans` |
| 3 | `profile.html` | Add count spans, sentRequestsWrap section |
| 4 | `js/profile.js` | Wire counts; add `loadSentRequests` + realtime binding |
| 5 | `firestore.rules` | Add `sentRequests` subcollection rule |
| 6 | `js/firestore-service.js` | Atomic batch in `sendFriendRequest`; cleanup in accept/decline; 3 new methods |
| 7 | `sw.js` | Bump cache `v148` → `v149` |

---

## 5. Phase A — Nav badge fix + count labels

These steps are independent of Phase B and can be implemented and shipped first.

### Step A1 — Fix mobile nav badge positioning

**File:** [css/style.css](../css/style.css) — append immediately after line 8606 (after the existing `.profile-nav-badge.is-hidden` rule):

```css
/* Bottom nav: badge becomes an absolute red dot on the icon */
nav .profile-nav-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  margin: 0;
  min-width: 1rem;
  height: 1rem;
  font-size: 0.6rem;
  box-shadow: 0 0 0 2px rgba(251, 248, 239, 0.94);
}
```

The `box-shadow` creates a faux-border matching the bottom-nav background so the dot reads cleanly against any icon.

**File:** [js/app.js](../js/app.js) — in `injectProfileBadgeSpans` (around line 452), add `position:relative` to the link so the absolute badge has an anchor:

```js
function injectProfileBadgeSpans() {
  document.querySelectorAll("a[href='profile.html'], a[href='./profile.html']").forEach(function (link) {
    if (link.querySelector(".profile-nav-badge")) { return; }
    link.style.position = "relative";          // NEW
    var span = document.createElement("span");
    span.className = "profile-nav-badge is-hidden";
    span.textContent = "0";
    span.setAttribute("aria-hidden", "true");  // NEW — count is announced via link aria-label
    link.appendChild(span);
  });
}
```

Then update the badge handler at line 625 to also update the link's `aria-label`:

```js
window.addEventListener("sugbocents:profileBadgeUpdate", function (e) {
  var count = e.detail && Number(e.detail.count || 0) ? Number(e.detail.count || 0) : 0;
  document.querySelectorAll(".profile-nav-badge").forEach(function (el) {
    if (count > 0) {
      el.textContent = count > 99 ? "99+" : String(count);
      el.classList.remove("is-hidden");
    } else {
      el.classList.add("is-hidden");
    }
    // NEW — accessible label on the parent link
    var link = el.parentElement;
    if (link && link.tagName === "A") {
      var base = link.getAttribute("data-aria-base");
      if (!base) {
        base = link.getAttribute("aria-label") || "Profile";
        link.setAttribute("data-aria-base", base);
      }
      if (count > 0) {
        link.setAttribute("aria-label", base + ", " + count + " pending friend " + (count === 1 ? "request" : "requests"));
      } else {
        link.setAttribute("aria-label", base);
      }
    }
  });
});
```

**Definition of Done — A1:**
- On 375px viewport, opening any page shows a red circular badge in the top-right corner of the Profile bottom-nav icon when there are pending requests
- Badge contains the count (e.g. "2", or "99+" if more)
- Screen reader announces `"Profile, 2 pending friend requests"` when focused on the link
- No layout shift; "Profile" text remains on a single line

---

### Step A2 — Add count labels to profile.html

**File:** [profile.html](../profile.html)

**Change 1** — line 175 — add count to the section header:

```html
<!-- BEFORE -->
<h2 class="font-display text-2xl font-black tracking-tight" style="color:#102b1d">Barkada list</h2>

<!-- AFTER -->
<h2 class="font-display text-2xl font-black tracking-tight" style="color:#102b1d">
  Barkada list
  <span id="friendsCountInline" class="ml-2 text-sm font-extrabold" style="color:#617063;display:none"></span>
</h2>
```

**Change 2** — line 220 — add a count pill to the pending-requests heading:

```html
<!-- BEFORE -->
<p class="mb-2 text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">Pending Requests</p>

<!-- AFTER -->
<p class="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">
  Pending Requests
  <span id="friendRequestsCount" class="rounded-full px-1.5 py-0.5 text-[0.62rem] font-black text-white" style="background:#dc2626;display:none"></span>
</p>
```

**Definition of Done — A2:**
- The "Barkada list" heading shows "· 7" (or similar) inline when the user has friends; hidden at 0
- Pending-requests heading shows a small red pill with count when requests exist; hidden at 0

---

### Step A3 — Wire the count labels in profile.js

**File:** [js/profile.js](../js/profile.js)

**In `loadFriendRequests(myUid, showLoading)`** (around line 1067) — at the end of the render block, add:

```js
var countEl = document.getElementById("friendRequestsCount");
if (countEl) {
  if (count > 0) {
    countEl.textContent = String(count);
    countEl.style.display = "";
  } else {
    countEl.style.display = "none";
  }
}
```

(`count` should already be in scope; if not, derive from the requests array length.)

**In `loadFriendsList(myUid, showLoading)`** (around line 1135) — at the end of the render block, add:

```js
var inlineEl = document.getElementById("friendsCountInline");
if (inlineEl) {
  if (count > 0) {
    inlineEl.textContent = "\u00B7 " + count;  // " · 7"
    inlineEl.style.display = "";
  } else {
    inlineEl.style.display = "none";
  }
}
```

**Definition of Done — A3:**
- Friend count updates live within 1s of accepting a friend or removing one
- Pending count badge updates live as new requests arrive (already wired via `onFriendRequestsChange`)
- Both labels hide cleanly at 0

---

## 6. Phase B — Outgoing/sent requests

These steps depend on each other in the order listed.

### Step B1 — Firestore rules

**File:** [firestore.rules](../firestore.rules)

Inside the existing `match /users/{userId} { ... }` block, add a new sub-block (place it adjacent to `private/{doc}` for visual grouping):

```
match /sentRequests/{targetId} {
  // Sender owns this list — full read/write
  allow read, write: if isOwner(userId);
  // Target may delete (cleanup on accept/decline) — but cannot create or read
  allow delete:      if isOwner(targetId);
}
```

**Why `allow read, write` and not `allow read, create, update`?** `write` covers create + update + delete; combined with the second `allow delete` rule for `targetId`, Firestore evaluates the union. The sender retains full control over their own list; the target gains delete-only access to their specific doc.

**Definition of Done — B1:**
- `firebase deploy --only firestore:rules` succeeds
- Manual test in emulator: sender can create + read; target can delete; unrelated user gets PERMISSION_DENIED on all ops

---

### Step B2 — Atomic batch write in `sendFriendRequest`

**File:** [js/firestore-service.js](../js/firestore-service.js) — around line 351, locate the existing successful-write block:

```js
// Existing (approximately):
await db.collection("friends").doc(targetUserId)
  .collection("requests").doc(myUserId).set({
    sentAt:      new Date().toISOString(),
    displayName: String(myDisplayName || "")
  });
```

**Replace with a batch:**

```js
var sentAt = new Date().toISOString();
var batch = db.batch();

batch.set(
  db.collection("friends").doc(targetUserId).collection("requests").doc(myUserId),
  { sentAt: sentAt, displayName: String(myDisplayName || "") }
);

batch.set(
  db.collection("users").doc(myUserId).collection("sentRequests").doc(targetUserId),
  { sentAt: sentAt, targetDisplayName: String(targetDisplayName || "") }
);

await batch.commit();
```

**Important:** This requires `targetDisplayName` to be available in scope. If it isn't, fetch it from the public profile of `targetUserId` BEFORE the batch:

```js
var targetDisplayName = "";
try {
  var snap = await db.collection("users").doc(targetUserId).get();
  if (snap.exists) {
    var data = snap.data() || {};
    var pp = data.publicProfile || {};
    targetDisplayName = String(pp.displayName || data.firstName || "");
  }
} catch (_) { /* fall through with empty string */ }
```

**Definition of Done — B2:**
- After a successful send, BOTH Firestore docs exist (verify in console)
- If the batch fails, neither doc exists (atomicity check: revoke target read access temporarily and confirm sent doc is also rolled back)
- Existing error paths (`already_pending`, `incoming_pending`) are NOT touched — they return before the batch

---

### Step B3 — Cleanup on accept/decline

**File:** [js/firestore-service.js](../js/firestore-service.js)

**In `acceptFriendRequest(myUid, requesterId, ...)`** (around line 410) — after the existing accept logic succeeds, add:

```js
// Best-effort cleanup of the sender's sentRequests mirror (allowed by isOwner(targetId) rule)
try {
  await db.collection("users").doc(requesterId)
    .collection("sentRequests").doc(myUid).delete();
} catch (_) { /* non-fatal — rule may reject if request was already removed */ }
```

**In `declineFriendRequest(myUid, requesterId)`** (around line 437) — add the same block immediately after the existing inbox delete.

**Definition of Done — B3:**
- After accepting a request on the recipient side, the sender's `users/{senderId}/sentRequests/{recipientId}` doc is gone within 1–2s
- After declining, same behavior
- If the cleanup fails (e.g. doc already missing), accept/decline still succeeds

---

### Step B4 — Three new methods on `window.FirestoreService`

**File:** [js/firestore-service.js](../js/firestore-service.js)

Add these three functions (place them adjacent to the existing `getFriendRequests` / `onFriendRequestsChange`):

```js
async function getSentRequests(myUid) {
  if (!db || !myUid) { return []; }
  try {
    var snap = await db.collection("users").doc(myUid)
      .collection("sentRequests").orderBy("sentAt", "desc").get();
    var rows = [];
    snap.forEach(function (doc) {
      var data = doc.data() || {};
      rows.push({
        targetUid:         doc.id,
        targetDisplayName: String(data.targetDisplayName || ""),
        sentAt:            String(data.sentAt || "")
      });
    });
    return rows;
  } catch (e) {
    console.warn("[firestore] getSentRequests failed", e);
    return [];
  }
}

async function cancelSentRequest(myUid, targetUid) {
  if (!db || !myUid || !targetUid) { return { ok: false, reason: "missing_args" }; }
  try {
    var batch = db.batch();
    batch.delete(db.collection("friends").doc(targetUid).collection("requests").doc(myUid));
    batch.delete(db.collection("users").doc(myUid).collection("sentRequests").doc(targetUid));
    await batch.commit();
    return { ok: true };
  } catch (e) {
    console.warn("[firestore] cancelSentRequest failed", e);
    return { ok: false, reason: "network" };
  }
}

function onSentRequestsChange(myUid, callback) {
  if (!db || !myUid || typeof callback !== "function") { return function () {}; }
  try {
    return db.collection("users").doc(myUid)
      .collection("sentRequests").orderBy("sentAt", "desc")
      .onSnapshot(function (snapshot) {
        var rows = [];
        snapshot.forEach(function (doc) {
          var data = doc.data() || {};
          rows.push({
            targetUid:         doc.id,
            targetDisplayName: String(data.targetDisplayName || ""),
            sentAt:            String(data.sentAt || "")
          });
        });
        callback(rows);
      }, function (err) {
        console.warn("[firestore] onSentRequestsChange error", err);
        callback([]);
      });
  } catch (e) {
    console.warn("[firestore] onSentRequestsChange failed", e);
    return function () {};
  }
}
```

**Export them on `window.FirestoreService`** in the existing `return { ... }` block at the bottom of the IIFE:

```js
getSentRequests:        getSentRequests,
cancelSentRequest:      cancelSentRequest,
onSentRequestsChange:   onSentRequestsChange,
```

**Definition of Done — B4:**
- All three methods are reachable as `window.FirestoreService.getSentRequests` etc. in DevTools console
- `cancelSentRequest` deletes both docs in one network round-trip
- `onSentRequestsChange` returns a function (the unsubscribe handle), even on failure

---

### Step B5 — HTML section in profile.html

**File:** [profile.html](../profile.html)

Insert this block immediately after `#friendAddStatus` (around line 215) and before `#friendRequestsWrap` (line 219):

```html
<!-- Sent (outgoing) requests -->
<div id="sentRequestsWrap" style="display:none;margin-bottom:1rem">
  <p class="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]" style="color:#6b756c">
    Sent Requests
    <span id="sentRequestsCount" class="rounded-full px-1.5 py-0.5 text-[0.62rem] font-black text-white" style="background:#6b756c;display:none"></span>
  </p>
  <div id="sentRequestsList" class="space-y-2"></div>
</div>
```

**Definition of Done — B5:**
- Section is hidden when there are no sent requests (no empty whitespace on the page)
- Heading style matches "Pending Requests" exactly except the count pill is grey (#6b756c) instead of red — sent requests are informational, not actionable

---

### Step B6 — `loadSentRequests` + realtime binding in profile.js

**File:** [js/profile.js](../js/profile.js)

Add three functions inside the `loadFriendsUI(myUid)` scope (or as siblings — match the file's existing pattern of function placement near `loadFriendRequests`).

```js
function renderSentRequestEmpty() {
  var wrap = document.getElementById("sentRequestsWrap");
  var list = document.getElementById("sentRequestsList");
  var countEl = document.getElementById("sentRequestsCount");
  if (wrap)    { wrap.style.display = "none"; }
  if (list)    { list.innerHTML = ""; }
  if (countEl) { countEl.style.display = "none"; }
}

async function loadSentRequests(myUid) {
  if (!window.FirestoreService || !window.FirestoreService.getSentRequests) {
    renderSentRequestEmpty();
    return;
  }
  if (navigator.onLine === false) {
    renderSentRequestEmpty();
    return;
  }

  var rows = [];
  try {
    rows = await window.FirestoreService.getSentRequests(myUid);
  } catch (_) {
    renderSentRequestEmpty();
    return;
  }

  var wrap    = document.getElementById("sentRequestsWrap");
  var list    = document.getElementById("sentRequestsList");
  var countEl = document.getElementById("sentRequestsCount");
  if (!wrap || !list) { return; }

  if (!rows || rows.length === 0) {
    renderSentRequestEmpty();
    return;
  }

  wrap.style.display = "";
  if (countEl) {
    countEl.textContent = String(rows.length);
    countEl.style.display = "";
  }

  list.innerHTML = rows.map(function (row) {
    var name    = String(row.targetDisplayName || "Friend");
    var initial = (name.charAt(0) || "?").toUpperCase();
    var safeUid = escapeHtml(row.targetUid);
    return (
      '<div class="flex items-center gap-3 rounded-2xl px-3 py-2" style="background:#faf8f1;outline:1px solid #ded7c6">' +
        '<div class="grid h-9 w-9 place-items-center rounded-full text-sm font-black text-white" style="background:#6b756c">' + escapeHtml(initial) + '</div>' +
        '<div class="min-w-0 flex-1">' +
          '<p class="truncate text-sm font-extrabold" style="color:#102b1d">' + escapeHtml(name) + '</p>' +
          '<p class="text-[0.7rem] font-bold" style="color:#617063">Waiting for response\u2026</p>' +
        '</div>' +
        '<button type="button" class="sent-cancel-btn shrink-0 rounded-full px-3 py-1.5 text-xs font-black" data-uid="' + safeUid + '" data-name="' + escapeHtml(name) + '" style="background:#ffffff;color:#dc2626;border:1px solid #f3c4c4">Cancel</button>' +
      '</div>'
    );
  }).join("");

  list.querySelectorAll(".sent-cancel-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var uid = btn.dataset.uid;
      var name = btn.dataset.name || "Request";
      if (!uid) { return; }
      btn.disabled = true;
      btn.textContent = "Cancelling\u2026";
      try {
        var result = await window.FirestoreService.cancelSentRequest(myUid, uid);
        if (result && result.ok) {
          setAddStatus("Cancelled request to " + name + ".", "ok");
          // Listener will re-render; no manual reload needed
          return;
        }
        setAddStatus("Couldn't cancel right now. Try again.", "error");
        btn.disabled = false;
        btn.textContent = "Cancel";
      } catch (_) {
        setAddStatus("Couldn't cancel right now. Try again.", "error");
        btn.disabled = false;
        btn.textContent = "Cancel";
      }
    });
  });
}

function bindSentRequestsRealtime(myUid) {
  if (!window.FirestoreService || !window.FirestoreService.onSentRequestsChange) { return; }
  var unsubscribe = window.FirestoreService.onSentRequestsChange(myUid, function () {
    loadSentRequests(myUid);
  });
  addSocialSubscription(unsubscribe);  // wire into existing teardown chain
}
```

**Wire-up in `loadFriendsUI(myUid)`** (around line 778) — add these two calls near the existing `loadFriendRequests(myUid, true)` call:

```js
loadSentRequests(myUid);
bindSentRequestsRealtime(myUid);
```

**Verify teardown:** the existing `addSocialSubscription` / `teardownSocialListeners` block (around line 664) handles `pagehide` cleanup. Confirm `addSocialSubscription` is the helper used elsewhere in profile.js to register unsubscribers — if the helper has a different name, match it.

**Note on the cancel UX:** No confirm dialog. Canceling a sent request is reversible (just send again), and the action shows as a status pill ("Cancelled request to Maria.") which gives the user enough feedback. Adding a confirm modal here is friction.

**Definition of Done — B6:**
- Sending a request to another account makes that account's name appear instantly in the "Sent Requests" section
- Tapping "Cancel" removes the card within 1s and shows a status pill
- When the recipient accepts on their device, the sender's card disappears within 2s (real-time listener)
- Same for decline
- Switching to another page and back does not create duplicate listeners (verified by counting active onSnapshot calls)

---

### Step B7 — Service worker cache bump

**File:** [sw.js](../sw.js)

```js
// BEFORE
var CACHE = "sugbocents-shell-v148";

// AFTER
var CACHE = "sugbocents-shell-v149";
```

Confirm `profile.html`, `css/style.css`, `js/profile.js`, `js/firestore-service.js`, `js/app.js` are all already in the `SHELL_FILES` array (they should be).

**Definition of Done — B7:**
- After deploy, opening the app twice (once to register the new SW, once to activate) shows the new UI
- DevTools → Application → Cache Storage shows only `sugbocents-shell-v149`; old `v148` is purged

---

## 7. End-to-end smoke test (10 minutes)

Run with two real accounts (call them **Alice** and **Bob**) on two browsers / two devices.

| # | Action | Expected result |
|---|---|---|
| 1 | Alice opens profile.html | Friend count "· 0" hidden; no Sent / Pending sections visible |
| 2 | Alice searches for Bob, taps Add | "Sent Requests" section appears with Bob's name and a Cancel button |
| 3 | Bob opens profile.html | Pending Requests pill shows "1"; Profile nav badge red dot shows "1" |
| 4 | Bob navigates to dashboard.html | Profile nav badge still shows "1" (works on every page) |
| 5 | Bob taps screen-reader on the Profile nav link | Announces "Profile, 1 pending friend request" |
| 6 | Bob returns to profile, taps ✓ Accept on Alice's request | Pending Requests count clears; Barkada list shows "· 1" with Alice's avatar |
| 7 | Alice's screen (idle, listener active) | Sent Requests section disappears within 2s without refresh |
| 8 | Alice reloads | Barkada list shows "· 1" with Bob |
| 9 | Alice taps ⋯ → Remove on Bob's avatar | Confirm dialog → Remove → Barkada list returns to "· 0", section hides |
| 10 | Alice sends another request to Bob | Sent Requests appears |
| 11 | Alice taps Cancel | Card disappears within 1s; status pill shows "Cancelled request to Bob." |
| 12 | Bob's screen (idle) | Pending count returns to 0; nav badge disappears |
| 13 | Alice goes offline (DevTools throttling), opens profile | Sent Requests section is empty (no error toast) |
| 14 | Alice goes back online | Sent Requests re-populates |

If any of those 14 steps fail, **do not ship**.

---

## 8. Edge cases & risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Pre-existing pending requests have no `sentRequests` mirror | Accepted gap — pending requests are usually short-lived. No backfill required. |
| 2 | User cancels offline | `cancelSentRequest` returns `{ok: false, reason: "network"}`; UI shows error pill; doc remains; user retries when online |
| 3 | Race: target accepts WHILE sender clicks Cancel | One delete will succeed, the other will be a no-op. Both resolve to "card gone." Idempotent. |
| 4 | Listener leaks on rapid page switches | `addSocialSubscription` chain handles `pagehide` teardown — verify the helper exists in profile.js. If not, add a manual unsubscribe in a `pagehide` listener. |
| 5 | `targetDisplayName` is empty if public profile not yet seeded | Fallback to "Friend" in the render. Cosmetic only. |
| 6 | Firestore rule deploy failure | Test rules in emulator (`firebase emulators:start --only firestore`) before `firebase deploy --only firestore:rules`. |
| 7 | Atomic batch fails on a partial network | Both writes roll back. User sees the existing error toast from `sendFriendRequest`. No orphaned docs. |
| 8 | Mobile nav badge box-shadow color drifts in dark mode | Verify on `dark-mode.css` — the rgba background may need a `[data-theme="dark"]` override. **Action:** check after Phase A1, override if needed. |

---

## 9. Out of scope (do NOT implement)

- Notifications system (FCM / browser push) — separate plan in [docs/NOTIFICATIONS_IMPLEMENTATION_PLAN.md](NOTIFICATIONS_IMPLEMENTATION_PLAN.md)
- Friend suggestions / "people you may know"
- Blocking, muting, or reporting
- Bulk cancel / accept-all
- Migration backfill for existing pending requests
- Any change to the friends list visual layout (avatars, streaks)
- Any change to public profile tabs (Achievements / Streak / Weekly)
- Any change to `claimAchievement` Cloud Function

---

## 10. Implementation order (suggested)

1. **Phase A in one PR** (visible win, low risk): A1 → A2 → A3 → bump SW
2. Verify A in production for 1 day
3. **Phase B in a second PR**: B1 (rules) → B2 (atomic batch) → B3 (cleanup) → B4 (methods) → B5 (HTML) → B6 (JS) → B7 (SW bump again to v150)

Splitting reduces the blast radius if something goes wrong with the sender-side mirror logic.

---

## 11. Rollback

- Phase A: revert the CSS rule + the two HTML count spans + the JS render lines. No data migration needed.
- Phase B: revert the firestore-service.js + profile.js + profile.html changes. The `sentRequests` subcollection docs become orphaned but harmless (only the user can read them via the rule). Optional: a one-shot script to delete `users/*/sentRequests` docs.
- Always bump `sw.js` cache version when reverting so clients re-fetch.

---

**End of plan.**
