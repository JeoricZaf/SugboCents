# SugboCents — UI/UX & Visual Design Guide

> **Last updated:** May 4, 2026
> **Purpose:** Give GitHub Copilot clear visual and interaction references for building and editing SugboCents components.
> **CRITICAL:** This is a **gamified consumer finance app** for Gen Z students — not a professional banking tool. These rules override any earlier "clean professional fintech" aesthetic guidance in previous versions of this document.
> **Tech constraint:** All components must be vanilla HTML, Tailwind CSS (CDN), and vanilla JavaScript. No React, Vue, Angular, or Node.js.

---

## 1. What This App Must Feel Like

SugboCents is a **game first, budget app second**. When a user opens the dashboard, they should feel the same thing they feel opening Duolingo: "I have a score, I have a streak, I am making progress, and I want to come back tomorrow." The visual language communicates this before the user reads a single word.

**It must NOT feel like:**
- A Monzo clone (too sleek, too professional, too calm)
- A banking app (intimidating, cold, transactional)
- A spreadsheet with a nice font — which is the current problem

**It MUST feel like:**
- A game HUD — identity (level), resources (budget), actions (log expense), progress (streak + XP)
- An achievement platform — badges look collectible, not like checkbox labels
- Something a 19-year-old would screenshot and send to their groupchat

---

## 2. Primary Visual References

### Duolingo (primary reference — XP, streak, level-up, badges)
- **Take:** The streak is a large, colored badge — not a small chip. Bold number. Color escalates amber → orange → crimson as streak grows.
- **Take:** The XP bar is thick (14–16px), gradient fill, fills with ease-out animation. Always at the top of the screen.
- **Take:** Level-up is a full-screen celebration — never a toast, never a banner.
- **Take:** Empty states show what you are about to earn, not what you have failed to start.
- **Take:** Achievement badges look like collectible items with visual weight — full color when earned, grey silhouette with lock when unearned.

### Habitica (reference — badge grid, RPG identity)
- **Take:** The home screen reads as an RPG character sheet. XP bar, level number, HP — all large and prominent.
- **Take:** Badge grids are always grids, never lists. Earned = full color. Unearned = greyscale at 40% opacity + lock overlay.
- **Take:** The visual language makes you feel like you have a character that grows, not just a task tracker.

### Strava (reference — streak badge size, stat weight)
- **Take:** Stats use large bold numbers — not small 11px KPI chips.
- **Take:** The streak badge is large enough to read in a thumbnail.
- **Take:** Achievement summaries feel like cards: bold category, large number, small supporting context.

### Monzo / Revolut (reference — budget card and category breakdown ONLY)
- **Take:** Budget remaining is the hero number on the card — large, white, dominant.
- **Take:** Category colors are consistent — the same color always means food, the same always means transport.
- **Take:** Spending insights are narrative: "You spent less on coffee this week."
- **Do NOT take:** The overall calm, cold, professional aesthetic. SugboCents is for college students who should feel excited to open the app.

---

## 3. Non-Negotiable Visual Rules

### XP Bar
- **Height:** 14–16px minimum. The current ~4px bar has no visual presence. It must feel like a fuel gauge.
- **Fill:** CSS gradient `var(--brand-600)` to `var(--brand-800)`. Animate width change ease-out (400–600ms).
- **Labels:** Left = current XP (`text-sm font-semibold`). Right = "N XP to next level" (`text-sm font-semibold`). Never say "→ Next level" without a number.

### Level Name
- **Font:** Sora, weight 800, 2rem (32px) on mobile.
- **Position:** First element in the hero section — before greeting text, before the date. It IS the greeting.
- **Never:** Render as eyebrow text, small caption, or subtitle.

### Streak Badge
- **Not a chip — a badge.** Minimum 56×56px.
- **Icon:** `local_fire_department` (Material Icons) or `bi-fire` (Bootstrap Icons). Minimum 28px.
- **Number:** `text-2xl font-black` — readable in a thumbnail.
- **Color by streak length:** 0 days = outlined green (invitation), 1–6 = amber, 7–13 = orange, 14–29 = orange + glow ring, 30+ = crimson + pulse.

### Budget Card Background
Card background changes color at spend thresholds:
- 0–49%: `var(--brand-800)` deep green
- 50–64%: deep green + amber border ring
- 65–89%: dark amber `#92400e`
- 90–100%: dark red `#7f1d1d`

### Badge Grid
- Always a grid. Earned = full color + `check_circle` icon overlay. Target = full color + glow ring + pulse. Locked = 40% opacity + `filter: grayscale(1)` + `lock` icon.

### Micro-Animations
Every state change must have motion. XP bar extends ease-out. Streak badge bounces on increase. Budget bar transitions smoothly. Badge earn triggers scale-in pop. Level-up triggers full-screen modal — never downgrade to toast.

---

## 4. Icon Language — No Emoji in UI Chrome

Use **Material Icons** or **Bootstrap Icons** for all structural UI. Emoji are only allowed in Quick Add shortcut button labels (user-defined input).

| Element | Icon |
|---|---|
| Streak flame | `local_fire_department` (Material) or `bi-fire` |
| XP / lightning | `bolt` (Material) or `bi-lightning-charge-fill` |
| Badge lock | `lock` (Material) or `bi-lock-fill` |
| Mission / target | `gps_fixed` (Material) |
| Add / log expense | `add_circle_outline` (Material) |
| Achievement earned | `check_circle` (Material) or `bi-check-circle-fill` |
| Settings | `settings` (Material) or `bi-gear` |
| Stats / chart | `bar_chart` (Material) or `bi-bar-chart-fill` |

---

## 5. Color Vocabulary — Semantic, Not Decorative

| Color | Meaning |
|---|---|
| Brand green (`--brand-700` to `--brand-900`) | Healthy, on track, earned, success, active nav |
| Amber / gold (`#f59e0b`) | Caution, XP reward events, streak milestone glow |
| Orange (`#ea580c`) | High streak state, elevated caution |
| Crimson / red (`#dc2626`, `#7f1d1d`) | Over budget, streak at risk, danger |
| Slate / grey (`#94a3b8`) | Locked, inactive, secondary text |
| White / mist | Neutral surface, card backgrounds |

---

## 6. Typography Hierarchy

| Element | Size | Weight | Font |
|---|---|---|---|
| Level name | 2rem (32px) | 800 | Sora |
| Budget remaining | 1.75rem (28px) | 700 | Plus Jakarta Sans |
| Streak count (badge) | 1.5rem (24px) | 900 | Plus Jakarta Sans |
| Section headings (h2) | 15px max | 600 | Plus Jakarta Sans |
| Eyebrow / label text | 11–12px | 400 | Plus Jakarta Sans, uppercase, tracking-wide |
| Body / supporting text | 13–14px | 400–500 | Plus Jakarta Sans |

---

## 7. Expense Logging Entry Points

- **Quick Add grid:** 2-column grid of user-defined shortcuts. User-input emoji are allowed here.
- **"Log a one-time expense" button:** Full-width `btn-outline` below the Quick Add grid. `add_circle_outline` icon + text. Opens a modal: amount (required), category (required), note (optional). This is the escape hatch for non-recurring expenses. It must always exist alongside the Quick Add grid.
- **Recent expenses list:** Category icon chip on left, label + timestamp center, bold amount on right. Subtle divider between rows.

---

## 8. Auth Pages (Login / Register)

Reference: Cash App / Modern FinTech Onboarding. Rules:
- Extreme simplicity — one task per screen.
- Large, easy-to-tap inputs with clear borders.
- Single full-width primary button at the bottom.
- Generous vertical whitespace.

The auth pages do not need gamification styling — they are onboarding, not the game.

---

## 9. Mobile Bottom Navigation

- Fixed bottom bar, maximum 5 tabs.
- Active tab clearly highlighted (filled icon + brand color label).
- Stats (`stats.html`) is NOT in the bottom nav — accessible via the dashboard's inline stats section → "View full stats" button.

---

## 10. What to Avoid

- Thin progress bars (under 12px) for XP or budget — they communicate low importance
- Small streak chips that look like status tags — they must be badge-sized
- "Welcome back, [Name]" as the first headline — the level name is the headline
- Emoji in navigation, headers, gamification widgets, or any structural UI element
- React, Vue, Angular, or any framework code — vanilla HTML/CSS/JS only
- Downgrading the level-up celebration modal to a toast or banner
- "→ Next level" without a number — always show "N XP to next level"
- Generating backend features (Sprint 3 scope only)

---

*This is the canonical design guide. The target aesthetic is gamified consumer app — not a clean professional fintech tool.*