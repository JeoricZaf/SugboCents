const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const GROQ_API_KEY = defineSecret("GROQ_API_KEY");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

if (!admin.apps.length) {
  admin.initializeApp();
}

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://sugbocents.web.app",
  "https://sugbocents.firebaseapp.com"
];

// ── Server-side rate limiter (in-memory, per IP) ──────────
// Resets on cold start — acts as a burst guard, not a hard quota.
var ipRequestLog      = {};
var emojiRequestLog   = {};
var wrappedEmailRequestLog = {};
var RATE_LIMIT_MAX    = 30;    // chat: 30 req/hr per IP
var EMOJI_LIMIT_MAX   = 100;   // emojiSuggest: 100 req/hr per IP
var RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
var WRAPPED_DAILY_LIMIT_MAX = 5;
var WRAPPED_DAILY_WINDOW = 24 * 60 * 60 * 1000;

function isRateLimited(ip) {
  var now = Date.now();
  if (!ipRequestLog[ip]) { ipRequestLog[ip] = []; }
  ipRequestLog[ip] = ipRequestLog[ip].filter(function (t) {
    return now - t < RATE_LIMIT_WINDOW;
  });
  if (ipRequestLog[ip].length >= RATE_LIMIT_MAX) { return true; }
  ipRequestLog[ip].push(now);
  return false;
}

function isEmojiRateLimited(ip) {
  var now = Date.now();
  if (!emojiRequestLog[ip]) { emojiRequestLog[ip] = []; }
  emojiRequestLog[ip] = emojiRequestLog[ip].filter(function (t) {
    return now - t < RATE_LIMIT_WINDOW;
  });
  if (emojiRequestLog[ip].length >= EMOJI_LIMIT_MAX) { return true; }
  emojiRequestLog[ip].push(now);
  return false;
}

function isWrappedEmailRateLimited(ip) {
  var now = Date.now();
  if (!wrappedEmailRequestLog[ip]) { wrappedEmailRequestLog[ip] = []; }
  wrappedEmailRequestLog[ip] = wrappedEmailRequestLog[ip].filter(function (t) {
    return now - t < WRAPPED_DAILY_WINDOW;
  });
  if (wrappedEmailRequestLog[ip].length >= WRAPPED_DAILY_LIMIT_MAX) { return true; }
  wrappedEmailRequestLog[ip].push(now);
  return false;
}

// Periodically clean up stale IP entries to prevent memory leak
setInterval(function () {
  var now = Date.now();
  [
    { log: ipRequestLog, windowMs: RATE_LIMIT_WINDOW },
    { log: emojiRequestLog, windowMs: RATE_LIMIT_WINDOW },
    { log: wrappedEmailRequestLog, windowMs: WRAPPED_DAILY_WINDOW }
  ].forEach(function (entry) {
    var log = entry.log;
    Object.keys(log).forEach(function (ip) {
      log[ip] = (log[ip] || []).filter(function (t) {
        return now - t < entry.windowMs;
      });
      if (log[ip].length === 0) { delete log[ip]; }
    });
  });
}, 15 * 60 * 1000); // run every 15 minutes

exports.chat = onRequest(
  { secrets: [GROQ_API_KEY], region: "us-central1", invoker: "public" },
  async (req, res) => {
    // CORS
    var origin = req.headers.origin || "";
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // Server-side rate limit check
    var clientIp = (req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "Too many requests. Please wait a while before sending more messages." });
      return;
    }

    var message = req.body.message;
    var history = Array.isArray(req.body.history) ? req.body.history : [];
    var systemPrompt = req.body.systemPrompt ||
      "You are Sugbo, a friendly savings mascot for SugboCents, a Filipino budgeting app. " +
      "Keep replies SHORT (2-3 sentences), warm, and motivating. Currency is ₱ (PHP).";

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message is required." });
      return;
    }

    // Build OpenAI-compatible messages array
    var messages = [{ role: "system", content: systemPrompt }];
    history.slice(-6).forEach(function (m) {
      if (m.role === "user") { messages.push({ role: "user", content: m.text }); }
      else if (m.role === "bot") { messages.push({ role: "assistant", content: m.text }); }
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
          "Authorization": "Bearer " + GROQ_API_KEY.value(),
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
      var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      reply = reply.trim();

      if (!reply) { res.status(502).json({ error: "Empty reply from model." }); return; }

      res.json({ reply: reply });
    } catch (e) {
      res.status(500).json({ error: e.message || "Internal server error." });
    }
  }
);

// ── emojiSuggest ── returns {emoji, category} for a given expense name ────────
// Understands English, Filipino, and Bisaya/Cebuano.
// Deploy: firebase deploy --only functions
exports.emojiSuggest = onRequest(
  { secrets: [GROQ_API_KEY], region: "us-central1", invoker: "public" },
  async (req, res) => {
    var origin = req.headers.origin || "";
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")   { res.status(405).json({ error: "Method Not Allowed" }); return; }

    var clientIp = (req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
    if (isEmojiRateLimited(clientIp)) {
      res.status(429).json({ error: "Rate limited." });
      return;
    }

    var name = ((req.body && req.body.name) || "").trim().substring(0, 80);
    if (!name) { res.status(400).json({ error: "name is required." }); return; }

    var systemPrompt =
      "You are an emoji picker for a Filipino budgeting app. Given an expense name " +
      "(may be English, Filipino, or Bisaya/Cebuano), reply ONLY with valid JSON on one line: " +
      "{\"emoji\":\"🍚\",\"category\":\"food\"}. " +
      "Valid categories: food, transport, groceries, health, education, utilities, personal_care, " +
      "shopping, entertainment, other. No explanation, no markdown, nothing else.";

    try {
      var groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + GROQ_API_KEY.value(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: name }
          ],
          max_tokens: 30,
          temperature: 0
        })
      });

      if (!groqRes.ok) {
        res.status(502).json({ error: "Groq error " + groqRes.status + "." });
        return;
      }

      var data = await groqRes.json();
      var raw  = (data.choices && data.choices[0] &&
                  data.choices[0].message && data.choices[0].message.content) || "";
      raw = raw.trim();

      // Parse JSON — gracefully handle any extra text the model may emit
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        var m = raw.match(/\{[^}]+\}/);
        try { parsed = m ? JSON.parse(m[0]) : null; } catch (e2) { parsed = null; }
      }

      res.json({
        emoji:    (parsed && parsed.emoji)    || "\u{1F9FE}",
        category: (parsed && parsed.category) || "other"
      });
    } catch (e) {
      res.status(500).json({ error: e.message || "Internal server error." });
    }
  }
);

function applyCors(req, res) {
  var origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function getClientIp(req) {
  return (req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
}

function sanitizeText(value, maxLen) {
  var str = String(value || "").trim();
  if (maxLen && str.length > maxLen) {
    return str.substring(0, maxLen);
  }
  return str;
}

function isValidEmail(email) {
  var clean = sanitizeText(email, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

function parseSafeNumber(input) {
  var n = Number(input);
  if (!Number.isFinite(n)) { return null; }
  return n;
}

function validateWeeklyData(weeklyData) {
  if (!weeklyData || typeof weeklyData !== "object") {
    return { ok: false, error: "weeklyData is required." };
  }

  var totalSpent = parseSafeNumber(weeklyData.totalSpent);
  var weeklyBudget = parseSafeNumber(weeklyData.weeklyBudget);
  var expenseCount = parseSafeNumber(weeklyData.expenseCount);
  var streak = parseSafeNumber(weeklyData.streak);

  if (totalSpent === null || totalSpent < 0) {
    return { ok: false, error: "weeklyData.totalSpent must be a non-negative number." };
  }
  if (weeklyBudget === null || weeklyBudget < 0) {
    return { ok: false, error: "weeklyData.weeklyBudget must be a non-negative number." };
  }
  if (expenseCount === null || expenseCount < 0) {
    return { ok: false, error: "weeklyData.expenseCount must be a non-negative number." };
  }
  if (streak === null || streak < 0) {
    return { ok: false, error: "weeklyData.streak must be a non-negative number." };
  }

  var topCategory = sanitizeText(weeklyData.topCategory, 50);
  var level = sanitizeText(weeklyData.level, 50);
  var weekLabel = sanitizeText(weeklyData.weekLabel, 60);

  if (!topCategory) {
    return { ok: false, error: "weeklyData.topCategory is required." };
  }
  if (!level) {
    return { ok: false, error: "weeklyData.level is required." };
  }
  if (!weekLabel) {
    return { ok: false, error: "weeklyData.weekLabel is required." };
  }

  return {
    ok: true,
    value: {
      totalSpent: Number(totalSpent.toFixed(2)),
      weeklyBudget: Number(weeklyBudget.toFixed(2)),
      topCategory: topCategory,
      expenseCount: Math.floor(expenseCount),
      streak: Math.floor(streak),
      level: level,
      weekLabel: weekLabel
    }
  };
}

function formatPhp(amount) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount) || 0);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWrappedEmailContent(firstName, weeklyData, aiInsight) {
  var safeName = escapeHtml(firstName || "Saver");
  var safeWeekLabel = escapeHtml(weeklyData.weekLabel);
  var spent = formatPhp(weeklyData.totalSpent);
  var budget = formatPhp(weeklyData.weeklyBudget);
  var safeTopCategory = escapeHtml(weeklyData.topCategory);
  var safeLevel = escapeHtml(weeklyData.level);
  var safeInsight = escapeHtml(aiInsight || "");
  var dashboardUrl = "https://sugbocents.web.app/dashboard.html";

  var html = "" +
    "<div style=\"background:#f7f3e8;padding:24px;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#102b1d;\">" +
      "<div style=\"max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ded7c6;border-radius:18px;overflow:hidden;\">" +
        "<div style=\"background:#1f6b46;color:#ffffff;padding:18px 20px;\">" +
          "<h1 style=\"margin:0;font-size:22px;line-height:1.2;\">SugboCents</h1>" +
          "<p style=\"margin:6px 0 0;font-size:13px;opacity:0.92;\">Your week in review</p>" +
        "</div>" +
        "<div style=\"padding:20px;\">" +
          "<p style=\"margin:0 0 12px;font-size:15px;\">Hi " + safeName + " \uD83D\uDC4B</p>" +
          "<div style=\"border:1px solid #e7e2d6;border-radius:14px;background:#faf8f1;padding:14px 16px;\">" +
            "<p style=\"margin:0 0 10px;font-size:24px;font-weight:800;color:#164f33;\">" + escapeHtml(spent) + " / " + escapeHtml(budget) + "</p>" +
            "<p style=\"margin:4px 0;font-size:14px;\">\uD83D\uDD25 " + weeklyData.streak + "-day streak</p>" +
            "<p style=\"margin:4px 0;font-size:14px;\">\uD83D\uDCE6 " + weeklyData.expenseCount + " expenses</p>" +
            "<p style=\"margin:4px 0;font-size:14px;\">\uD83C\uDF54 Top: " + safeTopCategory + "</p>" +
            "<p style=\"margin:4px 0 0;font-size:14px;\">\u2B50 Level: " + safeLevel + "</p>" +
          "</div>" +
          (safeInsight
            ? "<p style=\"margin:14px 0 0;font-size:14px;line-height:1.55;font-style:italic;color:#315643;\">" + safeInsight + "</p>"
            : "") +
          "<p style=\"margin:14px 0 0;font-size:13px;color:#5f6f63;\">Week: " + safeWeekLabel + "</p>" +
          "<a href=\"" + dashboardUrl + "\" style=\"display:inline-block;margin-top:16px;background:#1f6b46;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:700;font-size:13px;\">VIEW YOUR DASHBOARD \u2192</a>" +
        "</div>" +
        "<div style=\"padding:14px 20px;border-top:1px solid #efe9dc;font-size:12px;color:#708275;\">SugboCents \u00B7 You can manage weekly report settings in the app.</div>" +
      "</div>" +
    "</div>";

  var textLines = [
    "SugboCents - Your week in review",
    "",
    "Hi " + (firstName || "Saver") + ",",
    "",
    formatPhp(weeklyData.totalSpent) + " / " + formatPhp(weeklyData.weeklyBudget),
    weeklyData.streak + "-day streak",
    weeklyData.expenseCount + " expenses",
    "Top category: " + weeklyData.topCategory,
    "Level: " + weeklyData.level,
    "Week: " + weeklyData.weekLabel,
    ""
  ];
  if (aiInsight) {
    textLines.push(aiInsight);
    textLines.push("");
  }
  textLines.push("Open your dashboard: " + dashboardUrl);

  return {
    subject: "Your SugboCents Week - " + weeklyData.weekLabel,
    html: html,
    text: textLines.join("\n")
  };
}

async function requestAiInsight(firstName, weeklyData) {
  var controller = new AbortController();
  var timeoutId = setTimeout(function () {
    controller.abort();
  }, 4000);

  var systemPrompt =
    "You are a warm, encouraging Filipino budgeting coach. Given a user's weekly spending summary, " +
    "write exactly 2-3 sentences of personalized insight in a supportive tone. Mention their specific numbers. " +
    "Do not use bullet points. Write in English.";

  var userPrompt =
    "Name: " + sanitizeText(firstName || "Saver", 60) + ". " +
    "Spent " + formatPhp(weeklyData.totalSpent) + " of " + formatPhp(weeklyData.weeklyBudget) + " budget. " +
    "Top category: " + weeklyData.topCategory + ". " +
    "Logged " + weeklyData.expenseCount + " expenses. " +
    "Current streak: " + weeklyData.streak + " days. " +
    "Level: " + weeklyData.level + ".";

  try {
    var groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + GROQ_API_KEY.value(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 120,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    if (!groqRes.ok) { return ""; }
    var data = await groqRes.json();
    var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    return sanitizeText(reply, 320);
  } catch (e) {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendWrappedEmailViaResend(email, content) {
  var resendFrom = process.env.RESEND_FROM_EMAIL || "SugboCents <onboarding@resend.dev>";
  var requestedEmail = sanitizeText(email, 254).toLowerCase();
  var testRecipient = sanitizeText(process.env.RESEND_TEST_RECIPIENT || "25103836@usc.edu.ph", 254).toLowerCase();
  var isSandboxSender = resendFrom.toLowerCase().indexOf("onboarding@resend.dev") !== -1;
  var deliveryEmail = requestedEmail;

  // Resend sandbox sender can only deliver to a verified inbox.
  if (isSandboxSender && isValidEmail(testRecipient)) {
    deliveryEmail = testRecipient;
  }

  var resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + RESEND_API_KEY.value(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [deliveryEmail],
      subject: content.subject,
      html: content.html,
      text: content.text
    })
  });

  if (!resendRes.ok) {
    var errText = await resendRes.text();
    return { ok: false, error: "Email provider error: " + errText.substring(0, 200) };
  }

  return {
    ok: true,
    deliveredTo: deliveryEmail,
    overridden: deliveryEmail !== requestedEmail
  };
}

function getWeekRange(now, previousWeek) {
  var anchor = new Date(now || Date.now());
  anchor.setHours(0, 0, 0, 0);
  var day = anchor.getDay();
  var mondayOffset = (day + 6) % 7;
  var monday = new Date(anchor);
  monday.setDate(anchor.getDate() - mondayOffset);
  if (previousWeek) {
    monday.setDate(monday.getDate() - 7);
  }
  monday.setHours(0, 0, 0, 0);

  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  var weekKey = monday.getFullYear() + "-" +
    String(monday.getMonth() + 1).padStart(2, "0") + "-" +
    String(monday.getDate()).padStart(2, "0");

  var labelStart = monday.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  var labelEnd = sunday.toLocaleDateString("en-PH", { month: "short", day: "numeric" });

  return {
    monday: monday,
    sunday: sunday,
    weekKey: weekKey,
    weekLabel: labelStart + " - " + labelEnd
  };
}

function getLevelName(level) {
  var lvl = Number(level) || 1;
  if (lvl >= 7) { return "Budget Legend"; }
  if (lvl >= 6) { return "Finance Pro"; }
  if (lvl >= 5) { return "Streak Hunter"; }
  if (lvl >= 4) { return "Week Crusher"; }
  if (lvl >= 3) { return "Money Smart"; }
  if (lvl >= 2) { return "Budget Aware"; }
  return "Rookie Saver";
}

function toCategoryLabel(categoryId) {
  var map = {
    transport: "Transport",
    food: "Food",
    groceries: "Groceries",
    health: "Health",
    education: "Education",
    utilities: "Utilities",
    personal_care: "Personal Care",
    shopping: "Shopping",
    entertainment: "Entertainment",
    others: "Others",
    other: "Others"
  };
  return map[categoryId] || "Others";
}

exports.sendWrappedEmail = onRequest(
  { secrets: [GROQ_API_KEY, RESEND_API_KEY], region: "us-central1", invoker: "public" },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

    var clientIp = getClientIp(req);
    if (isWrappedEmailRateLimited(clientIp)) {
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    var email = sanitizeText(req.body && req.body.email, 254).toLowerCase();
    var firstName = sanitizeText(req.body && req.body.firstName, 60) || "Saver";
    var weeklyDataResult = validateWeeklyData(req.body && req.body.weeklyData);

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Valid email is required." });
      return;
    }

    if (!weeklyDataResult.ok) {
      res.status(400).json({ error: weeklyDataResult.error });
      return;
    }

    var weeklyData = weeklyDataResult.value;

    try {
      var aiInsight = await requestAiInsight(firstName, weeklyData);
      var emailContent = buildWrappedEmailContent(firstName, weeklyData, aiInsight);
      var sendResult = await sendWrappedEmailViaResend(email, emailContent);

      if (!sendResult.ok) {
        res.status(502).json({ error: sendResult.error || "Unable to send report." });
        return;
      }

      res.json({
        success: true,
        deliveredTo: sendResult.deliveredTo || email,
        testRecipientOverride: !!sendResult.overridden
      });
    } catch (e) {
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

exports.sendWeeklyWrappedEmailAuto = onSchedule(
  {
    schedule: "0 8 * * 1",
    timeZone: "Asia/Manila",
    region: "us-central1",
    secrets: [GROQ_API_KEY, RESEND_API_KEY]
  },
  async () => {
    var db = admin.firestore();
    var week = getWeekRange(new Date(), true);
    var optedInSnapshot = await db.collection("users").where("emailOptIn", "==", true).get();

    var processed = 0;
    var sent = 0;
    var skipped = 0;
    var failed = 0;

    for (var i = 0; i < optedInSnapshot.docs.length; i++) {
      var userDoc = optedInSnapshot.docs[i];
      var userId = userDoc.id;
      var user = userDoc.data() || {};
      processed += 1;

      var email = sanitizeText(user.email, 254).toLowerCase();
      if (!isValidEmail(email)) {
        skipped += 1;
        continue;
      }

      if (user.lastEmailReportWeekKey === week.weekKey) {
        skipped += 1;
        continue;
      }

      try {
        var expSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("expenses")
          .where("timestamp", ">=", week.monday.toISOString())
          .where("timestamp", "<=", week.sunday.toISOString())
          .get();

        var totalSpent = 0;
        var expenseCount = 0;
        var categoryCounts = {};

        expSnapshot.docs.forEach(function (doc) {
          var exp = doc.data() || {};
          var amount = Number(exp.amount) || 0;
          if (amount < 0) { amount = 0; }
          totalSpent += amount;
          expenseCount += 1;
          var cat = sanitizeText(exp.category, 40).toLowerCase() || "others";
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        var topCategoryKey = "others";
        Object.keys(categoryCounts).forEach(function (key) {
          if ((categoryCounts[key] || 0) > (categoryCounts[topCategoryKey] || 0)) {
            topCategoryKey = key;
          }
        });

        var level = Number(user.level) || 1;
        var levelName = (user.publicProfile && user.publicProfile.levelName)
          ? sanitizeText(user.publicProfile.levelName, 50)
          : getLevelName(level);

        var weeklyData = {
          totalSpent: Number(totalSpent.toFixed(2)),
          weeklyBudget: Number(Number(user.weeklyBudget || 0).toFixed(2)),
          topCategory: toCategoryLabel(topCategoryKey),
          expenseCount: expenseCount,
          streak: Number(user.streakCount || (user.publicProfile && user.publicProfile.streak) || 0),
          level: levelName,
          weekLabel: week.weekLabel
        };

        var firstName = sanitizeText(user.firstName, 60) || "Saver";
        var aiInsight = await requestAiInsight(firstName, weeklyData);
        var content = buildWrappedEmailContent(firstName, weeklyData, aiInsight);
        var sendResult = await sendWrappedEmailViaResend(email, content);

        if (!sendResult.ok) {
          failed += 1;
          continue;
        }

        var sentAt = new Date().toISOString();
        await db.collection("users").doc(userId).set({
          lastEmailSentAt: sentAt,
          lastEmailReportWeekKey: week.weekKey,
          preferences: {
            emailOptIn: true,
            lastEmailSentAt: sentAt
          }
        }, { merge: true });

        sent += 1;
      } catch (e) {
        failed += 1;
      }
    }

    console.info("sendWeeklyWrappedEmailAuto summary", {
      processed: processed,
      sent: sent,
      skipped: skipped,
      failed: failed,
      weekKey: week.weekKey
    });
  }
);
