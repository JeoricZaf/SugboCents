const crypto = require("crypto");
const admin = require("firebase-admin");
const webpush = require("web-push");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");

const GROQ_API_KEY = defineSecret("GROQ_API_KEY");
const VAPID_PRIVATE_KEY = defineSecret("VAPID_PRIVATE_KEY");

/** Must match the public key in js/notifications.js (SUGBOCENTS_VAPID_PUBLIC_KEY). */
const VAPID_PUBLIC_KEY =
  "BHK7yVDGF3avSKamFtdbSGW4X-ji34xM78R53OkuKQW_6cQnYP2183CmuX1Yn2GAHx7RhZmspiT2b0S60FGzsKM";

const VAPID_CONTACT = "mailto:support@sugbocents.web.app";

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://sugbocents.web.app",
  "https://sugbocents.firebaseapp.com"
];

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ── Server-side rate limiter (in-memory, per IP) ──────────
var ipRequestLog = {};
var RATE_LIMIT_MAX = 30;
var RATE_LIMIT_WINDOW = 60 * 60 * 1000;

function isRateLimited(ip) {
  var now = Date.now();
  if (!ipRequestLog[ip]) {
    ipRequestLog[ip] = [];
  }
  ipRequestLog[ip] = ipRequestLog[ip].filter(function (t) {
    return now - t < RATE_LIMIT_WINDOW;
  });
  if (ipRequestLog[ip].length >= RATE_LIMIT_MAX) {
    return true;
  }
  ipRequestLog[ip].push(now);
  return false;
}

setInterval(function () {
  var now = Date.now();
  Object.keys(ipRequestLog).forEach(function (ip) {
    ipRequestLog[ip] = (ipRequestLog[ip] || []).filter(function (t) {
      return now - t < RATE_LIMIT_WINDOW;
    });
    if (ipRequestLog[ip].length === 0) {
      delete ipRequestLog[ip];
    }
  });
}, 15 * 60 * 1000);

function applyCors(req, res) {
  var origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function subscriptionDocId(endpoint) {
  return crypto.createHash("sha256").update(String(endpoint || "")).digest("hex").slice(0, 40);
}

function manilaDateKey(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

function manilaStreakFromExpenses(expenses, now) {
  var set = {};
  (expenses || []).forEach(function (e) {
    if (!e || !e.timestamp) {
      return;
    }
    set[manilaDateKey(new Date(e.timestamp))] = true;
  });
  var todayKey = manilaDateKey(now);
  var y = new Date(now.getTime() - 86400000);
  var yesterdayKey = manilaDateKey(y);
  if (!set[todayKey] && !set[yesterdayKey]) {
    return 0;
  }
  var cursor = set[todayKey] ? new Date(now) : new Date(y);
  var count = 0;
  while (set[manilaDateKey(cursor)]) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function hasExpenseOnManilaDate(expenses, dateKey) {
  return (expenses || []).some(function (e) {
    return e && e.timestamp && manilaDateKey(new Date(e.timestamp)) === dateKey;
  });
}

function configureWebPush() {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.value());
}

exports.chat = onRequest(
  { secrets: [GROQ_API_KEY], region: "us-central1", invoker: "public" },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    var clientIp = (req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "Too many requests. Please wait a while before sending more messages." });
      return;
    }

    var message = req.body.message;
    var history = Array.isArray(req.body.history) ? req.body.history : [];
    var systemPrompt =
      req.body.systemPrompt ||
      "You are Sugbo, a friendly savings mascot for SugboCents, a Filipino budgeting app. " +
      "Keep replies SHORT (2-3 sentences), warm, and motivating. Currency is ₱ (PHP).";

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message is required." });
      return;
    }

    var messages = [{ role: "system", content: systemPrompt }];
    history.slice(-6).forEach(function (m) {
      if (m.role === "user") {
        messages.push({ role: "user", content: m.text });
      } else if (m.role === "bot") {
        messages.push({ role: "assistant", content: m.text });
      }
    });
    messages.push({ role: "user", content: message });

    var groqBody = JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7
    });

    try {
      var groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + GROQ_API_KEY.value(),
          "Content-Type": "application/json"
        },
        body: groqBody
      });

      if (!groqRes.ok) {
        var errText = await groqRes.text();
        res.status(502).json({ error: "Groq error " + groqRes.status + ": " + errText.substring(0, 200) });
        return;
      }

      var data = await groqRes.json();
      var reply =
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      reply = reply.trim();

      if (!reply) {
        res.status(502).json({ error: "Empty reply from model." });
        return;
      }

      res.json({ reply: reply });
    } catch (e) {
      res.status(500).json({ error: e.message || "Internal server error." });
    }
  }
);

/**
 * POST { idToken, subscription } — subscription = PushSubscription.toJSON()
 * Optional: streakNotifications (boolean) — stored on users/{uid} for scheduled reminders.
 * Deploy: firebase functions:secrets:set VAPID_PRIVATE_KEY
 * (Private key must pair with VAPID_PUBLIC_KEY in this file and js/notifications.js.)
 */
exports.registerPush = onRequest(
  { secrets: [VAPID_PRIVATE_KEY], region: "us-central1", invoker: "public" },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      configureWebPush();
    } catch (e) {
      res.status(503).json({ error: "Push is not configured on the server." });
      return;
    }

    var idToken = req.body && req.body.idToken;
    var subscription = req.body && req.body.subscription;
    if (!idToken || typeof idToken !== "string") {
      res.status(400).json({ error: "idToken is required." });
      return;
    }
    if (!subscription || typeof subscription.endpoint !== "string" || !subscription.keys) {
      res.status(400).json({ error: "subscription (PushSubscription JSON) is required." });
      return;
    }

    var decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      res.status(401).json({ error: "Invalid or expired session." });
      return;
    }

    var uid = decoded.uid;
    var sid = subscriptionDocId(subscription.endpoint);
    var batch = db.batch();
    var subRef = db.collection("users").doc(uid).collection("pushSubscriptions").doc(sid);
    batch.set(
      subRef,
      {
        subscription: subscription,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    if (typeof req.body.streakNotifications === "boolean") {
      batch.set(
        db.collection("users").doc(uid),
        { streakNotifications: req.body.streakNotifications },
        { merge: true }
      );
    }

    await batch.commit();
    res.json({ ok: true });
  }
);

/**
 * POST { idToken, endpoint }
 */
exports.unregisterPush = onRequest({ region: "us-central1", invoker: "public" }, async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  var idToken = req.body && req.body.idToken;
  var endpoint = req.body && req.body.endpoint;
  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "idToken is required." });
    return;
  }
  if (!endpoint || typeof endpoint !== "string") {
    res.status(400).json({ error: "endpoint is required." });
    return;
  }

  var decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }

  var uid = decoded.uid;
  var sid = subscriptionDocId(endpoint);
  await db.collection("users").doc(uid).collection("pushSubscriptions").doc(sid).delete();
  res.json({ ok: true });
});

/**
 * 8:00 PM Asia/Manila — streak risk reminder when the user enabled streak notifications,
 * has an active streak, and has not logged an expense yet today (Manila calendar day).
 */
exports.eveningBudgetReminder = onSchedule(
  {
    schedule: "0 20 * * *",
    timeZone: "Asia/Manila",
    region: "us-central1",
    secrets: [VAPID_PRIVATE_KEY],
    memory: "512MiB"
  },
  async () => {
    try {
      configureWebPush();
    } catch (e) {
      console.warn("[eveningBudgetReminder] VAPID not configured, skipping.");
      return;
    }

    var now = new Date();
    var todayKey = manilaDateKey(now);
    var snap = await db.collectionGroup("pushSubscriptions").get();

    for (var i = 0; i < snap.docs.length; i++) {
      var doc = snap.docs[i];
      var parts = doc.ref.path.split("/");
      if (parts.length < 4 || parts[0] !== "users" || parts[2] !== "pushSubscriptions") {
        continue;
      }
      var uid = parts[1];
      var data = doc.data();
      var subscription = data && data.subscription;
      if (!subscription || !subscription.endpoint) {
        continue;
      }

      var userSnap = await db.collection("users").doc(uid).get();
      var userData = userSnap.exists ? userSnap.data() : {};
      if (userData.streakNotifications !== true) {
        continue;
      }
      if (data.lastEveningSentDate === todayKey) {
        continue;
      }

      var expSnap = await db
        .collection("users")
        .doc(uid)
        .collection("expenses")
        .orderBy("timestamp", "desc")
        .limit(400)
        .get();
      var expenses = expSnap.docs.map(function (d) {
        return d.data();
      });

      if (hasExpenseOnManilaDate(expenses, todayKey)) {
        continue;
      }

      var streak = manilaStreakFromExpenses(expenses, now);
      if (streak < 1) {
        continue;
      }

      var payload = JSON.stringify({
        title: "Don't forget to log! 📝",
        body: "Log today's spending before midnight (PH time) to keep your streak alive.",
        url: "/dashboard.html",
        tag: "sugbocents-evening-reminder"
      });

      try {
        await webpush.sendNotification(subscription, payload, { TTL: 3600 });
        await doc.ref.set({ lastEveningSentDate: todayKey }, { merge: true });
      } catch (err) {
        var status = err && err.statusCode;
        console.warn("[eveningBudgetReminder] send failed", uid, status, err && err.message);
        if (status === 404 || status === 410) {
          await doc.ref.delete().catch(function () {});
        }
      }
    }
  }
);
