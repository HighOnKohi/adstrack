import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { closeIcon } from "../../../assets/Icons/index.js";
import {
    getSchoolYears,
    sumEnrollmentForSchoolYears,
} from "../SchoolsServices.jsx";
import { useAccomplishedMeetingsCount } from "../useAccomplishedMeetingsCount.js";

function SchoolCard({ school, onEdit, onDelete, showStats, onSaveStats }) {
    const [showModal, setShowModal] = useState(false);
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [selectedYear, setSelectedYear] = useState("");
    const [isAddingNewYear, setIsAddingNewYear] = useState(false);
    const [newYearValue, setNewYearValue] = useState("");
    const [enrolleeCount, setEnrolleeCount] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const schoolYears = getSchoolYears();
    const enrollment = school.data.Enrollment || {};
    const accomplishedMeetings = useAccomplishedMeetingsCount(
        showStats ? school.id : null,
    );
    const enrollmentTotalFiveYears = sumEnrollmentForSchoolYears(
        enrollment,
        schoolYears,
    );

    // Total of ALL enrollment years (including newly added ones)
    const enrollmentTotalAll = useMemo(() => {
        return Object.values(enrollment).reduce((sum, val) => {
            const n = typeof val === "number" && Number.isFinite(val) ? val : 0;
            return sum + n;
        }, 0);
    }, [enrollment]);

    // Gather all existing enrollment years (from data + generated)
    const allYears = useMemo(() => {
        const existingKeys = Object.keys(enrollment);
        const combined = new Set([...schoolYears, ...existingKeys]);
        return [...combined].sort();
    }, [enrollment, schoolYears]);

    // Generate suggested new year based on current calendar year
    const suggestedNewYear = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const candidates = [];
        for (let i = -1; i <= 2; i++) {
            const yr = `${currentYear + i}-${currentYear + i + 1}`;
            if (!allYears.includes(yr)) candidates.push(yr);
        }
        return candidates.length > 0 ? candidates[0] : `${currentYear}-${currentYear + 1}`;
    }, [allYears]);

    const openEnrollmentModal = () => {
        setSelectedYear("");
        setIsAddingNewYear(false);
        setNewYearValue(suggestedNewYear);
        setEnrolleeCount("");
        setShowEnrollmentModal(true);
    };

    const handleYearChange = (value) => {
        if (value === "__add_new__") {
            setIsAddingNewYear(true);
            setSelectedYear("");
            setNewYearValue(suggestedNewYear);
            setEnrolleeCount("");
        } else {
            setIsAddingNewYear(false);
            setSelectedYear(value);
            const existing = enrollment[value];
            setEnrolleeCount(existing !== undefined && existing !== null ? String(existing) : "");
        }
    };

    const handleSaveEnrollment = async () => {
        const yearKey = isAddingNewYear ? newYearValue.trim() : selectedYear;
        if (!yearKey) {
            toast.error("Please select or enter a school year.");
            return;
        }
        if (isAddingNewYear && !/^\d{4}-\d{4}$/.test(yearKey)) {
            toast.error("Please use the format YYYY-YYYY (e.g., 2025-2026).");
            return;
        }
        const parsed = enrolleeCount === "" ? 0 : Number(enrolleeCount);
        if (isNaN(parsed) || parsed < 0) {
            toast.error("Please enter a valid number.");
            return;
        }
        setIsSaving(true);
        const updatedEnrollment = { ...enrollment, [yearKey]: parsed };
        try {
            if (onSaveStats) await onSaveStats(school.id, updatedEnrollment);
            toast.success(`Enrollment for SY ${yearKey} updated.`);
            setShowEnrollmentModal(false);
        } catch (e) {
            console.error("Error saving enrollment:", e);
            toast.error("Failed to save enrollment data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="school-card">
            <div className="school-card-label">
                <h1> {school.data.Category} </h1>
            </div>

            <div className="school-card-body">
                {/* Front face — school info */}
                <div className={`school-card-face ${!showStats ? "active" : ""}`}>
                    <h1> {school.data.Name} </h1>
                    <p><span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>location_on</span> {school.data.Address} </p>
                    <p><span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>mail</span> {school.data.Email} </p>
                </div>

                {/* Back face — stats summary */}
                <div className={`school-card-face ${showStats ? "active" : ""}`}>
                    <h1> {school.data.Name} </h1>
                    <div className="school-stats-summary school-stats-summary-compact">
                        <div className="school-stats-metric">
                            <span className="school-stats-metric-label">
                                Total enrollment (all school years)
                            </span>
                            <span className="school-stats-metric-value">
                                {enrollmentTotalAll.toLocaleString()}
                            </span>
                        </div>
                        <hr className="school-stats-inline-divider" aria-hidden="true" />
                        <div className="school-stats-metric">
                            <span className="school-stats-metric-label">
                                Meetings accomplished
                            </span>
                            <span className="school-stats-metric-value">
                                {accomplishedMeetings === null
                                    ? "…"
                                    : accomplishedMeetings.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="school-card-footer">
                <div className="school-card-footer-divider" />
                <div className="school-card-footer-buttons">
                    <a
                        className="school-card-footer-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowModal(true);
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>visibility</span>
                        {showStats ? "View Statistics" : "View Details"}
                    </a>
                    <button
                        type="button"
                        className="school-card-footer-edit-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (showStats) {
                                openEnrollmentModal();
                            } else {
                                if (onEdit) onEdit(school);
                            }
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>edit</span>
                        Edit
                    </button>
                </div>
            </div>

            {/* View Details Modal (non-stats) */}
            {showModal && !showStats && (
                <div className="school-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="school-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-button" onClick={() => setShowModal(false)}>
                            <img src={closeIcon} alt="close" />
                        </button>

                        <h1>{school.data.Name}</h1>

                        <div className="school-detail-content">
                            <div className="school-detail-section">
                                <h3>School Information</h3>
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Category: </span>
                                    <span className="school-detail-value"> {school.data.Category} </span>
                                </div>
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Address: </span>
                                    <span className="school-detail-value"> {school.data.Address} </span>
                                </div>
                            </div>

                            <div className="school-detail-section">
                                <h3>Contact Information</h3>
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Contact Person: </span>
                                    <span className="school-detail-value"> {school.data.Contact_Person} </span>
                                </div>
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Contact Number: </span>
                                    <span className="school-detail-value"> {school.data.Contact_Num} </span>
                                </div>
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Email: </span>
                                    <span className="school-detail-value"> {school.data.Email} </span>
                                </div>
                            </div>
                        </div>
                        <div className="school-detail-actions">
                            <button
                                className="school-detail-action-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                    if (onEdit) onEdit(school);
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: 6, color: '#fff' }}>edit</span>
                                Edit
                            </button>
                            <button
                                className="school-detail-action-btn school-detail-action-btn--delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                    if (onDelete) onDelete(school);
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: 6, color: '#fff' }}>delete</span>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Statistics Modal */}
            {showModal && showStats && (
                <div className="school-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="school-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-button" onClick={() => setShowModal(false)}>
                            <img src={closeIcon} alt="close" />
                        </button>

                        <h1>{school.data.Name}</h1>

                        <div className="school-detail-content">
                            <div className="school-detail-section">
                                <h3>Enrollment Statistics</h3>
                                <div className="school-enrollment-years">
                                    {allYears.map((yr, index) => (
                                        <div
                                            className={`school-enrollment-year-row${index < allYears.length - 1 ? " school-enrollment-year-row-divided" : ""}`}
                                            key={yr}
                                        >
                                            <div className="school-detail-item school-detail-item-tight school-enrollment-year-item">
                                                <div className="school-enrollment-year-info">
                                                    <span className="school-detail-label">SY {yr}</span>
                                                    <span className="school-detail-value">
                                                        {enrollment[yr] !== undefined && enrollment[yr] !== null
                                                            ? `${enrollment[yr].toLocaleString()} students`
                                                            : "No data"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="school-enrollment-total-row">
                                    <span className="school-detail-label">
                                        Total (all school years)
                                    </span>
                                    <span className="school-detail-value school-enrollment-total-value">
                                        {enrollmentTotalAll.toLocaleString()} students
                                    </span>
                                </div>
                            </div>

                            <div className="school-detail-section school-detail-section-meetings">
                                <h3>Meeting Statistics</h3>
                                <div className="school-detail-item school-detail-item-tight">
                                    <span className="school-detail-label">
                                        Meetings accomplished
                                    </span>
                                    <span className="school-detail-value school-meeting-accomplished-value">
                                        {accomplishedMeetings === null
                                            ? "…"
                                            : accomplishedMeetings.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Revamped Enrollment Edit Modal */}
            {showEnrollmentModal && (
                <div className="school-modal-overlay" onClick={() => setShowEnrollmentModal(false)} style={{ zIndex: 1100 }}>
                    <div className="school-detail-modal school-edit-year-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-button" onClick={() => setShowEnrollmentModal(false)}>
                            <img src={closeIcon} alt="close" />
                        </button>
                        <h1>Edit Enrollment</h1>
                        <p style={{ color: "#666", fontSize: "0.9rem", margin: "0 0 0.75rem 0" }}>
                            {school.data.Name}
                        </p>
                        <div className="school-edit-year-form">
                            <label className="school-input-label">School Year</label>
                            <select
                                className="school-stats-input"
                                value={isAddingNewYear ? "__add_new__" : selectedYear}
                                onChange={(e) => handleYearChange(e.target.value)}
                            >
                                <option value="" disabled>Select school year</option>
                                {allYears.map((yr) => (
                                    <option key={yr} value={yr}>
                                        SY {yr} {enrollment[yr] !== undefined ? `(${enrollment[yr]} students)` : ""}
                                    </option>
                                ))}
                                <option value="__add_new__">
                                    + Add New School Year
                                </option>
                            </select>

                            {isAddingNewYear && (
                                <>
                                    <label className="school-input-label" style={{ marginTop: "0.75rem" }}>New School Year</label>
                                    <input
                                        type="text"
                                        className="school-stats-input"
                                        value={newYearValue}
                                        onChange={(e) => setNewYearValue(e.target.value)}
                                        placeholder="e.g., 2025-2026"
                                    />
                                </>
                            )}

                            {(selectedYear || isAddingNewYear) && (
                                <>
                                    <label className="school-input-label" style={{ marginTop: "0.75rem" }}>Total Enrollees</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="school-stats-input"
                                        value={enrolleeCount}
                                        onChange={(e) => setEnrolleeCount(e.target.value)}
                                        placeholder="0"
                                        autoFocus
                                    />
                                </>
                            )}
                        </div>
                        <div className="school-detail-actions" style={{ marginTop: "1.25rem" }}>
                            <button
                                className="school-detail-action-btn"
                                onClick={() => setShowEnrollmentModal(false)}
                                style={{ background: "#666" }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: 4, color: '#fff' }}>close</span>
                                Cancel
                            </button>
                            <button
                                className="school-detail-action-btn"
                                onClick={handleSaveEnrollment}
                                disabled={isSaving || (!selectedYear && !isAddingNewYear)}
                                style={(!selectedYear && !isAddingNewYear) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: 4, color: '#fff' }}>save</span>
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SchoolCard;