import { useNavigate } from "react-router-dom";
import logo from "../../assets/sct-logo2.png";
import "./Header.css";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="logo">
        <img src={logo} alt="SCT Logo" />
      </div>

      <div
        className="date-display"
        style={{ marginRight: "20px", fontWeight: "bold" }}
      >
        {currentDate}
      </div>

      <div className="user">
        <strong>{user?.username ?? "Guest"}</strong>
        <span>ADMINISTRATOR</span>
        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
