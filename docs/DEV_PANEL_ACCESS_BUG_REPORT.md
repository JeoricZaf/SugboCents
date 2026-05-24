# Dev Panel Access Bug Report

## Summary
The new dev panel at `/dev-notifications.html` does not reliably pass the access gate. It appears stuck on the verify screen for the user.

## Current Status
- Firestore rules deployed successfully.
- Cloud Functions deployed successfully (including all `dev*` callables).
- Hosting deployed successfully.
- UID allowlist was added in `functions/dev-tools.js`.

Configured UID:
- `7SSc9kHJTKOOlP9Zgo7bpvge9UC3`

## Affected Route
- `https://sugbocents.web.app/dev-notifications.html`

## Expected Behavior
When logged in as the allowlisted UID:
1. Page loads.
2. Access check callable `devCheckAccess` succeeds.
3. Gate disappears.
4. Dev panel UI is shown.

## Actual Behavior
Two observed states:
1. On normal URL load, gate text showed: `Firebase SDK unavailable in this context.`
2. On cache-busted URL load, gate text changed to: `No active session.`

User reports it is still not working.

## Reproduction Steps
1. Open `https://sugbocents.web.app/dev-notifications.html`.
2. Sign in with allowlisted user.
3. Click **Verify access**.
4. Observe gate does not proceed to panel.

## What Was Already Changed
### 1) Allowlist UID added
- File: `functions/dev-tools.js`
- `DEV_ADMIN_UIDS` now contains `7SSc9kHJTKOOlP9Zgo7bpvge9UC3`

### 2) Firebase Functions SDK loaded in shared bootstrap
- File: `js/firebase-init.js`
- Added loading of `firebase-functions-compat.js`
- Added `state.functions` and `getFunctions()` accessor

### 3) Service worker cache bump
- File: `sw.js`
- Cache bumped to `sugbocents-shell-v160` / `sugbocents-runtime-v160`

### 4) Hosting redeployed after patch

## Hypothesis
Primary remaining issue appears to be auth/session recognition on the dev page:
- The page can now load Firebase SDKs (after cache-bust), but reports `No active session.`
- This suggests `firebase.auth().onAuthStateChanged` is not resolving with a signed-in user in this context.

Potential causes:
1. Stale service worker cache still serving older shell on some loads.
2. User signed into app shell session but not Firebase Auth state expected by `dev-notifications.js`.
3. Auth state race/order issue between `app.js`, `storage.js`, and `dev-notifications.js` initialization.
4. Redirect/session interplay between route protection and Firebase auth listener.

## Debug Checklist For Next Chat
1. In browser console on `dev-notifications.html`, check:
   - `window.FirebaseInit && window.FirebaseInit.mode`
   - `window.firebase && typeof window.firebase.functions`
   - `window.firebase && window.firebase.auth && !!window.firebase.auth().currentUser`
   - `window.firebase && window.firebase.auth && window.firebase.auth().currentUser && window.firebase.auth().currentUser.uid`
2. Confirm UID exactly matches allowlist in deployed source.
3. Test with hard-refresh + unregister service worker + reload.
4. Add temporary debug logs inside `js/dev-notifications.js` around:
   - post-`FirebaseInit.ready`
   - callable registration
   - `onAuthStateChanged` callback entry
   - `verifyAccess()` entry and callable result/error
5. Verify `devCheckAccess` callable can be invoked from console for signed-in user.

## Useful Deploy Commands
From project root:

```powershell
npx -y firebase-tools@latest deploy --only firestore:rules
npx -y firebase-tools@latest deploy --only functions
npx -y firebase-tools@latest deploy --only hosting
```

## Goal
Fix access flow so allowlisted signed-in user immediately enters panel and can run all dev checklist flows.
