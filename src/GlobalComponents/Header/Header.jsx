import { useNavigate } from "react-router-dom";
import logo from "../../assets/sct-logo2.png";
import "./Header.css";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
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
        <button className="menu-button" onClick={onMenuClick} aria-label="Open menu">
          ☰
        </button>
        <div className="brand">
          <img src={logo} alt="SCT Logo" />
          <div>
            <div className="brand-name">ADS Track</div>
            <div className="brand-sub">School Client Tracking</div>
          </div>
        </div>
      </div>

      <div className="header-center">
        <span className="header-date">{today}</span>
      </div>
      <div className="header-right">
        <div className="user-details">
          <span className="username">{user?.username ?? "Guest"}</span>
          <span className="role">ADMINISTRATOR</span>
        </div>
        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
