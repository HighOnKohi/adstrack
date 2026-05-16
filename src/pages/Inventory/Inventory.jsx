import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { addIcon, printIcon } from "../../assets/Icons/index.js";
import { useAlert } from "../../GlobalComponents/useAlert.js";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import { CSVLink } from "react-csv";
import { renderToString } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
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
  CONDITION_OPTIONS,
  getNextId,
  checkIdConflict,
  watchInventoryItems,
  logInventoryAction,
  watchCategories,
  adjustItemQuantity,
  watchLatestLogTimestamps,
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

function SkeletonRow() {
  return (
    <div className="inventory-row inventory-skeleton-row">
      <div className="skeleton-cell"><div className="skeleton-pulse" /></div>
      <div className="skeleton-cell"><div className="skeleton-pulse" /></div>
      <div className="skeleton-cell"><div className="skeleton-pulse" /></div>
      <div className="skeleton-cell"><div className="skeleton-pulse" /></div>
      <div className="skeleton-cell"><div className="skeleton-pulse skeleton-pulse--short" /></div>
      <div className="skeleton-cell"><div className="skeleton-pulse skeleton-pulse--short" /></div>
      <div className="skeleton-cell"><div className="skeleton-pulse skeleton-pulse--short" /></div>
      <div className="skeleton-cell"><div className="skeleton-pulse skeleton-pulse--short" /></div>
      <div className="skeleton-cell" />
    </div>
  );
}

function Inventory() {
  const { showConfirmation } = useAlert();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStock, setSelectedStock] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editItem, setEditItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const [qrItem, setQrItem] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [auditItem, setAuditItem] = useState(null);
  const [logTimestamps, setLogTimestamps] = useState({});

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);

  const [filterMonthFrom, setFilterMonthFrom] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterMonthTo, setFilterMonthTo] = useState(() => new Date().toISOString().slice(0, 7));

  const categoryFilterRef = useRef(null);
  const stockFilterRef = useRef(null);
  const conditionFilterRef = useRef(null);

  const loadInventory = async () => {
    try {
      const inventoryList = await fetchInventoryItems();
      setItems(inventoryList.filter((i) => !i.isDeleted));
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  useEffect(() => {
    const unsubItems = watchInventoryItems(
      (items) => {
        setItems(items);
        setConnectionStatus("online");
        setIsLoading(false);
      },
      (error) => {
        console.error("Inventory realtime update failed:", error);
        setConnectionStatus("offline");
        setIsLoading(false);
      },
    );

    const unsubCategories = watchCategories(
      (cats) => setCategories(cats),
      (err) => console.error("Categories fetch failed:", err)
    );

    const unsubLogs = watchLatestLogTimestamps(
      (map) => setLogTimestamps(map),
      (err) => console.error("Log timestamps fetch failed:", err)
    );

    return () => {
      unsubItems();
      unsubCategories();
      unsubLogs();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target))
        setCategoryDropdownOpen(false);
      if (stockFilterRef.current && !stockFilterRef.current.contains(e.target))
        setStockDropdownOpen(false);
      if (conditionFilterRef.current && !conditionFilterRef.current.contains(e.target))
        setConditionDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueCategories = useMemo(() => categories.map((cat) => cat.name), [categories]);
  const uniqueStocks = ["In Stock", "Low Stock", "Out of Stock"];

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
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
      if (selectedCondition && (item.condition || "Good") !== selectedCondition) return false;
      // Month range filter on last updated
      if (filterMonthFrom || filterMonthTo) {
        const ts = logTimestamps[item.docId];
        if (!ts) return false;
        const itemMonth = ts instanceof Date
          ? ts.toISOString().slice(0, 7)
          : new Date(ts).toISOString().slice(0, 7);
        if (filterMonthFrom && itemMonth < filterMonthFrom) return false;
        if (filterMonthTo && itemMonth > filterMonthTo) return false;
      }
      const name = (item.name || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      const id = (item.id || item.docId || "").toLowerCase();
      if (!term) return true;
      return name.includes(term) || category.includes(term) || id.includes(term);
    });

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
      result.sort((a, b) => {
        const statusA = computeStatus(a.quantity);
        const statusB = computeStatus(b.quantity);
        const order = STOCK_PRIORITY[statusA] - STOCK_PRIORITY[statusB];
        if (order !== 0) return order;
        return (a.name || "").localeCompare(b.name || "");
      });
    }
    return result;
  }, [items, debouncedSearch, selectedCategory, selectedStock, selectedCondition, sortConfig, logTimestamps, filterMonthFrom, filterMonthTo]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, selectedCategory, selectedStock, selectedCondition, filterMonthFrom, filterMonthTo]);

  // Selection
  const handleSelectToggle = (docId) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === paginatedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedItems.map((i) => i.docId)));
    }
  };

  // Print selected
  const handlePrintSelected = () => {
    if (selectedItems.size === 0) {
      toast.error("Please select items to print.");
      return;
    }
    const selected = items.filter((i) => selectedItems.has(i.docId));
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Pop-up blocked. Please allow pop-ups."); return; }
    const rows = selected.map((item) => `
      <tr>
        <td>${item.id || item.docId}</td>
        <td>${item.name || "-"}</td>
        <td>${item.category || "-"}</td>
        <td>${item.quantity ?? 0}</td>
        <td>${computeStatus(item.quantity)}</td>
        <td>${item.condition || "Good"}</td>
      </tr>`).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Inventory Print</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#a71a2b;font-size:1.5rem}
      table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:0.85rem}
      th{background:#a71a2b;color:#fff;text-transform:uppercase;font-size:0.75rem}
      tr:nth-child(even){background:#f9f9f9}.print-date{color:#666;font-size:0.8rem;margin-top:4px}</style></head>
      <body><h1>Inventory Report</h1><p class="print-date">Generated: ${new Date().toLocaleString()}</p>
      <table><thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Qty</th><th>Stock</th><th>Condition</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  // Print selected QR codes
  const handlePrintQRCodes = () => {
    if (selectedItems.size === 0) {
      toast.error("Please select items to print QR codes.");
      return;
    }
    const selected = items.filter((i) => selectedItems.has(i.docId));
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Pop-up blocked. Please allow pop-ups."); return; }
    const qrCards = selected.map((item) => {
      const svgMarkup = renderToString(
        <QRCodeSVG value={item.docId} size={150} level="M" />
      );
      return `<div class="qr-card">
        <div class="qr-code">${svgMarkup}</div>
        <div class="qr-info">
          <div class="qr-name">${item.name || "Unnamed"}</div>
          <div class="qr-cat">${item.category || "No Category"}</div>
          <div class="qr-id">${item.id || item.docId}</div>
        </div>
      </div>`;
    }).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>QR Codes - Inventory</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;margin:0}
        h1{color:#a71a2b;font-size:1.5rem;margin-bottom:4px}
        .print-date{color:#666;font-size:0.8rem;margin-bottom:20px}
        .qr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px}
        .qr-card{border:2px dashed #ddd;border-radius:12px;padding:16px;text-align:center;break-inside:avoid}
        .qr-code{display:flex;justify-content:center;margin-bottom:10px}
        .qr-name{font-weight:700;font-size:0.95rem;color:#1a1a1a}
        .qr-cat{font-size:0.8rem;color:#666;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px}
        .qr-id{font-size:0.75rem;color:#999;font-family:monospace;margin-top:4px}
        @media print{body{padding:10px}.qr-grid{grid-template-columns:repeat(3,1fr);gap:15px}.qr-card{border:2px dashed #ccc;page-break-inside:avoid}}
      </style></head>
      <body><h1>Inventory QR Labels</h1>
      <p class="print-date">Generated: ${new Date().toLocaleString()} \u2022 ${selected.length} label(s)</p>
      <div class="qr-grid">${qrCards}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  // CSV data
  const csvData = useMemo(() => {
    const source = selectedItems.size > 0 ? items.filter((i) => selectedItems.has(i.docId)) : filteredItems;
    return source.map((item) => ({
      ID: item.id || item.docId,
      Name: item.name || "",
      Category: item.category || "",
      Quantity: item.quantity ?? 0,
      Stock: computeStatus(item.quantity),
      Condition: item.condition || "Good",
    }));
  }, [items, filteredItems, selectedItems]);

  const openAddModal = () => { setModalMode("add"); setEditItem(null); setIsModalOpen(true); };
  const openEditModal = (item) => { setModalMode("edit"); setEditItem(item); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditItem(null); };

  const handleModalSubmit = async (payload) => {
    setIsSaving(true);
    const idExists = checkIdConflict(items, payload.id, modalMode === "add", editItem?.docId);
    if (idExists) {
      toast.error("This ID already exists. Please use a different ID.");
      setIsSaving(false);
      return;
    }
    try {
      if (modalMode === "add") {
        const newDocId = await addInventoryItem(payload);
        await logInventoryAction({ itemDocId: newDocId, itemName: payload.name, action: "create", quantityChanged: payload.quantity || 0, quantityBefore: 0, quantityAfter: payload.quantity || 0, userId: user?.id || "", userName: user?.displayName || user?.email || "" });
        toast.success("Inventory item added successfully.");
      } else {
        const oldItem = items.find((i) => i.docId === editItem.docId);
        await updateInventoryItem(editItem.docId, payload);
        await logInventoryAction({ itemDocId: editItem.docId, itemName: payload.name || editItem.name, action: "edit", quantityChanged: (payload.quantity || 0) - (oldItem?.quantity || 0), quantityBefore: oldItem?.quantity || 0, quantityAfter: payload.quantity || 0, userId: user?.id || "", userName: user?.displayName || user?.email || "" });
        toast.success("Inventory item updated successfully.");
      }
      await loadInventory();
      closeModal();
    } catch (error) {
      console.error("Inventory change failed:", error);
      toast.error("Failed to save item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustQuantity = async (docId, delta) => {
    try {
      const { oldQty, newQty, item } = await adjustItemQuantity(docId, delta);
      await logInventoryAction({ itemDocId: docId, itemName: item.name, action: delta > 0 ? "add" : "deduct", quantityChanged: delta, quantityBefore: oldQty, quantityAfter: newQty, userId: user?.uid, userName: user?.displayName || user?.email });
    } catch (err) {
      console.error(err);
      toast.error("Failed to adjust quantity.");
    }
  };

  const handleDeleteItem = async (docId) => {
    setIsSaving(true);
    const item = items.find((i) => i.docId === docId);
    try {
      await deleteInventoryItem(docId);
      await logInventoryAction({ itemDocId: docId, itemName: item?.name || "", action: "archive", quantityChanged: -(item?.quantity || 0), quantityBefore: item?.quantity || 0, quantityAfter: 0, userId: user?.id || "", userName: user?.displayName || user?.email || "" });
      setItems((prev) => prev.filter((item) => item.docId !== docId));
      toast.success("Item archived successfully.");
    } catch (error) {
      console.error("Archive inventory failed:", error);
      toast.error("Failed to archive item.");
    } finally {
      setIsSaving(false);
    }
  };

  const promptDelete = (item) => {
    showConfirmation(
      `Are you sure you want to archive "${item.name || item.id || "this item"}"? It will be hidden from the inventory.`,
      "Confirm Archive",
      async (confirmed) => {
        if (!confirmed) return;
        await handleDeleteItem(item.docId);
      },
    );
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return <span className="sort-arrow sort-arrow--inactive material-symbols-outlined">swap_vert</span>;
    return <span className="sort-arrow sort-arrow--active material-symbols-outlined">{sortConfig.direction === "asc" ? "arrow_upward" : "arrow_downward"}</span>;
  };

  const allOnPageSelected = paginatedItems.length > 0 && paginatedItems.every((i) => selectedItems.has(i.docId));

  return (
    <div className="inventory-directory">
      <div className="inventory-label">
        <h1>Inventory Directory</h1>
        <p>Track and manage all inventory items, stock levels, and categories.</p>
        <div className="realtime-status">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: connectionStatus === "online" ? "#0f9d58" : "#d93025" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: connectionStatus === "online" ? "#0f9d58" : "#d93025", display: "inline-block" }} />
            {connectionStatus === "online" ? "Live updates active" : "Live updates offline"}
          </span>
        </div>
      </div>

      <div className="inventory-top-row">
        <div className="inventory-search-bar">
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search item name or ID" type="search" aria-label="Search inventory" />
        </div>
        <div className="inventory-top-buttons">
          <button className="inventory-add-button" type="button" onClick={() => setIsCategoryModalOpen(true)}>Manage Categories</button>
          <button className="inventory-scan-button" type="button" onClick={() => setScannerOpen(true)}>
            <img src={cameraIcon} alt="" aria-hidden="true" /> Scan
          </button>
          <button className="inventory-add-button" type="button" onClick={handlePrintSelected}>
            <img src={printIcon} alt="Print" /> Print Selected
          </button>
          <button className="inventory-add-button" type="button" onClick={handlePrintQRCodes}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>qr_code_2</span> Print QR Codes
          </button>
          <CSVLink data={csvData} filename={`inventory_${new Date().toISOString().slice(0, 10)}.csv`} className="inventory-csv-btn" aria-label="Export CSV">
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>download</span> Export CSV
          </CSVLink>
          <button className="inventory-add-button" type="button" onClick={openAddModal} disabled={isSaving}>
            <img src={addIcon} alt="Add" /> Add Item
          </button>
        </div>
      </div>

      <div className="inventory-filters">
        <div className="inventory-filter-field">
          <label htmlFor="mobile-category-filter">Category</label>
          <select id="mobile-category-filter" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All categories</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="inventory-filter-field">
          <label htmlFor="mobile-stock-filter">Stock</label>
          <select id="mobile-stock-filter" value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)}>
            <option value="">All stocks</option>
            {uniqueStocks.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="inventory-filter-field">
          <label htmlFor="mobile-condition-filter">Condition</label>
          <select id="mobile-condition-filter" value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)}>
            <option value="">All conditions</option>
            {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="inventory-date-filter">
        <div className="inventory-date-filter-fields">
          <div className="inventory-filter-field">
            <label htmlFor="filter-month-from">Updated From</label>
            <input type="month" id="filter-month-from" value={filterMonthFrom} onChange={(e) => setFilterMonthFrom(e.target.value)} />
          </div>
          <div className="inventory-filter-field">
            <label htmlFor="filter-month-to">Updated To</label>
            <input type="month" id="filter-month-to" value={filterMonthTo} onChange={(e) => setFilterMonthTo(e.target.value)} />
          </div>
        </div>
        {(filterMonthFrom || filterMonthTo) && (
          <button type="button" className="inventory-date-clear-btn" onClick={() => { setFilterMonthFrom(""); setFilterMonthTo(""); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span> Clear Date Filter
          </button>
        )}
      </div>

      <div className="inventory-table">
        <div className="inventory-table-header">
          <div className="inventory-header-checkbox">
            <input type="checkbox" checked={allOnPageSelected} onChange={handleSelectAll} aria-label="Select all items on page" className="inventory-select-checkbox" />
          </div>
          <div className="inventory-sortable-header" onClick={() => handleSort("id")}>ID {renderSortArrow("id")}</div>
          <div className="inventory-sortable-header" onClick={() => handleSort("name")}>NAME {renderSortArrow("name")}</div>
          <div ref={categoryFilterRef} className="inventory-label-cell inventory-label-cell-filter">
            <button type="button" className="inventory-label-filter-btn" onClick={() => { setStockDropdownOpen(false); setConditionDropdownOpen(false); setCategoryDropdownOpen((o) => !o); }} aria-expanded={categoryDropdownOpen} aria-haspopup="listbox">
              <span className="inventory-label-filter-text">CATEGORY</span>
              {selectedCategory ? <span className="inventory-label-filter-active"> ({selectedCategory})</span> : null}
              <span className="inventory-label-filter-chevron material-symbols-outlined" aria-hidden>expand_more</span>
            </button>
            {categoryDropdownOpen && (
              <div className="inventory-filter-dropdown" role="listbox">
                <button type="button" className="inventory-filter-option" onClick={() => { setSelectedCategory(""); setCategoryDropdownOpen(false); }} role="option" aria-selected={!selectedCategory}>All categories</button>
                {uniqueCategories.map((c) => <button key={c} type="button" className="inventory-filter-option" onClick={() => { setSelectedCategory(c); setCategoryDropdownOpen(false); }} role="option" aria-selected={selectedCategory === c}>{c}</button>)}
              </div>
            )}
          </div>
          <div className="inventory-sortable-header" onClick={() => handleSort("quantity")}>QUANTITY {renderSortArrow("quantity")}</div>
          <div ref={stockFilterRef} className="inventory-label-cell inventory-label-cell-filter">
            <button type="button" className="inventory-label-filter-btn" onClick={() => { setCategoryDropdownOpen(false); setConditionDropdownOpen(false); setStockDropdownOpen((o) => !o); }} aria-expanded={stockDropdownOpen} aria-haspopup="listbox">
              <span className="inventory-label-filter-text">STOCK</span>
              {selectedStock ? <span className="inventory-label-filter-active"> ({selectedStock})</span> : null}
              <span className="inventory-label-filter-chevron material-symbols-outlined" aria-hidden>expand_more</span>
            </button>
            {stockDropdownOpen && (
              <div className="inventory-filter-dropdown" role="listbox">
                <button type="button" className="inventory-filter-option" onClick={() => { setSelectedStock(""); setStockDropdownOpen(false); }} role="option" aria-selected={!selectedStock}>All stocks</button>
                {uniqueStocks.map((s) => <button key={s} type="button" className="inventory-filter-option" onClick={() => { setSelectedStock(s); setStockDropdownOpen(false); }} role="option" aria-selected={selectedStock === s}>{s}</button>)}
              </div>
            )}
          </div>
          <div ref={conditionFilterRef} className="inventory-label-cell inventory-label-cell-filter">
            <button type="button" className="inventory-label-filter-btn" onClick={() => { setCategoryDropdownOpen(false); setStockDropdownOpen(false); setConditionDropdownOpen((o) => !o); }} aria-expanded={conditionDropdownOpen} aria-haspopup="listbox">
              <span className="inventory-label-filter-text">CONDITION</span>
              {selectedCondition ? <span className="inventory-label-filter-active"> ({selectedCondition})</span> : null}
              <span className="inventory-label-filter-chevron material-symbols-outlined" aria-hidden>expand_more</span>
            </button>
            {conditionDropdownOpen && (
              <div className="inventory-filter-dropdown" role="listbox">
                <button type="button" className="inventory-filter-option" onClick={() => { setSelectedCondition(""); setConditionDropdownOpen(false); }} role="option" aria-selected={!selectedCondition}>All conditions</button>
                {CONDITION_OPTIONS.map((c) => <button key={c.value} type="button" className="inventory-filter-option" onClick={() => { setSelectedCondition(c.value); setConditionDropdownOpen(false); }} role="option" aria-selected={selectedCondition === c.value}>{c.label}</button>)}
              </div>
            )}
          </div>
          <div>LAST UPDATED</div>
          <div aria-hidden="true" />
        </div>

        <div className="inventory-table-body">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : paginatedItems.length === 0 ? (
            <div className="inventory-empty-state">No inventory items found.</div>
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
                isSelected={selectedItems.has(item.docId)}
                onSelectToggle={handleSelectToggle}
                lastUpdated={logTimestamps[item.docId] || null}
              />
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="inventory-pagination">
          <button type="button" className="inventory-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>‹ Prev</button>
          <span className="inventory-page-info">Page {currentPage} of {totalPages} ({filteredItems.length} items)</span>
          <button type="button" className="inventory-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next ›</button>
        </div>
      )}

      {isModalOpen && (
        <AddItemModal
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          loading={isSaving}
          initialData={modalMode === "edit" ? { id: editItem.id || "", name: editItem.name || "", category: editItem.category || "", quantity: editItem.quantity ?? 0, condition: editItem.condition || "Good" } : { id: getNextId(items), name: "", category: "", quantity: "", condition: "Good" }}
          title={modalMode === "edit" ? "Edit Inventory Item" : "Add Inventory Item"}
          submitLabel={modalMode === "edit" ? "Save Changes" : "Add Item"}
          categories={categories}
        />
      )}

      {qrItem && <QRLabelModal item={qrItem} onClose={() => setQrItem(null)} />}
      {scannerOpen && <ScannerModal onClose={() => setScannerOpen(false)} userId={user?.id || ""} userName={user?.displayName || user?.email || ""} onComplete={() => loadInventory()} />}
      {auditItem && <AuditTrailModal item={auditItem} onClose={() => setAuditItem(null)} />}
      {isCategoryModalOpen && <ManageCategoriesModal onClose={() => setIsCategoryModalOpen(false)} categories={categories} items={items} />}
    </div>
  );
}

export default Inventory;
