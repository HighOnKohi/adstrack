import { db } from "../../config/fbConf.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { getSchoolYears } from "../Schools/SchoolsServices.jsx";
import jsPDF from "jspdf";

// ─── Data Fetching ──────────────────────────────────────────────

export function listenToMeetings(callback) {
  const q = query(collection(db, "Meetings"), orderBy("Schedule_Date", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function listenToSchools(callback) {
  const q = query(collection(db, "Schools"), orderBy("Name", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ─── Date helpers ───────────────────────────────────────────────

function parseDate(raw) {
  if (!raw) return null;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function isInRange(date, start, end) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function monthKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

// ─── Data Transformations ───────────────────────────────────────

export function filterDoneMeetings(meetings, startDate, endDate) {
  return meetings.filter((m) => {
    if (m.Status !== "Done") return false;
    const d = parseDate(m.Schedule_Date);
    return isInRange(d, startDate, endDate);
  });
}

export function buildVisitsOverTime(meetings) {
  const map = {};
  meetings.forEach((m) => {
    const d = parseDate(m.Schedule_Date);
    if (!d) return;
    const key = monthKey(d);
    map[key] = (map[key] || 0) + 1;
  });

  return Object.keys(map)
    .sort()
    .map((key) => ({ month: monthLabel(key), count: map[key], sortKey: key }));
}

export function buildTopSchoolsByEnrollees(schools, limit = 10) {
  const schoolYears = getSchoolYears();
  const ranked = schools
    .map((s) => {
      const enrollment = s.Enrollment || {};
      const total = schoolYears.reduce((sum, yr) => {
        const v = enrollment[yr];
        return sum + (typeof v === "number" && Number.isFinite(v) ? v : 0);
      }, 0);
      return { name: s.Name || "Unknown", total };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return ranked;
}

export function buildConversionData(filteredMeetings, schools) {
  const totalEstimated = filteredMeetings.reduce((sum, m) => {
    const est = parseInt(m.Attendee_Est, 10);
    return sum + (isNaN(est) ? 0 : est);
  }, 0);

  const schoolYears = getSchoolYears();
  const totalEnrolled = schools.reduce((sum, s) => {
    const enrollment = s.Enrollment || {};
    return (
      sum +
      schoolYears.reduce((sy, yr) => {
        const v = enrollment[yr];
        return sy + (typeof v === "number" && Number.isFinite(v) ? v : 0);
      }, 0)
    );
  }, 0);

  return [
    { name: "Estimated Attendees", value: totalEstimated },
    { name: "Actual Enrollees", value: totalEnrolled },
  ];
}

// ─── Summary Stats ──────────────────────────────────────────────

export function buildSummaryStats(filteredMeetings, schools) {
  const schoolYears = getSchoolYears();

  const totalVisits = filteredMeetings.length;

  const uniqueSchools = new Set(filteredMeetings.map((m) => m.School_ID)).size;

  const totalEstimated = filteredMeetings.reduce((sum, m) => {
    const est = parseInt(m.Attendee_Est, 10);
    return sum + (isNaN(est) ? 0 : est);
  }, 0);

  const totalEnrolled = schools.reduce((sum, s) => {
    const enrollment = s.Enrollment || {};
    return (
      sum +
      schoolYears.reduce((sy, yr) => {
        const v = enrollment[yr];
        return sy + (typeof v === "number" && Number.isFinite(v) ? v : 0);
      }, 0)
    );
  }, 0);

  const conversionRate =
    totalEstimated > 0
      ? ((totalEnrolled / totalEstimated) * 100).toFixed(1)
      : "0.0";

  return {
    totalVisits,
    uniqueSchools,
    totalEstimated,
    totalEnrolled,
    conversionRate,
  };
}

// ─── Export Helpers ──────────────────────────────────────────────

export function exportToCSV(visitsData, enrolleesData, conversionData, filename = "adstrack_analytics") {
  let csv = "=== Schools Visited Over Time ===\nMonth,Visits\n";
  visitsData.forEach((row) => {
    csv += `${row.month},${row.count}\n`;
  });

  csv += "\n=== Top Schools by Enrollees ===\nSchool,Total Enrollees\n";
  enrolleesData.forEach((row) => {
    csv += `"${row.name}",${row.total}\n`;
  });

  csv += "\n=== Conversion Metrics ===\nMetric,Value\n";
  conversionData.forEach((row) => {
    csv += `${row.name},${row.value}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(summary, visitsData, enrolleesData, conversionData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Adstrack Analytics Report", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });
  y += 15;

  // Summary
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryLines = [
    `Total Visits (Done): ${summary.totalVisits}`,
    `Unique Schools Visited: ${summary.uniqueSchools}`,
    `Total Estimated Attendees: ${summary.totalEstimated.toLocaleString()}`,
    `Total Actual Enrollees: ${summary.totalEnrolled.toLocaleString()}`,
    `Conversion Rate: ${summary.conversionRate}%`,
  ];
  summaryLines.forEach((line) => {
    doc.text(line, 14, y);
    y += 6;
  });
  y += 8;

  // Visits Over Time
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Schools Visited Over Time", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Month", 14, y);
  doc.text("Visits", 80, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  visitsData.forEach((row) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(row.month, 14, y);
    doc.text(String(row.count), 80, y);
    y += 5;
  });
  y += 8;

  // Top Schools
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Top Schools by Enrollees", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("School", 14, y);
  doc.text("Enrollees", 120, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  enrolleesData.forEach((row) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(row.name.substring(0, 50), 14, y);
    doc.text(String(row.total), 120, y);
    y += 5;
  });
  y += 8;

  // Conversion
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Conversion Metrics", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  conversionData.forEach((row) => {
    doc.text(`${row.name}: ${row.value.toLocaleString()}`, 14, y);
    y += 5;
  });

  doc.save("adstrack_analytics_report.pdf");
}
