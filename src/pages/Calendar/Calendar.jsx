import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../config/fbConf.js";
import { collection, getDocs } from "firebase/firestore";
import { closeIcon } from "../../assets/Icons/index.js";
import "./Calendar.css";

const TYPE_COLORS = {
  Meeting: { bg: "#2e7d32", light: "#e8f5e9", text: "#2e7d32" },
  Advertising: { bg: "#f9a825", light: "#fff8e1", text: "#f57f17" },
  "Career talk": { bg: "#1565c0", light: "#e3f2fd", text: "#1565c0" },
  "Follow-Up": { bg: "#c2185b", light: "#fce4ec", text: "#c2185b" },
  Others: { bg: "#c62828", light: "#ffebee", text: "#c62828" },
};

function getScheduleDate(meeting) {
  const raw = meeting.Schedule_Date || meeting.DoC;
  if (!raw) return null;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(date) {
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const MonthGrid = ({
  year,
  month,
  meetingsByDay,
  onDayClick,
  onDayMouseEnter,
  onDayMouseLeave,
  typeFilters,
}) => {
  const monthLabel = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const c = [];
    for (let i = 0; i < startPad; i++) {
      c.push({ type: "pad", key: `pad-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      c.push({
        type: "day",
        year,
        month,
        day: d,
        key: `day-${year}-${month}-${d}`,
      });
    }
    return c;
  }, [year, month]);

  const getDayMeetingTypes = (y, m, d) => {
    const key = `${y}-${m}-${d}`;
    const meetings = meetingsByDay[key];
    if (!meetings || meetings.length === 0) return [];
    const types = [...new Set(meetings.map((mt) => mt.Type || "Meeting"))];
    return types.filter((t) => typeFilters[t] !== false);
  };

  const isToday = (y, m, d) => {
    const now = new Date();
    return (
      y === now.getFullYear() && m === now.getMonth() && d === now.getDate()
    );
  };

  return (
    <div className="calendar-month-section">
      <h3
        className="calendar-month-title"
        style={{ textAlign: "center", margin: "10px 0" }}
      >
        {monthLabel}
      </h3>
      <div className="calendar-grid">
        {weekDays.map((wd) => (
          <div key={wd} className="calendar-cell calendar-cell--head">
            {wd}
          </div>
        ))}
        {cells.map((cell) => {
          if (cell.type === "pad") {
            return (
              <div
                key={cell.key}
                className="calendar-cell calendar-cell--pad"
              />
            );
          }
          const dayTypes = getDayMeetingTypes(cell.year, cell.month, cell.day);
          const hasMeetings = dayTypes.length > 0;
          const isCurrentDay = isToday(cell.year, cell.month, cell.day);

          // Determine background: single type = that color, multiple = default with dots
          let cellStyle = {};
          let singleType = null;
          if (dayTypes.length === 1) {
            singleType = dayTypes[0];
            const color = TYPE_COLORS[singleType] || TYPE_COLORS.Meeting;
            cellStyle = { backgroundColor: color.bg, color: "white", borderColor: color.bg };
          }

          return (
            <button
              key={cell.key}
              type="button"
              className={`calendar-cell calendar-cell--day ${isCurrentDay ? "calendar-cell--today" : ""}`}
              style={singleType ? cellStyle : undefined}
              onClick={() => onDayClick(cell.year, cell.month, cell.day)}
              onMouseEnter={() =>
                onDayMouseEnter(cell.year, cell.month, cell.day)
              }
              onMouseLeave={onDayMouseLeave}
              aria-label={`${cell.day} ${monthLabel}${hasMeetings ? ", has scheduled meetings" : ""}${isCurrentDay ? ", today" : ""}`}
            >
              {cell.day}
              {dayTypes.length > 1 && (
                <span className="calendar-type-dots">
                  {dayTypes.map((t) => (
                    <span
                      key={t}
                      className="calendar-type-dot"
                      style={{ backgroundColor: (TYPE_COLORS[t] || TYPE_COLORS.Meeting).bg }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

function Calendar() {
  const [meetings, setMeetings] = useState([]);
  const [schools, setSchools] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [popupPosition, setPopupPosition] = useState(null);
  const [typeFilters, setTypeFilters] = useState({
    Meeting: true,
    Advertising: true,
    "Career talk": true,
    "Follow-Up": true,
    Others: true,
  });
  const hoverTimeoutRef = useRef(null);
  const enterTimeoutRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      const [meetingsSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, "Meetings")),
        getDocs(collection(db, "Schools")),
      ]);
      const meetingsList = meetingsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      const schoolsList = schoolsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setMeetings(meetingsList);
      setSchools(schoolsList);
    };
    fetch();
  }, []);

  const meetingsByDay = useMemo(() => {
    const map = {};
    meetings.forEach((m) => {
      const d = getScheduleDate(m);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push({ ...m, _scheduleDate: d });
    });
    Object.keys(map).forEach((k) => {
      map[k].sort(
        (a, b) => a._scheduleDate.getTime() - b._scheduleDate.getTime(),
      );
    });
    return map;
  }, [meetings]);

  const monthsToShow = 4;
  const months = useMemo(() => {
    const items = [];
    for (let i = 0; i < monthsToShow; i++) {
      const d = new Date(currentMonth.year, currentMonth.month + i, 1);
      items.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return items;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
    setShowDayDetail(false);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
    setShowDayDetail(false);
  };

  const handleDayClick = (year, month, day) => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    setPopupPosition(null);
    setSelectedDate({ year, month, day });
    setShowDayDetail(true);
  };

  const handleDayMouseEnter = (year, month, day, event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
    }
    enterTimeoutRef.current = setTimeout(() => {
      setSelectedDate({ year, month, day });
      setPopupPosition({ top: rect.top, left: rect.right + 10 });
      setShowDayDetail(true);
      enterTimeoutRef.current = null;
    }, 300);
  };

  const handleDayMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDayDetail(false);
    }, 200);
  };

  const handlePanelMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const toggleTypeFilter = (type) => {
    setTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const selectedDayMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.year}-${selectedDate.month}-${selectedDate.day}`;
    const dayMeetings = meetingsByDay[key] || [];
    return dayMeetings.filter((m) => typeFilters[m.Type || "Meeting"] !== false);
  }, [selectedDate, meetingsByDay, typeFilters]);

  return (
    <div className="calendar-content">
      <div className="Label">
        <h1>Calendar</h1>
        <p>Click a day to see its scheduled meetings.</p>
      </div>

      {/* Legend & Type Filters */}
      <div className="calendar-legend">
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <button
            key={type}
            type="button"
            className={`calendar-legend-item ${typeFilters[type] ? "active" : "inactive"}`}
            onClick={() => toggleTypeFilter(type)}
            aria-pressed={typeFilters[type]}
          >
            <span
              className="calendar-legend-dot"
              style={{ backgroundColor: colors.bg }}
            />
            <span className="calendar-legend-label">{type}</span>
          </button>
        ))}
      </div>

      <div className="calendar-wrap">
        <div className="calendar-header">
          <button
            type="button"
            className="calendar-nav"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="calendar-nav"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="calendar-months-container">
          {months.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              meetingsByDay={meetingsByDay}
              onDayClick={handleDayClick}
              onDayMouseEnter={handleDayMouseEnter}
              onDayMouseLeave={handleDayMouseLeave}
              typeFilters={typeFilters}
            />
          ))}
        </div>
      </div>

      <div
        className={`calendar-day-overlay ${showDayDetail ? "visible" : ""}`}
        style={
          popupPosition
            ? { background: "transparent", pointerEvents: "none" }
            : {}
        }
      >
        <div
          className="calendar-day-panel"
          style={
            popupPosition
              ? {
                  position: "fixed",
                  top: popupPosition.top,
                  left: popupPosition.left,
                  margin: 0,
                }
              : {}
          }
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handleDayMouseLeave}
        >
          <div className="calendar-day-panel-header">
            <h3>
              {selectedDate &&
                new Date(
                  selectedDate.year,
                  selectedDate.month,
                  selectedDate.day,
                ).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
            </h3>
            <button
              type="button"
              className="calendar-day-panel-close"
              onClick={() => setShowDayDetail(false)}
              aria-label="Close"
            >
              <img src={closeIcon} alt="" />
            </button>
          </div>
          <div className="calendar-day-panel-body">
            {selectedDayMeetings.length === 0 ? (
              <p className="calendar-day-empty">No schedules for this day.</p>
            ) : (
              <ul className="calendar-day-list">
                {selectedDayMeetings.map((m) => {
                  const school = schools.find((s) => s.id === m.School_ID);
                  const meetingType = m.Type || "Meeting";
                  const typeColor = TYPE_COLORS[meetingType] || TYPE_COLORS.Meeting;
                  return (
                    <li key={m.id} className="calendar-day-item">
                      <span className="calendar-day-item-time">
                        {formatTime(m._scheduleDate)}
                      </span>
                      <span className="calendar-day-item-name">
                        {school?.Name || "—"}
                        <span
                          className={`status-pill ${(m.Status || "Pending").toLowerCase()}`}
                        >
                          {m.Status || "Pending"}
                        </span>
                        <span
                          className="calendar-day-type-badge"
                          style={{
                            backgroundColor: typeColor.light,
                            color: typeColor.text,
                          }}
                        >
                          {meetingType === "Others"
                            ? m.Type_Other || "Others"
                            : meetingType}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Calendar;
