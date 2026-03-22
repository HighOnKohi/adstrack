import { useState } from "react";
import { closeIcon, editIcon, trashIcon, addIcon } from "../../../assets/Icons/index.js";
import {
    getSchoolYears,
    sumEnrollmentForSchoolYears,
    sumEnrollmentDraft,
} from "../SchoolsServices.jsx";
import { useAccomplishedMeetingsCount } from "../useAccomplishedMeetingsCount.js";

function SchoolCard({ school, onEdit, onDelete, showStats, onSaveStats }) {
    const [showModal, setShowModal] = useState(false);
    const [editingStats, setEditingStats] = useState(false);
    const schoolYears = getSchoolYears();
    const enrollment = school.data.Enrollment || {};
    const accomplishedMeetings = useAccomplishedMeetingsCount(
        showStats ? school.id : null,
    );
    const enrollmentTotalFiveYears = sumEnrollmentForSchoolYears(
        enrollment,
        schoolYears,
    );

    const [statsDraft, setStatsDraft] = useState(() => {
        const draft = {};
        schoolYears.forEach((yr) => {
            draft[yr] = enrollment[yr] ?? "";
        });
        return draft;
    });

    // Sync draft when school data changes externally
    const syncDraft = () => {
        const latest = school.data.Enrollment || {};
        const draft = {};
        schoolYears.forEach((yr) => {
            draft[yr] = latest[yr] ?? "";
        });
        setStatsDraft(draft);
    };

    const handleStatChange = (year, value) => {
        setStatsDraft((prev) => ({ ...prev, [year]: value }));
    };

    const handleSaveStats = async () => {
        const parsed = {};
        schoolYears.forEach((yr) => {
            const val = statsDraft[yr];
            parsed[yr] = val === "" || val === null || val === undefined ? 0 : Number(val);
        });
        if (onSaveStats) {
            await onSaveStats(school.id, parsed);
        }
        setEditingStats(false);
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
                    <p> 📍 {school.data.Address} </p>
                    <p> ✉️ {school.data.Email} </p>
                </div>

                {/* Back face — stats summary */}
                <div className={`school-card-face ${showStats ? "active" : ""}`}>
                    <h1> {school.data.Name} </h1>
                    <div className="school-stats-summary school-stats-summary-compact">
                        <div className="school-stats-metric">
                            <span className="school-stats-metric-label">
                                Total enrollment (last 5 school years)
                            </span>
                            <span className="school-stats-metric-value">
                                {enrollmentTotalFiveYears.toLocaleString()}
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
                <a
                    className="school-card-view-details-button"
                    onClick={(e) => {
                        e.preventDefault();
                        syncDraft();
                        setEditingStats(false);
                        setShowModal(true);
                    }}
                >
                    {showStats ? "View Statistics ⟶" : "View Details ⟶"}
                </a>
            </div>

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
                                className="school-card-view-details-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                    if (onEdit) onEdit(school);
                                }}
                            >
                                <img src={editIcon} alt="Edit" style={{ width: 16, marginRight: 6 }} />
                                Edit
                            </button>
                            <button
                                className="school-card-view-details-button delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                    if (onDelete) onDelete(school);
                                }}
                            >
                                <img src={trashIcon} alt="Delete" style={{ width: 16, marginRight: 6 }} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && showStats && (
                <div className="school-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="school-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-button" onClick={() => { setShowModal(false); setEditingStats(false); }}>
                            <img src={closeIcon} alt="close" />
                        </button>

                        <h1>{school.data.Name}</h1>

                        <div className="school-detail-content">
                            <div className="school-detail-section">
                                <h3>Enrollment Statistics</h3>
                                <div className="school-enrollment-years">
                                    {schoolYears.map((yr, index) => (
                                        <div
                                            className={`school-enrollment-year-row${index < schoolYears.length - 1 ? " school-enrollment-year-row-divided" : ""}`}
                                            key={yr}
                                        >
                                            <div className="school-detail-item school-detail-item-tight">
                                                <span className="school-detail-label">SY {yr}</span>
                                                {editingStats ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="school-stats-input"
                                                        value={statsDraft[yr]}
                                                        onChange={(e) =>
                                                            handleStatChange(yr, e.target.value)
                                                        }
                                                        placeholder="0"
                                                    />
                                                ) : (
                                                    <span className="school-detail-value">
                                                        {enrollment[yr] !== undefined &&
                                                        enrollment[yr] !== null
                                                            ? `${enrollment[yr].toLocaleString()} students`
                                                            : "No data"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="school-enrollment-total-row">
                                    <span className="school-detail-label">
                                        Total (last 5 school years)
                                    </span>
                                    <span className="school-detail-value school-enrollment-total-value">
                                        {editingStats
                                            ? `${sumEnrollmentDraft(statsDraft, schoolYears).toLocaleString()} students`
                                            : `${enrollmentTotalFiveYears.toLocaleString()} students`}
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

                        <div className="school-detail-actions">
                            {editingStats ? (
                                <>
                                    <button
                                        className="school-card-view-details-button"
                                        onClick={() => { syncDraft(); setEditingStats(false); }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="school-card-view-details-button"
                                        onClick={handleSaveStats}
                                    >
                                        <img src={addIcon} alt="Save" style={{ width: 16, marginRight: 6, filter: "invert(1) brightness(2)" }} />
                                        Save
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="school-card-view-details-button"
                                    onClick={() => setEditingStats(true)}
                                >
                                    <img src={editIcon} alt="Edit" style={{ width: 16, marginRight: 6 }} />
                                    Edit Statistics
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SchoolCard;