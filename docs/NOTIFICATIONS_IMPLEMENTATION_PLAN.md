# Notifications & Email — Implementation Plan (Hand-off Ready)

> **Audience**: An AI assistant or junior dev implementing this end-to-end.
> **Goal**: Ship a Duolingo-style cross-channel engagement loop (Web Push + Email) for SugboCents, covering 13 user states.
> **Stack**: Firebase Cloud Messaging (push) + Brevo (email) + Firebase Cloud Functions (cron + triggers) + Firestore (state + frequency caps).
> **Time budget**: ~12–16 hours total across 4 phases.

---

## ⚠️ Read this first — non-negotiable rules

1. **Follow existing codebase conventions strictly.** Read these instruction files BEFORE writing any code:
   - `.github/copilot-instructions.md`
   - `.github/instructions/javascript.instructions.md`
   - `.github/instructions/html-pages.instructions.md`
   - `.github/instructions/service-worker.instructions.md`
2. **Never call `localStorage` directly in UI code.** All persistence goes through `window.StorageAPI` in [js/storage.js](../js/storage.js).
3. **Every JS file is an IIFE** (`(function () { ... })();`). No ES modules, no imports.
4. **Use `var`, not `let`/`const`** in browser-side JS to match the existing style. (Cloud Functions code may use `const`/`let` — match `functions/index.js`.)
5. **Currency**: PHP (`₱`), format with `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`.
6. **Encoding**: All HTML files use `<meta charset="UTF-8">`. Emojis must be real Unicode, not mojibake.
7. **Bump the service worker cache version** every time you change a shell file. Current: `sugbocents-shell-v144` in [sw.js](../sw.js). After Phase 1 it becomes `v145`.
8. **Tigom voice**: warm, slightly cheeky, encouraging. Never punitive. Use ₱, occasional emoji (🐾🔥💚), never ALL CAPS yelling.

---

## 📐 Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER (PWA)                          │
│  ┌──────────────────────┐         ┌────────────────────────┐    │
│  │ js/notifications.js  │  ←───── │ Soft-prompt modal      │    │
│  │ (new IIFE)           │         │ (dashboard.html)       │    │
│  │ - permission         │         └────────────────────────┘    │
│  │ - FCM token          │         ┌────────────────────────┐    │
│  │ - prefs read/write   │  ←───── │ Settings UI            │    │
│  └──────────┬───────────┘         │ (settings.html)        │    │
│             │                     └────────────────────────┘    │
│             │ saves token → Firestore: users/{uid}/fcmTokens    │
│             │                                                   │
│  ┌──────────▼───────────┐                                       │
│  │ sw.js                │ ← receives push, shows notification   │
│  │ + push handler       │                                       │
│  │ + notificationclick  │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
                          ▲
                          │ FCM message
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│              FIREBASE CLOUD FUNCTIONS                           │
│  ┌──────────────────────┴────────────────────────────────────┐  │
│  │ functions/notifications.js (new)                          │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ Scheduled crons      │  │ Firestore triggers       │   │  │
│  │  │ - dailyReminderCron  │  │ - onExpenseWriteTrigger  │   │  │
│  │  │ - streakAtRiskCron   │  │   (states 7, 8, 9)       │   │  │
│  │  │ - weeklyDigestCron   │  └──────────────────────────┘   │  │
│  │  │ - lapsedUserCron     │                                 │  │
│  │  └──────────┬───────────┘                                 │  │
│  │             │                                             │  │
│  │  ┌──────────▼───────────────────────────────────────┐     │  │
│  │  │ sendNotification(uid, payload)                   │     │  │
│  │  │ - frequency cap check (Firestore)                │     │  │
│  │  │ - quiet hours check                              │     │  │
│  │  │ - channel pref check                             │     │  │
│  │  │ - dispatches to:                                 │     │  │
│  │  │   • admin.messaging() → FCM                      │     │  │
│  │  │   • sendEmail() → Brevo SDK                      │     │  │
│  │  │ - logs to users/{uid}/notificationLog            │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Firestore data model (new collections)

Add these to `firestore.rules` in Phase 1, step 6.

```
users/{uid}
  ├─ notificationPrefs (map, denormalized into user doc)
  │    ├─ pushEnabled: bool                (default: true after opt-in)
  │    ├─ emailEnabled: bool               (default: true)
  │    ├─ dailyReminderEnabled: bool       (default: false; opt-in at streak day 3)
  │    ├─ dailyReminderHour: number        (0–23, PH time, default 20 = 8pm)
  │    ├─ socialEnabled: bool              (default: true)
  │    ├─ quietHoursStart: number          (default: 21 = 9pm)
  │    ├─ quietHoursEnd: number            (default: 8 = 8am)
  │    └─ lastUpdated: ISO string
  │
  ├─ fcmTokens/{tokenId}                   (subcollection)
  │    ├─ token: string                    (the FCM registration token)
  │    ├─ platform: "android" | "ios" | "desktop" | "unknown"
  │    ├─ createdAt: serverTimestamp
  │    └─ lastSeenAt: serverTimestamp
  │
  ├─ notificationLog/{date_YYYY-MM-DD}     (subcollection, one doc per day)
  │    ├─ pushCount: number
  │    ├─ emailCount: number
  │    ├─ types: string[]                  (e.g., ["streak-at-risk-soft"])
  │    └─ lastSentAt: serverTimestamp
  │
  ├─ notifications/{notificationId}        (in-app inbox mirror, Phase 3)
  │    ├─ type: string
  │    ├─ title: string
  │    ├─ body: string
  │    ├─ deepLink: string                 (e.g., "/dashboard.html?from=streak")
  │    ├─ channel: "push" | "email" | "both"
  │    ├─ sentAt: serverTimestamp
  │    ├─ readAt: serverTimestamp | null
  │    └─ icon: string                     (badge URL, optional)
  │
  └─ pushSilenceFlag (map, denormalized)   (auto-downgrade rule)
       ├─ closedWithoutOpenStreak: number  (resets to 0 on click)
       └─ silencedUntil: ISO string | null (14-day downgrade timestamp)

notificationEvents/{eventId}               (Phase 4 analytics, top-level collection)
  ├─ uid: string
  ├─ type: string                          (e.g., "streak-at-risk-soft")
  ├─ channel: "push" | "email"
  ├─ sentAt: serverTimestamp
  ├─ openedAt: serverTimestamp | null
  └─ deviceToken: string                   (for push debugging)
```

---

# PHASE 0 — Provider setup (no code, ~30 min)

## 0a. Brevo account + API key

1. Go to https://www.brevo.com → click **Sign up free** → use a Gmail (e.g., `sugbocents.app@gmail.com` — create one if you don't have one).
2. Skip the company-info wizard (or fill with personal info).
3. Verify your email.
4. In Brevo dashboard → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**:
   - Name: `Tigom (SugboCents)`
   - Email: the same Gmail you signed up with
   - Confirm via the verification email Brevo sends.
5. Go to **Account icon (top-right)** → **SMTP & API** → **API Keys** tab → **Generate a new API key** → name it `sugbocents-prod` → copy the key (starts with `xkeysib-...`).
6. Open a terminal in the project root and run:
   ```powershell
   cd functions
   npx -y firebase-tools@latest functions:secrets:set BREVO_API_KEY
   ```
   When prompted, paste the API key. Press Enter.
7. Also store the verified sender email as a secret (so you don't hard-code it):
   ```powershell
   npx -y firebase-tools@latest functions:secrets:set BREVO_SENDER_EMAIL
   ```
   Paste the Gmail you verified in step 4.

## 0b. Firebase Cloud Messaging — VAPID key

1. Open https://console.firebase.google.com/ → select project **sugbocents**.
2. ⚙️ **Project Settings** → **Cloud Messaging** tab.
3. Scroll to **Web configuration** → **Web Push certificates** → **Generate key pair**.
4. Copy the **Key pair** value (this is the VAPID public key, ~88 chars starting with `B...`).
5. Paste it into [js/firebase-init.js](../js/firebase-init.js) — see Phase 1 step 1 for exact insertion.

## 0c. Install Brevo SDK in Cloud Functions

```powershell
cd functions
npm install @getbrevo/brevo
```

Verify `functions/package.json` now has `"@getbrevo/brevo"` in `dependencies`.

## 0d. Verify Phase 0 is complete

Run:
```powershell
cd functions
npx -y firebase-tools@latest functions:secrets:access BREVO_API_KEY
npx -y firebase-tools@latest functions:secrets:access BREVO_SENDER_EMAIL
```
Both should print the values you set.

---

# PHASE 1 — Permission UX & Plumbing (~4 hours)

## Step 1.1 — Update [js/firebase-init.js](../js/firebase-init.js)

Add the FCM SDK to the loader and expose a `getMessaging()` helper.

**Location**: top of the IIFE, alongside the existing `defaultConfig`.

Add this constant near the existing config:
```javascript
var VAPID_PUBLIC_KEY = "PASTE_VAPID_KEY_FROM_PHASE_0B_HERE";
```

In the script-loading section (look for `loadScript` calls for `firebase-app`, `firebase-auth`, `firebase-firestore`), add:
```javascript
.then(function () {
  return loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
})
```
(Match the version of the other Firebase scripts already loaded — find it in the same file and use that exact version.)

In the section that exposes the public API (search for `window.firebaseReady` or similar), add:
```javascript
state.messaging = state.app ? firebase.messaging() : null;
state.vapidKey = VAPID_PUBLIC_KEY;
```

## Step 1.2 — Create `js/notifications.js` (NEW FILE)

Full file contents:

```javascript
/**
 * notifications.js — NotificationsAPI
 * Handles permission soft-prompt, FCM token registration, and prefs read/write.
 * Pattern: IIFE, exposes window.NotificationsAPI.
 */
(function () {
  var SOFT_PROMPT_KEY = "notifSoftPromptShown";
  var DEFAULT_PREFS = {
    pushEnabled: false,
    emailEnabled: true,
    dailyReminderEnabled: false,
    dailyReminderHour: 20,
    socialEnabled: true,
    quietHoursStart: 21,
    quietHoursEnd: 8
  };

  function detectPlatform() {
    var ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) { return "android"; }
    if (/iPhone|iPad|iPod/i.test(ua)) { return "ios"; }
    return "desktop";
  }

  function isPushSupported() {
    return "Notification" in window
      && "serviceWorker" in navigator
      && "PushManager" in window;
  }

  function isIosUnsupported() {
    if (detectPlatform() !== "ios") { return false; }
    // iOS PWA push requires 16.4+ AND home-screen install.
    var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    return !standalone;
  }

  /**
   * Show the in-app soft prompt modal. Reuses the existing modal pattern.
   * Returns a Promise<boolean> — true if user clicked "Yes, notify me".
   */
  function showSoftPrompt() {
    return new Promise(function (resolve) {
      // Check if already shown this session
      if (sessionStorage.getItem(SOFT_PROMPT_KEY) === "1") {
        resolve(false);
        return;
      }
      sessionStorage.setItem(SOFT_PROMPT_KEY, "1");

      var overlay = document.createElement("div");
      overlay.className = "notif-soft-prompt-overlay";
      overlay.innerHTML = ''
        + '<div class="notif-soft-prompt-modal">'
        + '  <div class="notif-soft-prompt-icon">🐾</div>'
        + '  <h2>Let Tigom remind you?</h2>'
        + '  <p>We\'ll send a quick nudge if your streak is at risk. No spam — promise.</p>'
        + '  <div class="notif-soft-prompt-actions">'
        + '    <button class="notif-soft-prompt-deny" type="button">Not now</button>'
        + '    <button class="notif-soft-prompt-allow" type="button">Yes, notify me</button>'
        + '  </div>'
        + '</div>';
      document.body.appendChild(overlay);

      overlay.querySelector(".notif-soft-prompt-allow").addEventListener("click", function () {
        document.body.removeChild(overlay);
        resolve(true);
      });
      overlay.querySelector(".notif-soft-prompt-deny").addEventListener("click", function () {
        document.body.removeChild(overlay);
        resolve(false);
      });
    });
  }

  /**
   * Request browser permission and register FCM token.
   * Should only be called AFTER the soft prompt is accepted.
   */
  function requestPermissionAndRegister() {
    if (!isPushSupported()) {
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }
    if (isIosUnsupported()) {
      return Promise.resolve({ ok: false, reason: "ios-not-installed" });
    }
    return Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") {
        return { ok: false, reason: "denied" };
      }
      return navigator.serviceWorker.ready.then(function (registration) {
        return window.firebaseReady.then(function (state) {
          if (!state.messaging) {
            return { ok: false, reason: "no-firebase" };
          }
          return state.messaging.getToken({
            vapidKey: state.vapidKey,
            serviceWorkerRegistration: registration
          }).then(function (token) {
            return saveTokenToFirestore(token).then(function () {
              return updatePrefs({ pushEnabled: true });
            }).then(function () {
              return { ok: true, token: token };
            });
          });
        });
      });
    }).catch(function (err) {
      console.error("[Notifications] Permission/token error:", err);
      return { ok: false, reason: "error", error: err.message };
    });
  }

  function saveTokenToFirestore(token) {
    return window.firebaseReady.then(function (state) {
      if (!state.db || !state.auth || !state.auth.currentUser) {
        return Promise.resolve();
      }
      var uid = state.auth.currentUser.uid;
      var tokenId = btoa(token).replace(/[^a-zA-Z0-9]/g, "").substring(0, 40);
      return state.db.collection("users").doc(uid)
        .collection("fcmTokens").doc(tokenId).set({
          token: token,
          platform: detectPlatform(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
  }

  function getPrefs() {
    return window.StorageAPI.getNotificationPrefs() || DEFAULT_PREFS;
  }

  function updatePrefs(patch) {
    var current = getPrefs();
    var next = Object.assign({}, current, patch, { lastUpdated: new Date().toISOString() });
    return window.StorageAPI.setNotificationPrefs(next);
  }

  window.NotificationsAPI = {
    isPushSupported: isPushSupported,
    isIosUnsupported: isIosUnsupported,
    showSoftPrompt: showSoftPrompt,
    requestPermissionAndRegister: requestPermissionAndRegister,
    getPrefs: getPrefs,
    updatePrefs: updatePrefs,
    DEFAULT_PREFS: DEFAULT_PREFS
  };
})();
```

## Step 1.3 — Add CSS for soft prompt

Append to [css/style.css](../css/style.css):

```css
/* ── Notification soft prompt ─────────────────────────── */
.notif-soft-prompt-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
.notif-soft-prompt-modal {
  background: white;
  border-radius: var(--radius-lg, 16px);
  padding: 1.5rem;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg, 0 10px 30px rgba(0,0,0,0.2));
}
.notif-soft-prompt-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.notif-soft-prompt-modal h2 { margin: 0 0 0.5rem; color: var(--brand-900); }
.notif-soft-prompt-modal p { margin: 0 0 1.5rem; color: #4b5563; font-size: 0.95rem; }
.notif-soft-prompt-actions { display: flex; gap: 0.75rem; justify-content: center; }
.notif-soft-prompt-actions button {
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius-md, 10px);
  border: none;
  font-weight: 600;
  cursor: pointer;
}
.notif-soft-prompt-deny { background: #f3f4f6; color: #374151; }
.notif-soft-prompt-allow { background: var(--brand-700); color: white; }
.notif-soft-prompt-allow:hover { background: var(--brand-800); }
```

## Step 1.4 — Extend [js/storage.js](../js/storage.js) with notification methods

Add these methods to the `StorageAPI` object. Find the `window.StorageAPI = { ... }` block at the bottom and add:

```javascript
getNotificationPrefs: function () {
  var user = getActiveUser();
  if (!user) { return null; }
  return user.notificationPrefs || null;
},
setNotificationPrefs: function (prefs) {
  var user = getActiveUser();
  if (!user) { return Promise.resolve(false); }
  user.notificationPrefs = prefs;
  saveUser(user);
  // Mirror to Firestore if available
  if (window.FirestoreService && window.FirestoreService.updateUserField) {
    return window.FirestoreService.updateUserField("notificationPrefs", prefs);
  }
  return Promise.resolve(true);
},
```
*(Match `getActiveUser` / `saveUser` helper names to whatever already exists in `storage.js`. If `FirestoreService.updateUserField` doesn't exist, write the Firestore mirror inline using `window.firebaseReady`.)*

## Step 1.5 — Update [sw.js](../sw.js)

**a)** Bump cache version: `v144` → `v145`.

**b)** Add `js/notifications.js` to the `SHELL_FILES` array.

**c)** At the **top** of the file, before `CACHE_NAME`, add the FCM service worker imports:
```javascript
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDP-udgzbQLSA36kU1UbgklPPj1VdlAv4w",
  authDomain: "sugbocents.firebaseapp.com",
  projectId: "sugbocents",
  appId: "1:408412999406:web:1c06ec4211f78ca6936dff",
  storageBucket: "sugbocents.firebasestorage.app",
  messagingSenderId: "408412999406"
});

const messaging = firebase.messaging();

// Background push handler — fires when app is closed/backgrounded.
messaging.onBackgroundMessage(function (payload) {
  const data = payload.data || {};
  const title = (payload.notification && payload.notification.title) || data.title || "SugboCents";
  const options = {
    body: (payload.notification && payload.notification.body) || data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.type || "sugbocents-notif",
    data: { deepLink: data.deepLink || "/dashboard.html", type: data.type || "" }
  };
  return self.registration.showNotification(title, options);
});

// Click handler — open the deep link.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const deepLink = (event.notification.data && event.notification.data.deepLink) || "/dashboard.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const c = clientList[i];
        if (c.url.indexOf(deepLink) !== -1 && "focus" in c) { return c.focus(); }
      }
      if (clients.openWindow) { return clients.openWindow(deepLink); }
    })
  );
});
```

## Step 1.6 — Update [firestore.rules](../firestore.rules)

Add inside the `match /databases/{database}/documents { ... }` block:

```
match /users/{uid}/fcmTokens/{tokenId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /users/{uid}/notificationLog/{day} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if false; // server-only via Cloud Functions
}
match /users/{uid}/notifications/{notifId} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow update: if request.auth != null && request.auth.uid == uid
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["readAt"]);
  allow create, delete: if false; // server-only
}
match /notificationEvents/{eventId} {
  allow read, write: if false; // server-only
}
```

Deploy rules:
```powershell
npx -y firebase-tools@latest deploy --only firestore:rules
```

## Step 1.7 — Wire soft prompt in [dashboard.html](../dashboard.html) / [js/dashboard.js](../js/dashboard.js)

In `js/dashboard.js`, find where `addExpense` or the quick-add success path lives. After the **first successful expense save** (check `StorageAPI.getExpenses().length === 1`), trigger:

```javascript
if (window.NotificationsAPI && !window.NotificationsAPI.getPrefs()) {
  window.NotificationsAPI.showSoftPrompt().then(function (yes) {
    if (yes) { return window.NotificationsAPI.requestPermissionAndRegister(); }
  });
}
```

In [dashboard.html](../dashboard.html), add the script tag (before `js/dashboard.js`):
```html
<script src="js/notifications.js" defer></script>
```

Also add the same script tag to [settings.html](../settings.html).

## Step 1.8 — Notification preferences UI in [settings.html](../settings.html)

Add a new section before the existing "Logout" section. Use existing settings-card styling.

```html
<section class="settings-section" data-section="notifications">
  <h2>Notifications</h2>
  <p class="settings-section-desc">Choose how Tigom can reach you.</p>

  <div class="settings-row">
    <label for="notifPushToggle">Push notifications</label>
    <input type="checkbox" id="notifPushToggle" />
  </div>
  <div class="settings-row">
    <label for="notifEmailToggle">Email reminders</label>
    <input type="checkbox" id="notifEmailToggle" />
  </div>
  <div class="settings-row">
    <label for="notifDailyToggle">Daily reminder</label>
    <input type="checkbox" id="notifDailyToggle" />
  </div>
  <div class="settings-row" data-show-when="dailyReminderEnabled">
    <label for="notifDailyHour">Reminder time</label>
    <select id="notifDailyHour">
      <!-- Populated by JS with hours 0–23 -->
    </select>
  </div>
  <div class="settings-row">
    <label for="notifSocialToggle">Social (leaderboard) alerts</label>
    <input type="checkbox" id="notifSocialToggle" />
  </div>
  <div class="settings-row">
    <label for="notifQuietStart">Quiet hours start</label>
    <select id="notifQuietStart"></select>
  </div>
  <div class="settings-row">
    <label for="notifQuietEnd">Quiet hours end</label>
    <select id="notifQuietEnd"></select>
  </div>

  <p id="notifIosNote" class="settings-note" hidden>
    📱 iOS users: install the app to your home screen (iOS 16.4+) to receive push notifications.
  </p>
</section>
```

In [js/settings.js](../js/settings.js), add an IIFE block (or extend the existing one) that:
1. Reads `NotificationsAPI.getPrefs()` and populates each control.
2. On any change, calls `NotificationsAPI.updatePrefs({...})`.
3. If `NotificationsAPI.isIosUnsupported()` is true, shows `#notifIosNote`.

## Step 1.9 — Phase 1 verification

1. Run `npx -y firebase-tools@latest deploy --only hosting,firestore:rules` to push web + rules.
2. Open dashboard in **Chrome desktop incognito**.
3. Log first expense → soft prompt appears → click "Yes, notify me" → browser permission prompt → grant → check DevTools console for "[Notifications]" errors.
4. In Firebase Console → Firestore → `users/{your_uid}/fcmTokens` → confirm a token document exists.
5. In Firebase Console → Cloud Messaging → **Send your first message** → paste your FCM token → confirm notification appears.
6. Open Settings → confirm all toggles work and persist (refresh page, values stay).

---

# PHASE 2 — Backend Triggers (~6 hours)

## Step 2.1 — Create `functions/notifications.js` (NEW FILE)

Full skeleton — fill in trigger handlers in subsequent steps.

```javascript
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = defineSecret("BREVO_SENDER_EMAIL");
const GROQ_API_KEY = defineSecret("GROQ_API_KEY"); // for weekly digest AI tip

const TZ = "Asia/Manila";
const REGION = "us-central1";

// ── Frequency caps ───────────────────────────────────────
const PUSH_DAILY_CAP = 1;
const PUSH_WEEKLY_CAP = 3;
const EMAIL_DAILY_CAP = 1;
const EMAIL_WEEKLY_CAP_NON_DIGEST = 2;
const RESEND_DAILY_QUOTA_GUARD = 95; // leave 5 buffer below Brevo's 300

// In-memory daily email counter (resets on cold start, used as soft guard).
let emailsSentToday = 0;
let emailsSentDate = "";

// ── Channel: PUSH via FCM ────────────────────────────────
async function sendPush(uid, payload) {
  const tokensSnap = await admin.firestore()
    .collection("users").doc(uid).collection("fcmTokens").get();
  if (tokensSnap.empty) { return { sent: 0, reason: "no-tokens" }; }
  const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
  if (tokens.length === 0) { return { sent: 0, reason: "no-tokens" }; }

  const message = {
    tokens: tokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: {
      type: payload.type,
      deepLink: payload.deepLink || "/dashboard.html"
    },
    webpush: {
      fcmOptions: { link: payload.deepLink || "/dashboard.html" }
    }
  };

  const result = await admin.messaging().sendEachForMulticast(message);

  // Prune dead tokens
  const deadTokenIds = [];
  result.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const code = resp.error && resp.error.code;
      if (code === "messaging/registration-token-not-registered"
          || code === "messaging/invalid-registration-token") {
        deadTokenIds.push(tokensSnap.docs[idx].id);
      }
    }
  });
  if (deadTokenIds.length > 0) {
    const batch = admin.firestore().batch();
    deadTokenIds.forEach(id => {
      batch.delete(admin.firestore().collection("users").doc(uid).collection("fcmTokens").doc(id));
    });
    await batch.commit();
  }

  return { sent: result.successCount, failed: result.failureCount };
}

// ── Channel: EMAIL via Brevo ─────────────────────────────
async function sendEmail(uid, userDoc, payload) {
  // Daily quota guard
  const today = new Date().toISOString().substring(0, 10);
  if (emailsSentDate !== today) { emailsSentDate = today; emailsSentToday = 0; }
  if (emailsSentToday >= RESEND_DAILY_QUOTA_GUARD) {
    return { sent: 0, reason: "daily-quota-guard" };
  }

  const Brevo = require("@getbrevo/brevo");
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY.value());

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = payload.subject;
  sendSmtpEmail.htmlContent = payload.html;
  sendSmtpEmail.sender = { name: "Tigom (SugboCents)", email: BREVO_SENDER_EMAIL.value() };
  sendSmtpEmail.to = [{ email: userDoc.email, name: userDoc.firstName || "" }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    emailsSentToday++;
    return { sent: 1 };
  } catch (e) {
    console.error("[Brevo] send failed:", e.message);
    return { sent: 0, reason: "brevo-error", error: e.message };
  }
}

// ── Frequency / quiet-hours / channel-pref guards ────────
function nowInPH() {
  // Returns hour 0-23 in Asia/Manila
  const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: TZ });
  return parseInt(fmt.format(new Date()), 10);
}

function todayKeyPH() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // YYYY-MM-DD
  return fmt.format(new Date());
}

async function isInQuietHours(prefs, allowExceptions) {
  if (allowExceptions) { return false; } // e.g., streak-at-risk Last Call
  const hour = nowInPH();
  const start = prefs.quietHoursStart != null ? prefs.quietHoursStart : 21;
  const end = prefs.quietHoursEnd != null ? prefs.quietHoursEnd : 8;
  if (start < end) { return hour >= start && hour < end; }
  return hour >= start || hour < end; // overnight wrap (default 21..8)
}

async function checkAndIncrementCap(uid, channel, type) {
  const dayKey = todayKeyPH();
  const ref = admin.firestore()
    .collection("users").doc(uid)
    .collection("notificationLog").doc(dayKey);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { pushCount: 0, emailCount: 0, types: [] };

    const dailyCap = channel === "push" ? PUSH_DAILY_CAP : EMAIL_DAILY_CAP;
    const currentCount = channel === "push" ? data.pushCount : data.emailCount;
    if (currentCount >= dailyCap) { return { allowed: false, reason: "daily-cap" }; }

    // Also check weekly cap (sum last 7 day docs)
    // For brevity, weekly cap enforced lazily — extend here if needed.

    const update = {
      pushCount: channel === "push" ? currentCount + 1 : data.pushCount,
      emailCount: channel === "email" ? (data.emailCount || 0) + 1 : (data.emailCount || 0),
      types: [...(data.types || []), type],
      lastSentAt: admin.firestore.FieldValue.serverTimestamp()
    };
    tx.set(ref, update, { merge: true });
    return { allowed: true };
  });
}

// ── MAIN DISPATCHER ──────────────────────────────────────
/**
 * Send a notification respecting prefs, frequency caps, and quiet hours.
 * payload = { type, channel: "push"|"email"|"both", title, body, subject, html, deepLink, allowQuietHourException? }
 */
async function sendNotification(uid, payload) {
  const userSnap = await admin.firestore().collection("users").doc(uid).get();
  if (!userSnap.exists) { return { error: "no-user" }; }
  const userDoc = userSnap.data();
  const prefs = userDoc.notificationPrefs || {};
  const results = {};

  const wantPush = (payload.channel === "push" || payload.channel === "both") && prefs.pushEnabled;
  const wantEmail = (payload.channel === "email" || payload.channel === "both") && prefs.emailEnabled !== false;

  const inQuiet = await isInQuietHours(prefs, !!payload.allowQuietHourException);

  if (wantPush && !inQuiet) {
    const cap = await checkAndIncrementCap(uid, "push", payload.type);
    if (cap.allowed) {
      results.push = await sendPush(uid, payload);
    } else {
      results.push = { sent: 0, reason: cap.reason };
    }
  }
  if (wantEmail) {
    const cap = await checkAndIncrementCap(uid, "email", payload.type);
    if (cap.allowed) {
      results.email = await sendEmail(uid, userDoc, payload);
    } else {
      results.email = { sent: 0, reason: cap.reason };
    }
  }

  // Mirror to in-app inbox (Phase 3 — safe to write now even if UI not ready)
  await admin.firestore().collection("users").doc(uid)
    .collection("notifications").add({
      type: payload.type,
      title: payload.title,
      body: payload.body,
      deepLink: payload.deepLink || "/dashboard.html",
      channel: payload.channel,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      readAt: null
    });

  // Analytics event
  await admin.firestore().collection("notificationEvents").add({
    uid: uid,
    type: payload.type,
    channel: payload.channel,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    openedAt: null
  });

  return results;
}

module.exports = {
  sendNotification,
  // Triggers exported below (added in next steps)
  BREVO_API_KEY, BREVO_SENDER_EMAIL, GROQ_API_KEY, REGION, TZ
};
```

## Step 2.2 — Wire `notifications.js` into `functions/index.js`

At the **bottom** of [functions/index.js](../functions/index.js):
```javascript
// ── Notifications module ─────────────────────────────────
const notif = require("./notifications");
exports.dailyReminderCron = notif.dailyReminderCron;
exports.streakAtRiskCron = notif.streakAtRiskCron;
exports.weeklyDigestCron = notif.weeklyDigestCron;
exports.lapsedUserCron = notif.lapsedUserCron;
exports.onExpenseWriteTrigger = notif.onExpenseWriteTrigger;
exports.onUserWriteTrigger = notif.onUserWriteTrigger; // for onboarding states
```
*(Each export is added in Step 2.3 below.)*

## Step 2.3 — Implement the 13 state triggers

Add to `functions/notifications.js`. Each follows the pattern: cron runs → query users matching state → call `sendNotification()`.

### State 1 + 2: Onboarding crons (run daily 10am PH)

```javascript
exports.onboardingCron = onSchedule({
  schedule: "0 10 * * *", timeZone: TZ, region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const users = await admin.firestore().collection("users").get();
  for (const doc of users.docs) {
    const u = doc.data();
    const created = u.createdAt && u.createdAt.toMillis ? u.createdAt.toMillis() : null;
    if (!created) { continue; }
    const ageDays = Math.floor((now - created) / oneDayMs);

    // State 1: Not Activated
    if ((ageDays === 1 || ageDays === 3) && (!u.expenseCount || u.expenseCount === 0)) {
      await sendNotification(doc.id, {
        type: ageDays === 1 ? "onboarding-activate-d1" : "onboarding-activate-d3",
        channel: ageDays === 1 ? "both" : "email",
        title: "👋 Tigom is waiting",
        body: "Your budget is ready — log your first ₱20 snack and let's go.",
        subject: "Your ₱ jar is empty — let's fix that",
        html: emailTemplate("onboarding-activate", { firstName: u.firstName }),
        deepLink: "/dashboard.html"
      });
    }
    // State 2: No Budget Set
    if ((ageDays === 1 || ageDays === 3) && !u.weeklyBudget) {
      await sendNotification(doc.id, {
        type: "onboarding-no-budget",
        channel: "push",
        title: "Set your weekly budget 🐾",
        body: "30 seconds. Tigom can't help without it.",
        deepLink: "/settings.html"
      });
    }
  }
});
```

### State 3: Daily reminder (cron runs hourly)

```javascript
exports.dailyReminderCron = onSchedule({
  schedule: "0 * * * *", timeZone: TZ, region: REGION
}, async () => {
  const hour = nowInPH();
  const today = todayKeyPH();
  const users = await admin.firestore().collection("users")
    .where("notificationPrefs.dailyReminderEnabled", "==", true)
    .where("notificationPrefs.dailyReminderHour", "==", hour)
    .get();

  for (const doc of users.docs) {
    const u = doc.data();
    if (u.lastExpenseDate === today) { continue; } // already logged today
    await sendNotification(doc.id, {
      type: "daily-reminder",
      channel: "push",
      title: "Don't forget today 🐾",
      body: "Even ₱0 counts as a check-in.",
      deepLink: "/dashboard.html"
    });
  }
});
```

### States 4 + 5: Streak-at-Risk (6pm soft, 10pm last call)

```javascript
exports.streakAtRiskCron = onSchedule({
  schedule: "0 18,22 * * *", timeZone: TZ, region: REGION
}, async () => {
  const hour = nowInPH();
  const today = todayKeyPH();
  const isLastCall = hour >= 22;

  const users = await admin.firestore().collection("users")
    .where("currentStreak", ">=", 2).get();

  for (const doc of users.docs) {
    const u = doc.data();
    if (u.lastExpenseDate === today) { continue; }
    const streak = u.currentStreak || 0;
    const firstName = u.firstName || "friend";

    await sendNotification(doc.id, {
      type: isLastCall ? "streak-at-risk-last" : "streak-at-risk-soft",
      channel: "push",
      title: isLastCall ? "⏰ 2 hours left, " + firstName : "🔥 Streak in danger",
      body: isLastCall
        ? "Your " + streak + "-day streak ends at midnight."
        : "Your " + streak + "-day streak is in danger. 30 seconds to save it.",
      deepLink: "/dashboard.html?from=streak",
      allowQuietHourException: isLastCall
    });
  }
});
```

### State 6: Streak Just Broken (cron 9am)

```javascript
exports.streakBrokenCron = onSchedule({
  schedule: "0 9 * * *", timeZone: TZ, region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const today = todayKeyPH();
  const users = await admin.firestore().collection("users")
    .where("streakBrokenFlag", "==", true).get();

  for (const doc of users.docs) {
    const u = doc.data();
    await sendNotification(doc.id, {
      type: "streak-broken",
      channel: "email",
      subject: "Tigom is sad 🥲",
      title: "Tigom is sad 🥲",
      body: "Your " + (u.lastStreakLength || 0) + "-day streak ended. Repair it with 50 sentimos.",
      html: emailTemplate("streak-broken", {
        firstName: u.firstName,
        streakLength: u.lastStreakLength || 0
      }),
      deepLink: "/shop.html"
    });
    // Clear flag
    await doc.ref.update({ streakBrokenFlag: false });
  }
});
```

> **Important**: a separate piece of client/server logic must SET `streakBrokenFlag = true` and `lastStreakLength = N` whenever a streak resets. Add this to the streak-tracking code in `js/storage.js` or wherever the streak counter lives.

### State 7, 8, 9: Firestore trigger on expense write

```javascript
exports.onExpenseWriteTrigger = onDocumentWritten({
  document: "users/{uid}/expenses/{expenseId}",
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async (event) => {
  const uid = event.params.uid;
  const userSnap = await admin.firestore().collection("users").doc(uid).get();
  if (!userSnap.exists) { return; }
  const u = userSnap.data();

  // State 8: Budget Warning (≥80%, before Friday)
  // State 9: Budget Exceeded (≥100%)
  const weeklyBudget = u.weeklyBudget || 0;
  const weekSpent = u.weekSpent || 0; // assume maintained elsewhere
  const dayOfWeek = new Date().getDay(); // 5 = Fri

  if (weeklyBudget > 0) {
    const pct = weekSpent / weeklyBudget;
    if (pct >= 1.0) {
      await sendNotification(uid, {
        type: "budget-exceeded",
        channel: "push",
        title: "Budget blown by ₱" + Math.round(weekSpent - weeklyBudget),
        body: "Tigom believes in you — adjust next week's plan?",
        deepLink: "/stats.html"
      });
    } else if (pct >= 0.8 && dayOfWeek < 5) {
      await sendNotification(uid, {
        type: "budget-warning",
        channel: "both",
        title: "⚠️ 82% of budget used",
        body: "You've used " + Math.round(pct * 100) + "% and it's only " + dayName(dayOfWeek) + ".",
        subject: "Heads-up: budget warning",
        html: emailTemplate("budget-warning", { firstName: u.firstName, pct: Math.round(pct * 100) }),
        deepLink: "/stats.html"
      });
    }
  }

  // State 7: Achievement-Adjacent — check if any badge/level is within threshold
  // (Implementation depends on existing achievements logic. Pseudocode:)
  // const close = findClosestUnlock(u);
  // if (close && close.percentToUnlock >= 0.8) { await sendNotification(...) }
});

function dayName(d) {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d];
}
```

### State 10: Weekly Digest (Sunday 7pm PH)

```javascript
exports.weeklyDigestCron = onSchedule({
  schedule: "0 19 * * 0", timeZone: TZ, region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL, GROQ_API_KEY]
}, async () => {
  const users = await admin.firestore().collection("users")
    .where("notificationPrefs.emailEnabled", "!=", false).get();

  // Batch across Sun + Mon to stay under 95/day cap (split half/half)
  const half = Math.ceil(users.size / 2);
  const todayDay = new Date().getDay(); // 0 = Sun, 1 = Mon
  const batchStart = todayDay === 0 ? 0 : half;
  const batchEnd = todayDay === 0 ? half : users.size;

  for (let i = batchStart; i < batchEnd; i++) {
    const doc = users.docs[i];
    const u = doc.data();
    const summary = await buildWeeklySummary(doc.id);
    const aiTip = await fetchGroqTip(summary, GROQ_API_KEY.value());
    await sendNotification(doc.id, {
      type: "weekly-digest",
      channel: "email",
      subject: "Your week in ₱: " + summary.headline,
      title: "Weekly recap",
      body: summary.headline,
      html: emailTemplate("weekly-digest", { ...summary, firstName: u.firstName, aiTip: aiTip }),
      deepLink: "/stats.html"
    });
  }
});

async function buildWeeklySummary(uid) {
  // Query last 7 days of expenses, return { headline, totalSpent, topCategory, dayCount }
  // Implement based on existing expense schema.
  return { headline: "₱2,340 spent", totalSpent: 2340, topCategory: "Food", dayCount: 6 };
}

async function fetchGroqTip(summary, apiKey) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 80,
      temperature: 0.7,
      messages: [
        { role: "system", content: "You are Tigom, a Filipino budgeting mascot. Give ONE concrete tip in 1-2 sentences. Currency is ₱." },
        { role: "user", content: "User spent ₱" + summary.totalSpent + " this week, mostly on " + summary.topCategory + ". Tip?" }
      ]
    })
  });
  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "Keep it up next week!";
}
```

### State 11: Friend Passed You (Firestore trigger on leaderboard rank change)

```javascript
exports.onLeaderboardChange = onDocumentWritten({
  document: "leaderboard/{period}",
  region: REGION
}, async (event) => {
  // Compare before/after, find users whose rank dropped because someone overtook them.
  // For each such user, send push (max 2/week — enforced by sendNotification cap).
  // Implementation depends on existing leaderboard structure.
});
```

### States 12 + 13: Lapsed user ladder (cron 9am)

```javascript
exports.lapsedUserCron = onSchedule({
  schedule: "0 9 * * *", timeZone: TZ, region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const users = await admin.firestore().collection("users").get();
  for (const doc of users.docs) {
    const u = doc.data();
    if (!u.lastLoginAt || !u.lastLoginAt.toMillis) { continue; }
    const daysInactive = Math.floor((now - u.lastLoginAt.toMillis()) / dayMs);

    let stage = null;
    if (daysInactive === 3) { stage = "d3"; }
    else if (daysInactive === 7) { stage = "d7"; }
    else if (daysInactive === 14) { stage = "d14"; }
    else if (daysInactive === 30) { stage = "d30"; }
    if (!stage) { continue; }

    const copy = LAPSED_COPY[stage];
    await sendNotification(doc.id, {
      type: "lapsed-" + stage,
      channel: stage === "d3" ? "both" : "email",
      title: copy.title,
      body: copy.body,
      subject: copy.subject,
      html: emailTemplate("lapsed-" + stage, { firstName: u.firstName }),
      deepLink: "/dashboard.html"
    });
  }
});

const LAPSED_COPY = {
  d3:  { title: "We miss you 🐾", body: "Tigom is staring at the door.", subject: "Tigom is staring at the door 🐾" },
  d7:  { title: "Your sentimos are gathering dust", body: "Come back and put them to work.", subject: "Your sentimos are gathering dust" },
  d14: { title: "One last reminder", body: "We'll stop emailing soon if you don't come back.", subject: "One last reminder before we stop emailing" },
  d30: { title: "Tigom's last letter", body: "You can come back anytime.", subject: "Tigom's last letter — you can come back anytime" }
};
```

## Step 2.4 — Email template helper (`functions/templates.js`)

Create `functions/templates.js`:

```javascript
const TEMPLATES = {
  "onboarding-activate": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#f9fafb">
      <h1 style="color:#164f33">Hey ${vars.firstName || "there"} 👋</h1>
      <p>Tigom noticed your budget is ready, but no expenses yet. Log your first one — even ₱20 — and let's get this streak going.</p>
      <a href="https://sugbocents.web.app/dashboard.html" style="display:inline-block;padding:12px 24px;background:#2b8259;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Open SugboCents</a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">— Tigom 🐾</p>
    </div>`,
  "streak-broken": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#f9fafb">
      <h1 style="color:#164f33">Tigom is sad 🥲</h1>
      <p>Your ${vars.streakLength}-day streak ended. But you can repair it for 50 sentimos before midnight.</p>
      <a href="https://sugbocents.web.app/shop.html" style="display:inline-block;padding:12px 24px;background:#2b8259;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Repair my streak</a>
    </div>`,
  "budget-warning": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h1 style="color:#164f33">⚠️ ${vars.pct}% of your budget used</h1>
      <p>Hi ${vars.firstName || "friend"} — heads up. Want to see where it went?</p>
      <a href="https://sugbocents.web.app/stats.html" style="display:inline-block;padding:12px 24px;background:#2b8259;color:white;text-decoration:none;border-radius:8px;margin-top:16px">See breakdown</a>
    </div>`,
  "weekly-digest": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h1 style="color:#164f33">Your week in ₱</h1>
      <p>You logged on ${vars.dayCount}/7 days. Top category: <strong>${vars.topCategory}</strong>. Total: ₱${vars.totalSpent}.</p>
      <blockquote style="border-left:3px solid #2b8259;padding-left:12px;color:#374151">${vars.aiTip}</blockquote>
      <a href="https://sugbocents.web.app/stats.html" style="display:inline-block;padding:12px 24px;background:#2b8259;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Open full stats</a>
    </div>`,
  "lapsed-d3": (vars) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h1>We miss you, ${vars.firstName || "friend"} 🐾</h1><p>Tigom is staring at the door. Come back?</p><a href="https://sugbocents.web.app/dashboard.html" style="display:inline-block;padding:12px 24px;background:#2b8259;color:white;text-decoration:none;border-radius:8px">Come back</a></div>`,
  "lapsed-d7": (vars) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h1>Your sentimos are gathering dust</h1><p>Come back and put them to work.</p></div>`,
  "lapsed-d14": (vars) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h1>One last reminder</h1><p>We'll stop emailing soon if you don't come back.</p></div>`,
  "lapsed-d30": (vars) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h1>Tigom's last letter</h1><p>You can come back anytime. We won't email again.</p></div>`
};

function emailTemplate(name, vars) {
  const fn = TEMPLATES[name];
  return fn ? fn(vars || {}) : "<p>" + (vars && vars.body || "") + "</p>";
}

module.exports = { emailTemplate };
```

Then in `functions/notifications.js` add at the top:
```javascript
const { emailTemplate } = require("./templates");
```

## Step 2.5 — Deploy & verify Phase 2

```powershell
cd functions
npm install
cd ..
npx -y firebase-tools@latest deploy --only functions
```

Verify in Firebase Console → **Functions** → all new functions appear with green status.

Trigger one manually:
```powershell
npx -y firebase-tools@latest functions:shell
> dailyReminderCron()
```

---

# PHASE 3 — In-App Inbox (~2 hours)

## Step 3.1 — Bell icon in [js/chrome.js](../js/chrome.js)

In the top-bar render section, add a bell button with an unread count badge that reads from `users/{uid}/notifications` where `readAt == null`.

## Step 3.2 — Inbox panel

Build a slide-in drawer (reuse existing modal styles) showing the latest 20 notifications. Tapping one sets `readAt: serverTimestamp()` and navigates to its `deepLink`.

## Step 3.3 — Unread count

Subscribe with `onSnapshot` to count unread; update badge live.

---

# PHASE 4 — Analytics & Tuning (~1 hour)

## Step 4.1 — Click tracking

In [sw.js](../sw.js) `notificationclick` handler, after `event.notification.close()`, post a message back to a foreground client to write `openedAt` on the matching `notificationEvents` doc. (Or write directly via FCM data payload containing the eventId.)

## Step 4.2 — Dev tools panel

Extend [js/dev-tools.js](../js/dev-tools.js) with a "Notifications" tab that lists the last 50 sends for the current user with timestamps and open status.

## Step 4.3 — Tuning rubric

After 2 weeks of live data, review:
- States with **<5% CTR** → kill or rewrite copy.
- States with **>50% click-without-open** (i.e., dismissed) → reduce frequency.
- If overall opt-out rate >15% → reduce default-on states.

---

## ✅ End-to-end verification checklist

| # | Test | Expected |
|---|---|---|
| 1 | Sign up new user → wait 24h (or fake `createdAt`) → trigger `onboardingCron` manually | Push + email "👋 Tigom is waiting" arrives |
| 2 | New user, no budget set, age 1d | Push "Set your weekly budget 🐾" arrives |
| 3 | Enable daily reminder for hour=14, set clock to 14:00 PH, trigger cron | Push arrives at 2pm |
| 4 | Seed `currentStreak=3`, no expense today, run cron at 18:00 PH | Soft streak push arrives |
| 5 | Same user, run cron at 22:00 PH | Last-call push arrives, **even if quiet hours** |
| 6 | Set `streakBrokenFlag=true`, run `streakBrokenCron` | Email "Tigom is sad" arrives, flag clears |
| 7 | Log expense pushing user to 82% of budget on Wednesday | Push + email "82% of budget used" arrives |
| 8 | Log expense pushing past 100% | Push "Budget blown by ₱X" arrives, no warning |
| 9 | Sunday 19:00 PH, active user with email enabled | Weekly digest email arrives with AI tip |
| 10 | Set `lastLoginAt` to 3 days ago | Push + email "We miss you 🐾" arrives |
| 11 | Set `lastLoginAt` to 30 days ago | Email "Tigom's last letter" arrives, then no more emails ever |
| 12 | Send 2 pushes in same day | Second one logs `daily-cap` reason, doesn't send |
| 13 | Send notification at 23:00 PH (quiet hours) without `allowQuietHourException` | Push skipped, email still allowed |
| 14 | Open notification on phone → check `notificationEvents` | `openedAt` populated |
| 15 | Disable push in settings → trigger any push state | Skipped, email still sends if enabled |

---

## 📦 Deliverables checklist

- [ ] Phase 0a — Brevo account + verified sender + `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` secrets
- [ ] Phase 0b — VAPID key in `js/firebase-init.js`
- [ ] Phase 0c — `@getbrevo/brevo` installed in `functions/`
- [ ] Phase 1.1 — `firebase-init.js` loads messaging SDK
- [ ] Phase 1.2 — `js/notifications.js` created
- [ ] Phase 1.3 — Soft-prompt CSS in `css/style.css`
- [ ] Phase 1.4 — `StorageAPI.getNotificationPrefs` / `setNotificationPrefs`
- [ ] Phase 1.5 — `sw.js` v145 with FCM background handler + `notificationclick`
- [ ] Phase 1.6 — `firestore.rules` updated and deployed
- [ ] Phase 1.7 — Soft prompt fires after first expense
- [ ] Phase 1.8 — Settings UI for prefs
- [ ] Phase 1.9 — Manual push from Firebase Console works end-to-end
- [ ] Phase 2.1 — `functions/notifications.js` with `sendNotification` dispatcher
- [ ] Phase 2.2 — Wired into `functions/index.js`
- [ ] Phase 2.3 — All 13 state triggers implemented
- [ ] Phase 2.4 — `functions/templates.js` with all email HTML
- [ ] Phase 2.5 — Functions deployed; each cron callable from `functions:shell`
- [ ] Phase 3 — In-app inbox UI live
- [ ] Phase 4 — Click tracking + dev panel
- [ ] Verification checklist 1–15 all pass

---

## 🚨 Common pitfalls to avoid

1. **Forgetting to bump the SW cache version** → users see stale `sw.js`, push handler never updates. ALWAYS bump after changing `sw.js`.
2. **Calling `localStorage` directly in any new file** → violates project rule. Always use `StorageAPI`.
3. **Using `let`/`const` in browser JS** → mismatches existing style; lints/diagnostics may flag it.
4. **Hard-coding the Brevo sender email** → use the secret. Sender will change when we get a domain.
5. **Forgetting `allowQuietHourException: true` on the 10pm Last Call push** → it'll be blocked at 22:00 if user's quiet hours start at 21:00.
6. **Iterating ALL users in cron without batching** → at 1k+ users this hits Firestore read limits. After 500 users, paginate using `startAfter()`.
7. **Sending emails without the daily quota guard** → blows past Brevo's 300/day → account suspended.
8. **Forgetting to delete dead FCM tokens** → repeated invalid sends = wasted FCM quota. The pruning logic in `sendPush` handles this; don't remove it.
9. **Not setting `streakBrokenFlag` when a streak resets** → State 6 never fires. Add this to wherever the streak counter resets in `js/storage.js`.
10. **Testing on iOS Safari without home-screen install** → push will silently fail. Test on Android Chrome or Desktop Chrome first.

---

**Last updated**: handed off for implementation. Ping back with questions about any step before guessing.
