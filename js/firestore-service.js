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
      console.warn("[FirestoreService] setUserDoc error:", e);
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
      console.warn("[FirestoreService] addExpenseDoc error:", e);
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
      console.warn("[FirestoreService] deleteExpenseDoc error:", e);
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
      console.warn("[FirestoreService] setQuickAddItems error:", e);
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

  window.FirestoreService = {
    getUserDoc: getUserDoc,
    setUserDoc: setUserDoc,
    addExpenseDoc: addExpenseDoc,
    getExpenseDocs: getExpenseDocs,
    clearExpenseDocs: clearExpenseDocs,
    deleteExpenseDoc: deleteExpenseDoc,
    setQuickAddItems: setQuickAddItems,
    getQuickAddItemDocs: getQuickAddItemDocs
  };
})();
