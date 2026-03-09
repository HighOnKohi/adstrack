import { useState, useEffect, useMemo } from "react";
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

function Calendar() {
  const [meetings, setMeetings] = useState([]);
  const [schools, setSchools] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayDetail, setShowDayDetail] = useState(false);

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
      map[k].sort((a, b) => a._scheduleDate.getTime() - b._scheduleDate.getTime());
    });
    return map;
  }, [meetings]);

  const hasMeetings = (year, month, day) => {
    const key = `${year}-${month}-${day}`;
    return meetingsByDay[key] && meetingsByDay[key].length > 0;
  };

  const monthGrid = useMemo(() => {
    const { year, month } = currentMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ type: "pad", key: `pad-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ type: "day", year, month, day: d, key: `day-${year}-${month}-${d}` });
    }
    return cells;
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
    setSelectedDate({ year, month, day });
    setShowDayDetail(true);
  };

  const selectedDayMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.year}-${selectedDate.month}-${selectedDate.day}`;
    return meetingsByDay[key] || [];
  }, [selectedDate, meetingsByDay]);

  const monthLabel = `${new Date(currentMonth.year, currentMonth.month).toLocaleString("default", { month: "long" })} ${currentMonth.year}`;
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="content">
      <div className="Label">
        <h1>Calendar</h1>
        <p>Click a day to see its scheduled meetings.</p>
      </div>

      <div className="calendar-wrap">
        <div className="calendar-header">
          <button type="button" className="calendar-nav" onClick={handlePrevMonth} aria-label="Previous month">
            ‹
          </button>
          <h2 className="calendar-month-title">{monthLabel}</h2>
          <button type="button" className="calendar-nav" onClick={handleNextMonth} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {weekDays.map((wd) => (
            <div key={wd} className="calendar-cell calendar-cell--head">
              {wd}
            </div>
          ))}
          {monthGrid.map((cell) => {
            if (cell.type === "pad") {
              return <div key={cell.key} className="calendar-cell calendar-cell--pad" />;
            }
            const withMeeting = hasMeetings(cell.year, cell.month, cell.day);
            return (
              <button
                key={cell.key}
                type="button"
                className={`calendar-cell calendar-cell--day ${withMeeting ? "calendar-cell--has-meeting" : ""}`}
                onClick={() => handleDayClick(cell.year, cell.month, cell.day)}
                aria-label={`${cell.day} ${monthLabel}${withMeeting ? ", has scheduled meetings" : ""}`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      {showDayDetail && (
        <div className="calendar-day-overlay" onClick={() => setShowDayDetail(false)}>
          <div
            className="calendar-day-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-day-panel-header">
              <h3>
                {selectedDate &&
                  new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString("en-US", {
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
                        <span className="calendar-day-item-time">{formatTime(m._scheduleDate)}</span>
                        <span className="calendar-day-item-name">{school?.Name || "—"}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
