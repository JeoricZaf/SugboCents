# AI Chat — Bug Fix Plan

Produced by diagnostic audit on 2026-05-13. Covers all files in the AI Chat feature:
`js/chat.js`, `js/chat-ai.js`, `js/storage.js`, `functions/index.js`.

---

## Status Legend
- ✅ Fixed
- 🔲 Not yet fixed

---

## Bug 1 — CORS Block: Chat Fails on Netlify Deployment
**Severity: Critical | Status: ✅ Fixed (2026-05-13)**

`ALLOWED_ORIGINS` in `functions/index.js` did not include `https://sugbocents.netlify.app`.
Browser blocked every fetch from the deployed site with a CORS error, triggering the
"I'm having trouble responding right now" message on 100% of requests.

**Fix:** Added `"https://sugbocents.netlify.app"` to the `ALLOWED_ORIGINS` array in
`functions/index.js`. Applies to all three Cloud Functions (`chat`, `emojiSuggest`, `wrappedEmail`).

**Deploy required:** `firebase deploy --only functions`

---

## Bug 2 — User Message Duplicated in AI Context Window
**Severity: Critical | Status: 🔲**

**Files:** `js/chat.js` → `sendMessage()`, `functions/index.js` → `exports.chat`

**Root Cause:** `appendMsg()` calls `StorageAPI.saveChatMessage()` synchronously before
`buildConversationHistory()` is called. The history array therefore already contains the
new user message as its last element. `sendMessage` then also passes `trimmed` as the
`message` field. The Cloud Function appends `message` to the messages array after replaying
history, so the user's text appears twice in sequence in every Groq request.

**Impact:** Model receives duplicate user turn on every request. Wastes ~half the 150-token
response budget, confuses turn-taking, degrades answer quality.

**Fix approach:** Call `buildConversationHistory()` before `appendMsg()` in `sendMessage`,
or slice the last element off history before sending if its role is `"user"`.

---

## Bug 3 — No Fetch Timeout: Typing Indicator Hangs Indefinitely
**Severity: Critical | Status: 🔲**

**File:** `js/chat-ai.js` → `send()`

**Root Cause:** The `fetch` call has no `AbortController` signal. A stalled TCP connection
(server receives request, never responds) does not throw — it waits for the browser's
socket timeout (up to 5 min) or the Cloud Function's 60-second hard limit. During this
entire window the input field is disabled and the typing indicator spins with no recovery path.

**Impact:** Chat is completely frozen. User must hard-reload to recover.

**Fix approach:** Wrap the fetch in an `AbortController` with a ~15-second `setTimeout`.
On timeout, call `controller.abort()` and return `{ ok: false, error: "Request timed out." }`.

---

## Bug 4 — Client-Controlled System Prompt (Prompt Injection)
**Severity: Critical (Security) | Status: 🔲**

**Files:** `js/chat-ai.js` → `send()`, `functions/index.js` → `exports.chat`

**Root Cause:** The browser builds the system prompt in `buildSystemPrompt()` and sends it
as `systemPrompt` in the POST body. The Cloud Function uses it verbatim:
```js
var systemPrompt = req.body.systemPrompt || "You are Sugbo...";
```
Any actor can POST directly to the Cloud Function with an arbitrary `systemPrompt`,
completely replacing the Tigom persona and bypassing all safety guardrails.

**Impact:** Full prompt injection via direct API call. The Groq API key is server-side
(safe), but the instructions given to the model are entirely client-controlled.

**Fix approach:** Define the system prompt authoritatively in `functions/index.js` and
ignore `req.body.systemPrompt`. Move user context (budget, streak, XP) injection to the
server side by reading it from Firestore for the authenticated user, or remove it entirely.

---

## Bug 5 — Rate Limit Slot Consumed Before API Call Fires
**Severity: Moderate | Status: 🔲**

**File:** `js/chat-ai.js` → `checkRateLimit()` and `send()`

**Root Cause:** `checkRateLimit()` pushes a timestamp and persists it before `fetch` is
attempted. Failed requests (5xx, network error) permanently consume a quota slot with no
rollback.

**Impact:** During an outage, repeated retries drain the 20-message hourly quota. The user
gets rate-limited for the rest of the hour having received zero successful AI responses.

**Fix approach:** Only push the timestamp after a confirmed `200` response, or maintain a
separate "pending" counter that is only promoted to "consumed" on success.

---

## Bug 6 — Dual Event Listener on Back Button in Embedded Mode
**Severity: Moderate | Status: 🔲**

**File:** `js/chat.js` → `initEmbeddedMode()` and `initBackBtn()`

**Root Cause:** Both functions attach a `click` listener to `#chatBackBtn`. In embedded
mode, `initEmbeddedMode` fires `postMessage` to the parent; `initBackBtn` also fires
`window.history.back()`. `preventDefault()` is called but not `stopPropagation()`, so
both callbacks execute.

**Impact:** Closing the chat panel also navigates the iframe backward, causing a flash or
resource error depending on iframe history depth.

**Fix approach:** Add `if (window.self !== window.top) { return; }` guard at the top of
`initBackBtn`, or call `e.stopImmediatePropagation()` in `initEmbeddedMode`'s click handler.

---

## Bug 7 — `postMessage` Uses `"*"` Wildcard; Inbound Listener Has No Origin Check
**Severity: Moderate (Security) | Status: 🔲**

**File:** `js/chat.js` → `sendMessage()` outbound postMessage + `DOMContentLoaded` message listener

**Root Cause:**
```js
window.parent.postMessage({ type: "sugbocents:messageSent" }, "*"); // wildcard
// inbound:
window.addEventListener("message", function (event) {
  if (event.data.type !== "sugbocents:newChat") { return; }
  // no event.origin check
  container.innerHTML = ""; // wipes current messages from DOM
```

**Impact:** Any cross-origin page that embeds the chat iframe can trigger `sugbocents:newChat`
to silently wipe the user's current chat view. Outbound messages also leak UI state to
arbitrary parent pages.

**Fix approach:** Replace `"*"` with the app's known origin. Add
`if (event.origin !== "https://sugbocents.netlify.app") { return; }` to the inbound listener.

---

## Bug 8 — No Markdown Rendering — Raw Syntax Shown to User
**Severity: Moderate | Status: 🔲**

**File:** `js/chat.js` → `appendMsg()`

**Root Cause:** Bot message bubbles use `bubble.textContent = text` which escapes all
markup. Llama 3.1 frequently outputs `**bold**`, bullet lists, and inline backticks even
for short answers.

**Impact:** Users see raw asterisks and dashes instead of formatted text.

**Fix approach:** Run `text` through a lightweight markdown-to-HTML parser (e.g. a small
regex pass for `**bold**`, `*italic*`, and `- list`) before assigning to `innerHTML`.
Sanitize the result (strip `<script>`, `<a href="javascript:">`, etc.) before inserting
into the DOM to prevent XSS.

---

## Bug 9 — `saveStore()` Missing `try-catch`: Ghost Messages on Quota Exceeded
**Severity: Moderate | Status: 🔲**

**File:** `js/storage.js` → `saveStore()`, surfacing in `js/chat.js` → `appendMsg()`

**Root Cause:**
```js
function saveStore(store) {
  localStorage.setItem(APP_KEY, JSON.stringify(store)); // throws DOMException on quota exceeded
}
```
The exception propagates synchronously through `saveChatMessage` → `appendMsg` →
`sendMessage`, aborting the call stack before `setInputState(true)` or `ChatAI.send()`.

**Impact:** User's message bubble appears in the UI but is never stored. No AI response
fires. Input stays unlocked but idle. On refresh the message is gone (ghost message).

**Fix approach:** Wrap `localStorage.setItem` in `try-catch` inside `saveStore`. On
`QuotaExceededError`, evict the oldest thread's messages and retry once, then return
`{ ok: false, error: "storage-full" }` so callers can surface a user-facing warning.

---

## Bug 10 — `activeThreadId` Not Synced After Thread Creation Failure
**Severity: Minor | Status: 🔲**

**File:** `js/chat.js` → `sendMessage()`

**Root Cause:** If `createChatThread()` fails (no session, storage full), the local
`activeThreadId` variable stays `null`. `isPendingNewThread` is cleared regardless. The
auto-title logic is guarded by `if (activeThreadId)` so it never fires, leaving the thread
permanently titled "New chat" even after `saveChatMessage`'s internal fallback saves it.

**Fix approach:** After `saveChatMessage`, call `getActiveChatThreadId()` to re-sync
`activeThreadId` before the auto-title block.

---

## Bug 11 — Silent Fallback to `threads[0]` on Stale Active Thread ID
**Severity: Minor | Status: 🔲**

**File:** `js/storage.js` → `getActiveChatThread()`

**Root Cause:**
```js
if (!active && threads.length > 0) {
  active = threads[0]; // silent, no notification
  savePreferences({ activeChatThreadId: active.id });
}
```
If the stored `activeChatThreadId` points to a deleted thread (e.g. deleted in another
tab), the user silently lands on a completely different conversation with no feedback.

**Fix approach:** Return `null` and let the caller decide whether to create a new thread or
show an empty welcome state, rather than silently hijacking another thread.

---

## Bug 12 — Full Financial Data Sent to Third-Party LLM on Every Request
**Severity: Moderate (Privacy) | Status: 🔲**

**Files:** `js/chat-ai.js` → `buildSystemPrompt()` + `send()`

**Root Cause:** `buildSystemPrompt()` inlines the user's weekly budget, total spent,
remaining balance, savings goal amounts, XP, and streak into the system prompt and sends it
to Groq (a third-party API) on every single message. There is no opt-out, no notice in the
UI, and no data minimization.

**Impact:** Violates the principle of least privilege. User financial data is transmitted to
and processed by a third-party LLM provider without explicit informed consent.

**Fix approach (short-term):** Add a one-line notice in the chat UI ("Your budget data is
sent to the AI to personalize responses"). **Long-term:** Move context injection to the
server side so raw financial figures are never in the browser-to-Groq payload, or allow
users to disable personalized context in Settings.
