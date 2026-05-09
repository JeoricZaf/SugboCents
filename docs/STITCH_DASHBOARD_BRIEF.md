# SugboCents — Dashboard Components Brief

> **For:** Stitch AI UI redesign
> **Page:** `dashboard.html` — the primary screen users see every time they open the app
> **Design freely.** This document only describes what each component is and what data it shows. All visual decisions are yours.

---

## What the Dashboard Is

The dashboard is the most important page in the app. Every session starts here. It is a **daily action hub** — the user comes here to log expenses, check their budget, and see their gamification progress. It is not a stats or reports page.

We are a gamified personal finance app for Filipino students and young professionals. Think of apps like Duolingo but for building budgeting habits. Design with that energy.

---

## Navigation Context (Not Part of the Redesign)

- **Desktop:** Collapsible left sidebar linking to: Dashboard, Activity, Quests, Leaderboard, Profile, Goals, Sugbo AI. User avatar at the bottom links to Settings.
- **Mobile:** 5-tab bottom navigation: Dashboard, Activity, Goals, Leaderboard, Profile.
- **Mascot FAB:** A floating button featuring the Tigom mascot. Always visible. Its expression changes based on budget health. Tapping opens the AI chat.

---

## Components (Top to Bottom)

---

### 1. Persistent Resource Bar

Three tappable chips always visible at the top of every authenticated page:

- **Streak chip** — shows the user's current consecutive-day streak count (e.g., 🔥 12). Has a visually distinct "at risk" state when the user hasn't logged today and the day is getting late.
- **Sentimos chip** — shows the user's Sentimos (₵) balance. Sentimos is the in-app virtual currency earned through good financial behavior.
- **Level chip** — shows the user's current XP level number (e.g., Lv. 4).

Each chip taps to open a bottom sheet with more detail.

---

### 2. Identity / XP Hero

The user's gamification identity, shown at the top of the main content area.

- **Level name** — the name tied to the user's current level (e.g., "Rookie Saver", "Budget Keeper", "Wise Spender", "Savings Pro", "Budget Legend")
- **Level number** — current level number (e.g., "Lv. 4")
- **Streak** — the user's current consecutive-day logging streak count with a flame icon
- **XP progress bar** — how far the user is toward the next level
- **XP labels** — current XP total on one side; progress toward next level or a motivational nudge on the other (e.g., "160 XP to Level 5")

---

### 3. Budget Card

The financial core of the page.

- **Remaining amount** — how much of the weekly budget is left (e.g., ₱1,200.00). The primary number on the page.
- **Spent summary** — how much has been spent vs. the total budget (e.g., "₱800 of ₱2,000 spent")
- **Budget progress indicator** — shows what percentage of the budget has been used
- **Status labels** — percentage used and number of days remaining in the week; week date range
- **Edit budget shortcut** — a button linking to Settings to change the weekly budget amount

The card has urgency states that escalate as budget usage increases (healthy → caution → warning → danger). It is tied to the Tigom mascot mood.

---

### 4. Budget Pace Indicator

A single-line status element near the budget card.

Tells the user whether their spending rate is ahead of pace, on track, or over pace compared to their daily average target. Four states:
- Ahead of pace (spending less than average daily target)
- On track
- Above pace (spending more than daily target)
- Over budget

---

### 5. Daily Mission Card

A card reflecting the user's logging status for today. Its content and urgency changes based on state:

- **No streak yet** — prompts the user to log their first expense today. CTA button: "Log Now"
- **In progress** — user has logged today and budget is healthy. Positive reinforcement message.
- **At risk** — user has an active streak but has not logged today, and it's getting late. Urgency message to protect the streak.
- **Perfect** — user has logged today AND is under budget. Celebratory state.

---

### 6. Quick-Add Expense Shortcuts

A grid of user-created one-tap shortcuts for their most common expenses.

Each shortcut tile shows:
- An emoji representing the expense
- A label (e.g., "Jeepney", "Coffee", "Lunch")
- A pre-set amount (e.g., ₱18, ₱75, ₱120)
- An XP reward indicator (shows a bonus amount on the first log of the day)
- An options button (⋯) to edit or delete the shortcut

Tapping a tile instantly logs that expense, awards XP, shows a floating XP popup, and updates the budget in real time.

An "Add +" tile is always the last in the grid — opens a modal to create a new shortcut.

**Empty state:** When no shortcuts exist, pre-filled suggestion chips appear (e.g., Jeepney, Food, Load, Laundry) to help new users get started quickly.

---

### 7. One-Time Expense Log Button

A secondary action below the shortcuts grid for logging an expense that doesn't have a saved shortcut.

Shows a label ("Log a one-time expense") and an XP reward indicator.

Tapping opens a modal with: category picker (10 categories), amount field, optional note.

---

### 8. Next Milestone / Badge Teaser

A card showing the user the next achievement badge they are closest to unlocking.

- Badge icon and name (e.g., "Budget Regular")
- Progress toward unlock (e.g., "18 / 25 expenses logged")
- A motivational line (e.g., "Just 7 more to go!")
- A **"Claim badge"** button that appears only once the condition is met — the user must actively tap to collect the badge and its XP reward

This always shows the most achievable next badge, not a distant one.

---

### 9. Recent Expenses

A short list of the most recently logged expenses.

Each row shows:
- Category emoji and label
- Amount
- Relative timestamp (e.g., "2 min ago", "3 hr ago")
- Optional note

Supports swipe-to-delete with a brief undo window (4 seconds to cancel).

Footer: "View all →" link to the Activity page.

**Empty state:** Message prompting the user to log their first expense.

---

### 10. This Week Stats Block

A glanceable weekly summary. Does not replace the full Stats page — just a quick snapshot.

- **vs. Last week** — a one-line comparison showing whether the user has spent more or less than they had at this point last week
- **Daily spend chart** — 7 data points (Mon–Sun) showing spending per day this week. Today is distinguished from past days. Days with no spending are shown as empty.
- **Top spending categories** — the top 2–3 categories for the week, each showing label, total amount, and percentage of budget
- **Week status** — a small indicator showing the overall week state (on track, over budget, perfect week, etc.)
- **"See full stats" link** — navigates to the Stats page. The label changes contextually based on the week state.

---

### 11. Leaderboard Widget

A compact preview of the friends leaderboard, embedded on the dashboard.

- User's current rank among friends
- Weekly reset countdown (e.g., "Resets in 3 days")
- "Just ahead of you" callout — the one friend ranked just above the user
- Top 3–5 friend rows: rank, avatar, name, streak count
- User's own row is always shown, even if ranked last
- "See Full Leaderboard →" link

**Empty state:** Prompt to add friends when none exist yet.

---

## Global Overlays (Triggered From the Dashboard)

### Floating XP + Sentimos Popups
After logging an expense, two small popups briefly appear:
- "+N XP" — confirms XP earned
- "+₵ N" — confirms Sentimos earned

Both fade out quickly and are non-blocking.

### Level-Up Celebration Modal
When the user levels up, a full-screen overlay appears showing the new level name and number. The user must tap to dismiss it. It is a deliberate, earned moment — not a toast or a banner.

### Tigom Mascot FAB
A floating button showing the mascot. Expression changes based on budget health:
- Happy — under 30% of budget used
- Neutral — 30–64% used
- Worried — 65–89% used
- Alarmed — 90%+ used
- Celebrating — immediately after a level-up (briefly)

Tapping opens the AI chat panel.
