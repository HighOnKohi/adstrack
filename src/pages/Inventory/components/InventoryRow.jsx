import { useState, useRef, useEffect } from "react";
import { computeStatus } from "../InventoryServices.jsx";
import { editIcon, trashIcon } from "../../../assets/Icons/index.js";
import QRIcon from "../../../assets/Icons/QR.svg";
import historyIcon from "../../../assets/Icons/history.svg";

function InventoryRow({ item, onEditStart, onDelete, onGenerateQR, onViewHistory, onAdjustQuantity }) {
  const status = computeStatus(item.quantity);
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
    <div className="inventory-row">
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
      <div className="inventory-row-actions" ref={menuRef}>
        <button
          className="inventory-dots-btn"
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Actions menu"
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          ⋮
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
              <img src={trashIcon} alt="" aria-hidden="true" className="inventory-action-icon" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryRow;
