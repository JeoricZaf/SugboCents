# Design Reference — Badges & Achievements

> **Source research:** Duolingo Achievements page, Candle app achievement grid, Gamification transcripts 5 & 6
> **Maps to:** `stats.html` + `js/stats.js` + `css/style.css`
> **Sprint:** Phase 2 (Achievement Expansion — see `SPRINT3_PHASE2_ACHIEVEMENTS.md`)
> **Cross-page contract:** See `DESIGN_REF_CROSS_PAGE_CONTRACT.md`. Badges are NOT only on the stats page — the badge teaser is on the dashboard, the badge shelf preview is on the profile page, and badge unlock toasts fire on any page.
> **Purpose:** This document is the authoritative design brief for the badges and achievements system. When implementing or modifying the badge shelf on `stats.html`, follow these specs exactly.

---

## Core Psychological Principles

Two mechanisms work in tandem on the achievements page:

1. **Infinite Game (no done state):** From Gamification Transcript 6: *"The most addictive apps never let you finish."* Every badge has multiple tiers ("2 of 5"). Even maxed badges ("5 of 5") get a distinct shimmer treatment — but another category of badge always exists. The user can never see all badges and feel "complete."

2. **Badge Proximity Effect (Craving Machine):** From Transcript 6: the closer a user is to the next badge threshold, the more motivated they are to close the gap. The badge shelf must always show at least one badge the user is close to unlocking — this is the "badge teaser" on the dashboard. The achievements page is where that teaser resolves.

---

## 1. Page Layout (`stats.html` — Achievements Section)

```
ACHIEVEMENTS                                VIEW ALL
───────────────────────────────────────────────────

PERSONAL RECORDS
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  🔥           │ │  ⚡           │ │  💰           │
│  30           │ │  1,240        │ │  ₱12,500      │
│  Longest      │ │  Most XP in  │ │  Most saved   │
│  Streak       │ │  a week      │ │  in a month   │
│  Apr 30, 2026 │ │  May 3, 2026  │ │  Apr, 2026    │
└──────────────┘ └──────────────┘ └──────────────┘

AWARDS
[badge grid — 3 columns]
```

---

## 2. Personal Records Section

### What Duolingo does
The top of the Achievements page shows 3–4 illustrated stat cards. Each has: a rich illustrated background, a large bold number (the all-time personal best), the stat name, and **the date it was set**. The date is the most subtle but powerful detail — "Longest Streak 873, Sep 30, 2023" makes it a *memory*, not just a number. Users remember what they were doing that month.

### SugboCents Personal Records — 3 Cards

| Record | Icon | Number format | Label | Date format |
|---|---|---|---|---|
| Longest Streak | 🔥 | `N days` | "Longest Streak" | `MMM D, YYYY` |
| Most XP in a Week | ⚡ | `N XP` | "Best Week" | `MMM D–D, YYYY` |
| Most Saved in a Month | 💰 | `₱N,NNN` | "Best Month Saved" | `MMM YYYY` |

**Card visual design:**
- Each card has a colored illustrated background (not flat color):
  - Streak record: orange/flame gradient bg
  - XP record: gold/yellow gradient bg
  - Savings record: green gradient bg
- The **number is the visual hero**: `font-size: 2rem`, `font-weight: 700`, `font-family: Sora`
- The date is small and muted: `font-size: 0.7rem`, `color: rgba(255,255,255,0.7)`
- Cards are horizontally scrollable on mobile (overflow-x: auto, no scroll indicators)

**StorageAPI fields to track for Personal Records (add to `storage.js`):**
```js
user.records = {
  longestStreak: { value: 0, date: null },
  bestWeekXp:    { value: 0, weekStart: null },
  bestMonthSaved: { value: 0, month: null }
}
```

Update `records.longestStreak` inside `getCurrentStreak()` whenever current streak exceeds stored record.
Update `records.bestWeekXp` inside `addXpInternal()` when weekly XP sum exceeds stored record.
Update `records.bestMonthSaved` inside `addGoal` / `updateGoalProgress()`.

**HTML pattern:**
```html
<div class="personal-records">
  <div class="record-card record-card--streak">
    <span class="record-card__number">30</span>
    <span class="record-card__label">Longest Streak</span>
    <span class="record-card__date">Apr 30, 2026</span>
  </div>
  <!-- repeat for XP, savings -->
</div>
```

**CSS:**
```css
.personal-records         /* flex row, overflow-x: auto, gap-3, padding-bottom for scroll */
.record-card              /* min-width: 120px, padding, border-radius: 16px, position: relative */
.record-card--streak      /* background: linear-gradient(135deg, #F97316, #EA580C) */
.record-card--xp          /* background: linear-gradient(135deg, #EAB308, #CA8A04) */
.record-card--savings     /* background: linear-gradient(135deg, #2b8259, #1f6b46) */
.record-card__number      /* font-size: 2rem, font-weight: 700, Sora, white */
.record-card__label       /* font-size: 0.75rem, font-weight: 600, white */
.record-card__date        /* font-size: 0.7rem, color: rgba(255,255,255,0.7) */
```

---

## 3. The Award Badge Grid — Core Design System

### What Duolingo does — key observations from screenshots

**The number embossed on the badge:**
Every badge shows a large bold number overlaid on the illustrated character (10, 75, 150, 5000). This number is the threshold crossed to earn it — it doubles as the badge identity AND proof of achievement. The number and the art are inseparable.

**"N of M" tier label:**
Beneath every badge name: "9 of 10", "2 of 5". This means the badge has M tiers total and the user has earned N of them. "10 of 10" is legendary — extremely rare, distinct shimmer treatment.

**The illustrated character as the badge (not a flat icon):**
Every badge is a character in a scene. "Early Riser" = a character waking at dawn. "Sleepwalker" = a character on a phone at night. "Speed Racer" = a character sprinting. The illustration tells the story of what you did to earn it.

**Visual rarity differentiation:**
- Low tier: warm orange/brown background
- Mid tier: green/gold background
- High tier: purple/dark background, glowing edges
- Legendary/"Rarest Diamond": icy blue, completely distinct from all others

### SugboCents badge design system

Since SugboCents uses Bootstrap Icons (not custom illustrated characters), the badge visual treatment compensates with:
1. **Large bold number overlaid on the icon** — same principle as Duolingo, adapted for icon-style art
2. **Colored background square** by rarity tier
3. **"N of M" tier label** beneath every badge name — non-negotiable
4. **Gradient dimming** for locked tiers (Candle app pattern)

**Badge card anatomy:**

```
┌─────────────────────────┐
│  [colored bg square]    │  ← 72px × 72px, border-radius: 16px
│  [Bootstrap Icon — 32px]│
│     30                  │  ← large number overlaid, Sora bold, white
├─────────────────────────┤
│  Century Flame          │  ← badge name, 0.8125rem, semibold
│  2 of 3                 │  ← tier counter, 0.7rem, muted
└─────────────────────────┘
```

**Badge card states and visual treatment:**

| State | Background | Icon opacity | Number | Effect |
|---|---|---|---|---|
| **Unlocked + claimed** | Full rarity color | 100% | White, large, bold | None |
| **Unlocked + unclaimed** | Full rarity color | 100% | White, large, bold | Pulsing gold border `box-shadow: 0 0 0 3px #EAB308` |
| **Locked — near (≥50% progress)** | Rarity color at 60% opacity | 60% | Muted grey number | No glow |
| **Locked — far (<50% progress)** | Rarity color at 30% opacity | 30% | Very faint | No glow |
| **Maxed (N = M)** | Full rarity color + subtle shimmer | 100% | White | Shimmer animation |

> **Critical rule from Candle app:** Never use ❌, "LOCKED" text, or an empty slot to represent locked badges. Use visual dimming only. The user should feel like they're looking at a foggy horizon, not a wall. The badges are always present — they just haven't emerged from the fog yet.

---

## 4. Rarity Tier Color System

Map badge rarity to the existing XP level color vocabulary:

| Tier | Badge categories | Background color | Number color |
|---|---|---|---|
| **Bronze** (common) | Logging basics, first streaks, first XP | `#C2773A` warm brown | White |
| **Silver** (mid) | Streak 7–30, missions 5–25, quest 1 | `#6B7280` slate grey | White |
| **Gold** (rare) | Streak 42, missions 100, quest 5, savings ₱1k | `#CA8A04` dark gold | White |
| **Emerald** (epic) | Streak 100, missions 365, quest-streak-3, savings ₱5k | `#1f6b46` dark brand green | White |
| **Diamond** (legendary) | Streak 100+ diamond badges, Budget Legend level | `#0891B2` dark cyan/icy blue | White, slight glow |

**Applying to current 14 badges + 14 new Phase 2 badges:**

| Badge ID | Rarity tier | Background |
|---|---|---|
| `first-step` | Bronze | `#C2773A` |
| `getting-started` | Bronze | `#C2773A` |
| `streak-3` | Bronze | `#C2773A` |
| `streak-7` | Silver | `#6B7280` |
| `streak-14` | Silver | `#6B7280` |
| `streak-30` | Gold | `#CA8A04` |
| `mission-5` | Bronze | `#C2773A` |
| `mission-25` | Silver | `#6B7280` |
| `mission-100` | Gold | `#CA8A04` |
| `mission-365` | Emerald | `#1f6b46` |
| `quest-1` | Silver | `#6B7280` |
| `quest-5` | Gold | `#CA8A04` |
| `quest-streak-3` | Emerald | `#1f6b46` |
| `saved-1000` | Gold | `#CA8A04` |
| `saved-5000` | Emerald | `#1f6b46` |
| `streak-diamond-7` | Gold | `#CA8A04` |
| `streak-diamond-42` | Emerald | `#1f6b46` |
| `streak-diamond-100` | Diamond | `#0891B2` |

---

## 5. Grid Layout & Organization

### What Duolingo does
3-column grid. No explicit category separators between badge types on the main grid — categories are implied by visual similarity. A "VIEW ALL" link from the profile preview leads to the full grid.

### SugboCents badge shelf layout

**3-column CSS grid**, items sorted by:
1. Unlocked + unclaimed (top — highest priority, needs attention)
2. Unlocked + claimed (second — already earned, visible proof)
3. Locked — near (third — motivational, close to earning)
4. Locked — far (bottom — present but not urgent)

Within each group, sort by rarity ascending (Bronze first → Diamond last) so the grid reads as a progression from easy to legendary.

**Category section dividers (unlike Duolingo — we use them for clarity):**

```
STREAKS
[streak badges grid row]

MISSIONS
[mission badges grid row]

QUESTS
[quest badges grid row]

SAVINGS
[savings badges grid row]
```

Section dividers use the same pattern as other section headers:
```css
font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted);
```

**"N badges to earn" summary line at bottom:**
```
+ 6 more badges to unlock  →
```
This line always shows how many badges are still in locked-far state. It prevents the grid from feeling "done" even when many are claimed.

---

## 6. Badge Claim Flow

### On the achievements page
When a badge is unlocked but unclaimed (pulsing gold border), the user taps the card:

1. Card briefly scales up (`transform: scale(1.05)`, 150ms)
2. Claim confirmation sheet slides up:
   ```
   ┌──────────────────────────────────┐
   │  [full badge card — large 96px]  │
   │  Century Flame                   │
   │  Streak Diamond · 3 of 3         │
   │                                  │
   │  "You reached a 100-day streak!" │
   │                                  │
   │  Reward: +15 XP  +₵25           │
   │                                  │
   │  [  CLAIM BADGE  ]               │  ← brand green, full-width
   └──────────────────────────────────┘
   ```
3. On "CLAIM BADGE" tap: calls `StorageAPI.claimAchievement(id)` → fires `GamificationUI.queueModal()` → badge border changes from pulsing gold to claimed state

### On the dashboard (badge teaser)
The dashboard badge teaser (`renderBadgeTeaser()`) shows one badge — the nearest-to-unlocking unclaimed badge. When the user taps "Claim" directly from the dashboard teaser, it opens the same claim sheet. After claiming, the teaser advances to the next closest badge.

---

## 7. The "N of M" Tier Counter — Design Rules

This is the single most important infinite-game element on the badge shelf. Rules:

1. **Always visible** — even for badges at "1 of 3" (first tier only). Never hide it.
2. **Never say "MAXED" or "COMPLETE"** — use "5 of 5" with the shimmer treatment instead
3. **Font:** `0.7rem`, `font-weight: 500`, `color: var(--text-muted)` — small and subordinate
4. **Positioning:** directly below the badge name, not below the badge art

**How tier counters map to the badge data model:**

In `storage.js`, the `ACHIEVEMENTS` array for tiered badges stores the *current tier* as the badge entry. Each tier is its own badge ID:
- `streak-diamond-7` = tier 1 of 3 for the "Streak Diamond" series
- `streak-diamond-42` = tier 2 of 3
- `streak-diamond-100` = tier 3 of 3

The tier counter is derived from grouping badges by their `series` field:

```js
// In ACHIEVEMENTS array:
{ id: 'streak-diamond-7',   series: 'streak-diamond', tier: 1, totalTiers: 3, ... }
{ id: 'streak-diamond-42',  series: 'streak-diamond', tier: 2, totalTiers: 3, ... }
{ id: 'streak-diamond-100', series: 'streak-diamond', tier: 3, totalTiers: 3, ... }
```

The badge shelf groups by `series` and finds the highest claimed tier to display:
- If tier 1 is claimed, tier 2 is the "active" card (shown at full opacity, "2 of 3")
- If none are claimed, tier 1 is shown at 60% opacity
- The tier counter always reflects the *active* tier: "1 of 3", "2 of 3", "3 of 3"

---

## 8. Candle-Inspired Gradient Dimming — Implementation Detail

### What Candle does
The achievement grid has 12 badges arranged in a 4×3 grid. The top row (thresholds 3, 7, 30, 60) are full brightness. The middle row (90–222) are dark bronze — visible but muted. The bottom row (365–1000) are almost invisible dark brown. You can always see there are 12 badges, but only 4 are currently in reach. The gradient of visibility IS the design.

### SugboCents CSS implementation

Apply the three visibility states using a CSS custom property `--badge-vis`:

```css
.badge-card {
  opacity: var(--badge-vis, 1);
  filter: brightness(var(--badge-brightness, 1));
  transition: opacity 0.3s, filter 0.3s;
}

/* Unlocked (claimed or unclaimed) */
.badge-card--unlocked       { --badge-vis: 1;    --badge-brightness: 1; }

/* Locked — near (≥50% progress toward threshold) */
.badge-card--locked-near    { --badge-vis: 0.6;  --badge-brightness: 0.8; }

/* Locked — far (<50% progress) */
.badge-card--locked-far     { --badge-vis: 0.3;  --badge-brightness: 0.5; }
```

**State assignment in `js/stats.js` (or wherever badge grid renders):**

```js
function getBadgeVisClass(achievement) {
  if (achievement.claimed || achievement.unlockable) return 'badge-card--unlocked';
  if (achievement.progress / achievement.target >= 0.5) return 'badge-card--locked-near';
  return 'badge-card--locked-far';
}
```

---

## 9. Badge Notification on Dashboard

### The teaser card (`renderBadgeTeaser()` in `dashboard.js`)

The dashboard already has a badge teaser. It should follow this priority for *which badge to show*:

1. **Unlockable + unclaimed** — user can claim right now → show "CLAIM" button, pulsing gold border
2. **Locked — near (≥50% progress, not maxed tier)** — show progress bar toward unlock
3. **Lowest progress of the "near" group** — shows the badge closest to unlocking

**The teaser card anatomy (on dashboard):**
```
┌─────────────────────────────────────┐
│  [badge art — 48px]  First Diamond  │
│                       2 more days   │  ← proximity copy, not a percentage
│                       [████████░░]  │
│                       1 of 3        │  ← tier counter always visible
└─────────────────────────────────────┘
```

**Proximity copy rules:**
- `progress / target >= 0.8`: "Almost there! N more to go"
- `progress / target >= 0.5`: "Halfway! N more to go"
- `progress / target < 0.5`: "N more [unit] to unlock"

Always use absolute numbers ("2 more days") not percentages ("20% left") — specific numbers close the gap psychologically.

---

## 10. Page-Level CSS to Add (`css/style.css`)

```css
/* Personal Records */
.personal-records            { }
.record-card                 { }
.record-card--streak         { background: linear-gradient(135deg, #F97316, #EA580C); }
.record-card--xp             { background: linear-gradient(135deg, #EAB308, #CA8A04); }
.record-card--savings        { background: linear-gradient(135deg, #2b8259, #1f6b46); }
.record-card__number         { font-family: Sora; font-size: 2rem; font-weight: 700; color: white; }
.record-card__label          { font-size: 0.75rem; font-weight: 600; color: white; }
.record-card__date           { font-size: 0.7rem; color: rgba(255,255,255,0.7); }

/* Badge cards */
.badge-card                  { }
.badge-card--unlocked        { --badge-vis: 1; --badge-brightness: 1; }
.badge-card--locked-near     { --badge-vis: 0.6; --badge-brightness: 0.8; }
.badge-card--locked-far      { --badge-vis: 0.3; --badge-brightness: 0.5; }
.badge-card--claim-pending   { box-shadow: 0 0 0 3px #EAB308; animation: badge-pulse 1.5s infinite; }
.badge-card--maxed           { animation: badge-shimmer 3s infinite; }

.badge-card__art             { /* 72px × 72px square, border-radius: 16px, position: relative, overflow: hidden */ }
.badge-card__icon            { /* 32px Bootstrap Icon, centered in art square */ }
.badge-card__number          { /* overlaid on art: position: absolute, bottom-4, right-4, Sora, bold, white, large */ }
.badge-card__name            { /* 0.8125rem, font-weight: 600, margin-top: 6px */ }
.badge-card__tier            { /* 0.7rem, font-weight: 500, color: var(--text-muted) */ }

/* Rarity backgrounds */
.badge-art--bronze           { background: #C2773A; }
.badge-art--silver           { background: #6B7280; }
.badge-art--gold             { background: #CA8A04; }
.badge-art--emerald          { background: #1f6b46; }
.badge-art--diamond          { background: #0891B2; }

/* Animations */
@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 0 0 3px #EAB308; }
  50%       { box-shadow: 0 0 0 6px rgba(234, 179, 8, 0.4); }
}
@keyframes badge-shimmer {
  0%   { filter: brightness(1); }
  50%  { filter: brightness(1.2) saturate(1.3); }
  100% { filter: brightness(1); }
}
```

---

## 11. Implementation Checklist

- [ ] Personal Records section renders at top of achievements: 3 horizontally scrolling cards (streak, XP, savings)
- [ ] Each record card shows the number, label, and date it was set
- [ ] `user.records` object tracked in `storage.js` and updated at correct trigger points
- [ ] Badge grid uses 3-column CSS grid
- [ ] Badge cards sorted: unlocked-unclaimed → unlocked-claimed → locked-near → locked-far
- [ ] Category section dividers present (Streaks, Missions, Quests, Savings)
- [ ] Badge art: 72px colored background square + Bootstrap Icon + large number overlaid
- [ ] Rarity tier background colors assigned per badge ID (see rarity table in section 4)
- [ ] "N of M" tier counter always visible beneath badge name
- [ ] Gradient dimming: unlocked = 100%, locked-near = 60% opacity + 80% brightness, locked-far = 30% opacity + 50% brightness
- [ ] No "LOCKED" text, no ❌, no empty slots — use dimming only
- [ ] Unclaimed unlockable badge: pulsing gold border animation
- [ ] Maxed badge ("N of N"): shimmer animation
- [ ] Tapping unclaimed badge → claim sheet with reward preview (XP + ₵)
- [ ] "N more badges to unlock" summary line at bottom of grid
- [ ] Dashboard badge teaser shows correct badge by priority (unlockable → near → lowest progress)
- [ ] Dashboard badge teaser uses proximity copy ("2 more days") not percentages
- [ ] `buildAchievementState()` provides `visClass` field for badge rendering

---

## 12. Cross-Page Badge Surfaces

Badges are defined on the stats page but they surface on 4 different pages. This is the complete map:

### Dashboard — Badge Teaser Card
- Shows 1 badge: the nearest-to-unlocking unclaimed badge, chosen by `buildAchievementState()`
- If a badge is claimable right now: shows `CLAIM` button with pulsing gold border — user can claim directly from dashboard
- After claiming from the dashboard teaser: the teaser immediately advances to the next nearest badge
- Owner: `renderBadgeTeaser()` in `js/dashboard.js`

### Profile Page — Badge Shelf (3 most recent)
- Shows the 3 most recently claimed badges in a horizontal strip
- "View all →" link navigates to `stats.html#achievements`
- Badge art: same 72px colored square, same rarity colors — NOT a different design for the profile
- Owner: rendered by `js/profile.js`, data from `StorageAPI.buildAchievementState()`

### Any Page — Badge Unlock Toast
- When `buildAchievementState()` detects a newly unlockable badge (progress just hit threshold), a top-slide-in toast fires:
  ```
  ┌───────────────────────────────┐
  │  🏅 Badge unlocked: Century Flame  │
  │  Tap to claim →              │
  └───────────────────────────────┘
  ```
- 3 seconds, then auto-dismisses
- Tapping navigates to `stats.html#achievements` where the claim button waits
- Fires via `GamificationUI.maybeNotifyNewAchievements(ids)` which already exists in `js/gamification.js`
- Owner: `js/gamification.js` (existing), called from `js/dashboard.js` after expense log

### Stats Page — Full Badge Grid
- The source of truth view: all badges, sorted by state, with full Personal Records section above
- Claim actions happen here for anything not claimed from the dashboard teaser
- Owner: `js/stats.js` (rendering) + `js/storage.js` (data)

### The ₵ ↔ Badge Connection
- When `claimAchievement(id)` is called (from any page): awards XP + ₵
- `addSentimos(25, 'badge')` runs → resource bar ₵ chip updates immediately
- `addXpInternal()` runs → resource bar ⚡ chip updates
- Teal `+₵ 25` float popup fires (anchored to resource bar), gold `+15 XP` float popup fires
- The user sees coins flowing to their balance even if they're on the stats page — the resource bar is always there
