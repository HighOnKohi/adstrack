import { useEffect, useMemo, useState } from "react";
import "./Inventory.css";
import InventoryTable from "./components/InventoryTable.jsx";
import AddItemModal from "./components/AddItemModal.jsx";
import {
  fetchInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "./InventoryServices.jsx";

function InventoryDirectory() {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadInventory = async () => {
    const inventory = await fetchInventoryItems();
    setItems(inventory);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const inventory = await fetchInventoryItems();
      if (isMounted) setItems(inventory);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      (item.name || "").toString().toLowerCase().includes(term),
    );
  }, [items, searchText]);

  const handleAddItem = async (item) => {
    await addInventoryItem(item);
    setIsAddModalOpen(false);
    await loadInventory();
  };

  const handleUpdateItem = async (docId, updates) => {
    await updateInventoryItem(docId, updates);
    await loadInventory();
  };

  const handleDeleteItem = async (docId) => {
    await deleteInventoryItem(docId);
    await loadInventory();
  };

  return (
    <div className="inventory-directory">
      <div className="inventory-label">
        <h1>Inventory Directory</h1>
        <p>
          Track and manage all inventory items, stock levels, and categories.
        </p>
      </div>

      <div className="inventory-top-row">
        <div className="inventory-search-bar">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            type="text"
            placeholder="Search item name"
          />
        </div>

        <div className="inventory-top-buttons">
          <button
            type="button"
            className="inventory-add-button"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add Item
          </button>
        </div>
      </div>

      <InventoryTable
        items={filteredItems}
        onEdit={handleUpdateItem}
        onDelete={handleDeleteItem}
      />

      {isAddModalOpen && (
        <AddItemModal
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddItem}
        />
      )}
    </div>
  );
}

export default InventoryDirectory;
