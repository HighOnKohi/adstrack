import { useState, useEffect } from "react";
import { db } from "../../config/fbConf.js";
import { collection, addDoc, getDocs } from "firebase/firestore";

export const useScheduleForm = () => {
  const [showForm, setShowForm] = useState(false);
  const [schools, setSchools] = useState([]);
  const [formData, setFormData] = useState({
    School_ID: "",
    Level: "",
    Companions: "",
    Attendee_Est: "",
    DoC: "",
    ETA: "",
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

  const handleSubmit = async () => {
    if (
      !formData.School_ID ||
      !formData.Level ||
      !formData.Companions ||
      !formData.Attendee_Est ||
      !formData.DoC ||
      !formData.ETA ||
      !formData.ETD
    ) {
      alert("Please complete details");
      return;
    }
    try {
      const timestamp = new Date();
      await addDoc(collection(db, "Meetings"), {
        ...formData,
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
        DoC: "",
        ETA: "",
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
