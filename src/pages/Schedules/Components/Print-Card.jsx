import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { buildPagesHtml } from "./PrintTemplate.js";
import printTemplateCss from "./PrintTemplate.css?raw";
import "./Print-Card.css";
import { db } from "../../../config/fbConf.js";
import { doc, getDoc } from "firebase/firestore";
import { closeIcon } from "../../../assets/Icons/index.js";

function PrintCard({ meetings = [], onClose }) {
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const [schoolData, setSchoolData] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef();

  const fetchSchoolData = async (schoolId) => {
    if (!schoolId) return null;
    if (schoolData[schoolId]) return schoolData[schoolId];

    try {
      const docRef = doc(db, "Schools", schoolId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchoolData((prev) => ({ ...prev, [schoolId]: data }));
        return data;
      }
    } catch (e) {
      console.error("Error fetching school:", e);
    }
    return null;
  };

  const handleSelectMeeting = async (meetingId, isSelected) => {
    if (isSelected) {
      setSelectedMeetings((prev) => [...prev, meetingId]);
      const meeting = meetings.find((m) => m.id === meetingId);
      if (meeting?.School_ID) await fetchSchoolData(meeting.School_ID);
    } else {
      setSelectedMeetings((prev) => prev.filter((id) => id !== meetingId));
    }
  };

  // preload school data so names show immediately
  useEffect(() => {
    const preload = async () => {
      if (!meetings || meetings.length === 0) return;
      const ids = meetings
        .map((m) => m.School_ID)
        .filter((id) => !!id && !schoolData[id]);
      const uniqueIds = [...new Set(ids)];
      for (const id of uniqueIds) {
        // sequential to avoid too many concurrent requests
        // eslint-disable-next-line no-await-in-loop
        await fetchSchoolData(id);
      }
    };
    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings]);

  const formatDate = (dateInput) => {
    if (!dateInput) return "N/A";
    let date;
    if (dateInput && typeof dateInput === "object" && "toDate" in dateInput)
      date = dateInput.toDate();
    else if (typeof dateInput === "string") date = new Date(dateInput);
    else if (dateInput instanceof Date) date = dateInput;
    else return "N/A";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDateTime = (dateInput) => {
    if (!dateInput) return "N/A";
    let date;
    if (dateInput && typeof dateInput === "object" && "toDate" in dateInput)
      date = dateInput.toDate();
    else if (typeof dateInput === "string") date = new Date(dateInput);
    else if (dateInput instanceof Date) date = dateInput;
    else return "N/A";

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generatePDF = async () => {
    if (selectedMeetings.length === 0) {
      alert("Please select at least one schedule to print");
      return;
    }

    setIsGenerating(true);
    try {
      const selectedData = meetings.filter((m) =>
        selectedMeetings.includes(m.id),
      );

      // Create off-screen container for rendering pages
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "210mm"; // A4 width
      tempContainer.style.padding = "10mm";
      tempContainer.style.backgroundColor = "white";
      document.body.appendChild(tempContainer);

      // inject print template CSS (imported as raw string) into temp container
      try {
        const styleEl = document.createElement("style");
        styleEl.innerHTML = printTemplateCss;
        tempContainer.appendChild(styleEl);
      } catch (e) {
        // non-fatal
      }

      // Build pages using external template module
      const perPage = 3;
      const pages = buildPagesHtml(selectedData, schoolData, perPage);

      // Render each page individually
      const pdf = new jsPDF("p", "mm", "a4");
      for (let p = 0; p < pages.length; p++) {
        const pageDiv = document.createElement("div");
        pageDiv.style.width = "190mm"; // A4 width minus margins
        pageDiv.style.boxSizing = "border-box";
        pageDiv.style.padding = "6mm";
        pageDiv.innerHTML = pages[p];
        tempContainer.appendChild(pageDiv);

        // wait a tick for layout
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 80));

        // render this page
        // eslint-disable-next-line no-await-in-loop
        const canvas = await html2canvas(pageDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error("Canvas rendering failed - element size is 0");
        }

        const imgData = canvas.toDataURL("image/png");
        const imgWidthMm = 190; // fit to A4 width minus margins
        const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

        if (p > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, 10, imgWidthMm, imgHeightMm);
      }

      // Export PDF as blob
      const pdfBlob = pdf.output("blob");

      // Prompt user for save location using File System Access API when available
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const suggestedFilename = `schedules_${timestamp}.pdf`;

      if (window && typeof window.showSaveFilePicker === "function") {
        try {
          // Show file save dialog
          const handle = await window.showSaveFilePicker({
            suggestedName: suggestedFilename,
            types: [
              {
                description: "PDF Documents",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
        } catch (err) {
          // If user cancels or API fails, fall back to download
          if (err.name !== "AbortError") {
            pdf.save(suggestedFilename);
          }
        }
      } else {
        // fallback: trigger download when API unavailable
        pdf.save(suggestedFilename);
      }

      // Cleanup
      document.body.removeChild(tempContainer);

      setIsGenerating(false);
      alert("PDF generated successfully!");
      onClose();
    } catch (error) {
      console.error("Error generating PDF:", error);
      setIsGenerating(false);
      alert("Error generating PDF. Please try again.");
    }
  };

  return (
    <div className="sched-modal-overlay" onClick={onClose}>
      <div
        className="sched-form print-form"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-modal-button" onClick={onClose}>
          <img src={closeIcon} alt="close" />
        </button>

        <h1>Print Schedules</h1>
        <p className="print-instructions">
          Select the schedules you want to include in the PDF, then click
          "Generate PDF".
        </p>

        <div className="print-schedules-list">
          {meetings.length === 0 ? (
            <div className="no-schedules">No schedules available</div>
          ) : (
            <>
              <div className="schedule-card-row print-header-row">
                <div className="schedule-card-cell"></div>
                <div className="schedule-card-cell">School Name</div>
                <div className="schedule-card-cell">Location</div>
                <div className="schedule-card-cell">Date</div>
                <div className="schedule-card-cell">ETA</div>
              </div>
              <div className="print-checkbox-container">
                {meetings.map((meeting) => {
                  const school = schoolData[meeting.School_ID];
                  const isSelected = selectedMeetings.includes(meeting.id);
                  return (
                    <div
                      key={meeting.id}
                      className="schedule-card-row print-checkbox-item"
                    >
                      <div
                        className="schedule-card-cell print-checkbox-cell"
                        onClick={() =>
                          handleSelectMeeting(meeting.id, !isSelected)
                        }
                      >
                        <input
                          type="checkbox"
                          id={`meeting-${meeting.id}`}
                          checked={isSelected}
                          onChange={(e) =>
                            handleSelectMeeting(meeting.id, e.target.checked)
                          }
                          className="print-checkbox-input"
                        />
                      </div>
                      <div className="schedule-card-cell">
                        {school?.Name || "Loading..."}
                      </div>
                      <div className="schedule-card-cell">
                        {school?.Address || "N/A"}
                      </div>
                      <div className="schedule-card-cell">
                        {formatDate(meeting.DoC)}
                      </div>
                      <div className="schedule-card-cell">
                        {formatDateTime(meeting.ETA)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <button
          className="sched-submit"
          onClick={generatePDF}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating PDF..." : "Generate PDF"}
        </button>
      </div>
      {isGenerating && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generating PDF...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrintCard;
