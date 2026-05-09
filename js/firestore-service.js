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
      }
      var weeklyXP = Math.max(0, (user.xp || 0) - (user.weeklyXpStart || 0));

      await db.collection("users").doc(userId).set({
        publicProfile: {
          displayName:      displayName,
          firstName:        firstName,
          streak:           Number(user.streak || 0),
          questsCompleted:  Number(user.questsCompleted || 0),
          weeklyXP:         weeklyXP,
          level:            Number(user.level || 1),
          levelName:        String(user.levelName || "Rookie Saver"),
          lastSyncedAt:     new Date().toISOString()
        }
      }, { merge: true });
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
      var batch = db.batch();
      var now = new Date().toISOString();
      // Add requester to my friends
      batch.set(
        db.collection("friends").doc(myUserId).collection("friends").doc(requesterId),
        { addedAt: now, displayName: String(requesterDisplayName || "") }
      );
      // Add me to requester's friends
      batch.set(
        db.collection("friends").doc(requesterId).collection("friends").doc(myUserId),
        { addedAt: now, displayName: String(myDisplayName || "") }
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
      // Fetch each friend's public profile in parallel
      var promises = snapshot.docs.map(function (doc) {
        var friendId = doc.id;
        return getPublicProfile(friendId).then(function (profile) {
          return profile ? Object.assign({ uid: friendId }, profile) : null;
        });
      });
      var results = await Promise.all(promises);
      return results.filter(Boolean);
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

  window.FirestoreService = {
    getUserDoc:            getUserDoc,
    setUserDoc:            setUserDoc,
    addExpenseDoc:         addExpenseDoc,
    getExpenseDocs:        getExpenseDocs,
    clearExpenseDocs:      clearExpenseDocs,
    deleteExpenseDoc:      deleteExpenseDoc,
    setQuickAddItems:      setQuickAddItems,
    getQuickAddItemDocs:   getQuickAddItemDocs,
    syncPublicProfile:     syncPublicProfile,
    getPublicProfile:      getPublicProfile,
    sendFriendRequest:     sendFriendRequest,
    acceptFriendRequest:   acceptFriendRequest,
    declineFriendRequest:  declineFriendRequest,
    getFriends:            getFriends,
    getFriendRequests:     getFriendRequests,
    getFriendStatus:       getFriendStatus,
    removeFriend:          removeFriend
  };
})();
