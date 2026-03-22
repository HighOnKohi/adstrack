import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../config/fbConf.js";
import {
  APP_USERS_COLLECTION,
  createAppUser,
  updateAppUser,
  deleteAppUser,
} from "../../services/appUsers.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAlert } from "../../GlobalComponents/useAlert.js";
import { closeIcon, editIcon, trashIcon } from "../../assets/Icons/index.js";
import "../Schedules/Schedules.css";
import "../Schedules/Components/Schedule-Card.css";
import "./ManageUsers.css";

const emptyAddForm = {
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function ManageUsers() {
  const { user: currentUser, logout } = useAuth();
  const { showAlert, showConfirmation } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, APP_USERS_COLLECTION),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              email: data.email || "",
              displayName: data.displayName || "",
            };
          })
          .sort((a, b) => a.email.localeCompare(b.email));
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.error("appUsers listener:", err);
        showAlert(
          err.message ||
            "Could not load users. Add a Firestore index on appUsers.email if prompted, and check security rules.",
          "Error",
          "error",
        );
        setUsers([]);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [showAlert]);

  const handleAddSubmit = async () => {
    const { displayName, email, password, confirmPassword } = addForm;
    if (!email.trim() || !password) {
      showAlert("Email and password are required.", "Validation", "error");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("Passwords do not match.", "Validation", "error");
      return;
    }
    if (password.length < 6) {
      showAlert("Password must be at least 6 characters.", "Validation", "error");
      return;
    }
    try {
      await createAppUser({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      showAlert("User added to the database.", "Success", "success");
      setShowAdd(false);
      setAddForm(emptyAddForm);
    } catch (e) {
      showAlert(e.message || "Could not create user.", "Error", "error");
    }
  };

  const openEdit = (u) => {
    setEditTarget(u);
    setEditForm({
      displayName: u.displayName || "",
      email: u.email || "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    const { displayName, email, password, confirmPassword } = editForm;
    if (!email.trim()) {
      showAlert("Email is required.", "Validation", "error");
      return;
    }
    if (password && password !== confirmPassword) {
      showAlert("Passwords do not match.", "Validation", "error");
      return;
    }
    if (password && password.length < 6) {
      showAlert("Password must be at least 6 characters.", "Validation", "error");
      return;
    }
    try {
      await updateAppUser(editTarget.id, {
        displayName: displayName.trim(),
        email: email.trim(),
        ...(password ? { password } : {}),
      });
      showAlert("User updated.", "Success", "success");
      setEditTarget(null);
      if (
        currentUser?.source === "db" &&
        currentUser.id === editTarget.id &&
        password
      ) {
        showAlert("Sign in again with your new password.", "Note", "info");
      }
    } catch (e) {
      showAlert(e.message || "Could not update user.", "Error", "error");
    }
  };

  const handleDelete = (u) => {
    showConfirmation(
      `Remove ${u.email} from the database? They will not be able to log in.`,
      "Remove user",
      async (confirmed) => {
        if (!confirmed) return;
        try {
          await deleteAppUser(u.id);
          showAlert("User removed.", "Success", "success");
          if (currentUser?.source === "db" && currentUser.id === u.id) {
            await logout();
          }
        } catch (e) {
          showAlert(e.message || "Could not remove user.", "Error", "error");
        }
      },
    );
  };

  return (
    <div className="schedules-content manage-users-page">
      <div>
        <div className="Label">
          <h1>Manage Users</h1>
          <p>
            Add people to the database so they can log in with email and password.
            Only your master Firebase account is an admin.
          </p>
        </div>

        <div className="function-buttons manage-users-actions">
          <button
            type="button"
            className="schedule-meeting-button"
            onClick={() => setShowAdd(true)}
          >
            Add account
          </button>
        </div>

        <div className="schedule-list-labels manage-users-labels">
          <div className="schedule-label-cell mu-col-name">Name</div>
          <div className="schedule-label-cell mu-col-email">Email</div>
          <div className="schedule-label-cell mu-col-actions" />
        </div>

        <div className="schedule-list-container manage-users-list-container">
          {loading ? (
            <div className="no-schedules">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="no-schedules">No database users yet</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="schedule-card-row manage-user-row">
                <div className="schedule-card-cell">
                  {u.displayName || "—"}
                </div>
                <div className="schedule-card-cell">{u.email || "—"}</div>
                <div
                  className="schedule-card-cell action-buttons-cell"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="edit-details-button action-button"
                    onClick={() => openEdit(u)}
                  >
                    <img src={editIcon} alt="" className="action-icon" />
                    EDIT
                  </button>
                  <button
                    type="button"
                    className="edit-details-button action-button delete"
                    onClick={() => handleDelete(u)}
                  >
                    <img src={trashIcon} alt="" className="action-icon" />
                    DELETE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <div className="sched-modal-overlay">
          <div className="sched-form manage-users-modal">
            <button
              type="button"
              className="close-modal-button"
              onClick={() => setShowAdd(false)}
              aria-label="Close"
            >
              <img src={closeIcon} alt="" />
            </button>
            <h1>Add account</h1>
            <div className="sched-form-grid">
              <div className="sched-input-group sched-full-width">
                <label className="input-label">Name</label>
                <input
                  className="sched-input"
                  value={addForm.displayName}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, displayName: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div className="sched-input-group sched-full-width">
                <label className="input-label">Email</label>
                <input
                  className="sched-input"
                  type="email"
                  autoComplete="off"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div className="sched-input-group">
                <label className="input-label">Password</label>
                <input
                  className="sched-input"
                  type="password"
                  autoComplete="new-password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, password: e.target.value }))
                  }
                />
              </div>
              <div className="sched-input-group">
                <label className="input-label">Confirm password</label>
                <input
                  className="sched-input"
                  type="password"
                  autoComplete="new-password"
                  value={addForm.confirmPassword}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                />
              </div>
            </div>
            <button type="button" className="sched-submit" onClick={handleAddSubmit}>
              Add to database
            </button>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="sched-modal-overlay">
          <div className="sched-form manage-users-modal">
            <button
              type="button"
              className="close-modal-button"
              onClick={() => setEditTarget(null)}
              aria-label="Close"
            >
              <img src={closeIcon} alt="" />
            </button>
            <h1>Edit account</h1>
            <div className="sched-form-grid">
              <div className="sched-input-group sched-full-width">
                <label className="input-label">Name</label>
                <input
                  className="sched-input"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, displayName: e.target.value }))
                  }
                />
              </div>
              <div className="sched-input-group sched-full-width">
                <label className="input-label">Email</label>
                <input
                  className="sched-input"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
              <div className="sched-input-group sched-full-width">
                <label className="input-label">
                  New password (optional)
                </label>
                <input
                  className="sched-input"
                  type="password"
                  autoComplete="new-password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, password: e.target.value }))
                  }
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="sched-input-group sched-full-width">
                <label className="input-label">Confirm new password</label>
                <input
                  className="sched-input"
                  type="password"
                  autoComplete="new-password"
                  value={editForm.confirmPassword}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <button type="button" className="sched-submit" onClick={handleEditSubmit}>
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
