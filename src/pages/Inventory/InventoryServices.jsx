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
} from "firebase/firestore";

const INVENTORY_COLLECTION = "Inventory";

export const STOCK_PRIORITY = {
  "Out of Stock": 1,
  "Low Stock": 2,
  "In Stock": 3,
};

export function computeStatus(quantity) {
  const q = Number(quantity) || 0;
  if (q <= 0) return "Out of Stock";
  if (q < 3) return "Low Stock";
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
