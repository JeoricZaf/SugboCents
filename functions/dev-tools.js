const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const notif = require("./notifications");
const { emailTemplate } = require("./templates");

if (!admin.apps.length) {
  admin.initializeApp();
}

const REGION = notif.REGION || "us-central1";
const DEV_SECRETS = [notif.BREVO_API_KEY, notif.BREVO_SENDER_EMAIL, notif.GROQ_API_KEY];

// SECURITY-CRITICAL: this list controls who can fire push notifications,
// reset caps, manipulate user state, and impersonate cron behavior for
// arbitrary uids. Never commit a real uid to a public branch. Never log
// the contents of this array. Never expose it through any API response.
const DEV_ADMIN_UIDS = [
  "7SSc9kHJTKOOlP9Zgo7bpvge9UC3"
];

// SYNC: must match XP_LEVELS in js/storage.js
const XP_LEVELS_BACKEND = [
  { level: 1, name: "Rookie Saver", minXp: 0 },
  { level: 2, name: "Budget Aware", minXp: 50 },
  { level: 3, name: "Money Smart", minXp: 150 },
  { level: 4, name: "Week Crusher", minXp: 350 },
  { level: 5, name: "Streak Hunter", minXp: 700 },
  { level: 6, name: "Finance Pro", minXp: 1200 },
  { level: 7, name: "Budget Legend", minXp: 2000 }
];

function getLevelFromXpBackend(xp) {
  var safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  var result = XP_LEVELS_BACKEND[0];
  for (var i = 0; i < XP_LEVELS_BACKEND.length; i++) {
    if (safeXp >= XP_LEVELS_BACKEND[i].minXp) {
      result = XP_LEVELS_BACKEND[i];
    }
  }
  return result;
}

const DEV_FAKE_FRIENDS = [
  {
    uid: "dev-friend-001",
    displayName: "Carlos M.",
    firstName: "Carlos",
    streak: 14,
    questsCompleted: 8,
    weeklyXP: 320,
    level: 5,
    levelName: "Streak Hunter"
  },
  {
    uid: "dev-friend-002",
    displayName: "Mia R.",
    firstName: "Mia",
    streak: 8,
    questsCompleted: 5,
    weeklyXP: 210,
    level: 3,
    levelName: "Money Smart"
  },
  {
    uid: "dev-friend-003",
    displayName: "Jake T.",
    firstName: "Jake",
    streak: 5,
    questsCompleted: 3,
    weeklyXP: 150,
    level: 2,
    levelName: "Budget Aware"
  },
  {
    uid: "dev-friend-004",
    displayName: "Ana L.",
    firstName: "Ana",
    streak: 3,
    questsCompleted: 2,
    weeklyXP: 80,
    level: 2,
    levelName: "Budget Aware"
  },
  {
    uid: "dev-friend-005",
    displayName: "Ben C.",
    firstName: "Ben",
    streak: 1,
    questsCompleted: 1,
    weeklyXP: 30,
    level: 1,
    levelName: "Rookie Saver"
  }
];

const DEV_FEED_TEMPLATES = [
  { emoji: "🍜", message: "{name} logged lunch for ₱85" },
  { emoji: "☕", message: "{name} grabbed coffee — staying in budget" },
  { emoji: "🚌", message: "{name} logged a commute expense" },
  { emoji: "🔥", message: "{name} is on a {streak}-day streak!" },
  { emoji: "⚡", message: "{name} gained {xp} XP this week" },
  { emoji: "✅", message: "{name} finished a weekly quest" },
  { emoji: "🏅", message: "{name} just unlocked a new badge" },
  { emoji: "💰", message: "{name} logged an expense under budget" }
];

function assertAdmin(request) {
  if (!request.auth || !request.auth.uid || DEV_ADMIN_UIDS.indexOf(request.auth.uid) === -1) {
    throw new HttpsError("permission-denied", "Not authorized for dev tools.");
  }
  return request.auth.uid;
}

function safeObj(value) {
  return value && typeof value === "object" ? value : {};
}

function toIso(value) {
  if (!value) { return null; }
  if (value.toDate && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value._seconds) {
    return new Date(value._seconds * 1000).toISOString();
  }
  var d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

function normalizeDeepLink(link) {
  var raw = String(link || "/dashboard.html").trim();
  if (!raw) { return "/dashboard.html"; }
  if (raw.charAt(0) !== "/") {
    return "/" + raw;
  }
  return raw;
}

function normalizeChannel(raw) {
  var ch = String(raw || "push").toLowerCase();
  if (ch !== "push" && ch !== "email" && ch !== "both") {
    throw new HttpsError("invalid-argument", "channel must be push, email, or both.");
  }
  return ch;
}

function getNowMs() {
  return Date.now();
}

function payloadForMeta(payload) {
  return {
    type: String((payload && payload.type) || "generic"),
    channel: normalizeChannel((payload && payload.channel) || "push"),
    allowQuietHourException: !!(payload && payload.allowQuietHourException === true)
  };
}

async function logDevAction(uid, action, details) {
  try {
    await admin.firestore().collection("devLog").add({
      uid: uid,
      action: action,
      details: details || null,
      ts: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (_) {}
}

async function readTodayCaps(uid) {
  var dayKey = notif.todayKeyPH();
  var ref = admin.firestore().collection("users").doc(uid).collection("notificationLog").doc(dayKey);
  var snap = await ref.get();
  var data = snap.exists ? safeObj(snap.data()) : {};
  return {
    pushCount: Number(data.pushCount || 0),
    emailCount: Number(data.emailCount || 0)
  };
}

async function readWeeklyCaps(uid) {
  var db = admin.firestore();
  var today = notif.todayKeyPH();
  var refs = [];
  for (var i = 0; i < 7; i++) {
    var key = notif.shiftDayKey(today, -i);
    refs.push(db.collection("users").doc(uid).collection("notificationLog").doc(key));
  }

  var snaps = await db.getAll.apply(db, refs);
  var push = 0;
  var email = 0;
  snaps.forEach(function (snap) {
    if (!snap.exists) { return; }
    var data = safeObj(snap.data());
    push += Number(data.pushCount || 0);
    email += Number(data.emailCount || 0);
  });
  return { push: push, email: email };
}

function pickMetaPayloadForPreset(preset) {
  switch (preset) {
    case "onboarding-activate-d1": return { type: "onboarding-activate-d1", channel: "both" };
    case "onboarding-activate-d3": return { type: "onboarding-activate-d3", channel: "email" };
    case "onboarding-no-budget": return { type: "onboarding-no-budget", channel: "push" };
    case "onboarding-welcome": return { type: "onboarding-welcome", channel: "email" };
    case "daily-reminder": return { type: "daily-reminder", channel: "push" };
    case "streak-at-risk-soft": return { type: "streak-at-risk-soft", channel: "push" };
    case "streak-at-risk-last": return { type: "streak-at-risk-last", channel: "push", allowQuietHourException: true };
    case "streak-broken": return { type: "streak-broken", channel: "email" };
    case "budget-warning": return { type: "budget-warning", channel: "both" };
    case "budget-exceeded": return { type: "budget-exceeded", channel: "push" };
    case "achievement-near": return { type: "achievement-near", channel: "push" };
    case "weekly-digest": return { type: "weekly-digest", channel: "email" };
    case "lapsed-d3": return { type: "lapsed-d3", channel: "both" };
    case "lapsed-d7": return { type: "lapsed-d7", channel: "email" };
    case "lapsed-d14": return { type: "lapsed-d14", channel: "email" };
    case "lapsed-d30": return { type: "lapsed-d30", channel: "email" };
    default: return { type: "generic", channel: "push" };
  }
}

function pickMetaPayloadForCron(cronName, overrides) {
  var name = String(cronName || "");
  var hour = Number(overrides && overrides.hourOverride);
  if (name === "dailyReminderCron") { return { type: "daily-reminder", channel: "push" }; }
  if (name === "streakAtRiskCron") {
    if (Number.isFinite(hour) && hour >= 22) {
      return { type: "streak-at-risk-last", channel: "push", allowQuietHourException: true };
    }
    return { type: "streak-at-risk-soft", channel: "push" };
  }
  if (name === "streakBrokenCron") { return { type: "streak-broken", channel: "email" }; }
  if (name === "weeklyDigestCron") { return { type: "weekly-digest", channel: "email" }; }
  if (name === "lapsedUserCron") {
    var stage = String((overrides && overrides.stageOverride) || "d3").replace(/^lapsed-/, "");
    if (stage === "d3") { return { type: "lapsed-d3", channel: "both" }; }
    return { type: "lapsed-" + stage, channel: "email" };
  }
  if (name === "onboardingCron") { return { type: "onboarding-activate-d1", channel: "both" }; }
  return { type: "generic", channel: "push" };
}

async function buildMeta(uid, metaPayload, startedAt, capBefore, capAfter, weeklyBefore) {
  var userSnap = await admin.firestore().collection("users").doc(uid).get();
  var user = userSnap.exists ? safeObj(userSnap.data()) : {};
  var prefs = Object.assign({}, notif.getDefaultPrefs(), safeObj(user.notificationPrefs));

  var channel = normalizeChannel((metaPayload && metaPayload.channel) || "push");
  var quietHoursActive = (channel === "push" || channel === "both")
    ? notif.isInQuietHours(prefs, !!(metaPayload && metaPayload.allowQuietHourException === true))
    : false;

  var weeklyAfter = await readWeeklyCaps(uid);

  return {
    uid: uid,
    type: String((metaPayload && metaPayload.type) || "generic"),
    requestedChannel: channel,
    quietHoursActive: quietHoursActive,
    capBefore: capBefore,
    capAfter: capAfter,
    weeklyCountBefore: weeklyBefore,
    weeklyCountAfter: weeklyAfter,
    tookMs: Math.max(0, getNowMs() - startedAt),
    timestamp: new Date().toISOString()
  };
}

async function runWithMeta(uid, metaPayload, runner) {
  var start = getNowMs();
  var capBefore = await readTodayCaps(uid);
  var weeklyBefore = await readWeeklyCaps(uid);

  var result = await runner();

  var capAfter = await readTodayCaps(uid);
  var meta = await buildMeta(uid, metaPayload, start, capBefore, capAfter, weeklyBefore);

  if (result && typeof result === "object") {
    return Object.assign({}, result, { _meta: meta });
  }
  return { result: result, _meta: meta };
}

function sanitizeSetStatePatch(rawPatch) {
  var patch = safeObj(rawPatch);
  var keys = Object.keys(patch);
  var allowed = {
    currentStreak: true,
    lastStreakLength: true,
    lastExpenseDate: true,
    lastLoginAt: true,
    weeklyBudget: true,
    xp: true,
    level: true,
    streakBrokenFlag: true
  };

  var out = {};
  keys.forEach(function (k) {
    if (!allowed[k]) {
      throw new HttpsError("invalid-argument", "Unsupported patch key: " + k);
    }

    if (k === "streakBrokenFlag") {
      out[k] = patch[k] === true;
      return;
    }

    if (k === "level") {
      // level is derived from xp in devSetUserState.
      return;
    }

    if (k === "lastExpenseDate") {
      if (patch[k] === null || patch[k] === "") {
        out[k] = null;
        return;
      }
      var day = String(patch[k]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        throw new HttpsError("invalid-argument", "lastExpenseDate must be YYYY-MM-DD.");
      }
      out[k] = day;
      return;
    }

    if (k === "lastLoginAt") {
      if (patch[k] === null || patch[k] === "") {
        out[k] = null;
        return;
      }
      var d = new Date(patch[k]);
      if (Number.isNaN(d.getTime())) {
        throw new HttpsError("invalid-argument", "lastLoginAt must be a valid date.");
      }
      out[k] = d.toISOString();
      return;
    }

    var n = Number(patch[k]);
    if (!Number.isFinite(n)) {
      throw new HttpsError("invalid-argument", k + " must be numeric.");
    }
    if (k === "weeklyBudget") {
      out[k] = Math.max(0, Math.round(n * 100) / 100);
      return;
    }
    if (k === "currentStreak" || k === "lastStreakLength") {
      out[k] = Math.max(0, Math.min(365, Math.floor(n)));
      return;
    }
    if (k === "xp") {
      out[k] = Math.max(0, Math.min(99999, Math.floor(n)));
      return;
    }
    out[k] = Math.max(0, Math.floor(n));
  });

  if (!Object.keys(out).length) {
    throw new HttpsError("invalid-argument", "patch cannot be empty.");
  }
  return out;
}

async function runPresetForUser(uid, userDoc, preset, overrides) {
  var presetKey = String(preset || "");
  var o = safeObj(overrides);

  if (presetKey === "onboarding-activate-d1") {
    return notif.processOnboardingForUser(uid, userDoc, {
      ageDaysOverride: 1,
      forceNoExpenses: true,
      forceOnly: "activate"
    });
  }
  if (presetKey === "onboarding-activate-d3") {
    return notif.processOnboardingForUser(uid, userDoc, {
      ageDaysOverride: 3,
      forceNoExpenses: true,
      forceOnly: "activate"
    });
  }
  if (presetKey === "onboarding-no-budget") {
    return notif.processOnboardingForUser(uid, userDoc, {
      ageDaysOverride: 1,
      forceNoExpenses: true,
      forceNoBudget: true,
      forceOnly: "no-budget"
    });
  }
  if (presetKey === "onboarding-welcome") {
    return notif.sendNotification(uid, {
      type: "onboarding-welcome",
      channel: "email",
      title: "Welcome to SugboCents",
      body: "Set your first budget and let Tigom guide your streak.",
      subject: "Welcome to SugboCents",
      html: emailTemplate("onboarding-activate", {
        firstName: (userDoc && userDoc.firstName) || "there"
      }),
      deepLink: "/dashboard.html"
    });
  }
  if (presetKey === "daily-reminder") {
    return notif.processDailyReminderForUser(uid, userDoc, {
      forceMatch: true,
      forceSend: true,
      hourOverride: notif.nowInPHHour()
    });
  }
  if (presetKey === "streak-at-risk-soft") {
    return notif.processStreakAtRiskForUser(uid, userDoc, {
      hourOverride: 18,
      forceSend: true,
      streakOverride: Number(o.streakOverride || o.streak || 5)
    });
  }
  if (presetKey === "streak-at-risk-last") {
    return notif.processStreakAtRiskForUser(uid, userDoc, {
      hourOverride: 22,
      forceSend: true,
      streakOverride: Number(o.streakOverride || o.streak || 5)
    });
  }
  if (presetKey === "streak-broken") {
    return notif.processStreakBrokenForUser(uid, userDoc, {
      forceBroken: true
    });
  }
  if (presetKey === "budget-warning") {
    var warnOpts = {
      forceScenario: "budget-warning"
    };
    if (o.weekSpentOverride != null || o.weekSpent != null) {
      warnOpts.weekSpentOverride = Number(o.weekSpentOverride != null ? o.weekSpentOverride : o.weekSpent);
    }
    return notif.processExpenseWriteForUser(uid, userDoc, {
      forceScenario: warnOpts.forceScenario,
      weekSpentOverride: warnOpts.weekSpentOverride
    });
  }
  if (presetKey === "budget-exceeded") {
    var exceedOpts = {
      forceScenario: "budget-exceeded"
    };
    if (o.weekSpentOverride != null || o.weekSpent != null) {
      exceedOpts.weekSpentOverride = Number(o.weekSpentOverride != null ? o.weekSpentOverride : o.weekSpent);
    }
    return notif.processExpenseWriteForUser(uid, userDoc, {
      forceScenario: exceedOpts.forceScenario,
      weekSpentOverride: exceedOpts.weekSpentOverride
    });
  }
  if (presetKey === "achievement-near") {
    return notif.processExpenseWriteForUser(uid, userDoc, {
      forceScenario: "achievement-near"
    });
  }
  if (presetKey === "weekly-digest") {
    return notif.processWeeklyDigestForUser(uid, userDoc, {
      forceBucket: true,
      targetBucketOverride: notif.digestBucketForUid(uid)
    });
  }
  if (presetKey === "lapsed-d3") {
    return notif.processLapsedForUser(uid, userDoc, { stageOverride: "d3" });
  }
  if (presetKey === "lapsed-d7") {
    return notif.processLapsedForUser(uid, userDoc, { stageOverride: "d7" });
  }
  if (presetKey === "lapsed-d14") {
    return notif.processLapsedForUser(uid, userDoc, { stageOverride: "d14" });
  }
  if (presetKey === "lapsed-d30") {
    return notif.processLapsedForUser(uid, userDoc, { stageOverride: "d30" });
  }

  throw new HttpsError("invalid-argument", "Unknown preset.");
}

exports.devCheckAccess = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  await logDevAction(uid, "check-access", null);
  return { authorized: true, uid: uid };
});

exports.devSendTestNotification = onCall({ region: REGION, secrets: DEV_SECRETS }, async (request) => {
  const uid = assertAdmin(request);
  try {
    const data = safeObj(request.data);

    var channel = normalizeChannel(data.channel || "push");
    var payload = {
      type: String(data.type || "dev-test"),
      channel: channel,
      title: String(data.title || "Dev test notification"),
      body: String(data.body || "Triggered from Dev Tools"),
      deepLink: normalizeDeepLink(data.deepLink || "/dashboard.html")
    };
    if (data.allowQuietHourException === true) {
      payload.allowQuietHourException = true;
    }
    if (data.bypassDailyCap === true) {
      payload.bypassDailyCap = true;
    }
    if (channel === "email" || channel === "both") {
      payload.subject = String(data.subject || data.title || "SugboCents update");
    }

    const result = await runWithMeta(uid, payloadForMeta(payload), function () {
      return notif.sendNotification(uid, payload);
    });

    await logDevAction(uid, "send-test", {
      type: payload.type,
      channel: payload.channel,
      pushSent: Number((result && result.push && result.push.sent) || 0),
      emailSent: Number((result && result.email && result.email.sent) || 0)
    });

    return result;
  } catch (err) {
    if (err instanceof HttpsError) {
      throw err;
    }

    const detail = err && err.message ? String(err.message).slice(0, 200) : "unknown";
    console.error("[devSendTestNotification] Unhandled failure:", detail);
    await logDevAction(uid, "send-test-error", { detail: detail });
    throw new HttpsError("internal", "send-test-internal", { detail: detail });
  }
});

exports.devTriggerPresetState = onCall({ region: REGION, secrets: DEV_SECRETS }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const preset = String(data.preset || "").trim();
  if (!preset) {
    throw new HttpsError("invalid-argument", "preset is required.");
  }

  const userSnap = await admin.firestore().collection("users").doc(uid).get();
  const userDoc = userSnap.exists ? safeObj(userSnap.data()) : {};

  const metaPayload = pickMetaPayloadForPreset(preset);
  const result = await runWithMeta(uid, payloadForMeta(metaPayload), function () {
    return runPresetForUser(uid, userDoc, preset, data.overrides || {});
  });

  await logDevAction(uid, "trigger-preset", {
    preset: preset,
    pushSent: Number((result && result.push && result.push.sent) || 0),
    emailSent: Number((result && result.email && result.email.sent) || 0),
    skipped: result && result.skipped ? result.skipped : null
  });

  return result;
});

exports.devRunCronForSelf = onCall({ region: REGION, secrets: DEV_SECRETS }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const cronName = String(data.cronName || "").trim();
  const overrides = safeObj(data.overrides);
  if (!cronName) {
    throw new HttpsError("invalid-argument", "cronName is required.");
  }

  const userSnap = await admin.firestore().collection("users").doc(uid).get();
  const userDoc = userSnap.exists ? safeObj(userSnap.data()) : {};

  var runner;
  if (cronName === "dailyReminderCron") {
    runner = function () { return notif.processDailyReminderForUser(uid, userDoc, overrides); };
  } else if (cronName === "streakAtRiskCron") {
    runner = function () { return notif.processStreakAtRiskForUser(uid, userDoc, overrides); };
  } else if (cronName === "streakBrokenCron") {
    runner = function () { return notif.processStreakBrokenForUser(uid, userDoc, overrides); };
  } else if (cronName === "weeklyDigestCron") {
    var digOpts = Object.assign({}, overrides);
    if (digOpts.forceBucket === true && !Number.isFinite(Number(digOpts.targetBucketOverride))) {
      digOpts.targetBucketOverride = notif.digestBucketForUid(uid);
    }
    runner = function () { return notif.processWeeklyDigestForUser(uid, userDoc, digOpts); };
  } else if (cronName === "lapsedUserCron") {
    runner = function () { return notif.processLapsedForUser(uid, userDoc, overrides); };
  } else if (cronName === "onboardingCron") {
    runner = function () { return notif.processOnboardingForUser(uid, userDoc, overrides); };
  } else {
    throw new HttpsError("invalid-argument", "Unsupported cronName.");
  }

  const metaPayload = pickMetaPayloadForCron(cronName, overrides);
  const result = await runWithMeta(uid, payloadForMeta(metaPayload), runner);

  await logDevAction(uid, "run-cron-self", {
    cronName: cronName,
    overrides: overrides,
    skipped: result && result.skipped ? result.skipped : null
  });

  return result;
});

exports.devResetDailyCaps = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const dayKey = notif.todayKeyPH();
  await admin.firestore().collection("users").doc(uid).collection("notificationLog").doc(dayKey).delete();
  await logDevAction(uid, "reset-daily-caps", { dayKey: dayKey });
  return { deleted: true, dayKey: dayKey };
});

exports.devResetEmailQuota = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const dayKey = notif.todayKeyPH();
  await admin.firestore().collection("metrics").doc("emailQuota_" + dayKey).delete();
  await logDevAction(uid, "reset-email-quota", { dayKey: dayKey });
  return { deleted: true, dayKey: dayKey };
});

exports.devClearInbox = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  if (data.confirm !== true) {
    throw new HttpsError("failed-precondition", "confirm:true is required.");
  }

  var snap = await admin.firestore().collection("users").doc(uid).collection("notifications").get();
  var deleted = 0;
  for (var i = 0; i < snap.docs.length; i += 400) {
    var batch = admin.firestore().batch();
    var slice = snap.docs.slice(i, i + 400);
    slice.forEach(function (doc) {
      batch.delete(doc.ref);
      deleted += 1;
    });
    await batch.commit();
  }

  await admin.firestore().collection("users").doc(uid).set({
    inboxUnreadCount: 0,
    inboxUnreadUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  try {
    var staleEventsSnap = await admin.firestore()
      .collection("notificationEvents")
      .where("uid", "==", uid)
      .where("status", "in", ["pending", "undelivered"])
      .limit(200)
      .get();
    if (!staleEventsSnap.empty) {
      var eventBatch = admin.firestore().batch();
      staleEventsSnap.docs.forEach(function (d) {
        eventBatch.delete(d.ref);
      });
      await eventBatch.commit();
    }
  } catch (_) {
    // Non-critical cleanup.
  }

  await logDevAction(uid, "clear-inbox", { deleted: deleted });
  return { deleted: deleted, unreadReset: true };
});

exports.devMarkAllInboxRead = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  var snap = await admin.firestore()
    .collection("users").doc(uid).collection("notifications")
    .where("readAt", "==", null)
    .get();

  var updated = 0;
  for (var i = 0; i < snap.docs.length; i += 400) {
    var batch = admin.firestore().batch();
    var slice = snap.docs.slice(i, i + 400);
    slice.forEach(function (doc) {
      batch.set(doc.ref, { readAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      updated += 1;
    });
    await batch.commit();
  }

  await logDevAction(uid, "mark-all-read", { updated: updated });
  return { updated: updated };
});

exports.devSetUserState = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const applied = sanitizeSetStatePatch(data.patch);

  if (Object.prototype.hasOwnProperty.call(applied, "xp")) {
    var levelInfo = getLevelFromXpBackend(applied.xp);
    applied.level = levelInfo.level;
  }

  await admin.firestore().collection("users").doc(uid).set(applied, { merge: true });
  await logDevAction(uid, "set-user-state", { applied: applied });
  return { patched: true, applied: applied };
});

exports.devSetQuestState = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const action = String(data.action || "");
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  if (action === "activate") {
    var questId = String(data.questId || "daily-first-log").trim();
    var target = Math.max(1, Math.floor(Number(data.target) || 3));
    var rewardXp = Math.max(0, Math.floor(Number(data.rewardXp) || 30));
    var rewardSentimos = Math.max(0, Math.floor(Number(data.rewardSentimos) || 10));
    var quest = {
      id: questId,
      type: "daily",
      title: "Dev Quest",
      description: "Devtools quest state",
      icon: "⚡",
      progress: 0,
      target: target,
      conditions: [{ type: "log_count_today", target: target, progress: 0 }],
      assignedAt: new Date().toISOString(),
      completedAt: null,
      xpReward: rewardXp,
      sentimosReward: rewardSentimos
    };
    await userRef.set({ activeQuest: quest }, { merge: true });
    await logDevAction(uid, "dev-quest-activate", { questId: questId, target: target });
    return { ok: true, action: action, questId: questId };
  }

  if (action === "progress") {
    var progressN = Math.max(0, Math.floor(Number(data.progress) || 1));
    var progressSnap = await userRef.get();
    var progressUser = progressSnap.exists ? safeObj(progressSnap.data()) : {};
    var activeProgress = safeObj(progressUser.activeQuest);
    if (!activeProgress.id) {
      throw new HttpsError("failed-precondition", "No active quest to progress.");
    }
    var conditions = Array.isArray(activeProgress.conditions) ? activeProgress.conditions.slice() : [];
    if (!conditions.length) {
      conditions = [{ type: "log_count_today", target: Math.max(1, Number(activeProgress.target || 1)), progress: 0 }];
    }
    conditions[0] = Object.assign({}, conditions[0], { progress: progressN });
    var progressed = Object.assign({}, activeProgress, {
      progress: progressN,
      conditions: conditions,
      completedAt: progressN >= Number(activeProgress.target || conditions[0].target || 1)
        ? new Date().toISOString()
        : null
    });
    await userRef.set({ activeQuest: progressed }, { merge: true });
    await logDevAction(uid, "dev-quest-progress", { progress: progressN });
    return { ok: true, action: action, progress: progressN };
  }

  if (action === "complete") {
    var completeSnap = await userRef.get();
    var completeUser = completeSnap.exists ? safeObj(completeSnap.data()) : {};
    var active = safeObj(completeUser.activeQuest);
    if (!active.id) {
      throw new HttpsError("failed-precondition", "No active quest to complete.");
    }
    var completeTarget = Math.max(1, Math.floor(Number(active.target) || 1));
    var completeConditions = Array.isArray(active.conditions) ? active.conditions.slice() : [];
    if (!completeConditions.length) {
      completeConditions = [{ type: "log_count_today", target: completeTarget, progress: completeTarget }];
    }
    completeConditions[0] = Object.assign({}, completeConditions[0], {
      target: Math.max(1, Math.floor(Number(completeConditions[0].target || completeTarget) || completeTarget)),
      progress: completeTarget
    });
    await userRef.set({
      activeQuest: Object.assign({}, active, {
        target: completeTarget,
        progress: completeTarget,
        conditions: completeConditions,
        completedAt: new Date().toISOString()
      })
    }, { merge: true });
    await logDevAction(uid, "dev-quest-complete", {});
    return { ok: true, action: action };
  }

  if (action === "reset") {
    await userRef.set({
      activeQuest: null,
      questPoolWeekKey: admin.firestore.FieldValue.delete()
    }, { merge: true });
    await logDevAction(uid, "dev-quest-reset", {});
    return { ok: true, action: action };
  }

  if (action === "add-completed") {
    await userRef.set({
      questsCompleted: admin.firestore.FieldValue.increment(1)
    }, { merge: true });
    await logDevAction(uid, "dev-quest-add-completed", {});
    return { ok: true, action: action };
  }

  throw new HttpsError("invalid-argument", "Unknown action: " + action);
});

exports.devSetAchievementState = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const action = String(data.action || "");
  const badgeId = String(data.badgeId || "").trim();
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  if (!badgeId) {
    throw new HttpsError("invalid-argument", "badgeId is required.");
  }

  if (action === "unlock") {
    await userRef.collection("achievements").doc(badgeId).set({
      badgeId: badgeId,
      unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      claimed: false,
      progress: data.progress !== undefined ? Math.max(0, Number(data.progress) || 0) : null
    }, { merge: true });
    await userRef.set({
      unlockedAchievements: admin.firestore.FieldValue.arrayUnion(badgeId)
    }, { merge: true });
    await logDevAction(uid, "dev-badge-unlock", { badgeId: badgeId });
    return { ok: true, action: action, badgeId: badgeId };
  }

  if (action === "set-progress") {
    var progressN = Math.max(0, Number(data.progress) || 0);
    await userRef.collection("achievements").doc(badgeId).set({ progress: progressN }, { merge: true });
    await logDevAction(uid, "dev-badge-progress", { badgeId: badgeId, progress: progressN });
    return { ok: true, action: action, badgeId: badgeId, progress: progressN };
  }

  if (action === "claim") {
    await userRef.collection("achievements").doc(badgeId).set({
      claimed: true,
      claimedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await logDevAction(uid, "dev-badge-claim", { badgeId: badgeId });
    return { ok: true, action: action, badgeId: badgeId };
  }

  if (action === "reset") {
    await userRef.collection("achievements").doc(badgeId).delete();
    await userRef.set({
      unlockedAchievements: admin.firestore.FieldValue.arrayRemove(badgeId)
    }, { merge: true });
    await logDevAction(uid, "dev-badge-reset", { badgeId: badgeId });
    return { ok: true, action: action, badgeId: badgeId };
  }

  throw new HttpsError("invalid-argument", "Unknown action: " + action);
});

exports.devSetSentimosState = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const action = String(data.action || "set-balance");

  if (action === "set-balance") {
    var amount = Math.max(0, Math.floor(Number(data.amount) || 0));
    await userRef.set({ sentimos: amount, sentimosBalance: amount }, { merge: true });
    await logDevAction(uid, "dev-sentimos-set-balance", { amount: amount });
    return { ok: true, sentimosBalance: amount };
  }

  if (action === "add-freeze") {
    var charges = Math.max(1, Math.min(10, Math.floor(Number(data.charges) || 1)));
    await userRef.set({
      streakFreezeCount: admin.firestore.FieldValue.increment(charges),
      streakFreezeCharges: admin.firestore.FieldValue.increment(charges)
    }, { merge: true });
    await logDevAction(uid, "dev-sentimos-add-freeze", { charges: charges });
    return { ok: true, charges: charges };
  }

  throw new HttpsError("invalid-argument", "Unknown action: " + action);
});

exports.devResetToFreshOnboarding = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();
  const data = safeObj(request.data);
  if (data.confirm !== true) {
    throw new HttpsError("failed-precondition", "confirm:true is required for full reset.");
  }

  const userRef = db.collection("users").doc(uid);
  const defaultPrefs = Object.assign({}, notif.getDefaultPrefs(), {
    setupDone: false,
    pushSetupFailure: ""
  });

  await userRef.set({
    expenses: [],
    xp: 0,
    level: 1,
    currentStreak: 0,
    lastStreakLength: 0,
    lastExpenseDate: null,
    streakBrokenFlag: false,
    weeklyBudget: 0,
    sentimos: 0,
    sentimosBalance: 0,
    streakFreezeCount: 0,
    streakFreezeCharges: 0,
    activeQuest: null,
    questsCompleted: 0,
    questHistory: [],
    questPoolWeekKey: admin.firestore.FieldValue.delete(),
    lapsedStagesSent: admin.firestore.FieldValue.delete(),
    inboxUnreadCount: 0,
    notificationPrefs: defaultPrefs,
    unlockedAchievements: [],
    notifiedAchievements: [],
    pendingDailyReward: null,
    resetAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  var achSnap = await userRef.collection("achievements").get();
  if (!achSnap.empty) {
    for (var ai = 0; ai < achSnap.docs.length; ai += 400) {
      var achBatch = db.batch();
      achSnap.docs.slice(ai, ai + 400).forEach(function (d) { achBatch.delete(d.ref); });
      await achBatch.commit();
    }
  }

  var notifSnap = await userRef.collection("notifications").get();
  if (!notifSnap.empty) {
    for (var ni = 0; ni < notifSnap.docs.length; ni += 400) {
      var notifBatch = db.batch();
      notifSnap.docs.slice(ni, ni + 400).forEach(function (d) { notifBatch.delete(d.ref); });
      await notifBatch.commit();
    }
  }

  var expSnap = await userRef.collection("expenses").get();
  if (!expSnap.empty) {
    for (var ei = 0; ei < expSnap.docs.length; ei += 400) {
      var expBatch = db.batch();
      expSnap.docs.slice(ei, ei + 400).forEach(function (d) { expBatch.delete(d.ref); });
      await expBatch.commit();
    }
  }

  var logSnap = await userRef.collection("notificationLog").get();
  if (!logSnap.empty) {
    for (var li = 0; li < logSnap.docs.length; li += 400) {
      var logBatch = db.batch();
      logSnap.docs.slice(li, li + 400).forEach(function (d) { logBatch.delete(d.ref); });
      await logBatch.commit();
    }
  }

  try {
    var eventSnap = await db.collection("notificationEvents")
      .where("uid", "==", uid)
      .limit(500)
      .get();
    if (!eventSnap.empty) {
      var eventBatch = db.batch();
      eventSnap.docs.forEach(function (d) {
        eventBatch.delete(d.ref);
      });
      await eventBatch.commit();
    }
  } catch (_) {
    // Non-critical cleanup.
  }

  await logDevAction(uid, "full-reset", { resetAt: new Date().toISOString() });
  return { ok: true, resetAt: new Date().toISOString() };
});

exports.devClearLapsedStages = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  await admin.firestore().collection("users").doc(uid).set({
    lapsedStagesSent: admin.firestore.FieldValue.delete()
  }, { merge: true });
  await logDevAction(uid, "clear-lapsed-stages", null);
  return { cleared: true };
});

exports.devSimulateBrevoFailure = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const data = safeObj(request.data);
  const enabled = data.enabled === true;

  const ref = admin.firestore().collection("metrics").doc("devFlags");
  if (enabled) {
    await ref.set({
      simulateBrevoFailureUid: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } else {
    await ref.set({
      simulateBrevoFailureUid: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await logDevAction(uid, "simulate-brevo-failure", { enabled: enabled });
  return { enabled: enabled };
});

exports.devGetSnapshot = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();
  const dayKey = notif.todayKeyPH();

  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.exists ? safeObj(userSnap.data()) : {};

  const prefs = Object.assign({}, notif.getDefaultPrefs(), safeObj(user.notificationPrefs));

  const tokensSnap = await db.collection("users").doc(uid).collection("fcmTokens").limit(20).get();
  const fcmTokens = tokensSnap.docs.map(function (d) {
    var data = safeObj(d.data());
    var token = String(data.token || "");
    return {
      tokenIdPrefix: token ? token.slice(0, 16) : d.id.slice(0, 16),
      lastSeen: toIso(data.lastSeenAt || data.createdAt)
    };
  });

  const logSnap = await db.collection("users").doc(uid).collection("notificationLog").doc(dayKey).get();
  const notificationLogToday = logSnap.exists ? safeObj(logSnap.data()) : { pushCount: 0, emailCount: 0, types: [] };

  const quotaSnap = await db.collection("metrics").doc("emailQuota_" + dayKey).get();
  const emailQuotaToday = quotaSnap.exists ? safeObj(quotaSnap.data()) : { count: 0 };

  const flagsSnap = await db.collection("metrics").doc("devFlags").get();
  const flags = flagsSnap.exists ? safeObj(flagsSnap.data()) : {};

  const eventsSnap = await db.collection("notificationEvents")
    .where("uid", "==", uid)
    .limit(50)
    .get();

  const recentEvents = eventsSnap.docs
    .map(function (d) {
      var data = safeObj(d.data());
      return {
        id: d.id,
        type: String(data.type || ""),
        channel: String(data.channel || ""),
        status: String(data.status || ""),
        sentAt: toIso(data.sentAt),
        createdAt: toIso(data.createdAt),
        openedAt: toIso(data.openedAt),
        undeliveredReason: data.undeliveredReason || null
      };
    })
    .sort(function (a, b) {
      var aa = Date.parse(a.sentAt || a.createdAt || "") || 0;
      var bb = Date.parse(b.sentAt || b.createdAt || "") || 0;
      return bb - aa;
    })
    .slice(0, 20);

  const unreadSnap = await db.collection("users").doc(uid)
    .collection("notifications")
    .where("readAt", "==", null)
    .get();

  await logDevAction(uid, "snapshot", {
    unread: unreadSnap.size,
    events: recentEvents.length,
    pushCount: Number(notificationLogToday.pushCount || 0),
    emailCount: Number(notificationLogToday.emailCount || 0)
  });

  return {
    uid: uid,
    prefs: prefs,
    pushSetupFailure: String(prefs.pushSetupFailure || ""),
    fcmTokens: fcmTokens,
    notificationLogToday: {
      pushCount: Number(notificationLogToday.pushCount || 0),
      emailCount: Number(notificationLogToday.emailCount || 0),
      types: Array.isArray(notificationLogToday.types) ? notificationLogToday.types : []
    },
    emailQuotaToday: {
      count: Number(emailQuotaToday.count || 0)
    },
    simulateBrevoFailureEnabled: String(flags.simulateBrevoFailureUid || "") === uid,
    lapsedStagesSent: safeObj(user.lapsedStagesSent),
    currentStreak: Number(user.currentStreak || 0),
    lastExpenseDate: String(user.lastExpenseDate || ""),
    lastLoginAt: toIso(user.lastLoginAt),
    recentEvents: recentEvents,
    inboxUnreadCount: Number(unreadSnap.size || 0)
  };
});

exports.devSnapshotSave = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists ? safeObj(userSnap.data()) : {};

  const expensesSnap = await db.collection("users").doc(uid)
    .collection("expenses")
    .orderBy("timestamp", "desc")
    .limit(60)
    .get();

  const questSnap = await db.collection("users").doc(uid)
    .collection("quests").doc("active").get();

  const payload = {
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
    weeklyBudget: Number(userData.weeklyBudget || 0),
    xp: Number(userData.xp || 0),
    currentStreak: Number(userData.currentStreak || 0),
    lastStreakLength: Number(userData.lastStreakLength || 0),
    sentimos: Number(userData.sentimos || 0),
    lastExpenseDate: userData.lastExpenseDate || null,
    weeklyXpStart: Number(userData.weeklyXpStart || 0),
    weeklyXpStartDate: userData.weeklyXpStartDate || null,
    notificationPrefs: userData.notificationPrefs || null,
    realExpenseIds: expensesSnap.docs
      .filter((d) => {
        const n = String((d.data() || {}).note || "");
        return n.indexOf("[DEV]") !== 0;
      })
      .map((d) => d.id),
    activeQuest: questSnap.exists ? safeObj(questSnap.data()) : null
  };

  await db.collection("users").doc(uid)
    .collection("devSnapshot").doc("main")
    .set(payload, { merge: true });

  await logDevAction(uid, "snapshot-save", {
    realExpenseCount: payload.realExpenseIds.length
  });

  return { ok: true, savedAt: new Date().toISOString() };
});

exports.devSnapshotRestore = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  const snap = await db.collection("users").doc(uid)
    .collection("devSnapshot").doc("main").get();

  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "No snapshot found. Click Snapshot first.");
  }

  const s = safeObj(snap.data());

  const restorePatch = {
    weeklyBudget: Number(s.weeklyBudget || 0),
    xp: Number(s.xp || 0),
    currentStreak: Number(s.currentStreak || 0),
    lastStreakLength: Number(s.lastStreakLength || 0),
    sentimos: Number(s.sentimos || 0),
    lastExpenseDate: s.lastExpenseDate || null,
    weeklyXpStart: Number(s.weeklyXpStart || 0),
    weeklyXpStartDate: s.weeklyXpStartDate || null,
    notificationPrefs: s.notificationPrefs || null
  };

  await db.collection("users").doc(uid).set(restorePatch, { merge: true });

  const expSnap = await db.collection("users").doc(uid).collection("expenses").get();
  const batch = db.batch();
  let devExpensesRemoved = 0;
  expSnap.docs.forEach((doc) => {
    const note = String((doc.data() || {}).note || "");
    if (note.indexOf("[DEV]") === 0) {
      batch.delete(doc.ref);
      devExpensesRemoved += 1;
    }
  });

  const friendsSnap = await db.collection("friends").doc(uid).collection("friends").get();
  let fakeFriendsCleared = 0;
  friendsSnap.docs.forEach((doc) => {
    if (doc.id.indexOf("dev-friend-") === 0) {
      batch.delete(doc.ref);
      fakeFriendsCleared += 1;
    }
  });

  const activeQuestRef = db.collection("users").doc(uid).collection("quests").doc("active");
  if (s.activeQuest) {
    batch.set(activeQuestRef, s.activeQuest, { merge: false });
  } else {
    batch.delete(activeQuestRef);
  }

  await batch.commit();

  await logDevAction(uid, "snapshot-restore", {
    devExpensesRemoved: devExpensesRemoved,
    fakeFriendsCleared: fakeFriendsCleared
  });

  return {
    ok: true,
    itemsRestored: devExpensesRemoved + 1,
    fakeFriendsCleared: fakeFriendsCleared
  };
});

exports.devSeedLeaderboard = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const user = userSnap.exists ? safeObj(userSnap.data()) : {};
  const currentXp = Math.max(250, Number(user.xp || 0));

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const mondayKey = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, "0"),
    String(monday.getDate()).padStart(2, "0")
  ].join("-");

  const audience = [uid].concat(DEV_FAKE_FRIENDS.map((f) => f.uid));
  const batch = db.batch();

  batch.set(userRef, {
    xp: currentXp,
    weeklyXpStart: currentXp - 250,
    weeklyXpStartDate: mondayKey
  }, { merge: true });

  DEV_FAKE_FRIENDS.forEach((f) => {
    const profile = {
      displayName: f.displayName,
      firstName: f.firstName,
      streak: f.streak,
      questsCompleted: f.questsCompleted,
      weeklyXP: f.weeklyXP,
      level: f.level,
      levelName: f.levelName,
      lastSyncedAt: now.toISOString()
    };

    batch.set(db.collection("users").doc(f.uid), { publicProfile: profile }, { merge: true });
    batch.set(db.collection("friends").doc(uid).collection("friends").doc(f.uid), {
      addedAt: now.toISOString(),
      displayName: f.displayName,
      publicProfile: profile
    }, { merge: true });
  });

  let feedEntriesCreated = 0;
  DEV_FAKE_FRIENDS.forEach((f, fi) => {
    for (let i = 0; i < 2; i++) {
      const tpl = DEV_FEED_TEMPLATES[(fi * 2 + i) % DEV_FEED_TEMPLATES.length];
      const msg = tpl.message
        .replace("{name}", f.firstName)
        .replace("{streak}", String(f.streak))
        .replace("{xp}", String(f.weeklyXP));

      batch.set(db.collection("global_feed").doc(), {
        type: "activity",
        emoji: tpl.emoji,
        message: msg,
        authorName: f.displayName,
        authorInitial: f.firstName.charAt(0).toUpperCase(),
        authorUid: f.uid,
        audience: audience,
        timestamp: new Date(now.getTime() - (fi * 2 + i) * 8 * 60 * 1000).toISOString()
      });
      feedEntriesCreated += 1;
    }
  });

  await batch.commit();
  await logDevAction(uid, "seed-leaderboard", {
    friendsCreated: DEV_FAKE_FRIENDS.length,
    feedEntriesCreated: feedEntriesCreated
  });

  return {
    ok: true,
    friendsCreated: DEV_FAKE_FRIENDS.length,
    feedEntriesCreated: feedEntriesCreated
  };
});

exports.devClearLeaderboard = onCall({ region: REGION }, async (request) => {
  const uid = assertAdmin(request);
  const db = admin.firestore();

  const linkSnap = await db.collection("friends").doc(uid).collection("friends").get();
  const linkBatch = db.batch();
  let friendsDeleted = 0;
  linkSnap.docs.forEach((d) => {
    if (d.id.indexOf("dev-friend-") === 0) {
      linkBatch.delete(d.ref);
      friendsDeleted += 1;
    }
  });
  await linkBatch.commit();

  let feedEntriesDeleted = 0;
  while (true) {
    const feedSnap = await db.collection("global_feed")
      .where("authorUid", ">=", "dev-friend-")
      .where("authorUid", "<=", "dev-friend-\uf8ff")
      .limit(500)
      .get();

    if (!feedSnap || feedSnap.empty) {
      break;
    }

    const batch = db.batch();
    feedSnap.docs.forEach((d) => {
      batch.delete(d.ref);
      feedEntriesDeleted += 1;
    });
    await batch.commit();

    if (feedSnap.size < 500) {
      break;
    }
  }

  await logDevAction(uid, "clear-leaderboard", {
    friendsDeleted: friendsDeleted,
    feedEntriesDeleted: feedEntriesDeleted
  });

  return {
    ok: true,
    friendsDeleted: friendsDeleted,
    feedEntriesDeleted: feedEntriesDeleted
  };
});
