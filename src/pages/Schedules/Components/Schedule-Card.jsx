import { useState, useEffect } from "react";
import { db } from "../../../config/fbConf.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { closeIcon, trashIcon, editIcon } from "../../../assets/Icons/index.js";
import { useAlert } from "../../../GlobalComponents/useAlert.js";
import "./Schedule-Card.css";

function ScheduleCard({ meeting, onUpdate }) {
  const { showAlert, showConfirmation } = useAlert();
  const [showEditModal, setShowEditModal] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const formatForInput = (val, isDateTime) => {
    if (!val) return "";
    if (val?.toDate) {
      const date = val.toDate();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      if (!isDateTime) return `${year}-${month}-${day}`;
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return val;
  };

  const [editFormData, setEditFormData] = useState({
    Level: meeting.Level || "",
    Type: meeting.Type || "Meeting",
    Type_Other: meeting.Type_Other || "",
    Companions: meeting.Companions || "",
    Attendee_Est: meeting.Attendee_Est || "",
    Date_Contract: formatForInput(meeting.Date_Contract || meeting.DoC, false),
    Schedule_Date: formatForInput(meeting.Schedule_Date || meeting.ETA, true),
    ETD: formatForInput(meeting.ETD, true),
    Notes: meeting.Notes || "",
    Status: meeting.Status || "Pending",
  });

  //Get schedule data
  useEffect(() => {
    const fetchSchoolData = async () => {
      const schoolDoc = await getDoc(doc(db, "Schools", meeting.School_ID));
      setSchoolData(schoolDoc.data());
    };

    if (meeting.School_ID) fetchSchoolData();
  }, [meeting.School_ID]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "Companions" || name === "Attendee_Est") && value !== "") {
      if (!/^\d+$/.test(value)) return;
    }

    setEditFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "Schedule_Date" && !prev.ETD) newData.ETD = value;
      return newData;
    });
  };

  const handleEditSubmit = async () => {
    const { Date_Contract, Schedule_Date, ETD } = editFormData;

    const companions = parseInt(editFormData.Companions, 10);
    if (companions > 10) {
      showAlert(
        "Companion count cannot exceed 10. Each schedule allows a maximum of 10 companions for logistical reasons.",
        "Validation Error",
        "error",
      );
      return;
    }

    const attendees = parseInt(editFormData.Attendee_Est, 10);
    if (editFormData.Attendee_Est && (attendees < 30 || attendees > 500)) {
      showAlert(
        "Estimated attendees must be between 30 and 500. Please enter a realistic number for the expected audience size.",
        "Validation Error",
        "error",
      );
      return;
    }

    if (Date_Contract && Schedule_Date) {
      const contractTime = new Date(Date_Contract + "T00:00").getTime();
      const scheduleTime = new Date(Schedule_Date).getTime();

      if (scheduleTime < contractTime) {
        showAlert(
          "The Schedule Date cannot be earlier than the Date of Contract. The visit must occur after the contract has been signed.",
          "Validation Error",
          "error",
        );
        return;
      }
    }

    if (ETD) {
      const etdTime = new Date(ETD).getTime();
      const scheduleTime = Schedule_Date
        ? new Date(Schedule_Date).getTime()
        : null;
      const contractTime = Date_Contract
        ? new Date(Date_Contract + "T00:00").getTime()
        : null;

      if (scheduleTime && etdTime < scheduleTime + 3600000) {
        showAlert(
          "The Estimated Time of Departure must be at least 1 hour after the Schedule Date & Time. This ensures sufficient time for the career talk session.",
          "Validation Error",
          "error",
        );
        return;
      }

      if (contractTime && etdTime < contractTime) {
        showAlert(
          "The Estimated Time of Departure cannot be earlier than the Date of Contract. Please verify your dates are in the correct order.",
          "Validation Error",
          "error",
        );
        return;
      }
    }

    if (Schedule_Date) {
      const newTime = new Date(Schedule_Date).getTime();
      const scheduleObj = new Date(Schedule_Date);
      const scheduleHours = scheduleObj.getHours();
      if (scheduleHours < 6 || scheduleHours >= 18) {
        showAlert(
          "Schedule time must be between 6:00 AM and 6:00 PM. Visits outside of school operating hours are not allowed.",
          "Validation Error",
          "error",
        );
        return;
      }

      try {
        const meetingsSnap = await getDocs(collection(db, "Meetings"));
        const existing = meetingsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((m) => m.id !== meeting.id);

        const conflict = existing.some((m) => {
          if (m.Status === "Done") return false;
          const raw = m.Schedule_Date || m.DoC;
          if (!raw) return false;
          const t = raw?.toDate
            ? raw.toDate().getTime()
            : new Date(raw).getTime();
          return !isNaN(t) && Math.abs(t - newTime) < 3600000;
        });

        if (conflict) {
          showAlert(
            "There is already a schedule within 1 hour of this time slot. Schedules must have at least a 1-hour gap between them to allow for travel and preparation.",
            "Validation Error",
            "error",
          );
          return;
        }
      } catch (e) {
        console.error("Error checking conflicts: ", e);
      }
    }

    try {
      const meetingRef = doc(db, "Meetings", meeting.id);
      await updateDoc(meetingRef, {
        ...editFormData,
        Date_Modified: new Date(),
      });

      setShowEditModal(false);
      if (onUpdate) onUpdate();

      showAlert("Schedule updated successfully!", "Success", "success");
    } catch (e) {
      console.error("Error updating schedule:", e);
      showAlert(
        "Failed to update the schedule. This may be caused by a network issue or insufficient permissions. Please check your internet connection and try again.",
        "Error",
        "error",
      );
    }
  };

  const handleDelete = async () => {
    showConfirmation(
      "Are you sure you want to delete this schedule?",
      "Confirm Delete",
      async (confirmed) => {
        if (confirmed) {
          try {
            await deleteDoc(doc(db, "Meetings", meeting.id));
            if (onUpdate) onUpdate();
            showAlert("Schedule deleted successfully", "Success", "success");
          } catch (e) {
            console.error("Error deleting schedule: ", e);
            showAlert(
              "Failed to delete the schedule. This may be caused by a network issue or insufficient permissions. Please check your internet connection and try again.",
              "Error",
              "error",
            );
          }
        }
      },
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = dateString?.toDate
      ? dateString.toDate()
      : new Date(dateString);
    return isNaN(date.getTime())
      ? "N/A"
      : date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = dateString?.toDate
      ? dateString.toDate()
      : new Date(dateString);
    return isNaN(date.getTime())
      ? "N/A"
      : date.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
  };

  return (
    <>
      <div
        className="schedule-card-row"
        onClick={() => setShowDetailsModal(true)}
        role="button"
        tabIndex="0"
      >
        <div className="schedule-card-cell">
          {" "}
          {schoolData?.Name || "Loading..."}{" "}
        </div>
        <div className="schedule-card-cell">
          {" "}
          {schoolData?.Address || "N/A"}{" "}
        </div>
        <div className="schedule-card-cell">
          {" "}
          {formatDate(meeting.Date_Contract || meeting.DoC)}{" "}
        </div>
        <div className="schedule-card-cell">
          {" "}
          {formatDateTime(meeting.Schedule_Date || meeting.ETA)}{" "}
        </div>
        <div className="schedule-card-cell">
          <span
            className={`status-pill ${(meeting.Status || "Pending").toLowerCase()}`}
          >
            {meeting.Status || "Pending"}
          </span>
        </div>
        <div className="schedule-card-cell">
          <span
            className={`type-badge type-badge--${(meeting.Type || "Meeting").toLowerCase().replace(/\s+/g, '-')}`}
          >
            {meeting.Type === "Others"
              ? meeting.Type_Other || "Others"
              : meeting.Type || "Meeting"}
          </span>
        </div>

        <div
          className="schedule-card-cell action-buttons-cell"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="edit-details-button action-button"
            onClick={() => setShowEditModal(true)}
          >
            <img src={editIcon} alt="Edit" className="action-icon" />
            EDIT
          </button>
          <button
            onClick={handleDelete}
            className="edit-details-button action-button delete"
          >
            <img src={trashIcon} alt="Delete" className="action-icon" />
            DELETE
          </button>
        </div>
      </div>

      {showDetailsModal && (
        <div
          className="sched-modal-overlay"
          onClick={() => setShowDetailsModal(false)}
        >
          <div className="sched-form" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-modal-button"
              onClick={() => setShowDetailsModal(false)}
            >
              <img src={closeIcon} alt="close" />
            </button>

            <h1>Schedule Details</h1>

            <div className="sched-form-grid">
              <div className="sched-input-group">
                <label className="input-label">School</label>
                <input
                  type="text"
                  className="sched-input"
                  value={schoolData?.Name || "N/A"}
                  disabled
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Address</label>
                <input
                  type="text"
                  className="sched-input"
                  value={schoolData?.Address || "N/A"}
                  disabled
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Level</label>
                <input
                  type="text"
                  className="sched-input"
                  value={meeting.Level || "N/A"}
                  disabled
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Companion Count</label>
                <input
                  type="text"
                  className="sched-input"
                  value={meeting.Companions || "N/A"}
                  disabled
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Estimated Attendees</label>
                <input
                  type="text"
                  className="sched-input"
                  value={meeting.Attendee_Est || "N/A"}
                  disabled
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Status</label>
                <div className="sched-status-display">
                  <span
                    className={`status-pill ${(meeting.Status || "Pending").toLowerCase()}`}
                  >
                    {meeting.Status || "Pending"}
                  </span>
                </div>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Type</label>
                <div className="sched-status-display">
                  <span
                    className={`type-badge type-badge--${(meeting.Type || "Meeting").toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {meeting.Type === "Others"
                      ? meeting.Type_Other || "Others"
                      : meeting.Type || "Meeting"}
                  </span>
                </div>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Date of Contract</label>
                <input
                  type="text"
                  className="sched-input"
                  value={formatDate(meeting.Date_Contract || meeting.DoC)}
                  disabled
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Schedule Date & Time</label>
                <input
                  type="text"
                  className="sched-input"
                  value={formatDateTime(meeting.Schedule_Date || meeting.ETA)}
                  disabled
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">
                  Estimated Time of Departure
                </label>
                <input
                  type="text"
                  className="sched-input"
                  value={formatDateTime(meeting.ETD)}
                  disabled
                />
              </div>

              <div className="sched-input-group sched-full-width">
                <label className="input-label">Notes</label>
                <textarea
                  className="sched-input"
                  rows="3"
                  value={meeting.Notes || "None"}
                  disabled
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="sched-submit edit-schedule-btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowEditModal(true);
                }}
              >
                <img src={editIcon} alt="Edit" className="edit-schedule-icon" />
                Edit Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="sched-modal-overlay"
          onClick={() => setShowEditModal(false)}
        >
          <div className="sched-form" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-modal-button"
              onClick={() => setShowEditModal(false)}
            >
              <img src={closeIcon} alt="close" />
            </button>

            <h1> Edit Schedule </h1>

            <div className="sched-form-grid">
              <div className="sched-input-group">
                <label className="input-label"> Level </label>
                <select
                  name="Level"
                  className="sched-input"
                  value={editFormData.Level}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    {" "}
                    Select Level{" "}
                  </option>
                  <option value="SHS"> SHS </option>
                  <option value="JHS"> JHS </option>
                  <option value="Grade School"> Grade School </option>
                </select>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Type</label>
                <select
                  name="Type"
                  className="sched-input"
                  value={editFormData.Type}
                  onChange={handleChange}
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Advertising">Advertising</option>
                  <option value="Career talk">Career talk</option>
                  <option value="Follow-Up">Follow-Up</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {editFormData.Type === "Others" && (
                <div className="sched-input-group">
                  <label className="input-label">Specify Type</label>
                  <input
                    name="Type_Other"
                    type="text"
                    placeholder="Specify the schedule type"
                    className="sched-input"
                    value={editFormData.Type_Other}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="sched-input-group">
                <label className="input-label">Companion Count</label>
                <input
                  name="Companions"
                  type="text"
                  inputMode="numeric"
                  placeholder="Companion Count"
                  className="sched-input"
                  value={editFormData.Companions}
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
                  value={editFormData.Attendee_Est}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Date of Contract</label>
                <input
                  name="Date_Contract"
                  type="date"
                  className="sched-input"
                  value={editFormData.Date_Contract}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Schedule Date & Time</label>
                <input
                  name="Schedule_Date"
                  type="datetime-local"
                  className="sched-input"
                  value={editFormData.Schedule_Date}
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
                  value={editFormData.ETD}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Status</label>
                <select
                  name="Status"
                  className="sched-input sched-status-select"
                  value={editFormData.Status}
                  onChange={handleChange}
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="sched-input-group sched-full-width">
                <label className="sched-input-label">Notes</label>
                <textarea
                  name="Notes"
                  placeholder="Notes (Leave blank if none)"
                  className="sched-input"
                  rows="3"
                  value={editFormData.Notes}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button className="sched-submit" onClick={handleEditSubmit}>
              Update Schedule
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ScheduleCard;
