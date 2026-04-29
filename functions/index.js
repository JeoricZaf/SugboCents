const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://sugbocents.web.app",
  "https://sugbocents.firebaseapp.com"
];

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

    var message = req.body.message;
    var history = Array.isArray(req.body.history) ? req.body.history : [];
    var systemPrompt = req.body.systemPrompt ||
      "You are Tigom, a friendly savings mascot for SugboCents, a Filipino budgeting app. " +
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
