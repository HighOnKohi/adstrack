import { useState, useEffect } from "react";
import { db } from "../../config/fbConf.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

export const useScheduleForm = (onSuccess) => {
  const [showForm, setShowForm] = useState(false);
  const [schools, setSchools] = useState([]);

  const getDefaultFormData = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");

    const formatDateTime = (d) => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const formatDate = (d) => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const scheduleObj = new Date(now);
    scheduleObj.setDate(scheduleObj.getDate() + 7);

    const etdObj = new Date(scheduleObj);
    etdObj.setHours(etdObj.getHours() + 1);

    return {
      School_ID: "",
      Level: "",
      Companions: "1",
      Attendee_Est: "40",
      Date_Contract: formatDate(now),
      Schedule_Date: formatDateTime(scheduleObj),
      ETD: formatDateTime(etdObj),
      Notes: "",
    };
  };

  const [formData, setFormData] = useState(getDefaultFormData());

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Schools"),
      (querySnapshot) => {
        const schoolsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          Name: doc.data().Name,
        }));
        setSchools(schoolsList);
      },
      (error) => {
        console.error("Schools realtime update failed:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "Companions" || name === "Attendee_Est") && value !== "") {
      if (!/^\d+$/.test(value)) return;
    }

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "Schedule_Date" && !prev.ETD) newData.ETD = value;
      return newData;
    });
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

    const companions = parseInt(formData.Companions, 10);
    if (companions > 10) {
      alert("Companion count cannot exceed 10.");
      return;
    }

    const attendees = parseInt(formData.Attendee_Est, 10);
    if (formData.Attendee_Est && (attendees < 30 || attendees > 100)) {
      alert("Estimated attendees must be between 30 and 100.");
      return;
    }

    const newTime = new Date(formData.Schedule_Date).getTime();
    if (isNaN(newTime)) {
      alert("Please enter a valid schedule date and time.");
      return;
    }

    const scheduleObj = new Date(formData.Schedule_Date);
    const scheduleHours = scheduleObj.getHours();
    if (scheduleHours < 6 || scheduleHours >= 18) {
      alert("Schedule time must be between 6:00 AM and 6:00 PM.");
      return;
    }

    const { Date_Contract, Schedule_Date, ETD } = formData;

    if (Date_Contract && Schedule_Date) {
      const contractTime = new Date(Date_Contract + "T00:00").getTime();
      const scheduleTime = new Date(Schedule_Date).getTime();

      if (scheduleTime < contractTime) {
        alert("Schedule Date cannot be before Date of Contract.");
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
        alert(
          "Estimated Time of Departure must be at least 1 hour after Schedule Date & Time.",
        );
        return;
      }

      if (contractTime && etdTime < contractTime) {
        alert("Estimated Time of Departure cannot be before Date of Contract.");
        return;
      }
    }

    try {
      // Create a 1-hour window before and after the new schedule time
      const conflictStart = new Date(newTime - 3600000);
      const conflictEnd = new Date(newTime + 3600000);

      const pad = (n) => String(n).padStart(2, "0");
      const formatQueryDate = (d) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      // Efficiently query only meetings that fall within this 2-hour window
      const conflictQuery = query(
        collection(db, "Meetings"),
        where("Schedule_Date", ">", formatQueryDate(conflictStart)),
        where("Schedule_Date", "<", formatQueryDate(conflictEnd)),
      );

      const meetingsSnap = await getDocs(conflictQuery);
      const existing = meetingsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const conflict = existing.some((m) => {
        if (m.Status === "Done") return false;
        const t = getMeetingScheduleTime(m);
        return t !== null && Math.abs(t - newTime) < 3600000;
      });
      if (conflict) {
        alert("Schedules must have at least a 1-hour interval between them.");
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
      setFormData(getDefaultFormData());
      if (onSuccess) onSuccess();
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
