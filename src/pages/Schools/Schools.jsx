import "./Schools.css";
import SchoolCard from "./Components/School-Card.jsx";
import { useState, useEffect } from "react";
import { db } from "../../config/fbConf.js";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { addIcon, closeIcon } from "../../assets/Icons/index.js";
import { useAlert } from "../../GlobalComponents/useAlert.js";
import {
  ProvinceSelector,
  MunicipalitySelector,
  useSchoolForm,
  updateSchool,
  deleteSchool,
  updateSchoolEnrollment,
} from "./SchoolsServices.jsx";

function Schools() {
  const { showAlert, showConfirmation } = useAlert();
  const {
    showForm,
    setShowForm,
    formData,
    setFormData,
    handleChange,
    handleSubmit,
  } = useSchoolForm();

  const [schoolList, setSchoolList] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [editMode, setEditMode] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [showStats, setShowStats] = useState(false);


  const resetForm = () => {
    setFormData({
      Name: "",
      Category: "",
      Contact_Person: "",
      Contact_Num: "",
      Email: "",
      Province: "",
      Municipality: "",
    });
    setEditMode(false);
    setEditingSchool(null);
  };

  const handleEditClick = (school) => {
    const [municipality = "", province = ""] = (school.data.Address || "")
      .split(",")
      .map((v) => v.trim());
    setFormData({
      Name: school.data.Name || "",
      Category: school.data.Category || "",
      Contact_Person: school.data.Contact_Person || "",
      Contact_Num: school.data.Contact_Num || "",
      Email: school.data.Email || "",
      Province: province,
      Municipality: municipality,
    });
    setEditMode(true);
    setEditingSchool(school);
    setShowForm(true);
  };

  const handleDeleteClick = (school) => {
    showConfirmation(
      `Are you sure you want to remove "${school.data.Name}"? This cannot be undone.`,
      "Confirm Delete",
      async (confirmed) => {
        if (!confirmed) return;
        try {
          await deleteSchool(school.id);
          showAlert("School deleted successfully", "Success", "success");
        } catch (e) {
          console.error("Error deleting school:", e);
          showAlert("Error deleting school", "Error", "error");
        }
      },
    );
  };

  const submitSchool = async () => {
    if (editMode && editingSchool) {
      try {
        const updateData = {
          Name: formData.Name,
          Category: formData.Category,
          Contact_Person: formData.Contact_Person,
          Contact_Num: formData.Contact_Num,
          Email: formData.Email,
          Address: `${formData.Municipality}, ${formData.Province}`,
        };
        await updateSchool(editingSchool.id, updateData);
        showAlert("School updated successfully", "Success", "success");
        resetForm();
        setShowForm(false);
      } catch (e) {
        console.error("Error updating school:", e);
        showAlert("Error updating school", "Error", "error");
      }
      return;
    }

    const result = await handleSubmit();
    if (result.success) {
      showAlert(result.message, "Success", "success");
    } else {
      showAlert(result.error, "Error", "error");
    }
  };

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "Schools"), orderBy("Name", "asc")),
      (querySnapshot) => {
        const list = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        }));
        setSchoolList(list);
        setStatusMessage("Schools updated");
        setErrorMessage("");
        setConnectionStatus("online");
      },
      (error) => {
        console.error("Schools realtime update failed:", error);
        setErrorMessage("Could not connect to realtime updates");
        setStatusMessage("");
        setConnectionStatus("offline");
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <section className="schools-content">
      <div>
        <div className="Label">
          <h1> School Directory </h1>
          <p>
            Manage and view all registered schools in the system.
          </p>
          <div className="realtime-status">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                color: connectionStatus === "online" ? "#0f9d58" : "#d93025",
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background:
                    connectionStatus === "online" ? "#0f9d58" : "#d93025",
                  display: "inline-block",
                }}
              />
              {connectionStatus === "online"
                ? "Live updates active"
                : "Live updates offline"}
            </span>
          </div>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>
      </div>
      <div className="school-buttons-row">
        <button
          className="register-school-button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Register School
        </button>
        <button
          className={`manage-stats-button ${showStats ? "active" : ""}`}
          onClick={() => setShowStats((v) => !v)}
        >
          {showStats ? "View Schools" : "Manage Statistics"}
        </button>
      </div>

      <div className="school-card-container">
        {schoolList.map((school) => (
          <SchoolCard
            key={school.id}
            school={school}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            showStats={showStats}
            onSaveStats={async (id, data) => {
              try {
                await updateSchoolEnrollment(id, data);
                showAlert("Statistics updated successfully", "Success", "success");
              } catch (e) {
                console.error("Error updating stats:", e);
                showAlert("Error updating statistics", "Error", "error");
              }
            }}
          />
        ))}
      </div>

      {showForm && (
        <div className="school-modal-overlay">
          <div className="school-form">
            <button
              className="close-modal-button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              <img src={closeIcon} alt="close" />
            </button>
            <h1>{editMode ? "Edit School" : "Register New School"}</h1>

            <div className="school-form-grid">
              <div className="school-input-group school-full-width">
                <label className="school-input-label">Name</label>
                <input
                  name="Name"
                  type="text"
                  className="school-input"
                  placeholder="Name of School"
                  value={formData.Name}
                  onChange={handleChange}
                />
              </div>

              <div className="school-input-group">
                <label className="school-input-label">Category</label>
                <select
                  name="Category"
                  className="school-input"
                  value={formData.Category}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Select Category
                  </option>
                  <option value="Private">Private</option>
                  <option value="Public">Public</option>
                </select>
              </div>

              <div className="school-input-group">
                <label className="school-input-label">Contact Person</label>
                <input
                  name="Contact_Person"
                  type="text"
                  className="school-input"
                  placeholder="Name of Contact Person"
                  value={formData.Contact_Person}
                  onChange={handleChange}
                />
              </div>

              <div className="school-input-group">
                <label className="school-input-label">Contact Number</label>
                <input
                  name="Contact_Num"
                  type="text"
                  className="school-input"
                  placeholder="Contact Number of Person/School"
                  value={formData.Contact_Num}
                  onChange={handleChange}
                />
              </div>

              <div className="school-input-group">
                <label className="school-input-label">Email</label>
                <input
                  name="Email"
                  type="text"
                  className="school-input"
                  placeholder="E-mail Address of Contact Person/School"
                  value={formData.Email}
                  onChange={handleChange}
                />
              </div>

              <div className="school-input-group">
                <label className="school-input-label">Province</label>
                <ProvinceSelector
                  name="Province"
                  value={formData.Province}
                  onChange={handleChange}
                />
              </div>

              <div className="school-input-group">
                <label className="school-input-label">Municipality</label>
                <MunicipalitySelector
                  name="Municipality"
                  province={formData.Province}
                  value={formData.Municipality}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button className="school-submit" onClick={submitSchool}>
              <img src={addIcon} alt="Add" />
              {editMode ? "Update" : "Submit"}
            </button>
          </div>
        </div>
      )}

    </section>
  );
}

export default Schools;
