# Design Reference — Leaderboard Page

> **Source research:** Duolingo Leaderboards page, Duolingo Profile page, Duolingo Shop page, Candle app, Gamification transcripts 2, 5 & 6
> **Maps to:** `leaderboard.html` + `js/leaderboard.js` + `css/style.css`
> **Sprint:** Phase 4 (requires Firestore — see `SPRINT3_PHASE4_SENTIMOS_SOCIAL.md`)
> **Cross-page contract:** See `DESIGN_REF_CROSS_PAGE_CONTRACT.md`. The leaderboard is Phase 4 — it extends the streak and XP systems visible elsewhere. The resource bar (🔥 ₵ ⚡) must appear at the top of this page via `app.js`, same as every other authenticated page.
> **Purpose:** This document is the authoritative design brief for `leaderboard.html`. When building or modifying the leaderboard, follow these specs exactly.

---

## Core Psychological Principle

From Gamification Transcript 6:

> *"Without social visibility, a user can quit the craving machine privately. When their progression is visible to others, quitting stops being about losing progress — it becomes publicly admitting they stopped."*

The leaderboard is the **Invisible Scoreboard** — the third and most powerful retention mechanism. It only works once the first two mechanisms (Craving Machine via quests/missions, Infinite Game via tiered badges) are solid. That is why this ships in Phase 4 after Phases 1 and 2.

---

## 1. Ranking Logic — Normalized, Never by Peso Amount

### Why normalization is critical
From Gamification Transcript 2 (Finbase case study): never rank users by raw peso amounts. A user with a ₱500 weekly budget cannot compete with a user who has a ₱5,000 budget. Ranking by amounts disadvantages lower-income users and destroys the fairness perception that makes the leaderboard feel worth engaging with.

### Ranking formula (`getLeaderboard()` in `firestore-service.js`)

Rank by consistency metrics that **anyone can achieve regardless of income:**

```
Primary:    streak count (descending)
Secondary:  missionsCompleted this week (descending)
Tertiary:   questsCompleted lifetime (descending)
```

Tie-breaking: alphabetical by `displayName`. Your own row is always included in the result set even if you have 0 in all metrics.

---

## 2. Page Layout (Mobile — primary target)

```
┌─────────────────────────────────┐
│  ← Leaderboard                  │  ← page header, back arrow
│                                 │
│  [Bronze League shield]         │  ← league tier badge, centered
│  Budget Rookie                  │  ← tier name (matches XP level name)
│  Resets in 3 days  ⏱           │  ← orange countdown chip
│                                 │
│  ─────────────────────────────  │
│  1  [avatar]  Maria C.    🔥14  │  ← rank rows
│  2  [avatar]  Carlo D.    🔥12  │
│  3▶ [avatar]  You         🔥 9  │  ← your row: green highlight, ▶ marker
│  4  [avatar]  Ana R.      🔥 7  │
│  5  [avatar]  Jon M.      🔥 3  │
│                                 │
│  ─────────────────────────────  │
│  Activity                       │  ← section header
│  [Maria logged 3 expenses · 2h] │  ← activity feed
│  [Carlo hit 14 days! 🔥] [🎉]  │
│                                 │
│  [+ Add Friends]                │  ← CTA at bottom when < 5 friends
└─────────────────────────────────┘
```

---

## 3. League Tier Badge System

### What Duolingo does
Each league has a distinct shield badge (Bronze, Silver, Gold, Platinum, Diamond). Three shields are always shown — your current tier, the next tier, and one locked tier — so you always see where you're going, not just where you are.

### SugboCents league tiers

Map directly to the existing XP level names from `storage.js`:

| XP Level | League Tier | Shield color | Threshold |
|---|---|---|---|
| 1 | Rookie Saver | Bronze (warm brown) | 0 XP |
| 2 | Budget Keeper | Silver (light grey) | 100 XP |
| 3 | Spending Scout | Gold (warm gold) | 300 XP |
| 4 | Frugal Fighter | Emerald (green) | 600 XP |
| 5 | Savings Sage | Sapphire (blue) | 1000 XP |
| 6 | Wealth Warden | Amethyst (purple) | 1500 XP |
| 7 | Budget Legend | Diamond (icy blue, glowing) | 2000 XP |

**Shield visual at top of leaderboard page:**
- Current tier shield: full color, centered, 64px
- Next tier shield: to the right, 48px, 60% opacity
- Tier after next: further right, 36px, 30% opacity, blurred

This is the "desire by progression" pattern — you always see the next tier just out of reach.

**HTML:**
```html
<div class="league-shields">
  <div class="league-shield league-shield--next-next">...</div>
  <div class="league-shield league-shield--next">...</div>
  <div class="league-shield league-shield--current">...</div>
</div>
```

---

## 4. The Countdown Timer

### What Duolingo does
An orange pill shows "⏱ 7 days" or "⏱ 6 days" beside the league name. This creates urgency — the leaderboard resets. You must compete now or lose your position.

### SugboCents implementation

Orange pill chip beneath the league tier name:

```
⏱  Resets in 3 days
```

- Color: orange `#F97316` (consistent with the streak color — both are time-sensitive urgency signals)
- Reset cadence: end of ISO week (Sunday 23:59)
- When < 24h left: show hours instead — "⏱ Resets in 6 hours"
- When < 1h left: show "⏱ Resetting soon" with a pulse animation

**`js/leaderboard.js` — timer logic:**
```js
function getResetLabel() {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
  sunday.setHours(23, 59, 59, 999);
  const msLeft = sunday - now;
  const hoursLeft = Math.floor(msLeft / 3600000);
  const daysLeft = Math.floor(hoursLeft / 24);
  if (daysLeft >= 1) return `Resets in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
  if (hoursLeft >= 1) return `Resets in ${hoursLeft} hours`;
  return 'Resetting soon';
}
```

---

## 5. Rank Row Anatomy

Every friend row has the same consistent structure:

```
[rank]  [avatar]  [display name]     [streak chip]
  3▶    [M circle]  You              [🔥 9]
```

**Rank number:**
- 1st: gold `#EAB308`
- 2nd: silver `#9CA3AF`
- 3rd: bronze `#C2773A`
- 4th+: muted grey, smaller

**Avatar:**
- Colored-initial circle — first letter of first name, background color determined by their XP level tier (Bronze = warm brown, Silver = grey, Gold = warm gold, etc.)
- 40px diameter
- Level badge overlaid bottom-right: a small 18px shield icon in the tier color
- Online presence dot: 10px green `#22C55E` bottom-right of avatar when user was active within the last 15 minutes (Firestore presence)

**Display name:**
- First name + last initial (privacy — never full last name): "Maria C."
- `font-weight: 600`, `font-size: 0.9375rem`

**Streak chip (right side):**
- Flame emoji + streak count
- Orange when streak > 0
- Grey when streak = 0

**Your own row:**
- Background: `rgba(43, 130, 89, 0.12)` — very light brand green tint
- Left border: `3px solid var(--brand-700)`
- ▶ marker on the rank number
**Tapping a friend row:** Navigates to `profile.html?uid=FRIEND_UID`. This is how profiles are discovered — not through a separate "find profiles" feature, but through the natural act of seeing someone on the leaderboard and wanting to know more about them.

**Gift ₵ button on friend rows (Phase 4):**
```
3  [M]  Maria C.    🔥 14    [Gift ₵]
```
- Teal text button, right side, next to the streak chip
- Tapping opens the Gift ₵ confirmation sheet (full spec in `DESIGN_REF_SHOP_SENTIMOS.md` Section 6)
- Your own row does NOT show Gift ₵ (can't gift to yourself)
**CSS:**
```css
.leaderboard-row                    /* flex, align-center, padding, border-radius */
.leaderboard-row--self              /* green tint bg + left border */
.leaderboard-avatar                 /* 40px circle, colored by tier */
.leaderboard-avatar__level-badge    /* 18px shield, absolute bottom-right */
.leaderboard-avatar__presence-dot   /* 10px green dot, absolute bottom-right */
.leaderboard-rank                   /* number, colored by position */
.leaderboard-streak-chip            /* orange pill, flame + number */
```

---

## 6. Locked / Empty State (No Friends Yet)

### What Duolingo does
The locked leaderboard shows the shield icons (you understand the goal), renders a **blurred ghost list** of competitor rows beneath, and gives a single specific CTA: "COMPLETE 10 MORE LESSONS." Showing what you're missing is more motivating than a blank page with a message.

### SugboCents implementation

When the user has 0 friends (`getFriends()` returns empty):

```
┌─────────────────────────────────┐
│  [Bronze shield, faded]         │
│  Budget Rookie                  │
│  Resets in 3 days  ⏱           │
│                                 │
│  ─────────────────────────────  │
│  [blurred row placeholder × 5]  │  ← 5 fake rows, CSS blur(4px) + 60% opacity
│                                 │
│  👥  Add your first friend      │  ← centered card, brand green icon
│     to start competing          │
│                                 │
│  [  Find Friends  ]             │  ← full-width green CTA button
└─────────────────────────────────┘
```

**Blurred placeholder rows:**
```html
<div class="leaderboard-row leaderboard-row--ghost" aria-hidden="true">
  <span class="leaderboard-rank">1</span>
  <div class="leaderboard-avatar leaderboard-avatar--ghost"></div>
  <span class="leaderboard-name--ghost"></span>
  <div class="leaderboard-streak-chip--ghost"></div>
</div>
```
```css
.leaderboard-row--ghost {
  filter: blur(4px);
  opacity: 0.5;
  pointer-events: none;
  user-select: none;
}
```

**Never show a blank page or an empty state illustration alone.** The blurred rows must always be present to communicate "this exists — you're just not part of it yet."

---

## 7. Friend Suggestions (Unlock Gate CTA)

When in empty state, show 2–3 friend suggestion cards as horizontal scroll below the "Add your first friend" CTA:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  [avatar]    │  │  [avatar]    │  │  [avatar]    │
│  Ana R.      │  │  Jon M.      │  │  Carlo D.    │
│  🔥 7-day   │  │  Budget Keeper│  │  5 friends  │
│  streak      │  │  level        │  │  in common  │
│  [FOLLOW]    │  │  [FOLLOW]    │  │  [FOLLOW]    │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Social proof copy rules (vary by relationship type):**
- If user has similar streak ±5 days: `"🔥 Has a ${n}-day streak"`
- If user has mutual friends: `"${n} friends in common"`
- If user is same XP level: `"Also a ${levelName}"`
- If user joined around the same time: `"Saving since ${monthYear}"`

**FOLLOW button:** Brand green, full-width on card. Tapping sends a friend request and grays the button to "Requested."

---

## 8. Activity Feed

### What Duolingo does
The right sidebar on desktop profile shows a live friend activity feed: "John Smith · 1 min — Earned a total of 100 XP! [CELEBRATE 🎉]". This creates ambient awareness — you know what friends are doing without actively checking. Passive awareness → guilt for not doing anything → action.

### SugboCents implementation

A section below the rank list titled "Activity":

```
ACTIVITY
────────────────────────────────
[M]  Maria logged 3 expenses today   · 2h ago
[C]  Carlo hit a 14-day streak! 🔥   · 4h ago   [🎉 Celebrate]
[A]  Ana completed this week's quest  · 1d ago
────────────────────────────────
View all activity  →
```

**Activity event types to display:**
| Event | Copy |
|---|---|
| User logged expenses | `"[Name] logged ${n} expense${n>1?'s':''} today"` |
| Streak milestone | `"[Name] hit a ${n}-day streak! 🔥"` |
| Quest completed | `"[Name] completed this week's quest"` |
| Badge earned | `"[Name] earned the '${badgeName}' badge"` |
| Level up | `"[Name] leveled up to ${levelName}"` |

**CELEBRATE button:**
- Only appears on streak milestones and level-up events
- Tapping sends a push notification to the friend (Phase 4 Firestore)
- After tapping: button grays to "Celebrated ✓" — cannot spam

**Firestore data model for activity feed:**
```
/users/{uid}/activity (subcollection)
  type: "streak_milestone" | "quest_complete" | "badge_earned" | "level_up" | "expense_log"
  timestamp: serverTimestamp()
  metadata: { streak?, questId?, badgeId?, levelName?, expenseCount? }
```
Friends read each other's activity subcollections in a fan-out query on page load (limit 20 events, ordered by timestamp desc).

---

## 9. XP Comparison Chart (Friend Profile → "This Week" tab)

### What Duolingo does
When viewing a friend's profile, a line chart shows your XP vs. theirs across the current week. The gap is visual and undeniable but framed as information, not judgment. The psychological effect is entirely internal — the user feels the gap without being told they're losing.

### SugboCents implementation

On `profile.html?uid=xxx` (the public profile page — see `SPRINT3_PHASE4_SENTIMOS_SOCIAL.md`), include a "This Week" tab with a line chart:

```
Logging this week
• [Friend name]    5 days  (solid colored line)
○ You              3 days  (dashed grey line)

[line chart: Mon Tue Wed Thu Fri Sat Sun]
```

**Chart renders days-logged (0 or 1 per day) as a step line** — not peso amounts (privacy + normalization). A logged day = 1, unlogged day = 0. The friend's line is in their tier color; yours is a dashed grey.

**Library:** Use a tiny canvas-based line chart (same pattern as `js/spending-chart.js`) — no external library needed.

---

## 10. Page-Level CSS Variables to Define

Add these to `:root` in `css/style.css` alongside the existing brand tokens:

```css
/* Leaderboard / social */
--rank-gold:     #EAB308;
--rank-silver:   #9CA3AF;
--rank-bronze:   #C2773A;
--self-row-bg:   rgba(43, 130, 89, 0.12);
--presence-dot:  #22C55E;
--urgency-timer: #F97316;   /* reuse streak orange */

/* League tier shield colors */
--tier-bronze:   #C2773A;
--tier-silver:   #9CA3AF;
--tier-gold:     #EAB308;
--tier-emerald:  #2b8259;   /* reuse brand-700 */
--tier-sapphire: #2563EB;
--tier-amethyst: #7C3AED;
--tier-diamond:  #67E8F9;   /* icy blue */
```

---

## 11. Implementation Checklist

- [ ] `leaderboard.html` created with protected route (`data-protected="true"`)
- [ ] `js/leaderboard.js` created as self-contained IIFE
- [ ] `leaderboard.html` added to `sw.js` shell cache array (bump version)
- [ ] League tier shields render (current full, next 60%, tier-after 30%)
- [ ] Orange countdown timer shows days/hours remaining to Sunday reset
- [ ] Rank rows: colored-initial avatar, level badge overlay, presence dot, streak chip
- [ ] Your own row: green tint background + left border + ▶ marker
- [ ] Rank 1/2/3 use gold/silver/bronze colors on the number
- [ ] Empty state: blurred ghost rows present (never a blank page)
- [ ] Empty state: "Add your first friend" CTA with FOLLOW suggestion cards
- [ ] Friend suggestion cards use correct social proof copy by relationship type
- [ ] Activity feed section renders below rank list
- [ ] CELEBRATE button on streak/level-up events — grays after tap
- [ ] `getLeaderboard()` sorts by streak → missions → quests (never by peso)
- [ ] `syncPublicProfile()` called after every XP/streak/sentimos change
- [ ] Friend request: FOLLOW button → "Requested" state → when accepted, row appears in leaderboard
- [ ] `profile.html?uid=xxx` renders with "This Week" logging comparison chart
- [ ] Tapping a friend row navigates to `profile.html?uid=FRIEND_UID`
- [ ] Gift ₵ button visible on all friend rows (Phase 4) — own row excluded
- [ ] Resource bar (🔥 ₵ ⚡) injected at top of leaderboard page by `app.js`

---

## 12. Cross-Page Integration

The leaderboard is the **social visibility layer** that makes every other gamification feature meaningful to others. Here is how it connects:

| Leaderboard element | Data source | Also visible in |
|---|---|---|
| Streak chip on rank rows | `user.streak` (Firestore public profile) | Resource bar (own, all pages), dashboard identity hero, profile stats grid |
| League tier shield | XP level (maps 1:1 to league tier) | Profile avatar level badge, resource bar ⚡ chip, dashboard XP widget |
| Rank position | Derived from streak/missions/quests | Not visible elsewhere — leaderboard exclusive |
| Activity feed events | Firestore activity log | Activity page (`activity.html`) — same events, different presentation |
| Gift ₵ button | Triggers `giftSentimos()` Firestore transaction | Sentimos log in recipient's Balance Sheet, `-₵ N` in sender's Balance Sheet |
| Friend suggestion cards | Firestore user search | Also surfaced in profile page friends section empty state |
| Tapping rank row | Navigates to `profile.html?uid=xxx` | Profile page is the destination — never a modal |

**Key rule:** The leaderboard must feel like a natural extension of the dashboard, not a separate feature. The user's streak and level visible on the dashboard are THE SAME numbers they compete with on the leaderboard. They should feel like: "the streak I've been building — others can see it now."
