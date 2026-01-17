import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar/Sidebar.jsx";
import Header from "./Header/Header.jsx";
import "./Layout.css";

function Layout() {
    return(
        <div className="layout"> 
            <Sidebar/>
            
            <main className="main">
                <Header/>
                <div className="outlet">
                    <Outlet/>
                </div>
            </main>
        </div>
    );
}

export default Layout;