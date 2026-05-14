import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import {
  listenToMeetings,
  listenToSchools,
  filterDoneMeetings,
  buildVisitsOverTime,
  buildTopSchoolsByEnrollees,
  buildConversionData,
  buildSummaryStats,
  exportToCSV,
  exportToPDF,
} from "./AnalyticsServices.jsx";
import { analyticsIcon } from "../../assets/Icons/index.js";
import exportIcon from "../../assets/Icons/export.svg";
import printIcon from "../../assets/Icons/print.svg";
import "./Analytics.css";

const PIE_COLORS = ["#a71a2b", "#1565c0"];
const CHART_ACCENT = "#a71a2b";

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const DATE_PRESETS = [
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "last_6_months", label: "Last 6 Months" },
  { key: "this_year", label: "This Year" },
  { key: "last_year", label: "Last Year" },
];

function computePresetRange(key) {
  const now = new Date();
  switch (key) {
    case "this_week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: fmt(start), end: fmt(end) };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case "last_3_months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start: fmt(start), end: fmt(now) };
    }
    case "last_6_months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { start: fmt(start), end: fmt(now) };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: fmt(start), end: fmt(now) };
    }
    case "last_year": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { start: fmt(start), end: fmt(end) };
    }
    default:
      return null;
  }
}

function getDefaultDateRange() {
  return computePresetRange("this_year");
}

function Analytics() {
  const [allMeetings, setAllMeetings] = useState([]);
  const [allSchools, setAllSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [activePreset, setActivePreset] = useState("this_year");
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);

  useEffect(() => {
    let meetingsLoaded = false;
    let schoolsLoaded = false;

    const checkLoading = () => {
      if (meetingsLoaded && schoolsLoaded) {
        setLoading(false);
      }
    };

    const unsubMeetings = listenToMeetings((data) => {
      setAllMeetings(data);
      meetingsLoaded = true;
      checkLoading();
    });

    const unsubSchools = listenToSchools((data) => {
      setAllSchools(data);
      schoolsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubMeetings();
      unsubSchools();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startDate = dateRange.start ? new Date(dateRange.start + "T00:00") : null;
  const endDate = dateRange.end ? new Date(dateRange.end + "T23:59:59") : null;

  const filteredMeetings = useMemo(
    () => filterDoneMeetings(allMeetings, startDate, endDate),
    [allMeetings, dateRange.start, dateRange.end],
  );

  const visitsData = useMemo(
    () => buildVisitsOverTime(filteredMeetings),
    [filteredMeetings],
  );

  const enrolleesData = useMemo(
    () => buildTopSchoolsByEnrollees(allSchools, 10),
    [allSchools],
  );

  const conversionData = useMemo(
    () => buildConversionData(filteredMeetings, allSchools),
    [filteredMeetings, allSchools],
  );

  const summary = useMemo(
    () => buildSummaryStats(filteredMeetings, allSchools),
    [filteredMeetings, allSchools],
  );

  const handlePresetClick = useCallback((key) => {
    const range = computePresetRange(key);
    if (range) {
      setDateRange(range);
      setActivePreset(key);
    }
  }, []);

  const handleManualDateChange = useCallback((field, value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setActivePreset(null);
  }, []);

  const captureChart = async (ref) => {
    if (!ref.current) return null;
    try {
      // Small delay to let Recharts finish any resize/animations
      await new Promise((r) => setTimeout(r, 250));
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        foreignObjectRendering: false,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });
      if (canvas.width === 0 || canvas.height === 0) return null;
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Chart capture failed:", err);
      return null;
    }
  };

  const handleExportCSV = () => {
    exportToCSV(visitsData, enrolleesData, conversionData);
    setExportOpen(false);
  };

  const handleExportPDF = async () => {
    setExportOpen(false);
    setIsExporting(true);
    try {
      // Scroll to top to ensure charts are visible for capture
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));

      // Capture charts sequentially for reliability
      const lineImg = await captureChart(lineChartRef);
      const barImg = await captureChart(barChartRef);
      const pieImg = await captureChart(pieChartRef);

      exportToPDF(summary, visitsData, enrolleesData, conversionData, {
        lineChart: lineImg,
        barChart: barImg,
        pieChart: pieImg,
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">Loading analytics data...</div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>Statistics Dashboard</h1>
          <p>
            Visualize school visits, enrollment trends, and conversion metrics.
          </p>
        </div>
      </div>

      {/* Controls row */}
      <div className="analytics-controls">
        <div className="analytics-date-range">
          <label>
            From
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleManualDateChange("start", e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleManualDateChange("end", e.target.value)}
            />
          </label>
        </div>

        <div className="analytics-presets">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`analytics-preset-btn${
                activePreset === p.key ? " analytics-preset-btn--active" : ""
              }`}
              onClick={() => handlePresetClick(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="analytics-export-wrapper" ref={exportRef}>
          <button
            className="analytics-export-btn"
            type="button"
            onClick={() => setExportOpen((o) => !o)}
          >
            <img src={exportIcon} alt="" aria-hidden="true" className="analytics-export-icon" /> Export Report
          </button>
          {exportOpen && (
            <div className="analytics-export-menu">
              <button type="button" onClick={handleExportPDF} disabled={isExporting}>
                <img src={printIcon} alt="" aria-hidden="true" className="analytics-export-icon icon-inverse" />
                {isExporting ? "Generating…" : "Export as PDF"}
              </button>
              <button type="button" onClick={handleExportCSV}>
                <img src={analyticsIcon} alt="" aria-hidden="true" className="analytics-export-icon icon-inverse" /> Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="analytics-summary-row">
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">{summary.totalVisits}</span>
          <span className="analytics-stat-label">Total Visits</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">{summary.uniqueSchools}</span>
          <span className="analytics-stat-label">Schools Visited</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">
            {summary.totalEstimated.toLocaleString()}
          </span>
          <span className="analytics-stat-label">Est. Attendees</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">
            {summary.totalEnrolled.toLocaleString()}
          </span>
          <span className="analytics-stat-label">Actual Enrollees</span>
        </div>
        <div className="analytics-stat-card analytics-stat-card--accent">
          <span className="analytics-stat-value">
            {summary.conversionRate}%
          </span>
          <span className="analytics-stat-label">Conversion Rate</span>
        </div>
      </div>

      {/* Charts grid */}
      <div className="analytics-charts-grid">
        {/* Line Chart */}
        <div className="analytics-chart-card analytics-chart-card--wide" ref={lineChartRef}>
          <h2>Schools Visited Over Time</h2>
          <p className="analytics-chart-desc">
            Monthly count of completed ("Done") school visits within the
            selected date range.
          </p>
          {visitsData.length === 0 ? (
            <div className="analytics-chart-empty">
              No completed visits in the selected date range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={visitsData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#999"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  stroke="#999"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e0e0e0",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Visits"
                  stroke={CHART_ACCENT}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: CHART_ACCENT }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart */}
        <div className="analytics-chart-card" ref={barChartRef}>
          <h2>Top Schools by Enrollees</h2>
          <p className="analytics-chart-desc">
            Total enrollment across the last 5 school years.
          </p>
          {enrolleesData.length === 0 ? (
            <div className="analytics-chart-empty">
              No enrollment data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={enrolleesData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  stroke="#999"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  tick={{ fontSize: 11 }}
                  stroke="#999"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e0e0e0",
                  }}
                />
                <Bar
                  dataKey="total"
                  name="Enrollees"
                  fill={CHART_ACCENT}
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="analytics-chart-card" ref={pieChartRef}>
          <h2>Conversion Metrics</h2>
          <p className="analytics-chart-desc">
            Estimated event attendees vs. actual enrollees.
          </p>
          {conversionData.every((d) => d.value === 0) ? (
            <div className="analytics-chart-empty">
              No data available for conversion comparison.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conversionData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) =>
                    `${name}: ${value.toLocaleString()}`
                  }
                  outerRadius={100}
                  dataKey="value"
                  stroke="none"
                >
                  {conversionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e0e0e0",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
