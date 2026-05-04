# SugboCents — Future Gamification Features Roadmap

> **Status:** Planning only — do NOT implement until phases E/F/G are complete and the dashboard redesign is stable.
> **Last updated:** May 4, 2026
> **Source:** Gamification design discussions + transcripts: Gamification 4, 5, 6 (Really Important)

---

## Why This Document Exists

The three psychological mechanisms behind high-retention apps (Transcript 6) require a layered architecture:

1. **Craving Machine** — unpredictable reward schedule keeps users chasing
2. **Infinite Game** — loss aversion and no "done state" prevents quitting
3. **Invisible Scoreboard** — social visibility converts engagement into identity

The features in this document build that architecture in sequence. Each layer is the prerequisite for the one above it. **Do not build layer 2 before layer 1 is solid, and do not build layer 3 before layer 2 exists.**

---

## Feature Sequencing Overview

```
NOW (current sprint)
  Expanded mission types (Phase E)
  Chase card redesign (Phase E)
  Sora font headings (Phase E)

NEXT — No backend required (Sprint 3 Phase 1)
  Weekly Quests
  Achievement expansion + mission-count tiers
  Sentimos currency — earn + streak freeze only

LATER — Backend required (Sprint 3–4)
  Sentimos gifting to friends
  Friend social graph
  Friends leaderboard (normalized)
  Public profile page
```

---

## Feature 1 — Weekly Quests

**Psychological mechanism:** Infinite Game (no done state), Craving Machine (unpredictable bonus XP)
**Backend required:** No — localStorage via StorageAPI
**Unlocks:** Achievement tier "Complete X quests", Sentimos earning mechanism

### What it is
A multi-step objective that runs for 7 days and resets every Monday. One active quest at a time. Completing a quest awards a large XP bonus + Sentimos.

### Quest structure
| Field | Type | Example |
|---|---|---|
| `id` | string | `"quest-log5-budget3"` |
| `title` | string | `"Disciplined Week"` |
| `description` | string | `"Log expenses 5 days and stay under budget on at least 3"` |
| `conditions` | array of condition objects | see below |
| `xpReward` | number | 150 |
| `sentimosReward` | number | 50 |
| `expiresAt` | ISO date | end of Sunday |
| `completedAt` | ISO date or null | |

### Condition object shape
```js
{ type: "log_days", target: 5, progress: 0 }
{ type: "under_budget_days", target: 3, progress: 0 }
{ type: "log_count", target: 10, progress: 0 }
{ type: "no_overspend_days", target: 7, progress: 0 }
```

### Dashboard footprint
- **Today's Mission card** gains a second row when a quest is active: *"Weekly quest: Disciplined Week — 3/5 days · 4 days left"*
- Tapping the quest row opens a quest detail modal (or a future `quests.html` page)
- No new section needed on the dashboard — it lives inside the existing mission card

### StorageAPI methods to add
- `getCurrentQuest()` — returns active quest or null
- `getQuestHistory()` — array of past quests
- `updateQuestProgress()` — called internally after `addExpense` and on each daily check

### Quest pool (starting ideas — rotate weekly)
| Quest | Conditions |
|---|---|
| Disciplined Week | Log 5 days + under budget 3 days |
| Logging Habit | Log at least 1 expense every day for 7 days |
| Budget Warrior | Stay under budget every day this week |
| Early Riser | Log before noon on 3 days |
| Big Logger | Log 10+ expenses this week |
| Night Owl | Log after 9pm on 2 days |
| Frugal Run | Spend ≤50% of weekly budget |

---

## Feature 2 — Achievement Expansion + Mission-Count Tiers

**Psychological mechanism:** Infinite Game (no done state via tiered tiers), Craving Machine (badge proximity effect)
**Backend required:** No — localStorage via StorageAPI
**Unlocks prerequisite for:** Visual "badge shelf" on tigom.html being meaningful

### The core principle
From Transcript 6: *"The most addictive apps never let you finish."* The current 14 badges have a ceiling — a user can claim all 14 and feel "done." Tiered mission/quest count achievements remove that ceiling.

### New achievement categories to add

#### Missions tier (new)
| Badge ID | Name | Trigger | Icon |
|---|---|---|---|
| `mission-5` | Getting Going | Complete 5 daily missions | `bi-check2` |
| `mission-25` | On a Roll | Complete 25 daily missions | `bi-check2-circle` |
| `mission-100` | Mission Machine | Complete 100 daily missions | `bi-check2-all` |
| `mission-365` | Daily Legend | Complete 365 daily missions | `bi-trophy-fill` |

#### Quests tier (new)
| Badge ID | Name | Trigger | Icon |
|---|---|---|---|
| `quest-1` | First Quest | Complete your first weekly quest | `bi-map` |
| `quest-5` | Quest Regular | Complete 5 quests | `bi-map-fill` |
| `quest-streak-3` | Quest Streak | Complete 3 quests in a row | `bi-lightning-fill` |

#### Savings milestones (new)
| Badge ID | Name | Trigger | Icon |
|---|---|---|---|
| `saved-1000` | First Thousand | Save ₱1,000 toward any goal | `bi-piggy-bank-fill` |
| `saved-5000` | Five K Club | Save ₱5,000 total | `bi-safe2-fill` |

#### Streak diamonds (escalation tier — Transcript 6 "diamond streak system")
| Badge ID | Name | Trigger | Icon |
|---|---|---|---|
| `streak-diamond-7` | First Diamond | Reach a 7-day streak | `bi-gem` |
| `streak-diamond-42` | Six-Week Run | Reach a 42-day streak | `bi-gem` (blue tint) |
| `streak-diamond-100` | Century Flame | Reach a 100-day streak | `bi-gem` (gold tint) |

### StorageAPI changes
- Add `missionsCompleted` counter to user object (increment on each completed mission day)
- Add `questsCompleted` counter (increment on `getCurrentQuest()` → `completedAt` set)
- `buildAchievementState()` gains new cases for the above IDs

---

## Feature 3 — Sentimos Currency (₵)

**Psychological mechanism:** Infinite Game (streak freeze = loss aversion intensified), Craving Machine (spending decisions feel meaningful)
**Backend required:** Phase 1 (earn + streak freeze) — No. Phase 2 (gifting) — Yes (Firestore)

### What it is
A spendable in-app currency called **Sentimos (₵)** — named after the Filipino centavo. Earned by completing missions, quests, and earning badges. Spent on streak freezes and (later) on social gifts.

### Earning rates
| Action | Sentimos earned |
|---|---|
| Complete a daily mission | ₵10 |
| Complete a weekly quest | ₵50 |
| Earn a new achievement badge | ₵25 |
| Streak milestone (7, 14, 30, 60, 100 days) | ₵100 |
| Level up | ₵75 |

### Spending (Phase 1 — no backend)
| Item | Cost | Effect |
|---|---|---|
| Streak Freeze | ₵100 | Protects streak for 1 missed day — can hold max 2 at a time |

### Spending (Phase 2 — requires Firestore)
| Item | Cost | Effect |
|---|---|---|
| Send to Friend | ₵50 | Gifts Sentimos to a connected friend |
| Motivation Nudge | ₵30 | Sends a push notification to a friend's app (Sprint 4) |

### Dashboard footprint
A small **₵ balance chip** beside the streak badge in the Identity Hero area:
```
[🔥 12]  [₵ 340]
```
- Tapping the ₵ chip opens a Sentimos sheet: current balance, earn history, spend options
- No dedicated page needed until Phase 2

### StorageAPI methods to add
- `getSentimosBalance()` → number
- `addSentimos(amount, reason)` — called internally after mission complete / badge earned / level up
- `spendSentimos(amount, item)` — validates balance, deducts, returns success/fail
- `getSentimosLog()` → array of `{ amount, reason, direction, timestamp }`
- `activateStreakFreeze()` — spends ₵100, sets `streakFreezeActive: true` for the next missed day

### Implementation notes
- Sentimos are earned client-side. In Phase 1, no server verification is needed — this is a personal app with no competitive stakes on the currency.
- When Phase 2 (friends) is added, gifted Sentimos must be validated server-side to prevent tampering. Until then, client-only is fine.
- Streak freeze logic: `getCurrentStreak()` already checks consecutive days. Add a short-circuit: if today has no log but `streakFreezeActive === true`, consume the freeze and return streak count unchanged.

---

## Feature 4 — Friends + Social Leaderboard

**Psychological mechanism:** Invisible Scoreboard (the most powerful retention mechanism — turns engagement into identity)
**Backend required:** Yes — Firestore social graph + leaderboard queries
**Sprint target:** Sprint 3–4

> *"Without social visibility, a user can quit the craving machine privately. When their progression is visible to others, quitting stops being about losing progress — it becomes publicly admitting they stopped."* — Transcript 6

### Why this is built last
The invisible scoreboard only works if the other two mechanisms are already solid. A leaderboard on an app with weak missions and no currency gives users nothing to compete over. Build this after Quests and Sentimos are live so the leaderboard reflects meaningful cumulative effort.

### Leaderboard normalization (critical)
From Transcript 2 (Finbase): never rank users by raw peso amounts — this disadvantages users with smaller budgets. Rank by **consistency metrics** that anyone can achieve regardless of income:
- Streak count (primary rank factor)
- Missions completed this week (secondary)
- Quests completed (tertiary)

### Data model (Firestore)
```
/users/{uid}/
  publicProfile: {
    displayName,        // first name only
    levelName,          // e.g. "Budget Keeper"
    level,
    streak,
    missionsCompleted,
    questsCompleted,
    sentimosBalance
  }
  friends: [uid, uid, ...]      // friend list (mutual follow)
  friendRequests: [uid, ...]    // pending incoming requests
```

### Dashboard footprint (when built)
- A small **"Friends this week"** chip in the Identity Hero: *"You're #2 among 4 friends"*
- Tapping opens a full `leaderboard.html` page
- No leaderboard table on the dashboard itself — keeps the identity hero clean

### Public profile page
- Simple `profile.html?uid=xxx` — shows level name, streak count, badges earned, quest streak
- This is the "identity stake" — the thing users do not want to lose visibility of
- Linked from the leaderboard entries

---

## Summary Table

| Feature | Backend? | Sprint | Depends on |
|---|---|---|---|
| Expanded missions | No | Current (Phase E) | — |
| Weekly quests | No | Sprint 3 Phase 1 | Expanded missions |
| Achievement expansion | No | Sprint 3 Phase 1 | Quests + mission counter |
| Sentimos (earn + freeze) | No | Sprint 3 Phase 1 | Quests (earning activities) |
| Sentimos (gifting) | Yes (Firestore) | Sprint 3–4 | Friends feature |
| Friends + social leaderboard | Yes (Firestore) | Sprint 3–4 | Sentimos + quests live |
| Public profile page | Yes (Firestore) | Sprint 3–4 | Friends feature |
