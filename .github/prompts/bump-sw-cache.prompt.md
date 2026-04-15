---
description: "Bump the service worker cache version and sync the SHELL_FILES array with actual project files."
agent: "agent"
---
Update the service worker in `sw.js`:

1. Read the current `CACHE_NAME` version number
2. Increment it by 1
3. Verify every file in the `SHELL_FILES` array actually exists in the project
4. Add any new files that are missing from the array
5. Remove any entries for files that no longer exist
6. Report what changed

Reference [sw.js](sw.js) for the current state.
