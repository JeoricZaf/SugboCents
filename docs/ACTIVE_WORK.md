# SugboCents — Active Work Tracker

> **Last updated:** May 11, 2026
> Track ongoing bugs, fixes, and planned features here. Mark items ✅ when done.

---

## Sprint 3 Progress Table

| Sprint | Track | Task | Owner | Start | End | Status |
|---|---|---|---|---|---|---|
| Sprint 3 | Dashboard | Dashboard polish and Sprint 3 UI/UX integration updates | Oliver (Dev1) | May 6 | May 9 | In Progress |
| Sprint 3 | Quests | Weekly quest flow updates and progress-state wiring | Oliver (Dev1) | May 6 | May 10 | In Progress |
| Sprint 3 | Leaderboard | Leaderboard sorting, rank display, and social consistency pass | Jon (Dev2) | May 7 | May 10 | In Progress |
| Sprint 3 | AI Chat | AI chat interaction improvements, prompt behavior, and fallback handling | Jon (Dev2) | May 7 | May 10 | In Progress |
| Sprint 3 | AI Email: Wrapped | Design Wrapped cards + required fields | Savion (PO) | Apr 29 | Apr 30 | Completed |
| Sprint 3 | AI Email: Wrapped | Send email integration + caps + fallback template | Savion (PO) | May 3 | May 5 | In Progress |
| Sprint 3 | AI Email: Wrapped | Weekly summary generator (stats + patterns) | Oliver (Dev1) | Apr 29 | May 1 | In Progress |
| Sprint 3 | AI Email: Wrapped | AI narrative + personality + mission + reward text | Jon (Dev2) | May 1 | May 3 | In Progress |
| Sprint 3 | AI Email: Wrapped | Settings page trigger + opt-in toggle + cooldown metadata | Oliver (Dev1) | May 10 | May 11 | In Progress |

---

## 🔴 Critical Regressions (Broke Last Session — Fix First)

### 1. Dev Test Panel (`🔧 Dev`) — Gone Entirely
- **File:** `js/dev-tools.js`
- **Root cause:** Last session's rewrite only replaced the opening comment anchor in `replace_string_in_file`, leaving the old IIFE body appended after the new `})();`. The file now has a syntax error at ~line 712, which prevents the entire script from parsing.
- **Fix:** Rewrite the full file as one atomic pass. Budget-math health scenarios (compute budget from real spending) + gamification snapshot/restore already designed — just needs clean output.

### 2. Modal "Cancel" and "Save" Buttons Don't Work
- **File:** `js/dashboard.js` → `initModal()`
- **Root cause:** When auto-emoji block was inserted, two listener registrations were accidentally dropped:
  ```js
  document.getElementById("qaModalCancel").addEventListener("click", closeModal);
  document.getElementById("qaModalSave").addEventListener("click", saveModal);
  ```
  Delete still works because it is wired separately further down in the function.
- **Fix:** Add those two lines back before the Delete button wiring block.

### 3. +XP Popup Invisible After Logging an Expense
- **File:** `css/style.css` → `@keyframes xp-float` + `.xp-float-popup`
- **Root cause:** `.xp-float-popup` uses `transform: translateX(-50%)` for centering, but `@keyframes xp-float` sets `transform: translateY(...)` at every step. CSS `transform` is a single property — the animation overwrites the centering transform the instant it starts. The pill appears half off-screen and is effectively invisible.
- **Fix:** Include `translateX(-50%)` in every keyframe:
  ```css
  0%   { opacity: 0; transform: translateX(-50%) translateY(0px)   scale(0.8); }
  20%  { opacity: 1; transform: translateX(-50%) translateY(-8px)  scale(1); }
  80%  { opacity: 1; transform: translateX(-50%) translateY(-24px) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-36px) scale(0.95); }
  ```

---

## 🟡 Modal Redesign — "Add / Edit Shortcut" (`#qaModal`)

The current layout is functional but unintuitive. Redesign to match industry-standard fintech app patterns (Monzo, Revolut, Splitwise).

### Target Layout (top to bottom)
```
┌─────────────────────────────────┐
│  New shortcut              [×]  │  ← header row: title left, close right
│                                 │
│  [☕]  [Coffee____________]     │  ← identity row: emoji circle + name input
│                                 │
│  ☕ Coffee  🍔 Lunch  🚌 Jeepney │  ← suggestion chips (quick-pick, scrollable)
│  🏋️ Gym   📱 Load   🛍️ Grocery │    hidden when item is being edited
│                                 │
│  ₱  [120_________________]      │  ← amount row: ₱ prefix + big input
│                                 │
│  Category                       │
│  ○ Food  ○ Transport  ○ Health  │  ← category chips (visual, replaces <select>)
│  ○ Groceries  ○ Utilities  ...  │    hidden <select> stays for data binding
│                                 │
│          [   Delete   ]         │  ← delete only visible when editing
│       [    Save Shortcut   ]    │  ← full-width brand-green CTA
└─────────────────────────────────┘
```

### Files to change
- **`dashboard.html`** — restructure `#qaModal` inner HTML:
  - Add `#qaModalClose` (`×`) button top-right in a `.qa-modal-header` div
  - Keep `#qaModalEmojiBtn` + `#qaModalCategory` identity row (same elements, cleaner treatment)
  - Add `#qaNameSuggestions` chips strip below name row (already in HTML, just reposition)
  - Add `.qa-amount-row` div wrapping `₱` prefix + `#qaModalAmount` input
  - Add `#qaModalCategoryChips` div for visual chip row (generated by JS)
  - Keep hidden `<select id="qaModalCategoryId">` for data binding — just add `display:none`
  - Remove `<div class="qa-modal-divider">` and custom emoji toggle/input row
  - Replace current two-button footer (`Cancel` + `Save` side-by-side) with single full-width `#qaModalSave` + `#qaModalDelete` above it

- **`css/style.css`** — add new classes, remove stale ones:
  - ADD: `.qa-modal-header`, `.qa-modal-close-btn`
  - ADD: `.qa-amount-row` (brand left-border, big font input)
  - ADD: `.qa-amount-prefix` (₱ symbol, muted, self-centered)
  - ADD: `.qa-cat-chips-label`, `.qa-cat-chips-row`
  - ADD: `.qa-category-chip` + `.qa-category-chip--active`
  - ADD: `.qa-save-btn` (full-width, brand-green, 52px tall)
  - REMOVE: `.qa-custom-emoji-row`, `.qa-custom-emoji-toggle`, `.qa-custom-emoji-input`, `.qa-modal-divider`

- **`js/dashboard.js`** — update `initModal()` and `openQaModal()`:
  - Wire `#qaModalClose` → `closeModal`
  - Build `.qa-category-chip` elements dynamically from `StorageAPI.getExpenseCategories()` into `#qaModalCategoryChips` — clicking a chip sets the hidden `<select>` value and toggles `--active` class
  - Update `buildSugChip()` to also activate the correct category chip visually
  - Remove custom emoji toggle/input wiring (elements removed from HTML)
  - In `openQaModal(item)`: when editing, pre-activate the matching category chip; clear chips on close

---

## 🟢 New Feature — AI Auto-Emoji on Shortcut Name

### Why AI, not a keyword map
The current `SHORTCUT_KEYWORD_MAP` misses Filipino and Bisaya terms: "ulam," "palengke," "pasahe," "baon," "sine," "linya," etc. An LLM handles these naturally in any language.

### How it works
1. User types a name in the shortcut modal (e.g. "ulam")
2. On `blur` (when they tap off the field) — NOT on every keystroke
3. Local keyword map is checked first (instant, no API call)
4. If no local match: call `functions/index.js` → new `exports.emojiSuggest` endpoint
5. Endpoint sends a single Groq prompt (~30 tokens), returns `{ emoji: "🍚", category: "food" }`
6. Emoji circle button + hidden input update; matching category chip activates
7. A small `✨` tag briefly appears on the emoji button to signal auto-fill
8. If API fails or takes >2s: silently skip — user can still pick manually

### Cost
- **Free.** Groq free tier = 14,400 req/day. Each emoji suggestion = ~30 tokens. No new accounts needed.
- Groq key (`GROQ_API_KEY`) already configured as a Firebase secret in `functions/index.js`.

### Files to change
- **`functions/index.js`** — add `exports.emojiSuggest`:
  ```js
  exports.emojiSuggest = onRequest(
    { secrets: [GROQ_API_KEY], region: "us-central1", invoker: "public" },
    async (req, res) => { /* CORS + rate-limit (reuse existing) + Groq call */ }
  );
  ```
  System prompt: *"You are an emoji picker for a Filipino budgeting app. Given an expense name (may be English, Filipino, or Bisaya/Cebuano), reply ONLY with JSON: `{\"emoji\":\"🍚\",\"category\":\"food\"}`. Valid categories: food, transport, groceries, health, education, utilities, personal_care, shopping, entertainment, other."*
  max_tokens: 30, temperature: 0

- **`js/dashboard.js`** — `initModal()`: add `blur` listener on `#qaModalCategory` that:
  1. Skips if field is empty
  2. Checks local `SHORTCUT_KEYWORD_MAP` first
  3. If no match: `fetch` to `emojiSuggest` endpoint
  4. On response: update emoji button + hidden input + activate category chip

- **`sw.js`** — bump to v80 after all changes above are done

### Decision log
- Trigger: `blur`, not `input` — avoids per-keystroke API calls
- Local map stays as instant path for common English terms
- Fallback: silent fail (no error shown to user, they still have manual emoji picker)
- Custom emoji text input removed — grid of 32 emojis + AI is sufficient

---

## 🔵 Also Expand Filipino/Bisaya in Local Keyword Map

Add ~25 Filipino/Bisaya terms to `SHORTCUT_KEYWORD_MAP` in `js/dashboard.js` as the offline-first layer (catches the most common terms without any API call):

| Term | Emoji | Category |
|------|-------|----------|
| ulam | 🍚 | food |
| kanin | 🍚 | food |
| palengke | 🛍️ | groceries |
| pasahe | 🚌 | transport |
| byahe | 🚌 | transport |
| linya | 🚌 | transport |
| baon | 🍱 | food |
| merienda | 🍜 | food |
| tubig | 💧 | utilities |
| kuryente | 💡 | utilities |
| gamot | 💊 | health |
| ospital | 💊 | health |
| eskwela | 📚 | education |
| libro | 📚 | education |
| sine | 🎬 | entertainment |
| sinehan | 🎬 | entertainment |
| bote | 🍺 | food |
| kape | ☕ | food |
| carwash | 🚗 | transport |
| parkingo | 🚗 | transport |
| pabili | 🛍️ | shopping |
| lechon | 🍖 | food |
| inihaw | 🍖 | food |
| softdrinks | 🥤 | food |
| alcohol | 🧴 | personal_care |

---

## ✅ Done This Session

- Removed Sprint 3 / backend-proxy restrictions from all project MD files
- `css/style.css` — `.streak-badge--at-risk` now has contrasting yellow background
- `css/style.css` — `.modal-sheet` now has `max-height` + `overflow-y: auto`
- `js/dashboard.js` — all em-dashes removed from user-facing strings
- `SHORTCUT_KEYWORD_MAP` (44 entries) + `SHORTCUT_QUICK_SUGGESTIONS` (10 presets) added to `dashboard.js`
- `js/storage.js` — `__devRestoreGamState` function added and exported
