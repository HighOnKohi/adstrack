import { useEffect, useState } from "react";
import { db } from "../../config/fbConf.js";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

/**
 * Live count of Meetings for a school with Status "Done".
 * Requires a Firestore composite index on Meetings: School_ID + Status (create from console link if prompted).
 */
export function useAccomplishedMeetingsCount(schoolId) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!schoolId) {
      return undefined;
    }

    const q = query(
      collection(db, "Meetings"),
      where("School_ID", "==", schoolId),
      where("Status", "==", "Done"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCount(snap.size);
      },
      (err) => {
        console.error("Accomplished meetings listener:", err);
        setCount(null);
      },
    );

    return () => unsub();
  }, [schoolId]);

  if (!schoolId) {
    return null;
  }
  return count;
}
