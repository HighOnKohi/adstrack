import "./Schedules.css";
import {
  addIcon,
  bookIcon,
  closeIcon,
  printIcon,
} from "../../assets/Icons/index.js";
import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../config/fbConf.js";
import { collection, getDocs } from "firebase/firestore";
import { useScheduleForm } from "./ScheduleServices.jsx";
import ScheduleCard from "./Components/Schedule-Card.jsx";
import PrintCard from "./Components/Print-Card.jsx";

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

function Schedules() {
  const [meetings, setMeetings] = useState([]);

  const fetchMeetings = async () => {
    const querySnapshot = await getDocs(collection(db, "Meetings"));
    const meetingsList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setMeetings(meetingsList);
  };

  const {
    showForm,
    setShowForm,
    formData,
    handleChange,
    handleSubmit,
    schools,
  } = useScheduleForm(fetchMeetings);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [selectedContractFilter, setSelectedContractFilter] = useState("");
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [contractDropdownOpen, setContractDropdownOpen] = useState(false);
  const nameFilterRef = useRef(null);
  const dateFilterRef = useRef(null);
  const contractFilterRef = useRef(null);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchMeetings();
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
  ]);

  return (
    <div className="content">
      <div>
        <div className="Label">
          <h1> Schedule Directory </h1>
          <p>
            {" "}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut.{" "}
          </p>
        </div>

        <div className="Search-bar">
          <input type="text" placeholder="Search school name" />
        </div>
        <div className="function-buttons">
          <button
            className="schedule-meeting-button"
            onClick={() => setShowForm(true)}
          >
            <img src={bookIcon} alt="Book" />
            Schedule Meeting
          </button>
          <button
            className="schedule-meeting-button"
            onClick={() => setShowPrintModal(true)}
            style={{ marginLeft: "10px" }}
          >
            <img src={printIcon} alt="Print" />
            Print
          </button>
        </div>

        <div className="schedule-list-labels">
          <div
            className="schedule-label-cell schedule-label-cell-filter"
            ref={nameFilterRef}
          >
            <button
              type="button"
              className="schedule-label-filter-btn"
              onClick={() => {
                setDateDropdownOpen(false);
                setContractDropdownOpen(false);
                setNameDropdownOpen((o) => !o);
              }}
              aria-expanded={nameDropdownOpen}
              aria-haspopup="listbox"
            >
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
              <span
                className="schedule-label-filter-chevron"
                style={{ paddingLeft: "10px" }}
                aria-hidden
              >
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
          <div className="schedule-label-cell">ADDRESS</div>
          <div
            className="schedule-label-cell schedule-label-cell-filter"
            ref={contractFilterRef}
          >
            <button
              type="button"
              className="schedule-label-filter-btn"
              onClick={() => {
                setNameDropdownOpen(false);
                setDateDropdownOpen(false);
                setContractDropdownOpen((o) => !o);
              }}
              aria-expanded={contractDropdownOpen}
              aria-haspopup="listbox"
            >
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
              <span
                className="schedule-label-filter-chevron"
                style={{ paddingLeft: "10px" }}
                aria-hidden
              >
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
            className="schedule-label-cell schedule-label-cell-filter"
            ref={dateFilterRef}
          >
            <button
              type="button"
              className="schedule-label-filter-btn"
              onClick={() => {
                setNameDropdownOpen(false);
                setContractDropdownOpen(false);
                setDateDropdownOpen((o) => !o);
              }}
              aria-expanded={dateDropdownOpen}
              aria-haspopup="listbox"
            >
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
              <span
                className="schedule-label-filter-chevron"
                style={{ paddingLeft: "10px" }}
                aria-hidden
              >
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
          <div className="schedule-label-cell">STATUS</div>
          <div className="schedule-label-cell"></div>
        </div>

        <div className="schedule-list-container">
          {filteredMeetings.length === 0 ? (
            <div className="no-schedules">No schedules found</div>
          ) : (
            filteredMeetings.map((meeting) => (
              <ScheduleCard
                key={meeting.id}
                meeting={meeting}
                onUpdate={fetchMeetings}
                schools={schools}
              />
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="sched-modal-overlay">
          <div className="sched-form">
            <button
              className="close-modal-button"
              onClick={() => setShowForm(false)}
            >
              <img src={closeIcon} alt="close" />
            </button>
            <h1> Schedule Meeting </h1>

            <div className="sched-form-grid">
              <div className="sched-input-group sched-full-width">
                <label className="input-label">School</label>
                <select
                  name="School_ID"
                  className="sched-input"
                  value={formData.School_ID}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Select School
                  </option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Level</label>
                <select
                  name="Level"
                  className="sched-input"
                  value={formData.Level}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Select Level
                  </option>
                  <option value="SHS">SHS</option>
                  <option value="JHS">JHS</option>
                  <option value="Grade School">Grade School</option>
                </select>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Companion Count</label>
                <input
                  name="Companions"
                  type="text"
                  inputMode="numeric"
                  placeholder="Companion Count"
                  className="sched-input"
                  value={formData.Companions}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Estimated Attendees</label>
                <input
                  name="Attendee_Est"
                  type="text"
                  inputMode="numeric"
                  placeholder="Estimated Number of Attendees"
                  className="sched-input"
                  value={formData.Attendee_Est}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Date of Contract</label>
                <input
                  name="Date_Contract"
                  type="date"
                  className="sched-input"
                  value={formData.Date_Contract}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Schedule Date & Time</label>
                <input
                  name="Schedule_Date"
                  type="datetime-local"
                  className="sched-input"
                  value={formData.Schedule_Date}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">
                  Estimated Time of Departure
                </label>
                <input
                  name="ETD"
                  type="datetime-local"
                  className="sched-input"
                  value={formData.ETD}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group sched-full-width">
                <label className="sched-input-label">Notes</label>
                <textarea
                  name="Notes"
                  placeholder="Notes (Leave blank if none)"
                  className="sched-input"
                  rows="3"
                  value={formData.Notes}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button className="sched-submit" onClick={handleSubmit}>
              <img src={addIcon} alt="Add" />
              Submit
            </button>
          </div>
        </div>
      )}

      {showPrintModal && (
        <PrintCard
          meetings={meetings}
          schools={schools}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

export default Schedules;
