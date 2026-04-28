# SugboCents — Project Spec for GitHub Copilot (Vanilla HTML/CSS/JS)

> Purpose: Give Copilot a clear, consistent description of what we are building, the app structure, and the rules/constraints to follow when generating code.

## 0) Key Decisions / Constraints (Read first)
- **Frontend-first for Sprint 1–2:** The core app must run by opening HTML files in a browser with no server required.
- **Tech choice:** Use **Vanilla HTML, CSS, and JavaScript**. Tailwind CSS via CDN is allowed for styling.
- **No UI frameworks:** Do NOT use React, Vue, or Angular. Node.js/Express is allowed **only** as a thin backend for Sprint 3 AI and email features — the main app shell must NOT depend on a running server.
- **Backend scope (Sprint 3 only):** A minimal backend is permitted for: sending emails (e.g. via Nodemailer / a small Express endpoint) and proxying AI API calls (to keep API keys server-side). All other features remain frontend-only.
- **Major features must be separate pages/routes:** Do **not** build a single-page HTML app with sections that are just hidden/shown. Use real, separate HTML files (e.g., `login.html`, `dashboard.html`) for major features.
- **Data storage (The "storage.js" rule):** Prefer local persistence (`localStorage`). However, UI button clicks must NEVER call `localStorage` directly. All data saving/loading MUST be routed through a dedicated `js/storage.js` file to allow easy migration to a real backend in the future.
- **Mobile PWA is required:** Implement PWA accurately (manifest + icons + installability).
- **AI/email safety:** AI and email features must have fallback behavior if the backend/API is unavailable. Do not implement AI/email until Sprint 3. The backend for these features should be a separate, optional service — the app must still load and function without it.

## 1) Important: Current Sprint Focus (Sprint 1 only)
We are currently working on **Sprint 1**. When generating code, **focus only on Sprint 1 scope** and avoid building Sprint 2–3 features early.

### Sprint 1 scope (what Copilot should prioritize)
1. **Login System** (UI + auth flow + session persistence + user data load/save hook)
2. **Budget Setup** (UI + saving/loading + remaining calculation)
3. **Quick-Add + Logging (basic)** (quick-add UI + create expense + update remaining)
4. **Mobile Nav + Routes/Pages** (separate HTML pages; bottom navigation)
5. **PWA config** (manifest/icons/service worker baseline)

### What NOT to build yet
- Spending Chart (Sprint 2)
- Mascot/Health Bar (Sprint 2)
- Tigom Goals (Sprint 2)
- Streaks/Settings/Weekly reset (Sprint 2)
- AI Recommendations + AI Wrapped Email (Sprint 3 — may use a thin Node.js/Express backend for email sending and AI API proxying)

## 2) Sprint 1 Master Task Assignments (Source of truth)
Use this table as the authoritative Sprint 1 plan:

- **Login System**
  - Design login/register UI + error states — **Oliver (Dev1)** — Apr 8 → Apr 10 — In Progress
  - Implement login/register/logout + session persistence — **Jon (Dev2)** — Apr 8 → Apr 13 — Not Started
  - Connect login to user-specific data load/save — **Oliver (Dev1)** — Apr 10 → Apr 14 — Not Started

- **Quick-Add + Logging**
  - Quick-add buttons UI (common expenses) — **Jon (Dev2)** — Apr 13 → Apr 14 — Not Started
  - Implement expense creation + update remaining — **Jon (Dev2)** — Apr 14 → Apr 14 — Not Started

- **Budget Setup**
  - Build budget setup UI + edit budget UI — **Savion (PO)** — Apr 8 → Apr 13 — Not Started
  - Define expense schema + storage helpers — **Savion (PO)** — Apr 10 → Apr 13 — Not Started
  - Implement budget save/load + remaining budget calc — **Julian (Dev3)** — Apr 10 → Apr 14 — Not Started

- **Mobile PWA & Nav**
  - Bottom nav UI + routes/pages structure — **Julian (Dev3)** — Apr 9 → Apr 12 — Not Started
  - PWA config (manifest / icons / service worker) — **Jeoric (SM)** — Apr 10 → Apr 14 — Not Started

## 3) Required Pages (Routes)
Implement these as separate HTML files (not hidden sections):
- `login.html` — Login page
- `register.html` — Register page
- `dashboard.html` — Main overview (budget remaining + quick add + recent expenses)
- `settings.html` — Minimal settings page shell (where "Edit budget" will live)

Notes:
- Protected routes: if not signed in (checked via `storage.js`), redirect to `login.html`.
- For UI/UX styling instructions, Copilot should reference `UI_UX_PREFERENCES_SAVED.md`.

## 4) Sprint 1 Data Model (Must be implemented now)

### 4.1 Budget
- `weeklyBudget` (number)
- Derived values:
  - `totalSpentThisWeek`
  - `remaining = weeklyBudget - totalSpentThisWeek`

### 4.2 Expense
Each expense record contains:
- `id` (string)
- `amount` (number)
- `category` (string)
- `timestamp` (ISO string)
- `note` (string, optional)

Minimum features in Sprint 1:
- Create expense
- Store and load expenses (via `storage.js`)
- Show recent expenses list (basic)

### 4.3 Storage (local-first via `storage.js`)
Use local persistence so we can demo without a server:
- Save/load budget
- Save/load expenses
- Save/load session state (logged in/out)

## 5) Sprint 1 UI Requirements
### Login/Register
- Clear validation and error states (empty fields, invalid email format, short password, etc.)
- Buttons: Login/Register + navigation link between them

### Dashboard (Sprint 1 version)
Must show:
- Weekly budget (if set)
- Remaining amount
- Quick-add buttons (basic)
- Recent transactions list (last 5–10)

## 6) Mobile Navigation + PWA (Sprint 1)
### Bottom Navigation
- Must navigate between HTML pages (Dashboard / Settings placeholder is OK)
- Must be a fixed bottom bar.

### PWA
- Must include `manifest.json` + icons
- Basic `sw.js` (service worker) setup is acceptable for Sprint 1

## 7) What Copilot Should NOT Do (Sprint 1)
- Do not use React or Node.js.
- Do not implement AI/email yet.
- Do not implement Spending Chart yet.
- Do not implement Tigom goals yet.
- Do not add large backend complexity.

## 8) Suggested Vanilla HTML/JS Structure (Sprint 1 friendly)
```text
/SugboCents
│-- index.html          (Empty file that just redirects to login.html or dashboard.html)
│-- login.html
│-- register.html
│-- dashboard.html      (Budget card, Quick-add, Recent expenses)
│-- settings.html       (Edit budget, weekly reset, logout)
│-- manifest.json       
│-- sw.js               
│
├── /css
│   └── style.css       (For custom tweaks beyond Tailwind)
│
├── /js
│   ├── app.js          (Global UI logic, Bottom Nav setup, PWA registration)
│   ├── storage.js      (CRITICAL: ALL localStorage logic goes here. UI files call this.)
│   ├── auth.js         (Logic for login/register pages)
│   └── dashboard.js    (Calculates remaining budget, renders lists)