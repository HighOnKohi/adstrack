import { QRCodeSVG } from "qrcode.react";
import { closeIcon } from "../../../assets/Icons/index.js";
import "./QRLabelModal.css";

function QRLabelModal({ item, onClose }) {
  if (!item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="inventory-modal-overlay" onClick={onClose}>
      <div
        className="inventory-modal qr-label-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-label-title"
      >
        <button
          className="inventory-modal-close"
          type="button"
          onClick={onClose}
        >
          <img src={closeIcon} alt="Close" />
        </button>

        <h1 id="qr-label-title">QR Label</h1>

        <div className="qr-label-printable" id="qr-label-printable">
          <div className="qr-label-qr">
            <QRCodeSVG
              value={item.docId}
              size={180}
              level="M"
              includeMargin={true}
            />
          </div>
          <div className="qr-label-info">
            <div className="qr-label-name">{item.name || "Unnamed Item"}</div>
            <div className="qr-label-category">
              {item.category || "No Category"}
            </div>
            <div className="qr-label-id">{item.id || item.docId}</div>
          </div>
        </div>

        <button
          type="button"
          className="inventory-modal-submit"
          onClick={handlePrint}
        >
          🖨️ Print Label
        </button>
      </div>
    </div>
  );
}

export default QRLabelModal;
