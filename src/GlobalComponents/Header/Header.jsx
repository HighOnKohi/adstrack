import { useNavigate } from "react-router-dom";
import logo from "../../assets/templogo.png";
import "./Header.css";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAlert } from "../useAlert.js";

export default function Header({ onMenuClick }) {
  const { user, logout, isAdmin } = useAuth();
  const { showConfirmation } = useAlert();
  const navigate = useNavigate();

  const displayName =
    (user?.displayName && user.displayName.trim()) ||
    (user?.email
      ? user.email.split("@")[0].replace(/\./g, " ")
      : "Guest");

  const handleLogout = () => {
    showConfirmation("Are you sure you want to log out?", "Log out", (confirmed) => {
      if (confirmed) {
        logout().then(() => navigate("/"));
      }
    });
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="brand">
          <img src={logo} alt="SCT Logo" />
          <div>
            <div className="brand-name">ADSTrack</div>
            <div className="brand-sub">Admissions Tracking Client</div>
          </div>
        </div>
      </div>

      <div className="header-center">
        <span className="header-date">{today}</span>
      </div>
      <div className="header-right">
        <div className="user-details">
          <span className="username" title={displayName}>
            {displayName}
          </span>
          {user?.email ? (
            <span className="user-email-line" title={user.email}>
              {user.email}
            </span>
          ) : null}
          <span className="role">{isAdmin ? "Admin" : "User"}</span>
        </div>
        <button type="button" className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
