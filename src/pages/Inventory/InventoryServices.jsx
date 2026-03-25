import { db } from "../../config/fbConf.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

const INVENTORY_COLLECTION = "Inventory";
const CATEGORIES_COLLECTION = "InventoryCategories";

export const STOCK_PRIORITY = {
  "Out of Stock": 1,
  "Low Stock": 2,
  "In Stock": 3,
};

export function computeStatus(quantity) {
  const q = Number(quantity) || 0;
  if (q <= 0) return "Out of Stock";
  if (q < 10) return "Low Stock";
  return "In Stock";
}

export function getNextId(items) {
  if (!items || items.length === 0) return "INV-001";

  const existingIds = new Set(
    items.map((item) => (item.id || "").toUpperCase()),
  );

  const invNumbers = items
    .map((item) => {
      const id = (item.id || "").toUpperCase();
      const match = id.match(/^INV-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0);

  if (invNumbers.length === 0) {
    // No INV pattern found, start from 1
    let nextNum = 1;
    let nextId = `INV-${String(nextNum).padStart(3, "0")}`;
    while (existingIds.has(nextId)) {
      nextNum++;
      nextId = `INV-${String(nextNum).padStart(3, "0")}`;
    }
    return nextId;
  }

  const maxNum = Math.max(...invNumbers);
  let nextNum = maxNum + 1;
  let nextId = `INV-${String(nextNum).padStart(3, "0")}`;

  // Check for conflicts and increment if needed
  while (existingIds.has(nextId)) {
    nextNum++;
    nextId = `INV-${String(nextNum).padStart(3, "0")}`;
  }

  return nextId;
}

export function checkIdConflict(items, payloadId, isAddMode, editItemDocId) {
  return items.some((item) => {
    const itemId = (item.id || "").toUpperCase();
    const payloadIdUpper = (payloadId || "").toUpperCase();

    if (isAddMode) {
      return itemId === payloadIdUpper;
    } else {
      // In edit mode, allow the same ID if it's the same item
      return itemId === payloadIdUpper && item.docId !== editItemDocId;
    }
  });
}

export async function fetchInventoryItems() {
  const snapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
  return snapshot.docs.map((docSnap) => ({
    docId: docSnap.id,
    ...docSnap.data(),
    status: computeStatus(docSnap.data()?.quantity),
  }));
}

export function watchInventoryItems(onUpdate, onError) {
  if (typeof onUpdate !== "function") {
    throw new Error("watchInventoryItems requires onUpdate callback");
  }

  const inventoryQuery = query(
    collection(db, INVENTORY_COLLECTION),
    orderBy("name", "asc"),
  );

  return onSnapshot(
    inventoryQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        docId: docSnap.id,
        ...docSnap.data(),
        status: computeStatus(docSnap.data()?.quantity),
      }));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      console.error("Inventory realtime update failed:", error);
    },
  );
}

export function watchCategories(onUpdate, onError) {
  const categoriesQuery = query(
    collection(db, CATEGORIES_COLLECTION),
    orderBy("name", "asc")
  );

  return onSnapshot(
    categoriesQuery,
    (snapshot) => {
      const cats = snapshot.docs.map((docSnap) => ({
        docId: docSnap.id,
        ...docSnap.data(),
      }));
      if (onUpdate) onUpdate(cats);
    },
    (error) => {
      if (onError) onError(error);
      console.error("Categories realtime update failed:", error);
    }
  );
}

export async function addCategory(name) {
  await addDoc(collection(db, CATEGORIES_COLLECTION), { name });
}

export async function updateCategory(docId, name) {
  const catRef = doc(db, CATEGORIES_COLLECTION, docId);
  await updateDoc(catRef, { name });
}

export async function deleteCategory(docId) {
  const catRef = doc(db, CATEGORIES_COLLECTION, docId);
  await deleteDoc(catRef);
}

export async function addInventoryItem(itemData) {
  const quantity = Number(itemData.quantity) || 0;
  const payload = {
    id: itemData.id || "",
    name: itemData.name || "",
    category: itemData.category || "",
    quantity,
    status: computeStatus(quantity),
  };
  const result = await addDoc(collection(db, INVENTORY_COLLECTION), payload);
  return result.id;
}

export async function updateInventoryItem(docId, updates) {
  const quantity =
    updates.quantity !== undefined ? Number(updates.quantity) : undefined;
  const normalized = { ...updates };
  if (quantity !== undefined) {
    normalized.quantity = quantity;
    normalized.status = computeStatus(quantity);
  }
  const itemRef = doc(db, INVENTORY_COLLECTION, docId);
  await updateDoc(itemRef, normalized);
}

export async function deleteInventoryItem(docId) {
  const itemRef = doc(db, INVENTORY_COLLECTION, docId);
  await deleteDoc(itemRef);
}

// ─── Phase 2: QR & Audit Trail helpers ──────────────────────────

const LOGS_COLLECTION = "InventoryLogs";

export async function getInventoryItem(docId) {
  const itemRef = doc(db, INVENTORY_COLLECTION, docId);
  const snap = await getDoc(itemRef);
  if (!snap.exists()) return null;
  return { docId: snap.id, ...snap.data(), status: computeStatus(snap.data()?.quantity) };
}

export async function adjustItemQuantity(docId, delta) {
  const item = await getInventoryItem(docId);
  if (!item) throw new Error("Item not found");
  const oldQty = Number(item.quantity) || 0;
  const newQty = Math.max(0, oldQty + delta);
  await updateInventoryItem(docId, { quantity: newQty });
  return { oldQty, newQty, item };
}

export async function logInventoryAction({
  itemDocId,
  itemName,
  action,
  quantityChanged,
  quantityBefore,
  quantityAfter,
  userId,
  userName,
}) {
  await addDoc(collection(db, LOGS_COLLECTION), {
    itemDocId: itemDocId || "",
    itemName: itemName || "",
    action: action || "",
    quantityChanged: quantityChanged ?? 0,
    quantityBefore: quantityBefore ?? 0,
    quantityAfter: quantityAfter ?? 0,
    userId: userId || "",
    userName: userName || "",
    timestamp: serverTimestamp(),
  });
}

export async function fetchItemLogs(itemDocId) {
  const q = query(
    collection(db, LOGS_COLLECTION),
    where("itemDocId", "==", itemDocId)
  );
  const snap = await getDocs(q);
  const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  logs.sort((a, b) => {
    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
    return timeB - timeA;
  });

  return logs;
}
