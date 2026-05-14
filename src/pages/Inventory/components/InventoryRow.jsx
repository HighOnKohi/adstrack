import { useState, useRef, useEffect } from "react";
import { computeStatus, CONDITION_OPTIONS } from "../InventoryServices.jsx";
import { editIcon, trashIcon } from "../../../assets/Icons/index.js";
import QRIcon from "../../../assets/Icons/QR.svg";
import historyIcon from "../../../assets/Icons/history.svg";

function getLastUpdatedDate(item) {
  // First check direct timestamp fields on the item
  const directFields = [item.updatedAt, item.lastModified, item.archivedAt];
  let latest = null;

  for (const raw of directFields) {
    if (!raw) continue;
    let d = null;
    try {
      if (raw?.toDate && typeof raw.toDate === "function") d = raw.toDate();
      else if (raw?.seconds) d = new Date(raw.seconds * 1000);
      else if (typeof raw === "string" || typeof raw === "number") d = new Date(raw);
    } catch { /* ignore */ }
    if (d && !isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
  }

  // Then check history array
  const history = item.history;
  if (Array.isArray(history) && history.length > 0) {
    for (const entry of history) {
      let d = null;
      try {
        if (entry?.date?.toDate && typeof entry.date.toDate === "function") d = entry.date.toDate();
        else if (entry?.date?.seconds) d = new Date(entry.date.seconds * 1000);
        else if (entry?.date) d = new Date(entry.date);
        else if (entry?.timestamp?.toDate && typeof entry.timestamp.toDate === "function") d = entry.timestamp.toDate();
        else if (entry?.timestamp?.seconds) d = new Date(entry.timestamp.seconds * 1000);
        else if (entry?.timestamp) d = new Date(entry.timestamp);
      } catch { /* ignore */ }
      if (d && !isNaN(d.getTime())) {
        if (!latest || d > latest) latest = d;
      }
    }
  }
  return latest;
}

function formatDate(d) {
  if (!d) return "No updates";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InventoryRow({ item, onEditStart, onDelete, onGenerateQR, onViewHistory, onAdjustQuantity, isSelected, onSelectToggle, lastUpdated: lastUpdatedProp }) {
  const status = computeStatus(item.quantity);
  const condition = item.condition || "Good";
  const conditionMeta = CONDITION_OPTIONS.find((c) => c.value === condition) || CONDITION_OPTIONS[0];
  // Use log timestamp from InventoryLogs (passed as prop), fall back to item fields
  const lastUpdated = lastUpdatedProp || getLastUpdatedDate(item);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`inventory-row ${isSelected ? "inventory-row--selected" : ""}`}>
      <div className="inventory-row-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectToggle(item.docId)}
          aria-label={`Select ${item.name || item.id}`}
          className="inventory-select-checkbox"
        />
      </div>
      <div>{item.id || item.docId}</div>
      <div>{item.name || "-"}</div>
      <div>{item.category || "-"}</div>
      <div className="inventory-row-quantity">
        <button
          type="button"
          className="qty-adjust-btn"
          onClick={() => onAdjustQuantity(item.docId, -1)}
          disabled={item.quantity <= 0}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="qty-val">{item.quantity ?? "-"}</span>
        <button
          type="button"
          className="qty-adjust-btn"
          onClick={() => onAdjustQuantity(item.docId, 1)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <div className="inventory-row-status">
        <span
          className={`inventory-status-badge status-${status.toLowerCase().replace(/ /g, "-")}`}
        >
          {status}
        </span>
      </div>
      <div className="inventory-row-condition">
        <span
          className="inventory-condition-pill"
          style={{
            backgroundColor: `${conditionMeta.color}18`,
            color: conditionMeta.color,
            borderColor: `${conditionMeta.color}40`,
          }}
        >
          {conditionMeta.label}
        </span>
      </div>
      <div className="inventory-row-lastupdated">
        {formatDate(lastUpdated)}
      </div>
      <div className="inventory-row-actions" ref={menuRef}>
        <button
          className="inventory-dots-btn"
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Actions menu"
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>
        {menuOpen && (
          <div className="inventory-dots-menu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEditStart(item);
              }}
            >
              <img src={editIcon} alt="" aria-hidden="true" className="inventory-action-icon" /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onGenerateQR(item);
              }}
            >
              <img src={QRIcon} alt="" aria-hidden="true" className="inventory-action-icon" style={{ filter: "brightness(0)" }} /> Generate QR
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onViewHistory(item);
              }}
            >
              <img src={historyIcon} alt="" aria-hidden="true" className="inventory-action-icon" style={{ filter: "brightness(0)" }} /> View History
            </button>
            <button
              type="button"
              className="inventory-dots-menu-delete"
              onClick={() => {
                setMenuOpen(false);
                onDelete(item);
              }}
            >
              <img src={trashIcon} alt="" aria-hidden="true" className="inventory-action-icon" /> Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryRow;
