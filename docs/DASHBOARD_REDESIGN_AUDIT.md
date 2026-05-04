# SugboCents Dashboard — UX/Gamification Audit & Redesign Plan

> **Status:** Draft — May 4, 2026
> **Scope:** dashboard.html + gamification layer (XP, streak, badges, mascot)
> **Author:** AI UX Audit (GitHub Copilot)

---

## Executive Summary

The current SugboCents dashboard is architecturally sound — the pieces are all present — but they are in the wrong order, at the wrong size, and with the wrong emotional weight. The most psychologically powerful element (the level name / identity anchor) is rendered as 12px eyebrow text. The primary action (Quick Add) is fifth in the scroll order. The streak chip is small, cold, and dismissible. There is no entry point for logging a one-time expense outside the shortcut grid. The dashboard has no inline statistics — it only links out to a separate chart page. And most critically: the dashboard does not look or feel gamified. It looks like a professional finance tool. The result is a screen that reports data but does not create desire, identity, or compulsion to return. This document redesigns it as a game HUD layered over a budget app — every change serves that goal.

---

## Part 1 — Audit

### 1. Identity Hero (XP / Level Name)
**Severity: HIGH**

The level name (`xp-level-name`) is rendered as small eyebrow text *above* "Welcome back, [Name]!" — the greeting h1 outranks it visually. This is backwards. "Rookie Saver" is not a label; per **Mechanism 3 (Identity Anchoring / Social Comparison Theory)**, it is the user's self-description within the app. If the user does not internalize "I am a Budget Keeper," they will never feel the loss of that identity when they stop logging. Currently the level name is forgettable — it reads like metadata.

The XP bar lives *below* the h1 and the date line, making it the least prominent element in the hero. But the XP bar is the Skinnerian lever — the one metric users should obsess over. Burying it is equivalent to hiding Duolingo's streak counter under the settings gear.

The labels "0 XP" and "→ Next level" are useless. "→ Next level" does not tell the user *how far* they are. "45 XP to Budget Keeper" is a craving sentence. "→ Next level" is not.

---

### 2. Streak Chip
**Severity: HIGH**

The streak chip is positioned top-right of the greeting row — a corner position that the eye reads last on mobile. At ~24px tall with light text, it is visually secondary to the h1 beside it. For **Mechanism 2 (The Infinite Game / Loss Aversion)**, the streak needs to feel like a living thing that can be killed. At current size and position it feels like a footnote.

The cold-state copy "🔥 No streak yet" actively discourages a new user: instead of reading as a call to action, it reads as "you have failed to start." The empty state should read as a promise, not a deficit.

There is no visual treatment distinguishing a 1-day streak from a 14-day streak. A green chip and an orange chip look nearly identical to a user glancing at their screen in passing — the compounding nature of the streak is invisible.

---

### 3. Information Hierarchy (Section Order)
**Severity: HIGH**

The current scroll order is:
`Identity/XP → Budget Card → KPI Grid → Mission → Quick Add → Recent → Breakdown → Stats`

The primary *action* (Quick Add) is item 5. The primary *behavioral hook* (Mission) is item 4. By the time the user reaches them they have already read 3 sections of data. On mobile this means the action zone is below the fold.

The rule from the design research: "the most important thing to the user goes at the very top." For a returning user opening the app at lunch to log a meal, the most important thing is: **tap once to log**. The budget card is useful but it is a *review* action, not a *trigger* action.

---

### 4. Budget Card — Framing
**Severity: MEDIUM**

The budget card shows "remaining this week" — a shrinking number. Every visit, the user watches the number fall and the red bar grow. This is *pure loss framing* with no countervailing win signal. The psychology of financial apps that succeed (Monzo, Revolut) is that users feel *in control*, not *surveilled*.

A simple counterfactual: "You've saved ₱240 vs last week" or a contextual health line ("Ahead of pace — ₱45 under avg/day") reframes the same data as a win. Neither requires new storage methods; both can be computed from existing `getBudgetSummary()` data.

The "Edit" chip in the top-right of the card is rendered at the same visual weight as the remaining-amount label, creating a competing tap target. A budget card should feel like a dashboard panel, not a form.

---

### 5. Week at a Glance KPI Grid
**Severity: MEDIUM**

Four chips below the budget card redundantly echo data the budget card already contains (days left, % spent). These four chips have no hierarchy — they read as equal weight, so the eye doesn't know where to land. They add cognitive load without adding action.

The KPI grid is appropriate data for the Stats page. On the Dashboard it acts as noise between the budget card and the Mission card.

---

### 6. Today's Mission Card — Positioning
**Severity: MEDIUM**

The Mission card is the most behaviorally sophisticated element on the page — it is a state-machine that tells the user exactly what to do today. But it sits below two data-review sections (budget card + KPI grid), meaning the user often never sees it on a quick glance open. The Mission card should be higher — ideally immediately after the identity hero, before any data display.

The badge/CTA inside the card is a small `span.today-mission-badge` with text "Start". It is not tappable as a primary action. It should be a button that either opens the Quick Add sheet or navigates to the relevant action.

---

### 7. Empty States
**Severity: MEDIUM**

Three empty states are in play for a new user:
- No budget set: budget card shows "Set your weekly budget in Settings." (passive)
- No expenses: `emptyExpenseState` paragraph: "No expenses yet — use Quick add above to log one." (weak CTA)
- No streak: "🔥 No streak yet" (negative framing)

None of these empty states have a visual hook. Duolingo's empty states are *celebration states* — "You haven't started your streak yet… start it now and I'll celebrate with you." The empty state is the most critical onboarding moment and all three are currently plain text.

---

### 8. No Inline Statistics — Dashboard Links Out Instead of Showing
**Severity: MEDIUM**

The dashboard currently shows a "Where's your money going?" section with a "See chart" link, and a standalone "View full stats" link card. Neither presents statistics — they both send the user away. A dashboard's primary function is to show the user where they stand *without requiring navigation*. The `stats.html` page should be the deep-dive destination; the dashboard should show a compact inline version: top 3 categories by spend with horizontal mini-bars, or a 7-day daily spend sparkline. This is the Revolut home screen pattern — key spending data visible immediately, full chart one tap away.

**Stats navigation decision (mobile):**
- Mobile bottom nav stays at 5 tabs — 6 is too crowded and statistically users do not tap a 6th tab.
- Stats are accessible via the inline stats section on the dashboard → "View full stats" button → `stats.html`.
- Desktop: `stats.html` remains accessible in the sidebar.
- This is intentional: the dashboard provides enough context that most users will not need full stats on a routine visit.

---

### 9. Missing Miscellaneous / One-Time Expense Entry Point
**Severity: HIGH**

The Quick Add grid is designed for recurring expenses at a known price (daily lunch, jeep fare, coffee). There is no entry point for a one-time expense. If a user bought a textbook for ₱340 or a birthday gift for ₱500, they have no way to log it without creating and later deleting a Quick Add shortcut, or skipping the log entirely. Both outcomes are bad — the first is friction, the second is data loss.

A dedicated "Log a custom expense" button must exist in the Action Zone, visually distinct from the shortcut grid. It opens a full expense form: amount, category (dropdown), optional note. This is the escape hatch for everything that does not fit in the shortcut grid. Without it, the expense log is structurally incomplete.

---

### 10. The Dashboard Does Not Look or Feel Gamified
**Severity: HIGH**

This is the root problem underlying most of the other issues. The gamification infrastructure — XP, levels, streaks, badges, celebration modal — is built and functional. But the visual language is that of a professional finance tool: neutral greens, thin 4px progress bars, small chips, body-weight text for the level name. Nothing on the screen communicates "you are playing a game and you are winning."

Duolingo's home screen communicates gamification before you read a single word: large flame badge, thick golden XP bar, league rank visible. Habitica's home screen looks like an RPG stat sheet. SugboCents currently looks like a Monzo clone without Monzo's polish.

The fix is a visual language overhaul of the gamification layer — not new features, but different visual weight, size, color treatment, and icon language for elements that already exist. See the **Gamification Visual Language Directives** section below.

---

### 11. The "Come Back Tomorrow" Hook — Missing Entirely
**Severity: HIGH**

There is currently no element on the dashboard that creates an *open loop* at end of day. No "you're 30 XP away from your next level — log one more expense" prompt. No tomorrow-facing hook. No daily mission preview ("Tomorrow: log 2 expenses to protect your 5-day streak"). A user who closes the app at 10pm has a fully closed information state — everything is settled. The behavioral research is clear: **incompleteness drives return visits**. The XP bar half-filled should feel uncomfortable. The near-level prompt should be visible. Neither of these currently exists.

---

## Part 2 — Redesign Proposal

### TL;DR

Move identity + action to the top. Replace the "stats link" pattern with an inline statistics section. Merge the Mission card and Quick Add into a single action zone with a permanent "Log a custom expense" escape hatch. Overhaul the gamification visual language so the page looks and feels like a game — not a professional finance tool.

---

### Redesigned Layout (top → bottom)

```
┌─────────────────────────────────────┐
│  IDENTITY HERO                      │
│  ┌────────────────────┐  ┌────────┐ │
│  │  Budget Keeper     │  │ [fire] │ │
│  │  Level 3  [badge]  │  │  12    │ │
│  └────────────────────┘  └────────┘ │
│  [=========-----------] 640 / 700   │
│                 60 XP to next level  │
├─────────────────────────────────────┤
│  BUDGET HEALTH CARD (dark green)    │
│  [gear]              ₱1,240 left    │
│  [====------] 45% used · 4 days left│
│         Ahead of pace — on track    │
├─────────────────────────────────────┤
│  ACTION ZONE                        │
│  [ target icon ] Today's Mission    │
│  "Log one expense to protect your   │
│   12-day streak"                    │
│  [        Log Now        ]          │
│  ─── your shortcuts ─────────────  │
│  [Lunch  ₱85] [Jeep   ₱13]         │
│  [Coffee ₱65] [  +  Add  ]         │
│  [  Log a one-time expense...  ]    │
├─────────────────────────────────────┤
│  PROGRESS — NEXT BADGE              │
│  [ON FIRE glow] Log tomorrow        │
│  [dim][dim][dim] locked badges      │
├─────────────────────────────────────┤
│  RECENT EXPENSES (compact, 3–5 rows)│
│  Food · Lunch · 12 min ago · ₱85   │
│  Transport · Jeep · 1 hr ago · ₱13 │
│                 View all activity → │
├─────────────────────────────────────┤
│  THIS WEEK AT A GLANCE              │
│  Food     [========--]  ₱320        │
│  Transport[=====-----]  ₱180        │
│  Other    [===-------]  ₱90         │
│                  View full stats →  │
└─────────────────────────────────────┘
```

---

### Section-by-Section Reasoning

#### 1. Identity Hero (new design)
- **Position:** 1st
- **Contains:** Level name (large, bold, Sora), Level number badge, Streak chip (large, context-aware color), XP bar (full width), "N XP to next level" in-progress label
- **Remove:** The date line — adds no motivational value, wastes vertical space
- **Remove:** "Welcome back, [Name]!" as h1 — greeting copy is hotel-lobby furniture; the level name IS the greeting
- **Why:** Answers "Who am I in this app?" in the first 2 seconds. Level name becomes the user's self-image per Mechanism 3. The XP-to-next line creates an immediate open loop (Mechanism 1)

#### 2. Budget Health Card
- **Position:** 2nd
- **Keep:** Remaining amount as the dominant number
- **Add:** One contextual health line — computed from avg daily spend vs. remaining days: "Ahead of pace" / "On track" / "Watch out"
- **Remove:** The "Edit" chip from the card face — move to a small gear icon `⚙` in the card's top-right corner
- **Reframe:** Replace "X% spent" with "X% used · Y days left" — shifts from pure loss frame to a balanced status read

#### 3. Action Zone: Mission + Quick Add + Custom Log (unified)
- **Position:** 3rd
- **The Mission banner sits above the Quick Add grid with no divider between them** — they are one unified "what should I do right now" section
- **Mission CTA:** Full-width `btn-primary` button, text changes per state ("Log Now", "Protect Streak", "Check Budget", "Log Anyway")
- **Quick Add grid:** Immediately below, `mt-3`, 2-column grid, section label demoted to `text-xs uppercase tracking-wide` — ambient, not structural
- **Custom Log button:** Full-width outlined `btn-outline` at the bottom of the grid — "Log a one-time expense" — opens the full expense form (amount + category + optional note). This is the escape hatch for non-recurring expenses.
- **Add shortcut:** Last cell in grid, dashed border, `add` Material Icon — not a competing inline button above the grid

#### 4. Progress Hook: Next Badge Teaser
- **Position:** 4th
- **New section** — no new data required, reads from existing `getAchievements()`
- **Shows:** Badge one step away from being earned + condition text ("Log tomorrow to earn it")
- **Below:** Mini badge row — earned = full color, next-target = dim + glowing border, locked = 40% opacity + lock icon (Habitica pattern)
- **Max 4 badges visible** — this is a teaser, not the full badge wall

#### 5. Recent Expenses
- **Position:** 5th
- Compact list, max 3–5 rows — already well-built
- Downsize section heading — supporting context, not an action

#### 6. This Week At a Glance (inline stats)
- **Position:** 6th
- **Contains:** Top 3 spending categories with horizontal mini-bars and PHP amounts — rendered inline, no navigation required
- **Below:** Single "View full stats →" link to `stats.html` — replaces both the "See chart" link and the emoji link card at the bottom (both removed)
- **Why:** The dashboard should show statistics, not just link to them. On mobile, this is the only navigation route to `stats.html` — which is intentional. The bottom nav stays at 5 tabs.

---

### The 3 Most Important Changes

1. **Promote level name to visual h1, replace "→ Next level" with "N XP to next level"** — activates identity anchor (Mechanism 3) and craving machine (Mechanism 1) simultaneously; two lines of CSS and one line of JS in `renderXpWidget()`
2. **Add "Log a one-time expense" button to the Action Zone** — closes the structural gap where non-recurring expenses have no entry point
3. **Overhaul the gamification visual language** — make the streak a large badge, the XP bar thick and prominent, the level name the dominant text — the page must look like a game at a glance, not a professional finance tool

---

## Part 3 — Component Deep-Dives

### Deep-Dive 1: Identity Hero

#### Visual Treatment
- **Level name:** `font-family: 'Sora'; font-size: 1.75rem; font-weight: 800; color: var(--brand-900)` — h1 scale
- **Level number badge:** small pill `Level 3` in `--brand-800` fill, white text, right of level name
- **Streak badge:** dedicated badge element, minimum 56×56px, right-aligned in the hero — not a chip. See Gamification Visual Language Directives for the full color-by-length specification and animation rules.
- **XP bar:** full width, 14–16px tall, gradient fill `var(--brand-600)` to `var(--brand-800)`, `--brand-100` track
- **"N XP to next level" label:** right-aligned below bar, `text-sm font-medium text-brand-800`

#### Interaction Behavior
- Tapping streak badge: opens a bottom sheet — "Log an expense today to keep your streak alive." CTA button: "Log now" (scrolls to Quick Add grid)
- Tapping XP bar: opens tooltip/sheet showing full level ladder — where user is and what's coming
- Level-up modal (`showCelebrationModal`) already exists and fires correctly — no change needed

#### Empty State (new user, 0 XP, 0 streak)
- Level name: "Rookie Saver" in brand green — not grey (this is not a deficit state)
- Streak badge: outlined brand-green border, `local_fire_department` icon in slate, copy "Start your streak" — invitation state, never deficit state
- XP bar: 0% fill with subtle glow/dashed effect on empty track — looks *ready* to fill, not empty
- XP label: "Log your first expense to earn XP" — not "0 XP"

#### Psychology
- **Mechanism 3:** Level name as identity — if "Budget Legend" is the first text you read on every open, you begin to own it
- **Mechanism 2:** Streak badge color escalation (amber → orange → crimson) makes a long streak feel physically valuable to protect
- **Mechanism 1:** "N XP to next level" is the incomplete loop — Duolingo's "You're 3 XP away from your daily goal" is the single most effective retention sentence in gamified apps

---

### Deep-Dive 2: Action Zone (Mission + Quick Add Merged)

#### Visual Treatment
- Single section wrapper, no horizontal divider between mission and grid
- Mission banner: `border-l-4 border-brand-700 bg-brand-50 rounded-xl p-4` — left-accent strip, light green tint
- Mission text: icon (24px), title `font-semibold text-brand-900`, description `text-sm text-slate-600`
- CTA button inside mission banner: `btn-primary` full-width, text changes per state ("Log Now", "Protect Streak", "Check Budget", "Log Anyway")
- Quick Add grid: immediately below with `mt-3`, no separate section heading
- Add-shortcut button: last cell in grid, dashed border, `add` Material Icon, secondary styling
- **"Log a one-time expense" button:** Full-width `btn-outline` below the grid, `add_circle_outline` Material Icon left of text. Opens a modal (see below).

#### Log Custom Expense Modal
- **Fields:** Amount (number, required), Category (select from existing categories, required), Note (text, optional, 80 char max)
- **On submit:** Fires `StorageAPI.logExpense()`, fires `sugbocents:dataChanged`, triggers `showXpPopup` at the button position, refreshes the budget card
- **This is not a new Quick Add shortcut** — it logs a single expense and does not persist a button in the grid

#### Interaction Behavior
- Mission CTA tapped: scrolls to + highlights Quick Add grid with 0.3s background flash (`--brand-100` → transparent)
  ```js
  el.scrollIntoView({ behavior: 'smooth' });
  el.classList.add('qa-highlight');
  setTimeout(() => el.classList.remove('qa-highlight'), 400);
  ```
- Quick Add button tapped: fires existing expense log → XP popup fires at button position (`showXpPopup` already handles this)
- Mission state `relaxed` (well under budget, streak protected): CTA changes to "Log anyway" in outline style — reduced urgency

#### Empty State (no quick-add shortcuts created)
- Show two ghost/skeleton cells with dashed borders, `add` icon (Material), placeholder label "Add shortcut"
- One `<p>` line: "Add shortcuts for your everyday expenses"

#### Psychology
- **Proximity:** Mission banner + action grid in one visual zone — cognitive cost to act is near zero
- **Zeigarnik / Completion compulsion:** Quick-add grid with 2–4 buttons and one empty "+" slot reads as an incomplete set — users fill incomplete sets

---

### Deep-Dive 3: Progress Hook — Next Badge Teaser

#### Visual Treatment
- Eyebrow label: "Your progress" — `text-xs text-slate-400 uppercase tracking-wide`
- Target badge: 48×48px, full color, `ring-2 ring-brand-700 ring-offset-2` glow
- Text beside it: badge name `font-semibold text-ink`, condition `text-sm text-slate-500` (e.g., "Log tomorrow to earn On Fire")
- Locked badges: 32×32px each, 40% opacity, `bi-lock-fill` icon overlay at center
- Max 4 badges total — teaser, not the full badge wall

#### Interaction Behavior
- Tapping glowing target badge: no-op for Sprint 2 (sheet in Sprint 3)
- Tapping any locked badge: tooltip "Not yet — keep logging to unlock"
- Claiming an unlocked badge: `showCelebrationModal` fires, badge transitions from glow → solid → claimed (checkmark overlay)

#### Empty State (no badges earned yet)
- Show "First Step" badge (1 expense) glowing as the target
- Copy: "Log your first expense to earn this badge"
- This is the most important empty state — user who has never logged should see exactly one action and exactly one reward

#### Psychology
- **Mechanism 1 (Variable Ratio):** The badge system is predictable in structure but earning one is still a win event. The glowing next-badge creates a continuous near-miss state
- **Mechanism 2 (Loss Aversion):** Locked badges create FOMO — other users (implied) have earned them. Especially potent for Gen Z audiences
- **Habitica pattern:** Color = earned, dim + lock = locked — clearest possible badge-wall visual language

---

## Gamification Visual Language Directives

> **These rules override any previous UI/UX conventions that conflict with them.** The goal is a dashboard that communicates "you are playing a game and you are winning" before the user reads a single word. Every directive below is implementable in vanilla CSS/JS and grounded in the reference apps listed.

---

### Reference Apps and What to Take from Each

**Duolingo** (primary reference — XP bar, streak, level-up, badges)
- The streak is the HERO of the home screen. Large flame icon. Bold number. Color escalates as streak length grows.
- The XP bar is thick (14–16px), gradient fill, fills with an ease-out spring animation. Always at the top of the screen.
- Color is functional: gold = XP/achievement, green = healthy/correct, red = wrong/danger. Not decorative.
- Level-up is a full-screen takeover — never a toast, never a banner.
- Achievement badges are collectible items: full color and detailed when earned, grey silhouette + lock when unearned.
- Empty states show what you are about to earn, not what you have failed to start.

**Habitica** (reference — badge grid, RPG identity)
- The home screen reads as an RPG character sheet. HP bar, XP bar, level number — all large and prominent.
- Badge grids are always grids, never lists. Earned = full color. Unearned = grey at 40% opacity + lock overlay.
- The visual language makes you feel like you have a character that grows, not just a task tracker.

**Strava** (reference — streak badge size, stat weight)
- Stats use large bold numbers — not small 11px KPI chips.
- The streak is shown as a large badge, not an inline label.
- Trophy and PR icons communicate achievement before you read the text.

**Monzo / Revolut** (reference — budget card and category breakdown ONLY)
- Budget remaining is the hero number on the card — large, white, dominant.
- Category colors are consistent — same color always means food, same always means transport.
- Spending insights are narrative: "You spent less on coffee this week."
- Do NOT take the overall calm, cold, professional aesthetic — SugboCents must feel exciting to open.

---

### Concrete Visual Rules

#### 1. The Dashboard Reads as a Game HUD
The primary reading order top-to-bottom must be:
1. **WHO AM I** — level name (largest text on page)
2. **HOW AM I DOING** — streak badge + XP bar
3. **MY RESOURCES** — budget health card
4. **MY ACTIONS** — mission + quick add + custom log

This is the same reading order as a game HUD: character status → resources → actions.

#### 2. XP Bar
- **Height:** 14–16px minimum. The current ~4px bar has no visual presence. It must feel like a fuel gauge.
- **Fill:** CSS gradient `var(--brand-600)` to `var(--brand-800)`. Width change animates ease-out (400–600ms).
- **Track:** `var(--brand-100)` background, 8px border-radius.
- **On XP gain:** Brief shine passes across the filled portion (`@keyframes` sliding highlight, 600ms).
- **Left label:** Current XP — `text-sm font-semibold`. Example: "640 XP".
- **Right label:** "N XP to next level" — `text-sm font-semibold`. Never say "→ Next level" without a number.

#### 3. Level Name
- **Font:** Sora, weight 800, 2rem (32px) on mobile — the largest text element on the page.
- **Position:** First element in the hero section. The level name IS the greeting.
- **Level number pill:** Small pill beside the level name — `var(--brand-800)` fill, white text, `text-xs font-bold`.
- **Never:** render as eyebrow text, caption, or subtitle.

#### 4. Streak Badge
- **Not a chip — a badge.** Minimum touch target 56×56px.
- **Icon:** `local_fire_department` Material Icon (or `bi-fire`), minimum 28px.
- **Number:** `text-2xl font-black` — readable in a thumbnail.
- **Color states by streak length:**
  - 0 days: outlined brand-green border, slate icon, copy "Start your streak" — invitation state
  - 1–6 days: solid amber fill `#f59e0b`, white icon and number
  - 7–13 days: solid orange fill `#ea580c`, white icon and number
  - 14–29 days: solid orange + `ring-2 ring-orange-300` outer glow
  - 30+ days: solid crimson `#dc2626` + slow CSS pulse animation on the ring
- **At milestone streaks (7, 14, 30, 60, 100):** trigger a one-time `showCelebrationModal` on the next app open.

#### 5. Budget Card — State-Based Color
- 0–49% spent: `var(--brand-800)` deep green — healthy
- 50–64% spent: `var(--brand-800)` + `border-2 border-amber-400` ring — mild caution
- 65–89% spent: dark amber background `#92400e` — green is gone
- 90–100% spent: dark red `#7f1d1d` — danger state

Background transitions smoothly over 500ms when thresholds are crossed.

#### 6. Badge Grid
- **Always a grid** — never a list.
- **Earned:** 48×48px, full color, `check_circle` Material Icon overlay top-right (12px, brand-green).
- **Target (next to earn):** Full color, `ring-2 ring-brand-600 ring-offset-2`, slow `@keyframes pulse` on the ring.
- **Locked:** 40% opacity, `filter: grayscale(1)`, `lock` Material Icon centered (12px, slate).
- **Shape:** Consistent — rounded square, 12px border-radius.

#### 7. Micro-Animations — Required, Not Optional
- **Expense logged:** Budget bar extends (300ms ease-out) + brief track flash.
- **XP gained:** XP bar extends (400ms ease-out), `showXpPopup` fires at button.
- **Badge earned:** Scale-in pop — 0% → 110% → 100% (250ms) — then `showCelebrationModal`.
- **Level up:** `showCelebrationModal` full-screen — never downgrade to a toast.
- **Streak increased:** Streak badge bounces (`translateY` -4px → 0, 300ms).
- **Budget threshold crossed:** Card background transitions over 500ms.

#### 8. Color as Signal — Semantic, Not Decorative
| Color | Meaning |
|---|---|
| Brand green (`--brand-700` to `--brand-900`) | Healthy, on track, earned, success, active navigation |
| Amber / gold (`#f59e0b`, `#d97706`) | Caution, approaching limit, XP reward events, streak milestone glow |
| Orange (`#ea580c`) | High streak state, elevated caution |
| Crimson / red (`#dc2626`, `#7f1d1d`) | Over budget, streak at risk, danger state |
| Slate / grey (`#94a3b8`) | Locked, inactive, secondary supporting text |
| White / mist | Neutral surface, card backgrounds, input fields |

#### 9. Icon Language — No Emoji in UI Chrome
| Element | Icon |
|---|---|
| Streak flame | `local_fire_department` (Material) or `bi-fire` |
| XP / lightning | `bolt` (Material) or `bi-lightning-charge-fill` |
| Badge lock | `lock` (Material) or `bi-lock-fill` |
| Mission / target | `gps_fixed` (Material) |
| Add / log expense | `add_circle_outline` (Material) |
| Achievement earned | `check_circle` (Material) or `bi-check-circle-fill` |
| Settings | `settings` (Material) or `bi-gear` |
| Stats | `bar_chart` (Material) or `bi-bar-chart-fill` |

#### 10. Typography Scale
| Element | Size | Weight | Font |
|---|---|---|---|
| Level name | 2rem (32px) | 800 | Sora |
| Budget remaining | 1.75rem (28px) | 700 | Plus Jakarta Sans |
| Streak count (in badge) | 1.5rem (24px) | 900 | Plus Jakarta Sans |
| Section h2 headings | 15px max | 600 | Plus Jakarta Sans |
| Eyebrow / label text | 11–12px | 400 | Plus Jakarta Sans, uppercase, tracking-wide |
| Body / supporting text | 13–14px | 400–500 | Plus Jakarta Sans |

---

## Part 4 — Sprint 3+ Backlog

> **Implementation order:** Complete all dashboard redesign work above — Parts 1–3 and the Gamification Visual Language Directives — before beginning any item in this section. These features are high-retention and well-designed. They are recorded here so they are not forgotten when Sprint 3 begins.

### 1. The "Near-Level" Notification Push
- **What:** Push notification \u2014 "You are 25 XP away from Wise Spender. Log 5 expenses to get there."
- **Why it matters:** The XP bar requires the user to *open the app* to feel the craving. A push carries the craving *to the user*. Duolingo's streak-at-risk notification doubled their daily active users.
- **App example:** Duolingo "Your streak is at risk!", Habitica daily reminder with XP total
- **Sprint gate:** Requires Firebase Cloud Messaging \u2014 Sprint 3 backend

### 2. Weekly Budget Reset Ceremony
- **What:** On Monday (week reset), the first app open shows a full-screen "Season Summary" — last week's total spent, XP earned, best streak day, one badge earned. Then a fresh budget card animates in.
- **Why it matters:** Weekly reset is the "season" mechanic. If silent → user experiences loss. If ceremony → user experiences renewal ("clean slate, let's go again"). This is the Mechanism 2 re-engagement hook.
- **App example:** Strava's weekly summary, Revolut's monthly spending summary card
- **Sprint gate:** No backend needed — detect new week client-side from `getWeekStart()`, flag in localStorage

### 3. Streak Milestone Visuals
- **What:** At day 7, 14, 30, 60, 100 — the streak badge changes appearance (color, animation) and a one-time milestone modal fires.
- **Why it matters:** A 14-day streak badge must look visibly different from a 2-day streak badge. The compounding visual value is what makes losing a streak hurt.
- **App example:** Duolingo's sapphire/ruby/onyx streak shields; Snapchat's streak progression
- **Sprint gate:** Frontend only — CSS milestone classes on the streak badge, milestone check added to `getCurrentStreak()` call

### 4. Social Share Card — "Share Your Level"
- **What:** Tap-to-share button on the identity hero that generates a static image card: "[Name] is a Budget Keeper on SugboCents — 14-day streak, 640 XP"
- **Why it matters:** Mechanism 3 — once the user shares their level publicly, quitting means visibly regressing. The share card *locks in the identity*. Philippine Gen Z shares financial wins on Twitter/TikTok.
- **App example:** Spotify Wrapped, Strava's shareable run summary card
- **Sprint gate:** Can be done client-side with `<canvas>` render — no server needed

### 5. Contextual Spend Commentary ("Sugbo Insights")
- **What:** Rotating single-line insight in or below the budget card: "You spent ₱320 on food this week — ₱80 less than last week" or "Jeepney fare is your #1 category this month"
- **Why it matters:** Revolut's most-loved feature is spending insight cards — they make numbers feel like a narrative rather than a ledger. For a Cebu student, surfacing "you've spent ₱XXX on commute this semester" is immediately relatable.
- **App example:** Revolut spending insights, Monzo's "Big Spender" monthly summary
- **Sprint gate:** No backend for Sprint 2 — all computable from existing `getWeeklyExpenses()` and `getCategories()`. Sprint 3 version uses Sugbo AI.

---

## Implementation Priority

> If sprint bandwidth is limited to **one change**, it is this:

**Make the level name the visual h1 of the dashboard and replace "→ Next level" with "N XP to next level."**

That single change — larger level name + specific distance label — activates both the identity anchor (Mechanism 3) and the craving machine (Mechanism 1) simultaneously. It touches two lines of CSS and one line of JS in `renderXpWidget()`. Everything else in this audit is additive. This one is corrective.

---

## Behavioral Psychology Reference

| Mechanism | Name | Key Rule |
|---|---|---|
| 1 | Craving Machine (Skinner) | One central metric users obsess over (XP). Controlled surprise via badge near-miss and first-of-day bonus. |
| 2 | Infinite Game (Loss Aversion) | Streak always visible, always at risk. Losing hurts 2× more than gaining feels good. Weekly reset = season renewal, not loss. |
| 3 | Invisible Scoreboard (Social Comparison) | Level name is identity, not a label. Must be the first text the user reads so they internalize it as self-description. |

---

*This document is a living design plan. Update sections as features are implemented or sprint priorities shift.*
