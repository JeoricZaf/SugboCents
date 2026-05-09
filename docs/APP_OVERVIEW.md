# SugboCents — App Overview

> **Last updated:** May 6, 2026

---

## What Is SugboCents?

**SugboCents** is a gamified personal finance Progressive Web App (PWA) built for Filipino students and young professionals. It helps users build better budgeting habits through weekly expense tracking wrapped in a gamification loop — XP, levels, streaks, quests, badges, and an AI mascot. Currency is PHP (₱).

The app runs entirely in the browser from static HTML files with no build step required. A Firebase backend handles authentication and optional AI/email features.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript — no frameworks |
| Styling | Tailwind CSS (CDN) + `css/style.css` custom properties |
| Storage | `localStorage` abstracted via `window.StorageAPI` (`js/storage.js`) |
| Authentication | Firebase Auth (email/password) with local fallback |
| AI / Backend | Firebase Cloud Functions (`functions/index.js`) + Groq LLM API (free tier) |
| Database (Sprint 3) | Firebase Firestore |
| PWA | `manifest.json` + Service Worker (`sw.js`) — cache-first shell strategy |
| Deployment | Firebase Hosting |

### Architecture Rules
- **Separate HTML pages per route** — not a SPA; each major feature is its own `.html` file.
- **StorageAPI only** — UI code never calls `localStorage` directly. Every read/write goes through `window.StorageAPI`.
- **IIFE pattern** — every JS file is a self-contained immediately-invoked function expression; no ES modules.
- **No build tools** — open an HTML file in a browser and it works.
- **Graceful degradation** — AI/email features fail silently if the backend is unavailable.

---

## Pages & Routes

| Page | File | `data-page` | Auth | Purpose |
|---|---|---|---|---|
| Auth Router | `index.html` | — | — | Checks session → redirects to dashboard or landing |
| Landing | `landing.html` | `landing` | Public | Marketing hero, features, CTA |
| Login | `login.html` | `login` | Guest-only | Email/password sign-in |
| Register | `register.html` | `register` | Guest-only | Sign-up + first/last name collection |
| Dashboard | `dashboard.html` | `dashboard` | Protected | Primary surface — budget card, quick-add expenses, recent list, streak, XP bar, Today's Mission |
| Settings | `settings.html` | `settings` | Protected | Edit weekly budget, logout, AI email opt-in toggle |
| Activity | `activity.html` | `activity` | Protected | Recent expense list + gamification activity feed |
| Stats | `stats.html` | `stats` | Protected | Spending charts, analytics, XP/streak history, badge shelf |
| Achievements | `achievements.html` | `achievements` | Protected | Badge gallery with unlock details |
| Quests | `quests.html` | `quests` | Protected | Weekly quest overview and progress (Sprint 3) |
| Leaderboard | `leaderboard.html` | `leaderboard` | Protected | Friends-only rankings by streak, missions, XP |
| Profile | `profile.html` | `profile` | Protected | Public profile — level, streak, badges, Sentimos balance |
| Shop | `shop.html` | `shop` | Protected | Spend Sentimos on cosmetics and streak freezes |
| Chat | `chat.html` | `chat` | Protected | AI mascot conversation interface |
| Goals / Tigom | `tigom.html` | `tigom` | Protected | Mascot detail view, emotional state, savings goals |

**Route protection** lives in `js/app.js`:
- `data-protected="true"` → redirects to `login.html` if no session
- `data-guest-only="true"` → redirects to `dashboard.html` if already logged in

---

## Data Model

### User
```
id, firstName, lastName, email, weeklyBudget,
xp, level, unlockedAchievements[], notifiedAchievements[],
currentStreak, streakLastDate, dailyMissionCount,
currentQuestId, questsCompleted, weeklyQuestProgress{},
sentimosBalance, streakFreezeCount,
provider ("firebase"|"local"), createdAt, dailyXpLog{}
```

### Expense
```
id, userId, amount (PHP ₱), category, timestamp (ISO), note?, shortcutId?
```

### Session
```
userId, createdAt, provider ("firebase"|"local")
```

### Expense Categories (10)
`transport`, `food`, `groceries`, `education`, `shopping`, `health`, `entertainment`, `utilities`, `personal_care`, `others`

---

## Gamification System

### XP & Levels

| Level | Name | XP Required |
|---|---|---|
| 1 | Rookie Saver | 0 |
| 2 | Budget Aware | 50 |
| 3 | Money Smart | 150 |
| 4 | Week Crusher | 350 |
| 5 | Streak Hunter | 700 |
| 6 | Finance Pro | 1,200 |
| 7 | Budget Legend | 2,000 |

**XP sources:** log expense (+5 XP, capped 25/day), stay under daily budget (+10 XP), complete quest (+100–200 XP), claim badge notification (+15 XP).

Level-up triggers a full-screen celebration modal via `GamificationUI.notifyLevelUp()`.

### Streaks & Loss Aversion
- Streak increments when the user logs at least one expense per calendar day.
- **At-risk state:** if the user has a streak but hasn't logged today, the Today's Mission card turns orange and pulses.
- **Streak freeze (Sprint 3):** spend Sentimos to preserve a streak on a missed day.

### Today's Mission Card States

| State | Trigger | Visual |
|---|---|---|
| `none` | No log today, streak = 0 | Grey — "Start your day 🎯" |
| `in-progress` | Logged today, budget OK | Yellow — "On track! ⭐" |
| `at-risk` | Streak > 0 and NO log today | Orange + pulse — "Log now to protect your streak! 🔥" |
| `perfect` | Logged today AND under budget | Brand green — "Perfect day! ✅" |

### Badges & Achievements (40+)

| Series | Tiers |
|---|---|
| Expense Logging | 1 → 5 → 25 → 100 logs |
| Streak | 3-day → 7-day → 30-day |
| Streak Diamonds | 7 → 42 → 100 days (unlock cosmetics) |
| Missions | 5 → 25 → 100 → 365 completions |
| Quests | 1 → 5 → quest streak |
| Budget | Under-budget week, frugal week, 5-week streak |
| Goals | Goal setter, goal achiever |
| Level | Reach Level 2, reach Level 5 |

Badge unlocks queue a notification modal (+15 XP claim). Batch trophy animation fires if 3+ unlock simultaneously.

### Weekly Quests (Sprint 3 Phase 1)
12 quest templates auto-assigned each Monday. Examples:
- **Logging Habit** — log 7 days → 200 XP + 50 Sentimos
- **Budget Warrior** — stay under budget all 7 days → 175 XP + 50 Sentimos
- **Frugal Run** — spend ≤50% of budget → 175 XP + 50 Sentimos

Progress stored in `user.weeklyQuestProgress` per condition type.

### Sentimos Currency (Sprint 3 Phase 4 — Firestore)
- Earned by completing quests and reaching milestones.
- Spent in the Shop on cosmetics (animated badges, themes) and streak freezes.
- Balance syncs via Firestore so it persists across devices.

### Leaderboard & Social (Sprint 3 Phase 4)
- Sorted by: streak count → missions completed → XP (tiebreaker).
- Friends-only visibility (no public anonymous comparisons).
- Friend requests managed via the Profile page.

### Mascot — Tigom / Sugbo
Floating action button whose mood reflects the user's current budget usage:

| Mood | Condition |
|---|---|
| 😊 Happy | Spent < 30% |
| 😐 Neutral | 30–64% |
| 😟 Worried | 65–89% |
| 😱 Alarmed | ≥ 90% |
| 🎉 Celebrating | After level-up (8 seconds) |

Updates on every `sugbocents:dataChanged` event.

---

## AI Features

### Emoji Auto-Suggest
When a user types a shortcut name and tabs away (`blur`):
1. Checks `SHORTCUT_KEYWORD_MAP` (44 Filipino, Bisaya, and English terms) — instant, no API call.
2. If no local match: calls `functions/emojiSuggest` (Groq LLM, ~30 tokens).
3. Returns `{ emoji, category }` and auto-fills the modal with a ✨ indicator.
4. Falls back silently if the API fails — user can still pick manually.

### AI Chat (Chat page)
- Mascot character: Tigom/Sugbo, warm Filipino tone, 2–3 sentence replies.
- Backend: `functions/chat` endpoint using Groq `llama-3.1-8b-instant`.
- Last 6 messages kept for context window.
- Rate limit: 30 req/hr per IP (server-side).

### AI Wrapped Email (Sprint 3 Phase 5)
- User opts in via Settings toggle.
- On demand (max 5/day), Groq generates a personalized spending insight paragraph.
- Sent via Resend API to the user's registered email.
- Backend endpoint: `functions/sendWrappedEmail` (planned).

---

## Firebase Integration

### Firebase Auth
- Method: email/password.
- Session persistence via `localStorage`; checked on every page load by `app.js`.
- Local fallback available for offline/dev use.

### Cloud Functions (`functions/index.js`)
- `chat` — AI mascot conversation (Groq)
- `emojiSuggest` — emoji/category recommendation (Groq)
- `sendWrappedEmail` — AI-generated weekly email (planned)
- All endpoints share: CORS whitelist, in-memory per-IP rate limiting, `GROQ_API_KEY` Firebase secret.

### Firestore (Sprint 3+)
| Collection | Purpose |
|---|---|
| `users/{userId}` | User profile, Sentimos balance, public profile data |
| `expenses/{userId}/expenses/{expenseId}` | Transaction log |
| `friends/{userId}/friends/{friendId}` | Friend graph |
| `leaderboard/{weekId}/entries/{userId}` | Weekly leaderboard snapshot |

---

## PWA

### manifest.json
- `name`: SugboCents, `short_name`: SugboCents
- `start_url`: `index.html`, `display`: standalone
- `theme_color`: `#1f6b46`, `background_color`: `#f3f7f4`
- Icons: 192×192 and 512×512 PNG at `icons/`

### Service Worker (`sw.js`)
- Cache name: `sugbocents-shell-vN` — **version must bump after every file change**.
- Cache-first strategy for all shell files (HTML, CSS, JS, icons, manifests).
- Registered in `js/app.js` with feature detection.

---

## JavaScript Files

| File | Purpose |
|---|---|
| `js/app.js` | Route protection, bottom nav activation, SW registration |
| `js/storage.js` | **All data persistence** — `window.StorageAPI` (users, expenses, budget, gamification) |
| `js/index-redirect.js` | Auth state check at startup |
| `js/firebase-init.js` | Firebase SDK initialization |
| `js/firebase-auth-service.js` | Firebase Auth wrapper (login/register/logout) |
| `js/firestore-service.js` | Firestore data access (Sprint 3+) |
| `js/auth.js` | Login/Register form logic and validation |
| `js/landing.js` | Landing page animations and photo fallback |
| `js/dashboard.js` | Budget rendering, quick-add, expense list, modal management |
| `js/settings.js` | Budget editing, logout, preference toggles |
| `js/stats.js` | Chart rendering, achievement shelf, analytics |
| `js/activity.js` | Activity feed rendering |
| `js/achievements.js` | Badge gallery and detail views |
| `js/quests.js` | Quest list and progress cards |
| `js/leaderboard.js` | Friends list, ranking sort, friend requests |
| `js/profile.js` | Public profile view — stats, badges, Sentimos |
| `js/shop.js` | Cosmetics and streak-freeze item purchase |
| `js/gamification.js` | XP popup animation, celebration modal, badge notifications |
| `js/mascot.js` | Tigom FAB, emotional state logic, chat panel |
| `js/chat.js` | Chat UI (message rendering, input) |
| `js/chat-ai.js` | Chat API integration (calls `functions/chat`) |
| `js/spending-chart.js` | Chart.js rendering for Stats page |
| `js/dark-mode.js` | Theme toggle and persistence |
| `js/dev-tools.js` | Dev panel — budget math testing, gamification snapshots |
| `js/dashboard-stats.js` | Dashboard-level stats helpers |

---

## CSS Files

| File | Purpose |
|---|---|
| `css/style.css` | Global custom properties, all component styles (buttons, cards, auth, layout) |
| `css/landing.css` | Landing page animations and layout |
| `css/dark-mode.css` | Dark theme overrides |
| `css/mascot.css` | Tigom FAB and chat panel styles |
| `css/spending-chart.css` | Stats page chart styles |
| `css/stats.css` | Achievement shelf and analytics layout |
| `css/tigom.css` | Mascot detail page styles |

---

## Design System

### Brand Colors (CSS custom properties in `css/style.css`)

| Token | Value | Use |
|---|---|---|
| `--brand-900` | `#164f33` | Darkest green |
| `--brand-800` | `#1f6b46` | Primary brand |
| `--brand-700` | `#2b8259` | Interactive elements |
| `--brand-600` | `#3d9968` | Hover states |
| `--brand-500` | `#52b788` | Accent |
| `--bg-mist` | `#f3f7f4` | App background |
| `--text-primary` | `#1a202c` | Body text |
| `--text-muted` | `#718096` | Secondary text |

### Typography
- **Body:** Plus Jakarta Sans (Google Fonts)
- **Landing headings:** Sora (Google Fonts)

### Icon Libraries
- Bootstrap Icons CDN (`bi-*`) — used across most pages
- Inline SVGs — sidebar and bottom nav icons
- Emoji Unicode characters — dashboard quick-add, category indicators

---

## External Dependencies

| Dependency | Source | Purpose |
|---|---|---|
| Tailwind CSS | CDN (JIT) | Utility-first styling |
| Bootstrap Icons v1.11 | CDN | UI icon set |
| Plus Jakarta Sans | Google Fonts | Body font |
| Sora | Google Fonts | Landing headline font |
| Firebase SDK v9+ | CDN | Auth and Firestore |
| Groq API | Cloud Functions | LLM (emoji suggest, chat, email) |
| Resend API | Cloud Functions | Transactional email (planned) |

---

## Key API Surface

### `window.StorageAPI`
```js
// Session & user
getCurrentUser()            // → User object
getSession()                // → Session object
saveUser(user)
logout()

// Expenses
addExpense(amount, category, note, shortcutId)
removeExpense(expenseId)
getExpenses()               // → this week's expenses array
getTotalSpentThisWeek()

// Budget
saveWeeklyBudget(amount)
getWeeklyBudget()
getRemainingBudget()

// Gamification
addXp(amount)
getCurrentStreak()          // → { streak, lastDate }
getXpInfo()                 // → { xp, level, levelName, progressPct, ... }
getAchievements()
unlockAchievement(id)
markAchievementsNotified(ids)
```

### `window.GamificationUI`
```js
showXpPopup(amount, anchorEl)        // Float "+X XP ⚡" above button
showSentimosPopup(amount)            // Float "+X ₵" earned animation
maybeNotifyNewAchievements(ids)      // Queue badge unlock modals
notifyLevelUp(prev, new, name)       // Full-screen celebration modal
queueModal(config)                   // Manage modal display queue
```

---

## Sprint Status

### Sprint 1 — ✅ Complete
Login/Register (Firebase Auth), budget setup, quick-add expenses, dashboard, mobile bottom nav, PWA baseline, XP system, 7 levels, streaks.

### Sprint 2 — ✅ Mostly Complete
Spending charts (`stats.html`), Tigom mascot (state-driven animation), 40+ badges/achievements, AI chat interface. Goals and streak diamond cosmetics are designed but not yet implemented.

### Sprint 3 — 🟢 Starting May 6, 2026

| Phase | Feature | Storage | Status |
|---|---|---|---|
| Phase 1 | Weekly Quests (auto-assign, progress, rewards) | localStorage | Starting |
| Phase 2 | Achievement expansion (tiered unlocks, batch notifications) | localStorage | Planned |
| Phase 4 | Sentimos + Friends + Leaderboard + Public Profiles | Firestore | Planned |
| Phase 5 | AI Wrapped Email (Groq + Resend) | Firestore | Planned |

---

## Known Issues (May 6, 2026)

| Issue | File | Root Cause |
|---|---|---|
| Dev panel (`🔧 Dev`) broken | `js/dev-tools.js` | Duplicate IIFE from botched merge — syntax error at ~line 712 |
| Modal Cancel/Save buttons don't fire | `js/dashboard.js` `initModal()` | Listener registrations dropped during emoji-block insertion |
| +XP popup invisible | `css/style.css` `@keyframes xp-float` | Animation `transform` overwrites centering `translateX(-50%)` on every keyframe |

---

## Key Conventions

1. **Never call `localStorage` directly in UI code** — always use `window.StorageAPI`.
2. **No ES modules, no imports** — every JS file is a self-contained IIFE.
3. **Bump the SW cache version (`sugbocents-shell-vN`)** after every file change.
4. **All HTML files use `<meta charset="UTF-8">`** — emoji and ₱ are literal Unicode, never HTML entities or mojibake.
5. **CSS custom properties from `:root`** in `style.css` — never hardcode hex values in JS.
6. **Format currency** with `Intl.NumberFormat("en-PH", { currency: "PHP" })`.
7. **Script loading order in HTML:** `firebase-init.js` → `firebase-auth-service.js` → `firestore-service.js` → `storage.js` → `app.js` → `dark-mode.js` → page-specific script.
