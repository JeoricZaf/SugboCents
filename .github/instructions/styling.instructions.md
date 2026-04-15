---
description: "Use when editing CSS or styling. Covers brand tokens, Tailwind usage, and custom property conventions for SugboCents."
applyTo: "**/*.css"
---
# CSS & Styling Conventions

- Tailwind CSS loaded via CDN — use utility classes in HTML
- Custom overrides go in `css/style.css`
- Brand colors defined as CSS custom properties in `:root`:
  - `--brand-900: #164f33` (darkest)
  - `--brand-800: #1f6b46` (primary)
  - `--brand-700: #2b8259` (lighter)
  - `--ink-900: #0f172a` (text)
  - `--mist: #f3f7f4` (background)
  - `--danger: #b42318` (errors)
- Radii: `--radius-lg: 1.1rem`, `--radius-xl: 1.5rem`
- Shadow: `--shadow-soft: 0 8px 24px rgba(15, 23, 42, 0.08)`
- Font stacks: `"Plus Jakarta Sans"` (body), `"Sora"` (landing headings)
- Mobile-first approach — use Tailwind responsive prefixes (`md:`, `lg:`)
