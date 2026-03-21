import { editIcon, trashIcon } from "../../../assets/Icons/index.js";
import { computeStatus } from "../InventoryServices.jsx";

function InventoryRow({ item, onEditStart, onDelete }) {
  const status = computeStatus(item.quantity);

  return (
    <div className="inventory-row">
      <div>{item.id || item.docId}</div>
      <div>{item.name || "-"}</div>
      <div>{item.category || "-"}</div>
      <div>{item.quantity ?? "-"}</div>
      <div className="inventory-row-status">
        <span
          className={`inventory-status-badge status-${status.toLowerCase().replace(/ /g, "-")}`}
        >
          {status}
        </span>
      </div>
      <div className="inventory-row-actions">
        <button
          className="inventory-action-btn"
          type="button"
          onClick={() => onEditStart(item)}
        >
          <img src={editIcon} alt="Edit" />
          EDIT
        </button>
        <button
          className="inventory-action-btn"
          type="button"
          onClick={() => onDelete(item)}
        >
          <img src={trashIcon} alt="Delete" />
          DELETE
        </button>
      </div>
    </div>
  );
}

export default InventoryRow;
