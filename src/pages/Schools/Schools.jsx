import "./Schools.css";
import {
  ProvinceSelector,
  MunicipalitySelector,
  useSchoolForm,
} from "./SchoolsServices.jsx";

function Schools() {
  const { showForm, setShowForm, formData, handleChange, handleSubmit } =
    useSchoolForm();

  return (
    <section className="content">
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

      {showForm && (
        <div className="school-modal-overlay">
          <div className="school-form">
            <button
              className="close-modal-button"
              onClick={() => setShowForm(false)}
            >
              X
            </button>
            <h1> Register New School </h1>

            <div className="school-form-grid">
              <div className="school-input-group school-full-width">
                <label className="school-input-label">Name</label>
                <input
                  name="Name"
                  type="text"
                  className="school-input"
                  placeholder="School Name"
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
                  placeholder="Juan Dela Cruz"
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
                  placeholder="09876543210"
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
                  placeholder="sample@gmail.com"
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
              {" "}
              Submit{" "}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Schools;
