# Design Reference — Streaks System

> **Source research:** Duolingo streak mechanic (flame chip, week dots, milestone modals), Candle app (flame mood character, streak restore), Gamification transcripts 5 & 6
> **Maps to:** `js/app.js` (resource bar + streak detail sheet) + `js/dashboard.js` (week map, identity hero, at-risk state) + `js/gamification.js` (milestone modal) + `css/style.css` + `tigom.html` (mood link)
> **Sprint:** Phase 1 (streak milestone modal, at-risk state) + Phase 3 (streak freeze — see `DESIGN_REF_SHOP_SENTIMOS.md`)
> **Purpose:** Authoritative design brief for every streak-related UI element. Streaks are a cross-page feature — this document covers all the places the streak appears.

---

## Core Principle: Streaks Create the Highest Loss Aversion

From Gamification Transcript 6 — Duolingo internal data showed that users with 7-day streaks had 3× lower churn than users without. The streak number is the single most powerful retention mechanic because:

1. **It represents irreversible accumulated effort.** You can rebuild your XP, but your streak is history — it cannot be recovered without a freeze.
2. **It is always visible.** Every page. Every session. The number is never hidden.
3. **At-risk states create urgency.** After 17:00 with no log, the chip begins to pulse. The user feels the streak calling them back.

The streak is never just a number on a page. It is a living, emotional state that affects: the resource bar chip, the dashboard week map, the daily mission copy, the Tigom mascot mood, the leaderboard ranking, and the profile stats.

---

## 1. Where Streak Appears (Full Cross-Page Map)

| Location | What appears | When it updates |
|---|---|---|
| **Resource bar (ALL pages)** | Orange chip `🔥 12` | After every `addExpense()`, after midnight rollover |
| **Dashboard — identity hero** | Large hero number `12`, Sora, orange | Same as resource bar |
| **Dashboard — week map** | 7 nodes: completed days green, active-empty pulsing | After each `addExpense()` |
| **Dashboard — mission copy** | At-risk copy after 17:00 / done copy after logging | Time-based + expense-event |
| **Profile page** | "Current Streak" in stats 2×2 grid | On page load |
| **Profile page** | "Longest Streak" with date in personal records section | On page load |
| **Leaderboard rank rows** | `🔥 N` chip on right side of every row | On leaderboard data fetch |
| **Stats / Personal Records** | Streak record card (longest streak, date set) | Updated in `storage.js` |
| **Tigom mascot (tigom.html + dashboard)** | Tigom's mood expression reflects streak health | After `addExpense()`, on page load |
| **Streak Detail Sheet** | Full streak view on ₵-chip tap or flame chip tap | On sheet open |
| **Streak milestone modal** | Full celebration overlay at days 3, 7, 14, 30, 100 | Auto-fires after expense log |
| **Streak break recovery modal** | Sad Tigom, "Your streak ended" — fires at next login | After first login following missed day |

---

## 2. The Streak Chip — Resource Bar

**Visual:**
```
[🔥  12]
```

**States:**

| State | Visual | Condition |
|---|---|---|
| **Active, safe** | Orange bg, orange flame, white number | streak > 0 AND log today ✓ |
| **Active, at-risk** | Orange bg + pulsing animation | streak > 0 AND no log after 17:00 |
| **Active, empty today** | Orange bg, normal (no pulse yet before 17:00) | streak > 0 AND no log before 17:00 |
| **Zero streak** | Grey bg, grey flame, white "0" | streak = 0 |
| **Frozen** | Blue tint `#0891B2` with 🛡️ icon | streakFreezeActive = true |

**At-risk pulse animation:**
```css
.streak-chip--at-risk {
  animation: streak-pulse 1.5s ease-in-out infinite;
}
@keyframes streak-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
}
```

**Tap action:** Opens the Streak Detail Sheet (see section 6).

**Time-based logic in `js/app.js`:**
```js
function checkAtRiskState() {
  const hour = new Date().getHours();
  const streak = StorageAPI.getCurrentStreak();
  const loggedToday = StorageAPI.getExpenses().some(e => {
    const d = new Date(e.timestamp);
    return d.toDateString() === new Date().toDateString();
  });
  const chip = document.querySelector('.streak-chip');
  if (!chip) return;
  chip.classList.toggle('streak-chip--at-risk', streak > 0 && !loggedToday && hour >= 17);
}
// Run on page load and every 15 minutes
setInterval(checkAtRiskState, 15 * 60 * 1000);
```

---

## 3. The Streak Hero — Dashboard Identity Hero

The streak number is the largest text on the dashboard:

```
┌─────────────────────────────────────┐
│  Good morning, Maria ✦              │
│                                     │
│     🔥                              │
│     12                              │  ← Sora, 3rem, font-weight: 700
│  day streak                         │  ← muted, 0.75rem, below number
│                                     │
│  [₵ 340]  [⚡ Lv. 4]               │  ← chips row
└─────────────────────────────────────┘
```

**Rules:**
- The streak number is always the hero — never secondary to the budget card
- When streak = 0: still show the flame, but grey, and change the copy to "Start your streak today →" as a motivational CTA
- When streak breaks 7, 14, 30, 100: the hero briefly animates (scale pulse: 1 → 1.05 → 1 over 300ms) to draw attention before the milestone modal fires

---

## 4. The 7-Node Week Map — Dashboard

This is the most important streak visualization. See `DESIGN_REF_DASHBOARD_GAMIFIED.md` (Section 2) for the full spec. This section covers streak-specific behavior only.

### How the week map reflects streak health

The nodes' states ARE the streak visualization for the current week:

```
 ●    ●    ●    ◉    ○    ○    [🎁]
Mon  Tue  Wed  Thu  Fri  Sat   Sun
(complete) (active-empty) (future)
```

**Streak continuity signal:** When the green-to-grey transition in the connection line falls on a past day (e.g., Tuesday is grey, meaning the user missed Tuesday), that line segment turns **red** `#DC2626` briefly on page load, then fades to grey after 2s. This is a "scar" — a gentle reminder of the miss, not a permanent punishment.

**No log on a past day:** That node turns grey (unfilled). The connection line before it breaks. No "X" or "MISS" label — only the grey empty circle. The visual is sufficient.

**Streak at-risk (past 17:00, today not logged):** Today's node pulses with the orange at-risk ring. Simultaneously the streak chip in the resource bar also pulses. Both elements reinforce the same urgency signal.

---

## 5. Tigom Mood — Streak-Driven Character State

Tigom (the mascot on `tigom.html` and the mini-widget on the dashboard) has 5 mood states, all driven by streak health:

| Mood | Condition | Visual | Emotional register |
|---|---|---|---|
| `celebrated` | Just logged (within 60s) | Tigom arms up, sparkles | Pure joy |
| `happy` | Streak ≥ 7, logged today | Tigom smiling, slight bounce | Proud satisfaction |
| `content` | Streak 1–6, logged today | Tigom relaxed, neutral smile | Mild satisfaction |
| `worried` | Streak > 0, NOT logged after 17:00 | Tigom eyes wide, slight lean | Gentle anxiety |
| `sad` | Streak = 0, or missed yesterday | Tigom drooping, small | Sadness without judgment |

**Cross-page rule:** The Tigom mini-widget on the **dashboard** (top of the home screen) reflects this same mood. It is not just visible on the tigom.html page. The same `getMascotMood()` function drives both the mini-widget and the full tigom page.

**Streak chip and Tigom mood are always in sync.** If the chip is pulsing at-risk, Tigom is in `worried` state. If the chip is green/solid after logging, Tigom is in `happy` or `celebrated` state.

---

## 6. The Streak Detail Sheet

**Triggered by:** Tapping the 🔥 streak chip on any page.

**Layout:**

```
┌──────────────────────────────────────┐
│                      ─── [drag pill] │
│                                      │
│     🔥   12                          │  ← hero streak, orange, Sora 3rem
│          Day Streak                  │
│                                      │
│  ─────  THIS WEEK  ─────────────────  │
│  ●  ●  ●  ○  ○  ○  [🎁]            │  ← inline 7-dot row, M T W T F S S
│  Mon Tue Wed Thu Fri Sat Sun         │
│                                      │
│  ─────  NEXT MILESTONE  ────────────  │
│  🔥 14-day streak                    │
│  2 more days to earn ₵ 20 + badge   │
│  [░░░░░░░░░░░░░░░░████] 12 / 14     │  ← gold progress bar                │
│                                      │
│  ─────  RECORDS  ───────────────────  │
│  🏆 Longest streak: 30 (Apr 30, 2026)│
│                                      │
│  ─────  PROTECTION  ────────────────  │
│  🛡️ 1 Streak Freeze equipped        │
│  [  Visit Shop  ]                    │  ← teal text link, not button
└──────────────────────────────────────┘
```

**Rules:**
- The 7-dot row in the sheet is a simplified inline version of the week map (no animation, just states)
- The milestone bar uses gold `#EAB308` fill — it is a reward preview, not an achievement already earned
- "Records" section shows the all-time longest streak + date. If current streak IS the longest, highlight it: "🔥 Current streak is your longest ever!"
- Protection section: shows freeze count and a muted "Visit Shop" link. If 0 freezes: shows "No freeze equipped" with a "Get in Shop (₵ 50)" link
- The sheet is informational + motivational. One gentle CTA (log an expense) if not logged today.

**JS function signature:**
```js
function openStreakSheet() {
  const streak    = StorageAPI.getCurrentStreak();
  const xpInfo    = StorageAPI.getXpInfo();
  const records   = StorageAPI.getUser().records;
  const freezeCount = StorageAPI.getStreakFreezeCount();
  // Render bottom sheet
}
```

---

## 7. Streak Milestone Modals

### What Duolingo does
After completing a lesson that hits a streak milestone (7, 30, 100, 365 days), a full-screen celebration overlay fires. It shows: the flame icon large, the number, a personal message ("You're on a 100-day streak! That's incredible."), and a gap-framing forward CTA ("Log tomorrow to reach 101").

### SugboCents milestone days and rewards

| Milestone | ₵ Reward | XP Reward | Copy |
|---|---|---|---|
| 3 days | ₵ 10 | +20 XP | "You're building a habit! 3 days strong." |
| 7 days | ₵ 20 | +35 XP | "One full week! You're serious about this." |
| 14 days | ₵ 30 | +50 XP | "Two weeks logged. This is becoming automatic." |
| 30 days | ₵ 50 | +75 XP | "30 days! You've made it a monthly habit." |
| 100 days | ₵ 100 | +150 XP | "100 days. Less than 1% of users reach this." |

### Milestone modal layout

```
┌──────────────────────────────────────┐  ← dark overlay #111827
│                                      │
│     ✦      ✦     ✦                  │  ← CSS sparkle particles
│                                      │
│  [Tigom — celebrated pose]           │
│                                      │
│         🔥  12                       │  ← flame, Sora 3rem, orange
│    day streak                        │
│                                      │
│  "You're building a habit!           │
│   3 days strong."                    │  ← white, Plus Jakarta Sans
│                                      │
│  [  +₵ 10  ]   [  +20 XP  ]        │  ← teal pill, gold pill (side by side)
│                                      │
│  "Log tomorrow to keep it going →"   │  ← gap framing, muted, small
│                                      │
│  [  CONTINUE  ]                      │  ← full-width, brand green
└──────────────────────────────────────┘
```

**Rules:**
- Fires inside `GamificationUI.queueModal()` — never interrupts another modal
- Fires AFTER the XP float popup from the same expense log has already faded
- Gap framing copy is always forward-looking — not just congratulatory
- ₵ and XP rewards are visually distinct: teal pill and gold pill side by side — never one combined line

---

## 8. The Streak Break Recovery Modal

When the user misses a day and opens the app the next time, before the dashboard renders, this modal fires. Full spec in `DESIGN_REF_SHOP_SENTIMOS.md` Section 5. Streak-specific rules here:

**What "missed a day" means in code:**
```js
function checkStreakBroken() {
  const expenses = StorageAPI.getExpenses();
  const streak   = StorageAPI.getCurrentStreak();
  const lastLog  = expenses.sort((a,b) => b.timestamp - a.timestamp)[0];
  if (!lastLog) return false;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const lastLogDate = new Date(lastLog.timestamp);

  // Streak is broken if last log was 2+ days ago
  return lastLogDate.toDateString() !== yesterday.toDateString()
      && lastLogDate.toDateString() !== new Date().toDateString();
}
```

**After the modal is dismissed (either "Use Freeze" or "Start fresh"):**
- If "Use Freeze": `activateStreakFreeze()` → streak is restored to previous value → streak chip updates → Tigom goes back to `content` or `happy` state
- If "Start fresh": streak resets to 0 → streak chip shows grey "0" → Tigom enters `sad` state → next log begins a new streak from 1

**"Start fresh" compassionate design:**
After the user taps "Start fresh", the first expense log of the new streak triggers a special tiny message (not a full modal):

```
🔥 New streak started! Keep it going.
```

This gentle re-onboarding removes the shame of starting over and immediately reframes the action positively.

---

## 9. Streak & Leaderboard Integration

The leaderboard uses streak as its **primary ranking metric** (see `DESIGN_REF_LEADERBOARD.md`). The streak chip on each rank row is NOT a cosmetic addition — it is the ranking score made visible.

**Implication for the streak chip on rank rows:**
- Your own streak chip: orange background (consistent with resource bar)
- Friend streaks > your streak: also orange (no envy coloring — no red/danger for others)
- Friend streak = 0: grey chip (consistent with the zero-state)

**Psychological effect:** Seeing friends with higher streaks than you, displayed in orange, triggers social comparison and motivates streak rebuilding. The orange color being non-threatening (not red) makes it aspirational rather than threatening.

---

## 10. CSS Summary

```css
/* Streak chip states */
.streak-chip                { background: #F97316; color: white; }
.streak-chip--zero          { background: #9CA3AF; }
.streak-chip--frozen        { background: #0891B2; }
.streak-chip--at-risk       { animation: streak-pulse 1.5s ease-in-out infinite; }

/* Streak hero (dashboard identity area) */
.streak-hero-number         { font-family: Sora; font-size: 3rem; font-weight: 700; color: #F97316; }
.streak-hero-label          { font-size: 0.75rem; color: var(--text-muted); }

/* Week map (dashboard) */
.week-node--completed       { background: #2b8259; }
.week-node--active-empty    { background: white; border: 3px solid #F97316; animation: streak-pulse 1.5s infinite; }
.week-node--active-logged   { background: #2b8259; box-shadow: 0 0 0 4px rgba(43,130,89,0.3); }
.week-node--at-risk         { background: #F97316; animation: streak-pulse 1.5s infinite; }
.week-node--future          { background: #9CA3AF; }

/* Milestone modal */
.streak-milestone-modal     { background: #111827; }
.streak-milestone-number    { font-family: Sora; font-size: 3rem; font-weight: 700; color: #F97316; }

/* Streak "scar" — missed day line segment (brief red flash) */
.week-map__line-segment--missed  { background: #DC2626; animation: scar-fade 2s forwards; }
@keyframes scar-fade { to { background: #9CA3AF; } }

/* At-risk pulse */
@keyframes streak-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
}
```

---

## 11. Implementation Checklist

- [ ] Streak chip visible in resource bar on all authenticated pages, always
- [ ] Streak chip uses orange when streak > 0, grey when = 0, pulsing when at-risk (after 17:00, no log)
- [ ] Streak chip tap opens Streak Detail Sheet (functional from any page)
- [ ] Dashboard identity hero shows streak as the largest number (Sora 3rem, orange)
- [ ] Week map 7 nodes render with correct states per day (completed/active/at-risk/future/chest)
- [ ] Missed day node in past: grey empty circle (no X, no text), connection line segment red-flash then grey
- [ ] Week map updates immediately after logging an expense (optimistic UI)
- [ ] At-risk state triggers at 17:00 if no log today — both chip AND week node pulse
- [ ] Tigom mood is driven by streak state (celebrated/happy/content/worried/sad) — same function drives dashboard widget AND tigom.html
- [ ] Streak Detail Sheet renders with: hero number, 7-dot row, next milestone bar, longest record, freeze count
- [ ] Milestone modals fire for days 3, 7, 14, 30, 100 — with correct ₵ + XP rewards
- [ ] Milestone modal uses gap framing copy (forward-looking), not just congratulations
- [ ] Streak break recovery modal fires at first login after missed day (not at midnight)
- [ ] Recovery modal shows current ₵ balance
- [ ] Recovery modal offers "Use Streak Freeze" only if ≥1 freeze is equipped
- [ ] "Start fresh" path resets streak and Tigom state, shows gentle re-onboarding message on next log
- [ ] Leaderboard rank rows show streak chip for every user — same orange/grey logic
- [ ] Personal Records on stats page tracks and displays longest streak with date
- [ ] Profile page shows "Current Streak" and links to Streak Detail Sheet on tap
