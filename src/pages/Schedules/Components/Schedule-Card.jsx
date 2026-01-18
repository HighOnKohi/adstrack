import { useState, useEffect } from "react";
import { db } from "../../../config/fbConf.js";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { closeIcon } from "../../../assets/Icons/index.js";

function ScheduleCard({ meeting, onUpdate }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  
  const [editFormData, setEditFormData] = useState({
  
    Level: meeting.Level || "",
    Companions: meeting.Companions || "",
    Attendee_Est: meeting.Attendee_Est || "",
    DoC: meeting.DoC || "",
    ETA: meeting.ETA || "",
    ETD: meeting.ETD || "",
    Notes: meeting.Notes || "",
  
  });

  //Get schedule data
  useEffect(() => {
    const fetchSchoolData = async () => {
        const schoolDoc = await getDoc(doc(db, "Schools", meeting.School_ID));
        setSchoolData(schoolDoc.data());
    };

    if (meeting.School_ID) 
        fetchSchoolData();

  }, [meeting.School_ID]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value, }));
  };

  const handleEditSubmit = async () => {
      const meetingRef = doc(db, "Meetings", meeting.id);
      await updateDoc(meetingRef, { ...editFormData, Date_Modified: new Date()});
      
      setShowEditModal(false);
      if (onUpdate) onUpdate();

      alert("Schedule updated successfully!");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit",});
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",});
  };

  return (
    <>
      <div className="schedule-card-row">
        <div className="schedule-card-cell"> {schoolData?.Name || "Loading..."} </div>
        <div className="schedule-card-cell"> {schoolData?.Address || "N/A"} </div>
        <div className="schedule-card-cell"> {formatDate(meeting.DoC)} </div>
        <div className="schedule-card-cell"> {formatDateTime(meeting.ETA)} </div>
        <div className="schedule-card-cell">
          <button className="edit-details-button" onClick={() => setShowEditModal(true)}> EDIT DETAILS </button>
        </div>
      </div>

      {showEditModal && (
        <div className="sched-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="sched-form" onClick={(e) => e.stopPropagation()}>
            
            <button className="close-modal-button" onClick={() => setShowEditModal(false)}>
              <img src={closeIcon} alt="close"/>
            </button>
            
            <h1> Edit Schedule </h1>

            <div className="sched-form-grid">
              <div className="sched-input-group">
                
                <label className="input-label"> Level </label>
                
                <select name="Level" className="sched-input" value={editFormData.Level} onChange={handleEditChange}>
                  
                  <option value="" disabled> Select Level </option>
                  <option value="SHS"> SHS </option>
                  <option value="JHS"> JHS </option>
                  <option value="Grade School"> Grade School </option>
                
                </select>
              
              </div>

              <div className="sched-input-group">
                <label className="input-label">Companions</label>
                <input name="Companions" type="text" placeholder="Name(s) of Companion(s)" className="sched-input" value={editFormData.Companions} onChange={handleEditChange}/>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Estimated Attendees</label>
                <input name="Attendee_Est" type="text" placeholder="Estimated Number of Attendees" className="sched-input" value={editFormData.Attendee_Est} onChange={handleEditChange}/>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Date of Contract</label>
                <input name="DoC" type="date" className="sched-input" value={editFormData.DoC} onChange={handleEditChange}/>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Estimated Time of Arrival</label>
                <input name="ETA" type="datetime-local" className="sched-input" value={editFormData.ETA} onChange={handleEditChange}/>
              </div>

              <div className="sched-input-group">
                <label className="input-label">Estimated Time of Departure</label>
                <input name="ETD" type="datetime-local" className="sched-input" value={editFormData.ETD} onChange={handleEditChange}/>
              </div>

              <div className="sched-input-group sched-full-width">
                <label className="sched-input-label">Notes</label>
                <textarea name="Notes" placeholder="Notes (Leave blank if none)" className="sched-input" rows="3" value={editFormData.Notes} onChange={handleEditChange}/>
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