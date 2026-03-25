import { useState } from "react";
import { closeIcon, trashIcon, editIcon } from "../../../assets/Icons/index.js";
import { addCategory, updateCategory, deleteCategory } from "./../InventoryServices.jsx";
import { useAlert } from "../../../GlobalComponents/useAlert.js";

function ManageCategoriesModal({ onClose, categories, items }) {
  const { showAlert, showConfirmation } = useAlert();
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const nameStr = newCatName.trim();
    if (categories.some(c => c.name.toLowerCase() === nameStr.toLowerCase())) {
      showAlert("Category already exists.", "Error", "error");
      return;
    }
    setLoading(true);
    try {
      await addCategory(nameStr);
      setNewCatName("");
    } catch (err) {
      console.error(err);
      showAlert("Failed to add category.", "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (docId) => {
    const nameStr = editName.trim();
    if (!nameStr) return;
    if (categories.some(c => c.docId !== docId && c.name.toLowerCase() === nameStr.toLowerCase())) {
      showAlert("Category already exists.", "Error", "error");
      return;
    }
    setLoading(true);
    try {
      await updateCategory(docId, nameStr);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      showAlert("Failed to update category.", "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (cat) => {
    const isUsed = items.some(item => (item.category || "") === cat.name);
    if (isUsed) {
      showAlert(`Cannot delete "${cat.name}" because it is currently assigned to one or more inventory items.`, "Error", "error");
      return;
    }
    showConfirmation(`Are you sure you want to delete the category "${cat.name}"?`, "Confirm Delete", async (confirmed) => {
      if (!confirmed) return;
      setLoading(true);
      try {
        await deleteCategory(cat.docId);
      } catch (err) {
        console.error(err);
        showAlert("Failed to delete category.", "Error", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="inventory-modal-overlay">
      <div className="inventory-modal" role="dialog" aria-modal="true" style={{ width: 'min(92vw, 420px)' }}>
        <button className="inventory-modal-close" type="button" onClick={onClose}>
          <img src={closeIcon} alt="Close" />
        </button>
        <h1>Manage Categories</h1>

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="New category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', fontSize: '0.95rem' }}
          />
          <button
            type="submit"
            disabled={loading || !newCatName.trim()}
            style={{ padding: '0 16px', background: '#a71a2b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            Add
          </button>
        </form>

        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {categories.length === 0 && <p style={{ color: '#666', fontSize: '0.9rem', margin: '0' }}>No categories found.</p>}
          {categories.map((cat) => (
            <div key={cat.docId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              {editingId === cat.docId ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    disabled={loading}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #aaa', borderRadius: '4px', outline: 'none' }}
                  />
                  <button type="button" onClick={() => handleUpdate(cat.docId)} disabled={loading || !editName.trim()} style={{ background: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Save</button>
                  <button type="button" onClick={() => setEditingId(null)} disabled={loading} style={{ background: '#757575', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cancel</button>
                </div>
              ) : (
                <>
                  <span style={{ fontWeight: 500, color: '#333', fontSize: '0.95rem' }}>{cat.name}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => { setEditingId(cat.docId); setEditName(cat.name); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} title="Edit">
                      <img src={editIcon} alt="Edit" style={{ width: '15px', height: '15px' }} />
                    </button>
                    <button type="button" onClick={() => handleDelete(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} title="Delete">
                      <img src={trashIcon} alt="Delete" style={{ width: '15px', height: '15px' }} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManageCategoriesModal;
