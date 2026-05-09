# Sprint 3 — Phase 5: AI Wrapped Email

> **Backend required:** Yes — Resend (email provider) + Groq (AI insight)
> **Depends on:** Can run in parallel with Phase 4 — no social/Firestore dependency
> **Email provider:** Resend (free tier, easiest setup)
> **AI model:** Groq `llama-3.1-8b-instant` (already configured via `GROQ_API_KEY` secret)

---

## What It Is

A weekly spending summary email sent to the user's registered email address. Contains:
- A branded stats card (total spent, budget, streak, top category, expense count)
- A 2–3 sentence AI-generated personalized insight from Groq
- A CTA button back to the dashboard

**Delivery modes:**
1. **On-demand** — user taps "Send me this week's report" in Settings
2. **Opt-in weekly auto-send** — user toggles a preference; when Phase 4 (Firestore) is live, a Cloud Scheduler job reads opted-in users and fires the email every Monday morning

> Phase 5 delivers both modes from the client. The Cloud Scheduler auto-send is a Phase 4+ enhancement that requires user emails to be in Firestore.

---

## `functions/index.js` Changes

### New secret

```js
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
```

### New endpoint: `exports.sendWrappedEmail`

```js
exports.sendWrappedEmail = onRequest(
  { secrets: [GROQ_API_KEY, RESEND_API_KEY], region: "us-central1", invoker: "public" },
  async (req, res) => { ... }
);
```

**Request body:**

```js
{
  email: "user@example.com",
  firstName: "Maria",
  weeklyData: {
    totalSpent: 1850,
    weeklyBudget: 2000,
    topCategory: "Food",
    expenseCount: 12,
    streak: 14,
    level: "Budget Keeper",
    weekLabel: "Apr 28 – May 4"
  }
}
```

**Processing steps:**

1. **Validate:** confirm `email` is present and `weeklyData` has required fields. Return 400 if missing.
2. **Rate limit:** 5 requests/day per IP (re-use existing rate-limit map pattern from `chat` endpoint)
3. **Groq call:** generate AI insight
   - System prompt: *"You are a warm, encouraging Filipino budgeting coach. Given a user's weekly spending summary, write exactly 2–3 sentences of personalized insight in a supportive tone. Mention their specific numbers. Do not use bullet points. Write in English."*
   - User message: `"Name: ${firstName}. Spent ₱${totalSpent} of ₱${weeklyBudget} budget. Top category: ${topCategory}. Logged ${expenseCount} expenses. Current streak: ${streak} days."`
   - `max_tokens: 120`, `temperature: 0.7`
4. **Build HTML email** (see Email Format section below)
5. **Resend call:** POST to `https://api.resend.com/emails`
6. **Return:** `{ success: true }` or `{ error: "message" }`

**Graceful fallback:** If Groq call fails or times out (>4s), send the email without the AI paragraph — the stats card alone is still valuable.

---

## Email Format

**Subject:** `Your SugboCents Week — ${weekLabel}`

**HTML structure:**

```
┌─────────────────────────────┐
│  [SugboCents logo / wordmark]│  ← branded green header (#1f6b46 bg, white text)
│  Your week in review        │
├─────────────────────────────┤
│                             │
│  Hi Maria 👋                │
│                             │
│  ┌─────────────────────┐   │
│  │ ₱1,850 / ₱2,000    │   │  ← spent / budget (large numbers)
│  │ 🔥 14-day streak    │   │
│  │ 📦 12 expenses      │   │
│  │ 🍔 Top: Food        │   │
│  └─────────────────────┘   │
│                             │
│  [AI insight paragraph]     │  ← 2–3 sentences from Groq, italic style
│                             │
│  [VIEW YOUR DASHBOARD →]    │  ← green CTA button, links to dashboard.html
│                             │
├─────────────────────────────┤
│  SugboCents · Unsubscribe   │  ← footer, muted text
└─────────────────────────────┘
```

**Plain-text fallback:** Always include a `text` field in the Resend payload — same content without HTML tags.

---

## `settings.html` Changes

New section below the existing budget section: **Weekly Report**

```
Weekly Report
─────────────
[📩 Send me this week's report]    ← button, brand green, full width

  ○ Auto-send every Monday         ← toggle (checkbox styled as switch)
    Get your summary in your inbox automatically.
```

- The "Send" button is disabled and shows a loading spinner while the Cloud Function is in-flight
- On success: show a green toast "Report sent to your email ✓"
- On error: show red toast "Couldn't send — try again"
- The toggle saves immediately on change (no Save button needed)

---

## `js/settings.js` Changes

### Wire the "Send" button

```js
document.getElementById("sendReportBtn").addEventListener("click", async () => {
  const user = StorageAPI.getCurrentUser();
  const weeklyData = buildWeeklyReportData(); // gathers from StorageAPI
  // show loading state
  const res = await fetch(CLOUD_FUNCTION_URL + "/sendWrappedEmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, firstName: user.firstName, weeklyData })
  });
  // handle success/error toast
  StorageAPI.setLastEmailSentAt(new Date().toISOString());
});
```

### `buildWeeklyReportData()` (local helper in `settings.js`)

Gathers from StorageAPI:
- `getExpenses()` filtered to current ISO week → `totalSpent`, `expenseCount`, `topCategory`
- `getCurrentUser().weeklyBudget` → `weeklyBudget`
- `getCurrentStreak()` → `streak`
- `getXpInfo().levelName` → `level`
- Format week label: "Apr 28 – May 4" from current week's Monday/Sunday dates

### Wire the opt-in toggle

```js
document.getElementById("emailOptInToggle").addEventListener("change", (e) => {
  StorageAPI.setEmailOptIn(e.target.checked);
});
// On page load:
document.getElementById("emailOptInToggle").checked = StorageAPI.getEmailOptIn();
```

---

## `js/storage.js` Changes

```js
getEmailOptIn()                  // returns bool (default false)
setEmailOptIn(bool)              // saves preference
getLastEmailSentAt()             // returns ISO string or null
setLastEmailSentAt(isoString)    // saves timestamp
```

These are stored under `user.preferences.emailOptIn` and `user.preferences.lastEmailSentAt`.

---

## Security Notes

- **Input validation:** email must pass a basic format check server-side before Resend call
- **Rate limit:** 5/day per IP prevents abuse — return 429 with `{ error: "Rate limit exceeded" }`
- **No user PII logged:** do not log email addresses or spending data in Cloud Function logs
- **RESEND_API_KEY** stored as a Firebase secret (same pattern as GROQ_API_KEY) — never hardcoded

---

## `sw.js`

Bump cache version after Phase 5 changes to `settings.html` and `js/settings.js`.

---

## Completion Criteria

- [ ] `sendWrappedEmail` endpoint deployed and reachable
- [ ] Groq insight paragraph appears in received email
- [ ] Email fallback sends correctly if Groq times out (stats card only, no paragraph)
- [ ] Rate limit (5/day) blocks repeat sends with a 429 response
- [ ] "Send" button in Settings shows loading state and success/error toast
- [ ] `buildWeeklyReportData()` collects correct data for current ISO week
- [ ] Opt-in toggle persists across sessions via StorageAPI
- [ ] `getLastEmailSentAt()` is updated after each successful send
- [ ] HTML email renders correctly in Gmail and Apple Mail (test both)
- [ ] Plain-text fallback is included in Resend payload
