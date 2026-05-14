const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const functions = require("firebase-functions/v1");
const { HttpsError } = require("firebase-functions/v1/https");

initializeApp();

/**
 * Admin callables use 1st gen (v1) HTTPS callables. Gen 2 (Cloud Run) often breaks
 * browser preflight/CORS from http://localhost during Vite dev; v1 callables work
 * with httpsCallable without extra Cloud Run IAM/CORS setup.
 */

/** Must match src/config/adminConfig.js */
const SUPER_ADMIN_UID = "oxqW8bBwV3OZBfPJKGIUScZ1Yc92";

/**
 * Non-HttpsError throws become generic "internal" on the client.
 * Map them to failed-precondition so the admin UI can show the message.
 */
function adminOnCall(handler) {
  return functions.region("us-central1").https.onCall(async (data, context) => {
    try {
      return await handler(data, context);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("admin callable error:", e);
      throw new HttpsError(
        "failed-precondition",
        e?.message || String(e) || "Unexpected server error",
      );
    }
  });
}

async function assertCallerIsAdmin(auth) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  if (auth.uid === SUPER_ADMIN_UID) {
    return;
  }
  const snap = await getFirestore().collection("appConfig").doc("admins").get();
  const uids =
    snap.exists && Array.isArray(snap.data().uids) ? snap.data().uids : [];
  if (!uids.includes(auth.uid)) {
    throw new HttpsError("permission-denied", "Admin only.");
  }
}

exports.adminListUsers = adminOnCall(async (data, context) => {
  await assertCallerIsAdmin(context.auth);
  const listUsersResult = await getAuth().listUsers(1000);
  const adminsSnap = await getFirestore()
    .collection("appConfig")
    .doc("admins")
    .get();
  const adminUids = new Set(
    adminsSnap.exists && Array.isArray(adminsSnap.data().uids)
      ? adminsSnap.data().uids
      : [],
  );
  adminUids.add(SUPER_ADMIN_UID);

  const users = listUsersResult.users.map((u) => ({
    uid: u.uid,
    email: u.email || "",
    displayName: u.displayName || "",
    disabled: u.disabled,
    isAdmin: adminUids.has(u.uid),
  }));
  return { users };
});

exports.adminCreateUser = adminOnCall(async (data, context) => {
  await assertCallerIsAdmin(context.auth);
  const { email, password, displayName } = data || {};
  if (!email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "Email and password are required.",
    );
  }
  try {
    const userRecord = await getAuth().createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: displayName ? String(displayName).trim() : undefined,
    });
    await getFirestore()
      .collection("userProfiles")
      .doc(userRecord.uid)
      .set(
        {
          displayName: displayName ? String(displayName).trim() : "",
          email: userRecord.email || String(email).trim(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return { uid: userRecord.uid };
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "That email is already in use.");
    }
    throw new HttpsError(
      "failed-precondition",
      e.message || "Could not create the account.",
    );
  }
});

exports.adminUpdateUser = adminOnCall(async (data, context) => {
  await assertCallerIsAdmin(context.auth);
  const { uid, email, password, displayName } = data || {};
  if (!uid) {
    throw new HttpsError("invalid-argument", "User id is required.");
  }
  const updates = {};
  if (email !== undefined && email !== "") {
    updates.email = String(email).trim();
  }
  if (password !== undefined && password !== "") {
    updates.password = String(password);
  }
  if (displayName !== undefined) {
    updates.displayName = String(displayName).trim();
  }
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "Nothing to update.");
  }
  try {
    await getAuth().updateUser(uid, updates);
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "User not found.");
    }
    throw new HttpsError(
      "failed-precondition",
      e.message || "Could not update the account.",
    );
  }
  const profilePatch = { updatedAt: FieldValue.serverTimestamp() };
  if (displayName !== undefined) {
    profilePatch.displayName = String(displayName).trim();
  }
  if (email !== undefined && email !== "") {
    profilePatch.email = String(email).trim();
  }
  await getFirestore()
    .collection("userProfiles")
    .doc(uid)
    .set(profilePatch, { merge: true });
  return { ok: true };
});

exports.adminDeleteUser = adminOnCall(async (data, context) => {
  await assertCallerIsAdmin(context.auth);
  const { uid } = data || {};
  if (!uid) {
    throw new HttpsError("invalid-argument", "User id is required.");
  }
  if (uid === SUPER_ADMIN_UID) {
    throw new HttpsError(
      "invalid-argument",
      "The primary admin account cannot be deleted.",
    );
  }
  if (uid === context.auth.uid) {
    throw new HttpsError(
      "invalid-argument",
      "You cannot delete your own account here.",
    );
  }
  await getFirestore()
    .collection("appConfig")
    .doc("admins")
    .set({ uids: FieldValue.arrayRemove(uid) }, { merge: true });
  await getFirestore()
    .collection("userProfiles")
    .doc(uid)
    .delete()
    .catch(() => {});
  try {
    await getAuth().deleteUser(uid);
  } catch (e) {
    if (e.code !== "auth/user-not-found") {
      throw new HttpsError(
        "failed-precondition",
        e.message || "Could not delete the account.",
      );
    }
  }
  return { ok: true };
});

exports.adminSetUserAdmin = adminOnCall(async (data, context) => {
  await assertCallerIsAdmin(context.auth);
  const { uid, isAdmin } = data || {};
  if (!uid) {
    throw new HttpsError("invalid-argument", "User id is required.");
  }
  if (uid === context.auth.uid && !isAdmin) {
    throw new HttpsError(
      "invalid-argument",
      "You cannot remove your own admin access.",
    );
  }
  if (uid === SUPER_ADMIN_UID && !isAdmin) {
    throw new HttpsError(
      "invalid-argument",
      "The primary admin cannot be removed from admins.",
    );
  }
  const ref = getFirestore().collection("appConfig").doc("admins");
  if (isAdmin) {
    await ref.set({ uids: FieldValue.arrayUnion(uid) }, { merge: true });
  } else {
    await ref.set({ uids: FieldValue.arrayRemove(uid) }, { merge: true });
  }
  return { ok: true };
});
