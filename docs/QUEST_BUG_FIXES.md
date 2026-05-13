# Quest System Bug Fixes — Audit Record

All three bugs below were **fully implemented** (not planned). The code changes are live in
`js/quests.js` and `js/storage.js`. No further action is needed unless the auditor finds a
regression.

---

## Bug 1 — Double Claiming on Tracked Daily Quest

### What Was Broken
A daily quest that was both *equipped* (shown in the Active Quest Spotlight) and listed under
Daily Quests could be claimed twice. Each successful claim awarded XP, Sentimos, and
incremented `questsCompleted`, corrupting the user's stats.

### Root Cause
In `renderActiveQuestSpotlight` (`js/quests.js`), the local `qDef` object built for daily
quests was missing the `type` and `assignedAt` fields:

```js
// BEFORE (broken)
qDef = { id: activeQuest.id, title: activeQuest.title, ... };
```

When the Spotlight Claim button called `claimQuestReward(qDef.id, qDef)`, the function saw
`questDef.type === undefined`, defaulted `questType` to `"weekly"`, and stored the claim
under the key `questId:monday-date`.

Meanwhile, `isQuestClaimed(id, "daily")` in the Daily Quests section always checks the key
`questId:today-date`. These two keys never matched, so the daily section never saw the claim
and kept showing its own Claim button.

### Fix Applied
**File:** `js/quests.js` — `renderActiveQuestSpotlight`, line ~805

Added `type: "daily"` and `assignedAt: activeQuest.assignedAt` to the `qDef` object:

```js
// AFTER (fixed)
qDef = { type: "daily", assignedAt: activeQuest.assignedAt, id: activeQuest.id, ... };
```

Now both the Spotlight and the Daily section pass identical metadata to `claimQuestReward`,
which produces the same `questId:today-date` key. The first claim writes the key; the second
call returns `{ alreadyClaimed: true }` and no reward is granted.

---

## Bug 2 — Nav Badge Undercount for Untracked Completed Quests

### What Was Broken
After logging expenses that completed multiple daily quests (e.g., First Log + Triple Log +
Category Mix), the nav badge showed `1` — only the single *tracked* quest — instead of the
true number of claimable rewards. Users had no signal that extra rewards were waiting.

### Root Cause
`checkQuestBadge()` in `storage.js` only inspected `user.activeQuest.completedAt` (the
equipped quest). The accurate all-quest counter (`dispatchQuestBadge` / `checkQuestBadge` in
`quests.js`) only ran when the user was already on the Quests page, and nothing in the storage
layer wrote the correct count to `localStorage("sugbocents_unclaimed_quests")` when an
expense was logged from the Dashboard.

### Fix Applied
**File:** `js/storage.js`

**Step 1** — Added `DAILY_QUEST_SPECS_INTERNAL` constant (mirrors `DAILY_QUEST_STORAGE_CONDITIONS`
in `quests.js`) so storage can evaluate all 4 daily quest conditions without depending on the
quests UI module:

```js
var DAILY_QUEST_SPECS_INTERNAL = [
  { id: "daily-first-log",    condType: "log_count_today",      target: 1 },
  { id: "daily-triple-log",   condType: "log_count_today",      target: 3 },
  { id: "daily-categories",   condType: "category_count_today", target: 3 },
  { id: "daily-under-budget", condType: "under_daily_budget",   target: 1 }
];
```

**Step 2** — Added `_computeAndCacheQuestBadge(user)` function. It computes completed+unclaimed
counts for all 4 daily quests (from today's raw expenses) and all 5 weekly pool quests (from
this week's raw expenses), then:
- Writes the count to `localStorage("sugbocents_unclaimed_quests")`
- Dispatches `sugbocents:questBadgeUpdate` so the nav badge updates immediately

**Step 3** — Called `_computeAndCacheQuestBadge(user)` from three places:
- `addExpense()` — after quest progress is updated
- `removeExpense()` — after quest progress is recomputed
- `claimQuestReward()` — so the badge decrements immediately after a claim

---

## Bug 3 — Tracking a Weekly Quest Mid-Week Erases Prior Progress

### What Was Broken
If a user had already logged expenses on Monday, Tuesday, and Wednesday toward a weekly quest
(e.g., "Logging Habit" — log 7 days), and then pressed "Track" on Wednesday, the quest's
progress bar reset to `1/7` and excluded Monday/Tuesday. If the user had already completed
the quest before tracking it, the Claim button disappeared entirely, making the reward
unreachable.

### Root Cause
In `trackQuest()` (`js/quests.js`), the quest was saved with the current moment as `assignedAt`:

```js
// BEFORE (broken)
assignedAt: new Date().toISOString()  // e.g., Wednesday 2:30 PM
```

Both `updateQuestProgress()` (storage) and `computeAllQuestProgress()` (UI) use
`max(weekStart, assignedAt)` as their expense cutoff. A Wednesday `assignedAt` caused that
cutoff to be Wednesday, silently discarding Monday and Tuesday expenses that should have
counted.

### Fix Applied
**File:** `js/quests.js` — `trackQuest()`, line ~1256

Changed `assignedAt` to always be the Monday midnight of the current week:

```js
// AFTER (fixed)
assignedAt: getWeekStart().toISOString()  // always Monday 00:00:00
```

Since `assignedAt` is now never later than `weekStart`, `max(weekStart, assignedAt)` always
resolves to `weekStart` (Monday), and the full week's expense history counts for every
newly-tracked weekly quest regardless of what day the user clicks Track.

---

## Files Changed

| File | Lines changed | Purpose |
|------|---------------|---------|
| `js/quests.js` | ~805 | Bug 1 fix — add `type:"daily"` and `assignedAt` to daily `qDef` |
| `js/quests.js` | ~1256 | Bug 3 fix — use `getWeekStart()` instead of `new Date()` for `assignedAt` |
| `js/storage.js` | ~183 | Bug 2 fix — add `DAILY_QUEST_SPECS_INTERNAL` constant |
| `js/storage.js` | ~2808 | Bug 2 fix — add `_computeAndCacheQuestBadge(user)` function |
| `js/storage.js` | ~1051 | Bug 2 fix — call badge recompute in `addExpense` |
| `js/storage.js` | ~1485 | Bug 2 fix — call badge recompute in `removeExpense` |
| `js/storage.js` | ~2470 | Bug 2 fix — call badge recompute in `claimQuestReward` |
