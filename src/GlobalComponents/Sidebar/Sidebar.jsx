import { useNavigate } from "react-router-dom";

import {
  analyticsIcon,
  calendarIcon,
  directoryIcon,
  inventoryIcon,
  homeIcon,
  bookIcon,
} from "../../assets/Icons/index.js";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
  const nav = useNavigate();

  const handleNav = (path) => {
    nav(path);
    if (onClose) onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "visible" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <nav>
          <a onClick={() => handleNav("/home")}>
            <img src={homeIcon} alt="Home" /> Home
          </a>
          <a onClick={() => handleNav("/schedules")}>
            <img src={bookIcon} alt="Schedules" /> Schedules
          </a>
          <a onClick={() => handleNav("/schools")}>
            <img src={directoryIcon} alt="Schools" /> Schools
          </a>
          <a onClick={() => handleNav("/calendar")}>
            <img src={calendarIcon} alt="Calendar" /> Calendar
          </a>
          <a onClick={() => handleNav("/inventory")}>
            <img src={inventoryIcon} alt="Inventory" /> Inventory
          </a>
          <a onClick={() => handleNav("/analytics")}>
            <img src={analyticsIcon} alt="Analytics" /> Analytics
          </a>
        </nav>
      </aside>
    </>
  );
}
