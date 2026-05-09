# Design System Override — Phase Tracker

**Source of Truth:** `sugbocents-ui-redesign-brief/src/App.tsx` + `src/index.css`
**Goal:** Extract every visual element from the TSX redesign and apply it to all 9 target pages in pure HTML/CSS/JS (no framework).
**Rule:** Zero JS logic changes — only HTML structure and CSS styling.

---

## TSX → HTML Page Mapping

| TSX Component | Target HTML File | Status |
|---|---|---|
| `DashboardPage` | `dashboard.html` | ✅ Done |
| `QuestsPage` | `quests.html` | ⬜ Pending |
| `LeaderboardPage` | `leaderboard.html` | ⬜ Pending |
| `ProfilePage` | `profile.html` | ⬜ Pending |
| Profile badge shelf + records | `achievements.html` | ⬜ Pending |
| `ActivityPage` | `activity.html` | ⬜ Pending |
| `ChatPage` | `chat.html` | ⬜ Pending |
| `MorePage` | `settings.html` | ⬜ Pending |
| `GoalsPage` | `tigom.html` | ⬜ Pending |

---

## Phase 0 — CSS Foundation ✅ Done

**File:** `css/style.css`

### What was added/changed:
1. **`:root` tokens added:**
   - `--bg-main: #f7f3e8` — cream page background
   - `--bg-secondary: #edf7ef` — light green tint cards
   - `--bg-card: #ffffff`
   - `--border: #d8d1bd` — subdued card borders
   - `--border-active: #ded7c6` — slightly darker border
   - `--text-dark: #102b1d` — primary text (replaces ink-900 in DS)
   - `--text-muted: #6b756c` — secondary text
   - `--text-hint: #7a817a` — smallest labels
   - `--orange: #F97316` — streak/at-risk color
   - `--teal: #0D9488` — sentimos/rewards color
   - `--gold: #EAB308` — XP/level color
   - `--ds-radius: 2rem` — main card radius

2. **`html` base:** background changed to `#f7f3e8`

3. **Keyframes added:**
   - `@keyframes ds-float` — 4s, Tigom bob animation
   - `@keyframes ds-riskPulse` — 1.7s, orange ring pulse (streak at-risk)
   - `@keyframes ds-nodePulse` — 1.4s, orange ring pulse (weekmap today)
   - `@keyframes ds-glow` — 1.5s, brightness 1→1.12 (claim button)
   - `@keyframes ds-confetti` — 1.2s, translateY+rotate (celebration)
   - `@keyframes ds-typingBounce` — 1s, translateY -4px + opacity (chat dots)

4. **Animation utilities:**
   - `.ds-animate-float`
   - `.ds-animate-risk`
   - `.ds-animate-node-pulse`
   - `.ds-animate-glow`
   - `.ds-animate-confetti`

5. **Typing dot:**
   - `.ds-typing-dot` — 0.45rem circle, brand-900 bg, typingBounce animation
   - `.ds-delay-150` / `.ds-delay-300`

6. **Layout utilities:**
   - `.ds-scrollbar-none` — hide scrollbar cross-browser
   - `.ds-safe-bottom` — `padding-bottom: calc(0.5rem + env(safe-area-inset-bottom))`

7. **Reusable DS component classes:**
   - `.ds-card` — `rounded-[2rem] bg-white shadow-sm ring-1 ring-[#ded7c6] p-5`
   - `.ds-card-green` — `#edf7ef` bg, `#cfe2d3` ring
   - `.ds-card-hero` — `#164f33` bg, white text, large shadow
   - `.ds-progress` — progress bar track (h-3, rounded-full, `#e7e0cf` bg)
   - `.ds-progress--tall` — h-5 variant
   - `.ds-progress__fill` — base fill styles + transition
   - `.ds-progress__fill--green` — `#2b8259`
   - `.ds-progress__fill--gold` — `#EAB308`
   - `.ds-progress__fill--danger` — `#b91c1c`
   - `.ds-eyebrow` — `text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]`
   - `.ds-btn-primary` — `rounded-2xl bg-[#164f33] px-4 py-3 text-sm font-extrabold text-white`
   - `.ds-btn-secondary` — `rounded-2xl bg-[#f4f0e5] px-4 py-3 text-sm font-black text-[#526257]`
   - `.ds-btn-pill` — `rounded-full bg-[#164f33] px-5 py-3 text-sm font-black text-white`
   - `.ds-stat-tile` — `rounded-[1.7rem] bg-white ring-1 ring-[#ded7c6] p-4`
   - `.ds-resource-bar` — sticky header `bg-[#f7f3e8]/88 backdrop-blur-xl border-b border-[#d8d1bd]/70`
   - `.ds-bottom-nav` — new mobile nav shell
   - `.ds-nav-item` — nav button base
   - `.ds-nav-item--active` — `bg-[#164f33] text-white`
   - `.ds-modal-backdrop` — `fixed inset-0 z-50 flex items-end justify-center bg-[#102b1d]/35 backdrop-blur-sm`
   - `.ds-modal-sheet` — `w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl`
   - `.ds-chip-streak` — orange chip tones
   - `.ds-chip-sentimos` — teal chip tones
   - `.ds-chip-level` — gold chip tones
   - `.ds-reward-badge` — `rounded-full bg-[#f0fdfa] text-[#0f766e] ring-1 ring-[#0D9488]/25`
   - `.ds-week-node` — base weekmap node
   - `.ds-week-node--done` — green fill
   - `.ds-week-node--today` — orange + animate-nodePulse
   - `.ds-week-node--future` — gray fill
   - `.ds-week-node--chest` — outlined, `border-2 border-[#164f33]`
   - `.ds-sidebar` — new desktop sidebar shell
   - `.ds-sidebar-brand-card` — dark green brand block in sidebar
   - `.ds-sidebar-nav-link` — nav item in sidebar
   - `.ds-sidebar-nav-link--active` — `bg-[#164f33] text-white`

---

## Phase 1 — Dashboard ✅ Done (Sprint 1 scope)

**File:** `dashboard.html`

### What actually changed:
- **Body background**: `bg-mist` removed, replaced with `style="background:#f7f3e8"` (DS cream bg)
- **Budget card**: Added `ds-hero-card` class alongside `budget-card` — DS solid `#164f33` bg, `2rem` radius, updated text hierarchy with `.ds-hero-card__eyebrow / __amount / __sub / __progress / __meta` classes
- **Progress bar**: Kept `budget-progress-bar` class (needed for JS `pct-warn/pct-danger` state), added `ds-hero-card__progress-fill` for DS styling. Added CSS override rules for `.ds-hero-card__progress-fill.pct-warn/pct-danger`
- **Bottom nav**: Replaced `.bottom-nav` / `.nav-link` structure with `.ds-bottom-nav` / `.ds-bottom-nav__grid` / `.ds-bottom-nav__item` — using Bootstrap Icons. `data-nav` attributes preserved for JS active-state logic. Added `.ds-bottom-nav__item.active` CSS rule

### JS hooks preserved (no changes to any .js file):
- All IDs unchanged: `#remainingAmount`, `#budgetProgress`, `#budgetSummary`, `#progressLabel`, `#budgetWeekLabel`, `#budgetHealthLine`, `#budgetCard`
- `data-nav` attributes on nav items — used by `app.js activateBottomNav()`
- All modal IDs, quick-add IDs, expense list IDs intact

### Remaining for Phase 1 (future session):
- Resource chips row (streak/sentimos/level) — needs JS to populate
- WeekMap section — needs JS rendering
- Active quest card — needs JS integration
- Desktop sidebar DS reskin (lower priority — sidebar is hidden on mobile)

---

## Phase 2 — Quests ⬜ Pending

**File:** `quests.html`

### Key changes to make:
- Hero banner: `bg-gradient-to-br from-[#164f33] via-[#1f6f47] to-[#2b8259]` with Tigom float on right
- Weekly reset bar: `rounded-full bg-white ring-1 ring-[#ded7c6]` with countdown chip
- Quest cards: `rounded-[2rem] bg-white ring-1 ring-[#ded7c6]`, icon in `rounded-2xl bg-[#edf7ef]`
  - Tall gold progress bar
  - `₵` reward chip: `ds-reward-badge`
  - Claim button: `.ds-animate-glow rounded-full bg-[#0D9488]`
- Locked quests: `opacity-40 blur-[0.4px]` + overlay "Locked" pill
- Bottom nav: apply `ds-bottom-nav` (same as Phase 1)

---

## Phase 3 — Leaderboard ⬜ Pending

**File:** `leaderboard.html`

### Key changes to make:
- League header card: white `ds-card`, Shield row using CSS `clip-path: polygon(50% 0, 100% 18%, 86% 100%, 50% 84%, 14% 100%, 0 18%)`
- Shield sizes: lg (h-32 w-28), md (h-24 w-20), sm (h-16 w-14) with `faded` opacity for non-current tiers
- Rankings rows: `rounded-3xl` items; current = `bg-[#edf7ef] ring-2 ring-[#2b8259]/30`
- League avatar circles colored by tier: bronze=`#9a6b45`, silver=`#84919a`, gold=`#EAB308`, emerald=`#2b8259`
- Live feed: `rounded-3xl bg-[#faf8f1]` text rows
- Add friends CTA: dark `#164f33` card, white pill button
- 2-col `lg` grid: rankings | (feed + CTA card)

---

## Phase 4 — Profile ⬜ Pending

**File:** `profile.html`

### Key changes to make:
- Profile header card: avatar (silver bg, initial letter), level badge `bg-[#EAB308] ring-4 ring-white`, Sentimos display card `bg-[#f0fdfa]`
- 4 stat tiles: `grid-cols-2 sm:grid-cols-4`, `.ds-stat-tile`, colored values (streak=`#F97316`, xp=`#EAB308`)
- Badge shelf: horizontal scroll, `rounded-[1.7rem] bg-[#f8f5eb]` cards, locked = `opacity-40 grayscale` + 🔒 overlay
- WeekMap compact: inline 7-node row
- Personal records: horizontal scroll `rounded-[2rem] bg-white` cards
- Barkada list: circular avatars + dashed "Find Friends" pill

---

## Phase 5 — Achievements ⬜ Pending

**File:** `achievements.html`

### Key changes to make:
- Page header: eyebrow + h1, badge progress label
- Personal records: horizontal scroll cards (same pattern as Profile)
- Badge grid: `rounded-[1.7rem]` cards, icon in green circle, locked = `grayscale opacity-40` + 🔒 overlay

---

## Phase 6 — Activity ⬜ Pending

**File:** `activity.html`

### Key changes to make:
- Hero banner: dark `#164f33`, weekly summary stats (spent/budget, logs count, XP week, streak)
- Tab switcher: pill `grid grid-cols-2 rounded-full bg-[#e7e0cf] p-1`, active = white with shadow
- Expense rows: icon `rounded-2xl bg-[#f4f0e5]`, `divide-[#ece6d8]`
- Activity events: `rounded-[2rem]` cards; featured = `bg-[#edf7ef]`
- Filter chips: `rounded-full`, active = `bg-[#164f33] text-white`

---

## Phase 7 — Chat ⬜ Pending

**File:** `chat.html`

### Key changes to make:
- Header: white `ds-card`, TigomFace (md), Active badge (green dot)
- User bubbles: `bg-[#164f33] text-white rounded-[1.5rem]`
- Tigom bubbles: `bg-white ring-1 ring-[#ded7c6] rounded-[1.5rem]`
- Typing indicator: 3x `.ds-typing-dot` with `.ds-delay-150`, `.ds-delay-300`
- Suggested prompts: horizontal scroll `rounded-full bg-white ring-1 ring-[#ded7c6] text-xs font-black text-[#164f33]`
- Input bar: sticky bottom, `rounded-[2rem] bg-white ring-1 shadow-xl`, "Send" `rounded-full bg-[#164f33]`

---

## Phase 8 — Settings ⬜ Pending

**File:** `settings.html`

### Key changes to make:
- Shortcut list (Activity / Goals / Chat): `rounded-[2rem] bg-white ring-1 ring-[#ded7c6] hover:-translate-y-0.5`
- Toggle style: `h-7 w-12 rounded-full bg-[#2b8259]` track with `h-5 w-5 bg-white translate-x-5` thumb
- Form inputs: `rounded-2xl border border-[#d8d1bd] bg-[#faf8f1]`
- Section headers: `.ds-eyebrow` + `font-display text-2xl font-black text-[#102b1d]`

---

## Phase 9 — Tigom / Goals ⬜ Pending

**File:** `tigom.html`

### Key changes to make:
- Page header: eyebrow "Savings" + h1 "Goals" + "+ New Goal" pill (hidden on mobile)
- Goals grid: `grid lg:grid-cols-3 gap-4`
- Goal cards: `rounded-[2rem] bg-white ring-1 ring-[#ded7c6]`
- Empty state: centered TigomFace + text in `rounded-[2rem] bg-white min-h-72`
- Savings badges section: `bg-[#f8f5eb]`, `rounded-3xl` badge tiles
- FAB: `fixed bottom-24 right-4 rounded-full bg-[#164f33] sm:hidden`

---

## Phase 10 — Service Worker ✅ Done

**File:** `sw.js`
- Cache version bumped from `v98` → `v99`

---

## Design Token Reference

### Colors
```
#164f33 — brand-900 / hero bg / primary buttons / active nav
#1f6b46 — brand-800 / button hover
#2b8259 — brand-700 / progress green / avatar bg
#f7f3e8 — page background (cream)
#edf7ef — secondary card bg (light green)
#f8f5eb — tertiary card bg (warm cream)
#faf8f1 — input bg
#ffffff — card bg
#ded7c6 — card border (ring)
#d8d1bd — subtle border
#e7e0cf — progress track bg
#102b1d — text darkest
#6b756c — text muted (eyebrows)
#7a817a — text hint
#F97316 — orange (streak, at-risk)
#0D9488 — teal (sentimos, rewards)
#EAB308 — gold (XP, level)
#b91c1c — danger red
#9a6b45 — bronze league
#84919a — silver league
```

### Typography
```
font-display: "Sora" — all h1/h2 headings, money amounts
font-sans: "Plus Jakarta Sans" — body, labels, UI
font-black (900) — display headings
font-extrabold (800) — section titles, button labels
font-bold (700) — body labels
font-semibold (600) — secondary text
```

### Border Radius
```
rounded-[2rem]   — 32px — main cards, hero sections, modals
rounded-[1.7rem] — 27px — stat tiles, badge cards
rounded-3xl      — 24px — quest cards, leaderboard rows (alt)
rounded-2xl      — 16px — buttons, icon containers, inputs
rounded-full     — 9999px — chips, pills, avatars, nav items (active)
```

### Key Animations
```
ds-float       — 4s ease-in-out — Tigom mascot bob
ds-riskPulse   — 1.7s — orange ring on streak chip
ds-nodePulse   — 1.4s — orange ring on today's weekmap node
ds-glow        — 1.5s — brightness pulse on claim button
ds-confetti    — 1.2s — celebration particles
ds-typingBounce — 1s  — chat typing dots
```
