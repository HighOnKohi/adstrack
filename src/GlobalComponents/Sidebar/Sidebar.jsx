import { useNavigate } from "react-router-dom";

import "./Sidebar.css"

export default function Sidebar() {

  const nav = useNavigate();

  return (
    <aside className="sidebar">
      <nav>
        <a onClick={()=> {nav("/home")}}      >🏠 Home</a>
        <a onClick={()=> {nav("/schedules")}} >📁 Schedules</a>
        <a onClick={()=> {nav("/schools")}}   >🏫  Schools</a>
        <a onClick={()=> {nav("/calendar")}}  >📅 Calendar</a>
        <a onClick={()=> {nav("/inventory")}} >📦 Inventory</a>
        <a onClick={()=> {nav("/analytics")}} >📊 Analytics</a>
      </nav>
    </aside>
  );
}
