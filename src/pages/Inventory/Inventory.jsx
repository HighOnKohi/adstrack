import { useState, useEffect, useMemo, useRef } from "react";
import { addIcon, closeIcon } from "../../assets/Icons/index.js";
import InventoryRow from "./components/InventoryRow.jsx";
import AddItemModal from "./components/AddItemModal.jsx";
import {
  fetchInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  computeStatus,
  STOCK_PRIORITY,
  getNextId,
  checkIdConflict,
} from "./InventoryServices.jsx";
import "./Inventory.css";

function Inventory() {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStock, setSelectedStock] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editItem, setEditItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const categoryFilterRef = useRef(null);
  const stockFilterRef = useRef(null);

  const loadInventory = async () => {
    try {
      const inventoryList = await fetchInventoryItems();
      setItems(inventoryList);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setErrorMessage("Unable to load inventory. Please try again later.");
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        categoryFilterRef.current &&
        !categoryFilterRef.current.contains(e.target)
      ) {
        setCategoryDropdownOpen(false);
      }
      if (
        stockFilterRef.current &&
        !stockFilterRef.current.contains(e.target)
      ) {
        setStockDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueCategories = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => (item.category || "").trim())),
    ).filter(Boolean);
  }, [items]);

  const uniqueStocks = ["In Stock", "Low Stock", "Out of Stock"];

  const filteredItems = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return items
      .filter((item) => {
        const status = computeStatus(item.quantity);
        if (selectedCategory && item.category !== selectedCategory)
          return false;
        if (selectedStock && status !== selectedStock) return false;

        const name = (item.name || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        const id = (item.id || item.docId || "").toLowerCase();
        const statusText = status.toLowerCase();

        if (!term) return true;
        return (
          name.includes(term) ||
          category.includes(term) ||
          id.includes(term) ||
          statusText.includes(term)
        );
      })
      .sort((a, b) => {
        const statusA = computeStatus(a.quantity);
        const statusB = computeStatus(b.quantity);
        const order = STOCK_PRIORITY[statusA] - STOCK_PRIORITY[statusB];
        if (order !== 0) return order;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [items, searchText, selectedCategory, selectedStock]);

  const openAddModal = () => {
    setModalMode("add");
    setEditItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode("edit");
    setEditItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleModalSubmit = async (payload) => {
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    // Check for ID conflicts
    const idExists = checkIdConflict(
      items,
      payload.id,
      modalMode === "add",
      editItem?.docId,
    );

    if (idExists) {
      setErrorMessage("This ID already exists. Please use a different ID.");
      setIsSaving(false);
      return;
    }

    try {
      if (modalMode === "add") {
        await addInventoryItem(payload);
        setStatusMessage("Inventory item added successfully.");
      } else {
        await updateInventoryItem(editItem.docId, payload);
        setStatusMessage("Inventory item updated successfully.");
      }

      await loadInventory();
      closeModal();
    } catch (error) {
      console.error("Inventory change failed:", error);
      setErrorMessage("Failed to save item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (docId) => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      await deleteInventoryItem(docId);
      setItems((prev) => prev.filter((item) => item.docId !== docId));
      setStatusMessage("Inventory item deleted successfully.");
    } catch (error) {
      console.error("Delete inventory failed:", error);
      setErrorMessage("Failed to delete item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteCandidate || !deleteCandidate.docId) {
      setDeleteCandidate(null);
      return;
    }

    await handleDeleteItem(deleteCandidate.docId);
    setDeleteCandidate(null);
  };

  const cancelDelete = () => {
    setDeleteCandidate(null);
  };

  return (
    <div className="inventory-directory">
      <div className="inventory-label">
        <h1>Inventory Directory</h1>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>

      <div className="inventory-top-row">
        <div className="inventory-search-bar">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search item name or ID"
            type="search"
            aria-label="Search inventory"
          />
        </div>

        <div className="inventory-top-buttons">
          <button
            className="inventory-add-button"
            type="button"
            onClick={openAddModal}
            disabled={isSaving}
          >
            <img src={addIcon} alt="Add" />
            Add Item
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="inventory-status-message">{statusMessage}</div>
      )}
      {errorMessage && (
        <div className="inventory-error-message">{errorMessage}</div>
      )}

      <div className="inventory-filters">
        <div className="inventory-filter-field">
          <label htmlFor="mobile-category-filter">Category</label>
          <select
            id="mobile-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {uniqueCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="inventory-filter-field">
          <label htmlFor="mobile-stock-filter">Stock</label>
          <select
            id="mobile-stock-filter"
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
          >
            <option value="">All stocks</option>
            {uniqueStocks.map((stock) => (
              <option key={stock} value={stock}>
                {stock}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="inventory-table">
        <div className="inventory-table-header">
          <div>ID</div>
          <div>NAME</div>
          <div
            ref={categoryFilterRef}
            className="inventory-label-cell inventory-label-cell-filter"
          >
            <button
              type="button"
              className="inventory-label-filter-btn"
              onClick={() => {
                setStatusDropdownOpen(false);
                setCategoryDropdownOpen((o) => !o);
              }}
              aria-expanded={categoryDropdownOpen}
              aria-haspopup="listbox"
            >
              <span>
                <div>Category</div>
              </span>
              <span className="inventory-label-filter-chevron">▼</span>
            </button>
            {categoryDropdownOpen && (
              <div className="inventory-filter-dropdown" role="listbox">
                <button
                  type="button"
                  className="inventory-filter-option"
                  onClick={() => {
                    setSelectedCategory("");
                    setCategoryDropdownOpen(false);
                  }}
                  role="option"
                  aria-selected={!selectedCategory}
                >
                  All categories
                </button>
                {uniqueCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="inventory-filter-option"
                    onClick={() => {
                      setSelectedCategory(category);
                      setCategoryDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={selectedCategory === category}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>QUANTITY</div>
          <div
            ref={stockFilterRef}
            className="inventory-label-cell inventory-label-cell-filter"
          >
            <button
              type="button"
              className="inventory-label-filter-btn"
              onClick={() => {
                setCategoryDropdownOpen(false);
                setStockDropdownOpen((o) => !o);
              }}
              aria-expanded={stockDropdownOpen}
              aria-haspopup="listbox"
            >
              <span>
                <div>Stock</div>
              </span>
              <span className="inventory-label-filter-chevron">▼</span>
            </button>
            {stockDropdownOpen && (
              <div className="inventory-filter-dropdown" role="listbox">
                <button
                  type="button"
                  className="inventory-filter-option"
                  onClick={() => {
                    setSelectedStock("");
                    setStockDropdownOpen(false);
                  }}
                  role="option"
                  aria-selected={!selectedStock}
                >
                  All stocks
                </button>
                {uniqueStocks.map((stock) => (
                  <button
                    key={stock}
                    type="button"
                    className="inventory-filter-option"
                    onClick={() => {
                      setSelectedStock(stock);
                      setStockDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={selectedStock === stock}
                  >
                    {stock}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>ACTIONS</div>
        </div>

        <div className="inventory-table-body">
          {filteredItems.length === 0 ? (
            <div className="inventory-empty-state">
              No inventory items found.
            </div>
          ) : (
            filteredItems.map((item) => (
              <InventoryRow
                key={item.docId || item.id || item.name}
                item={item}
                onEditStart={openEditModal}
                onDelete={(itemToDelete) => setDeleteCandidate(itemToDelete)}
              />
            ))
          )}
        </div>
      </div>

      {deleteCandidate && (
        <div
          className="inventory-modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="inventory-modal">
            <button
              className="inventory-modal-close"
              type="button"
              onClick={cancelDelete}
              aria-label="Close"
            >
              <img src={closeIcon} alt="Close" />
            </button>
            <h2>Confirm delete</h2>
            <p>
              Are you sure you want to delete "
              {deleteCandidate.name || deleteCandidate.id || "this item"}"? This
              action cannot be undone.
            </p>
            <div
              className="inventory-row-actions"
              style={{ justifyContent: "flex-end", marginTop: "12px" }}
            >
              <button
                className="inventory-action-btn"
                onClick={cancelDelete}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inventory-add-button"
                onClick={confirmDeleteItem}
                type="button"
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddItemModal
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          loading={isSaving}
          initialData={
            modalMode === "edit"
              ? {
                  id: editItem.id || "",
                  name: editItem.name || "",
                  category: editItem.category || "",
                  quantity: editItem.quantity ?? 0,
                }
              : { id: getNextId(items), name: "", category: "", quantity: "" }
          }
          title={
            modalMode === "edit" ? "Edit Inventory Item" : "Add Inventory Item"
          }
          submitLabel={modalMode === "edit" ? "Save Changes" : "Add Item"}
        />
      )}
    </div>
  );
}

export default Inventory;
