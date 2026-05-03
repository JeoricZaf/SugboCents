# SugboCents — Copilot Project Instructions

## Stack & Constraints
- **Vanilla HTML, CSS, JavaScript** — no UI frameworks (React/Vue/Angular), no build tools
- **Tailwind CSS via CDN** for utility classes; custom overrides in `css/style.css`
- **Firebase Auth** for authentication (with local `storage.js` fallback)
- **PWA**: `manifest.json` + `sw.js` (cache-first shell strategy)
- The app shell must run by opening HTML files in a browser — no server required for Sprint 1–2
- **Sprint 3 exception:** A minimal Node.js/Express backend is allowed **only** for email sending and AI API proxying. All other features must remain frontend-only.

## Architecture
- **Separate HTML pages** per route — NOT a single-page app with hidden sections
- Pages: `landing.html`, `login.html`, `register.html`, `dashboard.html`, `settings.html`
- `index.html` is a thin auth-state router (redirects to dashboard or landing)

## Critical Rule: storage.js Abstraction
**UI code must NEVER call `localStorage` directly.** All data persistence goes through `js/storage.js` via `window.StorageAPI`. This enables future backend migration without touching UI code.

## File Conventions
- **CSS custom properties** defined in `:root` of `css/style.css` (brand colors, radii, shadows)
- **Brand palette**: `--brand-900: #164f33`, `--brand-800: #1f6b46`, `--brand-700: #2b8259`
- **Font**: Plus Jakarta Sans (body), Sora (landing headings)
- **JS pattern**: Each file is a self-contained IIFE — no ES modules, no imports
- **Icons**: Bootstrap Icons CDN (landing), inline SVGs (auth pages), emoji (dashboard quick-add)

## Service Worker
- Cache name format: `sugbocents-shell-vN` — bump the version number on every file change
- Shell files array in `sw.js` must stay in sync with actual file paths

## Current Sprint: Sprint 1 / Sprint 2
Sprint 1 focus areas: Login/Register, Budget Setup, Quick-Add Expenses, Mobile Nav, PWA baseline.
Sprint 2 focus areas: Spending Chart, Tigom mascot (state-driven, no AI), Goals, Streaks.
Do NOT build Sprint 3 features yet (AI Recommendations, AI Wrapped Email, backend server).

## Protected Routes
Pages with `data-protected="true"` redirect to `login.html` if no session exists.
Pages with `data-guest-only="true"` redirect to `dashboard.html` if already logged in.
Route protection logic lives in `js/app.js`.

## Data Model (Sprint 1)
- **User**: id, firstName, lastName, email, weeklyBudget, expenses[]
- **Expense**: id, amount, category, timestamp (ISO), note (optional)
- **Session**: userId, createdAt, provider ("firebase" | "local")
- Currency: PHP (₱) — format with `Intl.NumberFormat("en-PH", { currency: "PHP" })`

## Encoding
All HTML files must use `<meta charset="UTF-8">`. Emoji and special characters (₱, ⌂, ⚙) must be actual Unicode — never mojibake sequences.
