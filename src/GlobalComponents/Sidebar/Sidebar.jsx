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

export default function Sidebar() {
  const nav = useNavigate();

  return (
    <aside className="sidebar">
      <nav>
        <a
          onClick={() => {
            nav("/home");
          }}
        >
          <img src={homeIcon} alt="Home" /> Home
        </a>
        <a
          onClick={() => {
            nav("/schedules");
          }}
        >
          <img src={bookIcon} alt="Schedules" /> Schedules
        </a>
        <a
          onClick={() => {
            nav("/schools");
          }}
        >
          <img src={directoryIcon} alt="Schools" /> Schools
        </a>
        <a
          onClick={() => {
            nav("/calendar");
          }}
        >
          <img src={calendarIcon} alt="Calendar" /> Calendar
        </a>
        <a
          onClick={() => {
            nav("/inventory");
          }}
        >
          <img src={inventoryIcon} alt="Inventory" /> Inventory
        </a>
        <a
          onClick={() => {
            nav("/analytics");
          }}
        >
          <img src={analyticsIcon} alt="Analytics" /> Analytics
        </a>
      </nav>
    </aside>
  );
}
