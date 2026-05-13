(function () {
  function isFirestoreEnabled() {
    return Boolean(
      window.FirebaseInit &&
      window.FirebaseInit.isFirebaseMode &&
      window.FirebaseInit.isFirebaseMode() &&
      window.FirebaseInit.getDb &&
      window.FirebaseInit.getDb()
    );
  }

  async function getUserDoc(userId) {
    if (!isFirestoreEnabled()) {
      return null;
    }

    try {
      var db = window.FirebaseInit.getDb();
      var doc = await db.collection("users").doc(userId).get();
      return doc.exists ? doc.data() : null;
    } catch (e) {
      console.warn("[FirestoreService] getUserDoc error:", e);
      return null;
    }
  }

  async function setUserDoc(userId, data) {
    if (!isFirestoreEnabled()) {
      return;
    }

    try {
      var db = window.FirebaseInit.getDb();
      await db.collection("users").doc(userId).set(data, { merge: true });
    } catch (e) {
      console.error("[FirestoreService] setUserDoc error — user data may not be saved to cloud:", e);
    }
  }

  async function addExpenseDoc(userId, expense) {
    if (!isFirestoreEnabled()) {
      return;
    }

    try {
      var db = window.FirebaseInit.getDb();
      await db
        .collection("users")
        .doc(userId)
        .collection("expenses")
        .doc(expense.id)
        .set(expense);
    } catch (e) {
      console.error("[FirestoreService] addExpenseDoc error — expense may not be persisted to cloud:", e);
    }
  }

  async function getExpenseDocs(userId) {
    if (!isFirestoreEnabled()) {
      return [];
    }

    try {
      var db = window.FirebaseInit.getDb();
      var snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("expenses")
        .orderBy("timestamp", "desc")
        .get();
      return snapshot.docs.map(function (doc) {
        return doc.data();
      });
    } catch (e) {
      console.warn("[FirestoreService] getExpenseDocs error:", e);
      return [];
    }
  }

  async function clearExpenseDocs(userId) {
    if (!isFirestoreEnabled()) {
      return;
    }

    try {
      var db = window.FirebaseInit.getDb();
      var snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("expenses")
        .get();
      var batch = db.batch();
      snapshot.docs.forEach(function (doc) {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (e) {
      console.warn("[FirestoreService] clearExpenseDocs error:", e);
    }
  }

  async function deleteExpenseDoc(userId, expenseId) {
    if (!isFirestoreEnabled()) {
      return;
    }

    try {
      var db = window.FirebaseInit.getDb();
      await db
        .collection("users")
        .doc(userId)
        .collection("expenses")
        .doc(expenseId)
        .delete();
    } catch (e) {
      console.error("[FirestoreService] deleteExpenseDoc error:", e);
    }
  }

  async function setQuickAddItems(userId, items) {
    if (!isFirestoreEnabled()) {
      return;
    }

    try {
      var db = window.FirebaseInit.getDb();
      await db.collection("users").doc(userId).set({ quickAddItems: items }, { merge: true });
    } catch (e) {
      console.error("[FirestoreService] setQuickAddItems error:", e);
    }
  }

  async function getQuickAddItemDocs(userId) {
    if (!isFirestoreEnabled()) {
      return null;
    }

    try {
      var db = window.FirebaseInit.getDb();
      var doc = await db.collection("users").doc(userId).get();
      if (!doc.exists) {
        return null;
      }
      var data = doc.data();
      return Array.isArray(data.quickAddItems) ? data.quickAddItems : null;
    } catch (e) {
      console.warn("[FirestoreService] getQuickAddItemDocs error:", e);
      return null;
    }
  }

  // ── Public Profile ────────────────────────────────────────────

  async function syncPublicProfile(userId, user) {
    if (!isFirestoreEnabled() || !userId || !user) { return; }
    try {
      var db = window.FirebaseInit.getDb();
      var firstName = String(user.firstName || "").trim();
      var lastName  = String(user.lastName  || "").trim();
      var lastInitial = lastName ? lastName.charAt(0).toUpperCase() + "." : "";
      var displayName = [firstName, lastInitial].filter(Boolean).join(" ") || "Anonymous";

      var now = new Date();
      var dayOfWeek = now.getDay();
      var weekMondayKey = (function () {
        var d = new Date(now);
        d.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
        d.setHours(0, 0, 0, 0);
        return d.getFullYear() + "-" +
          String(d.getMonth() + 1).padStart(2, "0") + "-" +
          String(d.getDate()).padStart(2, "0");
      }());
      if (!user.weeklyXpStartDate || user.weeklyXpStartDate !== weekMondayKey) {
        user.weeklyXpStart = user.xp || 0;
        user.weeklyXpStartDate = weekMondayKey;
      }
      var weeklyXP = Math.max(0, (user.xp || 0) - (user.weeklyXpStart || 0));
      var weeklyQuestsCompleted = Number(user.weeklyQuestsCompleted || 0);
      if (Array.isArray(user.questHistory)) {
        var monday = new Date(weekMondayKey + "T00:00:00");
        var nextMonday = new Date(monday);
        nextMonday.setDate(nextMonday.getDate() + 7);
        weeklyQuestsCompleted = user.questHistory.reduce(function (count, q) {
          if (!q || !q.completedAt) { return count; }
          var d = new Date(q.completedAt);
          return (d >= monday && d < nextMonday) ? count + 1 : count;
        }, 0);
      }

      await db.collection("users").doc(userId).set({
        publicProfile: {
          displayName:      displayName,
          firstName:        firstName,
          streak:           Number(user.streak || 0),
          questsCompleted:  Number(user.questsCompleted || 0),
          weeklyQuestsCompleted: Number(weeklyQuestsCompleted || 0),
          weeklyXP:         weeklyXP,
          weekMondayKey:    weekMondayKey,
          level:            Number(user.level || 1),
          levelName:        String(user.levelName || "Rookie Saver"),
          friendCode:       user.friendCode ? String(user.friendCode) : undefined,
          lastSyncedAt:     new Date().toISOString()
        }
      }, { merge: true });

      // Invalidate cached profile in every friend's doc so their next getFriends()
      // re-fetches fresh data. Process all friends in commit-safe chunks.
      var friendsSnap = await db.collection("friends").doc(userId)
        .collection("friends").get().catch(function () { return null; });
      if (friendsSnap && !friendsSnap.empty) {
        var profilePayload = {
          displayName:     displayName,
          firstName:       firstName,
          streak:          Number(user.streak || 0),
          questsCompleted: Number(user.questsCompleted || 0),
          weeklyQuestsCompleted: Number(weeklyQuestsCompleted || 0),
          weeklyXP:        weeklyXP,
          weekMondayKey:   weekMondayKey,
          level:           Number(user.level || 1),
          levelName:       String(user.levelName || "Rookie Saver"),
          lastSyncedAt:    new Date().toISOString()
        };

        var docs = friendsSnap.docs;
        var chunkSize = 400;
        for (var i = 0; i < docs.length; i += chunkSize) {
          var batch = db.batch();
          docs.slice(i, i + chunkSize).forEach(function (doc) {
            batch.set(
              db.collection("friends").doc(doc.id).collection("friends").doc(userId),
              { publicProfile: profilePayload },
              { merge: true }
            );
          });
          await batch.commit().catch(function () {}); // non-critical
        }
      }
    } catch (e) {
      console.warn("[FirestoreService] syncPublicProfile error:", e);
    }
  }

  async function getPublicProfile(userId) {
    if (!isFirestoreEnabled() || !userId) { return null; }
    try {
      var db = window.FirebaseInit.getDb();
      var doc = await db.collection("users").doc(userId).get();
      if (!doc.exists) { return null; }
      var data = doc.data();
      return data.publicProfile || null;
    } catch (e) {
      console.warn("[FirestoreService] getPublicProfile error:", e);
      return null;
    }
  }

  function getFriendCacheKey(userId) {
    return "sugbocents_friend_cache_" + String(userId || "");
  }

  function normalizePublicProfile(profile, fallbackDisplayName) {
    var safe = profile || {};
    var displayName = String(safe.displayName || fallbackDisplayName || "Friend");
    var now = new Date();
    var dayOfWeek = now.getDay();
    var monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    var currentWeekKey = monday.getFullYear() + "-" +
      String(monday.getMonth() + 1).padStart(2, "0") + "-" +
      String(monday.getDate()).padStart(2, "0");

    var profileWeekKey = String(safe.weekMondayKey || "");
    var weeklyXP = Number(safe.weeklyXP || 0);
    var weeklyQuestsCompleted = Number(safe.weeklyQuestsCompleted || 0);

    if (profileWeekKey && profileWeekKey !== currentWeekKey) {
      weeklyXP = 0;
      weeklyQuestsCompleted = 0;
    }

    return {
      displayName: displayName,
      firstName: String(safe.firstName || ""),
      streak: Number(safe.streak || 0),
      questsCompleted: Number(safe.questsCompleted || 0),
      weeklyQuestsCompleted: weeklyQuestsCompleted,
      weeklyXP: weeklyXP,
      weekMondayKey: profileWeekKey || currentWeekKey,
      level: Number(safe.level || 1),
      levelName: String(safe.levelName || "Rookie Saver"),
      lastSyncedAt: safe.lastSyncedAt ? String(safe.lastSyncedAt) : null
    };
  }

  // ── Friends ───────────────────────────────────────────────────

  async function sendFriendRequest(myUserId, targetUserId, myDisplayName) {
    if (!isFirestoreEnabled() || !myUserId || !targetUserId) { return { ok: false, error: "Missing IDs" }; }
    if (myUserId === targetUserId) { return { ok: false, error: "Cannot friend yourself" }; }
    try {
      var db = window.FirebaseInit.getDb();
      // Check target user exists
      var targetDoc = await db.collection("users").doc(targetUserId).get();
      if (!targetDoc.exists) { return { ok: false, error: "User not found" }; }
      // Check already friends
      var existing = await db.collection("friends").doc(targetUserId)
        .collection("friends").doc(myUserId).get();
      if (existing.exists) { return { ok: false, error: "Already friends" }; }
      // Write request
      await db.collection("friends").doc(targetUserId)
        .collection("requests").doc(myUserId).set({
          sentAt:      new Date().toISOString(),
          displayName: String(myDisplayName || "")
        });
      return { ok: true };
    } catch (e) {
      console.error("[FirestoreService] sendFriendRequest error:", e);
      return { ok: false, error: e.message };
    }
  }

  async function acceptFriendRequest(myUserId, requesterId, requesterDisplayName, myDisplayName) {
    if (!isFirestoreEnabled() || !myUserId || !requesterId) { return { ok: false }; }
    try {
      var db = window.FirebaseInit.getDb();
      // Fetch both public profiles so every getFriends() call is cache-hit from day 1
      var myProfile    = await getPublicProfile(myUserId).catch(function () { return null; });
      var theirProfile = await getPublicProfile(requesterId).catch(function () { return null; });
      var now = new Date().toISOString();
      var batch = db.batch();
      // Add requester to my friends (embed their publicProfile)
      batch.set(
        db.collection("friends").doc(myUserId).collection("friends").doc(requesterId),
        {
          addedAt: now,
          displayName: String(requesterDisplayName || ""),
          publicProfile: theirProfile || { displayName: String(requesterDisplayName || ""), lastSyncedAt: now }
        }
      );
      // Add me to requester's friends (embed my publicProfile)
      batch.set(
        db.collection("friends").doc(requesterId).collection("friends").doc(myUserId),
        {
          addedAt: now,
          displayName: String(myDisplayName || ""),
          publicProfile: myProfile || { displayName: String(myDisplayName || ""), lastSyncedAt: now }
        }
      );
      // Delete the request
      batch.delete(
        db.collection("friends").doc(myUserId).collection("requests").doc(requesterId)
      );
      await batch.commit();
      return { ok: true };
    } catch (e) {
      console.error("[FirestoreService] acceptFriendRequest error:", e);
      return { ok: false, error: e.message };
    }
  }

  async function declineFriendRequest(myUserId, requesterId) {
    if (!isFirestoreEnabled() || !myUserId || !requesterId) { return { ok: false }; }
    try {
      var db = window.FirebaseInit.getDb();
      await db.collection("friends").doc(myUserId)
        .collection("requests").doc(requesterId).delete();
      return { ok: true };
    } catch (e) {
      console.error("[FirestoreService] declineFriendRequest error:", e);
      return { ok: false, error: e.message };
    }
  }

  async function getFriends(userId) {
    if (!isFirestoreEnabled() || !userId) { return []; }
    try {
      var db = window.FirebaseInit.getDb();
      var snapshot = await db.collection("friends").doc(userId)
        .collection("friends").get();
      if (snapshot.empty) { return []; }

      var results = [];
      var friendDocs = snapshot.docs.map(function (doc) {
        var data = doc.data() || {};
        return {
          uid: doc.id,
          cachedDisplayName: data.displayName || (data.publicProfile && data.publicProfile.displayName) || "Friend"
        };
      });

      // Ranking-critical fields must come from users/{uid}.publicProfile.
      var profilePromises = friendDocs.map(function (friendDoc) {
        return getPublicProfile(friendDoc.uid)
          .then(function (profile) {
            var normalized = normalizePublicProfile(profile, friendDoc.cachedDisplayName);
            return Object.assign({ uid: friendDoc.uid }, normalized);
          })
          .catch(function () {
            return Object.assign({ uid: friendDoc.uid }, normalizePublicProfile(null, friendDoc.cachedDisplayName));
          });
      });

      results = await Promise.all(profilePromises);

      // Backfill cache using normalized live profiles.
      results.forEach(function (friendProfile) {
        db.collection("friends").doc(userId)
          .collection("friends").doc(friendProfile.uid)
          .set({ publicProfile: normalizePublicProfile(friendProfile, friendProfile.displayName) }, { merge: true })
          .catch(function () {});
      });

      // Cache resolved friend UIDs in localStorage so addExpense can build
      // the global_feed audience array without a round-trip read.
      try {
        var uids = results.map(function (f) { return f.uid; });
        localStorage.setItem(getFriendCacheKey(userId), JSON.stringify(uids));
      } catch (_) {}

      return results;
    } catch (e) {
      console.warn("[FirestoreService] getFriends error:", e);
      return [];
    }
  }

  async function getFriendRequests(userId) {
    if (!isFirestoreEnabled() || !userId) { return []; }
    try {
      var db = window.FirebaseInit.getDb();
      var snapshot = await db.collection("friends").doc(userId)
        .collection("requests").orderBy("sentAt", "desc").get();
      return snapshot.docs.map(function (doc) {
        return Object.assign({ uid: doc.id }, doc.data());
      });
    } catch (e) {
      console.warn("[FirestoreService] getFriendRequests error:", e);
      return [];
    }
  }

  async function getFriendStatus(myUserId, otherUserId) {
    if (!isFirestoreEnabled() || !myUserId || !otherUserId) { return "none"; }
    try {
      var db = window.FirebaseInit.getDb();
      var friendDoc = await db.collection("friends").doc(myUserId)
        .collection("friends").doc(otherUserId).get();
      if (friendDoc.exists) { return "friend"; }
      var sentDoc = await db.collection("friends").doc(otherUserId)
        .collection("requests").doc(myUserId).get();
      if (sentDoc.exists) { return "pending_sent"; }
      var receivedDoc = await db.collection("friends").doc(myUserId)
        .collection("requests").doc(otherUserId).get();
      if (receivedDoc.exists) { return "pending_received"; }
      return "none";
    } catch (e) {
      console.warn("[FirestoreService] getFriendStatus error:", e);
      return "none";
    }
  }

  async function removeFriend(myUserId, friendId) {
    if (!isFirestoreEnabled() || !myUserId || !friendId) { return { ok: false }; }
    try {
      var db = window.FirebaseInit.getDb();
      var batch = db.batch();
      batch.delete(db.collection("friends").doc(myUserId).collection("friends").doc(friendId));
      batch.delete(db.collection("friends").doc(friendId).collection("friends").doc(myUserId));
      await batch.commit();
      return { ok: true };
    } catch (e) {
      console.error("[FirestoreService] removeFriend error:", e);
      return { ok: false, error: e.message };
    }
  }

  // ── Live Feed ─────────────────────────────────────────────────

  // Write one activity entry to the current user's feed collection.
  // Called when an expense is logged, a quest completes, etc.
  async function writeFeedEntry(userId, entry) {
    if (!isFirestoreEnabled() || !userId || !entry) { return; }
    try {
      var db = window.FirebaseInit.getDb();
      await db.collection("feed").doc(userId).collection("entries").add({
        type:          String(entry.type   || "activity"),
        message:       String(entry.message || "").slice(0, 120),
        emoji:         String(entry.emoji  || "📊"),
        authorName:    String(entry.authorName || ""),
        authorInitial: String(entry.authorInitial || "?"),
        timestamp:     new Date().toISOString()
      });
    } catch (e) {
      // Feed writes are non-critical — swallow silently
    }
  }

  // Write one activity entry to the global_feed collection with an audience array.
  // One document per activity; audience = [authorUid, ...friendUids] read from cache.
  // Read path: single array-contains query instead of N per-friend reads.
  // REQUIRES Firestore composite index: audience (ARRAY_CONTAINS), timestamp (DESC)
  async function writeGlobalFeedEntry(userId, entry) {
    if (!isFirestoreEnabled() || !userId || !entry) { return; }
    try {
      var db = window.FirebaseInit.getDb();
      // Build audience from a user-scoped friend UID cache populated by getFriends().
      var friendUids;
      try { friendUids = JSON.parse(localStorage.getItem(getFriendCacheKey(userId)) || "[]"); }
      catch (_) { friendUids = []; }
      if (!Array.isArray(friendUids)) { friendUids = []; }

      // Fallback: if cache is empty, fetch current friend IDs once.
      if (friendUids.length === 0) {
        try {
          var friendSnap = await db.collection("friends").doc(userId)
            .collection("friends").get();
          friendUids = friendSnap.docs.map(function (doc) { return doc.id; });
          localStorage.setItem(getFriendCacheKey(userId), JSON.stringify(friendUids));
        } catch (_) {
          friendUids = [];
        }
      }

      var audience = [userId].concat(friendUids);
      await db.collection("global_feed").add({
        type:          String(entry.type   || "activity"),
        message:       String(entry.message || "").slice(0, 120),
        emoji:         String(entry.emoji  || "📊"),
        authorName:    String(entry.authorName || ""),
        authorInitial: String(entry.authorInitial || "?"),
        authorUid:     String(userId),
        audience:      audience,
        timestamp:     new Date().toISOString()
      });
    } catch (e) {
      // Feed writes are non-critical — swallow silently
    }
  }

  // Read the latest feed entries visible to myUid using a single query.
  // Replaces getFriendsFeedEntries() N-read pattern.
  async function getMyFeedEntries(myUid, limit) {
    if (!isFirestoreEnabled() || !myUid) { return []; }
    limit = limit || 15;
    try {
      var db = window.FirebaseInit.getDb();
      var snapshot = await db.collection("global_feed")
        .where("audience", "array-contains", myUid)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map(function (d) { return d.data(); });
    } catch (e) {
      // Most likely cause: missing composite index on global_feed (audience + timestamp).
      // Log the error so developers can see the Firestore index creation URL in the console.
      if (e && e.message && e.message.indexOf("index") !== -1) {
        console.warn(
          "[FirestoreService] getMyFeedEntries — missing Firestore composite index.\n" +
          "Create it at: https://console.firebase.google.com/project/_/firestore/indexes\n" +
          "Collection: global_feed | Fields: audience (Arrays), timestamp (Descending)\n",
          e
        );
      } else {
        console.warn("[FirestoreService] getMyFeedEntries error:", e);
      }
      // Fallback: read just the current user's own per-user feed entries
      try {
        var db2 = window.FirebaseInit.getDb();
        var fallbackSnap = await db2.collection("feed").doc(myUid)
          .collection("entries")
          .orderBy("timestamp", "desc")
          .limit(limit)
          .get();
        return fallbackSnap.docs.map(function (d) { return d.data(); });
      } catch (e2) {
        return [];
      }
    }
  }

  // Read the latest feed entries from a list of friend UIDs (legacy N-read fallback).
  // Returns up to `limit` entries sorted newest-first.
  async function getFriendsFeedEntries(friendUids, limit) {
    if (!isFirestoreEnabled() || !friendUids || !friendUids.length) { return []; }
    limit = limit || 20;
    try {
      var db = window.FirebaseInit.getDb();
      var cap = Math.min(friendUids.length, 20); // safety cap
      var perFriend = Math.max(2, Math.ceil(limit / cap));

      var promises = friendUids.slice(0, cap).map(function (fId) {
        return db.collection("feed").doc(fId).collection("entries")
          .orderBy("timestamp", "desc")
          .limit(perFriend)
          .get()
          .then(function (snap) {
            return snap.docs.map(function (d) {
              return Object.assign({ authorId: fId }, d.data());
            });
          })
          .catch(function () { return []; });
      });

      var all = await Promise.all(promises);
      var flat = [].concat.apply([], all);
      flat.sort(function (a, b) {
        return (b.timestamp || "").localeCompare(a.timestamp || "");
      });
      return flat.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  // ── Friend Shortcodes ─────────────────────────────────────────

  // Claim a NAME#NNNN code: writes to friendCodes/{code} and users/{uid}.publicProfile.friendCode
  // Handles single-retry on collision.
  async function claimFriendCode(userId, code) {
    if (!isFirestoreEnabled() || !userId || !code) { return { ok: false }; }
    var normalizedCode = String(code).toLowerCase().replace(/\s/g, "");
    try {
      var db = window.FirebaseInit.getDb();
      var existing = await db.collection("friendCodes").doc(normalizedCode).get();
      if (existing.exists && existing.data().uid !== userId) {
        // Collision — try a new 4-digit suffix once
        var parts = normalizedCode.split("#");
        if (parts.length === 2) {
          normalizedCode = parts[0] + "#" + String(1000 + Math.floor(Math.random() * 9000));
          var retry = await db.collection("friendCodes").doc(normalizedCode).get();
          if (retry.exists && retry.data().uid !== userId) {
            return { ok: false, error: "code_taken" };
          }
        }
      }
      var batch = db.batch();
      batch.set(
        db.collection("friendCodes").doc(normalizedCode),
        { uid: userId, createdAt: new Date().toISOString() }
      );
      batch.set(
        db.collection("users").doc(userId),
        { publicProfile: { friendCode: normalizedCode } },
        { merge: true }
      );
      await batch.commit();
      return { ok: true, code: normalizedCode };
    } catch (e) {
      console.warn("[FirestoreService] claimFriendCode error:", e);
      return { ok: false, error: e.message };
    }
  }

  // Resolve a NAME#NNNN code to { uid, profile }. Returns null if not found.
  async function findUserByCode(code) {
    if (!isFirestoreEnabled() || !code) { return null; }
    var normalizedCode = String(code).toLowerCase().replace(/\s/g, "");
    try {
      var db = window.FirebaseInit.getDb();
      var codeDoc = await db.collection("friendCodes").doc(normalizedCode).get();
      if (!codeDoc.exists) { return null; }
      var uid = codeDoc.data().uid;
      var profile = await getPublicProfile(uid);
      return { uid: uid, profile: profile };
    } catch (e) {
      console.warn("[FirestoreService] findUserByCode error:", e);
      return null;
    }
  }

  window.FirestoreService = {
    getUserDoc:              getUserDoc,
    setUserDoc:              setUserDoc,
    addExpenseDoc:           addExpenseDoc,
    getExpenseDocs:          getExpenseDocs,
    clearExpenseDocs:        clearExpenseDocs,
    deleteExpenseDoc:        deleteExpenseDoc,
    setQuickAddItems:        setQuickAddItems,
    getQuickAddItemDocs:     getQuickAddItemDocs,
    syncPublicProfile:       syncPublicProfile,
    getPublicProfile:        getPublicProfile,
    sendFriendRequest:       sendFriendRequest,
    acceptFriendRequest:     acceptFriendRequest,
    declineFriendRequest:    declineFriendRequest,
    getFriends:              getFriends,
    getFriendRequests:       getFriendRequests,
    getFriendStatus:         getFriendStatus,
    removeFriend:            removeFriend,
    writeFeedEntry:          writeFeedEntry,
    writeGlobalFeedEntry:    writeGlobalFeedEntry,
    getMyFeedEntries:        getMyFeedEntries,
    getFriendsFeedEntries:   getFriendsFeedEntries,
    claimFriendCode:         claimFriendCode,
    findUserByCode:          findUserByCode
  };
})();
