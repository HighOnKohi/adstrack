import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "./Sidebar/Sidebar.jsx";
import Header from "./Header/Header.jsx";
import "./Layout.css";

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="main">
        <Header onMenuClick={toggleSidebar} />
        <div className="outlet" onClick={closeSidebar}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;