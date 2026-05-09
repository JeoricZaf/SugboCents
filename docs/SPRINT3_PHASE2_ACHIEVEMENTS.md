# Sprint 3 — Phase 2: Achievement Expansion

> **Backend required:** No — localStorage via StorageAPI
> **Depends on:** Phase 1 (needs `questsCompleted` counter and quest pool live)
> **Unlocks:** Phase 4 earning hooks (badge claims → ₵25 per badge)

---

## The Core Principle

From Gamification Transcript 6: *"The most addictive apps never let you finish."*

The current 14 Sprint 2 badges have a ceiling — a user can claim all 14 and feel "done." Phase 2 removes that ceiling by:
1. Adding 14 new badges across new categories
2. Introducing **tiered badges** (e.g., "2 of 5") so no badge is ever fully maxed until legendary thresholds
3. Adding `missionsCompleted` + `questsCompleted` lifetime counters so progression never stops

---

## New User Object Fields (`js/storage.js`)

```js
missionsCompleted: 0,   // incremented when a full mission day completes
questsCompleted: 0,     // incremented on quest completedAt (already in Phase 1)
```

---

## New Badges — 14 additions to `ACHIEVEMENTS` array

### Missions Tier (new category)

| Badge ID | Name | Trigger | Icon | Tier label |
|---|---|---|---|---|
| `mission-5` | Getting Going | Complete 5 daily missions | `bi-check2` | 1 of 4 |
| `mission-25` | On a Roll | Complete 25 daily missions | `bi-check2-circle` | 2 of 4 |
| `mission-100` | Mission Machine | Complete 100 daily missions | `bi-check2-all` | 3 of 4 |
| `mission-365` | Daily Legend | Complete 365 daily missions | `bi-trophy-fill` | 4 of 4 |

### Quests Tier (new category)

| Badge ID | Name | Trigger | Icon | Tier label |
|---|---|---|---|---|
| `quest-1` | First Quest | Complete your first weekly quest | `bi-map` | 1 of 3 |
| `quest-5` | Quest Regular | Complete 5 quests | `bi-map-fill` | 2 of 3 |
| `quest-streak-3` | Quest Streak | Complete 3 quests in a row (no missed week) | `bi-lightning-fill` | 3 of 3 |

### Savings Milestones (new category)

| Badge ID | Name | Trigger | Icon | Tier label |
|---|---|---|---|---|
| `saved-1000` | First Thousand | Save ₱1,000 toward any goal | `bi-piggy-bank-fill` | 1 of 2 |
| `saved-5000` | Five K Club | Save ₱5,000 total across all goals | `bi-safe2-fill` | 2 of 2 |

### Streak Diamonds (escalation tier — "diamond streak system" from Transcript 6)

| Badge ID | Name | Trigger | Icon | Tier label |
|---|---|---|---|---|
| `streak-diamond-7` | First Diamond | Reach a 7-day streak | `bi-gem` | 1 of 3 |
| `streak-diamond-42` | Six-Week Run | Reach a 42-day streak | `bi-gem` (blue tint) | 2 of 3 |
| `streak-diamond-100` | Century Flame | Reach a 100-day streak | `bi-gem` (gold tint) | 3 of 3 |

### 3 TBD (to define during implementation)
Reserve `tbd-a`, `tbd-b`, `tbd-c` as placeholder IDs. Fill in during Phase 2 implementation based on what user behavior patterns become visible.

---

## `buildAchievementState()` Changes

Add new condition handler cases for each new badge type:

```js
case "mission_count":
  progress = user.missionsCompleted || 0;
  unlockable = progress >= achievement.target;
  break;

case "quest_count":
  progress = user.questsCompleted || 0;
  unlockable = progress >= achievement.target;
  break;

case "quest_streak":
  // count consecutive completed weeks in questHistory
  progress = _countQuestStreak(user.questHistory);
  unlockable = progress >= achievement.target;
  break;

case "savings_total":
  progress = StorageAPI.getGoals().reduce((sum, g) => sum + (g.savedAmount || 0), 0);
  unlockable = progress >= achievement.target;
  break;

case "streak_diamonds":
  progress = getCurrentStreakFromExpenses(user.expenses);
  unlockable = progress >= achievement.target;
  break;
```

---

## `incrementMissionsCompleted()` — New StorageAPI Method

Called at the end of each calendar day when the user had at least 1 logged expense (mission satisfied).

Trigger point: `updateBudgetCard()` or the daily check on app load — if today has expenses AND `dailyMissionCredited` flag for today is not set, increment and set the flag.

```js
incrementMissionsCompleted() {
  const user = this._getUser();
  const todayKey = new Date().toISOString().slice(0, 10);
  if (user.lastMissionCreditedDate === todayKey) return; // already credited today
  user.missionsCompleted = (user.missionsCompleted || 0) + 1;
  user.lastMissionCreditedDate = todayKey;
  this._saveUser(user);
  this.checkNewAchievements(); // fire badge check after increment
}
```

---

## Badge Shelf Visual Rules (`stats.html`)

These rules should be applied when rendering the badge grid:

| State | Visual treatment |
|---|---|
| **Unlocked + claimed** | Full color, tier label ("2 of 5"), green claim indicator |
| **Unlocked + unclaimed** | Full color, animated pulse border, "CLAIM" button |
| **Locked — close (within 50% of target)** | 60% opacity, muted tone, progress bar visible |
| **Locked — far (under 50% progress)** | 30% opacity, very dark — present but not emphasized |

> Never use ❌ or "LOCKED" text. Use visual dimming only. The user should feel like they're looking at a foggy horizon, not a wall. (Pattern observed in Candle app achievement grid — see design reference docs.)

### Tier counter label

Every badge that has multiple tiers shows a small label beneath the badge name:

```
First Diamond        ← badge name
streak-diamond-7     ← badge ID (debug only, hidden in prod)
1 of 3               ← tier counter — ALWAYS visible, even at 3 of 3
```

"3 of 3" maxed badges should display a subtle gold/shimmer treatment — the rarest visual state.

---

## `sw.js`

Bump cache version after Phase 2 is complete.

---

## Completion Criteria

- [ ] All 14 new badges present in `ACHIEVEMENTS` array with correct `type`, `target`, `icon`, `category`
- [ ] `missionsCompleted` counter increments once per calendar day (not per expense)
- [ ] `questsCompleted` counter correctly incremented by Phase 1's `_completeQuest()`
- [ ] `buildAchievementState()` returns correct `progress` and `unlockable` for all new badge types
- [ ] Badge grid on `stats.html` renders with dimming tiers (full / 60% / 30%)
- [ ] Tier counter ("2 of 5") renders beneath badge name
- [ ] `checkNewAchievements()` fires after `incrementMissionsCompleted()` and after quest completion
