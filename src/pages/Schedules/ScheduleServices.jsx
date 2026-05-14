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
      Type: "Meeting",
      Type_Other: "",
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
      !formData.Type ||
      !formData.Companions ||
      !formData.Schedule_Date
    ) {
      return {
        success: false,
        error:
          "Please fill in all required fields (School, Level, Type, Companions, and Schedule Date) before submitting.",
      };
    }

    if (formData.Type === "Others" && !formData.Type_Other.trim()) {
      return {
        success: false,
        error:
          'You selected "Others" as the schedule type. Please specify the type in the text field provided.',
      };
    }

    const companions = parseInt(formData.Companions, 10);
    if (companions > 10) {
      return {
        success: false,
        error:
          "Companion count cannot exceed 10. Each schedule allows a maximum of 10 companions for logistical reasons.",
      };
    }

    const attendees = parseInt(formData.Attendee_Est, 10);
    if (formData.Attendee_Est && (attendees < 30 || attendees > 100)) {
      return {
        success: false,
        error:
          "Estimated attendees must be between 30 and 100. This range ensures a manageable audience size for career talks.",
      };
    }

    const newTime = new Date(formData.Schedule_Date).getTime();
    if (isNaN(newTime)) {
      return {
        success: false,
        error:
          "The schedule date and time you entered is not valid. Please select a date and time using the date picker.",
      };
    }

    const scheduleObj = new Date(formData.Schedule_Date);
    const scheduleHours = scheduleObj.getHours();
    if (scheduleHours < 6 || scheduleHours >= 18) {
      return {
        success: false,
        error:
          "Schedule time must be between 6:00 AM and 6:00 PM. Visits outside of school operating hours are not allowed.",
      };
    }

    const { Date_Contract, Schedule_Date, ETD } = formData;

    if (Date_Contract && Schedule_Date) {
      const contractTime = new Date(Date_Contract + "T00:00").getTime();
      const scheduleTime = new Date(Schedule_Date).getTime();

      if (scheduleTime < contractTime) {
        return {
          success: false,
          error:
            "The Schedule Date cannot be earlier than the Date of Contract. The visit must occur after the contract has been signed.",
        };
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
        return {
          success: false,
          error:
            "The Estimated Time of Departure must be at least 1 hour after the Schedule Date & Time. This ensures sufficient time for the career talk session.",
        };
      }

      if (contractTime && etdTime < contractTime) {
        return {
          success: false,
          error:
            "The Estimated Time of Departure cannot be earlier than the Date of Contract. Please verify your dates are in the correct order.",
        };
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
        return {
          success: false,
          error:
            "There is already a schedule within 1 hour of this time slot. Schedules must have at least a 1-hour gap between them to allow for travel and preparation.",
        };
      }
      const timestamp = new Date();
      await addDoc(collection(db, "Meetings"), {
        ...formData,
        Notes: formData.Notes || "None",
        Date_Created: timestamp,
        Date_Modified: timestamp,
      });
      setShowForm(false);
      setFormData(getDefaultFormData());
      if (onSuccess) onSuccess();
      return { success: true, message: "Schedule Registered Successfully" };
    } catch (e) {
      console.error("Error adding document: ", e);
      return {
        success: false,
        error:
          "Failed to save the schedule to the database. This may be caused by a network issue or insufficient permissions. Please check your internet connection and try again.",
      };
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
