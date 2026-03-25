import { useState, useRef, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { buildPagesHtml } from "./PrintTemplate.js";
import printTemplateCss from "./PrintTemplate.css?raw";
import "./Print-Card.css";
import "../Schedules.css";
import { db } from "../../../config/fbConf.js";
import { doc, getDoc } from "firebase/firestore";
import { closeIcon } from "../../../assets/Icons/index.js";
import { useAlert } from "../../../GlobalComponents/useAlert.js";

const DATE_FILTER_OPTIONS = [
  { value: "this_week", label: "This week" },
  { value: "3_weeks_ago", label: "3 Weeks ago" },
  { value: "1_month_ago", label: "1 Month ago" },
  { value: "3_months_ago", label: "3 Months ago" },
  { value: "1_year_ago", label: "1 Year ago" },
];

function getDateRangeForFilter(value) {
  if (!value) return null;
  const now = new Date();
  const startOfWeek = (d) => {
    const date = new Date(d);
    date.setDate(date.getDate() - date.getDay());
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const endOfWeek = (d) => {
    const start = startOfWeek(d);
    start.setDate(start.getDate() + 6);
    start.setHours(23, 59, 59, 999);
    return start;
  };
  const startOfMonth = (d) => {
    const date = new Date(d);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const endOfMonth = (d) => {
    const date = new Date(d);
    date.setMonth(date.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  };
  const startOfYear = (d) => {
    const date = new Date(d);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const endOfYear = (d) => {
    const date = new Date(d);
    date.setMonth(11, 31);
    date.setHours(23, 59, 59, 999);
    return date;
  };
  switch (value) {
    case "this_week":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "3_weeks_ago": {
      const d = new Date(now);
      d.setDate(d.getDate() - 21);
      return { start: startOfWeek(d), end: endOfWeek(now) };
    }
    case "1_month_ago": {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      return { start: startOfMonth(d), end: endOfMonth(now) };
    }
    case "3_months_ago": {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - 3);
      return { start: startOfMonth(d), end: endOfMonth(now) };
    }
    case "1_year_ago": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { start: startOfYear(d), end: endOfYear(now) };
    }
    default:
      return null;
  }
}

function getMeetingDate(meeting) {
  const raw = meeting.Schedule_Date || meeting.DoC;
  if (!raw) return null;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function getDateOfContract(meeting) {
  const raw = meeting.Date_Contract || meeting.Date_Created;
  if (!raw) return null;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function PrintCard({ meetings = [], schools = [], onClose }) {
  const { showAlert } = useAlert();
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const [schoolData, setSchoolData] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [selectedContractFilter, setSelectedContractFilter] = useState("");
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [contractDropdownOpen, setContractDropdownOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Done");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const nameFilterRef = useRef(null);
  const dateFilterRef = useRef(null);
  const contractFilterRef = useRef(null);
  const statusFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (nameFilterRef.current && !nameFilterRef.current.contains(e.target))
        setNameDropdownOpen(false);
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target))
        setDateDropdownOpen(false);
      if (
        contractFilterRef.current &&
        !contractFilterRef.current.contains(e.target)
      )
        setContractDropdownOpen(false);
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(e.target)
      )
        setStatusDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dateRange = useMemo(
    () => getDateRangeForFilter(selectedDateFilter),
    [selectedDateFilter],
  );
  const contractRange = useMemo(
    () => getDateRangeForFilter(selectedContractFilter),
    [selectedContractFilter],
  );
  const filteredMeetings = useMemo(() => {
    const filtered = meetings.filter((meeting) => {
      if (selectedSchoolId && meeting.School_ID !== selectedSchoolId)
        return false;
      if (selectedDateFilter && dateRange) {
        const d = getMeetingDate(meeting);
        if (!d || d < dateRange.start || d > dateRange.end) return false;
      }
      if (selectedContractFilter && contractRange) {
        const d = getDateOfContract(meeting);
        if (!d || d < contractRange.start || d > contractRange.end)
          return false;
      }
      if (selectedStatusFilter && (meeting.Status || "Pending") !== selectedStatusFilter) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const statusOrder = { Pending: 1, Confirmed: 2, Done: 3 };
      const statusA = statusOrder[a.Status || "Pending"] || 1;
      const statusB = statusOrder[b.Status || "Pending"] || 1;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      const dateA = getMeetingDate(a);
      const dateB = getMeetingDate(b);

      if (dateA && dateB) {
        return dateA - dateB;
      }
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });
  }, [
    meetings,
    selectedSchoolId,
    selectedDateFilter,
    dateRange,
    selectedContractFilter,
    contractRange,
    selectedStatusFilter,
  ]);

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
      month: "short",
      day: "numeric",
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
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const generatePDF = async () => {
    if (selectedMeetings.length === 0) {
      showAlert(
        "Please select at least one schedule to print",
        "No Selection",
        "warning",
      );
      return;
    }

    setIsGenerating(true);
    try {
      const selectedData = filteredMeetings.filter((m) =>
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
      } catch (err) {
        // non-fatal
        console.warn("Print template CSS injection failed", err);
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
      showAlert("PDF generated successfully!", "Success", "success");
      onClose();
    } catch (error) {
      console.error("Error generating PDF:", error);
      setIsGenerating(false);
      showAlert(
        "Failed to generate the PDF. This may be caused by rendering issues or insufficient browser resources. Please try selecting fewer schedules or refreshing the page.",
        "Error",
        "error",
      );
    }
  };

  return (
    <div className="sched-modal-overlay" onClick={onClose}>
      <div
        className="sched-form print-form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="print-form-header">
          <h1>Print Schedules</h1>
          <button
            type="button"
            className="close-modal-button"
            onClick={onClose}
            aria-label="Close"
          >
            <img src={closeIcon} alt="close" />
          </button>
        </div>

        <p className="print-form-instructions">
          Filter and select schedules, then click &quot;Generate PDF&quot;.
        </p>

        <section
          className="print-form-table-section"
          aria-label="Schedules to print"
        >
          <div
            className="print-form-filters"
            role="row"
            aria-label="Filter by column"
          >
            <div className="print-form-filter-spacer" aria-hidden />
            <div
              className="print-form-filter-cell schedule-label-cell-filter"
              ref={nameFilterRef}
            >
              <button
                type="button"
                className="schedule-label-filter-btn"
                onClick={() => {
                  setDateDropdownOpen(false);
                  setContractDropdownOpen(false);
                  setStatusDropdownOpen(false);
                  setNameDropdownOpen((o) => !o);
                }}
                aria-expanded={nameDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="schedule-label-filter-text-group">
                  <span className="schedule-label-filter-text">NAME</span>
                  {selectedSchoolId ? (
                    <span className="schedule-label-filter-active">
                      {" "}
                      (
                      {schools.find((s) => s.id === selectedSchoolId)?.Name ||
                        "Selected"}
                      )
                    </span>
                  ) : null}
                </span>
                <span className="schedule-label-filter-chevron" aria-hidden>
                  ▼
                </span>
              </button>
              {nameDropdownOpen && (
                <div className="schedule-filter-dropdown" role="listbox">
                  <button
                    type="button"
                    className="schedule-filter-option"
                    onClick={() => {
                      setSelectedSchoolId("");
                      setNameDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={!selectedSchoolId}
                  >
                    All schools
                  </button>
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      className="schedule-filter-option"
                      onClick={() => {
                        setSelectedSchoolId(school.id);
                        setNameDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={selectedSchoolId === school.id}
                    >
                      {school.Name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="print-form-filter-cell print-form-filter-cell--label">
              ADDRESS
            </div>
            <div
              className="print-form-filter-cell schedule-label-cell-filter"
              ref={contractFilterRef}
            >
              <button
                type="button"
                className="schedule-label-filter-btn"
                onClick={() => {
                  setNameDropdownOpen(false);
                  setDateDropdownOpen(false);
                  setStatusDropdownOpen(false);
                  setContractDropdownOpen((o) => !o);
                }}
                aria-expanded={contractDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="schedule-label-filter-text-group">
                  <span className="schedule-label-filter-text">
                    DATE OF CONTRACT
                  </span>
                  {selectedContractFilter ? (
                    <span className="schedule-label-filter-active">
                      {" "}
                      (
                      {DATE_FILTER_OPTIONS.find(
                        (o) => o.value === selectedContractFilter,
                      )?.label || ""}
                      )
                    </span>
                  ) : null}
                </span>
                <span className="schedule-label-filter-chevron" aria-hidden>
                  ▼
                </span>
              </button>
              {contractDropdownOpen && (
                <div className="schedule-filter-dropdown" role="listbox">
                  <button
                    type="button"
                    className="schedule-filter-option"
                    onClick={() => {
                      setSelectedContractFilter("");
                      setContractDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={!selectedContractFilter}
                  >
                    All Dates
                  </button>
                  {DATE_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="schedule-filter-option"
                      onClick={() => {
                        setSelectedContractFilter(opt.value);
                        setContractDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={selectedContractFilter === opt.value}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              className="print-form-filter-cell schedule-label-cell-filter"
              ref={dateFilterRef}
            >
              <button
                type="button"
                className="schedule-label-filter-btn"
                onClick={() => {
                  setNameDropdownOpen(false);
                  setContractDropdownOpen(false);
                  setStatusDropdownOpen(false);
                  setDateDropdownOpen((o) => !o);
                }}
                aria-expanded={dateDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="schedule-label-filter-text-group">
                  <span className="schedule-label-filter-text">
                    SCHEDULE DATE & TIME
                  </span>
                  {selectedDateFilter ? (
                    <span className="schedule-label-filter-active">
                      {" "}
                      (
                      {DATE_FILTER_OPTIONS.find(
                        (o) => o.value === selectedDateFilter,
                      )?.label || ""}
                      )
                    </span>
                  ) : null}
                </span>
                <span className="schedule-label-filter-chevron" aria-hidden>
                  ▼
                </span>
              </button>
              {dateDropdownOpen && (
                <div className="schedule-filter-dropdown" role="listbox">
                  <button
                    type="button"
                    className="schedule-filter-option"
                    onClick={() => {
                      setSelectedDateFilter("");
                      setDateDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={!selectedDateFilter}
                  >
                    All Dates
                  </button>
                  {DATE_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="schedule-filter-option"
                      onClick={() => {
                        setSelectedDateFilter(opt.value);
                        setDateDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={selectedDateFilter === opt.value}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              className="print-form-filter-cell schedule-label-cell-filter"
              ref={statusFilterRef}
            >
              <button
                type="button"
                className="schedule-label-filter-btn"
                onClick={() => {
                  setNameDropdownOpen(false);
                  setDateDropdownOpen(false);
                  setContractDropdownOpen(false);
                  setStatusDropdownOpen((o) => !o);
                }}
                aria-expanded={statusDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="schedule-label-filter-text-group">
                  <span className="schedule-label-filter-text">STATUS</span>
                  {selectedStatusFilter ? (
                    <span className="schedule-label-filter-active">
                      {" "}
                      ({selectedStatusFilter})
                    </span>
                  ) : null}
                </span>
                <span className="schedule-label-filter-chevron" aria-hidden>
                  ▼
                </span>
              </button>
              {statusDropdownOpen && (
                <div className="schedule-filter-dropdown" role="listbox">
                  <button
                    type="button"
                    className="schedule-filter-option"
                    onClick={() => {
                      setSelectedStatusFilter("");
                      setStatusDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={!selectedStatusFilter}
                  >
                    All Statuses
                  </button>
                  {["Pending", "Confirmed", "Done"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="schedule-filter-option"
                      onClick={() => {
                        setSelectedStatusFilter(status);
                        setStatusDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={selectedStatusFilter === status}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="print-form-list-section">
            {filteredMeetings.length === 0 ? (
              <div className="print-form-empty">
                No schedules match the current filters.
              </div>
            ) : (
              <div className="print-form-table-wrap">
                <div className="print-form-table" role="table">
                  {filteredMeetings.map((meeting) => {
                    const school = schoolData[meeting.School_ID];
                    const isSelected = selectedMeetings.includes(meeting.id);
                    const dateOfContract =
                      meeting.Date_Contract || meeting.Date_Created;
                    const scheduleDate = meeting.Schedule_Date || meeting.DoC;
                    return (
                      <div
                        key={meeting.id}
                        className="print-form-row"
                        role="row"
                      >
                        <div className="print-form-cell print-form-cell--check">
                          <input
                            type="checkbox"
                            id={`meeting-${meeting.id}`}
                            checked={isSelected}
                            onChange={(e) =>
                              handleSelectMeeting(meeting.id, e.target.checked)
                            }
                            className="print-form-checkbox"
                            aria-label={`Select ${school?.Name || meeting.id}`}
                          />
                        </div>
                        <div className="print-form-cell">
                          {school?.Name ?? "—"}
                        </div>
                        <div className="print-form-cell">
                          {school?.Address ?? "—"}
                        </div>
                        <div className="print-form-cell">
                          {formatDate(dateOfContract)}
                        </div>
                        <div className="print-form-cell">
                          {formatDateTime(scheduleDate)}
                        </div>
                        <div className="print-form-cell">
                          <span
                            className={`status-pill ${(
                              meeting.Status || "Pending"
                            ).toLowerCase()}`}
                          >
                            {meeting.Status || "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <button
          type="button"
          className="sched-submit"
          onClick={generatePDF}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating PDF…" : "Generate PDF"}
        </button>
      </div>
      {isGenerating && (
        <div className="print-form-loading" aria-live="polite">
          <div className="print-form-spinner" />
          <p>Generating PDF…</p>
        </div>
      )}
    </div>
  );
}

export default PrintCard;
