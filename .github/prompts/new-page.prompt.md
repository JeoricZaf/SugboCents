---
description: "Add a new page to the SugboCents app with all required boilerplate, meta tags, scripts, and route protection."
agent: "agent"
argument-hint: "Name of the new page (e.g., history)"
---
Create a new HTML page for the SugboCents PWA.

## Requirements
1. Use the same HTML boilerplate as existing pages (charset UTF-8, viewport meta, Tailwind CDN, Plus Jakarta Sans font, css/style.css link, manifest.json link)
2. Add appropriate `data-page`, `data-protected`, or `data-guest-only` body attributes
3. Include the standard script loading order at the end of body: `js/storage.js` → Firebase scripts → `js/app.js` → page-specific JS
4. Add the bottom navigation bar matching the existing pattern in `dashboard.html`
5. Update `sw.js`: add the new file to the `SHELL_FILES` array and bump the cache version
6. If the page needs its own JS file, create it as a self-contained IIFE in `js/`

Reference [dashboard.html](dashboard.html) for the established page structure.
