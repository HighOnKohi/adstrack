import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { closeIcon } from "../../../assets/Icons/index.js";
import {
  getInventoryItem,
  adjustItemQuantity,
  logInventoryAction,
} from "../InventoryServices.jsx";
import "./ScannerModal.css";

const STEPS = {
  ACTION: "action",
  SCANNING: "scanning",
  QUANTITY: "quantity",
  RESULT: "result",
};

function ScannerModal({ onClose, userId, userName, onComplete }) {
  const [step, setStep] = useState(STEPS.ACTION);
  const [action, setAction] = useState(null); // "add" or "deduct"
  const [scannedItem, setScannedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop();
        }
      } catch (e) {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    setError("");
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          // Look up the item
          try {
            const item = await getInventoryItem(decodedText);
            if (!item) {
              setError(
                `No inventory item found for scanned code: "${decodedText}". Please make sure you are scanning a valid inventory QR label.`,
              );
              setStep(STEPS.ACTION);
              return;
            }
            setScannedItem(item);
            setStep(STEPS.QUANTITY);
          } catch (err) {
            setError(
              "Failed to look up the scanned item. Please check your connection and try again.",
            );
            setStep(STEPS.ACTION);
          }
        },
        () => {
          // Ignore scan failures (e.g. no QR in frame)
        },
      );
    } catch (err) {
      console.error("Scanner start error:", err);
      if (
        err.toString().includes("NotAllowedError") ||
        err.toString().includes("Permission")
      ) {
        setError(
          "Camera permission denied. Please allow camera access in your browser settings to use the scanner.",
        );
      } else {
        setError(
          "Unable to access the camera. Make sure no other app is using it and try again.",
        );
      }
      setStep(STEPS.ACTION);
    }
  };

  useEffect(() => {
    if (step === STEPS.SCANNING) {
      // Small delay to let the DOM render the video container
      const timeout = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timeout);
    }
    return () => {};
  }, [step]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleSelectAction = (selectedAction) => {
    setAction(selectedAction);
    setError("");
    setStep(STEPS.SCANNING);
  };

  const handleConfirmQuantity = async () => {
    if (!scannedItem || !action) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity greater than 0.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const delta = action === "add" ? qty : -qty;
      const { oldQty, newQty } = await adjustItemQuantity(
        scannedItem.docId,
        delta,
      );

      await logInventoryAction({
        itemDocId: scannedItem.docId,
        itemName: scannedItem.name,
        action: action === "add" ? "add" : "deduct",
        quantityChanged: delta,
        quantityBefore: oldQty,
        quantityAfter: newQty,
        userId,
        userName,
      });

      setResultMessage(
        `Successfully ${action === "add" ? "added" : "deducted"} ${qty} unit(s) of "${scannedItem.name}". New quantity: ${newQty}`,
      );
      setStep(STEPS.RESULT);
      if (onComplete) onComplete();
    } catch (err) {
      console.error("Quantity adjustment error:", err);
      setError(
        "Failed to update the item quantity. Please check your connection and try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanAnother = () => {
    setScannedItem(null);
    setQuantity(1);
    setResultMessage("");
    setError("");
    setStep(STEPS.ACTION);
  };

  return (
    <div className="inventory-modal-overlay" onClick={onClose}>
      <div
        className="inventory-modal scanner-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="inventory-modal-close"
          type="button"
          onClick={() => {
            stopScanner();
            onClose();
          }}
        >
          <img src={closeIcon} alt="Close" />
        </button>

        <h1>
          {step === STEPS.ACTION && "Scan Inventory"}
          {step === STEPS.SCANNING && "Scanning..."}
          {step === STEPS.QUANTITY && "Enter Quantity"}
          {step === STEPS.RESULT && "Success"}
        </h1>

        {/* Step indicator */}
        <div className="scanner-steps">
          {["Choose Action", "Scan QR", "Quantity", "Done"].map((label, i) => {
            const stepKeys = [
              STEPS.ACTION,
              STEPS.SCANNING,
              STEPS.QUANTITY,
              STEPS.RESULT,
            ];
            const isActive = stepKeys.indexOf(step) >= i;
            return (
              <div
                key={label}
                className={`scanner-step ${isActive ? "active" : ""}`}
              >
                <span className="scanner-step-num">{i + 1}</span>
                <span className="scanner-step-label">{label}</span>
              </div>
            );
          })}
        </div>

        {error && <div className="inventory-error-message">{error}</div>}

        {/* Step: Choose Action */}
        {step === STEPS.ACTION && (
          <div className="scanner-action-buttons">
            <button
              type="button"
              className="scanner-action-btn scanner-action-add"
              onClick={() => handleSelectAction("add")}
            >
              <span className="scanner-action-icon material-symbols-outlined">add_circle</span>
              <span className="scanner-action-label">Add Stock</span>
              <span className="scanner-action-desc">
                Increase item quantity
              </span>
            </button>
            <button
              type="button"
              className="scanner-action-btn scanner-action-deduct"
              onClick={() => handleSelectAction("deduct")}
            >
              <span className="scanner-action-icon material-symbols-outlined">remove_circle</span>
              <span className="scanner-action-label">Deduct Stock</span>
              <span className="scanner-action-desc">
                Decrease item quantity
              </span>
            </button>
          </div>
        )}

        {/* Step: Scanning */}
        {step === STEPS.SCANNING && (
          <div className="scanner-viewfinder">
            <div id="qr-reader" ref={containerRef} />
            <p className="scanner-hint">
              Point your camera at an inventory QR label
            </p>
          </div>
        )}

        {/* Step: Quantity */}
        {step === STEPS.QUANTITY && scannedItem && (
          <div className="scanner-quantity-form">
            <div className="scanner-item-preview">
              <div className="scanner-item-name">{scannedItem.name}</div>
              <div className="scanner-item-detail">
                {scannedItem.category} • Current Qty:{" "}
                {scannedItem.quantity ?? 0}
              </div>
            </div>

            <div className="scanner-quantity-row">
              <label className="scanner-quantity-label">
                {action === "add" ? "Add" : "Deduct"} how many?
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="scanner-quantity-input"
                autoFocus
              />
            </div>

            <button
              type="button"
              className="inventory-modal-submit"
              onClick={handleConfirmQuantity}
              disabled={isProcessing}
            >
              {isProcessing
                ? "Processing..."
                : `Confirm ${action === "add" ? "Addition" : "Deduction"}`}
            </button>
          </div>
        )}

        {/* Step: Result */}
        {step === STEPS.RESULT && (
          <div className="scanner-result">
            <div className="scanner-result-icon"><span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#2e7d32' }}>check_circle</span></div>
            <p className="scanner-result-message">{resultMessage}</p>
            <div className="scanner-result-actions">
              <button
                type="button"
                className="inventory-modal-submit"
                onClick={handleScanAnother}
              >
                Scan Another
              </button>
              <button
                type="button"
                className="scanner-close-btn"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScannerModal;
