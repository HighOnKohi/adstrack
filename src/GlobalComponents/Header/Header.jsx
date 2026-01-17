import logo from "../../assets/sct-logo2.png";
import "./Header.css";

export default function Header() {
  return (
    <header className="header">

      <div className="logo">
        <img src={logo} alt="SCT Logo" />
      </div>

      <div className="user">
        <strong>JUAN DELA CRUZ</strong>
        <span>ADMINISTRATOR</span>
      </div>
      
    </header>
  );
}
