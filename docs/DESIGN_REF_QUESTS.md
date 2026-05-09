# Design Reference — Quests Page & Quest UI System

> **Source research:** Duolingo Quests page (desktop + mobile), Duolingo "Daily Quests update" popup, Gamification transcripts 5 & 6
> **Maps to:** `dashboard.html` (quest row in mission card) + `js/dashboard.js` + future `quests.html` if created + `js/storage.js` quest methods
> **Sprint:** Phase 1 (Weekly Quests — see `SPRINT3_PHASE1_WEEKLY_QUESTS.md`)
> **Cross-page contract:** See `DESIGN_REF_CROSS_PAGE_CONTRACT.md`. Quests are not a standalone feature — ₵ rewards feed the Sentimos balance (visible on all pages), XP rewards feed the level chip, quest completion events appear in the activity feed, and quest completion count drives leaderboard ranking.
> **Purpose:** This document is the authoritative design brief for every quest-related UI element. When implementing quest cards, the quest row on the dashboard, or the quest detail sheet, follow these specs exactly.

---

## Core Psychological Principle

From Gamification Transcript 5 & 6 — quests serve two mechanisms simultaneously:

1. **Infinite Game** — there is always a quest active. You are never "done." The week resets, a new quest arrives. The timer creates a deadline that prevents the game from feeling stale.
2. **Craving Machine** — the chest reward icon on every quest card is visible before completion. You're always working toward something tangible you can already see.

The "More quests unlock soon" locked row (visible but inaccessible) ensures there is always a reason to return — the app never feels fully explored.

---

## 1. Quest Hero Banner

### What Duolingo does
The Quests page opens with a **full-bleed themed hero card** — purple background, sparkle particles, Duo mascot holding a treasure chest, and copy that explains the system in 2 sentences. For seasonal events, the entire banner changes color, the mascot gets a new skin, and the title becomes a narrative name ("Duo's Frozen Winter" — not "January Challenge").

### SugboCents implementation

The quest detail bottom sheet (and any future `quests.html` page) opens with a hero banner:

```
┌──────────────────────────────────────┐
│  [brand green gradient background]   │
│  ✦  ✦                               │  ← CSS sparkle pseudo-elements
│  [Tigom — holding a coin bag, posed] │
│                                      │
│  This Week's Quest                   │  ← white, Sora font, 1.125rem
│  Complete quests to earn XP + ₵!    │  ← white, muted, 0.875rem
│  Quests reset every Monday.          │
└──────────────────────────────────────┘
```

**Seasonal variant trigger:** During special weeks (e.g., payday week = 15th/30th of month, or a user's budget streak milestone), swap:
- Banner background: a different brand color (e.g., purple `#7C3AED` for a "Power Week")
- Tigom skin: use a different mascot image variant (animated/decorated)
- Title: a narrative name — "Tigom's Frugal Run" not "This Week's Quest"

**CSS:**
```css
.quest-hero                    /* full-bleed, min-height: 140px, position: relative, overflow: hidden */
.quest-hero--seasonal          /* purple gradient variant */
.quest-hero__mascot            /* absolute, bottom-right, 80px tall */
.quest-hero__sparkle           /* ::before ::after pseudo-elements, gold ✦ character */
```

---

## 2. Quest Card Anatomy — The Most Important UI Unit

### What Duolingo does
Every quest card has an identical, ruthlessly consistent structure:

```
[ICON]  Quest title (bold, left-aligned)
        [████████░░░░░░  N / Target]        [CHEST]
```

- **Left icon:** color-coded by quest type (⚡ yellow = XP, 🟢 star = consistency, 🎯 target = accuracy/budget)
- **Progress bar:** yellow fill in-progress, green when complete — with `N / Target` label centered inside the bar
- **Right chest icon:** always present as the reward preview — slightly dark until completion, glows when complete

### SugboCents quest card implementation

Every quest card and quest row must follow this exact anatomy:

```
[ICON]  Quest title
        [██████████░░░░  3 / 5 days]          [₵ 50]
```

**Left icon — color-coded by quest type:**

| Quest type | Icon | Color |
|---|---|---|
| Logging consistency (`log_days`) | ⚡ bolt | Gold `#EAB308` |
| Budget adherence (`under_budget_days`) | 🎯 target | Brand green `#2b8259` |
| Expense count (`log_count`) | 📦 box | Slate `#475569` |
| No overspend (`no_overspend_days`) | 🛡️ shield | Teal `#0D9488` |
| Time-based (early riser, night owl) | 🕐 clock | Purple `#7C3AED` |

**Progress bar rules:**
- Fill color: gold `#EAB308` while in progress — never brand green (green = your own success; gold = earned reward in motion)
- Fill color: brand green `#2b8259` when `progress === target` (complete state)
- `N / Target` label is centered **inside** the bar, not below it — `font-size: 0.7rem`, `font-weight: 600`, `color: white` (on gold fill) or `color: rgba(0,0,0,0.5)` (on empty track)
- Bar height: 20px on mobile — tall enough to contain the label text
- Border radius: 999px (fully rounded, pill shape)

**Right reward icon:**
- Shows `₵ 50` in a small teal pill — the specific amount, not just a chest graphic
- When quest is complete: the pill glows, changes to `✓ Claimed` after the user taps to collect
- When quest is not started: the pill is slightly muted (70% opacity)

**Full card HTML pattern:**
```html
<div class="quest-card quest-card--in-progress" data-quest-id="quest-log5-budget3">
  <div class="quest-card__icon quest-card__icon--bolt">⚡</div>
  <div class="quest-card__body">
    <p class="quest-card__title">Disciplined Week</p>
    <div class="quest-card__bar-wrap">
      <div class="quest-card__bar" style="--progress: 60%">
        <span class="quest-card__bar-label">3 / 5 days</span>
      </div>
    </div>
  </div>
  <div class="quest-card__reward">₵ 50</div>
</div>
```

**CSS:**
```css
.quest-card                     /* flex row, gap-3, padding, card border-radius */
.quest-card--in-progress        /* no modifier needed — default */
.quest-card--complete           /* bar turns green, reward pill glows */
.quest-card--locked             /* grey icon, grey bar, muted opacity */

.quest-card__icon               /* 40px circle, flex center, border-radius: 50% */
.quest-card__icon--bolt         /* gold background */
.quest-card__icon--target       /* green background */
.quest-card__icon--shield       /* teal background */
.quest-card__icon--clock        /* purple background */

.quest-card__bar-wrap           /* position: relative, height: 20px, border-radius: 999px, bg: grey track */
.quest-card__bar                /* height: 100%, width: var(--progress), border-radius: 999px, bg: gold → green */
.quest-card__bar-label          /* absolute center, font-size: 0.7rem, font-weight: 600 */

.quest-card__reward             /* teal pill, ₵ amount, right side */
.quest-card__reward--claimed    /* green pill, "✓ Claimed" text */
```

---

## 3. Quest Card States

| State | Visual treatment | When |
|---|---|---|
| **Not started** | Grey icon bg, empty grey bar, "0 / N" label, muted reward | Quest assigned but no progress yet |
| **In progress** | Colored icon bg, gold fill bar, exact label, live reward pill | `progress > 0 && progress < target` |
| **Complete — unclaimed** | Colored icon, green bar full, reward pill pulsing | All conditions met, user hasn't tapped |
| **Complete — claimed** | Green checkmark icon, green bar, "✓ Claimed" reward | `claimedAt` is set |
| **Locked** | Grey icon, grey bar (blur 2px), padlock overlay, "Unlocks Monday" label | Future quests not yet available |
| **Expired** | Muted entire card, strikethrough on title | Past week, incomplete |

The **"More quests unlock soon"** locked row from Duolingo maps to the "next quest" preview:

```
[🔒]  Next quest unlocks Monday
      ░░░░░░░░░░░░░░░░░░░░░░░░
```
This row is always rendered below the active quest card, always visible, always locked. It signals: there is always more. Come back.

---

## 4. Multi-Layer Quest Stack — Time Horizons

### What Duolingo does
Duolingo runs 3–4 simultaneous quest layers each with a different time horizon:

| Layer | Reset | Psychological role |
|---|---|---|
| Daily Quests | Every 24h | Habit formation, short urgency |
| Friends Quest | Every ~5 days | Social accountability |
| Monthly Challenge | Every 30 days | Long-game identity |
| Seasonal Event | ~2 weeks | Novelty, FOMO, exclusivity |

Each layer shows an **orange countdown timer** beside its section heading: "⏱ 8 HOURS", "⏱ 3 DAYS". Orange = urgency, consistent with the streak color.

### SugboCents implementation (Phase 1 → Phase 4 progression)

**Phase 1 (Sprint 3):** Two layers

```
TODAY'S MISSION                   ⏱ Resets midnight
────────────────────────────────
[week day map — 7 nodes]
[daily mission state text]

THIS WEEK'S QUEST                 ⏱ 4 days left
────────────────────────────────
[quest card — Disciplined Week]
[locked next-quest preview row]
```

**Phase 4 (when friends are live):** Add Friends Quest layer

```
FRIENDS QUEST                     ⏱ 3 days left
────────────────────────────────
[combined progress bar — you + friend]
[You vs. Friend side-by-side cards]
[NUDGE]  [GIFT]
```

**Section header pattern for quest layers:**
```html
<div class="quest-section-header">
  <span class="quest-section-header__title">THIS WEEK'S QUEST</span>
  <span class="quest-section-header__timer">⏱ 4 days left</span>
</div>
```
```css
.quest-section-header              /* flex, justify-content: space-between, align-items: center */
.quest-section-header__title       /* font-size: 0.7rem, font-weight: 700, letter-spacing: 0.08em, uppercase, muted */
.quest-section-header__timer       /* font-size: 0.75rem, font-weight: 600, color: #F97316 (orange) */
```

---

## 5. Friends Quest — Social Accountability Loop (Phase 4)

### What Duolingo does
The Friends Quest has a **two-color progress bar** showing your contribution (yellow) vs. your friend's (purple). Side-by-side avatar cards show each person's contribution count. NUDGE button sends a notification to a slacking partner. GIFT button sends currency.

### SugboCents implementation

Friends Quest card (Phase 4 only — do not build until Phase 4 Firestore is live):

```
┌──────────────────────────────────────────┐
│  FRIENDS QUEST              ⏱ 3 days left│
│                                          │
│  Both stay under budget this week        │  ← quest title
│                                          │
│  [██████████▓▓▓░░░░░░░]  4 / 7 days    │  ← two-color bar
│  You: 3 days (green)  Friend: 1 day (teal)│
│                                          │
│  ┌─────────────┐  ┌─────────────┐       │
│  │  [your      │  │  [friend    │       │
│  │   avatar]   │  │   avatar]   │       │
│  │  You        │  │  Maria C.   │       │
│  │  3 days ✓  │  │  1 day      │       │
│  │  [NUDGE 👋] │  │  [GIFT 🎁] │       │
│  └─────────────┘  └─────────────┘       │
└──────────────────────────────────────────┘
```

**Two-color bar rules:**
- Your contribution: brand green `#2b8259` fill (left portion)
- Friend's contribution: teal `#0D9488` fill (right portion, abutting yours)
- Empty track: grey
- The bar fills left-to-right with your portion first, then friend's — so if you're behind, the smaller green bar vs. larger teal bar is immediately visible

**NUDGE button:**
- Sends a push notification to the friend via Firestore Cloud Messaging
- After tap: grays to "Nudged ✓" — cannot spam (24h cooldown per friend per day)

**GIFT button:**
- Opens Sentimos gift sheet: "Send ₵25 to Maria?"
- Deducts from your balance, adds to theirs via Firestore transaction

---

## 6. Monthly Challenge / Seasonal Event Banner

### What Duolingo does
The monthly challenge card has a unique mascot skin, a narrative name ("Duo's Frozen Winter"), a meta-goal counter (`20 / 40` quests completed this month), and the meta-goal is fed by daily quests — completing a daily quest ticks the monthly counter.

### SugboCents implementation

**Monthly budget challenge** — appears at the top of the quest section, above weekly and daily layers:

```
┌──────────────────────────────────────┐
│  [teal/seasonal gradient]            │
│  [Tigom seasonal variant]            │
│                                      │
│  APRIL            ← month chip (pill)│
│  Tigom's Frugal April                │  ← narrative name
│  ⏱ 18 days                          │
│                                      │
│  [████████░░░░░░  12 / 30 days]     │  ← "Log expenses 30 days this month"
│                                      │
└──────────────────────────────────────┘
```

**Meta-goal:** "Log expenses on 30 days this month" — every daily mission completion ticks this counter.

**Monthly challenge names (rotating, narrative):**
- January: "Tigom's Fresh Start"
- February: "Tigom's Frugal Love"
- March: "Tigom's Spring Save"
- April: "Tigom's Frugal April"
- May: "Tigom's Midyear Push"
- June: "Tigom's Halftime Challenge"
- July: "Tigom's Budget Warrior"
- August: "Back-to-School Budget"
- September: "Tigom's September Sprint"
- October: "Tigom's Harvest Save"
- November: "Tigom's Payday Discipline"
- December: "Tigom's Holiday Guard"

**Monthly challenge is NOT in Phase 1 scope.** Add it as a Phase 2 enhancement once weekly quests are stable. The data model in `storage.js` should reserve `monthlyChallenge` in the user object from Phase 1 for future use.

---

## 7. Mid-Session Quest Progress Toast

### What Duolingo does
The "Daily Quests update!" popup appears mid-session over a dark overlay showing all three quests with updated progress bars. It's **forced acknowledgment** — the app makes you see your progress even if you weren't looking. A single CONTINUE button at the bottom. No dismiss.

### SugboCents implementation

After logging an expense that ticks a quest condition (e.g., progress goes from 2→3 on a 5-step quest):

**Minor tick (< 50% progress reached):** A slide-up toast bar, 3 seconds, no action required:

```
┌─────────────────────────────────────────┐
│  ⚡  Disciplined Week  —  3 / 5 days    │
└─────────────────────────────────────────┘
```

**Major milestone (50% reached OR last step before completion):** Full slide-up sheet with the quest card:

```
┌─────────────────────────────────────────┐
│  Quest update!                          │
│                                         │
│  [quest card — full anatomy]            │
│  [gold bar at 80%, "4 / 5 days"]       │
│                                         │
│  "One more day to complete!"            │
│                                         │
│  [  CONTINUE  ]                         │
└─────────────────────────────────────────┘
```

**Quest completion (all conditions met):** Full celebration modal via `window.GamificationUI.queueModal()`:

```js
GamificationUI.queueModal({
  iconClass: 'bi-map-fill',
  superText: 'Quest Complete!',
  title: quest.title,
  desc: `+${quest.xpReward} XP earned · ₵${quest.sentimosReward} added`,
  cta: 'Awesome!',
  showXpBar: true,
  xpPct: newXpPct,
  xpHint: `${xpToNext} XP to next level`
});
```

**Implementation in `dashboard.js`:**
Call `checkQuestToast(prevProgress, newProgress, quest)` after every `updateQuestProgress()` call. This function determines whether to show the toast, the sheet, or the full modal.

---

## 8. Quest Detail Bottom Sheet

Tapping the quest row on the dashboard or the quest card opens a bottom sheet (not a new page):

```
┌─────────────────────────────────────────┐
│  Disciplined Week               [×]     │
│  Resets Sunday midnight                 │
│                                         │
│  ─────────────────────────────          │
│  ● Log expenses 5 days          3 / 5  │
│    [████████████░░░░]                   │
│                                         │
│  ● Stay under budget 3 days     1 / 3  │
│    [████░░░░░░░░░░░░]                   │
│  ─────────────────────────────          │
│                                         │
│  Reward                                 │
│  +150 XP   ₵ 50                        │
│                                         │
│  ⏱ 4 days left                         │
│                                         │
│  [      Claim Reward      ]             │  ← shown only when all conditions met
└─────────────────────────────────────────┘
```

**Each condition row:**
- Bullet icon (●) colored by condition type (same icon system as quest card)
- Condition description text
- `N / Target` right-aligned
- Progress bar (same anatomy as quest card)

**Claim Reward button:**
- Hidden when quest is incomplete
- Full-width, brand green, appears with a brief slide-in animation when the last condition is met
- On tap: calls `StorageAPI.claimQuestReward()` → fires celebration modal → button changes to "✓ Claimed"

**Sheet CSS reuses existing `.modal-sheet` pattern from dashboard.**

---

## 9. Implementation Checklist

- [ ] Quest card anatomy: icon + title + N/Target bar (label inside bar) + ₵ reward pill
- [ ] Icon color-coded by quest type (bolt=gold, target=green, shield=teal, clock=purple)
- [ ] Progress bar fill is gold (`#EAB308`) in-progress, brand green when complete
- [ ] `N / Target` label is centered inside the bar, white text on fill
- [ ] "Next quest unlocks Monday" locked row always renders below active quest
- [ ] Section headers show orange (`#F97316`) countdown timer on the right
- [ ] Quest hero banner with Tigom mascot on quest detail sheet
- [ ] Mid-session toast fires when quest progress ticks (minor = slide bar, major = full sheet)
- [ ] Quest completion fires `GamificationUI.queueModal()` with XP bar
- [ ] Quest detail bottom sheet opens on quest row tap with per-condition progress bars
- [ ] Claim Reward button appears only when all conditions are met
- [ ] Friends Quest card (Phase 4): two-color bar + NUDGE + GIFT (build after Firestore live)
- [ ] Monthly challenge banner (Phase 2 enhancement): above weekly quest section
- [ ] Monthly narrative name rotates by calendar month

---

## 10. Cross-Page Integration

Quests are not a dashboard-only feature. Here is every place quest data surfaces across the app:

| Quest element | Location | Connected to |
|---|---|---|
| Active quest row | **Dashboard** (always) | Quest detail sheet on tap |
| Quest ₵ reward pill | **Dashboard** quest row | When claimed: `addSentimos()` → resource bar ₵ chip updates on all pages |
| Quest XP reward | **Dashboard** quest complete modal | `addXpInternal()` → resource bar ⚡ chip updates, XP widget on dashboard updates |
| Quest complete modal | **Any page** (queued via `GamificationUI`) | Fires wherever the user is when the last condition is met |
| Mid-session progress toast | **Any page** | Fires after each expense log that ticks quest progress |
| Quest completion event | **Activity page** feed | "You completed this week's quest!" event in activity log |
| Quests completed count | **Profile page** stats grid | `user.questsCompleted` displayed as a stat tile |
| Quests completed count | **Leaderboard** sort | Tertiary ranking factor (`questsCompleted` lifetime) |
| Quest badge (`quest-1`, `quest-5`) | **Stats page** badge grid | Unlocked by completing quests — links quest system to badge system |
| Next quest countdown | **Dashboard** quest row | Orange timer; same logic as streak chip urgency |

**The ₵ ↔ Quest connection is the most important:**
When a quest is claimed, `addSentimos(amount, 'quest')` is called. This immediately:
1. Updates the ₵ chip in the resource bar (all pages)
2. Adds an entry to the Sentimos Balance Sheet log ("Quest complete")
3. Fires the teal `+₵ N` float popup anchored to the resource bar chip

The user must feel the coins flowing from the quest into their wallet — this visual connection is what makes quests feel worth doing.
