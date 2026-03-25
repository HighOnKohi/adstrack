import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import {
  calendarIcon,
  directoryIcon,
  inventoryIcon,
  homeIcon,
  bookIcon,
} from "../../assets/Icons/index.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAppNotifications } from "../../context/AppNotificationsContext.jsx";
import "./Sidebar.css";

/** Dismissals cleared by "Run schedule reminder check" so hidden schedule alerts can show again */
const SCHEDULE_REMINDER_NOTIF_IDS = new Set(["sched-tomorrow", "sched-today"]);

function BellIcon() {
  return (
    <svg
      className="sidebar-notif-bell-svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm8-5V11a8 8 0 1 0-16 0v6l-2 2v1h20v-1l-2-2Z"
        fill="#ffffff"
      />
    </svg>
  );
}

function badgeCountForNotifications(list) {
  let c = 0;
  for (const n of list) {
    if (n.id === "stock-zero") c += 1;
    else if (n.lines?.length) c += n.lines.length;
  }
  return c;
}

function NotificationPanelContent({
  notifications,
  isAdmin,
  onAdminCheck,
  onDismiss,
  panelRef,
  style,
}) {
  return (
    <div
      ref={panelRef}
      className="sidebar-notif-panel"
      role="dialog"
      aria-label="Notifications"
      style={style}
    >
      {notifications.length === 0 ? (
        <p className="sidebar-notif-empty">No alerts right now.</p>
      ) : (
        <ul className="sidebar-notif-list">
          {notifications.map((n) => (
            <li key={n.id} className="sidebar-notif-item">
              <div className="sidebar-notif-item-header">
                <div className="sidebar-notif-item-title">{n.title}</div>
                <button
                  type="button"
                  className="sidebar-notif-dismiss"
                  aria-label={`Dismiss ${n.title}`}
                  onClick={() => onDismiss(n.id)}
                >
                  ×
                </button>
              </div>
              {n.detail ? (
                <p className="sidebar-notif-item-detail">{n.detail}</p>
              ) : null}
              {n.lines?.length ? (
                <ul className="sidebar-notif-sublist">
                  {n.lines.map((line) => (
                    <li key={line.id}>{line.text}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {isAdmin ? (
        <button
          type="button"
          className="sidebar-notif-admin-btn"
          onClick={() => onAdminCheck()}
        >
          Run schedule reminder check
        </button>
      ) : null}
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const nav = useNavigate();
  const { isAdmin } = useAuth();
  const { notifications, triggerScheduleNotifCheck } = useAppNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const [ackCompositeSig, setAckCompositeSig] = useState(null);
  const [dismissedIds, setDismissedIds] = useState([]);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);

  const notifSignature = useMemo(
    () =>
      notifications
        .map((n) => {
          const lineIds = (n.lines ?? []).map((l) => l.id).join(",");
          return `${n.id}:${n.detail ?? ""}:${lineIds}`;
        })
        .join("|"),
    [notifications],
  );

  const dismissedKey = [...dismissedIds].sort().join(",");
  const compositeSig = `${notifSignature}|dismiss:${dismissedKey}`;

  useEffect(() => {
    const alive = new Set(notifications.map((n) => n.id));
    setDismissedIds((prev) => prev.filter((id) => alive.has(id)));
  }, [notifications]);

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !dismissedIds.includes(n.id)),
    [notifications, dismissedIds],
  );

  const effectiveBadgeCount = badgeCountForNotifications(visibleNotifications);

  const showBadge =
    effectiveBadgeCount > 0 && ackCompositeSig !== compositeSig;

  const dismissNotification = (id) => {
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleAdminScheduleCheck = () => {
    triggerScheduleNotifCheck();
    setDismissedIds((prev) =>
      prev.filter((id) => !SCHEDULE_REMINDER_NOTIF_IDS.has(id)),
    );
    setAckCompositeSig(null);
  };

  const handleNav = (path) => {
    nav(path);
    if (onClose) onClose();
  };

  const updatePanelPosition = () => {
    const el = toggleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 10;
    const panelWidth = Math.min(288, window.innerWidth - 16);
    let left = r.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - 8 - panelWidth;
    }
    left = Math.max(8, left);
    const maxH = Math.min(window.innerHeight * 0.7, 420, r.top - gap - 8);
    setPanelStyle({
      left,
      width: panelWidth,
      bottom: window.innerHeight - r.top + gap,
      maxHeight: Math.max(120, maxH),
    });
  };

  useLayoutEffect(() => {
    if (!panelOpen) return undefined;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onDoc = (e) => {
      if (toggleRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [panelOpen]);

  const portalTarget =
    typeof document !== "undefined" ? document.body : null;

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <nav>
          <a onClick={() => handleNav("/home")}>
            <img src={homeIcon} alt="Home" /> Home
          </a>
          <a onClick={() => handleNav("/schedules")}>
            <img src={bookIcon} alt="Schedules" /> Schedules
          </a>
          <a onClick={() => handleNav("/schools")}>
            <img src={directoryIcon} alt="Schools" /> Schools
          </a>
          <a onClick={() => handleNav("/calendar")}>
            <img src={calendarIcon} alt="Calendar" /> Calendar
          </a>
          <a onClick={() => handleNav("/inventory")}>
            <img src={inventoryIcon} alt="Inventory" /> Inventory
          </a>
          <a onClick={() => handleNav("/analytics")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{marginRight: 0}}><rect x="3" y="12" width="4" height="9" rx="1" fill="#ffffff"/><rect x="10" y="7" width="4" height="14" rx="1" fill="#ffffff"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#ffffff"/></svg>{" "}Statistics
          </a>
          {isAdmin ? (
            <a onClick={() => handleNav("/manage-users")}>
              <img src={directoryIcon} alt="Manage users" /> Manage Users
            </a>
          ) : null}
        </nav>

        <div className="sidebar-bottom">
          <button
            ref={toggleRef}
            type="button"
            className="sidebar-notif-toggle"
            aria-expanded={panelOpen}
            aria-haspopup="dialog"
            aria-label="Notifications"
            onClick={() => {
              setPanelOpen((prev) => {
                if (!prev) {
                  setAckCompositeSig(compositeSig);
                }
                return !prev;
              });
            }}
          >
            <BellIcon />
            {showBadge ? (
              <span className="sidebar-notif-badge">
                {effectiveBadgeCount}
              </span>
            ) : null}
          </button>
        </div>
      </aside>

      {panelOpen && portalTarget
        ? createPortal(
            <NotificationPanelContent
              notifications={visibleNotifications}
              isAdmin={isAdmin}
              onAdminCheck={handleAdminScheduleCheck}
              onDismiss={dismissNotification}
              panelRef={panelRef}
              style={panelStyle}
            />,
            portalTarget,
          )
        : null}
    </>
  );
}
