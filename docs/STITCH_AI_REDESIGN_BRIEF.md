# SugboCents — UI Redesign Brief for Stitch AI

> **Purpose:** This document gives a full feature-accurate overview of SugboCents so you can create a complete visual redesign of its core pages. Read everything before you start designing. Prioritize creativity — this is not a spec for implementation, it is a creative brief. Design freely.

---

## What Is SugboCents?

**SugboCents** is a **gamified personal finance app** built specifically for **Filipino students and young professionals**. Its core mission is to help users build better budgeting habits by making expense tracking feel rewarding and addictive — the way Duolingo makes language learning feel like a game you don't want to stop playing.

The currency is **Philippine Peso (₱)**. The app has a virtual in-app currency called **Sentimos (₵)** that users earn through good financial behavior and spend in a cosmetic shop.

The app is a **Progressive Web App (PWA)** — it runs in the browser, no app store required. It is designed primarily for **mobile** (phones first) but must work on desktop.

---

## The Gamification Philosophy — This Is Everything

We are building a gamified app in the same spirit as **Duolingo**, but for personal finance. We have studied gamification deeply and our design is rooted in three psychological mechanisms:

### 1. The Craving Machine (Unpredictable Rewards)
Not every reward is predictable. Users earn XP every time they log an expense, but bonus XP events fire at unpredictable moments — first log of the day, a perfect week, a streak milestone. The brain stays in a subtle chase state. This is the same mechanism behind Duolingo's streak, Snapchat's snaps, and League of Legends matchmaking. One central metric (streak) that the user can obsess over.

### 2. The Infinite Game (Loss Aversion)
A streak is a thread. Break it once and the count resets to zero. Humans feel the pain of losing 2× more intensely than the pleasure of gaining. Peloton used this — accumulated lifetime metrics that never cap out. Our streak system uses the same psychology. There is no "done" state — tiered badges always have another tier, quests reset every Monday, the leaderboard resets weekly.

### 3. The Invisible Scoreboard (Social Identity)
A user can quit privately. But when their progress is visible to friends — on a public profile, a leaderboard — quitting stops being about losing a streak and becomes publicly admitting they stopped. The leaderboard and profile page serve this function.

### Reference Apps We Draw Inspiration From
- **Duolingo** — streak chip always visible, XP for participation not perfection, full-screen level-up celebrations, week day map nodes, quest cards with progress bars, league tier shields, badge grids with locked/unlocked states
- **Habitica** — RPG mechanics layered on tasks; badge grid where locked items are greyed at 40% opacity with a lock icon overlay
- **Strava** — streak chip in profile header as a simple number with a flame icon; trophy categories
- **Monzo / Revolut** — subtle financial progress indicators inside cards, not gamey; immediate but non-intrusive feedback
- **Nike Run Club** — consistent badge shape language; locked achievements as silhouettes

We want to **add our own spin**. We are a Filipino app — there is cultural warmth, personality, and local character we want to inject. We have a mascot named **Tigom** (also called Sugbo) — a small creature whose emotional state mirrors the user's budget health. Think of Duo the Duolingo owl, but Filipino-flavored and budget-themed.

---

## Brand Identity (Current — You May Reimagine the Feel, Keep the Core)

- **Brand color:** Deep forest green (`#164f33` darkest → `#2b8259` mid → lighter greens)
- **Accent — Streak/Fire:** Orange (`#F97316`) — reserved exclusively for streak
- **Accent — Sentimos currency:** Teal (`#0D9488`) — reserved exclusively for Sentimos ₵
- **Accent — XP/Level:** Gold (`#EAB308`) — reserved exclusively for XP and levels
- **Typography:** Plus Jakarta Sans (body), Sora (headings and hero numbers)
- **Feel:** Warm, modern, not clinical. We are NOT a bank app. We are a habit game that happens to track money. Think Duolingo's playfulness meets a modern fintech card design.

---

## Global Shell Elements (Appear on Every Authenticated Page)

Before covering individual pages, here are the components that must exist on every page after login:

### 1. The Resource Bar (Top Persistent Bar)
Three chips always visible at the top of every authenticated page. This is non-negotiable — it is the emotional heartbeat of the app:
- **🔥 Streak chip** — shows the user's current consecutive-day streak count. Orange when active, grey when streak is zero. Pulses when the streak is "at risk" (user hasn't logged yet and it's getting late). Tapping opens a Streak Detail bottom sheet.
- **₵ Sentimos chip** — shows the user's Sentimos (virtual currency) balance. Teal color. Tapping opens a Sentimos Balance bottom sheet with transaction history.
- **⚡ Level chip** — shows current XP level number (e.g., "Lv. 4"). Gold color. Tapping opens an XP Progress bottom sheet showing level name, progress bar, and recent XP events.

These three chips update live after any action. The streak number is the most emotionally loaded element in the entire app.

### 2. Bottom Navigation Bar
Mobile navigation across the core pages. The current pages accessible from nav:
- Home (Dashboard)
- Quests
- Leaderboard
- Profile
- More / Settings

### 3. Mascot FAB (Floating Action Button)
A floating button featuring **Tigom** the mascot. Always visible on the dashboard (and optionally other pages). Its face/expression changes based on the user's budget usage:
- **Happy** — spent less than 30% of budget
- **Neutral** — spent 30–64%
- **Worried** — spent 65–89%
- **Alarmed** — spent 90% or more
- **Celebrating** — just leveled up (lasts 8 seconds)

Tapping it opens the AI chat as a slide-in panel or leads to `chat.html`.

---

## Pages to Redesign

---

### PAGE 1: Dashboard (`dashboard.html`)

**The most important page. Primary user surface. Users land here every time they open the app.**

#### What users come here to do:
1. See how much of their weekly budget they've spent vs. how much remains
2. Log a new expense quickly (the most frequent action)
3. See their streak and gamification progress
4. Feel motivated to keep their streak alive

#### Key Features & Components:

**A. Identity Hero (top of dashboard)**
Shows who the user is at a glance:
- User's first name and greeting (time-aware — "Good morning", "Hey Maria")
- Current streak (large hero number with flame icon)
- Sentimos balance (₵)
- XP level and progress bar toward next level
- Level name (e.g., "Budget Keeper", "Wise Spender", "Budget Legend")

**B. Budget Progress Card**
The financial core of the app:
- Total weekly budget (e.g., ₱2,000)
- Amount spent this week
- Remaining amount
- Visual progress indicator (some kind of bar or ring showing % used)
- Percentage spent
- The card changes visual urgency as the user approaches their limit — calm at 30%, concerned at 65%, alarming at 90%+. This is tied to Tigom's mood.

**C. Quick-Add Expense Buttons**
A row of one-tap emoji category shortcuts for fast expense logging. Categories:
`Transport 🚌`, `Food 🍔`, `Groceries 🛒`, `Education 📚`, `Shopping 🛍️`, `Health 💊`, `Entertainment 🎮`, `Utilities 💡`, `Personal Care 💄`, `Others 📦`

Tapping a category opens a minimal modal with just an amount field and optional note field. Submitting logs the expense, awards XP, and closes the modal.

**D. Weekly Day Map (7-node streak path)**
A Duolingo-style game map showing this week's 7 days as nodes:
- Completed days: filled green with a checkmark
- Today already logged: glowing green
- Today not yet logged: pulsing orange (urgent state — "log now")
- Future days: grey
- Day 7 (Sunday): a reward chest node — if all 7 days are logged, a celebration fires for "+200 XP + ₵50 Perfect Week!"

This replaces a flat "Today's Mission" card. A path feels like a journey; a list feels like a chore.

**E. Today's Mission / Active Quest Preview**
A card showing the user's current weekly quest progress. Example: "Log expenses 5 out of 7 days → ₵50 reward." Shows a progress bar. Tapping expands or navigates to the Quests page.

**F. Recent Expenses List**
The last 3–5 expenses logged. Category icon, amount, category label, time/date. A "View All" link goes to the Activity page.

**G. Tigom Mascot Widget (mini)**
A small version of the mascot in a card or bubble form showing the mascot's current mood expression and a short contextual message based on budget health. E.g., "You're doing great! 🎉" at 20% spent, or "Careful! Budget getting tight 😟" at 80%.

#### XP System:
- Every expense logged: +5 XP (capped at +25 XP/day from logging)
- Stay under daily budget: +10 XP
- Complete a quest: +100–200 XP
- Claim a badge: +15 XP
- Level-up triggers a full-screen celebration modal with confetti and the level name

---

### PAGE 2: Quests (`quests.html`)

**The weekly challenge system. Always gives the user a specific goal to work toward.**

#### What this page is:
A page showing the user's current weekly quest and their progress. Quests reset every Monday. There is always at least one quest active — users are never "done."

#### Key Features & Components:

**A. Quest Hero Banner**
A full-width hero section at the top featuring Tigom holding a coin bag or treasure chest. Brand color gradient background (with option for seasonal variants — purple "Power Week" on payday weeks). Text: "This Week's Quest" and "Complete quests to earn XP + ₵!". Decorative sparkle elements.

**B. Active Quest Card(s)**
Each quest card has a strict anatomy (Duolingo-style):
- Left: colored icon indicating quest type (⚡ bolt for logging consistency, 🎯 target for budget adherence, 🛡 shield for no-overspend days, 🕐 clock for time-based quests)
- Center: quest title and a tall progress bar (20px height) with the count centered inside it (e.g., "3 / 5 days")
  - Bar is gold while in progress, turns green when complete
  - The label is INSIDE the bar, not below it
- Right: reward pill showing the ₵ reward amount (e.g., ₵50), which becomes "✓ Claimed" after collection

**C. Locked Future Quests Row**
A "More quests unlock soon" row showing blurred/locked quest cards. This ensures there is always something coming — the app never feels fully explored.

**D. Weekly Reset Countdown**
A small chip showing "Resets in 3 days" with a timer icon. Creates urgency without being aggressive.

**E. Quest Completion State**
When a quest is complete, the progress bar turns green, the reward pill glows, and the user taps "Claim" to trigger a short celebration with a "+₵ N" popup.

#### Example Quests (auto-assigned each Monday):
- **Logging Habit** — log at least one expense every day this week (7/7) → 200 XP + ₵50
- **Budget Warrior** — stay under budget all 7 days → 175 XP + ₵50
- **Frugal Run** — spend 50% or less of your weekly budget → 175 XP + ₵50
- **Category Explorer** — log expenses in 5 different categories → 100 XP + ₵25
- **Early Bird** — log your first expense before noon, 3 days in a row → 125 XP + ₵30

---

### PAGE 3: Leaderboard (`leaderboard.html`)

**The social retention hook. Makes private progress publicly visible to friends.**

#### What this page is:
A friends-only ranking system. Users are ranked by consistency metrics (not peso amounts — ranking by money would disadvantage lower-income users and destroy fairness). Ranking is normalized: streak count → missions completed → quests completed. Anyone can reach #1 regardless of how much money they have.

#### Key Features & Components:

**A. League Tier System**
At the top of the page, the user's current league tier is shown as a shield badge. The next tier is shown smaller, slightly faded. The tier after that even smaller and more faded. This is the "desire by progression" pattern — you always see the next tier just out of reach.

League tiers (tied to XP levels):
1. **Rookie Saver** — Bronze shield
2. **Budget Keeper** — Silver shield
3. **Spending Scout** — Gold shield
4. **Frugal Fighter** — Emerald shield
5. **Savings Sage** — Sapphire shield
6. **Wealth Warden** — Amethyst shield
7. **Budget Legend** — Diamond shield (glowing, icy blue)

The shield resets weekly — users compete within their league, can be promoted or demoted.

**B. Rank Rows**
Each row shows:
- Rank number (1, 2, 3…)
- Avatar (colored initial circle; avatar background color reflects their league tier)
- Display name
- Flame + streak count chip on the right (e.g., "🔥 14")
- Your own row is highlighted (green highlight, marker arrow) and always included even if you're last

**C. Activity Feed**
Below the rankings, a social activity feed:
- "Maria logged 3 expenses · 2h ago"
- "Carlo hit a 14-day streak! 🔥 🎉"
- "Ana completed a quest"

This makes other users feel alive — the leaderboard is not just a static scoreboard.

**D. Empty State / Add Friends CTA**
When the user has fewer than 5 friends, a CTA appears: "+ Add Friends" — because the leaderboard is meaningless without others to compete with.

**E. Weekly Reset Timer**
"Resets in 3 days" chip. The weekly reset creates a recurring competitive event — you are never permanently behind, next week is a fresh start.

---

### PAGE 4: Profile (`profile.html`)

**The trophy room. The user's public identity. NOT a settings page.**

#### What this page is:
A social identity surface that aggregates every gamification metric in one place. The profile is viewable by friends. It tells the story of the user's progress: how long they've been saving, what level they are, what badges they've earned.

#### Two modes:
1. **Own profile** — shows all stats, editable display name, shows Sentimos balance, shows friend list
2. **Friend's profile** — read-only, shows public stats, "Follow" and "Gift ₵" buttons, hides Sentimos balance

#### Key Features & Components:

**A. Identity Hero**
- Large avatar (80px colored initial circle — background color reflects XP league tier, so it changes as the user levels up — a form of visible progression even in their identity)
- Level shield badge overlaid on the avatar (bottom-right corner)
- Display name (bold, large)
- Level name + number (e.g., "Budget Keeper · Level 4")
- "Saving since February 2026" — the join date framed as a seniority marker, not just metadata
- Follow / Gift ₵ buttons (on friend profiles)

**B. Stats Grid (2×2)**
Four metric cards:
- 🔥 Current Streak (number)
- ⚡ Total XP earned
- 🏅 Badges earned (count)
- 📅 Quests completed (count)

**C. Badge Shelf**
A horizontal row showing the 3–5 most recently earned or most impressive badges. A "View all →" link goes to the achievements page. Locked badges are shown greyed at 40% opacity with a lock icon — same visual treatment as Habitica.

**D. Week Activity Mini-Map**
A compact 7-dot row (like the dashboard week map, but read-only) showing which days this week the user logged. Shows at a glance: "they logged 4 of 7 days so far."

**E. Personal Records Section**
Three cards, horizontally scrollable:
- 🔥 Longest Streak (N days, date achieved — "Apr 30, 2026")
- ⚡ Best Week XP (N XP, week of date)
- 💰 Best Month Saved (₱N,NNN, month name)

The date is the most powerful detail — "Longest Streak 30, Apr 30, 2026" makes it a **memory**, not just a number. Duolingo does this exact thing.

**F. Friends Section (Own Profile Only)**
A horizontal scroll row of friend avatars. Tapping a friend navigates to their profile. "+ Find Friends" button at the end.

---

### PAGE 5: Activity (`activity.html`)

**The full expense history and gamification event feed.**

#### What this page is:
A combined view of two things:
1. The full list of logged expenses (every transaction the user has ever entered)
2. A "gamification activity feed" — a log of meaningful events: badge unlocked, level up, streak milestone, quest completed

#### Key Features & Components:

**A. Tab Bar / Toggle**
Two tabs: "Expenses" and "Activity". The user can switch between the raw financial log and the gamification event stream.

**B. Expenses Tab**
A chronological list of every expense ever logged. Each row:
- Category emoji/icon (e.g., 🍔 Food)
- Category label
- Amount (large, bold, right-aligned — e.g., ₱ 85.00)
- Note (if any — small muted text)
- Timestamp (relative: "2 hours ago", absolute on older entries)
- Swipe-to-delete gesture (or a delete option)

Grouped by date (Today, Yesterday, May 5, May 4, etc.) for scanability.

**C. Activity / Gamification Feed Tab**
A chronological log of gamification events:
- "🔥 You hit a 7-day streak!" with a streak shield icon
- "🏅 Badge unlocked: Budget Regular" with the badge icon
- "⚡ You reached Level 3 — Budget Keeper!"
- "✅ Quest complete: Logging Habit — +₵50 earned"
- "💸 You logged 5 expenses today (+25 XP)"

Each event has an icon, a description, and a timestamp. Milestone events (level-ups, streak milestones) have a more prominent visual treatment — larger, with a colored background.

**D. Weekly Summary Banner**
At the top, a summary card for the current week:
- Total spent this week vs. budget
- Number of expenses logged
- XP earned this week
- Streak status

**E. Filtering / Search**
Optional filter chips to filter expenses by category. Search bar to find a specific expense by note or category.

---

### PAGE 6: Goals (`tigom.html`)

**A dedicated savings goal tracker. Separate from the weekly budget.**

#### What this page is:
This is purely a **savings goals management page**. The mascot (Tigom) lives as a floating button on the dashboard and other pages — this page is not the mascot's home. Here, users set up and track explicit long-term savings targets like "Save ₱5,000 for a trip to Palawan" or "Buy a new laptop." These goals are entirely separate from the weekly expense budget.

#### Key Features & Components:

**A. Page Header**
Simple header: section label ("Savings") and page title ("Goals"). Clean and purposeful — this is a functional page, not a character showcase.

**B. Savings Goals List**
The main content: a list of all the user's active savings goals. Each goal card shows:
- Goal name (e.g., "Trip to Palawan", "New Laptop", "Emergency Fund")
- Saved amount so far vs. target amount (e.g., ₱3,200 / ₱15,000)
- A progress bar showing percentage toward the goal
- Optional target/deadline date (e.g., "🗓 Target: December 2026")
- A "✅ Done" badge when the goal is fully reached
- An "Add ₱" or deposit button to log a savings contribution

**C. Add New Goal Button**
A prominent CTA (floating or pinned at the bottom) to create a new savings goal. Opens a modal with fields for: goal name, target amount, optional deadline date.

**D. Empty State**
When the user has no goals yet, a friendly empty state with a prompt to create their first goal. Encouraging copy — "What are you saving for?" — rather than a blank screen.

**E. Badge Preview (Savings Badges)**
A small teaser section showing savings-related achievements the user can unlock: "Saver Seed 🌱 — Log your first savings contribution." Connects the goals feature to the wider gamification system and gives users an extra reason to start.

---

### PAGE 7: AI Chat (`chat.html`)

**The AI mascot conversation interface. The user's personal budgeting coach.**

#### What this page is:
A chat interface where the user talks to Tigom (the mascot) as an AI character. Tigom responds in a warm, encouraging Filipino tone with short 2–3 sentence replies. It's a personal finance coach that knows your data.

The backend uses Groq's `llama-3.1-8b-instant` model via Firebase Cloud Functions. The last 6 messages are kept for context. Rate limited to 30 requests/hour.

#### Key Features & Components:

**A. Chat Header**
- Tigom avatar (the mascot illustration, small — same mood state as current budget)
- Name: "Tigom · AI Coach"
- Subtitle: "Your personal budgeting buddy"
- Online/active indicator

**B. Chat Message Bubbles**
Standard chat layout:
- User messages: right-aligned, brand green bubble
- Tigom messages: left-aligned, light grey/white bubble with Tigom avatar on the left
- Timestamps between message groups
- Typing indicator (animated dots) while Tigom is "thinking"

**C. Suggested Prompts / Quick Chips**
When the chat is empty or after a long pause, show suggested conversation starters as tappable chips:
- "How's my budget looking this week?"
- "What's my biggest spending category?"
- "Give me a tip to save more."
- "How close am I to my savings goal?"
- "What quests should I focus on?"

These reduce friction — users don't need to know what to ask.

**D. Message Input Bar**
A text input at the bottom with a send button. Standard chat input UX. Tigom's avatar is shown alongside the input to reinforce the conversation context.

**E. Context Awareness**
Tigom has access to (and references in its replies): current week's spending, budget remaining, current streak, active quests, and savings goals. So a reply to "How am I doing?" would be specific: "You've spent ₱1,200 of your ₱2,000 budget — 60% gone with 3 days left in the week. Your streak is at 8 days — keep going! 🔥"

**F. Error / Unavailable State**
If the AI backend is unavailable, Tigom shows a friendly offline state: "I'm taking a quick nap 😴 — check back in a moment!" The page does not crash or show a generic error.

---

## Summary of Cross-Page Consistency Rules

These apply across all redesigned pages:

1. **The Resource Bar** (🔥 streak, ₵ Sentimos, ⚡ Level) must appear at the top of every authenticated page. It updates live.

2. **Color coding is strict:**
   - Orange `#F97316` = streak / fire / urgency. Used nowhere else.
   - Teal `#0D9488` = Sentimos currency. Used nowhere else.
   - Gold `#EAB308` = XP and levels. Used nowhere else.
   - Brand green = success, completion, SugboCents identity.

3. **Numbers are heroes.** The streak count, level number, and Sentimos balance should always be the largest element on the chips and cards where they appear.

4. **Locked/unlocked visual treatment:** Locked badges, quests, and features are always visible but greyed at ~40% opacity with a lock icon overlay. Never hidden — the user must see what they can't have yet.

5. **Celebration moments** (level-up, streak milestone, perfect week) are **full-screen moments** — not toasts, not small notifications. A full-screen card with animation that the user must actively dismiss. These are earned.

6. **Filipino warmth.** Copy tone is warm, casual, encouraging — like a friend, not a financial advisor. Contractions, emojis in messaging contexts (not in badge grids), and celebratory language. The mascot Tigom is the personality anchor.

7. **Mobile-first.** Primary use case is a phone in portrait orientation. Every layout must work on a 390px viewport. Desktop/tablet is secondary.

---

## What We Are NOT

- We are not a banking app or a budgeting spreadsheet. We do not want clinical/corporate design.
- We are not a game for children. The gamification is purposeful — it serves real financial behavior change.
- We are not trying to replicate Duolingo exactly. We want to take Duolingo's psychological hooks and create something that feels distinctly Filipino, warm, and personal.
- We do not use dark patterns — no countdown timers forcing action, no fear-based messaging, no "you're losing money!" shock copy. The urgency is earned (a real streak at risk), not manufactured.

---

*All features described are either fully implemented or actively being built. Design freely — this is a creative brief, not a technical constraints doc.*
