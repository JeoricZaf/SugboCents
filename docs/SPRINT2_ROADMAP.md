# Sprint 2 Roadmap — SugboCents
**Status key:** ☐ Not started · ⏳ In progress · ✅ Done

> Work sequentially through phases. Mark each item ✅ when tested and confirmed.
> When an entire phase is done, mark the phase heading ✅ so we skip it in future reads.

---

## Phase 1: Quick Fixes (Teacher Feedback) ✅

### 1.1 Content Width Cap on Desktop
- [ ] In `css/style.css`, find the `@media (min-width: 1024px)` block for `.app-main > main`
- [ ] Change `max-width: none` → `max-width: 720px`
- [ ] Confirm `margin-left: auto; margin-right: auto` is on the same selector
- **Verify:** open any page at 1440px wide — content should be centered, not wall-to-wall

### 1.2 Progress Bar: Visible Color + Bigger
- [ ] `.budget-progress-track` height: `0.55rem` → `0.85rem`; add `border-radius: 999px`
- [ ] `.budget-progress-bar` default fill: `#86efac` → `rgba(255,255,255,0.85)` (white on dark green = clearly visible)
- [ ] `.budget-progress-bar.pct-warn` — keep `#fde68a` (amber)
- [ ] `.budget-progress-bar.pct-danger` — keep `#fca5a5` (pink-red)
- [ ] Add `border-radius: 999px` to `.budget-progress-bar` as well
- **Verify:** log a small expense — bar is clearly visible on the green card at low %

### 1.3 Budget % Label Bigger
- [ ] Add explicit CSS rule targeting `#progressLabel`: `font-size: 0.95rem; font-weight: 800`
- **Verify:** "X% spent" label is prominent, not tiny

### 1.4 Center the Quick-Add Modal
- [ ] In `css/style.css`, change `.modal-backdrop` from `align-items: flex-end` → `align-items: center; justify-content: center`
- [ ] `.modal-sheet`: change `border-radius: 1.4rem 1.4rem 0.8rem 0.8rem` → `border-radius: 1.4rem` (uniform)
- **Verify:** click "Add" on dashboard — modal appears center-screen, not sliding from bottom

### 1.5 Quick-Add "Add +" Button — More Prominent
- [ ] `.qa-inline-add-btn` in `css/style.css`: increase padding to `0.55rem 1.25rem`, `font-size: 0.9rem`, `font-weight: 700`
- **Verify:** button is easy to tap/click and visually clear

### 1.6 Limit Recent Expenses to 5 + "View all" Link
- [ ] In `js/dashboard.js` → `renderRecentExpenses()`: change `getExpenses(20)` → `getExpenses(5)`
- [ ] Below `#recentExpenseList`, add an anchor: `<a href="activity.html" class="view-all-link">View all expenses →</a>`
- [ ] Add `.view-all-link` CSS: `display: block; text-align: right; font-size: 0.82rem; font-weight: 600; color: var(--brand-800); padding: 0.6rem 0.85rem 0.5rem; text-decoration: none;`
- **Verify:** dashboard shows max 5 rows; link navigates to activity page

---

## Phase 2: Collapsible Sidebar ✅

> Affects all 5 sidebar pages. Do HTML changes to all pages first, then CSS, then JS.

### 2.1 Wrap Nav Labels in `<span class="nav-link-label">`
- [ ] In each `.sidebar-nav-link` across all 5 pages, wrap the text node in `<span class="nav-link-label">Text</span>`
- [ ] Wrap `.sidebar-user-name` and `.sidebar-user-sub` text content in `<span class="nav-link-label">` as well
- [ ] Pages: `dashboard.html`, `activity.html`, `stats.html`, `tigom.html`, `settings.html`

### 2.2 Add Sidebar Toggle Button (all 5 pages)
- [ ] In each `.app-sidebar`, add just before `</aside>`:
  ```html
  <button id="sidebarToggle" class="sidebar-toggle-btn" aria-label="Toggle sidebar">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  </button>
  ```
- [ ] Pages: `dashboard.html`, `activity.html`, `stats.html`, `tigom.html`, `settings.html`

### 2.3 Sidebar Collapse CSS (`css/style.css`)
- [ ] Add `.app-layout.sidebar-collapsed` rule: `grid-template-columns: 64px 1fr`
- [ ] Add `transition: width 220ms ease, min-width 220ms ease` to `.app-sidebar` base styles
- [ ] `.app-layout.sidebar-collapsed .app-sidebar`: `width: 64px; min-width: 64px; overflow: hidden`
- [ ] `.app-layout.sidebar-collapsed .nav-link-label`: `display: none`
- [ ] `.app-layout.sidebar-collapsed .sidebar-brand-name`: `display: none`
- [ ] `.sidebar-toggle-btn`: positioned at bottom of sidebar, minimal styling, `color: #64748b`
- [ ] `.app-layout.sidebar-collapsed .sidebar-toggle-btn svg`: `transform: rotate(180deg)`

### 2.4 Sidebar Toggle JS (`js/app.js`)
- [ ] On init: if `localStorage.getItem("sidebarCollapsed") === "true"`, add class `sidebar-collapsed` to `.app-layout`
- [ ] Wire `#sidebarToggle` click: toggle `.sidebar-collapsed` on `.app-layout`, persist state to `localStorage`
- **Verify:** click toggle → sidebar shrinks to 64px icon rail; refresh page → state preserved

---

## Phase 3: Activity Page — Full Implementation ☐

> **Assigned to:** [user — primary]

### 3.1 `activity.html` — Replace Placeholder
- [ ] Remove `.placeholder-hero` block
- [ ] Add category filter chips row: `<div id="categoryFilter" class="category-filter-bar"></div>`
- [ ] Add expenses list: `<ul id="activityList" class="card-panel divide-y divide-slate-100 mt-4"></ul>`
- [ ] Add empty state: `<p id="emptyActivity" class="card-panel p-4 text-sm text-slate-500 hidden">No expenses logged yet.</p>`
- [ ] Add count label: `<p id="activityCount" class="text-xs text-slate-400 mt-2 px-1"></p>`
- [ ] Load `js/activity.js` at bottom of body (after `storage.js` and `app.js`)

### 3.2 `js/activity.js` — New File
- [ ] IIFE, guards on `document.body.dataset.page === "activity"`
- [ ] Load all expenses via `StorageAPI.getExpenses()` (no limit)
- [ ] Group expenses by date into sections: "Today", "Yesterday", or "Apr 23" format
- [ ] Derive unique category chips from expense list + "All" chip selected by default
- [ ] Wire chip clicks: client-side filter, re-render list without new network call
- [ ] Reuse `.expense-row` + `.expense-chip` + `.expense-delete-btn` HTML pattern from dashboard
- [ ] Show total count in `#activityCount`: "Showing X expenses"
- [ ] Wire delete button with same undo-toast pattern as `dashboard.js`

### 3.3 Category Filter CSS (`css/style.css`)
- [ ] `.category-filter-bar`: `display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem`
- [ ] `.filter-chip`: pill, `background: #f1f5f9; color: #475569; border-radius: 999px; padding: 0.3rem 0.9rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 2px solid transparent`
- [ ] `.filter-chip.active`: `background: #e7f5ed; color: var(--brand-800); border-color: var(--brand-800)`

---

## Phase 4: Stats Page — Full Implementation ☐

### 4.1 `stats.html` — Replace Placeholder
- [ ] Remove `.placeholder-hero` block
- [ ] Add 3 summary stat chips row: `<div id="statsChips" class="stats-chips-row mt-4"></div>`
- [ ] Add category filter chips row: `<div id="statsCategoryFilter" class="category-filter-bar mt-4"></div>`
- [ ] Copy the full `<section class="spending-chart-section" ...>` scaffold from `dashboard.html` (same IDs: `#spendingChartSection`, `#spendingChartContainer`, `#chartPeriod` — `spending-chart.js` auto-inits on these)
- [ ] Load `spending-chart.js` and new `js/stats.js` at bottom of body

### 4.2 `js/stats.js` — New File
- [ ] IIFE, guards on `document.body.dataset.page === "stats"`
- [ ] Read `StorageAPI.getBudgetSummary()` + `StorageAPI.getExpenses()`
- [ ] Render 3 stat chips in `#statsChips`: "This week: ₱X", "X expenses this week", "Top: [Category]"
- [ ] Category highlight chips in `#statsCategoryFilter`: clicking a category visually emphasizes its bar (adds a CSS class to the relevant SVG `<rect>`) — not a hard filter, just a visual highlight

### 4.3 Stats CSS (`css/style.css`)
- [ ] `.stats-chips-row`: `display: flex; gap: 0.6rem; flex-wrap: wrap`
- [ ] `.stat-chip`: `background: var(--card); border-radius: var(--radius-lg); padding: 0.7rem 1rem; font-size: 0.82rem; font-weight: 700; box-shadow: var(--shadow-soft); flex: 1; min-width: 120px`
- [ ] `.stat-chip-label`: `display: block; font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem`
- [ ] `.stat-chip-value`: `display: block; color: var(--brand-800); font-size: 1.05rem`

---

## Phase 5: Tigom + Savings + Gamification ☐

> **Assigned to:** [user — primary]
> Mascot artwork: handled by another team member. Use blank placeholder for now.
> Integration points are clearly marked so the mascot asset can be dropped in without touching JS.

### 5.1 `js/storage.js` — Savings Data Model + Gamification Methods
- [ ] Add `savings: []` and `quickSavingsItems: []` to the default user object in `_getStore()` / default user creation
- [ ] `addSavings({ amount, note })` → creates `{ id, amount, note, timestamp }`, prepends to `savings[]`, syncs Firestore if in Firebase mode
- [ ] `getSavings(limit?)` → returns savings sorted newest-first, optionally limited
- [ ] `getSavingsTotal()` → sums all `savings[].amount`, returns number
- [ ] `getQuickSavingsItems()` → returns `quickSavingsItems[]`
- [ ] `saveQuickSavingsItems(items[])` → saves array
- [ ] `getCurrentStreak()` → counts consecutive days backwards from today where ≥1 expense was logged; returns integer (0 if no expense today or yesterday)
- [ ] `getTigomMood()` → returns `"happy"` (< 50% spent), `"neutral"` (50–79%), or `"worried"` (≥ 80%) based on `getBudgetSummary().percentageSpent`
- [ ] `getAiContext()` → returns `{ weeklyBudget, percentageSpent, totalSpent, categoryTotals: { [category]: amount }, daysIntoWeek, savingsTotal }` — used by the AI recommendations module

### 5.2 `tigom.html` — Replace Placeholder
- [ ] **Tigom mood hero section:**
  - `<div id="tigomMascotWrap" class="tigom-mascot-wrap tigom-happy">` — outer card, mood class changes (`.tigom-happy` / `.tigom-neutral` / `.tigom-worried`)
  - `<div id="tigomMascot" class="tigom-mascot-placeholder"></div>` — **mascot drop-in point**: blank now; team member replaces with animated asset
  - `<p id="tigomMoodLabel">Tigom is happy!</p>`
  - `<p id="tigomMoodMsg">You're well within budget. Keep it up!</p>`
  - `<span id="tigomStreakChip" class="streak-chip">🔥 0-day streak</span>`
- [ ] **Savings total display:**
  - `<div id="savingsTotal" class="savings-total-display">₱0.00</div>`
  - Label: "Total saved"
- [ ] **Savings quick-add section** (same layout pattern as `#quickAddGrid` on dashboard):
  - `<h2>Quick save</h2>` + `<button id="addNewSavingsQaBtn" class="qa-inline-add-btn">+ Add</button>`
  - `<div id="savingsQuickAddGrid" class="grid grid-cols-2 gap-3"></div>`
- [ ] **Log savings form** (same pattern as log-expense in dashboard):
  - `<input type="number" id="logSavingsAmount">` with ₱ prefix
  - `<input type="text" id="logSavingsNote" maxlength="40">` for note
  - `<button id="logSavingsBtn">Log savings</button>`
  - `<p id="logSavingsError" class="field-error hidden"></p>`
- [ ] **Savings history list:**
  - `<ul id="savingsHistoryList" class="card-panel divide-y divide-slate-100"></ul>`
  - `<p id="emptySavingsState" class="card-panel p-4 text-sm text-slate-500 hidden">No savings logged yet.</p>`
- [ ] **Savings quick-add modal** (copy `#qaModal` structure, rename IDs to `#savingsQaModal`, `#savingsQaModalCategory`, etc.)
- [ ] Load `js/tigom.js`

### 5.3 `js/tigom.js` — New File
- [ ] IIFE, guards on `document.body.dataset.page === "tigom"`
- [ ] `renderTigomMood()` — calls `getTigomMood()` + `getCurrentStreak()`; sets label, message, streak chip; applies `.tigom-happy/.tigom-neutral/.tigom-worried` class to `#tigomMascotWrap`
- [ ] `renderSavingsTotal()` — calls `getSavingsTotal()`, formats ₱ amount, updates `#savingsTotal`
- [ ] `renderSavingsQuickAdd()` — same CRUD loop as `renderQuickAddButtons()` in `dashboard.js` but calls `getQuickSavingsItems()` / `saveQuickSavingsItems()`; clicking a card calls `addSavings()`
- [ ] `renderSavingsHistory()` — calls `getSavings(20)`, renders `<li>` rows in `#savingsHistoryList`
- [ ] `initLogSavings()` — wires `#logSavingsBtn` + Enter on `#logSavingsAmount` → `addSavings()` → refresh all
- [ ] Savings quick-add modal: same open/close/save/delete pattern as `dashboard.js` modal, using `#savingsQaModal` IDs

### 5.4 Tigom Mini-Card on Dashboard
- [ ] `dashboard.html`: add new section after the budget card:
  ```html
  <section id="tigomWidgetSection" class="tigom-widget mt-6">
    <div id="tigomWidgetMood" class="tigom-widget-inner tigom-happy">
      <div class="tigom-widget-left">
        <span id="tigomWidgetEmoji" class="tigom-widget-emoji">🌿</span>
        <div>
          <p id="tigomWidgetLabel" class="tigom-widget-label">Tigom is happy!</p>
          <span id="tigomWidgetStreak" class="streak-chip">🔥 0-day streak</span>
        </div>
      </div>
      <a href="tigom.html" class="tigom-widget-link">View goals →</a>
    </div>
  </section>
  ```
- [ ] `js/dashboard.js`: add `renderTigomWidget()` — calls `getTigomMood()` + `getCurrentStreak()`; updates `#tigomWidgetEmoji`, `#tigomWidgetLabel`, `#tigomWidgetStreak`, applies mood class to `#tigomWidgetMood`
- [ ] Call `renderTigomWidget()` from the dashboard init block

---

## Phase 6: Gamified UI Polish ☐

### 6.1 Gamification Token Classes (`css/style.css`)
- [ ] `.streak-chip`: `display: inline-flex; align-items: center; gap: 0.3rem; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; border-radius: 999px; padding: 0.3rem 0.8rem; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.02em`
- [ ] `.savings-total-display`: `font-size: clamp(2rem, 6vw, 2.6rem); font-weight: 800; color: var(--brand-800); text-align: center; padding: 0.5rem 0`
- [ ] `.tigom-widget`: `background: var(--card); border-radius: var(--radius-xl); padding: 1rem 1.1rem; box-shadow: var(--shadow-soft)`
- [ ] `.tigom-widget-inner`: `display: flex; align-items: center; justify-content: space-between`
- [ ] `.tigom-widget-emoji`: `font-size: 2rem; line-height: 1`
- [ ] Mood accent colors (applied to `.tigom-widget-inner`):
  - `.tigom-happy`: `border-left: 4px solid var(--brand-700); background: #f0faf3`
  - `.tigom-neutral`: `border-left: 4px solid #d97706; background: #fffbeb`
  - `.tigom-worried`: `border-left: 4px solid #ef4444; background: #fff1f2`
- [ ] `.tigom-mascot-placeholder`: `width: 80px; height: 80px; border-radius: 50%; background: #e7f5ed; margin: 0 auto` (blank for now — mascot drops in here)
- [ ] `.tigom-mascot-wrap`: `background: var(--card); border-radius: var(--radius-xl); padding: 1.5rem; text-align: center; box-shadow: var(--shadow-soft)`
- [ ] Update `#progressLabel` display in `dashboard.js` to format as `"Budget health · X% used"` for gamified tone

### 6.2 SW Version Bump (`sw.js`)
- [ ] Bump cache name: `sugbocents-shell-v17` → `sugbocents-shell-v18`
- [ ] Add to shell files array: `"activity.html"`, `"stats.html"`, `"tigom.html"`, `"js/activity.js"`, `"js/tigom.js"`, `"js/stats.js"`, `"css/spending-chart.css"`

---

## Phase 7: AI Recommendations ☐

> **Assigned to:** [user — primary]
> Backend: none — Gemini API called directly from the browser (client-side).
> Restrict the API key in Google Cloud Console to your domain to mitigate key exposure.

### Approach: Gemini 2.0 Flash — Direct Frontend Call

**Data sent in the prompt:**
- Weekly budget (₱X)
- Category totals for the current week (e.g. Food: ₱240, Transport: ₱80)
- % of budget spent + number of days into the week
- Savings total

**Prompt template (used in code):**
```
You are a friendly Filipino personal finance assistant for a student budgeting app called SugboCents.
The user has a weekly budget of ₱{budget}.
They have spent {pct}% so far this week ({daysIn} of 7 days in).
Spending breakdown: {categoryList}.
They have saved ₱{savingsTotal} total.
Give exactly 3 short, specific, encouraging money-saving tips (1–2 sentences each).
Use casual Filipino-friendly English. Be realistic about student life costs. No markdown, no bullet symbols. Number each tip 1. 2. 3.
```

**Response handling:** split on `1.` / `2.` / `3.` pattern → render as 3 `<li>` items.
**Caching:** store response in `localStorage` with a timestamp — only re-fetch if > 6 hours old or user clicks "Refresh".
**Fallback:** if API fails or user is offline, show 3 hardcoded generic tips from a local array.

### 7.1 `js/ai-recommendations.js` — New File
- [ ] IIFE, exposes `window.AiRecommendations = { fetchAndRender(containerEl) }`
- [ ] `fetchAndRender()`:
  1. Check `localStorage` for cached tips + timestamp; if fresh (< 6h), render cached version
  2. Call `StorageAPI.getAiContext()` to build prompt data
  3. Show loading state in container: spinner or "Asking Tigom's advisor…"
  4. `fetch` to Gemini endpoint with prompt
  5. Parse `response.candidates[0].content.parts[0].text`
  6. Split into 3 tips; cache in `localStorage` with `Date.now()`; render list
  7. On any error: render fallback tips array; log error silently
- [ ] Replace `YOUR_GEMINI_KEY_HERE` placeholder with actual key locally (never commit real key)

### 7.2 AI Recommendations UI on Dashboard
- [ ] `dashboard.html`: add after the Tigom widget section:
  ```html
  <section id="aiRecsSection" class="mt-6">
    <div class="card-panel p-4">
      <div class="ai-recs-header">
        <h2 class="ai-recs-title">💡 Tigom's Tips</h2>
        <button id="refreshAiRecs" class="ai-refresh-btn">Refresh</button>
      </div>
      <div id="aiRecsState" class="ai-recs-state">
        <p class="text-sm text-slate-400">Tap Refresh to get personalized tips.</p>
      </div>
      <ol id="aiRecsList" class="ai-recs-list hidden"></ol>
    </div>
  </section>
  ```
- [ ] Load `js/ai-recommendations.js` after `js/dashboard.js`
- [ ] In `dashboard.js` init block: call `AiRecommendations.fetchAndRender(document.getElementById("aiRecsSection"))` on page load (uses cache if available, so no wasted API calls on every visit)

### 7.3 AI Recs CSS (`css/style.css`)
- [ ] `.ai-recs-header`: `display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem`
- [ ] `.ai-recs-title`: `font-size: 0.95rem; font-weight: 700; color: var(--ink-900)`
- [ ] `.ai-refresh-btn`: small pill button, `background: #e7f5ed; color: var(--brand-800); border-radius: 999px; padding: 0.3rem 0.8rem; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer`
- [ ] `.ai-recs-list`: `list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem`
- [ ] `.ai-recs-list li`: `font-size: 0.875rem; color: #334155; line-height: 1.5; padding: 0.6rem 0.75rem; background: #f8fafc; border-radius: 0.7rem; border-left: 3px solid var(--brand-700)`

### 7.4 Security Note
- [ ] Restrict Gemini API key in Google Cloud Console → APIs & Services → Credentials → API key → HTTP referrers
- [ ] Add your domain and `localhost` for local dev
- [ ] Never commit the real key to the repo — use `YOUR_GEMINI_KEY_HERE` as placeholder in source

---

## Mascot Integration Notes (for team member)

The mascot asset will drop into `#tigomMascot` on `tigom.html` and react to mood classes on its parent `#tigomMascotWrap`. No JS changes needed from your side.

| Integration point | Location | Notes |
|---|---|---|
| `#tigomMascot` | `tigom.html` inside `#tigomMascotWrap` | Drop `<img>` or animation container here |
| `#tigomMascotWrap` CSS class | Set by `tigom.js` at runtime | `.tigom-happy`, `.tigom-neutral`, `.tigom-worried` — animate based on this |
| `#tigomWidgetEmoji` | `dashboard.html` Tigom widget | Currently an emoji — can be replaced with a tiny mascot image |
| `.tigom-mascot-placeholder` | `css/style.css` | 80×80 circle placeholder — remove or override once asset is ready |

---

## Full Verification Checklist

- [ ] Desktop at 1440px: content centered at ~720px, not edge-to-edge
- [ ] Sidebar collapse: shrinks to 64px icon rail on click; state persists on refresh
- [ ] Progress bar: white fill visible on green card at low %; turns amber >60%, pink >80%; height larger
- [ ] Modal: centers on screen (no longer slides from bottom)
- [ ] Dashboard shows exactly 5 recent expenses + "View all →" link
- [ ] Activity: all expenses grouped by date; category chips filter correctly; count label updates
- [ ] Stats: chart renders; 3 stat chips show correct values
- [ ] Tigom: mood displays correctly; savings quick-add logs entries; savings total updates; streak counts correctly
- [ ] Dashboard Tigom widget: mood emoji + streak chip visible; "View goals →" link works
- [ ] AI Recs: shows tips on load (cached); Refresh fetches fresh tips; offline shows fallback
- [ ] Mascot placeholder `#tigomMascot` is present and blank (ready for drop-in)
- [ ] SW version bumped; hard refresh confirms new cache version
