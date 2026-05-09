# SugboCents — Leaderboard Design Reference

> **Version:** 2.0 (Friends-Based Rebuild)
> **Status:** Active — implemented in `leaderboard.html` + `js/leaderboard.js`
> **Source references:**
> - Duolingo leaderboard and league UI (web + documented behavioral research)
> - `DESIGN_REF_LEADERBOARD.md` (prior spec)
> - `GAMIFICATION_DESIGN_V1.md`
> - Gamification Transcripts 2, 5, 6
> - `DESIGN_REF_CROSS_PAGE_CONTRACT.md`

---

## Core Psychological Principle

From Gamification Transcript 6:

> *"Without social visibility, a user can quit the craving machine privately. When their progression is visible to others, quitting stops being about losing progress — it becomes publicly admitting they stopped."*

The leaderboard is the **Invisible Scoreboard** — the third and most powerful retention mechanism, activating only after the Craving Machine (quests) and Infinite Game (badges) are in place.

---

## 1. Ranking Metrics — Current Phase

Users are ranked by three metrics in priority order:

| Priority | Metric | Rationale |
|---|---|---|
| 1st | **Streak count** | Primary consistency signal — most visible, most emotional, hardest to fake |
| 2nd | **Quests completed (lifetime)** | Depth signal — rewards users who engage with structured goals |
| 3rd | **Weekly XP** | Tiebreaker — recent activity signal, resets Monday |

**Why not raw peso amounts:** From Gamification Transcript 2 (Finbase case study): ranking by amounts destroys fairness perception — a ₱500/week user can never compete with a ₱5,000/week user. Consistency metrics are income-neutral. Anyone can log expenses every day, regardless of how much they spend.

**All three stats are displayed on every rank card** so users can see how they compare across all dimensions, not just their overall rank. This is a direct pattern from Duolingo's league rows — you see the XP score prominently, but can also tap to see breakdown stats.

---

## 2. Friends-Only Scope

The leaderboard shows **only mutual friends**. No public, anonymous, or non-friend users appear.

**Why friends-only:**
- From Duolingo behavioral research: competition is most motivating when it's against people you know. Competing against strangers produces anxiety; competing against friends produces engagement.
- Duolingo's original league system was strangers-based and showed moderate retention. When Duolingo added friend-specific weekly challenges, engagement metrics improved significantly — the personal relationship amplifies the competitive hook.
- A friends-only scope also means every user on the leaderboard has consented to social visibility.

**No friends yet:** Show the empty state (see Section 9 below). Never show a blank page.

---

## 3. Podium — Top 3 Visual Treatment

### Duolingo reference
Duolingo displays the top 3 league finishers with a podium-style layout: the #1 finisher is in the center, elevated on the tallest bar, with a gold crown. #2 and #3 flank them at lower heights on silver and bronze bars. This is the most visually distinct section of the leaderboard — it communicates "these people won" before any score is read.

### SugboCents implementation
The top 3 users get a podium treatment rendered above the regular rank list:

```
        [👑]
      [AVATAR]                [🥈]     [🥉]
     [Name · L7]           [AVATAR]  [AVATAR]
  🔥14  ✅5  ⚡320        [Name]    [Name]
  ─────────────────       🔥12 ✅4  🔥9 ✅3
  ████████████████
      ████████          ██████████ ██████████
  ────────  ────────  ────────
     1st        2nd        3rd
```

**Design specifics:**
- 1st place: center position, avatar 52px, gold border `#EAB308`, crown emoji 👑 above, bar height 72px
- 2nd place: left position, avatar 44px, silver border `#9CA3AF`, medal emoji 🥈, bar height 56px
- 3rd place: right position, avatar 44px, bronze border `#C2773A`, medal emoji 🥉, bar height 44px
- All three show all three stats (streak, quests, weeklyXP) below their name
- The podium section has a subtle gradient background (`rgba(43, 130, 89, 0.04)`) — Duolingo uses a very light background wash to distinguish the podium zone
- **Promotion zone visual marker:** The podium background itself communicates "promotion zone" — these three are at the top. A small green label reads "Top 3" to make it explicit.

---

## 4. Pinned Self-Rank Card

### Duolingo reference
Duolingo's most sticky design pattern: your own rank row is **pinned to the bottom of the viewport** at all times. Even when you scroll up to see #1, your own rank card stays visible at the bottom. This creates constant awareness of your position, making every scroll through the list feel personal — you're always comparing yourself against others.

When you scroll down to your actual position in the list, the pinned card hides (to avoid duplication). It reappears when you scroll back up past your position.

### SugboCents implementation
```css
.lb-pinned-self-card {
  position: fixed;
  bottom: 72px; /* above bottom nav */
  left: 0; right: 0;
  z-index: 50;
  max-width: 512px;
  margin: 0 auto;
  /* brand green accent + shadow */
}
```

- Pinned card shows: rank #, movement indicator, avatar, name "(You)", all three stats
- Uses brand green left border and light green background to distinguish it visually
- Implemented with IntersectionObserver: hides when the user's actual row scrolls into view
- Has a subtle drop shadow to lift it above the content

---

## 5. "Just Ahead" Motivational Anchor

### Psychological basis
The "just ahead" hook is the single most behaviorally powerful element of the leaderboard. From Duolingo research and behavioral psychology (proximity bias): when users see a specific, reachable target just above them, they are far more likely to act to close the gap than when shown an abstract rank number.

Duolingo shows this as a motivational line between your row and the person above you: "You are X XP away from passing [Name]." The XP gap is exact and small enough to feel achievable.

### SugboCents implementation
A visually distinct banner is inserted **between the person ranked directly above you and your own row**:

```
┌────────────────────────────────────────────────────┐
│  🔥 You're 47 XP away from overtaking Kai Santos  │
└────────────────────────────────────────────────────┘
```

**Design specifics:**
- Background: warm amber `#FEF3C7`, border: `#FCD34D`
- Flame emoji + bold text + exact XP gap + name
- Font weight 700, small (0.78rem) but prominent through color contrast
- **This is the most important psychological hook in the entire leaderboard. It must be impossible to miss.**
- If user is already #1: show "You're leading the pack — keep your streak alive! 🔥" instead
- If user has no friends: not shown

---

## 6. Rank Movement Indicators

Movement indicators show whether a user moved up, down, or stayed since the previous leaderboard load.

| Symbol | Class | Color | Meaning |
|---|---|---|---|
| ↑ | `.lb-move--up` | `#16a34a` green | Moved up since last load |
| ↓ | `.lb-move--down` | `#dc2626` red | Moved down since last load |
| — | `.lb-move--same` | `#94a3b8` grey | No change |

**Implementation:** The previous ranking order is stored in `localStorage` keyed by `sugbocents_lb_snapshot`. On each leaderboard load, the current order is compared to the stored snapshot. After comparison, the new order is saved. First-time users always see —.

**Why this matters (Duolingo reference):** Duolingo shows movement arrows on every row in the league. Users who moved up feel rewarded; users who moved down feel urgency. Both emotions drive return visits.

---

## 7. Rank Card Anatomy

Every friend rank card (rows 4+, below the podium) follows this layout:

```
[↑] [AVATAR]  Name          🔥 14  ✅ 5  ⚡ 320
 3
```

**Detailed spec:**
- **Rank number:** left-aligned, Sora bold, gold for #1 (if outside podium), silver for #2, bronze for #3, grey for 4+
- **Movement indicator:** immediately right of rank number, small (0.7rem)
- **Avatar:** 40px colored circle, initial of first name. Color based on level tier (bronze brown → silver grey → gold yellow → emerald green → diamond blue)
- **Display name:** `[firstName] [lastInitial].` (privacy — never full last name). Font weight 700.
- **Stats row:** three chips in a row:
  - 🔥 streak count (orange when > 0, grey when 0)
  - ✅ quests completed (teal)
  - ⚡ weekly XP (brand green)
- **Your own row:** brand green left border `3px solid var(--brand-700)`, light green background `rgba(43, 130, 89, 0.08)`, name shows "(You)" label

**Tapping a friend row** navigates to `profile.html?uid=FRIEND_UID` — not a modal.

---

## 8. Promotion Zone Visual Marker

Even though the global league system is not being built yet, the **top 3 rows are visually distinguished** as a "promotion zone" to plant the seed of what's coming.

### Duolingo reference
Duolingo's league shows a green dashed border and "Promotion Zone" label above the top N rows. A red dashed border and "Demotion Zone" label marks the bottom rows. This creates urgency at both ends of the leaderboard.

### SugboCents implementation
- Top 3 rows have a **very subtle green left border** (2px `#16a34a`) and the podium area has the green badge
- A small "Promotion Zone ↑" label appears between the podium and row 4
- No demotion zone is shown at this phase (friends-only, no stakes yet)
- Future: when global leagues ship (Phase 2), full promotion/demotion bands will be added

---

## 9. Empty State — No Friends Yet

### Duolingo reference
Duolingo's empty league state never shows a blank page. Instead, it renders:
1. The league shield and header (so you know the system exists)
2. Blurred ghost rows beneath (showing what you're missing)
3. A single, specific CTA: "Add friends to compete this week"

The visual message is: *this is real and alive — you're just not part of it yet.*

### SugboCents implementation
```
[League header + shields + countdown]

[5 blurred ghost rows — CSS blur(5px) + opacity 0.5 + pointer-events: none]

┌──────────────────────────────────────┐
│  👥                                  │
│  No friends yet                      │
│  Invite someone to compete this      │
│  week 🔥                             │
│                                      │
│  [  Add a Friend  ]  →ↈprofile.html │
└──────────────────────────────────────┘
```

- The ghost rows use `.lb-row--ghost` (blur + opacity + pointer-events none)
- The overlay card sits on top of the ghost rows with a white semi-transparent background
- **Never show a blank page or just a message.**

---

## 10. Weekly Reset Countdown

### Duolingo reference
An orange timer chip beneath the league name shows exactly how much time remains before the leaderboard resets. When < 24 hours: shows hours. When < 1 hour: shows "Resetting soon" with a pulse animation. This creates urgency — "I have X days to climb before it resets."

### SugboCents implementation
- Orange pill chip: `⏱ Resets in 3 days`
- Cadence: resets every Monday at 00:00 (week starts Monday — consistent with expense tracking)
- Color: `#c2410c` on `#fff7ed` background — matches streak orange
- When < 24h: `Resets in N hours`
- When < 1h: `Resetting soon` (add pulse animation via CSS)
- Live-updating via `setInterval` every 60 seconds

---

## 11. Leaderboard Header

Styled after Duolingo's league header:
- League gem shields row (current tier + next + locked next-next) — same as before
- League name: "Weekly Friends League"
- Week date range: `May 6 – 12, 2025`
- Countdown chip: `⏱ Resets in 3 days`

The week range grounds the leaderboard in time, making it feel like a live event rather than a static list. Duolingo always shows the current week's date range in its league header.

---

## 12. Dashboard Leaderboard Snippet

### Duolingo reference
On Duolingo's home screen, a compact league card shows:
- Your current league name and rank
- The top 3 with their XP scores
- A "View League" link

The snippet is minimal — it communicates urgency (your rank, the gap) without requiring you to navigate away.

### SugboCents implementation
The dashboard widget (`#lbDashWidget`) shows:
1. **Your rank among friends** — e.g., "#3 of 7 friends"
2. **"Just ahead" line** — "You're 47 XP from overtaking Kai S. 🔥"
3. **Top 3 mini rows** — rank #, initial avatar, name, weekly XP
4. **"See Full Leaderboard →"** link

If no friends: shows "Add friends to compete 🔥" CTA that links to profile.html.

---

## 13. Friends System — Design

The leaderboard requires a working friends system. The spec for the friends system:

**Firestore structure:**
```
friends/{myUserId}/friends/{friendId}
  - addedAt: ISO timestamp
  - displayName: string (cached)

friends/{myUserId}/requests/{requesterId}
  - sentAt: ISO timestamp
  - displayName: string (requester's cached name)
```

**Public profile (read by friends):**
```
users/{userId}  (main user doc)
  - publicProfile.displayName
  - publicProfile.firstName
  - publicProfile.streak
  - publicProfile.questsCompleted
  - publicProfile.weeklyXP
  - publicProfile.level
  - publicProfile.levelName
  - publicProfile.lastSyncedAt
```

**User flows:**
1. Share your User ID with a friend (shown on your profile page)
2. Friend enters your UID in "Add Friend" form on their profile → sends request
3. You see the pending request on your profile → Accept or Decline
4. Once accepted: both appear on each other's leaderboard

**Friend request UI on profile.html:**
- Own profile: shows "My Friend Code: [UID]", a copy button, and an "Add Friend" input field
- Incoming requests section: shows pending requests with Accept/Decline buttons
- Friends list: shows all mutual friends with their tier and streak

---

## 14. CSS Variables Added

In `:root` of `css/style.css`:
```css
--rank-gold:     #EAB308;
--rank-silver:   #9CA3AF;
--rank-bronze:   #C2773A;
--self-row-bg:   rgba(43, 130, 89, 0.08);
--promote-zone:  rgba(22, 163, 74, 0.05);
--just-ahead-bg: #FEF3C7;
--just-ahead-border: #FCD34D;
```

---

## 15. Script Loading Order

Per existing convention in all HTML pages:
```
firebase-init.js
→ firebase-auth-service.js
→ firestore-service.js
→ storage.js
→ app.js
→ dark-mode.js
→ leaderboard.js  (page-specific last)
```

---

---

## FUTURE ADDITIONS

*The following sections are documented for future implementation only. Do not implement now.*

---

### Future Addition A — Additional Ranking Metrics

Three additional metrics may be added as secondary/tertiary sort dimensions in a future sprint:

**1. Budget Adherence Score**
- Definition: Percentage of weeks in the last 8 weeks where the user stayed under their weekly budget
- Formula: `(underBudgetWeeks / 8) * 100`, expressed as a percentage
- Display: "87% budget adherence"
- Why deferred: Requires at least 4 weeks of data to be meaningful for most users. Showing it too early produces 0% scores that discourage new users.

**2. Savings Rate %**
- Definition: `(weeklyBudget - totalSpentThisWeek) / weeklyBudget * 100`
- Display: "Saved 23% this week"
- Why deferred: This metric is income-relative — a user with a ₱500 budget who saves ₱100 (20%) looks identical to a user with a ₱5,000 budget who saves ₱1,000 (20%). This is fine for self-comparison but introduces complexity in ranking logic when combined with streak and quests. Needs careful normalization design before exposing competitively.

**3. Weekly Log Consistency**
- Definition: Number of distinct calendar days with at least one logged expense in the current week (0–7)
- Display: "Logged 5/7 days"
- Why deferred: This overlaps heavily with streak count (the primary metric) and would create redundancy in the rank card stats row. It becomes more useful as a secondary stat when the streak resets to 0 — a user who logs 5 days but breaks their streak would still show strong log consistency. Deferred until the stats row is validated with users.

---

### Future Addition B — Phase 2 Global League

*The opt-in anonymous global league. Not building now — document only.*

#### Design Model: Duolingo Leagues

Duolingo's league system places 30 random users of similar XP level into a weekly cohort. At the end of the week, the top N advance to the next tier; the bottom N get demoted. The tiers are: Bronze → Silver → Gold → Platinum → Diamond. The system is not based on absolute skill — it's designed so that every user can achieve promotion if they try hard enough that week.

The psychological model: you're not competing against the global top. You're competing against 29 people at your level, this week. The achievability of promotion is what makes it compelling.

#### SugboCents Global League Tiers — Filipino-Branded

| Tier | Name | Color | Filipino meaning |
|---|---|---|---|
| 1 | Barya | Copper brown | Loose change — humble beginning |
| 2 | Piso | Silver | One peso — first real currency unit |
| 3 | Budget | Teal | Self-explanatory — you're budget-aware now |
| 4 | Ipon | Gold | "Savings" — you've mastered the habit |
| 5 | Yaman | Emerald | "Wealth" — rare, prestigious |

**League mechanics (future):**
- Weekly cohort of 20–30 users at similar XP level, opt-in anonymous
- Top 5 advance; bottom 5 demote
- Promotion/demotion zone bands shown on leaderboard with green/red dividers (exactly as Duolingo does)
- Philippine-themed league name badges instead of Duolingo's shields
- Current friends-only leaderboard and global league will coexist (two tabs: "Friends" | "League")

**Opt-in anonymous:** Users choose whether to join the global league. Their display name in the global league is `[firstName] [lastInitial].` — never full name. This matches Duolingo's privacy model for strangers.

**Why deferred:** The global league requires a fair cohort-matching algorithm, a weekly snapshot system (rank lock at Monday 00:00, results tallied Sunday 23:59), and push notification infrastructure for "you've been promoted!" moments. These require backend Cloud Functions work beyond the current sprint scope.
