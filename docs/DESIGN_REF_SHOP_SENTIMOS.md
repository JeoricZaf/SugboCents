# Design Reference — Shop & Sentimos Currency

> **Source research:** Duolingo Shop page, Duolingo Gems mechanic, Candle app "Restore" streak flow, Gamification transcripts 5 & 6
> **Maps to:** `shop.html` (new) + `js/app.js` (Sentimos balance sheet) + `js/storage.js` (Sentimos methods) + `js/dashboard.js` (identity hero chip) + `css/style.css`
> **Sprint:** Phase 4 (Sentimos requires Firestore sync — see `SPRINT3_PHASE4_SENTIMOS_SOCIAL.md`)
> **Purpose:** Authoritative design brief for Sentimos currency and the Shop page. Sentimos is a cross-page feature — this document covers all the places it appears.

---

## Core Principle: Visible Currency Creates Spending Agency

From Gamification Transcript 6 and Duolingo observation:

> The gem balance is shown on EVERY page. Not because the user needs to shop everywhere, but because seeing your balance creates the feeling of **wealth and potential**. Even when you have no intention of spending, seeing "₵ 340" creates a low-grade satisfaction — "I've earned this." That feeling is addictive. When the user has 0 gems, they feel a specific emptiness that motivates earning.

The ₵ chip in the resource bar is not a navigation element — it is an **emotional state indicator.**

---

## 1. Where Sentimos Appears (Full Cross-Page Map)

### READ THIS FIRST — Sentimos is not just a Shop feature

| Location | What appears | Trigger |
|---|---|---|
| **Resource bar (ALL pages)** | Teal chip `₵ 340` | Always visible; updates after any earn/spend |
| **Dashboard identity hero** | `₵ 340` chip beneath username | Same value as resource bar |
| **Quest cards (dashboard)** | `₵ 50` reward pill (right side of each card) | Shows what you'll earn, not what you have |
| **Quest complete modal** | `+₵ 50` in gold text | Auto-fires on completion |
| **Badge claim sheet** | `+₵ 25` reward preview | Before claim tap |
| **Week map chest (Day 7)** | `+₵ 50` in Perfect Week modal | On 7/7 completion |
| **Shop page** | Primary currency — shows balance at top | Page load |
| **Streak break recovery modal** | Freeze cost (`₵ 50`) with current balance shown | Fires after streak loss |
| **Profile page** | ₵ balance in identity stats 2×2 grid | Read-only |
| **Leaderboard rank rows** | "Gift ₵" button on friend rows (Phase 4) | Tap → gift confirmation |
| **Sentimos Balance Sheet** | Hero balance + transaction log + Shop CTA | Any page — via resource bar tap |

---

## 2. Earning Sentimos — The Complete Sources Table

Every earn event fires `StorageAPI.addSentimos(amount, source)` and dispatches `sugbocents:data-changed` so the resource bar chip updates immediately.

| Action | ₵ Earned | When it fires |
|---|---|---|
| Log an expense (any day) | ₵ 5 | Every `addExpense()` call |
| Complete today's mission (7/7 days) | ₵ 50 | Sunday end-of-week chest claim |
| Complete a weekly quest | ₵ 25–100 (quest-specific) | `updateQuestProgress()` marks complete |
| Claim a badge | ₵ 25 | `claimAchievement()` |
| Reach a streak milestone (7, 14, 30, 100) | ₵ 10, 20, 50, 100 | Streak check after expense log |
| Gift received from a friend | ₵ N (amount sent) | `giftSentimos()` Firestore transaction |
| Daily first log bonus | ₵ 2 | First `addExpense()` of each calendar day |

**Earning event animation:**
After any earn, fire a teal `+₵ N` float popup (same pattern as the gold `+N XP` popup in `js/gamification.js`). The popup floats upward from the ₵ chip in the resource bar — this visually anchors the coin gain to the balance display.

```js
// In GamificationUI (js/gamification.js) — add alongside showXpPopup:
showSentimosPopup(amount) {
  const el = document.createElement('div');
  el.className = 'sentimos-float-popup';
  el.textContent = `+₵ ${amount}`;
  // Position near the ₵ chip in the resource bar
  document.body.appendChild(el);
  // Animate upward, then remove
}
```

---

## 3. The Sentimos Balance Sheet — Global Bottom Sheet

This sheet is accessible from any page by tapping the ₵ chip in the resource bar. It is NOT a page — it is a bottom sheet rendered by `js/app.js`.

### Layout

```
┌──────────────────────────────────────┐
│                      ─── [drag pill] │
│                                      │
│          ₵  340                      │  ← hero balance, teal, Sora 3rem
│         Sentimos Balance             │  ← small muted label
│                                      │
│  ─────── RECENT ACTIVITY ──────────  │
│  +₵ 5    Logged expense     Today   │
│  +₵ 25   Quest complete     Mon     │
│  +₵ 5    Logged expense     Mon     │
│  +₵ 25   Badge claimed      Sun     │
│  -₵ 50   Streak Freeze used  Sat    │  ← spend events show in red tint
│                                      │
│  [  VISIT SHOP  ]                    │  ← full-width brand green CTA
└──────────────────────────────────────┘
```

### Balance display rules
- Hero number: `font-family: Sora`, `font-size: 3rem`, `font-weight: 700`, `color: #0D9488` (teal)
- Earn events: show in teal — `+₵ N`
- Spend events: show with a red tint label — `-₵ N` using `#DC2626`
- Max 10 events shown; "View all →" link beneath

### StorageAPI support
```js
StorageAPI.getSentimosLog()  // returns last 10 events [{amount, source, date, type: 'earn'|'spend'}]
StorageAPI.getSentimosBalance()  // returns current balance integer
```

---

## 4. The Shop Page (`shop.html`)

### What Duolingo does
The Duolingo Shop is minimal — it doesn't sell power features or pay-to-win items. It sells **recovery items** (streak freeze, heart refill) and **cosmetic items** (outfits for Duo). This is psychologically precise: recovery items reduce loss aversion, cosmetics create identity. Neither gives an unfair game advantage.

### SugboCents Shop — items and design

The shop sells exactly three things in Sprint 3. All items are utility (recovery), not cosmetic yet.

```
SHOP
────

  Your balance:  ₵  340         ← teal balance always shown at top of shop

  ─── STREAK PROTECTION ─────────────────

  ┌─────────────────────────────────────────┐
  │  🛡️  Streak Freeze                      │
  │       Protects your streak for 1 day   │
  │       if you miss logging.             │
  │                                        │
  │  0 / 2 EQUIPPED   [  GET FOR ₵ 50  ]  │
  └─────────────────────────────────────────┘

  ─── COMING SOON ──────────────────────────
  [locked card — blurred]   Avatar frames
  [locked card — blurred]   Custom themes
```

### Item card anatomy (Duolingo-inspired)

Every shop item follows this exact structure:

```
[Icon]  Item Name          ← bold, 1rem
        Description line   ← muted, 0.875rem
        Description line 2

[N / MAX EQUIPPED]         [  GET FOR ₵ N  ]
```

**Key design details from Duolingo screenshots:**
- "N / 2 EQUIPPED" language — not "You have N." The word "EQUIPPED" makes it feel like inventory management, not a transaction.
- When fully equipped (2/2): the GET button grays out and shows "FULL" — you cannot buy more than the cap.
- The gray-out state is intentional — it is a natural endpoint that doesn't feel like a wall.

**Streak Freeze specific rules:**
- Max equipped: 2 (matches Duolingo's cap)
- Cap serves dual purpose: (1) prevents users from permanently insulating themselves, (2) creates a cycle — use one, need to buy another
- Cost: ₵ 50 per freeze
- If balance < 50: GET button shows "₵ 50" but tapping shows an inline error — "You need ₱X more Sentimos" (never a modal). Never disable the button pre-emptively — let the user try and get the friendly message.

### Shop item states

| State | GET button | EQUIPPED badge | When |
|---|---|---|---|
| **Not owned** | `GET FOR ₵ 50` — teal fill | `0 / 2 EQUIPPED` — muted | Default |
| **Partially equipped** | `GET FOR ₵ 50` — teal fill | `1 / 2 EQUIPPED` — teal | 1 freeze owned |
| **Fully equipped** | `FULL` — grey, disabled | `2 / 2 EQUIPPED` — grey | 2 freezes owned |
| **Insufficient balance** | `GET FOR ₵ 50` — teal, enabled | `0 / 2 EQUIPPED` | Balance < 50 |
| **Coming soon (locked)** | Blurred | Blurred | Not yet available |

**Insufficient balance inline message:**
```
  ⚠  You need ₵ 12 more Sentimos.
     Log an expense to earn +₵ 5.
```
Shown directly under the button, no modal, no alert box.

### CSS class names

```css
.shop-page                   /* page wrapper */
.shop-balance-bar            /* balance display at top */
.shop-balance-bar__amount    /* teal, Sora, 1.5rem */

.shop-section                /* section header + items */
.shop-section__header        /* uppercase, 0.75rem, muted */

.shop-item-card              /* white card, padding, border-radius: 16px */
.shop-item-card__icon        /* 48px icon area */
.shop-item-card__title       /* 1rem, font-weight: 700 */
.shop-item-card__desc        /* 0.875rem, color: var(--text-muted) */
.shop-item-card__footer      /* flex row: equipped badge + CTA button */
.shop-item-card__equipped    /* muted text, 0.75rem */
.shop-item-card--locked      /* filter: blur(4px), pointer-events: none */

.shop-cta                    /* teal bg CTA button */
.shop-cta--full              /* grey bg, text "FULL", disabled */
.shop-cta__insufficient-msg  /* inline ⚠ message below button */
```

---

## 5. Streak Freeze — How It Works Across Pages

The Streak Freeze is the primary shop item. Because it is a recovery item (reduces loss aversion), it must surface at the exact moment of loss — not just in the shop.

### The Streak Break Recovery Modal — The Critical Moment

**When it fires:** At the user's first login or app open AFTER a day they missed logging. This is the Candle "Restore" pattern.

**Why at login, not at midnight:** The user may be asleep at midnight. The emotional impact of "you lost your streak" is highest when the user is actively using the app and sees what they lost.

**Modal layout:**

```
┌──────────────────────────────────────┐
│  [Tigom — sad/diminished pose]       │
│                                      │
│  💔  Your streak ended               │  ← header
│  You had a 12-day streak.            │  ← specific, personalised
│                                      │
│  ₵ 340   ← your balance             │  ← show balance right here
│                                      │
│  [  USE A STREAK FREEZE  ₵ 50  ]    │  ← teal, only if freeze equipped
│  or                                  │
│  [  Start fresh tomorrow  →  ]       │  ← muted text CTA, always available
└──────────────────────────────────────┘
```

**Key rules:**
1. The "USE A STREAK FREEZE" CTA only appears if the user has ≥1 freeze equipped. Never tease an option they can't use.
2. "Start fresh tomorrow" is always available — never trap the user. Compassionate design.
3. Show the user's current balance IN THE MODAL — they should know what they can afford without navigating away.
4. If they have 0 freezes but balance ≥ 50: show a third option — "Buy a Streak Freeze (₵ 50)" — which navigates to the shop.

**StorageAPI method:**
```js
StorageAPI.activateStreakFreeze()  // returns {success: boolean, newBalance: number, streakRestored: number}
```

### Streak Freeze status visible on dashboard

The dashboard identity hero shows a small shield chip when at least 1 freeze is equipped:

```
[🛡️ 1 Freeze]   ← teal shield, tap → shop page
```

When 0 freezes: chip hidden. When 2 freezes: `[🛡️ 2 Freezes]`.

---

## 6. The "Gift ₵" Feature (Phase 4 — Leaderboard)

On the leaderboard rank row for each friend, a small "Gift ₵" button appears:

```
3  [M]  Maria C.    🔥 14    [Gift ₵]
```

Tapping "Gift ₵" opens a gift confirmation:

```
┌──────────────────────────────┐
│  Gift Sentimos to Maria C.?  │
│                              │
│  [25₵]  [50₵]  [100₵]      │  ← amount selector (tap to choose)
│                              │
│  Your balance: ₵ 340        │
│  After gift:   ₵ 290        │  ← updates live as amount changes
│                              │
│  [  SEND GIFT  ]             │  ← teal, requires selection
│  [  Cancel  ]                │
└──────────────────────────────┘
```

**Rules:**
- Minimum gift: ₵ 25. Maximum: ₵ 100 per day per recipient.
- After sending: the sender sees `−₵ N` in their Sentimos log. The recipient sees `+₵ N  Gift from Maria C.`
- This uses `giftSentimos(toUid, amount)` which is a Firestore transaction.
- Gift animation: small teal ₵ particles float upward from the Gift button.

---

## 7. StorageAPI Methods Required (Summary)

```js
getSentimosBalance()          → number
addSentimos(amount, source)   → {newBalance}       // source: 'expense'|'quest'|'badge'|'week-complete'|'streak-milestone'|'gift'
spendSentimos(amount, reason) → {success, newBalance}  // reason: 'streak-freeze'|'gift-sent'
getSentimosLog()              → [{amount, source, type, date}]  // last 10 events, type: 'earn'|'spend'
activateStreakFreeze()         → {success, newBalance, streakRestored}
getStreakFreezeCount()         → number  // 0–2
```

---

## 8. Implementation Checklist

- [ ] ₵ chip in resource bar visible on all authenticated pages
- [ ] ₵ chip updates immediately after any earn or spend (via `sugbocents:data-changed` event)
- [ ] Tapping ₵ chip opens Sentimos Balance Sheet from any page
- [ ] Balance sheet shows hero balance, last 10 events, "Visit Shop" CTA
- [ ] `+₵ N` teal float popup fires after each earn (anchored to resource bar chip)
- [ ] Quest cards show ₵ reward pill (right side) — earned coins connect to the chip
- [ ] Badge claim sheet shows ₵ reward before claiming
- [ ] Week map Day 7 chest modal shows ₵ 50 reward
- [ ] Shop page shows balance at top of page
- [ ] Streak Freeze item card follows N/2 EQUIPPED anatomy
- [ ] "FULL" state grays out GET button when 2/2 equipped
- [ ] Insufficient balance shows inline message (not a modal or alert)
- [ ] Streak break recovery modal fires at first login after missed day
- [ ] Recovery modal shows user's current balance
- [ ] Recovery modal shows "USE STREAK FREEZE" CTA only if ≥1 freeze equipped
- [ ] Dashboard identity hero shows `🛡️ N Freeze(s)` chip when ≥1 equipped
- [ ] Profile page shows ₵ balance in stats grid
- [ ] Leaderboard rank rows show "Gift ₵" button (Phase 4)
- [ ] Gift confirmation shows live "After gift: ₵ N" balance preview
- [ ] All Sentimos text uses teal `#0D9488` — never green
