import { useState, useEffect } from "react";
import { addIcon, closeIcon } from "../../../assets/Icons/index.js";
import { CONDITION_OPTIONS } from "../InventoryServices.jsx";

function AddItemModal({
  onClose,
  onSubmit,
  loading,
  initialData = { id: "", name: "", category: "", quantity: "", condition: "Good" },
  title = "Add Inventory Item",
  submitLabel = "Add Item",
  categories = [],
}) {
  const [form, setForm] = useState(initialData);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = (form.name || "").trim();
    const category = (form.category || "").trim();

    if (!name || !category) {
      setError("Name and category are required.");
      return;
    }

    const quantityValue =
      form.quantity === "" ||
      form.quantity === null ||
      form.quantity === undefined
        ? 0
        : Number(form.quantity);

    if (Number.isNaN(quantityValue) || quantityValue < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }

    const idValue = (form.id || "").trim();

    onSubmit({
      id: idValue,
      name,
      category,
      quantity: quantityValue,
      condition: form.condition || "Good",
    });
  };

  return (
    <div className="inventory-modal-overlay">
      <div
        className="inventory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-modal-title"
      >
        <button
          className="inventory-modal-close"
          type="button"
          onClick={onClose}
        >
          <img src={closeIcon} alt="Close" />
        </button>
        <h1 id="inventory-modal-title">{title}</h1>

        <form className="inventory-modal-form" onSubmit={handleSubmit}>
          <label>
            Item ID
            <input
              type="text"
              value={form.id}
              disabled
              placeholder="Auto-generated item code"
            />
          </label>

          <label>
            Item name
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter item name"
              required
            />
          </label>

          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((cat) => (
                <option key={cat.docId} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Condition
            <select
              value={form.condition || "Good"}
              onChange={(e) => handleChange("condition", e.target.value)}
            >
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {error && <div className="inventory-error-message">{error}</div>}

          <button
            className="inventory-modal-submit"
            type="submit"
            disabled={loading}
          >
            <img src={addIcon} alt="Add" />
            {loading ? "Saving..." : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddItemModal;
