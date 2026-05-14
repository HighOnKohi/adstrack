import { useState, useEffect, useMemo } from "react";
import { db } from "../../../config/fbConf.js";
import { collection, getDocs } from "firebase/firestore";
import "./ScheduleSummary.css";

const TYPE_CONFIG = {
  Meeting: { icon: "groups", bg: "#e8f5e9", color: "#2e7d32", border: "#c8e6c9" },
  Advertising: { icon: "campaign", bg: "#fff8e1", color: "#f57f17", border: "#ffecb3" },
  "Career talk": { icon: "record_voice_over", bg: "#e3f2fd", color: "#1565c0", border: "#bbdefb" },
  "Follow-Up": { icon: "sync", bg: "#e1f5fe", color: "#0288d1", border: "#b3e5fc" },
  Others: { icon: "assignment", bg: "#ffebee", color: "#c62828", border: "#ffcdd2" },
};

export default function ScheduleSummary() {
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const snap = await getDocs(collection(db, "Meetings"));
        setMeetings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("ScheduleSummary: failed to fetch meetings", err);
      }
    };
    fetchMeetings();
  }, []);

  const now = new Date();
  const monthLabel = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const counts = useMemo(() => {
    const result = { Meeting: 0, Advertising: 0, "Career talk": 0, "Follow-Up": 0, Others: 0 };
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    meetings.forEach((m) => {
      const raw = m.Schedule_Date || m.DoC;
      if (!raw) return;
      const d = raw?.toDate ? raw.toDate() : new Date(raw);
      if (isNaN(d.getTime())) return;
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear)
        return;
      const type = m.Type || "Meeting";
      if (result[type] !== undefined) {
        result[type]++;
      } else {
        result.Others++;
      }
    });

    return result;
  }, [meetings]);

  const total = counts.Meeting + counts.Advertising + counts["Career talk"] + counts["Follow-Up"] + counts.Others;

  return (
    <div className="schedule-summary">
      <h3 className="schedule-summary-title">
        <span className="material-symbols-outlined" style={{ fontSize: '1.15rem', verticalAlign: 'middle', marginRight: '0.35rem' }}>calendar_month</span>
        Monthly Schedule Summary — {monthLabel}
      </h3>
      <div className="schedule-summary-grid">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <div
            key={type}
            className="schedule-summary-card"
            style={{
              backgroundColor: config.bg,
              borderColor: config.border,
            }}
          >
            <span className="schedule-summary-icon material-symbols-outlined" style={{ color: config.color }}>{config.icon}</span>
            <span
              className="schedule-summary-count"
              style={{ color: config.color }}
            >
              {counts[type]}
            </span>
            <span className="schedule-summary-label">{type}</span>
          </div>
        ))}
        <div
          className="schedule-summary-card schedule-summary-card--total"
        >
          <span className="schedule-summary-icon material-symbols-outlined">bar_chart</span>
          <span className="schedule-summary-count">{total}</span>
          <span className="schedule-summary-label">Total</span>
        </div>
      </div>
    </div>
  );
}
