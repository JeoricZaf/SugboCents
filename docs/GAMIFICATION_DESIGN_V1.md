# SugboCents — Gamification Design Document v1
**Scope:** Sprint 2 (Streaks + XP/Levels + Achievements)
**Status:** Approved for implementation — do not change scope without updating this doc

---

## 1. Design Philosophy

Gamification in financial apps has a poor track record when it relies on superficial rewards that do not map to real user outcomes. The goal here is **behavioral reinforcement**, not entertainment for its own sake.

We follow the principle articulated by gamification researchers (Yu-Kai Chou, *Actionable Gamification*, 2015): motivators should be **intrinsic** (mastery, autonomy, purpose) rather than purely **extrinsic** (badges for badge's sake). Every mechanic added must answer: *does this help the user build a real budgeting habit?*

Three mechanics that pass this test for a budgeting app:

| Mechanic | Behavioral target | Why it works |
|---|---|---|
| **Streaks** | Daily logging habit | Operant conditioning — the act of not wanting to break a chain (Seinfeld method) creates stronger commitment than reward-chasing |
| **XP + Levels** | Sustained engagement over weeks | Variable ratio schedule — level thresholds give a medium-term goal that is visible but not immediate |
| **Achievement badges** | Milestone recognition | Moments of genuine accomplishment should feel earned; badges provide a narrative of progress |

### What we deliberately avoid

- **Artificial urgency** (countdown timers forcing you to log NOW)
- **FoMO mechanics** ("Your streak ends in 2 hours!")
- **Skinner box loops** — notifications every few hours, daily rewards that vanish if uncollected
- **Hollow badges** — achievements that require zero skill or behavior change (e.g., "You opened the app")

Apps like **Mint** and early **Clarity Money** suffered from notification-driven engagement that drove users to disable alerts entirely. We do not want that.

---

## 2. Reference Apps

### 2.1 Duolingo
**What it does well:**
- Streak counter is always visible in the top bar — not buried in settings
- XP is awarded for the act of doing the lesson, not for completing the lesson perfectly — reduces perfectionism paralysis
- Level-up animation is a full-screen moment: scale-in card, confetti burst, then a clear "Continue" CTA. The screen holds focus; you cannot dismiss it by accident
- Badges use clean icon + label pairs — no dense text explanations on the badge itself. The description appears on a separate detail sheet

**What to borrow:** Streak visibility, XP for participation (not perfection), full-screen level-up celebration, icon + label badge cards

**What not to borrow:** The league system (requires social graph), streak freezes (Sprint 3 scope), lingots/gems economy (too much abstraction for a budgeting tool)

### 2.2 Habitica
**What it does well:**
- Turns habits into RPG mechanics — tasks have difficulty ratings, completion gives gold + XP
- Badges (called "achievements") are grouped into a grid — unlocked ones show full color, locked ones are greyed out at 40% opacity. This is the correct locked/unlocked visual treatment

**What to borrow:** Badge grid with locked-state visual treatment (greyed out, lock icon overlay)

### 2.3 Strava
**What it does well:**
- Streak chip in the profile header is a simple number with a flame icon — no explanation needed. The visual language is universally understood because Snapchat, Duolingo, and Strava all use the same unspoken convention
- Trophies page is organized by category (Running, Cycling) — maps to our grouping by Behavior Category (Logging, Streaks, Savings)

**What to borrow:** Category groupings on the badge page, no explanation needed for streak chip because the icon carries the meaning

### 2.4 Monzo / Revolut (UK fintech)
**What they do well:**
- Progress indicators inside cards are thin, subtle horizontal bars — not gamey. They show how far into a goal you are without making the UI feel like a mobile game
- Revolut's "Savings Pot" feature has a small animated checkmark when a round-up saving occurs — feedback is immediate but not intrusive

**What to borrow:** Subtle XP bar styling (thin, not thick health-bar style), immediate but non-modal XP feedback (floating +5 XP popup that fades in 1.2s)

### 2.5 Nike Run Club (NRC)
**What it does well:**
- Achievement medals use a consistent icon language: shield shape for milestone achievements, circle for personal records, hexagon for challenge completions
- Locked achievements show the silhouette of the badge in a single grey color — the shape reveals the category

**What to borrow:** Consistent badge shape language — we use Bootstrap Icons displayed inside a consistent visual container (circle for earned, grey circle for locked), not arbitrary individual emoji

---

## 3. Icon System

The project already loads **Bootstrap Icons** from CDN on all pages. We use Bootstrap Icons for all gamification symbols. No emojis in the badge grid or widgets.

> **Rule:** Emoji are acceptable only in quick-add buttons (where they are category labels, not symbols) and in Tigom mood labels (where the mascot personality context makes them appropriate). They must never appear as the primary visual on a badge, level chip, or streak counter.

### Streak Icon
| Symbol | Bootstrap Icon class | Usage |
|---|---|---|
| Flame / fire | `bi-fire` | Streak counter chip, sidebar streak indicator |

`bi-fire` is used by Duolingo, Snapchat, and Strava for exactly this purpose. It is the universally recognized "active streak" symbol.

### XP / Level Icons
| Symbol | Bootstrap Icon class | Usage |
|---|---|---|
| Lightning bolt | `bi-lightning-charge-fill` | XP label prefix, XP popup |
| Rocket | `bi-rocket-takeoff-fill` | Level-up modal header |
| Arrow up circle | `bi-arrow-up-circle-fill` | Inline level indicator |

### Achievement Badge Icons (by category)

All badges use the icon font class approach: `<i class="bi bi-{name}" aria-hidden="true"></i>` with a visible label. The icon is decorative; the label carries the accessible name.

#### Logging Badges
| Badge ID | Name | Bootstrap Icon | Trigger |
|---|---|---|---|
| `first-step` | First Step | `bi-pencil-square` | 1st expense logged |
| `getting-started` | Getting Started | `bi-check2-circle` | 5 expenses logged |
| `budget-regular` | Budget Regular | `bi-journal-check` | 25 expenses logged |

Rationale: pencil-square maps to "starting to write it down" — the metaphor of journaling your budget. `check2-circle` signals a repeated completion (Duolingo uses a similar double-check for streaks). `journal-check` is a natural progression — the journal is filling up.

#### Streak Badges
| Badge ID | Name | Bootstrap Icon | Trigger |
|---|---|---|---|
| `on-fire` | On Fire | `bi-fire` | 3-day streak |
| `consistent` | Consistent | `bi-calendar-check-fill` | 7-day streak |
| `streak-master` | Streak Master | `bi-trophy-fill` | 30-day streak |

Rationale: `bi-fire` is the universally known streak symbol. `bi-calendar-check-fill` shows the calendar — it is literally a week of checked days. `bi-trophy-fill` is the endpoint of long-term streak achievement.

#### Savings Badges (Phase 5 — gated until savings feature is built)
| Badge ID | Name | Bootstrap Icon | Trigger |
|---|---|---|---|
| `saver-seed` | Saver Seed | `bi-piggy-bank` | First savings log |
| `triple-digits` | Triple Digits | `bi-cash-stack` | ₱100 saved total |

Rationale: `bi-piggy-bank` is universally understood for savings. `bi-cash-stack` signals accumulated money — reaching a three-digit milestone.

---

## 4. XP and Level System

### 4.1 XP Rules

| Action | XP awarded | Notes |
|---|---|---|
| Log any expense | +5 XP | Awarded per expense, not per session |
| Log a saving (Phase 5) | +8 XP | Savings actions are harder — require intent |
| Claim an achievement badge | +15 XP | One-time per badge; XP not awarded until user claims |

XP is cumulative and permanent — there is no XP decay. This follows the Duolingo model (total XP always grows) rather than the Habitica model (XP resets on character death), which would be demotivating in a financial context.

### 4.2 Level Thresholds

Thresholds are designed so that:
- Level 2 is reachable within 1–2 days of use (gives quick early win)
- Level 4 requires approximately 2–3 consistent weeks
- Level 7 (maximum) requires serious long-term use

| Level | Name | XP required | Rough time to reach |
|---|---|---|---|
| 1 | Rookie Saver | 0 | Day 0 (everyone starts here) |
| 2 | Budget Aware | 50 | ~2 days (10 expenses) |
| 3 | Money Smart | 150 | ~1 week |
| 4 | Week Crusher | 350 | ~2–3 weeks |
| 5 | Streak Hunter | 700 | ~1 month |
| 6 | Finance Pro | 1,200 | ~2 months |
| 7 | Budget Legend | 2,000 | Long-term |

### 4.3 `getXpInfo()` Return Shape

```javascript
{
  xp: 125,           // total XP
  level: 3,          // current level number
  levelName: "Money Smart",
  xpForLevel: 150,   // XP threshold to reach current level
  xpForNext: 350,    // XP threshold to reach next level
  progressPct: 46    // ((125 - 150) / (350 - 150)) * 100 — normalised to 0–100
}
// Edge case: at max level (7), progressPct = 100, xpForNext = 2000
```

---

## 5. Streak System

### 5.1 Rules

- A "streak day" is a calendar day (midnight to midnight, local time) in which **at least one expense was logged**.
- The streak counter equals the number of **consecutive calendar days** ending today (or ending yesterday if the user has not yet logged today).
- The streak is not broken if the user logs multiple expenses in one day — all count as a single "streak day".
- A streak of 0 means the user has not logged an expense today or yesterday.

### 5.2 `getCurrentStreak()` Algorithm

1. Get all expenses, sorted by timestamp descending.
2. Build a `Set<string>` of unique `YYYY-MM-DD` date strings from expense timestamps (local timezone).
3. Walk backwards from today:
   - If today's date is in the set, start counter at 1 and check yesterday, then day before, etc.
   - If today's date is NOT in the set, check yesterday. If yesterday is in the set, start counter at 1 (the user still has today to log). Continue walking backwards.
   - If neither today nor yesterday is in the set, return 0.
4. Return the final counter.

> **Why check yesterday too?** A user who logged yesterday and has not yet opened the app today should not see a streak of 0. This matches Duolingo's behavior — the streak is preserved until the *current* day ends without logging.

### 5.3 Visual Treatment

The streak chip uses the `bi-fire` icon followed by the count and the word "streak":

```
[bi-fire icon]  7-day streak
```

- At 0: chip is shown with `bi-fire` in muted grey (`#94a3b8`), text "No streak yet"
- At 1–2: chip uses amber gradient (warming up)
- At 3+: chip uses orange-red gradient (`#f97316` → `#ea580c`)
- At 7+: the chip gets a `streak-chip--week` modifier that adds a subtle white outer glow

This graduated treatment is borrowed from Snapchat and Duolingo, where the streak counter visually "heats up" as it grows. We do not add new colors beyond 7+ — visual complexity should not scale indefinitely.

---

## 6. Achievement Badges

### 6.1 Claim Model vs. Auto-Award

Badges are **not auto-awarded**. When a badge is newly unlockable, the app notifies the user with the celebration modal — but the badge is not officially "earned" until the user taps **Claim**. Claiming awards the +15 XP.

**Why:** This is borrowed from Duolingo's "chest" mechanic and many mobile RPGs. The act of claiming creates a small but meaningful choice moment. The user must actively acknowledge the achievement. It also prevents XP inflation from background passive triggers.

### 6.2 Badge States

| State | Visual treatment |
|---|---|
| Locked | Card background `#f1f5f9`. Icon and label rendered at 40% opacity. Lock overlay icon (`bi-lock-fill`) at top-right corner of card. |
| Unlockable (not yet claimed) | Card has brand-green border (`2px solid var(--brand-700)`). Pulsing glow animation. "Claim" button visible. |
| Claimed | Full color. `bi-patch-check-fill` icon at top-right in brand green. No glow. |

This is the exact same three-state system used by Habitica and Nike Run Club.

### 6.3 `checkNewAchievements()` and `claimAchievement(id)` Contract

`checkNewAchievements()` is **read-only** — it evaluates badge conditions against current data and returns an array of badge objects whose conditions are met but whose IDs are not yet in `user.unlockedAchievements`. It does NOT write to storage. The return value drives the celebration modal.

`claimAchievement(id)`:
1. Push `id` into `user.unlockedAchievements`
2. Call `addXp(15)`
3. Save user locally
4. If in Firebase mode, merge `{ unlockedAchievements, xp }` to Firestore

---

## 7. UX Patterns

### 7.1 Celebration Modal

Inspired by Duolingo's lesson-complete screen.

**Trigger:** After any `addExpense()` success call, run `checkNewAchievements()`. If any new badges are unlockable, queue them — show one modal per newly unlockable badge (not all at once). If level-up occurs in the same action, show level-up first, then badge modal(s).

**Modal anatomy:**

```
┌──────────────────────────────────────────┐
│                                          │
│         [bi-rocket-takeoff-fill]         │  ← Level-up variant
│         Level Up!                        │
│         You reached Level 3              │
│         Money Smart                      │
│                                          │
│   ┌─────────────────────────────────┐    │
│   │  [XP bar showing new level]     │    │
│   └─────────────────────────────────┘    │
│                                          │
│         [  Continue  ]                   │  ← single CTA
└──────────────────────────────────────────┘
```

For a **badge modal**:

```
┌──────────────────────────────────────────┐
│                                          │
│         [bi-award-fill]                  │  ← large icon, brand-green
│         Achievement Unlocked             │
│         Budget Regular                   │
│         You've logged 25 expenses.       │
│                                          │
│         [  Claim (+15 XP)  ]             │
└──────────────────────────────────────────┘
```

**Animation spec (CSS):**
- Backdrop: `opacity 0 → 1` over `200ms`
- Card: `scale(0.85) opacity(0) → scale(1) opacity(1)` over `280ms ease-out`
- Icon: `scale(0.6) → scale(1.1) → scale(1)` over `400ms` with `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring — same curve Duolingo uses for icon pop)

**Focus behavior:** On open, focus is moved to the CTA button. On close, focus returns to the element that triggered the action (the "Log Expense" button or quick-add card).

**Do NOT show more than one new modal per page load if ≥3 badges trigger at once** — batch into a summary: "You unlocked 3 achievements". Individual badges can be reviewed on the Tigom page. This prevents the user feeling harassed.

### 7.2 XP Floating Popup

When an expense is logged, a small chip floats up from the button and fades out over 1.2s:

```
  +5 XP [bi-lightning-charge-fill]
```

This is inspired by Habitica and RPG combat floaters. It provides immediate tactile feedback without requiring the user to look away from what they were doing.

**CSS keyframe:**
```css
@keyframes xp-float {
  0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
  20%  { opacity: 1; transform: translateY(-8px) scale(1); }
  80%  { opacity: 1; transform: translateY(-24px) scale(1); }
  100% { opacity: 0; transform: translateY(-36px) scale(0.95); }
}
```

The popup element is `position: absolute` and appended next to the anchor button, then removed from the DOM after the animation ends.

### 7.3 Dashboard XP Widget

Placed between the budget card and the quick-add section. It must not outweigh the budget card visually — this is a secondary surface.

**HTML structure:**
```html
<section class="xp-widget mt-5" aria-label="Progress">
  <div class="xp-widget-inner">
    <div class="xp-widget-top">
      <span id="xpLevel" class="level-badge">
        <i class="bi bi-arrow-up-circle-fill" aria-hidden="true"></i>
        Lv. 1 — Rookie Saver
      </span>
      <span id="xpStreakChip" class="streak-chip">
        <i class="bi bi-fire" aria-hidden="true"></i>
        0-day streak
      </span>
    </div>
    <div class="xp-bar-track" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="XP progress">
      <div id="xpBar" class="xp-bar-fill" style="width: 0%"></div>
    </div>
    <div class="xp-widget-bottom">
      <span id="xpValue" class="xp-value-label">0 XP</span>
      <a href="tigom.html" class="view-all-link">View details <i class="bi bi-arrow-right-short" aria-hidden="true"></i></a>
    </div>
  </div>
</section>
```

**Key accessibility notes:**
- `role="progressbar"` with `aria-valuenow` updated by JS on render
- Streak chip text includes the word "streak" — screen readers do not know what `bi-fire` means without it

### 7.4 Badge Grid on Tigom Page (Phase 5)

Badges are displayed in a `2×N` responsive grid. Each card:
- 80×80px minimum tap target
- Icon: 28px, centered
- Label: 11px, `font-weight: 700`, truncated to 1 line
- Locked state: 40% opacity, `bi-lock-fill` positioned `top: 6px; right: 6px; font-size: 10px; color: #94a3b8`
- Unlockable state: animated `box-shadow: 0 0 0 0 var(--brand-700)` pulse via `@keyframes badge-pulse`

---

## 8. CSS Component Specs

### `.streak-chip`
```css
.streak-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
  color: #fff;
  background: linear-gradient(135deg, #f97316, #ea580c);
}
.streak-chip--muted {
  background: #e2e8f0;
  color: #64748b;
}
```

### `.level-badge`
```css
.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-800);
  background: #e7f5ed;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
}
```

### `.xp-bar-track` / `.xp-bar-fill`
```css
.xp-bar-track {
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin: 0.4rem 0;
}
.xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-700), var(--brand-800));
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

The spring easing on the XP bar fill is intentional — the bar "overshoots" slightly and settles, giving a physical feel borrowed from iOS spring animations and Duolingo's XP accumulation bar.

### `.achievement-modal-backdrop`
```css
.achievement-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  opacity: 0;
  transition: opacity 200ms ease;
  pointer-events: none;
}
.achievement-modal-backdrop.is-open {
  opacity: 1;
  pointer-events: auto;
}
```

### `.achievement-modal`
```css
.achievement-modal {
  background: #fff;
  border-radius: 1.5rem;
  padding: 2rem 1.75rem 1.5rem;
  max-width: 340px;
  width: calc(100% - 2rem);
  text-align: center;
  transform: scale(0.85);
  opacity: 0;
  transition: transform 280ms ease-out, opacity 280ms ease-out;
}
.achievement-modal-backdrop.is-open .achievement-modal {
  transform: scale(1);
  opacity: 1;
}
```

### `.achievement-badge-icon`
```css
.achievement-badge-icon {
  font-size: 3rem;
  color: var(--brand-700);
  display: block;
  margin: 0 auto 0.75rem;
  animation: badge-icon-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes badge-icon-pop {
  0%  { transform: scale(0.5); opacity: 0.5; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
```

### `.xp-popup`
```css
.xp-popup {
  position: absolute;
  pointer-events: none;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--brand-700);
  white-space: nowrap;
  animation: xp-float 1.2s ease-out forwards;
  z-index: 100;
}
@keyframes xp-float {
  0%   { opacity: 0;   transform: translateY(0px)  scale(0.8); }
  20%  { opacity: 1;   transform: translateY(-8px) scale(1);   }
  80%  { opacity: 1;   transform: translateY(-24px) scale(1);  }
  100% { opacity: 0;   transform: translateY(-36px) scale(0.95); }
}
```

---

## 9. Implementation Phases

### Phase A — `js/storage.js` additions
Extend default user object:
```javascript
xp: 0,
level: 1,
unlockedAchievements: []   // array of badge ID strings that have been claimed
```

New methods: `getCurrentStreak()`, `addXp(amount)`, `getXpInfo()`, `getAchievements()`, `checkNewAchievements()`, `claimAchievement(id)`.

All six are exposed on `window.StorageAPI`.

### Phase B — `js/gamification.js` (new file)
IIFE. Exposes `window.GamificationUI`:
- `checkAndShow()` — calls `StorageAPI.checkNewAchievements()`, renders modal queue
- `showXpPopup(amount, anchorEl)` — creates `.xp-popup` element, positions it above `anchorEl`, starts animation, removes from DOM on `animationend`
- `showLevelUpModal(levelInfo)` — specific modal variant for level-ups

No page-guard — this file is loaded on all sidebar pages.

### Phase C — `dashboard.html` widget
Add XP widget section (see Section 7.3 HTML above) between the budget card `</section>` and the quick-add `<section class="mt-7">`.

Add `<script src="js/gamification.js"></script>` after `app.js`, before `dashboard.js`.

### Phase D — `js/dashboard.js` additions
- `renderXpWidget()` function: calls `getXpInfo()` + `getCurrentStreak()`, updates DOM, sets `aria-valuenow`
- After every `addExpense()` success:
  1. `StorageAPI.addXp(5)`
  2. `GamificationUI.showXpPopup(5, logExpenseBtn)`
  3. `GamificationUI.checkAndShow()` (async-safe — shows modal only if new badges exist)
  4. `renderXpWidget()`
- Call `renderXpWidget()` from the dashboard init block (on page load)

### Phase E — `css/style.css` additions
Add all component styles from Section 8 above. Group under a `/* === Gamification === */` comment block.

### Phase F — All 5 sidebar pages (`dashboard.html`, `activity.html`, `stats.html`, `tigom.html`, `settings.html`)
Add `<script src="js/gamification.js"></script>` after `app.js` and before the page-specific script.

---

## 10. What Is NOT Built in Sprint 2

These are explicitly deferred to Sprint 3:

| Feature | Reason for deferral |
|---|---|
| Streak freezes | Requires an economy (spending streaks freezes) — adds complexity without enough UX value at this stage |
| Daily check-in bonus | Risks becoming a FoMO mechanic; needs careful design before build |
| XP leaderboard / leagues | Requires social graph and multiplayer sessions — out of scope |
| Unlockable app themes | Requires UI theming system — Sprint 3 or later |
| Quest system ("Log 5 food expenses this week") | Time-boxed quests need a reset loop and notification system |
| Push notifications for streak at-risk | Sprint 3 — requires push API and careful consent design |

---

## 11. Firestore Sync Notes

When Firebase mode is active, the following user fields are written on every XP/achievement mutation:

```javascript
// addXp(amount) — merge, not set
db.collection("users").doc(userId).set({ xp: newXp }, { merge: true })

// claimAchievement(id) — merge both fields
db.collection("users").doc(userId).set({
  xp: newXp,
  unlockedAchievements: newArray
}, { merge: true })
```

`getCurrentStreak()` is compute-only — it reads from the local expense list and never writes.

`getXpInfo()` is compute-only — it derives level from XP using the threshold table.

---

## 12. Acceptance Criteria (Definition of Done)

- [ ] User logs an expense → +5 XP popup appears and fades within 1.2s
- [ ] XP widget reflects updated XP and progress bar within the same render cycle
- [ ] At level threshold: level-up modal appears, shows new level name, presents single "Continue" CTA
- [ ] First expense logged → "First Step" badge becomes unlockable → celebration modal fires on next `checkAndShow()`
- [ ] Claiming a badge → badge moves to claimed state in grid, +15 XP added, XP widget updates
- [ ] Locked badges visible in grid at 40% opacity with lock icon
- [ ] `getCurrentStreak()` returns correct value for a user who logged yesterday but not today (streak > 0)
- [ ] `getCurrentStreak()` returns 0 for a user who last logged 2+ days ago
- [ ] All new gamification modals have accessible focus management (focus moves to CTA on open, returns to trigger on close)
- [ ] `aria-valuenow` on XP progress bar is updated correctly by `renderXpWidget()`
- [ ] No gamification JavaScript runs on `landing.html`, `login.html`, or `register.html`
