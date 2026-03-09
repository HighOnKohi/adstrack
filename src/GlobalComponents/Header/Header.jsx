import logo from "../../assets/sct-logo2.png";
import "./Header.css";

export default function Header() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        <strong>JUAN DELA CRUZ</strong>
        <span>ADMINISTRATOR</span>
      </div>
    </header>
  );
}
