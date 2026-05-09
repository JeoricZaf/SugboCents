# Design Reference — Cross-Page Feature Contract

> **This is the master integration document.** Before implementing any gamification feature, read this file to understand where it must appear across pages. No gamification feature lives on a single page.
> **Maps to:** All pages, `js/app.js` (global shell), `css/style.css`
> **Governs:** All other `DESIGN_REF_*.md` files

---

## Core Principle: No Isolated Features

The addictive loop of apps like Duolingo works because **every feature is visible from multiple entry points**. Coins don't just live in the shop — you see your coin balance on the learn page, the leaderboard, and the profile. Streaks don't just exist on a streak page — you see the streak chip on every page, the streak dot-row on the learn page, the streak count in rank rows, and the streak milestone modal wherever you are.

The rule for SugboCents: **if a number changes, it must be visible in at least 3 places.**

---

## 1. The Persistent Resource Bar — Global Shell

This is the most critical cross-page component. It is injected by `js/app.js` into the top bar of every authenticated page.

### What it shows

```
[🔥  12]   [₵  340]   [⚡ Lv. 4]
```

Three chips, always visible, always live:

| Chip | Color | Tap action | Pages visible |
|---|---|---|---|
| `🔥 N` streak chip | Orange `#F97316` | Opens Streak Detail Sheet | ALL authenticated pages |
| `₵ N` Sentimos chip | Teal `#0D9488` | Opens Sentimos Balance Sheet | ALL authenticated pages |
| `⚡ Lv. N` XP level chip | Gold `#EAB308` | Opens XP / Level Progress Sheet | ALL authenticated pages |

### When streak = 0
The 🔥 chip renders in grey with a muted "0". Never hidden — the empty slot communicates "you had this and lost it."

### When Sentimos = 0
The ₵ chip renders in teal but shows "₵ 0". Never hidden. The user should always see the balance, including when it's empty — this motivates earning.

### Pages that display the persistent resource bar

- `dashboard.html` ✓
- `stats.html` ✓
- `activity.html` ✓
- `settings.html` ✓
- `tigom.html` ✓
- `leaderboard.html` ✓ (Phase 4)
- `profile.html` ✓ (Phase 4)
- `login.html` ✗ (guest page — no bar)
- `register.html` ✗ (guest page — no bar)
- `landing.html` ✗ (public page — no bar)

### Implementation in `js/app.js`

```js
function renderResourceBar() {
  const user = StorageAPI.getCurrentUser();
  if (!user) return;

  const streak = StorageAPI.getCurrentStreak();
  const sentimos = StorageAPI.getSentimosBalance();
  const xpInfo  = StorageAPI.getXpInfo();

  document.getElementById('resource-bar').innerHTML = `
    <button class="streak-chip ${streak === 0 ? 'streak-chip--zero' : streak > 0 ? 'streak-chip--active' : ''}"
            onclick="openStreakSheet()" aria-label="${streak} day streak">
      🔥 <span class="resource-chip__number">${streak}</span>
    </button>
    <button class="sentimos-chip" onclick="openSentimosSheet()" aria-label="${sentimos} Sentimos">
      ₵ <span class="resource-chip__number">${sentimos}</span>
    </button>
    <button class="xp-level-chip" onclick="openXpSheet()" aria-label="Level ${xpInfo.level}">
      ⚡ <span class="resource-chip__number">Lv.${xpInfo.level}</span>
    </button>
  `;
}

// Re-render resource bar after any data-changing action
document.addEventListener('sugbocents:data-changed', renderResourceBar);
```

The `sugbocents:data-changed` custom event is dispatched by `StorageAPI` after `addExpense`, `addXp`, `addSentimos`, `spendSentimos`, `claimAchievement`, etc.

---

## 2. Feature Surface Map — Where Every Feature Appears

### 🔥 Streak

| Location | How it appears | Interaction |
|---|---|---|
| **Resource bar (all pages)** | Orange chip `🔥 12` | Tap → Streak Detail Sheet |
| **Dashboard identity hero** | Large hero number `12` in orange, Sora font | Visual anchor |
| **Dashboard week map** | 7 nodes showing which days this week had logs | Tap any node → see date |
| **Dashboard mission card** | At-risk warning copy after 17:00 with no log | Motivates action |
| **Profile page** | One of 4 stats in the 2×2 grid | Read-only |
| **Leaderboard rank rows** | `🔥 N` chip on right of each row | Read-only, shows friend streaks |
| **Stats / Personal Records** | "Longest Streak" record card with date set | Read-only |
| **Streak milestone modal** | Full celebration overlay on milestone days | Auto-fires: day 3, 7, 14, 30, 100 |
| **Streak break recovery modal** | After losing a streak — offers streak freeze purchase | Fires at next login after miss |
| **Tigom mood** | Tigom's expression reflects streak health | See `DESIGN_REF_STREAKS.md` |

---

### ₵ Sentimos

| Location | How it appears | Interaction |
|---|---|---|
| **Resource bar (all pages)** | Teal chip `₵ 340` | Tap → Sentimos Balance Sheet |
| **Dashboard identity hero** | ₵ chip below username (after Phase 4) | Same as resource bar tap |
| **Quest cards** | `₵ 50` reward pill on each quest card | Awarded on quest complete |
| **Badge claim sheet** | `₵ 25` reward shown before claiming | Awarded on badge claim |
| **Week map chest (Day 7)** | `₵ 50` shown in Perfect Week modal | Awarded on 7/7 completion |
| **Shop page** | Primary spendable currency | Buy streak freezes, etc. |
| **Profile page** | ₵ balance shown in identity stats | Read-only |
| **Leaderboard rank rows** | "Gift ₵" button on friend rows (Phase 4) | Opens gift confirmation |
| **Sentimos Balance Sheet** | Full transaction log + "Visit Shop" CTA | Bottom sheet from any page |

---

### ⚡ XP and Level

| Location | How it appears | Interaction |
|---|---|---|
| **Resource bar (all pages)** | Gold chip `⚡ Lv. 4` | Tap → XP Progress Sheet |
| **Dashboard XP widget** | Level name, XP bar, N XP to next level | Visual anchor |
| **Dashboard** | `+N XP` float popup after expense log | Auto-fires |
| **Leaderboard** | League tier = XP level — shield at top of page | Visual |
| **Leaderboard rank rows** | Avatar badge = level shield (colored) | Visual |
| **Profile page** | Level badge overlaid on avatar; level name displayed | Read-only |
| **Stats / Personal Records** | "Best Week" XP record card with date | Read-only |
| **Celebration modals** | XP number in gold during level-up, quest complete | Auto-fires |
| **Badge claim sheet** | `+15 XP` shown before claiming | Awarded on claim |

---

### 🏅 Badges / Achievements

| Location | How it appears | Interaction |
|---|---|---|
| **Dashboard** | Badge teaser card — nearest-to-unlock badge | Tap → claim sheet or stats page |
| **Profile page** | Badge shelf — 3 most recent earned badges | Tap → stats page full grid |
| **Stats page** | Full badge grid — all badges, dimmed/unlocked | Tap unclaimed → claim sheet |
| **ANY page** | Badge unlock toast notification | Auto-fires on unlock |
| **Celebration modal** | Badge name + art when unlocked | Part of milestone modal |

---

### 📅 Weekly Quests

| Location | How it appears | Interaction |
|---|---|---|
| **Dashboard quest row** | Quest title + N/Target bar + ₵ reward + timer | Tap → quest detail sheet |
| **Profile page** | "Quests completed" count in stats grid | Read-only |
| **Leaderboard ranking** | Tertiary sort factor (questsCompleted lifetime) | Read-only |
| **Activity page** | Quest completion events in activity feed | Read-only |
| **Mid-session toast** | Progress tick after each expense log | Auto-fires |
| **Quest complete modal** | Celebration overlay with ₵ + XP reward | Auto-fires on completion |

---

### 🔥 Today's Mission (Daily)

| Location | How it appears | Interaction |
|---|---|---|
| **Dashboard** | 7-node week map + mission text below | Tap day node → detail |
| **Dashboard** | Mission state changes (idle → at-risk → done) | Reactive to time + logs |
| **Activity page** | "Logged N expenses today" in activity feed | Read-only |
| **Resource bar streak chip** | Number updates after each log day completes | Auto-updates |

---

## 3. Sheet System — Global Bottom Sheets

Several features open bottom sheets that are accessible from any page via the resource bar. These sheets are globally defined and rendered by `js/app.js`.

### Streak Detail Sheet (`openStreakSheet()`)
- Triggered by: streak chip tap (any page), flame icon on profile
- Content: current streak number (hero), 7-node week dot row for current week, milestone timeline (next milestone highlighted), longest streak record
- CTA: "Log an expense to protect your streak" (if no log today), "Streak safe today ✓" (if already logged)
- See full spec: `DESIGN_REF_STREAKS.md`

### Sentimos Balance Sheet (`openSentimosSheet()`)
- Triggered by: ₵ chip tap (any page), ₵ chip on profile/identity hero
- Content: current balance (hero, teal), recent earning events (log, quest, badge, gift), "Visit Shop" green CTA button
- CTA: "Visit Shop" navigates to shop page
- See full spec: `DESIGN_REF_SHOP_SENTIMOS.md`

### XP Progress Sheet (`openXpSheet()`)
- Triggered by: ⚡ chip tap (any page), level badge tap on profile
- Content: current level name + number, XP progress bar, XP to next level, recent XP events
- CTA: "Log today to earn XP"

---

## 4. Cross-Page Data Sync Contract

When any of these values change, all visible instances must update in the same render cycle:

| Value changed | Must update immediately |
|---|---|
| `streak` | Resource bar streak chip, dashboard week map, dashboard at-risk state |
| `sentimos` | Resource bar ₵ chip, any open Sentimos balance sheet |
| `xp` | Resource bar ⚡ chip, dashboard XP widget, XP float popup |
| `quest.progress` | Dashboard quest row bar, mid-session toast |
| `achievement.unlocked` | Dashboard badge teaser, badge unlock toast |

**Implementation pattern:** After every `StorageAPI` write, dispatch `sugbocents:data-changed`. The resource bar's `renderResourceBar()` is a listener on this event. Individual page components (week map, XP widget, quest row) also listen and re-render their own section only.

```js
// In StorageAPI — after any write:
function _notifyChanged() {
  document.dispatchEvent(new CustomEvent('sugbocents:data-changed'));
}
```

---

## 5. Navigation Integration

The bottom nav bar (mobile) shows these 5 tabs:
`⌂ Home`  `📊 Stats`  `📋 Activity`  `🐾 Tigom`  `⚙ Settings`

**Leaderboard (Phase 4):** Replaces or expands Activity tab — tapping Activity shows: Today's activity feed with a "Leaderboard →" chip at the top, so the leaderboard is always one tap from any page.

**Shop:** Does NOT get a nav tab. It is accessed exclusively through:
1. The ₵ chip in the resource bar → Sentimos Balance Sheet → "Visit Shop" CTA
2. The streak break recovery modal → "Use a Streak Freeze" CTA
This keeps the shop as a destination reached through need, not browsed casually — mirrors how Duolingo handles the shop.

---

## 6. Notification Surface Map

These notifications fire automatically and appear regardless of which page the user is on:

| Trigger | Notification type | Visual |
|---|---|---|
| Expense logged + XP awarded | XP float popup | Gold `+N XP` pill, fades up |
| Quest progress tick (minor) | Mid-session toast (bottom) | Slides up 2s then dismisses |
| Quest complete | Full celebration modal | Dark overlay, Tigom, ₵+XP |
| Badge unlocked | Badge unlock toast | Top slide-in, 3s |
| Level up | Level-up modal | Dark overlay, shield, new level name |
| Streak milestone (3/7/14/30/100) | Streak milestone modal | Dark overlay, flame, gap copy |
| Perfect week (all 7 days) | Week chest modal | Dark overlay, chest, +200XP ₵50 |
| Streak at-risk (17:00 no log) | Streak chip pulse animation | Resource bar only, no modal |

All modals use `GamificationUI.queueModal()` from `js/gamification.js` — modals never stack; they queue.

---

## 7. Quick Reference: Which JS File Owns Each Feature

| Feature | Primary owner | Secondary owners |
|---|---|---|
| Resource bar rendering | `js/app.js` | — |
| Streak chip logic | `js/app.js` | `js/dashboard.js` (week map) |
| Sentimos balance display | `js/app.js` | `js/dashboard.js` (identity hero chip) |
| Quest row on dashboard | `js/dashboard.js` | `js/storage.js` (data) |
| Badge teaser on dashboard | `js/dashboard.js` | `js/storage.js` (buildAchievementState) |
| Badge grid (full) | `js/stats.js` | `js/storage.js` (buildAchievementState) |
| XP widget on dashboard | `js/dashboard.js` | `js/storage.js` (getXpInfo) |
| Shop page | `js/shop.js` (new) | `js/storage.js` (getSentimosBalance, spendSentimos) |
| Profile page | `js/profile.js` (new) | `js/firestore-service.js` (Phase 4) |
| Leaderboard | `js/leaderboard.js` (new) | `js/firestore-service.js` (Phase 4) |
| Celebration modals (all) | `js/gamification.js` | `js/dashboard.js` (fires triggers) |
| Bottom sheets (all) | `js/app.js` | — |
