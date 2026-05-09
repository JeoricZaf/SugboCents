# Design Reference — Profile & Identity Hub

> **Source research:** Duolingo Profile page, Duolingo "Following" social features, Candle user identity, Gamification transcripts 5 & 6
> **Maps to:** `profile.html` (new) + `js/profile.js` (new) + `js/firestore-service.js` (Phase 4) + `css/style.css`
> **Sprint:** Phase 4 (public profile requires Firestore — see `SPRINT3_PHASE4_SENTIMOS_SOCIAL.md`)
> **Purpose:** Authoritative design brief for the Profile/Identity Hub. The profile page is not a settings page — it is a social identity surface that aggregates every gamification metric in one place and is viewable by friends.

---

## Core Principle: Profile = Identity, Not Settings

From Gamification Transcript 6 — Duolingo's profile page serves one purpose: **making the user's progress feel real and legible to others.** It is not where you change your password. It is where you see your whole story: how long you've been saving, what level you are, what badges you've earned, how your streak compares to your friends.

Settings is a utility page. Profile is a trophy room. They must never be combined.

---

## 1. Two Profile Modes

### Own Profile (`profile.html` — no URL param or `?uid=me`)
- Fully editable: display name, avatar letter, email opt-in
- Shows private stats (all 4 metrics)
- Shows own badge shelf + "View all badges →" link to stats page
- Shows own Sentimos balance
- Resource bar always visible at top (owns authenticated shell)

### Friend Profile (`profile.html?uid=xxx`)
- Read-only — no edit controls
- Shows public stats: streak, level, streak-shield, badges (public subset)
- Hides Sentimos balance (private)
- Shows "FOLLOW / UNFOLLOW" button
- Shows "Gift ₵" button (Phase 4)
- Shows mutual badges (same badges both users have earned)

---

## 2. Page Layout

```
┌─────────────────────────────────────────┐
│  [← Back]              [⋯ More]        │  ← header
│                                         │
│  ─────────── IDENTITY HERO ────────────  │
│                                         │
│          ┌──────────┐                  │
│          │  M       │  ← 80px circle   │
│          │ (initial)│    colored bg     │
│          └──────────┘                  │
│            [Lv.4 shield]               │  ← overlaid bottom-right on avatar
│                                         │
│     Maria Cabrera                       │  ← display name, Sora, 1.25rem bold
│     Budget Keeper · Level 4            │  ← level name + number, muted
│     Saving since February 2026         │  ← join date as seniority marker
│                                         │
│  [FOLLOW]   [Gift ₵]                   │  ← CTAs (friend profile only)
│                                         │
│  ─────────── STATS GRID ───────────────  │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │  🔥  12      │  │  ⚡  1,240   │   │
│  │  Current     │  │  Total XP    │   │
│  │  Streak      │  │              │   │
│  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐   │
│  │  🏅  8       │  │  📅  6       │   │
│  │  Badges      │  │  Quests      │   │
│  │  Earned      │  │  Completed   │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ─────────── BADGE SHELF ──────────────  │
│                                         │
│  [badge]  [badge]  [badge]   View all → │
│                                         │
│  ─────────── WEEK ACTIVITY ────────────  │
│  ●  ●  ●  ●  ○  ○  ○                  │  ← mini 7-dot week row (read-only)
│  Mon Tue Wed Thu Fri Sat Sun            │
│                                         │
│  ─────────── FRIENDS ─────────────────  │  (own profile only)
│  [friend avatar row — horizontal scroll]│
│  [Find Friends →]                       │
└─────────────────────────────────────────┘
```

---

## 3. Identity Hero

### What Duolingo does
The profile hero shows: a large avatar (letter + colored circle), the user's display name, their XP league, the count of friends, and their daily streak. The avatar background color is determined by their current league tier — it changes as they level up, creating visible progression even in their identity.

### Avatar design

**Colored initial circle:**
- 80px diameter
- Background color = XP level tier color:
  - Level 1 (Rookie): warm brown `#C2773A`
  - Level 2 (Budget Keeper): slate grey `#6B7280`
  - Level 3 (Spending Scout): warm gold `#CA8A04`
  - Level 4 (Frugal Fighter): brand green `#2b8259`
  - Level 5 (Savings Sage): sapphire `#0284C7`
  - Level 6 (Wealth Warden): amethyst `#7C3AED`
  - Level 7 (Budget Legend): icy blue `#0891B2` with outer glow
- Text: first letter of first name, white, Sora, `font-size: 2rem`, `font-weight: 700`

**Level badge overlaid on avatar (bottom-right):**
- 24px shield icon
- Background: same tier color
- Shows the level number in white, `font-size: 0.6rem`
- Overlaid with a white border `2px solid white` to separate from the avatar
- Tapping the level badge opens the XP Progress Sheet

```html
<div class="profile-avatar" style="--tier-color: #2b8259">
  <span class="profile-avatar__initial">M</span>
  <div class="profile-avatar__level-badge" onclick="openXpSheet()">4</div>
</div>
```

```css
.profile-avatar              { width: 80px; height: 80px; border-radius: 50%; background: var(--tier-color); }
.profile-avatar__initial     { font-family: Sora; font-size: 2rem; font-weight: 700; color: white; }
.profile-avatar__level-badge { position: absolute; bottom: 0; right: 0; width: 24px; height: 24px;
                               background: var(--tier-color); border: 2px solid white; border-radius: 50%;
                               font-size: 0.6rem; font-weight: 700; color: white; }
```

### Display name line
- Name: Plus Jakarta Sans, `font-size: 1.25rem`, `font-weight: 700`
- Sub-line: `"Budget Keeper · Level 4"` — muted, `font-size: 0.875rem`
- Join date seniority: `"Saving since February 2026"` — smallest, most muted. This is the Duolingo "seniority marker" — makes the account feel real and established.

### Join date seniority — psychological significance

From Gamification Transcript 6: The Duolingo profile shows the date you "joined the streak" (started using the app). This creates **seniority identity** — the longer you've been here, the more your profile communicates investment. "Saving since February 2026" seen by a friend who joined in May 2026 communicates: "they're ahead of me."

**StorageAPI field:** `user.createdAt` (ISO string, already exists in the data model). Format: `Saving since {Month} {Year}`.

---

## 4. Stats Grid — 2×2

Four metrics, each in an equal-size tile:

| Tile | Icon | Value | Label | Tap action |
|---|---|---|---|---|
| Top-left | 🔥 | Current streak count | "Current Streak" | Opens Streak Detail Sheet |
| Top-right | ⚡ | Total XP | "Total XP" | Opens XP Progress Sheet |
| Bottom-left | 🏅 | Badges earned count | "Badges Earned" | Navigates to stats page |
| Bottom-right | 📅 | Quests completed count | "Quests Done" | Navigates to activity page |

**Tile visual design:**
- White card, `border-radius: 12px`, `padding: 1rem`
- Icon: 1.25rem emoji, top-left of tile
- Value: Sora, `font-size: 1.75rem`, `font-weight: 700`, `color: var(--text-primary)`
- Label: `font-size: 0.75rem`, `font-weight: 500`, `color: var(--text-muted)`
- On friend profiles: Sentimos balance tile replaces Quests Done tile (public-safe metric)

**Grid CSS:**
```css
.profile-stats-grid          { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.profile-stat-tile           { background: white; border-radius: 12px; padding: 1rem; }
.profile-stat-tile__value    { font-family: Sora; font-size: 1.75rem; font-weight: 700; }
.profile-stat-tile__label    { font-size: 0.75rem; color: var(--text-muted); }
```

**All tiles in the grid are tappable** — tapping a streak tile opens the Streak Detail Sheet directly, without navigating away from the profile. This is the Duolingo pattern — rich data accessible inline, not only on separate pages.

---

## 5. Badge Shelf — Profile Preview

The profile shows the 3 most recently earned badges in a horizontal strip, followed by "View all →" that navigates to `stats.html#achievements`.

```
RECENT BADGES
──────────────────────────────────
[badge art][badge art][badge art]    View all →
```

**Rules:**
- Only show **claimed** badges (not unclaimed unlockable ones — claiming is the user's action)
- Sort by `claimedAt` descending — most recently claimed first
- If 0 badges: show a single muted placeholder: "No badges yet. Log expenses to start earning!"
- If <3 badges: show only the badges that exist, no placeholder tiles
- Each badge art: same 72px colored square as the full badge grid (see `DESIGN_REF_BADGES_ACHIEVEMENTS.md`)
- Tapping any badge on the profile shelf navigates to `stats.html#achievements` (not a sheet — the full page is richer)
- "View all →" always present and tappable, even when 0 badges

**Friend profile badge shelf:**
- Only shows badges that are public (all current badges are public — no private badge concept)
- Shows "View N badges" text link if they have more than 3

---

## 6. Week Activity Strip — Mini Week Map

A simplified, read-only version of the dashboard's 7-node week map:

```
●  ●  ●  ●  ○  ○  ○
M  T  W  T  F  S  S
```

**Rules:**
- Dots only — no labels, no connection line, no chest icon
- Green filled = day with ≥1 log
- Grey empty = day with no log (past) or future
- No pulsing, no at-risk state on profile — the map here is historical, not live
- On friend profile: shows their week activity (fetched from Firestore public field)

**Purpose:** This strip is a visual resume of this week's consistency. Friends viewing your profile see at a glance how active you've been this week — passive social pressure without a number (no shame attached to grey dots, just presence).

---

## 7. Friends Section (Own Profile Only)

### What Duolingo does
Duolingo's profile shows a horizontal scroll of friend avatars (the first 7) and a "See all X friends" count link. Tapping a friend avatar navigates to their profile. The friends section on your own profile is both a status signal ("I have 12 friends here") and a navigation surface.

### SugboCents implementation

**Horizontal avatar scroll:**
```
FRIENDS  ·  8 total
──────────────────────────────────
[M]  [C]  [A]  [J]  [R]  [+3]   Find Friends →
```

- Each friend avatar: 40px colored initial circle (tier color, same logic as main avatar)
- Shows up to 5 friends, then a `[+N]` overflow indicator
- `[+N]` is tappable → navigates to a full friends list (or `leaderboard.html` filtered to friends)
- "Find Friends →" always visible; navigates to `leaderboard.html` (which has friend suggestion cards)

**Empty state:**
```
👥  No friends yet
    Add friends to see how you compare.
    [  Find Friends  ]
```

Brand green CTA, centered, with a muted illustration — never a blank white space.

---

## 8. Cross-Page Integration — All the Places Profile Data Surfaces

The profile page is the **aggregation point** — it pulls together data that is created and maintained on other pages. Here is where each data point comes from:

| Profile field | Created/updated by | Visible in profile | Also visible in |
|---|---|---|---|
| Current streak | `dashboard.js` after expense log | Stats grid tile | Resource bar chip, leaderboard rank rows |
| Total XP | `storage.js` addXpInternal | Stats grid tile | Resource bar chip, dashboard XP widget |
| Badges earned count | `storage.js` claimAchievement | Stats grid tile | Dashboard badge teaser |
| Quests completed | `storage.js` _completeQuest | Stats grid tile | Leaderboard sort (tertiary), activity feed |
| Recent badges | `storage.js` ACHIEVEMENTS | Badge shelf (3 most recent) | Dashboard badge teaser, stats full grid |
| Week activity | `storage.js` getExpenses | Week activity strip | Dashboard week map (full version) |
| Friends list | `firestore-service.js` getFriends | Friends section | Leaderboard rank list |
| Level badge | `storage.js` getXpInfo | Overlaid on avatar | Leaderboard rank row avatar |
| Join date | `user.createdAt` | "Saving since X" | — |
| ₵ balance | `storage.js` getSentimosBalance | Own profile stats grid | Resource bar chip, shop page |

**The profile is a read surface, not a write surface.** All the numbers shown here are maintained by other pages and other interactions. The profile just assembles them.

---

## 9. Navigation to Profile

The profile is reached from:

1. **Nav bar / Settings:** "My Profile" link in settings page header area
2. **Leaderboard rank rows:** Tapping any rank row → navigates to `profile.html?uid=xxx`
3. **Activity feed friend names:** Tapping a friend name in the activity feed
4. **Friend avatar in profile friends section:** Tapping a friend avatar

**Own profile:** `profile.html` (no param) or `profile.html?uid=me`
**Friend profile:** `profile.html?uid=FRIEND_UID`

Both use `data-protected="true"` — redirect to `login.html` if no session.

---

## 10. StorageAPI / Firestore Methods Required

```js
// Own profile (localStorage/StorageAPI)
StorageAPI.getCurrentUser()          // name, createdAt, weeklyBudget
StorageAPI.getCurrentStreak()        // streak number
StorageAPI.getXpInfo()               // {xp, level, levelName, xpToNext}
StorageAPI.getSentimosBalance()      // Sentimos number
StorageAPI.buildAchievementState()   // all achievements with claimed status
StorageAPI.getUser().questsCompleted // total quests completed count

// Friend profile (Firestore — Phase 4)
firestore-service.js:
  getPublicProfile(uid)          // {displayName, createdAt, streak, level, xp, weekBadge[]}
  getFriends()                   // [{uid, displayName, streak, level, ...}]
  sendFriendRequest(targetUid)   // → updates Firestore
  getFriendStatus(uid)           // 'friend' | 'pending' | 'none'
```

---

## 11. CSS Summary

```css
/* Identity hero */
.profile-avatar              { width: 80px; height: 80px; border-radius: 50%; position: relative; }
.profile-avatar__initial     { font-family: Sora; font-size: 2rem; font-weight: 700; color: white; }
.profile-avatar__level-badge { position: absolute; bottom: 2px; right: 2px; width: 24px; height: 24px;
                               border-radius: 50%; border: 2px solid white; }

.profile-name                { font-family: Sora; font-size: 1.25rem; font-weight: 700; }
.profile-sublabel            { font-size: 0.875rem; color: var(--text-muted); }
.profile-since               { font-size: 0.75rem; color: var(--text-muted); }

/* Stats grid */
.profile-stats-grid          { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.profile-stat-tile           { background: white; border-radius: 12px; padding: 1rem; cursor: pointer; }
.profile-stat-tile__value    { font-family: Sora; font-size: 1.75rem; font-weight: 700; }
.profile-stat-tile__label    { font-size: 0.75rem; color: var(--text-muted); }

/* Badge shelf */
.profile-badge-shelf         { display: flex; gap: 0.75rem; align-items: center; }
.profile-badge-shelf__art    { width: 56px; height: 56px; border-radius: 12px; }  /* smaller than full grid */

/* Week activity strip */
.profile-week-strip          { display: flex; gap: 0.5rem; }
.profile-week-dot            { width: 24px; height: 24px; border-radius: 50%; }
.profile-week-dot--logged    { background: #2b8259; }
.profile-week-dot--empty     { background: #E5E7EB; }

/* Friend avatars */
.profile-friends-row         { display: flex; gap: 0.5rem; overflow-x: auto; }
.profile-friend-avatar       { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
```

---

## 12. Implementation Checklist

- [ ] `profile.html` created with `data-protected="true"`
- [ ] Own profile mode (no uid param) vs friend profile mode (`?uid=xxx`) handled in `js/profile.js`
- [ ] Avatar is 80px colored initial circle — background color = XP level tier color
- [ ] Level badge (24px shield) overlaid bottom-right on avatar — tappable, opens XP Progress Sheet
- [ ] Display name, level sublabel, "Saving since Month Year" seniority marker all visible
- [ ] Stats 2×2 grid: streak / XP / badges / quests — all tiles tappable, open correct sheet or page
- [ ] Streak tile tap → Streak Detail Sheet (NOT a full page navigation)
- [ ] Badge shelf shows 3 most recently claimed badges + "View all →" → stats page
- [ ] Badge shelf shows muted placeholder when 0 badges
- [ ] Mini week activity strip (7 dots) is read-only historical view
- [ ] Friends section (own profile only): horizontal avatar scroll, "Find Friends →" CTA
- [ ] Friend profile mode: shows FOLLOW/UNFOLLOW button, Gift ₵ button (Phase 4)
- [ ] Friend profile mode: hides Sentimos balance, shows only public stats
- [ ] `profile.html?uid=xxx` fetches public Firestore profile (Phase 4)
- [ ] Navigable from: leaderboard rank rows, activity feed friend names, settings page
- [ ] Resource bar (🔥 ₵ ⚡) visible at top of profile page (injected by `app.js`)
- [ ] `profile.html` added to `sw.js` shell cache (bump version)
