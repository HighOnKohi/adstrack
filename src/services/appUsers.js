/**
 * Firestore collection `appUsers`: database-only logins (not Firebase Auth).
 *
 * Rules (merge into your project rules):
 *   match /appUsers/{id} {
 *     allow read: if true;  // needed so login can verify password before sign-in
 *     allow write: if request.auth != null && request.auth.uid == "YOUR_MASTER_UID";
 *   }
 */
import bcrypt from "bcryptjs";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/fbConf.js";

/** Firestore collection for non–Firebase-Auth logins (password = bcrypt hash). */
export const APP_USERS_COLLECTION = "appUsers";

export function loginEmailFromUsername(username) {
  const u = String(username).trim();
  if (!u) return "";
  return u.includes("@")
    ? u.toLowerCase()
    : `${u.toLowerCase()}@adstrack.local`;
}

export async function findAppUserByLoginEmail(emailNorm) {
  const q = query(
    collection(db, APP_USERS_COLLECTION),
    where("email", "==", emailNorm),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function verifyAppUserPassword(loginEmail, plainPassword) {
  const emailNorm = loginEmailFromUsername(loginEmail);
  if (!emailNorm) return null;
  const row = await findAppUserByLoginEmail(emailNorm);
  if (!row?.passwordHash) return null;
  const ok = bcrypt.compareSync(plainPassword, row.passwordHash);
  if (!ok) return null;
  return {
    source: "db",
    id: row.id,
    email: row.email,
    displayName: (row.displayName || "").trim(),
  };
}

export async function appUserEmailExists(emailNorm, excludeDocId) {
  const row = await findAppUserByLoginEmail(emailNorm);
  if (!row) return false;
  if (excludeDocId && row.id === excludeDocId) return false;
  return true;
}

export async function createAppUser({
  displayName,
  email,
  password,
}) {
  const emailNorm = loginEmailFromUsername(email);
  if (!emailNorm) throw new Error("Email is required.");
  const exists = await appUserEmailExists(emailNorm);
  if (exists) throw new Error("That email is already registered.");
  const passwordHash = bcrypt.hashSync(password, 10);
  const ref = doc(collection(db, APP_USERS_COLLECTION));
  await setDoc(ref, {
    email: emailNorm,
    displayName: String(displayName || "").trim(),
    passwordHash,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAppUser(docId, { displayName, email, password }) {
  const emailNorm = loginEmailFromUsername(email);
  if (!emailNorm) throw new Error("Email is required.");
  const exists = await appUserEmailExists(emailNorm, docId);
  if (exists) throw new Error("That email is already in use.");
  const ref = doc(db, APP_USERS_COLLECTION, docId);
  const patch = {
    email: emailNorm,
    displayName: String(displayName || "").trim(),
  };
  if (password) {
    patch.passwordHash = bcrypt.hashSync(password, 10);
  }
  await setDoc(ref, patch, { merge: true });
}

export async function deleteAppUser(docId) {
  await deleteDoc(doc(db, APP_USERS_COLLECTION, docId));
}
