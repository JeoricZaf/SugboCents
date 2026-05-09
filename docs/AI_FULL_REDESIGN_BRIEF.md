# SugboCents — Full Visual Redesign Brief

> **To the AI receiving this:** You have complete creative authority over this redesign. Nothing here is a constraint — it is context. Every system described below is fair game for reinvention. The names of things can change. The way features are presented can change. The order and placement of features across pages can change. The entire visual language can change. The only fixed things are the core behavioral goals listed in the psychology section — how you achieve them is entirely up to you. Use every tool in your arsenal: MCP web fetching, direct website screenshots, design reference lookups, competitive analysis — whatever gives you the best output. Research real apps live if you can. Do not limit yourself to the references provided; they are starting points, not a ceiling.

---

## What Is SugboCents?

**SugboCents** is a gamified personal finance PWA (Progressive Web App) built for **Filipino students and young professionals**. Its core mission is to make expense tracking feel as addictive and rewarding as a mobile game — specifically the way Duolingo makes language learning feel like something you never want to stop.

The real-world currency is **Philippine Peso (₱)**. The app has a virtual in-app currency called **Sentimos (₵)** — earned through good financial behavior and spent in a cosmetic/reward shop. The exchange metaphor is intentional: "sentimos" are actual centavo coins in Filipino, making the currency name grounded in local culture.

The app runs in the browser as a PWA — no app store required. It is designed primarily for **mobile phones** but must also present a fully considered **desktop/web layout** that is not just a stretched mobile UI. When you design, think about what Duolingo looks like on desktop vs. mobile — they are genuinely different layouts that share the same identity. Do the same here.

---

## Platform Target: Mobile PWA + Desktop Web

This is not a native app. It is a Progressive Web App that lives in the browser and can be installed to a home screen. Constraints and opportunities this creates:

- **Mobile (primary):** Portrait orientation, thumb-friendly tap targets, bottom navigation, swipe gestures, floating action buttons. Think of how Duolingo, Strava, and Monzo feel on a phone screen.
- **Desktop (secondary but required):** A real desktop layout — not just the mobile view centered on a white background. Consider sidebars, wider content columns, hover states, a horizontal top navigation or persistent sidebar navigation. Research how Duolingo, Notion, and Revolut adapt their mobile-first products to desktop.
- If you have tools available to fetch live websites and screenshots (MCPs, browser tools, etc.) — use them. Look at `duolingo.com` on both viewport sizes, `revolut.com`, `monzo.com`, `habitica.com`, `nike.com/nrc` (Nike Run Club). Pull design patterns directly from the source.

---

## The Mascot: Tigom

The app has a mascot named **Tigom** (also called "Sugbo"). Tigom is a small, expressive creature whose emotional state mirrors the user's financial health:
- **Happy** — user is spending well within budget
- **Neutral** — moderate budget usage
- **Worried** — budget getting tight
- **Alarmed** — budget nearly exhausted
- **Celebrating** — a significant milestone was just hit

Tigom is the personality anchor of the app — the equivalent of Duo the Duolingo owl, but Filipino-flavored. Tigom appears as a floating element, as chat avatars, in celebration moments, and wherever the app needs warmth and character. You can reimagine where and how Tigom appears throughout the experience — there is no fixed rule about which pages the mascot must appear on or how prominently.

---

## The Psychology We Must Hit — This Is the Core

These behavioral mechanisms are non-negotiable at a psychological level. How they are presented visually is entirely your call.

### 1. The Craving Machine (Variable Reward Schedule)
The brain stays in chase state when rewards are partially unpredictable. Most rewards should be transparent and earned through clear actions, but there should be moments of surprise — a bonus XP event, a mystery reward from a weekly chest, a streak milestone celebration that feels bigger than expected. The user should always feel like something good *might* happen if they open the app today. One central obsession metric (we currently use streak count — but you can reimagine what the primary obsession metric is).

### 2. The Infinite Game (Loss Aversion + No Done State)
A streak that resets to zero when broken. Tiered badges that always have another tier. Quests that reset weekly so there is never a "finished" state. The user should never be able to say "I'm done with this app." The pain of losing progress (a streak breaking, missing a daily log) should feel more significant than the pleasure of gaining it — this is loss aversion, the most powerful behavioral mechanic in retention. Peloton, Snapchat, and Duolingo all use this.

### 3. The Invisible Scoreboard (Social Identity)
A user can quit privately. But when their progress is visible to others — on a leaderboard, a public profile — quitting becomes a public act. The leaderboard and profile exist to make the user's identity feel real to others, converting private progress into social identity. The design should make the user *want* to be seen.

### 4. Immediacy of Feedback
Every action that earns a reward should produce immediate, satisfying feedback. Not a subtle color change — a moment. A pop, a float animation, a celebration. The time between action and reward must be near-zero. You decide how this looks — it could be particles, sound design instructions, haptic hints, animated number counters, full-screen moments, floating toasts, or something entirely novel.

### 5. Filipino Warmth and Cultural Grounding
The copy tone should feel like a friend who genuinely cares, not a financial advisor. Warm, casual, encouraging. The app is not trying to shame people about money — it is celebrating every small act of financial awareness. Local cultural references, the mascot's personality, and the Sentimos currency name are all expressions of this. The design should feel warm and personal, not clinical.

---

## Current Gamification Systems (Redesign Freely)

These are the features that exist. How they look, where they live, and how they communicate is entirely up to you.

### XP + Levels
Users earn XP through actions. Accumulated XP unlocks levels. There are currently 7 levels with names — you can rename them, add more tiers, change the progression feel entirely. The key behavior: leveling up must feel like a significant moment, not a number incrementing.

Current level names (replaceable):
1. Rookie Saver
2. Peso Tracker / Budget Aware
3. Budget Keeper / Money Smart
4. Wise Spender / Week Crusher
5. Money Mindful / Streak Hunter
6. Savings Pro / Finance Pro
7. Budget Legend

### Streak System
A consecutive-day streak counter. The user builds a streak by logging at least one expense per calendar day. Breaking the streak resets it to zero. This is the highest-stakes mechanic in the app. There is a "streak freeze" item users can earn or buy that protects the streak for one missed day.

### Sentimos (₵) — Virtual Currency
Earned through: logging expenses, completing quests, hitting streak milestones, claiming badges, logging savings. Spent in a cosmetic shop (themes, freeze items, avatar customizations). The balance is an emotional state indicator — the user should feel the balance growing and feel the specific emptiness when it is zero.

### Quests
Weekly challenges that reset every Monday. Always at least one active quest. Examples of quest types: log expenses every day, stay under budget all week, spend in 5 different categories, log your first expense before noon three days in a row. Completing quests awards XP and Sentimos. There are locked "upcoming" quests always visible but inaccessible — so the app never feels fully explored.

### Achievements / Badges
A badge collection. Badges are grouped by category (logging habits, streaks, savings). Each badge has a locked and unlocked state — locked badges are visible but visually suppressed (greyed out, some form of lock treatment). Multiple tiers per badge. Claiming a badge awards XP and Sentimos.

### Social: Leaderboard + Friends
A friends-only leaderboard ranked by consistency metrics (NOT by how much money they spend or have — that would disadvantage lower-income users). Friends can view each other's public profiles. A social activity feed shows friends' recent milestones.

### Savings Goals
Separate from the weekly budget — long-term savings targets like "Save ₱15,000 for a Palawan trip" or "Emergency Fund." Users deposit toward goals and track progress. Tied to savings-specific achievements.

### AI Chat (Tigom as Coach)
A conversational AI interface where the mascot acts as a personal budgeting coach. It has access to the user's spending data, streak, quests, and goals — so responses are specific and personal. The backend uses Groq's LLM. Rate limited. Graceful offline fallback.

### Weekly AI Email Report (Wrapped)
An opt-in weekly email report with a branded stats summary and a short AI-generated personalized insight paragraph. Sent on Monday mornings. Users can also trigger it on-demand from Settings.

---

## The Pages to Redesign

For each page, the features listed are what currently exist or are planned. You decide the layout, the visual hierarchy, the component design, the names, the copy tone, and the interaction patterns. Feature placement across pages is flexible — if you think a feature belongs on a different page, move it. If you think two pages should be merged, merge them. If you think a feature needs a new home that doesn't exist yet, create it.

---

### Page 1: Dashboard

**Purpose:** The user's home base. They land here every time they open the app. It must answer three questions immediately: How is my budget? How is my streak? What should I do today?

**Current features:**
- Greeting with user's first name (time-aware: morning/afternoon/evening)
- Budget overview: total weekly budget, amount spent, remaining, percentage used
- Visual urgency feedback tied to budget consumption (calm → concerned → alarming as spending increases)
- One-tap expense logging with category shortcuts (transport, food, groceries, education, shopping, health, entertainment, utilities, personal care, others)
- Amount entry modal after selecting a category
- Streak display with consecutive-day count
- Weekly day visualization showing which days have been logged (7-day span)
- Today's mission / active quest progress preview
- Recent expenses list (latest entries with category, amount, and time)
- XP level and progress toward next level
- Sentimos balance display
- Mascot widget with contextual mood message
- Reward state at end of perfect week (7/7 days logged)

---

### Page 2: Activity

**Purpose:** The complete record of what the user has done — both financially (every expense) and gamification-wise (every meaningful event).

**Current features:**
- Dual view: expense history tab and gamification event feed tab
- Expense list grouped by date (today, yesterday, older)
  - Category icon, label, amount, optional note, timestamp
  - Delete/remove functionality
- Gamification event feed
  - Streak milestones, badge unlocks, level-ups, quest completions, XP gains
  - Milestone events more prominent than routine events
- Weekly summary banner: total spent vs. budget, expenses logged, XP earned, streak status
- Category filter chips and search

---

### Page 3: Quests

**Purpose:** The weekly challenge system. Gives the user a specific behavioral goal to work toward. Never lets the user feel "done."

**Current features:**
- Hero section with mascot and themed branding (seasonal variants on payday weeks)
- Active weekly quest card(s) — each with:
  - Quest type indicator
  - Quest title and description
  - Progress bar with current count toward target, shown inside the bar
  - Reward indicator showing ₵ and XP reward
  - Claim action when complete
  - Green/completed state after claiming
- Locked "upcoming quests" row — always visible, never accessible until unlocked
- Weekly reset countdown chip
- Current quest examples: log every day this week, stay under budget, spend in 5+ categories, early morning logging, frugal spend percentage goal

---

### Page 4: Leaderboard

**Purpose:** The social retention surface. Makes private progress publicly visible and competitive.

**Current features:**
- League tier system tied to XP progression (Bronze → Silver → Gold → Emerald → Sapphire → Amethyst → Diamond)
- Three-tier display: current tier, next tier (preview), tier after that (faded preview) — always see where you're going
- Ranked rows with: rank number, avatar, display name, streak count
- User's own row highlighted and always included regardless of position
- Social activity feed below rankings: "Maria logged 3 expenses · 2h ago", "Carlo hit a 14-day streak!"
- Weekly reset countdown (competition resets every week — no one is permanently behind)
- "Add Friends" CTA when user has few friends (leaderboard needs social graph to work)
- Ranking by consistency (streak → missions completed → quests completed), never by peso amount

---

### Page 5: Profile

**Purpose:** The user's trophy room and public identity. Not a settings page. Viewable by friends.

**Current features:**
- Identity hero: avatar (letter-based, color tied to league tier), level shield badge, display name, level name + number, "Saving since [month year]" seniority marker
- Two modes: own profile (full stats, editable) and friend profile (read-only, Follow/Gift buttons)
- Stats grid: current streak, total XP, badges earned, quests completed
- Badge shelf preview (3–5 most impressive earned badges, link to full achievements)
- Locked badges visible at reduced opacity
- Week activity mini-map (read-only 7-dot row)
- Personal records section: longest streak ever (with date), best week XP (with date), best month saved (with month label) — the date turns these into memories, not just numbers
- Friends list with horizontal scroll (own profile)
- Follow and Gift ₵ actions (on friend profiles)

---

### Page 6: Goals (Savings Tracker)

**Purpose:** Long-term savings goal management. Separate from the weekly expense budget.

**Current features:**
- List of active savings goals
- Each goal card: goal name, saved amount vs. target, progress bar, optional deadline date, "Add contribution" deposit action, completed state when target reached
- Create new goal modal: name, target amount, optional deadline
- Empty state with encouraging prompt
- Connection to savings badges (badge preview teaser visible on the page)
- Savings goal progress contributes to savings-specific achievements

---

### Page 7: AI Chat

**Purpose:** The user's personal budgeting coach, in the form of a conversation with Tigom.

**Current features:**
- Chat interface with Tigom mascot as the conversational AI character
- User messages vs. Tigom messages (differentiated bubbles)
- Typing/thinking indicator
- Suggested prompt chips when chat is empty or idle: budget status check, top spending category, savings tip, goal progress, quest recommendation
- Context-aware responses: Tigom knows the user's current week spending, budget remaining, streak, active quests, savings goals — replies reference specific numbers
- Message input bar
- Friendly offline / unavailable fallback state ("Tigom is taking a nap 😴")
- Warm, casual Filipino-flavored tone in responses

---

### Page 8: Settings

**Purpose:** Utility and configuration. Not a profile page — this is where you manage app behavior, not your identity.

**Current features:**
- Weekly budget editing: current budget display, input to change amount
- Profile info edit: display name, email
- AI weekly email report: opt-in toggle + on-demand "Send me this week's report" button
- Notification preferences
- Account actions: log out, delete account
- App information section
- Dark mode toggle (dark mode stylesheet exists)

---

## Global Shell Elements

These are features that currently span multiple pages. You decide whether they stay global, are consolidated, or are reimagined entirely.

### Resource Bar
Three persistent metric chips currently shown at the top of every authenticated page. The three metrics: streak count (emotional — loss aversion anchor), Sentimos balance (spending agency), and XP level (mastery progression). Each chip taps to open a detail sheet for that metric. These are not just information — they are emotional state indicators. The streak number in particular is the most psychologically loaded element in the entire app. How and where these are displayed is completely up to you.

### Bottom Navigation (Mobile)
Current nav items: Home (Dashboard), Quests, Leaderboard, Profile, and a fifth item (currently Settings/More). You can restructure the nav entirely.

### Expense Logging Flow
The most frequent action in the entire app. Currently: tap category → amount field modal → submit → XP awarded → expense saved. This is the critical path. Every time it gets 10% more frictionless, users log 10% more consistently. You have full creative authority over how logging works — it could be a bottom sheet, a swipe gesture, a floating action button, a single-field input that auto-categorizes, anything. Make it as fast and satisfying as possible.

### Celebration Moments
Currently: level-up triggers a full-screen celebration modal with confetti. Streak milestones fire celebration overlays. Quest completion fires a reward modal. These are earned moments — they should feel significant. You decide what "significant" looks like.

### XP Feedback
Currently: a floating "+5 XP" popup that animates upward after each expense log. The feedback must be immediate and visible. Design it however you want — the behavioral requirement is that the user sees the reward the moment they take the action.

---

## Brand Identity (Starting Point — Reimagine Freely)

The current brand:
- **Primary:** Deep forest green (`#164f33` dark → `#2b8259` mid → lighter greens)
- **Streak/Fire accent:** Orange (`#F97316`) — currently reserved exclusively for streak-related UI
- **Sentimos currency accent:** Teal (`#0D9488`) — currently reserved exclusively for Sentimos/currency
- **XP/Level accent:** Gold (`#EAB308`) — currently reserved exclusively for XP and level UI
- **Typography:** Plus Jakarta Sans (body), Sora (headings, hero numbers)
- **Feel target:** Warm and modern. Not a bank app. Not a children's game. Duolingo's playfulness meets a modern fintech card design, with Filipino cultural warmth layered on top.

You can evolve or completely reinvent the visual identity. The color system exists to carry semantic meaning (each color = one concept) — whatever colors you choose, maintain that semantic clarity.

---

## Reference Apps — Starting Points, Not Limits

Study these. Use tools to visit them live if you have them. Then go beyond them.

- **Duolingo** (duolingo.com) — the primary spiritual reference. Streak mechanics, XP for participation, full-screen level-up moments, week day map nodes, quest cards with progress bars, league tier shields, badge grids with locked states, persistent resource bar. Research both mobile and desktop versions — they differ significantly.
- **Habitica** (habitica.com) — RPG mechanics on habits; badge/achievement grids where locked items are greyed at ~40% opacity
- **Strava** — streak + personal records as memories with dates, achievement trophy categories, activity feed
- **Monzo / Revolut** — subtle financial progress bars inside cards; immediate but non-modal transaction feedback; clean fintech card aesthetics
- **Nike Run Club** — consistent badge shape language; locked achievements as silhouettes
- **Snapchat** — streak as social identity marker, loss aversion without explicit threats
- **Bereal, Finch, Forest, Headspace** — other habit-forming apps worth researching for ideas
- **Any other gamified app you find relevant** — if you discover a mechanic from a game or app that would make SugboCents more compelling, bring it in

When you look at these references, look for: how they handle mobile vs. desktop layout differences, how they make numbers feel emotionally significant, how they visualize progress, how they handle empty states, how they reward actions, and how they create a sense of identity.

---

## What SugboCents Is NOT

These are the lines that define the personality — stay on the right side of them even as you redesign freely:

- **Not a banking app.** No clinical UI, no corporate greens, no "transaction" language
- **Not a children's game.** The gamification is purposeful and earned, not superficial sparkles
- **Not a copy of Duolingo.** Take the psychological hooks but create something that feels Filipino, warm, and distinctly personal
- **Not manipulative.** No countdown timers manufacturing false urgency. No fear-based copy ("You're losing money!"). No dark patterns. Urgency must be real (a genuine streak actually at risk) — not manufactured. The app respects the user.
- **Not incomplete on desktop.** The desktop version is not an afterthought. It is a real layout designed for that context.

---

## Deliverable Expectation

A complete visual redesign of all 8 pages listed above, plus the global shell elements. For each page, deliver:
1. A full layout concept (mobile and desktop)
2. The component system for that page
3. Interaction and animation notes where relevant
4. Copy direction/tone

The redesign should feel like a coherent, polished product that a Filipino student would open every day and not want to put down — because every interaction is satisfying, every reward feels earned, and the app genuinely feels like it understands them.

Use every tool at your disposal. Research live. Reference boldly. Design without limits.
