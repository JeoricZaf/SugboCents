---
description: "Use when editing HTML pages. Covers page structure, required meta tags, script loading order, and route protection for SugboCents."
applyTo: "**/*.html"
---
# HTML Page Conventions

## Required Head Elements
- `<meta charset="UTF-8">` — always first
- Tailwind CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Plus Jakarta Sans via Google Fonts
- Custom CSS: `<link rel="stylesheet" href="css/style.css">`
- PWA manifest: `<link rel="manifest" href="manifest.json">`

## Body Attributes
- `data-page="pageName"` — identifies the page for bottom nav highlighting
- `data-protected="true"` — redirects to login if no session
- `data-guest-only="true"` — redirects to dashboard if already logged in

## Script Loading Order (at end of body)
1. `js/storage.js` — always first (exposes `window.StorageAPI`)
2. Firebase scripts (if used) — loaded before app.js
3. `js/app.js` — route protection, nav activation, SW registration
4. Page-specific script (`js/auth.js`, `js/dashboard.js`, etc.) — last

## Encoding
- Use actual Unicode characters: ₱, ⌂, ⚙ — never HTML entities for emoji
- All special characters must render correctly without mojibake
