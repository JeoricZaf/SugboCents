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

  async function seedUserDoc(userId, profile) {
    if (!isFirestoreEnabled() || !userId) {
      return { ok: false, error: "missing_user_id" };
    }

    try {
      var db = window.FirebaseInit.getDb();
      var firstName = String((profile && profile.firstName) || "").trim();
      var lastName = String((profile && profile.lastName) || "").trim();
      var email = String((profile && profile.email) || "").trim().toLowerCase();
      var displayName = [firstName, lastName].filter(Boolean).join(" ") || "SugboCents User";
      var avatar = String((profile && profile.avatar) || "").trim();

      await db.collection("users").doc(userId).set({
        firstName: firstName,
        lastName: lastName,
        displayName: displayName,
        avatar: avatar || null,
        email: email,
        createdAt: new Date().toISOString(),
        publicProfile: {
          displayName: displayName,
          displayNameLower: displayName.toLowerCase(),
          avatar: avatar || null,
          level: 1,
          xp: 0,
          currentStreak: 0,
          weeklyXP: 0,
          lastSyncedAt: new Date().toISOString()
        }
      }, { merge: true });

      return { ok: true };
    } catch (e) {
      console.warn("[FirestoreService] seedUserDoc error:", e);
      return { ok: false, error: e && e.message ? e.message : "seed_failed" };
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

  async function getExpenseDocs(userId, limit) {
    if (!isFirestoreEnabled()) {
      return [];
    }

    try {
      var db = window.FirebaseInit.getDb();
      var query = db
        .collection("users")
        .doc(userId)
        .collection("expenses")
        .orderBy("timestamp", "desc");
      if (typeof limit === "number" && limit > 0) {
        query = query.limit(limit);
      }
      var snapshot = await query.get();
      return snapshot.docs.map(function (doc) {
        return doc.data();
      });
    } catch (e) {
      console.warn("[FirestoreService] getExpenseDocs error:", e);
      // CRITICAL: return null (not []) so syncFromFirestore's
      // `if (Array.isArray(firestoreExpenses))` guard skips the overwrite.
      // Returning [] here would silently wipe the user's local expenses
      // any time Firestore is briefly unreachable (offline, rate limit,
      // permission glitch). See audit Section "Reliability — C1".
      return null;
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
      var fallbackDisplayName = [firstName, lastName].filter(Boolean).join(" ") || "SugboCents User";
      var displayName = String(user.displayName || user.username || fallbackDisplayName).trim() || fallbackDisplayName;
      var displayNameLower = displayName.toLowerCase();
      var avatar = String(user.avatar || "").trim() || null;

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
          displayNameLower: displayNameLower,
          firstName:        firstName,
          avatar:           avatar,
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
          displayNameLower: displayNameLower,
          firstName:       firstName,
          avatar:          avatar,
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

  function getFriendProfilesCacheKey(userId) {
    return "sugbocents_friend_profiles_" + String(userId || "");
  }

  function getCurrentWeekMondayKey() {
    var now = new Date();
    var dayOfWeek = now.getDay();
    var monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday.getFullYear() + "-" +
      String(monday.getMonth() + 1).padStart(2, "0") + "-" +
      String(monday.getDate()).padStart(2, "0");
  }

  function cacheFriendUids(userId, friends) {
    if (!userId) { return; }
    try {
      var safeFriends = Array.isArray(friends) ? friends : [];
      localStorage.setItem(getFriendCacheKey(userId), JSON.stringify(safeFriends.map(function (friend) {
        return friend.uid;
      })));
      localStorage.setItem(getFriendProfilesCacheKey(userId), JSON.stringify(safeFriends.map(function (friend) {
        return {
          uid: friend.uid,
          displayName: friend.displayName,
          avatar: friend.avatar,
          firstName: friend.firstName,
          streak: Number(friend.streak || 0),
          level: Number(friend.level || 1),
          levelName: String(friend.levelName || "Rookie Saver"),
          questsCompleted: Number(friend.questsCompleted || 0),
          weeklyQuestsCompleted: Number(friend.weeklyQuestsCompleted || 0),
          weeklyXP: Number(friend.weeklyXP || 0),
          weekMondayKey: String(friend.weekMondayKey || ""),
          lastSyncedAt: friend.lastSyncedAt ? String(friend.lastSyncedAt) : null
        };
      })));
    } catch (_) {}
  }

  function getProfileHash(profile) {
    var safe = profile || {};
    return [
      String(safe.displayName || ""),
      String(safe.displayNameLower || ""),
      String(safe.firstName || ""),
      String(safe.avatar || ""),
      String(safe.friendCode || ""),
      Number(safe.streak || 0),
      Number(safe.questsCompleted || 0),
      Number(safe.weeklyQuestsCompleted || 0),
      Number(safe.weeklyXP || 0),
      String(safe.weekMondayKey || ""),
      Number(safe.level || 1),
      String(safe.levelName || "Rookie Saver")
    ].join("|");
  }

  function profileNeedsRefresh(friend, currentWeekKey, nowMs) {
    if (!friend) { return false; }
    var lastSyncedAt = friend.lastSyncedAt ? Date.parse(friend.lastSyncedAt) : NaN;
    var staleByTime = isNaN(lastSyncedAt) || (nowMs - lastSyncedAt > (15 * 60 * 1000));
    var staleByWeek = String(friend.weekMondayKey || "") !== currentWeekKey;
    return staleByTime || staleByWeek;
  }

  async function revalidateFriendProfilesInBackground(userId, friends) {
    if (!isFirestoreEnabled() || !userId || !Array.isArray(friends) || friends.length === 0) {
      return;
    }

    try {
      var db = window.FirebaseInit.getDb();
      if (!window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldPath) {
        return;
      }

      var currentWeekKey = getCurrentWeekMondayKey();
      var nowMs = Date.now();
      var staleFriends = friends.filter(function (friend) {
        return profileNeedsRefresh(friend, currentWeekKey, nowMs);
      });
      if (staleFriends.length === 0) { return; }

      var byUid = {};
      friends.forEach(function (friend) {
        if (!friend || !friend.uid) { return; }
        byUid[String(friend.uid)] = friend;
      });

      var changed = false;
      var staleUids = staleFriends.map(function (friend) { return String(friend.uid); });
      var chunkSize = 10;

      for (var i = 0; i < staleUids.length; i += chunkSize) {
        var chunk = staleUids.slice(i, i + chunkSize);
        if (chunk.length === 0) { continue; }

        var usersSnap = await db.collection("users")
          .where(window.firebase.firestore.FieldPath.documentId(), "in", chunk)
          .get();

        if (!usersSnap || usersSnap.empty) { continue; }

        var batch = db.batch();
        var batchHasWrites = false;

        usersSnap.forEach(function (doc) {
          var uid = doc.id;
          var data = doc.data() || {};
          var fallbackDisplayName = data.displayName || (byUid[uid] && byUid[uid].displayName) || "Friend";
          var normalizedRemote = normalizePublicProfile(data.publicProfile, fallbackDisplayName);
          var existing = byUid[uid] || null;
          var oldHash = getProfileHash(existing);
          var newHash = getProfileHash(normalizedRemote);

          if (oldHash !== newHash) {
            byUid[uid] = Object.assign({ uid: uid }, normalizedRemote);
            batch.set(
              db.collection("friends").doc(userId).collection("friends").doc(uid),
              { publicProfile: normalizedRemote },
              { merge: true }
            );
            batchHasWrites = true;
            changed = true;
          }
        });

        if (batchHasWrites) {
          await batch.commit();
        }
      }

      if (changed) {
        var updatedFriends = Object.keys(byUid).map(function (uid) {
          return byUid[uid];
        });
        cacheFriendUids(userId, updatedFriends);
        window.dispatchEvent(new CustomEvent("sugbocents:friendsRefreshed", {
          detail: { userId: userId }
        }));
      }
    } catch (e) {
      console.warn("[FirestoreService] revalidateFriendProfilesInBackground error:", e);
    }
  }

  function normalizePublicProfile(profile, fallbackDisplayName) {
    var safe = profile || {};
    var displayName = String(safe.displayName || fallbackDisplayName || "Friend");
    var currentWeekKey = getCurrentWeekMondayKey();

    var profileWeekKey = String(safe.weekMondayKey || "");
    var weeklyXP = Number(safe.weeklyXP || 0);
    var weeklyQuestsCompleted = Number(safe.weeklyQuestsCompleted || 0);

    if (profileWeekKey && profileWeekKey !== currentWeekKey) {
      weeklyXP = 0;
      weeklyQuestsCompleted = 0;
    }

    return {
      displayName: displayName,
      displayNameLower: String(safe.displayNameLower || displayName.toLowerCase()),
      firstName: String(safe.firstName || ""),
      avatar: String(safe.avatar || ""),
      friendCode: safe.friendCode ? String(safe.friendCode) : "",
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

      // Duplicate outgoing request guard
      var outgoingPending = await db.collection("friends").doc(targetUserId)
        .collection("requests").doc(myUserId).get();
      if (outgoingPending.exists) {
        return {
          ok: false,
          error: "already_pending",
          message: "You've already sent a request to this person."
        };
      }

      // Reverse request guard (they already sent me one)
      var incomingPending = await db.collection("friends").doc(myUserId)
        .collection("requests").doc(targetUserId).get();
      if (incomingPending.exists) {
        return {
          ok: false,
          error: "incoming_pending",
          message: "They've already sent you a request — accept it instead."
        };
      }

      // Write request (atomic batch — also mirrors to sender's sentRequests)
      var targetDisplayName = "";
      try {
        var targetData = targetDoc.data() || {};
        var targetPP = targetData.publicProfile || {};
        targetDisplayName = String(targetPP.displayName || targetData.firstName || "");
      } catch (_) { /* fall through */ }

      var sentAt = new Date().toISOString();
      var batch = db.batch();
      batch.set(
        db.collection("friends").doc(targetUserId).collection("requests").doc(myUserId),
        { sentAt: sentAt, displayName: String(myDisplayName || "") }
      );
      batch.set(
        db.collection("users").doc(myUserId).collection("sentRequests").doc(targetUserId),
        { sentAt: sentAt, targetDisplayName: targetDisplayName }
      );
      await batch.commit();
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
      // Best-effort cleanup of the sender's sentRequests mirror
      try {
        await db.collection("users").doc(requesterId)
          .collection("sentRequests").doc(myUserId).delete();
      } catch (_) { /* non-fatal */ }
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
      // Best-effort cleanup of the sender's sentRequests mirror
      try {
        await db.collection("users").doc(requesterId)
          .collection("sentRequests").doc(myUserId).delete();
      } catch (_) { /* non-fatal */ }
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

      var results = snapshot.docs.map(function (doc) {
        var data = doc.data() || {};
        var fallbackDisplayName = data.displayName || (data.publicProfile && data.publicProfile.displayName) || "Friend";
        var normalized = normalizePublicProfile(data.publicProfile, fallbackDisplayName);
        return {
          uid: doc.id,
          displayName: normalized.displayName,
          displayNameLower: normalized.displayNameLower,
          firstName: normalized.firstName,
          avatar: normalized.avatar,
          friendCode: normalized.friendCode,
          streak: normalized.streak,
          questsCompleted: normalized.questsCompleted,
          weeklyQuestsCompleted: normalized.weeklyQuestsCompleted,
          weeklyXP: normalized.weeklyXP,
          weekMondayKey: normalized.weekMondayKey,
          level: normalized.level,
          levelName: normalized.levelName,
          lastSyncedAt: normalized.lastSyncedAt
        };
      });

      cacheFriendUids(userId, results);

      revalidateFriendProfilesInBackground(userId, results).catch(function () {});

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
        return Object.assign({ uid: doc.id, requesterId: doc.id }, doc.data());
      });
    } catch (e) {
      console.warn("[FirestoreService] getFriendRequests error:", e);
      return [];
    }
  }

  function getCachedFriends(userId) {
    if (!userId) { return []; }
    try {
      var raw = localStorage.getItem(getFriendProfilesCacheKey(userId));
      if (!raw) { return []; }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) { return []; }
      return parsed.filter(function (item) {
        return item && item.uid;
      }).map(function (item) {
        return {
          uid: String(item.uid),
          displayName: String(item.displayName || "Friend"),
          avatar: String(item.avatar || ""),
          firstName: String(item.firstName || ""),
          streak: Number(item.streak || 0),
          level: Number(item.level || 1),
          levelName: String(item.levelName || "Rookie Saver"),
          questsCompleted: Number(item.questsCompleted || 0),
          weeklyQuestsCompleted: Number(item.weeklyQuestsCompleted || 0),
          weeklyXP: Number(item.weeklyXP || 0),
          weekMondayKey: String(item.weekMondayKey || ""),
          lastSyncedAt: item.lastSyncedAt ? String(item.lastSyncedAt) : null
        };
      });
    } catch (_) {
      return [];
    }
  }

  function onPublicProfileChange(uid, callback) {
    if (!isFirestoreEnabled() || !uid || typeof callback !== "function") {
      return function () {};
    }
    try {
      var db = window.FirebaseInit.getDb();
      return db.collection("users").doc(uid).onSnapshot(function (doc) {
        var data = doc && doc.exists ? doc.data() : null;
        callback(data && data.publicProfile ? data.publicProfile : null);
      }, function () {
        callback(null);
      });
    } catch (_) {
      return function () {};
    }
  }

  function onFriendsChange(userId, callback) {
    if (!isFirestoreEnabled() || !userId || typeof callback !== "function") {
      return function () {};
    }
    try {
      var db = window.FirebaseInit.getDb();
      return db.collection("friends").doc(userId)
        .collection("friends")
        .onSnapshot(function (snapshot) {
          var rows = (snapshot && snapshot.docs ? snapshot.docs : []).map(function (doc) {
            return Object.assign({ uid: doc.id }, doc.data() || {});
          });
          callback(rows);
        }, function () {
          callback([]);
        });
    } catch (_) {
      return function () {};
    }
  }

  function onFriendRequestsChange(userId, callback) {
    if (!isFirestoreEnabled() || !userId || typeof callback !== "function") {
      return function () {};
    }
    try {
      var db = window.FirebaseInit.getDb();
      return db.collection("friends").doc(userId)
        .collection("requests")
        .orderBy("sentAt", "desc")
        .onSnapshot(function (snapshot) {
          var rows = (snapshot && snapshot.docs ? snapshot.docs : []).map(function (doc) {
            return Object.assign({ uid: doc.id, requesterId: doc.id }, doc.data() || {});
          });
          callback(rows);
        }, function () {
          callback([]);
        });
    } catch (_) {
      return function () {};
    }
  }

  async function getSentRequests(myUid) {
    if (!isFirestoreEnabled() || !myUid) { return []; }
    try {
      var db = window.FirebaseInit.getDb();
      var snap = await db.collection("users").doc(myUid)
        .collection("sentRequests").orderBy("sentAt", "desc").get();
      var rows = [];
      snap.forEach(function (doc) {
        var data = doc.data() || {};
        rows.push({
          targetUid:         doc.id,
          targetDisplayName: String(data.targetDisplayName || ""),
          sentAt:            String(data.sentAt || "")
        });
      });
      return rows;
    } catch (e) {
      console.warn("[FirestoreService] getSentRequests failed", e);
      return [];
    }
  }

  async function cancelSentRequest(myUid, targetUid) {
    if (!isFirestoreEnabled() || !myUid || !targetUid) { return { ok: false, reason: "missing_args" }; }
    try {
      var db = window.FirebaseInit.getDb();
      var batch = db.batch();
      batch.delete(db.collection("friends").doc(targetUid).collection("requests").doc(myUid));
      batch.delete(db.collection("users").doc(myUid).collection("sentRequests").doc(targetUid));
      await batch.commit();
      return { ok: true };
    } catch (e) {
      console.warn("[FirestoreService] cancelSentRequest failed", e);
      return { ok: false, reason: "network" };
    }
  }

  function onSentRequestsChange(myUid, callback) {
    if (!isFirestoreEnabled() || !myUid || typeof callback !== "function") { return function () {}; }
    try {
      var db = window.FirebaseInit.getDb();
      return db.collection("users").doc(myUid)
        .collection("sentRequests").orderBy("sentAt", "desc")
        .onSnapshot(function (snapshot) {
          var rows = [];
          snapshot.forEach(function (doc) {
            var data = doc.data() || {};
            rows.push({
              targetUid:         doc.id,
              targetDisplayName: String(data.targetDisplayName || ""),
              sentAt:            String(data.sentAt || "")
            });
          });
          callback(rows);
        }, function (err) {
          console.warn("[FirestoreService] onSentRequestsChange error", err);
          callback([]);
        });
    } catch (e) {
      console.warn("[FirestoreService] onSentRequestsChange failed", e);
      return function () {};
    }
  }

  function onFriendFeedChange(myUid, callback, limit) {
    var fallbackUnsubscribe = null;
    try {
      var db = window.FirebaseInit.getDb();
      var query = db.collection("global_feed")
        .where("audience", "array-contains", myUid)
        .orderBy("timestamp", "desc")
        .limit(limit);

      var unsubscribe = query.onSnapshot(function (snapshot) {
        var rows = (snapshot && snapshot.docs ? snapshot.docs : []).map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data() || {});
        });
        callback(rows);
      }, function () {
        if (fallbackUnsubscribe) { return; }
        fallbackUnsubscribe = db.collection("feed").doc(myUid)
          .collection("entries")
          .orderBy("timestamp", "desc")
          .limit(limit)
          .onSnapshot(function (snapshot) {
            var rows = (snapshot && snapshot.docs ? snapshot.docs : []).map(function (doc) {
              return Object.assign({ id: doc.id }, doc.data() || {});
            });
            callback(rows);
          }, function () {
            callback([]);
          });
      });

      return function () {
        try { if (typeof unsubscribe === "function") { unsubscribe(); } } catch (_) {}
        try { if (typeof fallbackUnsubscribe === "function") { fallbackUnsubscribe(); } } catch (_) {}
      };
    } catch (_) {
      return function () {};
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

      // Invalidate cached friend UID lists so feed audience refreshes immediately.
      try {
        localStorage.removeItem(getFriendCacheKey(myUserId));
        localStorage.removeItem(getFriendCacheKey(friendId));
      } catch (_) {}

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

  async function searchUsersByName(prefix, currentUserId) {
    if (!isFirestoreEnabled()) { return []; }
    var normalizedPrefix = String(prefix || "").trim().toLowerCase();
    if (normalizedPrefix.length < 2) { return []; }

    try {
      var db = window.FirebaseInit.getDb();
      var snapshot = await db.collection("users")
        .where("publicProfile.displayNameLower", ">=", normalizedPrefix)
        .where("publicProfile.displayNameLower", "<", normalizedPrefix + "\uf8ff")
        .limit(10)
        .get();

      return snapshot.docs.map(function (doc) {
        var data = doc.data() || {};
        var profile = data.publicProfile || {};
        var displayName = String(profile.displayName || data.displayName || "").trim();
        return {
          uid: doc.id,
          displayName: displayName,
          displayNameLower: String(profile.displayNameLower || displayName.toLowerCase()),
          avatar: String(profile.avatar || data.avatar || ""),
          friendCode: String(profile.friendCode || ""),
          firstName: String(profile.firstName || data.firstName || "")
        };
      }).filter(function (row) {
        if (!row || !row.uid || !row.displayName) { return false; }
        if (currentUserId && row.uid === currentUserId) { return false; }
        return true;
      });
    } catch (e) {
      console.warn("[FirestoreService] searchUsersByName error:", e);
      return [];
    }
  }

  // ── Reset helper: nuke every social-graph artifact for `userId` ───────────
  // Used by StorageAPI.resetCurrentUserData() so a reset truly behaves like a
  // brand-new account: no friends, no pending requests (in either direction),
  // and no orphaned friend-feed entries.
  // Best-effort: each step is wrapped in its own try/catch so a single
  // permission glitch on one subcollection does not abort the others.
  async function purgeAllUserSocialData(userId) {
    if (!isFirestoreEnabled() || !userId) { return; }
    var db = window.FirebaseInit.getDb();

    // Helper: delete every doc in a collection ref in batches of 400.
    async function wipeCollection(ref) {
      try {
        var snap = await ref.get();
        if (!snap || snap.empty) { return; }
        var docs = snap.docs.slice();
        while (docs.length > 0) {
          var chunk = docs.splice(0, 400);
          var batch = db.batch();
          chunk.forEach(function (d) { batch.delete(d.ref); });
          await batch.commit();
        }
      } catch (e) {
        console.warn("[FirestoreService] purgeAllUserSocialData wipeCollection error:", e);
      }
    }

    // 1. Friends: bidirectional. For every friend F, delete both
    //    friends/{userId}/friends/{F} AND friends/{F}/friends/{userId}.
    try {
      var myFriendsRef = db.collection("friends").doc(userId).collection("friends");
      var myFriendsSnap = await myFriendsRef.get().catch(function () { return null; });
      if (myFriendsSnap && !myFriendsSnap.empty) {
        var friendIds = myFriendsSnap.docs.map(function (d) { return d.id; });
        // Delete reciprocal entries on each friend's side.
        for (var i = 0; i < friendIds.length; i++) {
          try {
            await db.collection("friends").doc(friendIds[i])
              .collection("friends").doc(userId).delete();
          } catch (e) {
            console.warn("[FirestoreService] reciprocal friend delete failed for", friendIds[i], e);
          }
        }
        // Delete our side in one batch.
        await wipeCollection(myFriendsRef);
      }
    } catch (e) {
      console.warn("[FirestoreService] purgeAllUserSocialData friends error:", e);
    }

    // 2. Incoming requests: friends/{userId}/requests/*
    await wipeCollection(db.collection("friends").doc(userId).collection("requests"));

    // 3. Outgoing requests: users/{userId}/sentRequests/* AND the mirror on the
    //    recipient side (friends/{recipient}/requests/{userId}).
    try {
      var sentRef = db.collection("users").doc(userId).collection("sentRequests");
      var sentSnap = await sentRef.get().catch(function () { return null; });
      if (sentSnap && !sentSnap.empty) {
        var recipients = sentSnap.docs.map(function (d) { return d.id; });
        for (var j = 0; j < recipients.length; j++) {
          try {
            await db.collection("friends").doc(recipients[j])
              .collection("requests").doc(userId).delete();
          } catch (e) {
            console.warn("[FirestoreService] mirror request delete failed for", recipients[j], e);
          }
        }
        await wipeCollection(sentRef);
      }
    } catch (e) {
      console.warn("[FirestoreService] purgeAllUserSocialData sentRequests error:", e);
    }

    // 4. Friend feed: feed entries authored by this user (best-effort —
    //    schema may live under users/{userId}/feed or a flat collection).
    await wipeCollection(db.collection("users").doc(userId).collection("feed"));
  }

  window.FirestoreService = {
    getUserDoc:              getUserDoc,
    setUserDoc:              setUserDoc,
    seedUserDoc:             seedUserDoc,
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
    getCachedFriends:        getCachedFriends,
    getFriendRequests:       getFriendRequests,
    onPublicProfileChange:   onPublicProfileChange,
    onFriendsChange:         onFriendsChange,
    onFriendRequestsChange:  onFriendRequestsChange,
    getSentRequests:         getSentRequests,
    cancelSentRequest:       cancelSentRequest,
    onSentRequestsChange:    onSentRequestsChange,
    onFriendFeedChange:      onFriendFeedChange,
    getFriendStatus:         getFriendStatus,
    removeFriend:            removeFriend,
    writeFeedEntry:          writeFeedEntry,
    writeGlobalFeedEntry:    writeGlobalFeedEntry,
    getMyFeedEntries:        getMyFeedEntries,
    getFriendsFeedEntries:   getFriendsFeedEntries,
    searchUsersByName:       searchUsersByName,
    claimFriendCode:         claimFriendCode,
    findUserByCode:          findUserByCode,
    purgeAllUserSocialData:  purgeAllUserSocialData
  };
})();
