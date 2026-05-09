# Sprint 3 — Phase 1: Weekly Quests

> **Backend required:** No — localStorage via StorageAPI
> **Depends on:** Sprint 2 baseline (daily missions, XP system, addExpense flow)
> **Unlocks:** Phase 2 achievement tiers (`questsCompleted` counter), Phase 4 Sentimos earning (quest completion → ₵50)

---

## What It Is

A multi-step objective that runs for 7 days and resets every Monday at midnight. One active quest at a time. Completing a quest awards a large XP bonus and Sentimos (Sentimos reward is stored but only spent/displayed once Phase 4 is live).

---

## Quest Data Model

### Fields added to the user object in `storage.js`

```js
activeQuest: null,      // Quest object or null
questHistory: [],       // Array of completed Quest objects
questsCompleted: 0,     // Lifetime counter — used by Phase 2 achievements
```

### Quest object shape

```js
{
  id: "quest-log5-budget3",
  title: "Disciplined Week",
  description: "Log expenses 5 days and stay under budget on at least 3",
  conditions: [
    { type: "log_days",          target: 5, progress: 0 },
    { type: "under_budget_days", target: 3, progress: 0 }
  ],
  xpReward: 150,
  sentimosReward: 50,      // stored, paid out when Phase 4 is live
  assignedAt: "ISO date",  // Monday midnight of the current week
  expiresAt: "ISO date",   // Sunday 23:59 of the same week
  completedAt: null        // ISO date or null
}
```

### Condition types

| `type` | Increments when |
|---|---|
| `log_days` | User logs at least 1 expense on a given calendar day |
| `under_budget_days` | User's spending for the day is under their daily budget slice |
| `log_count` | Each individual expense logged (raw count) |
| `no_overspend_days` | Every day so far this week has been under budget |

---

## Quest Pool (7 starting quests — rotate weekly)

| Quest ID | Title | Conditions | XP | ₵ |
|---|---|---|---|---|
| `quest-log5-budget3` | Disciplined Week | Log 5 days + under budget 3 days | 150 | 50 |
| `quest-log7` | Logging Habit | Log at least 1 expense every day for 7 days | 200 | 50 |
| `quest-budget-every-day` | Budget Warrior | Stay under budget every day this week | 175 | 50 |
| `quest-early-riser` | Early Riser | Log before noon on 3 days | 100 | 50 |
| `quest-big-logger` | Big Logger | Log 10+ expenses this week | 120 | 50 |
| `quest-night-owl` | Night Owl | Log after 9pm on 2 days | 100 | 50 |
| `quest-frugal-run` | Frugal Run | Spend ≤50% of weekly budget | 175 | 50 |

Rotation strategy: assign sequentially by ISO week number (`weekNumber % questPool.length`). This means every user gets the same quest in the same week — shared quest experience supports the social layer when Phase 4 is live.

---

## StorageAPI Methods to Add (`js/storage.js`)

### `getCurrentQuest()`
- If `user.activeQuest` is null or expired (`expiresAt < now`): auto-assign the next quest from the pool based on current ISO week number.
- If today is Monday and last quest's `expiresAt` has passed: archive old quest to `questHistory` (even if incomplete), assign new quest.
- Returns the active quest object.

### `getQuestHistory()`
- Returns `user.questHistory` array (most recent first).

### `updateQuestProgress(type, value)`
- Called internally by `addExpense` after every save.
- Also called by the daily check function (run on app load each day).
- Iterates `activeQuest.conditions`, finds matching `type`, increments `progress` by `value` (capped at `target`).
- After update: check if ALL conditions have `progress >= target`.
- If all met: call `_completeQuest()`.

### `_completeQuest()` (internal)
- Sets `activeQuest.completedAt = new Date().toISOString()`
- Calls `addXp(quest.xpReward, "quest-complete")`
- Stores `quest.sentimosReward` in the quest object (Phase 4 will pay it out when Firestore is live)
- Increments `user.questsCompleted`
- Pushes quest to `user.questHistory`
- Saves user
- Calls `window.GamificationUI.queueModal(...)` with quest completion config

---

## Dashboard Changes (`js/dashboard.js`)

### `renderTodayMission()` update

If `StorageAPI.getCurrentQuest()` returns an active, incomplete quest:
- Append a second row inside the existing mission card:

```
Weekly quest: Disciplined Week — 3/5 days · 4 days left
```

- "3/5 days" = sum of all condition progresses vs targets (simplified display — show the primary condition only)
- "4 days left" = `Math.ceil((expiresAt - now) / 86400000)`
- Tapping the quest row opens a **quest detail bottom sheet** (inline, no new page)

### Quest detail bottom sheet

Rendered inline via JS into an existing `#questDetailSheet` element (inject if not present):

```
┌─────────────────────────────────┐
│  Disciplined Week           [×] │
│  Resets Monday                  │
│                                 │
│  ● Log expenses 5 days   3/5   │  ← progress rows per condition
│    [████████░░]                 │
│                                 │
│  ● Stay under budget 3 days 1/3│
│    [████░░░░░░]                 │
│                                 │
│  Reward: +150 XP · ₵50         │
│  4 days left                    │
└─────────────────────────────────┘
```

---

## `dashboard.html` Changes

No static HTML needed. Quest row and detail sheet are injected by `dashboard.js`. Ensure the `#todayMission` card container exists (it already does from Sprint 2).

---

## `sw.js`

Bump cache version after Phase 1 is complete.

---

## Completion Criteria

- [ ] Quest auto-assigns on the first app open of any Monday
- [ ] Quest pool rotates correctly by ISO week number
- [ ] `updateQuestProgress()` fires after every `addExpense` call
- [ ] All conditions tracked independently (log_days counts unique calendar dates, not raw expense count)
- [ ] Quest completion triggers XP modal via `GamificationUI.queueModal()`
- [ ] Quest row appears in Today's Mission card when quest is active
- [ ] Quest detail bottom sheet opens and closes correctly
- [ ] Expired incomplete quests are archived to `questHistory` on Monday
