import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "./Sidebar/Sidebar.jsx";
import Header from "./Header/Header.jsx";
import { NotificationsProvider } from "../context/AppNotificationsContext.jsx";
import "./Layout.css";

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <NotificationsProvider>
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="main">
        <Header onMenuClick={toggleSidebar} />
        <div className="outlet" onClick={closeSidebar}>
          <Outlet />
        </div>
      </main>
    </div>
    </NotificationsProvider>
  );
}

export default Layout;