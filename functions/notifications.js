const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { emailTemplate } = require("./templates");

if (!admin.apps.length) {
  admin.initializeApp();
}

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = defineSecret("BREVO_SENDER_EMAIL");
const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

const TZ = "Asia/Manila";
const REGION = "us-central1";

const PUSH_DAILY_CAP = 1;
const EMAIL_DAILY_CAP = 1;
const PUSH_WEEKLY_CAP = 3;
const EMAIL_WEEKLY_CAP_NON_DIGEST = 2;
const EMAIL_DAILY_QUOTA_GUARD = 95;

const LAPSED_COPY = {
  d3: { title: "We miss you 🐾", body: "Tigom is staring at the door.", subject: "Tigom is staring at the door 🐾" },
  d7: { title: "Your sentimos are gathering dust", body: "Come back and put them to work.", subject: "Your sentimos are gathering dust" },
  d14: { title: "One last reminder", body: "We'll stop emailing soon if you don't come back.", subject: "One last reminder before we stop" },
  d30: { title: "Tigom's last letter", body: "You can come back anytime.", subject: "Tigom's last letter" }
};

const XP_LEVELS = [0, 50, 150, 350, 700, 1200, 2000];

function toDate(value) {
  if (!value) { return null; }
  if (value.toDate) { return value.toDate(); }
  if (value._seconds) { return new Date(value._seconds * 1000); }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) { return null; }
  return d;
}

function nowInPHHour() {
  const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: TZ });
  return parseInt(fmt.format(new Date()), 10);
}

function todayKeyPH() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
  return fmt.format(new Date());
}

function shiftDayKey(key, daysOffset) {
  const d = new Date(key + "T00:00:00+08:00");
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function digestBucketForUid(uid) {
  // 0..3 — used to spread weekly digest across Sun/Mon/Tue/Wed.
  if (!uid) { return 0; }
  let sum = 0;
  for (let i = 0; i < uid.length; i++) {
    sum = (sum + uid.charCodeAt(i)) >>> 0;
  }
  return sum % 4;
}

function isInQuietHours(prefs, allowExceptions) {
  if (allowExceptions) { return false; }
  const hour = nowInPHHour();
  const start = Number.isFinite(Number(prefs.quietHoursStart)) ? Number(prefs.quietHoursStart) : 21;
  const end = Number.isFinite(Number(prefs.quietHoursEnd)) ? Number(prefs.quietHoursEnd) : 8;
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}

function getDefaultPrefs() {
  return {
    pushEnabled: false,
    emailEnabled: true,
    dailyReminderEnabled: false,
    dailyReminderHour: 20,
    socialEnabled: true,
    quietHoursStart: 21,
    quietHoursEnd: 8
  };
}

async function reserveEmailQuotaSlot() {
  const db = admin.firestore();
  const dayKey = todayKeyPH();
  const ref = db.collection("metrics").doc(`emailQuota_${dayKey}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data().count || 0) : 0;
    if (current >= EMAIL_DAILY_QUOTA_GUARD) {
      return { allowed: false, current };
    }
    tx.set(ref, {
      count: current + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { allowed: true, current: current + 1 };
  });
}

async function getWeekSpent(uid) {
  const db = admin.firestore();
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const mondayIso = monday.toISOString();

  const snap = await db.collection("users").doc(uid)
    .collection("expenses")
    .where("timestamp", ">=", mondayIso)
    .get();

  let total = 0;
  snap.forEach((doc) => {
    const data = doc.data() || {};
    total += Number(data.amount || 0);
  });
  return total;
}

async function sendPush(uid, payload) {
  const db = admin.firestore();
  const tokensSnap = await db.collection("users").doc(uid).collection("fcmTokens").get();
  if (tokensSnap.empty) {
    return { sent: 0, reason: "no-tokens" };
  }

  const docs = tokensSnap.docs.filter((d) => !!(d.data() && d.data().token));
  const tokens = docs.map((d) => d.data().token);
  if (!tokens.length) {
    return { sent: 0, reason: "no-tokens" };
  }

  const message = {
    tokens,
    data: {
      type: payload.type || "generic",
      title: String(payload.title || "SugboCents"),
      body: String(payload.body || ""),
      deepLink: payload.deepLink || "/dashboard.html",
      eventId: payload.eventId || "",
      notificationId: payload.notificationId || ""
    },
    webpush: {
      headers: {
        Urgency: "high"
      }
    }
  };

  const result = await admin.messaging().sendEachForMulticast(message);

  const stale = [];
  result.responses.forEach((resp, idx) => {
    if (resp.success) { return; }
    const code = resp.error && resp.error.code;
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
      stale.push(docs[idx] && docs[idx].id);
    }
  });

  if (stale.length) {
    const batch = db.batch();
    stale.forEach((id) => {
      if (!id) { return; }
      batch.delete(db.collection("users").doc(uid).collection("fcmTokens").doc(id));
    });
    await batch.commit();
  }

  return { sent: result.successCount, failed: result.failureCount };
}

async function sendEmail(uid, userDoc, payload) {
  const email = String(userDoc.email || "").trim().toLowerCase();
  if (!email) {
    return { sent: 0, reason: "missing-email" };
  }

  // Dev-tools simulation hook (no-op when flag is absent).
  try {
    const flagSnap = await admin.firestore().collection("metrics").doc("devFlags").get();
    if (flagSnap.exists) {
      const flag = flagSnap.data() || {};
      if (flag.simulateBrevoFailureUid === uid) {
        return { sent: 0, reason: "brevo-error-simulated" };
      }
    }
  } catch (_) {}

  const slot = await reserveEmailQuotaSlot();
  if (!slot.allowed) {
    console.warn(`[sendEmail] daily quota guard hit at ${slot.current} — uid=${uid} type=${payload.type}`);
    return { sent: 0, reason: "daily-quota-guard" };
  }

  // Validate secrets before attempting Brevo API calls.
  let apiKey = "";
  let senderEmail = "";
  try {
    apiKey = BREVO_API_KEY.value();
    senderEmail = BREVO_SENDER_EMAIL.value();
  } catch (secretErr) {
    console.error("[sendEmail] Secret access failed — BREVO_API_KEY or BREVO_SENDER_EMAIL not configured.", secretErr && secretErr.message ? secretErr.message : secretErr);
    return { sent: 0, reason: "brevo-not-configured" };
  }
  if (!apiKey || apiKey.length < 10) {
    console.error("[sendEmail] BREVO_API_KEY is blank or too short. Configure it in Firebase Secret Manager.");
    return { sent: 0, reason: "brevo-not-configured" };
  }
  if (!senderEmail || senderEmail.indexOf("@") === -1) {
    console.error("[sendEmail] BREVO_SENDER_EMAIL is blank or invalid. Configure it in Firebase Secret Manager.");
    return { sent: 0, reason: "brevo-not-configured" };
  }

  let Brevo;
  try {
    Brevo = require("@getbrevo/brevo");
  } catch (sdkErr) {
    console.error("[sendEmail] Brevo SDK missing or failed to load.", sdkErr && sdkErr.message ? sdkErr.message : sdkErr);
    return {
      sent: 0,
      reason: "brevo-sdk-missing",
      detail: sdkErr && sdkErr.message ? String(sdkErr.message).slice(0, 200) : "unknown"
    };
  }

  let api;
  let mail;
  try {
    api = new Brevo.TransactionalEmailsApi();
    api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    mail = new Brevo.SendSmtpEmail();
    mail.subject = payload.subject || payload.title || "SugboCents update";
    mail.htmlContent = payload.html || emailTemplate("fallback", { body: payload.body || "" });
    mail.sender = {
      name: "Tigom (SugboCents)",
      email: senderEmail
    };
    mail.to = [{ email, name: userDoc.firstName || "Saver" }];
  } catch (initErr) {
    console.error("[sendEmail] Brevo SDK init failed.", initErr && initErr.message ? initErr.message : initErr);
    return {
      sent: 0,
      reason: "brevo-sdk-init-failed",
      detail: initErr && initErr.message ? String(initErr.message).slice(0, 200) : "unknown"
    };
  }

  try {
    await api.sendTransacEmail(mail);
    return { sent: 1 };
  } catch (e) {
    console.error("[Notifications] Brevo send failed:", e && e.message ? e.message : e);
    return {
      sent: 0,
      reason: "brevo-error",
      detail: e && e.message ? String(e.message).slice(0, 200) : "unknown"
    };
  }
}

async function getWeeklyCount(uid, channel) {
  const db = admin.firestore();
  const today = todayKeyPH();
  const keys = [];
  for (let i = 0; i < 7; i++) {
    keys.push(shiftDayKey(today, -i));
  }

  const refs = keys.map((k) => db.collection("users").doc(uid).collection("notificationLog").doc(k));
  const snaps = await db.getAll(...refs);

  let total = 0;
  snaps.forEach((snap) => {
    if (!snap.exists) { return; }
    const data = snap.data() || {};
    total += Number(channel === "push" ? data.pushCount : data.emailCount) || 0;
  });
  return total;
}

async function checkAndIncrementCap(uid, channel, type, isDigest, bypassDailyCap) {
  const db = admin.firestore();
  const dayKey = todayKeyPH();
  const ref = db.collection("users").doc(uid).collection("notificationLog").doc(dayKey);

  const weeklyCount = await getWeeklyCount(uid, channel);
  const weeklyCap = channel === "push" ? PUSH_WEEKLY_CAP : (isDigest ? 9999 : EMAIL_WEEKLY_CAP_NON_DIGEST);
  if (weeklyCount >= weeklyCap) {
    return { allowed: false, reason: "weekly-cap" };
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { pushCount: 0, emailCount: 0, types: [] };
    const current = Number(channel === "push" ? data.pushCount : data.emailCount) || 0;
    const dailyCap = channel === "push" ? PUSH_DAILY_CAP : EMAIL_DAILY_CAP;

    if (current >= dailyCap && bypassDailyCap !== true) {
      return { allowed: false, reason: "daily-cap" };
    }

    const next = {
      pushCount: channel === "push" ? current + 1 : (Number(data.pushCount) || 0),
      emailCount: channel === "email" ? current + 1 : (Number(data.emailCount) || 0),
      types: Array.isArray(data.types) ? data.types.slice() : [],
      lastSentAt: admin.firestore.FieldValue.serverTimestamp()
    };
    next.types.push(type);
    tx.set(ref, next, { merge: true });
    return { allowed: true };
  });
}

async function sendNotification(uid, payload) {
  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return { error: "user-not-found" };
  }

  const userDoc = userSnap.data() || {};
  const prefs = Object.assign({}, getDefaultPrefs(), userDoc.notificationPrefs || {});
  const channel = payload.channel || "push";
  const wantsPush = (channel === "push" || channel === "both") && prefs.pushEnabled === true;
  const wantsEmail = (channel === "email" || channel === "both") && prefs.emailEnabled !== false;
  const quiet = isInQuietHours(prefs, !!payload.allowQuietHourException);

  // Pre-allocate IDs and immediately reserve the notificationEvents row with uid
  // so that fast clicks (which happen before sendPush resolves) pass the security rule.
  const eventRef = db.collection("notificationEvents").doc();
  const inboxRef = db.collection("users").doc(uid).collection("notifications").doc();
  const eventId = eventRef.id;
  const notificationId = inboxRef.id;

  await eventRef.set({
    uid,
    type: payload.type || "generic",
    channel: payload.channel || "push",
    deepLink: payload.deepLink || "/dashboard.html",
    sentAt: null,
    openedAt: null,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const results = {
    eventId: null,
    notificationId: null,
    push: { sent: 0, reason: "disabled" },
    email: { sent: 0, reason: "disabled" }
  };

  if (wantsPush && !quiet) {
    const cap = await checkAndIncrementCap(
      uid,
      "push",
      payload.type || "generic",
      false,
      payload.bypassDailyCap === true
    );
    if (cap.allowed) {
      results.push = await sendPush(uid, Object.assign({}, payload, { eventId, notificationId }));
    } else {
      results.push = { sent: 0, reason: cap.reason };
    }
  } else if (wantsPush && quiet) {
    results.push = { sent: 0, reason: "quiet-hours" };
  }

  if (wantsEmail) {
    const cap = await checkAndIncrementCap(
      uid,
      "email",
      payload.type || "generic",
      payload.type === "weekly-digest",
      false
    );
    if (cap.allowed) {
      results.email = await sendEmail(uid, userDoc, payload);
    } else {
      results.email = { sent: 0, reason: cap.reason };
    }
  }

  const delivered = (Number(results.push.sent) || 0) > 0 || (Number(results.email.sent) || 0) > 0;
  if (delivered) {
    const channelLabel = (Number(results.push.sent) || 0) > 0
      ? ((Number(results.email.sent) || 0) > 0 ? "both" : "push")
      : "email";

    await eventRef.set({
      channel: channelLabel,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      openedAt: null,
      status: "delivered"
    }, { merge: true });

    await inboxRef.set({
      type: payload.type || "generic",
      title: payload.title || "SugboCents",
      body: payload.body || "",
      deepLink: payload.deepLink || "/dashboard.html",
      channel: channelLabel,
      eventId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      readAt: null
    });

    results.eventId = eventId;
    results.notificationId = notificationId;
  } else {
    await eventRef.set({
      status: "undelivered",
      undeliveredReason: JSON.stringify({
        push: results.push.reason || null,
        email: results.email.reason || null
      })
    }, { merge: true });
  }

  return results;
}

async function fetchGroqTip(summary) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY.value()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 80,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "You are Tigom, a Filipino budgeting mascot. Give one concrete tip in 1-2 sentences using ₱."
          },
          {
            role: "user",
            content: `User spent ₱${Math.round(summary.totalSpent || 0)} this week, mostly on ${summary.topCategory || "Others"}. Give one practical tip.`
          }
        ]
      })
    });

    if (!response.ok) {
      return "Keep your top category under control next week by setting a small daily cap.";
    }

    const data = await response.json();
    return data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || "").trim()
      : "Keep your top category under control next week by setting a small daily cap.";
  } catch (_) {
    return "Keep your top category under control next week by setting a small daily cap.";
  }
}

async function buildWeeklySummary(uid) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const db = admin.firestore();
  const snap = await db.collection("users").doc(uid)
    .collection("expenses")
    .where("timestamp", ">=", start.toISOString())
    .get();

  let totalSpent = 0;
  const categoryTotals = {};
  const daySet = new Set();

  snap.forEach((doc) => {
    const exp = doc.data() || {};
    const amount = Number(exp.amount || 0);
    totalSpent += amount;
    const category = String(exp.category || "others").toLowerCase();
    categoryTotals[category] = (Number(categoryTotals[category]) || 0) + amount;

    if (exp.timestamp) {
      const d = new Date(exp.timestamp);
      if (!Number.isNaN(d.getTime())) {
        daySet.add(d.toISOString().slice(0, 10));
      }
    }
  });

  let topCategory = "Others";
  let topAmount = -1;
  Object.keys(categoryTotals).forEach((key) => {
    if (categoryTotals[key] > topAmount) {
      topAmount = categoryTotals[key];
      topCategory = key.charAt(0).toUpperCase() + key.slice(1);
    }
  });

  return {
    totalSpent: Number(totalSpent.toFixed(2)),
    topCategory,
    dayCount: daySet.size,
    headline: `₱${Math.round(totalSpent).toLocaleString("en-PH")} spent`
  };
}

function getXpNearThreshold(userDoc) {
  const xp = Number(userDoc.xp || 0);
  for (let i = 1; i < XP_LEVELS.length; i++) {
    const target = XP_LEVELS[i];
    if (xp < target) {
      return {
        target,
        ratio: xp / target,
        remaining: target - xp
      };
    }
  }
  return null;
}

async function processOnboardingForUser(uid, userDoc, opts) {
  const u = userDoc || {};
  const nowMs = (opts && Number.isFinite(Number(opts.nowMsOverride)))
    ? Number(opts.nowMsOverride)
    : Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const created = toDate(u.createdAt);
  if (!created) {
    return { skipped: "missing-createdAt" };
  }

  const ageDays = (opts && Number.isFinite(Number(opts.ageDaysOverride)))
    ? Math.floor(Number(opts.ageDaysOverride))
    : Math.floor((nowMs - created.getTime()) / oneDay);

  const hasExpenses = (opts && opts.forceNoExpenses === true)
    ? false
    : (Number(u.expenseCount || 0) > 0 || !!u.lastExpenseDate);
  const hasBudget = (opts && opts.forceNoBudget === true)
    ? false
    : (Number(u.weeklyBudget || 0) > 0);
  const only = opts && typeof opts.forceOnly === "string" ? String(opts.forceOnly) : "";
  const canActivate = (ageDays === 1 || ageDays === 3) && !hasExpenses;
  const canNoBudget = (ageDays === 1 || ageDays === 3) && !hasBudget;

  async function sendActivate() {
    return sendNotification(uid, {
      type: ageDays === 1 ? "onboarding-activate-d1" : "onboarding-activate-d3",
      channel: ageDays === 1 ? "both" : "email",
      title: "👋 Tigom is waiting",
      body: "Your budget is ready, log your first ₱20 snack and let's go.",
      subject: "Your ₱ jar is empty, let's fix that",
      html: emailTemplate("onboarding-activate", { firstName: u.firstName || "there" }),
      deepLink: "/dashboard.html"
    });
  }

  async function sendNoBudget() {
    return sendNotification(uid, {
      type: "onboarding-no-budget",
      channel: "push",
      title: "Set your weekly budget 🐾",
      body: "30 seconds. Tigom cannot help without it.",
      deepLink: "/settings.html"
    });
  }

  if (only === "activate") {
    if (!canActivate) { return { skipped: "activate-branch-not-matched", ageDays }; }
    return sendActivate();
  }

  if (only === "no-budget") {
    if (!canNoBudget) { return { skipped: "no-budget-branch-not-matched", ageDays }; }
    return sendNoBudget();
  }

  let activateRes = null;
  let noBudgetRes = null;
  if (canActivate) {
    activateRes = await sendActivate();
  }
  if (canNoBudget) {
    noBudgetRes = await sendNoBudget();
  }

  if (activateRes && noBudgetRes) {
    return { activate: activateRes, noBudget: noBudgetRes };
  }
  if (activateRes) {
    return activateRes;
  }
  if (noBudgetRes) {
    return noBudgetRes;
  }

  return { skipped: "no-onboarding-branch", ageDays };
}

async function processDailyReminderForUser(uid, userDoc, opts) {
  const u = userDoc || {};
  const prefs = Object.assign({}, getDefaultPrefs(), u.notificationPrefs || {});
  const hour = (opts && Number.isFinite(Number(opts.hourOverride)))
    ? Number(opts.hourOverride)
    : nowInPHHour();
  const forceMatch = !!(opts && opts.forceMatch === true);
  if (!forceMatch) {
    if (prefs.dailyReminderEnabled !== true || Number(prefs.dailyReminderHour) !== Number(hour)) {
      return { skipped: "pref-hour-mismatch" };
    }
  }

  const today = (opts && typeof opts.todayKeyOverride === "string" && opts.todayKeyOverride)
    ? String(opts.todayKeyOverride)
    : todayKeyPH();
  if (!opts || opts.forceSend !== true) {
    if (String(u.lastExpenseDate || "") === today) {
      return { skipped: "expense-today" };
    }
  }

  return sendNotification(uid, {
    type: "daily-reminder",
    channel: "push",
    title: "Don't forget today 🐾",
    body: "Even ₱0 counts as a check-in.",
    deepLink: "/dashboard.html"
  });
}

async function processStreakAtRiskForUser(uid, userDoc, opts) {
  const u = userDoc || {};
  const hour = (opts && Number.isFinite(Number(opts.hourOverride)))
    ? Number(opts.hourOverride)
    : nowInPHHour();
  const isLastCall = hour >= 22;
  const today = (opts && typeof opts.todayKeyOverride === "string" && opts.todayKeyOverride)
    ? String(opts.todayKeyOverride)
    : todayKeyPH();
  const streak = (opts && Number.isFinite(Number(opts.streakOverride)))
    ? Number(opts.streakOverride)
    : Number(u.currentStreak || (u.publicProfile && u.publicProfile.streak) || 0);

  if (!opts || opts.forceSend !== true) {
    if (streak < 2) { return { skipped: "streak<2" }; }
    if (String(u.lastExpenseDate || "") === today) { return { skipped: "expense-today" }; }
  }

  return sendNotification(uid, {
    type: isLastCall ? "streak-at-risk-last" : "streak-at-risk-soft",
    channel: "push",
    title: isLastCall ? `⏰ 2 hours left, ${u.firstName || "friend"}` : "🔥 Streak in danger",
    body: isLastCall
      ? `Your ${streak}-day streak ends at midnight.`
      : `Your ${streak}-day streak is in danger. 30 seconds to save it.`,
    deepLink: "/dashboard.html?from=streak",
    allowQuietHourException: isLastCall,
    bypassDailyCap: isLastCall
  });
}

async function processStreakBrokenForUser(uid, userDoc, opts) {
  const u = userDoc || {};
  const today = (opts && typeof opts.todayKeyOverride === "string" && opts.todayKeyOverride)
    ? String(opts.todayKeyOverride)
    : todayKeyPH();
  const yesterday = (opts && typeof opts.yesterdayKeyOverride === "string" && opts.yesterdayKeyOverride)
    ? String(opts.yesterdayKeyOverride)
    : shiftDayKey(today, -1);

  const persistedStreak = Number(u.currentStreak || (u.publicProfile && u.publicProfile.streak) || 0);
  const lastExpenseDate = String(u.lastExpenseDate || "");
  const inferredBreak = persistedStreak >= 2 && lastExpenseDate && lastExpenseDate < yesterday;
  const hasBreakFlag = u.streakBrokenFlag === true;
  const forceBroken = !!(opts && opts.forceBroken === true);
  if (!forceBroken && !hasBreakFlag && !inferredBreak) {
    return { skipped: "no-break" };
  }

  const brokenLength = hasBreakFlag
    ? Number(u.lastStreakLength || persistedStreak || 0)
    : persistedStreak;

  const result = await sendNotification(uid, {
    type: "streak-broken",
    channel: "email",
    title: "Tigom is sad 🥲",
    body: `Your ${Number(brokenLength || 0)}-day streak ended. Repair it in the shop.`,
    subject: "Tigom is sad 🥲",
    html: emailTemplate("streak-broken", {
      firstName: u.firstName || "friend",
      streakLength: Number(brokenLength || 0)
    }),
    deepLink: "/shop.html"
  });

  await admin.firestore().collection("users").doc(uid).set({
    streakBrokenFlag: false,
    lastStreakLength: Number(brokenLength || 0),
    currentStreak: inferredBreak ? 0 : Number(u.currentStreak || 0)
  }, { merge: true });

  return result;
}

async function processExpenseWriteForUser(uid, userDoc, opts) {
  const db = admin.firestore();
  const u = userDoc || {};
  const forceScenario = opts && typeof opts.forceScenario === "string"
    ? String(opts.forceScenario)
    : "";

  if (!opts || opts.skipLapsedReset !== true) {
    if (u.lapsedStagesSent && typeof u.lapsedStagesSent === "object" && Object.keys(u.lapsedStagesSent).length > 0) {
      await db.collection("users").doc(uid).update({
        lapsedStagesSent: admin.firestore.FieldValue.delete()
      }).catch(() => {});
    }
  }

  const weeklyBudget = Number(u.weeklyBudget || 0);
  if (forceScenario === "budget-exceeded" || forceScenario === "budget-warning") {
    const weekSpent = (opts && Number.isFinite(Number(opts.weekSpentOverride)))
      ? Number(opts.weekSpentOverride)
      : await getWeekSpent(uid);
    const pct = weeklyBudget > 0 ? (weekSpent / weeklyBudget) : 0;
    const pctInt = Math.round(pct * 100);

    if (forceScenario === "budget-exceeded") {
      return sendNotification(uid, {
        type: "budget-exceeded",
        channel: "push",
        title: `Budget blown by ₱${Math.max(0, Math.round(weekSpent - weeklyBudget)).toLocaleString("en-PH")}`,
        body: "Tigom believes in you. Want to adjust next week's plan?",
        deepLink: "/stats.html"
      });
    }

    return sendNotification(uid, {
      type: "budget-warning",
      channel: "both",
      title: `⚠️ ${pctInt}% of budget used`,
      body: `You've used ${pctInt}% and it's still mid-week.`,
      subject: "Heads-up: budget warning",
      html: emailTemplate("budget-warning", {
        firstName: u.firstName || "friend",
        pct: pctInt
      }),
      deepLink: "/stats.html"
    });
  }

  if (forceScenario === "achievement-near") {
    const nearForced = getXpNearThreshold(u);
    if (!nearForced) {
      return { skipped: "xp-max-level" };
    }
    return sendNotification(uid, {
      type: "achievement-near",
      channel: "push",
      title: "🏅 You're close to a level-up",
      body: `Only ${nearForced.remaining} XP to hit your next level.`,
      deepLink: "/profile.html"
    });
  }

  if (weeklyBudget > 0) {
    const weekSpent = await getWeekSpent(uid);
    const pct = weekSpent / weeklyBudget;
    const dayOfWeek = new Date().getDay();

    if (pct >= 1.0) {
      return sendNotification(uid, {
        type: "budget-exceeded",
        channel: "push",
        title: `Budget blown by ₱${Math.max(0, Math.round(weekSpent - weeklyBudget)).toLocaleString("en-PH")}`,
        body: "Tigom believes in you. Want to adjust next week's plan?",
        deepLink: "/stats.html"
      });
    }

    if (pct >= 0.8 && dayOfWeek < 5) {
      const pctInt = Math.round(pct * 100);
      return sendNotification(uid, {
        type: "budget-warning",
        channel: "both",
        title: `⚠️ ${pctInt}% of budget used`,
        body: `You've used ${pctInt}% and it's still mid-week.`,
        subject: "Heads-up: budget warning",
        html: emailTemplate("budget-warning", {
          firstName: u.firstName || "friend",
          pct: pctInt
        }),
        deepLink: "/stats.html"
      });
    }
  }

  const near = getXpNearThreshold(u);
  if (near && near.ratio >= 0.8 && near.ratio < 1) {
    return sendNotification(uid, {
      type: "achievement-near",
      channel: "push",
      title: "🏅 You're close to a level-up",
      body: `Only ${near.remaining} XP to hit your next level.`,
      deepLink: "/profile.html"
    });
  }

  return { skipped: "no-expense-branch" };
}

async function processWeeklyDigestForUser(uid, userDoc, opts) {
  const u = userDoc || {};
  const prefs = Object.assign({}, getDefaultPrefs(), u.notificationPrefs || {});
  if (prefs.emailEnabled === false) {
    return { skipped: "email-disabled" };
  }

  let targetBucket = (opts && Number.isFinite(Number(opts.targetBucketOverride)))
    ? Number(opts.targetBucketOverride)
    : null;
  if (targetBucket === null) {
    const now = new Date();
    const phDayName = (opts && typeof opts.dayNameOverride === "string" && opts.dayNameOverride)
      ? String(opts.dayNameOverride)
      : new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(now);
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3 };
    targetBucket = dayMap[phDayName];
  }
  if (typeof targetBucket !== "number") {
    return { skipped: "off-schedule-day" };
  }

  if (!opts || opts.forceBucket !== true) {
    if (digestBucketForUid(uid) !== targetBucket) {
      return { skipped: "bucket-mismatch" };
    }
  }

  const summary = await buildWeeklySummary(uid);
  const aiTip = await fetchGroqTip(summary);

  return sendNotification(uid, {
    type: "weekly-digest",
    channel: "email",
    title: "Weekly recap",
    body: summary.headline,
    subject: `Your week in ₱: ${summary.headline}`,
    html: emailTemplate("weekly-digest", {
      firstName: u.firstName || "friend",
      totalSpent: summary.totalSpent,
      topCategory: summary.topCategory,
      dayCount: summary.dayCount,
      aiTip
    }),
    deepLink: "/stats.html"
  });
}

async function processLapsedForUser(uid, userDoc, opts) {
  const u = userDoc || {};
  const sent = (u.lapsedStagesSent && typeof u.lapsedStagesSent === "object") ? u.lapsedStagesSent : {};

  let stage = "";
  if (opts && typeof opts.stageOverride === "string" && opts.stageOverride) {
    stage = String(opts.stageOverride).replace(/^lapsed-/, "");
    if (!LAPSED_COPY[stage]) {
      return { skipped: "invalid-stage-override" };
    }
  } else {
    const lastLogin = toDate(u.lastLoginAt);
    if (!lastLogin) { return { skipped: "missing-lastLoginAt" }; }

    const nowMs = (opts && Number.isFinite(Number(opts.nowMsOverride)))
      ? Number(opts.nowMsOverride)
      : Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const daysInactive = (opts && Number.isFinite(Number(opts.daysInactiveOverride)))
      ? Math.floor(Number(opts.daysInactiveOverride))
      : Math.floor((nowMs - lastLogin.getTime()) / dayMs);

    if (daysInactive >= 30 && !sent.d30) { stage = "d30"; }
    else if (daysInactive >= 14 && !sent.d14) { stage = "d14"; }
    else if (daysInactive >= 7 && !sent.d7) { stage = "d7"; }
    else if (daysInactive >= 3 && !sent.d3) { stage = "d3"; }
    else { return { skipped: "no-lapsed-stage" }; }
  }

  const copy = LAPSED_COPY[stage];
  const result = await sendNotification(uid, {
    type: `lapsed-${stage}`,
    channel: stage === "d3" ? "both" : "email",
    title: copy.title,
    body: copy.body,
    subject: copy.subject,
    html: emailTemplate(`lapsed-${stage}`, { firstName: u.firstName || "friend" }),
    deepLink: "/dashboard.html"
  });

  if (!opts || opts.skipMarkSent !== true) {
    const stagesPatch = {};
    stagesPatch[`lapsedStagesSent.${stage}`] = admin.firestore.FieldValue.serverTimestamp();
    await admin.firestore().collection("users").doc(uid).update(stagesPatch);
  }

  return result;
}

exports.processOnboardingForUser = processOnboardingForUser;
exports.processDailyReminderForUser = processDailyReminderForUser;
exports.processStreakAtRiskForUser = processStreakAtRiskForUser;
exports.processStreakBrokenForUser = processStreakBrokenForUser;
exports.processExpenseWriteForUser = processExpenseWriteForUser;
exports.processWeeklyDigestForUser = processWeeklyDigestForUser;
exports.processLapsedForUser = processLapsedForUser;

exports.onboardingCron = onSchedule({
  schedule: "0 10 * * *",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();

  for (const doc of users.docs) {
    try {
      await processOnboardingForUser(doc.id, doc.data() || {});
    } catch (err) {
      console.error(`[onboardingCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
});

exports.dailyReminderCron = onSchedule({
  schedule: "0 * * * *",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const db = admin.firestore();
  const hour = nowInPHHour();
  const users = await db.collection("users")
    .where("notificationPrefs.dailyReminderEnabled", "==", true)
    .where("notificationPrefs.dailyReminderHour", "==", hour)
    .get();

  for (const doc of users.docs) {
    try {
      await processDailyReminderForUser(doc.id, doc.data() || {}, { hourOverride: hour });
    } catch (err) {
      console.error(`[dailyReminderCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
});

exports.streakAtRiskCron = onSchedule({
  schedule: "0 18,22 * * *",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();
  const hour = nowInPHHour();

  for (const doc of users.docs) {
    try {
      await processStreakAtRiskForUser(doc.id, doc.data() || {}, { hourOverride: hour });
    } catch (err) {
      console.error(`[streakAtRiskCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
});

exports.streakBrokenCron = onSchedule({
  schedule: "0 9 * * *",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();

  for (const doc of users.docs) {
    try {
      await processStreakBrokenForUser(doc.id, doc.data() || {});
    } catch (err) {
      console.error(`[streakBrokenCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
});

exports.onExpenseWriteTrigger = onDocumentWritten({
  document: "users/{uid}/expenses/{expenseId}",
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async (event) => {
  if (!event || !event.params || !event.params.uid || !event.data || !event.data.after || !event.data.after.exists) {
    return;
  }

  const uid = event.params.uid;
  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) { return; }
  await processExpenseWriteForUser(uid, userSnap.data() || {});
});

exports.weeklyDigestCron = onSchedule({
  schedule: "0 19 * * 0,1,2,3",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL, GROQ_API_KEY]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();

  const now = new Date();
  const phDayName = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(now);
  const dayMap = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3 };
  const targetBucket = dayMap[phDayName];
  if (typeof targetBucket !== "number") { return; }

  for (const doc of users.docs) {
    try {
      await processWeeklyDigestForUser(doc.id, doc.data() || {}, { targetBucketOverride: targetBucket });
    } catch (err) {
      console.error(`[weeklyDigestCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
    }
  }
});

exports.lapsedUserCron = onSchedule({
  schedule: "0 9 * * *",
  timeZone: TZ,
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async () => {
  const db = admin.firestore();
  const users = await db.collection("users").get();

  for (const doc of users.docs) {
    try {
      await processLapsedForUser(doc.id, doc.data() || {});
    } catch (err) {
      console.error(`[lapsedUserCron] failed for uid=${doc.id}:`, err && err.message ? err.message : err);
      // continue to next user
    }
  }
});

exports.autoReadEmailInboxCron = onSchedule({
  schedule: "30 * * * *",
  timeZone: TZ,
  region: REGION
}, async () => {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  const snap = await db.collectionGroup("notifications")
    .where("channel", "==", "email")
    .where("readAt", "==", null)
    .where("sentAt", "<=", cutoff)
    .limit(500)
    .get();

  if (snap.empty) {
    return;
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      readAt: admin.firestore.FieldValue.serverTimestamp(),
      autoReadReason: "email-grace-period-24h"
    });
  });
  await batch.commit();
  console.log(`[autoReadEmailInboxCron] auto-read ${snap.size} email inbox docs`);
});

exports.onUserWriteTrigger = onDocumentWritten({
  document: "users/{uid}",
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async (event) => {
  if (!event || !event.params || !event.params.uid || !event.data || !event.data.after || !event.data.after.exists) {
    return;
  }

  const beforeExists = !!(event.data.before && event.data.before.exists);
  const afterData = event.data.after.data() || {};

  if (!beforeExists) {
    const defaultPrefs = Object.assign({}, getDefaultPrefs(), {
      emailEnabled: true,
      setupDone: false,
      lastUpdated: new Date().toISOString()
    });

    await event.data.after.ref.set({
      notificationPrefs: defaultPrefs
    }, { merge: true });

    await sendNotification(event.params.uid, {
      type: "onboarding-welcome",
      channel: "email",
      title: "Welcome to SugboCents",
      body: "Set your first budget and let Tigom guide your streak.",
      subject: "Welcome to SugboCents",
      html: emailTemplate("onboarding-activate", { firstName: afterData.firstName || "there" }),
      deepLink: "/dashboard.html"
    });
  }

  // On any user-doc update where lastLoginAt advanced AND the user has lapsed-stage history,
  // clear the ladder so a subsequent re-lapse will re-trigger the d3 nudge.
  try {
    const beforeData = (event.data.before && event.data.before.exists) ? event.data.before.data() : {};
    const beforeLogin = toDate(beforeData.lastLoginAt);
    const afterLogin = toDate(afterData.lastLoginAt);
    const loginAdvanced = !!afterLogin && (!beforeLogin || afterLogin.getTime() > beforeLogin.getTime());

    if (loginAdvanced && afterData.lapsedStagesSent && typeof afterData.lapsedStagesSent === "object") {
      await event.data.after.ref.update({
        lapsedStagesSent: admin.firestore.FieldValue.delete()
      });
    }
  } catch (err) {
    console.error(`[onUserWriteTrigger] lapsed reset failed for uid=${event.params.uid}:`, err && err.message ? err.message : err);
  }
});

function extractRankMap(docData) {
  const ranks = {};
  const entries = Array.isArray(docData && docData.entries) ? docData.entries : [];
  entries.forEach((entry, idx) => {
    const uid = String((entry && (entry.uid || entry.userId)) || "").trim();
    if (!uid) { return; }
    ranks[uid] = idx + 1;
  });
  return ranks;
}

exports.onLeaderboardChange = onDocumentWritten({
  document: "leaderboard/{period}",
  region: REGION,
  secrets: [BREVO_API_KEY, BREVO_SENDER_EMAIL]
}, async (event) => {
  if (!event || !event.data || !event.data.before || !event.data.after || !event.data.after.exists) {
    return;
  }

  const beforeData = event.data.before.exists ? (event.data.before.data() || {}) : {};
  const afterData = event.data.after.data() || {};

  const beforeRanks = extractRankMap(beforeData);
  const afterRanks = extractRankMap(afterData);

  const movedDownUsers = Object.keys(afterRanks).filter((uid) => {
    if (!beforeRanks[uid]) { return false; }
    return afterRanks[uid] > beforeRanks[uid];
  });

  for (const uid of movedDownUsers) {
    await sendNotification(uid, {
      type: "friend-passed-you",
      channel: "push",
      title: "🏁 Someone passed you",
      body: "A friend just moved ahead in the league. Take your spot back!",
      deepLink: "/leaderboard.html"
    });
  }
});

module.exports = {
  sendNotification,
  sendEmail,
  getDefaultPrefs,
  nowInPHHour,
  todayKeyPH,
  shiftDayKey,
  digestBucketForUid,
  isInQuietHours,
  processOnboardingForUser,
  processDailyReminderForUser,
  processStreakAtRiskForUser,
  processStreakBrokenForUser,
  processExpenseWriteForUser,
  processWeeklyDigestForUser,
  processLapsedForUser,
  onboardingCron: exports.onboardingCron,
  dailyReminderCron: exports.dailyReminderCron,
  streakAtRiskCron: exports.streakAtRiskCron,
  streakBrokenCron: exports.streakBrokenCron,
  weeklyDigestCron: exports.weeklyDigestCron,
  lapsedUserCron: exports.lapsedUserCron,
  autoReadEmailInboxCron: exports.autoReadEmailInboxCron,
  onExpenseWriteTrigger: exports.onExpenseWriteTrigger,
  onUserWriteTrigger: exports.onUserWriteTrigger,
  onLeaderboardChange: exports.onLeaderboardChange,
  BREVO_API_KEY,
  BREVO_SENDER_EMAIL,
  GROQ_API_KEY,
  REGION,
  TZ
};
