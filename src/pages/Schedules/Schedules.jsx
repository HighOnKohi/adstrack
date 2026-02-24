import "./Schedules.css";
import {
  addIcon,
  bookIcon,
  closeIcon,
  printIcon,
} from "../../assets/Icons/index.js";
import { useState, useEffect } from "react";
import { db } from "../../config/fbConf.js";
import { collection, getDocs } from "firebase/firestore";
import { useScheduleForm } from "./ScheduleServices.jsx";
import ScheduleCard from "./Components/Schedule-Card.jsx";
import PrintCard from "./Components/Print-Card.jsx";

function Schedules() {
  const {
    showForm,
    setShowForm,
    formData,
    handleChange,
    handleSubmit,
    schools,
  } = useScheduleForm();
  const [meetings, setMeetings] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  //Get meetings from Firebase
  useEffect(() => {
    const fetchMeetings = async () => {
      const querySnapshot = await getDocs(collection(db, "Meetings"));
      const meetingsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMeetings(meetingsList);
    };

    fetchMeetings();
  }, []);

  const handleUpdate = () => {
    const fetchMeetings = async () => {
      const querySnapshot = await getDocs(collection(db, "Meetings"));
      const meetingsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMeetings(meetingsList);
    };

    fetchMeetings();
  };

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
          <div className="schedule-label-cell">NAME</div>
          <div className="schedule-label-cell">ADDRESS</div>
          <div className="schedule-label-cell">DATE OF CONTRACT</div>
          <div className="schedule-label-cell">ETA</div>
          <div className="schedule-label-cell"></div>
        </div>

        <div className="schedule-list-container">
          {meetings.length === 0 ? (
            <div className="no-schedules">No schedules found</div>
          ) : (
            meetings.map((meeting) => (
              <ScheduleCard
                key={meeting.id}
                meeting={meeting}
                onUpdate={handleUpdate}
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
                <label className="input-label">Companions</label>
                <input
                  name="Companions"
                  type="text"
                  placeholder="Name(s) of Companion(s)"
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
                  placeholder="Estimated Number of Attendees"
                  className="sched-input"
                  value={formData.Attendee_Est}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Date of Contract</label>
                <input
                  name="DoC"
                  type="date"
                  className="sched-input"
                  value={formData.DoC}
                  onChange={handleChange}
                />
              </div>

              <div className="sched-input-group">
                <label className="input-label">Estimated Time of Arrival</label>
                <input
                  name="ETA"
                  type="datetime-local"
                  className="sched-input"
                  value={formData.ETA}
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
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

export default Schedules;
