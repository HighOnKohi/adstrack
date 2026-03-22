/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { db } from "../../config/fbConf.js";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  provinces4A,
  batangasMunicipalities,
  caviteMunicipalities,
  lagunaMunicipalities,
  quezonMunicipalities,
  rizalMunicipalities,
} from "../../GlobalComponents/Region4A.js";

const provinceToMunicipalities = {
  Batangas: batangasMunicipalities,
  Cavite: caviteMunicipalities,
  Laguna: lagunaMunicipalities,
  Quezon: quezonMunicipalities,
  Rizal: rizalMunicipalities,
};

export function ProvinceSelector({ value, onChange, name }) {
  return (
    <select
      name={name}
      className="school-input"
      value={value}
      onChange={onChange}
    >
      <option value="" disabled>
        Select Province
      </option>
      {provinces4A.map((p) => (
        <option key={p}>{p}</option>
      ))}
    </select>
  );
}

export function MunicipalitySelector({ province, value, onChange, name }) {
  const list = provinceToMunicipalities[province] || [];
  return (
    <select
      name={name}
      className="school-input"
      key={province}
      value={value}
      onChange={onChange}
    >
      <option value="" disabled>
        Select Municipality
      </option>
      {list.map((m) => (
        <option key={m}>{m}</option>
      ))}
    </select>
  );
}

export const useSchoolForm = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    Name: "",
    Category: "",
    Contact_Person: "",
    Contact_Num: "",
    Email: "",
    Province: "",
    Municipality: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      return {
        ...prev,
        [name]: value,
        ...(name === "Province" ? { Municipality: "" } : {}),
      };
    });
  };

  const handleSubmit = async () => {
    if (
      !formData.Name ||
      !formData.Category ||
      !formData.Contact_Person ||
      !formData.Contact_Num ||
      !formData.Email ||
      !formData.Province ||
      !formData.Municipality
    ) {
      return { success: false, error: "Please complete details" };
    }
    try {
      await addDoc(collection(db, "Schools"), {
        Name: formData.Name,
        Category: formData.Category,
        Contact_Person: formData.Contact_Person,
        Contact_Num: formData.Contact_Num,
        Email: formData.Email,
        Address: `${formData.Municipality}, ${formData.Province}`,
      });
      setShowForm(false);
      setFormData({
        Name: "",
        Category: "",
        Contact_Person: "",
        Contact_Num: "",
        Email: "",
        Province: "",
        Municipality: "",
      });
      return { success: true, message: "School Registered Successfully" };
    } catch (e) {
      console.error("Error adding document: ", e);
      return { success: false, error: "Error registering school" };
    }
  };

  return {
    showForm,
    setShowForm,
    formData,
    setFormData,
    handleChange,
    handleSubmit,
  };
};

export const updateSchool = async (id, data) => {
  const schoolRef = doc(db, "Schools", id);
  await updateDoc(schoolRef, data);
};

export const deleteSchool = async (id) => {
  const schoolRef = doc(db, "Schools", id);
  await deleteDoc(schoolRef);
};

export const getSchoolYears = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  // If we're past June, the current school year started this year
  const endYear = now.getMonth() >= 5 ? currentYear + 1 : currentYear;
  const years = [];
  for (let i = 4; i >= 0; i--) {
    const start = endYear - 1 - i;
    years.push(`${start}-${start + 1}`);
  }
  return years;
};

export const updateSchoolEnrollment = async (id, enrollmentData) => {
  const schoolRef = doc(db, "Schools", id);
  await updateDoc(schoolRef, { Enrollment: enrollmentData });
};

/** Sum enrollment numbers for the given school year keys (e.g. last five SY strings). */
export function sumEnrollmentForSchoolYears(enrollment, schoolYears) {
  return schoolYears.reduce((sum, yr) => {
    const v = enrollment?.[yr];
    const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
    return sum + n;
  }, 0);
}

/** Total from modal draft inputs while editing statistics. */
export function sumEnrollmentDraft(draft, schoolYears) {
  return schoolYears.reduce((sum, yr) => {
    const val = draft[yr];
    const n =
      val === "" || val === null || val === undefined
        ? 0
        : Number(val);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}
