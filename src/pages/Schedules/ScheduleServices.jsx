import { useState, useEffect } from "react";
import { db } from "../../config/fbConf.js";
import { collection, getDocs, addDoc } from "firebase/firestore";

export const useScheduleForm = () => {
  const [showForm, setShowForm] = useState(false);
  const [schools, setSchools] = useState([]);
  const [formData, setFormData] = useState({
    School_ID: "",
    Level: "",
    Companions: "",
    Attendee_Est: "",
    Date_Contract: "",
    Schedule_Date: "",
    ETD: "",
    Notes: "",
  });

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Schools"));
        const schoolsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          Name: doc.data().Name,
        }));
        setSchools(schoolsList);
      } catch (e) {
        console.error("Error fetching schools: ", e);
      }
    };
    fetchSchools();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getMeetingScheduleTime = (meeting) => {
    const raw = meeting.Schedule_Date || meeting.DoC;
    if (!raw) return null;
    const d = raw?.toDate ? raw.toDate() : new Date(raw);
    return isNaN(d.getTime()) ? null : d.getTime();
  };

  const handleSubmit = async () => {
    if (
      !formData.School_ID ||
      !formData.Level ||
      !formData.Companions ||
      !formData.Schedule_Date
    ) {
      alert("Please complete details");
      return;
    }
    const newTime = new Date(formData.Schedule_Date).getTime();
    if (isNaN(newTime)) {
      alert("Please enter a valid schedule date and time.");
      return;
    }
    try {
      const meetingsSnap = await getDocs(collection(db, "Meetings"));
      const existing = meetingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const conflict = existing.some((m) => {
        const t = getMeetingScheduleTime(m);
        return t !== null && Math.abs(t - newTime) < 60000;
      });
      if (conflict) {
        alert("This date and time is already reserved. Please choose another.");
        return;
      }
      const timestamp = new Date();
      await addDoc(collection(db, "Meetings"), {
        ...formData,
        Notes: formData.Notes || "None",
        Date_Created: timestamp,
        Date_Modified: timestamp,
      });
      alert("Schedule Registered Successfully");
      setShowForm(false);
      setFormData({
        School_ID: "",
        Level: "",
        Companions: "",
        Attendee_Est: "",
        Date_Contract: "",
        Schedule_Date: "",
        ETD: "",
        Notes: "",
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Error registering schedule");
    }
  };

  return {
    showForm,
    setShowForm,
    formData,
    handleChange,
    handleSubmit,
    schools,
  };
};
