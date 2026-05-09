const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

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
var RATE_LIMIT_MAX    = 30;    // chat: 30 req/hr per IP
var EMOJI_LIMIT_MAX   = 100;   // emojiSuggest: 100 req/hr per IP
var RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

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

// Periodically clean up stale IP entries to prevent memory leak
setInterval(function () {
  var now = Date.now();
  [ipRequestLog, emojiRequestLog].forEach(function (log) {
    Object.keys(log).forEach(function (ip) {
      log[ip] = (log[ip] || []).filter(function (t) {
        return now - t < RATE_LIMIT_WINDOW;
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
