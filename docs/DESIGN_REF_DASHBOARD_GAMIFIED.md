# Design Reference — Gamified Dashboard

> **Source research:** Duolingo Learn page, Duolingo Letters page, Gamification transcripts 5 & 6
> **Maps to:** `dashboard.html` + `js/dashboard.js` + `css/style.css`
> **Cross-page contract:** See `DESIGN_REF_CROSS_PAGE_CONTRACT.md` for the full map of where every feature (streak, ₵, XP, quests, badges) appears across ALL pages. This document covers only the dashboard-specific implementation.
> **Purpose:** This document is the authoritative design brief for every gamification-visible element on the SugboCents dashboard. When implementing or modifying the dashboard, follow these specs exactly.

---

## 1. The Persistent Resource Bar — Top of Every Page

### What Duolingo does
Every page — Learn, Letters, Leaderboards, Quests, Shop, Profile — shows three resource chips in the top-right corner at all times:
`🔥 streak count` · `💎 gem balance` · `❤️ lives remaining`

The streak number is the most emotionally loaded — it's a number earned over time and actively feared to lose. The gem count is always visible so the user always knows what they can afford without navigating to the shop. The combination of these two creates the "craving machine" loop in a single glance.

### SugboCents implementation

The Identity Hero area at the top of `dashboard.html` must permanently display:

```
[🔥  12]   [₵  340]   [⚡ Lv. 4]
```

**Rules:**
- These three chips are **always visible on every authenticated page** — injected by `js/app.js` into the global shell. Pages: dashboard, stats, activity, settings, tigom, leaderboard, profile. NOT on login/register/landing.
- The flame chip uses orange `#F97316` — orange is reserved exclusively for streak across the entire app
- The ₵ chip uses teal `#0D9488` — teal is reserved exclusively for Sentimos currency
- The ⚡ chip uses gold `#EAB308` — shows current level number
- **Chip tap actions (open bottom sheets, not new pages):**
  - 🔥 chip → Streak Detail Sheet (hero streak, 7-dot week row, next milestone bar, records, freeze count). Full spec: `DESIGN_REF_STREAKS.md`
  - ₵ chip → Sentimos Balance Sheet (hero balance, last 10 earn/spend events, "Visit Shop" CTA). Full spec: `DESIGN_REF_SHOP_SENTIMOS.md`
  - ⚡ chip → XP Progress Sheet (level name, XP bar, XP to next level, recent XP events)
- When streak is 0: the flame chip renders as grey with a muted "0" — still visible, not hidden
- When ₵ is 0: the teal chip shows "₵ 0" — never hidden. The empty slot motivates earning.
- Numbers are always the largest text element on the chip — the label is small and muted
- All three values re-render after `sugbocents:data-changed` event fires (dispatched by StorageAPI after any write)

**CSS class names:**
```css
.resource-bar          /* flex row, gap-3, always visible */
.streak-chip           /* orange bg when > 0, grey when 0 */
.streak-chip--at-risk  /* orange pulse animation after 17:00 with no log today */
.sentimos-chip         /* teal bg */
```

**Psychological role:** The user sees their streak number every single time they open the app. This creates loss aversion before any action is taken. The ₵ balance creates spending agency — "I have something to use."

---

## 2. The Weekly Day Map — Replaces the Flat Mission Card

### What Duolingo does
The Learn page uses a **vertical game-map of circular nodes** instead of a list. Each node is a lesson. Completed nodes are green and filled. The active node is bright green with a glow. Locked nodes are grey and flat. Treasure chest nodes appear at intervals as reward previews.

The psychological effect: **a list feels like a to-do list. A path feels like a journey.** The user simultaneously sees where they came from AND where they're going — both progress and anticipation in one view.

### SugboCents implementation

Replace the flat "Today's Mission" card with a **7-node weekly day map** running horizontally across the dashboard:

```
 ●    ●    ●    ◉    ○    ○    [🎁]
Mon  Tue  Wed  Thu  Fri  Sat   Sun
```

**Node states and visual treatment:**

| State | Visual | Condition |
|---|---|---|
| `completed` | Solid green fill (#2b8259), white tick inside | Day has ≥1 expense logged |
| `active-logged` | Solid green fill, green glow ring | Today, already logged |
| `active-empty` | Pulsing orange ring, white fill, flame inside | Today, no log yet |
| `active-at-risk` | Pulsing orange ring + orange fill after 17:00 | Today after 5pm, no log |
| `future` | Grey fill, no border | Days after today |
| `reward` | Treasure/gift box icon | Day 7 (Sunday) — streak complete reward |

**Node size:** 36px diameter circles on mobile. 44px on tablet+.

**Connection line:** A thin horizontal line connects all 7 nodes. Completed segments of the line are green; upcoming segments are grey.

**Below the map:** The mission text that currently exists in the card stays — it becomes the caption beneath the map:
```
"3 of 7 days logged this week  ·  ₵10 when you finish today"
```

**Week chest reward (Day 7 node):**
- When all 7 days are completed, the chest node lights up and pulses
- Tapping it triggers a celebration modal: "+200 XP  ₵50 — Perfect Week!"
- The week chest is the "treasure chest node" from Duolingo — a reward preview that the user can see from Monday

**HTML structure to inject (via `dashboard.js`):**
```html
<div class="week-map" id="weekDayMap">
  <!-- 7 nodes injected by renderWeekMap() -->
  <div class="week-map__line"></div>
  <div class="week-map__nodes">
    <!-- .week-node[data-day="0..6"] rendered per day -->
  </div>
  <div class="week-map__labels">
    <!-- Mon Tue Wed Thu Fri Sat Sun -->
  </div>
</div>
```

**CSS class names:**
```css
.week-map                   /* container, position: relative */
.week-map__line             /* absolute horizontal line, z-index 0 */
.week-map__nodes            /* flex row, justify-content: space-between */
.week-map__labels           /* flex row, small muted text beneath nodes */
.week-node                  /* 36px circle, position: relative, z-index 1 */
.week-node--completed       /* green fill, white tick */
.week-node--active-empty    /* white fill, orange pulse ring */
.week-node--active-logged   /* green fill, green glow */
.week-node--at-risk         /* orange fill, orange pulse ring */
.week-node--future          /* grey fill */
.week-node--reward          /* chest icon, gold tint */
```

**`renderWeekMap()` function logic (`dashboard.js`):**
1. Get current ISO week's Monday date
2. For each day 0–6: check if `getExpenses()` contains any expense on that calendar date
3. Determine today's index (0=Mon … 6=Sun)
4. Assign the correct state class to each node
5. Re-run on every `addExpense` call so the map updates immediately (optimistic UI)

---

## 3. The Quest Row — Appended to Mission Card

### What Duolingo does
On the Quests sidebar widget (visible on every desktop page), the active quest is always present with a progress bar showing exact N/Target numbers and a chest reward preview on the right. You never forget the quest is active because it's always in your peripheral vision.

### SugboCents implementation

Below the week map, the mission card gains a **second row** when a weekly quest is active:

```
┌──────────────────────────────────────────────┐
│  [week map — 7 nodes]                        │
│  3 of 7 days logged · ₵10 when done today   │
├──────────────────────────────────────────────┤  ← divider line only when quest active
│  ⚡ Disciplined Week                          │
│  [████████░░░░░░░░░░]  3 / 5 days  · 4d left │  ← progress bar, orange timer
└──────────────────────────────────────────────┘
```

**Quest row rules:**
- Quest icon (⚡ for XP-type, 🗺 for logging-type, 🎯 for accuracy-type) is **color-coded** — not generic
- Progress label inside the bar: "3 / 5 days" — always specific, never a percentage
- Timer chip in orange: "4d left" — orange = urgency, consistent with the streak color vocabulary
- Tapping the row opens the quest detail bottom sheet (see Phase 1 spec)
- When no quest is active: divider and quest row are hidden entirely — the card collapses cleanly

---

## 4. Typography Rules for All Gamification Elements

### What Duolingo does (observed across all pages)
Numbers are always the visual hero. The XP number, streak count, and rank position are always the largest, boldest elements on the screen. Labels are small and muted — they exist to explain the number, not compete with it.

| Context | Style spec |
|---|---|
| Hero numbers (streak count, XP, level) | `font-size: 1.75rem+`, `font-weight: 700`, `font-family: Sora` |
| Section headers (Daily Quests, This Week) | `font-size: 0.875rem`, `font-weight: 700`, `letter-spacing: 0.05em`, `text-transform: uppercase` |
| Progress bar labels ("3 / 5") | `font-size: 0.75rem`, `font-weight: 600`, centered inside bar |
| Timestamps / context labels | `font-size: 0.75rem`, `color: var(--text-muted)`, `font-weight: 400` |
| CTA buttons | `font-weight: 700`, `letter-spacing: 0.04em` |
| Streak/resource chip numbers | `font-size: 1rem`, `font-weight: 700` |

**SugboCents font assignment:**
- `font-family: Sora` — hero numbers, streak count, level display, XP gain text
- `font-family: Plus Jakarta Sans` — all body text, labels, descriptions
- These are already the project fonts — enforce them specifically on gamification elements

---

## 5. Color Vocabulary — Strictly Enforced

This is the most important single rule. Each color has **one semantic meaning** and is never used for anything else. When a user sees orange, they instantly know it means streak or urgency — no reading required.

| Color | Hex | Exclusive meaning | Used for |
|---|---|---|---|
| Brand Green | `#2b8259` (--brand-700) | Success, your own progress, active state | Completed day nodes, progress bars (own), active follow button, CTA primary |
| Orange | `#F97316` | Streak + urgency ONLY | Streak chip, at-risk states, countdown timers, mission urgency |
| Gold / Yellow | `#EAB308` | XP gain + quest rewards | +XP popup text, progress bar fill (in-progress), quest reward chips |
| Teal | `#0D9488` | Sentimos currency | ₵ chip, spend buttons, Sentimos sheet |
| Purple | `#7C3AED` | Rare / premium / legendary | Diamond-tier badges, rare achievement treatment, seasonal event banners |
| Grey | `#9CA3AF` | Locked / future / unavailable | Future day nodes, locked badges (30% opacity), unmet quest progress |
| Black bg | `#111827` | Celebration / game mode moments | Streak milestone modals, celebration overlays, quest completion popups |

**Where this breaks from the current app:**
- Budget health pills currently use green/yellow/red. Red must NOT be used for budget states — it conflicts with the streak loss emotional signal. Use orange for "watch out" and crimson `#DC2626` only for "streak broken" to preserve the orange = urgency relationship.

---

## 6. The "+XP" Celebration Moment — Tigom as Emotional Anchor

### What Duolingo does (Lesson Complete screen)
After completing a lesson: the Duo mascot appears in a **celebration pose** with sparkle particles. The XP gain is in gold text (`+10 XP`). Beneath it: gap framing copy — "Earn another 20 XP to reach your daily goal" — not congratulations, but forward direction. A single CONTINUE button.

### SugboCents implementation

When an expense is logged and XP is awarded, the existing `xp-float-popup` pill stays for micro-rewards. For **milestone moments** (level-up, streak milestone, quest complete, badge unlock), the full celebration modal fires with:

1. **Tigom in a celebration pose** at the top of the modal — arms up, eyes wide, a few CSS sparkle `::before` / `::after` particles
2. **XP number in gold** `color: #EAB308` — always gold, never white or green
3. **Gap framing copy** beneath: not "Great job!" but "Log tomorrow to build your streak to 8 days" or "2 more quests to earn 'Quest Regular'"
4. **Single CONTINUE button** — full width, brand green, ALL CAPS
5. **Dark background overlay** `#111827` — signals "you're in game mode right now"

**Sparkle particles (CSS only):**
```css
.celebration-modal::before,
.celebration-modal::after {
  content: '✦';
  position: absolute;
  font-size: 0.75rem;
  color: #EAB308;
  animation: sparkle-drift 1.5s ease-out forwards;
}
/* Position 4–6 sparkle pseudo-elements at different offsets */
```

---

## 7. Locked Content as Desire-Creation

### What Duolingo does
The locked leaderboard page shows the league shield icons (you understand the goal), renders a blurred list of competitors (it exists — you're just excluded), and gives a single specific CTA: "START A LESSON." Seeing what you're missing is more motivating than being told what you could gain.

### SugboCents implementation

Apply this to two places on the dashboard:

**1. The "Friends this week" chip (Phase 4):**
Before a user has any friends, render a muted chip in the Identity Hero:

```
[👥 Add friends to compete →]
```

After they add friends:
```
[👥 You're #2 among 4 friends →]
```

**2. The Sentimos ₵ chip (Phase 4):**
Before Phase 4 is live, render the chip grayed out with a lock icon and "Sentimos — coming soon" tooltip on tap. Do NOT hide it. The user should see the slot is reserved — it creates anticipation, not confusion.

---

## 8. Section Header Pattern

### What Duolingo does
Section headers on the Learn page use colored banners (green for section 1, purple for section 2) as dividers. These banners communicate "you've entered a new chapter." The labels are ALL CAPS, bold, and use thematic colors.

### SugboCents implementation

Dashboard section headers follow this pattern:

```
THIS WEEK                                    [week label — muted right]
─────────────────────────────────────────
```

- `font-size: 0.75rem`, `font-weight: 700`, `letter-spacing: 0.08em`, `text-transform: uppercase`
- `color: var(--text-muted)` — muted, not dominant. The *content* below is dominant
- A subtle `1px` divider line below
- Right-aligned context chip (e.g., "Apr 28 – May 4") in muted text

This preserves the "chapter" feeling without needing colored banners (which would conflict with our semantic color vocabulary).

---

## 9. Implementation Checklist

Use this checklist when building or reviewing the gamified dashboard:

- [ ] Persistent resource bar (`🔥 N · ₵ N · ⚡ Lv.N`) visible at top of ALL authenticated pages (injected by `app.js`, NOT just dashboard)
- [ ] Streak chip uses orange `#F97316` — never green
- [ ] Sentimos chip uses teal `#0D9488` — never green
- [ ] Weekly 7-node day map renders with correct state per day (completed / active / future / at-risk / reward)
- [ ] Day map updates immediately after an expense is logged (optimistic UI — no page reload)
- [ ] Quest row appears below day map only when an active quest exists
- [ ] Quest row shows icon + title + N/Target bar + orange days-left timer
- [ ] Tapping quest row opens quest detail bottom sheet
- [ ] +XP text always renders in gold `#EAB308` — never white
- [ ] Celebration modals use dark background `#111827`
- [ ] Tigom appears in celebration pose on milestone modals (not just a static icon)
- [ ] Gap framing copy used in celebration modals (forward-looking, not just congratulatory)
- [ ] All hero numbers use Sora font
- [ ] Color vocabulary strictly enforced — orange = streak only, gold = XP only, teal = Sentimos only
- [ ] "Friends this week" chip shows locked state before Phase 4, live rank after

---

## 10. Cross-Page Feature Integration (Dashboard Role)

The dashboard is the **entry point** where every gamification feature first becomes visible. Here is how each dashboard element connects to features on other pages:

| Dashboard element | What it is | Other pages where it also appears |
|---|---|---|
| Streak hero number + chip | Current streak | Resource bar (all pages), profile stats grid, leaderboard rank rows |
| ₵ chip | Sentimos balance | Resource bar (all pages), shop page, profile stats grid, badge claim sheet |
| ⚡ chip | XP level | Resource bar (all pages), leaderboard league tier, profile avatar badge |
| Week map (7 nodes) | This week's daily logs | Profile week activity strip (simplified), streak detail sheet (inline dot row) |
| Quest row | Active weekly quest | Quest detail sheet (full), activity feed (completion events), profile quests count |
| Badge teaser | Nearest-to-unlock badge | Stats page full grid, profile badge shelf, badge unlock toast (any page) |
| XP widget | XP bar + level name | XP progress sheet (any page tap), profile stats grid |
| Mission at-risk copy | Today's urgency state | Streak chip pulse (resource bar, all pages), Tigom mood (worried state) |

**Critical rule:** When a user logs an expense on the dashboard, ALL of the following must update in the same render cycle without a page reload:
1. Week map node for today → changes to `active-logged` (green)
2. Quest row progress bar → ticks forward
3. Resource bar streak chip → number may increment
4. Resource bar ₵ chip → increments by ₵ 5
5. XP float popup → fires `+N XP`
6. If quest completes → quest complete modal queues
7. If badge unlocks → badge unlock toast queues

All driven by the `sugbocents:data-changed` event.
