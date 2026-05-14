import InventoryRow from "./InventoryRow.jsx";

function InventoryTable({ items, onEdit, onDelete }) {
  return (
    <div className="inventory-table">
      <div className="inventory-table-header">
        <div>ID</div>
        <div>NAME</div>
        <div>CATEGORY</div>
        <div>QUANTITY</div>
        <div>STATUS</div>
        <div aria-hidden="true" />
      </div>

      <div className="inventory-table-body">
        {items.length === 0 ? (
          <div className="inventory-empty-state">No inventory items found.</div>
        ) : (
          items.map((item) => (
            <InventoryRow
              key={item.docId}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default InventoryTable;
