# Sprint 3 — Phase 4: Sentimos Currency + Friends + Social Leaderboard

> **Backend required:** Yes — Firestore
> **Depends on:** Phase 1 (quests live) + Phase 2 (mission/quest counters live)
> **Note:** Phase 3 (standalone Sentimos on localStorage) was removed. Sentimos ships here with Firestore so the balance is cross-device from day one. See `SPRINT3_OVERVIEW.md` — Decision Log for rationale.

---

## Part A — Sentimos Currency (₵)

### What It Is

A spendable in-app currency called **Sentimos (₵)** — named after the Filipino centavo. Earned by completing missions, quests, and earning badges. Spent on streak freezes and (later) on social gifts to friends.

### New Firestore fields (merged into `publicProfile` document)

```js
sentimos: 0,
sentimosLog: [],        // array of { amount, reason, direction, timestamp }
streakFreezeCount: 0,   // how many freezes currently equipped (max 2)
streakFreezeActive: false
```

### Earning Rates

| Action | Sentimos earned |
|---|---|
| Complete a daily mission | ₵10 |
| Complete a weekly quest | ₵50 |
| Earn (claim) a new achievement badge | ₵25 |
| Streak milestone (7, 14, 30, 60, 100 days) | ₵100 |
| Level up | ₵75 |

### Spending — Phase 4

| Item | Cost | Effect |
|---|---|---|
| Streak Freeze | ₵100 | Protects streak for 1 missed day — max 2 held at a time |
| Send to Friend | ₵50 | Gifts Sentimos to a connected friend (Phase 4 social) |

### StorageAPI Methods to Add (`js/storage.js`)

```js
getSentimosBalance()          // → number
addSentimos(amount, reason)   // appends to sentimosLog, updates balance, syncs Firestore
spendSentimos(amount, item)   // validates balance, deducts, returns { success, newBalance }
getSentimosLog()              // → array, most recent first
activateStreakFreeze()        // spends ₵100, sets streakFreezeActive: true, increments streakFreezeCount (max 2)
```

### Hook `addSentimos` into existing flows

| Trigger location | Amount | Reason string |
|---|---|---|
| `addXpInternal()` — after level-up | ₵75 | `"level-up"` |
| `claimAchievement()` — after badge claimed | ₵25 | `"badge-${id}"` |
| `_completeQuest()` — Phase 1 | ₵50 | `"quest-${id}"` |
| `incrementMissionsCompleted()` — Phase 2 | ₵10 | `"mission-day"` |
| `getCurrentStreak()` — on streak milestone | ₵100 | `"streak-${count}"` |

### Streak Freeze Logic

Update `getCurrentStreak()`:

```js
// If today has no expense BUT a freeze is active: consume it
if (todayHasNoExpenses && user.streakFreezeActive) {
  user.streakFreezeActive = false;
  user.streakFreezeCount = Math.max(0, user.streakFreezeCount - 1);
  this._saveUser(user);
  // return streak count unchanged — the freeze protected it
  return previousStreakCount;
}
```

### Streak Break Recovery Modal

When the user opens the app and their streak has broken (missed yesterday, no freeze was active):

```
[Tigom — sad/diminished expression]

Your streak ended. But it's not too late.

[Use Streak Freeze — 1 remaining]   ← green CTA (shown if streakFreezeCount > 0)
[Get a Streak Freeze for ₵100]      ← shown if 0 freezes but balance ≥ 100
[Continue anyway]                   ← grey dismiss
```

> The freeze option surfaces at the moment of streak loss — NOT just in the shop. Emotional context makes the freeze feel like a lifeline, not a transaction. (Pattern from Candle app "Restore" button.)

### Dashboard: Sentimos Chip

Render `[₵ 340]` as a small pill beside the streak badge in the Identity Hero area:

```
[🔥 12]   [₵ 340]
```

- Tapping opens the **Sentimos bottom sheet**
- Sheet shows: current balance, recent log (last 5 entries), streak freeze inventory + CTA

### CSS to Add (`css/style.css`)

```css
/* Sentimos chip — beside streak badge */
.sentimos-chip { }

/* Sentimos bottom sheet — same pattern as existing .modal-sheet */
.sentimos-sheet { }

/* Streak Freeze button inside sheet */
.sentimos-freeze-btn { }
.sentimos-freeze-btn--equipped { }   /* grayed, "EQUIPPED" label when maxed */
.sentimos-freeze-btn--insufficient { } /* grayed, "NEED ₵X MORE" when low balance */
```

---

## Part B — Friends + Social Leaderboard

### Firestore Data Model

```
/users/{uid}/publicProfile
  displayName        // first name only
  levelName          // e.g. "Budget Keeper"
  level              // number 1–7
  streak             // current streak count
  missionsCompleted  // lifetime counter
  questsCompleted    // lifetime counter
  sentimos           // current balance
  savingSince        // ISO date — account creation date

/users/{uid}/friends
  [uid, uid, ...]    // mutual follows

/users/{uid}/friendRequests
  [uid, ...]         // pending incoming requests
```

### `js/firestore-service.js` Methods to Add

```js
syncPublicProfile()            // write local user state → Firestore publicProfile
                               // called on login + after any XP/streak/sentimos change

sendFriendRequest(targetUid)   // writes to /users/{targetUid}/friendRequests
acceptFriendRequest(fromUid)   // adds to both /friends arrays, removes from friendRequests
getFriends()                   // returns array of friend publicProfiles
getLeaderboard()               // queries friends' publicProfiles, sorts by:
                               //   1. streak (primary)
                               //   2. missionsCompleted (secondary)
                               //   3. questsCompleted (tertiary)
                               // → returns ranked array with currentUser included

giftSentimos(toUid, amount)    // Phase 4 social — deducts from sender, adds to receiver
                               // both operations in a Firestore transaction
```

> **Leaderboard normalization is critical:** Never rank by raw peso amounts — this disadvantages users with smaller budgets. Rank by consistency metrics that anyone can achieve regardless of income. (Source: Gamification Transcript 2, Finbase case study.)

### New Pages

#### `leaderboard.html` + `js/leaderboard.js`

- Shows ranked friend list (you included)
- Your row is highlighted in brand green
- Orange countdown chip: "Resets in 3 days" (to end of week)
- **Locked/empty state** (0 friends): show blurred placeholder rows + "Add your first friend to start competing" CTA — do NOT hide the page
- Each friend row: colored-initial avatar, name, level badge, streak count, rank position
- Online presence dot (Firestore presence via `.onDisconnect()`)
- Mini activity feed at bottom: "Maria logged 3 expenses · 2h ago" with [CELEBRATE 🎉] button

#### `profile.html` + `js/profile.js`

- URL: `profile.html?uid=xxx` (public view of any user)
- Shows: level name, level badge, streak, missionsCompleted, questsCompleted, sentimosBalance
- "Saving since [Month Year]" seniority marker
- Top 3 earned badges preview
- FOLLOW / FOLLOWING button (toggle)
- Share button (copy profile link)

### Dashboard Changes (`js/dashboard.js`)

When `getFriends()` returns ≥ 1 friend: render a chip in the Identity Hero area:

```
You're #2 among 4 friends  →
```

Tapping → `leaderboard.html`.

### Friend Suggestions

On `leaderboard.html` (empty state) and on the user's own profile:
- Suggest users from Firestore who have similar streak counts (±5 days)
- Social proof copy: "Has a 14-day streak" or "Also saving since April 2026"
- FOLLOW button (full-width on card), ✕ dismiss

---

## Sync Strategy

`syncPublicProfile()` is called after:
- User login / app load
- `addXp()` returns
- `incrementMissionsCompleted()` returns
- `_completeQuest()` returns
- `activateStreakFreeze()` or `spendSentimos()` returns

This keeps the leaderboard data fresh without a dedicated sync timer.

---

## `sw.js`

Bump cache version after Phase 4 is complete. Add `leaderboard.html` and `profile.html` to the shell cache array.

---

## Completion Criteria

- [ ] ₵ chip renders beside streak badge with Firestore-synced balance
- [ ] `addSentimos` fires correctly from all 5 trigger points
- [ ] Streak freeze protects streak on a missed day (no log, freeze active → count unchanged)
- [ ] Streak break recovery modal surfaces freeze option at the right moment
- [ ] Sentimos bottom sheet shows balance, log, and freeze CTA
- [ ] `syncPublicProfile()` writes to Firestore after every XP/streak/sentimos change
- [ ] Friend request round-trip works (send → accept → both appear in each other's friends list)
- [ ] `getLeaderboard()` returns correctly ranked array (streak → missions → quests)
- [ ] Leaderboard page shows your row in green, orange countdown, activity feed
- [ ] Locked leaderboard shows blurred rows + CTA (not a blank page)
- [ ] `leaderboard.html` and `profile.html` added to sw.js shell cache
