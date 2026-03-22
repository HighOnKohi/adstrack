/* eslint-disable react-refresh/only-export-components -- provider + hooks */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/fbConf.js";

const AppNotificationsContext = createContext(null);

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function meetingScheduleDate(m) {
  const raw = m?.Schedule_Date || m?.ETA;
  if (!raw) return null;
  if (typeof raw.toDate === "function") return raw.toDate();
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatMeetingWhen(m) {
  const d = meetingScheduleDate(m);
  if (!d) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [schoolsMap, setSchoolsMap] = useState({});
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Inventory"), (snap) => {
      setItems(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Meetings"), (snap) => {
      setMeetings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Schools"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data()?.Name || "School";
      });
      setSchoolsMap(map);
    });
    return () => unsub();
  }, []);

  const triggerScheduleNotifCheck = useCallback(() => {
    setNowTick(Date.now());
  }, []);

  const { notifications, badgeCount } = useMemo(() => {
    const now = new Date(nowTick);
    const todayKey = dateKeyLocal(now);
    const tomorrowKey = dateKeyLocal(addDays(now, 1));

    const list = [];
    let count = 0;

    const zero = items.filter((i) => Number(i.quantity) <= 0);
    if (zero.length > 0) {
      const names = zero.map((i) => i.name || i.id).filter(Boolean);
      list.push({
        id: "stock-zero",
        kind: "inventory",
        title: "Items out of stock",
        detail:
          names.slice(0, 6).join(", ") +
          (names.length > 6 ? ` (+${names.length - 6} more)` : ""),
      });
      count += 1;
    }

    const activeMeetings = meetings.filter(
      (m) => (m.Status || "Pending") !== "Done",
    );

    const tomorrowList = activeMeetings.filter((m) => {
      const d = meetingScheduleDate(m);
      return d && dateKeyLocal(d) === tomorrowKey;
    });
    if (tomorrowList.length > 0) {
      list.push({
        id: "sched-tomorrow",
        kind: "schedule_tomorrow",
        title: "Meeting(s) tomorrow",
        lines: tomorrowList.map((m) => ({
          id: m.id,
          text: `${schoolsMap[m.School_ID] || "School"} — ${formatMeetingWhen(m)}`,
        })),
      });
      count += tomorrowList.length;
    }

    const todayList = activeMeetings.filter((m) => {
      const d = meetingScheduleDate(m);
      return d && dateKeyLocal(d) === todayKey;
    });
    if (todayList.length > 0) {
      list.push({
        id: "sched-today",
        kind: "schedule_today",
        title: "Meeting(s) today",
        lines: todayList.map((m) => ({
          id: m.id,
          text: `${schoolsMap[m.School_ID] || "School"} — ${formatMeetingWhen(m)}`,
        })),
      });
      count += todayList.length;
    }

    return {
      notifications: list,
      badgeCount: count,
    };
  }, [items, meetings, schoolsMap, nowTick]);

  const value = useMemo(
    () => ({
      notifications,
      badgeCount,
      triggerScheduleNotifCheck,
    }),
    [notifications, badgeCount, triggerScheduleNotifCheck],
  );

  return (
    <AppNotificationsContext.Provider value={value}>
      {children}
    </AppNotificationsContext.Provider>
  );
}

export function useAppNotifications() {
  const ctx = useContext(AppNotificationsContext);
  if (!ctx) {
    throw new Error("useAppNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
