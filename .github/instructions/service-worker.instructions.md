---
description: "Use when editing the service worker (sw.js). Covers caching strategy, version bumping, and file sync rules."
applyTo: "sw.js"
---
# Service Worker Conventions

- Cache name: `sugbocents-shell-vN` — **bump N on every file change**
- Strategy: cache-first for shell files, network-first for dynamic content
- `SHELL_FILES` array must list every file the app needs offline
- When adding/removing/renaming files, update `SHELL_FILES` and bump the cache version
- On activation, delete all caches except the current `CACHE_NAME`
- Keep the service worker simple — no complex routing, no workbox
