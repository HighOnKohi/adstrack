import "./Schools.css";
import SchoolCard from "./Components/School-Card.jsx";
import { useState, useEffect } from "react";
import { db } from "../../config/fbConf.js";
import { collection, getDocs } from "firebase/firestore";
import { addIcon, closeIcon } from "../../assets/Icons/index.js";
import {
  ProvinceSelector,
  MunicipalitySelector,
  useSchoolForm,
} from "./SchoolsServices.jsx";

function Schools() {
  const { showForm, setShowForm, formData, handleChange, handleSubmit } =
    useSchoolForm();

  const [schoolList, setSchoolList] = useState([]);

  useEffect(() => {
    const fetchSchools = async () => {
      const schoolsCollection = collection(db, "Schools");
      const query = await getDocs(schoolsCollection);

      const list = [];

      query.forEach((doc) => {
        list.push({ id: doc.id, data: doc.data() });
      });

      setSchoolList(list);
    };

    fetchSchools();
  }, []);

  return (
    <section className="schools-content">
      <div>
        <div className="Label">
          <h1> School Directory </h1>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut.
          </p>
        </div>
      </div>
      <button
        className="register-school-button"
        onClick={() => setShowForm(true)}
      >
        Register School
      </button>

      <div className="school-card-container">
        {schoolList.map((school) => (
          <SchoolCard school={school} />
        ))}
      </div>

      {showForm && (
        <div className="school-modal-overlay">
          <div className="school-form">
            <button
              className="close-modal-button"
              onClick={() => setShowForm(false)}
            >
              <img src={closeIcon} alt="close" />
            </button>
            <h1> Register New School </h1>

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

            <button className="school-submit" onClick={handleSubmit}>
              <img src={addIcon} alt="Add" />
              Submit
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Schools;
