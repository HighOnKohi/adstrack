import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { addIcon } from "../../assets/Icons/index.js";
import { useAlert } from "../../GlobalComponents/useAlert.js";
import { useAuth } from "../../context/AuthContext.jsx";
import InventoryRow from "./components/InventoryRow.jsx";
import AddItemModal from "./components/AddItemModal.jsx";
import QRLabelModal from "./components/QRLabelModal.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import cameraIcon from "../../assets/Icons/camera.svg";
import AuditTrailModal from "./components/AuditTrailModal.jsx";
import ManageCategoriesModal from "./components/ManageCategoriesModal.jsx";
import {
  fetchInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  computeStatus,
  STOCK_PRIORITY,
  getNextId,
  checkIdConflict,
  watchInventoryItems,
  logInventoryAction,
  watchCategories,
  adjustItemQuantity,
} from "./InventoryServices.jsx";
import "./Inventory.css";

const ITEMS_PER_PAGE = 15;

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Inventory() {
  const { showAlert, showConfirmation } = useAlert();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStock, setSelectedStock] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editItem, setEditItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Phase 2 modals
  const [qrItem, setQrItem] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [auditItem, setAuditItem] = useState(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const categoryFilterRef = useRef(null);
  const stockFilterRef = useRef(null);

  const loadInventory = async () => {
    try {
      const inventoryList = await fetchInventoryItems();
      setItems(inventoryList);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  useEffect(() => {
    const unsubItems = watchInventoryItems(
      (items) => {
        setItems(items);
        setConnectionStatus("online");
      },
      (error) => {
        console.error("Inventory realtime update failed:", error);
        setConnectionStatus("offline");
      },
    );

    const unsubCategories = watchCategories(
      (cats) => setCategories(cats),
      (err) => console.error("Categories fetch failed:", err)
    );

    return () => {
      unsubItems();
      unsubCategories();
    };
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
    return categories.map((cat) => cat.name);
  }, [categories]);

  const uniqueStocks = ["In Stock", "Low Stock", "Out of Stock"];

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
    setCurrentPage(1);
  }, []);

  const filteredItems = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    let result = items.filter((item) => {
      const status = computeStatus(item.quantity);
      if (selectedCategory && item.category !== selectedCategory) return false;
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
    });

    // Sorting
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valA, valB;
        switch (sortConfig.key) {
          case "id":
            valA = (a.id || a.docId || "").toLowerCase();
            valB = (b.id || b.docId || "").toLowerCase();
            break;
          case "name":
            valA = (a.name || "").toLowerCase();
            valB = (b.name || "").toLowerCase();
            break;
          case "category":
            valA = (a.category || "").toLowerCase();
            valB = (b.category || "").toLowerCase();
            break;
          case "quantity":
            valA = Number(a.quantity) || 0;
            valB = Number(b.quantity) || 0;
            return sortConfig.direction === "asc" ? valA - valB : valB - valA;
          case "status":
            valA = STOCK_PRIORITY[computeStatus(a.quantity)] || 0;
            valB = STOCK_PRIORITY[computeStatus(b.quantity)] || 0;
            return sortConfig.direction === "asc" ? valA - valB : valB - valA;
          default:
            return 0;
        }
        const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
        return sortConfig.direction === "asc" ? cmp : -cmp;
      });
    } else {
      // Default: sort by stock priority then name
      result.sort((a, b) => {
        const statusA = computeStatus(a.quantity);
        const statusB = computeStatus(b.quantity);
        const order = STOCK_PRIORITY[statusA] - STOCK_PRIORITY[statusB];
        if (order !== 0) return order;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    return result;
  }, [items, debouncedSearch, selectedCategory, selectedStock, sortConfig]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategory, selectedStock]);

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

    const idExists = checkIdConflict(
      items,
      payload.id,
      modalMode === "add",
      editItem?.docId,
    );

    if (idExists) {
      showAlert("This ID already exists. Please use a different ID.", "Error", "error");
      setIsSaving(false);
      return;
    }

    try {
      if (modalMode === "add") {
        const newDocId = await addInventoryItem(payload);
        await logInventoryAction({
          itemDocId: newDocId,
          itemName: payload.name,
          action: "create",
          quantityChanged: payload.quantity || 0,
          quantityBefore: 0,
          quantityAfter: payload.quantity || 0,
          userId: user?.id || "",
          userName: user?.displayName || user?.email || "",
        });
        showAlert("Inventory item added successfully.", "Success", "success");
      } else {
        const oldItem = items.find((i) => i.docId === editItem.docId);
        await updateInventoryItem(editItem.docId, payload);
        await logInventoryAction({
          itemDocId: editItem.docId,
          itemName: payload.name || editItem.name,
          action: "edit",
          quantityChanged: (payload.quantity || 0) - (oldItem?.quantity || 0),
          quantityBefore: oldItem?.quantity || 0,
          quantityAfter: payload.quantity || 0,
          userId: user?.id || "",
          userName: user?.displayName || user?.email || "",
        });
        showAlert("Inventory item updated successfully.", "Success", "success");
      }

      await loadInventory();
      closeModal();
    } catch (error) {
      console.error("Inventory change failed:", error);
      showAlert("Failed to save item. Please try again.", "Error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustQuantity = async (docId, delta) => {
    try {
      const { oldQty, newQty, item } = await adjustItemQuantity(docId, delta);
      await logInventoryAction({
        itemDocId: docId,
        itemName: item.name,
        action: delta > 0 ? "add" : "deduct",
        quantityChanged: delta,
        quantityBefore: oldQty,
        quantityAfter: newQty,
        userId: user?.uid,
        userName: user?.displayName || user?.email,
      });
    } catch (err) {
      console.error(err);
      showAlert("Failed to adjust quantity.", "Error", "error");
    }
  };

  const handleDeleteItem = async (docId) => {
    setIsSaving(true);
    const item = items.find((i) => i.docId === docId);

    try {
      await deleteInventoryItem(docId);
      await logInventoryAction({
        itemDocId: docId,
        itemName: item?.name || "",
        action: "delete",
        quantityChanged: -(item?.quantity || 0),
        quantityBefore: item?.quantity || 0,
        quantityAfter: 0,
        userId: user?.id || "",
        userName: user?.displayName || user?.email || "",
      });
      setItems((prev) => prev.filter((item) => item.docId !== docId));
      showAlert("Inventory item deleted successfully.", "Success", "success");
    } catch (error) {
      console.error("Delete inventory failed:", error);
      showAlert("Failed to delete item. Please try again.", "Error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const promptDelete = (item) => {
    showConfirmation(
      `Are you sure you want to delete "${item.name || item.id || "this item"}"? This action cannot be undone.`,
      "Confirm Delete",
      async (confirmed) => {
        if (!confirmed) return;
        await handleDeleteItem(item.docId);
      },
    );
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return <span className="sort-arrow sort-arrow--inactive">⇅</span>;
    return (
      <span className="sort-arrow sort-arrow--active">
        {sortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="inventory-directory">
      <div className="inventory-label">
        <h1>Inventory Directory</h1>
        <p>
          Track and manage all inventory items, stock levels, and categories.
        </p>
        <div className="realtime-status">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              color: connectionStatus === "online" ? "#0f9d58" : "#d93025",
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background:
                  connectionStatus === "online" ? "#0f9d58" : "#d93025",
                display: "inline-block",
              }}
            />
            {connectionStatus === "online"
              ? "Live updates active"
              : "Live updates offline"}
          </span>
        </div>
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
            onClick={() => setIsCategoryModalOpen(true)}
          >
            Manage Categories
          </button>
          <button
            className="inventory-scan-button"
            type="button"
            onClick={() => setScannerOpen(true)}
          >
            <img src={cameraIcon} alt="" aria-hidden="true" /> Scan
          </button>
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
          <div
            className="inventory-sortable-header"
            onClick={() => handleSort("id")}
          >
            ID {renderSortArrow("id")}
          </div>
          <div
            className="inventory-sortable-header"
            onClick={() => handleSort("name")}
          >
            NAME {renderSortArrow("name")}
          </div>
          <div
            ref={categoryFilterRef}
            className="inventory-label-cell inventory-label-cell-filter"
          >
            <button
              type="button"
              className="inventory-label-filter-btn"
              onClick={() => {
                setStockDropdownOpen(false);
                setCategoryDropdownOpen((o) => !o);
              }}
              aria-expanded={categoryDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="inventory-label-filter-text">CATEGORY</span>
              {selectedCategory ? (
                <span className="inventory-label-filter-active">
                  {" "}({selectedCategory})
                </span>
              ) : null}
              <span className="inventory-label-filter-chevron" aria-hidden>▼</span>
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

          <div
            className="inventory-sortable-header"
            onClick={() => handleSort("quantity")}
          >
            QUANTITY {renderSortArrow("quantity")}
          </div>
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
              <span className="inventory-label-filter-text">STOCK</span>
              {selectedStock ? (
                <span className="inventory-label-filter-active">
                  {" "}({selectedStock})
                </span>
              ) : null}
              <span className="inventory-label-filter-chevron" aria-hidden>▼</span>
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
          <div aria-hidden="true" />
        </div>

        <div className="inventory-table-body">
          {paginatedItems.length === 0 ? (
            <div className="inventory-empty-state">
              No inventory items found.
            </div>
          ) : (
            paginatedItems.map((item) => (
              <InventoryRow
                key={item.docId || item.id || item.name}
                item={item}
                onEditStart={openEditModal}
                onDelete={(itemToDelete) => promptDelete(itemToDelete)}
                onGenerateQR={(item) => setQrItem(item)}
                onViewHistory={(item) => setAuditItem(item)}
                onAdjustQuantity={handleAdjustQuantity}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="inventory-pagination">
          <button
            type="button"
            className="inventory-page-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            ‹ Prev
          </button>
          <span className="inventory-page-info">
            Page {currentPage} of {totalPages} ({filteredItems.length} items)
          </span>
          <button
            type="button"
            className="inventory-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next ›
          </button>
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
          categories={categories}
        />
      )}

      {qrItem && (
        <QRLabelModal item={qrItem} onClose={() => setQrItem(null)} />
      )}

      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          userId={user?.id || ""}
          userName={user?.displayName || user?.email || ""}
          onComplete={() => loadInventory()}
        />
      )}

      {auditItem && (
        <AuditTrailModal
          item={auditItem}
          onClose={() => setAuditItem(null)}
        />
      )}

      {isCategoryModalOpen && (
        <ManageCategoriesModal
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          items={items}
        />
      )}
    </div>
  );
}

export default Inventory;
