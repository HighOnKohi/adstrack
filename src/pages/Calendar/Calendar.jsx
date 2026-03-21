import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../config/fbConf.js";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { closeIcon } from "../../assets/Icons/index.js";
import "./Calendar.css";

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

  const hasMeetings = (y, m, d) => {
    const key = `${y}-${m}-${d}`;
    return meetingsByDay[key] && meetingsByDay[key].length > 0;
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
          const withMeeting = hasMeetings(cell.year, cell.month, cell.day);
          const isCurrentDay = isToday(cell.year, cell.month, cell.day);
          return (
            <button
              key={cell.key}
              type="button"
              className={`calendar-cell calendar-cell--day ${withMeeting ? "calendar-cell--has-meeting" : ""} ${isCurrentDay ? "calendar-cell--today" : ""}`}
              onClick={() => onDayClick(cell.year, cell.month, cell.day)}
              onMouseEnter={() =>
                onDayMouseEnter(cell.year, cell.month, cell.day)
              }
              onMouseLeave={onDayMouseLeave}
              aria-label={`${cell.day} ${monthLabel}${withMeeting ? ", has scheduled meetings" : ""}${isCurrentDay ? ", today" : ""}`}
            >
              {cell.day}
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

  const selectedDayMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.year}-${selectedDate.month}-${selectedDate.day}`;
    return meetingsByDay[key] || [];
  }, [selectedDate, meetingsByDay]);

  return (
    <div className="calendar-content">
      <div className="Label">
        <h1>Calendar</h1>
        <p>Click a day to see its scheduled meetings.</p>
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
