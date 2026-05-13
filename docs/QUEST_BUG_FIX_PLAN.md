# Quest System — Bug Fix Plan

**Audit Date:** May 13, 2026  
**Branch:** `fix/quest-bugs`

---

## Bugs Identified

### Bug 1 — `xp_earned_week` Formula Divergence (High)

**Impact:** "XP Grinder" quest (`quest-xp-200`) displays wrong progress bars. Nav badge count is overwritten with an incorrect value on every quests-page render.

**Location:**
- `js/quests.js` → `computeAllQuestProgress()` and `dispatchQuestBadge()`
- `js/storage.js` → `updateQuestProgress()` and `_computeAndCacheQuestBadge()`

**Root Cause:** Two formulas compute `xp_earned_week` and both write to the same badge cache:

```
quests.js:  var xpEarned = Math.min(logDays * 25, totalCount * 5);   // rough estimate
storage.js: var xpEarned = Math.max(0, user.xp - user.weeklyXpStart); // accurate delta
```

`dispatchQuestBadge()` (called at the end of every `renderQuestPage()`) overwrites the correct value from `_computeAndCacheQuestBadge()` with the inaccurate estimate. The inaccurate formula ignores streak bonuses, level-up XP grants, and quest XP, causing the XP Grinder progress bar to show a lower count than reality.

**Status:** Not yet fixed — out of scope for current sprint.

---

### Bug 2 — `daily-under-budget` Cannot Un-Complete After `completedAt` Set (High)

**Impact:** Once "Daily Saver" marks itself complete, it is permanently locked for that day even if the user subsequently logs expenses that push them over their daily budget, allowing fraudulent claiming.

**Location:** `js/storage.js` → `updateDailyQuestProgressInternal()`

**Root Cause:** The early-return guard on `completedAt` prevents the `under_daily_budget` snapshot condition from ever reversing:

```javascript
if (user.activeQuest.completedAt) { return; } // blocks reversal for snapshot conditions
```

**Resolution: Remove the `daily-under-budget` quest entirely.** See Phase 1 below.

---

### Bug 3 — Auto-Assigned Quest for New Users Not in Weekly Catalog (High)

**Impact:** A brand-new user's dashboard shows an auto-assigned quest that doesn't appear anywhere in the weekly catalog on `quests.html`. There is no way to view its details or progress context from the quests page.

**Location:**
- `js/storage.js` → `_buildFreshQuest()`: uses `getIsoWeekNumber(now) % QUESTS.length`
- `js/quests.js` → `getWeeklyQuestPool()`: uses `Math.floor(monday.getTime() / 604800000) * 5 % WEEKLY_QUEST_DEFS.length`

**Root Cause:** Two uncoordinated pool algorithms. `_buildFreshQuest` picks one quest via ISO week number modulo 12. `getWeeklyQuestPool` picks five quests via a timestamp-based week index. These are not aligned — the auto-assigned quest can be outside the five shown in the catalog.

**Status:** Not yet fixed — out of scope for current sprint.

---

### Bug 4 — Daily Quest Shown as "THIS WEEK'S QUEST" on Dashboard (Medium)

**Impact:** When a user tracks a daily quest, the dashboard mission card labels it "THIS WEEK'S QUEST" with a timer of "0 days left" or "1 day left", indistinguishable from an expiring weekly quest.

**Location:** `js/dashboard.js` → `renderQuestRow()`

**Root Cause:** Section header HTML is hardcoded with no `quest.type === "daily"` branch:

```javascript
sectionHdr.innerHTML =
    "<span class=\"quest-section-header__title\">THIS WEEK'S QUEST</span>" + ...
```

`expiresAt` for daily quests is end-of-day so `daysLeft` always evaluates to 0 or 1.

**Status:** Not yet fixed — out of scope for current sprint.

---

### Bug 5 — `condLabels` Map in `dashboard.js` Is Stale and Incomplete (Medium)

**Impact:** Opening the quest detail sheet on the dashboard for daily quests or "XP Grinder" / "Variety Pack" weekly quests shows raw internal type keys as labels (e.g., `"category_count_today"`, `"xp_earned_week"`) instead of human-readable text.

**Location:** `js/dashboard.js` → `openQuestDetailSheet()` — local `condLabels` map

**Root Cause:** The local map was never updated to match the complete `COND_LABELS` constant in `quests.js`. Missing keys:

```
"log_count_today", "category_count_today", "under_daily_budget",
"category_diversity_week", "xp_earned_week"
```

**Status:** Not yet fixed — out of scope for current sprint.

---

### Bug 6 — Daily Claim Button Omits `assignedAt`; Cross-Day Claim Uses Wrong Key (Medium)

**Impact:** A daily quest claimed the day after it was assigned generates a claim key for today's date rather than the `assignedAt` date. This mismatches the key checked by `getPendingDailyReward`, leaving `pendingDailyReward` un-cleared in storage and potentially allowing a double-award.

**Location:** `js/quests.js` → `renderDailyQuestsSection()` — claim button handler

**Root Cause:** `qDefForCard` is built without `assignedAt`:

```javascript
var qDefForCard = {
    id: def.id, icon: def.icon, title: def.title,
    description: def.description, xpReward: def.xpReward,
    sentimosReward: def.sentimosReward || 10
    // assignedAt is missing
};
```

When `claimQuestReward` receives `{ type: "daily" }` with no `assignedAt`, its daily-specific claim key branch (`questDef.assignedAt && ...`) falls through to `getQuestClaimKey(questId, "daily")` which uses today's date — wrong for a yesterday-assigned quest.

**Status:** Not yet fixed — out of scope for current sprint.

---

### Bug 7 — Dashboard Active Quest Progress Shows 0 Until Next Expense (High) ✅ FIXING

**Impact:** The dashboard mission card permanently shows `0 / N` for a freshly equipped weekly quest even when the user already has qualifying expenses. The quests page simultaneously shows the correct live-computed value (e.g., `3 / 7`).

**Location:**
- `js/storage.js` → `setCurrentQuest()`: saves quest with `progress: 0`, then dispatches `dataChanged` without recomputing.
- `js/dashboard.js` → `renderQuestRow()`: reads `quest.conditions[0].progress` directly from stored object.

**Root Cause:** `trackQuest()` in `quests.js` constructs `questToSave` with all conditions hard-reset to `progress: 0` before calling `setCurrentQuest`. `setCurrentQuest` persists this and immediately fires `sugbocents:dataChanged`. The dashboard re-renders from the stored value (0). `updateQuestProgress()` — which backfills progress from raw expenses — is only called by `addExpense`/`removeExpense`, never by the equip flow itself.

The quests page is not affected because it uses `computeAllQuestProgress()`, a live recompute over raw expenses, and never reads stored condition progress directly.

**Fix:** Call `updateQuestProgress()` inside `setCurrentQuest()` after `saveStore` but before `dispatchEvent`, guarded to run only when saving a non-null, non-daily quest. See Phase 2 below.

---

## Fix Plan

### Phase 1 — Remove `daily-under-budget` Quest (Fixes Bug 2)

Remove from all five registration points:

| File | Location | Action |
|------|----------|--------|
| `js/quests.js` | `DAILY_QUEST_DEFS` array | Delete entire `daily-under-budget` object (id, title, description, icon, rewards, compute fn) |
| `js/quests.js` | `DAILY_QUEST_STORAGE_CONDITIONS` map | Delete `"daily-under-budget"` entry |
| `js/quests.js` | `COND_LABELS` and `COND_UNITS` maps | Delete `"under_daily_budget"` entries |
| `js/storage.js` | `DAILY_QUEST_SPECS_INTERNAL` array | Delete `{ id: "daily-under-budget", ... }` entry |
| `js/storage.js` | `updateDailyQuestProgressInternal()` switch | Delete `case "under_daily_budget"` block |
| `js/storage.js` | `_computeAndCacheQuestBadge()` | Delete `else if (spec.condType === "under_daily_budget")` branch |

**Data safety note:** Existing users who have `daily-under-budget` in their quest history or `claimedQuestIds` are unaffected — that data is not touched. If a user has it as their active quest when this ships, `getCurrentQuest()` will still return it but the quest card will no longer render in the daily section.

### Phase 2 — Fix Dashboard Quest Progress Desync (Fixes Bug 7)

**File:** `js/storage.js` → `setCurrentQuest()`

After `user.activeQuest = questObj` and before `saveStore(store)` / `dispatchEvent(...)`:

1. Save the store first (so `updateQuestProgress()` reads the new quest).
2. Call `updateQuestProgress()` when `questObj` is non-null and `questObj.type !== "daily"`.
3. Then dispatch `sugbocents:dataChanged`.

This ensures stored `conditions[i].progress` values reflect actual expense history before any `dataChanged` listener re-renders the dashboard, eliminating the 0 / N desync.

**Why daily is excluded:** The remaining daily quests (`daily-first-log`, `daily-triple-log`, `daily-categories`) are all count-from-zero quests that legitimately start at 0 when equipped. `updateDailyQuestProgressInternal` requires private `(store, user)` args and is not callable from this path safely.

---

## Verification Checklist

- [ ] "Daily Saver" card is absent from Daily Quests section on `quests.html`
- [ ] "Daily Saver" is absent from the Change Quest modal daily list
- [ ] Nav badge count is not inflated by the removed quest
- [ ] Equip "Logging Habit" after logging 3 days → dashboard immediately shows `3 / 7`
- [ ] Log a new expense → dashboard progress increments correctly on next render
- [ ] Abandoning and re-equipping a quest resets stored progress correctly and re-syncs on equip
- [ ] New users who get auto-assigned a quest on first load → quest progress shows correctly after equip

---

## Out of Scope (Future Sprints)

| Bug | Notes |
|-----|-------|
| Bug 1 — `xp_earned_week` divergence | Replace `quests.js` estimate with `user.xp - user.weeklyXpStart` delta; run `dispatchQuestBadge` before (not after) `_computeAndCacheQuestBadge` |
| Bug 3 — Auto-assign pool mismatch | Align `_buildFreshQuest` to use the same timestamp-week-index formula as `getWeeklyQuestPool`, or remove first-ever auto-assign entirely |
| Bug 4 — Daily quest labeled "THIS WEEK'S QUEST" | Add `quest.type === "daily"` branch in `renderQuestRow` with "TODAY'S QUEST" header and a live countdown |
| Bug 5 — Stale `condLabels` in dashboard sheet | Replace the local map in `openQuestDetailSheet` with a reference to the full set matching `COND_LABELS` in `quests.js` |
| Bug 6 — Missing `assignedAt` in daily claim | Add `assignedAt: activeQuest && activeQuest.assignedAt` to `qDefForCard` construction in `renderDailyQuestsSection` |
