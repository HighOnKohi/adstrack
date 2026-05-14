import { useState, useCallback } from "react";
import { AlertModalContext } from "./useAlert.js";

export function AlertModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("Alert");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [callback, setCallback] = useState(null);
  const [isConfirmation, setIsConfirmation] = useState(false);

  const showAlert = useCallback(
    (msg, alertTitle = "Alert", alertType = "info") => {
      setMessage(msg);
      setTitle(alertTitle);
      setType(alertType);
      setIsConfirmation(false);
      setCallback(null);
      setIsOpen(true);
    },
    [],
  );

  const showConfirmation = useCallback(
    (msg, confirmTitle = "Confirm", onConfirm) => {
      setMessage(msg);
      setTitle(confirmTitle);
      setType("warning");
      setIsConfirmation(true);
      setCallback(() => onConfirm);
      setIsOpen(true);
    },
    [],
  );

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (callback) {
      callback(true);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (callback) {
      callback(false);
    }
    setIsOpen(false);
  };

  const getButtonColor = () => {
    switch (type) {
      case "error":
        return "#a71a2b";
      case "success":
        return "#0f9d58";
      case "warning":
        return "#a71a2b";
      default:
        return "#a71a2b";
    }
  };

  return (
    <AlertModalContext.Provider value={{ showAlert, showConfirmation }}>
      {children}
      {isOpen && (
        <div className="alert-modal-overlay" onClick={handleClose}>
          <div
            className="alert-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="alert-modal-title">{title}</h2>
            <p className="alert-modal-message">{message}</p>

            <div className="alert-modal-actions">
              {isConfirmation ? (
                <>
                  <button
                    className="alert-modal-button alert-modal-cancel"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className="alert-modal-button alert-modal-confirm"
                    style={{ backgroundColor: getButtonColor() }}
                    onClick={handleConfirm}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  className="alert-modal-button alert-modal-confirm"
                  style={{ backgroundColor: getButtonColor() }}
                  onClick={handleClose}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertModalContext.Provider>
  );
}
