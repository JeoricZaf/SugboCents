(function () {
  "use strict";

  var DEV_ADMIN_UIDS_FE = ["7SSc9kHJTKOOlP9Zgo7bpvge9UC3"];

  var state = {
    authorized: false,
    uid: "",
    callables: {},
    snapshot: null,
    db: null,
    gateChecked: false,
    logUnsub: null,
    refreshTimer: null,
    wired: false,
    flowBusy: false
  };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
      return;
    }
    fn();
  }

  ready(init);

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var el = byId(id);
    if (!el) { return; }
    el.textContent = value;
  }

  function formatBool(value) {
    return value ? "Yes" : "No";
  }

  function truncate(value, max) {
    var str = String(value || "");
    if (str.length <= max) { return str; }
    return str.slice(0, max) + "...";
  }

  function todayLocalKeyOffset(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + Number(offsetDays || 0));
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function statusClass(type) {
    if (type === "ok") { return "dev-status dev-status-ok"; }
    if (type === "pending") { return "dev-status dev-status-pending"; }
    return "dev-status dev-status-fail";
  }

  function setStatus(id, msg, type) {
    var el = byId(id);
    if (!el) { return; }
    el.textContent = msg;
    el.className = statusClass(type);
  }

  function showAccessDenied() {
    var app = byId("devApp");
    if (!app) { return; }
    console.warn("[DevTools] Access denied for uid:", state.uid || "unknown");
    app.innerHTML =
      '<div style="padding:3rem 1.5rem;text-align:center;max-width:480px;margin:0 auto">' +
        '<div style="font-size:2.5rem;margin-bottom:1rem">🔒</div>' +
        '<h2 style="font-weight:800;font-size:1.25rem;color:#164f33;margin-bottom:0.5rem">Access Denied</h2>' +
        '<p style="color:#617063;font-size:0.875rem">Dev Tools are restricted to authorized admins only.</p>' +
        '<a href="dashboard.html" style="display:inline-block;margin-top:1.5rem;padding:0.5rem 1.25rem;' +
          'background:#2b8259;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.875rem">' +
          'Go to Dashboard</a>' +
      '</div>';
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }
    if (typeof state.logUnsub === "function") {
      try { state.logUnsub(); } catch (_) {}
      state.logUnsub = null;
    }
  }

  function normalizeDeepLink(path) {
    var raw = String(path || "/dashboard.html").trim();
    if (!raw) { return "/dashboard.html"; }
    if (raw.charAt(0) !== "/") {
      return "/" + raw;
    }
    return raw;
  }

  function parseResultSummary(result) {
    if (!result) { return "No result"; }
    if (result.error) { return "Error: " + String(result.error); }
    if (result.skipped) { return "Skipped: " + String(result.skipped); }

    var pushSent = Number(result.push && result.push.sent || 0);
    var emailSent = Number(result.email && result.email.sent || 0);
    var pushReason = result.push && result.push.reason ? " (" + String(result.push.reason) + ")" : "";
    var emailReason = result.email && result.email.reason ? " (" + String(result.email.reason) + ")" : "";
    var detail = result.push && result.push.detail
      ? " [" + String(result.push.detail).slice(0, 80) + "]"
      : result.email && result.email.detail
        ? " [" + String(result.email.detail).slice(0, 80) + "]"
        : "";

    if (result.push !== undefined || result.email !== undefined) {
      return "Push sent=" + pushSent + pushReason + " | Email sent=" + emailSent + emailReason + detail;
    }
    if (result.reason) { return "Reason: " + String(result.reason); }
    if (result.patched !== undefined) { return result.patched ? "Patched." : "Not patched."; }
    return "Done";
  }

  function emitDevStateChanged(applied) {
    try {
      window.dispatchEvent(new CustomEvent("sugbocents:devStateChanged", {
        detail: { applied: applied || {} }
      }));
    } catch (_) {}
  }

  function setFlowStatus(lines) {
    var el = byId("devFlowStatus");
    if (!el) { return; }
    el.textContent = lines.join("\n");
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function safeJsonStringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_) {
      return "<non-serializable>";
    }
  }

  function describeCallableError(err) {
    if (!err) { return "unknown"; }

    var parts = [];
    if (err.code) {
      parts.push(String(err.code));
    }
    if (err.message) {
      parts.push(String(err.message));
    }
    if (err.details && typeof err.details === "object" && err.details.detail) {
      parts.push("detail=" + String(err.details.detail));
    }

    if (!parts.length) {
      return "unknown";
    }
    return parts.join(" | ");
  }

  function getCheck(id) {
    var el = byId(id);
    return !!(el && el.checked === true);
  }

  function getNumberInput(id, fallback) {
    var el = byId(id);
    if (!el) { return Number(fallback || 0); }
    var n = Number(el.value);
    if (!Number.isFinite(n)) {
      return Number(fallback || 0);
    }
    return n;
  }

  async function init() {
    var session = window.StorageAPI && window.StorageAPI.getSession
      ? window.StorageAPI.getSession()
      : null;
    var uid = session && session.userId ? String(session.userId) : "";
    state.uid = uid;
    if (!uid || DEV_ADMIN_UIDS_FE.indexOf(uid) === -1) {
      showAccessDenied();
      return;
    }

    if (!state.wired) {
      wireEvents();
      state.wired = true;
    }

    try {
      if (!window.FirebaseInit || !window.FirebaseInit.ready) {
        setStatus("devSnapshotStatus", "Firebase bootstrap unavailable in this context.", "fail");
        return;
      }

      await window.FirebaseInit.ready;
      if (!window.firebase || !window.firebase.auth || !window.firebase.functions) {
        setStatus("devSnapshotStatus", "Firebase SDK unavailable in this context.", "fail");
        return;
      }

      state.db = window.FirebaseInit.getDb ? window.FirebaseInit.getDb() : null;
      var functions = window.firebase.functions();
      var auth = window.firebase.auth();
      state.callables = {
        checkAccess: functions.httpsCallable("devCheckAccess"),
        sendTest: functions.httpsCallable("devSendTestNotification"),
        triggerPreset: functions.httpsCallable("devTriggerPresetState"),
        runCron: functions.httpsCallable("devRunCronForSelf"),
        resetCaps: functions.httpsCallable("devResetDailyCaps"),
        resetQuota: functions.httpsCallable("devResetEmailQuota"),
        clearInbox: functions.httpsCallable("devClearInbox"),
        markAllRead: functions.httpsCallable("devMarkAllInboxRead"),
        setState: functions.httpsCallable("devSetUserState"),
        clearLapsed: functions.httpsCallable("devClearLapsedStages"),
        simBrevoFail: functions.httpsCallable("devSimulateBrevoFailure"),
        snapshot: functions.httpsCallable("devGetSnapshot"),
        setQuestState: functions.httpsCallable("devSetQuestState"),
        setAchievementState: functions.httpsCallable("devSetAchievementState"),
        setSentimosState: functions.httpsCallable("devSetSentimosState"),
        seedLeaderboard: functions.httpsCallable("devSeedLeaderboard"),
        fullReset: functions.httpsCallable("devResetToFreshOnboarding")
      };

      var currentUser = auth && auth.currentUser ? auth.currentUser : null;
      if (currentUser && currentUser.uid) {
        state.uid = String(currentUser.uid);
        verifyAccess();
      }

      auth.onAuthStateChanged(function (user) {
        if (!user || !user.uid) {
          setStatus("devSnapshotStatus", "No active Firebase session. Sign in to run server actions.", "fail");
          return;
        }
        state.uid = String(user.uid);
        verifyAccess();
      });
    } catch (err) {
      setStatus("devSnapshotStatus", "Firebase init failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function verifyAccess() {
    if (!state.callables.snapshot) {
      setStatus("devSnapshotStatus", "Dev callables unavailable in this context.", "fail");
      return;
    }

    if (!state.uid) {
      showAccessDenied();
      return;
    }

    try {
      await state.callables.checkAccess();
      state.authorized = true;
      state.gateChecked = true;
      await refreshSnapshot();
      subscribeDevLog();
      startAutoRefresh();
    } catch (err) {
      showAccessDenied();
    }
  }

  function startAutoRefresh() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }

    state.refreshTimer = setInterval(function () {
      if (document.hidden) { return; }
      refreshSnapshot();
    }, 5000);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        refreshSnapshot();
      }
    });
  }

  function renderSnapshot(snapshot) {
    snapshot = snapshot || {};

    var uidDisplay = state.uid ? truncate(state.uid, 12) : "-";
    var prefs = snapshot.prefs || {};
    var tokens = Array.isArray(snapshot.fcmTokens) ? snapshot.fcmTokens : [];
    var todayLog = snapshot.notificationLogToday || {};
    var quota = snapshot.emailQuotaToday || {};

    setText("snapUid", uidDisplay);
    setText("snapEmailEnabled", formatBool(prefs.emailEnabled !== false));
    setText("snapPushEnabled", formatBool(prefs.pushEnabled === true));
    setText("snapPushSetupFailure", snapshot.pushSetupFailure ? ("Failed: " + snapshot.pushSetupFailure) : "OK");
    setText("snapFcmCount", String(tokens.length));
    setText("snapFcmPreview", tokens.length ? truncate(tokens[0].tokenIdPrefix || "", 16) : "-");
    setText("snapPushCount", String(Number(todayLog.pushCount || 0)));
    setText("snapEmailCount", String(Number(todayLog.emailCount || 0)));
    setText("snapEmailQuota", String(Number(quota.count || 0)) + " / 95");
    setText("snapStreak", String(Number(snapshot.currentStreak || 0)));
    setText("snapLastExpense", snapshot.lastExpenseDate || "-");
    setText("snapLastLogin", snapshot.lastLoginAt ? new Date(snapshot.lastLoginAt).toLocaleString("en-PH") : "-");

    var lapsed = snapshot.lapsedStagesSent || {};
    var lapsedKeys = Object.keys(lapsed);
    setText("snapLapsedStages", lapsedKeys.length ? lapsedKeys.join(", ") : "none");

    setText("snapUnread", String(Number(snapshot.inboxUnreadCount || 0)));

    var fg = window.NotificationsAPI && window.NotificationsAPI.isForegroundListenerWired
      ? window.NotificationsAPI.isForegroundListenerWired() === true
      : false;
    setText("snapFgListener", fg ? "wired" : "not wired");
    setText("snapBrevoFlag", snapshot.simulateBrevoFailureEnabled ? "enabled" : "disabled");

    var toggle = byId("devBrevoToggle");
    if (toggle) {
      toggle.checked = snapshot.simulateBrevoFailureEnabled === true;
    }
  }

  async function refreshSnapshot() {
    setStatus("devSnapshotStatus", "Refreshing snapshot...", "pending");
    try {
      var res = await state.callables.snapshot();
      state.snapshot = res && res.data ? res.data : {};
      renderSnapshot(state.snapshot);
      setStatus("devSnapshotStatus", "Snapshot updated.", "ok");
    } catch (err) {
      setStatus("devSnapshotStatus", "Snapshot failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  function wireEvents() {
    document.body.addEventListener("click", async function (event) {
      var btn = event.target.closest("button[data-action]");
      if (!btn) { return; }
      var action = String(btn.getAttribute("data-action") || "");

      try {
        if (action === "snapshot-refresh") {
          await refreshSnapshot();
          return;
        }
        if (action === "quick-push") {
          await sendQuick("push");
          return;
        }
        if (action === "quick-email") {
          await sendQuick("email");
          return;
        }
        if (action === "quick-both") {
          await sendQuick("both");
          return;
        }
        if (action === "preset") {
          await runPreset(String(btn.getAttribute("data-preset") || ""));
          return;
        }
        if (action === "cron") {
          var cronName = String(btn.getAttribute("data-cron") || "");
          var raw = String(btn.getAttribute("data-overrides") || "{}");
          var overrides = {};
          try { overrides = JSON.parse(raw); } catch (_) { overrides = {}; }
          await runCron(cronName, overrides);
          return;
        }

        if (action === "state-set-streak") {
          await setStreakState();
          return;
        }
        if (action === "state-set-last-login") {
          await setLastLoginState();
          return;
        }
        if (action === "state-set-budget") {
          await setBudgetState();
          return;
        }
        if (action === "state-set-xp") {
          await setXpState();
          return;
        }
        if (action === "state-reset-caps") {
          await runSimpleStateAction("devStateStatus", state.callables.resetCaps, "Caps reset.");
          return;
        }
        if (action === "state-reset-quota") {
          await runSimpleStateAction("devStateStatus", state.callables.resetQuota, "Email quota reset.");
          return;
        }
        if (action === "state-mark-read") {
          await runSimpleStateAction("devStateStatus", state.callables.markAllRead, "Inbox marked read.");
          return;
        }
        if (action === "state-clear-inbox") {
          if (!window.confirm("Clear all inbox notifications for your account?")) { return; }
          await runSimpleStateAction("devStateStatus", function () {
            return state.callables.clearInbox({ confirm: true });
          }, "Inbox cleared.");
          return;
        }
        if (action === "state-clear-lapsed") {
          await runSimpleStateAction("devStateStatus", state.callables.clearLapsed, "lapsedStagesSent cleared.");
          return;
        }
        if (action === "state-full-reset") {
          if (!window.confirm("FULL RESET: This will clear all gamification, expenses, notifications, achievements and quests for your account. This cannot be undone. Proceed?")) {
            return;
          }
          await runSimpleStateAction("devStateStatus", function () {
            return state.callables.fullReset({ confirm: true });
          }, "Full reset complete. Reload dashboard to confirm.");
          return;
        }

        if (action === "quest-activate") {
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({
              action: "activate",
              questId: "daily-first-log",
              target: 3,
              rewardXp: 30,
              rewardSentimos: 10
            });
          }, "Quest activated.");
          return;
        }
        if (action === "quest-progress") {
          var p = Math.max(0, Math.floor(Number((byId("devQuestProgressInput") || {}).value) || 1));
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({ action: "progress", progress: p });
          }, "Quest progress set to " + p + ".");
          return;
        }
        if (action === "quest-complete") {
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({ action: "complete" });
          }, "Quest marked complete.");
          return;
        }
        if (action === "quest-reset") {
          await runSimpleStateAction("devQuestStatus", function () {
            return state.callables.setQuestState({ action: "reset" });
          }, "Quest state reset.");
          return;
        }

        if (action === "badge-unlock") {
          var badgeId = String((byId("devBadgeIdInput") || {}).value || "").trim();
          if (!badgeId) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "unlock", badgeId: badgeId });
          }, "Badge unlocked: " + badgeId + ".");
          return;
        }
        if (action === "badge-set-progress") {
          var badgeId2 = String((byId("devBadgeIdInput") || {}).value || "").trim();
          var prog = Math.max(0, Math.floor(Number((byId("devBadgeProgressInput") || {}).value) || 0));
          if (!badgeId2) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "set-progress", badgeId: badgeId2, progress: prog });
          }, "Badge progress set.");
          return;
        }
        if (action === "badge-claim") {
          var badgeId3 = String((byId("devBadgeIdInput") || {}).value || "").trim();
          if (!badgeId3) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "claim", badgeId: badgeId3 });
          }, "Badge claimed: " + badgeId3 + ".");
          return;
        }
        if (action === "badge-reset") {
          var badgeId4 = String((byId("devBadgeIdInput") || {}).value || "").trim();
          if (!badgeId4) { setStatus("devAchievementStatus", "Enter a badge ID.", "fail"); return; }
          await runSimpleStateAction("devAchievementStatus", function () {
            return state.callables.setAchievementState({ action: "reset", badgeId: badgeId4 });
          }, "Badge reset: " + badgeId4 + ".");
          return;
        }

        if (action === "sentimos-set-balance") {
          var bal = Math.max(0, Math.floor(Number((byId("devSentimosInput") || {}).value) || 0));
          await runSimpleStateAction("devSentimosStatus", function () {
            return state.callables.setSentimosState({ action: "set-balance", amount: bal });
          }, "Sentimos set to " + bal + ".");
          return;
        }
        if (action === "sentimos-add-freeze") {
          await runSimpleStateAction("devSentimosStatus", function () {
            return state.callables.setSentimosState({ action: "add-freeze", charges: 1 });
          }, "Streak freeze +1 added.");
          return;
        }

        if (action === "leaderboard-seed") {
          await seedLeaderboardState();
          return;
        }

        if (action === "edge-send-five") {
          await sendFivePushesRapidly();
          return;
        }
        if (action === "edge-broken-deeplink") {
          await sendBrokenDeepLink();
          return;
        }

        if (action === "flow-a") {
          await runFlowA();
          return;
        }
        if (action === "flow-b") {
          await runFlowB();
          return;
        }
        if (action === "flow-c") {
          await runFlowC();
          return;
        }
        if (action === "flow-d") {
          await runFlowD();
          return;
        }

        if (action === "log-clear") {
          await clearMyDevLog();
          return;
        }
      } catch (err) {
        setStatus("devStateStatus", "Action failed: " + (err && err.message ? err.message : "unknown"), "fail");
      }
    });

    document.body.addEventListener("change", function (event) {
      var target = event.target;
      if (!target) { return; }
      if (target.id === "devBrevoToggle") {
        toggleBrevoSimulation(target.checked === true);
      }
    });
  }

  async function runSimpleStateAction(statusId, fn, doneLabel) {
    setStatus(statusId, "Working...", "pending");
    try {
      var res = await fn();
      var data = res && res.data ? res.data : res;
      setStatus(statusId, doneLabel + " " + parseResultSummary(data), "ok");
      emitDevStateChanged(data && data.applied ? data.applied : {});
      await refreshSnapshot();
    } catch (err) {
      setStatus(statusId, "Failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function sendQuick(channel) {
    var nowLabel = new Date().toLocaleTimeString("en-PH");
    var payload = {
      type: "dev-test-" + channel,
      channel: channel,
      title: channel === "email" ? "Dev test email" : "Dev test push",
      body: "Triggered " + nowLabel,
      deepLink: "/dashboard.html"
    };

    if (getCheck("devBypassCap")) {
      payload.bypassDailyCap = true;
    }
    if (getCheck("devBypassQuiet")) {
      payload.allowQuietHourException = true;
    }
    if (channel === "email" || channel === "both") {
      payload.subject = "Dev test email @ " + nowLabel;
    }

    var note = getCheck("devForceForeground")
      ? " (Foreground reminder: keep this tab focused.)"
      : "";

    setStatus("devQuickSendStatus", "Sending...", "pending");
    try {
      var res = await state.callables.sendTest(payload);
      setStatus("devQuickSendStatus", parseResultSummary(res.data) + note, "ok");
      await refreshSnapshot();
    } catch (err) {
      setStatus("devQuickSendStatus", "Send failed: " + describeCallableError(err), "fail");
    }
  }

  async function runPreset(preset) {
    if (!preset) {
      setStatus("devPresetsStatus", "Preset key missing.", "fail");
      return;
    }

    setStatus("devPresetsStatus", "Triggering preset " + preset + "...", "pending");
    try {
      var res = await state.callables.triggerPreset({ preset: preset });
      setStatus("devPresetsStatus", preset + ": " + parseResultSummary(res.data), "ok");
      await refreshSnapshot();
    } catch (err) {
      setStatus("devPresetsStatus", "Preset failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function runCron(cronName, overrides) {
    setStatus("devCronStatus", "Running " + cronName + "...", "pending");
    try {
      var res = await state.callables.runCron({ cronName: cronName, overrides: overrides || {} });
      setStatus("devCronStatus", cronName + ": " + parseResultSummary(res.data), "ok");
      await refreshSnapshot();
    } catch (err) {
      setStatus("devCronStatus", "Cron failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function setStreakState() {
    var streak = Math.max(0, Math.min(365, Math.floor(getNumberInput("devStreakInput", 0))));
    var patch = {
      currentStreak: streak,
      lastStreakLength: streak,
      lastExpenseDate: streak > 0 ? todayLocalKeyOffset(-1) : null,
      streakBrokenFlag: streak === 0
    };

    setStatus("devStateStatus", "Updating streak...", "pending");
    try {
      var res = await state.callables.setState({ patch: patch });
      setStatus("devStateStatus", "Streak updated. " + parseResultSummary(res.data), "ok");
      emitDevStateChanged(res && res.data && res.data.applied ? res.data.applied : patch);
      await refreshSnapshot();
    } catch (err) {
      setStatus("devStateStatus", "Set streak failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function setLastLoginState() {
    var daysAgo = Math.max(0, Math.floor(getNumberInput("devLastLoginDays", 0)));
    var d = new Date();
    d.setDate(d.getDate() - daysAgo);
    var patch = { lastLoginAt: d.toISOString() };

    setStatus("devStateStatus", "Updating lastLoginAt...", "pending");
    try {
      var res = await state.callables.setState({ patch: patch });
      setStatus("devStateStatus", "lastLoginAt updated. " + parseResultSummary(res.data), "ok");
      emitDevStateChanged(res && res.data && res.data.applied ? res.data.applied : patch);
      await refreshSnapshot();
    } catch (err) {
      setStatus("devStateStatus", "Set lastLoginAt failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function setBudgetState() {
    var budget = Math.max(0, getNumberInput("devBudgetInput", 0));
    var patch = { weeklyBudget: budget };

    setStatus("devStateStatus", "Updating weeklyBudget...", "pending");
    try {
      var res = await state.callables.setState({ patch: patch });
      setStatus("devStateStatus", "weeklyBudget updated. " + parseResultSummary(res.data), "ok");
      emitDevStateChanged(res && res.data && res.data.applied ? res.data.applied : patch);
      await refreshSnapshot();
    } catch (err) {
      setStatus("devStateStatus", "Set budget failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function setXpState() {
    var xp = Math.max(0, Math.min(99999, Math.floor(getNumberInput("devXpInput", 0))));
    var patch = { xp: xp };

    setStatus("devStateStatus", "Updating XP...", "pending");
    try {
      var res = await state.callables.setState({ patch: patch });
      setStatus("devStateStatus", "XP updated. " + parseResultSummary(res.data), "ok");
      emitDevStateChanged(res && res.data && res.data.applied ? res.data.applied : patch);
      await refreshSnapshot();
    } catch (err) {
      setStatus("devStateStatus", "Set XP failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function toggleBrevoSimulation(enabled) {
    setStatus("devEdgeStatus", "Updating Brevo simulation flag...", "pending");
    try {
      var res = await state.callables.simBrevoFail({ enabled: enabled === true });
      setStatus("devEdgeStatus", "Brevo simulation " + (enabled ? "enabled" : "disabled") + ". " + parseResultSummary(res.data), "ok");
      await refreshSnapshot();
    } catch (err) {
      setStatus("devEdgeStatus", "Toggle failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function seedLeaderboardState() {
    setStatus("devLeaderboardStatus", "Populating leaderboard test data...", "pending");
    try {
      var res = await state.callables.seedLeaderboard();
      var data = res && res.data ? res.data : {};
      var friendsCreated = Number(data.friendsCreated || 0);
      var feedEntriesCreated = Number(data.feedEntriesCreated || 0);
      setStatus(
        "devLeaderboardStatus",
        "Leaderboard populated. Fake friends=" + friendsCreated + ", feed entries=" + feedEntriesCreated + ".",
        "ok"
      );
      await refreshSnapshot();
    } catch (err) {
      setStatus("devLeaderboardStatus", "Populate failed: " + describeCallableError(err), "fail");
    }
  }

  async function sendFivePushesRapidly() {
    setStatus("devEdgeStatus", "Sending 5 pushes (serialized)...", "pending");
    var sent = 0;
    var blocked = 0;
    var reasons = [];
    for (var i = 0; i < 5; i++) {
      try {
        var res = await state.callables.sendTest({
          type: "dev-rapid-push",
          channel: "push",
          title: "Rapid push #" + (i + 1),
          body: "Burst test " + (i + 1),
          deepLink: "/dashboard.html",
          bypassDailyCap: false
        });
        var data = res && res.data ? res.data : {};
        var pushSent = Number(data.push && data.push.sent || 0);
        var pushReason = data.push && data.push.reason ? data.push.reason : (pushSent > 0 ? "ok" : "unknown");
        if (pushSent > 0) {
          sent += 1;
          reasons.push("#" + (i + 1) + ":ok");
        } else {
          blocked += 1;
          reasons.push("#" + (i + 1) + ":" + pushReason);
        }
      } catch (_) {
        blocked += 1;
        reasons.push("#" + (i + 1) + ":error");
      }
    }

    setStatus("devEdgeStatus", "Rapid send done. delivered=" + sent + ", blocked=" + blocked + " | " + reasons.join(", "), "ok");
    await refreshSnapshot();
  }

  async function sendBrokenDeepLink() {
    setStatus("devEdgeStatus", "Sending broken deep-link push...", "pending");
    try {
      var res = await state.callables.sendTest({
        type: "dev-broken-deeplink",
        channel: "push",
        title: "Broken deep-link test",
        body: "Tap to test fallback handling.",
        deepLink: normalizeDeepLink("/this-route-does-not-exist.html")
      });
      setStatus("devEdgeStatus", "Broken deep-link push sent. " + parseResultSummary(res.data), "ok");
      await refreshSnapshot();
    } catch (err) {
      setStatus("devEdgeStatus", "Broken deep-link test failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }

  async function runFlow(steps) {
    if (state.flowBusy) {
      setFlowStatus(["A flow is already running. Wait for it to finish."]);
      return;
    }

    state.flowBusy = true;
    var started = Date.now();
    var lines = [];

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      lines.push("... " + step.label);
      setFlowStatus(lines);

      try {
        var result = await step.run();
        lines[lines.length - 1] = "OK  " + step.label + " :: " + parseResultSummary(result);
      } catch (err) {
        lines[lines.length - 1] = "FAIL " + step.label + " :: " + (err && err.message ? err.message : "unknown");
        lines.push("Flow stopped.");
        break;
      }

      setFlowStatus(lines);
      if (step.waitMs) {
        await sleep(step.waitMs);
      }
    }

    lines.push("Elapsed: " + (Date.now() - started) + " ms");
    setFlowStatus(lines);
    state.flowBusy = false;
    await refreshSnapshot();
  }

  async function runFlowA() {
    await runFlow([
      {
        label: "Clear inbox",
        run: function () { return state.callables.clearInbox({ confirm: true }).then(function (r) { return r.data; }); }
      },
      {
        label: "Reset daily caps",
        run: function () { return state.callables.resetCaps().then(function (r) { return r.data; }); }
      },
      {
        label: "Trigger onboarding-welcome",
        run: function () { return state.callables.triggerPreset({ preset: "onboarding-welcome" }).then(function (r) { return r.data; }); },
        waitMs: 3000
      },
      {
        label: "Trigger onboarding-activate-d1",
        run: function () { return state.callables.triggerPreset({ preset: "onboarding-activate-d1" }).then(function (r) { return r.data; }); }
      }
    ]);
  }

  async function runFlowB() {
    await runFlow([
      {
        label: "Set streak=5 and lastExpenseDate=yesterday",
        run: function () {
          return state.callables.setState({ patch: {
            currentStreak: 5,
            lastStreakLength: 5,
            lastExpenseDate: todayLocalKeyOffset(-1)
          } }).then(function (r) { return r.data; });
        }
      },
      {
        label: "Reset daily caps",
        run: function () { return state.callables.resetCaps().then(function (r) { return r.data; }); }
      },
      {
        label: "Trigger streak-at-risk-soft",
        run: function () { return state.callables.triggerPreset({ preset: "streak-at-risk-soft" }).then(function (r) { return r.data; }); },
        waitMs: 4000
      },
      {
        label: "Trigger streak-at-risk-last",
        run: function () { return state.callables.triggerPreset({ preset: "streak-at-risk-last" }).then(function (r) { return r.data; }); },
        waitMs: 4000
      },
      {
        label: "Trigger streak-broken",
        run: function () { return state.callables.triggerPreset({ preset: "streak-broken" }).then(function (r) { return r.data; }); }
      }
    ]);
  }

  async function runFlowC() {
    await runFlow([
      {
        label: "Set weeklyBudget=1000",
        run: function () { return state.callables.setState({ patch: { weeklyBudget: 1000 } }).then(function (r) { return r.data; }); }
      },
      {
        label: "Reset daily caps",
        run: function () { return state.callables.resetCaps().then(function (r) { return r.data; }); }
      },
      {
        label: "Trigger budget-warning",
        run: function () { return state.callables.triggerPreset({ preset: "budget-warning" }).then(function (r) { return r.data; }); },
        waitMs: 4000
      },
      {
        label: "Trigger budget-exceeded",
        run: function () { return state.callables.triggerPreset({ preset: "budget-exceeded" }).then(function (r) { return r.data; }); }
      }
    ]);
  }

  async function runFlowD() {
    await runFlow([
      {
        label: "Reset email quota",
        run: function () { return state.callables.resetQuota().then(function (r) { return r.data; }); }
      },
      {
        label: "Trigger weekly-digest",
        run: function () { return state.callables.triggerPreset({ preset: "weekly-digest" }).then(function (r) { return r.data; }); }
      },
      {
        label: "Poll inbox for weekly-digest doc (up to 20s)",
        run: async function () {
          if (!window.NotificationsAPI || !window.NotificationsAPI.getRecentInbox) {
            return { skipped: "NotificationsAPI unavailable" };
          }
          var lastItems = [];
          for (var i = 0; i < 20; i++) {
            lastItems = await window.NotificationsAPI.getRecentInbox(20);
            var found = (lastItems || []).some(function (it) {
              return String(it.type || "") === "weekly-digest";
            });
            if (found) {
              return { ok: true, found: true, attempts: i + 1 };
            }
            await sleep(1000);
          }
          var types = (lastItems || []).slice(0, 5).map(function (it) {
            return String(it.type || "?");
          });
          return {
            ok: false,
            found: false,
            inboxSize: (lastItems || []).length,
            recentTypes: types.join(",")
          };
        }
      }
    ]);
  }

  function subscribeDevLog() {
    if (!state.db || !state.uid || state.logUnsub) {
      return;
    }

    try {
      state.logUnsub = state.db.collection("devLog")
        .where("uid", "==", state.uid)
        .orderBy("ts", "desc")
        .limit(30)
        .onSnapshot(function (snap) {
          renderDevLog(snap.docs || []);
        }, function () {
          renderDevLog([]);
        });
    } catch (_) {
      renderDevLog([]);
    }
  }

  function renderDevLog(docs) {
    var list = byId("devLogList");
    if (!list) { return; }
    list.innerHTML = "";

    if (!docs || !docs.length) {
      var empty = document.createElement("div");
      empty.className = "dev-log-entry";
      empty.textContent = "No dev log entries yet.";
      list.appendChild(empty);
      return;
    }

    docs.forEach(function (doc) {
      var data = doc.data ? (doc.data() || {}) : {};
      var wrap = document.createElement("div");
      wrap.className = "dev-log-entry";

      var head = document.createElement("div");
      head.className = "dev-log-head";

      var action = document.createElement("span");
      action.textContent = String(data.action || "unknown-action");
      head.appendChild(action);

      var ts = document.createElement("span");
      ts.className = "dev-log-meta";
      var tsDate = data.ts && data.ts.toDate ? data.ts.toDate() : null;
      ts.textContent = tsDate ? tsDate.toLocaleString("en-PH") : "pending";
      head.appendChild(ts);

      wrap.appendChild(head);

      var details = document.createElement("details");
      var summary = document.createElement("summary");
      summary.className = "dev-log-meta";
      summary.textContent = "details";
      details.appendChild(summary);

      var pre = document.createElement("pre");
      pre.className = "dev-json";
      pre.textContent = safeJsonStringify(data.details || {});
      details.appendChild(pre);

      wrap.appendChild(details);
      list.appendChild(wrap);
    });
  }

  async function clearMyDevLog() {
    if (!state.db || !state.uid) {
      setStatus("devStateStatus", "Dev log unavailable in this context.", "fail");
      return;
    }
    if (!window.confirm("Delete your dev log entries?")) {
      return;
    }

    setStatus("devStateStatus", "Clearing dev log...", "pending");
    try {
      var total = 0;
      while (true) {
        var snap = await state.db.collection("devLog")
          .where("uid", "==", state.uid)
          .limit(200)
          .get();

        if (!snap || snap.empty) {
          break;
        }

        var batch = state.db.batch();
        snap.docs.forEach(function (doc) {
          batch.delete(doc.ref);
          total += 1;
        });
        await batch.commit();

        if (snap.size < 200) {
          break;
        }
      }

      setStatus("devStateStatus", "Dev log cleared: " + total + " deleted.", "ok");
    } catch (err) {
      setStatus("devStateStatus", "Clear dev log failed: " + (err && err.message ? err.message : "unknown"), "fail");
    }
  }
})();
