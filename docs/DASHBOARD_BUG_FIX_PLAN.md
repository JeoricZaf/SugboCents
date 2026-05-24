# Dashboard Bug Fix Plan

Audit date: 2026-05-13
Auditor: GitHub Copilot (read-only structural audit)

---

## Out of Scope (removed intentionally)

These were identified in the audit but are being cut from the dashboard entirely rather than fixed.

| # | What it was | Decision |
|---|-------------|----------|
| **Issue 1** | `spending-chart.js` never loaded — weekly spending chart section blank | **Remove the spending chart section from dashboard.html entirely.** The chart was never wired up and the section just shows dead whitespace. Cut it until a deliberate chart sprint. |
| **Issue 5** | `renderDashboardStats()` not wired into reactive listeners — stats section freezes after first render | **Remove the stats section from dashboard.html entirely.** It is a partial Sprint 2 feature that is not ready. Removing it avoids showing users stale numbers. |
| **Issue 10** | `buildAchievementState()` called twice synchronously per `addExpense()` — performance cost on large expense histories | **Defer.** Invisible to users now. Address when achievement count or expense history size becomes a real perf problem. |
| **Issue 11** | `dashboard-stats.js` listed in `sw.js` shell cache but never loaded by any page | **Remove the entry from `sw.js`.** It is dead weight in the cache. No page depends on it. |

---

## Active Bugs to Fix

---

### Bug 1 — Today Mission card week map never renders
**Severity: Visual (actively broken)**

**User Impact:** The Mon–Sun dot path (streak path graphic) is missing from the Today Mission card. The card shows the quest row but has blank space where the week map should be.

**File:** `js/dashboard.js`

**Root Cause:** Two `function renderWeekMap` declarations exist at the same IIFE scope:
- ~line 1810: `renderWeekMap(container)` — the mission-card version that writes dot nodes into the card element passed as an argument.
- ~line 3070: `renderWeekMap()` — the standalone version that reads `#weekMapGrid` and ignores arguments.

JavaScript hoists both and the later declaration (3070) wins. When `renderTodayMission()` calls `renderWeekMap(card)`, it executes the standalone version, ignores `card`, and writes into `#weekMapGrid` instead.

**Fix:** Rename the mission-card version (line ~1810) to `renderWeekMapIntoCard(container)` and update the two call sites inside `renderTodayMission()` accordingly.

---

### Bug 2 — Double render on every expense log (quick-add + quick log)
**Severity: Visual — widgets flash/re-animate twice per tap**

**User Impact:** The budget donut ring, XP bar, and budget progress bar visibly re-animate twice every time an expense is logged via quick-add or the quick-log form. Animated elements play their CSS transition twice in rapid succession, producing a visible hiccup.

**File:** `js/dashboard.js` (quick-add click handler ~line 490, `initLogExpense` handler ~line 2545)  
**Root cause file:** `js/storage.js`, `addExpense()` ~line 1080

**Root Cause:** `StorageAPI.addExpense()` dispatches `sugbocents:dataChanged` **synchronously** before returning. The `dataChanged` listener immediately runs all render functions (render #1). Control then returns to the caller, which explicitly calls the same render functions again in sequence (render #2). Every widget renders twice per tap.

**Fix:** Remove the explicit manual render calls that follow `addExpense()` in the quick-add click handler and the `initLogExpense` save handler. Let the `sugbocents:dataChanged` listener be the single place that triggers a re-render. The only exception is `renderQuickAddButtons()`, which must run once before `dataChanged` fires to snapshot the button rect (already handled).

---

### Bug 3 — Custom log modal fires `sugbocents:dataChanged` a third time
**Severity: Performance (compounds Bug 2)**

**User Impact:** Logging via the custom log modal triggers three full dashboard re-renders instead of two.

**File:** `js/dashboard.js`, `initCustomLogModal` save handler ~line 1310

**Root Cause:** After calling `addExpense()` (which already fires `dataChanged` once, causing render #1 and then render #2 from explicit calls), the modal handler manually dispatches a second `dataChanged`:
```js
window.dispatchEvent(new CustomEvent("sugbocents:dataChanged")); // redundant 3rd fire
```

**Fix:** Remove this manual dispatch. `addExpense()` already dispatches it. Once Bug 2's explicit render calls are also removed, a single `dataChanged` from `addExpense()` will be sufficient.

---

### Bug 4 — Quick-summary KPI chips stale after quick-add; daily average uses wrong divisor
**Severity: Logic — chips show wrong/frozen numbers**

**User Impact (part A):** The three summary chips (`#dashQuickSpent`, `#dashQuickAvg`, `#dashQuickRemaining`) do not update when an expense is logged via the quick-add grid or deleted via undo. They update correctly when using the legacy log form but are otherwise frozen.

**User Impact (part B):** The daily average chip always shows `totalSpentThisWeek / 7` regardless of which day of the week it is. On Monday with ₱100 logged, it displays ₱14/day instead of ₱100/day.

**File:** `js/dashboard.js`
- `updateQuickSummaryStats()` defined ~line 327
- Called only from `initLogExpense` click handler (~line 2568)
- **Not present** in the `sugbocents:dataChanged` listener (~line 3450)
- **Not present** in the `sugbocents:synced` listener (~line 3415)

**Root Cause (part A):** `updateQuickSummaryStats()` was wired into the legacy form handler but never added to the reactive event listeners.

**Root Cause (part B):** The divisor is hardcoded to `7` inside `updateQuickSummaryStats()`:
```js
avgDaily = weekExpenses.length > 0 ? spent / 7 : 0;
```
It should divide by the number of elapsed days in the current week (minimum 1).

**Fix (part A):** Add `updateQuickSummaryStats()` to both the `sugbocents:dataChanged` and `sugbocents:synced` listener blocks.

**Fix (part B):** Replace the `/ 7` divisor with the actual elapsed days:
```js
var elapsedDays = Math.max(1, (now.getDay() + 6) % 7 + 1); // Mon=1 ... Sun=7
avgDaily = weekExpenses.length > 0 ? spent / elapsedDays : 0;
```

---

### Bug 5 — Firebase sync race causes stale data flash on page load
**Severity: Visual/UX — data visibly jumps 1–3 seconds after load**

**User Impact:** A returning user sees the budget card, streak counter, and XP level render with yesterday's local data, then jump to the real Firestore values a second or two later. On a slow connection the jump is jarring.

**File:** `js/storage.js`, `resolveAuthState()` ~line 820  
**File:** `js/app.js`, DOMContentLoaded handler

**Root Cause:** `resolveAuthState()` resolves after a 1.2-second timeout heuristic (or when Firebase auth responds, whichever comes first). `app.js` immediately calls `revealPageContent()` after awaiting it, fading in content rendered from `localStorage`. `syncFromFirestore()` is still in-flight; when it completes it dispatches `sugbocents:synced`, triggering a full re-render with fresh data. There is no UI state indicating a sync is in progress between the two renders.

**Fix:** Keep the skeleton visible (or show a subtle "syncing…" indicator on the hero) until `sugbocents:synced` fires. Only call `revealPageContent()` inside the `synced` handler (with a reasonable timeout fallback so the page never hangs). This prevents users from ever seeing the stale-then-fresh jump.

---

### Bug 6 — Quest nav badge claims a quest is claimable when it is not
**Severity: Logic — badge dot misleads the user**

**User Impact:** The green dot on the Quests nav link appears, suggesting a quest is ready to claim. The user taps through to Quests.html and finds the quest progress bar still in-progress (e.g., 2/5 days). The badge was lying.

**File:** `js/storage.js`
- Badge computation: `_computeAndCacheQuestBadge()` ~line 2848
- Actual quest progress: `updateQuestProgress()` ~line 2614

**Root Cause:** `_computeAndCacheQuestBadge` evaluates weekly quest conditions using all expenses since the **start of the Monday week**:
```js
var weekExp = expenses.filter(function (e) { return new Date(e.timestamp) >= monday; });
```
But `updateQuestProgress` (which sets `user.activeQuest.conditions[].progress`) filters from the **quest assignment time** (`questAssignedAt`), which can be any day of the week:
```js
var weekCutoff = questAssignedAt > monday ? questAssignedAt : monday;
```
A user who equips a quest on Wednesday gets Mon–Tue expenses counted in the badge computation but not in the real progress tracker. The badge declares "done" while the quest UI correctly says "2/5."

**Fix:** Align `_computeAndCacheQuestBadge`'s expense filter to use the same `questAssignedAt` boundary that `updateQuestProgress` uses. Read `user.activeQuest.assignedAt` before filtering `weekExp`.

---

### Bug 7 — New user: "Add" shortcut button missing from empty quick-add grid
**Severity: UX — first-time user has no visible path to create a shortcut**

**User Impact:** A brand-new user with no quick-add shortcuts sees suggestion chips but no "+" Add tile. There is no visible way to open the shortcut creation modal except by tapping a suggestion chip first.

**File:** `js/dashboard.js`, `renderQuickAddButtons()` ~line 415

**Root Cause:** When `items.length === 0`, the function renders the suggestions block and then `return`s early, before the code that appends the "Add shortcut" tile runs:
```js
if (items.length === 0) {
  // ... render suggestions ...
  return; // "Add" tile is never reached
}
// "Add" tile appended here — dead for new users
items.forEach(...);
var addWrap = ...; // never executed when items is empty
grid.appendChild(addWrap);
```

**Fix:** Move the "Add shortcut" tile construction and append to before the `return` inside the `items.length === 0` block, so new users always see it alongside the suggestion chips.

---

### Bug 8 — `renderTodayMission` silently re-renders the standalone week map on every data change
**Severity: Visual (minor) — week map dots snap instead of animate**

**User Impact:** Every time an expense is logged, the standalone `#weekMapGrid` week map section (separate from the mission card) is silently re-rendered as an unintended side effect. This resets the CSS transitions on the dot elements, causing them to snap to their new state rather than animate. Only noticeable if you're watching the week map while tapping quick-add.

**File:** `js/dashboard.js`, `renderTodayMission()`, final lines before its closing brace:
```js
renderWeekMap(card);  // due to Bug 1's name collision, this writes to #weekMapGrid
renderQuestRow(card); // correctly writes to the card container
```

**Root Cause:** This is a direct downstream consequence of Bug 1 (the `renderWeekMap` name collision). Once Bug 1 is fixed by renaming the mission-card version to `renderWeekMapIntoCard`, this side effect disappears automatically.

**Fix:** Resolves automatically when Bug 1 is fixed. No separate action needed.

---

## Fix Order (recommended)

1. **Bug 1** first — the `renderWeekMap` rename also fixes Bug 8 for free.
2. **Bug 7** — isolated change, no dependencies.
3. **Bug 4** — add to listeners + fix divisor.
4. **Bugs 2 + 3** together — they share the same "remove explicit re-render calls" pattern.
5. **Bug 6** — requires careful reading of quest assignment boundary logic.
6. **Bug 5** — biggest scope change (affects `app.js` reveal sequence); do last.
