# SugboCents — UI/UX & Styling Guide (Vanilla HTML)

> **Status:** Superseded by `UI_UX_REFERENCES_SPRINT1_Version4.md`, which is the canonical design guide.
> **Tech constraint** (still applies to all files): Vanilla HTML, Tailwind CSS (CDN), vanilla JavaScript only. No React, Vue, Angular, or Node.js in the frontend.

---

The original "modern clean fintech" aesthetic guidance in this file has been replaced. The current design direction is **gamified consumer app**, not professional finance tool.

## Current Design Direction Summary

- Dashboard reads as a game HUD: level name (2rem Sora 800) → streak badge (56×56px, color-coded) → XP bar (14–16px, gradient, animated) → budget card → action zone
- Primary references: **Duolingo** (XP/streak/badges), **Habitica** (RPG stat sheet), **Strava** (achievement weight), **Monzo** (budget card only)
- No emoji in structural UI — use Material Icons (`local_fire_department`, `bolt`, `lock`, `check_circle`) or Bootstrap Icons
- Budget card background changes color at spend thresholds (green → amber → dark red)
- Streak is a badge element (56×56px minimum), not a chip — color escalates with streak length
- Level name is the largest text on the dashboard — it is the headline, not an eyebrow label
- "Log a one-time expense" button exists alongside the Quick Add grid as the escape hatch for non-recurring expenses
- Inline stats section on the dashboard shows top categories with mini-bars — no longer just a link to the stats page

## See `UI_UX_REFERENCES_SPRINT1_Version4.md` for the complete rules.

---

*This file is kept for version history only.*