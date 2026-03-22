/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { db } from "../../config/fbConf.js";
import { collection, addDoc } from "firebase/firestore";
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
      alert("Please complete details");
      return;
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
      alert("School Registered Successfully");
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
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Error registering school");
    }
  };

  return { showForm, setShowForm, formData, handleChange, handleSubmit };
};
