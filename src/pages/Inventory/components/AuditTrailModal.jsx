import { useState, useEffect } from "react";
import { closeIcon, editIcon, trashIcon } from "../../../assets/Icons/index.js";
import addIcon from "../../../assets/Icons/add.svg";
import deductIcon from "../../../assets/Icons/deduct.svg";
import { fetchItemLogs } from "../InventoryServices.jsx";
import "./AuditTrailModal.css";

const ACTION_CONFIG = {
  add: { label: "Added", color: "#2e7d32", bg: "#e8f5e9", icon: <img src={addIcon} alt="" /> },
  deduct: { label: "Deducted", color: "#c62828", bg: "#ffebee", icon: <img src={deductIcon} alt="" /> },
  create: { label: "Created", color: "#1565c0", bg: "#e3f2fd", icon: <img src={addIcon} alt="" /> },
  edit: { label: "Edited", color: "#f57f17", bg: "#fff8e1", icon: <img src={editIcon} alt="" /> },
  delete: { label: "Deleted", color: "#c62828", bg: "#ffebee", icon: <img src={trashIcon} alt="" /> },
};

function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditTrailModal({ item, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item?.docId) return;
    setLoading(true);
    fetchItemLogs(item.docId)
      .then((data) => setLogs(data))
      .catch((err) => console.error("Failed to fetch logs:", err))
      .finally(() => setLoading(false));
  }, [item?.docId]);

  if (!item) return null;

  return (
    <div className="inventory-modal-overlay" onClick={onClose}>
      <div
        className="inventory-modal audit-trail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="inventory-modal-close"
          type="button"
          onClick={onClose}
        >
          <img src={closeIcon} alt="Close" />
        </button>

        <h1>Activity History</h1>
        <p className="audit-trail-subtitle">
          {item.name} ({item.id || item.docId})
        </p>

        <div className="audit-trail-list">
          {loading ? (
            <div className="audit-trail-loading">Loading history...</div>
          ) : logs.length === 0 ? (
            <div className="audit-trail-empty">
              No activity recorded for this item yet.
            </div>
          ) : (
            logs.map((log) => {
              const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.edit;
              return (
                <div key={log.id} className="audit-trail-entry">
                  <div
                    className="audit-trail-icon"
                    style={{ background: config.bg, color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <div className="audit-trail-content">
                    <div className="audit-trail-action">
                      <span
                        className="audit-trail-action-label"
                        style={{ color: config.color }}
                      >
                        {config.label}
                      </span>
                      {log.quantityChanged !== 0 && (
                        <span className="audit-trail-qty">
                          {log.quantityChanged > 0 ? "+" : ""}
                          {log.quantityChanged} unit(s)
                        </span>
                      )}
                    </div>
                    <div className="audit-trail-meta">
                      {log.quantityBefore !== undefined &&
                        log.quantityAfter !== undefined && (
                          <span>
                            Qty: {log.quantityBefore} → {log.quantityAfter}
                          </span>
                        )}
                      {log.userName && <span>by {log.userName}</span>}
                    </div>
                    <div className="audit-trail-time">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditTrailModal;
