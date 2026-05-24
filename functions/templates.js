const BASE_URL = "https://sugbocents.web.app";

const TEMPLATES = {
  "onboarding-activate": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">Hey ${vars.firstName || "there"} 👋</h1>
      <p style="margin:0 0 14px;color:#334155;line-height:1.6">Tigom noticed your budget is ready, but no expenses yet. Log your first one, even ₱20, and start your streak.</p>
      <a href="${BASE_URL}/dashboard.html" style="display:inline-block;background:#2b8259;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">Open SugboCents</a>
      <p style="margin:22px 0 0;color:#94a3b8;font-size:12px">— Tigom 🐾</p>
    </div>`,

  "streak-broken": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">Tigom is sad 🥲</h1>
      <p style="margin:0 0 14px;color:#334155;line-height:1.6">Your ${Number(vars.streakLength || 0)}-day streak ended. You can repair it in the shop before midnight.</p>
      <a href="${BASE_URL}/shop.html" style="display:inline-block;background:#2b8259;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">Repair my streak</a>
    </div>`,

  "budget-warning": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">⚠️ ${Number(vars.pct || 0)}% of your budget used</h1>
      <p style="margin:0 0 14px;color:#334155;line-height:1.6">Hi ${vars.firstName || "friend"}, quick heads up from Tigom. You are pacing fast this week.</p>
      <a href="${BASE_URL}/stats.html" style="display:inline-block;background:#2b8259;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">See breakdown</a>
    </div>`,

  "weekly-digest": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">Your week in ₱</h1>
      <p style="margin:0;color:#334155;line-height:1.6">You logged on ${Number(vars.dayCount || 0)}/7 days. Top category: <strong>${vars.topCategory || "Others"}</strong>. Total spent: ₱${Number(vars.totalSpent || 0)}.</p>
      <blockquote style="margin:12px 0 0;border-left:3px solid #2b8259;padding-left:12px;color:#334155">${vars.aiTip || "Small daily logs beat perfect weekly guesses."}</blockquote>
      <a href="${BASE_URL}/stats.html" style="display:inline-block;margin-top:14px;background:#2b8259;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">Open full stats</a>
    </div>`,

  "lapsed-d3": (vars) => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">We miss you, ${vars.firstName || "friend"} 🐾</h1>
      <p style="margin:0 0 14px;color:#334155;line-height:1.6">Tigom is staring at the door. Come back and log one expense today.</p>
      <a href="${BASE_URL}/dashboard.html" style="display:inline-block;background:#2b8259;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">Come back</a>
    </div>`,

  "lapsed-d7": () => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">Your sentimos are gathering dust</h1>
      <p style="margin:0;color:#334155;line-height:1.6">Come back and put them to work this week.</p>
    </div>`,

  "lapsed-d14": () => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">One last reminder</h1>
      <p style="margin:0;color:#334155;line-height:1.6">We will pause reminders soon if you stay inactive.</p>
    </div>`,

  "lapsed-d30": () => `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc">
      <h1 style="margin:0 0 10px;color:#164f33">Tigom's last letter</h1>
      <p style="margin:0;color:#334155;line-height:1.6">You can come back anytime. We will not nudge you again.</p>
    </div>`
};

function emailTemplate(name, vars) {
  const fn = TEMPLATES[name];
  if (!fn) {
    return `<p style="font-family:Arial,sans-serif;line-height:1.6;color:#334155">${(vars && vars.body) || "SugboCents update"}</p>`;
  }
  return fn(vars || {});
}

module.exports = { emailTemplate };
