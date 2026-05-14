import { useEffect, useMemo, useState } from "react";
import "./Inventory.css";
import InventoryTable from "./components/InventoryTable.jsx";
import AddItemModal from "./components/AddItemModal.jsx";
import { useAlert } from "../../GlobalComponents/useAlert.js";
import {
  fetchInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "./InventoryServices.jsx";

function InventoryDirectory() {
  const { showAlert, showConfirmation } = useAlert();
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
    try {
      await addInventoryItem(item);
      setIsAddModalOpen(false);
      await loadInventory();
      showAlert("Inventory item added successfully.", "Success", "success");
    } catch (error) {
      console.error("Failed to add item:", error);
      showAlert("Failed to add item. Please try again.", "Error", "error");
    }
  };

  const handleUpdateItem = async (docId, updates) => {
    try {
      await updateInventoryItem(docId, updates);
      await loadInventory();
      showAlert("Inventory item updated successfully.", "Success", "success");
    } catch (error) {
      console.error("Failed to update item:", error);
      showAlert("Failed to update item. Please try again.", "Error", "error");
    }
  };

  const handleDeleteItem = async (item) => {
    showConfirmation(
      `Are you sure you want to delete "${item.name || item.id || "this item"}"? This action cannot be undone.`,
      "Confirm Delete",
      async (confirmed) => {
        if (!confirmed) return;
        try {
          await deleteInventoryItem(item.docId || item.id);
          await loadInventory();
          showAlert("Inventory item deleted successfully.", "Success", "success");
        } catch (error) {
          console.error("Delete inventory failed:", error);
          showAlert("Failed to delete item. Please try again.", "Error", "error");
        }
      },
    );
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
