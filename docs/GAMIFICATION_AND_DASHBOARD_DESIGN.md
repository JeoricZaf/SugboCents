# SugboCents — Gamification & Dashboard Design Reference

---

## App Context

SugboCents is a personal budgeting PWA for Filipino users (currency: PHP ₱). It is a vanilla HTML/CSS/JS app with no frameworks, no build tools, and no ES modules. Pages are separate HTML files. All data persistence goes through `window.StorageAPI` in `js/storage.js`.

**Relevant files:**

| File | Role |
|---|---|
| `dashboard.html` + `js/dashboard.js` | Main dashboard — primary user surface |
| `js/mascot.js` | Floating action button + slide-in panel with iframe chat |
| `js/gamification.js` | `showXpPopup(amount, anchorEl)` and `showCelebrationModal(config)` |
| `js/storage.js` | `StorageAPI` — the only data access layer UI code may use |

**XP system — `getXpInfo()` return shape:**
```js
{ xp, level, levelName, xpForLevel, xpForNext, progressPct }
```

**Level name ladder:**

| Level | Name |
|---|---|
| 1 | Rookie Saver |
| 2 | Peso Tracker |
| 3 | Budget Keeper |
| 4 | Wise Spender |
| 5 | Money Mindful |
| 6 | Savings Pro |
| 7 | Budget Legend |

**Other key APIs:**
- `getCurrentStreak()` — returns count of consecutive days with at least one logged expense
- `sugbocents:dataChanged` — custom event fired after every `addExpense`, `removeExpense`, and `saveWeeklyBudget`

**Mascot states already implemented in `mascot.js`:**
- `happy` → spent < 30%
- `neutral` → 30–64%
- `worried` → 65–89%
- `alarmed` → ≥ 90%

---

## Section 1: Research Summary — Sources Used

This document synthesizes findings from the following sources:

### Video Transcripts
| File | Content |
|---|---|
| `transcripts/Gamification 1.txt` | Intro to gamification techniques; real app case studies (Habitica, Forest, Duolingo, MyFitnessPal) |
| `transcripts/Gamification 2.txt` | Finbase case study — gamified money management app designed from scratch |
| `transcripts/Gamification 3.txt` | The 7 gamification techniques (comprehensive framework) |
| `transcripts/Gamification 4 (Really Important).txt` | Emotional design — Duolingo, Phantom, Revolut case studies |
| `transcripts/Gamification 5.txt` | AI habit system — 18 mechanics for habit-forming products |
| `transcripts/Gamification 6 (Really Important).txt` | The 3 core psychological mechanisms behind addictive apps |
| `transcripts/Dashboard 1.txt` | Dashboard design fundamentals — Claude-generated dashboard walkthrough |
| `transcripts/Dashboard 2.txt` | Dashboard UI components — Kolejain video build walkthrough |

### External Articles
| Source | Topic |
|---|---|
| geckoboard.com/best-practice/dashboard-design/ | 12 actionable dashboard design tips |
| eleken.co — "Gamification in eLearning Beyond Points and Badges" | Why gamification fails; what real gamification requires |
| eleken.co — "Mobile Learning Strategy: Microlearning to Gamification" | Habit-forming products and engagement loops |
| kolejain.com/resources | Dashboard UI design principles from video builds |

---

## Section 2: The 3 Core Psychological Mechanisms

*Source: Gamification 6 — "Really Important" — the deepest analysis in the research corpus.*

---

### Mechanism 1: The Craving Machine

**Root science:** BF Skinner's variable ratio reinforcement (1930s). Unpredictable rewards produce the most compulsive behavior — the same neural mechanism that drives slot machines.

The critical distinction: this is **not pleasure**. It is **craving**. The brain enters a constant chase state. Predictable rewards satisfy and close the loop. Unpredictable rewards keep the loop open indefinitely.

**Case study — Finch app:**
- 14 million downloads, 4.9-star rating, Apple Editor's Choice
- Core mechanic: the user's virtual pet bird goes on a daily adventure and returns with something — but the user cannot predict what it brings back
- The bird develops personality traits the user cannot fully control
- The app explicitly says: *"your bird is creating their own personality"*
- The brain stays in chase state because completion is always deferred

**Case study — League of Legends MMR:**
- Hidden matchmaking system keeps each player's win rate near 50%
- Players experience this as variance: *"some games I crush, some I get bad teammates"*
- 130 million monthly players keep pressing the lever because the outcome is never fully predictable
- No money, no tangible reward — just the chase

**Key design rule:**
> Most rewards should be predictable and transparent so users understand the system. But somewhere in the reward architecture, add controlled surprise. Maintain one central metric users can obsess over — not 20 scattered badges that dilute focus.

**Apply to SugboCents:**
- XP is the one central currency. Every logged expense gives XP — predictable, transparent
- Occasional **bonus XP** triggers (first expense of the day, 7-day streak milestone, under-budget day) fire `showXpPopup()` — user does not know in advance when the bonus will appear
- The FAB + XP popup combination is the lever. The bonus is the variable ratio

---

### Mechanism 2: The Infinite Game

**Root science:** Loss aversion. Humans feel the pain of losing approximately **2× more intensely** than the pleasure of gaining the equivalent amount. This asymmetry is the engine behind the most retentive apps.

**Case study — Duolingo streak:**
- A streak is a single thread. Break it once and the count resets to zero
- A more evolved design (the "diamond streak system") escalates further: streaks unlock diamonds at day 7, 42, etc. Miss a day and you risk losing accumulated diamonds. A streak freeze must be earned in advance
- The fear of losing what is already accumulated outweighs the effort of logging in

**Case study — Peloton:**
- 90% annual subscriber retention
- Accumulated metrics that **never cap out**: total classes taken, total miles ridden, total output
- A user at 500 classes is not stopping when 600, 700, 1000 are all reachable
- There is no "done" state
- *"The most addictive apps never let you finish."*

**Case study — League of Legends:**
- Seasonal rank resets re-engage lapsed players (the climb feels fresh again)
- Cosmetics and honor levels are **never reset** — earned identity is permanent
- Combination of periodic resets + permanent status = infinite game loop

**Key design rule:**
> Audit your product for "done states." If a user can complete your app, you have a ceiling on retention. Build streaks that compound into something worth keeping. Periodic resets (weekly budget cycles) can re-engage users while preserving earned status (XP, level name, badges).

**Apply to SugboCents:**
- The **streak** is the primary loss aversion hook — every day logged adds to a count the user does not want to break
- XP and level names accumulate past Lv7 — there is no final completion screen
- Future mechanic: **streak diamonds** — milestone badges unlocked at day 7, 14, 30, 60, 100. Missing a day risks the accumulated streak, increasing the cost of quitting
- Weekly budget resets (already built in) act as the periodic "fresh start" while XP and streak persist

---

### Mechanism 3: The Invisible Scoreboard

**Root science:** Social comparison theory. Humans have a deep instinct to measure themselves against others. This instinct does not require an external prize — visibility alone is sufficient.

**Case study — Strava leaderboard:**
- Users were uploading e-bike rides as regular rides solely to climb the leaderboard
- No money, no sponsorship, no tangible benefit — only rankings
- 3.9 million activities had to be deleted in 2025–2026 for cheating
- The scoreboard manufactured motivation that fitness alone could not

**Case study — Peloton parasocial relationships:**
- AI can generate a workout plan. AI can build a leaderboard.
- AI cannot replace the feeling of a specific instructor calling out your name when you are struggling
- Instructors became celebrities. Users scheduled workouts around instructor schedules
- The social layer turned engagement into **identity**

**Key insight:**
> Without social visibility, a user can quit privately — no one notices. When their progression is visible to others, quitting becomes publicly admitting they stopped. The social layer converts engagement into **identity**. Identity is the one thing people never voluntarily walk away from.

**Apply to SugboCents:**
- The **level name** is the identity signal. "Budget Legend" is not a label — it is who the user is
- It must be the most prominent text on the dashboard so users internalize it as self-description
- Future: public profile page showing level name + streak count — quitting means your identity disappears from view
- Short-term: the level name heading on the dashboard is the foundation of the invisible scoreboard

---

## Section 3: Supporting Gamification Principles

*Sources: Gamification 1, 2, 3, 4, 5 + Eleken articles*

---

### The 7 Gamification Techniques (Gamification 3)

1. **Point system** — quantified feedback for every action. The points themselves are less important than making the user feel progress after each interaction. Points must lead somewhere or they are meaningless.

2. **Badges & achievements** — visual proof of milestones. Only effective when badges are specific, earnable, and tied to goals the user already cares about. Generic participation badges have no psychological weight.

3. **Challenges** — time-bounded or goal-bounded tasks that give structure to open-ended behavior (e.g., "Log 5 expenses this week"). Must feel achievable, not arbitrary.

4. **Leaderboards** — powerful but require product fit. Work best when users share context (same financial bracket, same city). In personal finance, direct income comparisons are harmful. Use cautiously or only in future social features with normalization.

5. **Constraints and timers** — scarcity creates urgency. A daily mission that expires at midnight, a streak that resets at midnight, a weekly budget that cycles every Sunday. Time constraints make action feel consequential.

6. **Progress bars** — visual representation of incompleteness drives completion. The "completion compulsion" — a half-filled bar is uncomfortable. Use for XP progress, budget consumption, profile completion.

7. **Onboarding as a journey** — first-time experience should feel like entering a world, not filling in a form. Each step should feel like an earned unlock. The user should feel agency from the first screen.

---

### The Finance App Case Study — Finbase (Gamification 2)

The creator of Gamification 2 designed a concept app called **Finbase** — a gamified money management app built from scratch. Key design decisions and their relevance:

| Feature | Design choice | Relevance to SugboCents |
|---|---|---|
| Central currency | "Fin Bits" — earned for saving money and completing goals | XP is our Fin Bits. Same mechanism |
| Leaderboard | Normalized by income and currency differences (local only) | Avoid direct peso comparisons in any future social feature |
| Analytics | Spending vs. saving breakdown by day, week, month | `stats.html` is the analytics tab equivalent |
| Education tab | Financial literacy lessons + quiz = earn more Fin Bits | Future feature — not Sprint 1/2 scope |
| Goal-based accounts | Virtual accounts to allocate savings toward specific goals | Category-based quick-add is the lightweight equivalent |
| Streak badges | 30-day saving streak badge | Already planned as milestone badges in XP system |

**Key takeaway:** SugboCents already has the architecture Finbase was designed toward. XP/level = Fin Bits. Quick-add categories = goal allocation layer. Stats page = analytics tab. The infrastructure exists — the design execution needs to match the ambition.

---

### The AI Habit System — 18 Mechanics (Gamification 5)

These mechanics were identified in a breakdown of habit-forming AI products. Not all are needed in Sprint 1/2, but they form a complete design vocabulary:

1. **XP weighting by importance** — not all actions earn equal XP. First expense of the day could be worth more than subsequent ones.
2. **Daily completion percentage** — a 0–100% metric for "did I meet today's standard?" gives daily closure.
3. **Milestones at 75% and 100%** — intermediate celebration at 75% of a goal reduces drop-off before completion.
4. **Visual color states** — yellow for in-progress, green for completed. Color communicates state faster than text.
5. **Implicit streak system** — the streak runs in the background; users discover it is building before they consciously try to maintain it.
6. **Unlock system** — new features or states become accessible at higher levels. Gives users something to look forward to.
7. **Minimum viable day vs. elite performance** — define the floor (log one expense = streak safe) and the ceiling (log expenses + stay under budget = perfect day). Both must be visible.
8. **Dopamine triggers on reward feedback** — `showXpPopup()` and `showCelebrationModal()` are the implementation. Must fire immediately, not after a delay.
9. **Habit loop: action → reward → repeat** — every quick-add tap must close a loop instantly. Tap category → XP popup floats up → Today's Mission updates → repeat tomorrow.
10. **Weekly and monthly progress views** — streak and XP charts over time. Already exists in `stats.html`.
11. **Pattern recognition analytics** — showing users insights they did not know about themselves ("You spend most on weekends"). Reserved for Stats page.
12. **Personalization** — greeting by first name is the minimum. A mascot that reacts to the user's specific data goes further.
13. **Goal structuring** — breaking annual goals into weekly milestones. Budget is already weekly; goal system is the next layer.
14. **End-of-day lock-in ritual** — a moment of closure (e.g., Today's Mission card going green) signals the day is done and the streak is protected.
15. **Identity-based gamification** — habits are not what you do, they are who you are. "I am a Budget Legend" is more durable than "I am trying to save money." The level name is the identity anchor.
16. **Scarcity and limitation** — limited opportunities create urgency. The streak resets at midnight. The weekly budget is finite. These natural constraints already exist in the app.
17. **Calendar-style history grid** — a grid of past days (green = logged, grey = missed) makes history visible and makes gaps feel uncomfortable. Activates Mechanism 2 (loss aversion).
18. **Social visibility** — progression shown to others activates Mechanism 3. Reserved for future social features.

---

### Emotional Design (Gamification 4 — "Really Important")

Three brand case studies with directly applicable lessons:

#### Duolingo — Animation as Emotional Infrastructure

In 2022, Duolingo introduced a full character animation system: facial reactions, lip sync, idle animations for Duo the owl.

- DAU grew from 14.2M → 34M in 2 years
- Paid subscribers doubled in the same period
- CEO quote: *"The delightful experience sets it apart."*

The animations were not cosmetic. They were **emotional feedback loops**. A wrong answer produced a disappointed Duo. A correct answer produced a celebrating Duo. Don Norman's "Emotional Design" in action: the product communicates not just information but *feeling*. Users feel encouraged, corrected, and cheered on — not just told "correct" or "incorrect."

**Applicable principle:** Every state change in SugboCents is an opportunity for an emotional signal. The question is never "should we animate this?" but "what emotion should the user feel here?"

#### Phantom — Polish as Trust Signal in Finance

Phantom is a crypto wallet. The domain (crypto) is notoriously technical, intimidating, and hostile to everyday users. In 2023, Phantom underwent a full brand refresh: animated ghost mascot, playful animations during wallet creation, humanized copy.

- Became the **#2 utility app** in the US App Store — above WhatsApp, above Instagram
- CEO quote: *"Polish matters. We're a design-led company that takes time to craft polished products."*

The explicit design goal: make crypto feel less scary and more human. **In finance and fintech, visual polish is not vanity — it is a trust signal.** Trust affects how much users engage with sensitive financial data.

**Applicable principle:** SugboCents handles users' real financial data. Every rough edge (unresponsive tap targets, jarring state transitions, missing empty states) erodes trust. Polish is the category requirement, not a luxury.

#### Revolut — Subtle Animation as Premium Signal

Revolut introduced a series of subtle, tactile interactions:
- Drag a finger across a chart and the graph glows under touch
- 3D card flip on virtual card reveal
- Subtle animations in security-related flows

None of these "shout." Together they communicate premium quality without a single word. The animation is always in service of the action — it makes the action feel more real, more physical, more consequential.

**Applicable principle:** Chart interactions in `stats.html`, budget card updates, and XP bar fill animations should feel tactile. Not flashy — tactile.

#### Key Principles from Emotional Design

1. **Micro-interactions give instant emotional feedback.** A subtle bounce, a glow, a sparkle after a tap. The interval between action and feedback must be zero — delay kills the dopamine loop.
2. **Celebrate small wins.** Success states do not need to be large. They need to feel **intentional**. A toast that says "Expense logged!" is not a celebration. A `+5 XP ⚡` float animation is.
3. **If you have a mascot, use it to show expressions.** Emotions are contagious. A worried Tigom when the budget is near 90% communicates urgency faster than any text label. A celebrating Tigom after a level-up creates the same dopamine loop Duolingo's animations created.
4. **Progress animations give a sense of momentum.** Motion showing streaks climbing, levels filling, XP growing gives the user a felt sense of moving forward, not just incrementing a number.

---

### Why Gamification Fails (Eleken — "Beyond Points and Badges")

The gamification bubble burst by 2014. Adobe, Google News, and Foursquare all publicly abandoned gamification features. The reason was not that gamification does not work. The reason was **spray-on gamification**: points and badges added on top of a broken core experience.

The Eleken analysis identified 3 ingredients that real games have which surface-level gamification skips:

1. **Games offer simplified models of complex systems.** The NYT "Points of Entry" immigration game: instead of reading policy statistics, users play a simulation that makes the system legible. The game does not add points on top of an article — it IS the simplified model. SugboCents's weekly budget with XP is a simplified model of financial behavior. The simplification IS the game layer.

2. **Games make users play roles.** Simulation creates investment. The level name system ("Budget Legend") is a role. The user is not just using a finance app — they are a Budget Legend who manages money. Small distinction, enormous retention difference.

3. **Games immerse players into a new world.** The mascot, the level names, the streak flame emoji — these are world-building details. Together they make SugboCents feel like a place the user inhabits, not a tool they use.

**Eleken's warning — "You probably don't need to gamify your app":**
> Clarity and usability come first. Fix friction before adding game mechanics. A confusing navigation with XP points on top is still confusing navigation. Gamification amplifies what is already there — it does not fix what is broken.

**What does work:**
LinkedIn's profile completion progress bar works because the context is right and the mechanic serves something the user already wants to do. Every badge or game mechanic must pass the test: does this make the core action easier, more meaningful, or more satisfying? If not, cut it.

---

## Section 4: Dashboard Design Principles

---

### Geckoboard's 12 Tips

1. **Be clear about purpose.** A dashboard answers one primary question for one primary audience. SugboCents dashboard answers: *"How am I doing this week?"* Every element must serve that question or be removed.

2. **Include only the most important content.** If everything is important, nothing is. Choose the 3–5 metrics that matter most and remove the rest from the primary view.

3. **Data ink ratio.** Remove decorative elements that do not communicate data. Every pixel should earn its place by conveying information. A full-body mascot gif that does not react to data is decoration. A mascot that changes state based on budget percentage is data.

4. **Round your numbers.** "₱3,240.00 remaining" is harder to parse than "₱3,240 remaining." Round to the nearest peso unless the decimal is meaningful to the user's decision.

5. **Use the most efficient visualization.** Bar charts and line charts outperform pie charts and area charts for comparison tasks. Use the chart type that answers the question fastest, not the one that looks most impressive.

6. **Group related metrics.** Budget remaining and budget percentage belong together. Streak and XP belong together (both are progress metrics). Mixing unrelated metrics in the same card creates cognitive load.

7. **Be consistent.** Same font sizes for same data types. Same color meanings across all charts. Same interaction patterns for all tappable elements. Inconsistency makes users feel uncertain.

8. **Use size and position to show hierarchy.** Top-left is the most important position on a left-to-right reading surface. On mobile, the topmost content is the most important. The level name + greeting block must be at the very top.

9. **Give numbers context.** A raw number with no reference point is unactionable. "₱3,240 remaining" + a progress bar showing 83% spent + the weekly budget total gives the number three layers of context.

10. **Use clear labels audiences understand.** Avoid internal jargon. Every metric must be labeled with what it measures. An unlabeled progress bar is not.

11. **Remember it is for people.** Rules can be broken for engagement. A technically "unnecessary" element (the mascot, the level name as a large heading) may violate data ink rules but drives emotional connection. Engagement is also a form of utility.

12. **Keep evolving dashboards.** A dashboard that shipped in Sprint 1 should be revisited in Sprint 2 and Sprint 3. User behavior reveals what is actually used vs. what was assumed to matter. Remove metrics nobody looks at. Elevate metrics users seek out.

---

### Dashboard UI Design Principles (Dashboard 2 — Kolejain)

**Typography density:**
Dashboard typography is smaller and denser than landing pages. Heading/body size ratios are compressed. Less whitespace between size levels. Dashboards optimize for information density at a glance, not for narrative reading.

**Grid discipline:**
Every element occupies deliberate space — there are no gaps left over. If a section has empty space, it must either become a designed empty state or be removed.

**Main section = most important content:**
What occupies the largest space in the primary content area signals to the user what the product thinks matters most. If it is a chart, the product says "analysis matters most." If it is a budget card and a quick-add row, the product says "your money and your actions matter most."

**"Do one thing well":**
> If your dashboard looks like it requires a PhD to operate, it is too complex.

A dashboard that tries to be a stats page, a log page, a settings page, and a notifications center is none of those things well. Pick the primary user job (know your budget status, log an expense) and design around that exclusively.

**The 4 main dashboard components:**
1. **Lists / Tables** — for ordered data (recent expenses, transaction history)
2. **Cards** — for summary metrics with a single primary value
3. **User input** — forms, quick-add buttons, any mechanism for the user to contribute data
4. **Tabs** — for switching between related views within the same page context

**Visual separation in lists:**
Choose one: space between items, divider lines, or background color alternation. Using all three simultaneously creates visual noise.

**Cards in light vs. dark mode:**
- Light mode: subtle background tint distinguishes card from page background
- Dark mode: a visible outline (border) is more legible than a tint on dark surfaces

**Modals vs. popovers vs. new pages:**
- **Modals** — complex, related actions requiring a clear confirm/cancel decision
- **Popovers** — simple, non-blocking context that supplements the current view
- **New pages** — permanent, large contexts the user will navigate between regularly (stats, settings, profile)

**Toasts for non-blocking notifications:**
Confirmations, warnings, and non-critical errors use toasts. They do not interrupt the user's flow and do not demand acknowledgment.

**Optimistic UI:**
Assume server success and update the UI instantly. If the operation fails, roll back with an error toast. Waiting for confirmation before updating creates perceived latency that makes the app feel slow.

**Empty states are mandatory:**
An empty state is not an edge case — it is the first thing new users see. Every list, chart, and data card must have a designed empty state that either guides the user toward the filling action or communicates clearly that no data exists yet.

---

## Section 5: Applying Everything to the SugboCents Dashboard

---

### The Dashboard Problem — Current State

| Issue | Principle violated |
|---|---|
| XP widget buried mid-page, below the fold on mobile | Geckoboard #8 — hierarchy by position. Most important content must be at top |
| Streak chip is a tiny label inside the XP widget | Mechanism 2 — loss aversion requires streak to be prominent and feel consequential |
| No daily mission or habit hook | Habit loop mechanic (G5 #9) is entirely missing — no action→reward cycle |
| Three redundant data layers: budget card + quick stats row + four charts | Geckoboard #2 and #3 — include only what's important; remove data ink violations |
| Two separate logging UIs (quick-add + log expense form) | Dashboard 2: "do one thing well" — one logging surface |
| Full-body mascot gif in header is passive decoration | Geckoboard #3 — decorative element with no data value |
| Four stat charts at bottom of dashboard | Dashboard 2: permanent large contexts belong on separate pages (`stats.html`) |

---

### Proposed New Dashboard Layout

```
┌─────────────────────────────────────┐
│  Budget Legend          (level name)│  ← IDENTITY FIRST — large heading
│  "Morning, Juan"        🔥 7 days   │  ← greeting + streak (loss aversion hook)
│  ██████████░░ 125 / 350 XP (600ms)  │  ← animated XP bar (craving machine)
├─────────────────────────────────────┤
│  ₱ 3,240 remaining  ████████░ 83%   │  ← hero budget card (one number, in context)
├─────────────────────────────────────┤
│  Today's Mission (4 states)         │  ← daily habit loop — action→reward anchor
├─────────────────────────────────────┤
│  Quick Add [🍔][🚌][☕][⚡][+]      │  ← single logging surface
├─────────────────────────────────────┤
│  Recent Expenses                    │  ← list component (last 5–7)
├─────────────────────────────────────┤
│  [📊 View full stats →]             │  ← replaces all 4 charts; links to stats.html
└─────────────────────────────────────┘
```

**Why this order:**
1. Identity first (level name) — user sees who they are before they see their numbers
2. Loss aversion (streak) — the thing they must not break is immediately visible
3. Progress visible (XP bar) — momentum is felt before any data is shown
4. One number (budget remaining) — the single most actionable metric
5. Daily anchor (Today's Mission) — the habit loop entry point
6. Action (Quick Add) — logging is the primary behavior, placed where the thumb lands
7. History (Recent Expenses) — context for the numbers above
8. Escape hatch (View full stats) — access to depth without polluting the primary surface

---

### Today's Mission — 4 States

The Today's Mission card is the **habit loop anchor**. It changes state based on two inputs: whether the user has logged an expense today, and whether their streak is at risk. It updates in real time via the `sugbocents:dataChanged` event.

| State | Trigger condition | Visual treatment | Message |
|---|---|---|---|
| `none` | No expenses logged today; streak = 0 | Neutral grey/white | "Start your day — log your first expense 🎯" |
| `in-progress` | Logged at least one expense today; budget OK | Warm yellow background | "On track! Keep logging to solidify your day ⭐" |
| `at-risk` | Active streak > 0; no expense logged today | Orange background, subtle pulse | "Log now to protect your X-day streak! 🔥" |
| `perfect` | Logged today AND spending under budget | Brand green background | "Perfect day! Streak safe ✅" |

**State transition logic:**
```
1. Has the user logged an expense today?
   └── No → streak > 0?
         ├── Yes → at-risk
         └── No  → none
   └── Yes → spending < budget?
         ├── Yes → perfect
         └── No  → in-progress
```

The `at-risk` state is the highest-urgency design element on the dashboard. It should be immediately distinguishable from all other states. The orange color exists specifically to trigger Mechanism 2 (loss aversion) — the user sees what they are about to lose.

---

### What Gets Removed and Why

| Removed element | Principle violated |
|---|---|
| Quick summary stats row (Spent / Avg Daily / Remaining) | Geckoboard #3 — data ink ratio. Duplicates what the budget card already communicates. Adds visual weight without adding decision-making value. |
| Full-body mascot gif in greeting header | Geckoboard #3 — decorative element with no data value. The mascot's function is the FAB and emotional state display, not a static hero image. |
| Separate "Log Expense" form section | Dashboard 2 — "do one thing well." Quick Add is the logging surface. A second form creates choice paralysis. |
| Four stat charts (spending by category, trends, etc.) | Dashboard 2 — permanent large contexts belong on separate pages. Geckoboard #2 — include only the most important. These belong on `stats.html`. |

---

### Micro-interaction Design

*Grounded in Emotional Design (G4) — all micro-interactions must close the habit loop instantly.*

**After every quick-add tap:**
```js
showXpPopup(amount, buttonEl);
```
A small `+5 XP ⚡` floats up from the tapped button and fades out over ~600ms. This fires **immediately** — before any async operation. This IS the habit loop: action → instant reward → repeat tomorrow.

**Today's Mission card updates:**
Listens to `sugbocents:dataChanged`. When the event fires, the card re-evaluates its state and transitions with a 200ms cross-fade. The user sees the card respond to their action without a page reload.

**XP bar fill animation:**
```css
.xp-bar-fill {
  transition: width 600ms ease-out;
}
```
On page load, the bar starts at 0% and fills to the current `progressPct` value. This gives the user a felt sense of forward motion the moment they open the dashboard.

**Level-up:**
`showCelebrationModal()` in `gamification.js` is called when XP crosses a level threshold. This is the "epic meaning" moment — not just a notification but a full-screen celebration. The mascot state simultaneously shifts to `celebrating` (see Section 6).

**Streak increment:**
When the user's first expense today extends the streak, the streak chip in the header briefly scales up (`transform: scale(1.2)` → `scale(1.0)` over 300ms) and the count increments with a counter animation. The threat is gone, the reward is confirmed.

---

## Section 6: Mascot (Tigom/Sugbo) Emotional State Integration

*This section is a direct implementation guide for the colleague responsible for extended mascot integration.*

---

### Current State (Already Implemented in `mascot.js`)

`getMascotState()` computes the current state from `getBudgetSummary().percentageSpent`. `updateMascotState()` already listens to `sugbocents:synced` and `sugbocents:dataChanged`.

**Existing states:**

| State key | Trigger | Image | Label |
|---|---|---|---|
| `happy` | spent < 30% | `mascot-happy.png` | "Doing great!" |
| `neutral` | spent 30–64% | `mascot-neutral.png` | "On track" |
| `worried` | spent 65–89% | `mascot-sad.png` | "Heads up!" |
| `alarmed` | spent ≥ 90% | `mascot-shocked.png` | "Budget alert!" |

---

### What the Research Says the Mascot Should Do

**From Emotional Design (G4):**
> "If you're like Duolingo and you have a mascot of some sort, use the mascot to show expressions, to encourage users — because emotions are contagious. This can be small nods, smiles, or animated reactions that make the experience feel more human."

**From Phantom's case study (G4):**
Phantom made crypto feel less scary by animating their ghost mascot as the central design strategy. Finance is an intimidating domain. A warm, reactive mascot lowers the emotional barrier to engaging with financial data.

**The mascot's emotional expression IS the trust signal in a finance app.** A worried Tigom when the budget is near 90% is not decoration — it is the emotional shorthand that communicates "something needs attention" faster than any text label. Treating it as decoration wastes the single most powerful emotional tool in the app.

---

### The Gap: What the Mascot Does Not Yet React To

The current mascot covers budget state. It does not react to:
- Streak milestones (new streak day, 7/14/30/60/100-day milestones)
- Level-ups (XP crossing a level threshold)
- Perfect day achievement (logged today + under budget)
- First expense of the day ("welcome back" moment — streak is now safe)
- New user who has never logged before (needs extra warmth)
- Today's Mission transitioning to the "perfect" state

---

### Proposed Extended State System

| State key | Trigger condition | Image | Label | Psychological mechanism |
|---|---|---|---|---|
| `happy` | spent < 30% | `mascot-happy.png` | "Doing great!" | Positive reinforcement |
| `neutral` | spent 30–64% | `mascot-neutral.png` | "On track" | Baseline |
| `worried` | spent 65–89% | `mascot-sad.png` | "Heads up!" | Loss aversion nudge |
| `alarmed` | spent ≥ 90% | `mascot-shocked.png` | "Budget alert!" | Urgent loss aversion |
| `celebrating` | Level-up just occurred OR perfect day achieved | `mascot-celebrating.png` *(new asset needed)* | "You leveled up! 🎉" | Epic meaning + accomplishment |
| `streak` | Streak just hit a milestone: 7, 14, 30, 60, or 100 days | `mascot-happy.png` + CSS pulse | "🔥 X-day streak!" | Status + achievement |
| `welcome-back` | First expense logged today, after no expense yesterday | `mascot-happy.png` | "Welcome back! 🙌" | Belonging + positive reinforcement |
| `encouraging` | No expense logged today AND budget ≥ 65% spent | `mascot-sad.png` | "Don't forget to log 📝" | Compounded loss aversion |

---

### Implementation Guide

#### Step 1 — Add new state keys to the `STATES` object in `mascot.js`

```js
var STATES = {
  // ... existing states ...
  celebrating: {
    img: "assets/images/mascot/mascot-celebrating.png",
    label: "You leveled up! 🎉",
    cls: "mascot-celebrating"
  },
  streak: {
    img: "assets/images/mascot/mascot-happy.png",
    label: "\uD83D\uDD25 X-day streak!",
    cls: "mascot-streak"
  },
  "welcome-back": {
    img: "assets/images/mascot/mascot-happy.png",
    label: "Welcome back! \uD83D\uDE4C",
    cls: "mascot-welcome"
  },
  encouraging: {
    img: "assets/images/mascot/mascot-sad.png",
    label: "Don't forget to log \uD83D\uDCDD",
    cls: "mascot-encouraging"
  }
};
```

#### Step 2 — Priority ordering in `getMascotState()`

Evaluate conditions from highest to lowest priority. The first match wins:

```
1. window._mascotOverrideState set and not expired
   → use override key, clear override, return
2. Streak just hit a milestone today (7, 14, 30, 60, 100)
   → 'streak'
3. Logged today + spending < weekly budget
   → 'celebrating'
4. No expense today AND budget ≥ 65% spent
   → 'encouraging'
5. budget ≥ 90%
   → 'alarmed'
6. budget ≥ 65%
   → 'worried'
7. budget ≥ 30%
   → 'neutral'
8. default
   → 'happy'
```

#### Step 3 — Loose coupling pattern: gamification.js → mascot.js

These two files must not directly call each other. The bridge is a window-level override + event dispatch:

```js
// In gamification.js — after a level-up is detected:
window._mascotOverrideState = {
  key: "celebrating",
  expires: Date.now() + 5000  // show celebrating state for 5 seconds
};
document.dispatchEvent(new CustomEvent("sugbocents:dataChanged"));
```

```js
// In mascot.js — at the top of getMascotState():
if (
  window._mascotOverrideState &&
  Date.now() < window._mascotOverrideState.expires
) {
  var key = window._mascotOverrideState.key;
  window._mascotOverrideState = null;
  return key;
}
```

`mascot.js` already listens to `sugbocents:dataChanged` — so no new event wiring is needed. `gamification.js` does not need to know anything about mascot internals.

#### Step 4 — CSS transitions on FAB image swap

The image swap on state change must feel alive, not jarring:

```css
/* Smooth opacity fade on image swap */
.mascot-fab-img {
  transition: opacity 200ms ease;
}

/* Streak milestone: pulse the FAB */
.mascot-streak .mascot-fab-img {
  animation: mascotPulse 600ms ease-out;
}

@keyframes mascotPulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
```

The image swap flow in JS:
1. Set `fabImg.style.opacity = "0"`
2. Swap `fabImg.src` to the new state image
3. On `fabImg.onload`, set `fabImg.style.opacity = "1"`

#### Step 5 — Panel header reflects state

`#mascotPanelAvatar` and `#mascotPanelStatus` are already updated by `updateMascotState()`. The status label in `#mascotPanelStatus` must always use the resolved state's `label` property. When in `streak` state, the panel header should read "🔥 7-day streak!" — not a generic greeting. The panel header is the first thing the user sees when opening the mascot panel; it must confirm the emotional context the FAB established.

For the `streak` state, the label text includes a placeholder "X" — replace it with the actual streak count before setting it:

```js
var label = stateObj.label.replace("X", currentStreak);
document.getElementById("mascotPanelStatus").textContent = label;
```

#### Step 6 — New asset needed

A `mascot-celebrating.png` asset is required for the `celebrating` state. Tigom should appear joyful — arms raised, confetti, or an expression appropriate to the brand visual language. This asset does not exist yet and must be created.

#### Step 7 — Idle expression (future, not Sprint 1/2)

On pages where the mascot FAB is visible, a subtle idle animation every 30–60 seconds signals that Tigom is present and alive, not a static image. Use a CSS animation with `animation-play-state` toggled from JS, paused when `document.visibilityState !== "visible"`:

```css
@keyframes mascotBob {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-4px); }
}
```

---

## Section 7: What NOT to Do

These are the failure modes identified across all research sources. Documented as hard rules, not suggestions.

---

### 1. Do not spray gamification on a broken UX

**Source: Eleken — "Beyond Points and Badges"**

If the navigation is confusing, the logging flow has friction, or the dashboard is cluttered — fix those problems first. Gamification amplifies what is already there. XP points on top of a confusing UI create a confusing UI with XP points. Sequence is always: clarity → usability → gamification.

---

### 2. Do not let gamification contradict the app's purpose

**Source: Eleken — Headspace cautionary example**

Headspace reduced their streak emphasis after discovering it was creating anxiety — the opposite of what a mindfulness app should do. SugboCents must not create budget anxiety beyond helpful nudges. The `at-risk` state on Today's Mission is helpful. A red screen and urgent sound effects would be harmful. The emotional register must always be: warm encouragement and gentle urgency, never shame or panic.

---

### 3. Do not scatter badges nobody cares about

**Source: Gamification 6 — Mechanism 1**

One central currency (XP). One central identity (level name). A badge for "logged 3 expenses in a week" that nobody sees and nothing depends on is noise, not architecture. Every badge or achievement must be visible, earnable by the majority of active users, and connected to something the user already cares about.

---

### 4. Do not confuse decoration with architecture

**Source: Gamification 6 — Mechanism 2**

A streak counter that resets to 0 with no recovery mechanic and no milestone payoffs is decoration. A streak that unlocks milestone badges at day 7, 14, 30, 60, 100 — and can be protected with an earned freeze item — is architecture. The difference is whether the mechanic has **consequences and rewards beyond the counter itself**.

---

### 5. XP must lead somewhere visible

**Source: Gamification 6 — Mechanism 3 + Eleken**

XP that raises a visible level name (a public identity signal) is meaningful. XP that increments a number nobody sees is meaningless. The level name in the dashboard heading is what makes the XP system real. If the level name were removed, the XP system would have no psychological weight.

---

### 6. Do not make the dashboard require a PhD to operate

**Source: Dashboard 2 — Kolejain**

Complexity is a symptom of unclear priorities, not a feature. Every element on the dashboard must pass the test: *"Does this help the user answer their primary question right now?"* If not, it belongs on a different page, in a popover, or nowhere.

---

### 7. Do not add metrics just because you can track them

**Source: Geckoboard — Tips 1, 2, and 9**

Every metric on the dashboard must satisfy four criteria:
1. It matches the purpose of the page
2. It is actionable (the user can do something about it)
3. It changes at a reasonable frequency (not so slowly that checking it is pointless)
4. It is understandable at a glance without explanation

If a metric fails any of these four, it does not belong on the dashboard.
